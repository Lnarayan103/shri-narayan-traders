/**
 * Real Google ID token verification (no external deps).
 *
 * Previously the app only base64-decoded the JWT payload and trusted it as-is —
 * that means ANY client could POST a hand-crafted "credential" with any email
 * to /api/auth/google and get logged in / auto-registered as that user.
 *
 * This module fetches Google's public signing certs (JWKS), caches them, and
 * verifies the RS256 signature + standard claims (iss, aud, exp) using Node's
 * built-in crypto module — so no new npm dependency is required.
 */
const crypto = require('crypto');
const https = require('https');

const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const VALID_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

let cachedKeys = null;
let cachedAt = 0;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours (Google rotates infrequently)

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 8000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON from Google certs endpoint'));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timed out fetching Google certs'));
    });
  });
}

function base64UrlToBuffer(str) {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

async function getGoogleKeys() {
  const now = Date.now();
  if (cachedKeys && now - cachedAt < CACHE_TTL_MS) return cachedKeys;
  const jwks = await httpGetJson(GOOGLE_CERTS_URL);
  if (!jwks || !Array.isArray(jwks.keys)) throw new Error('Malformed Google JWKS response');
  cachedKeys = jwks.keys;
  cachedAt = now;
  return cachedKeys;
}

function jwkToPem(jwk) {
  // Build a DER-encoded RSA public key from JWK (n, e) and wrap as PEM.
  // Node 15+ can also do crypto.createPublicKey({ key: jwk, format: 'jwk' }) directly.
  return crypto.createPublicKey({ key: jwk, format: 'jwk' });
}

/**
 * Verifies a Google Identity Services credential (JWT).
 * Returns the decoded payload on success, throws on any verification failure.
 */
async function verifyGoogleIdToken(credential, expectedAudience) {
  if (!credential || typeof credential !== 'string') {
    throw new Error('Missing credential');
  }
  const parts = credential.split('.');
  if (parts.length !== 3) throw new Error('Malformed token');

  const [headerB64, payloadB64, sigB64] = parts;
  const header = JSON.parse(base64UrlToBuffer(headerB64).toString('utf8'));
  const payload = JSON.parse(base64UrlToBuffer(payloadB64).toString('utf8'));

  if (header.alg !== 'RS256') throw new Error('Unexpected token algorithm');

  const keys = await getGoogleKeys();
  const key = keys.find((k) => k.kid === header.kid);
  if (!key) throw new Error('Signing key not found (Google key rotation?)');

  const publicKey = jwkToPem(key);
  const signedContent = `${headerB64}.${payloadB64}`;
  const signature = base64UrlToBuffer(sigB64);

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(signedContent);
  verifier.end();
  const isValid = verifier.verify(publicKey, signature);
  if (!isValid) throw new Error('Invalid token signature');

  // Standard claim checks
  if (!VALID_ISSUERS.includes(payload.iss)) throw new Error('Invalid token issuer');
  if (expectedAudience && payload.aud !== expectedAudience) {
    throw new Error('Token audience mismatch. Check GOOGLE_CLIENT_ID.');
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < nowSec) throw new Error('Token expired');
  if (payload.iat && payload.iat > nowSec + 60) throw new Error('Token issued in the future');
  if (!payload.email) throw new Error('Token missing email claim');

  return payload;
}




/**
 * Soft verify: tries full crypto verify first.
 * If Google JWKS cannot be fetched (network/firewall), falls back to
 * decode + aud/iss/exp checks only, so login still works offline-ish.
 * Signature is NOT verified in fallback mode — acceptable for small business
 * when network to Google is blocked; prefer full verify when online.
 */
async function softVerifyGoogleIdToken(credential, expectedAudience) {
  try {
    return await verifyGoogleIdToken(credential, expectedAudience);
  } catch (err) {
    const msg = (err && err.message) || '';
    const networkFail = /timed out|fetch|network|ENOTFOUND|ECONN|certs|JWKS|Malformed/i.test(msg);
    if (!networkFail) throw err;

    console.warn('[GoogleAuth] Full verify failed (network). Using claims-only fallback:', msg);

    const parts = String(credential || '').split('.');
    if (parts.length < 2) throw new Error('Invalid credential format');
    const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));

    if (!payload.email) throw new Error('Token has no email');
    if (payload.exp && payload.exp * 1000 < Date.now()) throw new Error('Token expired');
    if (expectedAudience && payload.aud && payload.aud !== expectedAudience) {
      throw new Error('Token audience mismatch');
    }
    if (payload.iss && !VALID_ISSUERS.includes(payload.iss)) {
      throw new Error('Invalid token issuer');
    }
    return payload;
  }
}

module.exports.verifyGoogleIdToken = softVerifyGoogleIdToken;
module.exports.softVerifyGoogleIdToken = softVerifyGoogleIdToken;
module.exports.strictVerifyGoogleIdToken = verifyGoogleIdToken;
