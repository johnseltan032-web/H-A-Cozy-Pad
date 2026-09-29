<?php
require "db.php";

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}

$buildingId = (int) ($_GET['building_id'] ?? 0);

if (!$buildingId) {
    http_response_code(400);
    echo json_encode(['error' => 'Building ID is required']);
    exit;
}

$stmt = $pdo->prepare(
    'SELECT
        b.building_id,
        b.building_name,
        b.location,
        b.location_search,
        b.country,
        b.state,
        b.city,
        b.street,
        b.unit_location,
        b.zip,
        b.latitude,
        b.longitude,
        u.unit_id,
        u.unit_name,
        u.tower,
        u.unit_number,
        u.description,
        u.property_size,
        u.max_guests,
        u.bathrooms,
        u.bedroom_details,
        u.rate_per_night,
        u.base_price,
        u.discounts,
        u.available_from,
        u.available_until,
        u.status,
        GROUP_CONCAT(DISTINCT a.amenity_name SEPARATOR "|||") AS amenities,
        GROUP_CONCAT(DISTINCT CONCAT(ui.image_id, "::", ui.image_path) ORDER BY ui.image_id SEPARATOR "|||") AS images
    FROM buildings b
    LEFT JOIN units u ON b.building_id = u.building_id
    LEFT JOIN unit_amenity ua ON ua.unit_id = u.unit_id
    LEFT JOIN unit_amenities a ON a.amenity_id = ua.amenity_id
    LEFT JOIN unit_images ui ON ui.unit_id = u.unit_id
    WHERE b.building_id = ?
    GROUP BY b.building_id, b.building_name, b.location,
        b.location_search, b.country, b.state, b.city, b.street,
        b.unit_location, b.zip, b.latitude, b.longitude, u.unit_id,
        u.unit_name, u.description,
        u.property_size, u.tower, u.unit_number, u.max_guests, u.bathrooms, u.bedroom_details,
        u.rate_per_night, u.base_price, u.discounts, u.available_from,
        u.available_until, u.status'
);

$stmt->execute([$buildingId]);

$listing = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$listing) {
    http_response_code(404);
    echo json_encode(['error' => 'Listing not found']);
    exit;
}

$listing['amenities'] = $listing['amenities']
    ? explode('|||', $listing['amenities'])
    : [];

$listing['bedroom_details'] = json_decode($listing['bedroom_details'] ?? '[]', true) ?: [];
$listing['discounts'] = json_decode($listing['discounts'] ?? '[]', true) ?: [];

$listing['images'] = $listing['images']
    ? array_map(static function ($image) {
        [$imageId, $imagePath] = explode('::', $image, 2);
        return [
            'image_id' => (int) $imageId,
            'image_path' => $imagePath,
        ];
    }, explode('|||', $listing['images']))
    : [];

echo json_encode($listing);
?>
