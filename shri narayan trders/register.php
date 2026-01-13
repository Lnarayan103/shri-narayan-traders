<?php
require_once 'functions.php';
require_once 'db.php';
require_once 'mailer.php'; // Include the mailer helper

$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_POST['csrf_token']) || !verify_csrf_token($_POST['csrf_token'])) {
        $errors[] = 'Invalid request. Please try again.';
    } else {
        $identifier = trim($_POST['identifier'] ?? '');
        $type = '';

        // Determine if the identifier is an email or a phone number
        if (filter_var($identifier, FILTER_VALIDATE_EMAIL)) {
            $type = 'email';
            $stmt = $pdo->prepare("SELECT id FROM customers WHERE email = :identifier");
        } else {
            $errors[] = "Only email registration is supported for OTP via email. Please enter a valid email address.";
        }

        if (empty($errors)) {
            $stmt->execute(['identifier' => $identifier]);
            if ($stmt->fetch()) {
                $errors[] = ($type === 'email') ? L($LANG, 'email_already_exists') : L($LANG, 'mobile_already_registered');
            } else {
                // --- Generate OTP ---
                $otp = rand(100000, 999999);
                
                $_SESSION['otp_verification'] = [
                    'identifier_type' => $type,
                    'identifier_value' => $identifier,
                    'otp' => $otp,
                    'expires_at' => time() + 300 // 5 minutes validity
                ];
                
                // --- Send OTP via Email using PHPMailer ---
                $mail = getMailer();
                if ($mail) {
                    try {
                        $mail->addAddress($identifier); // User's email
                        $mail->Subject = 'Your OTP for Shri Narayan Traders';
                        $mail->Body    = "Hello,<br><br>Your One-Time Password (OTP) for Shri Narayan Traders registration is: <strong>{$otp}</strong><br><br>This OTP is valid for 5 minutes. Do not share this with anyone.<br><br>Regards,<br>Shri Narayan Traders";
                        $mail->AltBody = "Your One-Time Password (OTP) for Shri Narayan Traders registration is: {$otp}. This OTP is valid for 5 minutes.";

                        $mail->send();
                        // Redirect to OTP verification page without showing OTP in URL
                        header('Location: verify-otp.php');
                        exit;
                    } catch (Exception $e) {
                        $errors[] = 'OTP could not be sent. Mailer Error: ' . $mail->ErrorInfo;
                        // Log the detailed error for debugging
                        error_log('Mailer Error for ' . $identifier . ': ' . $mail->ErrorInfo . ' - ' . $e->getMessage());
                    }
                } else {
                    $errors[] = 'Email service not available. Please try again later.';
                }
            }
        }
    }
}

$page_title = L($LANG, 'register');
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
            <div class="col-lg-6 col-md-8">
                <div class="card auth-card">
                    <div class="card-body">
                        <div class="auth-card-header">
                            <div class="icon"><i class="fas fa-user-plus"></i></div>
                            <h2>Create Account</h2>
                            <p class="text-muted">Enter your Email address to begin.</p>
                        </div>

                        <?php if (!empty($errors)): ?>
                            <div class="alert alert-danger">
                                <?php foreach ($errors as $error) echo "<p class='mb-0'>$error</p>"; ?>
                            </div>
                        <?php endif; ?>

                        <form action="register.php" method="POST">
                            <input type="hidden" name="csrf_token" value="<?= escape_html($_SESSION['csrf_token']) ?>">
                            <div class="mb-3">
                                <label for="identifier" class="form-label">Email Address</label>
                                <input type="email" class="form-control auth-input" id="identifier" name="identifier" placeholder="e.g., user@example.com" required>
                            </div>
                            <div class="d-grid">
                                <button type="submit" class="btn btn-primary btn-lg auth-btn"><?= L($LANG, 'send_otp') ?></button>
                            </div>
                        </form>
                        <p class="text-center mt-4">
                            <?= L($LANG, 'already_have_account') ?> <a href="login.php"><?= L($LANG, 'login') ?></a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </main>
    <?php include '_footer.php'; ?>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>