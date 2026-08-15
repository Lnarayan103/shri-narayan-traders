require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const { seedAdmin } = require('./controllers/authController');
const { scheduleDailyBackup } = require('./utils/dailyBackup');
const apiRoutes = require('./routes/api');
const viewRoutes = require('./routes/views');
const { loadSettings } = require('./middleware/settings');

const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// Global Rate Limiter (Application-Level DDoS/Flooding Mitigation)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 450, // Limit each IP to 450 requests per 15 minutes window
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP address. Please try again after 15 minutes.'
});
app.use(globalLimiter);

// EJS View Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Parsing middlewares with strict size limits (Mitigates payload buffer exhaustion DoS)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Visitor Logging Middleware
app.use(async (req, res, next) => {
  const path = req.path;
  const isStatic = path.startsWith('/css') || path.startsWith('/js') || path.startsWith('/images') || path.startsWith('/uploads') || path.includes('.') || path.startsWith('/favicon.ico');
  const isApiOrHealth = path.startsWith('/api') || path.startsWith('/health');
  
  if (!isStatic && !isApiOrHealth) {
    try {
      const db = require('./config/db');
      const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const country = req.headers['cf-ipcountry'] || 'Unknown';
      const userAgent = req.headers['user-agent'] || '';
      
      if (db.visitor_logs) {
        await db.visitor_logs.insert({
          ip,
          country,
          path,
          userAgent,
          createdAt: new Date()
        });
      }
    } catch (e) {
      console.warn('⚠️ Visitor log error:', e.message);
    }
  }
  next();
});

// Load dynamic website settings globally
app.use(loadSettings);

// Detect admin/dealer dashboard area for rendering simplified dashboard navbars
app.use((req, res, next) => {
  res.locals.isAdminArea = req.path.startsWith('/admin') && req.path !== '/8340262401';
  res.locals.isDealerArea = false; // Dealer module removed
  res.locals.googleClientId = (res.locals.settings && res.locals.settings.googleClientId) || process.env.GOOGLE_CLIENT_ID || '892795324478-jrm7toes25868j9nqpjfuqro4q9d7g89.apps.googleusercontent.com';
  next();
});

// Static files server directory
app.use(express.static(path.join(__dirname, 'public')));
if (process.env.VERCEL) {
  app.use('/uploads', express.static('/tmp/uploads'));
}

// Seed default administrator credentials on system boot
(async () => {
  try {
    const database = require('./config/db');
    if (database.ready) await database.ready;
  } catch (e) { console.warn('DB ready wait:', e.message); }
  try { scheduleDailyBackup(); } catch (e) {}
 seedAdmin();
})();

// Health check endpoint for keep-alive
app.get('/health', (req, res) => res.send('OK'));

// Routes prefix mapping
app.use('/api', apiRoutes);
app.use('/', viewRoutes);

// Cross keep-alive ping for WhatsApp Bot
const WHATSAPP_BOT_URL = (process.env.WHATSAPP_BOT_URL || 'https://whatsapp-ai-bot-bj43.onrender.com').replace(/\/$/, '');
if (!process.env.VERCEL) {
  const https = require('https');
  const http = require('http');
  setInterval(() => {
    try {
      const u = new URL(WHATSAPP_BOT_URL + '/health');
      const lib = u.protocol === 'https:' ? https : http;
      lib.get(u.href, (res) => {
        console.log(`💓 Cross-pinged WhatsApp AI Bot: ${res.statusCode}`);
      }).on('error', (err) => {
        console.log('⚠️ Cross-ping to WhatsApp AI Bot failed:', err.message);
      });
    } catch (e) {
      console.log('⚠️ Cross-ping setup failed:', e.message);
    }
  }, 5 * 60 * 1000);
}

// Fallback handling
app.use((err, req, res, next) => {
  console.error('Unhandled server exception:', err.stack);
  
  // Forward exception alert to WhatsApp Bot
  const axios = require('axios');
  axios.post(WHATSAPP_BOT_URL + '/api/send-alert', {
    message: `❌ *Server Exception Alert!*\n*Path:* ${req.method} ${req.path}\n*Error:* ${err.message || err}\n*Stack:* ${(err.stack || '').split('\n').slice(0, 3).join('\n')}`
  }, { timeout: 3000 }).catch(() => {
    axios.post('https://whatsapp-ai-bot-bj43.onrender.com/api/send-alert', {
      message: `❌ *Server Exception Alert!*\n*Path:* ${req.method} ${req.path}\n*Error:* ${err.message || err}\n*Stack:* ${(err.stack || '').split('\n').slice(0, 3).join('\n')}`
    }, { timeout: 3000 }).catch(() => {});
  });

  if (req.xhr || req.path.startsWith('/api')) {
    return res.status(500).json({ error: err.message || 'Internal Server Exception' });
  }
  res.status(500).send('Internal Server Exception! Check process runtime logs.');
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`=============================================================`);
    console.log(`SHRI NARAYAN TRADERS ENTERPRISE PORTAL SERVER STARTED`);
    console.log(`Local Access Point: http://localhost:${PORT}`);
    console.log(`=============================================================`);
  });
}

// Defensive Process Exception Guards (Mitigates unhandled rejections/exceptions crashes)
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection detected at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception captured globally:', err);
  
  // Forward global crash alert to WhatsApp Bot
  const axios = require('axios');
  axios.post(WHATSAPP_BOT_URL + '/api/send-alert', {
    message: `💥 *Global Server Crash Alert!*\n*Error:* ${err.message || err}\n*Stack:* ${(err.stack || '').split('\n').slice(0, 3).join('\n')}`
  }, { timeout: 3000 }).catch(() => {
    axios.post('https://whatsapp-ai-bot-bj43.onrender.com/api/send-alert', {
      message: `💥 *Global Server Crash Alert!*\n*Error:* ${err.message || err}\n*Stack:* ${(err.stack || '').split('\n').slice(0, 3).join('\n')}`
    }, { timeout: 3000 }).catch(() => {});
  });
});

module.exports = app;
