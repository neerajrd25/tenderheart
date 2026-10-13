import { getDb } from '../config/db.js';
import { todayInTimezone } from '../utils/time.js';
import { ValidationError } from '../utils/validation.js';
import { getChildById } from './childService.js';
import { completeAndSendReport, retrySendReport } from './dailyReportService.js';

// Top-level `source` on the EventBridge Scheduler payload. API Gateway events
// never carry it, so an HTTP caller cannot trigger the sweep.
export const AUTO_SEND_SOURCE = 'babysdayout.auto-send';

const SENDABLE_STATUSES = ['IN_PROGRESS', 'COMPLETED', 'SEND_FAILED'];

// End-of-day safety net: sends every complete, unsent report for the day across
// all users. Incomplete reports are left untouched for staff to finish. Reuses
// the manual send paths, so the duplicate-send guards apply here too.
export async function autoSendDueReports(date = todayInTimezone()) {
  const db = await getDb();
  const reports = await db.collection('dailyReports').find({ date }).toArray();

  const summary = { date, sent: 0, incomplete: 0, failed: 0, skipped: 0 };

  for (const report of reports) {
    if (!SENDABLE_STATUSES.includes(report.status)) {
      summary.skipped += 1;
      continue;
    }

    try {
      const child = await getChildById(report.userId, report.childId);
      if (!child.active) {
        summary.skipped += 1;
        continue;
      }

      if (report.status === 'SEND_FAILED') {
        await retrySendReport(report.userId, child, date);
      } else {
        await completeAndSendReport(report.userId, child, date);
      }
      summary.sent += 1;
    } catch (err) {
      if (err instanceof ValidationError) {
        summary.incomplete += 1;
      } else if (err.statusCode === 409 || err.statusCode === 404) {
        // Sent by staff in the meantime, or the child no longer exists.
        summary.skipped += 1;
      } else {
        summary.failed += 1;
        console.error(`Auto-send failed for report ${report._id}:`, err.message);
      }
    }
  }

  return summary;
}
