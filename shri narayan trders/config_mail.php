
<?php
/*
 * Email (PHPMailer) Configuration File
 *
 * Yeh file aapke email server ki settings ke liye hai.
 * Gmail ke liye IMPORTANT:
 * 1. 2-Step Verification (2FA) ON karo: https://myaccount.google.com/security
 * 2. App Password generate karo: https://myaccount.google.com/apppasswords
 *    - App: Other (Custom name) → Name: "PHP Mailer OTP" (kuch bhi likh sakte ho)
 *    - Generated password copy karo → spaces hata ke 16 characters continuous banao
 *    - Normal Gmail password KAAM NAHI KAREGA!
 * 3. Agar error aaye: SMTPDebug = 2 add karke test karo (neeche example hai)
 */

// -- SMTP Settings --
define('MAIL_HOST', 'smtp.gmail.com');                  // Gmail SMTP server
define('MAIL_SMTP_AUTH', true);                         // Authentication zaruri hai
define('MAIL_USERNAME', 'laxmi1032006@gmail.com');      // Poora Gmail address
define('MAIL_PASSWORD', 'app pass');            // ← TUMHARA NAYA APP PASSWORD (SPACES HATAYE HUE!)
define('MAIL_SMTP_SECURE', 'tls');                      // 'tls' for port 587 (best & recommended)
define('MAIL_PORT', 587);                               // 587 TLS ke liye perfect

// Alternative agar 587 block ho (kuch hostings mein hota hai):
// define('MAIL_SMTP_SECURE', 'ssl');
// define('MAIL_PORT', 465);

// -- Email "From" Address --
define('MAIL_FROM', 'laxmi1032006@gmail.com');          // Sender email (Gmail se match kare)
define('MAIL_FROM_NAME', 'Shri Narayan Traders');       // Sender name jo email mein dikhega

// Optional: Debugging ke liye (sirf testing ke time use karo)
// define('MAIL_DEBUG', 2);  // PHPMailer code mein $mail->SMTPDebug = MAIL_DEBUG; daal dena
?>
