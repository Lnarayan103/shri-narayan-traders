const db = require('../config/db');

const seedDefaultSettings = async () => {
  try {
    const config = await db.settings.findOne({ _id: 'global_settings' });
    if (!config) {
      await db.settings.insert({
        _id: 'global_settings',
        businessName: 'Shri Narayan Traders',
        businessNameHindi: 'श्री नारायण ट्रेडर्स',
        address: 'SHRI NARAYAN TRADERS, 9F9J+5FW, Kauda madan, DJ College Rd, near IDBI Bank, Dilawer Pur, Munger, Bihar - 811201',
        phone: '9771233843, 8340262401',
        email: 'laxminarayan34939@gmail.com',
        whatsapp: '919771233843',
        mapLink: 'https://maps.google.com/maps?q=SHRI%20NARAYAN%20TRADERS,%20Kauda%20madan,%20DJ%20College%20Rd,%20near%20IDBI%20Bank,%20Dilawer%20Pur,%20Munger,%20Bihar%20811201&t=&z=16&ie=UTF8&iwloc=&output=embed',
        mapEmbedUrl: 'https://maps.google.com/maps?q=SHRI%20NARAYAN%20TRADERS,%20Kauda%20madan,%20DJ%20College%20Rd,%20near%20IDBI%20Bank,%20Dilawer%20Pur,%20Munger,%20Bihar%20811201&t=&z=16&ie=UTF8&iwloc=&output=embed',
        googleReviewLink: 'https://g.page/r/CRqMbhdBYw0OEBE/review',
        gstin: '10DJSPN6486H1ZP',
        facebook: 'https://facebook.com',
        twitter: 'https://twitter.com',
        instagram: 'https://instagram.com',
        welcomeText: 'WELCOME TO SHRI NARAYAN TRADERS',
        heroBannerText: 'Hardware • Furniture • Aluminium Works',
        heroSubtitle: 'Premium Hardware Supplier · Furniture Manufacturer · Aluminium Fabrication Works — Serving customers with quality products and honest service.',
        announcementBar: 'All India Home Delivery Available'
      });
      console.log('Default settings seeded successfully.');
    }
  } catch (err) {
    console.error('Error seeding settings:', err);
  }
};

const loadSettings = async (req, res, next) => {
  try {
    let config = await db.settings.findOne({ _id: 'global_settings' });
    if (!config) {
      await seedDefaultSettings();
      config = await db.settings.findOne({ _id: 'global_settings' });
    } else {
      let needsUpdate = false;
      let updateFields = {};
      
      if (config.googleReviewLink === undefined) {
        updateFields.googleReviewLink = 'https://g.page/r/CRqMbhdBYw0OEBE/review';
        needsUpdate = true;
      }
      if (config.gstin === undefined) {
        updateFields.gstin = '10DJSPN6486H1ZP';
        needsUpdate = true;
      }
      if (!config.mapLink || config.mapLink.includes('embed?pb=') || config.mapLink.includes('q=Shri%20Narayan%20Traders')) {
        const standardMap = 'https://maps.google.com/maps?q=SHRI%20NARAYAN%20TRADERS,%20Kauda%20madan,%20DJ%20College%20Rd,%20near%20IDBI%20Bank,%20Dilawer%20Pur,%20Munger,%20Bihar%20811201&t=&z=16&ie=UTF8&iwloc=&output=embed';
        updateFields.mapLink = standardMap;
        updateFields.mapEmbedUrl = standardMap;
        needsUpdate = true;
      } else if (!config.mapEmbedUrl) {
        updateFields.mapEmbedUrl = config.mapLink;
        needsUpdate = true;
      }
      if (!config.address || config.address.includes('Kaura Maidan, Near IDBI Bank')) {
        updateFields.address = 'SHRI NARAYAN TRADERS, 9F9J+5FW, Kauda madan, DJ College Rd, near IDBI Bank, Dilawer Pur, Munger, Bihar - 811201';
        needsUpdate = true;
      }
      if (config.businessNameHindi === undefined) {
        updateFields.businessNameHindi = 'श्री नारायण ट्रेडर्स';
        needsUpdate = true;
      }
      if (config.heroSubtitle === undefined) {
        updateFields.heroSubtitle = 'Premium Hardware Supplier · Furniture Manufacturer · Aluminium Fabrication Works — Serving customers with quality products and honest service.';
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await db.settings.update(
          { _id: 'global_settings' },
          { $set: updateFields }
        );
        config = await db.settings.findOne({ _id: 'global_settings' });
      }
    }
    res.locals.settings = config;
    next();
  } catch (err) {
    console.error('Error loading settings:', err);
    res.locals.settings = {};
    next();
  }
};

module.exports = {
  loadSettings,
  seedDefaultSettings
};
