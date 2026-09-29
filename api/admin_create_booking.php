<?php
require 'db.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    exit;
}

if (!in_array(strtolower($_SESSION['role'] ?? ''), ['super_admin', 'admin'], true)) {
    http_response_code(403);
    echo json_encode(['error' => 'Host access required']);
    exit;
}

$data = $_POST ?: (json_decode(file_get_contents('php://input'), true) ?? []);

$unitId = (int) ($data['unitId'] ?? 0);
$checkIn = trim((string) ($data['checkIn'] ?? ''));
$checkOut = trim((string) ($data['checkOut'] ?? ''));
$guests = (int) ($data['guests'] ?? 1);
$guestName = trim((string) ($data['guestName'] ?? ''));
$guestContactNum = trim((string) ($data['guestContactNum'] ?? ''));
$guestEmail = strtolower(trim((string) ($data['guestEmail'] ?? '')));

if (!$unitId || !$checkIn || !$checkOut || $guests < 1 || !$guestName || !$guestContactNum) {
    http_response_code(400);
    echo json_encode(['error' => 'Unit, dates, guest count, name, and contact number are required']);
    exit;
}

if (!preg_match('/^[0-9]{11}$/', $guestContactNum)) {
    http_response_code(400);
    echo json_encode(['error' => 'Guest contact number must be 11 digits.']);
    exit;
}

if ($guests > 4) {
    http_response_code(400);
    echo json_encode(['error' => 'Maximum 4 guests per unit.']);
    exit;
}

$checkInDate = DateTime::createFromFormat('Y-m-d', $checkIn);
$checkOutDate = DateTime::createFromFormat('Y-m-d', $checkOut);

if (!$checkInDate || !$checkOutDate || $checkOutDate <= $checkInDate) {
    http_response_code(400);
    echo json_encode(['error' => 'Check-out must be after check-in.']);
    exit;
}

$today = new DateTime('today');
if ($checkInDate < $today) {
    http_response_code(400);
    echo json_encode(['error' => 'Bookings cannot be made for dates that have already passed.']);
    exit;
}

$unit = $pdo->prepare(
    'SELECT u.unit_id, u.unit_name, u.max_guests, u.rate_per_night, u.available_from, u.available_until
     FROM units u
     WHERE u.unit_id = ?'
);
$unit->execute([$unitId]);
$unitData = $unit->fetch(PDO::FETCH_ASSOC);

if (!$unitData) {
    http_response_code(404);
    echo json_encode(['error' => 'Unit not found']);
    exit;
}

if ($guests > (int) $unitData['max_guests']) {
    http_response_code(400);
    echo json_encode(['error' => 'Guest count exceeds the unit limit.']);
    exit;
}

if (!empty($unitData['available_from']) && $checkIn < $unitData['available_from']) {
    http_response_code(400);
    echo json_encode(['error' => 'The selected check-in date is before this listing becomes available.']);
    exit;
}

if (!empty($unitData['available_until']) && $checkOut > $unitData['available_until']) {
    http_response_code(400);
    echo json_encode(['error' => 'The selected stay extends beyond this listing’s availability period.']);
    exit;
}

$overlap = $pdo->prepare(
    'SELECT booking_id
     FROM bookings
     WHERE unit_id = ?
     AND status NOT IN (\'cancelled\', \'rejected\')
     AND check_in_date < ?
     AND check_out_date > ?
     LIMIT 1'
);
$overlap->execute([$unitId, $checkOut, $checkIn]);
if ($overlap->fetch()) {
    http_response_code(409);
    echo json_encode(['error' => 'This unit is already booked for some or all of the selected dates.']);
    exit;
}

$blocked = $pdo->prepare(
    'SELECT reason
     FROM unit_blocked_dates
     WHERE unit_id = ?
     AND blocked_from <= ?
     AND blocked_until >= ?
     LIMIT 1'
);
$blocked->execute([$unitId, $checkOut, $checkIn]);
if ($blocked->fetch()) {
    http_response_code(409);
    echo json_encode(['error' => 'This unit is blocked for the selected dates.']);
    exit;
}

$guestEmail = $guestEmail !== '' ? $guestEmail : 'guest+' . time() . '@booking.local';

try {
    $pdo->beginTransaction();

    $userInsert = $pdo->prepare(
        'INSERT INTO users (full_name, email, password, role, contact_num)
         VALUES (?, ?, ?, \"customer\", ?)'
    );
    $userInsert->execute([
        $guestName,
        $guestEmail,
        password_hash('guest-booking-' . time(), PASSWORD_DEFAULT),
        $guestContactNum,
    ]);

    $userId = (int) $pdo->lastInsertId();

    $customerCheck = $pdo->prepare('SELECT customer_id FROM customer_profiles WHERE user_id = ? LIMIT 1');
    $customerCheck->execute([$userId]);
    $customerId = $customerCheck->fetchColumn();

    if (!$customerId) {
        $customerInsert = $pdo->prepare('INSERT INTO customer_profiles (user_id) VALUES (?)');
        $customerInsert->execute([$userId]);
        $customerId = (int) $pdo->lastInsertId();
    }

    $bookingInsert = $pdo->prepare(
        'INSERT INTO bookings (customer_id, unit_id, check_in_date, check_out_date, num_of_guests, status)
         VALUES (?, ?, ?, ?, ?, \"confirmed\")'
    );
    $bookingInsert->execute([
        $customerId,
        $unitId,
        $checkIn,
        $checkOut,
        $guests,
    ]);

    $bookingId = (int) $pdo->lastInsertId();

    $detailsInsert = $pdo->prepare(
        'INSERT INTO booking_details (booking_id, guest_name, guest_contact_num, guest_email, valid_id_path, vehicle_type, special_requests)
         VALUES (?, ?, ?, ?, \"not_uploaded\", NULL, NULL)'
    );
    $detailsInsert->execute([
        $bookingId,
        $guestName,
        $guestContactNum,
        $guestEmail,
    ]);

    $nights = (int) $checkOutDate->diff($checkInDate)->days;
    $amount = (float) $unitData['rate_per_night'] * $nights;

    $paymentInsert = $pdo->prepare(
        'INSERT INTO payments (booking_id, amount, payment_method, proof_of_payment, payment_status, verified_by, verified_at)
         VALUES (?, ?, \"cash\", \"manual-admin-booking\", \"verified\", NULL, NOW())'
    );
    $paymentInsert->execute([$bookingId, $amount]);

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'bookingId' => $bookingId,
        'status' => 'confirmed',
    ]);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);
    echo json_encode(['error' => 'Unable to create booking.']);
}
