const nodemailer = require('nodemailer');
const db = require('../config/db');

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  const settings = await db.settings.findOne({ _id: 'global_settings' }) || {};
  const user = process.env.SMTP_USER || process.env.GMAIL_USER || settings.email || 'laxminarayan34939@gmail.com';
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASS;

  if (!pass) {
    console.warn('⚠️ SMTP/Gmail password (SMTP_PASS or GMAIL_APP_PASS) is not set in .env. Emails will be logged to console.');
    return null;
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user,
      pass: pass
    }
  });

  return transporter;
}

function wrapHtmlBody(bodyContent) {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; color: #1e293b; line-height: 1.6;">
      <div style="background-color: #001f4d; padding: 20px; text-align: center; border-bottom: 3px solid #c9922a;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">SHRI NARAYAN TRADERS</h1>
        <p style="color: #c9922a; margin: 5px 0 0 0; font-size: 12px; font-weight: bold; text-transform: uppercase;">Hardware • Furniture • Aluminium Works</p>
      </div>
      <div class="body" style="padding: 30px; background-color: #ffffff;">
        ${bodyContent}
      </div>
      <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
        <p style="margin: 0 0 8px 0;"><strong>Shri Narayan Traders</strong><br>Kauda madan, DJ College Rd, near IDBI Bank, Dilawer Pur, Munger, Bihar - 811201</p>
        <p style="margin: 0 0 8px 0;">Phones: 9771233843, 8340262401 | Email: laxminarayan34939@gmail.com</p>
        <p style="margin: 8px 0 0 0; color: #94a3b8;">&copy; ${new Date().getFullYear()} Shri Narayan Traders. All rights reserved. <br><span style="color: #c9922a; font-weight: bold; font-size: 11px;">Created by SNT Self Laxmi Narayan</span></p>
      </div>
    </div>
  `;
}

// Fallback HTML content generators
function getFallbackEnquiryConfirmation(context) {
  return `
    <p>Dear ${context.customerName},</p>
    <p>Aapki enquiry mil gayi. Hum 24 ghante mein contact karenge.</p>
    <div style="background-color: #f1f5f9; padding: 15px; border-left: 4px solid #c9922a; margin: 20px 0; border-radius: 4px;">
      <strong>Aapka message:</strong><br>
      <em>"${context.message}"</em>
    </div>
    <p style="margin-top: 20px;">Dhanyavaad,<br><strong>Shri Narayan Traders Team</strong></p>
  `;
}

function getFallbackAdminEnquiryAlert(context) {
  return `
    <h3 style="color: #001f4d; margin-top: 0;">New Customer Enquiry Alert</h3>
    <p>Naya customer enquiry mila hai. Details niche diye gaye hain:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr>
        <td style="padding: 8px 0; font-weight: bold; width: 120px;">Name:</td>
        <td style="padding: 8px 0;">${context.customerName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Phone:</td>
        <td style="padding: 8px 0;">${context.customerPhone}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Email:</td>
        <td style="padding: 8px 0;">${context.customerEmail}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Subject:</td>
        <td style="padding: 8px 0;">${context.subject}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Message:</td>
        <td style="padding: 8px 0;">${context.message}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Time:</td>
        <td style="padding: 8px 0;">${context.timestamp}</td>
      </tr>
    </table>
    <div style="text-align: center; margin-top: 25px;">
      <a href="http://localhost:3000/admin/enquiries" style="background-color: #001f4d; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold; border-bottom: 3px solid #c9922a; display: inline-block;">View in Admin Panel</a>
    </div>
  `;
}

function getFallbackOrderConfirmation(context) {
  const itemsHtml = context.items.map(item => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 8px 0;">${item.name}</td>
      <td style="padding: 8px 0; text-align: center;">${item.qty}</td>
      <td style="padding: 8px 0; text-align: right;">Rs. ${item.amount.toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <p>Dear ${context.customerName},</p>
    <p>Bahut shukriya! 🙏 Aapka order successfully place ho gaya hai.</p>
    <p><strong>Order ID:</strong> ${context.orderId}</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <thead>
        <tr style="border-bottom: 2px solid #001f4d; text-align: left;">
          <th style="padding: 8px 0; color: #001f4d;">Item</th>
          <th style="padding: 8px 0; text-align: center; color: #001f4d;">Qty</th>
          <th style="padding: 8px 0; text-align: right; color: #001f4d;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
    <div style="text-align: right; font-size: 16px; font-weight: bold; color: #001f4d; margin-top: 10px;">
      Total: Rs. ${context.totalAmount.toFixed(2)} + GST
    </div>
    <p style="margin-top: 25px; text-align: center;">
      <a href="http://localhost:3000/track?orderId=${context.orderId}" style="background-color: #c9922a; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Track Your Order</a>
    </p>
  `;
}

function getFallbackOrderStatusUpdate(context) {
  return `
    <p>Dear ${context.customerName},</p>
    <p>Aapke order (ID: <strong>${context.orderId}</strong>) ka status update ho gaya hai.</p>
    <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
      <div style="font-size: 14px; text-transform: uppercase; color: #64748b; margin-bottom: 5px;">New Status</div>
      <div style="font-size: 24px; font-weight: bold; color: #001f4d;">${context.newStatus.toUpperCase()}</div>
      <p style="margin: 15px 0 0 0; color: #1e293b; font-style: italic;">"${context.statusMessage}"</p>
    </div>
    <p style="text-align: center; margin-top: 25px;">
      <a href="http://localhost:3000/track?orderId=${context.orderId}" style="background-color: #001f4d; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; border-bottom: 3px solid #c9922a; display: inline-block;">Track Your Order</a>
    </p>
  `;
}

function getFallbackLowStockAlert(context) {
  return `
    <h3 style="color: #ef4444; margin-top: 0;">⚠️ Low Stock Alert</h3>
    <p>System notification: Is product ka stock limit se kam ho gaya hai.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr>
        <td style="padding: 8px 0; font-weight: bold; width: 150px;">Product Name:</td>
        <td style="padding: 8px 0;">${context.productName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Category:</td>
        <td style="padding: 8px 0;">${context.category}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Current Stock:</td>
        <td style="padding: 8px 0; color: #ef4444; font-weight: bold;">${context.currentStock} units</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Alert Threshold:</td>
        <td style="padding: 8px 0;">${context.threshold} units</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Urgency Level:</td>
        <td style="padding: 8px 0; font-weight: bold; color: ${context.urgencyLevel === 'OUT OF STOCK' ? '#ef4444' : '#f59e0b'}">${context.urgencyLevel}</td>
      </tr>
    </table>
    <div style="text-align: center; margin-top: 25px;">
      <a href="http://localhost:3000/admin/products" style="background-color: #001f4d; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold; border-bottom: 3px solid #c9922a; display: inline-block;">Restock Karo</a>
    </div>
  `;
}

// Map types to fallbacks
const fallbackTemplates = {
  enquiry_confirmation: {
    subject: (context) => 'Thank you for your enquiry — Shri Narayan Traders',
    body: getFallbackEnquiryConfirmation
  },
  admin_enquiry_alert: {
    subject: (context) => `🔔 New Enquiry from ${context.customerName} — SNT Admin`,
    body: getFallbackAdminEnquiryAlert
  },
  order_confirmation: {
    subject: (context) => `Order Confirmed ✅ ${context.orderId}`,
    body: getFallbackOrderConfirmation
  },
  order_status_update: {
    subject: (context) => `Order Status Updated: ${context.newStatus.toUpperCase()} - ${context.orderId}`,
    body: getFallbackOrderStatusUpdate
  },
  low_stock_alert: {
    subject: (context) => `⚠️ Low Stock — ${context.productName}`,
    body: getFallbackLowStockAlert
  }
};

async function sendMail({ to, subject, html }) {
  if (!to || to.trim() === '' || to === 'Not provided') {
    console.log('[Email Skip] No recipient email address provided. Skipping silently.');
    return true;
  }

  try {
    const client = await getTransporter();
    const settings = await db.settings.findOne({ _id: 'global_settings' }) || {};
    const fromAddress = process.env.SMTP_USER || process.env.GMAIL_USER || settings.email || 'laxminarayan34939@gmail.com';

    if (!client) {
      console.log(`[Email Mock] Transporter not configured. Simulation log:\nTo: ${to}\nSubject: ${subject}\nBody length: ${html.length}`);
      return true;
    }

    const mailOptions = {
      from: `"Shri Narayan Traders" <${fromAddress}>`,
      to,
      subject,
      html
    };

    const info = await client.sendMail(mailOptions);
    console.log(`[Email Sent] Message ID: ${info.messageId} to ${to}`);
    return true;
  } catch (error) {
    console.error(`[Email Error] Failed to send email to ${to}:`, error.message);
    // Silent fallback to avoid breaking core logic
    return false;
  }
}

module.exports = {
  getTransporter,
  sendMail,
  wrapHtmlBody,
  fallbackTemplates
};
