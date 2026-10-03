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

$start = $_GET['start'] ?? date('Y-m-01');
$end = $_GET['end'] ?? date('Y-m-d');
$interval = $_GET['interval'] ?? 'week';
$validIntervals = [
    'week' => "DATE_FORMAT(p.created_at, '%x-W%v')",
    'month' => "DATE_FORMAT(p.created_at, '%Y-%m')",
    'quarter' => "CONCAT(YEAR(p.created_at), '-Q', QUARTER(p.created_at))",
    'year' => 'YEAR(p.created_at)',
];

$startDate = DateTimeImmutable::createFromFormat('!Y-m-d', $start);
$endDate = DateTimeImmutable::createFromFormat('!Y-m-d', $end);
$dateErrors = DateTimeImmutable::getLastErrors();
$datesValid = $startDate && $endDate &&
    (!$dateErrors || ($dateErrors['warning_count'] === 0 && $dateErrors['error_count'] === 0)) &&
    $startDate->format('Y-m-d') === $start &&
    $endDate->format('Y-m-d') === $end;

if (!$datesValid || $start > $end || !isset($validIntervals[$interval])) {
    http_response_code(400);
    echo json_encode(['error' => 'Provide a valid date range and reporting interval.']);
    exit;
}

$endExclusive = $endDate->modify('+1 day')->format('Y-m-d');
$periodDays = (int) $startDate->diff($endDate)->days + 1;

