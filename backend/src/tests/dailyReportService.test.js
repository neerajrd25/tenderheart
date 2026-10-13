import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeDb } from './helpers/fakeDb.js';

const fakeDb = createFakeDb();
const emailState = { shouldFail: false, calls: [] };

mock.module('../config/db.js', {
  namedExports: { getDb: async () => fakeDb },
  cache: true,
});

mock.module('../services/emailService.js', {
  namedExports: {
    sendDailyReportEmail: async (child, report) => {
      emailState.calls.push({ child, report });
      if (emailState.shouldFail) {
        throw new Error('Simulated SMTP failure');
      }
    },
  },
  cache: true,
});

const childService = await import('../services/childService.js');
const reportService = await import('../services/dailyReportService.js');
const { ValidationError } = await import('../utils/validation.js');

const userId = 'userA';
const date = '2025-06-01';

async function makeChild(name = 'Ava') {
  return childService.createChild(userId, {
    name,
    dateOfBirth: '2021-05-01',
    gender: 'female',
    parentName: 'Jane Doe',
    parentEmail: 'jane@example.com',
  });
}

test('saving a report repeatedly throughout the day never sends an email', async () => {
  const child = await makeChild('Ava');
  const childId = child._id.toString();

  await reportService.saveReport(userId, childId, date, { breakfast: 'Oatmeal' });
  await reportService.saveReport(userId, childId, date, { lunch: 'Rice and beans' });
  const latest = await reportService.saveReport(userId, childId, date, { notes: 'Happy day' });

  assert.equal(latest.status, 'IN_PROGRESS');
  assert.equal(emailState.calls.length, 0);
});

test('checkIn and checkOut record timestamps, rest fields compute duration via save', async () => {
  const child = await makeChild('Ben');
  const childId = child._id.toString();

  const afterCheckIn = await reportService.checkIn(userId, childId, date);
  assert.ok(afterCheckIn.timeIn);

  const restStart = '2025-06-01T13:00:00.000Z';
  const restEnd = '2025-06-01T14:25:00.000Z';
  const afterRest = await reportService.saveReport(userId, childId, date, { restStart, restEnd });
  assert.equal(afterRest.restDuration, '1 hr 25 min');

  const afterCheckOut = await reportService.checkOut(userId, childId, date);
  assert.ok(afterCheckOut.timeOut);
});

test('completeAndSendReport rejects incomplete reports', async () => {
  const child = await makeChild('Cara');
  const childId = child._id.toString();
  await reportService.saveReport(userId, childId, date, { breakfast: 'Toast' });

  await assert.rejects(
    reportService.completeAndSendReport(userId, child, date),
    (err) => err instanceof ValidationError
  );
});

test('completeAndSendReport sends exactly once and prevents duplicate sends', async () => {
  const child = await makeChild('Dana');
  const childId = child._id.toString();

  await reportService.saveReport(userId, childId, date, {
    timeIn: '2025-06-01T09:00:00.000Z',
    timeOut: '2025-06-01T17:00:00.000Z',
    breakfast: 'Oatmeal',
    lunch: 'Pasta',
    eveningSnacks: 'Fruit',
    bowelHabits: { type: 'Normal', note: '' },
  });

  const beforeCalls = emailState.calls.length;
  const sent = await reportService.completeAndSendReport(userId, child, date);

  assert.equal(sent.status, 'SENT');
  assert.ok(sent.sentAt);
  assert.equal(emailState.calls.length, beforeCalls + 1);

  await assert.rejects(
    reportService.completeAndSendReport(userId, child, date),
    (err) => err.statusCode === 409
  );
  assert.equal(emailState.calls.length, beforeCalls + 1, 'no second email should be sent');
});

test('email failure marks SEND_FAILED and Retry Send succeeds afterwards', async () => {
  const child = await makeChild('Eve');
  const childId = child._id.toString();

  await reportService.saveReport(userId, childId, date, {
    timeIn: '2025-06-01T09:00:00.000Z',
    timeOut: '2025-06-01T17:00:00.000Z',
    breakfast: 'Oatmeal',
    lunch: 'Pasta',
    eveningSnacks: 'Fruit',
    bowelHabits: { type: 'Normal', note: '' },
  });

  emailState.shouldFail = true;
  await assert.rejects(
    reportService.completeAndSendReport(userId, child, date),
    (err) => err.statusCode === 500 && err.report.status === 'SEND_FAILED'
  );

  const failed = await reportService.getDailyReport(userId, childId, date);
  assert.equal(failed.status, 'SEND_FAILED');

  emailState.shouldFail = false;
  const retried = await reportService.retrySendReport(userId, child, date);
  assert.equal(retried.status, 'SENT');
  assert.ok(retried.sentAt);
});

test('retrySendReport rejects when report is not in SEND_FAILED status', async () => {
  const child = await makeChild('Finn');
  const childId = child._id.toString();
  await reportService.saveReport(userId, childId, date, { breakfast: 'Toast' });

  await assert.rejects(
    reportService.retrySendReport(userId, child, date),
    (err) => err.statusCode === 409
  );
});

test('a SENT report is locked for further edits', async () => {
  const child = await makeChild('Gus');
  const childId = child._id.toString();

  await reportService.saveReport(userId, childId, date, {
    timeIn: '2025-06-01T09:00:00.000Z',
    timeOut: '2025-06-01T17:00:00.000Z',
    breakfast: 'Oatmeal',
    lunch: 'Pasta',
    eveningSnacks: 'Fruit',
    bowelHabits: { type: 'Normal', note: '' },
  });
  await reportService.completeAndSendReport(userId, child, date);

  await assert.rejects(
    reportService.saveReport(userId, childId, date, { notes: 'late edit' }),
    (err) => err.statusCode === 423
  );
});

test('activities are saved with the report', async () => {
  const child = await makeChild('Hana');
  const childId = child._id.toString();

  const saved = await reportService.saveReport(userId, childId, date, { activities: 'Painting' });
  assert.equal(saved.activities, 'Painting');
});

test('an absent child can be completed without times or meals', async () => {
  const child = await makeChild('Ira');
  const childId = child._id.toString();
  await reportService.saveReport(userId, childId, date, { attendance: 'Absent' });

  const beforeCalls = emailState.calls.length;
  const sent = await reportService.completeAndSendReport(userId, child, date);

  assert.equal(sent.status, 'SENT');
  assert.equal(emailState.calls.length, beforeCalls + 1);
});

test('saveReport rejects an unknown attendance value', async () => {
  const child = await makeChild('Jude');
  const childId = child._id.toString();

  await assert.rejects(
    reportService.saveReport(userId, childId, date, { attendance: 'Maybe' }),
    (err) => err instanceof ValidationError
  );
});
