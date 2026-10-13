import { getDb } from '../config/db.js';
import { calculateRestDuration, nowIso } from '../utils/time.js';
import {
  isValidDateString,
  isValidTimeString,
  ATTENDANCE,
  BOWEL_HABITS,
  ValidationError,
} from '../utils/validation.js';
import { sendDailyReportEmail } from './emailService.js';

export class ReportLockedError extends Error {
  constructor(message = 'Report has already been sent and is locked for editing') {
    super(message);
    this.name = 'ReportLockedError';
    this.statusCode = 423;
  }
}

export class ReportConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ReportConflictError';
    this.statusCode = 409;
  }
}

export class ReportSendError extends Error {
  constructor(message, report) {
    super(message);
    this.name = 'ReportSendError';
    this.statusCode = 500;
    this.report = report;
  }
}

const EDITABLE_FIELDS = [
  'attendance',
  'timeIn',
  'timeOut',
  'breakfast',
  'breakfastNote',
  'lunch',
  'lunchNote',
  'eveningSnacks',
  'eveningSnacksNote',
  'restStart',
  'restEnd',
  'bowelHabits',
  'notes',
  'activities',
];

function validateDate(date) {
  if (!isValidDateString(date)) {
    throw new ValidationError('date must be in YYYY-MM-DD format');
  }
}

function validateEditableInput(input) {
  if (input.attendance !== undefined && !ATTENDANCE.includes(input.attendance)) {
    throw new ValidationError(`attendance must be one of: ${ATTENDANCE.join(', ')}`);
  }

  for (const timeField of ['timeIn', 'timeOut', 'restStart', 'restEnd']) {
    if (input[timeField] !== undefined && input[timeField] !== null) {
      const value = input[timeField];
      const parsed = Date.parse(value);
      if (Number.isNaN(parsed)) {
        throw new ValidationError(`${timeField} must be a valid ISO date-time string`);
      }
    }
  }

  if (input.bowelHabits !== undefined && input.bowelHabits !== null) {
    const { type, note } = input.bowelHabits;
    if (type !== undefined && !BOWEL_HABITS.includes(type)) {
      throw new ValidationError(`bowelHabits.type must be one of: ${BOWEL_HABITS.join(', ')}`);
    }
    if (note !== undefined && typeof note !== 'string') {
      throw new ValidationError('bowelHabits.note must be a string');
    }
  }
}

function collection(db) {
  return db.collection('dailyReports');
}

export async function getDailyReport(userId, childId, date) {
  validateDate(date);
  const db = await getDb();
  return collection(db).findOne({ userId: userId.toString(), childId: childId.toString(), date });
}

