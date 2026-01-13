<?php
/*
 * Shri Narayan Traders - Core Functions File
 *
 * This file will contain reusable functions for our application,
 * starting with the multi-language logic.
 */

// Ensure the main config file is included, which also starts the session.
require_once __DIR__ . '/config.php';

// --- MULTI-LANGUAGE SYSTEM ---

/**
 * Loads the appropriate language file based on session, browser settings, or default.
 *
 * This function handles the logic for selecting and loading the language strings
 * for the application. The order of precedence is:
 * 1. Language explicitly set by the user and stored in the session.
 * 2. Language detected from the browser's 'Accept-Language' header.
 * 3. Default language specified in config.php.
 *
 * @return array The array of language strings.
 */
function load_language() {
    // 1. Check if a language is set in the URL (user has switched language)
    if (isset($_GET['lang']) && ($_GET['lang'] == 'en' || $_GET['lang'] == 'hi')) {
        $_SESSION['lang'] = $_GET['lang'];
        // Redirect to the same page without the 'lang' parameter for a cleaner URL
        $redirect_url = strtok($_SERVER["REQUEST_URI"], '?');
        header("Location: " . $redirect_url);
        exit();
    }

    // 2. Determine the language to use
    $current_lang = DEFAULT_LANG; // Start with the default

    if (isset($_SESSION['lang'])) {
        // Use the language stored in the session if it exists
        $current_lang = $_SESSION['lang'];
    } elseif (isset($_SERVER['HTTP_ACCEPT_LANGUAGE'])) {
        // Auto-detect browser language if no session is set
        $browser_lang = strtolower(substr($_SERVER['HTTP_ACCEPT_LANGUAGE'], 0, 2));
        if ($browser_lang == 'hi') {
            $current_lang = 'hi';
        }
    }

    // Define the path to the language file
    $lang_file = __DIR__ . '/lang/' . $current_lang . '.php';

    // Load the language file
    if (file_exists($lang_file)) {
        require($lang_file);
    } else {
        // Fallback to default language file if the selected one doesn't exist
        require(__DIR__ . '/lang/' . DEFAULT_LANG . '.php');
    }

    // Store the current language code in the session for persistence
    $_SESSION['lang'] = $current_lang;
    
    // Return the loaded language array
    return $lang;
}

/**
 * A simple helper function to get a string from the language array.
 *
 * @param array $lang_array The array of loaded language strings.
 * @param string $key The key of the string to retrieve.
 * @return string The translated text or the key itself if not found.
 */
function L($lang_array, $key) {
    return $lang_array[$key] ?? $key;
}

// --- SECURITY & HELPER FUNCTIONS ---

/**
 * Escapes HTML output to prevent XSS (Cross-Site Scripting) attacks.
 *
 * @param string|null $string The input string to sanitize.
 * @return string The sanitized string.
 */
function escape_html($string) {
    return htmlspecialchars($string ?? '', ENT_QUOTES, 'UTF-8');
}

/**
 * Generates a CSRF (Cross-Site Request Forgery) token.
 */
function generate_csrf_token() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
}

/**
 * Verifies the CSRF token.
 *
 * @param string $token The token from the form submission.
 * @return bool True if valid, false otherwise.
 */
function verify_csrf_token($token) {
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

// Load the language strings into a global variable for easy access
$LANG = load_language();

// Generate CSRF token for forms
generate_csrf_token();

?>
