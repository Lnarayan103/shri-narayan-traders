const express = require('express');
const router = express.Router();
const db = require('../config/db');
const orderController = require('../controllers/orderController');
const { authenticate, requireAdmin, requireCustomer, checkRole } = require('../middleware/auth');

// Public Pages
router.get('/', authenticate, async (req, res) => {
  try {
    // Increment site visitors counter
    await db.stats.update({ type: 'visitors' }, { $inc: { count: 1 } }, { upsert: true });
    
    const activeOffers = await db.offers.find({ active: true }).sort({ createdAt: -1 });
    const recentProducts = await db.products.find({}).sort({ createdAt: -1 }).limit(6);
    recentProducts.forEach(p => { p.price = p.regularPrice; });
    const approvedReviews = await db.reviews.find({ approved: true }).sort({ createdAt: -1 });
    res.render('index', { activeOffers, recentProducts, approvedReviews, pageTitle: 'Home' });
  } catch (err) {
    console.error('Home route error:', err);
    res.status(500).send('Server Error');
  }
});

router.get('/products', authenticate, async (req, res) => {
  try {
    const { category, search } = req.query;
    const query = {};
    if (category) {
      const catLower = category.trim().toLowerCase();
      if (catLower === 'furniture') {
        query.category = { $in: ['furniture', 'Furniture', 'Home Furniture', 'home furniture'] };
      } else if (catLower === 'hardware') {
        query.category = { $in: ['hardware', 'Hardware'] };
      } else if (catLower === 'office') {
        query.category = { $in: ['office', 'Office Furniture', 'office furniture'] };
      } else if (catLower === 'doors') {
        query.category = { $in: ['doors', 'Aluminium Doors', 'aluminium doors'] };
      } else if (catLower === 'windows') {
        query.category = { $in: ['windows', 'Aluminium Windows', 'aluminium windows'] };
      } else if (catLower === 'tools') {
        query.category = { $in: ['tools', 'Tools'] };
      } else {
        query.category = new RegExp('^' + category.trim() + '$', 'i');
      }
    }
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }
    const products = await db.products.find(query).sort({ createdAt: -1 });
    products.forEach(p => { p.price = p.regularPrice || p.price || 0; });
    res.render('products', { products, category: category || '', search: search || '', pageTitle: 'Products Catalog' });
  } catch (err) {
    console.error('Products catalog route error:', err);
    res.status(500).send('Server Error');
  }
});

router.get('/products/:id', authenticate, async (req, res) => {
  try {
    // Increment specific product views counter
    await db.products.update({ _id: req.params.id }, { $inc: { views: 1 } });
    
    const product = await db.products.findOne({ _id: req.params.id });
    if (!product) return res.status(404).send('Product not found');
    product.price = product.regularPrice;
    
    // Fetch related products in the same category
    const relatedProducts = await db.products.find({ category: product.category, _id: { $ne: product._id } }).limit(3);
    relatedProducts.forEach(p => { p.price = p.regularPrice; });
    
    res.render('product-detail', { product, relatedProducts, pageTitle: product.name });
  } catch (err) {
    console.error('Product detail route error:', err);
    res.status(500).send('Server Error');
  }
});

router.get('/about', authenticate, (req, res) => {
  res.render('about', { pageTitle: 'About Us' });
});

router.get('/services', authenticate, (req, res) => {
  res.render('services', { pageTitle: 'Our Services' });
});

router.get('/gallery', authenticate, async (req, res) => {
  try {
    const items = await db.gallery.find({}).sort({ createdAt: -1 });
    res.render('gallery', { items, pageTitle: 'Gallery Showcase' });
  } catch (err) {
    console.error('Gallery route error:', err);
    res.status(500).send('Server Error');
  }
});

router.get('/contact', authenticate, (req, res) => {
  res.render('contact', { pageTitle: 'Contact Us' });
});

router.get('/track', authenticate, (req, res) => {
  res.render('track', { pageTitle: 'Track Order' });
});

router.get('/privacy', authenticate, (req, res) => {
  res.render('privacy', { pageTitle: 'Privacy Policy' });
});

router.get('/terms', authenticate, (req, res) => {
  res.render('terms', { pageTitle: 'Terms & Conditions' });
});

