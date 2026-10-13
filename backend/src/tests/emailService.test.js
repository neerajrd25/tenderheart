import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildEmailHtml } from '../services/emailService.js';

const child = { name: 'Ava', parentName: 'Jane Doe', parentEmail: 'jane@example.com' };

const fullReport = {
  date: '2025-06-02',
  attendance: 'Present',
  timeIn: '2025-06-02T03:30:00.000Z',
  timeOut: '2025-06-02T11:30:00.000Z',
  breakfast: 'All',
  breakfastNote: 'BREAKFAST-NOTE',
  lunch: 'Most',
  lunchNote: 'LUNCH-NOTE',
  eveningSnacks: 'Half',
  eveningSnacksNote: 'SNACK-NOTE',
  restStart: '2025-06-02T07:30:00.000Z',
  restEnd: '2025-06-02T08:45:00.000Z',
  restDuration: '1 hr 15 min',
  bowelHabits: { type: 'Normal', note: 'BOWEL-NOTE' },
  activities: 'ACTIVITIES-NOTE',
  notes: 'GENERAL-NOTE line one\nline two',
};

test('the email carries every note staff can add to a report', () => {
  const html = buildEmailHtml(child, fullReport);
  for (const note of ['BREAKFAST-NOTE', 'LUNCH-NOTE', 'SNACK-NOTE', 'BOWEL-NOTE', 'ACTIVITIES-NOTE', 'GENERAL-NOTE line one\nline two']) {
    assert.ok(html.includes(note), `missing ${note}`);
  }
});

test('the email is TenderHeart branded with no trace of the old name or the automated footer', () => {
  const html = buildEmailHtml(child, fullReport);
  assert.ok(html.includes('TenderHeart'));
  assert.ok(html.includes('by NexusChain Consulting'));
  assert.ok(!/Baby|Sent automatically|management system/i.test(html));
});

test('times are shown in India time and the date is written out', () => {
  const html = buildEmailHtml(child, fullReport);
  assert.ok(html.includes('09:00 AM'));
  assert.ok(html.includes('05:00 PM'));
  assert.ok(html.includes('Monday, 2 June 2025'));
});

test('text typed by staff cannot inject markup', () => {
  const html = buildEmailHtml(
    { ...child, name: '<b>Ava</b>' },
    { ...fullReport, notes: '<script>alert(1)</script>', lunchNote: '<img src=x>' }
  );
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('<b>Ava</b>'));
});

test('an absent child gets a short notice that still includes the staff note', () => {
  const html = buildEmailHtml(child, { date: '2025-06-02', attendance: 'Absent', notes: 'Get well soon' });
  assert.ok(html.includes('was marked absent today'));
  assert.ok(html.includes('Get well soon'));
  assert.ok(!html.includes('Breakfast'));
});

test('empty notes leave no empty blocks behind', () => {
  const html = buildEmailHtml(child, { ...fullReport, notes: '', activities: '   ', lunchNote: '' });
  assert.ok(!html.includes('Notes from staff'));
  assert.ok(!html.includes('Activities today'));
});
