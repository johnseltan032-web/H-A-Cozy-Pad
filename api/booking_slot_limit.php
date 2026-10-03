<?php
function hasBookingSlotForRange(
    PDO $pdo,
    int $unitId,
    string $checkIn,
    string $checkOut,
    ?int $excludeBookingId = null
): bool {
    $unit = $pdo->prepare('SELECT max_guests FROM units WHERE unit_id = ?');
    $unit->execute([$unitId]);
    $bookingLimit = $unit->fetchColumn();

    if ($bookingLimit === false || (int) $bookingLimit < 1) {
        return false;
    }

    $sql = "
        SELECT check_in_date, check_out_date
        FROM bookings
        WHERE unit_id = ?
          AND status NOT IN ('cancelled', 'rejected')
          AND check_in_date < ?
          AND check_out_date > ?
    ";
    $parameters = [$unitId, $checkOut, $checkIn];

    if ($excludeBookingId !== null) {
        $sql .= ' AND booking_id <> ?';
        $parameters[] = $excludeBookingId;
    }

    $statement = $pdo->prepare($sql);
    $statement->execute($parameters);

    $events = [];
    foreach ($statement->fetchAll(PDO::FETCH_ASSOC) as $booking) {
        $start = max($booking['check_in_date'], $checkIn);
        $end = min($booking['check_out_date'], $checkOut);
        $events[$start] = ($events[$start] ?? 0) + 1;
        $events[$end] = ($events[$end] ?? 0) - 1;
    }

    ksort($events);
    $simultaneousBookings = 0;
    foreach ($events as $date => $change) {
        $simultaneousBookings += $change;
        if ($date < $checkOut && $simultaneousBookings >= (int) $bookingLimit) {
            return false;
        }
    }

    return true;
}
