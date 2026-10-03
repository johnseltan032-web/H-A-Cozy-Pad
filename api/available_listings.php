<?php

require 'db.php';
require 'booking_slot_limit.php';

header('Content-Type: application/json');

$checkIn = trim((string) ($_GET['check_in_date'] ?? ''));
$checkOut = trim((string) ($_GET['check_out_date'] ?? ''));
$guestCount = null;
if (isset($_GET['num_of_guests']) && $_GET['num_of_guests'] !== '') {
    $guestCount = filter_var($_GET['num_of_guests'], FILTER_VALIDATE_INT, [
        'options' => ['min_range' => 1],
    ]);
    if ($guestCount === false) {
        http_response_code(400);
        echo json_encode(['error' => 'Guest count must be a positive whole number.']);
        exit;
    }
}

if ($checkIn !== '' && $checkOut !== '') {
    $checkInDate = DateTimeImmutable::createFromFormat('!Y-m-d', $checkIn);
    $checkInErrors = DateTimeImmutable::getLastErrors();
    $checkOutDate = DateTimeImmutable::createFromFormat('!Y-m-d', $checkOut);
    $checkOutErrors = DateTimeImmutable::getLastErrors();
    $datesValid = $checkInDate && $checkOutDate &&
        (!$checkInErrors || ($checkInErrors['warning_count'] === 0 && $checkInErrors['error_count'] === 0)) &&
        (!$checkOutErrors || ($checkOutErrors['warning_count'] === 0 && $checkOutErrors['error_count'] === 0)) &&
        $checkInDate->format('Y-m-d') === $checkIn &&
        $checkOutDate->format('Y-m-d') === $checkOut &&
        $checkOutDate > $checkInDate;
    if (!$datesValid) {
        http_response_code(400);
        echo json_encode(['error' => 'Provide a valid check-in and check-out date range.']);
        exit;
    }
}

try {
    $tables = $pdo->query("SHOW TABLES LIKE 'buildings'")->fetchColumn();
    if (!$tables) {
        http_response_code(500);
        echo json_encode(['error' => 'Database tables are not ready yet.']);
        exit;
    }

    $stmt = $pdo->query(
        "SELECT
            b.building_id,
            b.building_name,
            b.property_name,
            b.google_maps_url,

            u.unit_id,
            u.unit_name,
            u.tower,
            u.unit_number,
            u.description,
            u.max_guests,
            u.bathrooms,
            u.bedroom_details,
            u.rate_per_night,
            u.status,
            u.available_from,
            u.available_until,

            GROUP_CONCAT(
                DISTINCT a.amenity_name
                ORDER BY a.amenity_name
                SEPARATOR ', '
            ) AS amenities,

            GROUP_CONCAT(
                DISTINCT ui.image_path
                ORDER BY ui.image_id
                SEPARATOR '|||'
            ) AS images

        FROM buildings b

        INNER JOIN units u
            ON b.building_id = u.building_id

        LEFT JOIN unit_amenity ua
            ON ua.unit_id = u.unit_id

        LEFT JOIN unit_amenities a
            ON a.amenity_id = ua.amenity_id

        LEFT JOIN unit_images ui
            ON ui.unit_id = u.unit_id

        WHERE u.status = 'available'

        GROUP BY
            b.building_id,
            b.building_name,
            b.property_name,
            b.google_maps_url,

            u.unit_id,
            u.unit_name,
            u.tower,
            u.unit_number,
            u.description,
            u.max_guests,
            u.bathrooms,
            u.bedroom_details,
            u.rate_per_night,
            u.status,
            u.available_from,
            u.available_until

        ORDER BY u.created_at DESC"
    );

    $listings = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if ($guestCount !== null && $guestCount > 0) {
        $listings = array_values(array_filter(
            $listings,
            static fn ($listing) => (int) $listing['max_guests'] >= $guestCount
        ));
    }

    if ($checkIn !== '' && $checkOut !== '') {
        $blockedQuery = $pdo->prepare(
            'SELECT 1
             FROM unit_blocked_dates
             WHERE unit_id = ?
               AND blocked_from <= ?
               AND blocked_until >= ?
             LIMIT 1'
        );
        $availableListings = [];
        foreach ($listings as $listing) {
            if (
                (!empty($listing['available_from']) && $checkIn < $listing['available_from']) ||
                (!empty($listing['available_until']) && $checkOut > $listing['available_until'])
            ) {
                continue;
            }

            $blockedQuery->execute([$listing['unit_id'], $checkOut, $checkIn]);
            if ($blockedQuery->fetchColumn() || !hasBookingSlotForRange(
                $pdo,
                (int) $listing['unit_id'],
                $checkIn,
                $checkOut
            )) {
                continue;
            }

            $availableListings[] = $listing;
        }
        $listings = $availableListings;
    }

    foreach ($listings as &$listing) {
        $listing['bedroom_details'] = json_decode($listing['bedroom_details'] ?? '[]', true) ?: [];

        if (!empty($listing['images'])) {
            $listing['images'] = explode('|||', $listing['images']);
        } else {
            $listing['images'] = [];
        }
    }

    unset($listing);
    echo json_encode($listings);
} catch (Throwable $e) {
    error_log('available_listings.php failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Unable to load listings right now.']);
    exit;
}