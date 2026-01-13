<?php
require_once 'functions.php';
require_once 'db.php';

$product_id = (int)($_GET['id'] ?? 0);

if ($product_id <= 0) {
    header("Location: index.php");
    exit;
}

// Fetch the main product details
$stmt = $pdo->prepare("SELECT * FROM product WHERE ProductId = :id");
$stmt->execute(['id' => $product_id]);
$product = $stmt->fetch();

// If product not found, redirect to home
if (!$product) {
    header("Location: index.php");
    exit;
}

// Fetch related products (from the same category, excluding the current one)
$related_stmt = $pdo->prepare("SELECT * FROM product WHERE ProductType = :type AND ProductId != :id ORDER BY RAND() LIMIT 4");
$related_stmt->execute(['type' => $product['ProductType'], 'id' => $product_id]);
$related_products = $related_stmt->fetchAll();


$page_title = $product['ProductName'];
?>
<!DOCTYPE html>
<html lang="<?= escape_html($_SESSION['lang']) ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= escape_html($page_title) ?> - <?= L($LANG, 'site_name') ?></title>
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>

    <?php include '_header.php'; ?>

    <main class="container my-5">
        <div class="card shadow-sm p-4">
            <div class="row g-5">
                <div class="col-md-6 position-relative">
                    <?php if(isset($_SESSION['customer_id'])): 
                        $wishlist_items = [];
                        $wishlist_stmt = $pdo->prepare("SELECT product_id FROM wishlist WHERE customer_id = :cid");
                        $wishlist_stmt->execute(['cid' => $_SESSION['customer_id']]);
                        $wishlist_items = $wishlist_stmt->fetchAll(PDO::FETCH_COLUMN);
                        $is_in_wishlist = in_array($product['ProductId'], $wishlist_items);
                    ?>
                        <button class="btn wishlist-btn-lg <?= $is_in_wishlist ? 'active' : '' ?>" data-product-id="<?= $product['ProductId'] ?>" title="<?= $is_in_wishlist ? L($LANG, 'added_to_wishlist') : L($LANG, 'my_wishlist') ?>">
                            <i class="<?= $is_in_wishlist ? 'fas' : 'far' ?> fa-heart"></i>
                        </button>
                    <?php endif; ?>
                    <img src="assets/uploads/<?= escape_html($product['Image']) ?>" class="img-fluid rounded" alt="<?= escape_html($product['ProductName']) ?>" onerror="this.src='assets/images/default.jpg';">
                </div>
                <div class="col-md-6">
                    <h1 class="display-5"><?= escape_html($product['ProductName']) ?></h1>
                    <?php
                    // Fetch average rating and total reviews
                    $review_stats_stmt = $pdo->prepare("SELECT AVG(rating) as avg_rating, COUNT(id) as total_reviews FROM reviews WHERE product_id = :pid");
                    $review_stats_stmt->execute(['pid' => $product_id]);
                    $review_stats = $review_stats_stmt->fetch();
                    $avg_rating = round($review_stats['avg_rating'], 1);
                    $total_reviews = $review_stats['total_reviews'];
                    ?>
                    <div class="mb-3">
                        <?php for ($i = 1; $i <= 5; $i++): ?>
                            <i class="fas fa-star <?= ($i <= $avg_rating) ? 'text-warning' : 'text-secondary' ?>"></i>
                        <?php endfor; ?>
                        <span class="ms-2 text-muted">(<?= escape_html($total_reviews) ?> Reviews)</span>
                    </div>

                    <p class="text-muted">Category: <a href="index.php?category=<?= urlencode($product['ProductType']) ?>"><?= escape_html($product['ProductType']) ?></a></p>
                    <h2 class="my-3">₹<?= number_format($product['ProductPrice'], 2) ?></h2>
                    
                    <div class="fs-5 mb-3">
                        <span class="badge <?= $product['UnitsInStock'] > 0 ? 'bg-success' : 'bg-danger' ?>">
                            <?= $product['UnitsInStock'] > 0 ? L($LANG, 'in_stock') : L($LANG, 'out_of_stock') ?>
                        </span>
                    </div>

                    <div class="description mb-4">
                        <h4>Product Details</h4>
                        <p><?= nl2br(escape_html($product['ProductDescription'] ?? 'No description available.')) ?></p>
                    </div>

                    <div class="d-grid">
                        <button class="btn btn-primary btn-lg add-to-cart-btn" data-product-id="<?= $product['ProductId'] ?>" <?= $product['UnitsInStock'] <= 0 ? 'disabled' : '' ?>>
                            <i class="fas fa-cart-plus"></i> <?= L($LANG, 'add_to_cart') ?>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <hr class="my-5">

        <!-- Customer Reviews Section -->
        <div class="row">
            <div class="col-12">
                <h2><?= L($LANG, 'customer_reviews') ?></h2>
                <?php
                // Fetch all reviews for this product
                $reviews_stmt = $pdo->prepare("
                    SELECT r.*, c.first_name, c.last_name 
                    FROM reviews r 
                    JOIN customers c ON r.customer_id = c.id 
                    WHERE r.product_id = :pid 
                    ORDER BY r.created_at DESC
                ");
                $reviews_stmt->execute(['pid' => $product_id]);
                $reviews = $reviews_stmt->fetchAll();

                if (empty($reviews)): ?>
                    <p>No reviews yet. Be the first to review this product!</p>
                <?php else: ?>
                    <?php foreach ($reviews as $review): ?>
                        <div class="card mb-3">
                            <div class="card-body">
                                <h5><?= escape_html($review['first_name'] . ' ' . $review['last_name']) ?></h5>
                                <?php for ($i = 1; $i <= 5; $i++): ?>
                                    <i class="fas fa-star <?= ($i <= $review['rating']) ? 'text-warning' : 'text-secondary' ?>"></i>
                                <?php endfor; ?>
                                <small class="text-muted ms-2"><?= date('d M, Y', strtotime($review['created_at'])) ?></small>
                                <p class="mt-2"><?= nl2br(escape_html($review['comment'])) ?></p>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
                
                <hr class="my-4">

                <!-- Review Submission Form -->
                <?php if (isset($_SESSION['customer_id'])):
                    $has_purchased = false;
                    $has_reviewed = false;
                    
                    // Check if customer has purchased this product
                    $purchase_stmt = $pdo->prepare("SELECT COUNT(oi.id) FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE o.customer_id = :cid AND oi.product_id = :pid");
                    $purchase_stmt->execute(['cid' => $_SESSION['customer_id'], 'pid' => $product_id]);
                    if ($purchase_stmt->fetchColumn() > 0) {
                        $has_purchased = true;
                    }

                    // Check if customer has already reviewed this product
                    $reviewed_stmt = $pdo->prepare("SELECT COUNT(id) FROM reviews WHERE customer_id = :cid AND product_id = :pid");
                    $reviewed_stmt->execute(['cid' => $_SESSION['customer_id'], 'pid' => $product_id]);
                    if ($reviewed_stmt->fetchColumn() > 0) {
                        $has_reviewed = true;
                    }
                ?>
                    <?php if ($has_purchased && !$has_reviewed): ?>
                        <h4><?= L($LANG, 'your_review') ?></h4>
                        <form action="submit_review.php" method="POST">
                            <input type="hidden" name="csrf_token" value="<?= escape_html($_SESSION['csrf_token']) ?>">
                            <input type="hidden" name="product_id" value="<?= $product['ProductId'] ?>">
                            <div class="mb-3">
                                <label class="form-label"><?= L($LANG, 'rate_product') ?></label>
                                <div>
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="rating" id="rating5" value="5" required>
                                        <label class="form-check-label" for="rating5">5 <i class="fas fa-star text-warning"></i></label>
                                    </div>
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="rating" id="rating4" value="4">
                                        <label class="form-check-label" for="rating4">4 <i class="fas fa-star text-warning"></i></label>
                                    </div>
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="rating" id="rating3" value="3">
                                        <label class="form-check-label" for="rating3">3 <i class="fas fa-star text-warning"></i></label>
                                    </div>
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="rating" id="rating2" value="2">
                                        <label class="form-check-label" for="rating2">2 <i class="fas fa-star text-warning"></i></label>
                                    </div>
                                    <div class="form-check form-check-inline">
                                        <input class="form-check-input" type="radio" name="rating" id="rating1" value="1">
                                        <label class="form-check-label" for="rating1">1 <i class="fas fa-star text-warning"></i></label>
                                    </div>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="comment" class="form-label">Comment</label>
                                <textarea class="form-control" id="comment" name="comment" rows="3"></textarea>
                            </div>
                            <button type="submit" class="btn btn-primary"><?= L($LANG, 'submit_review') ?></button>
                        </form>
                    <?php elseif ($has_reviewed): ?>
                        <div class="alert alert-info">
                            <p class="mb-0"><?= L($LANG, 'review_already_submitted') ?></p>
                        </div>
                    <?php elseif (!$has_purchased): ?>
                        <div class="alert alert-warning">
                            <p class="mb-0"><?= L($LANG, 'must_purchase_to_review') ?></p>
                        </div>
                    <?php endif; ?>
                <?php else: ?>
                    <div class="alert alert-info">
                        <p class="mb-0"><a href="login.php">Log in</a> to submit a review.</p>
                    </div>
                <?php endif; ?>
            </div>
        </div>

        <!-- Related Products -->
        <?php if (!empty($related_products)): ?>
            <hr class="my-5">
            <h2 class="mb-4">Related Products</h2>
            <div class="row">
                <?php foreach ($related_products as $related_product): ?>
                    <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
                        <div class="card h-100 product-card">
                             <a href="product-details.php?id=<?= $related_product['ProductId'] ?>">
                                <img src="assets/uploads/<?= escape_html($related_product['Image']) ?>" class="card-img-top" alt="<?= escape_html($related_product['ProductName']) ?>" onerror="this.src='assets/images/default.jpg';">
                            </a>
                            <div class="card-body d-flex flex-column">
                                <h5 class="card-title">
                                    <a href="product-details.php?id=<?= $related_product['ProductId'] ?>" class="text-dark text-decoration-none"><?= escape_html($related_product['ProductName']) ?></a>
                                </h5>
                                <h6 class="card-subtitle mt-auto fw-bold">₹<?= number_format($related_product['ProductPrice'], 2) ?></h6>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </main>

    <?php include '_footer.php'; ?>
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="assets/js/script.js"></script>
</body>
</html>
