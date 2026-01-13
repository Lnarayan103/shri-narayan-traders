<?php
/*
 * Shri Narayan Traders - Configuration File
 *
 * This file contains the database connection details and other site-wide settings.
 * It's crucial for the application to function correctly.
 *
 * GOOD PRACTICE:
 * In a real-world production environment, it's highly recommended to store these credentials
 * outside the public-facing web root directory, for example, using environment variables (.env file)
 * to prevent sensitive information from being exposed.
 *
 */

// --- DATABASE CREDENTIALS ---
// Replace with your actual database server details.
define('DB_HOST', 'localhost');      // Database host (e.g., 'localhost' or an IP address)
define('DB_NAME', 'shri_narayan_traders');  // The name of your database
define('DB_USER', 'root');           // Your database username
define('DB_PASS', '');               // Your database password

// --- SITE CONFIGURATION ---
// Base URL of your project. IMPORTANT: Include a trailing slash '/'.

define('BASE_URL', 'https://sntrades.in/');

// Site name for titles and other display purposes.
define('SITE_NAME', 'Shri Narayan Traders');

// Default language setting. 'en' for English, 'hi' for Hindi.
// The application will use this if it cannot detect the browser's language.
define('DEFAULT_LANG', 'en');

// --- SECURITY ---
// A secret key for hashing and other security purposes.
// IMPORTANT: Change this to a long, random, and unique string for your application.
// You can generate one from: https://randomkeygen.com/
define('SECRET_KEY', 'my secret key');

// --- ERROR REPORTING ---
// Set error reporting level.
// For development, use E_ALL to see all errors.
// For production, use 0 to disable error reporting to the user.
error_reporting(E_ALL);
ini_set('display_errors', 0); // Set to 0 in production

// --- SESSION ---
// Start the session on all pages where this config is included.
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

?>
