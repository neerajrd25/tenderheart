export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_REGEX.test(email);
}

export function isValidDateString(value) {
  return typeof value === 'string' && DATE_REGEX.test(value) && !Number.isNaN(Date.parse(value));
}

export function requireFields(obj, fields) {
  const missing = fields.filter((field) => {
    const value = obj?.[field];
    return value === undefined || value === null || value === '';
  });

  if (missing.length > 0) {
    throw new ValidationError(`Missing required field(s): ${missing.join(', ')}`);
  }
}

export const GENDERS = ['male', 'female', 'other'];
export const ATTENDANCE = ['Present', 'Absent'];
export const BOWEL_HABITS = ['None', 'Normal', 'Loose', 'Hard', 'Other'];
export const REPORT_STATUSES = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'SENDING',
  'SENT',
  'SEND_FAILED',
];

export function isValidTimeString(value) {
  if (value === null || value === undefined || value === '') return true;
  return typeof value === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(value);
}
