<?php
// Core setup, functions, and database connection
require_once 'functions.php';
require_once 'db.php';

// --- STAGE 1: SECURITY & VALIDATION ---

// 1. Check if user is logged in
if (!isset($_SESSION['customer_id'])) {
    die("Error: You must be logged in to place an order.");
}

// 2. Check if the cart is not empty
if (empty($_SESSION['cart'])) {
    die("Error: Your cart is empty.");
}

// 3. Check if it's a POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    die("Error: Invalid request method.");
}

// 4. Verify CSRF token
if (!isset($_POST['csrf_token']) || !verify_csrf_token($_POST['csrf_token'])) {
    die("Error: Invalid CSRF token. Please try submitting the form again.");
}

// 5. Sanitize and validate all incoming POST data
$full_name = trim($_POST['full_name'] ?? '');
$email = filter_var(trim($_POST['email'] ?? ''), FILTER_SANITIZE_EMAIL);
$phone = trim($_POST['phone'] ?? '');
$address = trim($_POST['address'] ?? '');
$city = trim($_POST['city'] ?? '');
$state = trim($_POST['state'] ?? '');
$zip = trim($_POST['zip'] ?? '');
$payment_method = trim($_POST['paymentMethod'] ?? 'Credit Card');

// --- Credit Card specific fields (only if payment method is Credit Card)
$card_type = trim($_POST['card_type'] ?? '');
$card_number = preg_replace('/[^0-9]/', '', $_POST['card_number'] ?? '');
$cc_expiration = trim($_POST['cc_expiration'] ?? '');
$cvv = preg_replace('/[^0-9]/', '', $_POST['cvv'] ?? '');

$is_card_payment = ($payment_method === 'Credit Card');

if (empty($full_name) || empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL) || empty($phone) || empty($address) || empty($city) || empty($state) || empty($zip)) {
    die("Error: All address fields are required. Please go back and fill out the form completely.");
}
if ($is_card_payment && (empty($card_type) || empty($card_number) || empty($cc_expiration) || empty($cvv))) {
    die("Error: For credit card payments, all card detail fields are required.");
}

// --- STAGE 2: PROCESS THE ORDER WITHIN A TRANSACTION ---

try {
    // Begin a database transaction
    $pdo->beginTransaction();

    // --- Step 2.1: Lock products and verify stock ---
    $product_ids = array_keys($_SESSION['cart']);
    $placeholders = implode(',', array_fill(0, count($product_ids), '?'));
    // Use 'FOR UPDATE' to lock the selected rows to prevent race conditions (e.g., two users buying the last item at the same time)
    $sql = "SELECT ProductId, ProductName, ProductPrice, UnitsInStock FROM product WHERE ProductId IN ($placeholders) FOR UPDATE";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($product_ids);
    $products_in_cart = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Check if all products were found and if stock is sufficient
    if (count($products_in_cart) !== count($product_ids)) {
        throw new Exception("One or more products in your cart are no longer available.");
    }
    
    $subtotal = 0;
    $order_items_to_insert = [];

    foreach ($products_in_cart as $product) {
        $product_id = $product['ProductId'];
        $quantity_ordered = $_SESSION['cart'][$product_id];

        if ($product['UnitsInStock'] < $quantity_ordered) {
            throw new Exception("Sorry, the product '{$product['ProductName']}' is out of stock. Please remove it from your cart.");
        }
        
        $subtotal += $product['ProductPrice'] * $quantity_ordered;
        $order_items_to_insert[] = [
            'product_id' => $product_id,
            'quantity' => $quantity_ordered,
            'price' => $product['ProductPrice']
        ];
    }

    // --- Step 2.2: Create the main order record ---
    $shipping_address = "$address, $city, $state - $zip";
    $order_number = 'ORD-' . time() . '-' . $_SESSION['customer_id'];
    
    $sql = "INSERT INTO orders (customer_id, order_number, bill_address, shipping_address, total_amount, payment_method) VALUES (:customer_id, :order_number, :bill_address, :shipping_address, :total_amount, :payment_method)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'customer_id' => $_SESSION['customer_id'],
        'order_number' => $order_number,
        'bill_address' => $shipping_address, // Assuming same as shipping for simplicity
        'shipping_address' => $shipping_address,
        'total_amount' => $subtotal,
        'payment_method' => $payment_method
    ]);
    $order_id = $pdo->lastInsertId();

    // --- Step 2.3: Save credit card details (only if payment method is Credit Card) ---
    if ($is_card_payment) {
        // IMPORTANT: In a real-world app, NEVER store raw card numbers. This is for project demo ONLY.
        // We will 'fake' encrypt the card number for demonstration.
        $encrypted_card_number = 'enc_' . strrev($card_number); // Simple "encryption"
        $sql = "INSERT INTO creditcard (order_id, card_type, card_number) VALUES (:order_id, :card_type, :card_number)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'order_id' => $order_id,
            'card_type' => $card_type,
            'card_number' => $encrypted_card_number
        ]);
    }

    // --- Step 2.4: Insert items into order_items table ---
    $sql = "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (:order_id, :product_id, :quantity, :price)";
    $stmt = $pdo->prepare($sql);
    foreach ($order_items_to_insert as $item) {
        $stmt->execute([
            'order_id' => $order_id,
            'product_id' => $item['product_id'],
            'quantity' => $item['quantity'],
            'price' => $item['price']
        ]);
    }
    
    // --- Step 2.5: Update stock levels in the product table ---
    $sql = "UPDATE product SET UnitsInStock = UnitsInStock - ?, UnitsOnOrder = UnitsOnOrder + ? WHERE ProductId = ?";
    $stmt = $pdo->prepare($sql);
    foreach ($order_items_to_insert as $item) {
        $stmt->execute([$item['quantity'], $item['quantity'], $item['product_id']]);
    }

    // If everything was successful, commit the transaction
    $pdo->commit();

} catch (Exception $e) {
    // If any step fails, roll back the entire transaction
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    // Display a user-friendly error message and stop execution
    // In a real app, you might redirect to the cart page with an error message
    die("Order failed: " . $e->getMessage());
}

// --- STAGE 3: CLEANUP AND REDIRECT ---

// Clear the shopping cart from the session
unset($_SESSION['cart']);

// Store the order number in the session to display on the success page
$_SESSION['latest_order_number'] = $order_number;

// Redirect to the success page
header('Location: success.php');
exit();

?>
