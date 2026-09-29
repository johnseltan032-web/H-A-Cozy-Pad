<?php
require 'db.php';
require __DIR__ . '/mailer.php';

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

if (strtolower($_SESSION['role'] ?? '') !== 'admin') {
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

    $admin = $pdo->prepare(
        'SELECT admin_id
         FROM admin_profiles
         WHERE user_id = ?'
    );

    $admin->execute([$_SESSION['user_id']]);
    $adminId = (int) $admin->fetchColumn();

    if (!$adminId) {
        $role = strtolower($_SESSION['role'] ?? 'admin');
        $role = in_array($role, ['admin', 'assistant'], true) ? $role : 'admin';

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

            if ($status === 'confirmed') {
                $confirmationBody =
                    '<p>Hi ' . htmlspecialchars($booking['full_name']) . ',</p>' .
                    '<p>Good news! Your booking has been confirmed.</p>' .
                    '<p><strong>Stay:</strong> ' . htmlspecialchars($stay) . '<br>' .
                    '<strong>Guest name:</strong> ' . htmlspecialchars($booking['guest_name'] ?? '') . '<br>' .
                    '<strong>Contact number:</strong> ' . htmlspecialchars($booking['guest_contact_num'] ?? '') . '</p>' .
                    '<p>We look forward to hosting you.</p>';

                if ($booking['user_id'] !== null) {
                    sendNotificationMail(
                        $pdo,
                        (int) $booking['user_id'],
                        $booking['email'],
                        $booking['full_name'],
                        'Your booking is confirmed',
                        $confirmationBody
                    );
                } elseif (!empty($booking['email'])) {
                    sendAppMail(
                        $booking['email'],
                        $booking['full_name'],
                        'Your booking is confirmed',
                        $confirmationBody
                    );
                }
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