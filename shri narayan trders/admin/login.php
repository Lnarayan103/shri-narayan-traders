<?php
require_once '../functions.php';
require_once '../db.php';

// Redirect if admin is already logged in
if (isset($_SESSION['admin_id'])) {
    header('Location: dashboard.php');
    exit;
}

// First, check if an admin exists at all. If not, redirect to setup.
$stmt = $pdo->query("SELECT id FROM admin LIMIT 1");
if (!$stmt->fetch()) {
    header('Location: setup.php');
    exit;
}

$errors = [];

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_POST['csrf_token']) || !verify_csrf_token($_POST['csrf_token'])) {
        $errors[] = 'Invalid request. Please try again.';
    } else {
        $username = trim($_POST['username'] ?? '');
        $password = $_POST['password'] ?? '';

        if (empty($username) || empty($password)) {
            $errors[] = L($LANG, 'all_fields_required');
        } else {
            $stmt = $pdo->prepare("SELECT id, password FROM admin WHERE username = :user_or_email1 OR email = :user_or_email2");
            $stmt->execute([
                'user_or_email1' => $username,
                'user_or_email2' => $username
            ]);
            $admin = $stmt->fetch();

            if ($admin && password_verify($password, $admin['password'])) {
                session_regenerate_id(true);
                $_SESSION['admin_id'] = $admin['id'];
                header("Location: dashboard.php");
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
    <title><?= L($LANG, 'admin_login') ?> - <?= L($LANG, 'site_name') ?></title>
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body class="bg-light">

    <div class="container">
        <div class="row justify-content-center align-items-center" style="min-height: 100vh;">
            <div class="col-lg-5 col-md-7">
                <div class="card shadow-lg">
                    <div class="card-body p-5">
                        <div class="text-center mb-4">
                            <i class="fas fa-shield-alt fa-3x text-primary"></i>
                            <h2 class="mt-3"><?= L($LANG, 'admin_login') ?></h2>
                        </div>

                        <?php if (!empty($errors)): ?>
                            <div class="alert alert-danger">
                                <?php foreach ($errors as $error): ?><p class="mb-0"><?= $error ?></p><?php endforeach; ?>
                            </div>
                        <?php endif; ?>

                        <form action="login.php" method="POST">
                            <input type="hidden" name="csrf_token" value="<?= escape_html($_SESSION['csrf_token']) ?>">
                            <div class="mb-3">
                                <label for="username" class="form-label"><?= L($LANG, 'username') ?> or Email</label>
                                <input type="text" class="form-control" id="username" name="username" required>
                            </div>
                            <div class="mb-4">
                                <label for="password" class="form-label"><?= L($LANG, 'password') ?></label>
                                <input type="password" class="form-control" id="password" name="password" required>
                            </div>
                            <div class="d-grid">
                                <button type="submit" class="btn btn-primary btn-lg"><?= L($LANG, 'login') ?></button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
