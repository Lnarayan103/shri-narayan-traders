const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const productController = require('../controllers/productController');
const orderController = require('../controllers/orderController');
const miscController = require('../controllers/miscController');
const adminController = require('../controllers/adminController');
const settingsController = require('../controllers/settingsController');
const systemController = require('../controllers/systemController');
const aiController = require('../controllers/aiController');
const quotationController = require('../controllers/quotationController');
const enterpriseController = require('../controllers/enterpriseController');
const { softDelete, restore, listTrash } = require('../utils/softDelete');
const db = require('../config/db');
const { authenticate, requireAdmin, requireCustomer, checkRole } = require('../middleware/auth');
const upload = require('../utils/uploader');

// Auth API
router.post('/auth/login', authController.login);
router.post('/auth/google', authController.googleLogin);

router.post('/auth/send-otp', authController.sendOtp);
router.post('/auth/verify-otp', authController.verifyOtpOnly);
router.post('/auth/register-otp', authController.registerWithOtp);
router.post('/auth/reset-password', authController.resetPasswordWithOtp);

router.post('/auth/register', authController.customerRegister);
router.post('/auth/customer-login', authController.customerLogin);
router.post('/auth/login-otp', authController.loginWithOtp);
router.get('/auth/logout', authController.logout);
router.post('/auth/logout', authController.logout);
router.put('/auth/change-password', authenticate, requireAdmin, authController.changePassword);
router.get('/auth/me', authenticate, authController.getMe);
router.put('/auth/profile', authenticate, requireCustomer, authController.updateProfile);

// Products API
router.get('/products', productController.getProducts);
router.get('/products/:id', productController.getProductById);
router.post('/products', authenticate, requireAdmin, checkRole(['admin', 'super-admin', 'manager']), upload.single('image'), productController.createProduct);
router.put('/products/:id', authenticate, requireAdmin, checkRole(['admin', 'super-admin', 'manager']), upload.single('image'), productController.updateProduct);
router.delete('/products/:id', authenticate, requireAdmin, checkRole(['admin', 'super-admin', 'manager']), productController.deleteProduct);

// Orders API
router.post('/orders', authenticate, orderController.placeOrder);
router.get('/orders/all', authenticate, requireAdmin, orderController.getAllOrders);
router.get('/orders/track', orderController.trackOrder);
router.get('/orders/track/:orderId', orderController.trackOrder);
router.get('/orders/:id', authenticate, orderController.getOrderById);
router.put('/orders/:id/status', authenticate, requireAdmin, orderController.updateOrderStatus);
router.get('/orders/:id/invoice', authenticate, orderController.printGSTInvoice);
router.get('/orders/public-invoice/:orderId', async (req, res) => {
  try {
    const db = require('../config/db');
    const orderId = String(req.params.orderId).trim().toUpperCase();
    const order = await db.orders.findOne({ orderId });
    if (!order) return res.status(404).send('Order not found');
    req.params.id = order._id;
    return orderController.printGSTInvoice(req, res);
  } catch(e) {
    return res.status(500).send('Server error: ' + e.message);
  }
});

// Enquiries API
router.post('/enquiries', miscController.createEnquiry);
router.get('/enquiries', authenticate, requireAdmin, checkRole(['admin', 'super-admin', 'manager']), miscController.getEnquiries);
router.patch('/enquiries/:id/status', authenticate, requireAdmin, checkRole(['admin', 'super-admin', 'manager']), miscController.updateEnquiryStatus);
router.delete('/enquiries/:id', authenticate, requireAdmin, checkRole(['admin', 'super-admin', 'manager']), miscController.deleteEnquiry);

// Gallery API
router.get('/gallery', miscController.getGallery);
router.post('/gallery', authenticate, requireAdmin, checkRole(['admin', 'super-admin', 'manager']), upload.single('image'), miscController.addToGallery);
router.delete('/gallery/:id', authenticate, requireAdmin, checkRole(['admin', 'super-admin', 'manager']), miscController.deleteGalleryItem);

