import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeDb } from './helpers/fakeDb.js';

const fakeDb = createFakeDb();

mock.module('../config/db.js', {
  namedExports: { getDb: async () => fakeDb },
  cache: true,
});

const childService = await import('../services/childService.js');
const { ValidationError } = await import('../utils/validation.js');

const validChild = {
  name: 'Ava',
  dateOfBirth: '2021-05-01',
  gender: 'female',
  parentName: 'Jane Doe',
  parentEmail: 'jane@example.com',
};

test('createChild rejects missing required fields', async () => {
  await assert.rejects(
    childService.createChild('userA', { name: 'Ava' }),
    (err) => err instanceof ValidationError
  );
});

test('createChild rejects invalid parentEmail', async () => {
  await assert.rejects(
    childService.createChild('userA', { ...validChild, parentEmail: 'not-an-email' }),
    (err) => err instanceof ValidationError
  );
});

test('createChild succeeds and defaults active to true', async () => {
  const child = await childService.createChild('userA', validChild);
  assert.equal(child.active, true);
  assert.equal(child.userId, 'userA');
});

test('listChildren only returns the requesting user\'s children (data isolation)', async () => {
  await childService.createChild('userB', { ...validChild, name: 'Ben' });

  const userAChildren = await childService.listChildren('userA');
  const userBChildren = await childService.listChildren('userB');

  assert.ok(userAChildren.every((c) => c.userId === 'userA'));
  assert.ok(userBChildren.every((c) => c.userId === 'userB'));
  assert.ok(!userAChildren.some((c) => c.name === 'Ben'));
});

test('getChildById returns 404 for a child owned by a different user', async () => {
  const child = await childService.createChild('userA', { ...validChild, name: 'Cara' });

  await assert.rejects(
    childService.getChildById('userB', child._id.toString()),
    (err) => err.statusCode === 404
  );

  const found = await childService.getChildById('userA', child._id.toString());
  assert.equal(found.name, 'Cara');
});

test('updateChild updates only provided fields', async () => {
  const child = await childService.createChild('userA', { ...validChild, name: 'Dana' });
  const updated = await childService.updateChild('userA', child._id.toString(), {
    parentEmail: 'new@example.com',
  });

  assert.equal(updated.parentEmail, 'new@example.com');
  assert.equal(updated.name, 'Dana');
});
