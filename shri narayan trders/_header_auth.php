<?php
/**
 * Shri Narayan Traders - Minimal Header for Auth Pages
 *
 * This file contains a simplified header for login, register, etc.
 * It only shows the site brand and language switcher.
 */
?>
<header class="bg-light shadow-sm">
    <nav class="navbar navbar-expand-lg navbar-light">
        <div class="container">
            <a class="navbar-brand" href="index.php">
                <img src="<?= BASE_URL ?>assets/images/img.jpg" alt="<?= L($LANG, 'site_name') ?>" class="header-logo">
            </a>
            
            <div class="d-flex align-items-center">
                <!-- Language Switcher -->
                <div class="dropdown">
                    <button class="btn btn-outline-secondary dropdown-toggle" type="button" id="languageDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                        <?= $_SESSION['lang'] == 'hi' ? L($LANG, 'lang_switcher_hi') : L($LANG, 'lang_switcher_en') ?>
                    </button>
                    <ul class="dropdown-menu" aria-labelledby="languageDropdown">
                        <li><a class="dropdown-item" href="?lang=en"><?= L($LANG, 'lang_switcher_en') ?></a></li>
                        <li><a class="dropdown-item" href="?lang=hi"><?= L($LANG, 'lang_switcher_hi') ?></a></li>
                    </ul>
                </div>
            </div>
        </div>
    </nav>
</header>