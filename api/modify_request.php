<?php

require 'db.php';

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

            b.unit_id,
            b.status AS booking_status,

            u.max_guests

         FROM booking_requests br

         JOIN bookings b
            ON b.booking_id = br.booking_id

         JOIN units u
            ON u.unit_id = b.unit_id

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
        (int) $request['requested_guests'] <= 0
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

    if (
        $request['max_guests'] !== null &&
        (int) $request['requested_guests'] > (int) $request['max_guests']
    ) {
        $pdo->rollBack();

        http_response_code(400);
        echo json_encode([
            'error' => 'The requested number of guests exceeds the unit capacity'
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

    $overlap = $pdo->prepare(
        "SELECT booking_id
         FROM bookings
         WHERE unit_id = ?
         AND booking_id <> ?
         AND status NOT IN ('cancelled', 'rejected')
         AND check_in_date < ?
         AND check_out_date > ?
         LIMIT 1"
    );

    $overlap->execute([
        $request['unit_id'],
        $request['booking_id'],
        $request['requested_check_out'],
        $request['requested_check_in']
    ]);

    if ($overlap->fetchColumn()) {
        $pdo->rollBack();

        http_response_code(409);
        echo json_encode([
            'error' => 'The requested dates are no longer available for this unit'
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
