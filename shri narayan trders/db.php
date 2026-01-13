<?php
$host = "sql308.infinityfree.com";
$username = "if0_40875946";
$password = "rDs13mPgGsH2r"; 
$dbname = "if0_40875946_narayantraders";

try {
    // Ye line database se connection banati hai (PDO Style mein)
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    
    // Error aane par batayega
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
} catch(PDOException $e) {
    die("Connection failed: " . $e->getMessage());
}
?>