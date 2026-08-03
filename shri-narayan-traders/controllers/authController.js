const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');
const { logActivity } = require('../utils/logger');
const otpService = require('../utils/otpService');
const { verifyGoogleIdToken } = require('../utils/googleAuth');

function extractIdString(id) {
  if (!id) return '';
  if (typeof id === 'string') return id;
  if (typeof id === 'object') {
    if (id.buffer && Buffer.isBuffer(id.buffer)) {
      return id.buffer.toString('hex');
    }
    if (Buffer.isBuffer(id)) {
      return id.toString('hex');
    }
    if (id.id) {
      if (Buffer.isBuffer(id.id)) {
        return id.id.toString('hex');
      }
      if (id.id.type === 'Buffer' && Array.isArray(id.id.data)) {
        return Buffer.from(id.id.data).toString('hex');
      }
      return String(id.id);
    }
    if (id.toString && id.toString() !== '[object Object]') {
      return id.toString();
    }
  }
  return String(id);
}

// Cookies must be Secure in production (site is served over HTTPS on Render).
// Kept as a helper so both password-login and Google-login use identical, correct options.
const cookieOptions = (maxAgeMs, req) => {
  const isHttps = process.env.NODE_ENV === 'production'
    || process.env.RENDER === 'true'
    || (req && (req.secure || req.headers['x-forwarded-proto'] === 'https'));
  return {
    httpOnly: true,
    maxAge: maxAgeMs,
    sameSite: 'lax',
    secure: !!isHttps,
    path: '/'
  };
};

