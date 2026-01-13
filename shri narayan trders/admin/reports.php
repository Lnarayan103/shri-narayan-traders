<?php
require_once '_check_login.php';
require_once '../db.php';
require_once '../functions.php';

$order_id = (int)($_GET['order_id'] ?? 0);

if ($order_id <= 0) {
    // If no order is specified, maybe show a list of recent orders to generate reports for.
    // For now, we'll just show a message.
    $page_title = "Reports";
    $show_selection = true;
    
    $recent_orders_stmt = $pdo->query("SELECT id, order_number, order_date FROM orders ORDER BY order_date DESC LIMIT 20");
    $recent_orders = $recent_orders_stmt->fetchAll();

} else {
    $show_selection = false;
    // Fetch all details for a specific invoice
    $sql = "SELECT 
                o.*, 
                c.first_name, c.last_name, c.email, c.phone
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            WHERE o.id = :order_id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':order_id' => $order_id]);
    $order = $stmt->fetch();

    if (!$order) {
        die("Order not found.");
    }
    
    // Fetch order items
    $items_sql = "SELECT oi.quantity, oi.price, p.ProductName 
                  FROM order_items oi
                  JOIN product p ON oi.product_id = p.ProductId
                  WHERE oi.order_id = :order_id";
    $items_stmt = $pdo->prepare($items_sql);
    $items_stmt->execute([':order_id' => $order_id]);
    $order_items = $items_stmt->fetchAll();

    $page_title = "Invoice #" . escape_html($order['order_number']);
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <?php include '_header_includes.php'; ?>
    <style>
        .invoice-box {
            max-width: 800px;
            margin: auto;
            padding: 30px;
            border: 1px solid #eee;
            box-shadow: 0 0 10px rgba(0, 0, 0, .15);
            font-size: 16px;
            line-height: 24px;
            font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif;
            color: #555;
        }
        .invoice-box table { width: 100%; line-height: inherit; text-align: left; }
        .invoice-box table td { padding: 5px; vertical-align: top; }
        .invoice-box table tr td:nth-child(2) { text-align: right; }
        .invoice-box table tr.top table td { padding-bottom: 20px; }
        .invoice-box table tr.top table td.title { font-size: 45px; line-height: 45px; color: #333; }
        .invoice-box table tr.information table td { padding-bottom: 40px; }
        .invoice-box table tr.heading td { background: #eee; border-bottom: 1px solid #ddd; font-weight: bold; }
        .invoice-box table tr.details td { padding-bottom: 20px; }
        .invoice-box table tr.item td{ border-bottom: 1px solid #eee; }
        .invoice-box table tr.item.last td { border-bottom: none; }
        .invoice-box table tr.total td:nth-child(2) { border-top: 2px solid #eee; font-weight: bold; }
        @media print {
            body, .invoice-box { background: #fff !important; }
            .sb-nav-fixed, .no-print { display: none !important; }
            .invoice-box { box-shadow: none; border: none; margin: 0; padding: 0; }
        }
    </style>
</head>
<body class="sb-nav-fixed">
    <?php include '_navbar.php'; ?>
    <div id="layoutSidenav">
        <?php include '_sidebar.php'; ?>
        <div id="layoutSidenav_content">
            <main>
                <div class="container-fluid px-4">
                    <h1 class="mt-4 no-print"><?= $page_title ?></h1>
                    <ol class="breadcrumb mb-4 no-print">
                        <li class="breadcrumb-item"><a href="dashboard.php">Dashboard</a></li>
                        <li class="breadcrumb-item active">Reports</li>
                    </ol>

                    <?php if($show_selection): ?>
                        <div class="card">
                            <div class="card-header">Generate Invoice</div>
                            <div class="card-body">
                                <p>Select an order to generate an invoice for:</p>
                                <ul class="list-group">
                                <?php foreach($recent_orders as $ro): ?>
                                    <li class="list-group-item">
                                        <a href="?order_id=<?= $ro['id'] ?>">
                                            Invoice for Order #<?= escape_html($ro['order_number']) ?> 
                                            (<?= date('d M Y', strtotime($ro['order_date'])) ?>)
                                        </a>
                                    </li>
                                <?php endforeach; ?>
                                </ul>
                            </div>
                        </div>
                    <?php else: ?>
                        <div class="text-end mb-3 no-print">
                            <button onclick="window.print()" class="btn btn-primary"><i class="fas fa-print"></i> Print Invoice</button>
                        </div>
                        <div class="invoice-box bg-white">
                            <table>
                                <tr class="top">
                                    <td colspan="2">
                                        <table>
                                            <tr>
                                                <td class="title">Shri Narayan Traders</td>
                                                <td>
                                                    Invoice #: <?= escape_html($order['order_number']) ?><br>
                                                    Created: <?= date('F d, Y', strtotime($order['order_date'])) ?><br>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr class="information">
                                    <td colspan="2">
                                        <table>
                                            <tr>
                                                <td>
                                                    Shri Narayan Traders, Inc.<br>
                                                    IGNOU, Maidan Garhi<br>
                                                    New Delhi, India
                                                </td>
                                                <td>
                                                    <?= escape_html($order['first_name'] . ' ' . $order['last_name']) ?><br>
                                                    <?= escape_html($order['phone']) ?><br>
                                                    <?= escape_html($order['email']) ?>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr class="heading"><td>Shipping Address</td><td></td></tr>
                                <tr class="details"><td><?= nl2br(escape_html($order['shipping_address'])) ?></td><td></td></tr>
                                <tr class="heading"><td>Item</td><td>Price</td></tr>
                                <?php foreach($order_items as $item): ?>
                                    <tr class="item">
                                        <td><?= escape_html($item['ProductName']) ?> (x<?= $item['quantity'] ?>)</td>
                                        <td>₹<?= number_format($item['price'] * $item['quantity'], 2) ?></td>
                                    </tr>
                                <?php endforeach; ?>
                                <tr class="total">
                                    <td></td>
                                    <td>Total: ₹<?= number_format($order['total_amount'], 2) ?></td>
                                </tr>
                            </table>
                        </div>
                    <?php endif; ?>
                </div>
            </main>
            <?php include '_footer.php'; ?>
        </div>
    </div>
    <?php include '_footer_includes.php'; ?>
</body>
</html>
