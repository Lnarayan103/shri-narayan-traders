<?php
require_once 'functions.php';
require_once 'db.php'; // Included for the header

$page_title = "Privacy Policy";
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

                    <p>This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You.</p>
                    
                    <p>We use Your Personal data to provide and improve the Service. By using the Service, You agree to the collection and use of information in accordance with this Privacy Policy. This Privacy Policy has been created with the help of a Privacy Policy Generator.</p>

                    <h4 class="mt-4">Collecting and Using Your Personal Data</h4>
                    <h5>Types of Data Collected</h5>
                    <p><strong>Personal Data:</strong> While using Our Service, We may ask You to provide Us with certain personally identifiable information that can be used to contact or identify You. Personally identifiable information may include, but is not limited to: Email address, First name and last name, Phone number, Address, State, ZIP/Postal code, City.</p>
                    
                    <h4 class="mt-4">Use of Your Personal Data</h4>
                    <p>The Company may use Personal Data for the following purposes:</p>
                    <ul>
                        <li>To provide and maintain our Service, including to monitor the usage of our Service.</li>
                        <li>To manage Your Account: to manage Your registration as a user of the Service.</li>
                        <li>For the performance of a contract: the development, compliance and undertaking of the purchase contract for the products, items or services You have purchased.</li>
                        <li>To contact You: To contact You by email, telephone calls, SMS, or other equivalent forms of electronic communication.</li>
                    </ul>

                    <h4 class="mt-4">Contact Us</h4>
                    <p>If you have any questions about this Privacy Policy, You can contact us at:</p>
                    <p><strong>Name:</strong> Lalit Narayan</p>
                    <p><strong>Phone:</strong> +91 8586071918</p>

                </div>
            </div>
        </div>
    </main>

    <?php include '_footer.php'; ?>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
