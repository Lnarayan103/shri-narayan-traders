# Shri Narayan Traders — Fixes & UPI Update (July 2026)

## 🐛 Bugs Fixed

1. **Google Sign-In was not verifying the token signature.**
   Earlier the server only base64-decoded the Google credential and trusted it —
   anyone could forge a request and log in as any email. Now `utils/googleAuth.js`
   fetches Google's public signing keys and cryptographically verifies every
   sign-in (RS256 signature + issuer + audience + expiry checks).

2. **"Sign in again" loop after a successful Google login.**
   If a login cookie pointed to a user record that no longer existed in the
   database (e.g. after a restart on a host with a non-persistent disk), the
   old code silently treated the request as logged-out but **left the stale
   cookie in the browser forever** — so every visit bounced back to `/login`.
   `middleware/auth.js` now clears that cookie automatically the moment it
   detects this, so the loop can't happen — the user just sees a clean login
   page instead of a silent bounce.

3. **Cookies were missing the `Secure` flag in production.** Fixed in
   `controllers/authController.js` — cookies are now `Secure` whenever
   `NODE_ENV=production` (as it should be on Render).

4. **Root cause of data loss / repeated logins: local file database.**
   The app was using a local NeDB file (`data/*.db`) instead of MongoDB. On
   Render's free/starter plans the disk is **not guaranteed to persist**
   across restarts/redeploys — so all users, orders, products etc. could get
   wiped, orphaning every existing login cookie. **This is now fixed by
   connecting to MongoDB Atlas** (`config/db.js` already supported this,
   it just wasn't configured). Make sure `MONGODB_URI` is set in your
   Render → Environment tab (same value as your local `.env`).

## 💳 UPI Payment — Now Fully Functional

- The `/payment` page was a static "Coming Soon" placeholder — **it's now a
  real working UPI payment page**: live QR code, "Pay via UPI App" deep link
  (opens GPay/PhonePe/Paytm directly on mobile), amount field, and a
  copy-able UPI ID — all built from the UPI ID you set in
  **Admin → Settings**.
- The GST Invoice PDF had a **fake QR code** (decorative pixels that were
  never actually scannable). It's now a real, scannable QR generated from
  your UPI ID, with a clean text fallback if no UPI ID is set yet.
- The **order tracking page** (`/track`) now shows a "Pay ₹X via UPI" button
  automatically whenever an order's payment status isn't "Paid".
- ⚠️ **You must set your UPI ID once** in Admin → Settings → UPI ID for any
  of this to activate. It's empty by default (no fake/placeholder ID was
  shipped, on purpose — don't want payments going to the wrong place).
- This is a "collect via UPI ID" flow (like a shop's static QR code) — no
  payment gateway account, MDR fees, or API keys needed. If you later want
  automatic payment confirmation (webhook-based), that needs a paid gateway
  (Razorpay/Cashfree/PayU) — happy to wire that in later if you want it.

## ✅ Features already implemented in this codebase

- Customer: Google Sign-In, profile, browse products/offers/gallery, place
  orders, track order status, UPI payment, reviews, contact form, WhatsApp
  chat button.
- Admin panel: products, offers, gallery, orders/billing, GST invoices (PDF),
  quotations, suppliers, purchases, expenses, job-work tracking, deliveries,
  staff & activity logs, database backups, site settings, AI-assisted
  product description generation (Gemini).
- Dealer login portal (separate from customer/admin).
- Security: JWT auth, bcrypt password hashing, rate limiting, activity
  logging.

## Setup checklist for Render

1. Environment variables to set on Render (Dashboard → your service →
   Environment): `MONGODB_URI`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`, `GEMINI_API_KEY`, `SESSION_SECRET`,
   `NODE_ENV=production`.
2. In Admin → Settings, fill in your real **UPI ID** to activate payments.
3. Redeploy. Old stale login cookies will now clear themselves automatically
   instead of looping.

## Not tested end-to-end here

This sandbox has no internet access, so the MongoDB Atlas connection and the
live Google certificate verification could only be checked by code review +
local logic tests (not a live network round-trip). Please test the Google
login and a payment QR once deployed on Render, and let me know if anything
looks off.
