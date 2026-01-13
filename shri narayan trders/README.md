# Shri Narayan Traders - A PHP E-commerce Project

**Project for IGNOU BCA (BCSP-064)**

"Shri Narayan Traders" is a fully functional e-commerce web application built with PHP. It is designed to be a comprehensive project that demonstrates key web development concepts, including a secure admin panel, multi-language support, stock management, and a real-feel (but simulated) payment processing system.

## Features

-   **Premium Design**: Modern, responsive design using Bootstrap 5, FontAwesome, and Google Fonts.
-   **Multi-Language Support**: Fully translatable into Hindi and English with a language switcher.
-   **Admin Dashboard**: Secure area to manage products, view orders, and check customer details.
-   **First-Time Admin Setup**: A guided form to create the initial admin account securely.
-   **Product Management (CRUD)**: Easily add, view, update, and delete products. Includes image uploads with a live preview.
-   **AJAX-powered Cart**: Add, update, and remove items from the cart without page reloads for a smooth user experience.
-   **Simulated Payment Gateway**: A professional-looking credit card form that validates and stores data securely (for demonstration purposes) to mimic a real transaction.
-   **Stock Management**: Product stock is automatically reduced when an order is successfully placed.
-   **Secure Codebase**: Built with security in mind, using PDO with prepared statements to prevent SQL injection, password hashing, and CSRF protection.

## Folder Structure

```
shri_narayan_traders/
├── admin/            # Admin panel files
├── assets/           # CSS, JS, Images, and Uploads
├── lang/             # Language files (en.php, hi.php)
├── config.php        # Database and site configuration
├── db.php            # Secure PDO database connection handler
├── database.sql      # SQL dump for all tables and sample data
├── index.php         # Main home page
├── cart.php          # Shopping cart page
├── checkout.php      # Checkout and payment page
└── ... and other PHP files
```

## How to Set Up and Run

### Prerequisites

1.  **Web Server**: A local web server environment like XAMPP, WAMP, or MAMP.
2.  **PHP**: Version 8.0 or higher.
3.  **MySQL/MariaDB**: A database server, usually included with the web server package.
4.  **Web Browser**: A modern web browser like Chrome, Firefox, or Edge.

### Installation Steps

1.  **Download/Clone**: Place the `shri_narayan_traders` folder inside your web server's root directory (e.g., `C:/xampp/htdocs/`).

2.  **Import the Database**:
    *   Open `phpMyAdmin` from your server's control panel (e.g., `http://localhost/phpmyadmin`).
    *   Create a new database named `shri_narayan_traders`.
    *   Select the newly created database.
    *   Go to the `Import` tab.
    *   Click `Choose File` and select the `database.sql` file from the project's root directory.
    *   Click `Go` at the bottom to start the import. This will create all the necessary tables and populate them with sample data.

3.  **Configure the Application**:
    *   Open the `config.php` file in a code editor.
    *   Verify the database credentials (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`). By default, they are set for a standard XAMPP setup (`user: 'root'`, `password: ''`).
    *   Ensure the `BASE_URL` is correct for your setup. If you placed the project in `htdocs/shri_narayan_traders`, the URL `http://localhost/shri_narayan_traders/` should be correct.

4.  **Run the Application**:
    *   Open your web browser and navigate to the `BASE_URL` (e.g., `http://localhost/shri_narayan_traders/`).
    *   The home page should load with sample products.

5.  **Set Up the Admin Account**:
    *   Navigate to the admin area: `http://localhost/shri_narayan_traders/admin/`.
    *   Since no admin account exists, you will be automatically redirected to `admin/setup.php`.
    *   Fill out the form to create your first admin user.
    *   After successful creation, you will be redirected to the admin login page. Use your new credentials to log in and access the dashboard.

## Future Launch (Production Server)

To deploy this project on a live server, follow these best practices:

1.  **Secure Configuration**: Move the `config.php` file (or at least the credentials within it) outside the public web root. Use environment variables to store sensitive data like database credentials and the `SECRET_KEY`.
2.  **Disable Error Display**: In `config.php`, set `error_reporting(0);` and `ini_set('display_errors', 0);` to prevent leaking server path information.
3.  **Use a Real Payment Gateway**: The current credit card form is for demonstration only. **DO NOT** use it in production. Replace it with a trusted payment gateway provider like **Stripe** or **Razorpay**. Their SDKs provide secure, PCI-compliant methods for handling payments.
4.  **HTTPS**: Install an SSL certificate on your server to enable `https` and encrypt all traffic between the client and the server.
5.  **Permissions**: Set appropriate file permissions to prevent unauthorized file modifications. `uploads` folders should be writable by the server, but scripts should not be executable from them.

---
*This project is for educational purposes.*
