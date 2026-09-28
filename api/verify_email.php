<?php
require 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$token = $_GET['token'] ?? '';

if (!$token || !ctype_xdigit($token)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid or missing token']);
    exit;
}

$tokenHash = hash('sha256', $token);

$stmt = $pdo->prepare(
    'SELECT token_id, user_id, expires_at, used_at FROM email_verification_tokens WHERE token_hash = ?'
);
$stmt->execute([$tokenHash]);
$record = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$record) {
    http_response_code(404);
    echo json_encode(['error' => 'This verification link is invalid']);
    exit;
}

if ($record['used_at'] !== null) {
    echo json_encode(['success' => true, 'message' => 'Email already verified']);
    exit;
}

if (strtotime($record['expires_at']) < time()) {
    http_response_code(410);
    echo json_encode(['error' => 'This verification link has expired. Please request a new one.']);
    exit;
}

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare('UPDATE users SET email_verified = 1, email_verified_at = NOW() WHERE user_id = ?');
    $stmt->execute([$record['user_id']]);

    $stmt = $pdo->prepare('UPDATE email_verification_tokens SET used_at = NOW() WHERE token_id = ?');
    $stmt->execute([$record['token_id']]);

    $pdo->commit();
} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Unable to verify email']);
    exit;
}

echo json_encode(['success' => true, 'message' => 'Email verified successfully']);
?>