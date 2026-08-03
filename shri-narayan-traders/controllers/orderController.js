const path = require('path');
const db = require('../config/db');
const PDFDocument = require('pdfkit');
const { logActivity } = require('../utils/logger');
const { buildUpiUri, fetchQrPngBuffer } = require('../utils/upiQr');

const generateOrderId = () => {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SNT-${Date.now().toString().slice(-4)}-${rand}`;
};

const placeOrder = async (req, res) => {
  try {
    const { items, shippingAddress } = req.body;
    if (!items || !items.length) {
      return res.status(400).json({ error: 'Order items are required' });
    }
    
    // Check if it is a walk-in order (placed as guest or placed by admin/staff on behalf of walkin)
    const isWalkIn = req.body.walkin === true || !req.user || ['admin', 'super-admin', 'manager', 'sales'].includes(req.user.role) || req.body.source === 'pos';
    
    if (isWalkIn) {
      const phoneInput = (req.body.phone || req.body.customerPhone || '').toString().trim();
      // Skip hard blocking on phone numbers for pure walk-ins to support guest checkouts
    }
    
    const orderItems = [];
    let subtotal = 0;
    let totalGst = 0;
    
    for (const item of items) {
      const qty = parseInt(item.qty);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: 'Quantity must be a positive integer' });
      }
      
      let price = parseFloat(item.price || item.rate) || 0;
      let name = item.name;
      let productId = item.productId || null;
      let itemGstRate = parseFloat(item.gstRate || item.gst || 18);
      
      if (productId && productId !== 'custom') {
        const product = await db.products.findOne({ _id: productId });
        if (product) {
          price = product.regularPrice || product.price || 0;
          name = product.name;
          itemGstRate = parseFloat(product.gstRate || product.gst || 18);
          
          if (product.stock < qty) {
            return res.status(400).json({ error: `Insufficient stock for ${product.name}. Available: ${product.stock}` });
          }
        } else if (req.body.source === 'pos') {
          productId = 'custom';
        } else {
          return res.status(404).json({ error: `Product not found in database catalog: ${name}` });
        }
      } else {
        if (req.body.source === 'pos') {
          productId = 'custom';
        } else {
          return res.status(400).json({ error: 'Product ID is required for catalog items' });
        }
      }
      
      const total = price * qty;
      subtotal += total;
      totalGst += (total * itemGstRate) / 100;
      
      orderItems.push({
        productId,
        name,
        qty,
        price,
        total,
        gstRate: itemGstRate
      });
    }
    
    // Deduct stock for database catalog items only
    for (const item of orderItems) {
      if (item.productId && item.productId !== 'custom') {
        await db.products.update(
          { _id: item.productId },
          { $inc: { stock: -item.qty } }
        );

        // Check if stock level fell below low stock threshold
        try {
          const product = await db.products.findOne({ _id: item.productId });
          if (product && product.stock <= (product.lowStockThreshold || 5)) {
            const { sendLowStockAlert } = require('../utils/aiEmailService');
            sendLowStockAlert(product).catch(err => console.error('Low stock alert email failed:', err.message));
          }
        } catch (stockErr) {
          console.error('Failed to trigger low stock check inside placeOrder:', stockErr.message);
        }
      }
    }
    
    const discount = parseFloat(req.body.discount) || 0;
    const gstAmount = parseFloat(totalGst.toFixed(2));
    const totalAmount = parseFloat((subtotal + gstAmount - discount).toFixed(2));
    const orderId = req.body.orderId || generateOrderId();
    
    const customerEmail = isWalkIn ? (req.body.email || req.body.customerEmail || '') : (req.user ? req.user.email : '');

    const newOrder = await db.orders.insert({
      orderId,
      dealerId: isWalkIn ? 'walkin' : (req.user ? req.user.id : 'walkin'),
      dealerName: isWalkIn ? (req.body.businessName || req.body.customerName || 'Walk-in Customer') : (req.user.name || req.user.businessName || req.user.username || 'Customer'),
      dealerPhone: isWalkIn ? (req.body.phone || req.body.customerPhone || '') : (req.user.phone || ''),
      dealerGstin: isWalkIn ? (req.body.gstin || req.body.customerGstin || '') : '',
      customerName: isWalkIn ? (req.body.customerName || req.body.businessName || 'Walk-in Customer') : (req.user.name || req.user.username || ''),
      customerPhone: isWalkIn ? (req.body.phone || req.body.customerPhone || '') : (req.user.phone || ''),
      customerEmail: isWalkIn ? (req.body.email || req.body.customerEmail || '') : (req.user.email || ''),
      customerEmail,
      items: orderItems,
      subtotal,
      gstRate: orderItems.length > 0 ? orderItems[0].gstRate : 18,
      gstAmount,
      discount,
      totalAmount,
      status: req.body.status || 'pending',
      paymentStatus: req.body.paymentStatus || 'pending',
      paymentMethod: req.body.paymentMethod || 'Cash',
      shippingAddress: shippingAddress || (isWalkIn ? 'Self Pickup' : req.user?.address || 'Self Pickup'),
      createdAt: new Date(),
      source: req.body.source || 'web'
    });
    
    await logActivity(req.user ? req.user.id : 'walkin', req.user ? req.user.username : 'Walk-in POS Client', 'Order Placed', `Created order: ${orderId} (Total: Rs. ${totalAmount})`);
    
    // Trigger order confirmation email asynchronously
    const { sendOrderConfirmation } = require('../utils/aiEmailService');
    if (newOrder.customerEmail) {
      sendOrderConfirmation(newOrder).catch(err => console.error('Order confirmation email failed:', err.message));
    }

    return res.status(201).json({ message: 'Order placed successfully', order: newOrder });
  } catch (error) {
    console.error('Order placement error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const orders = await db.orders.find({ dealerId: req.user.id }).sort({ createdAt: -1 });
    return res.json(orders);
  } catch (error) {
    console.error('Error fetching dealer orders:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const orders = await db.orders.find({}).sort({ createdAt: -1 });
    return res.json(orders);
  } catch (error) {
    console.error('Error fetching all orders:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await db.orders.findOne({ _id: req.params.id });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    return res.json(order);
  } catch (error) {
    console.error('Error fetching order by ID:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

const trackOrder = async (req, res) => {
  try {
    const orderId = req.query.orderId || req.params.orderId;
    if (!orderId) return res.status(400).json({ error: 'Order ID is required' });
    
    const order = await db.orders.findOne({ orderId: orderId.trim().toUpperCase() });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    return res.json({
      success: true,
      order: {
        orderId: order.orderId,
        status: order.status,
        customerName: order.customerName || order.dealerName,
        customerPhone: order.customerPhone || order.dealerPhone,
        createdAt: order.createdAt,
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus || 'pending',
        notes: order.notes,
        items: order.items || []
      }
    });
  } catch (error) {
    console.error('Order tracking error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'repair', 'replacement', 'exchange'].includes(status)) {
      return res.status(400).json({ error: 'Invalid order status' });
    }
    
    const order = await db.orders.findOne({ _id: req.params.id });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    // Restrict editing/changing status of delivered orders to pre-delivery statuses
    if (['delivered', 'repair', 'replacement', 'exchange'].includes(order.status) && ['pending', 'confirmed', 'processing', 'shipped'].includes(status)) {
      return res.status(400).json({ error: 'This order has already been delivered. It cannot be moved back to pending, confirmed, processing, or shipped status. Only post-delivery statuses (Repair, Replacement, Exchange, Delivered) are allowed.' });
    }
    
    // Restrict cancellation if work has already started/completed on this order
    if (status === 'cancelled' && ['processing', 'shipped', 'delivered', 'repair', 'replacement', 'exchange'].includes(order.status)) {
      return res.status(400).json({ error: 'Work has already started/completed on this order. It cannot be cancelled, and no payment return/refund policy is applicable.' });
    }
    
    // Revert stock if order is cancelled
    if (status === 'cancelled' && order.status !== 'cancelled') {
      for (const item of order.items) {
        await db.products.update(
          { _id: item.productId },
          { $inc: { stock: item.qty } }
        );
      }
    }
    // Restore stock reduction if order is moved from cancelled to active
    if (order.status === 'cancelled' && status !== 'cancelled') {
      for (const item of order.items) {
        await db.products.update(
          { _id: item.productId },
          { $inc: { stock: -item.qty } }
        );
      }
    }
    
    const updated = await db.orders.update(
      { _id: req.params.id },
      { $set: { status } },
      { returnUpdatedDocs: true }
    );
    
    await logActivity(req.user.id, req.user.username, 'Order Status Change', `Changed status of order: ${order.orderId} to: ${status}`);

    // Send AI-powered order status update email asynchronously
    const { sendOrderStatusUpdate } = require('../utils/aiEmailService');
    let emailToNotify = updated.customerEmail || '';
    if (!emailToNotify && updated.dealerId && updated.dealerId !== 'walkin') {
      try {
        const dealerUser = await db.users.findOne({ _id: updated.dealerId });
        if (dealerUser && dealerUser.email) {
          emailToNotify = dealerUser.email;
        }
      } catch (err) {
        console.warn('Could not find dealer email for order notification:', err.message);
      }
    }
    if (emailToNotify) {
      const orderWithEmail = { ...updated, customerEmail: emailToNotify };
      sendOrderStatusUpdate(orderWithEmail, status).catch(err => console.error('Order status update email failed:', err.message));
    }
    
    return res.json({ message: 'Order status updated', order: updated });
  } catch (error) {
    console.error('Order status update error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

const printGSTInvoice = async (req, res) => {
  try {
    const order = await db.orders.findOne({ _id: req.params.id });
    if (!order) return res.status(404).send('Order not found');
    
    // Fetch global settings to display correct address, phone, email, and GSTIN
    const settings = await db.settings.findOne({ _id: 'global_settings' }) || {};

    // Build a real, scannable UPI QR (falls back to null if no UPI ID configured
    // or the QR image service is unreachable — invoice still renders fine either way).
    const upiUri = buildUpiUri({
      vpa: settings.upiId,
      name: settings.businessName || 'Shri Narayan Traders',
      amount: order.totalAmount,
      note: order.orderId
    });
    const upiQrBuffer = upiUri ? await fetchQrPngBuffer(upiUri, 240) : null;
    
    await logActivity(req.user ? req.user.id : 'system', req.user ? req.user.username : 'System Biller', 'GST Invoice Printed', `Generated invoice PDF file for order: ${order.orderId}`);
    
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=Invoice-${order.orderId}.pdf`);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    doc.pipe(res);
    
    // Font setup
    const fs = require('fs');
    let hasFonts = false;
    const fontRegularPath = '/system/fonts/SourceSansPro-Regular.ttf';
    const fontBoldPath = '/system/fonts/SourceSansPro-Bold.ttf';
    const robotoRegularPath = '/system/fonts/Roboto-Regular.ttf';
    
    if (fs.existsSync(fontRegularPath) && fs.existsSync(fontBoldPath)) {
      try {
        doc.registerFont('SourceSansPro-Regular', fontRegularPath);
        doc.registerFont('SourceSansPro-Bold', fontBoldPath);
        hasFonts = true;
      } catch (err) {
        console.error('Failed to register SourceSansPro fonts:', err);
      }
    } else if (fs.existsSync(robotoRegularPath)) {
      try {
        doc.registerFont('SourceSansPro-Regular', robotoRegularPath);
        doc.registerFont('SourceSansPro-Bold', robotoRegularPath);
        hasFonts = true;
      } catch (err) {
        console.error('Failed to register Roboto fallback font:', err);
      }
    }
    
    const regFont = hasFonts ? 'SourceSansPro-Regular' : 'Helvetica';
    const boldFont = hasFonts ? 'SourceSansPro-Bold' : 'Helvetica-Bold';
    const obliqueFont = hasFonts ? 'SourceSansPro-Regular' : 'Helvetica-Oblique';
    
    const formatPrice = (val) => {
      const formatted = Math.round(val || 0).toLocaleString('en-IN');
      return hasFonts ? `₹${formatted}` : `Rs. ${formatted}`;
    };
    
    // Brand Colors
    const primaryColor = '#001f4d'; // Navy Blue
    const secondaryColor = '#c9922a'; // Gold
    const lightBgColor = '#fcf8f2'; // Light Cream
    const darkTextColor = '#1e293b'; // Charcoal
    const lightTextColor = '#64748b'; // Slate Grey
    const borderMuted = '#e2e8f0'; // Light grey border
    
    // Page Setup (Background watermark/accents)
    const drawBackground = () => {
      // Top right gold triangular accent
      doc.save();
      doc.fillColor(secondaryColor).fillOpacity(0.08);
      doc.moveTo(430, 0).lineTo(595, 0).lineTo(595, 130).closePath().fill();
      doc.restore();
      
      // Bottom left navy accent
      doc.save();
      doc.fillColor(primaryColor).fillOpacity(0.04);
      doc.moveTo(0, 740).lineTo(0, 842).lineTo(160, 842).closePath().fill();
      doc.restore();
      
      // 5. Light Diagonal Corporate Watermark
      doc.save();
      doc.translate(297, 380); // Center of the page
      doc.rotate(-30);
      
      // Outer faint circular rings
      doc.lineWidth(1).strokeColor(primaryColor).strokeOpacity(0.02);
      doc.circle(0, 0, 110).stroke();
      doc.circle(0, 0, 105).stroke();
      
      // Try faint logo watermark image
      try {
        const logoWm = path.join(__dirname, '../public/images/logo/snt-primary.png');
        if (fs.existsSync(logoWm)) {
          doc.opacity(0.04);
          doc.image(logoWm, -70, -70, { width: 140, height: 140, align: 'center' });
          doc.opacity(1);
        }
      } catch (e) { /* ignore */ }
      
      // Faint SNT initials in the center
      doc.fillColor(primaryColor).fillOpacity(0.03).font(boldFont).fontSize(55);
      doc.text('SNT', -100, -18, { align: 'center', width: 200 });
      
      // Corporate titles on top/bottom curves
      doc.fillColor(primaryColor).fillOpacity(0.04).font(boldFont).fontSize(13);
      doc.text('SHRI NARAYAN TRADERS', -200, -45, { align: 'center', width: 400 });
      doc.text('ORIGINAL GST INVOICE', -200, 32, { align: 'center', width: 400 });
      doc.restore();
    };
    
    drawBackground();

    // Real company logo image (top-left)
    const logoPath = path.join(__dirname, '../public/images/logo/snt-primary.png');
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, 50, 40, { width: 55, height: 55 });
      } catch (e) {
        console.warn('Logo image embed failed', e.message);
      }
    }

    // 1. SNT LOGO & HEADER SECTION
    const drawMonogramLogo = (doc, x, y, size) => {
      doc.save();
      doc.translate(x, y);
      
      // Hexagonal outer frame (Aluminium frame)
      doc.lineWidth(1.5).strokeColor(primaryColor);
      doc.moveTo(25, 0)
         .lineTo(50, 14.4)
         .lineTo(50, 43.3)
         .lineTo(25, 57.7)
         .lineTo(0, 43.3)
         .lineTo(0, 14.4)
         .closePath()
         .stroke();
         
      // Hexagonal inner border
      doc.lineWidth(0.8).strokeColor(secondaryColor);
      doc.moveTo(25, 2.9)
         .lineTo(47.5, 15.9)
         .lineTo(47.5, 41.8)
         .lineTo(25, 54.8)
         .lineTo(2.5, 41.8)
         .lineTo(2.5, 15.9)
         .closePath()
         .stroke();
         
      // Crossed Hammer and Wrench (Hardware)
      doc.save();
      doc.fillColor(secondaryColor).fillOpacity(0.22);
      
      // Hammer
      doc.rotate(30, {origin: [25, 28.8]});
      doc.rect(23.5, 10, 3, 36).fill();
      doc.rect(16, 7, 18, 5.5).fill();
      doc.restore();
      
      // Wrench
      doc.save();
      doc.fillColor(secondaryColor).fillOpacity(0.22);
      doc.rotate(-30, {origin: [25, 28.8]});
      doc.rect(23.5, 10, 3, 36).fill();
      doc.circle(25, 9, 5).fill();
      doc.circle(25, 46, 4).fill();
      doc.restore();
      
      // Furniture Silhouette (Chair Outline)
      doc.lineWidth(1.2).strokeColor(primaryColor);
      doc.moveTo(18, 20)
         .lineTo(18, 31) // back
         .lineTo(32, 31) // seat
         .lineTo(32, 40) // front leg
         .moveTo(18, 31)
         .lineTo(18, 40) // back leg
         .moveTo(18, 27) // armrest
         .lineTo(27, 27)
         .lineTo(27, 31)
         .stroke();
         
      // Tiny "SNT" overlay text inside the monogram box
      doc.fillColor(primaryColor).font(boldFont).fontSize(8.5);
      doc.text('SNT', 0, 42, { align: 'center', width: 50 });
      
      doc.restore();
    };
    
    // Draw the custom Monogram logo
    drawMonogramLogo(doc, 50, 50, 50);
    
    // Company details next to the logo
    doc.fillColor(primaryColor).font(boldFont).fontSize(16).text(settings.businessName || 'SHRI NARAYAN TRADERS', 112, 52);
    doc.fillColor(secondaryColor).font(boldFont).fontSize(9.5).text('Hardware • Furniture • Aluminium Fabrication', 112, 72);
    doc.fillColor(lightTextColor).font(regFont).fontSize(8.2).text(settings.heroBannerText || 'Kaura Maidan, Near IDBI Bank, P.S. Munger, Bihar', 112, 86);
    
    // Store Info on Right
    doc.fillColor(darkTextColor).font(boldFont).fontSize(9.5).text('GSTIN: ' + (settings.gstin || '10DJSPN6486H1ZP'), 320, 55, { align: 'right', width: 225 });
    doc.font(regFont).fontSize(8.5).fillColor(lightTextColor);
    doc.text(settings.address || 'Kaura Maidan, Near IDBI Bank, Munger, Bihar - 811201', 320, 70, { align: 'right', width: 225 });
    doc.text(`Phone: ${settings.phone || '9771233843, 8340262401'}`, 320, 95, { align: 'right', width: 225 });
    doc.text(`Email: ${settings.email || 'laxminarayan34939@gmail.com'}`, 320, 108, { align: 'right', width: 225 });
    
    // Divider line
    doc.strokeColor(borderMuted).lineWidth(1).moveTo(50, 138).lineTo(545, 138).stroke();
    
    // 2. CARD BOXES (BILL TO & INVOICE DETAILS)
    const boxY = 152;
    const boxHeight = 100;
    
    // Bill To Box (Left)
    doc.save();
    doc.fillColor(lightBgColor).rect(50, boxY, 240, boxHeight).fill();
    doc.strokeColor(secondaryColor).strokeOpacity(0.25).rect(50, boxY, 240, boxHeight).stroke();
    doc.restore();
    
    doc.fillColor(primaryColor).font(boldFont).fontSize(9.5).text('BILL TO', 62, boxY + 10);
    doc.fillColor(darkTextColor).font(boldFont).fontSize(10.5).text(order.dealerName || 'Walk-in Customer', 62, boxY + 24, { width: 216, height: 15, ellipsis: true });
    doc.font(regFont).fontSize(8.5).fillColor(lightTextColor);
    doc.text(`Phone: ${order.dealerPhone || 'N/A'}`, 62, boxY + 41);
    if (order.dealerGstin) {
      doc.text(`GSTIN: ${order.dealerGstin}`, 62, boxY + 54);
    } else {
      doc.text('GSTIN: URP (Unregistered Person)', 62, boxY + 54);
    }
    doc.text(`Address: ${order.shippingAddress || 'Self Pickup'}`, 62, boxY + 67, { width: 216, height: 26, ellipsis: true });
    
    // Invoice Details Box (Right)
    doc.save();
    doc.fillColor('#f8fafc').rect(305, boxY, 240, boxHeight).fill();
    doc.strokeColor(borderMuted).rect(305, boxY, 240, boxHeight).stroke();
    doc.restore();
    
    doc.fillColor(primaryColor).font(boldFont).fontSize(9.5).text('INVOICE DETAILS', 317, boxY + 10);
    doc.font(regFont).fontSize(8.5).fillColor(lightTextColor);
    
    doc.text('Invoice No:', 317, boxY + 28);
    doc.fillColor(darkTextColor).font(boldFont).text(order.orderId, 390, boxY + 28);
    
    doc.fillColor(lightTextColor).font(regFont).text('Date:', 317, boxY + 42);
    doc.fillColor(darkTextColor).font(boldFont).text(new Date(order.createdAt).toLocaleDateString('en-IN', {day:'2-digit',month:'2-digit',year:'numeric'}), 390, boxY + 42);
    
    doc.fillColor(lightTextColor).font(regFont).text('Status:', 317, boxY + 56);
    const orderStatus = (order.status || 'pending').toUpperCase();
    const statusBgColor = orderStatus === 'DELIVERED' || orderStatus === 'PAID' ? '#16a34a' : (orderStatus === 'CANCELLED' ? '#dc2626' : '#f59e0b');
    doc.fillColor(statusBgColor).font(boldFont).text(orderStatus, 390, boxY + 56);
    
    doc.fillColor(lightTextColor).font(regFont).text('Payment:', 317, boxY + 70);
    doc.fillColor(darkTextColor).font(boldFont).text(order.paymentStatus ? order.paymentStatus.toUpperCase() : 'PAID', 390, boxY + 70);
    
    // 3. TABLE OF ITEMS (PROPER TABLE LAYOUT)
    const tableTop = 270;
    
    // Table Header Background
    doc.rect(50, tableTop, 495, 20).fillColor(primaryColor).fill();
    
    // Column Headers Text
    doc.fillColor('#ffffff').font(boldFont).fontSize(8.5);
    doc.text('S.No', 55, tableTop + 6, { width: 30 });
    doc.text('Product Description', 90, tableTop + 6, { width: 220 });
    doc.text('Qty', 315, tableTop + 6, { width: 40, align: 'right' });
    doc.text('Unit Price', 360, tableTop + 6, { width: 80, align: 'right' });
    doc.text('Total', 445, tableTop + 6, { width: 95, align: 'right' });
    
    let currentY = tableTop + 20;
    
    // Loop through order items
    order.items.forEach((item, index) => {
      // Row Shading
      const rowBg = index % 2 === 0 ? '#ffffff' : '#fcfcfc';
      doc.save();
      doc.fillColor(rowBg).rect(50, currentY, 495, 20).fill();
      doc.restore();
      
      // Draw grid horizontal borders
      doc.strokeColor(borderMuted).lineWidth(0.5)
         .moveTo(50, currentY + 20).lineTo(545, currentY + 20).stroke();
      
      // Item Details
      doc.fillColor(darkTextColor).font(regFont).fontSize(8.5);
      doc.text((index + 1).toString(), 55, currentY + 6, { width: 30 });
      doc.font(boldFont).text(item.name, 90, currentY + 6, { width: 220, height: 12, ellipsis: true });
      doc.font(regFont).text(item.qty.toString(), 315, currentY + 6, { width: 40, align: 'right' });
      doc.text(formatPrice(item.price), 360, currentY + 6, { width: 80, align: 'right' });
      doc.font(boldFont).text(formatPrice(item.total), 445, currentY + 6, { width: 95, align: 'right' });
      
      currentY += 20;
    });
    
    // Draw vertical column separators (from tableTop to currentY)
    doc.strokeColor(borderMuted).lineWidth(0.5);
    const colBorders = [85, 310, 355, 440];
    colBorders.forEach(x => {
      doc.moveTo(x, tableTop).lineTo(x, currentY).stroke();
    });
    
    // Draw outer table borders
    doc.strokeColor(primaryColor).lineWidth(1.2)
       .moveTo(50, tableTop).lineTo(50, currentY)
       .moveTo(545, tableTop).lineTo(545, currentY)
       .moveTo(50, tableTop).lineTo(545, tableTop)
       .moveTo(50, currentY).lineTo(545, currentY).stroke();
       
    currentY += 15;
    
    // 4. FINANCIAL SUMMARY
    const summaryWidth = 200;
    const summaryX = 345;
    
    doc.fillColor(lightTextColor).font(regFont).fontSize(9);
    doc.text('Subtotal:', summaryX, currentY);
    doc.fillColor(darkTextColor).font(boldFont).text(formatPrice(order.subtotal), 445, currentY, { align: 'right', width: 95 });
    currentY += 16;
    
    const cgstRate = order.gstRate ? order.gstRate / 2 : 9;
    const sgstRate = order.gstRate ? order.gstRate / 2 : 9;
    const cgstAmount = order.gstAmount ? order.gstAmount / 2 : 0;
    const sgstAmount = order.gstAmount ? order.gstAmount / 2 : 0;
    
    doc.fillColor(lightTextColor).font(regFont).text(`CGST (${cgstRate}%):`, summaryX, currentY);
    doc.fillColor(darkTextColor).font(boldFont).text(formatPrice(cgstAmount), 445, currentY, { align: 'right', width: 95 });
    currentY += 16;
    
    doc.fillColor(lightTextColor).font(regFont).text(`SGST (${sgstRate}%):`, summaryX, currentY);
    doc.fillColor(darkTextColor).font(boldFont).text(formatPrice(sgstAmount), 445, currentY, { align: 'right', width: 95 });
    currentY += 18;
    
    // Grand Total Box
    doc.save();
    doc.fillColor(lightBgColor).rect(summaryX - 10, currentY - 5, summaryWidth + 10, 24).fill();
    doc.strokeColor(secondaryColor).rect(summaryX - 10, currentY - 5, summaryWidth + 10, 24).stroke();
    doc.restore();
    
    doc.fillColor(primaryColor).font(boldFont).fontSize(11).text('Grand Total:', summaryX, currentY + 2);
    doc.fillColor(primaryColor).font(boldFont).fontSize(11).text(formatPrice(order.totalAmount), 445, currentY + 2, { align: 'right', width: 95 });
    
    // Check if bottom area fits on page, if not add page
    if (currentY > 580) {
      doc.addPage();
      drawBackground();
      currentY = 50;
    } else {
      currentY = 620;
    }
    
    // 5. PAYMENT & SIGNATURE BOTTOM SECTION
    // Decorative separating line
    doc.strokeColor(borderMuted).lineWidth(1).moveTo(50, currentY).lineTo(545, currentY).stroke();
    currentY += 15;
    
    // Left: UPI QR Payment — real, scannable QR (fetched from settings.upiId).
    // Falls back to a clean text block (no fake/unscannable pixels) if no UPI ID
    // is configured yet, or the QR image service couldn't be reached.
    const drawQR = (doc, qx, qy, size) => {
      doc.save();
      doc.rect(qx, qy, size, size).strokeColor(primaryColor).lineWidth(1.2).stroke();
      doc.fontSize(6).fillColor(lightTextColor).font(boldFont).text('SCAN & PAY (UPI)', qx, qy - 9, { align: 'center', width: size });

      if (upiQrBuffer) {
        const pad = 5;
        doc.image(upiQrBuffer, qx + pad, qy + pad, { width: size - pad * 2, height: size - pad * 2 });
      } else {
        doc.fontSize(6.5).fillColor(lightTextColor).font(regFont).text(
          settings.upiId ? `Pay to UPI ID:\n${settings.upiId}` : 'UPI ID not configured yet.\nContact us for payment options.',
          qx + 6, qy + size / 2 - 10, { align: 'center', width: size - 12 }
        );
      }
      doc.restore();
    };
    
    drawQR(doc, 50, currentY + 5, 70);
    if (settings.upiId) {
      doc.fontSize(6.5).fillColor(lightTextColor).font(regFont).text(settings.upiId, 50, currentY + 78, { align: 'center', width: 70 });
    }
    
    // Right: Authorized Signatory
    const sigX = 365;
    doc.strokeColor(primaryColor).lineWidth(1).moveTo(sigX, currentY + 55).lineTo(sigX + 180, currentY + 55).stroke();
    doc.fillColor(primaryColor).font(boldFont).fontSize(8.5).text('For SHRI NARAYAN TRADERS', sigX, currentY + 8, { align: 'center', width: 180 });
    doc.font(obliqueFont).fontSize(7.5).fillColor(lightTextColor).text('Authorized Signatory', sigX, currentY + 62, { align: 'center', width: 180 });
    
    // 6. TERMS & CONDITIONS (Bottom Margin)
    const termsY = 740;
    doc.strokeColor(borderMuted).lineWidth(0.5).moveTo(50, termsY - 5).lineTo(545, termsY - 5).stroke();
    
    doc.fillColor(primaryColor).font(boldFont).fontSize(7.5).text('TERMS & CONDITIONS', 50, termsY);
    doc.fillColor(lightTextColor).font(regFont).fontSize(6.8);
    
    const termsList = [
      '1. Warranty: Manufacturer warranty is applicable on furniture & structural hardware items as per brand policies.',
      '2. Materials: SNT guarantees 100% transparency in raw materials (plywood, boards, and laminates) shown before production.',
      '3. Return Policy: Customized furniture orders and fabricated aluminum items are non-refundable once production starts.',
      '4. Jurisdiction: All disputes arising under this transaction are subject exclusively to Munger Jurisdiction courts.',
      '5. Verification: This is a computer-generated tax invoice and does not require a physical signature.'
    ];
    
    let ty = termsY + 11;
    termsList.forEach(term => {
      doc.text(term, 50, ty, { width: 495 });
      ty += 9;
    });
    
    // Bottom Greeting
    doc.fillColor(secondaryColor).font(obliqueFont).fontSize(8);
    doc.text('★ Thank you for choosing Shri Narayan Traders! We build relationships with quality hardware and furniture. ★', 50, 792, { align: 'center', width: 495 });
    
    doc.end();
  } catch (error) {
    console.error('Invoice print error:', error);
    res.status(500).send('Invoice generation failed');
  }
};

module.exports = {
  placeOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  trackOrder,
  updateOrderStatus,
  printGSTInvoice
};
