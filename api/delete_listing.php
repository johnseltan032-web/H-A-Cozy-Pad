<?php
require 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Use POST to delete a listing']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$buildingId = (int) ($data['buildingId'] ?? 0);

if ($buildingId < 1) {
    http_response_code(400);
    echo json_encode(['error' => 'A valid building ID is required']);
    exit;
}

try {
    $stmt = $pdo->prepare('DELETE FROM buildings WHERE building_id = ?');
    $stmt->execute([$buildingId]);

    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Listing not found']);
        exit;
    }

    echo json_encode(['success' => true, 'buildingId' => $buildingId]);
} catch (PDOException $error) {
    http_response_code(409);
    echo json_encode([
        'error' => 'This listing cannot be deleted because it has related bookings.',
    ]);
}
