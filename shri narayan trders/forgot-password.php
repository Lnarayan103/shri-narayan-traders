<?php
require_once 'functions.php';
require_once 'db.php';
require_once 'mailer.php'; // Include the mailer helper

$errors = [];
$message = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_POST['csrf_token']) || !verify_csrf_token($_POST['csrf_token'])) {
        $errors[] = 'Invalid request. Please try again.';
    } else {
        $email = filter_var(trim($_POST['email'] ?? ''), FILTER_SANITIZE_EMAIL);

        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'Please enter a valid email address.';
        } else {
            // Check if email exists
            $stmt = $pdo->prepare("SELECT id FROM customers WHERE email = :email");
            $stmt->execute(['email' => $email]);
            if (!$stmt->fetch()) {
                $errors[] = L($LANG, 'email_not_found');
            } else {
                // Generate a secure token
                $token = bin2hex(random_bytes(32));
                $token_hash = hash('sha256', $token);
                
                // Set expiry time (e.g., 1 hour from now)
                $expires_at = date('Y-m-d H:i:s', time() + 3600);

                // Store the token in the database
                $stmt = $pdo->prepare("INSERT INTO password_resets (email, token, expires_at) VALUES (:email, :token, :expires_at)");
                $stmt->execute([
                    'email' => $email,
                    'token' => $token_hash,
                    'expires_at' => $expires_at
                ]);

                // --- Send Password Reset Link via Email using PHPMailer ---
                $reset_link = BASE_URL . "reset-password.php?token=" . $token;

                $mail = getMailer();
                if ($mail) {
                    try {
                        $mail->addAddress($email); // User's email
                        $mail->Subject = 'Password Reset Request for Shri Narayan Traders';
                        $mail->Body    = "Hello,<br><br>A password reset was requested for your account.<br>Please click on the following link to reset your password:<br><br><a href='{$reset_link}'>{$reset_link}</a><br><br>This link is valid for 1 hour. If you did not request a password reset, please ignore this email.<br><br>Regards,<br>Shri Narayan Traders";
                        $mail->AltBody = "A password reset was requested for your account. Please visit the following link to reset your password: {$reset_link}. This link is valid for 1 hour.";

                        $mail->send();
                        $message = 'A password reset link has been sent to your email address.';
                    } catch (Exception $e) {
                        $errors[] = 'Password reset email could not be sent. Mailer Error: ' . $mail->ErrorInfo;
                        // Log the detailed error for debugging
                        error_log('Mailer Error for ' . $email . ': ' . $mail->ErrorInfo . ' - ' . $e->getMessage());
                    }
                } else {
                    $errors[] = 'Email service not available. Please try again later.';
                }
            }
        }
    }
}

$page_title = L($LANG, 'forgot_password');
?>
<!DOCTYPE html>
<html lang="<?= escape_html($_SESSION['lang']) ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $page_title ?> - <?= L($LANG, 'site_name') ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body class="auth-page">
    <?php require_once __DIR__ . '/_header_auth.php'; ?>
    <main class="container my-5">
        <div class="row justify-content-center">
            <div class="col-lg-5 col-md-7">
                <div class="card auth-card">
                    <div class="card-body">
                        <div class="auth-card-header">
                            <div class="icon"><i class="fas fa-key"></i></div>
                            <h2><?= $page_title ?></h2>
                        </div>

                        <?php if (!empty($errors)): ?>
                            <div class="alert alert-danger"><?php foreach ($errors as $error) echo "<p class='mb-0'>$error</p>"; ?></div>
                        <?php endif; ?>
                        
                        <?php if ($message): ?>
                            <div class="alert alert-success text-center">
                                <p><?= $message ?></p>
                                <a href="login.php" class="btn btn-primary">Go to Login</a>
                            </div>
                        <?php else: ?>
                            <p class="text-center text-muted">Enter your email address and we will send you a link to reset your password.</p>
                            <form action="forgot-password.php" method="POST">
                                <input type="hidden" name="csrf_token" value="<?= escape_html($_SESSION['csrf_token']) ?>">
                                <div class="mb-3">
                                    <label for="email" class="form-label"><?= L($LANG, 'email_address') ?></label>
                                    <input type="email" class="form-control auth-input" id="email" name="email" required>
                                </div>
                                <div class="d-grid">
                                    <button type="submit" class="btn btn-primary btn-lg auth-btn"><?= L($LANG, 'send_reset_link') ?></button>
                                </div>
                            </form>
                        <?php endif; ?>
                        
                        <p class="text-center mt-4"><a href="login.php">Back to Login</a></p>
                    </div>
                </div>
            </div>
        </div>
    </main>
    <?php include '_footer.php'; ?>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
