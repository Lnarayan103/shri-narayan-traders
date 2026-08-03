const db = require('../config/db');
const { logActivity } = require('../utils/logger');
const fs = require('fs');
const path = require('path');

// Helper to update .env key-value pairs dynamically
const updateEnvKey = (key, value) => {
  try {
    const envPath = path.join(__dirname, '../.env');
    if (!fs.existsSync(envPath)) return;
    
    let content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    let found = false;
    
    const updatedLines = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith(`${key}=`)) {
        found = true;
        return `${key}=${value}`;
      }
      return line;
    });
    
    if (!found) {
      updatedLines.push(`${key}=${value}`);
    }
    
    fs.writeFileSync(envPath, updatedLines.join('\n'), 'utf8');
    process.env[key] = value;
    console.log(`[Env Sync] Dynamic update: ${key} synced successfully.`);
  } catch (err) {
    console.error(`[Env Sync] Error writing key ${key} to .env:`, err.message);
  }
};

const getSettings = async (req, res) => {
  try {
    const config = await db.settings.findOne({ _id: 'global_settings' });
    if (config) {
      if (!config.openRouterApiKey) {
        config.openRouterApiKey = process.env.OPENROUTER_API_KEY || '';
      }
      if (!config.openRouterModel) {
        config.openRouterModel = process.env.OPENROUTER_MODEL || 'openai/gpt-oss-20b:free';
      }
    }
    return res.json(config);
  } catch (err) {
    console.error('Error fetching settings:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

const updateSettings = async (req, res) => {
  try {
    const { 
      businessName, businessNameHindi, address, city, state, pincode, phone, email, whatsapp, website, 
      mapEmbedUrl, lat, lng, facebook, twitter, instagram, youtube, googleReviewLink, gstin, regNo, 
      welcomeText, heroBannerText, heroSubtitle, announcementBar, openRouterApiKey, openRouterModel, invoicePrefix, 
      defaultGst, bankName, bankAccount, bankIfsc, upiId
    } = req.body;

    const setFields = {
      businessName,
      businessNameHindi: businessNameHindi || '',
      address,
      city: city || '',
      state: state || '',
      pincode: pincode || '',
      phone,
      email,
      whatsapp: whatsapp || '',
      website: website || '',
      mapEmbedUrl: mapEmbedUrl || '',
      mapLink: mapEmbedUrl || '', // Keep in sync
      lat: lat || '',
      lng: lng || '',
      facebook: facebook || '',
      twitter: twitter || '',
      instagram: instagram || '',
      youtube: youtube || '',
      googleReviewLink: googleReviewLink || '',
      gstin: gstin || '',
      regNo: regNo || '',
      welcomeText: welcomeText || '',
      heroBannerText: heroBannerText || '',
      heroSubtitle: heroSubtitle || '',
      announcementBar: announcementBar || '',
      invoicePrefix: invoicePrefix || 'SNT',
      defaultGst: defaultGst !== undefined ? parseInt(defaultGst) : 18,
      bankName: bankName || '',
      bankAccount: bankAccount || '',
      bankIfsc: bankIfsc || '',
      upiId: upiId || ''
    };

    if (openRouterApiKey !== undefined) {
      const trimmedKey = openRouterApiKey.trim();
      setFields.openRouterApiKey = trimmedKey;
      updateEnvKey('OPENROUTER_API_KEY', trimmedKey);
    }
    if (openRouterModel !== undefined) {
      const trimmedModel = openRouterModel.trim();
      setFields.openRouterModel = trimmedModel;
      updateEnvKey('OPENROUTER_MODEL', trimmedModel);
    }
    
    const updated = await db.settings.update(
      { _id: 'global_settings' },
      { $set: setFields },
      { returnUpdatedDocs: true }
    );
    
    await logActivity(req.user.id, req.user.username, 'Settings Updated', 'Global website settings / coordinates updated (including OpenRouter AI config).');
    
    return res.json({ message: 'Settings updated successfully', settings: updated });
  } catch (err) {
    console.error('Error updating settings:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Reviews
const getReviews = async (req, res) => {
  try {
    const reviews = await db.reviews.find({}).sort({ createdAt: -1 });
    return res.json(reviews);
  } catch (err) {
    console.error('Error fetching reviews:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

const createReview = async (req, res) => {
  try {
    const { name, message, rating } = req.body;
    if (!name || !message || !rating) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }
    
    const review = await db.reviews.insert({
      name,
      message,
      rating: parseInt(rating),
      approved: false, // Admin needs to approve
      createdAt: new Date()
    });
    
    return res.status(201).json({ message: 'Review submitted successfully! Awaiting admin approval.', review });
  } catch (err) {
    console.error('Error creating review:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

const approveReview = async (req, res) => {
  try {
    const { approved } = req.body;
    const updated = await db.reviews.update(
      { _id: req.params.id },
      { $set: { approved: approved === true } },
      { returnUpdatedDocs: true }
    );
    
    await logActivity(req.user.id, req.user.username, 'Review Status Updated', `Updated review approval status for "${updated.name}" to: ${approved}`);
    
    return res.json({ message: 'Review approval status updated', review: updated });
  } catch (err) {
    console.error('Error updating review status:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

const deleteReview = async (req, res) => {
  try {
    const review = await db.reviews.findOne({ _id: req.params.id });
    const name = review ? review.name : 'Unknown';
    await db.reviews.remove({ _id: req.params.id });
    await logActivity(req.user.id, req.user.username, 'Review Deleted', `Deleted customer review written by: "${name}"`);
    return res.json({ message: 'Review deleted successfully' });
  } catch (err) {
    console.error('Error deleting review:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

const sendTestEmail = async (req, res) => {
  try {
    const { recipient } = req.body;
    if (!recipient) {
      return res.status(400).json({ error: 'Recipient email is required' });
    }

    const { triggerEmail } = require('../utils/aiEmailService');

    // Create a mock context for testing AI-generated template
    const testContext = {
      type: "enquiry_confirmation",
      customerName: "Rahul Kumar (Test)",
      subject: "Mujhe aluminium window ka price chahiye",
      message: "Mujhe aluminium window ka price chahiye (This is a system test enquiry)",
      phone: "9876543210",
      businessPhone: "9771233843"
    };

    console.log(`[Test Email] Triggering test email to ${recipient}...`);
    const success = await triggerEmail("enquiry_confirmation", recipient, testContext);

    if (success) {
      return res.json({ message: 'Test email sent successfully! Please check your inbox.' });
    } else {
      return res.status(500).json({ error: 'Failed to dispatch email. Check server console logs for SMTP details.' });
    }
  } catch (err) {
    console.error('Test email sending failed:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  getReviews,
  createReview,
  approveReview,
  deleteReview,
  sendTestEmail
};
