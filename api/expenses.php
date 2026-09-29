<?php
require 'db.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    exit;
}

$role = strtolower($_SESSION['role'] ?? 'customer');
if (!in_array($role, ['super_admin', 'admin'], true)) {
    http_response_code(403);
    echo json_encode(['error' => 'Admin access required']);
    exit;
}

function getRequestData() {
    $data = $_POST;
    if (empty($data)) {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
    }
    return $data;
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $stmt = $pdo->query(
            "SELECT e.expense_id, e.unit_id, e.expense_date, e.category, e.amount, e.notes,
                    u.unit_name,
                    a.admin_id,
                    u2.full_name AS created_by_name,
                    e.created_at
             FROM unit_expenses e
             INNER JOIN units u ON u.unit_id = e.unit_id
             LEFT JOIN admin_profiles a ON a.admin_id = e.created_by
             LEFT JOIN users u2 ON u2.user_id = a.user_id
             ORDER BY e.expense_date DESC, e.expense_id DESC"
        );

        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        exit;
    }

    if ($method === 'POST') {
        $data = getRequestData();
        $unitId = (int) ($data['unit_id'] ?? 0);
        $expenseDate = trim((string) ($data['expense_date'] ?? ''));
        $category = trim((string) ($data['category'] ?? ''));
        $amount = (float) ($data['amount'] ?? 0);
        $notes = trim((string) ($data['notes'] ?? ''));

        $allowedCategories = [
            'cleaning',
            'maintenance',
            'supplies',
            'rent',
            'electricity',
            'water',
            'internet',
            'repairs',
            'amenities',
            'laundry',
            'toiletries',
            'other'
        ];

        if ($unitId <= 0 || $expenseDate === '' || !in_array($category, $allowedCategories, true) || $amount < 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid expense data']);
            exit;
        }

        $unitCheck = $pdo->prepare('SELECT unit_id FROM units WHERE unit_id = ?');
        $unitCheck->execute([$unitId]);
        if (!$unitCheck->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Unit not found']);
            exit;
        }

        $adminProfile = $pdo->prepare('SELECT admin_id FROM admin_profiles WHERE user_id = ?');
        $adminProfile->execute([$_SESSION['user_id']]);
        $createdBy = $adminProfile->fetchColumn();

        $stmt = $pdo->prepare(
            'INSERT INTO unit_expenses (unit_id, expense_date, category, amount, notes, created_by)
             VALUES (?, ?, ?, ?, ?, ?)'
        );

        $stmt->execute([$unitId, $expenseDate, $category, $amount, $notes, $createdBy]);

        echo json_encode([
            'message' => 'Expense recorded successfully',
            'expense_id' => (int) $pdo->lastInsertId(),
        ]);
        exit;
    }

    if ($method === 'PUT') {
        $data = getRequestData();
        $expenseId = (int) ($data['expense_id'] ?? 0);
        $unitId = (int) ($data['unit_id'] ?? 0);
        $expenseDate = trim((string) ($data['expense_date'] ?? ''));
        $category = trim((string) ($data['category'] ?? ''));
        $amount = (float) ($data['amount'] ?? 0);
        $notes = trim((string) ($data['notes'] ?? ''));

        $allowedCategories = [
            'cleaning',
            'maintenance',
            'supplies',
            'rent',
            'electricity',
            'water',
            'internet',
            'repairs',
            'amenities',
            'laundry',
            'toiletries',
            'other'
        ];

        if ($expenseId <= 0 || $unitId <= 0 || $expenseDate === '' || !in_array($category, $allowedCategories, true) || $amount < 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid expense data']);
            exit;
        }

        $adminProfile = $pdo->prepare('SELECT admin_id FROM admin_profiles WHERE user_id = ?');
        $adminProfile->execute([$_SESSION['user_id']]);
        $createdBy = $adminProfile->fetchColumn();

        $stmt = $pdo->prepare(
            'UPDATE unit_expenses
             SET unit_id = ?, expense_date = ?, category = ?, amount = ?, notes = ?, created_by = ?
             WHERE expense_id = ?'
        );

        $stmt->execute([$unitId, $expenseDate, $category, $amount, $notes, $createdBy, $expenseId]);

        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Expense not found']);
            exit;
        }

        echo json_encode(['message' => 'Expense updated successfully']);
        exit;
    }

    if ($method === 'DELETE') {
        $data = getRequestData();
        $expenseId = (int) ($data['expense_id'] ?? 0);

        if ($expenseId <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid expense ID']);
            exit;
        }

        $stmt = $pdo->prepare('DELETE FROM unit_expenses WHERE expense_id = ?');
        $stmt->execute([$expenseId]);

        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Expense not found']);
            exit;
        }

        echo json_encode(['message' => 'Expense deleted successfully']);
        exit;
    }

    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Server error',
        'details' => $error->getMessage(),
    ]);
}
?>
