<?php
require 'db.php';

$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
$isLocalFrontend = preg_match(
    '/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/',
    $requestOrigin
);

header('Access-Control-Allow-Origin: ' . ($isLocalFrontend ? $requestOrigin : $FRONTEND_ORIGIN));
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Vary: Origin');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$stmt = $pdo->prepare('SELECT user_id, full_name, email, email_verified FROM users WHERE user_id = ?');
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    http_response_code(404);
    echo json_encode(['error' => 'Account not found']);
    exit;
}

if (!empty($user['email_verified'])) {
    echo json_encode(['success' => true, 'message' => 'Email is already verified']);
    exit;
}

$stmt = $pdo->prepare(
    'SELECT created_at FROM email_verification_tokens WHERE user_id = ? AND used_at IS NULL ORDER BY created_at DESC LIMIT 1'
);
$stmt->execute([$user['user_id']]);
$lastToken = $stmt->fetch(PDO::FETCH_ASSOC);

if ($lastToken && (time() - strtotime($lastToken['created_at'])) < 10) {
    http_response_code(429);
    echo json_encode(['error' => 'Please wait a bit before requesting another email']);
    exit;
}

$token = bin2hex(random_bytes(32));
$tokenHash = hash('sha256', $token);
$expiresAt = date('Y-m-d H:i:s', time() + 3600);

$stmt = $pdo->prepare(
    'INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
);
$stmt->execute([$user['user_id'], $tokenHash, $expiresAt]);

$verifyLink = rtrim($FRONTEND_ORIGIN, '/') . '/verify-email?token=' . $token;

// Email delivery is disabled. The verification token is still created and the
// user can continue through the in-app verification flow.
echo json_encode([
    'success' => true,
    'message' => 'Verification email skipped because email delivery is disabled.',
    'verifyLink' => $verifyLink,
]);
?>