import nodemailer from 'nodemailer';
import { appTimezone } from '../utils/time.js';

let cachedTransporter = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error('SMTP_HOST, SMTP_USER and SMTP_PASSWORD environment variables are required');
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return cachedTransporter;
}

function formatTime(isoString) {
  if (!isoString) return 'Not recorded';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: appTimezone(),
  });
}

const INK = '#3B2434';
const MUTED = '#7A6672';
const CORAL = '#C84B3A';
const CREAM = '#FFF8F2';
const HAIRLINE = '#F3E7DF';
const SERIF = "Georgia,'Times New Roman',serif";

// Everything staff type ends up in the email, so it is all escaped.
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatLongDate(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

function row(label, value) {
  return `
    <tr>
      <td style="padding:9px 0;color:${MUTED};font-size:14px;border-bottom:1px solid ${HAIRLINE};">${label}</td>
      <td style="padding:9px 0;color:${INK};font-size:14px;font-weight:600;text-align:right;border-bottom:1px solid ${HAIRLINE};">${escapeHtml(value)}</td>
    </tr>`;
}

// A note typed by staff, shown in full under the row it belongs to.
function noteRow(note) {
  if (!note || !String(note).trim()) return '';
  return `
    <tr>
      <td colspan="2" style="padding:8px 12px;background:${CREAM};border-left:3px solid ${CORAL};color:${INK};font-size:14px;line-height:1.5;white-space:pre-wrap;">${escapeHtml(note)}</td>
    </tr>`;
}

function section(title, rows) {
  return `
      <div style="padding:18px 24px 0;">
        <p style="margin:0 0 4px;color:${CORAL};font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">${title}</p>
        <table role="presentation" style="width:100%;border-collapse:collapse;">${rows}
        </table>
      </div>`;
}

function textBlock(title, text) {
  return `
      <div style="padding:18px 24px 0;">
        <p style="margin:0 0 6px;color:${CORAL};font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">${title}</p>
        <p style="margin:0;padding:12px 14px;background:${CREAM};border-radius:10px;color:${INK};font-size:14px;line-height:1.55;white-space:pre-wrap;">${escapeHtml(text)}</p>
      </div>`;
}

export function buildEmailHtml(child, report) {
  const absent = report.attendance === 'Absent';
  const bowel = report.bowelHabits || {};
  const hasText = (value) => Boolean(value && String(value).trim());

  const dayDetails = absent
    ? ''
    : [
        section(
          'Attendance',
          row('Time in', formatTime(report.timeIn)) + row('Time out', formatTime(report.timeOut))
        ),
        section(
          'Meals',
          row('Breakfast', report.breakfast || 'Not recorded') +
            noteRow(report.breakfastNote) +
            row('Lunch', report.lunch || 'Not recorded') +
            noteRow(report.lunchNote) +
            row('Evening snacks', report.eveningSnacks || 'Not recorded') +
            noteRow(report.eveningSnacksNote)
        ),
        section(
          'Rest',
          row('Start', formatTime(report.restStart)) +
            row('End', formatTime(report.restEnd)) +
            row('Duration', report.restDuration || 'Not recorded')
        ),
        section('Bowel habits', row('Type', bowel.type || 'Not recorded') + noteRow(bowel.note)),
        hasText(report.activities) ? textBlock('Activities today', report.activities) : '',
      ].join('');

  const intro = absent
    ? `${escapeHtml(child.name)} was marked absent today.`
    : `Here is how ${escapeHtml(child.name)}&rsquo;s day went.`;

  return `
  <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:${CREAM};padding:24px 12px;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid ${HAIRLINE};">
      <div style="background:${CORAL};background:linear-gradient(135deg,#E2705C,${CORAL});padding:26px 24px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;font-family:${SERIF};">&#9825; TenderHeart</h1>
        <p style="margin:6px 0 0;color:#FDEBE4;font-size:14px;">Daily report</p>
      </div>
      <div style="padding:22px 24px 0;">
        <p style="margin:0;color:${INK};font-size:20px;font-weight:700;font-family:${SERIF};">${escapeHtml(child.name)}</p>
        <p style="margin:2px 0 12px;color:${MUTED};font-size:14px;">${escapeHtml(formatLongDate(report.date))}</p>
        <p style="margin:0;color:${INK};font-size:15px;line-height:1.5;">${
          hasText(child.parentName) ? `Dear ${escapeHtml(child.parentName)},<br>` : ''
        }${intro}</p>
      </div>${dayDetails}${
        hasText(report.notes) ? textBlock('Notes from staff', report.notes) : ''
      }
      <div style="margin-top:24px;background:#FDEBE4;padding:16px 24px;text-align:center;">
        <p style="margin:0;color:${INK};font-size:14px;font-weight:700;font-family:${SERIF};">TenderHeart</p>
        <p style="margin:2px 0 0;color:${MUTED};font-size:12px;">by NexusChain Consulting</p>
      </div>
    </div>
  </div>`;
}

export async function sendDailyReportEmail(child, report) {
  if (!child.parentEmail) {
    throw new Error('Child has no parentEmail configured');
  }

  const transporter = getTransporter();
  const address = process.env.SMTP_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from: { name: 'TenderHeart', address },
    to: child.parentEmail,
    cc: child.parent2Email || undefined,
    subject: `TenderHeart - ${child.name} - ${report.date}`,
    html: buildEmailHtml(child, report),
  });
}
