<?php

require 'db.php';

header('Content-Type: application/json');

$data = $_POST;
error_log(print_r($_POST, true));

$buildingName = trim(
    $data['buildingName'] ?? ''
);

$propertyCategory = trim(
    $data['propertyCategory'] ?? ''
);

$location = trim(
    $data['location'] ?? ''
);

$locationSearch = trim($data['locationSearch'] ?? '');
$country = trim($data['country'] ?? '');
$state = trim($data['state'] ?? '');
$city = trim($data['city'] ?? '');
$street = trim($data['street'] ?? '');
$unitLocation = trim($data['unitLocation'] ?? '');
$zip = trim($data['zip'] ?? '');

$latitude = $data['latitude'] ?? null;
$longitude = $data['longitude'] ?? null;

$unitName = trim(
    $data['unitName'] ?? 'Entire place'
);

$description = trim(
    $data['description'] ?? ''
);

$propertySize = trim($data['propertySize'] ?? '');
$bathrooms = max(0, (int) ($data['bathrooms'] ?? 0));
$bedroomDetails = json_decode($data['bedroomDetails'] ?? '[]', true);
$basePrice = ($data['basePrice'] ?? '') !== ''
    ? (float) $data['basePrice']
    : null;
$discounts = json_decode($data['discounts'] ?? '[]', true);

if (!is_array($bedroomDetails)) {
    $bedroomDetails = [];
}

if (!is_array($discounts)) {
    $discounts = [];
}

$maxGuests = (int) (
    $data['maxGuests'] ?? 0
);

$ratePerNight = (float) (
    $data['ratePerNight'] ?? 0
);

$availableFrom = trim(
    $data['availableFrom'] ?? ''
);

$availableUntil = trim(
    $data['availableUntil'] ?? ''
);

$amenities = $data['amenities'] ?? [];


$allowedPropertyCategories = [
    'home',
    'hotel',
    'unique',
];

if (
    !in_array(
        $propertyCategory,
        $allowedPropertyCategories,
        true
    )
) {
    http_response_code(400);

    echo json_encode([
        'error' => 'Invalid property category'
    ]);

    exit;
}

$allowedUnitNames = [
    'Entire place',
    'Room',
    'Hostel shared-room',
];

if (
    !in_array(
        $unitName,
        $allowedUnitNames,
        true
    )
) {
    http_response_code(400);

    echo json_encode([
        'error' => 'Invalid property type'
    ]);

    exit;
}

if (
    !$buildingName ||
    !$location ||
    !$description ||
    $maxGuests < 1 ||
    $maxGuests > 4 ||
    $ratePerNight <= 0
) {
    http_response_code(400);

    echo json_encode([
        'error' => 'Complete the required listing fields. Maximum 4 guests per unit.'
    ]);

    exit;
}


if (
    $availableFrom === '' ||
    $availableUntil === ''
) {
    http_response_code(400);

    echo json_encode([
        'error' => 'Please select when the listing can be booked.'
    ]);

    exit;
}


$fromDate = DateTime::createFromFormat(
    'Y-m-d',
    $availableFrom
);

$untilDate = DateTime::createFromFormat(
    'Y-m-d',
    $availableUntil
);

if (
    !$fromDate ||
    !$untilDate ||
    $fromDate->format('Y-m-d') !== $availableFrom ||
    $untilDate->format('Y-m-d') !== $availableUntil
) {
    http_response_code(400);

    echo json_encode([
        'error' => 'Invalid availability dates'
    ]);

    exit;
}


if ($availableUntil < $availableFrom) {
    http_response_code(400);

    echo json_encode([
        'error' => 'The availability end date cannot be before the start date.'
    ]);

    exit;
}


if (!is_array($amenities)) {
    http_response_code(400);

    echo json_encode([
        'error' => 'Invalid amenities'
    ]);

    exit;
}

if (
    $latitude !== null &&
    $latitude !== '' &&
    (
        !is_numeric($latitude) ||
        $latitude < -90 ||
        $latitude > 90
    )
) {
    http_response_code(400);

    echo json_encode([
        'error' => 'Invalid latitude'
    ]);

    exit;
}

if (
    $longitude !== null &&
    $longitude !== '' &&
    (
        !is_numeric($longitude) ||
        $longitude < -180 ||
        $longitude > 180
    )
) {
    http_response_code(400);

    echo json_encode([
        'error' => 'Invalid longitude'
    ]);

    exit;
}

if ($latitude === '') {
    $latitude = null;
}

if ($longitude === '') {
    $longitude = null;
}

if (
    ($latitude === null) !==
    ($longitude === null)
) {
    http_response_code(400);

    echo json_encode([
        'error' => 'Both latitude and longitude are required'
    ]);

    exit;
}


