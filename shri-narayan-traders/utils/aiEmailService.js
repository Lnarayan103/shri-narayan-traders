const axios = require('axios');
const db = require('../config/db');
const { sendMail, wrapHtmlBody, fallbackTemplates } = require('./emailService');

let aiEmailCallsToday = 0;
let lastResetDate = new Date().toDateString();

function checkAIRateLimit() {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    aiEmailCallsToday = 0;
    lastResetDate = today;
  }
  
  if (aiEmailCallsToday >= 50) {
    console.warn('AI email daily limit reached (50/day max), using fallback templates.');
    return false;
  }
  
  aiEmailCallsToday++;
  return true;
}

async function getOpenRouterConfig() {
  let apiKey = process.env.OPENROUTER_API_KEY;
  let model = process.env.OPENROUTER_MODEL || 'openai/gpt-oss-20b:free';
  
  const config = await db.settings.findOne({ _id: 'global_settings' });
  if (config) {
    if (!apiKey && config.openRouterApiKey) {
      apiKey = config.openRouterApiKey;
    }
    if (config.openRouterModel) {
      model = config.openRouterModel;
    }
  }
  return { apiKey, model };
}

async function generateEmailBody(emailType, contextData) {
  // Check rate limit first
  if (!checkAIRateLimit()) {
    console.log('[AI Email] Rate limit reached. Skipping AI generation.');
    return null;
  }

  const { apiKey, model } = await getOpenRouterConfig();
  if (!apiKey || apiKey === 'your_openrouter_api_key_here' || apiKey.startsWith('your_')) {
    console.log('[AI Email] OpenRouter API Key not configured. Skipping AI generation.');
    return null;
  }

  try {
    const prompt = `You are an email content writer for Shri Narayan Traders, a hardware, furniture, and aluminium fabrication works business located in Kauda madan, near IDBI Bank, Dilawer Pur, Munger, Bihar (PIN 811201).

Write a professional, warm, and helpful email subject line and body in HTML format.

Email Type: ${emailType}
Context Data: ${JSON.stringify(contextData)}

Business Details:
- Name: Shri Narayan Traders
- Phone: 9771233843, 8340262401
- Email: laxminarayan34939@gmail.com
- Location: Kauda madan, DJ College Rd, near IDBI Bank, Dilawer Pur, Munger, Bihar - 811201
- WhatsApp: wa.me/919771233843

Rules:
1. Write in simple, friendly English.
2. Add 1-2 relevant Hindi phrases naturally (like 'Dhanyavaad', 'Shukriya', 'Aapka swagat hai', or 'Pranam') where appropriate so it feels warm and personal.
3. Keep it concise — the email body must be maximum 200 words.
4. Return ONLY the inner HTML content that goes inside <div class='body'>. Do NOT include full HTML page structure (no <html>, <head>, or <body> tags).
5. Use inline styles matching these corporate colors:
   - Primary: #001f4d (navy blue, used for headings, accents, primary buttons)
   - Accent: #c9922a (gold, used for highlights, borders, warnings)
   - Text: #1e293b (slate/charcoal, for paragraphs and regular text)
6. Ensure the tone matches the situation:
   - Enquiry reply (enquiry_confirmation): Warm, welcoming, and addressing the specific enquiry subject.
   - Admin enquiry alert (admin_enquiry_alert): Crisp, clear, informative, summarizing customer coordinates and query.
   - Order confirmed (order_confirmation): Excited, reassuring, and detailing the items purchased, total cost, and tracking link.
   - Order status update (order_status_update): Match the status tone:
     - Confirmed: Preparing and packing.
     - Processing: Packaged with care and quality-checked.
     - Shipped: On its way, exciting, sharing tracking/delivery timing.
     - Delivered: Extremely grateful, thanking them, requesting a Google Business Review.
     - Cancelled: Empathetic, apologetic, and offering alternative support or refund updates.
   - Low stock alert (low_stock_alert): Urgent, action-oriented, prompting the admin to restock with button, suggesting reorder quantities if possible.

You MUST return a JSON object with this exact format:
{
  "subject": "an engaging, context-aware, professional subject line",
  "body": "the inner HTML body content"
}

Do not return any markdown code block wrappers (like \`\`\`json) outside the JSON. Return only the raw JSON.`;

    console.log(`[AI Email] Calling OpenRouter completions via Axios: model=${model}`);
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: model,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://shri-narayan-traders.vercel.app',
        'X-Title': 'Shri Narayan Traders Portal'
      },
      timeout: 20000
    });

    if (!response.data || !response.data.choices || response.data.choices.length === 0) {
      throw new Error('No completion choices returned from OpenRouter.');
    }

    const text = response.data.choices[0].message.content.trim();
    
    // Clean up text if any markdown ticks got added
    let cleanedText = text;
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.substring(7);
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.substring(3);
    }
    if (cleanedText.endsWith('```')) {
      cleanedText = cleanedText.substring(0, cleanedText.length - 3);
    }
    cleanedText = cleanedText.trim();

    const parsed = JSON.parse(cleanedText);
    
    if (parsed.subject && parsed.body) {
      console.log(`[AI Email] AI email generated successfully via OpenRouter for type: ${emailType}`);
      return {
        subject: parsed.subject,
        body: parsed.body
      };
    }
    
    console.warn('[AI Email] AI response missing subject or body field.');
    return null;
  } catch (err) {
    console.warn('[AI Email] AI generation failed, using fallback template:', err.message);
    return null;
  }
}

