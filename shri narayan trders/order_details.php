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
$order_id = (int)($_GET['id'] ?? 0);

if ($order_id <= 0) {
    header('Location: orders.php');
    exit;
}

// Fetch order details, ensuring it belongs to the logged-in customer for security
$stmt = $pdo->prepare("SELECT * FROM orders WHERE id = :order_id AND customer_id = :customer_id");
$stmt->execute(['order_id' => $order_id, 'customer_id' => $customer_id]);
$order = $stmt->fetch();

// If order doesn't exist or doesn't belong to the user, redirect them
if (!$order) {
    header('Location: orders.php');
    exit;
}

// Fetch the items for this order
$items_stmt = $pdo->prepare("
    SELECT oi.quantity, oi.price, p.ProductName, p.Image
    FROM order_items oi
    JOIN product p ON oi.product_id = p.ProductId
    WHERE oi.order_id = :order_id
");
$items_stmt->execute(['order_id' => $order_id]);
$order_items = $items_stmt->fetchAll();


$page_title = "Order Details";
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
                <div class="card shadow-sm">
                    <div class="card-header p-3">
                        <h3 class="mb-0">Order #<?= escape_html($order['order_number']) ?></h3>
                        <p class="mb-0 text-muted">Placed on: <?= date('d M, Y', strtotime($order['order_date'])) ?></p>
                    </div>
                    <div class="card-body p-4">
                        <div class="row">
                            <div class="col-md-6">
                                <h5>Shipping Address</h5>
                                <address><?= nl2br(escape_html($order['shipping_address'])) ?></address>
                            </div>
                            <div class="col-md-6 text-md-end">
                                <h5>Order Summary</h5>
                                <p><strong>Total Amount:</strong> ₹<?= number_format($order['total_amount'], 2) ?></p>
                                <p><strong>Status:</strong> 
                                    <span class="badge bg-<?= ($order['shipped_status'] == 'Pending' || $order['shipped_status'] == 'Processing') ? 'warning' : 'success' ?>">
                                        <?= escape_html($order['shipped_status']) ?>
                                    </span>
                                </p>
                                <?php if ($order['shipped_status'] == 'Pending'): ?>
                                    <a href="handle_order_action.php?action=cancel&id=<?= $order['id'] ?>" class="btn btn-sm btn-danger" onclick="return confirm('Are you sure you want to cancel this entire order?');">Cancel Order</a>
                                <?php endif; ?>
                            </div>
                        </div>

                        <hr class="my-4">

                        <h4 class="mb-3">Items in this Order</h4>
                        <div class="table-responsive">
                            <table class="table align-middle">
                                <thead>
                                    <tr>
                                        <th colspan="2">Product</th>
                                        <th class="text-center">Quantity</th>
                                        <th class="text-end">Price</th>
                                        <th class="text-end">Subtotal</th>
                                        <th class="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($order_items as $item): ?>
                                    <tr>
                                        <td style="width: 80px;">
                                            <img src="assets/uploads/<?= escape_html($item['Image']) ?>" class="img-fluid rounded" alt="<?= escape_html($item['ProductName']) ?>" onerror="this.src='assets/images/default.jpg';">
                                        </td>
                                        <td><?= escape_html($item['ProductName']) ?></td>
                                        <td class="text-center"><?= $item['quantity'] ?></td>
                                        <td class="text-end">₹<?= number_format($item['price'], 2) ?></td>
                                        <td class="text-end">₹<?= number_format($item['price'] * $item['quantity'], 2) ?></td>
                                        <td class="text-center">
                                            <a href="handle_order_action.php?action=return&id=<?= $order['id'] ?>" class="btn btn-sm btn-outline-secondary">Return/Replace</a>
                                        </td>
                                    </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>

                        <div class="text-center mt-4">
                            <a href="orders.php" class="btn btn-secondary">&larr; Back to My Orders</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <?php include '_footer.php'; ?>
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="assets/js/script.js"></script>
</body>
</html>
