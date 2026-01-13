<?php
require_once '_check_login.php'; // Checks if admin is logged in
require_once '../functions.php';
require_once '../db.php';

// --- FETCH DASHBOARD STATS ---

// 1. Total Revenue
$total_revenue = $pdo->query("SELECT SUM(total_amount) as total FROM orders")->fetchColumn();

// 2. Total Orders
$total_orders = $pdo->query("SELECT COUNT(id) as total FROM orders")->fetchColumn();

// 3. Total Products
$total_products = $pdo->query("SELECT COUNT(ProductId) as total FROM product")->fetchColumn();

// 4. Total Customers
$total_customers = $pdo->query("SELECT COUNT(id) as total FROM customers")->fetchColumn();

// Fetch recent orders
$recent_orders_stmt = $pdo->query("
    SELECT o.id, o.order_number, o.total_amount, o.order_date, c.first_name, c.last_name
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    ORDER BY o.order_date DESC
    LIMIT 5
");
$recent_orders = $recent_orders_stmt->fetchAll();

$page_title = "Dashboard";
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <?php include '_header_includes.php'; ?>
</head>
<body class="sb-nav-fixed">
    <?php include '_navbar.php'; ?>
    <div id="layoutSidenav">
        <?php include '_sidebar.php'; ?>
        <div id="layoutSidenav_content">
            <main>
                <div class="container-fluid px-4">
                    <h1 class="mt-4"><?= $page_title ?></h1>
                    <ol class="breadcrumb mb-4">
                        <li class="breadcrumb-item active">Inventory & Sales Overview</li>
                    </ol>

                    <!-- Stat Cards -->
                    <div class="row">
                        <div class="col-xl-3 col-md-6">
                            <div class="card bg-primary text-white mb-4">
                                <div class="card-body">
                                    <i class="fas fa-dollar-sign fa-2x"></i>
                                    <h5 class="mt-2">Total Revenue</h5>
                                    <h3>₹<?= number_format($total_revenue ?? 0, 2) ?></h3>
                                </div>
                            </div>
                        </div>
                        <div class="col-xl-3 col-md-6">
                            <div class="card bg-warning text-white mb-4">
                                <div class="card-body">
                                    <i class="fas fa-shopping-cart fa-2x"></i>
                                    <h5 class="mt-2">Total Orders</h5>
                                    <h3><?= $total_orders ?? 0 ?></h3>
                                </div>
                            </div>
                        </div>
                        <div class="col-xl-3 col-md-6">
                            <div class="card bg-success text-white mb-4">
                                <div class="card-body">
                                    <i class="fas fa-layer-group fa-2x"></i>
                                    <h5 class="mt-2">Total Products</h5>
                                    <h3><?= $total_products ?? 0 ?></h3>
                                </div>
                            </div>
                        </div>
                        <div class="col-xl-3 col-md-6">
                            <div class="card bg-danger text-white mb-4">
                                <div class="card-body">
                                    <i class="fas fa-users fa-2x"></i>
                                    <h5 class="mt-2">Total Customers</h5>
                                    <h3><?= $total_customers ?? 0 ?></h3>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Recent Orders Table -->
                    <div class="card mb-4">
                        <div class="card-header">
                            <i class="fas fa-table me-1"></i>
                            Recent Orders
                        </div>
                        <div class="card-body">
                            <table class="table table-bordered">
                                <thead>
                                    <tr>
                                        <th>Order ID</th>
                                        <th>Customer</th>
                                        <th>Date</th>
                                        <th>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php if(empty($recent_orders)): ?>
                                        <tr><td colspan="4" class="text-center">No recent orders found.</td></tr>
                                    <?php else: ?>
                                        <?php foreach($recent_orders as $order): ?>
                                            <tr>
                                                <td><a href="orders.php?view=<?= $order['id'] ?>"><?= escape_html($order['order_number']) ?></a></td>
                                                <td><?= escape_html($order['first_name'] . ' ' . $order['last_name']) ?></td>
                                                <td><?= date('d M, Y', strtotime($order['order_date'])) ?></td>
                                                <td>₹<?= number_format($order['total_amount'], 2) ?></td>
                                            </tr>
                                        <?php endforeach; ?>
                                    <?php endif; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </main>
            <?php include '_footer.php'; ?>
        </div>
    </div>
    <?php include '_footer_includes.php'; ?>
</body>
</html>
