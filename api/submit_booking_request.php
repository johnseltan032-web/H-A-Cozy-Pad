<?php

require 'db.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode([
        'error' => 'Authentication required'
    ]);
    exit;
}

$bookingId = (int) ($_POST['bookingId'] ?? 0);
$requestType = strtolower(trim($_POST['requestType'] ?? ''));
$requestReason = trim($_POST['requestReason'] ?? '');

$requestedCheckIn = trim($_POST['requestedCheckIn'] ?? '');
$requestedCheckOut = trim($_POST['requestedCheckOut'] ?? '');
$requestedGuests = (int) ($_POST['requestedGuests'] ?? 0);
$requestedSpecialRequests = trim($_POST['requestedSpecialRequests'] ?? '');
$requestedPaymentAmount = isset($_POST['paymentAmount']) && $_POST['paymentAmount'] !== '' ? (float) $_POST['paymentAmount'] : null;
$requestedRefundAmount = isset($_POST['refundAmount']) && $_POST['refundAmount'] !== '' ? (float) $_POST['refundAmount'] : null;

if ($bookingId <= 0) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Invalid booking ID'
    ]);
    exit;
}

if (!in_array($requestType, ['cancellation', 'modification'], true)) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Invalid request type'
    ]);
    exit;
}

if ($requestReason === '') {
    http_response_code(400);
    echo json_encode([
        'error' => 'A reason or request description is required'
    ]);
    exit;
}

