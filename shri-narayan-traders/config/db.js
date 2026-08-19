const Datastore = require('nedb-promises');
const path = require('path');
const fs = require('fs');

let MONGODB_URI = (process.env.MONGODB_URI || '').trim().replace(/^"|"$/g, '');
if (MONGODB_URI) {
  if (process.env.IS_DOCKER === 'true' || fs.existsSync('/.dockerenv')) {
    MONGODB_URI = MONGODB_URI.replace('localhost', 'mongodb').replace('127.0.0.1', 'mongodb');
  } else {
    MONGODB_URI = MONGODB_URI.replace('mongodb://mongodb:', 'mongodb://localhost:');
  }
}
const FORCE_NEDB = process.env.FORCE_NEDB === 'true' || process.env.USE_NEDB === 'true';

// On Vercel serverless environment, the filesystem is read-only except for /tmp
const dataDir = process.env.VERCEL 
  ? path.join('/tmp', 'data')
  : path.join(__dirname, '../data');

if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch (err) {
    console.warn(`⚠️ Could not create data directory at ${dataDir}:`, err.message);
  }
}
const dbPath = (filename) => path.join(dataDir, filename);

const COLLECTION_NAMES = [
  'users', 'otps', 'products', 'orders', 'enquiries', 'offers', 'gallery', 'stats',
  'settings', 'reviews', 'logs', 'quotations', 'suppliers', 'purchases',
  'expenses', 'jobworks', 'deliveries', 'attendance', 'visitor_logs'
];

const localDb = {};
COLLECTION_NAMES.forEach((name) => {
  localDb[name] = Datastore.create({ filename: dbPath(name + '.db'), autoload: true });
});

const extractIdString = (id) => {
  if (!id) return '';
  if (typeof id === 'string') return id;
  if (typeof id === 'object') {
    if (id.buffer && Buffer.isBuffer(id.buffer)) return id.buffer.toString('hex');
    if (Buffer.isBuffer(id)) return id.toString('hex');
    if (id.id) {
      if (Buffer.isBuffer(id.id)) return id.id.toString('hex');
      if (id.id.type === 'Buffer' && Array.isArray(id.id.data)) return Buffer.from(id.id.data).toString('hex');
      return String(id.id);
    }
    if (typeof id.toString === 'function' && id.toString() !== '[object Object]') return id.toString();
  }
  return String(id);
};

// Heal any non-string _ids in NeDB (one-time on boot)
(async () => {
  try {
    for (const name of COLLECTION_NAMES) {
      const docs = await localDb[name].find({});
      for (const doc of docs) {
        if (doc._id && typeof doc._id !== 'string') {
          const newId = extractIdString(doc._id);
          await localDb[name].remove({ _id: doc._id }, { multi: false });
          const copy = { ...doc, _id: newId };
          await localDb[name].insert(copy);
        }
      }
    }
  } catch (e) {
    console.warn('[NeDB] id heal skipped:', e.message);
  }
})();

let db = localDb;
let usingMongo = false;
let lastError = null;

