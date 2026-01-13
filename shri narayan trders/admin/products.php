<?php
require_once '_check_login.php';
require_once '../db.php';
require_once '../functions.php'; // For L() and escape_html()

// Fetch all products from the database
$stmt = $pdo->query("SELECT * FROM product ORDER BY ProductId DESC");
$products = $stmt->fetchAll();

$page_title = "Manage Products";
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <?php include '_header_includes.php'; ?>
    <!-- DataTables CSS for better tables -->
    <link href="https://cdn.datatables.net/1.13.6/css/dataTables.bootstrap5.min.css" rel="stylesheet">
</head>
<body class="sb-nav-fixed">
    <?php include '_navbar.php'; ?>
    <div id="layoutSidenav">
        <?php include '_sidebar.php'; ?>
        <div id="layoutSidenav_content">
            <main>
                <div class="container-fluid px-4">
                    <h1 class="mt-4"><?= $page_title ?></h1>
                    <ol class="breadcrumb mb-4">
                        <li class="breadcrumb-item"><a href="dashboard.php">Dashboard</a></li>
                        <li class="breadcrumb-item active">Products</li>
                    </ol>
                    
                    <div class="text-end mb-3">
                        <a href="add_product.php" class="btn btn-primary">
                            <i class="fas fa-plus"></i> Add New Product
                        </a>
                    </div>

                    <div class="card mb-4">
                        <div class="card-header">
                            <i class="fas fa-table me-1"></i>
                            All Products
                        </div>
                        <div class="card-body">
                            <?php if (isset($_GET['success'])): ?>
                                <div class="alert alert-success alert-dismissible fade show" role="alert">
                                    <?= escape_html($_GET['success']) ?>
                                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                                </div>
                            <?php endif; ?>
                            <div class="table-responsive">
                                <table id="productsTable" class="table table-bordered table-striped">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Image</th>
                                            <th>Product Name</th>
                                            <th>Type</th>
                                            <th>Price</th>
                                            <th>Stock</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php foreach($products as $product): ?>
                                            <tr>
                                                <td><?= escape_html($product['ProductId']) ?></td>
                                                <td>
                                                    <img src="../assets/uploads/<?= escape_html($product['Image']) ?>" alt="<?= escape_html($product['ProductName']) ?>" width="50" onerror="this.src='../assets/images/default.jpg';">
                                                </td>
                                                <td><?= escape_html($product['ProductName']) ?></td>
                                                <td><?= escape_html($product['ProductType']) ?></td>
                                                <td>₹<?= number_format($product['ProductPrice'], 2) ?></td>
                                                <td><?= escape_html($product['UnitsInStock']) ?></td>
                                                <td>
                                                    <a href="edit_product.php?id=<?= $product['ProductId'] ?>" class="btn btn-sm btn-warning me-2" title="Edit">
                                                        <i class="fas fa-edit"></i>
                                                    </a>
                                                    <a href="delete_product.php?id=<?= $product['ProductId'] ?>" class="btn btn-sm btn-danger" title="Delete" onclick="return confirm('Are you sure you want to delete this product?');">
                                                        <i class="fas fa-trash-alt"></i>
                                                    </a>
                                                </td>
                                            </tr>
                                        <?php endforeach; ?>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
            <?php include '_footer.php'; ?>
        </div>
    </div>
    <?php include '_footer_includes.php'; ?>
    <!-- DataTables JS for better tables -->
    <script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.6/js/dataTables.bootstrap5.min.js"></script>
    <script>
        $(document).ready(function() {
            $('#productsTable').DataTable({
                "order": [[ 0, "desc" ]] // Order by ID descending by default
            });
        });
    </script>
</body>
</html>
