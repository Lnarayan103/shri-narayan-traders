const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'shri-narayan-traders-secret-key-2026';

function extractIdString(id) {
  if (!id) return '';
  if (typeof id === 'string') return id;
  if (typeof id === 'object') {
    if (id.buffer && Buffer.isBuffer(id.buffer)) return id.buffer.toString('hex');
    if (Buffer.isBuffer(id)) return id.toString('hex');
    if (id.id) {
      if (Buffer.isBuffer(id.id)) return id.id.toString('hex');
      if (id.id.type === 'Buffer' && Array.isArray(id.id.data)) return Buffer.from(id.id.data).toString('hex');
      return String(id.id);
    }
    if (id.toString && id.toString() !== '[object Object]') return id.toString();
  }
  return String(id);
}

async function findUserByAnyId(id) {
  if (!id) return null;
  const idStr = extractIdString(id);
  let user = null;
  try { user = await db.users.findOne({ _id: idStr }); } catch (e) {}
  if (user) return user;
  try { user = await db.users.findOne({ _id: id }); } catch (e) {}
  if (user) return user;
  // Last resort: scan (small user table) for matching extractIdString
  try {
    const all = await db.users.find({});
    const list = Array.isArray(all) ? all : await all;
    if (Array.isArray(list)) {
      user = list.find(u => extractIdString(u._id) === idStr) || null;
    }
  } catch (e) {}
  return user || null;
}

const authenticate = async (req, res, next) => {
  try {
    let token = (req.cookies && req.cookies.token) || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

    if (!token) {
      req.user = null;
      res.locals.user = null;
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await findUserByAnyId(decoded.id);

    if (!user) {
      req.user = null;
      res.locals.user = null;
      res.clearCookie('token', { path: '/' });
    } else {
      const uid = extractIdString(user._id);
      req.user = {
        id: uid,
        username: user.username,
        email: user.email,
        name: user.name || user.username,
        role: user.role,
        phone: user.phone || '',
        address: user.address || '',
        picture: user.picture || '',
        googleId: user.googleId || null,
        authProvider: user.authProvider || 'local',
      };
      res.locals.user = req.user;
    }
    next();
  } catch (error) {
    req.user = null;
    res.locals.user = null;
    res.clearCookie('token', { path: '/' });
    next();
  }
};

const requireAdmin = async (req, res, next) => {
  if (!req.user || !['admin', 'super-admin', 'manager', 'sales'].includes(req.user.role)) {
    if (req.xhr || req.path.startsWith('/api')) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    return res.redirect('/8340262401?error=unauthorized');
  }
  try {
    res.locals.pendingEnquiries = await db.enquiries.count({ status: 'new' });
  } catch (err) {
    console.error('Error setting pendingEnquiries in requireAdmin:', err);
    res.locals.pendingEnquiries = 0;
  }
  next();
};

const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      if (req.xhr || req.path.startsWith('/api')) {
        return res.status(403).json({ error: 'Permission denied. Insufficient role permissions.' });
      }
      return res.redirect('/admin/dashboard?error=permission_denied');
    }
    next();
  };
};

const requireCustomer = (req, res, next) => {
  if (!req.user || req.user.role !== 'customer') {
    if (req.xhr || req.path.startsWith('/api')) {
      return res.status(403).json({ error: 'Please sign in with Google to continue' });
    }
    return res.redirect('/login?error=login_required');
  }
  next();
};

module.exports = {
  authenticate,
  requireAdmin,
  checkRole,
  requireCustomer,
  JWT_SECRET
};
