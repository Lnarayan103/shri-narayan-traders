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

module.exports = {
  getStats,
  getCustomers
};