try {
    $paymentSummary = $pdo->prepare(
        "SELECT
            COALESCE(SUM(CASE WHEN p.payment_status IN ('verified', 'refunded') THEN p.amount ELSE 0 END), 0) AS gross_revenue,
            COALESCE(SUM(CASE WHEN p.payment_status = 'refunded' THEN p.amount ELSE 0 END), 0) AS refunds,
            SUM(CASE WHEN p.payment_status = 'verified' THEN 1 ELSE 0 END) AS sales_count
         FROM payments p
         WHERE p.created_at >= ? AND p.created_at < ?"
    );
    $paymentSummary->execute([$start, $endExclusive]);
    $paymentSummary = $paymentSummary->fetch(PDO::FETCH_ASSOC);
    $grossRevenue = (float) ($paymentSummary['gross_revenue'] ?? 0);
    $netRevenue = $grossRevenue - (float) ($paymentSummary['refunds'] ?? 0);
    $salesCount = (int) ($paymentSummary['sales_count'] ?? 0);

    $trendQuery = $pdo->prepare(
        "SELECT {$validIntervals[$interval]} AS bucket, SUM(p.amount) AS revenue
         FROM payments p
         WHERE p.payment_status = 'verified'
           AND p.created_at >= ? AND p.created_at < ?
         GROUP BY bucket
         ORDER BY MIN(p.created_at)"
    );
    $trendQuery->execute([$start, $endExclusive]);
    $revenueTrend = [];
    foreach ($trendQuery->fetchAll(PDO::FETCH_ASSOC) as $point) {
        $revenueTrend[] = [
            'bucket' => (string) $point['bucket'],
            'label' => (string) $point['bucket'],
            'revenue' => (float) $point['revenue'],
        ];
    }

    $bookingQuery = $pdo->prepare(
        "SELECT
            COUNT(*) AS total_bookings,
            SUM(CASE WHEN b.status IN ('confirmed', 'checked_in', 'checked_out') THEN 1 ELSE 0 END) AS confirmed_bookings,
            COALESCE(SUM(b.num_of_guests), 0) AS guest_count,
            COALESCE(AVG(DATEDIFF(b.check_out_date, b.check_in_date)), 0) AS average_length_of_stay
         FROM bookings b
         WHERE b.status NOT IN ('cancelled', 'rejected')
           AND b.check_in_date < ? AND b.check_out_date > ?"
    );
    $bookingQuery->execute([$endExclusive, $start]);
    $bookingSummary = $bookingQuery->fetch(PDO::FETCH_ASSOC);
    $totalBookings = (int) ($bookingSummary['total_bookings'] ?? 0);

    $bookingColumns = $pdo->query("SHOW COLUMNS FROM bookings")->fetchAll(PDO::FETCH_COLUMN);
    $sourceExpression = in_array('booking_source', $bookingColumns, true)
        ? "LOWER(TRIM(COALESCE(NULLIF(b.booking_source, ''), 'direct')))"
        : "'direct'";
    $sourceQuery = $pdo->prepare(
        "SELECT {$sourceExpression} AS source, COUNT(*) AS bookings
         FROM bookings b
         WHERE b.status NOT IN ('cancelled', 'rejected')
           AND b.check_in_date < ? AND b.check_out_date > ?
         GROUP BY source
         ORDER BY bookings DESC, source ASC"
    );
    $sourceQuery->execute([$endExclusive, $start]);
    $sources = [];
    foreach ($sourceQuery->fetchAll(PDO::FETCH_ASSOC) as $source) {
        $name = trim((string) $source['source']);
        if (str_contains($name, 'facebook') || str_contains($name, 'page')) {
            $name = 'facebook/page';
        } elseif (str_contains($name, 'airbnb')) {
            $name = 'airbnb';
        } elseif (str_contains($name, 'booking')) {
            $name = 'booking.com';
        } elseif ($name === '') {
            $name = 'direct';
        }

        if (!isset($sources[$name])) {
            $sources[$name] = 0;
        }
        $sources[$name] += (int) $source['bookings'];
    }

    $sourceBreakdown = [];
    foreach ($sources as $name => $count) {
        $sourceBreakdown[] = [
            'source' => $name,
            'bookings' => $count,
            'share' => $totalBookings > 0 ? ($count / $totalBookings) * 100 : 0,
        ];
    }

    $occupancyQuery = $pdo->prepare(
        "SELECT
            b.unit_id,
            COUNT(*) AS bookings,
            COALESCE(SUM(b.num_of_guests), 0) AS guest_count,
            COALESCE(SUM(GREATEST(DATEDIFF(LEAST(b.check_out_date, ?), GREATEST(b.check_in_date, ?)), 0)), 0) AS occupied_nights,
            COALESCE(AVG(DATEDIFF(b.check_out_date, b.check_in_date)), 0) AS average_length_of_stay
         FROM bookings b
         WHERE b.status NOT IN ('cancelled', 'rejected')
           AND b.check_in_date < ? AND b.check_out_date > ?
         GROUP BY b.unit_id"
    );
    $occupancyQuery->execute([$endExclusive, $start, $endExclusive, $start]);
    $unitPerformance = [];
    foreach ($occupancyQuery->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $unitPerformance[(int) $row['unit_id']] = [
            'bookings' => (int) $row['bookings'],
            'guestCount' => (int) $row['guest_count'],
            'occupiedNights' => (int) $row['occupied_nights'],
            'averageLengthOfStay' => (float) $row['average_length_of_stay'],
        ];
    }

    $unitRevenueQuery = $pdo->prepare(
        "SELECT
            b.unit_id,
            COALESCE(SUM(CASE WHEN p.payment_status IN ('verified', 'refunded') THEN p.amount ELSE 0 END), 0) AS revenue,
            COALESCE(SUM(CASE WHEN p.payment_status = 'refunded' THEN p.amount ELSE 0 END), 0) AS refunds
         FROM payments p
         INNER JOIN bookings b ON b.booking_id = p.booking_id
         WHERE p.payment_status IN ('verified', 'refunded')
           AND p.created_at >= ? AND p.created_at < ?
         GROUP BY b.unit_id"
    );
    $unitRevenueQuery->execute([$start, $endExclusive]);
    $unitRevenue = [];
    foreach ($unitRevenueQuery->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $unitRevenue[(int) $row['unit_id']] = [
            'revenue' => (float) $row['revenue'],
            'refunds' => (float) $row['refunds'],
        ];
    }

    $unitExpenseQuery = $pdo->prepare(
        'SELECT unit_id, COALESCE(SUM(amount), 0) AS expenses
         FROM unit_expenses
         WHERE expense_date >= ? AND expense_date <= ?
         GROUP BY unit_id'
    );
    $unitExpenseQuery->execute([$start, $end]);
    $unitExpenses = [];
    foreach ($unitExpenseQuery->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $unitExpenses[(int) $row['unit_id']] = (float) $row['expenses'];
    }

    $units = [];
    $unitRows = $pdo->query('SELECT unit_id, unit_name FROM units ORDER BY unit_name')->fetchAll(PDO::FETCH_ASSOC);
    $totalOccupiedNights = 0;
    foreach ($unitRows as $unit) {
        $unitId = (int) $unit['unit_id'];
        $performance = $unitPerformance[$unitId] ?? [
            'bookings' => 0,
            'guestCount' => 0,
            'occupiedNights' => 0,
            'averageLengthOfStay' => 0,
        ];
        $revenueData = $unitRevenue[$unitId] ?? ['revenue' => 0, 'refunds' => 0];
        $revenue = $revenueData['revenue'];
        $expenses = $unitExpenses[$unitId] ?? 0;
        $availableNights = $periodDays;
        $totalOccupiedNights += $performance['occupiedNights'];

        $units[] = [
            'unitId' => $unitId,
            'unitName' => (string) $unit['unit_name'],
            'revenue' => $revenue,
            'occupancyRate' => $availableNights > 0 ? ($performance['occupiedNights'] / $availableNights) * 100 : 0,
            'bookings' => $performance['bookings'],
            'averageBookingValue' => $performance['bookings'] > 0 ? $revenue / $performance['bookings'] : 0,
            'averageLengthOfStay' => $performance['averageLengthOfStay'],
            'revenuePerAvailableNight' => $availableNights > 0 ? $revenue / $availableNights : 0,
            'expenses' => $expenses,
            'netIncome' => $revenue - $revenueData['refunds'] - $expenses,
        ];
    }

    $totalUnits = count($units);
    $totalExpenses = array_sum($unitExpenses);

    echo json_encode([
        'period' => [
            'start' => $start,
            'end' => $end,
            'interval' => $interval,
        ],
        'metrics' => [
            'totalSales' => $salesCount,
            'grossRevenue' => $grossRevenue,
            'netRevenue' => $netRevenue,
            'totalExpenses' => $totalExpenses,
            'netIncome' => $netRevenue - $totalExpenses,
            'occupancyRate' => $totalUnits > 0 && $periodDays > 0
                ? ($totalOccupiedNights / ($totalUnits * $periodDays)) * 100
                : 0,
            'occupiedNights' => $totalOccupiedNights,
            'totalBookings' => $totalBookings,
            'confirmedBookings' => (int) ($bookingSummary['confirmed_bookings'] ?? 0),
            'guestCount' => (int) ($bookingSummary['guest_count'] ?? 0),
            'averageLengthOfStay' => (float) ($bookingSummary['average_length_of_stay'] ?? 0),
            'averageBookingValue' => $totalBookings > 0 ? $grossRevenue / $totalBookings : 0,
        ],
        'revenueTrend' => $revenueTrend,
        'bookingSources' => $sourceBreakdown,
        'units' => $units,
    ]);
} catch (Throwable $e) {
    error_log('Statistics query failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Unable to load statistics data']);
}
?>
