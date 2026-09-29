<?php
/**
 * Email delivery was removed intentionally.
 * Notifications are still recorded in the database, but no SMTP/PHPMailer calls are used.
 */

function sendAppMail(string $toEmail, string $toName, string $subject, string $htmlBody, string $altBody = ''): bool
{
    return true;
}

function sendNotificationMail(PDO $pdo, int $userId, string $toEmail, string $toName, string $subject, string $htmlBody, string $altBody = ''): bool
{
    if (!$pdo instanceof PDO) {
        return false;
    }

    $stmt = $pdo->prepare('SELECT email_notifications FROM users WHERE user_id = ?');
    $stmt->execute([$userId]);
    $enabled = $stmt->fetchColumn();

    return (bool) $enabled;
}
?>