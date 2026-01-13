/*
 * Shri Narayan Traders - Custom JavaScript
 *
 * This file handles client-side interactions, including the AJAX-powered shopping cart and wishlist.
 */

$(document).ready(function() {

    // --- AJAX Add to Cart (from original script.js) ---
    $('.add-to-cart-btn').on('click', function(e) {
        e.preventDefault();

        const productId = $(this).data('product-id');
        const button = $(this);

        $.ajax({
            url: 'cart_handler.php',
            type: 'POST',
            data: {
                action: 'add',
                product_id: productId
            },
            dataType: 'json',
            beforeSend: function() {
                button.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Adding...');
            },
            success: function(response) {
                if (response.success) {
                    updateCartCount(response.cart_count);
                    button.html('<i class="fas fa-check"></i> Added!').removeClass('btn-primary').addClass('btn-success');
                    setTimeout(function() {
                        button.prop('disabled', false).html('<i class="fas fa-cart-plus"></i> Add to Cart').removeClass('btn-success').addClass('btn-primary');
                    }, 2000);
                } else {
                    alert(response.message || 'An error occurred.');
                    button.prop('disabled', false).html('<i class="fas fa-cart-plus"></i> Add to Cart');
                }
            },
            error: function(xhr, status, error) {
                console.error("AJAX Error:", status, error);
                alert('Could not add product to cart. Please try again.');
                button.prop('disabled', false).html('<i class="fas fa-cart-plus"></i> Add to Cart');
            }
        });
    });

    /**
     * Updates the cart count badge in the header.
     */
    function updateCartCount(count) {
        console.log("updateCartCount called with count:", count);
        const cartCountElement = $('.cart-count');
        console.log("Cart count element found:", cartCountElement.length > 0 ? "Yes" : "No", cartCountElement);
        if (cartCountElement.length > 0) {
            cartCountElement.text(count);
            console.log("Cart count element text set to:", count);
        } else {
            console.log("Error: Cart count element not found!");
        }
    }
    
    /**
     * Function to get the initial cart count on page load.
     */
    function getInitialCartCount() {
        $.ajax({
            url: 'cart_handler.php',
            type: 'POST',
            data: { action: 'get_count' },
            dataType: 'json',
            success: function(response) {
                if (response.success) {
                    updateCartCount(response.cart_count);
                }
            },
            error: function(xhr, status, error) {
                console.error("Could not fetch cart count:", status, error);
            }
        });
    }

    // --- AJAX Wishlist Toggle (from original script.js) ---
    $(document).on('click', '.wishlist-btn, .wishlist-btn-lg', function(e) {
        e.preventDefault();
        const productId = $(this).data('product-id');
        const button = $(this);
        const icon = button.find('i');

        $.ajax({
            url: 'handle_wishlist.php',
            type: 'POST',
            data: { product_id: productId },
            dataType: 'json',
            success: function(response) {
                if (response.success) {
                    if (response.action === 'added') {
                        icon.removeClass('far').addClass('fas');
                        button.addClass('active').attr('title', response.message);
                    } else {
                        icon.removeClass('fas').addClass('far');
                        button.removeClass('active').attr('title', response.message);
                    }
                    // Special handling for wishlist page: remove the item from view
                    if (response.action === 'removed' && window.location.pathname.includes('wishlist.php')) {
                        button.closest('.col-lg-3').fadeOut(300);
                    }
                } else {
                    alert(response.message || 'An error occurred with wishlist.');
                    if (response.redirect_login) {
                        window.location.href = 'login.php';
                    }
                }
            },
            error: function() {
                alert('Could not update wishlist. Please try again.');
            }
        });
    });

    // --- Cart Page Specific Logic (from cart.php) ---
    // This code will only run on the cart page since the selectors will only match there.
    if (window.location.pathname.includes('cart.php')) {
        // Function to update item total and subtotal
        function updateCartPageTotals() {
            let subtotal = 0;
            $('tbody tr').each(function() {
                const priceText = $(this).find('td:nth-child(3)').text().replace('₹', '').replace(/,/g, '');
                const price = parseFloat(priceText);
                const quantity = parseInt($(this).find('.quantity-input').val());
                if (!isNaN(price) && !isNaN(quantity)) {
                    const itemTotal = price * quantity;
                    subtotal += itemTotal;
                    $(this).find('.item-total').text('₹' + itemTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ","));
                }
            });
            $('#subtotal-amount').text('₹' + subtotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ","));
        }

        // AJAX function for cart actions
        function handleCartPageAction(action, productId, quantity = null) {
            $.ajax({
                url: 'cart_handler.php',
                type: 'POST',
                data: { action, product_id: productId, quantity },
                dataType: 'json',
                success: function(response) {
                    if (response.success) {
                        updateCartCount(response.cart_count); // Update header cart count
                        if (action === 'remove') {
                            $('#cart-item-' + productId).fadeOut(300, function() {
                                $(this).remove();
                                updateCartPageTotals();
                                // If cart becomes empty, show empty message
                                if ($('tbody tr').length === 0) {
                                    location.reload(); // Simplest way to show the empty cart view
                                }
                            });
                        } else {
                            updateCartPageTotals();
                        }
                    } else {
                        alert(response.message);
                        location.reload(); // Simple refresh to show correct state
                    }
                },
                error: function() {
                    alert('An error occurred. Please try again.');
                    location.reload();
                }
            });
        }

        // Quantity change for +/- buttons
        $('.quantity-change').on('click', function() {
            const productId = $(this).data('product-id');
            const change = parseInt($(this).data('change'));
            const input = $(this).closest('.input-group').find('.quantity-input');
            let newQuantity = parseInt(input.val()) + change;
            if (newQuantity < 1) newQuantity = 1;
            input.val(newQuantity);
            handleCartPageAction('update', productId, newQuantity);
        });

        // Quantity change for direct input (with debounce)
        let debounceTimer;
        $('.quantity-input').on('input', function() {
            clearTimeout(debounceTimer);
            const input = $(this);
            debounceTimer = setTimeout(function() {
                const productId = input.data('product-id');
                let quantity = parseInt(input.val());
                if (isNaN(quantity) || quantity < 1) quantity = 1;
                const maxStock = parseInt(input.attr('max'));
                if (!isNaN(maxStock) && quantity > maxStock) {
                    quantity = maxStock;
                }
                input.val(quantity);
                handleCartPageAction('update', productId, quantity);
            }, 500); // 500ms delay
        });

        // Remove item from cart
        $('.remove-item').on('click', function() {
            const productId = $(this).data('product-id');
            if (confirm('Are you sure you want to remove this item?')) {
                handleCartPageAction('remove', productId);
            }
        });
    }

    // --- Initializations ---
    // Fetch and display the cart count as soon as the page loads.
    getInitialCartCount();

});