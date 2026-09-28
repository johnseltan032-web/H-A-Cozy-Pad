<?php
require 'db.php';
require __DIR__ . '/mailer.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    exit;
}

$data = $_POST ?: (json_decode(file_get_contents('php://input'), true) ?? []);

$unitId = (int) ($data['unitId'] ?? 0);
$checkIn = trim($data['checkIn'] ?? '');
$checkOut = trim($data['checkOut'] ?? '');
$guests = (int) ($data['guests'] ?? 1);
$guestName = trim($data['guestName'] ?? '');
$guestContactNum = trim($data['guestContactNum'] ?? '');
$vehicleType = trim($data['vehicleType'] ?? '');
$specialRequests = trim($data['specialRequests'] ?? '');

if (!$unitId || !$checkIn || !$checkOut || $guests < 1 || !$guestName || !$guestContactNum) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Unit, dates, guest count, name, and contact number are required'
    ]);
    exit;
}

if (strlen($guestName) > 50 || !preg_match('/^[0-9]{11}$/', $guestContactNum)) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Guest name or contact number is invalid'
    ]);
    exit;
}

$checkInDate = DateTime::createFromFormat('Y-m-d', $checkIn);
$checkOutDate = DateTime::createFromFormat('Y-m-d', $checkOut);

if (!$checkInDate || !$checkOutDate || $checkOutDate <= $checkInDate) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Check-out must be after check-in'
    ]);
    exit;
}

$today = new DateTime('today');

