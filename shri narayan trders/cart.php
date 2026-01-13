<?php
// Core setup, functions, and database connection
require_once 'functions.php';
require_once 'db.php';

// --- FETCH CART PRODUCTS ---
$cart_items = [];
$subtotal = 0;

if (!empty($_SESSION['cart'])) {
    // Get product IDs from the cart session
    $product_ids = array_keys($_SESSION['cart']);
    
    // Create placeholders for the IN clause (e.g., ?,?,?)
    $placeholders = implode(',', array_fill(0, count($product_ids), '?'));
    
    // Fetch product details from the database for all items in the cart
    $sql = "SELECT ProductId, ProductName, ProductPrice, UnitsInStock, Image FROM product WHERE ProductId IN ($placeholders)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($product_ids);
    $products_from_db = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $products = [];
    foreach ($products_from_db as $p) {
        $products[$p['ProductId']] = $p;
    }

    // Build the final cart items array with quantity and total price
    foreach ($_SESSION['cart'] as $product_id => $quantity) {
        if (isset($products[$product_id])) {
            $product = $products[$product_id];
            $total_price = $product['ProductPrice'] * $quantity;
            $subtotal += $total_price;
            
            $cart_items[] = [
                'id' => $product_id,
                'name' => $product['ProductName'],
                'price' => $product['ProductPrice'],
                'image' => $product['Image'],
                'quantity' => $quantity,
                'total' => $total_price,
                'stock' => $product['UnitsInStock']
            ];
        } else {
            // If a product in the cart doesn't exist in the DB, remove it from the session
            unset($_SESSION['cart'][$product_id]);
        }
    }
}
?>
<!DOCTYPE html>
<html lang="<?= escape_html($_SESSION['lang']) ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= L($LANG, 'shopping_cart') ?> - <?= L($LANG, 'site_name') ?></title>
    
    <!-- Dependencies -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>

    <!-- Header (simplified for this page) -->
    <?php include '_header.php'; ?>

    <!-- Main Content -->
    <main class="container my-5">
        <h1 class="mb-4"><?= L($LANG, 'shopping_cart') ?></h1>

        <div class="card shadow-sm">
            <div class="card-body">
                <?php if (empty($cart_items)): ?>
                    <div class="text-center p-5">
                        <i class="fas fa-shopping-cart fa-3x text-muted mb-3"></i>
                        <h3 class="text-muted"><?= L($LANG, 'cart_is_empty') ?></h3>
                        <a href="index.php" class="btn btn-primary mt-3"><?= L($LANG, 'continue_shopping') ?></a>
                    </div>
                <?php else: ?>
                    <div class="table-responsive">
                        <table class="table align-middle">
                            <thead>
                                <tr>
                                    <th scope="col" colspan="2"><?= L($LANG, 'product') ?></th>
                                    <th scope="col" class="text-end"><?= L($LANG, 'price') ?></th>
                                    <th scope="col" class="text-center"><?= L($LANG, 'quantity') ?></th>
                                    <th scope="col" class="text-end"><?= L($LANG, 'total') ?></th>
                                    <th scope="col" class="text-center"><?= L($LANG, 'remove') ?></th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($cart_items as $item): ?>
                                    <tr id="cart-item-<?= $item['id'] ?>">
                                        <td style="width: 100px;">
                                            <img src="assets/uploads/<?= escape_html($item['image']) ?>" class="img-fluid rounded" alt="<?= escape_html($item['name']) ?>" onerror="this.src='assets/images/default.jpg';">
                                        </td>
                                        <td><?= escape_html($item['name']) ?></td>
                                        <td class="text-end">₹<?= number_format($item['price'], 2) ?></td>
                                        <td class="text-center" style="width: 150px;">
                                            <div class="input-group">
                                                <button class="btn btn-outline-secondary btn-sm quantity-change" data-product-id="<?= $item['id'] ?>" data-change="-1">-</button>
                                                <input type="number" class="form-control text-center quantity-input" value="<?= $item['quantity'] ?>" min="1" max="<?= $item['stock'] ?>" data-product-id="<?= $item['id'] ?>">
                                                <button class="btn btn-outline-secondary btn-sm quantity-change" data-product-id="<?= $item['id'] ?>" data-change="1">+</button>
                                            </div>
                                        </td>
                                        <td class="text-end item-total">₹<?= number_format($item['total'], 2) ?></td>
                                        <td class="text-center">
                                            <button class="btn btn-danger btn-sm remove-item" data-product-id="<?= $item['id'] ?>">
                                                <i class="fas fa-trash-alt"></i>
                                            </button>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                    <hr>
                    <div class="d-flex justify-content-end align-items-center">
                        <div class="text-end">
                            <h4><?= L($LANG, 'subtotal') ?>: <span class="fw-bold" id="subtotal-amount">₹<?= number_format($subtotal, 2) ?></span></h4>
                            <a href="checkout.php" class="btn btn-primary mt-2"><?= L($LANG, 'proceed_to_checkout') ?></a>
                        </div>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </main>

        <?php include '_footer.php'; ?>

    <!-- JS Dependencies -->
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    
    <!-- Custom JS -->
    <script src="assets/js/script.js"></script>
</body>
</html>
