<?php
require 'db.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    exit;
}

if (strtolower($_SESSION['role'] ?? '') !== 'super_admin') {
    http_response_code(403);
    echo json_encode(['error' => 'Super admin access required']);
    exit;
}

try {
    $page = max(1, (int) ($_GET['page'] ?? 1));
    $pageSize = 50;
    $offset = ($page - 1) * $pageSize;

    $total = (int) $pdo->query('SELECT COUNT(*) FROM admin_activity_log')->fetchColumn();
    $statement = $pdo->prepare(
        'SELECT log_id, actor_name, action, description, target_type, target_id, created_at
         FROM admin_activity_log
         ORDER BY created_at DESC, log_id DESC
         LIMIT ? OFFSET ?'
    );
    $statement->bindValue(1, $pageSize, PDO::PARAM_INT);
    $statement->bindValue(2, $offset, PDO::PARAM_INT);
    $statement->execute();

    echo json_encode([
        'activities' => $statement->fetchAll(PDO::FETCH_ASSOC),
        'page' => $page,
        'pageSize' => $pageSize,
        'total' => $total,
        'hasMore' => $offset + $pageSize < $total,
    ]);
} catch (Throwable $error) {
    error_log('Activity log query failed: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Unable to load activity log']);
}
