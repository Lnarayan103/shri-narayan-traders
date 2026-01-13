<?php
require_once 'functions.php';
require_once 'db.php'; // Included for the header

$page_title = "Terms and Conditions";
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
                <div class="card shadow-sm p-4">
                    <h1 class="text-center mb-4"><?= $page_title ?></h1>
                    
                    <p><strong>Last updated: January 09, 2026</strong></p>

                    <p>Please read these terms and conditions carefully before using Our Service.</p>

                    <h4 class="mt-4">Acknowledgement</h4>
                    <p>These are the Terms and Conditions governing the use of this Service and the agreement that operates between You and the Company. These Terms and Conditions set out the rights and obligations of all users regarding the use of the Service.</p>
                    <p>Your access to and use of the Service is conditioned on Your acceptance of and compliance with these Terms and Conditions. These Terms and Conditions apply to all visitors, users and others who access or use the Service.</p>

                    <h4 class="mt-4">Placing Orders for Goods</h4>
                    <p>By placing an Order for Goods through the Service, You warrant that You are legally capable of entering into binding contracts.</p>

                    <h4 class="mt-4">"AS IS" and "AS AVAILABLE" Disclaimer</h4>
                    <p>The Service is provided to You "AS IS" and "AS AVAILABLE" and with all faults and defects without warranty of any kind. To the maximum extent permitted under applicable law, the Company, on its own behalf and on behalf of its Affiliates and its and their respective licensors and service providers, expressly disclaims all warranties, whether express, implied, statutory or otherwise, with respect to the Service.</p>
                    
                    <h4 class="mt-4">Contact Us</h4>
                    <p>If you have any questions about these Terms and Conditions, You can contact us.</p>
                </div>
            </div>
        </div>
    </main>

    <?php include '_footer.php'; ?>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
