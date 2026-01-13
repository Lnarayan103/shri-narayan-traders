<?php
// Core setup and functions
require_once 'functions.php';

// --- DATA FETCHING ---
// Database connection
require_once 'db.php';

// Pagination settings
$products_per_page = 9; // Adjusted for 3-column layout
$current_page = isset($_GET['page']) && is_numeric($_GET['page']) ? (int)$_GET['page'] : 1;
$offset = ($current_page - 1) * $products_per_page;

// Search and filter logic
$search_term = $_GET['search'] ?? '';
$category = $_GET['category'] ?? '';
$min_price = filter_var($_GET['min_price'] ?? null, FILTER_VALIDATE_FLOAT);
$max_price = filter_var($_GET['max_price'] ?? null, FILTER_VALIDATE_FLOAT);

$params = [];
$count_params = [];

// Base query
$sql = "SELECT * FROM product WHERE 1=1";
$count_sql = "SELECT COUNT(*) FROM product WHERE 1=1";

if (!empty($search_term)) {
    $sql .= " AND ProductName LIKE :search_term";
    $count_sql .= " AND ProductName LIKE :search_term";
    $params[':search_term'] = '%' . $search_term . '%';
    $count_params[':search_term'] = '%' . $search_term . '%';
}

if (!empty($category)) {
    $sql .= " AND ProductType = :category";
    $count_sql .= " AND ProductType = :category";
    $params[':category'] = $category;
    $count_params[':category'] = $category;
}

if ($min_price !== false && $min_price !== null) {
    $sql .= " AND ProductPrice >= :min_price";
    $count_sql .= " AND ProductPrice >= :min_price";
    $params[':min_price'] = $min_price;
    $count_params[':min_price'] = $min_price;
}

if ($max_price !== false && $max_price !== null) {
    $sql .= " AND ProductPrice <= :max_price";
    $count_sql .= " AND ProductPrice <= :max_price";
    $params[':max_price'] = $max_price;
    $count_params[':max_price'] = $max_price;
}

// Get total number of products for pagination
$count_stmt = $pdo->prepare($count_sql);
$count_stmt->execute($count_params);
$total_products = $count_stmt->fetchColumn();
$total_pages = ceil($total_products / $products_per_page);

// Add limit and offset for pagination
$sql .= " ORDER BY ProductId DESC LIMIT :limit OFFSET :offset";
$params[':limit'] = $products_per_page;
$params[':offset'] = $offset;

// Fetch products for the current page
$stmt = $pdo->prepare($sql);
// Bind all params, converting types for limit and offset
foreach($params as $key => &$val) {
    $type = is_int($val) ? PDO::PARAM_INT : PDO::PARAM_STR;
    if ($key == ':limit' || $key == ':offset') {
        $type = PDO::PARAM_INT;
    }
    $stmt->bindParam($key, $val, $type);
}
$stmt->execute();
$products = $stmt->fetchAll();

// Fetch all unique categories for the filter dropdown
$categories_stmt = $pdo->query("SELECT DISTINCT ProductType FROM product ORDER BY ProductType ASC");
$categories = $categories_stmt->fetchAll();

// Fetch user's wishlist if logged in
$wishlist_items = [];
if (isset($_SESSION['customer_id'])) {
    $wishlist_stmt = $pdo->prepare("SELECT product_id FROM wishlist WHERE customer_id = :cid");
    $wishlist_stmt->execute(['cid' => $_SESSION['customer_id']]);
    $wishlist_items = $wishlist_stmt->fetchAll(PDO::FETCH_COLUMN); // Fetches a 1D array of product_ids
}