// Offers API
router.get('/offers', miscController.getOffers);
router.get('/offers/:id', miscController.getOfferById);
router.post('/offers', authenticate, requireAdmin, checkRole(['admin', 'super-admin', 'manager']), miscController.createOffer);
router.put('/offers/:id', authenticate, requireAdmin, checkRole(['admin', 'super-admin', 'manager']), miscController.updateOffer);
router.delete('/offers/:id', authenticate, requireAdmin, checkRole(['admin', 'super-admin', 'manager']), miscController.deleteOffer);

// Settings API
router.get('/settings', settingsController.getSettings);
router.put('/settings', authenticate, requireAdmin, checkRole(['admin', 'super-admin']), settingsController.updateSettings);
router.post('/settings/test-email', authenticate, requireAdmin, settingsController.sendTestEmail);

// Reviews API
router.get('/reviews', settingsController.getReviews);
router.post('/reviews', settingsController.createReview);
router.put('/reviews/:id/approve', authenticate, requireAdmin, checkRole(['admin', 'super-admin', 'manager']), settingsController.approveReview);
router.delete('/reviews/:id', authenticate, requireAdmin, checkRole(['admin', 'super-admin', 'manager']), settingsController.deleteReview);

// Admin stats & customers
router.get('/admin/stats', authenticate, requireAdmin, adminController.getStats);
router.get('/admin/customers', authenticate, requireAdmin, checkRole(['admin', 'super-admin', 'manager']), adminController.getCustomers);

// System Administration APIs
router.get('/system/logs', authenticate, requireAdmin, checkRole(['admin', 'super-admin']), systemController.getLogs);
router.delete('/system/logs', authenticate, requireAdmin, checkRole(['admin', 'super-admin']), systemController.clearLogs);
router.get('/system/backup', authenticate, requireAdmin, checkRole(['admin', 'super-admin']), systemController.downloadBackup);
router.post('/system/restore', authenticate, requireAdmin, checkRole(['admin', 'super-admin']), upload.single('backup'), systemController.restoreBackup);
router.get('/system/staff', authenticate, requireAdmin, checkRole(['admin', 'super-admin']), systemController.getStaff);
router.post('/system/staff', authenticate, requireAdmin, checkRole(['admin', 'super-admin']), systemController.createStaff);
router.delete('/system/staff/:id', authenticate, requireAdmin, checkRole(['admin', 'super-admin']), systemController.deleteStaff);

// AI-powered product description generator API
router.post('/ai/generate-product-details', authenticate, requireAdmin, aiController.generateProductDetails);


// Quotations
router.get('/quotations', authenticate, requireAdmin, quotationController.listQuotations);
router.post('/quotations', authenticate, requireAdmin, quotationController.createQuotation);
router.get('/quotations/:id', authenticate, requireAdmin, quotationController.getQuotation);
router.put('/quotations/:id/status', authenticate, requireAdmin, quotationController.updateQuotationStatus);
router.delete('/quotations/:id', authenticate, requireAdmin, quotationController.softDeleteQuotation);
router.get('/quotations/:id/pdf', authenticate, requireAdmin, quotationController.printQuotationPDF);