router.get('/offers', authenticate, async (req, res) => {
  try {
    const activeOffers = await db.offers.find({ active: true }).sort({ createdAt: -1 });
    
    // Find the earliest active offer expiry date to target the countdown timer
    let targetEndDate = null;
    activeOffers.forEach(off => {
      if (off.endDate) {
        const d = new Date(off.endDate);
        if (!isNaN(d.getTime())) {
          if (!targetEndDate || d < targetEndDate) {
            targetEndDate = d;
          }
        }
      }
    });
    
    const countdownTarget = targetEndDate ? targetEndDate.toISOString() : '';
    const promoProducts = await db.products.find({ stock: { $gt: 0 } }).limit(6);
    promoProducts.forEach(p => { p.price = p.regularPrice; });
    
    res.render('offers', { 
      activeOffers, 
      promoProducts, 
      countdownTarget, 
      pageTitle: 'Offers & Deals' 
    });
  } catch (err) {
    console.error('Offers route error:', err);
    res.status(500).send('Server Error');
  }
});

// Admin Views
router.get('/8340262401', authenticate, (req, res) => {
  if (req.user && ['admin', 'super-admin', 'manager', 'sales'].includes(req.user.role)) return res.redirect('/admin/dashboard');
  res.render('admin/login', { pageTitle: 'Admin Login' });
});

router.get('/admin/login', authenticate, (req, res) => {
  if (req.user && ['admin', 'super-admin', 'manager', 'sales'].includes(req.user.role)) return res.redirect('/admin/dashboard');
  res.render('admin/login', { pageTitle: 'Admin Login' });
});

router.get('/admin/dashboard', authenticate, requireAdmin, async (req, res) => {
  try {
    const totalProducts = await db.products.count({});
    const totalOrders = await db.orders.count({});
    
    const orders = await db.orders.find({});
    let totalRevenue = 0;
    orders.forEach(order => {
      if (order.status !== 'cancelled') {
        totalRevenue += (order.totalAmount || 0);
      }
    });
    
    const pendingEnquiries = res.locals.pendingEnquiries || 0;
    
    const recentOrders = await db.orders.find({}).sort({ createdAt: -1 }).limit(5);
    recentOrders.forEach(o => {
      o.customerName = o.customerName || o.dealerName || 'Walk-in Customer';
      o.customerPhone = o.customerPhone || o.dealerPhone || '';
    });
    const recentEnquiries = await db.enquiries.find({}).sort({ createdAt: -1 }).limit(5);
    
    res.render('admin/dashboard', { 
      pageTitle: 'Admin Control Center',
      totalProducts,
      totalOrders,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      pendingEnquiries,
      recentOrders,
      recentEnquiries
    });
  } catch (err) {
    console.error('Admin dashboard render error:', err);
    res.status(500).send('Internal Server Exception! Check process runtime logs.');
  }
});

router.get('/admin/products', authenticate, requireAdmin, async (req, res) => {
  try {
    const products = await db.products.find({}).sort({ createdAt: -1 });
    products.forEach(p => { p.price = p.regularPrice || 0; });
    res.render('admin/products', { products, pageTitle: 'Manage Catalog' });
  } catch (err) {
    console.error('Admin products route error:', err);
    res.status(500).send('Server Error');
  }
});

router.get('/admin/products/add', authenticate, requireAdmin, async (req, res) => {
  res.render('admin/products-add', { pageTitle: 'Add Product' });
});

router.get('/admin/products/edit/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const product = await db.products.findOne({ _id: req.params.id });
    if (!product) return res.status(404).send('Product not found');
    product.price = product.regularPrice || product.price || 0;
    product.dealerPrice = product.wholesalePrice || product.dealerPrice || 0;
    res.render('admin/products-add', { product, pageTitle: 'Edit Product' });
  } catch (err) {
    console.error('Admin products edit view route error:', err);
    res.status(500).send('Server Error');
  }
});

