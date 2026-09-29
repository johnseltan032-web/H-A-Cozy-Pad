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

if (!in_array(strtolower($_SESSION['role'] ?? ''), ['super_admin', 'admin'], true)) {
    http_response_code(403);
    echo json_encode([
        'error' => 'Host access required'
    ]);
    exit;
}

try {
    $expireBookings = $pdo->prepare(
        "UPDATE bookings
         SET status = 'rejected'
         WHERE status NOT IN ('cancelled', 'rejected')
         AND check_out_date < CURDATE()"
    );

    $expireBookings->execute();

    $stmt = $pdo->query(
        "SELECT
            b.booking_id,
            b.check_in_date,
            b.check_out_date,
            b.num_of_guests,
            b.status,

            u.unit_id,
            u.unit_name,
            u.rate_per_night,

            bu.building_name,
            bu.location,

            COALESCE(usr.full_name, bd.guest_name) AS guest_name,
            COALESCE(usr.email, bd.guest_email) AS guest_email,
            COALESCE(usr.contact_num, bd.guest_contact_num) AS guest_contact_num,

            bd.guest_name AS booked_guest_name,
            bd.guest_contact_num AS booked_guest_contact_num,
            bd.valid_id_path,
            bd.vehicle_type,
            bd.special_requests,

            b.cancellation_reason,
            b.cancelled_at,

            br.request_id AS modification_request_id,
            br.request_reason AS modification_reason,
            br.requested_check_in,
            br.requested_check_out,
            br.requested_guests,
            br.requested_special_requests,
            br.payment_amount AS modification_payment_amount,
            br.refund_amount AS modification_refund_amount,
            br.proof_of_payment AS modification_proof_of_payment,
            br.payment_status AS modification_payment_status

         FROM bookings b

            LEFT JOIN customer_profiles cp
            ON cp.customer_id = b.customer_id

            LEFT JOIN users usr
            ON usr.user_id = cp.user_id

         JOIN units u
            ON u.unit_id = b.unit_id

         JOIN buildings bu
            ON bu.building_id = u.building_id

         LEFT JOIN booking_details bd
            ON bd.booking_id = b.booking_id

         LEFT JOIN booking_requests br
            ON br.request_id = (
                SELECT br2.request_id
                FROM booking_requests br2
                WHERE br2.booking_id = b.booking_id
                AND br2.request_type = 'modification'
                AND br2.request_status = 'pending'
                ORDER BY br2.created_at DESC
                LIMIT 1
            )

         ORDER BY b.check_in_date ASC, b.created_at DESC"
    );

    echo json_encode([
        'reservations' => $stmt->fetchAll(PDO::FETCH_ASSOC)
    ]);

} catch (Throwable $error) {
    http_response_code(500);

    echo json_encode([
        'error' => 'Unable to load reservations'
    ]);
}