<?php

require 'db.php';

header('Content-Type: application/json');

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