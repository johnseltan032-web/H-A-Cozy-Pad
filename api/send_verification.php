<?php
require 'db.php';
require_once 'mailer.php';

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
$htmlBody =
    '<p>Hi ' . htmlspecialchars($user['full_name']) . ',</p>' .
    '<p>Please confirm your email address for your H&amp;A Cozy Pad account. This link expires in 1 hour.</p>' .
    '<p><a href="' . htmlspecialchars($verifyLink) . '">Verify my email</a></p>' .
    '<p>If you did not request this, you can safely ignore this email.</p>';
$textBody = "Verify your email by visiting this link (expires in 1 hour): $verifyLink";

if (!sendAppMail($user['email'], $user['full_name'], 'Verify your email address', $htmlBody, $textBody)) {
    http_response_code(502);
    echo json_encode(['error' => 'Unable to send verification email. Check the email provider configuration and Railway API logs.']);
    exit;
}

echo json_encode(['success' => true, 'message' => 'Verification email sent']);
?>