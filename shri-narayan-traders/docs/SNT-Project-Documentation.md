
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

Special thanks to Google for providing access to the Gemini AI API, enabling dynamic context-aware description generations and smart email writing. I also acknowledge the MongoDB Atlas and Cloudinary support teams for providing high-reliability cloud database and image media storage services that facilitated successful project deployments.

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
* **API & AI Integrations:** Dynamic product description generation using Gemini Vision API, and automated status emails using Gemini AI and Gmail SMTP.

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
| Gemini 3.5 Flash | Google AI Studio | Generates product descriptions and custom email content |
| Cloudinary | Cloudinary Inc. | Provides secure CDN hosting for catalog product images |
| Nodemailer | SMTP Transport | Delivers transactional emails using Gmail App Passwords |
| Google Translate | Google Cloud | Allows 9-language translation of customer interfaces |

---

## CHAPTER 3 — SYSTEM ARCHITECTURE

### 3.1 Architectural Diagram
```
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
```

### 3.2 MVC Pattern Explanation
* **Model (M):** NeDB datastore collections and MongoDB collections mapped inside "config/db.js".
* **View (V):** Front-end user interfaces and admin panels written in HTML5/Bootstrap 5 templates inside the "views/" folder and dynamically compiled using Embedded JavaScript (EJS).
* **Controller (C):** Javascript controllers inside "controllers/" that execute operations such as authorization, billing, catalog modifications, settings, and AI calls.

### 3.3 Dual Database Adapter Architecture
A major feature of this system is the Custom Dual Database Adapter pattern. Designed for resilient operational continuity in areas with intermittent internet access, the database layer is split into production cloud and offline local storages.

When the system boots up, the database config module checks for the presence of the `MONGODB_URI` environment key and triggers a connection to MongoDB Atlas. If the connection fails, the adapter automatically handles the exception, prints a warning to logs, and routes all CRUD operations to local NeDB datastore files.

### 3.4 JWT Authentication Flow
1. **Submission:** The client sends a POST request containing login credentials to `/api/auth/login`.
2. **Verification:** The server compares the password using bcrypt. If valid, it generates a JWT containing user ID, role, and username.
3. **Cookie Storage:** The JWT is signed with a 256-bit secret key and sent back inside an HTTP-only cookie to prevent scripting hijacks.
4. **Authorization:** Middlewares inspect cookies for incoming requests to authenticate secure areas.

---

## CHAPTER 4 — DATABASE DESIGN

### 4.1 Collection Schemas

#### USERS Collection
```json
{
  "_id"        : "ObjectId / String (Primary Key)",
  "username"   : "String (Unique phone number or username)",
  "password"   : "String (bcrypt salted hash)",
  "role"       : "String (super-admin | admin | manager | sales | dealer)",
  "name"       : "String (Full Name)",
  "email"      : "String (Contact Address)",
  "createdAt"  : "Date"
}
```

#### PRODUCTS Collection
```json
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
```

#### ORDERS Collection
```json
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
```

---

## CHAPTER 5 — API DOCUMENTATION

### 5.1 Endpoints List

| Method | Endpoint Route | Auth Required | Description |
|---|---|---|---|
| POST | `/api/auth/login` | No | Verifies credentials and generates session tokens |
| GET | `/api/auth/logout` | Yes | Clears session cookie tokens |
| GET | `/api/products` | No | Retrieve filterable catalog listing |
| POST | `/api/products` | Admin | Insert a new product into the database |
| POST | `/api/orders` | No | Submit a new order checkout |
| PUT | `/api/orders/:id/status` | Admin | Edit order status (triggers updates email) |
| GET | `/api/orders/:id/invoice` | Admin | Streams generated GST invoice PDF |
| POST | `/api/ai/generate-product-details` | Admin | Requests Gemini to write product details |
| POST | `/api/settings/test-email` | Admin | Sends a test email to verify SMTP configuration |

---

## CHAPTER 6 — FEATURES EXPLAINED

* **Multi-Role Admin Console:** Allows strict permissions checking for Super Admin, Manager, and Sales Staff, rendering customized option menus.
* **Automated GST Invoicing:** Dynamically computes SGST + CGST tax splits, applies discount options, and outputs print-ready vector PDF templates.
* **Gemini AI Integrations:** Provides multimodal image/text analysis for catalog entries and dynamically crafts context-aware, bilingual transaction emails.
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

1. **FUSE Symlink Errors:** Resolved by running `npm install --no-bin-links` to prevent symlinks creation.
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
5. Gemini API Documentation — ai.google.dev