// Seed default admin if none exists
const seedAdmin = async () => {
  try {
    let admin = await db.users.findOne({ role: 'admin' });
    if (!admin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.users.insert({
        username: '8340262401',
        email: 'laxminarayan34939@gmail.com',
        password: hashedPassword,
        role: 'admin',
        name: 'Shri Narayan Traders (Admin)',
        phone: '8340262401',
        createdAt: new Date()
      });
      console.log('Default admin seeded successfully: username: 8340262401 / password: admin123');
    } else if (admin.username !== '8340262401') {
      await db.users.update({ _id: admin._id }, { $set: { username: '8340262401', phone: '8340262401' } });
      console.log('Admin username and phone updated to 8340262401 in database.');
    }
  } catch (error) {
    console.error('Error seeding admin:', error);
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const user = await db.users.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Block old dealer accounts from logging in
    if (user.role === 'dealer') {
      return res.status(403).json({ error: 'Dealer portal has been discontinued. Please contact support.' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '365d' });
    
    res.cookie('token', token, cookieOptions(365 * 24 * 60 * 60 * 1000, req));
    
    await logActivity(user._id, user.username, 'Login Success', `Logged in successfully with role: ${user.role}`);
    
    return res.json({ message: 'Login successful', token, role: user.role });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Google Sign-In: cryptographically verify credential (RS256 signature + iss/aud/exp),
 * then auto-register customer if first time.
 * Body: { credential }  // Google Identity Services JWT
 */
const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    const settings = await db.settings.findOne({ _id: 'global_settings' }) || {};
    const clientId = settings.googleClientId || process.env.GOOGLE_CLIENT_ID || '892795324478-jrm7toes25868j9nqpjfuqro4q9d7g89.apps.googleusercontent.com';

    let payload;
    try {
      payload = await verifyGoogleIdToken(credential, clientId);
    } catch (verifyErr) {
      console.error('Google token verification failed:', verifyErr.message);
      return res.status(401).json({ error: `Google sign-in verification failed: ${verifyErr.message}` });
    }

    const email = String(payload.email || '').toLowerCase().trim();
    const googleId = String(payload.sub || '');
    const name = payload.name || payload.given_name || (email.split('@')[0] || 'Customer');
    const picture = payload.picture || '';

    if (!email) {
      return res.status(400).json({ error: 'Google account has no email' });
    }

    // Find existing user WITHOUT $or (more reliable across Mongo + NeDB)
    let user = null;
    try {
      if (googleId) user = await db.users.findOne({ googleId });
    } catch (e) { console.warn('find by googleId:', e.message); }
    if (!user) {
      try { user = await db.users.findOne({ email }); } catch (e) { console.warn('find by email:', e.message); }
    }
    if (!user) {
      try { user = await db.users.findOne({ username: email }); } catch (e) { /* ignore */ }
    }

    if (user && user._id) {
      const userIdStr = extractIdString(user._id);
      const updates = { lastLoginAt: new Date() };
      if (!user.googleId && googleId) updates.googleId = googleId;
      if (picture && user.picture !== picture) updates.picture = picture;
      if (name && !user.name) updates.name = name;
      if (user.role === 'dealer') updates.role = 'customer';
      if (!user.role) updates.role = 'customer';
      try {
        await db.users.update({ _id: userIdStr }, { $set: updates });
        // IMPORTANT: do NOT replace user with null if re-fetch fails
        const refreshed = await db.users.findOne({ _id: userIdStr });
        if (refreshed && refreshed._id) {
          user = refreshed;
        } else {
          Object.assign(user, updates);
        }
      } catch (e) {
        console.warn('Google login user update warning:', e.message);
        Object.assign(user, updates);
      }
    } else {
      // Auto-register new customer
      const newDoc = {
        username: email,
        email,
        name,
        googleId,
        picture,
        role: 'customer',
        authProvider: 'google',
        phone: '',
        address: '',
        emailVerified: !!payload.email_verified,
        createdAt: new Date(),
        lastLoginAt: new Date()
      };
      let inserted = null;
      try {
        inserted = await db.users.insert(newDoc);
      } catch (insErr) {
        console.error('Google register insert failed:', insErr.message);
        // Race condition: user created in parallel
        inserted = null;
      }
      if (inserted && inserted._id) {
        user = inserted;
      } else {
        user = await db.users.findOne({ email }) || await db.users.findOne({ googleId }) || await db.users.findOne({ username: email });
      }
      if (!user || !user._id) {
        return res.status(500).json({ error: 'Could not create customer account. Please try again.' });
      }
      try {
        await logActivity(extractIdString(user._id), email, 'Google Registration', `New customer auto-registered via Google: ${name}`);
      } catch (e) { /* non-fatal */ }
    }

    if (!user || !user._id) {
      return res.status(500).json({ error: 'Login failed: user record missing after auth' });
    }

    const sessionUserId = extractIdString(user._id);
    if (!sessionUserId) {
      return res.status(500).json({ error: 'Login failed: invalid user id' });
    }

    // Best-effort last login (ignore failures)
    try {
      await db.users.update({ _id: sessionUserId }, { $set: { lastLoginAt: new Date() } });
    } catch (e) { /* ignore */ }

    const role = user.role || 'customer';
    const token = jwt.sign({ id: sessionUserId, role }, JWT_SECRET, { expiresIn: '365d' });

    // HTTPS-safe cookie for Render
    const isHttps = process.env.NODE_ENV === 'production'
      || process.env.RENDER === 'true'
      || req.secure
      || req.headers['x-forwarded-proto'] === 'https';
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 365 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
      secure: !!isHttps,
      path: '/'
    });

    try {
      await logActivity(sessionUserId, user.email || user.username || email, 'Google Login', 'Customer signed in via Google');
    } catch (e) { /* non-fatal */ }

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      role,
      user: {
        id: sessionUserId,
        name: user.name || name,
        email: user.email || email,
        picture: user.picture || picture,
        phone: user.phone || '',
        address: user.address || ''
      }
    });
  } catch (error) {
    console.error('Google login error:', error);
    return res.status(500).json({ error: `Server error during Google login: ${error.message}` });
  }
};

