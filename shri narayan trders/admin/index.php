<?php
/**
 * Shri Narayan Traders - Admin Entry Point
 *
 * This file acts as a gatekeeper for the /admin/ directory.
 *
 * Its only job is to check if an admin account exists in the database.
 * - If NO admin exists, it redirects to the one-time setup page.
 * - If an admin DOES exist, it redirects to the login page.
 *
 * This ensures a smooth first-time setup process.
 */

// Include the database connection file from the parent directory.
require_once '../db.php';

// Check for the existence of at least one admin user.
try {
    $stmt = $pdo->query("SELECT id FROM admin LIMIT 1");
    
    if ($stmt->fetch()) {
        // An admin exists, so proceed to the login page.
        header('Location: login.php');
        exit;
    } else {
        // No admin found, so start the setup process.
        header('Location: setup.php');
        exit;
    }
} catch (PDOException $e) {
    // If the database or table doesn't exist, it will throw an exception.
    // Show a user-friendly error message.
    die("Database error. Please ensure you have imported the `database.sql` file correctly.");
}

?>
