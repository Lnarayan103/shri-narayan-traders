/**
 * UPI payment helpers.
 * Builds a standard UPI deep-link URI and fetches a real, scannable QR PNG
 * for it (via a public QR image API) — no paid payment gateway needed.
 *
 * Note: This is a "collect via UPI ID" flow (customer scans / taps and pays
 * directly to the business VPA), not a hosted checkout. It needs zero API
 * keys — only the business's own UPI ID (already stored in Settings).
 */
const https = require('https');

/**
 * Build a upi://pay deep link.
 * @param {Object} opts
 * @param {string} opts.vpa - Payee UPI ID (e.g. business@okaxis)
 * @param {string} opts.name - Payee name shown in the UPI app
 * @param {number|string} [opts.amount] - Amount in INR (optional, customer can also enter manually)
 * @param {string} [opts.note] - Transaction note / order reference
 */
function buildUpiUri({ vpa, name, amount, note }) {
  if (!vpa) return null;
  const params = new URLSearchParams();
  params.set('pa', vpa);
  params.set('pn', name || 'Shri Narayan Traders');
  params.set('cu', 'INR');
  if (amount && Number(amount) > 0) {
    params.set('am', Number(amount).toFixed(2));
  }
  if (note) {
    params.set('tn', String(note).slice(0, 50));
  }
  return `upi://pay?${params.toString()}`;
}

/**
 * Fetch a real QR code PNG (as Buffer) for the given data string.
 * Uses goqr.me's free, keyless QR image API. Falls back to null on any
 * network failure so callers can gracefully degrade (e.g. show VPA as text).
 */
function fetchQrPngBuffer(data, size = 300) {
  return new Promise((resolve) => {
    if (!data) return resolve(null);
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(data)}`;
    const req = https.get(url, { timeout: 8000 }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return resolve(null);
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

module.exports = { buildUpiUri, fetchQrPngBuffer };
