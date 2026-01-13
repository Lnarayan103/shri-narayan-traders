<?php
require_once 'functions.php';
require_once 'db.php';

$page_title = L($LANG, 'customer_support');
?>
<!DOCTYPE html>
<html lang="<?= escape_html($_SESSION['lang']) ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $page_title ?> - <?= L($LANG, 'site_name') ?></title>
    
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
                <div class="card shadow-sm p-4">
                    <h1 class="text-center mb-4"><?= $page_title ?></h1>
                    <div class="text-center">
                        <p class="lead">Feel free to contact us for any queries or support.</p>
                        <hr>
                        <h3>Lalit Narayan</h3>
                        <p class="h5"><i class="fas fa-phone-alt me-2"></i>+91 8586071918</p>
                        <p class="h5"><i class="fas fa-envelope me-2"></i>lalitnarayan@eshop.com</p>
                        <p class="mt-4 text-muted"><small>We are here to help you!</small></p>
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