async function tryConnectMongo() {
  if (FORCE_NEDB || !MONGODB_URI) {
    console.log('📁 Using Local NeDB (FORCE_NEDB or no MONGODB_URI)');
    return false;
  }
  try {
    const { MongoClient, ObjectId } = require('mongodb');
    const client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    await client.connect();
    await client.db().command({ ping: 1 });
    console.log('✅ MongoDB Atlas connected');

    const mongoDb = client.db();

    class MongoCollectionWrapper {
      constructor(collectionName) {
        this.collection = mongoDb.collection(collectionName);
        this.localFallback = localDb[collectionName];
        this.name = collectionName;
      }

      _parseQuery(query = {}) {
        const parsed = { ...query };
        if (parsed._id && typeof parsed._id === 'string' && ObjectId.isValid(parsed._id)) {
          // Try both string and ObjectId match via $or when needed — keep simple: convert
          try { parsed._id = new ObjectId(parsed._id); } catch (e) {}
        }
        return parsed;
      }

      async findOne(query) {
        try {
          let result = await this.collection.findOne(this._parseQuery(query));
          if (!result && query && query._id) {
            // retry with raw string id
            result = await this.collection.findOne({ _id: String(query._id) });
          }
          if (result && result._id) result._id = result._id.toString();
          if (result) return result;
          return await this.localFallback.findOne(query);
        } catch (err) {
          console.warn(`⚠️ Mongo findOne ${this.name}:`, err.message);
          return await this.localFallback.findOne(query);
        }
      }

      find(query) {
        const self = this;
        const chain = {
          _sort: null,
          _limit: null,
          sort(s) { chain._sort = s; return chain; },
          limit(n) { chain._limit = n; return chain; },
          then(resolve, reject) {
            (async () => {
              try {
                let cursor = self.collection.find(self._parseQuery(query || {}));
                if (chain._sort) cursor = cursor.sort(chain._sort);
                if (chain._limit) cursor = cursor.limit(chain._limit);
                const results = await cursor.toArray();
                results.forEach((r) => { if (r._id) r._id = r._id.toString(); });
                resolve(results);
              } catch (err) {
                try {
                  let local = self.localFallback.find(query || {});
                  if (chain._sort) local = local.sort(chain._sort);
                  if (chain._limit) local = local.limit(chain._limit);
                  resolve(await local);
                } catch (e2) {
                  reject(e2);
                }
              }
            })();
          },
        };
        return chain;
      }

      async insert(doc) {
        try {
          if (Array.isArray(doc)) {
            if (!doc.length) return [];
            await this.collection.insertMany(doc);
            return doc;
          }
          const result = await this.collection.insertOne(doc);
          if (result.insertedId) doc._id = result.insertedId.toString();
          try {
            const localDoc = { ...doc, _id: String(doc._id) };
            await this.localFallback.insert(localDoc);
          } catch (e) { /* duplicate ok */ }
          return doc;
        } catch (err) {
          console.warn(`⚠️ Mongo insert ${this.name}, NeDB:`, err.message);
          return await this.localFallback.insert(doc);
        }
      }

      async update(query, update, options = {}) {
        try {
          const r = await this.collection.updateMany(this._parseQuery(query), update, options);
          try { await this.localFallback.update(query, update, options); } catch (e) {}
          return r;
        } catch (err) {
          return await this.localFallback.update(query, update, options);
        }
      }

      async remove(query, options = {}) {
        try {
          const r = await this.collection.deleteMany(this._parseQuery(query));
          try { await this.localFallback.remove(query, options); } catch (e) {}
          return r;
        } catch (err) {
          return await this.localFallback.remove(query, options);
        }
      }

      async count(query) {
        try {
          return await this.collection.countDocuments(this._parseQuery(query || {}));
        } catch (err) {
          return await this.localFallback.count(query || {});
        }
      }
    }

    const mongoWrapped = {};
    COLLECTION_NAMES.forEach((name) => {
      mongoWrapped[name] = new MongoCollectionWrapper(name);
    });
    db = mongoWrapped;
    usingMongo = true;
    lastError = null;
    return true;
  } catch (err) {
    console.error('❌ MongoDB connection failed — using free NeDB fallback:', err.message);
    console.log('📁 All data will be stored in local /data/*.db files (FREE, no Mongo needed)');
    db = localDb;
    usingMongo = false;
    lastError = err.message;
    return false;
  }
}

// Synchronous export starts as NeDB; after tryConnectMongo completes, may switch
// Callers get the same module.exports object reference — we mutate properties.
const exportProxy = {};
COLLECTION_NAMES.forEach((name) => {
  Object.defineProperty(exportProxy, name, {
    enumerable: true,
    get() { return db[name]; },
  });
});
Object.defineProperty(exportProxy, 'usingMongo', {
  enumerable: true,
  get() { return usingMongo; },
});
Object.defineProperty(exportProxy, 'lastError', {
  enumerable: true,
  get() { return lastError; },
});
exportProxy.extractIdString = extractIdString;
exportProxy.ready = tryConnectMongo();

module.exports = exportProxy;
