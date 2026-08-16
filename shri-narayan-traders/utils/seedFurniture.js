const path = require('path');
const fs = require('fs');

// Ensure correct env variables are loaded
require('dotenv').config({ path: path.join(__dirname, '../.env') });

if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = 'mongodb://localhost:27017/shri_narayan_db';
}

const db = require('../config/db');

const furnitureProducts = [
  {
    name: "Luxury Modular L-Shape Sofa Set",
    category: "Furniture",
    brand: "SNT Premium",
    description: "Premium quality modular L-shape sofa set upholstered with high-durability fabrics. Features sleek aluminium legs and high-density foam padding for absolute comfort.",
    regularPrice: 45000,
    price: 45000,
    wholesalePrice: 38500,
    dealerPrice: 38500,
    originalPrice: 52000,
    stock: 5,
    unit: "Set",
    gstRate: 18,
    hsnCode: "9401",
    lowStockThreshold: 2,
    specifications: "Dimensions: 8ft x 6ft; Structure: Solid Wood; Legs: Polished Aluminium; Fabric: Premium Chenille",
    suggestedPrice: "₹45,000 - ₹48,000",
    metaDescription: "Buy premium modular L-shape sofa set from Shri Narayan Traders. Modern style, high comfort.",
    featured: true,
    isNew: true,
    isActive: true,
    image: "/images/products/sofa-l-shape.jpg",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Modern Aluminium Glass Wardrobe",
    category: "Furniture",
    brand: "SNT Premium",
    description: "Elegant modern bedroom wardrobe with a sliding door mechanism. Crafted with black anodized aluminium profiles, tempered fluted glass, and soft-close hardware.",
    regularPrice: 62000,
    price: 62000,
    wholesalePrice: 55000,
    dealerPrice: 55000,
    originalPrice: 75000,
    stock: 3,
    unit: "Piece",
    gstRate: 18,
    hsnCode: "9403",
    lowStockThreshold: 1,
    specifications: "Height: 7ft; Width: 5ft; Depth: 2ft; Frame: Black Anodized Aluminium; Glass: Tempered Fluted Glass",
    suggestedPrice: "₹62,000 - ₹65,000",
    metaDescription: "Modern sliding wardrobe with sleek black aluminium frame and fluted glass. Customize today.",
    featured: true,
    isNew: true,
    isActive: true,
    image: "/images/products/glass-wardrobe.jpg",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Minimalist Dining Table Set",
    category: "Furniture",
    brand: "SNT Premium",
    description: "Sleek dining table set with one long table and 6 chairs. Built with a solid teak wood top and matte black powder-coated aluminium frames for a clean, modern look.",
    regularPrice: 38000,
    price: 38000,
    wholesalePrice: 32000,
    dealerPrice: 32000,
    originalPrice: 45000,
    stock: 4,
    unit: "Set",
    gstRate: 18,
    hsnCode: "9403",
    lowStockThreshold: 2,
    specifications: "Table Dimensions: 6ft x 3ft; Top Material: Teak Wood; Frame: Powder-Coated Aluminium; Seats: 6",
    suggestedPrice: "₹38,000 - ₹41,000",
    metaDescription: "Buy sleek wooden top dining table set with sturdy aluminium legs from Shri Narayan Traders Munger.",
    featured: true,
    isNew: false,
    isActive: true,
    image: "/images/products/dining-set.jpg",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Designer Lounge Armchair",
    category: "Furniture",
    brand: "SNT Premium",
    description: "Premium swivel armchair designed for modern living rooms and lounges. Finished with genuine tan leather and a heavy-duty polished aluminium circular pedestal base.",
    regularPrice: 18500,
    price: 18500,
    wholesalePrice: 15500,
    dealerPrice: 15500,
    originalPrice: 22000,
    stock: 8,
    unit: "Piece",
    gstRate: 18,
    hsnCode: "9401",
    lowStockThreshold: 3,
    specifications: "Material: Genuine Leather; Base: Swivel Polished Aluminium; Cushion: Molded Polyurethane Foam",
    suggestedPrice: "₹18,500 - ₹20,000",
    metaDescription: "Designer tan leather armchair with sleek metal swivel base. Premium comfort and style.",
    featured: false,
    isNew: true,
    isActive: true,
    image: "/images/products/lounge-chair.jpg",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Sleek TV Console Cabinet",
    category: "Furniture",
    brand: "SNT Premium",
    description: "Wall-mounted floating TV unit with plenty of storage. Finished in matte charcoal grey with gold aluminium handles and a cable-management routing back panel.",
    regularPrice: 15000,
    price: 15000,
    wholesalePrice: 12800,
    dealerPrice: 12800,
    originalPrice: 19500,
    stock: 10,
    unit: "Piece",
    gstRate: 18,
    hsnCode: "9403",
    lowStockThreshold: 3,
    specifications: "Length: 6ft; Depth: 1.2ft; Mount Type: Wall Mount; Features: Gold Aluminium Edge Handles",
    suggestedPrice: "₹15,000 - ₹17,000",
    metaDescription: "Floating modern TV unit console in charcoal grey and gold hardware accents.",
    featured: false,
    isNew: false,
    isActive: true,
    image: "/images/products/tv-console.jpg",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Ergonomic Office Desk",
    category: "Furniture",
    brand: "SNT Premium",
    description: "Spacious desk designed for home offices and corporate setups. Comes with a white matte top, built-in wire grommets, and an elegant aluminium desk frame.",
    regularPrice: 12500,
    price: 12500,
    wholesalePrice: 10500,
    dealerPrice: 10500,
    originalPrice: 16000,
    stock: 12,
    unit: "Piece",
    gstRate: 18,
    hsnCode: "9403",
    lowStockThreshold: 5,
    specifications: "Length: 4.5ft; Width: 2.2ft; Height: 2.5ft; Frame Material: Silver Anodized Aluminium",
    suggestedPrice: "₹12,500 - ₹14,000",
    metaDescription: "Professional home office desk with modern clean lines and sturdy aluminium structure.",
    featured: false,
    isNew: false,
    isActive: true,
    image: "/images/products/office-desk.jpg",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Aluminium Profile Display Rack",
    category: "Furniture",
    brand: "SNT Premium",
    description: "Showroom-style display unit perfect for showcasing products or decorations. Built with thin aluminium structural profiles, tempered glass shelves, and built-in LED spot lighting.",
    regularPrice: 22000,
    price: 22000,
    wholesalePrice: 19000,
    dealerPrice: 19000,
    originalPrice: 28000,
    stock: 6,
    unit: "Piece",
    gstRate: 18,
    hsnCode: "9403",
    lowStockThreshold: 2,
    specifications: "Height: 6ft; Width: 3ft; Shelves: 4 Tempered Glass Panels; Light: 12V built-in warm LEDs",
    suggestedPrice: "₹22,000 - ₹24,000",
    metaDescription: "Shop luxury glass display cabinet rack with integrated LED spot lighting for showroom display.",
    featured: true,
    isNew: false,
    isActive: true,
    image: "/images/products/display-rack.jpg",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Modern Hydraulic Double Bed",
    category: "Furniture",
    brand: "SNT Premium",
    description: "Premium king-size double bed with easy-access hydraulic storage. Features a thick, cushioned headboard upholstered in high-grade grey leatherette.",
    regularPrice: 35000,
    price: 35000,
    wholesalePrice: 30000,
    dealerPrice: 30000,
    originalPrice: 42000,
    stock: 4,
    unit: "Piece",
    gstRate: 18,
    hsnCode: "9403",
    lowStockThreshold: 2,
    specifications: "Size: King Size (6ft x 6.5ft); Storage: Hydraulic Lift System; Headboard: Tufted Leatherette",
    suggestedPrice: "₹35,000 - ₹38,000",
    metaDescription: "King size modern hydraulic storage double bed in high grade tufted grey upholstery.",
    featured: true,
    isNew: true,
    isActive: true,
    image: "/images/products/hydraulic-bed.jpg",
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function seed() {
  try {
    console.log('🔌 Connecting to SNT database...');
    if (db.ready) await db.ready;
    
    console.log('🔄 Checking existing products...');
    let addedCount = 0;
    
    for (const prod of furnitureProducts) {
      // Find if exists
      const match = await db.products.findOne({ name: prod.name });
      if (!match) {
        await db.products.insert(prod);
        console.log(`✅ Listed: "${prod.name}"`);
        addedCount++;
      } else {
        console.log(`ℹ️ Already exists: "${prod.name}"`);
      }
    }
    
    console.log(`\n🎉 Seed finished! Successfully listed ${addedCount} new modern furniture products.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
