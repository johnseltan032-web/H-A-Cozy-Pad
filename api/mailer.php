<?php
// Shared mail helper. Include this after db.php (so $GMAIL_USER /
// $GMAIL_APP_PASSWORD from config.php are already in scope).

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

function sendAppMail(string $toEmail, string $toName, string $subject, string $htmlBody, string $altBody = ''): bool
{
    global $GMAIL_USER, $GMAIL_APP_PASSWORD;

    if (empty($GMAIL_USER) || empty($GMAIL_APP_PASSWORD)) {
        error_log('Mail settings are not configured for ' . $toEmail);
        return false;
    }

    try {
        $host = 'smtp.gmail.com';
        $port = 587;
        $username = $GMAIL_USER;
        $password = $GMAIL_APP_PASSWORD;

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
    } catch (Throwable $e) {
        error_log('Mail send failed to ' . $toEmail . ': ' . $e->getMessage());
        return false;
    }
}

/**
 * Same as sendAppMail, but only sends if the user has email notifications
 * turned on in their account settings. Use this for booking notifications
 * and reminders. Do NOT use it for verification emails (those always send).
 */
function sendNotificationMail(PDO $pdo, int $userId, string $toEmail, string $toName, string $subject, string $htmlBody, string $altBody = ''): bool
{
    $stmt = $pdo->prepare('SELECT email_notifications FROM users WHERE user_id = ?');
    $stmt->execute([$userId]);
    $enabled = $stmt->fetchColumn();

    if (!$enabled) {
        return false;
    }

    return sendAppMail($toEmail, $toName, $subject, $htmlBody, $altBody);
}
?>