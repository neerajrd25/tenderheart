import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeDb } from './helpers/fakeDb.js';

const fakeDb = createFakeDb();
let currentPayload = null;

mock.module('../config/db.js', {
  namedExports: { getDb: async () => fakeDb },
  cache: true,
});

mock.module('google-auth-library', {
  namedExports: {
    OAuth2Client: class {
      async verifyIdToken() {
        return { getPayload: () => currentPayload };
      }
    },
  },
  cache: true,
});

process.env.GOOGLE_CLIENT_ID = 'test-client-id';

const authService = await import('../services/authService.js');

test('verifyGoogleIdToken rejects payload missing sub/email with 401', async () => {
  currentPayload = { email_verified: true };
  await assert.rejects(authService.verifyGoogleIdToken('token'), (err) => err.statusCode === 401);
});

test('verifyGoogleIdToken rejects unverified email with 403', async () => {
  currentPayload = { sub: 'g-1', email: 'a@b.com', email_verified: false };
  await assert.rejects(authService.verifyGoogleIdToken('token'), (err) => err.statusCode === 403);
});

test('verifyGoogleIdToken accepts a valid verified payload', async () => {
  currentPayload = { sub: 'g-1', email: 'a@b.com', email_verified: true, name: 'Alice' };
  const payload = await authService.verifyGoogleIdToken('token');
  assert.equal(payload.email, 'a@b.com');
});

test('upsertUserFromGooglePayload inserts then updates the same user', async () => {
  const payload = { sub: 'g-2', email: 'parent@example.com', name: 'First Name', picture: null };
  const created = await authService.upsertUserFromGooglePayload(payload);
  assert.equal(created.googleId, 'g-2');
  assert.ok(created.createdAt);

  const updatedPayload = { ...payload, name: 'Updated Name' };
  const updated = await authService.upsertUserFromGooglePayload(updatedPayload);

  assert.equal(updated._id.toString(), created._id.toString());
  assert.equal(updated.name, 'Updated Name');
  assert.deepEqual(updated.createdAt, created.createdAt);
});
