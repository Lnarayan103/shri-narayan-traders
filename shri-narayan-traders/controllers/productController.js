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

const parseCsv = (csvText) => {
  const lines = [];
  let currentLine = [];
  let currentVal = '';
  let inQuotes = false;
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      currentLine.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && csvText[i + 1] === '\n') i++;
      currentLine.push(currentVal.trim());
      if (currentLine.length > 0 && (currentLine.length > 1 || currentLine[0] !== '')) {
        lines.push(currentLine);
      }
      currentLine = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  if (currentVal !== '') {
    currentLine.push(currentVal.trim());
  }
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }
  return lines;
};

const exportProductsCSV = async (req, res) => {
  try {
    const products = await db.products.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 });
    let csv = '\uFEFFProduct ID,Product Name,Category,Brand,Description,Regular Price,Wholesale Price,Original Price,Stock,Unit,GST Rate,HSN Code,Low Stock Threshold,Specifications,Suggested Price,Meta Description,Featured,New,Active\n';
    
    products.forEach(p => {
      const id = String(p._id || '');
      const name = (p.name || '').replace(/"/g, '""');
      const category = (p.category || '').replace(/"/g, '""');
      const brand = (p.brand || '').replace(/"/g, '""');
      const desc = (p.description || '').replace(/"/g, '""');
      const regularPrice = p.regularPrice ?? p.price ?? 0;
      const wholesalePrice = p.wholesalePrice ?? p.dealerPrice ?? 0;
      const originalPrice = p.originalPrice ?? '';
      const stock = p.stock ?? 0;
      const unit = p.unit || 'Piece';
      const gstRate = p.gstRate ?? 18;
      const hsnCode = p.hsnCode || '';
      const lowStock = p.lowStockThreshold ?? 10;
      const specs = (p.specifications || '').replace(/"/g, '""');
      const suggested = (p.suggestedPrice || '').replace(/"/g, '""');
      const meta = (p.metaDescription || '').replace(/"/g, '""');
      const featured = p.featured ? 'TRUE' : 'FALSE';
      const isNew = p.isNew ? 'TRUE' : 'FALSE';
      const isActive = p.isActive !== false ? 'TRUE' : 'FALSE';
      
      csv += `"${id}","${name}","${category}","${brand}","${desc}",${regularPrice},${wholesalePrice},${originalPrice},${stock},"${unit}",${gstRate},"${hsnCode}",${lowStock},"${specs}","${suggested}","${meta}",${featured},${isNew},${isActive}\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=snt_products.csv');
    return res.send(csv);
  } catch (error) {
    console.error('Error exporting products CSV:', error);
    return res.status(500).send('Server error during CSV export');
  }
};

const importProductsCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a CSV file' });
    }
    
    const csvPath = req.file.path;
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    
    const rows = parseCsv(csvContent);
    if (rows.length < 2) {
      fs.unlinkSync(csvPath);
      return res.status(400).json({ error: 'Invalid CSV: No data rows found' });
    }
    
    const headers = rows[0].map(h => h.toLowerCase().trim().replace(/^\uFEFF/, ''));
    
    const colIdx = (name) => headers.indexOf(name.toLowerCase());
    
    const idxId = colIdx('product id');
    const idxName = colIdx('product name');
    const idxCategory = colIdx('category');
    const idxBrand = colIdx('brand');
    const idxDesc = colIdx('description');
    const idxRegPrice = colIdx('regular price');
    const idxPrice = colIdx('price');
    const idxWholePrice = colIdx('wholesale price');
    const idxDealerPrice = colIdx('dealer price');
    const idxOrigPrice = colIdx('original price');
    const idxStock = colIdx('stock');
    const idxUnit = colIdx('unit');
    const idxGst = colIdx('gst rate');
    const idxHsn = colIdx('hsn code');
    const idxLowStock = colIdx('low stock threshold');
    const idxSpecs = colIdx('specifications');
    const idxSuggested = colIdx('suggested price');
    const idxMeta = colIdx('meta description');
    const idxFeatured = colIdx('featured');
    const idxNew = colIdx('new');
    const idxActive = colIdx('active');
    
    if (idxName === -1 || idxCategory === -1 || idxStock === -1) {
      fs.unlinkSync(csvPath);
      return res.status(400).json({ error: 'CSV must contain at least Product Name, Category, and Stock columns' });
    }
    
    let createdCount = 0;
    let updatedCount = 0;
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || (row.length === 1 && row[0] === '')) continue;
      
      const val = (idx) => idx !== -1 && idx < row.length ? row[idx].trim() : '';
      
      const id = val(idxId);
      const name = val(idxName);
      if (!name) continue;
      
      const category = val(idxCategory) || 'General';
      const brand = val(idxBrand);
      const description = val(idxDesc);
      
      const rawRegPrice = val(idxRegPrice) || val(idxPrice) || '0';
      const regularPrice = parseFloat(rawRegPrice) || 0;
      
      const rawWholePrice = val(idxWholePrice) || val(idxDealerPrice) || '0';
      const wholesalePrice = parseFloat(rawWholePrice) || 0;
      
      const rawOrigPrice = val(idxOrigPrice);
      const originalPrice = rawOrigPrice ? (parseFloat(rawOrigPrice) || null) : null;
      
      const stock = parseInt(val(idxStock)) || 0;
      const unit = val(idxUnit) || 'Piece';
      const gstRate = parseInt(val(idxGst)) || 18;
      const hsnCode = val(idxHsn);
      const lowStockThreshold = parseInt(val(idxLowStock)) || 10;
      
      const specifications = val(idxSpecs);
      const suggestedPrice = val(idxSuggested);
      const metaDescription = val(idxMeta);
      
      const featured = ['true', 'yes', '1', 'y'].includes(val(idxFeatured).toLowerCase());
      const isNew = ['true', 'yes', '1', 'y'].includes(val(idxNew).toLowerCase());
      const isActive = val(idxActive) === '' || ['true', 'yes', '1', 'y', 'active'].includes(val(idxActive).toLowerCase());
      
      let match = null;
      if (id) {
        try {
          match = await db.products.findOne({ _id: id });
        } catch (e) {}
      }
      if (!match) {
        try {
          match = await db.products.findOne({ name: new RegExp('^' + name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i'), isDeleted: { $ne: true } });
        } catch (e) {}
      }
      
      const pDoc = {
        name,
        category,
        brand: brand || '',
        description: description || '',
        regularPrice,
        price: regularPrice,
        wholesalePrice,
        dealerPrice: wholesalePrice,
        originalPrice,
        stock,
        unit,
        gstRate,
        hsnCode: hsnCode || '',
        lowStockThreshold,
        specifications: specifications || '',
        suggestedPrice: suggestedPrice || '',
        metaDescription: metaDescription || '',
        featured,
        isNew,
        isActive,
        updatedAt: new Date()
      };
      
      if (match) {
        await db.products.update({ _id: match._id }, { $set: pDoc });
        updatedCount++;
      } else {
        pDoc.image = '';
        pDoc.createdAt = new Date();
        await db.products.insert(pDoc);
        createdCount++;
      }
    }
    
    fs.unlinkSync(csvPath);
    
    await logActivity(
      req.user.id,
      req.user.username,
      'Product Import',
      `Imported products CSV successfully: ${createdCount} created, ${updatedCount} updated`
    );
    
    return res.json({
      success: true,
      message: `Product import successful!`,
      details: `${createdCount} new products created, ${updatedCount} existing products updated.`
    });
  } catch (error) {
    console.error('Error importing products CSV:', error);
    try {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch(e) {}
    return res.status(500).json({ error: 'Server error during CSV import: ' + error.message });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  exportProductsCSV,
  importProductsCSV
};
