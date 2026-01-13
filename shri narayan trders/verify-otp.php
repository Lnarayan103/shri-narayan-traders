<?php
require_once 'functions.php';
require_once 'db.php';

$errors = [];
$simulated_otp = $_GET['simulated_otp'] ?? ''; // Get the OTP from URL for display

if (!isset($_SESSION['otp_verification'])) {
    // If someone tries to access this page directly, redirect them.
    header('Location: register.php');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $entered_otp = $_POST['otp'] ?? '';
    $session_otp_data = $_SESSION['otp_verification'];

    if (time() > $session_otp_data['expires_at']) {
        $errors[] = "OTP has expired. Please try again.";
        unset($_SESSION['otp_verification']);
    } elseif ($entered_otp != $session_otp_data['otp']) {
        $errors[] = L($LANG, 'invalid_otp');
    } else {
        // OTP is correct, move to the next step
        $_SESSION['registration_step'] = 'complete_profile';
        // Store the verified identifier to use on the next page
        $_SESSION['registration_identifier'] = [
            'type' => $session_otp_data['identifier_type'],
            'value' => $session_otp_data['identifier_value']
        ];
        unset($_SESSION['otp_verification']);
        header('Location: complete-registration.php');
        exit;
    }
}


$page_title = L($LANG, 'verify_otp');
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
                        <p class="text-center text-muted">Enter the OTP shown on screen.</p>
                        
                        <!-- OTP Simulation Display -->
                        <div class="alert alert-info text-center">
                            <strong>Your OTP is: <?= escape_html($simulated_otp) ?></strong><br>
                            <small>(For demo only. In a real app, this would be sent via SMS)</small>
                        </div>

                        <?php if (!empty($errors)): ?>
                            <div class="alert alert-danger">
                                <?php foreach ($errors as $error) echo "<p class='mb-0'>$error</p>"; ?>
                            </div>
                        <?php endif; ?>

                        <form action="verify-otp.php?simulated_otp=<?= escape_html($simulated_otp) ?>" method="POST">
                            <div class="mb-3">
                                <label for="otp" class="form-label"><?= L($LANG, 'enter_otp') ?></label>
                                <input type="number" class="form-control" id="otp" name="otp" required>
                            </div>
                            <div class="d-grid">
                                <button type="submit" class="btn btn-primary btn-lg"><?= L($LANG, 'verify_otp') ?></button>
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
