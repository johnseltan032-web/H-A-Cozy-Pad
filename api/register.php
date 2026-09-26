<?php
    require 'db.php';
    session_start();
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    $fullName   = trim($data['fullName'] ?? '');
    $email      = trim($data['email'] ?? '');
    $contactNum = trim($data['contactNum'] ?? '');
    $password   = $data['password'] ?? '';
    
    if (!$fullName || !$email || !$contactNum || !$password) {
        http_response_code(400);
        echo json_encode(['error' => 'All fields are required']);
        exit;
    }
    
    if (strlen($password) < 8) {
        http_response_code(400);
        echo json_encode(['error' => 'Password must be at least 8 characters']);
        exit;
    }
    
    if (!preg_match('/^[0-9]{11}$/', $contactNum)) {
        http_response_code(400);
        echo json_encode(['error' => 'Contact number must be 11 digits']);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare('SELECT user_id FROM users WHERE email = ?');
        $stmt->execute([$email]);
    } catch (PDOException $e) {
        error_log('Registration account lookup failed: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Registration is temporarily unavailable. Please try again.']);
        exit;
    }

    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(['error' => 'An account with that email already exists']);
        exit;
    }
    
    $hash = password_hash($password, PASSWORD_BCRYPT);
    
    try {
        $pdo->beginTransaction();
    
        $stmt = $pdo->prepare(
            'INSERT INTO users (full_name, email, password, contact_num, role) VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([$fullName, $email, $hash, $contactNum, 'customer']);
        $userId = $pdo->lastInsertId();
    
        $stmt = $pdo->prepare('INSERT INTO customer_profiles (user_id) VALUES (?)');
        $stmt->execute([$userId]);
    
        $pdo->commit();
    } catch (PDOException $e) {
        $pdo->rollBack();
        error_log('Registration database write failed: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Registration failed. Please try again.']);
        exit;
    }
    
    $_SESSION['user_id'] = $userId;
    $_SESSION['email'] = $email;
    $_SESSION['role'] = 'customer';
    
    echo json_encode([
        'success' => true,
        'user' => ['id' => $userId, 'fullName' => $fullName, 'email' => $email, 'role' => 'customer'],
    ]);
?>