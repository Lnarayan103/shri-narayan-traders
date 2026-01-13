<?php
/**
 * Shri Narayan Traders - Admin Logout
 *
 * This script handles the logout process for an administrator.
 */

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// Unset all of the session variables for the admin.
unset($_SESSION['admin_id']);

// Destroy the session.
session_destroy();

// Redirect to the admin login page after logging out.
header('Location: login.php');
exit;
?>
