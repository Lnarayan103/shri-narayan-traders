const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Ensure docs directory exists
const docsDir = path.join(__dirname, '../docs');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

const pdfPath = path.join(docsDir, 'SNT-Project-Documentation.pdf');
const mdPath = path.join(docsDir, 'SNT-Project-Documentation.md');

// Colors
const primaryColor = '#001f4d';   // Navy
const accentColor = '#c9922a';    // Gold
const textColor = '#1e293b';      // Charcoal/Slate
const lightBgColor = '#f8fafc';   // Light gray
const whiteColor = '#ffffff';

console.log('📄 Starting generation of project documentation...');

// -------------------------------------------------------------
// 1. PDF Generation using PDFKit
// -------------------------------------------------------------
const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 70, bottom: 85, left: 70, right: 70 }
});

const stream = fs.createWriteStream(pdfPath);
doc.pipe(stream);

let pageCount = 0;

// Page layout event listener for headers, footers and separators
doc.on('pageAdded', () => {
  pageCount++;
  if (pageCount === 1) return; // Skip cover page

  // Draw header text & page number
  doc.save();
  
  // Temporarily reset margins to avoid infinite loop when printing header/footer outside normal page margins
  const oldMargins = doc.page.margins;
  doc.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };

  doc.font('Helvetica-Bold').fontSize(8).fillColor(primaryColor);
  doc.text('Shri Narayan Traders — Project Documentation', 70, 40);
  
  doc.font('Helvetica').fontSize(8).fillColor('#64748b');
  doc.text(`Page ${pageCount}`, 400, 40, { align: 'right', width: 125 });
  
  // Header line
  doc.strokeColor(accentColor).lineWidth(0.8).moveTo(70, 52).lineTo(525, 52).stroke();
  
  // Footer line & text
  doc.strokeColor(primaryColor).lineWidth(0.8).moveTo(70, 775).lineTo(525, 775).stroke();
  doc.font('Helvetica').fontSize(8).fillColor('#64748b');
  doc.text('BCA Project Portfolio | Satya | 2025-2026', 70, 785);

  // Restore margins
  doc.page.margins = oldMargins;
  doc.restore();
});

// Helper for drawing custom titles
function drawChapterTitle(num, title) {
  doc.save();
  doc.fillColor(accentColor).font('Helvetica-Bold').fontSize(12).text(`CHAPTER ${num}`, 70, 100);
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(22).text(title, 70, 118);
  doc.strokeColor(accentColor).lineWidth(3).moveTo(70, 150).lineTo(150, 150).stroke();
  doc.restore();
  doc.y = 175; // Set vertical offset for following text
}

// Helper to draw section titles
function drawSectionTitle(label, text) {
  doc.save();
  doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(14).text(`${label} ${text}`);
  doc.restore();
  doc.moveDown(0.5);
}

// Helper to draw tables
function drawTable(headers, rows, colWidths, startY) {
  let y = startY || doc.y;
  
  // Header Row
  doc.save();
  doc.fillColor(primaryColor).rect(70, y, 455, 20).fill();
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(whiteColor);
  
  let currentX = 70;
  headers.forEach((h, idx) => {
    doc.text(h, currentX + 5, y + 6, { width: colWidths[idx] - 10, align: 'left' });
    currentX += colWidths[idx];
  });
  doc.restore();
  
  y += 20;

  // Alternate Row rendering
  rows.forEach((row, rIdx) => {
    const rowBg = rIdx % 2 === 0 ? whiteColor : lightBgColor;
    doc.save();
    doc.fillColor(rowBg).rect(70, y, 455, 18).fill();
    doc.font('Helvetica').fontSize(8).fillColor(textColor);
    
    let cellX = 70;
    row.forEach((cell, cIdx) => {
      doc.text(String(cell), cellX + 5, y + 5, { width: colWidths[cIdx] - 10, align: 'left' });
      cellX += colWidths[cIdx];
    });
    
    // Draw horizontal grid divider
    doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(70, y + 18).lineTo(525, y + 18).stroke();
    doc.restore();
    y += 18;
  });

  // Table Outer Border
  doc.save();
  doc.strokeColor(accentColor).lineWidth(1)
     .rect(70, startY || doc.y, 455, y - (startY || doc.y))
     .stroke();
  doc.restore();
  
  doc.y = y + 10;
}

// Helper to draw Code or Schematic boxes
function drawCodeBox(lines, startY) {
  const y = startY || doc.y;
  const padding = 10;
  const boxHeight = lines.length * 12 + (padding * 2);
  
  doc.save();
  doc.fillColor(lightBgColor).rect(70, y, 455, boxHeight).fill();
  doc.strokeColor(primaryColor).lineWidth(1.5).moveTo(70, y).lineTo(70, y + boxHeight).stroke();
  
  doc.font('Courier').fontSize(8.2).fillColor(textColor);
  let textY = y + padding;
  lines.forEach(line => {
    doc.text(line, 80, textY);
    textY += 12;
  });
  doc.restore();
  
  doc.y = y + boxHeight + 15;
}

// =============================================================
// PAGE 1: COVER PAGE
// =============================================================
pageCount++; // PageAdded handler is not called for the first page
doc.save();
doc.rect(0, 0, 595.28, 841.89).fill(primaryColor);

// Large Centered Gold Monogram Ring
doc.lineWidth(2.5).strokeColor(accentColor);
doc.circle(297.64, 180, 55).stroke();
doc.lineWidth(1).strokeColor(accentColor);
doc.circle(297.64, 180, 50).stroke();

// Crossed Hammers Symbol vector representation inside circle
doc.lineWidth(1.5).strokeColor(accentColor);
doc.moveTo(277.64, 200).lineTo(317.64, 160).stroke();
doc.moveTo(317.64, 200).lineTo(277.64, 160).stroke();

// SNT monogram text
doc.fillColor(accentColor).font('Helvetica-Bold').fontSize(26).text('SNT', 247.64, 168, { align: 'center', width: 100 });

// Title
doc.fillColor(whiteColor).font('Helvetica-Bold').fontSize(30).text('SHRI NARAYAN TRADERS', 70, 270, { align: 'center', width: 455 });

// Subtitle
doc.fillColor(accentColor).font('Helvetica-Bold').fontSize(15).text('Full Stack Business Management System', 70, 312, { align: 'center', width: 455 });

// Separator Line
doc.strokeColor(accentColor).lineWidth(1).moveTo(200, 345).lineTo(395, 345).stroke();

// Academic Details
doc.fillColor(whiteColor).font('Helvetica-Bold').fontSize(12).text('PROJECT PORTFOLIO & REPORT', 70, 480, { align: 'center', width: 455 });

doc.fontSize(10).fillColor('#94a3b8').font('Helvetica').text('Submitted in partial fulfillment of the requirements for the degree of', 70, 520, { align: 'center', width: 455 });
doc.fontSize(13).fillColor(accentColor).font('Helvetica-Bold').text('Bachelor of Computer Applications (BCA)', 70, 538, { align: 'center', width: 455 });

doc.fontSize(10).fillColor('#94a3b8').font('Helvetica').text('Prepared and Developed By:', 70, 595, { align: 'center', width: 455 });
doc.fontSize(15).fillColor(whiteColor).font('Helvetica-Bold').text('SATYA', 70, 612, { align: 'center', width: 455 });

doc.fontSize(10).fillColor('#94a3b8').font('Helvetica').text('Academic Session: 2025 - 2026', 70, 675, { align: 'center', width: 455 });
doc.fontSize(10).fillColor('#94a3b8').text('Department of Computer Science & Applications', 70, 690, { align: 'center', width: 455 });

doc.restore();

// =============================================================
// PAGE 2: CERTIFICATE PAGE
// =============================================================
doc.addPage();

doc.save();
doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(22).text('BONAFIDE CERTIFICATE', 70, 110, { align: 'center', width: 455 });
doc.strokeColor(accentColor).lineWidth(1.5).moveTo(150, 142).lineTo(445, 142).stroke();

const certText = `This is to certify that the project work titled "Shri Narayan Traders Business Management System" is a bonafide record of full-stack engineering work carried out by Satya in partial fulfillment of the requirements for the award of the degree of Bachelor of Computer Applications (BCA) for the academic session 2025-2026.\n\nThis project represents original work and demonstrates practical application of modern web architectures, API designs, databases, and secure authentication methods under the guidelines of the college faculty.`;
doc.fillColor(textColor).font('Helvetica').fontSize(11).text(certText, 70, 190, { align: 'justify', lineGap: 6 });

// Signatures grid
const sigY = 560;
doc.strokeColor('#cbd5e1').lineWidth(0.8).moveTo(70, sigY).lineTo(180, sigY).stroke();
doc.strokeColor('#cbd5e1').lineWidth(0.8).moveTo(242, sigY).lineTo(352, sigY).stroke();
doc.strokeColor('#cbd5e1').lineWidth(0.8).moveTo(415, sigY).lineTo(525, sigY).stroke();

doc.font('Helvetica-Bold').fontSize(9.5).fillColor(primaryColor);
doc.text('STUDENT SIGNATURE', 70, sigY + 8, { width: 110, align: 'center' });
doc.text('PROJECT GUIDE', 242, sigY + 8, { width: 110, align: 'center' });
doc.text('HEAD OF DEPARTMENT', 415, sigY + 8, { width: 110, align: 'center' });

