<?php
require 'db.php';

header('Content-Type: application/json');

try {
    $stmt = $pdo->query(
        'SELECT
            category_id,
            category_name,
            category_icon,
            created_at
         FROM faqs_categories
         ORDER BY category_name ASC'
    );

    $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $result = array_map(
        static function ($category) {
            return [
                'categoryId' => (int) $category['category_id'],
                'categoryName' => $category['category_name'],
                'categoryIcon' => $category['category_icon'],
                'createdAt' => $category['created_at']
            ];
        },
        $categories
    );

    echo json_encode([
        'success' => true,
        'categories' => $result
    ]);
} catch (Throwable $error) {
    http_response_code(500);

    echo json_encode([
        'error' => 'Unable to load FAQ categories'
    ]);
}