?>
<!DOCTYPE html>
<html lang="<?= escape_html($_SESSION['lang']) ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= L($LANG, 'site_name') ?> - <?= L($LANG, 'home') ?></title>
    
    <!-- Bootstrap 5 CDN -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    
    <!-- FontAwesome CDN -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    
    <!-- Google Fonts (Noto Sans for Hindi) -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500;700&display=swap" rel="stylesheet">
    
    <!-- Custom CSS -->
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>

    <!-- Header -->
    <?php include '_header.php'; ?>

    <!-- Hero Section -->
    <div class="hero-section">
        <div class="container">
            <h1 class="display-4">The Foundation of Luxury</h1>
            <p class="lead">Discover premium quality marble and granite that define elegance.</p>
            <a href="#products" class="btn btn-primary btn-lg">Explore Our Collection</a>
        </div>
    </div>

    <!-- Main Content -->
    <main class="container my-4" id="products">
        <div class="row">
            <!-- Filters Sidebar -->
            <aside class="col-lg-3">
                <div class="card mb-4 shadow-sm">
                    <div class="card-header" style="background-color: var(--primary-color); color: white;">
                        <h5 class="mb-0"><i class="fas fa-filter me-2"></i>Filters</h5>
                    </div>
                    <div class="card-body">
                        <form action="index.php" method="GET">
                            <!-- Hidden fields to preserve search and category from header -->
                            <input type="hidden" name="search" value="<?= escape_html($search_term) ?>">
                            <input type="hidden" name="category" value="<?= escape_html($category) ?>">

                            <h6 class="mb-3">Price Range</h6>
                            <div class="input-group">
                                <span class="input-group-text">₹</span>
                                <input type="number" class="form-control" name="min_price" placeholder="Min" value="<?= escape_html($_GET['min_price'] ?? '') ?>">
                                <span class="input-group-text">-</span>
                                <input type="number" class="form-control" name="max_price" placeholder="Max" value="<?= escape_html($_GET['max_price'] ?? '') ?>">
                            </div>
                            <div class="d-grid">
                                <button type="submit" class="btn btn-secondary w-100 mt-3">Apply Price Filter</button>
                            </div>
                        </form>
                    </div>
                </div>
            </aside>

            <!-- Products -->
            <div class="col-lg-9">
                <div class="row">
                    <?php if (empty($products)): ?>
                        <div class="col-12">
                            <div class="alert alert-warning text-center">
                                <h3>No products found.</h3>
                                <p>Try adjusting your search or filter criteria.</p>
                            </div>
                        </div>
                    <?php else: ?>
                        <?php foreach ($products as $product): ?>
                            <div class="col-lg-4 col-md-6 mb-4">
                                <div class="card h-100 product-card">
                                    <?php if(isset($_SESSION['customer_id'])): 
                                        $is_in_wishlist = in_array($product['ProductId'], $wishlist_items);
                                    ?>
                                        <button class="btn wishlist-btn <?= $is_in_wishlist ? 'active' : '' ?>" data-product-id="<?= $product['ProductId'] ?>" title="<?= $is_in_wishlist ? L($LANG, 'added_to_wishlist') : L($LANG, 'my_wishlist') ?>">
                                            <i class="<?= $is_in_wishlist ? 'fas' : 'far' ?> fa-heart"></i>
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

                <!-- Pagination -->
                <?php if ($total_pages > 1): ?>
                    <nav aria-label="Page navigation" class="mt-3">
                        <ul class="pagination justify-content-center">
                            <?php 
                            // Rebuild query params for pagination links
                            $query_params = http_build_query(array_filter([
                                'search' => $search_term, 
                                'category' => $category, 
                                'min_price' => $min_price, 
                                'max_price' => $max_price
                            ]));
                            for ($i = 1; $i <= $total_pages; $i++): ?>
                                <li class="page-item <?= $i == $current_page ? 'active' : '' ?>">
                                    <a class="page-link" href="?page=<?= $i ?>&<?= $query_params ?>"><?= $i ?></a>
                                </li>
                            <?php endfor; ?>
                        </ul>
                    </nav>
                <?php endif; ?>

            </div>
        </div>
    </main>

    <?php include '_footer.php'; ?>

    <!-- jQuery CDN -->
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>

    <!-- Bootstrap JS Bundle -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    
    <!-- Custom JS -->
    <script src="assets/js/script.js"></script>
</body>
</html>