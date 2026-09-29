<?php
require 'db.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    exit;
}

$userId = $_SESSION['user_id'];

if (in_array($_SERVER['REQUEST_METHOD'], ['PATCH', 'PUT'], true)) {
    $data = json_decode(file_get_contents('php://input'), true) ?? [];

    if (!empty($data['markAllRead'])) {
        $stmt = $pdo->prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?');
        $stmt->execute([$userId]);
        echo json_encode(['success' => true]);
        exit;
    }

    if (!empty($data['clearAll'])) {
        $stmt = $pdo->prepare('DELETE FROM notifications WHERE user_id = ?');
        $stmt->execute([$userId]);
        echo json_encode(['success' => true]);
        exit;
    }

    $notificationId = (int) ($data['notificationId'] ?? 0);

    if (!$notificationId) {
        http_response_code(400);
        echo json_encode(['error' => 'notificationId is required']);
        exit;
    }

    $stmt = $pdo->prepare(
        'UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND user_id = ?'
    );
    $stmt->execute([$notificationId, $userId]);
    echo json_encode(['success' => true]);
    exit;
}

$stmt = $pdo->prepare(
    'SELECT notification_id, booking_id, type, message, is_read, sent_at
     FROM notifications
     WHERE user_id = ?
     ORDER BY sent_at DESC
     LIMIT 50'
);
$stmt->execute([$userId]);
$notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

$unreadCount = 0;
foreach ($notifications as $notification) {
    if (!$notification['is_read']) {
        $unreadCount++;
    }
}

echo json_encode([
    'notifications' => $notifications,
    'unreadCount' => $unreadCount,
]);
?>