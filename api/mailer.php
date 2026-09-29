<?php
require_once __DIR__ . '/vendor/autoload.php';

function sendAppMail(string $toEmail, string $toName, string $subject, string $htmlBody, string $altBody = ''): bool
{
    global $GMAIL_USER, $GMAIL_APP_PASSWORD, $SMTP_HOST, $SMTP_PORT, $SMTP_SECURE;

    if (empty($GMAIL_USER) || empty($GMAIL_APP_PASSWORD)) {
        error_log('Gmail SMTP settings are not configured for ' . $toEmail);
        return false;
    }

    try {
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = $SMTP_HOST;
        $mail->SMTPAuth = true;
        $mail->Username = $GMAIL_USER;
        $mail->Password = $GMAIL_APP_PASSWORD;
        $mail->Port = $SMTP_PORT;
        $mail->SMTPSecure = $SMTP_SECURE === 'tls'
            ? PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS
            : PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
        $mail->Timeout = 12;
        $mail->CharSet = PHPMailer\PHPMailer\PHPMailer::CHARSET_UTF8;
        $mail->setFrom($GMAIL_USER, 'H&A Cozy Pad');
        $mail->addAddress($toEmail, $toName);
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body = $htmlBody;
        $mail->AltBody = $altBody;
        $mail->send();
        return true;
    } catch (Throwable $e) {
        error_log('PHPMailer send failed to ' . $toEmail . ': ' . $e->getMessage());
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