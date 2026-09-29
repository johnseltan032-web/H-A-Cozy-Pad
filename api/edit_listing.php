<?php
require 'db.php';

$data = $_POST;

if (empty($data)) {
    $data = json_decode(file_get_contents('php://input'), true) ?? [];
}

$buildingId = (int) ($data['buildingId'] ?? 0);
$buildingName = trim($data['buildingName'] ?? '');
$propertyCategory = trim($data['propertyCategory'] ?? 'home');
$location = trim($data['location'] ?? '');
$locationSearch = trim($data['locationSearch'] ?? '');
$country = trim($data['country'] ?? '');
$state = trim($data['state'] ?? '');
$city = trim($data['city'] ?? '');
$street = trim($data['street'] ?? '');
$unitLocation = trim($data['unitLocation'] ?? '');
$zip = trim($data['zip'] ?? '');
$unitName = trim($data['unitName'] ?? 'Entire place');
$description = trim($data['description'] ?? '');
$propertySize = trim($data['propertySize'] ?? '');
$maxGuests = (int) ($data['maxGuests'] ?? 0);
$bathrooms = max(0, (int) ($data['bathrooms'] ?? 0));
$bedroomDetails = json_decode($data['bedroomDetails'] ?? '[]', true);
$ratePerNight = (float) ($data['ratePerNight'] ?? 0);
$basePrice = ($data['basePrice'] ?? '') !== '' ? (float) $data['basePrice'] : null;
$discounts = json_decode($data['discounts'] ?? '[]', true);
$availableFrom = trim($data['availableFrom'] ?? '');
$availableUntil = trim($data['availableUntil'] ?? '');
$amenities = $data['amenities'] ?? [];
$removeImageIds = $data['removeImageIds'] ?? [];

if (!is_array($amenities)) {
    $amenities = [$amenities];
}

if (!is_array($removeImageIds)) {
    $removeImageIds = [$removeImageIds];
}

if (!is_array($bedroomDetails)) {
    $bedroomDetails = [];
}

if (!is_array($discounts)) {
    $discounts = [];
}

$existingListing = $pdo->prepare(
    'SELECT
        b.location_search, b.country, b.state, b.city, b.street,
        b.unit_location, b.zip, u.property_size, u.bathrooms,
        u.bedroom_details, u.base_price, u.discounts
     FROM buildings b
     INNER JOIN units u ON u.building_id = b.building_id
     WHERE b.building_id = ?'
);
$existingListing->execute([$buildingId]);
$existing = $existingListing->fetch(PDO::FETCH_ASSOC);

if (!$existing) {
    http_response_code(404);
    echo json_encode(['error' => 'Listing not found']);
    exit;
}

$locationSearch = array_key_exists('locationSearch', $data)
    ? $locationSearch : ($existing['location_search'] ?? '');
$country = array_key_exists('country', $data) ? $country : ($existing['country'] ?? '');
$state = array_key_exists('state', $data) ? $state : ($existing['state'] ?? '');
$city = array_key_exists('city', $data) ? $city : ($existing['city'] ?? '');
$street = array_key_exists('street', $data) ? $street : ($existing['street'] ?? '');
$unitLocation = array_key_exists('unitLocation', $data) ? $unitLocation : ($existing['unit_location'] ?? '');
$zip = array_key_exists('zip', $data) ? $zip : ($existing['zip'] ?? '');
$propertySize = array_key_exists('propertySize', $data) ? $propertySize : ($existing['property_size'] ?? '');
$bathrooms = array_key_exists('bathrooms', $data) ? $bathrooms : (int) ($existing['bathrooms'] ?? 0);
$bedroomDetails = array_key_exists('bedroomDetails', $data)
    ? $bedroomDetails : (json_decode($existing['bedroom_details'] ?? '[]', true) ?: []);
$basePrice = array_key_exists('basePrice', $data) ? $basePrice : $existing['base_price'];
$discounts = array_key_exists('discounts', $data)
    ? $discounts : (json_decode($existing['discounts'] ?? '[]', true) ?: []);

if (!$buildingId || !$buildingName || !$location || !$description || $maxGuests < 1 || $maxGuests > 4 || $ratePerNight <= 0 || !$availableFrom || !$availableUntil) {
    http_response_code(400);
    echo json_encode(['error' => 'Complete the required listing fields. Maximum 4 guests per unit.']);
    exit;
}

