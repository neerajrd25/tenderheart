import { MongoClient } from 'mongodb';

// Cached across warm Lambda invocations so we reuse the connection pool.
let cachedClient = null;
let cachedDb = null;
let indexesEnsured = false;

async function ensureIndexes(db) {
  if (indexesEnsured) return;

  await Promise.all([
    db.collection('users').createIndex({ googleId: 1 }, { unique: true }),
    db.collection('users').createIndex({ email: 1 }, { unique: true }),
    db.collection('children').createIndex({ userId: 1 }),
    db.collection('children').createIndex({ userId: 1, active: 1 }),
    db.collection('dailyReports').createIndex({ userId: 1 }),
    db.collection('dailyReports').createIndex({ userId: 1, childId: 1 }),
    db.collection('dailyReports').createIndex(
      { userId: 1, childId: 1, date: 1 },
      { unique: true }
    ),
    db.collection('dailyReports').createIndex({ userId: 1, date: 1 }),
  ]);

  indexesEnsured = true;
}

export async function getDb() {
  if (cachedDb) return cachedDb;

  const uri = process.env.DB_URL;
  const dbName = process.env.DB_NAME;

  if (!uri || !dbName) {
    throw new Error('DB_URL and DB_NAME environment variables are required');
  }

  if (!cachedClient) {
    cachedClient = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
  }

  await cachedClient.connect();
  cachedDb = cachedClient.db(dbName);
  await ensureIndexes(cachedDb);

  return cachedDb;
}

export async function closeDb() {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
    indexesEnsured = false;
  }
}
