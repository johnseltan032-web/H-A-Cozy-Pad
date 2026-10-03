<?php
    require 'db.php';
    require 'activity_log_helper.php';
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    if (in_array(strtolower($_SESSION['role'] ?? ''), ['super_admin', 'admin'], true)) {
        try {
            writeActivityLog($pdo, 'logout', 'logged out', 'session', (string) ($_SESSION['user_id'] ?? ''));
        } catch (Throwable $error) {
            error_log('Admin logout activity logging failed: ' . $error->getMessage());
        }
    }
    $_SESSION = [];
    session_destroy();
    echo json_encode(['success' => true]);
?>