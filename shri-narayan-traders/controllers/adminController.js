const db = require('../config/db');
const { logActivity } = require('../utils/logger');

const getStats = async (req, res) => {
  try {
    const totalProducts = await db.products.count({});
    const totalEnquiries = await db.enquiries.count({});
    const totalOffers = await db.offers.count({});
    const totalCustomers = await db.users.count({ role: 'customer' });
    
    const orders = await db.orders.find({});
    const totalOrders = orders.length;
    let totalRevenue = 0;
    let lowStockCount = 0;
    
    orders.forEach(order => {
      if (order.status !== 'cancelled') {
        totalRevenue += order.totalAmount || 0;
      }
    });
    
    const products = await db.products.find({});
    products.forEach(product => {
      if (product.stock <= (product.lowStockThreshold || 5)) {
        lowStockCount++;
      }
    });
    
    return res.json({
      totalProducts,
      totalEnquiries,
      totalOffers,
      totalCustomers,
      totalOrders,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      lowStockCount
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

/** List Google-registered customers (+ any role customer) for admin directory */
const getCustomers = async (req, res) => {
  try {
    const customers = await db.users.find({ role: 'customer' }).sort({ createdAt: -1 });
    return res.json({ success: true, data: customers });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

const getVisitors = async (req, res) => {
  try {
    const visitors = await db.visitor_logs.find({}).sort({ createdAt: -1 }).limit(100);
    return res.json(visitors);
  } catch (error) {
    console.error('Error fetching visitor logs:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

const exportVisitors = async (req, res) => {
  try {
    const visitors = await db.visitor_logs.find({}).sort({ createdAt: -1 });
    let csv = '\uFEFFTimestamp,IP Address,Country,Page Visited,Browser/UserAgent\n';
    visitors.forEach(v => {
      const date = new Date(v.createdAt).toLocaleString('en-IN').replace(/,/g, '');
      const ip = v.ip || '';
      const country = v.country || '';
      const path = v.path || '';
      const ua = (v.userAgent || '').replace(/"/g, '""');
      csv += `"${date}","${ip}","${country}","${path}","${ua}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=visitor_logs.csv');
    return res.send(csv);
  } catch (error) {
    console.error('Error exporting visitor logs:', error);
    return res.status(500).send('Server error during export');
  }
};

const clearVisitors = async (req, res) => {
  try {
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const result = await db.visitor_logs.remove({ createdAt: { $lt: threeMonthsAgo } }, { multi: true });
    const count = typeof result === 'number' ? result : (result?.deletedCount ?? 'Some');
    
    await logActivity(
      req.user.id,
      req.user.username || 'admin',
      'Clear Visitor Logs',
      `Deleted ${count} visitor logs older than 3 months. Recent visitor logs are preserved.`
    );
    return res.json({ success: true, message: `Cleared visitor logs older than 3 months (${count} entries removed). Recent logs are preserved.` });
  } catch (error) {
    console.error('Error clearing visitor logs:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getStats,
  getCustomers,
  getVisitors,
  exportVisitors,
  clearVisitors
};
