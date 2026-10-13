import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidEmail,
  isValidDateString,
  isValidTimeString,
  requireFields,
  ValidationError,
} from '../utils/validation.js';

test('isValidEmail accepts well-formed addresses', () => {
  assert.equal(isValidEmail('parent@example.com'), true);
  assert.equal(isValidEmail('not-an-email'), false);
  assert.equal(isValidEmail(''), false);
  assert.equal(isValidEmail(undefined), false);
});

test('isValidDateString enforces YYYY-MM-DD format', () => {
  assert.equal(isValidDateString('2025-06-01'), true);
  assert.equal(isValidDateString('2025/06/01'), false);
  assert.equal(isValidDateString('not-a-date'), false);
});

test('isValidTimeString allows empty/null and HH:MM(:SS)', () => {
  assert.equal(isValidTimeString(null), true);
  assert.equal(isValidTimeString(''), true);
  assert.equal(isValidTimeString('10:15'), true);
  assert.equal(isValidTimeString('10:15:00'), true);
  assert.equal(isValidTimeString('10am'), false);
});

test('requireFields throws ValidationError listing missing fields', () => {
  assert.throws(
    () => requireFields({ name: 'Alice' }, ['name', 'parentEmail']),
    (err) => err instanceof ValidationError && /parentEmail/.test(err.message)
  );
});

test('requireFields passes when all fields present', () => {
  assert.doesNotThrow(() => requireFields({ name: 'Alice', parentEmail: 'a@b.com' }, ['name', 'parentEmail']));
});
