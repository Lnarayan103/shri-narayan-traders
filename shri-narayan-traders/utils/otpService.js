/**
 * Dynamic OTP service supporting both Email and WhatsApp verification.
 */
const crypto = require('crypto');
const axios = require('axios');
const db = require('../config/db');
const { sendMail, wrapHtmlBody } = require('./emailService');

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;
const memoryStore = new Map(); // key: purpose:email -> { code, expires, attempts }

function normalizeEmail(email) {
  return String(email || '').toLowerCase().trim();
}

function isEmail(input) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(input).trim());
}

function normalizePhone(phone) {
  let cleaned = String(phone).replace(/[\s\-\+\(\)]/g, '');
  if (cleaned.startsWith('0')) cleaned = '91' + cleaned.slice(1);
  if (cleaned.length === 10) cleaned = '91' + cleaned;
  return cleaned;
}

function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

function storeKey(purpose, email) {
  return `${purpose}:${normalizeEmail(email)}`;
}

async function saveOtp(purpose, email, code) {
  const key = storeKey(purpose, email);
  const record = {
    email: normalizeEmail(email),
    purpose,
    code: String(code),
    expires: Date.now() + OTP_TTL_MS,
    attempts: 0,
    createdAt: new Date()
  };
  memoryStore.set(key, record);
  try {
    if (db.otps) {
      await db.otps.remove({ email: record.email, purpose }, { multi: true });
      await db.otps.insert(record);
    }
  } catch (e) {
    console.warn('[OTP] NeDB store skipped:', e.message);
  }
  return record;
}

async function getOtp(purpose, email) {
  const key = storeKey(purpose, email);
  let record = memoryStore.get(key);
  if (!record && db.otps) {
    try {
      record = await db.otps.findOne({ email: normalizeEmail(email), purpose });
      if (record) memoryStore.set(key, record);
    } catch (e) {}
  }
  return record || null;
}

async function clearOtp(purpose, email) {
  const key = storeKey(purpose, email);
  memoryStore.delete(key);
  try {
    if (db.otps) await db.otps.remove({ email: normalizeEmail(email), purpose }, { multi: true });
  } catch (e) {}
}

async function sendOtpEmail(email, code, purpose) {
  const isReset = purpose === 'reset';
  const title = isReset ? 'Password Reset OTP' : 'Registration OTP';
  const action = isReset ? 'reset your password' : 'complete your registration';
  const html = `
    <p>Namaste,</p>
    <p>Your OTP to <strong>${action}</strong> on <strong>Shri Narayan Traders</strong> is:</p>
    <div style="text-align:center;margin:28px 0;">
      <div style="display:inline-block;background:#001f4d;color:#fff;font-size:32px;font-weight:800;letter-spacing:8px;padding:16px 28px;border-radius:12px;border-bottom:4px solid #c9922a;">
        ${code}
      </div>
    </div>
    <p>This code is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
    <p style="color:#64748b;font-size:13px;">If you did not request this, please ignore this email.</p>
  `;
  const result = await sendMail({
    to: email,
    subject: `${title} — Shri Narayan Traders`,
    html: typeof wrapHtmlBody === 'function' ? wrapHtmlBody(html) : html
  });
  return result;
}

/**
 * Send OTP for register or reset.
 * Returns { success, message, devOtp? }
 */
