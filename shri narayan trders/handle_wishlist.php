<?php
require_once 'functions.php';
require_once 'db.php';

$response = ['success' => false, 'message' => 'An unknown error occurred.', 'action' => ''];

// Ensure user is logged in
if (!isset($_SESSION['customer_id'])) {
    $response['message'] = 'Please log in to manage your wishlist.';
    $response['redirect_login'] = true; // Signal frontend to redirect
    echo json_encode($response);
    exit;
}

$customer_id = $_SESSION['customer_id'];
$product_id = (int)($_POST['product_id'] ?? 0);

if ($product_id <= 0) {
    $response['message'] = 'Invalid product ID.';
    echo json_encode($response);
    exit;
}

// Check if product is already in wishlist
$stmt = $pdo->prepare("SELECT COUNT(*) FROM wishlist WHERE customer_id = :cid AND product_id = :pid");
$stmt->execute(['cid' => $customer_id, 'pid' => $product_id]);
$is_in_wishlist = $stmt->fetchColumn();

if ($is_in_wishlist) {
    // Remove from wishlist
    $stmt = $pdo->prepare("DELETE FROM wishlist WHERE customer_id = :cid AND product_id = :pid");
    $stmt->execute(['cid' => $customer_id, 'pid' => $product_id]);
    $response['success'] = true;
    $response['message'] = L($LANG, 'removed_from_wishlist');
    $response['action'] = 'removed';
} else {
    // Add to wishlist
    $stmt = $pdo->prepare("INSERT INTO wishlist (customer_id, product_id) VALUES (:cid, :pid)");
    $stmt->execute(['cid' => $customer_id, 'pid' => $product_id]);
    $response['success'] = true;
    $response['message'] = L($LANG, 'added_to_wishlist');
    $response['action'] = 'added';
}

header('Content-Type: application/json');
echo json_encode($response);
exit;
?>
