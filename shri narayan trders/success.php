<?php
// Core setup and functions
require_once 'functions.php';
require_once 'db.php';

// --- SECURITY CHECKS ---
// 1. Redirect if user is not logged in
if (!isset($_SESSION['customer_id'])) {
    header('Location: login.php');
    exit;
}

// 2. Check if a recent order number exists in the session.
// This prevents users from accessing this page directly without placing an order.
if (!isset($_SESSION['latest_order_number'])) {
    header('Location: index.php');
    exit;
}

// Get the latest order number and then unset it from the session
// This ensures the page can only be viewed once per order.
$order_number = $_SESSION['latest_order_number'];
unset($_SESSION['latest_order_number']);

// Fetch order details to display a summary
$stmt = $pdo->prepare("
    SELECT o.order_number, o.order_date, o.total_amount, c.first_name, c.last_name
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    WHERE o.order_number = :order_number AND o.customer_id = :customer_id
");
$stmt->execute([
    'order_number' => $order_number,
    'customer_id' => $_SESSION['customer_id']
]);
$order = $stmt->fetch();

// If for some reason the order can't be found, redirect home.
if (!$order) {
    header('Location: index.php');
    exit;
}

?>
<!DOCTYPE html>
<html lang="<?= escape_html($_SESSION['lang']) ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= L($LANG, 'payment_successful') ?> - <?= L($LANG, 'site_name') ?></title>
    
    <!-- Dependencies -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>

    <!-- Header -->
    <?php include '_header.php'; ?>

    <!-- Main Content -->
    <main class="container my-5">
        <div class="row justify-content-center">
            <div class="col-lg-8 col-md-10">
                <div class="card shadow-sm text-center p-4">
                    <div class="card-body">
                        <div class="mb-3">
                            <i class="fas fa-check-circle fa-5x text-success"></i>
                        </div>
                        <h1 class="display-5 fw-bold"><?= L($LANG, 'payment_successful') ?></h1>
                        <p class="lead"><?= L($LANG, 'order_placed_message') ?></p>
                        <hr>
                        
                        <h4 class="mt-4"><?= L($LANG, 'order_summary') ?></h4>
                        <p><strong><?= L($LANG, 'order_number') ?>:</strong> <?= escape_html($order['order_number']) ?></p>
                        <p><strong><?= L($LANG, 'order_date') ?>:</strong> <?= date('d M, Y, h:i A', strtotime($order['order_date'])) ?></p>
                        <p><strong><?= L($LANG, 'total_amount') ?>:</strong> ₹<?= number_format($order['total_amount'], 2) ?></p>

                        <div class="mt-4">
                            <a href="index.php" class="btn btn-primary btn-lg"><?= L($LANG, 'continue_shopping') ?></a>
                            <a href="orders.php" class="btn btn-outline-secondary btn-lg">View My Orders</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

        <?php include '_footer.php'; ?>

    

        <!-- JS Dependencies -->

        <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>

        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>

        <script src="assets/js/script.js"></script>

    </body>

    </html>