async function ensureReportDoc(db, userId, childId, date) {
  const existing = await collection(db).findOne({
    userId: userId.toString(),
    childId: childId.toString(),
    date,
  });
  if (existing) return existing;

  const now = new Date();
  const doc = {
    userId: userId.toString(),
    childId: childId.toString(),
    date,
    attendance: 'Present',
    timeIn: null,
    timeOut: null,
    breakfast: '',
    breakfastNote: '',
    lunch: '',
    lunchNote: '',
    eveningSnacks: '',
    eveningSnacksNote: '',
    restStart: null,
    restEnd: null,
    restDuration: null,
    bowelHabits: { type: 'None', note: '' },
    notes: '',
    activities: '',
    status: 'IN_PROGRESS',
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    sentAt: null,
  };

  const result = await collection(db).insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

function assertEditable(report) {
  if (report && (report.status === 'SENT' || report.status === 'SENDING')) {
    throw new ReportLockedError();
  }
}

export async function createDailyReport(userId, childId, date, input = {}) {
  validateDate(date);
  const db = await getDb();

  const existing = await collection(db).findOne({
    userId: userId.toString(),
    childId: childId.toString(),
    date,
  });

  if (existing) {
    throw new ReportConflictError('A daily report for this child and date already exists');
  }

  return saveReport(userId, childId, date, input);
}

export async function saveReport(userId, childId, date, input = {}) {
  validateDate(date);
  validateEditableInput(input);

  const db = await getDb();
  const existing = await ensureReportDoc(db, userId, childId, date);
  assertEditable(existing);

  const update = { updatedAt: new Date() };
  for (const field of EDITABLE_FIELDS) {
    if (input[field] !== undefined) {
      update[field] =
        field === 'bowelHabits' ? { ...existing.bowelHabits, ...input.bowelHabits } : input[field];
    }
  }

  if (update.restStart !== undefined || update.restEnd !== undefined) {
    const restStart = update.restStart !== undefined ? update.restStart : existing.restStart;
    const restEnd = update.restEnd !== undefined ? update.restEnd : existing.restEnd;
    update.restDuration = calculateRestDuration(restStart, restEnd);
  }

  // Saving content never sends an email; only reset transient failure/terminal
  // states back to IN_PROGRESS so staff can continue editing and re-complete.
  if (['NOT_STARTED', 'SEND_FAILED', 'COMPLETED'].includes(existing.status)) {
    update.status = 'IN_PROGRESS';
  }

  const updated = await collection(db).findOneAndUpdate(
    { _id: existing._id },
    { $set: update },
    { returnDocument: 'after' }
  );

  return updated;
}

async function requireExistingReport(db, userId, childId, date) {
  const report = await collection(db).findOne({
    userId: userId.toString(),
    childId: childId.toString(),
    date,
  });

  if (!report) {
    const err = new Error('Daily report not found for this child and date');
    err.statusCode = 404;
    throw err;
  }

  return report;
}

export async function checkIn(userId, childId, date, timeInOverride) {
  validateDate(date);
  if (timeInOverride && !isValidTimeOverride(timeInOverride)) {
    throw new ValidationError('timeIn must be a valid ISO date-time string');
  }

  const db = await getDb();
  const existing = await ensureReportDoc(db, userId, childId, date);
  assertEditable(existing);

  const update = {
    timeIn: timeInOverride || nowIso(),
    attendance: 'Present',
    status: existing.status === 'SEND_FAILED' || existing.status === 'COMPLETED' ? 'IN_PROGRESS' : existing.status,
    updatedAt: new Date(),
  };

  return collection(db).findOneAndUpdate(
    { _id: existing._id },
    { $set: update },
    { returnDocument: 'after' }
  );
}

export async function checkOut(userId, childId, date, timeOutOverride) {
  validateDate(date);
  if (timeOutOverride && !isValidTimeOverride(timeOutOverride)) {
    throw new ValidationError('timeOut must be a valid ISO date-time string');
  }

  const db = await getDb();
  const existing = await requireExistingReport(db, userId, childId, date);
  assertEditable(existing);

  const update = {
    timeOut: timeOutOverride || nowIso(),
    updatedAt: new Date(),
  };

  return collection(db).findOneAndUpdate(
    { _id: existing._id },
    { $set: update },
    { returnDocument: 'after' }
  );
}

export async function startRest(userId, childId, date, restStartOverride) {
  validateDate(date);
  const db = await getDb();
  const existing = await ensureReportDoc(db, userId, childId, date);
  assertEditable(existing);

  const update = {
    restStart: restStartOverride || nowIso(),
    restEnd: null,
    restDuration: null,
    updatedAt: new Date(),
  };

  return collection(db).findOneAndUpdate(
    { _id: existing._id },
    { $set: update },
    { returnDocument: 'after' }
  );
}

export async function endRest(userId, childId, date, restEndOverride) {
  validateDate(date);
  const db = await getDb();
  const existing = await requireExistingReport(db, userId, childId, date);
  assertEditable(existing);

  if (!existing.restStart) {
    throw new ValidationError('Rest has not been started yet');
  }

  const restEnd = restEndOverride || nowIso();
  const restDuration = calculateRestDuration(existing.restStart, restEnd);

  return collection(db).findOneAndUpdate(
    { _id: existing._id },
    { $set: { restEnd, restDuration, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
}

function isValidTimeOverride(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function validateForCompletion(report) {
  // An absent child has no times or meals to record; the parent just gets an absence notice.
  if (report.attendance === 'Absent') return;

  const missing = [];
  if (!report.timeIn) missing.push('timeIn');
  if (!report.timeOut) missing.push('timeOut');
  if (!report.breakfast) missing.push('breakfast');
  if (!report.lunch) missing.push('lunch');
  if (!report.eveningSnacks) missing.push('eveningSnacks');
  if (!report.bowelHabits || !report.bowelHabits.type) missing.push('bowelHabits');

  if (missing.length > 0) {
    throw new ValidationError(
      `Cannot complete report. Missing or incomplete field(s): ${missing.join(', ')}`
    );
  }
}

export async function completeAndSendReport(userId, child, date) {
  validateDate(date);
  const db = await getDb();
  const existing = await requireExistingReport(db, userId, child._id.toString(), date);

  if (existing.status === 'SENT') {
    throw new ReportConflictError('Report has already been sent to the parent');
  }
  if (existing.status === 'SENDING') {
    throw new ReportConflictError('Report is currently being sent');
  }

  validateForCompletion(existing);

  const now = new Date();
  const locked = await collection(db).findOneAndUpdate(
    { _id: existing._id, status: { $ne: 'SENT' } },
    { $set: { status: 'SENDING', completedAt: now, updatedAt: now } },
    { returnDocument: 'after' }
  );

  if (!locked) {
    throw new ReportConflictError('Report has already been sent to the parent');
  }

  return attemptSend(db, locked, child);
}

export async function retrySendReport(userId, child, date) {
  validateDate(date);
  const db = await getDb();
  const existing = await requireExistingReport(db, userId, child._id.toString(), date);

  if (existing.status === 'SENT') {
    throw new ReportConflictError('Report has already been sent to the parent');
  }
  if (existing.status !== 'SEND_FAILED') {
    throw new ReportConflictError('Only a report in SEND_FAILED status can be retried');
  }

  const now = new Date();
  const locked = await collection(db).findOneAndUpdate(
    { _id: existing._id, status: 'SEND_FAILED' },
    { $set: { status: 'SENDING', updatedAt: now } },
    { returnDocument: 'after' }
  );

  if (!locked) {
    throw new ReportConflictError('Report is not in a retryable state');
  }

  return attemptSend(db, locked, child);
}

async function attemptSend(db, report, child) {
  try {
    await sendDailyReportEmail(child, report);
    const sentAt = new Date();
    return collection(db).findOneAndUpdate(
      { _id: report._id },
      { $set: { status: 'SENT', sentAt, updatedAt: sentAt } },
      { returnDocument: 'after' }
    );
  } catch (err) {
    const failedAt = new Date();
    const failed = await collection(db).findOneAndUpdate(
      { _id: report._id },
      { $set: { status: 'SEND_FAILED', updatedAt: failedAt } },
      { returnDocument: 'after' }
    );
    throw new ReportSendError(
      'The email to the parent did not go through. The report is saved; use Retry send.',
      failed
    );
  }
}
