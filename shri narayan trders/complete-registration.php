<?php
require_once 'functions.php';
require_once 'db.php';

// Security check: ensure user has completed the OTP step
if (!isset($_SESSION['registration_step'], $_SESSION['registration_identifier']) || $_SESSION['registration_step'] !== 'complete_profile') {
    header('Location: register.php');
    exit;
}

$errors = [];
$identifier_type = $_SESSION['registration_identifier']['type'];
$identifier_value = $_SESSION['registration_identifier']['value'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_POST['csrf_token']) || !verify_csrf_token($_POST['csrf_token'])) {
        $errors[] = 'Invalid request.';
    } else {
        // Collect all data
        $first_name = trim($_POST['first_name'] ?? '');
        $last_name = trim($_POST['last_name'] ?? '');
        $password = trim($_POST['password'] ?? '');
        $confirm_password = $_POST['confirm_password'] ?? '';

        if ($identifier_type === 'email') {
            $email = $identifier_value;
            $phone = preg_replace('/[^0-9]/', '', $_POST['phone'] ?? '');
        } else {
            $phone = $identifier_value;
            $email = filter_var(trim($_POST['email'] ?? ''), FILTER_SANITIZE_EMAIL);
        }

        // --- Validation ---
        if (empty($first_name) || empty($last_name) || empty($email) || empty($phone) || empty($password) || empty($confirm_password)) {
            $errors[] = L($LANG, 'all_fields_required');
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'Invalid email format.';
        }
        if (strlen($phone) < 10) {
            $errors[] = 'Invalid mobile number.';
        }
        if ($password !== $confirm_password) {
            $errors[] = L($LANG, 'passwords_do_not_match');
        }
        if (strlen($password) < 8) {
            $errors[] = 'Password must be at least 8 characters long.';
        }
        
        // Check if the NEW identifier already exists
        if ($identifier_type === 'email') {
            $stmt = $pdo->prepare("SELECT id FROM customers WHERE phone = :phone");
            $stmt->execute(['phone' => $phone]);
            if ($stmt->fetch()) $errors[] = L($LANG, 'mobile_already_registered');
        } else {
            $stmt = $pdo->prepare("SELECT id FROM customers WHERE email = :email");
            $stmt->execute(['email' => $email]);
            if ($stmt->fetch()) $errors[] = L($LANG, 'email_already_exists');
        }

        // If all good, create the account
        if (empty($errors)) {
            $hashed_password = password_hash($password, PASSWORD_DEFAULT);

            // IP aur user agent nikal liye (future ke liye safe rakha)
            $ip_address = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
            $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';

            // Abhi ke liye extra columns hata diye taaki error na aaye
            $sql = "INSERT INTO customers 
                    (first_name, last_name, email, password, phone) 
                    VALUES 
                    (:first_name, :last_name, :email, :password, :phone)";

            $stmt = $pdo->prepare($sql);
            
            $stmt->execute([
                ':first_name' => $first_name,
                ':last_name'  => $last_name,
                ':email'      => $email,
                ':password'   => $hashed_password,
                ':phone'      => $phone
            ]);
            
            // Clean up session and redirect to login
            unset($_SESSION['registration_step']);
            unset($_SESSION['registration_identifier']);
            header("Location: login.php?registration=success");
            exit;
        }
    }
}

$page_title = "Complete Registration";
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
            <div class="col-lg-6 col-md-8">
                <div class="card shadow-sm">
                    <div class="card-body p-4">
                        <h2 class="text-center mb-4"><?= $page_title ?></h2>
                        <p class="text-center text-muted">Your <?= $identifier_type ?> is verified. Please fill in your details.</p>

                        <?php if (!empty($errors)): ?>
                            <div class="alert alert-danger"><?php foreach ($errors as $error) echo "<p class='mb-0'>$error</p>"; ?></div>
                        <?php endif; ?>

                        <form action="complete-registration.php" method="POST">
                            <input type="hidden" name="csrf_token" value="<?= escape_html($_SESSION['csrf_token']) ?>">
                            
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="first_name" class="form-label">First Name</label>
                                    <input type="text" class="form-control" id="first_name" name="first_name" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="last_name" class="form-label">Last Name</label>
                                    <input type="text" class="form-control" id="last_name" name="last_name" required>
                                </div>
                            </div>

                            <?php if ($identifier_type === 'phone'): ?>
                                <div class="mb-3">
                                    <label for="phone" class="form-label"><?= L($LANG, 'mobile_number') ?></label>
                                    <input type="tel" class="form-control" value="<?= escape_html($identifier_value) ?>" disabled readonly>
                                </div>
                                <div class="mb-3">
                                    <label for="email" class="form-label"><?= L($LANG, 'email_address') ?></label>
                                    <input type="email" class="form-control" id="email" name="email" required>
                                </div>
                            <?php else: // identifier_type is 'email' ?>
                                <div class="mb-3">
                                    <label for="email" class="form-label"><?= L($LANG, 'email_address') ?></label>
                                    <input type="email" class="form-control" value="<?= escape_html($identifier_value) ?>" disabled readonly>
                                </div>
                                <div class="mb-3">
                                    <label for="phone" class="form-label"><?= L($LANG, 'mobile_number') ?></label>
                                    <input type="tel" class="form-control" id="phone" name="phone" required>
                                </div>
                            <?php endif; ?>

                            <div class="mb-3">
                                <label for="password" class="form-label"><?= L($LANG, 'password') ?></label>
                                <input type="password" class="form-control" id="password" name="password" required>
                            </div>
                            <div class="mb-3">
                                <label for="confirm_password" class="form-label">Confirm New Password</label>
                                <input type="password" class="form-control" id="confirm_password" name="confirm_password" required>
                            </div>
                            <div class="d-grid">
                                <button type="submit" class="btn btn-primary btn-lg"><?= L($LANG, 'register') ?></button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </main>
    <?php include '_footer.php'; ?>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>