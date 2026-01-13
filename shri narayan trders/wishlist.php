<?php
require_once 'functions.php';
require_once 'db.php';

// Redirect if not logged in
if (!isset($_SESSION['customer_id'])) {
    header('Location: login.php');
    exit;
}

$customer_id = $_SESSION['customer_id'];

// Fetch wishlist items
$stmt = $pdo->prepare("
    SELECT p.ProductId, p.ProductName, p.ProductPrice, p.Image, p.UnitsInStock, p.ProductType
    FROM wishlist w
    JOIN product p ON w.product_id = p.ProductId
    WHERE w.customer_id = :customer_id
    ORDER BY p.ProductName ASC
");
$stmt->execute(['customer_id' => $customer_id]);
$wishlist_products = $stmt->fetchAll();

$page_title = L($LANG, 'my_wishlist');
?>
<!DOCTYPE html>
<html lang="<?= escape_html($_SESSION['lang']) ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $page_title ?> - <?= L($LANG, 'site_name') ?></title>
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>

    <?php include '_header.php'; ?>

    <main class="container my-5">
        <h1 class="mb-4 text-center"><?= $page_title ?></h1>

        <div class="row">
            <?php if (empty($wishlist_products)): ?>
                <div class="col-12 text-center">
                    <div class="alert alert-info">
                        <i class="fas fa-heart-broken fa-3x mb-3"></i>
                        <p class="lead">Your wishlist is empty. Start adding some products!</p>
                        <a href="index.php" class="btn btn-primary mt-3">Continue Shopping</a>
                    </div>
                </div>
            <?php else: ?>
                <?php foreach ($wishlist_products as $product): ?>
                    <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
                        <div class="card h-100 product-card">
                            <?php if(isset($_SESSION['customer_id'])): 
                                $is_in_wishlist = true; // Always true for wishlist page
                            ?>
                                <button class="btn wishlist-btn active" data-product-id="<?= $product['ProductId'] ?>" title="<?= L($LANG, 'removed_from_wishlist') ?>">
                                    <i class="fas fa-heart"></i>
                                </button>
                            <?php endif; ?>
                            <a href="product-details.php?id=<?= $product['ProductId'] ?>">
                                <img src="assets/uploads/<?= escape_html($product['Image']) ?>" class="card-img-top" alt="<?= escape_html($product['ProductName']) ?>" onerror="this.src='assets/images/default.jpg';">
                            </a>
                            <div class="card-body d-flex flex-column">
                                <h5 class="card-title">
                                    <a href="product-details.php?id=<?= $product['ProductId'] ?>" class="text-dark text-decoration-none"><?= escape_html($product['ProductName']) ?></a>
                                </h5>
                                <p class="card-text text-muted"><?= escape_html($product['ProductType']) ?></p>
                                <h6 class="card-subtitle mb-2 fw-bold">₹<?= escape_html(number_format($product['ProductPrice'], 2)) ?></h6>
                                <p class="card-text"><small class="text-muted"><?= escape_html($product['UnitsInStock']) > 0 ? L($LANG, 'in_stock') : L($LANG, 'out_of_stock') ?></small></p>
                                <div class="mt-auto">
                                    <button class="btn btn-primary w-100 add-to-cart-btn" data-product-id="<?= $product['ProductId'] ?>" <?= $product['UnitsInStock'] <= 0 ? 'disabled' : '' ?>>
                                        <i class="fas fa-cart-plus"></i> <?= L($LANG, 'add_to_cart') ?>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>
    </main>

    <?php include '_footer.php'; ?>
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="assets/js/script.js"></script>
</body>
</html>
