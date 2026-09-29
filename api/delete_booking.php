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

if (!in_array(strtolower($_SESSION['role'] ?? ''), ['admin', 'assistant'], true)) {
    http_response_code(403);
    echo json_encode([
        'error' => 'Host access required'
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'error' => 'Use POST to delete a booking'
    ]);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true) ?? [];
$bookingId = (int) ($data['bookingId'] ?? 0);

if ($bookingId <= 0) {
    http_response_code(400);
    echo json_encode([
        'error' => 'A valid booking ID is required'
    ]);
    exit;
}

try {
    $stmt = $pdo->prepare(
        'DELETE FROM bookings
         WHERE booking_id = ?
         AND status IN (\'confirmed\', \'rejected\')'
    );

    $stmt->execute([$bookingId]);

    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode([
            'error' => 'Booking not found or it cannot be removed yet'
        ]);
        exit;
    }

    echo json_encode([
        'success' => true,
        'bookingId' => $bookingId
    ]);
} catch (Throwable $error) {
    error_log('Booking delete failed: ' . $error->getMessage());

    http_response_code(500);
    echo json_encode([
        'error' => 'Unable to remove this booking'
    ]);
}
