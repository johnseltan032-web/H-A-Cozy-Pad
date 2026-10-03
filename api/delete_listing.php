<?php
require 'db.php';
require 'activity_log_helper.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['user_id']) || !in_array(strtolower($_SESSION['role'] ?? ''), ['super_admin', 'admin'], true)) {
    http_response_code(isset($_SESSION['user_id']) ? 403 : 401);
    echo json_encode(['error' => 'Administrator access required']);
    exit;
}

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
    $pdo->beginTransaction();
    $listingInfo = $pdo->prepare(
        'SELECT b.building_name, u.unit_id, u.unit_name
         FROM buildings b
         LEFT JOIN units u ON u.building_id = b.building_id
         WHERE b.building_id = ?
         LIMIT 1'
    );
    $listingInfo->execute([$buildingId]);
    $listing = $listingInfo->fetch(PDO::FETCH_ASSOC);

    $stmt = $pdo->prepare('DELETE FROM buildings WHERE building_id = ?');
    $stmt->execute([$buildingId]);

    if ($stmt->rowCount() === 0) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['error' => 'Listing not found']);
        exit;
    }

    writeActivityLog(
        $pdo,
        'delete_listing',
        'deleted listing' . ($listing ? ' for Unit ' . ($listing['unit_name'] ?: $listing['building_name']) : ' #' . $buildingId),
        'building',
        (string) $buildingId
    );
    $pdo->commit();

    echo json_encode(['success' => true, 'buildingId' => $buildingId]);
} catch (PDOException $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(409);
    $errorCode = $error->errorInfo[1] ?? null;
    $message = $errorCode === 1451
        ? 'This listing has existing reservations and cannot be deleted.'
        : 'This listing cannot be deleted because it is linked to other records.';

    echo json_encode([
        'error' => $message,
    ]);
}
