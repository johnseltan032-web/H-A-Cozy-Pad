<?php
require_once __DIR__ . '/vendor/autoload.php';

function sendAppMail(string $toEmail, string $toName, string $subject, string $htmlBody, string $altBody = ''): bool
{
    global $SMTP_USERNAME, $SMTP_PASSWORD, $SMTP_HOST, $SMTP_PORT, $SMTP_SECURE;
    global $EMAIL_FROM, $EMAIL_FROM_NAME;

    $allowDebugLogging = filter_var(getenv('MAIL_LOG_ERRORS') ?: 'false', FILTER_VALIDATE_BOOLEAN);

    if (
        empty($SMTP_USERNAME) ||
        empty($SMTP_PASSWORD) ||
        empty($SMTP_HOST) ||
        empty($EMAIL_FROM)
    ) {
        return false;
    }

    try {
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = $SMTP_HOST;
        $mail->SMTPAuth = true;
        $mail->Username = $SMTP_USERNAME;
        $mail->Password = $SMTP_PASSWORD;
        $mail->Port = $SMTP_PORT;
        if ($SMTP_SECURE === 'tls') {
            $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        } elseif ($SMTP_SECURE === 'ssl') {
            $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
        } else {
            $mail->SMTPSecure = '';
            $mail->SMTPAutoTLS = false;
        }
        $mail->Timeout = 12;
        $mail->CharSet = PHPMailer\PHPMailer\PHPMailer::CHARSET_UTF8;
        $mail->setFrom($EMAIL_FROM, $EMAIL_FROM_NAME);
        $mail->addAddress($toEmail, $toName);
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body = $htmlBody;
        $mail->AltBody = $altBody;
        $mail->send();
        return true;
    } catch (Throwable $e) {
        if ($allowDebugLogging) {
            error_log('PHPMailer send failed to ' . $toEmail . ': ' . $e->getMessage());
        }
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