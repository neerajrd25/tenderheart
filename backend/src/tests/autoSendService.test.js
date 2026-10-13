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
      if (emailState.shouldFail) throw new Error('Simulated SMTP failure');
      emailState.calls.push({ child, report });
    },
  },
  cache: true,
});

const childService = await import('../services/childService.js');
const reportService = await import('../services/dailyReportService.js');
const { autoSendDueReports, AUTO_SEND_SOURCE } = await import('../services/autoSendService.js');
const { handler } = await import('../handlers/index.js');
const { todayInTimezone } = await import('../utils/time.js');

const COMPLETE = {
  timeIn: '2025-06-01T03:30:00.000Z',
  timeOut: '2025-06-01T11:30:00.000Z',
  breakfast: 'All',
  lunch: 'Most',
  eveningSnacks: 'Half',
};

async function makeChild(userId, name) {
  return childService.createChild(userId, {
    name,
    dateOfBirth: '2021-05-01',
    gender: 'female',
    parentName: 'Jane Doe',
    parentEmail: `${name.toLowerCase()}@example.com`,
  });
}

function sentTo(name) {
  return emailState.calls.filter((call) => call.child.name === name).length;
}

test('auto-send emails complete reports across users and leaves incomplete ones alone', async () => {
  const date = '2025-06-01';
  const ava = await makeChild('userA', 'Ava');
  const ben = await makeChild('userB', 'Ben');
  const cara = await makeChild('userA', 'Cara');
  const dev = await makeChild('userA', 'Dev');

  await reportService.saveReport('userA', ava._id.toString(), date, COMPLETE);
  await reportService.saveReport('userB', ben._id.toString(), date, COMPLETE);
  await reportService.saveReport('userA', cara._id.toString(), date, { breakfast: 'All' });
  await reportService.saveReport('userA', dev._id.toString(), date, { attendance: 'Absent' });

  const summary = await autoSendDueReports(date);

  assert.deepEqual(summary, { date, sent: 3, incomplete: 1, failed: 0, skipped: 0 });
  assert.equal(sentTo('Ava'), 1);
  assert.equal(sentTo('Ben'), 1);
  assert.equal(sentTo('Dev'), 1);
  assert.equal(sentTo('Cara'), 0);

  const caraReport = await reportService.getDailyReport('userA', cara._id.toString(), date);
  assert.equal(caraReport.status, 'IN_PROGRESS');
});

test('auto-send never re-sends a report that already went out', async () => {
  const date = '2025-06-02';
  const eve = await makeChild('userA', 'Eve');
  await reportService.saveReport('userA', eve._id.toString(), date, COMPLETE);
  await reportService.completeAndSendReport('userA', eve, date);

  const first = await autoSendDueReports(date);
  const second = await autoSendDueReports(date);

  assert.equal(first.sent, 0);
  assert.equal(second.sent, 0);
  assert.equal(sentTo('Eve'), 1);
});

test('auto-send retries failed sends, ignores other days and inactive children', async () => {
  const date = '2025-06-03';
  const finn = await makeChild('userA', 'Finn');
  const gus = await makeChild('userA', 'Gus');
  const hana = await makeChild('userA', 'Hana');

  await reportService.saveReport('userA', finn._id.toString(), date, COMPLETE);
  emailState.shouldFail = true;
  await assert.rejects(reportService.completeAndSendReport('userA', finn, date));
  emailState.shouldFail = false;

  await reportService.saveReport('userA', gus._id.toString(), '2025-06-04', COMPLETE);
  await reportService.saveReport('userA', hana._id.toString(), date, COMPLETE);
  await childService.updateChild('userA', hana._id.toString(), { active: false });

  const summary = await autoSendDueReports(date);

  assert.deepEqual(summary, { date, sent: 1, incomplete: 0, failed: 0, skipped: 1 });
  assert.equal(sentTo('Finn'), 1);
  assert.equal(sentTo('Gus'), 0);
  assert.equal(sentTo('Hana'), 0);
});

test('an email failure during auto-send is counted and leaves the report retryable', async () => {
  const date = '2025-06-05';
  const ira = await makeChild('userA', 'Ira');
  await reportService.saveReport('userA', ira._id.toString(), date, COMPLETE);

  emailState.shouldFail = true;
  const summary = await autoSendDueReports(date);
  emailState.shouldFail = false;

  assert.equal(summary.failed, 1);
  const report = await reportService.getDailyReport('userA', ira._id.toString(), date);
  assert.equal(report.status, 'SEND_FAILED');
});

test('the Lambda handler runs the sweep for a scheduler event but not for an HTTP request', async () => {
  const date = '2025-06-06';
  const jude = await makeChild('userA', 'Jude');
  await reportService.saveReport('userA', jude._id.toString(), date, COMPLETE);

  const http = await handler(
    { rawPath: '/health', requestContext: { http: { method: 'GET' } }, body: `{"source":"${AUTO_SEND_SOURCE}"}` },
    {}
  );
  assert.equal(http.statusCode, 200);
  assert.equal(sentTo('Jude'), 0);

  const result = await handler({ source: AUTO_SEND_SOURCE, date }, {});
  assert.equal(result.sent, 1);
  assert.equal(sentTo('Jude'), 1);
});

test('todayInTimezone uses the daycare timezone, not UTC', () => {
  // 20:00 UTC on 1 June is already 2 June in India.
  assert.equal(todayInTimezone(new Date('2025-06-01T20:00:00.000Z')), '2025-06-02');
});
