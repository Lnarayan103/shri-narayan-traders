const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { logActivity } = require('../utils/logger');
const fs = require('fs');

// 1. Logs Operations
const getLogs = async (req, res) => {
  try {
    const logs = await db.logs.find({}).sort({ createdAt: -1 }).limit(250);
    return res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

const clearLogs = async (req, res) => {
  try {
    await db.logs.remove({}, { multi: true });
    await logActivity(req.user.id, req.user.username, 'Logs Cleared', 'All activity audit logs deleted by super-admin.');
    return res.json({ message: 'Audit logs cleared successfully.' });
  } catch (error) {
    console.error('Error clearing logs:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

// 2. Backup & Restore Operations
const downloadBackup = async (req, res) => {
  try {
    // Read all records from all collections
    const collections = ['users', 'products', 'orders', 'enquiries', 'offers', 'gallery', 'stats', 'settings', 'reviews', 'logs'];
    const backupData = {};
    
    for (const key of collections) {
      backupData[key] = await db[key].find({});
    }
    
    const backupFile = {
      backupVersion: 1,
      createdAt: new Date(),
      data: backupData
    };
    
    res.setHeader('Content-disposition', `attachment; filename=snt_backup_${new Date().toISOString().slice(0,10)}.json`);
    res.setHeader('Content-type', 'application/json');
    res.write(JSON.stringify(backupFile, null, 2));
    res.end();
    
    await logActivity(req.user.id, req.user.username, 'Database Backup', 'System database backup downloaded.');
  } catch (error) {
    console.error('Backup error:', error);
    return res.status(500).send('Database backup failure');
  }
};

const restoreBackup = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No backup file uploaded' });
    }
    
    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    let backupJson;
    try {
      backupJson = JSON.parse(fileContent);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON format' });
    }
    
    if (backupJson.backupVersion !== 1 || !backupJson.data) {
      return res.status(400).json({ error: 'Unsupported or invalid backup file format' });
    }
    
    const collections = ['users', 'products', 'orders', 'enquiries', 'offers', 'gallery', 'stats', 'settings', 'reviews', 'logs'];
    
    // Clear and restore each collection
    for (const key of collections) {
      if (backupJson.data[key]) {
        // Drop existing
        await db[key].remove({}, { multi: true });
        // Restore if we have data
        if (backupJson.data[key].length > 0) {
          await db[key].insert(backupJson.data[key]);
        }
      }
    }
    
    // Delete temporary uploaded file
    fs.unlinkSync(req.file.path);
    
    await logActivity(req.user.id, req.user.username, 'Database Restored', 'Database restored from backup file successfully.');
    return res.json({ message: 'Database state restored successfully! Refreshing details.' });
  } catch (error) {
    console.error('Restore error:', error);
    // Cleanup on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ error: 'Database restore failure' });
  }
};

// 3. Staff Management Operations
const getStaff = async (req, res) => {
  try {
    // Find all users except dealers
    const staff = await db.users.find({ role: { $in: ['admin', 'super-admin', 'manager', 'sales'] } }).sort({ role: 1 });
    // Remove password fields for security
    const sanitisedStaff = staff.map(s => {
      const { password, ...rest } = s;
      return rest;
    });
    return res.json(sanitisedStaff);
  } catch (error) {
    console.error('Error fetching staff list:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

const createStaff = async (req, res) => {
  try {
    const { username, email, password, role, phone, businessName } = req.body;
    if (!username || !email || !password || !role) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }
    
    if (!['admin', 'super-admin', 'manager', 'sales'].includes(role)) {
      return res.status(400).json({ error: 'Invalid staff role specified' });
    }
    
    const existing = await db.users.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.status(400).json({ error: 'Username or Email is already registered' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newStaff = await db.users.insert({
      username,
      email,
      password: hashedPassword,
      role,
      phone: phone || '',
      businessName: businessName || `SNT Staff (${role.toUpperCase()})`,
      createdAt: new Date()
    });
    
    await logActivity(
      req.user.id, 
      req.user.username, 
      'Staff Account Created', 
      `Created staff user: ${username} with role: ${role}`
    );
    
    const { password: p, ...rest } = newStaff;
    return res.status(201).json({ message: 'Staff member created successfully', staff: rest });
  } catch (error) {
    console.error('Error creating staff account:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

const deleteStaff = async (req, res) => {
  try {
    const staffId = req.params.id;
    if (staffId === req.user.id) {
      return res.status(400).json({ error: 'Self-deletion is strictly blocked' });
    }
    
    const staff = await db.users.findOne({ _id: staffId });
    if (!staff) return res.status(404).json({ error: 'Staff account not found' });
    
    if (staff.role === 'admin' || staff.role === 'super-admin') {
      // Ensure there's at least one super admin / admin left
      const remainingAdmins = await db.users.count({ role: { $in: ['admin', 'super-admin'] }, _id: { $ne: staffId } });
      if (remainingAdmins === 0) {
        return res.status(400).json({ error: 'Cannot delete the last administrator' });
      }
    }
    
    await db.users.remove({ _id: staffId });
    await logActivity(
      req.user.id, 
      req.user.username, 
      'Staff Account Deleted', 
      `Deleted staff user: ${staff.username} (Role: ${staff.role})`
    );
    return res.json({ message: 'Staff member deleted successfully' });
  } catch (error) {
    console.error('Error deleting staff account:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getLogs,
  clearLogs,
  downloadBackup,
  restoreBackup,
  getStaff,
  createStaff,
  deleteStaff
};
