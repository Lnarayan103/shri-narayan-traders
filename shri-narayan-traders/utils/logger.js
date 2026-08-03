const db = require('../config/db');

const logActivity = async (userId, username, action, details = {}) => {
  try {
    await db.logs.insert({
      userId: userId || 'system',
      username: username || 'System',
      action,
      details: typeof details === 'string' ? { message: details } : details,
      createdAt: new Date()
    });
  } catch (err) {
    console.error('Logger error:', err);
  }
};

module.exports = { logActivity };
