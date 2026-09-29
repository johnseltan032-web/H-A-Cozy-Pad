<?php
require 'db.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
$isLocalFrontend = preg_match('/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/', $requestOrigin);

header('Access-Control-Allow-Origin: ' . ($isLocalFrontend ? $requestOrigin : $FRONTEND_ORIGIN));
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

if (isset($_SESSION['user_id']) && isset($_SESSION['role'])) {
    $role = strtolower($_SESSION['role']);
    $canViewStatistics = $role === 'super_admin';

    if ($role !== 'customer' && !$canViewStatistics) {
        $adminProfile = $pdo->prepare('SELECT COALESCE(can_view_statistics, 0) FROM admin_profiles WHERE user_id = ?');
        $adminProfile->execute([$_SESSION['user_id']]);
        $canViewStatistics = (bool) $adminProfile->fetchColumn();
    }

    $_SESSION['can_view_statistics'] = $canViewStatistics;

    echo json_encode([
        'authenticated' => true,
        'user' => [
            'user_id' => $_SESSION['user_id'],
            'role'    => $role,
            'name'    => $_SESSION['full_name'] ?? '',
            'needsSetup' => (bool) ($_SESSION['needs_setup'] ?? false),
            'can_view_statistics' => $canViewStatistics,
        ]
    ]);
} else {
    echo json_encode(['authenticated' => false, 'user' => null]);
}
?>