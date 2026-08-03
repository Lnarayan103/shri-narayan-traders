/**
 * Daily automatic JSON backup of all collections.
 * Saves to ./backups/ and optionally emails admin.
 */
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const BACKUP_DIR = path.join(__dirname, '../backups');

async function dumpCollection(name, store) {
  try {
    const rows = await store.find({});
    return rows;
  } catch (e) {
    console.error(`Backup dump failed for ${name}:`, e.message);
    return [];
  }
}

async function createDailyBackup() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `snt-backup-${stamp}.json`;
  const filepath = path.join(BACKUP_DIR, filename);

  const payload = {
    createdAt: new Date().toISOString(),
    version: 1,
    collections: {
      users: await dumpCollection('users', db.users),
      products: await dumpCollection('products', db.products),
      orders: await dumpCollection('orders', db.orders),
      enquiries: await dumpCollection('enquiries', db.enquiries),
      offers: await dumpCollection('offers', db.offers),
      gallery: await dumpCollection('gallery', db.gallery),
      reviews: await dumpCollection('reviews', db.reviews),
      settings: await dumpCollection('settings', db.settings),
      logs: await dumpCollection('logs', db.logs),
      quotations: await dumpCollection('quotations', db.quotations || { find: async () => [] }),
      suppliers: await dumpCollection('suppliers', db.suppliers || { find: async () => [] }),
      purchases: await dumpCollection('purchases', db.purchases || { find: async () => [] }),
      expenses: await dumpCollection('expenses', db.expenses || { find: async () => [] }),
      jobworks: await dumpCollection('jobworks', db.jobworks || { find: async () => [] }),
      deliveries: await dumpCollection('deliveries', db.deliveries || { find: async () => [] }),
      attendance: await dumpCollection('attendance', db.attendance || { find: async () => [] })
    }
  };

  fs.writeFileSync(filepath, JSON.stringify(payload, null, 2), 'utf8');

  // Keep only last 14 daily backups
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('snt-backup-') && f.endsWith('.json'))
      .sort()
      .reverse();
    for (const f of files.slice(14)) {
      fs.unlinkSync(path.join(BACKUP_DIR, f));
    }
  } catch (e) { /* ignore */ }

  console.log(`[DailyBackup] Saved ${filepath}`);
  return { filepath, filename, size: fs.statSync(filepath).size };
}

function scheduleDailyBackup() {
  // Run once shortly after boot, then every 24h
  const DAY_MS = 24 * 60 * 60 * 1000;
  setTimeout(() => {
    createDailyBackup().catch(err => console.error('[DailyBackup]', err));
    setInterval(() => {
      createDailyBackup().catch(err => console.error('[DailyBackup]', err));
    }, DAY_MS);
  }, 60 * 1000); // 1 min after boot
  console.log('[DailyBackup] Scheduler armed (first run in ~1 min, then every 24h)');
}

module.exports = { createDailyBackup, scheduleDailyBackup, BACKUP_DIR };
