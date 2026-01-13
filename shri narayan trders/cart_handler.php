<?php
/*
 * Shri Narayan Traders - Cart Handler (AJAX Endpoint)
 *
 * This file acts as the server-side endpoint for all AJAX cart operations.
 * It handles adding items, updating quantities, removing items, and fetching the cart count.
 * It communicates using JSON for seamless integration with JavaScript.
 */

// Core setup and functions
require_once 'functions.php';
// Database connection
require_once 'db.php';

// The response array that will be sent back as JSON
$response = [
    'success' => false,
    'message' => 'An unknown error occurred.',
    'cart_count' => 0
];

// Ensure an action is specified
if (!isset($_POST['action'])) {
    $response['message'] = 'No action specified.';
    echo json_encode($response);
    exit;
}

$action = $_POST['action'];

// Initialize the cart in the session if it doesn't exist
if (!isset($_SESSION['cart'])) {
    $_SESSION['cart'] = [];
}

// --- CART LOGIC ---

/**
 * Calculates the total number of items in the cart.
 *
 * @return int The total item count.
 */
function get_cart_item_count() {
    $count = 0;
    if (isset($_SESSION['cart'])) {
        foreach ($_SESSION['cart'] as $quantity) {
            $count += $quantity;
        }
    }
    return $count;
}


// --- ACTIONS ---

// Action: 'add' -> Add a product to the cart
if ($action === 'add') {
    if (isset($_POST['product_id'])) {
        $product_id = (int)$_POST['product_id'];

        // Check if product exists and is in stock
        $stmt = $pdo->prepare("SELECT UnitsInStock FROM product WHERE ProductId = :id");
        $stmt->execute(['id' => $product_id]);
        $product = $stmt->fetch();

        if ($product && $product['UnitsInStock'] > 0) {
            // Check if product is already in cart
            if (isset($_SESSION['cart'][$product_id])) {
                // If yes, check if adding one more exceeds stock
                if ($product['UnitsInStock'] > $_SESSION['cart'][$product_id]) {
                    $_SESSION['cart'][$product_id]++;
                    $response['success'] = true;
                    $response['message'] = 'Product quantity updated in cart!';
                } else {
                    $response['message'] = 'Cannot add more. No more units in stock.';
                }
            } else {
                // If not, add it to the cart with quantity 1
                $_SESSION['cart'][$product_id] = 1;
                $response['success'] = true;
                $response['message'] = L($LANG, 'product_added_to_cart');
            }
        } else {
            $response['message'] = 'Product is out of stock or does not exist.';
        }
    } else {
        $response['message'] = 'Product ID not provided.';
    }
}

// Action: 'get_count' -> Get the total number of items in the cart
elseif ($action === 'get_count') {
    $response['success'] = true;
    $response['message'] = 'Cart count fetched.';
}

// Action: 'update' -> Update the quantity of a specific item in the cart
elseif ($action === 'update') {
    $product_id = (int)($_POST['product_id'] ?? 0);
    $quantity = (int)($_POST['quantity'] ?? 0);

    if ($product_id > 0 && $quantity > 0 && isset($_SESSION['cart'][$product_id])) {
        // Check stock availability
        $stmt = $pdo->prepare("SELECT UnitsInStock FROM product WHERE ProductId = :id");
        $stmt->execute(['id' => $product_id]);
        $product = $stmt->fetch();
        
        if ($product && $product['UnitsInStock'] >= $quantity) {
            $_SESSION['cart'][$product_id] = $quantity;
            $response['success'] = true;
            $response['message'] = L($LANG, 'cart_updated');
        } else {
            $response['message'] = 'Not enough stock available. Only ' . ($product['UnitsInStock'] ?? 0) . ' units left.';
        }
    } else {
        $response['message'] = 'Invalid product or quantity.';
    }
}

// Action: 'remove' -> Remove an item completely from the cart
elseif ($action === 'remove') {
    $product_id = (int)($_POST['product_id'] ?? 0);
    if ($product_id > 0 && isset($_SESSION['cart'][$product_id])) {
        unset($_SESSION['cart'][$product_id]);
        $response['success'] = true;
        $response['message'] = L($LANG, 'product_removed_from_cart');
    } else {
        $response['message'] = 'Product not found in cart.';
    }
}

// After any action, update the cart count in the response
$response['cart_count'] = get_cart_item_count();

// Explicitly write and close the session to ensure data is saved
session_write_close();

// Set the content type to JSON and send the response
header('Content-Type: application/json');
echo json_encode($response);
exit();
?>
