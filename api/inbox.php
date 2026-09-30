<?php
// inbox.php — admin-only access to Contact Us messages (Inbox page)
require 'db.php'; // same as notifications.php: provides $pdo, session, JSON headers

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    exit;
}

// ASSUMPTION: users has user_id and role columns.
$roleStmt = $pdo->prepare('SELECT role FROM users WHERE user_id = ?');
$roleStmt->execute([$_SESSION['user_id']]);
$role = $roleStmt->fetchColumn();

if (!in_array($role, ['admin', 'super_admin'], true)) {
    http_response_code(403);
    echo json_encode(['error' => 'Not allowed']);
    exit;
}

if (in_array($_SERVER['REQUEST_METHOD'], ['PATCH', 'PUT'], true)) {
    $data = json_decode(file_get_contents('php://input'), true) ?? [];

    if (!empty($data['markAllRead'])) {
        $pdo->exec('UPDATE contact_messages SET is_read = 1');
        echo json_encode(['success' => true]);
        exit;
    }

    $id = (int) ($data['id'] ?? 0);
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'id is required']);
        exit;
    }

    if (!empty($data['delete'])) {
        $stmt = $pdo->prepare('DELETE FROM contact_messages WHERE contact_id = ?');
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
        exit;
    }

    if (array_key_exists('is_read', $data)) {
        $stmt = $pdo->prepare('UPDATE contact_messages SET is_read = ? WHERE contact_id = ?');
        $stmt->execute([$data['is_read'] ? 1 : 0, $id]);
        echo json_encode(['success' => true]);
        exit;
    }

    http_response_code(400);
    echo json_encode(['error' => 'Nothing to update']);
    exit;
}

try {
    $tableCheck = $pdo->prepare(
        'SELECT COUNT(*)
         FROM information_schema.tables
         WHERE table_schema = DATABASE()
         AND table_name = ?'
    );
    $tableCheck->execute(['contact_messages']);

    if (!(int) $tableCheck->fetchColumn()) {
        http_response_code(500);
        echo json_encode([
            'error' => 'Inbox storage is missing. Apply sql/migrations/add_contact_messages.sql to the database.'
        ]);
        exit;
    }

    $stmt = $pdo->query(
        'SELECT contact_id, name, email, subject, message, is_read, created_at
         FROM contact_messages
         ORDER BY created_at DESC
         LIMIT 200'
    );
    $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable $error) {
    error_log('Inbox load failed: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Unable to load inbox messages. Check the API service logs.'
    ]);
    exit;
}

$unreadCount = 0;
foreach ($messages as $m) {
    if (!$m['is_read']) $unreadCount++;
}

echo json_encode(['messages' => $messages, 'unreadCount' => $unreadCount]);
?>