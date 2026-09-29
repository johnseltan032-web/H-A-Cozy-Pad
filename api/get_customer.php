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

$bookingId = $_GET['bookingId'] ?? null;

if (!$bookingId || !ctype_digit((string) $bookingId)) {
    http_response_code(400);
    echo json_encode([
        'error' => 'A valid booking ID is required'
    ]);
    exit;
}

try {
    $stmt = $pdo->prepare(
        'SELECT
            b.booking_id,
            b.status,
            b.cancellation_reason,
            b.cancelled_at,
            cp.customer_id,
            usr.user_id,
            COALESCE(usr.full_name, bd.guest_name) AS full_name,
            COALESCE(usr.email, bd.guest_email) AS email,
            COALESCE(usr.contact_num, bd.guest_contact_num) AS contact_num,
            bd.guest_name,
            bd.guest_contact_num,
            bd.guest_email,
            bd.valid_id_path,
            bd.vehicle_type,
            bd.special_requests,
            p.payment_id,
            p.amount,
            p.payment_method,
            p.proof_of_payment,
            p.payment_status,
            p.verified_by,
            p.verified_at

         FROM bookings b

            LEFT JOIN customer_profiles cp
            ON cp.customer_id = b.customer_id

            LEFT JOIN users usr
            ON usr.user_id = cp.user_id

         LEFT JOIN booking_details bd
            ON bd.booking_id = b.booking_id

         LEFT JOIN payments p
            ON p.booking_id = b.booking_id

         WHERE b.booking_id = ?'
    );

    $stmt->execute([$bookingId]);

    $customer = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$customer) {
        http_response_code(404);
        echo json_encode([
            'error' => 'Customer information not found'
        ]);
        exit;
    }

    echo json_encode([
        'success' => true,
        'customer' => [
            'bookingId' => (int) $customer['booking_id'],
            'bookingStatus' => $customer['status'],
            'cancellationReason' => $customer['cancellation_reason'],
            'cancelledAt' => $customer['cancelled_at'],
            'customerId' => $customer['customer_id'] !== null ? (int) $customer['customer_id'] : null,
            'userId' => $customer['user_id'] !== null ? (int) $customer['user_id'] : null,
            'fullName' => $customer['full_name'],
            'email' => $customer['email'],
            'contactNum' => $customer['contact_num'],
            'bookedGuestName' => $customer['guest_name'],
            'bookedGuestContactNum' => $customer['guest_contact_num'],
            'validIdPath' => $customer['valid_id_path'],
            'vehicleType' => $customer['vehicle_type'],
            'specialRequests' => $customer['special_requests'],
            'paymentId' => $customer['payment_id'] ? (int) $customer['payment_id'] : null,
            'paymentAmount' => $customer['amount'] !== null ? (float) $customer['amount'] : null,
            'paymentMethod' => $customer['payment_method'],
            'proofOfPaymentPath' => $customer['proof_of_payment'],
            'paymentStatus' => $customer['payment_status'],
            'verifiedBy' => $customer['verified_by'] ? (int) $customer['verified_by'] : null,
            'verifiedAt' => $customer['verified_at'],
        ]
    ]);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Unable to load customer information'
    ]);
}
?>