// Soft-delete / Recycle Bin
router.get('/admin/trash', authenticate, requireAdmin, checkRole(['admin', 'super-admin', 'manager']), async (req, res) => {
  try {
    const [products, orders, quotations, suppliers, purchases, expenses, jobworks, deliveries] = await Promise.all([
      listTrash(db.products),
      listTrash(db.orders),
      listTrash(db.quotations),
      listTrash(db.suppliers),
      listTrash(db.purchases),
      listTrash(db.expenses),
      listTrash(db.jobworks),
      listTrash(db.deliveries)
    ]);
    res.json({ success: true, data: { products, orders, quotations, suppliers, purchases, expenses, jobworks, deliveries } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router.post('/admin/trash/:collection/:id/restore', authenticate, requireAdmin, checkRole(['admin', 'super-admin']), async (req, res) => {
  try {
    const map = { products: db.products, orders: db.orders, quotations: db.quotations, suppliers: db.suppliers, purchases: db.purchases, expenses: db.expenses, jobworks: db.jobworks, deliveries: db.deliveries };
    const col = map[req.params.collection];
    if (!col) return res.status(400).json({ error: 'Invalid collection' });
    await restore(col, req.params.id);
    res.json({ success: true, message: 'Restored' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Manual daily backup trigger
router.post('/admin/backup/run-daily', authenticate, requireAdmin, checkRole(['admin', 'super-admin']), async (req, res) => {
  try {
    const { createDailyBackup } = require('../utils/dailyBackup');
    const result = await createDailyBackup();
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// ── Enterprise modules ──
router.get('/suppliers', authenticate, requireAdmin, enterpriseController.listSuppliers);
router.post('/suppliers', authenticate, requireAdmin, checkRole(['admin','super-admin','manager']), enterpriseController.createSupplier);
router.put('/suppliers/:id', authenticate, requireAdmin, checkRole(['admin','super-admin','manager']), enterpriseController.updateSupplier);
router.delete('/suppliers/:id', authenticate, requireAdmin, checkRole(['admin','super-admin','manager']), enterpriseController.deleteSupplier);

router.get('/purchases', authenticate, requireAdmin, enterpriseController.listPurchases);
router.post('/purchases', authenticate, requireAdmin, checkRole(['admin','super-admin','manager']), enterpriseController.createPurchase);
router.delete('/purchases/:id', authenticate, requireAdmin, checkRole(['admin','super-admin','manager']), enterpriseController.deletePurchase);

router.get('/expenses', authenticate, requireAdmin, enterpriseController.listExpenses);
router.post('/expenses', authenticate, requireAdmin, checkRole(['admin','super-admin','manager']), enterpriseController.createExpense);
router.delete('/expenses/:id', authenticate, requireAdmin, checkRole(['admin','super-admin','manager']), enterpriseController.deleteExpense);

router.get('/jobworks', authenticate, requireAdmin, enterpriseController.listJobworks);
router.post('/jobworks', authenticate, requireAdmin, checkRole(['admin','super-admin','manager']), enterpriseController.createJobwork);
router.put('/jobworks/:id/status', authenticate, requireAdmin, enterpriseController.updateJobworkStatus);
router.delete('/jobworks/:id', authenticate, requireAdmin, checkRole(['admin','super-admin','manager']), enterpriseController.deleteJobwork);

router.get('/deliveries', authenticate, requireAdmin, enterpriseController.listDeliveries);
router.post('/deliveries', authenticate, requireAdmin, enterpriseController.createDelivery);
router.put('/deliveries/:id/status', authenticate, requireAdmin, enterpriseController.updateDeliveryStatus);
router.delete('/deliveries/:id', authenticate, requireAdmin, checkRole(['admin','super-admin','manager']), enterpriseController.deleteDelivery);

router.get('/attendance', authenticate, requireAdmin, enterpriseController.listAttendance);
router.post('/attendance', authenticate, requireAdmin, enterpriseController.markAttendance);

router.get('/reports/gst', authenticate, requireAdmin, enterpriseController.gstReport);
router.get('/reports/sales', authenticate, requireAdmin, enterpriseController.salesReport);

// Database Diagnostics Route
router.get('/db-status', (req, res) => {
  const maskUri = (uri) => {
    if (!uri) return 'not set';
    return uri.replace(/:([^@]+)@/, ':****@');
  };
  res.json({
    success: true,
    usingMongo: db.usingMongo,
    lastError: db.lastError || null,
    mongodbUri: maskUri(process.env.MONGODB_URI)
  });
});

module.exports = router;
