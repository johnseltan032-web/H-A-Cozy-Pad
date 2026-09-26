<?php
require 'db.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true) ?? [];
    $updates = [];
    $values = [];

    if (array_key_exists('fullName', $data)) {
        $fullName = trim($data['fullName']);
        if ($fullName === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Legal name is required']);
            exit;
        }
        $updates[] = 'full_name = ?';
        $values[] = $fullName;
    }

    if (array_key_exists('email', $data)) {
        $email = trim($data['email']);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['error' => 'A valid email address is required']);
            exit;
        }
        $updates[] = 'email = ?';
        $values[] = $email;
    }

    if (array_key_exists('contactNum', $data)) {
        $contactNum = trim($data['contactNum']);
        if (!preg_match('/^[0-9]{11}$/', $contactNum)) {
            http_response_code(400);
            echo json_encode(['error' => 'Contact number must be 11 digits']);
            exit;
        }
        $updates[] = 'contact_num = ?';
        $values[] = $contactNum;
        $_SESSION['needs_setup'] = false;
    }

    if (!empty($data['password'])) {
        if (strlen($data['password']) < 8) {
            http_response_code(400);
            echo json_encode(['error' => 'Password must be at least 8 characters']);
            exit;
        }
        $updates[] = 'password = ?';
        $values[] = password_hash($data['password'], PASSWORD_BCRYPT);
    }

    if (!$updates) {
        http_response_code(400);
        echo json_encode(['error' => 'No account changes were provided']);
        exit;
    }

    $values[] = $_SESSION['user_id'];
    $stmt = $pdo->prepare('UPDATE users SET ' . implode(', ', $updates) . ' WHERE user_id = ?');
    $stmt->execute($values);

    $stmt = $pdo->prepare(
        'SELECT user_id, full_name, email, contact_num, role FROM users WHERE user_id = ?'
    );
    $stmt->execute([$_SESSION['user_id']]);
    $updatedUser = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'user' => [
            'id' => $updatedUser['user_id'],
            'fullName' => $updatedUser['full_name'],
            'email' => $updatedUser['email'],
            'contactNum' => $updatedUser['contact_num'],
            'role' => strtolower($updatedUser['role']),
            'needsSetup' => trim((string) ($updatedUser['contact_num'] ?? '')) === '',
        ],
    ]);
    exit;
}

$stmt = $pdo->prepare(
    'SELECT user_id, full_name, email, contact_num, role FROM users WHERE user_id = ?'
);
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    http_response_code(404);
    echo json_encode(['error' => 'Account not found']);
    exit;
}

echo json_encode([
    'user' => [
        'id' => $user['user_id'],
        'fullName' => $user['full_name'],
        'email' => $user['email'],
        'contactNum' => $user['contact_num'],
        'role' => strtolower($user['role']),
        'needsSetup' => trim((string) ($user['contact_num'] ?? '')) === '',
    ],
]);
?>