doc.font('Helvetica').fontSize(8.5).fillColor('#64748b');
doc.text('Satya, BCA Candidate', 70, sigY + 22, { width: 110, align: 'center' });
doc.text('Internal Supervisor', 242, sigY + 22, { width: 110, align: 'center' });
doc.text('HOD Computer Applications', 415, sigY + 22, { width: 110, align: 'center' });
doc.restore();

// =============================================================
// PAGE 3: DECLARATION PAGE
// =============================================================
doc.addPage();

doc.save();
doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(22).text('DECLARATION', 70, 110, { align: 'center', width: 455 });
doc.strokeColor(accentColor).lineWidth(1.5).moveTo(180, 142).lineTo(415, 142).stroke();

const decText = `I, Satya, student of Bachelor of Computer Applications (BCA) for the academic session 2025-2026, hereby declare that the project portfolio report titled "Shri Narayan Traders Business Management System" is a result of my own original work.\n\nAll tools, open-source libraries, database servers, web frameworks, and cloud service endpoints referenced in this work have been properly cited and credited. This report has not been submitted previously to any other institution for the award of any degree or diploma.`;
doc.fillColor(textColor).font('Helvetica').fontSize(11).text(decText, 70, 200, { align: 'justify', lineGap: 6 });

doc.fontSize(10).fillColor(textColor);
doc.text('Date: June 23, 2026', 70, 520);
doc.text('Place: Munger, Bihar', 70, 538);

doc.strokeColor('#cbd5e1').lineWidth(0.8).moveTo(375, 530).lineTo(525, 530).stroke();
doc.font('Helvetica-Bold').fontSize(10).fillColor(primaryColor);
doc.text('SATYA', 375, 538, { width: 150, align: 'center' });
doc.font('Helvetica').fontSize(9).fillColor('#64748b');
doc.text('BCA Roll No. 25BCA08', 375, 552, { width: 150, align: 'center' });
doc.restore();

// =============================================================
// PAGE 4: ACKNOWLEDGEMENT
// =============================================================
doc.addPage();

doc.save();
doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(22).text('ACKNOWLEDGEMENT', 70, 110, { align: 'center', width: 455 });
doc.strokeColor(accentColor).lineWidth(1.5).moveTo(160, 142).lineTo(435, 142).stroke();

const ackText = `I express my profound gratitude to the college faculty and internal supervisor for providing valuable mentorship, constant encouragement, and technical feedback throughout the development of the "Shri Narayan Traders Business Management System".\n\nI am deeply indebted to the open-source community for creating powerful tools and robust runtimes such as Node.js, Express.js, and PDFKit, which formed the foundational stack of this application.\n\nSpecial thanks to Google for providing access to the OpenRouter AI API, enabling dynamic context-aware description generations and smart email writing. I also acknowledge the MongoDB Atlas and Cloudinary support teams for providing high-reliability cloud database and image media storage services that facilitated successful project deployments.\n\nLastly, I thank my family and peers for their constant support and understanding during the design and coding stages of this portfolio system.`;
doc.fillColor(textColor).font('Helvetica').fontSize(10.5).text(ackText, 70, 200, { align: 'justify', lineGap: 6 });

doc.strokeColor('#cbd5e1').lineWidth(0.8).moveTo(375, 600).lineTo(525, 600).stroke();
doc.font('Helvetica-Bold').fontSize(10).fillColor(primaryColor);
doc.text('SATYA', 375, 608, { width: 150, align: 'center' });
doc.restore();

// =============================================================
// PAGE 5: TABLE OF CONTENTS
// =============================================================
doc.addPage();

doc.save();
doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(22).text('TABLE OF CONTENTS', 70, 110, { align: 'center', width: 455 });
doc.strokeColor(accentColor).lineWidth(1.5).moveTo(160, 142).lineTo(435, 142).stroke();

const toc = [
  { ch: '1', title: 'PROJECT OVERVIEW', page: '6' },
  { ch: '2', title: 'TECHNOLOGY STACK', page: '8' },
  { ch: '3', title: 'SYSTEM ARCHITECTURE', page: '10' },
  { ch: '4', title: 'DATABASE DESIGN', page: '13' },
  { ch: '5', title: 'API DOCUMENTATION', page: '16' },
  { ch: '6', title: 'FEATURES EXPLAINED', page: '19' },
  { ch: '7', title: 'USER MANUAL', page: '23' },
  { ch: '8', title: 'SYSTEM TESTING', page: '26' },
  { ch: '9', title: 'CHALLENGES & SOLUTIONS', page: '28' },
  { ch: '10', title: 'FUTURE SCOPE', page: '29' },
  { ch: '11', title: 'CONCLUSION', page: '30' },
  { ch: '12', title: 'BIBLIOGRAPHY', page: '31' }
];

let tocY = 200;
toc.forEach(item => {
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(primaryColor);
  doc.text(`CHAPTER ${item.ch}`, 70, tocY);
  doc.text(item.title, 150, tocY);
  
  // Leader dots
  doc.font('Helvetica').fontSize(10.5).fillColor('#94a3b8');
  let dots = '';
  for (let i = 0; i < 48 - item.title.length; i++) dots += '.';
  doc.text(dots, 150 + doc.widthOfString(item.title) + 5, tocY);
  
  doc.font('Helvetica-Bold').fillColor(primaryColor);
  doc.text(item.page, 500, tocY, { align: 'right', width: 25 });
  
  tocY += 28;
});
doc.restore();

// =============================================================
// PAGE 6: CHAPTER 1 — PROJECT OVERVIEW (Page 1)
// =============================================================
doc.addPage();
drawChapterTitle('1', 'PROJECT OVERVIEW');

drawSectionTitle('1.1', 'Introduction');
const ch1Intro = `Shri Narayan Traders is a registered hardware supplier, furniture manufacturer, and aluminium fabrication works business located in Kauda madan, Dilawer Pur, Munger, Bihar (PIN 811201). Estabilished in 1998, the business has grown significantly, serving residential, commercial, and retail clients across the region.\n\nTo digitize the legacy systems, this full-stack business management application was developed. The system serves as an enterprise-grade digital solution to handle invoice creations, real-time catalog checking, inventory alerts, bulk dealer portals, and general enquiries logging. It enables the store to offer a streamlined, automated, and secure buying workflow.`;
doc.font('Helvetica').fontSize(10).fillColor(textColor).text(ch1Intro, 70, doc.y, { align: 'justify', lineGap: 4 });
doc.moveDown(1.5);

drawSectionTitle('1.2', 'Problem Statement');
const ch1Prob = `Before the installation of this digital portal, Shri Narayan Traders operated through traditional manual workflows, leading to major operational challenges:\n\n1. Manual Billing: Generating handwritten cash memos was slow and vulnerable to calculations errors. Hand-computing SGST/CGST tax splits for high-volume invoices caused administrative overhead.\n\n2. Lack of Stock Visibility: The business had no digital ledger to track inventory counts. This caused frequent stock-outs or over-ordering of slow-moving goods.\n\n3. Inquiries Management: Customer catalog requests were handled verbally or via phone, resulting in lost inquiries and long delays.\n\n4. Lack of Dealer Interface: Wholesale dealers had to make phone calls to negotiate pricing, leading to discrepancies and communication errors.`;
doc.font('Helvetica').fontSize(10).fillColor(textColor).text(ch1Prob, 70, doc.y, { align: 'justify', lineGap: 4 });

// =============================================================
// PAGE 7: CHAPTER 1 — PROJECT OVERVIEW (Page 2)
// =============================================================
doc.addPage();
doc.y = 80;

drawSectionTitle('1.3', 'Proposed Solution');
const ch1Sol = `The proposed full-stack application digitizes all administrative and customer-facing interactions. Key features of the system include:\n\n1. Automated GST Invoicing (POS): An online terminal enables sales staff to build print-ready PDF invoices. CGST, SGST, discounts, and total amounts are calculated dynamically.\n\n2. Real-Time Inventory Control: The system decrements stock counts automatically during checkout. Low stock alert emails are triggered instantly to prevent inventory exhaustion.\n\n3. Multi-role Admin Dashboard: The owner can monitor sales statistics, review logs, approve reviews, adjust coordinate settings, and register staff accounts from a single unified portal.\n\n4. Dealer Portal: Registered wholesalers can log in to view customized dealer-rate catalogs and directly submit bulk orders online.`;
doc.font('Helvetica').fontSize(10).fillColor(textColor).text(ch1Sol, 70, doc.y, { align: 'justify', lineGap: 4 });
doc.moveDown(1.5);

drawSectionTitle('1.4', 'Project Scope');
const ch1Scope = `The scope of the Shri Narayan Traders Business Management System includes:\n\n- Customer Front: Public website presenting dynamic product catalogs, filterable galleries, custom WhatsApp inquiries, customer reviews, and order tracking services.\n\n- Admin Console: Protected dashboard for product CRUD operations, GST billing, dealer registrations approval, and site-wide coordinate updates.\n\n- Dealer Module: Secure portal for wholesale dealer registrations, status checks, and bulk checkouts.\n\n- API & AI Integrations: Dynamic product description generation using OpenRouter Vision API, and automated status emails using OpenRouter AI and Gmail SMTP.`;
doc.font('Helvetica').fontSize(10).fillColor(textColor).text(ch1Scope, 70, doc.y, { align: 'justify', lineGap: 4 });

// =============================================================
// PAGE 8: CHAPTER 2 — TECHNOLOGY STACK (Page 1)
// =============================================================
doc.addPage();
drawChapterTitle('2', 'TECHNOLOGY STACK');

