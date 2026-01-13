<?php
// Core setup, functions, and database connection
require_once 'functions.php';
require_once 'db.php';

// --- SECURITY CHECKS ---
// 1. Redirect if not logged in
if (!isset($_SESSION['customer_id'])) {
    // Save the checkout page URL to redirect back after login
    header('Location: login.php?redirect_to=checkout.php');
    exit;
}

// 2. Redirect if cart is empty
if (empty($_SESSION['cart'])) {
    header('Location: index.php');
    exit;
}

// Fetch customer details to pre-fill the form
$stmt = $pdo->prepare("SELECT * FROM customers WHERE id = :id");
$stmt->execute(['id' => $_SESSION['customer_id']]);
$customer = $stmt->fetch();

// --- FETCH CART SUMMARY ---
$cart_items = [];
$subtotal = 0;
$product_ids = array_keys($_SESSION['cart']);
$placeholders = implode(',', array_fill(0, count($product_ids), '?'));
$sql = "SELECT ProductId, ProductName, ProductPrice FROM product WHERE ProductId IN ($placeholders)";
$stmt = $pdo->prepare($sql);
    $stmt->execute($product_ids);
    $products_from_db = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $products = [];
    foreach ($products_from_db as $p) {
        $products[$p['ProductId']] = $p;
    }
