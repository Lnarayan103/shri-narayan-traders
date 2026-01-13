<?php
// Core setup, functions, and database connection
require_once 'functions.php';
require_once 'db.php';

// Redirect if not logged in
if (!isset($_SESSION['customer_id'])) {
    header('Location: login.php');
    exit;
}

$customer_id = $_SESSION['customer_id'];

// Fetch customer details
$stmt = $pdo->prepare("SELECT * FROM customers WHERE id = :customer_id");
$stmt->execute(['customer_id' => $customer_id]);
$customer = $stmt->fetch();

// If for some reason customer is not found, log them out.
if (!$customer) {
    header('Location: logout.php');
    exit;
}


$page_title = "My Profile";
?>
<!DOCTYPE html>
<html lang="<?= escape_html($_SESSION['lang']) ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $page_title ?> - <?= L($LANG, 'site_name') ?></title>
    
    <!-- Dependencies -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>

    <?php include '_header.php'; ?>

    <main class="container my-5">
        <div class="row justify-content-center">
            <div class="col-lg-8">
                <div class="card shadow-sm">
                    <div class="card-header p-3">
                        <h3 class="mb-0"><?= $page_title ?></h3>
                    </div>
                    <div class="card-body p-4">
                        <div class="list-group">
                            <div class="list-group-item">
                                <strong class="d-block">First Name</strong>
                                <p class="mb-0"><?= escape_html($customer['first_name']) ?></p>
                            </div>
                            <div class="list-group-item">
                                <strong class="d-block">Last Name</strong>
                                <p class="mb-0"><?= escape_html($customer['last_name']) ?></p>
                            </div>
                            <div class="list-group-item">
                                <strong class="d-block">Email Address</strong>
                                <p class="mb-0"><?= escape_html($customer['email']) ?></p>
                            </div>
                            <div class="list-group-item">
                                <strong class="d-block">Phone Number</strong>
                                <p class="mb-0"><?= escape_html($customer['phone'] ?? 'Not provided') ?></p>
                            </div>
                            <div class="list-group-item">
                                <strong class="d-block">Member Since</strong>
                                <p class="mb-0"><?= date('d M, Y', strtotime($customer['created_at'])) ?></p>
                            </div>
                        </div>
                        <div class="mt-4 d-flex justify-content-center gap-2">
                            <a href="edit-profile.php" class="btn btn-primary">Edit Profile</a>
                            <a href="change-password.php" class="btn btn-secondary">Change Password</a>
                        </div>
                        <div class="text-center mt-4">
                            <a href="logout.php" class="btn btn-danger">Logout</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <?php include '_footer.php'; ?>
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="assets/js/script.js"></script>
</body>
</html>