router.get('/admin/customers', authenticate, requireAdmin, async (req, res) => {
  try {
    const customers = await db.users.find({ role: 'customer' }).sort({ createdAt: -1 });
    const orders = await db.orders.find({ isDeleted: { $ne: true } });
    const byPhone = {};
    const byEmail = {};
    
    orders.forEach(o => {
      const phone = (o.customerPhone || o.dealerPhone || '').replace(/\D/g, '');
      const email = (o.customerEmail || o.dealerEmail || '').toLowerCase().trim();
      const amt = o.status !== 'cancelled' ? (o.totalAmount || 0) : 0;
      
      const orderData = {
        amount: amt,
        date: o.createdAt
      };
      
      if (phone) {
        byPhone[phone] = byPhone[phone] || [];
        byPhone[phone].push(orderData);
      }
      if (email) {
        byEmail[email] = byEmail[email] || [];
        byEmail[email].push(orderData);
      }
    });

    customers.forEach(c => {
      const phone = (c.phone || '').replace(/\D/g, '');
      const email = (c.email || '').toLowerCase().trim();
      
      const matchingOrders = [];
      const seen = new Set();
      
      const addOrders = (orderList) => {
        if (orderList) {
          orderList.forEach(o => {
            if (!seen.has(o)) {
              seen.add(o);
              matchingOrders.push(o);
            }
          });
        }
      };
      
      if (phone) addOrders(byPhone[phone]);
      if (email) addOrders(byEmail[email]);
      
      let totalOrders = matchingOrders.length;
      let totalSpent = 0;
      let lastOrderAt = null;
      
      matchingOrders.forEach(o => {
        totalSpent += o.amount;
        const d = o.date ? new Date(o.date) : null;
        if (d && (!lastOrderAt || d > new Date(lastOrderAt))) {
          lastOrderAt = o.date;
        }
      });
      
      c.totalOrders = totalOrders;
      c.totalSpent = totalSpent;
      c.lastOrderAt = lastOrderAt;
    });

    res.render('admin/customers', { customers, pageTitle: 'Customer Directory' });
  } catch (err) {
    console.error('Admin customers route error:', err);
    res.status(500).send('Server Error');
  }
});

router.get('/admin/orders', authenticate, requireAdmin, async (req, res) => {
  try {
    const orders = await db.orders.find({}).sort({ createdAt: -1 });
    orders.forEach(o => {
      o.customerName = o.customerName || o.dealerName || 'Walk-in Customer';
      o.customerPhone = o.customerPhone || o.dealerPhone || '';
    });
    res.render('admin/orders', { orders, pageTitle: 'Manage Orders' });
  } catch (err) {
    console.error('Admin orders route error:', err);
    res.status(500).send('Server Error');
  }
});

router.get('/admin/orders/new', authenticate, requireAdmin, (req, res) => {
  res.redirect('/admin/billing');
});

router.get('/admin/orders/:id/invoice', authenticate, requireAdmin, orderController.printGSTInvoice);

router.get('/admin/orders/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const order = await db.orders.findOne({ _id: req.params.id });
    if (!order) return res.status(404).send('Order not found');
    res.render('admin/order-details', { order, pageTitle: 'Order Details' });
  } catch (err) {
    console.error('Admin order detail route error:', err);
    res.status(500).send('Server Error');
  }
});

router.get('/admin/billing', authenticate, requireAdmin, async (req, res) => {
  try {
    const products = await db.products.find({ stock: { $gt: 0 } }).sort({ name: 1 });
    res.render('admin/billing', { products, pageTitle: 'Create GST Invoice' });
  } catch (err) {
    console.error('Admin billing route error:', err);
    res.status(500).send('Server Error');
  }
});

router.get('/admin/offers/add', authenticate, requireAdmin, (req, res) => {
  res.redirect('/admin/offers?action=add');
});