const logout = async (req, res) => {
  try {
    if (req.user) {
      await logActivity(req.user.id, req.user.username || req.user.email, 'Logout', `Logged out from session.`);
    }
    res.clearCookie('token', { path: '/' });
    if (req.xhr || req.path.startsWith('/api') || req.headers.accept?.includes('application/json')) {
      return res.json({ message: 'Logout successful' });
    }
    return res.redirect('/');
  } catch (err) {
    res.clearCookie('token');
    return res.redirect('/');
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const user = await db.users.findOne({ _id: req.user.id });
    if (!user || !user.password) {
      return res.status(404).json({ error: 'User not found or password not set (Google account)' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid current password' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await db.users.update({ _id: req.user.id }, { $set: { password: hashedNewPassword } });

    await logActivity(user._id, user.username, 'Password Changed', 'User changed their account password.');

    return res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

/** Customer updates own profile (phone + address) */
const updateProfile = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'customer') {
      return res.status(403).json({ error: 'Only customers can update this profile' });
    }

    const { phone, address, name } = req.body;
    const updates = {};

    if (phone !== undefined) {
      const cleaned = String(phone).replace(/\D/g, '');
      if (cleaned && cleaned.length !== 10) {
        return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number' });
      }
      updates.phone = cleaned;
    }
    if (address !== undefined) {
      updates.address = String(address).trim().slice(0, 500);
    }
    if (name !== undefined && String(name).trim()) {
      updates.name = String(name).trim().slice(0, 100);
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.updatedAt = new Date();
    await db.users.update({ _id: req.user.id }, { $set: updates });
    const user = await db.users.findOne({ _id: req.user.id });

    await logActivity(req.user.id, user.email || user.username, 'Profile Updated', 'Customer updated phone/address');

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        phone: user.phone || '',
        address: user.address || ''
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

/** Get current logged-in user profile */
const getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const user = await db.users.findOne({ _id: req.user.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        phone: user.phone || '',
        address: user.address || '',
        role: user.role,
        authProvider: user.authProvider || 'local'
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};



/** Customer email+password registration (free alternative to Google) */
const customerRegister = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const emailNorm = String(email).toLowerCase().trim();
    const existing = await db.users.findOne({ email: emailNorm }) || await db.users.findOne({ username: emailNorm });
    if (existing) {
      return res.status(400).json({ error: 'Account already exists. Please sign in.' });
    }
    const hashed = await bcrypt.hash(String(password), 10);
    const user = await db.users.insert({
      username: emailNorm,
      email: emailNorm,
      name: (name || emailNorm.split('@')[0]).trim(),
      phone: String(phone || '').replace(/\D/g, '').slice(0, 10),
      password: hashed,
      role: 'customer',
      authProvider: 'local',
      address: '',
      createdAt: new Date(),
      lastLoginAt: new Date()
    });
    const uid = extractIdString(user._id);
    const token = jwt.sign({ id: uid, role: 'customer' }, JWT_SECRET, { expiresIn: '30d' });
    const isHttps = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true' || req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie('token', token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, sameSite: 'lax', secure: !!isHttps, path: '/' });
    return res.json({
      success: true,
      token,
      role: 'customer',
      user: { id: uid, name: user.name, email: user.email, phone: user.phone || '', address: '', picture: '' }
    });
  } catch (error) {
    console.error('Customer register error:', error);
    return res.status(500).json({ error: 'Registration failed: ' + error.message });
  }
};

/** Customer email+password login */
const customerLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const emailNorm = String(email).toLowerCase().trim();
    const isEmailInput = emailNorm.includes('@');
    let user = null;
    if (isEmailInput) {
      user = await db.users.findOne({ email: emailNorm }) || await db.users.findOne({ username: emailNorm });
    } else {
      let phoneNorm = emailNorm.replace(/\D/g, '');
      const tenDigitPhone = phoneNorm.slice(-10);
      user = await db.users.findOne({ phone: tenDigitPhone }) || 
             await db.users.findOne({ email: phoneNorm }) || 
             await db.users.findOne({ username: phoneNorm });
    }
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid email or password (Google-only accounts must use Google Sign-In)' });
    }
    if (user.role && !['customer', 'dealer'].includes(user.role) && user.role !== 'customer') {
      // allow customer; block admin from this endpoint
      if (['admin', 'super-admin', 'manager', 'sales'].includes(user.role)) {
        return res.status(403).json({ error: 'Please use admin login page' });
      }
    }
    const ok = await bcrypt.compare(String(password), user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    const uid = extractIdString(user._id);
    try {
      await db.users.update({ _id: uid }, { $set: { lastLoginAt: new Date() } });
    } catch (e) {}

    const token = jwt.sign({ id: uid, role: user.role || 'customer' }, JWT_SECRET, { expiresIn: '30d' });
    const isHttps = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true' || req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie('token', token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, sameSite: 'lax', secure: !!isHttps, path: '/' });

    return res.json({
      success: true,
      token,
      role: user.role || 'customer',
      user: {
        id: uid,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        address: user.address || '',
        picture: user.picture || ''
      }
    });
  } catch (error) {
    console.error('Customer login error:', error);
    return res.status(500).json({ error: 'Login failed: ' + error.message });
  }
};



// ─── OTP Registration / Forgot Password ─────────────────
const sendOtp = async (req, res) => {
  try {
    const { email, purpose } = req.body;
    const result = await otpService.requestOtp(email, purpose || 'register');
    if (!result.success) return res.status(400).json(result);
    return res.json(result);
  } catch (error) {
    console.error('sendOtp error:', error);
    return res.status(500).json({ error: 'Could not send OTP: ' + error.message });
  }
};

const verifyOtpOnly = async (req, res) => {
  try {
    const { email, otp, purpose } = req.body;
    // keep=true so same OTP can be used once more for final register/reset
    const result = await otpService.verifyOtp(email, purpose || 'register', otp, { keep: true });
    if (!result.success) return res.status(400).json(result);
    return res.json({ success: true, message: 'OTP verified', email: result.email });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/** Complete registration after OTP: { email, otp, password, name, phone } */
const registerWithOtp = async (req, res) => {
  try {
    const { email, otp, password, name, phone } = req.body;
    if (!email || !otp || !password) {
      return res.status(400).json({ error: 'Email, OTP and password required' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const check = await otpService.verifyOtp(email, 'register', otp, { keep: false });
    if (!check.success) return res.status(400).json(check);

    const isEmailId = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
    const emailNorm = isEmailId ? otpService.normalizeEmail(email) : '';
    const phoneDigits = String(phone || email || '').replace(/\D/g, '').slice(-10);
    const usernameKey = isEmailId ? emailNorm : phoneDigits;

    const existing =
      (emailNorm && ((await db.users.findOne({ email: emailNorm })) || (await db.users.findOne({ username: emailNorm })))) ||
      (phoneDigits && ((await db.users.findOne({ phone: phoneDigits })) || (await db.users.findOne({ username: phoneDigits }))));
    if (existing) {
      return res.status(400).json({ error: 'Account already exists. Please sign in.' });
    }

    const hashed = await bcrypt.hash(String(password), 10);
    const user = await db.users.insert({
      username: usernameKey,
      email: emailNorm || '',
      name: (name || (emailNorm ? emailNorm.split('@')[0] : phoneDigits) || 'Customer').toString().trim().slice(0, 100),
      phone: phoneDigits,
      password: hashed,
      role: 'customer',
      authProvider: isEmailId ? 'email' : 'whatsapp',
      emailVerified: !!isEmailId,
      phoneVerified: !isEmailId,
      address: '',
      createdAt: new Date(),
      lastLoginAt: new Date()
    });

    const uid = extractIdString(user._id);
    const token = jwt.sign({ id: uid, role: 'customer' }, JWT_SECRET, { expiresIn: '30d' });
    const isHttps = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true' || req.secure || (req.headers && req.headers['x-forwarded-proto'] === 'https');
    res.cookie('token', token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, sameSite: 'lax', secure: !!isHttps, path: '/' });

    try { await logActivity(uid, emailNorm, 'Customer Registration', 'Registered via Email OTP'); } catch (e) {}

    return res.json({
      success: true,
      message: 'Account created successfully',
      token,
      role: 'customer',
      user: { id: uid, name: user.name, email: user.email, phone: user.phone || '', address: '', picture: '' }
    });
  } catch (error) {
    console.error('registerWithOtp error:', error);
    return res.status(500).json({ error: 'Registration failed: ' + error.message });
  }
};

/** Reset password after OTP: { email, otp, newPassword } */
const resetPasswordWithOtp = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP and new password required' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const check = await otpService.verifyOtp(email, 'reset', otp, { keep: false });
    if (!check.success) return res.status(400).json(check);

    const isEmailInput = email.includes('@');
    let user = null;
    if (isEmailInput) {
      const emailNorm = otpService.normalizeEmail(email);
      user = await db.users.findOne({ email: emailNorm }) || await db.users.findOne({ username: emailNorm });
    } else {
      let phoneNorm = String(email).replace(/\D/g, '');
      const tenDigitPhone = phoneNorm.slice(-10);
      user = await db.users.findOne({ phone: tenDigitPhone }) || 
             await db.users.findOne({ email: phoneNorm }) || 
             await db.users.findOne({ username: phoneNorm });
    }
    if (!user) return res.status(404).json({ error: 'User not found' });

    const hashed = await bcrypt.hash(String(newPassword), 10);
    const uid = extractIdString(user._id);
    await db.users.update({ _id: uid }, { $set: { password: hashed, updatedAt: new Date() } });

    try { await logActivity(uid, emailNorm, 'Password Reset', 'Password reset via Email OTP'); } catch (e) {}

    return res.json({ success: true, message: 'Password updated. You can now sign in.' });
  } catch (error) {
    console.error('resetPasswordWithOtp error:', error);
    return res.status(500).json({ error: 'Reset failed: ' + error.message });
  }
};

/** OTP-based login: { email, otp } where email can be email or phone */
const loginWithOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email/Mobile and OTP required' });
    }

    // Verify OTP using the dynamic OTP service
    const check = await otpService.verifyOtp(email, 'login', otp, { keep: false });
    if (!check.success) return res.status(400).json(check);

    // Identify if the input is email or phone
    const isEmailInput = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
    let user = null;

    if (isEmailInput) {
      const emailNorm = otpService.normalizeEmail(email);
      user = await db.users.findOne({ email: emailNorm }) || await db.users.findOne({ username: emailNorm });
    } else {
      let phoneNorm = String(email).replace(/\D/g, '');
      const tenDigitPhone = phoneNorm.slice(-10);
      user = await db.users.findOne({ phone: tenDigitPhone }) || 
             await db.users.findOne({ email: phoneNorm }) || 
             await db.users.findOne({ username: phoneNorm });
    }

    if (!user) {
      return res.status(404).json({ error: 'No account found with this identifier. Please register first.' });
    }

    // Block old dealer accounts from logging in
    if (user.role === 'dealer') {
      return res.status(403).json({ error: 'Dealer portal has been discontinued. Please contact support.' });
    }

    const uid = extractIdString(user._id);
    try {
      await db.users.update({ _id: uid }, { $set: { lastLoginAt: new Date() } });
    } catch (e) {}

    const token = jwt.sign({ id: uid, role: user.role || 'customer' }, JWT_SECRET, { expiresIn: '30d' });
    const isHttps = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true' || req.secure || (req.headers && req.headers['x-forwarded-proto'] === 'https');
    res.cookie('token', token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, sameSite: 'lax', secure: !!isHttps, path: '/' });

    try { await logActivity(uid, user.email || user.username, 'Login Success', 'Logged in via OTP'); } catch (e) {}

    return res.json({
      success: true,
      token,
      role: user.role || 'customer',
      user: {
        id: uid,
        name: user.name,
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        picture: user.picture || ''
      }
    });
  } catch (error) {
    console.error('loginWithOtp error:', error);
    return res.status(500).json({ error: 'Login failed: ' + error.message });
  }
};

module.exports = {
  seedAdmin,
  login,
  googleLogin,
  customerRegister,
  customerLogin,
  loginWithOtp,
  sendOtp,
  verifyOtpOnly,
  registerWithOtp,
  resetPasswordWithOtp,
  logout,
  changePassword,
  updateProfile,
  getMe
};
