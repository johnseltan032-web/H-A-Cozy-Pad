<?php
require 'db.php';

function smtpReadResponse($socket) {
    $lines = [];
    $timeout = 30;
    $start = microtime(true);

    while (microtime(true) - $start < $timeout) {
        $line = fgets($socket, 515);
        if ($line === false) {
            break;
        }

        $lines[] = trim($line);
        if (strlen($line) >= 3 && is_numeric(substr($line, 0, 3))) {
            $code = (int) substr($line, 0, 3);
            if (strlen($line) < 4 || $line[3] !== '-') {
                return ['code' => $code, 'lines' => $lines];
            }
        }
    }

    return ['code' => 0, 'lines' => $lines];
}

function smtpCommand($socket, $command) {
    fwrite($socket, $command . "\r\n");
    $response = smtpReadResponse($socket);

    if ($response['code'] >= 400) {
        throw new RuntimeException('SMTP error: ' . implode(' | ', $response['lines']) . ' (' . $command . ')');
    }

    return $response;
}

function smtpSendEmail($toEmail, $toName, $subject, $htmlBody, $textBody) {
    $host = 'smtp.gmail.com';
    $port = 587;
    $username = $GLOBALS['GMAIL_USER'];
    $password = $GLOBALS['GMAIL_APP_PASSWORD'];

    $context = stream_context_create([
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false,
            'allow_self_signed' => true,
        ],
    ]);

    $socket = stream_socket_client(
        'tcp://' . $host . ':' . $port,
        $errno,
        $errstr,
        30,
        STREAM_CLIENT_CONNECT,
        $context
    );

    if (!$socket) {
        throw new RuntimeException('Unable to connect to SMTP server: ' . $errstr);
    }

    stream_set_timeout($socket, 30);
    $banner = smtpReadResponse($socket);
    if ($banner['code'] !== 220) {
        fclose($socket);
        throw new RuntimeException('SMTP connection failed: ' . implode(' | ', $banner['lines']));
    }

    smtpCommand($socket, 'EHLO localhost');
    smtpCommand($socket, 'STARTTLS');

    if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
        fclose($socket);
        throw new RuntimeException('Unable to enable TLS');
    }

    smtpCommand($socket, 'EHLO localhost');
    smtpCommand($socket, 'AUTH LOGIN');
    smtpCommand($socket, base64_encode($username));
    smtpCommand($socket, base64_encode($password));
    smtpCommand($socket, 'MAIL FROM:<' . $username . '>');
    smtpCommand($socket, 'RCPT TO:<' . $toEmail . '>');
    smtpCommand($socket, 'DATA');

    $fromName = 'H&A Cozy Pad';
    $escapedFrom = preg_replace('/[\r\n]+/', '', $fromName);
    $escapedTo = preg_replace('/[\r\n]+/', '', $toName ?: $toEmail);

    $headers = [
        'From: ' . $escapedFrom . ' <' . $username . '>',
        'To: ' . $escapedTo . ' <' . $toEmail . '>',
        'Subject: ' . $subject,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
    ];

    $encoded = chunk_split(base64_encode($htmlBody));
    $body = implode("\r\n", $headers) . "\r\n" . $encoded . "\r\n.\r\n";
    fwrite($socket, $body);
    $sendResponse = smtpReadResponse($socket);

    if ($sendResponse['code'] !== 250) {
        fclose($socket);
        throw new RuntimeException('SMTP DATA failed: ' . implode(' | ', $sendResponse['lines']));
    }

    smtpCommand($socket, 'QUIT');
    fclose($socket);
    return true;
}

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

try {
    smtpSendEmail($user['email'], $user['full_name'], 'Verify your email address', $htmlBody, $textBody);
} catch (Throwable $e) {
    error_log('Email verification send failed: ' . $e->getMessage());
    http_response_code(502);
    echo json_encode(['error' => 'Unable to send verification email']);
    exit;
}

echo json_encode(['success' => true, 'message' => 'Verification email sent']);
?>