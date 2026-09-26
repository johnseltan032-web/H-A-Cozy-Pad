<?php
require 'db.php';

$unitId = (int) ($_GET['unit_id'] ?? 0);
$checkIn = trim($_GET['check_in'] ?? '');
$checkOut = trim($_GET['check_out'] ?? '');

if (!$unitId || !$checkIn || !$checkOut) {
    http_response_code(400);
    echo json_encode(['error' => 'Unit and date range are required']);
    exit;
}

$checkInDate = DateTime::createFromFormat('Y-m-d', $checkIn);
$checkOutDate = DateTime::createFromFormat('Y-m-d', $checkOut);
if (!$checkInDate || !$checkOutDate || $checkOutDate <= $checkInDate) {
    http_response_code(400);
    echo json_encode(['error' => 'Check-out must be after check-in']);
    exit;
}

if ($checkInDate < new DateTime('today')) {
    http_response_code(400);
    echo json_encode(['error' => 'Bookings cannot be made for dates that have already passed']);
    exit;
}

$stmt = $pdo->prepare(
    'SELECT booking_id FROM bookings
     WHERE unit_id = ?
     AND status NOT IN (\'cancelled\', \'rejected\')
     AND check_in_date < ? AND check_out_date > ?
     LIMIT 1'
);
$stmt->execute([$unitId, $checkOut, $checkIn]);

echo json_encode(['available' => !$stmt->fetch()]);
?>