foreach ($_SESSION['cart'] as $product_id => $quantity) {
    if (isset($products[$product_id])) {
        $subtotal += $products[$product_id]['ProductPrice'] * $quantity;
    }
}
?>
<!DOCTYPE html>
<html lang="<?= escape_html($_SESSION['lang']) ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= L($LANG, 'checkout') ?> - <?= L($LANG, 'site_name') ?></title>
    
    <!-- Dependencies -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>

    <!-- Header -->
    <?php include '_header.php'; ?>

    <!-- Main Content -->
    <main class="container my-5">
        <div class="row g-5">
            <!-- Order Summary -->
            <div class="col-md-5 col-lg-4 order-md-last">
                <h4 class="d-flex justify-content-between align-items-center mb-3">
                    <span class="text-primary"><?= L($LANG, 'order_summary') ?></span>
                    <span class="badge bg-primary rounded-pill"><?= count($_SESSION['cart']) ?></span>
                </h4>
                <ul class="list-group mb-3">
                    <?php
                    foreach ($_SESSION['cart'] as $product_id => $quantity):
                        if (isset($products[$product_id])):
                            $product = $products[$product_id];
                    ?>
                        <li class="list-group-item d-flex justify-content-between lh-sm">
                            <div>
                                <h6 class="my-0"><?= escape_html($product['ProductName']) ?></h6>
                                <small class="text-muted">Quantity: <?= $quantity ?></small>
                            </div>
                            <span class="text-muted">₹<?= number_format($product['ProductPrice'] * $quantity, 2) ?></span>
                        </li>
                    <?php endif; endforeach; ?>
                    <li class="list-group-item d-flex justify-content-between">
                        <span><?= L($LANG, 'total') ?> (INR)</span>
                        <strong>₹<?= number_format($subtotal, 2) ?></strong>
                    </li>
                </ul>
            </div>

            <!-- Checkout Form -->
            <div class="col-md-7 col-lg-8">
                <h4 class="mb-3"><?= L($LANG, 'shipping_address') ?></h4>
                <form action="place_order.php" method="POST" class="needs-validation" novalidate>
                    <input type="hidden" name="csrf_token" value="<?= escape_html($_SESSION['csrf_token']) ?>">

                    <div class="row g-3">
                        <div class="col-12">
                            <label for="fullName" class="form-label"><?= L($LANG, 'full_name') ?></label>
                            <input type="text" class="form-control" id="fullName" name="full_name" value="<?= escape_html($customer['first_name'] . ' ' . $customer['last_name']) ?>" required>
                            <div class="invalid-feedback">A valid full name is required.</div>
                        </div>

                        <div class="col-12">
                            <label for="email" class="form-label"><?= L($LANG, 'email_address') ?></label>
                            <input type="email" class="form-control" id="email" name="email" value="<?= escape_html($customer['email']) ?>" required>
                            <div class="invalid-feedback">Please enter a valid email address for shipping updates.</div>
                        </div>
                        
                        <div class="col-12">
                            <label for="phone" class="form-label"><?= L($LANG, 'phone_number') ?></label>
                            <input type="tel" class="form-control" id="phone" name="phone" value="<?= escape_html($customer['phone'] ?? '') ?>" required>
                            <div class="invalid-feedback">Please enter a valid phone number.</div>
                        </div>

                        <div class="col-12">
                            <label for="address" class="form-label"><?= L($LANG, 'address') ?></label>
                            <input type="text" class="form-control" id="address" name="address" placeholder="1234 Main St" required>
                            <div class="invalid-feedback">Please enter your shipping address.</div>
                        </div>

                        <div class="col-md-5">
                            <label for="city" class="form-label"><?= L($LANG, 'city') ?></label>
                            <input type="text" class="form-control" id="city" name="city" required>
                            <div class="invalid-feedback">City required.</div>
                        </div>

                        <div class="col-md-4">
                            <label for="state" class="form-label"><?= L($LANG, 'state') ?></label>
                            <input type="text" class="form-control" id="state" name="state" required>
                            <div class="invalid-feedback">State required.</div>
                        </div>

                        <div class="col-md-3">
                            <label for="zip" class="form-label"><?= L($LANG, 'zip_code') ?></label>
                            <input type="text" class="form-control" id="zip" name="zip" required>
                            <div class="invalid-feedback">ZIP code required.</div>
                        </div>
                    </div>

                    <hr class="my-4">

                    <h4 class="mb-3"><?= L($LANG, 'payment_method') ?></h4>

                    <div class="my-3">
                        <div class="form-check">
                            <input id="credit" name="paymentMethod" type="radio" class="form-check-input" value="Credit Card" checked required>
                            <label class="form-check-label" for="credit">Credit/Debit card</label>
                        </div>
                        <div class="form-check">
                            <input id="upi" name="paymentMethod" type="radio" class="form-check-input" value="UPI" required>
                            <label class="form-check-label" for="upi">UPI</label>
                        </div>
                        <div class="form-check">
                            <input id="netbanking" name="paymentMethod" type="radio" class="form-check-input" value="Net Banking" required>
                            <label class="form-check-label" for="netbanking">Net Banking</label>
                        </div>
                        <div class="form-check">
                            <input id="cod" name="paymentMethod" type="radio" class="form-check-input" value="Cash on Delivery" required>
                            <label class="form-check-label" for="cod">Cash on Delivery</label>
                        </div>
                    </div>

                    <!-- Payment Details Forms -->
                    <div id="payment-details">
                        <!-- Credit Card Form -->
                        <div id="credit_card_form" class="payment-form">
                            <p class="small text-muted">For project demonstration. Do not enter real card details.</p>
                            <div class="row gy-3 mt-2">
                                <div class="col-md-6">
                                    <label for="cc-type" class="form-label"><?= L($LANG, 'card_type') ?></label>
                                    <select class="form-select" id="cc-type" name="card_type">
                                        <option value=""><?= L($LANG, 'select_card_type') ?></option>
                                        <option value="Visa"><?= L($LANG, 'visa') ?></option>
                                        <option value="Mastercard"><?= L($LANG, 'mastercard') ?></option>
                                        <option value="Rupay"><?= L($LANG, 'rupay') ?></option>
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label for="cc-number" class="form-label"><?= L($LANG, 'card_number') ?></label>
                                    <input type="text" class="form-control" id="cc-number" name="card_number" placeholder="xxxx-xxxx-xxxx-xxxx">
                                </div>
                                <div class="col-md-6">
                                    <label for="cc-expiration" class="form-label">Expiration</label>
                                    <input type="text" class="form-control" id="cc-expiration" name="cc_expiration" placeholder="MM/YY">
                                </div>
                                <div class="col-md-6">
                                    <label for="cc-cvv" class="form-label"><?= L($LANG, 'cvv') ?></label>
                                    <input type="text" class="form-control" id="cc-cvv" name="cvv" placeholder="xxx">
                                </div>
                            </div>
                        </div>

                        <!-- UPI Form -->
                        <div id="upi_form" class="payment-form" style="display: none;">
                            <label for="upi_id" class="form-label">Your UPI ID</label>
                            <input type="text" class="form-control" id="upi_id" name="upi_id" placeholder="yourname@bank">
                            <p class="small text-muted mt-2">A payment request will be sent to this UPI ID (simulation).</p>
                        </div>

                        <!-- Net Banking Form -->
                        <div id="netbanking_form" class="payment-form" style="display: none;">
                            <label for="bank_select" class="form-label">Select Your Bank</label>
                            <select class="form-select" id="bank_select" name="net_banking_bank">
                                <option>State Bank of India</option>
                                <option>HDFC Bank</option>
                                <option>ICICI Bank</option>
                                <option>Axis Bank</option>
                                <option>Punjab National Bank</option>
                            </select>
                            <p class="small text-muted mt-2">You will be redirected to your bank's portal to complete the payment (simulation).</p>
                        </div>

                        <!-- COD Form -->
                        <div id="cod_form" class="payment-form" style="display: none;">
                            <p class="alert alert-info">You have selected Cash on Delivery. You can pay at the time of delivery.</p>
                        </div>
                    </div>

                    <hr class="my-4">

                    <button class="w-100 btn btn-primary btn-lg" type="submit"><?= L($LANG, 'place_order') ?></button>
                </form>
            </div>
        </div>
    </main>

    <?php include '_footer.php'; ?>
    
    <!-- JS Dependencies -->
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="assets/js/script.js"></script>
    <script>
    // Bootstrap form validation
    (function () {
        'use strict'
        var forms = document.querySelectorAll('.needs-validation')
        Array.prototype.slice.call(forms)
            .forEach(function (form) {
                form.addEventListener('submit', function (event) {
                    if (!form.checkValidity()) {
                        event.preventDefault()
                        event.stopPropagation()
                    }
                    form.classList.add('was-validated')
                }, false)
            })
    })();

    // Payment method toggling
    document.querySelectorAll('input[name="paymentMethod"]').forEach(function(elem) {
        elem.addEventListener('change', function(event) {
            var selectedMethod = event.target.value;
            document.querySelectorAll('.payment-form').forEach(function(form) {
                form.style.display = 'none';
            });
            if (selectedMethod === 'Credit Card') {
                document.getElementById('credit_card_form').style.display = 'block';
            } else if (selectedMethod === 'UPI') {
                document.getElementById('upi_form').style.display = 'block';
            } else if (selectedMethod === 'Net Banking') {
                document.getElementById('netbanking_form').style.display = 'block';
            } else if (selectedMethod === 'Cash on Delivery') {
                document.getElementById('cod_form').style.display = 'block';
            }
        });
    });
    </script>
</body>
</html>
