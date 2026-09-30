<?php
// contact_submit.php — Contact Us form (US-25): sends the inquiry to the owner's notification bell.
require 'db.php'; // same as notifications.php: provides $pdo (and session/JSON headers)

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false]);
    exit;
}

$in = json_decode(file_get_contents('php://input'), true) ?? [];

// Honeypot: pretend success so bots don't retry
if (!empty($in['website'])) {
    echo json_encode(['success' => true]);
    exit;
}

$name    = trim($in['name'] ?? '');
$email   = trim($in['email'] ?? '');
$subject = trim($in['subject'] ?? '');
$message = trim($in['message'] ?? '');

$errors = [];
if ($name === '')    $errors['name'] = 'Enter your name.';
if ($email === '')   $errors['email'] = 'Enter your email address.';
elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors['email'] = 'Enter a valid email address, like name@example.com.';
if ($subject === '') $errors['subject'] = 'Enter a subject.';
if ($message === '') $errors['message'] = 'Enter your message.';
elseif (mb_strlen($message) < 10) $errors['message'] = 'Write at least 10 characters so we can help you.';

if ($errors) {
    http_response_code(422);
    echo json_encode(['success' => false, 'errors' => $errors]);
    exit;
}

// The bell shows this text as-is, so keep it readable and reasonably short.
$preview = mb_strlen($message) > 200 ? mb_substr($message, 0, 200) . '…' : $message;
$text = "New inquiry from $name ($email)\nSubject: $subject\n$preview\nOpen the Inbox to read and reply.";

try {
    // Store the full message for the Inbox page
    $save = $pdo->prepare(
        'INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)'
    );
    $save->execute([$name, $email, $subject, $message]);
} catch (Throwable $e) {
    error_log('Contact message save failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false]);
    exit;
}

try {
    // ASSUMPTIONS: users has columns user_id and role.
    // notifications.booking_id must allow NULL, and `type` must accept 'contact_inquiry'.
    $admins = $pdo->query("SELECT user_id FROM users WHERE role IN ('admin','super_admin')")
                  ->fetchAll(PDO::FETCH_COLUMN);

    if (!$admins) {
        error_log('Contact message saved without admin notifications: no admins found.');
    } else {
        $stmt = $pdo->prepare(
            'INSERT INTO notifications (user_id, booking_id, type, message, is_read, sent_at)
             VALUES (?, NULL, ?, ?, 0, NOW())'
        );
        foreach ($admins as $adminId) {
            $stmt->execute([$adminId, 'contact_inquiry', $text]);
        }
    }
} catch (Throwable $e) {
    error_log('Contact message saved, but admin notifications failed: ' . $e->getMessage());
}

echo json_encode(['success' => true]);