<?php
require 'db.php';
require 'activity_log_helper.php';

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
    $pdo->beginTransaction();
    $bookingInfo = $pdo->prepare(
        'SELECT b.booking_id, u.unit_name
         FROM bookings b
         JOIN units u ON u.unit_id = b.unit_id
         WHERE b.booking_id = ?'
    );
    $bookingInfo->execute([$bookingId]);
    $booking = $bookingInfo->fetch(PDO::FETCH_ASSOC);

    $stmt = $pdo->prepare(
        'DELETE FROM bookings
         WHERE booking_id = ?
         AND status IN (\'confirmed\', \'rejected\')'
    );

    $stmt->execute([$bookingId]);

    if ($stmt->rowCount() === 0) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode([
            'error' => 'Booking not found or it cannot be removed yet'
        ]);
        exit;
    }

    writeActivityLog(
        $pdo,
        'delete_booking',
        'deleted booking #BK-' . $bookingId . ($booking ? ' for Unit ' . $booking['unit_name'] : ''),
        'booking',
        (string) $bookingId
    );
    $pdo->commit();

    echo json_encode([
        'success' => true,
        'bookingId' => $bookingId
    ]);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Booking delete failed: ' . $error->getMessage());

    http_response_code(500);
    echo json_encode([
        'error' => 'Unable to remove this booking'
    ]);
}