const ch2Text = `The technology stack of the Shri Narayan Traders Business Management System is designed to offer high efficiency, modern aesthetics, reliable datastores, and robust security parameters. The application utilizes Node.js on the backend combined with a responsive HTML5/CSS3/Bootstrap 5 frontend, connected to cloud servers for optimal scalability.`;
doc.font('Helvetica').fontSize(10).fillColor(textColor).text(ch2Text, 70, doc.y, { align: 'justify', lineGap: 4 });
doc.moveDown(1.5);

drawSectionTitle('2.1', 'Frontend Specifications');
doc.font('Helvetica').fontSize(9.5).fillColor(textColor).text('The frontend is built using standard technologies to ensure fast page load speeds and seamless rendering across all screen dimensions. Details are listed below:', 70, doc.y);
doc.moveDown(0.8);

const frontHeaders = ['Technology', 'Version', 'Purpose & Application'];
const frontRows = [
  ['HTML5', '5.0', 'Page structure, semantic DOM architecture, SEO structures.'],
  ['CSS3', '3.0', 'Custom Navy/Gold theme styling, glassmorphism UI components.'],
  ['Bootstrap', '5.3.2', 'Responsive grid framework, offcanvas menus, modals layout.'],
  ['JavaScript', 'ES6+', 'Dynamic AJAX API fetch requests, UI interactive actions.'],
  ['EJS', '3.1.9', 'Server-side templating engine to inject database variables.'],
  ['Chart.js', '4.4.1', 'Renders real-time statistics graphs on the Admin panel.']
];
drawTable(frontHeaders, frontRows, [80, 60, 315]);

// =============================================================
// PAGE 9: CHAPTER 2 — TECHNOLOGY STACK (Page 2)
// =============================================================
doc.addPage();
doc.y = 80;

drawSectionTitle('2.2', 'Backend & Database Stack');
doc.font('Helvetica').fontSize(9.5).fillColor(textColor).text('The server-side runs on Node.js using Express.js as the core API framework. Authentic security filters and dual-mode database layers are configured:', 70, doc.y);
doc.moveDown(0.8);

const backHeaders = ['Technology', 'Version', 'Description & Integration'];
const backRows = [
  ['Node.js', 'v20.x+', 'Fast, asynchronous, single-threaded V8 runtime environment.'],
  ['Express.js', 'v5.2.x', 'Web application framework handling REST routing & middlewares.'],
  ['JSON Web Token', 'v9.0.2', 'Secure stateless tokens stored in HTTP-only cookies.'],
  ['bcryptjs', 'v2.4.3', 'Password salting and hashing algorithm (10 rounds).'],
  ['MongoDB Atlas', 'v7.3.0', 'Production-grade cloud database hosting user data.'],
  ['NeDB (Promises)', 'v6.2.3', 'Local datastore fallback file system for offline running.'],
  ['PDFKit', 'v0.19.1', 'Vector-based PDF generator utilized for GST invoice prints.']
];
drawTable(backHeaders, backRows, [90, 60, 305]);
doc.moveDown(1);

drawSectionTitle('2.3', 'API & Cloud Services');
doc.font('Helvetica').fontSize(9.5).fillColor(textColor).text('To expand features, third-party APIs and storage channels are mapped:', 70, doc.y);
doc.moveDown(0.8);

const cloudHeaders = ['Service / API', 'Provider', 'Purpose'];
const cloudRows = [
  ['OpenRouter 3.5 Flash', 'OpenRouter Console', 'Generates product descriptions and custom email content.'],
  ['Cloudinary', 'Cloudinary Inc.', 'Provides secure CDN hosting for catalog product images.'],
  ['Nodemailer', 'SMTP Transport', 'Delivers transactional emails using Gmail App Passwords.'],
  ['Google Translate', 'Google Cloud', 'Allows 9-language translation of customer interfaces.']
];
drawTable(cloudHeaders, cloudRows, [120, 110, 225]);

// =============================================================
// PAGE 10: CHAPTER 3 — SYSTEM ARCHITECTURE (Page 1)
// =============================================================
doc.addPage();
drawChapterTitle('3', 'SYSTEM ARCHITECTURE');

drawSectionTitle('3.1', 'Architectural Diagram');
doc.font('Helvetica').fontSize(9.5).fillColor(textColor).text('The application follows a standard Client-Server-Database pattern. The diagram below illustrates request processing pipelines:', 70, doc.y);
doc.moveDown(0.8);

const flowLines = [
  '     [ CLIENT (Web Browser / PWA) ]',
  '                   │',
  '                   ▼ (HTTP Request: JSON/GET/POST)',
  '       [ EXPRESS.JS ROUTER & MIDDLEWARES ]',
  '        (Rate Limiter, Parser, JWT Auth)',
  '                   │',
  '                   ▼',
  '            [ CONTROLLERS ]',
  '       (Business Logic & AI Engines)',
  '                   │',
  '                   ▼',
  '           [ DATABASE ADAPTER ]',
  '        (Automatic Fallback Switch)',
  '          ╱                  ╲',
  '         ▼                    ▼',
  '  [ MongoDB Cloud ]    [ Local NeDB files ]',
  '  (Atlas Production)   (Offline Fail-safe)'
];
drawCodeBox(flowLines);
doc.moveDown(0.5);

drawSectionTitle('3.2', 'Model-View-Controller (MVC) Pattern');
const mvcText = `The codebase is strictly organized using the MVC software design pattern to isolate data structures, client visual templates, and API endpoints:\n\n- Model (M): NeDB datastore collections and MongoDB collections mapped inside "config/db.js".\n\n- View (V): Front-end user interfaces and admin panels written in HTML5/Bootstrap 5 templates inside the "views/" folder and dynamically compiled using Embedded JavaScript (EJS).\n\n- Controller (C): Javascript controllers inside "controllers/" that execute operations such as authorization (authController.js), billing (orderController.js), catalog modifications (productController.js), settings (settingsController.js), and AI calls (aiController.js).`;
doc.font('Helvetica').fontSize(10).fillColor(textColor).text(mvcText, 70, doc.y, { align: 'justify', lineGap: 4 });

// =============================================================
// PAGE 11: CHAPTER 3 — SYSTEM ARCHITECTURE (Page 2)
// =============================================================
doc.addPage();
doc.y = 80;

drawSectionTitle('3.3', 'Dual Database Adapter Architecture');
const dbAdapt = `A major feature of this system is the Custom Dual Database Adapter pattern. Designed for resilient operational continuity in areas with intermittent internet access (like rural Bihar), the database layer is split into production cloud and offline local storages.\n\nWhen the system boots up, the database config module checks for the presence of the MONGODB_URI environment key and triggers a connection to MongoDB Atlas. If the connection fails (e.g. timeout, DNS error, or IP binding issues), the adapter automatically handles the exception, prints a warning to logs, and routes all CRUD operations to local NeDB datastore files (users.db, products.db, orders.db, etc.) stored in the "data/" directory.\n\nAll CRUD methods (find, findOne, insert, update, remove, count) are wrapped inside a NeDB-compatible wrapper class. This guarantees that controllers interact with the database using identical syntax regardless of the active connection state.`;
doc.font('Helvetica').fontSize(10).fillColor(textColor).text(dbAdapt, 70, doc.y, { align: 'justify', lineGap: 4 });
doc.moveDown(1.5);

drawSectionTitle('3.4', 'JWT Token-Based Authentication Flow');
const authFlow = `The system uses stateless JSON Web Token (JWT) credentials to authenticate administrators and registered wholesale dealers:\n\n1. Submission: The client sends a POST request containing login credentials to "/api/auth/login".\n\n2. Verification: The server compares the password using bcrypt. If valid, it generates a JWT containing user ID, role, and username.\n\n3. Cookie Storage: The JWT is signed with a 256-bit secret key and sent back inside an HTTP-only cookie. This blocks client-side scripts from reading the token, preventing XSS-based hijacking.\n\n4. Request Authorization: Middlewares inspect cookies for incoming requests. If the signature checks out, user details are appended to "req.user" and processing continues; otherwise, the client is redirected to the login endpoint.`;
doc.font('Helvetica').fontSize(10).fillColor(textColor).text(authFlow, 70, doc.y, { align: 'justify', lineGap: 4 });

// =============================================================
// PAGE 12: CHAPTER 3 — SYSTEM ARCHITECTURE (Page 3)
// =============================================================
doc.addPage();
doc.y = 80;

drawSectionTitle('3.5', 'API Layer and JSON Standards');
const apiLayer = `All transaction data and admin CRUD actions communicate via standard RESTful JSON interfaces. The base path for all system APIs is registered under "/api/". Every route utilizes unified JSON formats to communicate with frontend AJAX scripts. This layout ensures easy integration with external mobile apps or desktop client platforms in the future.\n\nSuccessful responses always return HTTP 200/201 status codes wrapped in standard format:\n{ "success": true, "data": ... }\n\nIf the server captures an error, the global error-handling middleware intercepts the exception, logs details to the console, and returns JSON explaining the failure:\n{ "success": false, "error": "Reason description" }`;
doc.font('Helvetica').fontSize(10).fillColor(textColor).text(apiLayer, 70, doc.y, { align: 'justify', lineGap: 4 });
doc.moveDown(1.5);

drawSectionTitle('3.6', 'Security Headers & Protection Middlewares');
const secMid = `To safeguard the web service against standard vulnerabilities, the application mounts protection filters:\n\n- Helmet.js Content Security Policies: Mapped to set secure HTTP headers, blocking clickjacking, MIME-type sniffing, and unauthorized inline script injections.\n\n- Global Rate Limiting: Mapped via "express-rate-limit" to restrict any IP to a maximum of 450 requests per 15-minute window. This limits brute-force attacks on login routes and protects the API against Denial-of-Service (DoS) flooding.`;
doc.font('Helvetica').fontSize(10).fillColor(textColor).text(secMid, 70, doc.y, { align: 'justify', lineGap: 4 });

