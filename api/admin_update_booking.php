<?php
require 'db.php';
require 'activity_log_helper.php';
require 'guest_count.php';
require 'booking_slot_limit.php';

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

$data = json_decode(file_get_contents('php://input'), true);
if (empty($data) && !empty($_POST)) {
    $data = $_POST;
}

$bookingId = (int) ($data['bookingId'] ?? 0);
$guestName = trim((string) ($data['guestName'] ?? ''));
$guestContactNum = trim((string) ($data['guestContactNum'] ?? ''));
$guestEmail = strtolower(trim((string) ($data['guestEmail'] ?? '')));
$unitId = (int) ($data['unitId'] ?? 0);
$checkIn = trim((string) ($data['checkIn'] ?? ''));
$checkOut = trim((string) ($data['checkOut'] ?? ''));
$guests = parseGuestCount($data['guests'] ?? null);
$paymentAmount = isset($data['paymentAmount']) && $data['paymentAmount'] !== '' ? (float) $data['paymentAmount'] : null;
$paymentMethod = trim((string) ($data['paymentMethod'] ?? 'cash'));
$paymentStatus = trim((string) ($data['paymentStatus'] ?? 'pending'));
$bookingStatus = trim((string) ($data['bookingStatus'] ?? 'pending'));
$bookingSource = trim((string) ($data['bookingSource'] ?? 'direct'));
$notes = trim((string) ($data['notes'] ?? ''));

if (!$bookingId) {
    http_response_code(400);
    echo json_encode(['error' => 'A valid booking ID is required']);
    exit;
}

if (!$guestName || !$guestContactNum || !$unitId || !$checkIn || !$checkOut || $guests === null) {
    http_response_code(400);
    echo json_encode(['error' => 'Guest, contact, unit, and dates are required']);
    exit;
}

if (!preg_match('/^[0-9]{11}$/', $guestContactNum)) {
    http_response_code(400);
    echo json_encode(['error' => 'Contact number must be 11 digits']);
    exit;
}

$checkInDate = DateTime::createFromFormat('Y-m-d', $checkIn);
$checkOutDate = DateTime::createFromFormat('Y-m-d', $checkOut);
if (!$checkInDate || !$checkOutDate || $checkOutDate <= $checkInDate) {
    http_response_code(400);
    echo json_encode(['error' => 'Check-out must be after the check-in date']);
    exit;
}

$allowedPaymentMethods = ['e-wallet', 'bank_transfer', 'cash', 'card'];
if (!in_array($paymentMethod, $allowedPaymentMethods, true)) {
    $paymentMethod = 'cash';
}

$allowedPaymentStatus = ['pending', 'verified', 'rejected', 'refunded'];
if (!in_array($paymentStatus, $allowedPaymentStatus, true)) {
    $paymentStatus = 'pending';
}

$allowedBookingStatus = ['pending', 'awaiting_payment', 'payment_review', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'rejected'];
if (!in_array($bookingStatus, $allowedBookingStatus, true)) {
    $bookingStatus = 'pending';
}