async function requestOtp(identifier, purpose) {
  const isEmailInput = isEmail(identifier);
  let normalized = '';

  if (isEmailInput) {
    normalized = normalizeEmail(identifier);
  } else {
    normalized = normalizePhone(identifier);
    if (normalized.length < 10 || normalized.length > 15) {
      return { success: false, error: 'Invalid phone number format. Please enter a 10-digit number.' };
    }
  }

  if (!['register', 'reset', 'login'].includes(purpose)) {
    return { success: false, error: 'Invalid purpose' };
  }

  const findUser = async () => {
    if (isEmailInput) {
      return (await db.users.findOne({ email: normalized })) || (await db.users.findOne({ username: normalized }));
    }
    const ten = normalized.slice(-10);
    return (await db.users.findOne({ phone: ten })) ||
           (await db.users.findOne({ email: normalized })) ||
           (await db.users.findOne({ username: normalized })) ||
           (await db.users.findOne({ username: ten }));
  };

  if (purpose === 'register') {
    const existing = await findUser();
    if (existing) {
      return { success: false, error: 'Account already exists. Please sign in.' };
    }
  }

  if (purpose === 'reset' || purpose === 'login') {
    const existing = await findUser();
    if (!existing) {
      return { success: false, error: 'No account found with this identifier. Please register first.' };
    }
  }

  if (isEmailInput) {
    // Rate limit check
    const prev = await getOtp(purpose, normalized);
    if (prev && prev.createdAt && (Date.now() - new Date(prev.createdAt).getTime()) < 45000) {
      return { success: false, error: 'Please wait 45 seconds before requesting another OTP.' };
    }

    const code = generateOtp();
    await saveOtp(purpose, normalized, code);

    let emailed = false;
    try {
      const r = await sendOtpEmail(normalized, code, purpose);
      emailed = !!(r && r.success !== false);
    } catch (e) {
      console.error('[OTP] send mail error:', e.message);
    }

    const smtpConfigured = !!(process.env.SMTP_PASS || process.env.GMAIL_APP_PASS);
    const payload = {
      success: true,
      message: emailed || smtpConfigured
        ? `OTP sent to ${normalized}. Check inbox/spam.`
        : `OTP generated (dev mode).`,
      email: normalized
    };
    if (!smtpConfigured) {
      payload.devOtp = code;
    }
    return payload;
  } else {
    // Call WhatsApp OTP System API (AI bot)
    const apiUrl = (
      process.env.WHATSAPP_BOT_URL ||
      process.env.WHATSAPP_OTP_API_URL ||
      'https://whatsapp-ai-bot-bj43.onrender.com'
    ).trim().replace(/\/$/, '');
    const apiSecret = process.env.WHATSAPP_OTP_API_SECRET || process.env.OTP_API_SECRET || 'snt_otp_secret_key_2026';

    try {
      const response = await axios.post(`${apiUrl}/api/send-otp`, {
        phone: normalized,
        name: purpose === 'register' ? 'Valued Customer' : (purpose === 'login' ? 'SNT Customer' : 'SNT User')
      }, {
        headers: {
          'x-api-key': apiSecret,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      if (response.data && response.data.success) {
        return {
          success: true,
          message: 'OTP has been successfully sent to your WhatsApp number!',
          phone: normalized
        };
      } else {
        return {
          success: false,
          error: response.data.error || 'Failed to send OTP via WhatsApp'
        };
      }
    } catch (err) {
      console.error('[WhatsApp OTP] API call failed:', err.message);
      return {
        success: false,
        error: `Could not connect to WhatsApp OTP service: ${err.message}`
      };
    }
  }
}

/**
 * Verify OTP. On success clears it (one-time) unless keep=true.
 */
async function verifyOtp(identifier, purpose, otp, { keep = false } = {}) {
  const isEmailInput = isEmail(identifier);
  const code = String(otp || '').trim();

  if (isEmailInput) {
    const emailNorm = normalizeEmail(identifier);
    if (!emailNorm || !code) return { success: false, error: 'Email and OTP required' };

    const record = await getOtp(purpose, emailNorm);
    if (!record) return { success: false, error: 'OTP expired or not requested. Please request a new one.' };

    if (Date.now() > (record.expires || 0)) {
      await clearOtp(purpose, emailNorm);
      return { success: false, error: 'OTP expired. Please request a new one.' };
    }

    record.attempts = (record.attempts || 0) + 1;
    if (record.attempts > MAX_ATTEMPTS) {
      await clearOtp(purpose, emailNorm);
      return { success: false, error: 'Too many wrong attempts. Request a new OTP.' };
    }

    if (String(record.code) !== code) {
      memoryStore.set(storeKey(purpose, emailNorm), record);
      return { success: false, error: 'Incorrect OTP. Try again.' };
    }

    if (!keep) await clearOtp(purpose, emailNorm);
    return { success: true, email: emailNorm };
  } else {
    // Call WhatsApp OTP System API (AI bot)
    const normalized = normalizePhone(identifier);
    const apiUrl = (
      process.env.WHATSAPP_BOT_URL ||
      process.env.WHATSAPP_OTP_API_URL ||
      'https://whatsapp-ai-bot-bj43.onrender.com'
    ).trim().replace(/\/$/, '');
    const apiSecret = process.env.WHATSAPP_OTP_API_SECRET || process.env.OTP_API_SECRET || 'snt_otp_secret_key_2026';

    try {
      const response = await axios.post(`${apiUrl}/api/verify-otp`, {
        phone: normalized,
        otp: code
      }, {
        headers: {
          'x-api-key': apiSecret,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      if (response.data && response.data.success) {
        return {
          success: true,
          phone: normalized
        };
      } else {
        return {
          success: false,
          error: response.data.error || 'Invalid WhatsApp OTP'
        };
      }
    } catch (err) {
      console.error('[WhatsApp OTP] Verification API call failed:', err.message);
      return {
        success: false,
        error: `Could not verify OTP: ${err.message}`
      };
    }
  }
}

module.exports = {
  requestOtp,
  verifyOtp,
  clearOtp,
  normalizeEmail
};
