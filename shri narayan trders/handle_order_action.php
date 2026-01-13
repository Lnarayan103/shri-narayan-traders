<?php
require_once 'functions.php';
require_once 'db.php';

// Redirect if not logged in
if (!isset($_SESSION['customer_id'])) {
    header('Location: login.php');
    exit;
}

$customer_id = $_SESSION['customer_id'];
$order_id = (int)($_GET['id'] ?? 0);
$action = trim($_GET['action'] ?? '');

if ($order_id <= 0 || empty($action)) {
    header('Location: orders.php');
    exit;
}

// First, verify that the order belongs to the logged-in customer
$stmt = $pdo->prepare("SELECT id, shipped_status FROM orders WHERE id = :order_id AND customer_id = :customer_id");
$stmt->execute(['order_id' => $order_id, 'customer_id' => $customer_id]);
$order = $stmt->fetch();

if (!$order) {
    // If order doesn't exist or doesn't belong to user, redirect
    header('Location: orders.php');
    exit;
}

$new_status = $order['shipped_status']; // Default to current status

// Determine the new status based on the action
// This is a simplified logic. A real app would have more complex rules.
switch ($action) {
    case 'cancel':
        // Users can only cancel if the order is still 'Pending'
        if ($order['shipped_status'] == 'Pending') {
            $new_status = 'Cancelled';
        }
        break;
    case 'return':
        // For simplicity, we'll just mark it as 'Return Requested'
        // This would typically only be allowed for 'Delivered' orders
        $new_status = 'Return Requested';
        break;
    // 'replace' action can be handled similarly
    case 'replace':
        $new_status = 'Replacement Requested';
        break;
}

// If the status has changed, update the database
if ($new_status !== $order['shipped_status']) {
    $update_stmt = $pdo->prepare("UPDATE orders SET shipped_status = :status WHERE id = :id");
    $update_stmt->execute(['status' => $new_status, 'id' => $order_id]);
}

// Redirect back to the order details page to see the change
header('Location: order_details.php?id=' . $order_id);
exit;
?>
