<?php
require 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

if (!isset($_SESSION['user_id'])) {
    // Not logged in -- simply not eligible, no error needed.
    echo json_encode(['eligible' => false]);
    exit;
}

$unitId = (int) ($_GET['unit_id'] ?? 0);

if (!$unitId) {
    http_response_code(400);
    echo json_encode(['error' => 'unit_id is required']);
    exit;
}

$customer = $pdo->prepare('SELECT customer_id FROM customer_profiles WHERE user_id = ?');
$customer->execute([$_SESSION['user_id']]);
$customerId = $customer->fetchColumn();

if (!$customerId) {
    // Admin/assistant accounts can't leave reviews.
    echo json_encode(['eligible' => false]);
    exit;
}

// Find a checked-out booking for this unit, by this customer, that doesn't
// already have a review.
// TODO: once a real checkout flow exists, switch this back to
// b.status = 'checked_out' instead of the date-based stand-in below.
$stmt = $pdo->prepare(
    "SELECT b.booking_id, b.check_in_date, b.check_out_date
     FROM bookings b
     LEFT JOIN reviews r ON r.booking_id = b.booking_id
     WHERE b.customer_id = ?
       AND b.unit_id = ?
       AND b.status = 'confirmed'
       AND b.check_out_date < CURDATE()
       AND r.review_id IS NULL
     ORDER BY b.check_out_date DESC
     LIMIT 1"
);
$stmt->execute([$customerId, $unitId]);
$booking = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$booking) {
    echo json_encode(['eligible' => false]);
    exit;
}

echo json_encode([
    'eligible' => true,
    'bookingId' => (int) $booking['booking_id'],
    'checkIn' => $booking['check_in_date'],
    'checkOut' => $booking['check_out_date'],
]);
?>