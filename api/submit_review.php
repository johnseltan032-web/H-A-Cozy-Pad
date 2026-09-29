<?php
require 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true) ?? [];

$bookingId = (int) ($data['bookingId'] ?? 0);
$rating = (int) ($data['rating'] ?? 0);
$comment = trim($data['comment'] ?? '');

if (!$bookingId || $rating < 1 || $rating > 5) {
    http_response_code(400);
    echo json_encode(['error' => 'A booking and a rating from 1 to 5 are required']);
    exit;
}

if (mb_strlen($comment) > 2000) {
    http_response_code(400);
    echo json_encode(['error' => 'Comment is too long']);
    exit;
}

try {
    $customer = $pdo->prepare('SELECT customer_id FROM customer_profiles WHERE user_id = ?');
    $customer->execute([$_SESSION['user_id']]);
    $customerId = $customer->fetchColumn();

    if (!$customerId) {
        http_response_code(403);
        echo json_encode(['error' => 'Only customer accounts can leave reviews']);
        exit;
    }

    // Re-check eligibility server-side -- never trust the frontend's
    // can_review.php result alone.
    // TODO: once a real checkout flow exists, switch this back to
    // status = 'checked_out' instead of the date-based stand-in below.
    $booking = $pdo->prepare(
        "SELECT unit_id
         FROM bookings
         WHERE booking_id = ?
           AND customer_id = ?
           AND status = 'confirmed'
           AND check_out_date < CURDATE()"
    );
    $booking->execute([$bookingId, $customerId]);
    $unitId = $booking->fetchColumn();

    if (!$unitId) {
        http_response_code(403);
        echo json_encode(['error' => 'This booking is not eligible for a review']);
        exit;
    }

    $insert = $pdo->prepare(
        'INSERT INTO reviews (booking_id, customer_id, unit_id, rating, comment)
         VALUES (?, ?, ?, ?, ?)'
    );
    $insert->execute([$bookingId, $customerId, $unitId, $rating, $comment ?: null]);

    echo json_encode([
        'success' => true,
        'reviewId' => (int) $pdo->lastInsertId(),
    ]);
} catch (PDOException $e) {
    // Unique constraint on booking_id -- this booking already has a review.
    if ($e->getCode() === '23000') {
        http_response_code(409);
        echo json_encode(['error' => 'You have already reviewed this booking']);
        exit;
    }

    http_response_code(500);
    echo json_encode(['error' => 'Unable to save review']);
}
?>