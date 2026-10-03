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

    $stmt = $pdo->prepare(
        'SELECT 
            b.building_id,
            b.building_name,
            b.google_maps_url,
            u.unit_id,
            u.unit_name,
            u.unit_number,
            u.description,
            u.max_guests,
            u.rate_per_night,
            u.status
        FROM buildings b
        LEFT JOIN units u ON b.building_id = u.building_id
        ORDER BY b.building_id DESC, u.unit_id ASC'
    );

    $stmt->execute();

    $listings = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($listings);
?>
