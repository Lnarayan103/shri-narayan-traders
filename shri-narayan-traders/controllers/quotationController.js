const db = require('../config/db');
const { logActivity } = require('../utils/logger');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const genQuoteId = () => {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `QT-${Date.now().toString().slice(-6)}-${rand}`;
};

const createQuotation = async (req, res) => {
  try {
    const { customerName, customerPhone, customerEmail, customerAddress, items, notes, validUntil, discount } = req.body;
    if (!customerName || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Customer name and at least one item are required' });
    }

    let subtotal = 0;
    let gstAmount = 0;
    const normalized = items.map((it, idx) => {
      const qty = Math.max(1, Number(it.qty) || 1);
      const price = Math.max(0, Number(it.price) || 0);
      const gstRate = Number(it.gstRate) || 18;
      const line = qty * price;
      const lineGst = line * (gstRate / 100);
      subtotal += line;
      gstAmount += lineGst;
      return {
        sno: idx + 1,
        name: it.name || 'Item',
        qty,
        price,
        gstRate,
        total: line
      };
    });

    const disc = Math.max(0, Number(discount) || 0);
    const totalAmount = Math.max(0, subtotal + gstAmount - disc);

    const quote = await db.quotations.insert({
      quoteId: genQuoteId(),
      customerName,
      customerPhone: customerPhone || '',
      customerEmail: customerEmail || '',
      customerAddress: customerAddress || '',
      items: normalized,
      subtotal,
      gstAmount,
      discount: disc,
      totalAmount,
      notes: notes || '',
      validUntil: validUntil || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'draft', // draft | sent | accepted | converted | expired
      createdBy: req.user ? req.user.id : 'system',
      createdAt: new Date(),
      isDeleted: false
    });

    await logActivity(req.user?.id, req.user?.username || 'admin', 'Quotation Created', `Quote ${quote.quoteId} for ${customerName}`);
    return res.status(201).json({ success: true, data: quote });
  } catch (e) {
    console.error('createQuotation', e);
    return res.status(500).json({ error: 'Server error' });
  }
};

const listQuotations = async (req, res) => {
  try {
    const quotes = await db.quotations.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 });
    return res.json({ success: true, data: quotes });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
};

const getQuotation = async (req, res) => {
  try {
    const q = await db.quotations.findOne({ _id: req.params.id });
    if (!q || q.isDeleted) return res.status(404).json({ error: 'Not found' });
    return res.json({ success: true, data: q });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
};

const updateQuotationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['draft', 'sent', 'accepted', 'converted', 'expired'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    await db.quotations.update({ _id: req.params.id }, { $set: { status, updatedAt: new Date() } });
    await logActivity(req.user?.id, req.user?.username, 'Quotation Status', `Quote ${req.params.id} → ${status}`);
    return res.json({ success: true, message: 'Status updated' });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
};

const softDeleteQuotation = async (req, res) => {
  try {
    await db.quotations.update(
      { _id: req.params.id },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: req.user?.id || 'admin' } }
    );
    return res.json({ success: true, message: 'Moved to recycle bin' });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
};