// 5 Email Wrapper Triggers

async function triggerEmail(emailType, to, contextData) {
  let subject = '';
  let bodyContent = '';
  
  // Try AI generation first
  const aiResult = await generateEmailBody(emailType, contextData);
  
  if (aiResult) {
    subject = aiResult.subject;
    bodyContent = aiResult.body;
  } else {
    // Revert to fallback templates
    const fallback = fallbackTemplates[emailType];
    if (fallback) {
      subject = fallback.subject(contextData);
      bodyContent = fallback.body(contextData);
      console.log(`[Email Fallback] Generated fallback templates for type: ${emailType}`);
    } else {
      console.error(`[Email Error] No email template found for type: ${emailType}`);
      return false;
    }
  }

  // Wrap in professional template layout
  const fullHtml = wrapHtmlBody(bodyContent);
  
  // Dispatch via nodemailer transporter
  return await sendMail({ to, subject, html: fullHtml });
}

// 1. sendEnquiryConfirmation
async function sendEnquiryConfirmation(enquiry) {
  const context = {
    type: "enquiry_confirmation",
    customerName: enquiry.name,
    subject: enquiry.subject || 'Enquiry details',
    message: enquiry.message,
    phone: enquiry.phone,
    businessPhone: "9771233843"
  };
  return await triggerEmail("enquiry_confirmation", enquiry.email, context);
}

// 2. sendEnquiryAlertToAdmin
async function sendEnquiryAlertToAdmin(enquiry) {
  const settings = await db.settings.findOne({ _id: 'global_settings' }) || {};
  const adminEmail = settings.email || 'laxminarayan34939@gmail.com';
  
  const context = {
    type: "admin_enquiry_alert",
    customerName: enquiry.name,
    customerPhone: enquiry.phone,
    customerEmail: enquiry.email || "Not provided",
    subject: enquiry.subject || 'Enquiry details',
    message: enquiry.message,
    timestamp: new Date().toLocaleString('en-IN')
  };
  return await triggerEmail("admin_enquiry_alert", adminEmail, context);
}

// 3. sendOrderConfirmation
async function sendOrderConfirmation(order) {
  const context = {
    type: "order_confirmation",
    customerName: order.customerName,
    orderId: order.orderId,
    items: order.items.map(i => ({
      name: i.name,
      qty: i.qty,
      amount: i.qty * (i.rate || i.price || 0)
    })),
    totalAmount: order.totalAmount,
    paymentMethod: order.paymentMethod || 'COD',
    orderDate: new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN')
  };
  return await triggerEmail("order_confirmation", order.customerEmail, context);
}

// 4. sendOrderStatusUpdate
async function sendOrderStatusUpdate(order, newStatus) {
  const statusMessageMap = {
    confirmed:  "Your order has been confirmed and is being prepared.",
    processing: "Your items are being carefully packed and quality checked.",
    shipped:    "Your order is on its way! Expect delivery soon.",
    delivered:  "Your order has been delivered. We hope you love it!",
    cancelled:  "Your order has been cancelled. We apologize for the inconvenience."
  };

  const context = {
    type: "order_status_update",
    customerName: order.customerName,
    orderId: order.orderId,
    newStatus: newStatus,
    totalAmount: order.totalAmount,
    trackingUrl: `http://localhost:3000/track?orderId=${order.orderId}`,
    statusMessage: statusMessageMap[newStatus] || "Your order status has been updated."
  };
  return await triggerEmail("order_status_update", order.customerEmail, context);
}

// 5. sendLowStockAlert
async function sendLowStockAlert(product) {
  const settings = await db.settings.findOne({ _id: 'global_settings' }) || {};
  const adminEmail = settings.email || 'laxminarayan34939@gmail.com';

  const context = {
    type: "low_stock_alert",
    productName: product.name,
    category: product.category,
    currentStock: product.stock,
    threshold: product.lowStockThreshold || 5,
    adminPanelUrl: "http://localhost:3000/admin/products",
    urgencyLevel: product.stock === 0 ? "OUT OF STOCK" : "LOW STOCK"
  };
  return await triggerEmail("low_stock_alert", adminEmail, context);
}

module.exports = {
  sendEnquiryConfirmation,
  sendEnquiryAlertToAdmin,
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendLowStockAlert,
  triggerEmail
};
