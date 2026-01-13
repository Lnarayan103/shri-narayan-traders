<?php
/**
 * Shri Narayan Traders - Reusable Header Component
 *
 * This file contains the full header, including the top navbar and the search/filter bar.
 * It's included on pages like index.php, cart.php, etc.
 *
 * It requires the $LANG variable (from functions.php) and $pdo (from db.php) to be available.
 */

// Fetch categories for the filter dropdown if they aren't already fetched
if (!isset($categories)) {
    $categories_stmt = $pdo->query("SELECT DISTINCT ProductType FROM product ORDER BY ProductType ASC");
    $categories = $categories_stmt->fetchAll();
}

// Get current search and category for populating the form
$current_search = $_GET['search'] ?? '';
$current_category = $_GET['category'] ?? '';

?>
<header class="bg-light shadow-sm">
    <nav class="navbar navbar-expand-lg navbar-light">
        <div class="container">
            <a class="navbar-brand" href="index.php">
                <img src="<?= BASE_URL ?>assets/images/img.jpg" alt="<?= L($LANG, 'site_name') ?>" class="header-logo">
            </a>
            
            <div class="d-flex align-items-center">
                <!-- Language Switcher -->
                <div class="dropdown me-3">
                    <button class="btn btn-outline-secondary dropdown-toggle" type="button" id="languageDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                        <?= $_SESSION['lang'] == 'hi' ? L($LANG, 'lang_switcher_hi') : L($LANG, 'lang_switcher_en') ?>
                    </button>
                    <ul class="dropdown-menu" aria-labelledby="languageDropdown">
                        <li><a class="dropdown-item" href="?lang=en"><?= L($LANG, 'lang_switcher_en') ?></a></li>
                        <li><a class="dropdown-item" href="?lang=hi"><?= L($LANG, 'lang_switcher_hi') ?></a></li>
                    </ul>
                </div>
                
                <!-- Cart Icon -->
                <a href="cart.php" class="btn btn-primary position-relative me-3">
                    <i class="fas fa-shopping-cart"></i>
                    <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger cart-count">0</span>
                </a>
                
                 <!-- User/Login -->
                <?php if (isset($_SESSION['customer_id'])): // This session will be set on login ?>
                    <div class="dropdown">
                        <button class="btn btn-outline-primary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="true">
                            <i class="fas fa-user"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><a class="dropdown-item" href="profile.php">My Profile</a></li>
                            <li><a class="dropdown-item" href="wishlist.php"><?= L($LANG, 'my_wishlist') ?></a></li>
                            <li><a class="dropdown-item" href="orders.php">My Orders</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item" href="logout.php"><?= L($LANG, 'logout') ?></a></li>
                        </ul>
                    </div>
                <?php else: ?>
                    <a href="login.php" class="btn btn-outline-primary"><?= L($LANG, 'login') ?></a>
                <?php endif; ?>
            </div>
        </div>
    </nav>
    
    <!-- Search and Filter Bar -->
    <div class="container my-3">
        <form action="index.php" method="GET">
            <div class="input-group">
                <select class="form-select flex-grow-0" style="width: 150px;" name="category">
                    <option value=""><?= L($LANG, 'all_categories') ?></option>
                    <?php foreach($categories as $cat): ?>
                        <option value="<?= escape_html($cat['ProductType']) ?>" <?= $current_category == $cat['ProductType'] ? 'selected' : '' ?>>
                            <?= escape_html($cat['ProductType']) ?>
                        </option>
                    <?php endforeach; ?>
                </select>
                <input type="text" class="form-control" name="search" placeholder="<?= L($LANG, 'search_placeholder') ?>" value="<?= escape_html($current_search) ?>">
                <button class="btn btn-primary" type="submit">
                    <i class="fas fa-search"></i> <?= L($LANG, 'search_button') ?>
                </button>
            </div>
        </form>
    </div>
</header>
