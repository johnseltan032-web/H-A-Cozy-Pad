<?php
require 'db.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    exit;
}

if ($_SESSION['role'] !== 'super_admin') {
    http_response_code(403);
    echo json_encode(['error' => 'Super admin access required']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

function getRequestData() {
    $data = $_POST;

    if (empty($data)) {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
    }

    return $data;
}

function syncUserProfile($pdo, $userId, $role, $canViewStatistics = false) {
    if ($role === 'customer') {
        $stmt = $pdo->prepare("DELETE FROM admin_profiles WHERE user_id = ?");
        $stmt->execute([$userId]);

        $stmt = $pdo->prepare("
            INSERT IGNORE INTO customer_profiles (user_id)
            VALUES (?)
        ");
        $stmt->execute([$userId]);
        return;
    }

    $stmt = $pdo->prepare("DELETE FROM customer_profiles WHERE user_id = ?");
    $stmt->execute([$userId]);

    $stmt = $pdo->prepare("
        INSERT INTO admin_profiles (user_id, position, can_view_statistics)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE position = VALUES(position), can_view_statistics = VALUES(can_view_statistics)
    ");
    $stmt->execute([$userId, $role, $canViewStatistics ? 1 : 0]);
}

function getCustomerBookingCount($pdo, $userId) {
    $stmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM bookings b
        INNER JOIN customer_profiles cp ON cp.customer_id = b.customer_id
        WHERE cp.user_id = ?
    ");
    $stmt->execute([$userId]);

    return (int) $stmt->fetchColumn();
}

try {
    if ($method === 'GET') {
        $stmt = $pdo->query("
            SELECT
                u.user_id,
                u.full_name,
                u.email,
                u.contact_num,
                COALESCE(NULLIF(u.role, ''), 'customer') AS role,
                COALESCE(ap.can_view_statistics, 0) AS can_view_statistics,
                u.created_at,
                u.updated_at
            FROM users u
            LEFT JOIN admin_profiles ap ON ap.user_id = u.user_id
            ORDER BY u.created_at DESC
        ");

        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        exit;
    }

    if ($method === 'POST') {
        $data = getRequestData();

        $fullName = trim($data['full_name'] ?? '');
        $email = trim($data['email'] ?? '');
        $password = $data['password'] ?? '';
        $role = $data['role'] ?? 'customer';
        $contactNum = trim($data['contact_num'] ?? '');
        $canViewStatistics = (bool) ($data['statistics_access'] ?? false);

        if ($fullName === '' || $email === '' || $password === '' || $contactNum === '') {
            http_response_code(400);
            echo json_encode(['error' => 'All required fields must be provided']);
            exit;
        }

        if (!in_array($role, ['super_admin', 'admin', 'customer'], true)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid role']);
            exit;
        }

        $stmt = $pdo->prepare("
            SELECT user_id
            FROM users
            WHERE email = ?
        ");
        $stmt->execute([$email]);

        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode(['error' => 'Email is already registered']);
            exit;
        }

        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

        $stmt = $pdo->prepare("
            INSERT INTO users (
                full_name,
                email,
                password,
                role,
                contact_num
            )
            VALUES (?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $fullName,
            $email,
            $hashedPassword,
            $role,
            $contactNum
        ]);

        $userId = $pdo->lastInsertId();

        syncUserProfile($pdo, $userId, $role, $canViewStatistics && $role !== 'customer');

        echo json_encode([
            'message' => 'User created successfully',
            'user_id' => (int)$userId
        ]);
        exit;
    }

    if ($method === 'PUT') {
        $data = getRequestData();

        $userId = (int)($data['user_id'] ?? 0);
        $fullName = trim($data['full_name'] ?? '');
        $email = trim($data['email'] ?? '');
        $role = $data['role'] ?? '';
        $contactNum = trim($data['contact_num'] ?? '');
        $canViewStatistics = (bool) ($data['statistics_access'] ?? false);

        if (
            $userId <= 0 ||
            $fullName === '' ||
            $email === '' ||
            $role === '' ||
            $contactNum === ''
        ) {
            http_response_code(400);
            echo json_encode(['error' => 'All required fields must be provided']);
            exit;
        }

        if (!in_array($role, ['super_admin', 'admin', 'customer'], true)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid role']);
            exit;
        }

        $currentRoleStatement = $pdo->prepare('SELECT role FROM users WHERE user_id = ?');
        $currentRoleStatement->execute([$userId]);
        $currentRole = $currentRoleStatement->fetchColumn();

        if ($currentRole === 'customer' && $role !== 'customer') {
            $bookingCount = getCustomerBookingCount($pdo, $userId);

            if ($bookingCount > 0) {
                http_response_code(409);
                echo json_encode([
                    'error' => 'This customer cannot be changed to a super admin or admin because they have existing bookings.'
                ]);
                exit;
            }
        }

        if (
            $userId === (int)$_SESSION['user_id'] &&
            $role !== 'super_admin'
        ) {
            http_response_code(400);
            echo json_encode([
                'error' => 'You cannot remove your own super admin role'
            ]);
            exit;
        }

        $stmt = $pdo->prepare("
            SELECT user_id
            FROM users
            WHERE email = ? AND user_id != ?
        ");
        $stmt->execute([$email, $userId]);

        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode(['error' => 'Email is already registered']);
            exit;
        }

        $stmt = $pdo->prepare("
            UPDATE users
            SET
                full_name = ?,
                email = ?,
                role = ?,
                contact_num = ?
            WHERE user_id = ?
        ");

        $stmt->execute([
            $fullName,
            $email,
            $role,
            $contactNum,
            $userId
        ]);

        syncUserProfile($pdo, $userId, $role, $canViewStatistics && $role !== 'customer');

        echo json_encode([
            'message' => 'User updated successfully'
        ]);
        exit;
    }

    if ($method === 'DELETE') {
        $data = getRequestData();

        $userId = (int)($data['user_id'] ?? 0);

        if ($userId <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid user ID']);
            exit;
        }

        if ($userId === (int)$_SESSION['user_id']) {
            http_response_code(400);
            echo json_encode([
                'error' => 'You cannot delete your own account'
            ]);
            exit;
        }

        $bookingCount = getCustomerBookingCount($pdo, $userId);

        if ($bookingCount > 0) {
            http_response_code(409);
            echo json_encode([
                'error' => 'This customer cannot be deleted because they have existing bookings.'
            ]);
            exit;
        }

        $stmt = $pdo->prepare("
            DELETE FROM users
            WHERE user_id = ?
        ");

        $stmt->execute([$userId]);

        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'User not found']);
            exit;
        }

        echo json_encode([
            'message' => 'User deleted successfully'
        ]);
        exit;
    }

    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Server error',
        'details' => $e->getMessage()
    ]);
}
?>
