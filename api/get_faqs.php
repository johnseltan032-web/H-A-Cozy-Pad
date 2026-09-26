<?php
require 'db.php';

header('Content-Type: application/json');

try {
    $stmt = $pdo->query(
        'SELECT
            f.faq_id,
            f.category_id,
            c.category_name,
            f.question,
            f.answer,
            f.created_at
         FROM faqs f
         JOIN faqs_categories c
            ON c.category_id = f.category_id
         ORDER BY c.category_name ASC, f.faq_id ASC'
    );

    $faqs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $result = array_map(
        static function ($faq) {
            return [
                'faqId' => (int) $faq['faq_id'],
                'categoryId' => (int) $faq['category_id'],
                'categoryName' => $faq['category_name'],
                'question' => $faq['question'],
                'answer' => $faq['answer'],
                'createdAt' => $faq['created_at']
            ];
        },
        $faqs
    );

    echo json_encode([
        'success' => true,
        'faqs' => $result
    ]);
} catch (Throwable $error) {
    http_response_code(500);

    echo json_encode([
        'error' => 'Unable to load FAQs'
    ]);
}
