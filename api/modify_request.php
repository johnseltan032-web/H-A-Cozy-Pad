<?php

require 'db.php';
require 'activity_log_helper.php';
require 'booking_slot_limit.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode([
        'error' => 'Authentication required'
    ]);
    exit;
}

if (!in_array(strtolower($_SESSION['role'] ?? ''), ['super_admin', 'admin'], true)) {
    http_response_code(403);
    echo json_encode([
        'error' => 'Admin access required'
    ]);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

$requestId = isset($data['requestId']) ? (int) $data['requestId'] : 0;
$action = strtolower(trim($data['action'] ?? ''));

if ($requestId <= 0) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Invalid modification request ID'
    ]);
    exit;
}

if (!in_array($action, ['approve', 'reject'], true)) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Invalid modification request action'
    ]);
    exit;
}

try {
    $pdo->beginTransaction();

    $requestStmt = $pdo->prepare(
        "SELECT
            br.request_id,
            br.booking_id,
            br.request_status,
            br.requested_check_in,
            br.requested_check_out,
            br.requested_guests,
            br.requested_special_requests,
            br.payment_amount,
            br.refund_amount,
            br.proof_of_payment,
            br.payment_status,

            b.unit_id,
            b.status AS booking_status,
            cp.user_id AS customer_user_id,

            u.unit_name

         FROM booking_requests br

         JOIN bookings b
            ON b.booking_id = br.booking_id

         JOIN units u
            ON u.unit_id = b.unit_id

         LEFT JOIN customer_profiles cp
            ON cp.customer_id = b.customer_id

         WHERE br.request_id = ?
         AND br.request_type = 'modification'

         FOR UPDATE"
    );

    $requestStmt->execute([$requestId]);

    $request = $requestStmt->fetch(PDO::FETCH_ASSOC);

    if (!$request) {
        $pdo->rollBack();

        http_response_code(404);
        echo json_encode([
            'error' => 'Modification request not found'
        ]);
        exit;
    }

    if ($request['request_status'] !== 'pending') {
        $pdo->rollBack();

        http_response_code(400);
        echo json_encode([
            'error' => 'This modification request has already been processed'
        ]);
        exit;
    }

    if ($action === 'reject') {
        $updateRequest = $pdo->prepare(
            "UPDATE booking_requests
             SET request_status = 'rejected'
             WHERE request_id = ?"
        );

        $updateRequest->execute([$requestId]);

        if ($request['customer_user_id']) {
            $notification = $pdo->prepare(
                "INSERT INTO notifications (user_id, booking_id, type, message, is_read, sent_at)
                 VALUES (?, ?, 'system', ?, 0, NOW())"
            );
            $notification->execute([
                $request['customer_user_id'],
                $request['booking_id'],
                'Your request has been rejected.'
            ]);
        }

        writeActivityLog(
            $pdo,
            'reject_booking_edit',
            'rejected reservation edit request for Unit ' . $request['unit_name'] . ' (booking #BK-' . $request['booking_id'] . ')',
            'booking',
            (string) $request['booking_id']
        );
        $pdo->commit();

        echo json_encode([
            'success' => true,
            'requestId' => $requestId,
            'action' => 'reject',
            'requestStatus' => 'rejected'
        ]);
        exit;
    }

    if (
        empty($request['requested_check_in']) ||
        empty($request['requested_check_out']) ||
        $request['requested_guests'] === null ||
        (int) $request['requested_guests'] < 0
    ) {
        $pdo->rollBack();

        http_response_code(400);
        echo json_encode([
            'error' => 'The modification request contains invalid booking details'
        ]);
        exit;
    }

    if ($request['requested_check_out'] <= $request['requested_check_in']) {
        $pdo->rollBack();

        http_response_code(400);
        echo json_encode([
            'error' => 'The requested check-out date must be after the check-in date'
        ]);
        exit;
    }

    $unitState = $pdo->prepare(
        "SELECT status, available_from, available_until
         FROM units
         WHERE unit_id = ?
         LIMIT 1"
    );
    $unitState->execute([$request['unit_id']]);
    $unitStateData = $unitState->fetch(PDO::FETCH_ASSOC);

    if (!$unitStateData) {
        $pdo->rollBack();

        http_response_code(404);
        echo json_encode([
            'error' => 'The unit assigned to this booking no longer exists.'
        ]);
        exit;
    }

    if (in_array($unitStateData['status'] ?? '', ['occupied', 'maintenance', 'unavailable'], true)) {
        $pdo->rollBack();

        http_response_code(409);
        echo json_encode([
            'error' => 'This unit is currently occupied or blocked and cannot be assigned to the requested dates.'
        ]);
        exit;
    }

    if (!empty($unitStateData['available_from']) && $request['requested_check_in'] < $unitStateData['available_from']) {
        $pdo->rollBack();

        http_response_code(409);
        echo json_encode([
            'error' => 'The requested check-in date is before this unit is available.'
        ]);
        exit;
    }

    if (!empty($unitStateData['available_until']) && $request['requested_check_out'] > $unitStateData['available_until']) {
        $pdo->rollBack();

        http_response_code(409);
        echo json_encode([
            'error' => 'The requested dates extend beyond this unit’s availability window.'
        ]);
        exit;
    }

    if (in_array($request['booking_status'], ['cancelled', 'rejected'], true)) {
        $pdo->rollBack();

        http_response_code(400);
        echo json_encode([
            'error' => 'This booking can no longer be modified'
        ]);
        exit;
    }

    $lockUnit = $pdo->prepare('SELECT unit_id FROM units WHERE unit_id = ? FOR UPDATE');
    $lockUnit->execute([$request['unit_id']]);
    if (!hasBookingSlotForRange(
        $pdo,
        (int) $request['unit_id'],
        $request['requested_check_in'],
        $request['requested_check_out'],
        (int) $request['booking_id']
    )) {
        $pdo->rollBack();
        http_response_code(409);
        echo json_encode(['error' => 'This listing has reached its maximum number of overlapping reservations for at least one requested night.']);
        exit;
    }

    $blocked = $pdo->prepare(
        "SELECT reason
         FROM unit_blocked_dates
         WHERE unit_id = ?
         AND blocked_from <= ?
         AND blocked_until >= ?
         LIMIT 1"
    );
    $blocked->execute([
        $request['unit_id'],
        $request['requested_check_out'],
        $request['requested_check_in']
    ]);
    $blockedDate = $blocked->fetch(PDO::FETCH_ASSOC);

    if ($blockedDate) {
        $pdo->rollBack();

        http_response_code(409);
        echo json_encode([
            'error' => 'This unit is blocked for the requested dates due to ' . str_replace('_', ' ', $blockedDate['reason']) . '.'
        ]);
        exit;
    }

    $bookingUpdate = $pdo->prepare(
        "UPDATE bookings
         SET check_in_date = ?,
             check_out_date = ?,
             num_of_guests = ?
         WHERE booking_id = ?"
    );

    $bookingUpdate->execute([
        $request['requested_check_in'],
        $request['requested_check_out'],
        $request['requested_guests'],
        $request['booking_id']
    ]);

    $detailsUpdate = $pdo->prepare(
        "UPDATE booking_details
         SET special_requests = ?
         WHERE booking_id = ?"
    );

    $detailsUpdate->execute([
        $request['requested_special_requests'],
        $request['booking_id']
    ]);

    $requestUpdate = $pdo->prepare(
        "UPDATE booking_requests
         SET request_status = 'approved'
         WHERE request_id = ?"
    );

    $requestUpdate->execute([$requestId]);

    if ($request['customer_user_id']) {
        $notification = $pdo->prepare(
            "INSERT INTO notifications (user_id, booking_id, type, message, is_read, sent_at)
             VALUES (?, ?, 'system', ?, 0, NOW())"
        );
        $notification->execute([
            $request['customer_user_id'],
            $request['booking_id'],
            'Your request has been approved.'
        ]);
    }

    writeActivityLog(
        $pdo,
        'approve_booking_edit',
        'edited reservation for Unit ' . $request['unit_name'] . ' (booking #BK-' . $request['booking_id'] . ')',
        'booking',
        (string) $request['booking_id']
    );
    $pdo->commit();

    echo json_encode([
        'success' => true,
        'requestId' => $requestId,
        'bookingId' => (int) $request['booking_id'],
        'action' => 'approve',
        'requestStatus' => 'approved'
    ]);

} catch (Throwable $error) {

    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);

    echo json_encode([
        'error' => $error->getMessage()
    ]);
}
