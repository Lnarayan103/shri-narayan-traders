<?php
require_once '_check_login.php';
require_once '../db.php';

$product_id = (int)($_GET['id'] ?? 0);

if ($product_id <= 0) {
    header("Location: products.php");
    exit;
}

// First, get the image file name to delete it from the server
$stmt = $pdo->prepare("SELECT Image FROM product WHERE ProductId = :id");
$stmt->execute([':id' => $product_id]);
$image = $stmt->fetchColumn();

// Now, delete the product from the database
$stmt = $pdo->prepare("DELETE FROM product WHERE ProductId = :id");
$stmt->execute([':id' => $product_id]);

// If an image exists and it's not the default one, delete the file
if ($image && $image != 'default.jpg') {
    $file_path = '../assets/uploads/' . $image;
    if (file_exists($file_path)) {
        unlink($file_path);
    }
}

// Redirect back to the products list with a success message
header("Location: products.php?success=Product deleted successfully!");
exit;
?>
