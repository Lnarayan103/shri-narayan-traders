<?php
require_once 'functions.php';
require_once 'db.php';

$errors = [];
$message = '';
$token_is_valid = false;

if (!isset($_GET['token'])) {
    die('No token provided.');
}

$token = $_GET['token'];
$token_hash = hash('sha256', $token);

// Check if token is valid and not expired
$stmt = $pdo->prepare("SELECT * FROM password_resets WHERE token = :token");
$stmt->execute(['token' => $token_hash]);
$reset_request = $stmt->fetch();

if ($reset_request) {
    $expiry_time = strtotime($reset_request['expires_at']);
    if (time() < $expiry_time) {
        $token_is_valid = true;
    }
}

if (!$token_is_valid) {
    $errors[] = L($LANG, 'invalid_or_expired_token');
}

// Handle new password submission
if ($token_is_valid && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_POST['csrf_token']) || !verify_csrf_token($_POST['csrf_token'])) {
        $errors[] = 'Invalid request.';
    } else {
        $password = $_POST['password'] ?? '';
        $confirm_password = $_POST['confirm_password'] ?? '';

        if (empty($password) || empty($confirm_password)) {
            $errors[] = L($LANG, 'all_fields_required');
        } elseif ($password !== $confirm_password) {
            $errors[] = L($LANG, 'passwords_do_not_match');
        } elseif (strlen($password) < 8) {
            $errors[] = 'Password must be at least 8 characters long.';
        } else {
            // All good, update the password
            $new_hashed_password = password_hash($password, PASSWORD_DEFAULT);
            $user_email = $reset_request['email'];

            // Update password in customers table
            $update_stmt = $pdo->prepare("UPDATE customers SET password = :password WHERE email = :email");
            $update_stmt->execute([
                'password' => $new_hashed_password,
                'email' => $user_email
            ]);
            
            // Delete the used token
            $delete_stmt = $pdo->prepare("DELETE FROM password_resets WHERE email = :email");
            $delete_stmt->execute(['email' => $user_email]);

            $message = L($LANG, 'password_updated_successfully');
            $token_is_valid = false; // Hide the form after success
        }
    }
}


$page_title = L($LANG, 'reset_your_password');
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
<body>
    <?php include '_header.php'; ?>
    <main class="container my-5">
        <div class="row justify-content-center">
            <div class="col-lg-5 col-md-7">
                <div class="card shadow-sm">
                    <div class="card-body p-4">
                        <h2 class="text-center mb-4"><?= $page_title ?></h2>

                        <?php if (!empty($errors)): ?>
                            <div class="alert alert-danger"><?php foreach ($errors as $error) echo "<p class='mb-0'>$error</p>"; ?></div>
                        <?php endif; ?>
                        
                        <?php if ($message): ?>
                            <div class="alert alert-success text-center">
                                <p><?= $message ?></p>
                                <a href="login.php" class="btn btn-primary">Go to Login</a>
                            </div>
                        <?php endif; ?>

                        <?php if ($token_is_valid): ?>
                            <form action="reset-password.php?token=<?= escape_html($token) ?>" method="POST">
                                <input type="hidden" name="csrf_token" value="<?= escape_html($_SESSION['csrf_token']) ?>">
                                <div class="mb-3">
                                    <label for="password" class="form-label"><?= L($LANG, 'enter_new_password') ?></label>
                                    <input type="password" class="form-control" id="password" name="password" required>
                                </div>
                                <div class="mb-3">
                                    <label for="confirm_password" class="form-label"><?= L($LANG, 'confirm_password') ?></label>
                                    <input type="password" class="form-control" id="confirm_password" name="confirm_password" required>
                                </div>
                                <div class="d-grid">
                                    <button type="submit" class="btn btn-primary btn-lg"><?= L($LANG, 'reset_your_password') ?></button>
                                </div>
                            </form>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
    </main>
    <?php include '_footer.php'; ?>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