// =============================================================
// PAGE 13: CHAPTER 4 — DATABASE DESIGN (Page 1)
// =============================================================
doc.addPage();
drawChapterTitle('4', 'DATABASE DESIGN');

drawSectionTitle('4.1', 'Entity Collections Relationship');
const dbDesign = `The database consists of 8 main collections, managed dynamically using NeDB files locally and native MongoDB collections in production:\n\n1. USERS: Stores admin, manager, sales staff, and dealer logins.\n2. PRODUCTS: Holds the catalog item details, stock counts, and pricing specs.\n3. ORDERS: Contains checkout item details, payment, and status coordinates.\n4. ENQUIRIES: Stores contact form submissions from client pages.\n5. OFFERS: Manages promotional discounts and countdown target schedules.\n6. GALLERY: Stores files paths to showcase pictures.\n7. STATS: Tracks visitor numbers and counts.\n8. SETTINGS: Keeps global store variables (business email, maps, and gstin).`;
doc.font('Helvetica').fontSize(10).fillColor(textColor).text(dbDesign, 70, doc.y, { align: 'justify', lineGap: 4 });
doc.moveDown(1.5);

drawSectionTitle('4.2', 'USERS Collection Schema');
const usersLines = [
  '{',
  '  "_id"        : "ObjectId / String (Primary Key)",',
  '  "username"   : "String (Unique phone number or username)",',
  '  "password"   : "String (bcrypt salted hash)",',
  '  "role"       : "String (super-admin | admin | manager | sales | dealer)",',
  '  "name"       : "String (Full Name)",',
  '  "email"      : "String (Contact Address)",',
  '  "businessName": "String (Only for dealer accounts)",',
  '  "gstin"      : "String (Only for dealer accounts)",',
  '  "isApproved" : "Boolean (Only for dealer approvals)",',
  '  "createdAt"  : "Date"',
  '}'
];
drawCodeBox(usersLines);

// =============================================================
// PAGE 14: CHAPTER 4 — DATABASE DESIGN (Page 2)
// =============================================================
doc.addPage();
doc.y = 80;

drawSectionTitle('4.3', 'PRODUCTS Collection Schema');
const productsLines = [
  '{',
  '  "_id"              : "ObjectId / String (Primary Key)",',
  '  "name"             : "String (Product Name)",',
  '  "category"         : "String (Hardware | Furniture | Aluminium)",',
  '  "brand"            : "String (Manufacturer / Brand Name)",',
  '  "description"      : "String (Rich HTML/Text Description)",',
  '  "regularPrice"     : "Number (Retail selling price in INR)",',
  '  "wholesalePrice"   : "Number (Dealer selling price in INR)",',
  '  "originalPrice"    : "Number (MRP/List price before discounts)",',
  '  "stock"            : "Number (Available stock count)",',
  '  "unit"             : "String (Piece | Set | Running Foot)",',
  '  "hsnCode"          : "String (4-digit HSN code for GST classification)",',
  '  "gstRate"          : "Number (0 | 5 | 12 | 18 | 28 percent)",',
  '  "image"            : "String (Cloudinary secure URL or local asset path)",',
  '  "specifications"   : "String (Comma-separated key-value specs)",',
  '  "lowStockThreshold": "Number (Default 5, stock alert trigger)",',
  '  "metaDescription"  : "String (SEO meta summary)",',
  '  "featured"         : "Boolean (Highlight on index page)",',
  '  "isNew"            : "Boolean (Display new arrival badge)",',
  '  "isActive"         : "Boolean (Active in display lists)",',
  '  "createdAt"        : "Date"',
  '}'
];
drawCodeBox(productsLines);

// =============================================================
// PAGE 15: CHAPTER 4 — DATABASE DESIGN (Page 3)
// =============================================================
doc.addPage();
doc.y = 80;

drawSectionTitle('4.4', 'ORDERS Collection Schema');
const ordersLines = [
  '{',
  '  "_id"           : "ObjectId / String (Primary Key)",',
  '  "orderId"       : "String (Auto-generated code SNT-XXXX-YYYY)",',
  '  "dealerId"      : "String (Link to users._id, or \'walkin\')",',
  '  "dealerName"    : "String (Customer / business name)",',
  '  "dealerPhone"   : "String (Customer contact number)",',
  '  "dealerGstin"   : "String (Optional customer GSTIN number)",',
  '  "customerEmail" : "String (Recipient email address)",',
  '  "items"         : "Array [",',
  '    {',
  '      "productId" : "String (Link to products._id)",',
  '      "name"      : "String (Item Name)",',
  '      "qty"       : "Number (Quantity ordered)",',
  '      "price"     : "Number (Rate applied)",',
  '      "total"     : "Number (Qty * Price)",',
  '      "gstRate"   : "Number (GST rate applied)"',
  '    }',
  '  ],',
  '  "subtotal"      : "Number (Total before GST and discount)",',
  '  "gstAmount"     : "Number (Calculated CGST + SGST tax total)",',
  '  "discount"      : "Number (Flat discount applied)",',
  '  "totalAmount"   : "Number (Subtotal + GST - Discount)",',
  '  "status"        : "String (pending | confirmed | processing | shipped | delivered)",',
  '  "paymentStatus" : "String (pending | paid | partial)",',
  '  "paymentMethod" : "String (Cash | UPI | Card | Credit)",',
  '  "shippingAddress": "String (Address coordinates)",',
  '  "createdAt"     : "Date"',
  '}'
];
drawCodeBox(ordersLines);

// =============================================================
// PAGE 16: CHAPTER 5 — API DOCUMENTATION (Page 1)
// =============================================================
doc.addPage();
drawChapterTitle('5', 'API DOCUMENTATION');

const ch5Text = `The Shri Narayan Traders application provides a comprehensive RESTful JSON API layer. This design enables headless functionality, allowing front-end templates to query data using client-side Javascript (AJAX Fetch requests) without performing hard page refreshes.`;
doc.font('Helvetica').fontSize(10).fillColor(textColor).text(ch5Text, 70, doc.y, { align: 'justify', lineGap: 4 });
doc.moveDown(1.5);

drawSectionTitle('5.1', 'Authentication REST endpoints');
doc.font('Helvetica').fontSize(9.5).fillColor(textColor).text('Handles user/admin login states, password migrations, and registration routes:', 70, doc.y);
doc.moveDown(0.8);

const authApiHeaders = ['Method', 'Endpoint Route', 'Auth', 'Description'];
const authApiRows = [
  ['POST', '/api/auth/login', 'No', 'Verifies user/admin credentials and registers JWT cookies.'],
  ['POST', '/api/auth/register-dealer', 'No', 'Registers a wholesale dealer, placing them in pending queue.'],
  ['GET', '/api/auth/logout', 'Yes', 'Clears authorization cookie tokens, resetting session.'],
  ['PUT', '/api/auth/change-password', 'Yes', 'Updates current authenticated credentials.']
];
drawTable(authApiHeaders, authApiRows, [60, 150, 45, 200]);

// =============================================================
// PAGE 17: CHAPTER 5 — API DOCUMENTATION (Page 2)
// =============================================================
doc.addPage();
doc.y = 80;

drawSectionTitle('5.2', 'Catalog & Product APIs');
doc.font('Helvetica').fontSize(9.5).fillColor(textColor).text('Manages stock catalogs. Restricted actions require Admin/Manager authorization role:', 70, doc.y);
doc.moveDown(0.8);

const prodApiHeaders = ['Method', 'Endpoint Route', 'Role Required', 'Description'];
const prodApiRows = [
  ['GET', '/api/products', 'None', 'List catalog products (allows category / search filter).'],
  ['GET', '/api/products/:id', 'None', 'Fetch details of a single product.'],
  ['POST', '/api/products', 'Admin / Manager', 'Insert a new product including photo upload.'],
  ['PUT', '/api/products/:id', 'Admin / Manager', 'Update details, pricing or stock levels.'],
  ['DELETE', '/api/products/:id', 'Admin / Manager', 'Remove product record from collections.']
];
drawTable(prodApiHeaders, prodApiRows, [60, 150, 95, 150]);
doc.moveDown(1);

drawSectionTitle('5.3', 'Order & Invoicing APIs');
doc.font('Helvetica').fontSize(9.5).fillColor(textColor).text('Processes customer shopping orders, billing printouts, and status checks:', 70, doc.y);
doc.moveDown(0.8);

const orderApiHeaders = ['Method', 'Endpoint Route', 'Role Required', 'Description'];
const orderApiRows = [
  ['POST', '/api/orders', 'Any Login / Guest', 'Submit a checkout order (walkin or online).'],
  ['GET', '/api/orders/my', 'Dealer', 'Fetch order history for the active logged dealer.'],
  ['GET', '/api/orders/all', 'Admin / Manager', 'Retrieve complete list of orders.'],
  ['PUT', '/api/orders/:id/status', 'Admin / Manager', 'Modify order status (triggers updates email).'],
  ['GET', '/api/orders/:id/invoice', 'Admin / Staff', 'Generate and stream print-ready GST PDF bill.']
];
drawTable(orderApiHeaders, orderApiRows, [60, 150, 95, 150]);

