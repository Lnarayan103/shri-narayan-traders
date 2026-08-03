const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const { logActivity } = require('../utils/logger');

// Enquiries
const createEnquiry = async (req, res) => {
  try {
    const { name, email, phone, message, subject } = req.body;
    if (!name || !phone || !message) {
      return res.status(400).json({ error: 'Name, phone, and message are required' });
    }
    
    const enquiry = await db.enquiries.insert({
      name,
      email: email || '',
      phone,
      subject: subject || 'General Enquiry',
      message,
      status: 'new',
      createdAt: new Date()
    });

    // Send AI-powered email alerts asynchronously
    const { sendEnquiryConfirmation, sendEnquiryAlertToAdmin } = require('../utils/aiEmailService');
    sendEnquiryConfirmation(enquiry).catch(err => console.error('Enquiry confirmation email failed:', err.message));
    sendEnquiryAlertToAdmin(enquiry).catch(err => console.error('Admin enquiry alert email failed:', err.message));
    
    // Send WhatsApp alerts asynchronously to customer and owner
    const axios = require('axios');
    axios.post('http://localhost:3005/api/send-enquiry', { name, phone, message, subject }).catch(() => {
      axios.post('https://whatsapp-ai-bot-bj43.onrender.com/api/send-enquiry', { name, phone, message, subject }).catch(() => {});
    });
    
    return res.status(201).json({ message: 'Enquiry submitted successfully', enquiry });
  } catch (error) {
    console.error('Error creating enquiry:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

const getEnquiries = async (req, res) => {
  try {
    const enquiries = await db.enquiries.find({}).sort({ createdAt: -1 });
    return res.json(enquiries);
  } catch (error) {
    console.error('Error fetching enquiries:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

const deleteEnquiry = async (req, res) => {
  try {
    await db.enquiries.remove({ _id: req.params.id });
    return res.json({ message: 'Enquiry deleted successfully' });
  } catch (error) {
    console.error('Error deleting enquiry:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

const updateEnquiryStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['new', 'in-progress', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const enquiry = await db.enquiries.findOne({ _id: req.params.id });
    if (!enquiry) return res.status(404).json({ error: 'Enquiry not found' });
    
    await db.enquiries.update({ _id: req.params.id }, { $set: { status } });
    return res.json({ message: 'Enquiry status updated successfully' });
  } catch (error) {
    console.error('Error updating enquiry status:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Gallery
const addToGallery = async (req, res) => {
  try {
    const { title, category } = req.body;
    if (!req.file || !category) {
      return res.status(400).json({ error: 'Image file and category are required' });
    }
    
    let image = '';
    if (req.file) {
      if (req.file.path.startsWith('http')) {
        image = req.file.path;
      } else {
        try {
          const fileBuffer = fs.readFileSync(req.file.path);
          const base64Image = fileBuffer.toString('base64');
          image = `data:${req.file.mimetype};base64,${base64Image}`;
          fs.unlinkSync(req.file.path);
        } catch (uploadErr) {
          console.error('Failed to convert gallery image to Base64:', uploadErr.message);
          image = '/uploads/' + req.file.filename;
        }
      }
    }

    const item = await db.gallery.insert({
      title: title || 'Work Showcase',
      category, // furniture, aluminium, hardware
      image,
      createdAt: new Date()
    });
    
    await logActivity(req.user.id, req.user.username, 'Gallery Item Created', `Added showcase photo: "${title || 'Work Showcase'}" to Category: ${category}`);
    
    return res.status(201).json({ message: 'Gallery item added successfully', item });
  } catch (error) {
    console.error('Error adding to gallery:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

const getGallery = async (req, res) => {
  try {
    const { category } = req.query;
    const query = {};
    if (category) query.category = category;
    
    const items = await db.gallery.find(query).sort({ createdAt: -1 });
    return res.json(items);
  } catch (error) {
    console.error('Error fetching gallery:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

const deleteGalleryItem = async (req, res) => {
  try {
    const item = await db.gallery.findOne({ _id: req.params.id });
    if (!item) return res.status(404).json({ error: 'Gallery item not found' });
    
    if (item.image && !item.image.startsWith('http')) {
      const imagePath = path.join(__dirname, '../public', item.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await db.gallery.remove({ _id: req.params.id });
    await logActivity(req.user.id, req.user.username, 'Gallery Item Deleted', `Deleted showcase photo: "${item.title}"`);
    return res.json({ message: 'Gallery item deleted successfully' });
  } catch (error) {
    console.error('Error deleting gallery item:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Offers
const createOffer = async (req, res) => {
  try {
    const { title, description, code, discount, tag, validity, products, endDate } = req.body;
    if (!title || !discount) {
      return res.status(400).json({ error: 'Title and discount are required' });
    }
    
    const offer = await db.offers.insert({
      title,
      description: description || '',
      code: code || '',
      discount,
      tag: tag || '',
      validity: validity || '',
      products: products || [],
      endDate: endDate ? new Date(endDate) : null,
      active: true,
      createdAt: new Date()
    });
    
    await logActivity(req.user.id, req.user.username, 'Offer Created', `Created promotion offer: "${title}" (Discount: ${discount})`);
    
    return res.status(201).json({ message: 'Offer created successfully', offer });
  } catch (error) {
    console.error('Error creating offer:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

const getOffers = async (req, res) => {
  try {
    const offers = await db.offers.find({}).sort({ createdAt: -1 });
    return res.json(offers);
  } catch (error) {
    console.error('Error fetching offers:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

const getOfferById = async (req, res) => {
  try {
    const offer = await db.offers.findOne({ _id: req.params.id });
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }
    return res.json(offer);
  } catch (error) {
    console.error('Error fetching offer by ID:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

const updateOffer = async (req, res) => {
  try {
    const { title, description, code, discount, tag, validity, products, endDate, active } = req.body;
    if (!title || !discount) {
      return res.status(400).json({ error: 'Title and discount are required' });
    }
    
    const offer = await db.offers.findOne({ _id: req.params.id });
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }
    
    await db.offers.update(
      { _id: req.params.id },
      {
        $set: {
          title,
          description: description || '',
          code: code || '',
          discount,
          tag: tag || '',
          validity: validity || '',
          products: products || [],
          endDate: endDate ? new Date(endDate) : null,
          active: active !== undefined ? active : offer.active
        }
      }
    );
    
    const updatedOffer = await db.offers.findOne({ _id: req.params.id });
    
    await logActivity(req.user.id, req.user.username, 'Offer Updated', `Updated promotion offer: "${title}"`);
    
    return res.json({ message: 'Offer updated successfully', offer: updatedOffer });
  } catch (error) {
    console.error('Error updating offer:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

const deleteOffer = async (req, res) => {
  try {
    const offer = await db.offers.findOne({ _id: req.params.id });
    const title = offer ? offer.title : 'Unknown';
    await db.offers.remove({ _id: req.params.id });
    await logActivity(req.user.id, req.user.username, 'Offer Deleted', `Deleted promotion offer: "${title}"`);
    return res.json({ message: 'Offer deleted successfully' });
  } catch (error) {
    console.error('Error deleting offer:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  createEnquiry,
  getEnquiries,
  deleteEnquiry,
  updateEnquiryStatus,
  addToGallery,
  getGallery,
  deleteGalleryItem,
  createOffer,
  getOffers,
  getOfferById,
  updateOffer,
  deleteOffer
};
