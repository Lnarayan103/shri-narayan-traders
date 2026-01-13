<?php
// PHPMailer Autoload
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

// PHPMailer library files ko include karein
require_once __DIR__ . '/PHPMailer/src/Exception.php';
require_once __DIR__ . '/PHPMailer/src/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/src/SMTP.php';

// Email configuration settings ko include karein
require_once __DIR__ . '/config_mail.php';

function getMailer() {
    $mail = new PHPMailer(true); // true enable exceptions

    try {
        //Server settings
        $mail->isSMTP();                                            // Send using SMTP
        $mail->Host       = MAIL_HOST;                              // Set the SMTP server to send through
        $mail->SMTPAuth   = MAIL_SMTP_AUTH;                         // Enable SMTP authentication
        $mail->Username   = MAIL_USERNAME;                          // SMTP username
        $mail->Password   = MAIL_PASSWORD;                          // SMTP password
        $mail->SMTPSecure = MAIL_SMTP_SECURE;                       // Enable implicit TLS encryption
        $mail->Port       = MAIL_PORT;                              // TCP port to connect to; use 587 for `PHPMailer::ENCRYPTION_STARTTLS` above

        //Recipients
        $mail->setFrom(MAIL_FROM, MAIL_FROM_NAME);

        // Content
        $mail->isHTML(true); // Set email format to HTML
        $mail->CharSet = 'UTF-8';

        return $mail;

    } catch (Exception $e) {
        // Aap yahan error ko log kar sakte hain, ya display kar sakte hain development mein
        error_log("Mailer Error: {$mail->ErrorInfo} - {$e->getMessage()}");
        // For debugging, you might want to echo the error on screen during development
        // echo "Message could not be sent. Mailer Error: {$mail->ErrorInfo}";
        return null; // Error hone par null return karein
    }
}
