const db = require('../config/db');
const { logActivity } = require('../utils/logger');
const { softDelete, restore, notDeleted } = require('../utils/softDelete');

// ─── SUPPLIERS ───────────────────────────────────────────
const listSuppliers = async (req, res) => {
  try {
    const data = await db.suppliers.find({ isDeleted: { $ne: true } }).sort({ name: 1 });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const createSupplier = async (req, res) => {
  try {
    const { name, phone, email, address, gstin, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Supplier name required' });
    const row = await db.suppliers.insert({
      name, phone: phone || '', email: email || '', address: address || '',
      gstin: gstin || '', notes: notes || '', createdAt: new Date(), isDeleted: false
    });
    await logActivity((req.user && req.user.id), (req.user && req.user.username), 'Supplier Created', name);
    res.status(201).json({ success: true, data: row });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const updateSupplier = async (req, res) => {
  try {
    const { name, phone, email, address, gstin, notes } = req.body;
    await db.suppliers.update({ _id: req.params.id }, {
      $set: { name, phone, email, address, gstin, notes, updatedAt: new Date() }
    });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const deleteSupplier = async (req, res) => {
  try {
    await softDelete(db.suppliers, req.params.id, (req.user && req.user.id));
    res.json({ success: true, message: 'Moved to recycle bin' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ─── PURCHASES (Stock In) ────────────────────────────────
const listPurchases = async (req, res) => {
  try {
    const data = await db.purchases.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const createPurchase = async (req, res) => {
  try {
    const { supplierId, supplierName, billNo, items, notes, paidAmount } = req.body;
    if (!items || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'At least one purchase item required' });
    }
    let total = 0;
    for (const it of items) {
      const qty = Math.max(0, Number(it.qty) || 0);
      const rate = Math.max(0, Number(it.rate) || 0);
      total += qty * rate;
      // Stock in if productId present
      if (it.productId && it.productId !== 'custom') {
        const prod = await db.products.findOne({ _id: it.productId });
        if (prod) {
          await db.products.update(
            { _id: it.productId },
            { $set: { stock: (prod.stock || 0) + qty } }
          );
        }
      }
    }
    const row = await db.purchases.insert({
      purchaseId: `PUR-${Date.now().toString().slice(-6)}`,
      supplierId: supplierId || '',
      supplierName: supplierName || '',
      billNo: billNo || '',
      items,
      totalAmount: total,
      paidAmount: Number(paidAmount) || 0,
      notes: notes || '',
      createdBy: (req.user && req.user.id),
      createdAt: new Date(),
      isDeleted: false
    });
    await logActivity((req.user && req.user.id), (req.user && req.user.username), 'Purchase Created', row.purchaseId);
    res.status(201).json({ success: true, data: row });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const deletePurchase = async (req, res) => {
  try {
    await softDelete(db.purchases, req.params.id, (req.user && req.user.id));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ─── EXPENSES ────────────────────────────────────────────
const listExpenses = async (req, res) => {
  try {
    const data = await db.expenses.find({ isDeleted: { $ne: true } }).sort({ date: -1 });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const createExpense = async (req, res) => {
  try {
    const { category, amount, description, date, paymentMode } = req.body;
    if (!category || amount === undefined) return res.status(400).json({ error: 'Category and amount required' });
    const row = await db.expenses.insert({
      category,
      amount: Number(amount) || 0,
      description: description || '',
      date: date || new Date().toISOString().slice(0, 10),
      paymentMode: paymentMode || 'cash',
      createdBy: (req.user && req.user.id),
      createdAt: new Date(),
      isDeleted: false
    });
    await logActivity((req.user && req.user.id), (req.user && req.user.username), 'Expense Added', `${category}: ₹${amount}`);
    res.status(201).json({ success: true, data: row });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const deleteExpense = async (req, res) => {
  try {
    await softDelete(db.expenses, req.params.id, (req.user && req.user.id));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ─── JOB WORK / FABRICATION ──────────────────────────────
const listJobworks = async (req, res) => {
  try {
    const data = await db.jobworks.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const createJobwork = async (req, res) => {
  try {
    const { customerName, customerPhone, title, description, category, priority, dueDate, estimatedCost, notes } = req.body;
    if (!customerName || !title) return res.status(400).json({ error: 'Customer and title required' });
    const row = await db.jobworks.insert({
      jobId: `JW-${Date.now().toString().slice(-6)}`,
      customerName,
      customerPhone: customerPhone || '',
      title,
      description: description || '',
      category: category || 'aluminium', // aluminium | furniture | custom
      priority: priority || 'normal',
      status: 'pending', // pending | in_progress | quality_check | completed | delivered | cancelled
      dueDate: dueDate || '',
      estimatedCost: Number(estimatedCost) || 0,
      notes: notes || '',
      createdBy: (req.user && req.user.id),
      createdAt: new Date(),
      isDeleted: false
    });
    await logActivity((req.user && req.user.id), (req.user && req.user.username), 'Job Work Created', row.jobId);
    res.status(201).json({ success: true, data: row });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const updateJobworkStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['pending', 'in_progress', 'quality_check', 'completed', 'delivered', 'cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    await db.jobworks.update({ _id: req.params.id }, { $set: { status, updatedAt: new Date() } });
    await logActivity((req.user && req.user.id), (req.user && req.user.username), 'Job Work Status', `${req.params.id} → ${status}`);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const deleteJobwork = async (req, res) => {
  try {
    await softDelete(db.jobworks, req.params.id, (req.user && req.user.id));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ─── DELIVERIES ──────────────────────────────────────────
const listDeliveries = async (req, res) => {
  try {
    const data = await db.deliveries.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const createDelivery = async (req, res) => {
  try {
    const { orderId, customerName, customerPhone, address, deliveryBoy, charges, scheduledDate, notes } = req.body;
    if (!customerName || !address) return res.status(400).json({ error: 'Customer and address required' });
    const row = await db.deliveries.insert({
      deliveryId: `DL-${Date.now().toString().slice(-6)}`,
      orderId: orderId || '',
      customerName,
      customerPhone: customerPhone || '',
      address,
      deliveryBoy: deliveryBoy || '',
      charges: Number(charges) || 0,
      scheduledDate: scheduledDate || '',
      status: 'scheduled', // scheduled | out_for_delivery | delivered | failed | returned
      notes: notes || '',
      proofNote: '',
      createdBy: (req.user && req.user.id),
      createdAt: new Date(),
      isDeleted: false
    });
    await logActivity((req.user && req.user.id), (req.user && req.user.username), 'Delivery Created', row.deliveryId);
    res.status(201).json({ success: true, data: row });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const updateDeliveryStatus = async (req, res) => {
  try {
    const { status, proofNote } = req.body;
    const allowed = ['scheduled', 'out_for_delivery', 'delivered', 'failed', 'returned'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const set = { status, updatedAt: new Date() };
    if (proofNote !== undefined) set.proofNote = proofNote;
    if (status === 'delivered') set.deliveredAt = new Date();
    await db.deliveries.update({ _id: req.params.id }, { $set: set });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const deleteDelivery = async (req, res) => {
  try {
    await softDelete(db.deliveries, req.params.id, (req.user && req.user.id));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ─── STAFF ATTENDANCE ────────────────────────────────────
const listAttendance = async (req, res) => {
  try {
    const { month, year } = req.query;
    let data = await db.attendance.find({}).sort({ date: -1 });
    if (month && year) {
      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      data = data.filter(a => (a.date || '').startsWith(prefix));
    }
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const markAttendance = async (req, res) => {
  try {
    const { staffId, staffName, date, status, notes } = req.body;
    if (!staffId || !date || !status) return res.status(400).json({ error: 'staffId, date, status required' });
    const existing = await db.attendance.findOne({ staffId, date });
    if (existing) {
      await db.attendance.update({ _id: existing._id }, { $set: { status, notes: notes || '', updatedAt: new Date() } });
      return res.json({ success: true, message: 'Updated' });
    }
    const row = await db.attendance.insert({
      staffId, staffName: staffName || '', date, status, // present | absent | half | leave
      notes: notes || '', createdAt: new Date()
    });
    res.status(201).json({ success: true, data: row });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ─── GST REPORTS ─────────────────────────────────────────
const gstReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const toDate = to ? new Date(to) : new Date();
    toDate.setHours(23, 59, 59, 999);

    const orders = await db.orders.find({ isDeleted: { $ne: true } });
    const filtered = orders.filter(o => {
      const d = o.createdAt ? new Date(o.createdAt) : null;
      return d && d >= fromDate && d <= toDate && o.status !== 'cancelled';
    });

    let taxable = 0, cgst = 0, sgst = 0, igst = 0, total = 0;
    const rows = [];

    filtered.forEach(o => {
      const sub = o.subtotal || 0;
      const gst = o.gstAmount || 0;
      // Assume intra-state CGST+SGST split unless flagged inter-state
      const half = gst / 2;
      taxable += sub;
      cgst += half;
      sgst += half;
      total += o.totalAmount || (sub + gst);
      rows.push({
        orderId: o.orderId,
        date: o.createdAt,
        customer: o.customerName || o.dealerName || '',
        gstin: o.dealerGstin || o.customerGstin || 'URP',
        taxable: sub,
        cgst: half,
        sgst: half,
        total: o.totalAmount || sub + gst
      });
    });

    res.json({
      success: true,
      period: { from: fromDate.toISOString(), to: toDate.toISOString() },
      summary: {
        invoiceCount: rows.length,
        taxableValue: Math.round(taxable * 100) / 100,
        cgst: Math.round(cgst * 100) / 100,
        sgst: Math.round(sgst * 100) / 100,
        igst: 0,
        grandTotal: Math.round(total * 100) / 100
      },
      rows
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const salesReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const toDate = to ? new Date(to) : new Date();
    toDate.setHours(23, 59, 59, 999);

    const orders = await db.orders.find({ isDeleted: { $ne: true } });
    const filtered = orders.filter(o => {
      const d = o.createdAt ? new Date(o.createdAt) : null;
      return d && d >= fromDate && d <= toDate;
    });

    let revenue = 0, cancelled = 0, count = 0;
    filtered.forEach(o => {
      if (o.status === 'cancelled') cancelled++;
      else { revenue += o.totalAmount || 0; count++; }
    });

    const expenses = await db.expenses.find({ isDeleted: { $ne: true } });
    let expenseTotal = 0;
    expenses.forEach(e => {
      const d = e.date ? new Date(e.date) : (e.createdAt ? new Date(e.createdAt) : null);
      if (d && d >= fromDate && d <= toDate) expenseTotal += e.amount || 0;
    });

    res.json({
      success: true,
      period: { from: fromDate.toISOString(), to: toDate.toISOString() },
      sales: { orderCount: count, cancelled, revenue: Math.round(revenue * 100) / 100 },
      expenses: { total: Math.round(expenseTotal * 100) / 100 },
      profitApprox: Math.round((revenue - expenseTotal) * 100) / 100
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = {
  listSuppliers, createSupplier, updateSupplier, deleteSupplier,
  listPurchases, createPurchase, deletePurchase,
  listExpenses, createExpense, deleteExpense,
  listJobworks, createJobwork, updateJobworkStatus, deleteJobwork,
  listDeliveries, createDelivery, updateDeliveryStatus, deleteDelivery,
  listAttendance, markAttendance,
  gstReport, salesReport
};
