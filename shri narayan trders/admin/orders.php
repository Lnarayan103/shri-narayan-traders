<?php
require_once '_check_login.php';
require_once '../db.php';
require_once '../functions.php';

// Handle status update
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['update_status'])) {
    $order_id = (int)$_POST['order_id'];
    $new_status = trim($_POST['status']);
    
    $stmt = $pdo->prepare("UPDATE orders SET shipped_status = :status WHERE id = :id");
    $stmt->execute([':status' => $new_status, ':id' => $order_id]);
    
    header("Location: orders.php?success=Order status updated!");
    exit;
}

// Fetch all orders with customer and payment info
$sql = "SELECT 
            o.id, o.order_number, o.order_date, o.total_amount, o.shipped_status,
            c.first_name, c.last_name, c.email,
            cc.card_type, 
            -- Mask all but the last 4 digits of the card number
            CONCAT('xxxx-xxxx-xxxx-', SUBSTRING(cc.card_number, -4)) as masked_card_number
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        LEFT JOIN creditcard cc ON o.id = cc.order_id
        ORDER BY o.order_date DESC";
$stmt = $pdo->query($sql);
$orders = $stmt->fetchAll();

$page_title = "Manage Orders";
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <?php include '_header_includes.php'; ?>
    <link href="https://cdn.datatables.net/1.13.6/css/dataTables.bootstrap5.min.css" rel="stylesheet">
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
                        <li class="breadcrumb-item"><a href="dashboard.php">Dashboard</a></li>
                        <li class="breadcrumb-item active">Orders</li>
                    </ol>

                    <div class="card mb-4">
                        <div class="card-header"><i class="fas fa-table me-1"></i>All Customer Orders</div>
                        <div class="card-body">
                            <?php if (isset($_GET['success'])): ?>
                                <div class="alert alert-success alert-dismissible fade show" role="alert">
                                    <?= escape_html($_GET['success']) ?>
                                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                                </div>
                            <?php endif; ?>
                            <table id="ordersTable" class="table table-bordered table-striped">
                                <thead>
                                    <tr>
                                        <th>Order #</th>
                                        <th>Customer</th>
                                        <th>Date</th>
                                        <th>Amount</th>
                                        <th>Payment</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach($orders as $order): ?>
                                        <tr>
                                            <td><?= escape_html($order['order_number']) ?></td>
                                            <td>
                                                <?= escape_html($order['first_name'] . ' ' . $order['last_name']) ?><br>
                                                <small><?= escape_html($order['email']) ?></small>
                                            </td>
                                            <td><?= date('d M, Y', strtotime($order['order_date'])) ?></td>
                                            <td>₹<?= number_format($order['total_amount'], 2) ?></td>
                                            <td>
                                                <small>
                                                    <?= escape_html($order['card_type']) ?><br>
                                                    <?= escape_html($order['masked_card_number']) ?>
                                                </small>
                                            </td>
                                            <td>
                                                <span class="badge bg-<?= ($order['shipped_status'] == 'Shipped') ? 'success' : 'warning' ?>">
                                                    <?= escape_html($order['shipped_status']) ?>
                                                </span>
                                            </td>
                                            <td>
                                                <form action="orders.php" method="POST" class="d-inline-block">
                                                    <input type="hidden" name="order_id" value="<?= $order['id'] ?>">
                                                    <select name="status" class="form-select form-select-sm" onchange="this.form.submit()">
                                                        <option value="Pending" <?= $order['shipped_status'] == 'Pending' ? 'selected' : '' ?>>Pending</option>
                                                        <option value="Processing" <?= $order['shipped_status'] == 'Processing' ? 'selected' : '' ?>>Processing</option>
                                                        <option value="Shipped" <?= $order['shipped_status'] == 'Shipped' ? 'selected' : '' ?>>Shipped</option>
                                                        <option value="Delivered" <?= $order['shipped_status'] == 'Delivered' ? 'selected' : '' ?>>Delivered</option>
                                                        <option value="Cancelled" <?= $order['shipped_status'] == 'Cancelled' ? 'selected' : '' ?>>Cancelled</option>
                                                    </select>
                                                    <input type="hidden" name="update_status" value="1">
                                                </form>
                                                <a href="reports.php?order_id=<?= $order['id'] ?>" class="btn btn-sm btn-info" title="View Invoice">
                                                    <i class="fas fa-file-invoice"></i>
                                                </a>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
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
    <script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.6/js/dataTables.bootstrap5.min.js"></script>
    <script>
        $(document).ready(function() {
            $('#ordersTable').DataTable({ "order": [[ 2, "desc" ]] });
        });
    </script>
</body>
</html>
