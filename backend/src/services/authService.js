import { OAuth2Client } from 'google-auth-library';
import { ObjectId } from 'mongodb';
import { getDb } from '../config/db.js';

let client;

function getClient() {
  if (!client) {
    client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }
  return client;
}

export async function verifyGoogleIdToken(idToken) {
  const audience = process.env.GOOGLE_CLIENT_ID;
  if (!audience) {
    throw new Error('GOOGLE_CLIENT_ID environment variable is required');
  }

  let ticket;
  try {
    ticket = await getClient().verifyIdToken({ idToken, audience });
  } catch (error) {
    const err = new Error('Invalid or expired Google ID token');
    err.statusCode = 401;
    throw err;
  }
  const payload = ticket.getPayload();

  if (!payload || !payload.sub || !payload.email) {
    const err = new Error('Invalid Google ID token payload');
    err.statusCode = 401;
    throw err;
  }

  if (payload.email_verified === false) {
    const err = new Error('Google account email is not verified');
    err.statusCode = 403;
    throw err;
  }

  return payload;
}

export async function upsertUserFromGooglePayload(payload) {
  const db = await getDb();
  const now = new Date();

  const update = {
    $set: {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name || payload.email,
      picture: payload.picture || null,
      updatedAt: now,
    },
    $setOnInsert: {
      createdAt: now,
    },
  };

  await db.collection('users').updateOne({ googleId: payload.sub }, update, {
    upsert: true,
  });

  return db.collection('users').findOne({ googleId: payload.sub });
}

export async function authenticateWithGoogleToken(idToken) {
  const payload = await verifyGoogleIdToken(idToken);
  return upsertUserFromGooglePayload(payload);
}

export async function findUserById(userId) {
  const db = await getDb();
  return db.collection('users').findOne({ _id: new ObjectId(userId) });
}