const printQuotationPDF = async (req, res) => {
  try {
    const quote = await db.quotations.findOne({ _id: req.params.id });
    if (!quote) return res.status(404).send('Not found');
    const settings = await db.settings.findOne({ _id: 'global_settings' }) || {};

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=Quote-${quote.quoteId}.pdf`);
    doc.pipe(res);

    const primary = '#001f4d';
    const gold = '#c9922a';
    const logoPath = path.join(__dirname, '../public/images/logo/snt-primary.png');

    // Watermark
    doc.save();
    doc.translate(297, 400);
    doc.rotate(-28);
    if (fs.existsSync(logoPath)) {
      try { doc.opacity(0.05); doc.image(logoPath, -60, -60, { width: 120 }); doc.opacity(1); } catch (e) {}
    }
    doc.fillColor(primary).opacity(0.04).fontSize(48).text('SNT', -80, -10, { width: 160, align: 'center' });
    doc.opacity(1);
    doc.restore();

    if (fs.existsSync(logoPath)) {
      try { doc.image(logoPath, 50, 40, { width: 50, height: 50 }); } catch (e) {}
    }
    doc.fillColor(primary).fontSize(16).font('Helvetica-Bold')
      .text(settings.businessName || 'Shri Narayan Traders', 110, 45);
    doc.fillColor('#64748b').fontSize(9).font('Helvetica')
      .text('QUOTATION / ESTIMATE', 110, 65);
    doc.fillColor(gold).fontSize(11).font('Helvetica-Bold')
      .text(quote.quoteId, 400, 50, { align: 'right' });

    doc.moveTo(50, 100).lineTo(545, 100).strokeColor(gold).lineWidth(2).stroke();

    let y = 115;
    doc.fillColor(primary).fontSize(11).font('Helvetica-Bold').text('Bill To', 50, y);
    doc.font('Helvetica').fontSize(10).fillColor('#1e293b')
      .text(quote.customerName, 50, y + 16)
      .text(quote.customerPhone || '', 50, y + 30)
      .text(quote.customerAddress || '', 50, y + 44, { width: 220 });

    doc.font('Helvetica-Bold').fillColor(primary).text('Valid Until', 350, y);
    doc.font('Helvetica').fillColor('#1e293b')
      .text(quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('en-IN') : '—', 350, y + 16);
    doc.font('Helvetica-Bold').fillColor(primary).text('Status', 350, y + 36);
    doc.font('Helvetica').text((quote.status || 'draft').toUpperCase(), 350, y + 50);

    y = 200;
    doc.rect(50, y, 495, 22).fill(primary);
    doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold');
    doc.text('#', 55, y + 6);
    doc.text('Description', 80, y + 6);
    doc.text('Qty', 320, y + 6);
    doc.text('Rate', 370, y + 6);
    doc.text('Amount', 450, y + 6);

    y += 28;
    doc.fillColor('#1e293b').font('Helvetica').fontSize(9);
    (quote.items || []).forEach((it, i) => {
      if (i % 2 === 0) {
        doc.rect(50, y - 4, 495, 18).fill('#f8fafc');
        doc.fillColor('#1e293b');
      }
      doc.text(String(it.sno || i + 1), 55, y);
      doc.text(it.name || '', 80, y, { width: 230 });
      doc.text(String(it.qty), 320, y);
      doc.text(String(it.price), 370, y);
      doc.text(String(it.total), 450, y);
      y += 18;
    });

    y += 10;
    doc.font('Helvetica').fontSize(10);
    doc.text(`Subtotal: ₹${(quote.subtotal || 0).toLocaleString('en-IN')}`, 350, y, { width: 195, align: 'right' });
    y += 14;
    doc.text(`GST: ₹${(quote.gstAmount || 0).toLocaleString('en-IN')}`, 350, y, { width: 195, align: 'right' });
    if (quote.discount) {
      y += 14;
      doc.text(`Discount: ₹${quote.discount.toLocaleString('en-IN')}`, 350, y, { width: 195, align: 'right' });
    }
    y += 16;
    doc.font('Helvetica-Bold').fontSize(12).fillColor(primary)
      .text(`Grand Total: ₹${(quote.totalAmount || 0).toLocaleString('en-IN')}`, 350, y, { width: 195, align: 'right' });

    if (quote.notes) {
      y += 40;
      doc.font('Helvetica-Bold').fillColor(primary).fontSize(10).text('Notes', 50, y);
      doc.font('Helvetica').fillColor('#64748b').fontSize(9).text(quote.notes, 50, y + 14, { width: 480 });
    }

    doc.fontSize(8).fillColor('#94a3b8').text(
      'This is a computer-generated quotation. Prices valid until the date shown. Subject to stock availability.',
      50, 780, { width: 495, align: 'center' }
    );

    doc.end();
  } catch (e) {
    console.error('printQuotationPDF', e);
    if (!res.headersSent) res.status(500).send('Error generating PDF');
  }
};

module.exports = {
  createQuotation,
  listQuotations,
  getQuotation,
  updateQuotationStatus,
  softDeleteQuotation,
  printQuotationPDF
};
