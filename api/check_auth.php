<?php
require 'config.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
$isLocalFrontend = preg_match('/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/', $requestOrigin);

header('Access-Control-Allow-Origin: ' . ($isLocalFrontend ? $requestOrigin : $FRONTEND_ORIGIN));
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

if (isset($_SESSION['user_id']) && isset($_SESSION['role'])) {
    echo json_encode([
        'authenticated' => true,
        'user' => [
            'user_id' => $_SESSION['user_id'],
            'role'    => strtolower($_SESSION['role']), // Ensures lowercase ('admin', 'assistant', 'customer')
            'name'    => $_SESSION['full_name'] ?? '',
            'needsSetup' => (bool) ($_SESSION['needs_setup'] ?? false),
        ]
    ]);
} else {
    echo json_encode(['authenticated' => false, 'user' => null]);
}
?>