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
$hasAccess = $role === 'super_admin' || !empty($_SESSION['can_view_statistics']);

if (!$hasAccess) {
    http_response_code(403);
    echo json_encode(['error' => 'Statistics access is disabled for this account.']);
    exit;
}

try {
    $monthlyStart = date('Y-m-01');
    $today = date('Y-m-d');

    $summary = $pdo->query(
        "SELECT
            COALESCE(SUM(CASE WHEN p.payment_status = 'verified' AND p.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN p.amount ELSE 0 END), 0) AS weekly_income,
            COALESCE(SUM(CASE WHEN p.payment_status = 'verified' AND DATE(p.created_at) >= '$monthlyStart' THEN p.amount ELSE 0 END), 0) AS monthly_income,
            COALESCE(SUM(CASE WHEN p.payment_status = 'verified' THEN p.amount ELSE 0 END), 0) AS gross_sales,
            COALESCE(SUM(CASE WHEN p.payment_status = 'verified' THEN p.amount ELSE 0 END), 0) AS net_sales,
            COALESCE((SELECT COUNT(*) FROM bookings WHERE check_in_date <= CURDATE() AND check_out_date > CURDATE() AND status NOT IN ('cancelled', 'rejected')) / NULLIF((SELECT COUNT(*) FROM units), 0) * 100, 0) AS occupancy_rate,
            COALESCE((SELECT SUM(DATEDIFF(check_out_date, check_in_date)) FROM bookings WHERE status NOT IN ('cancelled', 'rejected')) / NULLIF((SELECT COUNT(*) FROM bookings WHERE status NOT IN ('cancelled', 'rejected')), 0), 0) AS average_length_of_stay,
            COALESCE((SELECT COUNT(*) FROM bookings WHERE DATE(created_at) >= '$monthlyStart' AND status NOT IN ('cancelled', 'rejected')), 0) AS number_of_bookings,
            COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.payment_status = 'verified' AND DATE(p.created_at) >= '$monthlyStart'), 0) AS monthly_profit
        FROM payments p"
    )->fetch(PDO::FETCH_ASSOC);

    $occupiedNights = (float) $pdo->query(
        "SELECT COALESCE(SUM(DATEDIFF(check_out_date, check_in_date)), 0)
         FROM bookings
         WHERE status NOT IN ('cancelled', 'rejected')"
    )->fetchColumn();

    $totalRevenue = (float) $pdo->query(
        "SELECT COALESCE(SUM(amount), 0)
         FROM payments
         WHERE payment_status = 'verified'"
    )->fetchColumn();

    $totalUnits = (int) $pdo->query('SELECT COUNT(*) FROM units')->fetchColumn();
    $availableUnits = (int) $pdo->query("SELECT COUNT(*) FROM units WHERE status = 'available'")->fetchColumn();
    $monthlyBookings = (int) $pdo->query("SELECT COUNT(*) FROM bookings WHERE DATE(created_at) >= '$monthlyStart' AND status NOT IN ('cancelled', 'rejected')")->fetchColumn();

    $occupancyRate = $totalUnits > 0 ? (($occupiedNights / max(1, $totalUnits * 30)) * 100) : 0;
    $adr = $monthlyBookings > 0 ? ($totalRevenue / $monthlyBookings) : 0;
    $revpar = $totalUnits > 0 ? ($totalRevenue / $totalUnits) : 0;

    $topUnit = $pdo->query(
        "SELECT u.unit_name, COALESCE(SUM(p.amount), 0) AS total_revenue
         FROM bookings b
         INNER JOIN units u ON u.unit_id = b.unit_id
         LEFT JOIN payments p ON p.booking_id = b.booking_id AND p.payment_status = 'verified'
         WHERE b.status NOT IN ('cancelled', 'rejected')
         GROUP BY u.unit_id, u.unit_name
         ORDER BY total_revenue DESC, u.unit_name ASC
         LIMIT 1"
    )->fetch(PDO::FETCH_ASSOC);

    $metrics = [
        'weeklyIncome' => (float) ($summary['weekly_income'] ?? 0),
        'monthlyIncome' => (float) ($summary['monthly_income'] ?? 0),
        'grossSales' => (float) ($summary['gross_sales'] ?? 0),
        'netSales' => (float) ($summary['net_sales'] ?? 0),
        'occupancyRate' => (float) $occupancyRate,
        'adr' => (float) $adr,
        'revpar' => (float) $revpar,
        'monthlyProfit' => (float) ($summary['monthly_profit'] ?? 0),
        'numberOfBookings' => (int) ($summary['number_of_bookings'] ?? $monthlyBookings),
        'averageLengthOfStay' => (float) ($summary['average_length_of_stay'] ?? 0),
        'topPerformingUnit' => $topUnit['unit_name'] ?? 'N/A',
    ];

    echo json_encode([
        'metrics' => $metrics,
        'generated_at' => $today,
    ]);
} catch (Throwable $e) {
    error_log('Statistics query failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Unable to load statistics data']);
}
?>
