<?php
/**
 * Shri Narayan Traders - Admin Sidebar
 *
 * This file contains the side navigation menu for the admin panel.
 */

// Get the current script name to set the 'active' class on the correct link
$current_page = basename($_SERVER['PHP_SELF']);
?>
<div id="layoutSidenav_nav">
    <nav class="sb-sidenav accordion sb-sidenav-dark" id="sidenavAccordion">
        <div class="sb-sidenav-menu">
            <div class="nav">
                <div class="sb-sidenav-menu-heading">Core</div>
                <a class="nav-link <?= ($current_page == 'dashboard.php') ? 'active' : '' ?>" href="dashboard.php">
                    <div class="sb-nav-link-icon"><i class="fas fa-tachometer-alt"></i></div>
                    Dashboard
                </a>
                
                <div class="sb-sidenav-menu-heading">Management</div>
                
                <a class="nav-link <?= ($current_page == 'products.php' || $current_page == 'add_product.php' || $current_page == 'edit_product.php') ? 'active' : '' ?>" href="products.php">
                    <div class="sb-nav-link-icon"><i class="fas fa-box"></i></div>
                    Products
                </a>

                <a class="nav-link <?= ($current_page == 'orders.php') ? 'active' : '' ?>" href="orders.php">
                    <div class="sb-nav-link-icon"><i class="fas fa-shopping-cart"></i></div>
                    Orders
                </a>
                
                <a class="nav-link <?= ($current_page == 'customers.php') ? 'active' : '' ?>" href="customers.php">
                    <div class="sb-nav-link-icon"><i class="fas fa-users"></i></div>
                    Customers
                </a>
                
                <a class="nav-link <?= ($current_page == 'reports.php') ? 'active' : '' ?>" href="reports.php">
                    <div class="sb-nav-link-icon"><i class="fas fa-chart-bar"></i></div>
                    Reports
                </a>

                <div class="sb-sidenav-menu-heading">Site</div>
                <a class="nav-link" href="../index.php" target="_blank">
                    <div class="sb-nav-link-icon"><i class="fas fa-external-link-alt"></i></div>
                    View Live Site
                </a>

            </div>
        </div>
        <div class="sb-sidenav-footer">
            <div class="small">Logged in as:</div>
            Admin User
        </div>
    </nav>
</div>
