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
            'error' => 'Only customer accounts can view bookings'
        ]);
        exit;
    }

    $bookings = $pdo->prepare(
        'SELECT
            b.booking_id,
            b.unit_id,
            b.check_in_date,
            b.check_out_date,
            b.num_of_guests,
            b.status,
            b.cancellation_reason,
            b.cancelled_at,

            bd.guest_name,
            bd.guest_contact_num,
            bd.vehicle_type,
            bd.special_requests,

            u.unit_name

         FROM bookings b

         LEFT JOIN booking_details bd
            ON bd.booking_id = b.booking_id

         LEFT JOIN units u
            ON u.unit_id = b.unit_id

         WHERE b.customer_id = ?

         ORDER BY b.booking_id DESC'
    );

    $bookings->execute([$customerId]);

    $rows = $bookings->fetchAll(PDO::FETCH_ASSOC);

    $result = array_map(
        static function ($booking) {
            return [
                'bookingId' => (int) $booking['booking_id'],
                'unitId' => (int) $booking['unit_id'],
                'unitName' => $booking['unit_name'],

                'checkIn' => $booking['check_in_date'],
                'checkOut' => $booking['check_out_date'],
                'guests' => (int) $booking['num_of_guests'],

                'status' => $booking['status'],

                'cancellationReason' => $booking['cancellation_reason'],
                'cancelledAt' => $booking['cancelled_at'],

                'guestName' => $booking['guest_name'],
                'guestContactNum' => $booking['guest_contact_num'],
                'vehicleType' => $booking['vehicle_type'],
                'specialRequests' => $booking['special_requests'],
            ];
        },
        $rows
    );

    echo json_encode([
        'success' => true,
        'bookings' => $result
    ]);

} catch (Throwable $error) {
    http_response_code(500);

    echo json_encode([
        'error' => 'Unable to load bookings'
    ]);
}
?>
