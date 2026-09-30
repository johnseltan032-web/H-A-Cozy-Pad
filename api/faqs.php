<?php
require 'db.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');

function requireAdmin()
{
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode([
            'error' => 'Authentication required'
        ]);
        exit;
    }

    if (!in_array(strtolower($_SESSION['role'] ?? ''), ['super_admin', 'admin'], true)) {
        http_response_code(403);
        echo json_encode([
            'error' => 'Admin access required'
        ]);
        exit;
    }
}

function getRequestData()
{
    $data = json_decode(file_get_contents('php://input'), true);

    if (!is_array($data)) {
        http_response_code(400);
        echo json_encode([
            'error' => 'Invalid request data'
        ]);
        exit;
    }

    return $data;
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode([
                'error' => 'Authentication required'
            ]);
            exit;
        }

        if (!in_array(strtolower($_SESSION['role'] ?? ''), ['super_admin', 'admin'], true)) {
            http_response_code(403);
            echo json_encode([
                'error' => 'Admin access required'
            ]);
            exit;
        }

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
        exit;
    }

    requireAdmin();

    if ($method === 'POST') {
        $data = getRequestData();

        $categoryId = (int) ($data['categoryId'] ?? 0);
        $question = trim($data['question'] ?? '');
        $answer = trim($data['answer'] ?? '');

        if ($categoryId <= 0) {
            http_response_code(400);
            echo json_encode([
                'error' => 'A valid category is required'
            ]);
            exit;
        }

        if ($question === '') {
            http_response_code(400);
            echo json_encode([
                'error' => 'Question is required'
            ]);
            exit;
        }

        if ($answer === '') {
            http_response_code(400);
            echo json_encode([
                'error' => 'Answer is required'
            ]);
            exit;
        }

        $category = $pdo->prepare(
            'SELECT category_id
             FROM faqs_categories
             WHERE category_id = ?'
        );

        $category->execute([$categoryId]);

        if (!$category->fetchColumn()) {
            http_response_code(404);
            echo json_encode([
                'error' => 'FAQ category not found'
            ]);
            exit;
        }

        $stmt = $pdo->prepare(
            'INSERT INTO faqs
                (category_id, question, answer)
             VALUES (?, ?, ?)'
        );

        $stmt->execute([
            $categoryId,
            $question,
            $answer
        ]);

        $faqId = (int) $pdo->lastInsertId();

        echo json_encode([
            'success' => true,
            'message' => 'FAQ created successfully',
            'faqId' => $faqId
        ]);
        exit;
    }

    if ($method === 'PUT') {
        $data = getRequestData();

        $faqId = (int) ($data['faqId'] ?? 0);
        $categoryId = (int) ($data['categoryId'] ?? 0);
        $question = trim($data['question'] ?? '');
        $answer = trim($data['answer'] ?? '');

        if ($faqId <= 0) {
            http_response_code(400);
            echo json_encode([
                'error' => 'Invalid FAQ ID'
            ]);
            exit;
        }

        if ($categoryId <= 0) {
            http_response_code(400);
            echo json_encode([
                'error' => 'A valid category is required'
            ]);
            exit;
        }

        if ($question === '') {
            http_response_code(400);
            echo json_encode([
                'error' => 'Question is required'
            ]);
            exit;
        }

        if ($answer === '') {
            http_response_code(400);
            echo json_encode([
                'error' => 'Answer is required'
            ]);
            exit;
        }

        $category = $pdo->prepare(
            'SELECT category_id
             FROM faqs_categories
             WHERE category_id = ?'
        );

        $category->execute([$categoryId]);

        if (!$category->fetchColumn()) {
            http_response_code(404);
            echo json_encode([
                'error' => 'FAQ category not found'
            ]);
            exit;
        }

        $existingFaq = $pdo->prepare(
            'SELECT faq_id
             FROM faqs
             WHERE faq_id = ?'
        );

        $existingFaq->execute([$faqId]);

        if (!$existingFaq->fetchColumn()) {
            http_response_code(404);
            echo json_encode([
                'error' => 'FAQ not found'
            ]);
            exit;
        }

        $stmt = $pdo->prepare(
            'UPDATE faqs
             SET category_id = ?,
                 question = ?,
                 answer = ?
             WHERE faq_id = ?'
        );

        $stmt->execute([
            $categoryId,
            $question,
            $answer,
            $faqId
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'FAQ updated successfully',
            'faqId' => $faqId
        ]);
        exit;
    }

    if ($method === 'DELETE') {
        $data = getRequestData();

        $faqId = (int) ($data['faqId'] ?? 0);

        if ($faqId <= 0) {
            http_response_code(400);
            echo json_encode([
                'error' => 'Invalid FAQ ID'
            ]);
            exit;
        }

        $existingFaq = $pdo->prepare(
            'SELECT faq_id
             FROM faqs
             WHERE faq_id = ?'
        );

        $existingFaq->execute([$faqId]);

        if (!$existingFaq->fetchColumn()) {
            http_response_code(404);
            echo json_encode([
                'error' => 'FAQ not found'
            ]);
            exit;
        }

        $stmt = $pdo->prepare(
            'DELETE FROM faqs
             WHERE faq_id = ?'
        );

        $stmt->execute([$faqId]);

        echo json_encode([
            'success' => true,
            'message' => 'FAQ deleted successfully',
            'faqId' => $faqId
        ]);
        exit;
    }

    http_response_code(405);
    echo json_encode([
        'error' => 'Method not allowed'
    ]);

} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Unable to process FAQ request'
    ]);
}
