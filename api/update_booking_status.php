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
    $adminId = $admin->fetchColumn();

    if (!$adminId) {
        $pdo->rollBack();

        http_response_code(403);
        echo json_encode([
            'error' => 'Admin profile not found'
        ]);
        exit;
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
