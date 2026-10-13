import { authenticateWithGoogleToken } from '../services/authService.js';

export class AuthError extends Error {
  constructor(message, statusCode = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

function extractBearerToken(event) {
  const headers = event.headers || {};
  const authHeader = headers.authorization || headers.Authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice('Bearer '.length).trim();
}

// DEV_BYPASS_AUTH lets local developers exercise protected routes without a
// real Google ID token. It must never be enabled in production. Each distinct
// x-dev-user-email maps to its own user/googleId so local multi-user data
// isolation can still be tested.
async function devBypassUser(event) {
  const { getDb } = await import('../config/db.js');
  const headers = event.headers || {};
  const email = headers['x-dev-user-email'] || 'dev@example.com';
  const googleId = `dev-bypass:${email}`;
  const db = await getDb();
  const now = new Date();

  await db.collection('users').updateOne(
    { googleId },
    {
      $set: { email, name: 'Dev User', picture: null, updatedAt: now },
      $setOnInsert: { googleId, createdAt: now },
    },
    { upsert: true }
  );

  return db.collection('users').findOne({ googleId });
}

export async function authenticate(event) {
  if (process.env.DEV_BYPASS_AUTH === 'true') {
    return devBypassUser(event);
  }

  const token = extractBearerToken(event);

  if (!token) {
    throw new AuthError('Missing or invalid Authorization header');
  }

  try {
    const user = await authenticateWithGoogleToken(token);
    if (!user) {
      throw new AuthError('User not found after authentication');
    }
    return user;
  } catch (err) {
    if (err instanceof AuthError) throw err;
    if (err.statusCode === 403) throw err;
    throw new AuthError('Invalid or expired Google ID token');
  }
}