// =============================================================
// PAGE 18: CHAPTER 5 — API DOCUMENTATION (Page 3)
// =============================================================
doc.addPage();
doc.y = 80;

drawSectionTitle('5.4', 'Settings, Enquiries & AI APIs');
doc.font('Helvetica').fontSize(9.5).fillColor(textColor).text('APIs for managing client inquiries, system settings adjustments, and AI triggers:', 70, doc.y);
doc.moveDown(0.8);

const miscApiHeaders = ['Method', 'Endpoint Route', 'Auth', 'Description'];
const miscApiRows = [
  ['POST', '/api/enquiries', 'None', 'Submit a contact form query from the site.'],
  ['GET', '/api/enquiries', 'Admin / Manager', 'Retrieve complete inquiries records list.'],
  ['PATCH', '/api/enquiries/:id/status', 'Admin / Manager', 'Update status of enquiries (new/resolved).'],
  ['PUT', '/api/settings', 'Super Admin / Admin', 'Update coordinates, maps link, or OpenRouter API keys.'],
  ['POST', '/api/ai/generate-product-details', 'Admin / Manager', 'Analyze input or image to write description.'],
  ['POST', '/api/settings/test-email', 'Super Admin / Admin', 'Trigger test email to verify SMTP connections.']
];
drawTable(miscApiHeaders, miscApiRows, [60, 190, 45, 160]);

// =============================================================
// PAGE 19: CHAPTER 6 — FEATURES EXPLAINED (Page 1)
// =============================================================
doc.addPage();
drawChapterTitle('6', 'FEATURES EXPLAINED');

drawSectionTitle('6.1', 'Admin Panel Console');
const ch6Admin = `The administrative panel provides a centralized, secure control center for business owners and managers. Accessible only via authenticated credentials, the console adapts dynamically based on user roles:\n\n- Super Admin & Admin: Full system access, including global settings adjustments, database backup and restoration files, staff role registration, and activity logs inspection.\n\n- Manager: Access to products management, order processing, offer coordination, and customer reviews validation. Blocked from system back-ups and credentials updates.\n\n- Sales Staff: Direct access to the POS GST Billing screen to search products, verify stock, and generate immediate customer invoices. Restructured menus hide backend settings.`;
doc.font('Helvetica').fontSize(10).fillColor(textColor).text(ch6Admin, 70, doc.y, { align: 'justify', lineGap: 4 });
doc.moveDown(1.5);

drawSectionTitle('6.2', 'Automated GST Invoicing Engine');
const ch6GST = `The POS billing terminal includes an automated tax computation system:\n\n- Tax Splits: When items are selected, the system calculates the correct GST rate (5%, 12%, 18%, or 28%), applying it to calculate the CGST (Central) and SGST (State) splits.\n\n- Watermarked Vectors: Uses PDFKit to stream vector PDF files containing transparent background brand watermarks and QR codes directly to the client browser.\n\n- Tax compliance: Displays store GSTIN, customer details, and invoice series format (SNT-XXXX-YYYY).`;
doc.font('Helvetica').fontSize(10).fillColor(textColor).text(ch6GST, 70, doc.y, { align: 'justify', lineGap: 4 });

// =============================================================
// PAGE 20: CHAPTER 6 — FEATURES EXPLAINED (Page 2)
// =============================================================
doc.addPage();
doc.y = 80;

drawSectionTitle('6.3', 'OpenRouter AI Integration Features');
const ch6AI = `The application incorporates AI integrations using OpenRouter API to optimize catalog management and automate transaction communications:\n\n1. AI Description Generator: When listing new inventory, the manager can submit the product name and category, optionally uploading an image. The OpenRouter API analyzes the product characteristics and returns structured JSON containing professional descriptions, SEO meta summaries, HSN codes, and suggested price brackets.\n\n2. Context-Aware Smart Emails: The system uses OpenRouter to generate unique, personalized email alerts instead of rigid, hardcoded templates. For instance, when order status is changed to "Delivered", the AI generates a warm email thanking the customer, mentioning the specific items purchased, and asking them to submit a review on Google Business Profile. If status is "Cancelled", it shifts to an empathetic, apologetic tone offering customer service contacts.`;
doc.font('Helvetica').fontSize(10).fillColor(textColor).text(ch6AI, 70, doc.y, { align: 'justify', lineGap: 4 });
doc.moveDown(1.5);

drawSectionTitle('6.4', 'Dual Database Adapter Layer');
const ch6Db = `To maintain operational stability under poor internet environments, the custom database layer dynamically handles failovers. The wrapper intercepts MongoDB driver connection drops and channels all reads, writes, and counts to local NeDB datastore files in the "data/" folder.\n\nThis failover occurs without throwing runtime exceptions, ensuring the POS terminal and online store remain responsive. Once the cloud database connection is restored, the data is easily synchronized.`;
doc.font('Helvetica').fontSize(10).fillColor(textColor).text(ch6Db, 70, doc.y, { align: 'justify', lineGap: 4 });

// =============================================================
// PAGE 21: CHAPTER 6 — FEATURES EXPLAINED (Page 3)
// =============================================================
doc.addPage();
doc.y = 80;

drawSectionTitle('6.5', 'Security Hardening Implementation');
const ch6Sec = `The application adheres to OWASP security guidelines to protect data from vulnerabilities:\n\n- Password Encryption: Cryptographic hashing of passwords is executed via bcrypt with a work factor of 10 salt rounds. Plain text credentials are never saved.\n\n- Cookie Tokens protection: JWT tokens are stored in cookies configured with HTTP-Only, SameSite=Strict, and Secure flags. This completely mitigates Cross-Site Scripting (XSS) token theft and blocks CSRF hijacking.\n\n- Boundary Validations: API controllers validate numeric inputs, preventing negative pricing values, negative inventory counts, or illegal quantities checkouts.\n\n- Payload Restrictions: Limits incoming JSON and URL-encoded payloads to a maximum of 1MB, preventing buffer exhaustion and server memory DoS crashes.`;
doc.font('Helvetica').fontSize(10).fillColor(textColor).text(ch6Sec, 70, doc.y, { align: 'justify', lineGap: 4 });
doc.moveDown(1.5);

drawSectionTitle('6.6', 'Progressive Web App (PWA) Features');
const ch6Pwa = `To offer an app-like experience on mobile interfaces, the frontend includes a Web App Manifest. Users can install the site as an application on Android or iOS home screens, which hides browser address headers, enables offline rendering of cached assets, and ensures faster loading times over cellular networks.`;
doc.font('Helvetica').fontSize(10).fillColor(textColor).text(ch6Pwa, 70, doc.y, { align: 'justify', lineGap: 4 });

// =============================================================
// PAGE 22: CHAPTER 6 — FEATURES EXPLAINED (Page 4)
// =============================================================
doc.addPage();
doc.y = 80;

drawSectionTitle('6.7', 'Dynamic Site Configuration Panel');
const ch6Config = `Rather than hardcoding business coordinates, contact details, announcement bars, or payment banking coordinates inside EJS views, the entire frontend queries settings from the database dynamically:\n\n- General Coordinates: Settings page enables updating store hours, address, phone numbers, and WhatsApp numbers in one centralized location.\n\n- UPI QR Graphic Coordinates: The POS GST Invoice pulls the payment bank name, account number, IFSC, and UPI ID dynamically, compiling a real-time QR graphic for immediate scan pay checkouts.\n\n- SEO metadata configurations: announcements bars and maps link targets update instantly site-wide on form save.`;
doc.font('Helvetica').fontSize(10).fillColor(textColor).text(ch6Config, 70, doc.y, { align: 'justify', lineGap: 4 });
doc.moveDown(1.5);

drawSectionTitle('6.8', 'Audit Logs & Backup consoles');
const ch6Logs = `For business accountability and operations safety:\n\n- Logs: Every change state (login, logout, product CRUD, settings updates, billing) is automatically written to a database log history with username and timestamp coordinates.\n\n- Backups: One-click backup triggers compile all database tables into a single structured JSON archive file for safe local downloads. System restoration is executed by uploading the backup JSON.`;
doc.font('Helvetica').fontSize(10).fillColor(textColor).text(ch6Logs, 70, doc.y, { align: 'justify', lineGap: 4 });

// =============================================================
// PAGE 23: CHAPTER 7 — USER MANUAL (Page 1)
// =============================================================
doc.addPage();
drawChapterTitle('7', 'USER MANUAL');

drawSectionTitle('7.1', 'Admin Management Guide');
const ch7Admin = `Follow these steps to operate the business management backend:\n\n1. Secure Authentication Login: Navigate to the secret URL path "/8340262401". Enter the registered username (the phone number "8340262401") and password. Click "Login" to access the main Dashboard.\n\n2. Inventory Catalog Entry: Go to the "Products" tab on the left sidebar. Click "Add Product". Input the product name, brand, category, retail price, wholesale price, and current stock level. Select the product photo to upload.\n\n3. AI Catalog Optimization: While adding a product, click "Generate with AI". The system queries OpenRouter, automatically pre-filling the description text area, SEO keywords, HSN codes, and tax rates based on the category.\n\n4. Real-time POS Billing: Open the "GST Billing" screen. Search products in the search bar. Click "Add to Bill" and set the quantities. Enter optional discount values. Click "Print GST Invoice" to generate the print-ready PDF.`;
doc.font('Helvetica').fontSize(10).fillColor(textColor).text(ch7Admin, 70, doc.y, { align: 'justify', lineGap: 4 });

// =============================================================
// PAGE 24: CHAPTER 7 — USER MANUAL (Page 2)
// =============================================================
doc.addPage();
doc.y = 80;

