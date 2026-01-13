<?php
// Core setup, functions, and database connection
require_once 'functions.php';
require_once 'db.php';

// Redirect if not logged in
if (!isset($_SESSION['customer_id'])) {
    header('Location: login.php');
    exit;
}

$customer_id = $_SESSION['customer_id'];

// Fetch all orders for the logged-in customer
$stmt = $pdo->prepare("SELECT id, order_number, order_date, total_amount, shipped_status FROM orders WHERE customer_id = :customer_id ORDER BY order_date DESC");
$stmt->execute(['customer_id' => $customer_id]);
$customer_orders = $stmt->fetchAll();

$page_title = L($LANG, 'orders'); // Using the 'orders' string from lang files
?>
<!DOCTYPE html>
<html lang="<?= escape_html($_SESSION['lang']) ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $page_title ?> - <?= L($LANG, 'site_name') ?></title>
    
    <!-- Dependencies -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>

    <?php include '_header.php'; ?>

    <main class="container my-5">
        <div class="row justify-content-center">
            <div class="col-lg-10">
                <div class="card shadow-sm p-4">
                    <h1 class="text-center mb-4"><?= $page_title ?></h1>

                    <?php if (empty($customer_orders)): ?>
                        <div class="alert alert-info text-center">
                            <i class="fas fa-box-open fa-3x mb-3"></i>
                            <p class="lead mb-0">You haven't placed any orders yet.</p>
                            <a href="index.php" class="btn btn-primary mt-3">Start Shopping</a>
                        </div>
                    <?php else: ?>
                        <div class="table-responsive">
                            <table class="table table-bordered table-striped">
                                <thead>
                                    <tr>
                                        <th><?= L($LANG, 'order_number') ?></th>
                                        <th><?= L($LANG, 'order_date') ?></th>
                                        <th><?= L($LANG, 'total_amount') ?></th>
                                        <th><?= L($LANG, 'shipping_status') ?></th>
                                        <th>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($customer_orders as $order): ?>
                                        <tr>
                                            <td><?= escape_html($order['order_number']) ?></td>
                                            <td><?= date('d M, Y', strtotime($order['order_date'])) ?></td>
                                            <td>₹<?= number_format($order['total_amount'], 2) ?></td>
                                            <td>
                                                <span class="badge bg-<?= ($order['shipped_status'] == 'Pending' || $order['shipped_status'] == 'Processing') ? 'warning' : 'success' ?>">
                                                    <?= escape_html($order['shipped_status']) ?>
                                                </span>
                                            </td>
                                            <td><a href="order_details.php?id=<?= $order['id'] ?>" class="btn btn-sm btn-info">View Details</a></td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    <?php endif; ?>

                </div>
            </div>
        </div>
    </main>

    <?php include '_footer.php'; ?>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="assets/js/script.js"></script>
</body>
</html>