try {

    $pdo->beginTransaction();

    $building = $pdo->prepare(
        'INSERT INTO buildings
        (
            building_name,
            property_category,
            location,
            location_search,
            country,
            state,
            city,
            street,
            unit_location,
            zip,
            latitude,
            longitude
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
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
        $latitude,
        $longitude,
    ]);

    $buildingId = $pdo->lastInsertId();

    $unit = $pdo->prepare(
        'INSERT INTO units
        (
            building_id,
            unit_name,
            description,
            property_size,
            max_guests,
            bathrooms,
            bedroom_details,
            rate_per_night,
            base_price,
            discounts,
            available_from,
            available_until
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    $unit->execute([
        $buildingId,
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
    ]);

    $unitId = $pdo->lastInsertId();

    $saveAmenity = $pdo->prepare(
        'INSERT INTO unit_amenities
        (amenity_name)
        VALUES (?)
        ON DUPLICATE KEY UPDATE
        amenity_id = LAST_INSERT_ID(amenity_id)'
    );

    $linkAmenity = $pdo->prepare(
        'INSERT IGNORE INTO unit_amenity
        (unit_id, amenity_id)
        VALUES (?, ?)'
    );


    foreach ($amenities as $amenityName) {

        $amenityName = trim(
            (string) $amenityName
        );

        if ($amenityName === '') {
            continue;
        }

        $saveAmenity->execute([
            $amenityName
        ]);

        $amenityId = $pdo->lastInsertId();

        $linkAmenity->execute([
            $unitId,
            $amenityId
        ]);
    }

    $uploadDirectory =
        __DIR__ . '/uploads/properties/';


    if (!is_dir($uploadDirectory)) {

        if (
            !mkdir(
                $uploadDirectory,
                0755,
                true
            )
        ) {
            throw new Exception(
                'Unable to create image upload directory.'
            );
        }
    }

    $saveImage = $pdo->prepare(
        'INSERT INTO unit_images
        (
            unit_id,
            image_path
        )
        VALUES (?, ?)'
    );

    $uploadedImages = [];

    if (
        isset($_FILES['images']) &&
        isset($_FILES['images']['name']) &&
        is_array($_FILES['images']['name'])
    ) {

        $allowedMimeTypes = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
        ];


        foreach (
            $_FILES['images']['tmp_name']
            as $index => $temporaryFile
        ) {

            $uploadError =
                $_FILES['images']['error'][$index]
                ?? UPLOAD_ERR_NO_FILE;


            if (
                $uploadError ===
                UPLOAD_ERR_NO_FILE
            ) {
                continue;
            }


            if (
                $uploadError !==
                UPLOAD_ERR_OK
            ) {
                if ($uploadError === UPLOAD_ERR_INI_SIZE || $uploadError === UPLOAD_ERR_FORM_SIZE) {
                    throw new Exception(
                        'Each image must be 10 MB or smaller.'
                    );
                }

                if ($uploadError === UPLOAD_ERR_PARTIAL) {
                    throw new Exception(
                        'One image upload was interrupted. Please retry.'
                    );
                }

                if ($uploadError === UPLOAD_ERR_NO_TMP_DIR || $uploadError === UPLOAD_ERR_CANT_WRITE) {
                    error_log('Property image upload failed with PHP upload error ' . $uploadError);
                    throw new Exception(
                        'The server could not store an image. Please try again later.'
                    );
                }

                throw new Exception(
                    'One of the images failed to upload.'
                );
            }


            $fileSize =
                (int) $_FILES['images']['size'][$index];


            if (
                $fileSize >
                10 * 1024 * 1024
            ) {
                throw new Exception(
                    'Each image must be 10 MB or smaller.'
                );
            }


            $mimeType =
                mime_content_type(
                    $temporaryFile
                );


            if (
                !isset(
                    $allowedMimeTypes[$mimeType]
                )
            ) {
                throw new Exception(
                    'Only JPG and PNG images are allowed.'
                );
            }


            $extension =
                $allowedMimeTypes[$mimeType];


            $filename =
                $unitId .
                '_' .
                bin2hex(
                    random_bytes(16)
                ) .
                '.' .
                $extension;


            $destination =
                $uploadDirectory .
                $filename;


            if (
                !move_uploaded_file(
                    $temporaryFile,
                    $destination
                )
            ) {
                throw new Exception(
                    'Failed to save an uploaded image.'
                );
            }


            $imagePath =
                'uploads/properties/' .
                $filename;


            $saveImage->execute([
                $unitId,
                $imagePath
            ]);


            $uploadedImages[] =
                $imagePath;
        }
    }

    if (
        count($uploadedImages) === 0
    ) {
        throw new Exception(
            'Please upload at least one property image.'
        );
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'buildingId' => (int) $buildingId,
        'unitId' => (int) $unitId,
        'propertyCategory' => $propertyCategory,
        'unitName' => $unitName,
        'availableFrom' => $availableFrom,
        'availableUntil' => $availableUntil,
        'images' => $uploadedImages,
    ]);


} catch (Throwable $error) {

    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);

    echo json_encode([
        'error' => $error->getMessage()
    ]);
}