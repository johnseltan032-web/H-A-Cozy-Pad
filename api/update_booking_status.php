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

$bookingId = (int) ($data['bookingId'] ?? 0);
$status = strtolower(trim($data['status'] ?? ''));

if ($bookingId <= 0) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Invalid booking ID'
    ]);
    exit;
}

if (!in_array($status, ['confirmed', 'rejected'], true)) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Invalid booking status'
    ]);
    exit;
}

try {
    $pdo->beginTransaction();

    $bookingCheck = $pdo->prepare(
        'SELECT unit_id, check_in_date, check_out_date, num_of_guests
         FROM bookings
         WHERE booking_id = ?
         FOR UPDATE'
    );
    $bookingCheck->execute([$bookingId]);
    $bookingData = $bookingCheck->fetch(PDO::FETCH_ASSOC);

    if (!$bookingData) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['error' => 'Booking not found']);
        exit;
    }

    if ($status === 'confirmed') {
        $lockUnit = $pdo->prepare('SELECT unit_id FROM units WHERE unit_id = ? FOR UPDATE');
        $lockUnit->execute([$bookingData['unit_id']]);
        if (!hasBookingSlotForRange(
            $pdo,
            (int) $bookingData['unit_id'],
            $bookingData['check_in_date'],
            $bookingData['check_out_date'],
            $bookingId
        )) {
            $pdo->rollBack();
            http_response_code(409);
            echo json_encode(['error' => 'This listing has reached its maximum number of overlapping reservations for at least one selected night.']);
            exit;
        }
    }

    $admin = $pdo->prepare(
        'SELECT admin_id
         FROM admin_profiles
         WHERE user_id = ?'
    );

    $admin->execute([$_SESSION['user_id']]);
    $adminId = (int) $admin->fetchColumn();

    if (!$adminId) {
        $role = strtolower($_SESSION['role'] ?? 'admin');
        $role = in_array($role, ['super_admin', 'admin'], true) ? $role : 'admin';

        $ensureAdminProfile = $pdo->prepare(
            'INSERT INTO admin_profiles (user_id, position)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE position = VALUES(position)'
        );

        $ensureAdminProfile->execute([
            $_SESSION['user_id'],
            $role,
        ]);

        $admin = $pdo->prepare(
            'SELECT admin_id
             FROM admin_profiles
             WHERE user_id = ?'
        );
        $admin->execute([$_SESSION['user_id']]);
        $adminId = (int) $admin->fetchColumn();
    }

    if (!$adminId) {
        $createAdminProfile = $pdo->prepare(
            "INSERT IGNORE INTO admin_profiles (user_id, position)
             VALUES (?, 'admin')"
        );
        $createAdminProfile->execute([$_SESSION['user_id']]);

        $admin->execute([$_SESSION['user_id']]);
        $adminId = $admin->fetchColumn();

        if (!$adminId) {
            throw new RuntimeException('Unable to create admin profile for authenticated admin');
        }
    }

    $payment = $pdo->prepare(
        'SELECT payment_id
         FROM payments
         WHERE booking_id = ?
         LIMIT 1'
    );

    $payment->execute([$bookingId]);
    $paymentId = $payment->fetchColumn();

    if (!$paymentId) {
        $pdo->rollBack();

        http_response_code(404);
        echo json_encode([
            'error' => 'Payment record not found for this booking'
        ]);
        exit;
    }

    if ($status === 'confirmed') {
        $paymentUpdate = $pdo->prepare(
            'UPDATE payments
             SET payment_status = \'verified\',
                 verified_by = ?,
                 verified_at = NOW()
             WHERE payment_id = ?'
        );

        $paymentUpdate->execute([
            $adminId,
            $paymentId
        ]);
    } else {
        $paymentUpdate = $pdo->prepare(
            'UPDATE payments
             SET payment_status = \'rejected\',
                 verified_by = ?,
                 verified_at = NOW()
             WHERE payment_id = ?'
        );

        $paymentUpdate->execute([
            $adminId,
            $paymentId
        ]);
    }

    $bookingUpdate = $pdo->prepare(
        'UPDATE bookings
         SET status = ?
         WHERE booking_id = ?'
    );

    $bookingUpdate->execute([
        $status,
        $bookingId
    ]);

    if ($bookingUpdate->rowCount() === 0) {
        $pdo->rollBack();

        http_response_code(404);
        echo json_encode([
            'error' => 'Booking not found or no changes were made'
        ]);
        exit;
    }

    $activityInfo = $pdo->prepare(
        'SELECT b.unit_id, u.unit_name FROM bookings b JOIN units u ON u.unit_id = b.unit_id WHERE b.booking_id = ?'
    );
    $activityInfo->execute([$bookingId]);
    $activityUnit = $activityInfo->fetch(PDO::FETCH_ASSOC);
    $activityVerb = $status === 'confirmed' ? 'approved' : 'rejected';
    writeActivityLog(
        $pdo,
        $activityVerb . '_booking',
        $activityVerb . ' booking #BK-' . $bookingId . ($activityUnit ? ' for Unit ' . $activityUnit['unit_name'] : ''),
        'booking',
        (string) $bookingId
    );
    $pdo->commit();

    // Notify the customer after commit so a mail problem never undoes the
    // status change. The in-app notification is always saved; the email is
    // only sent on approval, and only if the customer has emails enabled.
    try {
        $info = $pdo->prepare(
                'SELECT bk.check_in_date, bk.check_out_date,
                    u.user_id,
                    COALESCE(u.full_name, bd.guest_name) AS full_name,
                    COALESCE(u.email, bd.guest_email) AS email,
                    un.unit_name, bl.building_name,
                    bd.guest_name, bd.guest_contact_num
             FROM bookings bk
             LEFT JOIN customer_profiles cp ON cp.customer_id = bk.customer_id
             LEFT JOIN users u ON u.user_id = cp.user_id
             JOIN units un ON un.unit_id = bk.unit_id
             JOIN buildings bl ON bl.building_id = un.building_id
             LEFT JOIN booking_details bd ON bd.booking_id = bk.booking_id
             WHERE bk.booking_id = ?'
        );
        $info->execute([$bookingId]);
        $booking = $info->fetch(PDO::FETCH_ASSOC);

        if ($booking) {
            $stay = sprintf(
                '%s (%s), %s to %s',
                $booking['unit_name'],
                $booking['building_name'],
                $booking['check_in_date'],
                $booking['check_out_date']
            );

            $notifyMessage = $status === 'confirmed'
                ? 'Your booking has been confirmed: ' . $stay . '.'
                : 'Your booking was not approved: ' . $stay . '.';

            if ($booking['user_id'] !== null) {
                $pdo->prepare(
                    "INSERT INTO notifications (user_id, booking_id, type, message, is_read, sent_at)
                     VALUES (?, ?, 'booking', ?, 0, NOW())"
                )->execute([$booking['user_id'], $bookingId, $notifyMessage]);
            }

            // Email delivery has been disabled; notifications remain in-app only.
            if ($status === 'confirmed') {
                // No external email sending here.
            }
        }
    } catch (Throwable $notifyError) {
        error_log('Status notification/email failed: ' . $notifyError->getMessage());
    }

    echo json_encode([
        'success' => true,
        'bookingId' => $bookingId,
        'status' => $status,
        'paymentStatus' => $status === 'confirmed'
            ? 'verified'
            : 'rejected'
    ]);

} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);
    echo json_encode([
        'error' => 'Unable to update payment and booking status'
    ]);
}
?>