drawSectionTitle('7.2', 'Dealer Wholesale Portal Guide');
const ch7Dealer = `For registered dealers and wholesale clients:\n\n1. Account Registration: Go to the "Dealer Portal" dropdown from the website navbar. Click "Register". Fill in your business name, dealer contact name, phone, email, full address, and business GSTIN registry coordinates. Click "Submit".\n\n2. Admin Verification: The registration will be placed in the pending queue. The administrator will verify your business details from the Admin panel and click "Approve" to activate your dealer account.\n\n3. Wholesale Buying: Once approved, log in via "/dealer/login" using your registered email. Your dashboard will load the product catalog displaying wholesale rates instead of retail prices. Add items to your cart, set checkout quantities, and click "Submit Bulk Order". You can monitor your shipment status under "My Orders".`;
doc.font('Helvetica').fontSize(10).fillColor(textColor).text(ch7Dealer, 70, doc.y, { align: 'justify', lineGap: 4 });
doc.moveDown(1.5);

drawSectionTitle('7.3', 'Customer Interface Guide');
const ch7Cust = `For regular customers visiting the online presence:\n\n1. Navigating the Catalog: Open the home page. Customers can view active discount offers, filter products by categories (Hardware, Furniture, Aluminium), and read approved customer testimonials.\n\n2. Submit Enquiry: If a custom item is required, open the "Request Quote" page, fill in your contact details, and input your query. Click "Send Inquiry". The system sends an email confirmation to you and alerts the admin.\n\n3. Track Shipments: Navigate to the "Track Order" link in the navbar. Input your unique Order ID (e.g. SNT-1234-5678) and click "Track" to view real-time shipping status updates.`;
doc.font('Helvetica').fontSize(10).fillColor(textColor).text(ch7Cust, 70, doc.y, { align: 'justify', lineGap: 4 });

// =============================================================
// PAGE 25: CHAPTER 7 — USER MANUAL (Page 3)
// =============================================================
doc.addPage();
doc.y = 80;

drawSectionTitle('7.4', 'Multi-Language Translation Guide');
const ch7Lang = `To support regional users and dealers, the customer website includes translation features:\n\n- How to Translate: Open the website menu drawer on mobile or the utility header on desktop. Click the Google Translate select dropdown.\n\n- Supported Languages: Customers can translate the entire site content instantly into 9 regional Indian languages, including Hindi, Bengali, Tamil, Telugu, Marathi, Punjabi, Gujarati, and Urdu. All static text, navigation links, and product titles translate dynamically.`;
doc.font('Helvetica').fontSize(10).fillColor(textColor).text(ch7Lang, 70, doc.y, { align: 'justify', lineGap: 4 });
doc.moveDown(1.5);

drawSectionTitle('7.5', 'Database Backup & Recovery Guide');
const ch7Backup = `For safeguarding business operations data:\n\n- Backup: Log in as a Super Admin. Go to the "Backup & Restore" module under System Operations. Click "Download System Backup". The application compiles all collections (products, orders, users, reviews, logs) and downloads a single JSON archive file.\n\n- Restoration: If database corruption occurs or the server is relocated, click "Choose File", select your downloaded JSON backup, and click "Upload Backup". The system parses the file and restores all records instantly.`;
doc.font('Helvetica').fontSize(10).fillColor(textColor).text(ch7Backup, 70, doc.y, { align: 'justify', lineGap: 4 });

// =============================================================
// PAGE 26: CHAPTER 8 — SYSTEM TESTING (Page 1)
// =============================================================
doc.addPage();
drawChapterTitle('8', 'SYSTEM TESTING');

drawSectionTitle('8.1', 'Manual Functional Test Checklist');
doc.font('Helvetica').fontSize(9.5).fillColor(textColor).text('The functional components of the full-stack system were tested manually against target behaviors. Test results are documented below:', 70, doc.y);
doc.moveDown(0.8);

const testHeaders = ['Feature Tested', 'Test Inputs / Action', 'Expected Behavior', 'Status'];
const testRows = [
  ['Admin Access', 'secret URL /8340262401', 'Loads login credentials form cleanly.', 'PASS ✅'],
  ['Wrong Login', 'Invalid password credentials', 'Blocks entry, prompts red warning toast.', 'PASS ✅'],
  ['AI Description', 'Name: Aluminium Sliding Window', 'OpenRouter populates description text fields.', 'PASS ✅'],
  ['POS Billing', 'Select items, click Add to Bill', 'Computes tax rates & sums grand total.', 'PASS ✅'],
  ['GST Invoice', 'Click Print Invoice button', 'Streams formatted PDF GST invoice in browser.', 'PASS ✅'],
  ['Order Tracking', 'Enter SNT-2026-XXXX ID', 'Displays current shipment status step tracker.', 'PASS ✅'],
  ['Contact Inquiries', 'Submit quote request form', 'Sends confirmation email & admin alert.', 'PASS ✅'],
  ['Low Stock alert', 'Deduct stock count below limit', 'Admin gets urgent email alert.', 'PASS ✅']
];
drawTable(testHeaders, testRows, [85, 115, 205, 50]);

// =============================================================
// PAGE 27: CHAPTER 8 — SYSTEM TESTING (Page 2)
// =============================================================
doc.addPage();
doc.y = 80;

drawSectionTitle('8.2', 'Security Testing & Vulnerabilities Audit');
doc.font('Helvetica').fontSize(9.5).fillColor(textColor).text('Strict security audits were conducted to verify boundary values validation and payload injection blocks:', 70, doc.y);
doc.moveDown(0.8);

const secTestHeaders = ['Security Test Case', 'Method / Payload Used', 'Test Result & Resolution'];
const secTestRows = [
  ['SQL/NoSQL Injection', 'Passed {$ne: ""} inside input fields', 'Stripped queries via parsed query sanitizers.'],
  ['Cross-Site Scripting (XSS)', 'Injected <script>alert()</script> in form', 'HTML sanitized and tags escaped on render.'],
  ['Brute-Force Attack', 'Triggered 100+ API calls within minutes', 'Rate limiter blocks IP with HTTP 429.'],
  ['Unauthorized Access', 'Directly navigated to /admin/settings', 'Redirected to secret login /8340262401.'],
  ['Boundary Validation', 'Submitted negative pricing values', 'API returned HTTP 400 bad request error.']
];
drawTable(secTestHeaders, secTestRows, [110, 145, 200]);

// =============================================================
// PAGE 28: CHAPTER 9 — CHALLENGES & SOLUTIONS
// =============================================================
doc.addPage();
drawChapterTitle('9', 'CHALLENGES & SOLUTIONS');

const challenges = [
  {
    num: '1',
    title: 'Termux FUSE Symlink EACCES Error',
    desc: 'Installing npm packages on Android FUSE shared directories failed because FUSE mounts do not support symbolic links. Resolution: Mapped the "npm install --no-bin-links" option to disable bin-links creation during dependency installation.'
  },
  {
    num: '2',
    title: 'Dual Database NeDB-MongoDB Compatibility Mismatch',
    desc: 'MongoDB Atlas uses ObjectIds while local NeDB uses strings. Synced document IDs became complex objects inside local NeDB, leading to "Product not found" errors. Resolution: Patched the database adapter to serialize records and run a self-healing boot migration script to convert object IDs to string hexes.'
  },
  {
    num: '3',
    title: 'OpenRouter JSON Parsing Exceptions',
    desc: 'OpenRouter responses sometimes wrap JSON output inside markdown tick indicators (```json ... ```). Attempting to parse this threw exceptions. Resolution: Built string utility regex cleanups to strip markdown elements before running JSON.parse().'
  },
  {
    num: '4',
    title: 'Render.com Ephemeral Disk restarts',
    desc: 'Render free tier has temporary storage, wiping out local database files on restart. Resolution: Connected cloud MongoDB Atlas database as the primary data storage, leaving local NeDB strictly as an offline fallback.'
  }
];

challenges.forEach(item => {
  doc.font('Helvetica-Bold').fontSize(11).fillColor(primaryColor);
  doc.text(`Challenge ${item.num}: ${item.title}`);
  doc.font('Helvetica').fontSize(9.5).fillColor(textColor);
  doc.text(item.desc, { align: 'justify', lineGap: 3 });
  doc.moveDown(1.2);
});

// =============================================================
// PAGE 29: CHAPTER 10 — FUTURE SCOPE
// =============================================================
doc.addPage();
drawChapterTitle('10', 'FUTURE SCOPE');

const ch10Intro = `The current version of the Shri Narayan Traders Business Management System successfully digitizes administrative and sales operations. The following modules are planned for future versions:`;
doc.font('Helvetica').fontSize(10).fillColor(textColor).text(ch10Intro, 70, doc.y, { align: 'justify' });
doc.moveDown(1.5);

const futureItems = [
  { label: '1. Customer Mobile App', text: 'Develop a native Android and iOS mobile app using React Native to allow retail customers to purchase furniture items directly online.' },
  { label: '2. WhatsApp Business API', text: 'Integrate the official WhatsApp API to dispatch order confirmation PDFs and tracking updates directly to the client\'s phone number.' },
  { label: '3. QR/Barcode Stock Scanning', text: 'Integrate barcode and QR scanners with the POS terminal to scan hardware inventory items and speed up checkout times.' },
  { label: '4. Automated GST Filings', text: 'Build reports that compile tax transactions and generate GSTR-1 and GSTR-3B return templates.' },
  { label: '5. Multi-Branch Coordination', text: 'Add warehouse management features to coordinate stock transfer orders across multiple shop showrooms.' },
  { label: '6. Integrated Razorpay Checkout', text: 'Add online digital payment channels like UPI, cards, and wallets directly on order placement.' }
];

