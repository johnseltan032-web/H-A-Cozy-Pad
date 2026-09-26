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

$data = json_decode(file_get_contents('php://input'), true);

$bookingId = (int) ($data['bookingId'] ?? 0);
$cancelReason = trim($data['cancelReason'] ?? '');

if ($bookingId <= 0) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Invalid booking ID'
    ]);
    exit;
}

if ($cancelReason === '') {
    http_response_code(400);
    echo json_encode([
        'error' => 'A cancellation reason is required'
    ]);
    exit;
}

try {
    $customer = $pdo->prepare(
        'SELECT customer_id
         FROM customer_profiles
         WHERE user_id = ?'
    );

    $customer->execute([$_SESSION['user_id']]);
    $customerId = $customer->fetchColumn();

    if (!$customerId) {
        http_response_code(403);
        echo json_encode([
            'error' => 'Only customer accounts can cancel bookings'
        ]);
        exit;
    }

    $booking = $pdo->prepare(
        'SELECT booking_id, status
         FROM bookings
         WHERE booking_id = ?
         AND customer_id = ?'
    );

    $booking->execute([
        $bookingId,
        $customerId
    ]);

    $bookingData = $booking->fetch(PDO::FETCH_ASSOC);

    if (!$bookingData) {
        http_response_code(404);
        echo json_encode([
            'error' => 'Booking not found'
        ]);
        exit;
    }

    if ($bookingData['status'] === 'cancelled') {
        http_response_code(409);
        echo json_encode([
            'error' => 'This booking is already cancelled'
        ]);
        exit;
    }

    if ($bookingData['status'] === 'rejected') {
        http_response_code(409);
        echo json_encode([
            'error' => 'Rejected bookings cannot be cancelled'
        ]);
        exit;
    }

    $update = $pdo->prepare(
        'UPDATE bookings
         SET status = \'cancelled\',
             cancellation_reason = ?,
             cancelled_at = NOW()
         WHERE booking_id = ?
         AND customer_id = ?'
    );

    $update->execute([
        $cancelReason,
        $bookingId,
        $customerId
    ]);

    echo json_encode([
        'success' => true,
        'bookingId' => $bookingId,
        'status' => 'cancelled',
        'cancellationReason' => $cancelReason
    ]);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Unable to cancel booking'
    ]);
}
