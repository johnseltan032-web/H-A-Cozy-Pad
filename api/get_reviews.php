<?php
require 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$unitId = (int) ($_GET['unit_id'] ?? 0);

if (!$unitId) {
    http_response_code(400);
    echo json_encode(['error' => 'unit_id is required']);
    exit;
}

$stmt = $pdo->prepare(
    'SELECT r.review_id, r.rating, r.comment, r.created_at,
            b.check_in_date, b.check_out_date,
            u.full_name
     FROM reviews r
     JOIN bookings b ON b.booking_id = r.booking_id
     JOIN customer_profiles cp ON cp.customer_id = r.customer_id
     JOIN users u ON u.user_id = cp.user_id
     WHERE r.unit_id = ?
     ORDER BY r.created_at DESC'
);
$stmt->execute([$unitId]);
$reviews = $stmt->fetchAll(PDO::FETCH_ASSOC);

$count = count($reviews);
$average = 0;

if ($count > 0) {
    $total = 0;
    foreach ($reviews as $review) {
        $total += (int) $review['rating'];
    }
    $average = round($total / $count, 1);
}

// Only show a first name + last initial, e.g. "Maria S." -- not the full
// legal name of a customer who left a public review.
$formatted = array_map(function ($review) {
    $nameParts = preg_split('/\s+/', trim($review['full_name']));
    $displayName = $nameParts[0];
    if (count($nameParts) > 1) {
        $displayName .= ' ' . mb_substr(end($nameParts), 0, 1) . '.';
    }

    return [
        'reviewId' => (int) $review['review_id'],
        'name' => $displayName,
        'rating' => (int) $review['rating'],
        'comment' => $review['comment'],
        'checkIn' => $review['check_in_date'],
        'checkOut' => $review['check_out_date'],
        'createdAt' => $review['created_at'],
    ];
}, $reviews);

echo json_encode([
    'reviews' => $formatted,
    'averageRating' => $average,
    'count' => $count,
]);
?>