if ($checkInDate < $today) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Bookings cannot be made for dates that have already passed'
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
        http_response_code(400);
        echo json_encode([
            'error' => 'Only customer accounts can make bookings'
        ]);
        exit;
    }

    $unit = $pdo->prepare(
        'SELECT u.unit_id, u.unit_name, u.max_guests, u.rate_per_night, u.available_from, u.available_until, b.building_name
         FROM units u
         JOIN buildings b ON b.building_id = u.building_id
         WHERE u.unit_id = ?'
    );
    $unit->execute([$unitId]);
    $unitData = $unit->fetch(PDO::FETCH_ASSOC);

    if (!$unitData) {
        http_response_code(404);
        echo json_encode([
            'error' => 'Unit not found'
        ]);
        exit;
    }

    $availableFrom = $unitData['available_from'];
    $availableUntil = $unitData['available_until'];

    if (empty($availableFrom) || empty($availableUntil)) {
        http_response_code(400);
        echo json_encode([
            'error' => 'This listing does not have a valid availability period.'
        ]);
        exit;
    }

    if ($checkIn < $availableFrom) {
        http_response_code(400);
        echo json_encode([
            'error' => 'The selected check-in date is before this listing becomes available.'
        ]);
        exit;
    }

    if ($checkOut > $availableUntil) {
        http_response_code(400);
        echo json_encode([
            'error' => 'The selected stay extends beyond this listing’s availability period.'
        ]);
        exit;
    }

    if ($guests > (int) $unitData['max_guests']) {
        http_response_code(400);
        echo json_encode([
            'error' => 'Guest count exceeds the unit limit'
        ]);
        exit;
    }

    if (
        !isset($_FILES['proofOfPayment']) ||
        $_FILES['proofOfPayment']['error'] === UPLOAD_ERR_NO_FILE
    ) {
        http_response_code(400);
        echo json_encode([
            'error' => 'Proof of payment is required'
        ]);
        exit;
    }

    if ($_FILES['proofOfPayment']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode([
            'error' => 'Unable to upload proof of payment'
        ]);
        exit;
    }

    if ($_FILES['proofOfPayment']['size'] > 1024 * 1024) {
        http_response_code(400);
        echo json_encode([
            'error' => 'Proof of payment must be smaller than 1 MB'
        ]);
        exit;
    }

    $paymentMimeType = (new finfo(FILEINFO_MIME_TYPE))
        ->file($_FILES['proofOfPayment']['tmp_name']);

    $paymentExtension = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png'
    ][$paymentMimeType] ?? null;

    if (!$paymentExtension) {
        http_response_code(400);
        echo json_encode([
            'error' => 'Proof of payment must be a JPG or PNG image'
        ]);
        exit;
    }

    $pdo->beginTransaction();

    $lockedUnit = $pdo->prepare(
        'SELECT unit_id
         FROM units
         WHERE unit_id = ?
         FOR UPDATE'
    );
    $lockedUnit->execute([$unitId]);

    $overlap = $pdo->prepare(
        'SELECT booking_id
         FROM bookings
         WHERE unit_id = ?
         AND status NOT IN (\'cancelled\', \'rejected\')
         AND check_in_date < ?
         AND check_out_date > ?
         LIMIT 1'
    );
    $overlap->execute([
        $unitId,
        $checkOut,
        $checkIn
    ]);

    if ($overlap->fetch()) {
        $pdo->rollBack();

        http_response_code(409);
        echo json_encode([
            'error' => 'This room is already booked for some or all of those dates'
        ]);
        exit;
    }

    $booking = $pdo->prepare(
        'INSERT INTO bookings
            (customer_id, unit_id, check_in_date, check_out_date, num_of_guests, status)
         VALUES (?, ?, ?, ?, ?, \'payment_review\')'
    );

    $booking->execute([
        $customerId,
        $unitId,
        $checkIn,
        $checkOut,
        $guests
    ]);

    $bookingId = (int) $pdo->lastInsertId();

    $uploadDirectory = __DIR__ . '/uploads/bookings/' . $bookingId;

    if (
        !is_dir($uploadDirectory) &&
        !mkdir($uploadDirectory, 0755, true) &&
        !is_dir($uploadDirectory)
    ) {
        throw new RuntimeException('Unable to create upload directory');
    }

    $validIdPath = 'not_uploaded';

    if (
        isset($_FILES['govId']) &&
        $_FILES['govId']['error'] !== UPLOAD_ERR_NO_FILE
    ) {
        if ($_FILES['govId']['error'] !== UPLOAD_ERR_OK) {
            throw new RuntimeException('Unable to upload government ID');
        }

        if ($_FILES['govId']['size'] > 1024 * 1024) {
            throw new RuntimeException(
                'Government ID must be smaller than 1 MB'
            );
        }

        $idMimeType = (new finfo(FILEINFO_MIME_TYPE))
            ->file($_FILES['govId']['tmp_name']);

        $idExtension = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png'
        ][$idMimeType] ?? null;

        if (!$idExtension) {
            throw new RuntimeException(
                'Government ID must be a JPG or PNG image'
            );
        }

        $validIdPath =
            'uploads/bookings/' .
            $bookingId .
            '/government-id.' .
            $idExtension;

        if (!move_uploaded_file(
            $_FILES['govId']['tmp_name'],
            __DIR__ . '/' . $validIdPath
        )) {
            throw new RuntimeException(
                'Unable to save government ID'
            );
        }
    }

    $proofOfPaymentPath =
        'uploads/bookings/' .
        $bookingId .
        '/proof-of-payment.' .
        $paymentExtension;

    if (!move_uploaded_file(
        $_FILES['proofOfPayment']['tmp_name'],
        __DIR__ . '/' . $proofOfPaymentPath
    )) {
        throw new RuntimeException(
            'Unable to save proof of payment'
        );
    }

    $details = $pdo->prepare(
        'INSERT INTO booking_details
            (booking_id, guest_name, guest_contact_num, valid_id_path, vehicle_type, special_requests)
         VALUES (?, ?, ?, ?, ?, ?)'
    );

    $details->execute([
        $bookingId,
        $guestName,
        $guestContactNum,
        $validIdPath,
        $vehicleType ?: null,
        $specialRequests ?: null
    ]);

    $nights = (int) $checkOutDate->diff($checkInDate)->days;
    $amount = (float) $unitData['rate_per_night'] * $nights;

    $payment = $pdo->prepare(
        'INSERT INTO payments
            (booking_id, amount, payment_method, proof_of_payment, payment_status, verified_by, verified_at)
         VALUES (?, ?, ?, ?, \'pending\', NULL, NULL)'
    );

    $payment->execute([
        $bookingId,
        $amount,
        'e-wallet',
        $proofOfPaymentPath
    ]);

    $pdo->commit();

    try {
        $admins = $pdo->query("SELECT user_id, full_name, email FROM users WHERE role = 'admin'");
        $adminList = $admins->fetchAll(PDO::FETCH_ASSOC);

        $notifyMessage = sprintf(
            '%s requested a booking at %s (%s) for %s to %s.',
            $guestName,
            $unitData['unit_name'],
            $unitData['building_name'],
            $checkIn,
            $checkOut
        );

        $insertNotif = $pdo->prepare(
            "INSERT INTO notifications (user_id, booking_id, type, message, is_read, sent_at)
             VALUES (?, ?, 'booking', ?, 0, NOW())"
        );

        foreach ($adminList as $admin) {
            $insertNotif->execute([$admin['user_id'], $bookingId, $notifyMessage]);

            sendNotificationMail(
                $pdo,
                (int) $admin['user_id'],
                $admin['email'],
                $admin['full_name'],
                'New booking request',
                '<p>Hi ' . htmlspecialchars($admin['full_name']) . ',</p>' .
                '<p>' . htmlspecialchars($notifyMessage) . '</p>' .
                '<p>Guest contact number: ' . htmlspecialchars($guestContactNum) . '</p>' .
                '<p>Review it in your dashboard.</p>'
            );
        }
    } catch (Throwable $notifyError) {
        error_log('Booking notification/email failed: ' . $notifyError->getMessage());
    }

    echo json_encode([
        'success' => true,
        'bookingId' => $bookingId,
        'status' => 'payment_review',
        'proofOfPaymentPath' => $proofOfPaymentPath
    ]);

} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);
    echo json_encode([
        'error' => 'Unable to create booking'
    ]);
}
?>