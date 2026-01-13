<?php
require_once '_check_login.php';
require_once '../db.php';
require_once '../functions.php';

$errors = [];
$product_id = (int)($_GET['id'] ?? 0);

if ($product_id <= 0) {
    header("Location: products.php");
    exit;
}

// Fetch the existing product
$stmt = $pdo->prepare("SELECT * FROM product WHERE ProductId = :id");
$stmt->execute(['id' => $product_id]);
$product = $stmt->fetch();

if (!$product) {
    header("Location: products.php");
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $product_name = trim($_POST['product_name'] ?? '');
    $product_type = trim($_POST['product_type'] ?? '');
    $product_price = filter_var($_POST['product_price'], FILTER_VALIDATE_FLOAT);
    $units_in_stock = filter_var($_POST['units_in_stock'], FILTER_VALIDATE_INT);
    $quantity_desc = trim($_POST['quantity_desc'] ?? '1 piece');
    $product_description = trim($_POST['product_description'] ?? '');

    if (empty($product_name) || empty($product_type) || $product_price === false || $units_in_stock === false) {
        $errors[] = "All fields are required and must be in the correct format.";
    }

    $image_name = $product['Image']; // Keep old image by default
    if (isset($_FILES['product_image']) && $_FILES['product_image']['error'] == 0) {
        // Same upload logic as add_product.php
        $target_dir = "../assets/uploads/";
        $new_image_name = time() . '_' . basename($_FILES["product_image"]["name"]);
        $target_file = $target_dir . $new_image_name;
        // Validation... (can be refactored into a function)
        if (getimagesize($_FILES["product_image"]["tmp_name"]) === false) {
            $errors[] = "File is not an image.";
        }
        if ($_FILES["product_image"]["size"] > 10000000) {
            $errors[] = "Sorry, your file is too large (Max 10MB).";
        }
        if (move_uploaded_file($_FILES["product_image"]["tmp_name"], $target_file)) {
            // Delete old image if it's not the default one
            if ($image_name != 'default.jpg' && file_exists($target_dir . $image_name)) {
                unlink($target_dir . $image_name);
            }
            $image_name = $new_image_name; // Set new image name for the database
        } else {
            $errors[] = "Sorry, there was an error uploading your new file.";
        }
    }

    if (empty($errors)) {
        $sql = "UPDATE product SET 
                ProductName = :name, 
                ProductType = :type, 
                ProductPrice = :price, 
                ProductDescription = :description,
                Quantity = :quantity_desc, 
                UnitsInStock = :stock, 
                Image = :image 
                WHERE ProductId = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':name' => $product_name,
            ':type' => $product_type,
            ':price' => $product_price,
            ':description' => $product_description,
            ':quantity_desc' => $quantity_desc,
            ':stock' => $units_in_stock,
            ':image' => $image_name,
            ':id' => $product_id
        ]);

        header("Location: products.php?success=Product updated successfully!");
        exit;
    }
}

$page_title = "Edit Product";
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
                        <li class="breadcrumb-item active">Edit Product</li>
                    </ol>

                    <div class="card mb-4">
                        <div class="card-header">
                            <i class="fas fa-edit me-1"></i>
                            Edit Product Details
                        </div>
                        <div class="card-body">
                            <?php if (!empty($errors)): ?>
                                <div class="alert alert-danger">
                                    <?php foreach ($errors as $error): ?><p class="mb-0"><?= $error ?></p><?php endforeach; ?>
                                </div>
                            <?php endif; ?>

                            <form action="edit_product.php?id=<?= $product_id ?>" method="POST" enctype="multipart/form-data">
                                <div class="row">
                                    <div class="col-md-8">
                                        <div class="mb-3">
                                            <label for="product_name" class="form-label">Product Name</label>
                                            <input type="text" class="form-control" id="product_name" name="product_name" value="<?= escape_html($product['ProductName']) ?>" required>
                                        </div>
                                        <div class="row">
                                            <div class="col-md-6 mb-3">
                                                <label for="product_type" class="form-label">Product Type (Category)</label>
                                                <input type="text" class="form-control" id="product_type" name="product_type" value="<?= escape_html($product['ProductType']) ?>" required>
                                            </div>
                                            <div class="col-md-6 mb-3">
                                                <label for="product_price" class="form-label">Price</label>
                                                <input type="number" step="0.01" class="form-control" id="product_price" name="product_price" value="<?= escape_html($product['ProductPrice']) ?>" required>
                                            </div>
                                        </div>
                                        <div class="row">
                                            <div class="col-md-6 mb-3">
                                                <label for="units_in_stock" class="form-label">Units In Stock</label>
                                                <input type="number" class="form-control" id="units_in_stock" name="units_in_stock" value="<?= escape_html($product['UnitsInStock']) ?>" required>
                                            </div>
                                            <div class="col-md-6 mb-3">
                                                <label for="quantity_desc" class="form-label">Quantity Description</label>
                                                <input type="text" class="form-control" id="quantity_desc" name="quantity_desc" value="<?= escape_html($product['Quantity']) ?>" placeholder="e.g., per sq. ft., per slab">
                                            </div>
                                        </div>
                                        <div class="mb-3">
                                            <label for="product_description" class="form-label">Product Description</label>
                                            <textarea class="form-control" id="product_description" name="product_description" rows="3"><?= escape_html($product['ProductDescription']) ?></textarea>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="mb-3">
                                            <label for="product_image" class="form-label">Change Product Image</label>
                                            <input class="form-control" type="file" id="product_image" name="product_image" onchange="previewImage(event)">
                                        </div>
                                        <div class="text-center">
                                            <img id="imagePreview" src="../assets/uploads/<?= escape_html($product['Image']) ?>" alt="Image Preview" class="img-thumbnail" style="max-height: 200px;" onerror="this.src='../assets/images/default.jpg';">
                                        </div>
                                    </div>
                                </div>
                                <hr>
                                <button type="submit" class="btn btn-primary">Update Product</button>
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