if ($requestType === 'modification') {
    if ($requestedCheckIn === '' || $requestedCheckOut === '') {
        http_response_code(400);
        echo json_encode([
            'error' => 'Check-in and check-out dates are required'
        ]);
        exit;
    }

    if ($requestedGuests <= 0) {
        http_response_code(400);
        echo json_encode([
            'error' => 'Number of guests must be greater than zero'
        ]);
        exit;
    }

    if ($requestedCheckOut <= $requestedCheckIn) {
        http_response_code(400);
        echo json_encode([
            'error' => 'Check-out date must be after check-in date'
        ]);
        exit;
    }
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
            'error' => 'Only customer accounts can submit booking requests'
        ]);
        exit;
    }

    $booking = $pdo->prepare(
        'SELECT
            b.booking_id,
            b.unit_id,
            b.check_in_date,
            b.check_out_date,
            b.num_of_guests,
            u.rate_per_night,
            u.max_guests
         FROM bookings b
         INNER JOIN units u ON u.unit_id = b.unit_id
         WHERE b.booking_id = ?
         AND b.customer_id = ?'
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

    if (
        $requestType === 'modification' &&
        $requestedGuests > (int) $bookingData['max_guests']
    ) {
        http_response_code(400);
        echo json_encode([
            'error' => 'The requested number of guests exceeds the unit capacity'
        ]);
        exit;
    }

    $existingRequest = $pdo->prepare(
        'SELECT request_id
         FROM booking_requests
         WHERE booking_id = ?
         AND request_status = \'pending\'
         LIMIT 1'
    );

    $existingRequest->execute([$bookingId]);

    if ($existingRequest->fetch()) {
        http_response_code(409);
        echo json_encode([
            'error' => 'This booking already has a pending request'
        ]);
        exit;
    }

    if ($requestType === 'modification') {
        $unitState = $pdo->prepare(
            'SELECT status, available_from, available_until
             FROM units
             WHERE unit_id = ?'
        );
        $unitState->execute([$bookingData['unit_id']]);
        $unitStateData = $unitState->fetch(PDO::FETCH_ASSOC);

        if (!$unitStateData) {
            http_response_code(404);
            echo json_encode([
                'error' => 'Unit no longer exists.'
            ]);
            exit;
        }

        if (in_array($unitStateData['status'] ?? '', ['occupied', 'maintenance', 'unavailable'], true)) {
            http_response_code(409);
            echo json_encode([
                'error' => 'This unit is currently occupied or blocked and cannot be moved to the requested dates.'
            ]);
            exit;
        }

        if (!empty($unitStateData['available_from']) && $requestedCheckIn < $unitStateData['available_from']) {
            http_response_code(409);
            echo json_encode([
                'error' => 'The requested check-in is before this unit is available.'
            ]);
            exit;
        }

        if (!empty($unitStateData['available_until']) && $requestedCheckOut > $unitStateData['available_until']) {
            http_response_code(409);
            echo json_encode([
                'error' => 'The requested dates extend beyond this unit’s availability window.'
            ]);
            exit;
        }

        $overlap = $pdo->prepare(
            'SELECT booking_id
             FROM bookings
             WHERE unit_id = ?
             AND booking_id != ?
             AND status NOT IN (\'cancelled\', \'rejected\')
             AND check_in_date < ?
             AND check_out_date > ?
             LIMIT 1'
        );

        $overlap->execute([
            $bookingData['unit_id'],
            $bookingId,
            $requestedCheckOut,
            $requestedCheckIn
        ]);

        if ($overlap->fetch()) {
            http_response_code(409);
            echo json_encode([
                'error' => 'This unit is already booked for some or all of the requested dates.'
            ]);
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
        $blocked->execute([$bookingData['unit_id'], $requestedCheckOut, $requestedCheckIn]);
        $blockedDate = $blocked->fetch(PDO::FETCH_ASSOC);

        if ($blockedDate) {
            http_response_code(409);
            echo json_encode([
                'error' => 'This unit is blocked for the requested dates due to ' . str_replace('_', ' ', $blockedDate['reason']) . '.'
            ]);
            exit;
        }

        $ratePerNight = (float) $bookingData['rate_per_night'];

        $oldNights = (int) $pdo->query(
            'SELECT DATEDIFF(
                \'' . $bookingData['check_out_date'] . '\',
                \'' . $bookingData['check_in_date'] . '\'
            )'
        )->fetchColumn();

        $newNights = (int) $pdo->query(
            'SELECT DATEDIFF(
                \'' . $requestedCheckOut . '\',
                \'' . $requestedCheckIn . '\'
            )'
        )->fetchColumn();

        $oldTotal = $oldNights * $ratePerNight;
        $newTotal = $newNights * $ratePerNight;
        $difference = $newTotal - $oldTotal;

        $paymentAmount = $requestedPaymentAmount !== null ? max(0, (float) $requestedPaymentAmount) : null;
        $refundAmount = $requestedRefundAmount !== null ? max(0, (float) $requestedRefundAmount) : null;
        $paymentStatus = 'not_required';
        $proofPath = null;

        if ($difference > 0) {
            $paymentAmount = $requestedPaymentAmount !== null
                ? max(0, (float) $requestedPaymentAmount)
                : $difference;
            $paymentStatus = 'pending';

            if (!isset($_FILES['proofOfPayment']) || $_FILES['proofOfPayment']['error'] === UPLOAD_ERR_NO_FILE) {
                http_response_code(400);
                echo json_encode([
                    'error' => 'Proof of payment is required for an additional payment'
                ]);
                exit;
            }

            $file = $_FILES['proofOfPayment'];

            if ($file['error'] !== UPLOAD_ERR_OK) {
                $uploadError = match ($file['error']) {
                    UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'The selected image exceeds the server upload limit. Try a smaller image or increase upload_max_filesize in PHP settings.',
                    UPLOAD_ERR_PARTIAL => 'The image upload was interrupted. Please try again.',
                    UPLOAD_ERR_NO_TMP_DIR, UPLOAD_ERR_CANT_WRITE, UPLOAD_ERR_EXTENSION => 'The server could not save the uploaded image. Please contact support.',
                    default => 'The image could not be uploaded. Please try again.',
                };

                http_response_code(400);
                echo json_encode([
                    'error' => $uploadError
                ]);
                exit;
            }

            if ($file['size'] > 10 * 1024 * 1024) {
                http_response_code(400);
                echo json_encode([
                    'error' => 'Proof of payment must not exceed 10MB'
                ]);
                exit;
            }

            $finfo = new finfo(FILEINFO_MIME_TYPE);
            $mimeType = strtolower((string) $finfo->file($file['tmp_name']));
            $fileExtension = strtolower(pathinfo($file['name'] ?? '', PATHINFO_EXTENSION));

            $allowedMimeTypes = [
                'image/jpeg',
                'image/jpg',
                'image/pjpeg',
                'image/png',
                'image/webp',
                'image/heic',
                'image/heif',
            ];

            $allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];

            $isAllowedMimeType = in_array($mimeType, $allowedMimeTypes, true);
            $isAllowedExtension = in_array($fileExtension, $allowedExtensions, true);

            if (!$isAllowedMimeType && !$isAllowedExtension) {
                http_response_code(400);
                echo json_encode([
                    'error' => 'Proof of payment must be a JPG, PNG, WEBP, HEIC, or HEIF image'
                ]);
                exit;
            }

            $uploadDirectory = __DIR__ . '/uploads/payment_proofs/';

            if (!is_dir($uploadDirectory)) {
                if (!mkdir($uploadDirectory, 0755, true)) {
                    throw new Exception('Unable to create payment proof directory');
                }
            }

            if (
                in_array($mimeType, ['image/jpeg', 'image/jpg', 'image/pjpeg'], true) ||
                in_array($fileExtension, ['jpg', 'jpeg'], true)
            ) {
                $extension = 'jpg';
            } elseif ($mimeType === 'image/png' || $fileExtension === 'png') {
                $extension = 'png';
            } elseif ($mimeType === 'image/webp' || $fileExtension === 'webp') {
                $extension = 'webp';
            } elseif ($mimeType === 'image/heic' || $fileExtension === 'heic') {
                $extension = 'heic';
            } elseif ($mimeType === 'image/heif' || $fileExtension === 'heif') {
                $extension = 'heif';
            } else {
                $extension = 'jpg';
            }

            $fileName = 'proof_' . $bookingId . '_' . bin2hex(random_bytes(8)) . '.' . $extension;

            $filePath = $uploadDirectory . $fileName;

            if (!move_uploaded_file($file['tmp_name'], $filePath)) {
                throw new Exception('Unable to save proof of payment');
            }

            $proofPath = 'uploads/payment_proofs/' . $fileName;
        } elseif ($difference < 0) {
            $refundAmount = $requestedRefundAmount !== null
                ? max(0, (float) $requestedRefundAmount)
                : abs($difference);
            $paymentStatus = 'not_required';
        }

        $request = $pdo->prepare(
            'INSERT INTO booking_requests
                (
                    booking_id,
                    request_type,
                    request_reason,
                    request_status,
                    requested_check_in,
                    requested_check_out,
                    requested_guests,
                    requested_special_requests,
                    payment_amount,
                    refund_amount,
                    proof_of_payment,
                    payment_status
                )
             VALUES (?, ?, ?, \'pending\', ?, ?, ?, ?, ?, ?, ?, ?)'
        );

        $request->execute([
            $bookingId,
            $requestType,
            $requestReason,
            $requestedCheckIn,
            $requestedCheckOut,
            $requestedGuests,
            $requestedSpecialRequests,
            $paymentAmount,
            $refundAmount,
            $proofPath,
            $paymentStatus
        ]);

        $requestId = (int) $pdo->lastInsertId();

        echo json_encode([
            'success' => true,
            'requestId' => $requestId,
            'bookingId' => $bookingId,
            'requestType' => $requestType,
            'requestStatus' => 'pending',
            'oldTotal' => $oldTotal,
            'newTotal' => $newTotal,
            'difference' => $difference,
            'paymentAmount' => $paymentAmount,
            'refundAmount' => $refundAmount,
            'paymentStatus' => $paymentStatus,
            'proofOfPayment' => $proofPath
        ]);

        exit;
    }

    $request = $pdo->prepare(
        'INSERT INTO booking_requests
            (
                booking_id,
                request_type,
                request_reason,
                request_status,
                payment_status
            )
         VALUES (?, ?, ?, \'pending\', \'not_required\')'
    );

    $request->execute([
        $bookingId,
        $requestType,
        $requestReason
    ]);

    echo json_encode([
        'success' => true,
        'requestId' => (int) $pdo->lastInsertId(),
        'bookingId' => $bookingId,
        'requestType' => $requestType,
        'requestStatus' => 'pending'
    ]);

} catch (Throwable $error) {
    http_response_code(500);

    echo json_encode([
        'error' => 'Unable to submit booking request',
        'details' => $error->getMessage()
    ]);
}