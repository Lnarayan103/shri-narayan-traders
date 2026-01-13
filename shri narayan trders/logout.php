<?php
/**
 * Shri Narayan Traders - Customer Logout
 *
 * This script handles the logout process for a customer.
 */

// The session should already be started by config.php or another core file,
// but we start it here to be safe, in case this script is ever called directly.
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// Unset all of the session variables for the customer.
unset($_SESSION['customer_id']);
// You could also unset other customer-related session data here if you add more.

// Finally, destroy the session.
// This will remove the session data from the server.
session_destroy();

// Redirect to the home page after logging out.
header('Location: index.php');
exit;
?>
