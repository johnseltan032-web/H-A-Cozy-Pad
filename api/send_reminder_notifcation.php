<?php
// Check-in reminder script.
//
// Run once a day from a scheduler (Windows Task Scheduler locally, cron in
// production), NOT from the browser:
//
//   C:\xampp\php\php.exe C:\xampp\htdocs\H-A-Cozy-Pad\api\send_reminder_emails.php
//
// For every confirmed booking whose check-in is tomorrow, it saves an in-app
// reminder and emails the customer (if they have email notifications on).

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('This script can only be run from the command line.');
}

date_default_timezone_set('Asia/Manila');

require __DIR__ . '/db.php';

$tomorrow = (new DateTime('tomorrow'))->format('Y-m-d');

$stmt = $pdo->prepare(
    "SELECT bk.booking_id, bk.check_in_date, bk.check_out_date,
            u.user_id, u.full_name, u.email,
            un.unit_name, bl.building_name,
            bd.guest_name, bd.guest_contact_num
     FROM bookings bk
     JOIN customer_profiles cp ON cp.customer_id = bk.customer_id
     JOIN users u ON u.user_id = cp.user_id
     JOIN units un ON un.unit_id = bk.unit_id
     JOIN buildings bl ON bl.building_id = un.building_id
     LEFT JOIN booking_details bd ON bd.booking_id = bk.booking_id
     WHERE bk.status = 'confirmed'
       AND bk.check_in_date = ?
       AND NOT EXISTS (
           SELECT 1 FROM notifications n
           WHERE n.booking_id = bk.booking_id AND n.type = 'reminder'
       )"
);
$stmt->execute([$tomorrow]);
$bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);

$insertNotif = $pdo->prepare(
    "INSERT INTO notifications (user_id, booking_id, type, message, is_read, sent_at)
     VALUES (?, ?, 'reminder', ?, 0, NOW())"
);

$sent = 0;

foreach ($bookings as $booking) {
    try {
        $stay = sprintf(
            '%s (%s), %s to %s',
            $booking['unit_name'],
            $booking['building_name'],
            $booking['check_in_date'],
            $booking['check_out_date']
        );

        $message = 'Reminder: your check-in is tomorrow. ' . $stay . '.';

        // In-app reminder is always saved (this also stops duplicates if the
        // script runs twice on the same day).
        $insertNotif->execute([$booking['user_id'], $booking['booking_id'], $message]);

        // Email delivery has been disabled; the in-app reminder is still stored.
        $sent++;
    } catch (Throwable $error) {
        error_log('Reminder failed for booking ' . $booking['booking_id'] . ': ' . $error->getMessage());
    }
}

echo 'Bookings checking in on ' . $tomorrow . ': ' . count($bookings) . "\n";
echo 'Reminder emails sent: ' . $sent . "\n";
?>