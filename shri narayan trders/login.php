<?php
// Core setup, functions, and database connection
require_once 'functions.php';
require_once 'db.php';

// Redirect if already logged in
if (isset($_SESSION['customer_id'])) {
    header('Location: index.php');
    exit;
}

$errors = [];

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Verify CSRF token
    if (!isset($_POST['csrf_token']) || !verify_csrf_token($_POST['csrf_token'])) {
        $errors[] = 'Invalid request. Please try again.';
    } else {
        $identifier = trim($_POST['identifier'] ?? '');
        $password = $_POST['password'] ?? '';
        
        if (empty($identifier) || empty($password)) {
            $errors[] = L($LANG, 'all_fields_required');
        } else {
            // Check if identifier is an email or a phone number
            if (filter_var($identifier, FILTER_VALIDATE_EMAIL)) {
                $sql = "SELECT id, password FROM customers WHERE email = :identifier";
            } else {
                $sql = "SELECT id, password FROM customers WHERE phone = :identifier";
            }
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute(['identifier' => $identifier]);
            $customer = $stmt->fetch();
    
            // Verify user and password
            if ($customer && password_verify($password, $customer['password'])) {
                session_regenerate_id(true);
                $_SESSION['customer_id'] = $customer['id'];
                
                // Capture IP and User-Agent (variables rakh rahe hain, future mein use kar sakte ho)
                $ip_address = $_SERVER['REMOTE_ADDR'] ?? null;
                $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? null;
            
                /*
                // Yeh part abhi comment out hai kyunki columns nahi hain
                // Jab columns add kar loge to comment hata dena
                $update_stmt = $pdo->prepare("UPDATE customers SET last_login_ip = :ip, last_login_user_agent = :ua WHERE id = :customer_id");
                $update_stmt->execute([
                    'ip' => $ip_address,
                    'ua' => $user_agent,
                    'customer_id' => $customer['id']
                ]);
                */
            
                $redirect_url = $_GET['redirect_to'] ?? 'index.php';
                header("Location: " . $redirect_url);
                exit;
            } else {
                $errors[] = L($LANG, 'invalid_credentials');
            }
        }
    }
}
?>

<!DOCTYPE html>
<html lang="<?= escape_html($_SESSION['lang']) ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= L($LANG, 'login') ?> - <?= L($LANG, 'site_name') ?></title>
    
    <!-- Dependencies -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body class="auth-page">

    <!-- Header -->
    <?php require_once __DIR__ . '/_header_auth.php'; ?>

    <!-- Main Content -->
    <main class="container my-5">
        <div class="row justify-content-center">
            <div class="col-lg-5 col-md-7">
                <div class="card auth-card">
                    <div class="card-body">
                        <div class="auth-card-header">
                            <div class="icon"><i class="fas fa-sign-in-alt"></i></div>
                            <h2><?= L($LANG, 'login_to_account') ?></h2>
                        </div>

                        <!-- Display errors if any -->
                        <?php if (!empty($errors)): ?>
                            <div class="alert alert-danger">
                                <?php foreach ($errors as $error): ?>
                                    <p class="mb-0"><?= $error ?></p>
                                <?php endforeach; ?>
                            </div>
                        <?php endif; ?>

                        <form action="login.php" method="POST">
                            <input type="hidden" name="csrf_token" value="<?= escape_html($_SESSION['csrf_token']) ?>">
                            
                            <div class="mb-3">
                                <label for="identifier" class="form-label">Email or Mobile Number</label>
                                <input type="text" class="form-control auth-input" id="identifier" name="identifier" required>
                            </div>

                            <div class="mb-3">
                                <label for="password" class="form-label"><?= L($LANG, 'password') ?></label>
                                <input type="password" class="form-control auth-input" id="password" name="password" required>
                            </div>

                            <div class="form-text text-end mb-3">
                                <a href="forgot-password.php"><?= L($LANG, 'forgot_password') ?></a>
                            </div>

                            <div class="d-grid">
                                <button type="submit" class="btn btn-primary btn-lg auth-btn"><?= L($LANG, 'login') ?></button>
                            </div>
                        </form>

                        <p class="text-center mt-4">
                            <?= L($LANG, 'dont_have_account') ?> <a href="register.php"><?= L($LANG, 'register') ?></a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <?php include '_footer.php'; ?>
    <!-- JS Dependencies -->
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="assets/js/script.js"></script>
</body>
</html>