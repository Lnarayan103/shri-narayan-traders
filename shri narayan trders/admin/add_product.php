<?php
require_once '_check_login.php';
require_once '../db.php';
require_once '../functions.php';

$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Basic validation
    $product_name = trim($_POST['product_name'] ?? '');
    $product_type = trim($_POST['product_type'] ?? '');
    $product_price = filter_var($_POST['product_price'], FILTER_VALIDATE_FLOAT);
    $units_in_stock = filter_var($_POST['units_in_stock'], FILTER_VALIDATE_INT);
    $quantity_desc = trim($_POST['quantity_desc'] ?? '1 piece');
    $product_description = trim($_POST['product_description'] ?? '');

    if (empty($product_name) || empty($product_type) || $product_price === false || $units_in_stock === false) {
        $errors[] = "All fields are required and must be in the correct format.";
    }

    // Image upload handling
    $image_name = 'default.jpg';
    if (isset($_FILES['product_image']) && $_FILES['product_image']['error'] == 0) {
        $target_dir = "../assets/uploads/";
        $image_name = time() . '_' . basename($_FILES["product_image"]["name"]);
        $target_file = $target_dir . $image_name;
        $imageFileType = strtolower(pathinfo($target_file, PATHINFO_EXTENSION));

        // Check if image file is a actual image or fake image
        if(getimagesize($_FILES["product_image"]["tmp_name"]) === false) {
            $errors[] = "File is not an image.";
        }
        // Check file size (e.g., max 10MB)
        if ($_FILES["product_image"]["size"] > 10000000) {
            $errors[] = "Sorry, your file is too large (Max 10MB).";
        }
        // Allow certain file formats
        if($imageFileType != "jpg" && $imageFileType != "png" && $imageFileType != "jpeg" && $imageFileType != "gif" ) {
            $errors[] = "Sorry, only JPG, JPEG, PNG & GIF files are allowed.";
        }

        if (empty($errors)) {
            if (!move_uploaded_file($_FILES["product_image"]["tmp_name"], $target_file)) {
                $errors[] = "Sorry, there was an error uploading your file.";
            }
        }
    }

    // If no errors, insert into database
    if (empty($errors)) {
        $sql = "INSERT INTO product (ProductName, ProductType, ProductPrice, ProductDescription, Quantity, UnitsInStock, Image) 
                VALUES (:name, :type, :price, :description, :quantity_desc, :stock, :image)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':name' => $product_name,
            ':type' => $product_type,
            ':price' => $product_price,
            ':description' => $product_description,
            ':quantity_desc' => $quantity_desc,
            ':stock' => $units_in_stock,
            ':image' => $image_name
        ]);

        header("Location: products.php?success=Product added successfully!");
        exit;
    }
}


$page_title = "Add New Product";
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <?php include '_header_includes.php'; ?>
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
                        <li class="breadcrumb-item"><a href="products.php">Products</a></li>
                        <li class="breadcrumb-item active">Add Product</li>
                    </ol>

                    <div class="card mb-4">
                        <div class="card-header">
                            <i class="fas fa-plus-circle me-1"></i>
                            Product Details
                        </div>
                        <div class="card-body">
                            <?php if (!empty($errors)): ?>
                                <div class="alert alert-danger">
                                    <?php foreach ($errors as $error): ?><p class="mb-0"><?= $error ?></p><?php endforeach; ?>
                                </div>
                            <?php endif; ?>

                            <form action="add_product.php" method="POST" enctype="multipart/form-data">
                                <div class="row">
                                    <div class="col-md-8">
                                        <div class="mb-3">
                                            <label for="product_name" class="form-label">Product Name</label>
                                            <input type="text" class="form-control" id="product_name" name="product_name" required>
                                        </div>
                                        <div class="row">
                                            <div class="col-md-6 mb-3">
                                                <label for="product_type" class="form-label">Product Type (Category)</label>
                                                <input type="text" class="form-control" id="product_type" name="product_type" required>
                                            </div>
                                            <div class="col-md-6 mb-3">
                                                <label for="product_price" class="form-label">Price</label>
                                                <input type="number" step="0.01" class="form-control" id="product_price" name="product_price" required>
                                            </div>
                                        </div>
                                        <div class="row">
                                            <div class="col-md-6 mb-3">
                                                <label for="units_in_stock" class="form-label">Units In Stock</label>
                                                <input type="number" class="form-control" id="units_in_stock" name="units_in_stock" required>
                                            </div>
                                            <div class="col-md-6 mb-3">
                                                <label for="quantity_desc" class="form-label">Quantity Description</label>
                                                <input type="text" class="form-control" id="quantity_desc" name="quantity_desc" placeholder="e.g., per sq. ft., per slab">
                                            </div>
                                        </div>
                                        <div class="mb-3">
                                            <label for="product_description" class="form-label">Product Description</label>
                                            <textarea class="form-control" id="product_description" name="product_description" rows="3"></textarea>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <label for="product_image" class="form-label">Product Image</label>
                                            <input class="form-control" type="file" id="product_image" name="product_image" onchange="previewImage(event)">
                                        </div>
                                        <div class="text-center">
                                            <img id="imagePreview" src="../assets/images/default.jpg" alt="Image Preview" class="img-thumbnail" style="max-height: 200px;">
                                        </div>
                                    </div>
                                </div>
                                <hr>
                                <button type="submit" class="btn btn-primary">Save Product</button>
                                <a href="products.php" class="btn btn-secondary">Cancel</a>
                            </form>
                        </div>
                    </div>
                </div>
            </main>
            <?php include '_footer.php'; ?>
        </div>
    </div>
    <?php include '_footer_includes.php'; ?>
    <script>
        // Live image preview
        function previewImage(event) {
            const reader = new FileReader();
            reader.onload = function(){
                const output = document.getElementById('imagePreview');
                output.src = reader.result;
            };
            reader.readAsDataURL(event.target.files[0]);
        }
    </script>
</body>
</html>
