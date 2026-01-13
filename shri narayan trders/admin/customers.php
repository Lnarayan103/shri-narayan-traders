<?php
require_once '_check_login.php';
require_once '../db.php';
require_once '../functions.php';

// Fetch all customers
$stmt = $pdo->query("SELECT id, first_name, last_name, email, phone, created_at FROM customers ORDER BY created_at DESC");
$customers = $stmt->fetchAll();

$page_title = "Manage Customers";
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <?php include '_header_includes.php'; ?>
    <link href="https://cdn.datatables.net/1.13.6/css/dataTables.bootstrap5.min.css" rel="stylesheet">
</head>
<body class="sb-nav-fixed">
    <?php include '_navbar.php'; ?>
    <div id="layoutSidenav">
        <?php include '_sidebar.php'; ?>
        <div id="layoutSidenav_content">
            <main>
                <div class="container-fluid px-4">
                    <h1 class="mt-4"><?= $page_title ?></h1>
                    <ol class="breadcrumb mb-4">
                        <li class="breadcrumb-item"><a href="dashboard.php">Dashboard</a></li>
                        <li class="breadcrumb-item active">Customers</li>
                    </ol>

                    <div class="card mb-4">
                        <div class="card-header"><i class="fas fa-users me-1"></i>All Registered Customers</div>
                        <div class="card-body">
                            <table id="customersTable" class="table table-bordered table-striped">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Phone</th>
                                        <th>Registration Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach($customers as $customer): ?>
                                        <tr>
                                            <td><?= escape_html($customer['id']) ?></td>
                                            <td><?= escape_html($customer['first_name'] . ' ' . $customer['last_name']) ?></td>
                                            <td><?= escape_html($customer['email']) ?></td>
                                            <td><?= escape_html($customer['phone'] ?? 'N/A') ?></td>
                                            <td><?= date('d M, Y', strtotime($customer['created_at'])) ?></td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
            <?php include '_footer.php'; ?>
        </div>
    </div>
    <?php include '_footer_includes.php'; ?>
    <script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.6/js/dataTables.bootstrap5.min.js"></script>
    <script>
        $(document).ready(function() {
            $('#customersTable').DataTable({ "order": [[ 4, "desc" ]] });
        });
    </script>
</body>
</html>
