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
        requireAdmin();

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
        exit;
    }

    requireAdmin();

    if ($method === 'POST') {
        $data = getRequestData();

        $categoryName = trim($data['categoryName'] ?? '');
        $categoryIcon = trim($data['categoryIcon'] ?? '');

        if ($categoryName === '') {
            http_response_code(400);
            echo json_encode([
                'error' => 'Category name is required'
            ]);
            exit;
        }

        if (mb_strlen($categoryName) > 50) {
            http_response_code(400);
            echo json_encode([
                'error' => 'Category name must not exceed 50 characters'
            ]);
            exit;
        }

        if ($categoryIcon === '' || mb_strlen($categoryIcon) > 8) {
            http_response_code(400);
            echo json_encode([
                'error' => 'A valid category icon is required'
            ]);
            exit;
        }

        $existing = $pdo->prepare(
            'SELECT category_id
             FROM faqs_categories
             WHERE category_name = ?'
        );

        $existing->execute([$categoryName]);

        if ($existing->fetchColumn()) {
            http_response_code(409);
            echo json_encode([
                'error' => 'A category with this name already exists'
            ]);
            exit;
        }

        $stmt = $pdo->prepare(
            'INSERT INTO faqs_categories
                (category_name, category_icon)
             VALUES (?, ?)'
        );

        $stmt->execute([$categoryName, $categoryIcon]);

        $categoryId = (int) $pdo->lastInsertId();

        echo json_encode([
            'success' => true,
            'message' => 'FAQ category created successfully',
            'categoryId' => $categoryId,
            'categoryName' => $categoryName,
            'categoryIcon' => $categoryIcon
        ]);
        exit;
    }

    if ($method === 'DELETE') {
        $data = getRequestData();
        $categoryId = filter_var(
            $data['categoryId'] ?? null,
            FILTER_VALIDATE_INT,
            ['options' => ['min_range' => 1]]
        );

        if ($categoryId === false || $categoryId === null) {
            http_response_code(400);
            echo json_encode([
                'error' => 'A valid category ID is required'
            ]);
            exit;
        }

        $pdo->beginTransaction();
        $category = $pdo->prepare(
            'SELECT category_id, category_name
             FROM faqs_categories
             WHERE category_id = ?
             FOR UPDATE'
        );
        $category->execute([$categoryId]);
        $categoryData = $category->fetch(PDO::FETCH_ASSOC);

        if (!$categoryData) {
            $pdo->rollBack();
            http_response_code(404);
            echo json_encode([
                'error' => 'FAQ category not found'
            ]);
            exit;
        }

        $delete = $pdo->prepare(
            'DELETE FROM faqs_categories
             WHERE category_id = ?'
        );
        $delete->execute([$categoryId]);
        $pdo->commit();

        echo json_encode([
            'success' => true,
            'message' => 'FAQ category and its FAQs deleted successfully',
            'categoryId' => (int) $categoryData['category_id'],
            'categoryName' => $categoryData['category_name']
        ]);
        exit;
    }

    http_response_code(405);
    echo json_encode([
        'error' => 'Method not allowed'
    ]);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);

    echo json_encode([
        'error' => 'Unable to process FAQ category request'
    ]);
}
