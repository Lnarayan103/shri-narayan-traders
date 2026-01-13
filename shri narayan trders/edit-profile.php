<?php
require_once 'functions.php';
require_once 'db.php';

// Redirect if not logged in
if (!isset($_SESSION['customer_id'])) {
    header('Location: login.php');
    exit;
}

$customer_id = $_SESSION['customer_id'];
$errors = [];
$success_message = '';

// Fetch current customer details
$stmt = $pdo->prepare("SELECT * FROM customers WHERE id = :customer_id");
$stmt->execute(['customer_id' => $customer_id]);
$customer = $stmt->fetch();

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_POST['csrf_token']) || !verify_csrf_token($_POST['csrf_token'])) {
        $errors[] = 'Invalid request.';
    } else {
        $first_name = trim($_POST['first_name'] ?? '');
        $last_name = trim($_POST['last_name'] ?? '');
        $phone = trim($_POST['phone'] ?? '');

        if (empty($first_name) || empty($last_name)) {
            $errors[] = "First and Last name are required.";
        }

        if (empty($errors)) {
            $update_stmt = $pdo->prepare("UPDATE customers SET first_name = :first_name, last_name = :last_name, phone = :phone WHERE id = :customer_id");
            $update_stmt->execute([
                'first_name' => $first_name,
                'last_name' => $last_name,
                'phone' => $phone,
                'customer_id' => $customer_id
            ]);
            $success_message = "Profile updated successfully!";
            // Re-fetch customer data to show updated info
            $stmt->execute(['customer_id' => $customer_id]);
            $customer = $stmt->fetch();
        }
    }
}

$page_title = "Edit Profile";
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
            <div class="col-lg-8">
                <div class="card shadow-sm">
                    <div class="card-header p-3"><h3 class="mb-0"><?= $page_title ?></h3></div>
                    <div class="card-body p-4">
                        <?php if (!empty($errors)): ?>
                            <div class="alert alert-danger"><?php foreach ($errors as $error) echo "<p class='mb-0'>$error</p>"; ?></div>
                        <?php endif; ?>
                        <?php if ($success_message): ?>
                            <div class="alert alert-success"><?= $success_message ?></div>
                        <?php endif; ?>
                        <form action="edit-profile.php" method="POST">
                            <input type="hidden" name="csrf_token" value="<?= escape_html($_SESSION['csrf_token']) ?>">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="first_name" class="form-label">First Name</label>
                                    <input type="text" class="form-control" id="first_name" name="first_name" value="<?= escape_html($customer['first_name']) ?>" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="last_name" class="form-label">Last Name</label>
                                    <input type="text" class="form-control" id="last_name" name="last_name" value="<?= escape_html($customer['last_name']) ?>" required>
                                </div>
                            </div>
                             <div class="mb-3">
                                <label for="email" class="form-label">Email Address</label>
                                <input type="email" class="form-control" id="email" name="email" value="<?= escape_html($customer['email']) ?>" disabled readonly>
                                <div class="form-text">Email address cannot be changed.</div>
                            </div>
                            <div class="mb-3">
                                <label for="phone" class="form-label">Phone Number</label>
                                <input type="tel" class="form-control" id="phone" name="phone" value="<?= escape_html($customer['phone'] ?? '') ?>">
                            </div>
                            <button type="submit" class="btn btn-primary">Save Changes</button>
                            <a href="profile.php" class="btn btn-secondary">Back to Profile</a>
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
