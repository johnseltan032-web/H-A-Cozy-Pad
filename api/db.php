<?php
    require 'config.php';

    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    $requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $isLocalFrontend = preg_match(
        '/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/',
        $requestOrigin
    );

    header('Access-Control-Allow-Origin: ' . ($isLocalFrontend ? $requestOrigin : $FRONTEND_ORIGIN));
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Allow-Methods: POST, GET, PUT, PATCH, OPTIONS');
    header('Vary: Origin');
    header('Content-Type: application/json');
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
    
    try {
        $pdo = new PDO(
            "mysql:host=$DB_HOST;port=$DB_PORT;dbname=$DB_NAME;charset=utf8mb4",
            $DB_USER,
            $DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );

        $adminProfilesTable = $pdo->query("SHOW TABLES LIKE 'admin_profiles'");
        if ($adminProfilesTable && $adminProfilesTable->fetch()) {
            $statsColumn = $pdo->query("SHOW COLUMNS FROM admin_profiles LIKE 'can_view_statistics'");
            if (!$statsColumn || !$statsColumn->fetch()) {
                $pdo->exec("ALTER TABLE admin_profiles ADD COLUMN can_view_statistics BOOLEAN NOT NULL DEFAULT FALSE");
            }
        }
    } catch (PDOException $e) {
        http_response_code(500);
        error_log('Database connection failed: ' . $e->getMessage());
        echo json_encode(['error' => 'Database connection failed. Check the API service database variables.']);
        exit;
    }
?>