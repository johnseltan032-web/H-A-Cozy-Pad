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

if (!in_array(strtolower($_SESSION['role'] ?? ''), ['super_admin', 'admin'], true)) {
    http_response_code(403);
    echo json_encode(['error' => 'Access denied']);
    exit;
}

try {
    $today = date('Y-m-d');

    $stats = $pdo->query("
        SELECT
            (SELECT COUNT(*) FROM bookings) AS total_bookings,
            (SELECT COUNT(*) FROM bookings WHERE status IN ('confirmed', 'checked_in') AND check_in_date <= CURDATE() AND check_out_date > CURDATE()) AS active_stays,
            (SELECT COUNT(*) FROM bookings WHERE status = 'pending') AS pending_bookings,
            (SELECT COUNT(*) FROM bookings WHERE status = 'payment_review') AS payment_reviews,
            (SELECT COUNT(*) FROM units WHERE status = 'available') AS available_units,
            (SELECT COUNT(*) FROM units WHERE status = 'occupied') AS occupied_units,
            (SELECT COUNT(*) FROM buildings) AS total_properties,
            (SELECT COUNT(*) FROM users WHERE role = 'customer') AS total_customers,
            (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payment_status = 'verified') AS verified_revenue
    ")->fetch(PDO::FETCH_ASSOC);

    $summary = array_fill_keys([
        'pending', 'awaiting_payment', 'payment_review', 'confirmed',
        'checked_in', 'checked_out', 'cancelled', 'rejected',
    ], 0);
    $summaryRows = $pdo->query('SELECT status, COUNT(*) AS total FROM bookings GROUP BY status');
    foreach ($summaryRows->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $summary[$row['status']] = (int) $row['total'];
    }

    $checkInRows = $pdo->query(
        "SELECT b.booking_id, b.check_in_date, b.check_out_date, b.status,
                u.unit_name, bu.building_name,
                COALESCE(bd.guest_name, cu.full_name, 'Guest') AS guest_name,
                '02:00 PM' AS check_in_time
         FROM bookings b
         INNER JOIN units u ON b.unit_id = u.unit_id
         INNER JOIN buildings bu ON u.building_id = bu.building_id
         LEFT JOIN customer_profiles cp ON b.customer_id = cp.customer_id
         LEFT JOIN users cu ON cp.user_id = cu.user_id
         LEFT JOIN booking_details bd ON b.booking_id = bd.booking_id
         WHERE b.check_in_date = CURDATE()
           AND b.status NOT IN ('cancelled', 'rejected')
         ORDER BY b.created_at ASC"
    )->fetchAll(PDO::FETCH_ASSOC);

    $checkOutRows = $pdo->query(
        "SELECT b.booking_id, b.check_in_date, b.check_out_date, b.status,
                u.unit_name, bu.building_name,
                COALESCE(bd.guest_name, cu.full_name, 'Guest') AS guest_name,
                '12:00 PM' AS check_out_time
         FROM bookings b
         INNER JOIN units u ON b.unit_id = u.unit_id
         INNER JOIN buildings bu ON u.building_id = bu.building_id
         LEFT JOIN customer_profiles cp ON b.customer_id = cp.customer_id
         LEFT JOIN users cu ON cp.user_id = cu.user_id
         LEFT JOIN booking_details bd ON b.booking_id = bd.booking_id
         WHERE b.check_out_date = CURDATE()
           AND b.status NOT IN ('cancelled', 'rejected')
         ORDER BY b.created_at ASC"
    )->fetchAll(PDO::FETCH_ASSOC);

    $cleaningRows = $pdo->query(
        "SELECT DISTINCT b.unit_id, u.unit_name, bu.building_name,
                '12:00 PM' AS check_out_time
         FROM bookings b
         INNER JOIN units u ON u.unit_id = b.unit_id
         INNER JOIN buildings bu ON bu.building_id = u.building_id
         WHERE b.check_out_date = CURDATE()
           AND b.status NOT IN ('cancelled', 'rejected')
         ORDER BY bu.building_name ASC, u.unit_name ASC"
    )->fetchAll(PDO::FETCH_ASSOC);

    $occupiedToday = $pdo->query(
        "SELECT DISTINCT u.unit_id, u.unit_name, bu.building_name
         FROM bookings b
         INNER JOIN units u ON u.unit_id = b.unit_id
         INNER JOIN buildings bu ON bu.building_id = u.building_id
         WHERE b.check_in_date <= CURDATE()
           AND b.check_out_date > CURDATE()
           AND b.status NOT IN ('cancelled', 'rejected')
         ORDER BY bu.building_name ASC, u.unit_name ASC"
    )->fetchAll(PDO::FETCH_ASSOC);

    $vacantUnits = $pdo->query(
        "SELECT u.unit_id, u.unit_name, bu.building_name
         FROM units u
         INNER JOIN buildings bu ON bu.building_id = u.building_id
         LEFT JOIN bookings b
           ON b.unit_id = u.unit_id
          AND b.check_in_date <= CURDATE()
          AND b.check_out_date > CURDATE()
          AND b.status NOT IN ('cancelled', 'rejected')
         WHERE b.booking_id IS NULL
         ORDER BY bu.building_name ASC, u.unit_name ASC"
    )->fetchAll(PDO::FETCH_ASSOC);

    $upcoming = $pdo->query("
        SELECT b.booking_id, b.check_in_date, b.check_out_date, b.num_of_guests, b.status,
               u.unit_name, bu.building_name,
               COALESCE(bd.guest_name, cu.full_name) AS guest_name
        FROM bookings b
        INNER JOIN units u ON b.unit_id = u.unit_id
        INNER JOIN buildings bu ON u.building_id = bu.building_id
        LEFT JOIN customer_profiles cp ON b.customer_id = cp.customer_id
        LEFT JOIN users cu ON cp.user_id = cu.user_id
        LEFT JOIN booking_details bd ON b.booking_id = bd.booking_id
        WHERE b.check_out_date >= CURDATE()
          AND b.status NOT IN ('cancelled', 'rejected', 'checked_out')
        ORDER BY b.check_in_date ASC, b.created_at ASC
        LIMIT 5
    ")->fetchAll(PDO::FETCH_ASSOC);

    $arrivalTomorrowRows = $pdo->query("
        SELECT b.booking_id, b.check_in_date, u.unit_name, bu.building_name,
               COALESCE(bd.guest_name, cu.full_name, 'Guest') AS guest_name
        FROM bookings b
        INNER JOIN units u ON b.unit_id = u.unit_id
        INNER JOIN buildings bu ON u.building_id = bu.building_id
        LEFT JOIN customer_profiles cp ON b.customer_id = cp.customer_id
        LEFT JOIN users cu ON cp.user_id = cu.user_id
        LEFT JOIN booking_details bd ON b.booking_id = bd.booking_id
        WHERE b.check_in_date = DATE_ADD(CURDATE(), INTERVAL 1 DAY)
          AND b.status NOT IN ('cancelled', 'rejected', 'checked_out')
        ORDER BY b.check_in_date ASC, u.unit_name ASC
        LIMIT 6
    ")->fetchAll(PDO::FETCH_ASSOC);

    $upcomingBlocks = $pdo->query("
        SELECT u.unit_name, b.blocked_from, b.blocked_until, b.reason
        FROM unit_blocked_dates b
        INNER JOIN units u ON u.unit_id = b.unit_id
        WHERE b.blocked_from BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        ORDER BY b.blocked_from ASC
        LIMIT 5
    ")->fetchAll(PDO::FETCH_ASSOC);

    $alerts = [];

    foreach ($arrivalTomorrowRows as $arrival) {
        $alerts[] = [
            'type' => 'arrival',
            'severity' => 'medium',
            'title' => 'Guest arrival tomorrow',
            'message' => sprintf(
                '%s is arriving tomorrow for %s in %s (%s).',
                $arrival['guest_name'],
                $arrival['unit_name'],
                $arrival['building_name'],
                $arrival['check_in_date']
            ),
        ];
    }

    foreach ($upcomingBlocks as $block) {
        $alerts[] = [
            'type' => 'blocked',
            'severity' => 'medium',
            'title' => 'Unit blocked',
            'message' => sprintf(
                '%s is blocked from %s to %s (%s).',
                $block['unit_name'],
                $block['blocked_from'],
                $block['blocked_until'],
                str_replace('_', ' ', $block['reason'])
            ),
        ];
    }

    if (empty($alerts)) {
        $alerts = [];
    }

    foreach ($upcoming as &$booking) {
        $booking['booking_id'] = (int) $booking['booking_id'];
        $booking['num_of_guests'] = (int) $booking['num_of_guests'];
    }
    unset($booking);

    $payments = $pdo->query("
        SELECT p.payment_id, p.amount, p.payment_method, p.payment_status, p.created_at,
               b.booking_id, COALESCE(bd.guest_name, cu.full_name) AS guest_name,
               bu.building_name, u.unit_name
        FROM payments p
        INNER JOIN bookings b ON p.booking_id = b.booking_id
        LEFT JOIN customer_profiles cp ON b.customer_id = cp.customer_id
        LEFT JOIN users cu ON cp.user_id = cu.user_id
        INNER JOIN units u ON b.unit_id = u.unit_id
        INNER JOIN buildings bu ON u.building_id = bu.building_id
        LEFT JOIN booking_details bd ON b.booking_id = bd.booking_id
        ORDER BY p.created_at DESC
        LIMIT 5
    ")->fetchAll(PDO::FETCH_ASSOC);

    foreach ($payments as &$payment) {
        $payment['payment_id'] = (int) $payment['payment_id'];
        $payment['booking_id'] = (int) $payment['booking_id'];
        $payment['amount'] = (float) $payment['amount'];
    }
    unset($payment);

    $dailyOperations = [
        'checkIns' => [
            'count' => count($checkInRows),
            'items' => array_map(function ($row) {
                return [
                    'property_name' => $row['building_name'] ?? $row['unit_name'],
                    'unit_name' => $row['unit_name'],
                    'guest_name' => $row['guest_name'],
                    'check_in_time' => $row['check_in_time'],
                ];
            }, $checkInRows),
        ],
        'checkOuts' => [
            'count' => count($checkOutRows),
            'items' => array_map(function ($row) {
                return [
                    'property_name' => $row['building_name'] ?? $row['unit_name'],
                    'unit_name' => $row['unit_name'],
                    'guest_name' => $row['guest_name'],
                    'check_out_time' => $row['check_out_time'],
                ];
            }, $checkOutRows),
        ],
        'cleaning' => [
            'count' => count($cleaningRows),
            'items' => array_map(function ($row) {
                return [
                    'property_name' => $row['building_name'] ?? $row['unit_name'],
                    'unit_name' => $row['unit_name'],
                    'check_out_time' => $row['check_out_time'],
                ];
            }, $cleaningRows),
        ],
        'vacantUnits' => [
            'count' => count($vacantUnits),
            'units' => array_map(function ($row) {
                return [
                    'property_name' => $row['building_name'] ?? $row['unit_name'],
                    'unit_name' => $row['unit_name'],
                ];
            }, $vacantUnits),
        ],
        'occupiedUnits' => [
            'count' => count($occupiedToday),
            'units' => array_map(function ($row) {
                return [
                    'property_name' => $row['building_name'] ?? $row['unit_name'],
                    'unit_name' => $row['unit_name'],
                ];
            }, $occupiedToday),
        ],
    ];

    echo json_encode([
        'stats' => [
            'totalBookings' => (int) $stats['total_bookings'],
            'activeStays' => (int) $stats['active_stays'],
            'pendingBookings' => (int) $stats['pending_bookings'],
            'paymentReviews' => (int) $stats['payment_reviews'],
            'availableUnits' => (int) $stats['available_units'],
            'occupiedUnits' => (int) $stats['occupied_units'],
            'totalProperties' => (int) $stats['total_properties'],
            'totalCustomers' => (int) $stats['total_customers'],
            'verifiedRevenue' => (float) $stats['verified_revenue'],
        ],
        'dailyOperations' => $dailyOperations,
        'bookingSummary' => $summary,
        'upcomingReservations' => $upcoming,
        'recentPayments' => $payments,
        'alerts' => $alerts,
        'today' => $today,
    ]);
} catch (PDOException $error) {
    error_log('Dashboard overview query failed: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Unable to load dashboard overview']);
}
?>