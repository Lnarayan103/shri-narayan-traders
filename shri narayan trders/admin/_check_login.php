<?php
/**
 * Shri Narayan Traders - Admin Login Check
 *
 * This script is included at the top of every secure admin page.
 *
 * It checks if an 'admin_id' is present in the session. If not, it assumes
 * the user is not logged in and redirects them to the login page.
 *
 * This is a crucial security measure to protect the admin area.
 */

// We need access to sessions, so we ensure the session is started.
// Our functions.php file, which is in the parent directory, handles this.
// Note: On some servers, a direct require might be needed if not already included.
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// Check for the admin_id in the session.
if (!isset($_SESSION['admin_id'])) {
    // If it doesn't exist, redirect to the login page.
    // 'exit()' is important to stop further script execution.
    header('Location: login.php');
    exit;
}

// If the script continues, it means the admin is logged in.
?>
