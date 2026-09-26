<?php
require 'db.php';

$data = json_decode(file_get_contents('php://input'), true);
$credential = $data['credential'] ?? '';

if (!$credential) {
    http_response_code(400);
    echo json_encode(['error' => 'Google credential is required']);
    exit;
}

$tokenResponse = @file_get_contents(
    'https://oauth2.googleapis.com/tokeninfo?id_token=' . rawurlencode($credential)
);
$token = $tokenResponse ? json_decode($tokenResponse, true) : null;
$googleClientId = '333193552236-5sgea3ut93896koqvums6jjl6ildej90.apps.googleusercontent.com';

if (!$token || ($token['aud'] ?? '') !== $googleClientId || empty($token['email'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid Google credential']);
    exit;
}

$email = strtolower(trim($token['email']));
$fullName = trim($token['name'] ?? $email);
$fullName = substr($fullName, 0, 50);

$stmt = $pdo->prepare('SELECT user_id, full_name, email, contact_num, role FROM users WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    $temporaryPassword = password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT);
    $insert = $pdo->prepare(
        'INSERT INTO users (full_name, email, password, role, contact_num) VALUES (?, ?, ?, ?, ?)'
    );
    $insert->execute([$fullName, $email, $temporaryPassword, 'customer', '']);
    $user = [
        'user_id' => $pdo->lastInsertId(),
        'full_name' => $fullName,
        'email' => $email,
        'contact_num' => '',
        'role' => 'customer',
    ];
}

if (trim((string) ($user['role'] ?? '')) === '') {
    $setDefaultRole = $pdo->prepare('UPDATE users SET role = ? WHERE user_id = ?');
    $setDefaultRole->execute(['customer', $user['user_id']]);
    $user['role'] = 'customer';
}

if ($user['contact_num'] === '00000000000') {
    $clearPlaceholder = $pdo->prepare('UPDATE users SET contact_num = ? WHERE user_id = ?');
    $clearPlaceholder->execute(['', $user['user_id']]);
    $user['contact_num'] = '';
}

$needsSetup = trim((string) ($user['contact_num'] ?? '')) === '';

$_SESSION['user_id'] = $user['user_id'];
$_SESSION['email'] = $user['email'];
$_SESSION['role'] = $user['role'];
$_SESSION['full_name'] = $user['full_name'];
$_SESSION['needs_setup'] = $needsSetup;

echo json_encode([
    'success' => true,
    'user' => [
        'id' => $user['user_id'],
        'fullName' => $user['full_name'],
        'email' => $user['email'],
        'contactNum' => $user['contact_num'],
        'role' => $user['role'],
        'needsSetup' => $needsSetup,
    ],
]);
?>
