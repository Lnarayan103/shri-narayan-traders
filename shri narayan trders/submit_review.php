<?php
require_once 'functions.php';
require_once 'db.php';

// Ensure user is logged in
if (!isset($_SESSION['customer_id'])) {
    header('Location: login.php');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: index.php'); // Or product details page
    exit;
}

$customer_id = $_SESSION['customer_id'];
$product_id = (int)($_POST['product_id'] ?? 0);
$rating = (int)($_POST['rating'] ?? 0);
$comment = trim($_POST['comment'] ?? '');

if (!isset($_POST['csrf_token']) || !verify_csrf_token($_POST['csrf_token'])) {
    die('Invalid request.');
}

if ($product_id <= 0 || $rating < 1 || $rating > 5) {
    header('Location: product-details.php?id=' . $product_id . '&error=invalid_data');
    exit;
}

// Security check: Ensure the user has actually purchased this product
$purchase_stmt = $pdo->prepare("SELECT COUNT(oi.id) FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE o.customer_id = :cid AND oi.product_id = :pid");
$purchase_stmt->execute(['cid' => $customer_id, 'pid' => $product_id]);
if ($purchase_stmt->fetchColumn() === 0) {
    header('Location: product-details.php?id=' . $product_id . '&error=not_purchased');
    exit;
}

// Check if user has already reviewed this product
$reviewed_stmt = $pdo->prepare("SELECT COUNT(id) FROM reviews WHERE customer_id = :cid AND product_id = :pid");
$reviewed_stmt->execute(['cid' => $customer_id, 'pid' => $product_id]);
if ($reviewed_stmt->fetchColumn() > 0) {
    header('Location: product-details.php?id=' . $product_id . '&error=already_reviewed');
    exit;
}

// Insert the review
$stmt = $pdo->prepare("INSERT INTO reviews (product_id, customer_id, rating, comment) VALUES (:pid, :cid, :rating, :comment)");
$stmt->execute([
    'pid' => $product_id,
    'cid' => $customer_id,
    'rating' => $rating,
    'comment' => $comment
]);

header('Location: product-details.php?id=' . $product_id . '&success=review_submitted');
exit;
?>