try {
    $bookingCheck = $pdo->prepare(
        'SELECT b.booking_id, b.status, u.unit_id, u.rate_per_night, u.available_from, u.available_until,
                bd.guest_email, bd.special_requests
         FROM bookings b
         LEFT JOIN booking_details bd ON bd.booking_id = b.booking_id
         LEFT JOIN units u ON u.unit_id = b.unit_id
         WHERE b.booking_id = ?'
    );
    $bookingCheck->execute([$bookingId]);
    $booking = $bookingCheck->fetch(PDO::FETCH_ASSOC);

    if (!$booking) {
        http_response_code(404);
        echo json_encode(['error' => 'Booking not found']);
        exit;
    }

    $unitCheck = $pdo->prepare(
        'SELECT unit_id, available_from, available_until, rate_per_night
         FROM units
         WHERE unit_id = ?'
    );
    $unitCheck->execute([$unitId]);
    $unit = $unitCheck->fetch(PDO::FETCH_ASSOC);

    if (!$unit) {
        http_response_code(404);
        echo json_encode(['error' => 'Unit not found']);
        exit;
    }

    if (!empty($unit['available_from']) && $checkIn < $unit['available_from']) {
        http_response_code(400);
        echo json_encode(['error' => 'The selected check-in date is before this listing becomes available']);
        exit;
    }

    if (!empty($unit['available_until']) && $checkOut > $unit['available_until']) {
        http_response_code(400);
        echo json_encode(['error' => 'The selected stay extends beyond this listing’s availability period']);
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
        echo json_encode(['error' => 'This unit is blocked for the selected dates']);
        exit;
    }

    if ($paymentAmount === null) {
        $paymentAmount = isset($booking['rate_per_night']) && $booking['rate_per_night'] !== null
            ? ((float) $booking['rate_per_night']) * max(1, $checkOutDate->diff($checkInDate)->days)
            : 0;
    }

    $pdo->beginTransaction();

    $lockBooking = $pdo->prepare('SELECT booking_id FROM bookings WHERE booking_id = ? FOR UPDATE');
    $lockBooking->execute([$bookingId]);
    if (!$lockBooking->fetchColumn()) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['error' => 'Booking not found']);
        exit;
    }

    if (!in_array($bookingStatus, ['cancelled', 'rejected'], true)) {
        $lockUnit = $pdo->prepare('SELECT unit_id FROM units WHERE unit_id = ? FOR UPDATE');
        $lockUnit->execute([$unitId]);
        if (!hasBookingSlotForRange($pdo, $unitId, $checkIn, $checkOut, $bookingId)) {
            $pdo->rollBack();
            http_response_code(409);
            echo json_encode(['error' => 'This listing has reached its maximum number of overlapping reservations for at least one selected night.']);
            exit;
        }
    }

    $bookingUpdate = $pdo->prepare(
        'UPDATE bookings
         SET unit_id = ?,
             check_in_date = ?,
             check_out_date = ?,
             num_of_guests = ?,
             status = ?,
             booking_source = ?,
             notes = ?
         WHERE booking_id = ?'
    );
    $bookingUpdate->execute([
        $unitId,
        $checkIn,
        $checkOut,
        $guests,
        $bookingStatus,
        $bookingSource !== '' ? $bookingSource : 'direct',
        $notes !== '' ? $notes : null,
        $bookingId,
    ]);

    $detailsUpdate = $pdo->prepare(
        'UPDATE booking_details
         SET guest_name = ?,
             guest_contact_num = ?,
             guest_email = ?,
             special_requests = ?
         WHERE booking_id = ?'
    );
    $detailsUpdate->execute([
        $guestName,
        $guestContactNum,
        $guestEmail !== '' ? $guestEmail : null,
        $notes !== '' ? $notes : ($booking['special_requests'] ?? null),
        $bookingId,
    ]);

    $paymentCheck = $pdo->prepare('SELECT payment_id FROM payments WHERE booking_id = ? LIMIT 1');
    $paymentCheck->execute([$bookingId]);
    $paymentId = $paymentCheck->fetchColumn();

    if ($paymentId) {
        $paymentUpdate = $pdo->prepare(
            'UPDATE payments
             SET amount = ?,
                 payment_method = ?,
                 payment_status = ?
             WHERE payment_id = ?'
        );
        $paymentUpdate->execute([
            $paymentAmount,
            $paymentMethod,
            $paymentStatus,
            $paymentId,
        ]);
    } else {
        $paymentInsert = $pdo->prepare(
            'INSERT INTO payments (booking_id, amount, payment_method, proof_of_payment, payment_status, verified_by, verified_at)
             VALUES (?, ?, ?, ?, ?, NULL, NULL)'
        );
        $paymentInsert->execute([
            $bookingId,
            $paymentAmount,
            $paymentMethod,
            'manual-admin-edit',
            $paymentStatus,
        ]);
    }

    $unitName = $pdo->prepare('SELECT unit_name FROM units WHERE unit_id = ?');
    $unitName->execute([$unitId]);
    $activityAction = $bookingStatus === 'cancelled' ? 'cancel_booking' : 'edit_booking';
    $activityDescription = $bookingStatus === 'cancelled' ? 'cancelled' : 'edited reservation';
    writeActivityLog(
        $pdo,
        $activityAction,
        $activityDescription . ' for Unit ' . ($unitName->fetchColumn() ?: $unitId) . ' (booking #BK-' . $bookingId . ')',
        'booking',
        (string) $bookingId
    );
    $pdo->commit();

    echo json_encode([
        'success' => true,
        'bookingId' => $bookingId,
        'status' => 'updated'
    ]);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);
    error_log('admin_update_booking failed: ' . $error->getMessage());
    echo json_encode(['error' => 'Unable to update booking']);
}
