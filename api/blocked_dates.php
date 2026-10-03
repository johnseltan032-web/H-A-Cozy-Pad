<?php

require 'db.php';
require 'activity_log_helper.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    exit;
}

if (!in_array(strtolower($_SESSION['role'] ?? ''), ['super_admin', 'admin'], true)) {
    http_response_code(403);
    echo json_encode(['error' => 'Admin access required']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $unitId = isset($_GET['unit_id']) ? (int) $_GET['unit_id'] : null;

    $sql = "SELECT
                b.blocked_date_id,
                b.unit_id,
                b.blocked_from,
                b.blocked_until,
                b.reason,
                b.notes,
                u.unit_name,
                u.unit_number,
                bu.building_name
            FROM unit_blocked_dates b
            JOIN units u ON u.unit_id = b.unit_id
            JOIN buildings bu ON bu.building_id = u.building_id
            WHERE (? IS NULL OR b.unit_id = ?)
            ORDER BY b.blocked_from ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$unitId, $unitId]);

    echo json_encode([
        'blockedDates' => $stmt->fetchAll(PDO::FETCH_ASSOC)
    ]);
    exit;
}

if ($method === 'POST') {
    $payload = $_POST ?: (json_decode(file_get_contents('php://input'), true) ?? []);

    $unitId = (int) ($payload['unit_id'] ?? $payload['unitId'] ?? 0);
    $blockedFrom = trim((string) ($payload['blocked_from'] ?? $payload['blockedFrom'] ?? ''));
    $blockedUntil = trim((string) ($payload['blocked_until'] ?? $payload['blockedUntil'] ?? ''));
    $reason = trim((string) ($payload['reason'] ?? 'other'));
    $notes = trim((string) ($payload['notes'] ?? ''));

    if (!$unitId || !$blockedFrom || !$blockedUntil) {
        http_response_code(400);
        echo json_encode(['error' => 'Unit and date range are required']);
        exit;
    }

    $allowedReasons = ['owner_stay', 'maintenance', 'renovation', 'deep_cleaning', 'other'];
    if (!in_array($reason, $allowedReasons, true)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid block reason']);
        exit;
    }

    $startDate = DateTime::createFromFormat('Y-m-d', $blockedFrom);
    $endDate = DateTime::createFromFormat('Y-m-d', $blockedUntil);

    if (!$startDate || !$endDate || $endDate < $startDate) {
        http_response_code(400);
        echo json_encode(['error' => 'Blocked end date must be on or after the start date']);
        exit;
    }

    if ($startDate < new DateTime('today')) {
        http_response_code(400);
        echo json_encode(['error' => 'Blocked dates cannot be set in the past']);
        exit;
    }

    $unitCheck = $pdo->prepare('SELECT unit_id FROM units WHERE unit_id = ? LIMIT 1');
    $unitCheck->execute([$unitId]);
    if (!$unitCheck->fetch()) {
        http_response_code(404);
        echo json_encode(['error' => 'Unit not found']);
        exit;
    }

    $overlapBookings = $pdo->prepare(
        "SELECT booking_id
         FROM bookings
         WHERE unit_id = ?
         AND status NOT IN ('cancelled', 'rejected')
         AND check_in_date < ?
         AND check_out_date > ?
         LIMIT 1"
    );
    $overlapBookings->execute([$unitId, $blockedUntil, $blockedFrom]);
    if ($overlapBookings->fetch()) {
        http_response_code(409);
        echo json_encode([
            'error' => 'This unit has an active booking during the selected dates. Please resolve or move that booking before blocking the dates.'
        ]);
        exit;
    }

    $overlapBlocked = $pdo->prepare(
        "SELECT blocked_date_id
         FROM unit_blocked_dates
         WHERE unit_id = ?
         AND blocked_from <= ?
         AND blocked_until >= ?
         LIMIT 1"
    );
    $overlapBlocked->execute([$unitId, $blockedUntil, $blockedFrom]);
    if ($overlapBlocked->fetch()) {
        http_response_code(409);
        echo json_encode(['error' => 'The selected dates already overlap an existing block for this unit']);
        exit;
    }

    $adminStmt = $pdo->prepare('SELECT admin_id FROM admin_profiles WHERE user_id = ? LIMIT 1');
    $adminStmt->execute([$_SESSION['user_id']]);
    $adminId = $adminStmt->fetchColumn();

    $unitNameStmt = $pdo->prepare('SELECT unit_name FROM units WHERE unit_id = ?');
    $unitNameStmt->execute([$unitId]);
    $unitName = $unitNameStmt->fetchColumn();

    try {
        $pdo->beginTransaction();
        $insert = $pdo->prepare(
            'INSERT INTO unit_blocked_dates (unit_id, blocked_from, blocked_until, reason, notes, created_by)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $insert->execute([$unitId, $blockedFrom, $blockedUntil, $reason, $notes, $adminId ?: null]);
        $blockedDateId = (int) $pdo->lastInsertId();
        writeActivityLog(
            $pdo,
            'block_dates',
            'blocked Unit ' . $unitName . ' from ' . $blockedFrom . ' to ' . $blockedUntil,
            'blocked_dates',
            (string) $blockedDateId
        );
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Blocked dates creation failed: ' . $error->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Unable to block these dates']);
        exit;
    }

    echo json_encode([
        'success' => true,
        'blockedDateId' => $blockedDateId,
        'reason' => $reason
    ]);
    exit;
}

if ($method === 'DELETE') {
    $payload = $_GET ?: (json_decode(file_get_contents('php://input'), true) ?? []);
    $blockedDateId = (int) ($payload['blocked_date_id'] ?? $payload['blockedDateId'] ?? 0);

    if ($blockedDateId <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Blocked date ID is required']);
        exit;
    }

    $blockedInfo = $pdo->prepare(
        'SELECT b.unit_id, b.blocked_from, b.blocked_until, u.unit_name
         FROM unit_blocked_dates b
         JOIN units u ON u.unit_id = b.unit_id
         WHERE b.blocked_date_id = ?'
    );
    $blockedInfo->execute([$blockedDateId]);
    $blocked = $blockedInfo->fetch(PDO::FETCH_ASSOC);
    if (!$blocked) {
        http_response_code(404);
        echo json_encode(['error' => 'Blocked dates not found']);
        exit;
    }

    try {
        $pdo->beginTransaction();
        $delete = $pdo->prepare('DELETE FROM unit_blocked_dates WHERE blocked_date_id = ?');
        $delete->execute([$blockedDateId]);
        writeActivityLog(
            $pdo,
            'unblock_dates',
            'unblocked Unit ' . $blocked['unit_name'] . ' for ' . $blocked['blocked_from'] . ' to ' . $blocked['blocked_until'],
            'blocked_dates',
            (string) $blockedDateId
        );
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Blocked dates removal failed: ' . $error->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Unable to unblock these dates']);
        exit;
    }

    echo json_encode(['success' => true, 'blockedDateId' => $blockedDateId]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
