<?php

require 'db.php';
require 'activity_log_helper.php';

if (!isset($_SESSION['user_id']) || !in_array(strtolower($_SESSION['role'] ?? ''), ['super_admin', 'admin'], true)) {
    http_response_code(isset($_SESSION['user_id']) ? 403 : 401);
    echo json_encode(['error' => 'Administrator access required']);
    exit;
}

header('Content-Type: application/json');

$data = $_POST;
error_log(print_r($_POST, true));

$buildingName = trim(
    $data['buildingName'] ?? ''
);
$propertyName = trim(
    $data['propertyName'] ?? ''
);

$googleMapsUrl = trim($data['googleMapsUrl'] ?? '');

if ($googleMapsUrl !== '' && !filter_var($googleMapsUrl, FILTER_VALIDATE_URL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Please provide a valid Google Maps link.']);
    exit;
}

$googleMapsHost = strtolower((string) parse_url($googleMapsUrl, PHP_URL_HOST));
if ($googleMapsUrl === '' || !in_array($googleMapsHost, ['maps.app.goo.gl', 'maps.google.com', 'www.google.com', 'google.com'], true)) {
    http_response_code(400);
    echo json_encode(['error' => 'A Google Maps link is required.']);
    exit;
}

$tower = trim(
    $data['tower'] ?? ''
);

$unitNumber = trim(
    $data['unitNumber'] ?? ''
);

$description = trim(
    $data['description'] ?? ''
);

$bathrooms = max(0, (int) ($data['bathrooms'] ?? 0));
$bedroomDetails = json_decode($data['bedroomDetails'] ?? '[]', true);

if (!is_array($bedroomDetails)) {
    $bedroomDetails = [];
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


if (
    !$buildingName ||
    !$propertyName ||
    !$description ||
    !$tower ||
    !$unitNumber ||
    $maxGuests < 1 ||
    $maxGuests > 4 ||
    $ratePerNight <= 0
) {
    http_response_code(400);

    echo json_encode([
        'error' => 'Complete the required listing fields, including tower and unit number. Maximum 4 guests per unit.'
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

try {

    $pdo->beginTransaction();

    $building = $pdo->prepare(
        'INSERT INTO buildings
        (
            building_name,
            property_name,
            google_maps_url
        )
        VALUES (?, ?, ?)'
    );

    $building->execute([
        $buildingName,
        $propertyName,
        $googleMapsUrl,
    ]);

    $buildingId = $pdo->lastInsertId();
    $unitLabel = trim($tower . ' ' . $unitNumber);

    $unit = $pdo->prepare(
        'INSERT INTO units
        (
            building_id,
            unit_name,
            tower,
            unit_number,
            description,
            max_guests,
            bathrooms,
            bedroom_details,
            rate_per_night,
            available_from,
            available_until
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    $unit->execute([
        $buildingId,
        $unitLabel,
        $tower,
        $unitNumber,
        $description,
        $maxGuests,
        $bathrooms,
        json_encode($bedroomDetails),
        $ratePerNight,
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

    writeActivityLog(
        $pdo,
        'add_listing',
        'added listing for Unit ' . $unitLabel,
        'unit',
        (string) $unitId
    );
    $pdo->commit();

    echo json_encode([
        'success' => true,
        'buildingId' => (int) $buildingId,
        'unitId' => (int) $unitId,
        'unitLabel' => $unitLabel,
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