if (!in_array($propertyCategory, ['home', 'hotel', 'unique'], true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid property category']);
    exit;
}

if ($availableUntil < $availableFrom) {
    http_response_code(400);
    echo json_encode(['error' => 'The availability end date cannot be before the start date.']);
    exit;
}

if (!is_array($amenities)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid amenities']);
    exit;
}

try {
    $pdo->beginTransaction();

    $building = $pdo->prepare(
        'UPDATE buildings
         SET building_name = ?, property_category = ?, location = ?,
             location_search = ?, country = ?, state = ?, city = ?,
             street = ?, unit_location = ?, zip = ?
         WHERE building_id = ?'
    );
    $building->execute([
        $buildingName,
        $propertyCategory,
        $location,
        $locationSearch,
        $country,
        $state,
        $city,
        $street,
        $unitLocation,
        $zip,
        $buildingId,
    ]);

    $unit = $pdo->prepare(
        'UPDATE units
         SET unit_name = ?, description = ?, property_size = ?, max_guests = ?,
             bathrooms = ?, bedroom_details = ?, rate_per_night = ?,
             base_price = ?, discounts = ?, available_from = ?, available_until = ?
         WHERE building_id = ?'
    );
    $unit->execute([
        $unitName,
        $description,
        $propertySize ?: null,
        $maxGuests,
        $bathrooms,
        json_encode($bedroomDetails),
        $ratePerNight,
        $basePrice,
        json_encode($discounts),
        $availableFrom,
        $availableUntil,
        $buildingId,
    ]);

    $unitQuery = $pdo->prepare(
        'SELECT unit_id FROM units WHERE building_id = ? LIMIT 1'
    );
    $unitQuery->execute([$buildingId]);
    $unitId = $unitQuery->fetchColumn();

    if (!$unitId) {
        throw new Exception('Unit not found');
    }

    $removeAmenities = $pdo->prepare(
        'DELETE FROM unit_amenity WHERE unit_id = ?'
    );
    $removeAmenities->execute([$unitId]);

    $saveAmenity = $pdo->prepare(
        'INSERT INTO unit_amenities (amenity_name) VALUES (?)
         ON DUPLICATE KEY UPDATE amenity_id = LAST_INSERT_ID(amenity_id)'
    );

    $linkAmenity = $pdo->prepare(
        'INSERT IGNORE INTO unit_amenity (unit_id, amenity_id) VALUES (?, ?)'
    );

    foreach ($amenities as $amenityName) {
        $amenityName = trim($amenityName);

        if ($amenityName === '') {
            continue;
        }

        $saveAmenity->execute([$amenityName]);
        $linkAmenity->execute([$unitId, $pdo->lastInsertId()]);
    }

    if ($removeImageIds) {
        $placeholders = implode(',', array_fill(0, count($removeImageIds), '?'));
        $removeImages = $pdo->prepare(
            "DELETE FROM unit_images WHERE unit_id = ? AND image_id IN ($placeholders)"
        );
        $removeImages->execute(array_merge([$unitId], array_map('intval', $removeImageIds)));
    }

    $uploadDirectory = __DIR__ . '/uploads/properties/';

    if (!is_dir($uploadDirectory) && !mkdir($uploadDirectory, 0755, true)) {
        throw new Exception('Unable to create image upload directory.');
    }

    $saveImage = $pdo->prepare(
        'INSERT INTO unit_images (unit_id, image_path) VALUES (?, ?)'
    );
    $allowedMimeTypes = ['image/jpeg' => 'jpg', 'image/png' => 'png'];

    if (isset($_FILES['images']['tmp_name']) && is_array($_FILES['images']['tmp_name'])) {
        foreach ($_FILES['images']['tmp_name'] as $index => $temporaryFile) {
            if (($_FILES['images']['error'][$index] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                continue;
            }

            if ((int) $_FILES['images']['size'][$index] > 10 * 1024 * 1024) {
                throw new Exception('Each image must be 10 MB or smaller.');
            }

            $mimeType = mime_content_type($temporaryFile);
            if (!isset($allowedMimeTypes[$mimeType])) {
                throw new Exception('Only JPG and PNG images are allowed.');
            }

            $filename = $unitId . '_' . bin2hex(random_bytes(16)) . '.' . $allowedMimeTypes[$mimeType];
            if (!move_uploaded_file($temporaryFile, $uploadDirectory . $filename)) {
                throw new Exception('Unable to save one of the images.');
            }

            $saveImage->execute([$unitId, 'uploads/properties/' . $filename]);
        }
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'buildingId' => $buildingId,
        'unitId' => (int) $unitId,
    ]);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);
    echo json_encode(['error' => 'Listing update failed']);
}