router.get('/admin/offers', authenticate, requireAdmin, async (req, res) => {
  try {
    const offers = await db.offers.find({}).sort({ createdAt: -1 });
    res.render('admin/offers', { offers, pageTitle: 'Manage Offers' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

router.get('/admin/gallery', authenticate, requireAdmin, async (req, res) => {
  try {
    const items = await db.gallery.find({}).sort({ createdAt: -1 });
    res.render('admin/gallery', { items, pageTitle: 'Manage Gallery' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

router.get('/admin/enquiries', authenticate, requireAdmin, async (req, res) => {
  try {
    const enquiries = await db.enquiries.find({}).sort({ createdAt: -1 });
    res.render('admin/enquiries', { enquiries, pageTitle: 'Manage Enquiries' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

router.get('/admin/settings', authenticate, requireAdmin, async (req, res) => {
  try {
    const settings = await db.settings.findOne({ _id: 'global_settings' }) || {};
    if (!settings.openRouterApiKey) {
      settings.openRouterApiKey = process.env.OPENROUTER_API_KEY || '';
    }
    if (!settings.openRouterModel) {
      settings.openRouterModel = process.env.OPENROUTER_MODEL || 'openai/gpt-oss-20b:free';
    }
    res.render('admin/settings', { settings, pageTitle: 'Store Settings' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

router.get('/admin/homepage', authenticate, requireAdmin, async (req, res) => {
  try {
    const settings = await db.settings.findOne({ _id: 'global_settings' });
    res.render('admin/homepage', { settings, pageTitle: 'Homepage Manager' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

router.get('/admin/reviews', authenticate, requireAdmin, async (req, res) => {
  try {
    const reviews = await db.reviews.find({}).sort({ createdAt: -1 });
    res.render('admin/reviews', { reviews, pageTitle: 'Manage Reviews' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// System Operations Views
router.get('/admin/logs', authenticate, requireAdmin, checkRole(['admin', 'super-admin']), (req, res) => {
  res.render('admin/logs', { pageTitle: 'Activity Logs' });
});

router.get('/admin/staff', authenticate, requireAdmin, checkRole(['admin', 'super-admin']), (req, res) => {
  res.render('admin/staff', { pageTitle: 'Manage Staff' });
});

router.get('/admin/backup', authenticate, requireAdmin, checkRole(['admin', 'super-admin']), (req, res) => {
  res.render('admin/backup', { pageTitle: 'Backup & Restore' });
});


// Customer Google Login page
router.get('/login', authenticate, async (req, res) => {
  try {
    if (req.user && req.user.role === 'customer') return res.redirect('/profile');
    if (req.user && ['admin', 'super-admin', 'manager', 'sales'].includes(req.user.role)) {
      return res.redirect('/admin/dashboard');
    }
    const settings = await db.settings.findOne({ _id: 'global_settings' }) || {};
    const googleClientId = settings.googleClientId || process.env.GOOGLE_CLIENT_ID || '892795324478-jrm7toes25868j9nqpjfuqro4q9d7g89.apps.googleusercontent.com';
    res.render('login', { pageTitle: 'Sign In', googleClientId });
  } catch (err) {
    console.error('Login view error:', err);
    res.status(500).send('Server Error');
  }
});

// Customer Profile Settings
router.get('/profile', authenticate, async (req, res, next) => {
  // Accept one-time token from Google login redirect (cookie fallback)
  if (!req.user && req.query.token) {
    try {
      const jwt = require('jsonwebtoken');
      const { JWT_SECRET } = require('../middleware/auth');
      const decoded = jwt.verify(req.query.token, JWT_SECRET);
      const isHttps = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true' || req.secure || req.headers['x-forwarded-proto'] === 'https';
      res.cookie('token', req.query.token, {
        httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, sameSite: 'lax', secure: !!isHttps, path: '/'
      });
      // Re-run auth with cookie set
      req.cookies = req.cookies || {};
      req.cookies.token = req.query.token;
      return res.redirect('/profile');
    } catch (e) {
      console.warn('Profile token bootstrap failed:', e.message);
    }
  }
  if (!req.user || req.user.role !== 'customer') {
    if (req.xhr || (req.path && req.path.startsWith('/api'))) {
      return res.status(401).json({ error: 'Customer login required' });
    }
    return res.redirect('/login');
  }
  try {
    const user = await db.users.findOne({ _id: req.user.id }) || req.user;
    const settings = await db.settings.findOne({ _id: 'global_settings' }) || {};
    const googleClientId = settings.googleClientId || process.env.GOOGLE_CLIENT_ID || '892795324478-jrm7toes25868j9nqpjfuqro4q9d7g89.apps.googleusercontent.com';
    res.render('profile', { pageTitle: 'My Profile', profile: user, googleClientId });
  } catch (err) {
    console.error('Profile route error:', err);
    res.status(500).send('Server Error');
  }
});

// UPI Payment Page — shows a real scannable QR + deep link built from settings.upiId.
// Supports optional ?orderId=... so a customer can pay for a specific tracked order.
router.get('/payment', authenticate, async (req, res) => {
  try {
    const settings = await db.settings.findOne({ _id: 'global_settings' }) || {};
    let order = null;
    if (req.query.orderId) {
      order = await db.orders.findOne({ orderId: String(req.query.orderId).trim() });
    }
    res.render('payment', { pageTitle: 'Payment Gateway', settings, order });
  } catch (err) {
    console.error('Payment page error:', err);
    res.render('payment', { pageTitle: 'Payment Gateway', settings: {}, order: null });
  }
});

router.get('/payment-gateway', authenticate, (req, res) => {
  res.redirect('/payment');
});


router.get('/admin/quotations', authenticate, requireAdmin, async (req, res) => {
  try {
    const quotations = await db.quotations.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 });
    res.render('admin/quotations', { quotations, pageTitle: 'Quotations' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

router.get('/admin/quotations/new', authenticate, requireAdmin, (req, res) => {
  res.render('admin/quotation-form', { pageTitle: 'New Quotation' });
});

router.get('/admin/trash', authenticate, requireAdmin, checkRole(['admin', 'super-admin', 'manager']), async (req, res) => {
  try {
    const { listTrash } = require('../utils/softDelete');
    const products = await listTrash(db.products);
    const orders = await listTrash(db.orders);
    const quotations = await listTrash(db.quotations);
    const suppliers = await listTrash(db.suppliers);
    const purchases = await listTrash(db.purchases);
    const expenses = await listTrash(db.expenses);
    const jobworks = await listTrash(db.jobworks);
    const deliveries = await listTrash(db.deliveries);
    res.render('admin/trash', { products, orders, quotations, suppliers, purchases, expenses, jobworks, deliveries, pageTitle: 'Recycle Bin' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});


router.get('/admin/suppliers', authenticate, requireAdmin, async (req, res) => {
  try {
    const suppliers = await db.suppliers.find({ isDeleted: { $ne: true } }).sort({ name: 1 });
    res.render('admin/suppliers', { suppliers, pageTitle: 'Suppliers' });
  } catch (e) { res.status(500).send('Server Error'); }
});
router.get('/admin/purchases', authenticate, requireAdmin, async (req, res) => {
  try {
    const purchases = await db.purchases.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 });
    const suppliers = await db.suppliers.find({ isDeleted: { $ne: true } });
    const products = await db.products.find({ isDeleted: { $ne: true } });
    res.render('admin/purchases', { purchases, suppliers, products, pageTitle: 'Purchases' });
  } catch (e) { res.status(500).send('Server Error'); }
});
router.get('/admin/expenses', authenticate, requireAdmin, async (req, res) => {
  try {
    const expenses = await db.expenses.find({ isDeleted: { $ne: true } }).sort({ date: -1 });
    res.render('admin/expenses', { expenses, pageTitle: 'Expenses' });
  } catch (e) { res.status(500).send('Server Error'); }
});
router.get('/admin/jobworks', authenticate, requireAdmin, async (req, res) => {
  try {
    const jobworks = await db.jobworks.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 });
    res.render('admin/jobworks', { jobworks, pageTitle: 'Job Works' });
  } catch (e) { res.status(500).send('Server Error'); }
});
router.get('/admin/deliveries', authenticate, requireAdmin, async (req, res) => {
  try {
    const deliveries = await db.deliveries.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 });
    res.render('admin/deliveries', { deliveries, pageTitle: 'Deliveries' });
  } catch (e) { res.status(500).send('Server Error'); }
});
router.get('/admin/attendance', authenticate, requireAdmin, async (req, res) => {
  try {
    const staff = await db.users.find({ role: { $in: ['admin','super-admin','manager','sales'] } });
    const attendance = await db.attendance.find({}).sort({ date: -1 }).limit(200);
    res.render('admin/attendance', { staff, attendance, pageTitle: 'Attendance' });
  } catch (e) { res.status(500).send('Server Error'); }
});
router.get('/admin/reports', authenticate, requireAdmin, (req, res) => {
  res.render('admin/reports', { pageTitle: 'Reports' });
});
module.exports = router;
