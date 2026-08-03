const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const { logActivity } = require('../utils/logger');

const getProducts = async (req, res) => {
  try {
    const { category, search } = req.query;
    const query = {};
    if (category) {
      const catLower = category.trim().toLowerCase();
      if (catLower === 'furniture') {
        query.category = { $in: ['furniture', 'Furniture', 'Home Furniture', 'home furniture'] };
      } else if (catLower === 'hardware') {
        query.category = { $in: ['hardware', 'Hardware'] };
      } else if (catLower === 'office') {
        query.category = { $in: ['office', 'Office Furniture', 'office furniture'] };
      } else if (catLower === 'doors') {
        query.category = { $in: ['doors', 'Aluminium Doors', 'aluminium doors'] };
      } else if (catLower === 'windows') {
        query.category = { $in: ['windows', 'Aluminium Windows', 'aluminium windows'] };
      } else if (catLower === 'tools') {
        query.category = { $in: ['tools', 'Tools'] };
      } else {
        query.category = new RegExp('^' + category.trim() + '$', 'i');
      }
    }
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }
    query.isDeleted = { $ne: true };
    const products = await db.products.find(query).sort({ createdAt: -1 });
    return res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await db.products.findOne({ _id: req.params.id });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    return res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

const createProduct = async (req, res) => {
  try {
    const { 
      name, 
      category, 
      brand,
      description, 
      price, 
      regularPrice, 
      originalPrice, 
      dealerPrice, 
      wholesalePrice, 
      stock, 
      unit,
      gstRate,
      hsnCode,
      lowStockThreshold, 
      specifications,
      suggestedPrice,
      metaDescription,
      featured,
      isNew,
      isActive
    } = req.body;

    if (!name || !category || stock === undefined) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }

    const regPrice = regularPrice !== undefined && regularPrice !== '' ? regularPrice : price;
    const wholePrice = (wholesalePrice !== undefined && wholesalePrice !== '') 
      ? wholesalePrice 
      : ((dealerPrice !== undefined && dealerPrice !== '') ? dealerPrice : '0');

    if (regPrice === undefined || regPrice === '') {
      return res.status(400).json({ error: 'Selling price is required' });
    }
    
    const regPriceParsed = parseFloat(regPrice);
    const wholePriceParsed = parseFloat(wholePrice);
    const origPriceParsed = originalPrice ? parseFloat(originalPrice) : null;
    const stockParsed = parseInt(stock);
    const thresholdParsed = parseInt(lowStockThreshold) || 10;
    const gstRateParsed = gstRate !== undefined && gstRate !== '' ? parseInt(gstRate) : 18;
    
    if (isNaN(regPriceParsed) || regPriceParsed < 0 || isNaN(wholePriceParsed) || wholePriceParsed < 0) {
      return res.status(400).json({ error: 'Prices must be non-negative numbers' });
    }
    
    if (origPriceParsed !== null && (isNaN(origPriceParsed) || origPriceParsed < 0)) {
      return res.status(400).json({ error: 'Original price must be a non-negative number' });
    }

    if (isNaN(stockParsed) || stockParsed < 0 || isNaN(thresholdParsed) || thresholdParsed < 0) {
      return res.status(400).json({ error: 'Stock levels must be non-negative integers' });
    }
    
    let image = req.body.imageUrl || req.body.image || '';
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
          console.error('Failed to convert uploaded image to Base64:', uploadErr.message);
          image = '/uploads/' + req.file.filename;
        }
      }
    }
    
    const isFeatured = featured === 'true' || featured === true;
    const isProductNew = isNew === 'true' || isNew === true;
    const isProductActive = isActive === 'true' || isActive === true;

    const product = await db.products.insert({
      name,
      category,
      brand: brand || '',
      description: description || '',
      regularPrice: regPriceParsed,
      price: regPriceParsed, // Maintain compatibility
      wholesalePrice: wholePriceParsed,
      dealerPrice: wholePriceParsed, // Maintain compatibility
      originalPrice: origPriceParsed,
      stock: stockParsed,
      unit: unit || 'Piece',
      gstRate: gstRateParsed,
      hsnCode: hsnCode || '',
      lowStockThreshold: thresholdParsed,
      image,
      specifications: specifications || '',
      suggestedPrice: suggestedPrice || '',
      metaDescription: metaDescription || '',
      featured: isFeatured,
      isNew: isProductNew,
      isActive: isProductActive,
      views: 0,
      createdAt: new Date()
    });
    
    await logActivity(req.user.id, req.user.username, 'Product Created', `Added new product "${name}" (Category: ${category}, Price: Rs. ${regPriceParsed})`);
    
    // Trigger low stock warning email asynchronously if initial stock is below threshold
    if (product && product.stock <= (product.lowStockThreshold || 5)) {
      const { sendLowStockAlert } = require('../utils/aiEmailService');
      sendLowStockAlert(product).catch(err => console.error('Low stock alert email failed:', err.message));
    }

    return res.status(201).json({ message: 'Product created successfully', product });
  } catch (error) {
    console.error('Error creating product:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { 
      name, 
      category, 
      brand,
      description, 
      price,
      regularPrice, 
      originalPrice,
      dealerPrice,
      wholesalePrice, 
      stock, 
      unit,
      gstRate,
      hsnCode,
      lowStockThreshold, 
      specifications,
      suggestedPrice,
      metaDescription,
      featured,
      isNew,
      isActive
    } = req.body;
    
    const oldProduct = await db.products.findOne({ _id: req.params.id });
    if (!oldProduct) return res.status(404).json({ error: 'Product not found' });
    
    let regPriceParsed = oldProduct.regularPrice || oldProduct.price;
    const reqRegPrice = regularPrice !== undefined && regularPrice !== '' ? regularPrice : price;
    if (reqRegPrice !== undefined && reqRegPrice !== '') {
      const p = parseFloat(reqRegPrice);
      if (isNaN(p) || p < 0) return res.status(400).json({ error: 'Regular price must be a non-negative number' });
      regPriceParsed = p;
    }
    
    let wholePriceParsed = oldProduct.wholesalePrice || oldProduct.dealerPrice;
    const reqWholePrice = wholesalePrice !== undefined && wholesalePrice !== '' ? wholesalePrice : dealerPrice;
    if (reqWholePrice !== undefined && reqWholePrice !== '') {
      const p = parseFloat(reqWholePrice);
      if (isNaN(p) || p < 0) return res.status(400).json({ error: 'Wholesale price must be a non-negative number' });
      wholePriceParsed = p;
    }
    
    let origPriceParsed = oldProduct.originalPrice;
    if (originalPrice !== undefined) {
      if (originalPrice === '') {
        origPriceParsed = null;
      } else {
        const p = parseFloat(originalPrice);
        if (isNaN(p) || p < 0) return res.status(400).json({ error: 'Original price must be a non-negative number' });
        origPriceParsed = p;
      }
    }

    let stockParsed = oldProduct.stock;
    if (stock !== undefined && stock !== '') {
      const s = parseInt(stock);
      if (isNaN(s) || s < 0) return res.status(400).json({ error: 'Stock must be a non-negative integer' });
      stockParsed = s;
    }
    
    let thresholdParsed = oldProduct.lowStockThreshold;
    if (lowStockThreshold !== undefined && lowStockThreshold !== '') {
      const t = parseInt(lowStockThreshold);
      if (isNaN(t) || t < 0) return res.status(400).json({ error: 'Low stock threshold must be a non-negative integer' });
      thresholdParsed = t;
    }

    let gstRateParsed = oldProduct.gstRate !== undefined ? oldProduct.gstRate : 18;
    if (gstRate !== undefined && gstRate !== '') {
      const r = parseInt(gstRate);
      if (isNaN(r) || r < 0) return res.status(400).json({ error: 'GST rate must be a non-negative integer' });
      gstRateParsed = r;
    }
    
    let image = oldProduct.image;
    if (req.file) {
      if (oldProduct.image && !oldProduct.image.startsWith('http') && !oldProduct.image.startsWith('data:image')) {
        try {
          const oldImagePath = path.join(__dirname, '../public', oldProduct.image);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        } catch (err) { /* ignore cleanup error */ }
      }
      if (req.file.path.startsWith('http')) {
        image = req.file.path;
      } else {
        try {
          const fileBuffer = fs.readFileSync(req.file.path);
          const base64Image = fileBuffer.toString('base64');
          image = `data:${req.file.mimetype};base64,${base64Image}`;
          fs.unlinkSync(req.file.path);
        } catch (uploadErr) {
          console.error('Failed to convert uploaded image to Base64:', uploadErr.message);
          image = '/uploads/' + req.file.filename;
        }
      }
    } else if (req.body.imageUrl !== undefined) {
      image = req.body.imageUrl || req.body.image || '';
    }
    
    const isFeatured = featured !== undefined ? (featured === 'true' || featured === true) : oldProduct.featured;
    const isProductNew = isNew !== undefined ? (isNew === 'true' || isNew === true) : oldProduct.isNew;
    const isProductActive = isActive !== undefined ? (isActive === 'true' || isActive === true) : oldProduct.isActive;

    const updated = await db.products.update(
      { _id: req.params.id },
      {
        $set: {
          name: name || oldProduct.name,
          category: category || oldProduct.category,
          brand: brand !== undefined ? brand : oldProduct.brand,
          description: description !== undefined ? description : oldProduct.description,
          regularPrice: regPriceParsed,
          price: regPriceParsed, // Maintain compatibility
          wholesalePrice: wholePriceParsed,
          dealerPrice: wholePriceParsed, // Maintain compatibility
          originalPrice: origPriceParsed,
          stock: stockParsed,
          unit: unit !== undefined ? unit : oldProduct.unit,
          gstRate: gstRateParsed,
          hsnCode: hsnCode !== undefined ? hsnCode : oldProduct.hsnCode,
          lowStockThreshold: thresholdParsed,
          image,
          specifications: specifications !== undefined ? specifications : oldProduct.specifications,
          suggestedPrice: suggestedPrice !== undefined ? suggestedPrice : oldProduct.suggestedPrice,
          metaDescription: metaDescription !== undefined ? metaDescription : oldProduct.metaDescription,
          featured: isFeatured,
          isNew: isProductNew,
          isActive: isProductActive
        }
      },
      { returnUpdatedDocs: true }
    );
    
    await logActivity(req.user.id, req.user.username, 'Product Updated', `Updated product details for "${name || oldProduct.name}" (ID: ${req.params.id})`);
    
    // Trigger low stock warning email asynchronously if stock level is below threshold
    if (updated && updated.stock <= (updated.lowStockThreshold || 5)) {
      const { sendLowStockAlert } = require('../utils/aiEmailService');
      sendLowStockAlert(updated).catch(err => console.error('Low stock alert email failed:', err.message));
    }

    return res.json({ message: 'Product updated successfully', product: updated });
  } catch (error) {
    console.error('Error updating product:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await db.products.findOne({ _id: req.params.id });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    if (product.image && !product.image.startsWith('http')) {
      const imagePath = path.join(__dirname, '../public', product.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await db.products.update(
      { _id: req.params.id },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: (req.user && req.user.id) || 'admin' } }
    );
    await logActivity(req.user.id, req.user.username, 'Product Deleted', `Deleted product "${product.name}" (ID: ${req.params.id})`);
    return res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