futureItems.forEach(item => {
  doc.font('Helvetica-Bold').fontSize(11).fillColor(primaryColor).text(item.label, { lineGap: 2 });
  doc.font('Helvetica').fontSize(9.5).fillColor(textColor).text(item.text, { align: 'justify', lineGap: 3 });
  doc.moveDown(1);
});

// =============================================================
// PAGE 31: CHAPTER 11 — CONCLUSION
// =============================================================
doc.addPage();
drawChapterTitle('11', 'CONCLUSION');

const ch11Text = `This project successfully demonstrates the practical application of modern full-stack web development technologies to solve real-world operational business problems. By replacing manual paperwork with automated GST billing, real-time inventory alerts, a wholesale dealer portal, and AI-driven description generations, the "Shri Narayan Traders Business Management System" has modernized a legacy shop into a digitally-enabled enterprise.\n\nDeveloping this portfolio system provided hands-on experience in:\n- Designing RESTful APIs using Node.js and Express.js.\n- Constructing secure authentication systems using JSON Web Tokens (JWT) and cookies.\n- Structuring a custom database adapter to handle local NeDB and cloud MongoDB database failovers.\n- Incorporating AI modules (OpenRouter API) and cloud deployment workflows (Render.com).\n\nThese practical full-stack skills are highly demanded by the modern IT industry and prepare a BCA graduate for advanced roles in software engineering and web application development.`;
doc.font('Helvetica').fontSize(10.5).fillColor(textColor).text(ch11Text, 70, doc.y, { align: 'justify', lineGap: 6 });

// =============================================================
// PAGE 32: CHAPTER 12 — BIBLIOGRAPHY
// =============================================================
doc.addPage();
drawChapterTitle('12', 'BIBLIOGRAPHY');

const ch12Intro = `The following documentation resources, guidelines, and manuals were referenced during the design and development of the system:`;
doc.font('Helvetica').fontSize(10).fillColor(textColor).text(ch12Intro, 70, doc.y);
doc.moveDown(1.5);

const references = [
  '1. Node.js Documentation — nodejs.org/api',
  '2. Express.js API Guide — expressjs.com/en/api.html',
  '3. MongoDB Atlas Manual — mongodb.com/docs/atlas',
  '4. Bootstrap 5 layout manual — getbootstrap.com/docs/5.3',
  '5. PDFKit API reference manual — pdfkit.org/docs/guide.pdf',
  '6. OpenRouter API Documentation — openrouter.ai/docs',
  '7. JSON Web Token (JWT) standards RFC 7519 — jwt.io',
  '8. MDN Web Docs (JavaScript reference) — developer.mozilla.org',
  '9. Cloudinary Image Management Guide — cloudinary.com/documentation',
  '10. NPM package repository index — npmjs.com'
];

references.forEach(ref => {
  doc.font('Helvetica').fontSize(10.5).fillColor(textColor).text(ref, { lineGap: 6 });
});

// Finalize PDF
doc.end();

