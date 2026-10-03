<?php
require 'db.php';
require 'booking_slot_limit.php';

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

$unit = $pdo->prepare(
    'SELECT status, available_from, available_until
     FROM units
     WHERE unit_id = ?
     LIMIT 1'
);
$unit->execute([$unitId]);
$unitData = $unit->fetch(PDO::FETCH_ASSOC);

if (!$unitData) {
    http_response_code(404);
    echo json_encode(['available' => false, 'error' => 'Unit not found']);
    exit;
}

if (in_array($unitData['status'] ?? '', ['occupied', 'maintenance', 'unavailable'], true)) {
    http_response_code(409);
    echo json_encode([
        'available' => false,
        'error' => 'This unit is currently occupied or blocked and cannot be booked for the selected dates.'
    ]);
    exit;
}

if (!empty($unitData['available_from']) && $checkIn < $unitData['available_from']) {
    http_response_code(409);
    echo json_encode([
        'available' => false,
        'error' => 'This unit is not available before ' . $unitData['available_from'] . '.'
    ]);
    exit;
}

if (!empty($unitData['available_until']) && $checkOut > $unitData['available_until']) {
    http_response_code(409);
    echo json_encode([
        'available' => false,
        'error' => 'This unit is not available after ' . $unitData['available_until'] . '.'
    ]);
    exit;
}

$blocked = $pdo->prepare(
    'SELECT reason, blocked_from, blocked_until
     FROM unit_blocked_dates
     WHERE unit_id = ?
     AND blocked_from <= ?
     AND blocked_until >= ?
     LIMIT 1'
);
$blocked->execute([$unitId, $checkOut, $checkIn]);
$blockedDate = $blocked->fetch(PDO::FETCH_ASSOC);

if ($blockedDate) {
    http_response_code(409);
    echo json_encode([
        'available' => false,
        'error' => 'This unit is blocked for the selected dates due to ' . str_replace('_', ' ', $blockedDate['reason']) . '.'
    ]);
    exit;
}

if (!hasBookingSlotForRange($pdo, $unitId, $checkIn, $checkOut)) {
    http_response_code(409);
    echo json_encode([
        'available' => false,
        'error' => 'This listing has reached its maximum number of overlapping reservations for at least one selected night.'
    ]);
    exit;
}

echo json_encode(['available' => true]);
?>