<?php
/**
 * Shri Narayan Traders - Common Footer for User-Facing Pages
 *
 * This file contains the standard footer HTML for all public-facing pages.
 * It also includes links to important pages like Customer Support.
 */
?>
<footer class="bg-dark text-white text-center p-3 mt-auto">
    <div class="container">
        <p>&copy; <?= date('Y') ?> <?= L($LANG, 'site_name') ?>. All Rights Reserved.</p>
        <p class="mb-0">
            <a href="support.php" class="text-white text-decoration-none mx-2"><?= L($LANG, 'customer_support') ?></a> |
            <a href="privacy.php" class="text-white text-decoration-none mx-2">Privacy Policy</a> |
            <a href="terms.php" class="text-white text-decoration-none mx-2">Terms & Conditions</a>
        </p>
    </div>
</footer>
