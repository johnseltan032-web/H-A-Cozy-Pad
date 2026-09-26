<?php
    require 'db.php';

    $data = json_decode(file_get_contents('php://input'), true);

    $email    = trim($data['identifier'] ?? ''); // schema only supports email login for now
    $password = $data['password'] ?? '';

    if (!$email || !$password) {
        http_response_code(400);
        echo json_encode(['error' => 'Email and password are required']);
        exit;
    }

    $stmt = $pdo->prepare('SELECT user_id, full_name, email, password, contact_num, role FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || !password_verify($password, $user['password'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid email or password']);
        exit;
    }

    $_SESSION['user_id'] = $user['user_id'];
    $_SESSION['email'] = $user['email'];
    $_SESSION['role'] = $user['role'];
    $_SESSION['needs_setup'] = trim((string) ($user['contact_num'] ?? '')) === '';

    echo json_encode([
        'success' => true,
        'user' => [
            'id' => $user['user_id'],
            'fullName' => $user['full_name'],
            'email' => $user['email'],
            'role' => $user['role'],
            'contactNum' => $user['contact_num'],
            'needsSetup' => $_SESSION['needs_setup'],
        ],
    ]);
?>