import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDurationMinutes, calculateRestDuration } from '../utils/time.js';

test('formatDurationMinutes formats hours and minutes like "1 hr 25 min"', () => {
  assert.equal(formatDurationMinutes(85), '1 hr 25 min');
  assert.equal(formatDurationMinutes(45), '45 min');
  assert.equal(formatDurationMinutes(120), '2 hr');
  assert.equal(formatDurationMinutes(0), '0 min');
});

test('calculateRestDuration returns formatted duration for valid range', () => {
  const start = '2025-06-01T10:00:00.000Z';
  const end = '2025-06-01T11:25:00.000Z';
  assert.equal(calculateRestDuration(start, end), '1 hr 25 min');
});

test('calculateRestDuration returns null when inputs are missing', () => {
  assert.equal(calculateRestDuration(null, '2025-06-01T11:00:00.000Z'), null);
  assert.equal(calculateRestDuration('2025-06-01T11:00:00.000Z', null), null);
});

test('calculateRestDuration returns null when end is before start', () => {
  const start = '2025-06-01T11:00:00.000Z';
  const end = '2025-06-01T10:00:00.000Z';
  assert.equal(calculateRestDuration(start, end), null);
});