stream.on('finish', () => {
  const stats = fs.statSync(pdfPath);
  console.log('✅ PDF Generation completed successfully!');
  console.log(`- File Location: ${pdfPath}`);
  console.log(`- Total Pages: ${pageCount}`);
  console.log(`- File Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

  // -------------------------------------------------------------
  // 2. Markdown File Generation (docs/SNT-Project-Documentation.md)
  // -------------------------------------------------------------
  console.log('📄 Starting generation of Markdown documentation...');
  const mdContent = `
# Shri Narayan Traders — Business Management System
## Full Stack Business Management System — Project Documentation
**Course:** Bachelor of Computer Applications (BCA)  
**Academic Year:** 2025-2026  
**Developer:** Satya  

---

## BONAFIDE CERTIFICATE

This is to certify that the project work titled "Shri Narayan Traders Business Management System" is a bonafide record of full-stack engineering work carried out by Satya in partial fulfillment of the requirements for the award of the degree of Bachelor of Computer Applications (BCA) for the academic session 2025-2026.

This project represents original work and demonstrates practical application of modern web architectures, API designs, databases, and secure authentication methods under the guidelines of the college faculty.

* **Satya** (BCA Candidate)
* **Project Guide** (Internal Supervisor)
* **HOD** (Computer Applications)

---

## DECLARATION

I, Satya, student of Bachelor of Computer Applications (BCA) for the academic session 2025-2026, hereby declare that the project portfolio report titled "Shri Narayan Traders Business Management System" is a result of my own original work.

All tools, open-source libraries, database servers, web frameworks, and cloud service endpoints referenced in this work have been properly cited and credited. This report has not been submitted previously to any other institution for the award of any degree or diploma.

---

## ACKNOWLEDGEMENT

I express my profound gratitude to the college faculty and internal supervisor for providing valuable mentorship, constant encouragement, and technical feedback throughout the development of the "Shri Narayan Traders Business Management System".

I am deeply indebted to the open-source community for creating powerful tools and robust runtimes such as Node.js, Express.js, and PDFKit, which formed the foundational stack of this application.

Special thanks to Google for providing access to the OpenRouter AI API, enabling dynamic context-aware description generations and smart email writing. I also acknowledge the MongoDB Atlas and Cloudinary support teams for providing high-reliability cloud database and image media storage services that facilitated successful project deployments.

---

## CHAPTER 1 — PROJECT OVERVIEW

### 1.1 Introduction
Shri Narayan Traders is a registered hardware supplier, furniture manufacturer, and aluminium fabrication works business located in Kauda madan, Dilawer Pur, Munger, Bihar (PIN 811201). Estabilished in 1998, the business has grown significantly, serving residential, commercial, and retail clients across the region.

To digitize the legacy systems, this full-stack business management application was developed. The system serves as an enterprise-grade digital solution to handle invoice creations, real-time catalog checking, inventory alerts, bulk dealer portals, and general enquiries logging. It enables the store to offer a streamlined, automated, and secure buying workflow.

### 1.2 Problem Statement
Before the installation of this digital portal, Shri Narayan Traders operated through traditional manual workflows, leading to major operational challenges:
1. **Manual Billing:** Generating handwritten cash memos was slow and vulnerable to calculations errors. Hand-computing SGST/CGST tax splits for high-volume invoices caused administrative overhead.
2. **Lack of Stock Visibility:** The business had no digital ledger to track inventory counts. This caused frequent stock-outs or over-ordering of slow-moving goods.
3. **Inquiries Management:** Customer catalog requests were handled verbally or via phone, resulting in lost inquiries and long delays.
4. **Lack of Dealer Interface:** Wholesale dealers had to make phone calls to negotiate pricing, leading to discrepancies and communication errors.

### 1.3 Proposed Solution
The proposed full-stack application digitizes all administrative and customer-facing interactions. Key features of the system include:
1. **Automated GST Invoicing (POS):** An online terminal enables sales staff to build print-ready PDF invoices. CGST, SGST, discounts, and total amounts are calculated dynamically.
2. **Real-Time Inventory Control:** The system decrements stock counts automatically during checkout. Low stock alert emails are triggered instantly to prevent inventory exhaustion.
3. **Multi-role Admin Dashboard:** The owner can monitor sales statistics, review logs, approve reviews, adjust coordinate settings, and register staff accounts from a single unified portal.
4. **Dealer Portal:** Registered wholesalers can log in to view customized dealer-rate catalogs and directly submit bulk orders online.

### 1.4 Project Scope
* **Customer Front:** Public website presenting dynamic product catalogs, filterable galleries, custom WhatsApp inquiries, customer reviews, and order tracking services.
* **Admin Console:** Protected dashboard for product CRUD operations, GST billing, dealer registrations approval, and site-wide coordinate updates.
* **Dealer Module:** Secure portal for wholesale dealer registrations, status checks, and bulk checkouts.
* **API & AI Integrations:** Dynamic product description generation using OpenRouter Vision API, and automated status emails using OpenRouter AI and Gmail SMTP.

---

## CHAPTER 2 — TECHNOLOGY STACK

### 2.1 Frontend Specifications
| Technology | Version | Purpose & Application |
|---|---|---|
| HTML5 | 5.0 | Page structure, semantic DOM architecture, SEO structures |
| CSS3 | 3.0 | Custom Navy/Gold theme styling, glassmorphism UI components |
| Bootstrap | 5.3.2 | Responsive grid framework, offcanvas menus, modals layout |
| JavaScript | ES6+ | Dynamic AJAX API fetch requests, UI interactive actions |
| EJS | 3.1.9 | Server-side templating engine to inject database variables |
| Chart.js | 4.4.1 | Renders real-time statistics graphs on the Admin panel |

### 2.2 Backend & Database Stack
| Technology | Version | Description & Integration |
|---|---|---|
| Node.js | v20.x+ | Fast, asynchronous, single-threaded V8 runtime environment |
| Express.js | v5.2.x | Web application framework handling REST routing & middlewares |
| JSON Web Token | v9.0.2 | Secure stateless tokens stored in HTTP-only cookies |
| bcryptjs | v2.4.3 | Password salting and hashing algorithm (10 rounds) |
| MongoDB Atlas | v7.3.0 | Production-grade cloud database hosting user data |
| NeDB (Promises) | v6.2.3 | Local datastore fallback file system for offline running |
| PDFKit | v0.19.1 | Vector-based PDF generator utilized for GST invoice prints |

### 2.3 API & Cloud Services
| Service / API | Provider | Purpose |
|---|---|---|
| OpenRouter 3.5 Flash | OpenRouter Console | Generates product descriptions and custom email content |
| Cloudinary | Cloudinary Inc. | Provides secure CDN hosting for catalog product images |
| Nodemailer | SMTP Transport | Delivers transactional emails using Gmail App Passwords |
| Google Translate | Google Cloud | Allows 9-language translation of customer interfaces |

---

## CHAPTER 3 — SYSTEM ARCHITECTURE

### 3.1 Architectural Diagram
\`\`\`
     [ CLIENT (Web Browser / PWA) ]
                   │
                   ▼ (HTTP Request: JSON/GET/POST)
       [ EXPRESS.JS ROUTER & MIDDLEWARES ]
        (Rate Limiter, Parser, JWT Auth)
                   │
                   ▼
            [ CONTROLLERS ]
       (Business Logic & AI Engines)
                   │
                   ▼
           [ DATABASE ADAPTER ]
        (Automatic Fallback Switch)
          ╱                  ╲
         ▼                    ▼
  [ MongoDB Cloud ]    [ Local NeDB files ]
  (Atlas Production)   (Offline Fail-safe)
\`\`\`

### 3.2 MVC Pattern Explanation
* **Model (M):** NeDB datastore collections and MongoDB collections mapped inside "config/db.js".
* **View (V):** Front-end user interfaces and admin panels written in HTML5/Bootstrap 5 templates inside the "views/" folder and dynamically compiled using Embedded JavaScript (EJS).
* **Controller (C):** Javascript controllers inside "controllers/" that execute operations such as authorization, billing, catalog modifications, settings, and AI calls.

### 3.3 Dual Database Adapter Architecture
A major feature of this system is the Custom Dual Database Adapter pattern. Designed for resilient operational continuity in areas with intermittent internet access, the database layer is split into production cloud and offline local storages.

When the system boots up, the database config module checks for the presence of the \`MONGODB_URI\` environment key and triggers a connection to MongoDB Atlas. If the connection fails, the adapter automatically handles the exception, prints a warning to logs, and routes all CRUD operations to local NeDB datastore files.

### 3.4 JWT Authentication Flow
1. **Submission:** The client sends a POST request containing login credentials to \`/api/auth/login\`.
2. **Verification:** The server compares the password using bcrypt. If valid, it generates a JWT containing user ID, role, and username.
3. **Cookie Storage:** The JWT is signed with a 256-bit secret key and sent back inside an HTTP-only cookie to prevent scripting hijacks.
4. **Authorization:** Middlewares inspect cookies for incoming requests to authenticate secure areas.

---

## CHAPTER 4 — DATABASE DESIGN

### 4.1 Collection Schemas

#### USERS Collection
\`\`\`json
{
  "_id"        : "ObjectId / String (Primary Key)",
  "username"   : "String (Unique phone number or username)",
  "password"   : "String (bcrypt salted hash)",
  "role"       : "String (super-admin | admin | manager | sales | dealer)",
  "name"       : "String (Full Name)",
  "email"      : "String (Contact Address)",
  "createdAt"  : "Date"
}
\`\`\`

#### PRODUCTS Collection
\`\`\`json
{
  "_id"              : "ObjectId / String (Primary Key)",
  "name"             : "String (Product Name)",
  "category"         : "String (Hardware | Furniture | Aluminium)",
  "description"      : "String (HTML/Text Description)",
  "regularPrice"     : "Number (Retail price in INR)",
  "wholesalePrice"   : "Number (Dealer price in INR)",
  "stock"            : "Number (Available stock count)",
  "unit"             : "String (Piece | Set)",
  "hsnCode"          : "String (4-digit HSN code)",
  "gstRate"          : "Number (0 | 5 | 12 | 18 | 28 percent)",
  "image"            : "String (Cloud image URL)",
  "specifications"   : "String (Comma-separated key-value specs)",
  "lowStockThreshold": "Number (Alert trigger)",
  "metaDescription"  : "String (SEO meta summary)"
}
\`\`\`

#### ORDERS Collection
\`\`\`json
{
  "_id"           : "ObjectId / String (Primary Key)",
  "orderId"       : "String (Auto-generated code SNT-XXXX-YYYY)",
  "dealerId"      : "String (Link to users._id, or 'walkin')",
  "dealerName"    : "String (Customer / business name)",
  "dealerPhone"   : "String (Customer contact number)",
  "customerEmail" : "String (Recipient email address)",
  "items"         : [
    {
      "productId" : "String (Link to products._id)",
      "name"      : "String (Item Name)",
      "qty"       : "Number (Quantity ordered)",
      "price"     : "Number (Applied rate)",
      "total"     : "Number (Qty * Price)",
      "gstRate"   : "Number (GST rate applied)"
    }
  ],
  "subtotal"      : "Number (Total before tax)",
  "gstAmount"     : "Number (CGST + SGST tax total)",
  "totalAmount"   : "Number (Subtotal + GST - Discount)",
  "status"        : "String (pending | confirmed | processing | shipped | delivered)",
  "paymentStatus" : "String (pending | paid)",
  "paymentMethod" : "String (Cash | UPI)",
  "createdAt"     : "Date"
}
\`\`\`

---

## CHAPTER 5 — API DOCUMENTATION

### 5.1 Endpoints List

| Method | Endpoint Route | Auth Required | Description |
|---|---|---|---|
| POST | \`/api/auth/login\` | No | Verifies credentials and generates session tokens |
| GET | \`/api/auth/logout\` | Yes | Clears session cookie tokens |
| GET | \`/api/products\` | No | Retrieve filterable catalog listing |
| POST | \`/api/products\` | Admin | Insert a new product into the database |
| POST | \`/api/orders\` | No | Submit a new order checkout |
| PUT | \`/api/orders/:id/status\` | Admin | Edit order status (triggers updates email) |
| GET | \`/api/orders/:id/invoice\` | Admin | Streams generated GST invoice PDF |
| POST | \`/api/ai/generate-product-details\` | Admin | Requests OpenRouter to write product details |
| POST | \`/api/settings/test-email\` | Admin | Sends a test email to verify SMTP configuration |

---

## CHAPTER 6 — FEATURES EXPLAINED

* **Multi-Role Admin Console:** Allows strict permissions checking for Super Admin, Manager, and Sales Staff, rendering customized option menus.
* **Automated GST Invoicing:** Dynamically computes SGST + CGST tax splits, applies discount options, and outputs print-ready vector PDF templates.
* **OpenRouter AI Integrations:** Provides multimodal image/text analysis for catalog entries and dynamically crafts context-aware, bilingual transaction emails.
* **Stateless Token Authentication:** Stores signed JWT tokens inside secure HTTP-Only cookies to protect dashboard APIs.

---

## CHAPTER 7 — USER MANUAL

### 7.1 Admin Panel Actions
1. **Catalog Entry:** Navigate to the "Products" manager, fill out product forms, upload images, and click "Generate with AI" to auto-compile details.
2. **GST Invoice Print:** Open the "GST Billing" POS screen, add selected items, key in optional discount parameters, and click "Print GST Invoice" to generate bills.
3. **Restoring Database:** Open the "Backup & Restore" screen, download backup JSON files for safety, or select restoration archives to restore system state.

### 7.2 Wholesale Dealer Guide
* Go to the dealer page, fill in registration details, and await administrator verification. Once active, log in to view the catalog displaying wholesale rates and place bulk orders.

---

## CHAPTER 8 — SYSTEM TESTING

### 8.1 Functional Test Cases
| Feature | Test Case Inputs | Expected Output | Status |
|---|---|---|---|
| Login Check | Valid credentials phone/pass | dashboard loads | PASS ✅ |
| AI Generation | Product Name: Door Closer | pre-fills descriptions | PASS ✅ |
| POS Billing | Checkout multiple items | grand total computed | PASS ✅ |
| Stock Alerts | stock level drops below limit | triggers low-stock email | PASS ✅ |

---

## CHAPTER 9 — CHALLENGES & SOLUTIONS

1. **FUSE Symlink Errors:** Resolved by running \`npm install --no-bin-links\` to prevent symlinks creation.
2. **ID Type Mismatches:** Patched the NeDB database configurations with stringification wrappers and startup self-healing cleanup migrations.
3. **AI parsing exceptions:** Added utility string cleaning functions to strip out Markdown markers before parsing JSON payloads.

---

## CHAPTER 10 — FUTURE SCOPE
* Build integrated mobile client apps using React Native.
* Sync official WhatsApp Business API endpoints for order dispatches.
* Add integrated payment checkout channels like Razorpay.

---

## CHAPTER 11 — CONCLUSION

The "Shri Narayan Traders Business Management System" successfully replaces outdated manual billing and inventory spreadsheets with a dynamic, secure, AI-powered full-stack application. Developing this project offered rich practical learning regarding MVC pattern execution, stateless JWT credentials handling, database adapter failovers, AI API prompts writing, and cloud deployments.

---

## CHAPTER 12 — BIBLIOGRAPHY

1. Node.js Documentation — nodejs.org/api
2. Express.js Guide — expressjs.com
3. MongoDB Manual — mongodb.com/docs
4. PDFKit Documentation — pdfkit.org
5. OpenRouter API Documentation — openrouter.ai
`;

  fs.writeFileSync(mdPath, mdContent, 'utf8');
  console.log('✅ Markdown Documentation completed successfully!');
  console.log(`- File Location: ${mdPath}`);
});
