import { successResponse, errorResponse } from '../middleware/response.js';
import { getQueryParam, parseJsonBody, todayIsoDate } from '../utils/http.js';
import * as childService from '../services/childService.js';
import * as reportService from '../services/dailyReportService.js';
import { ReportSendError } from '../services/dailyReportService.js';

export async function handleCompleteAndSend(event, user, childId) {
  const child = await childService.getChildById(user._id, childId);
  const body = parseJsonBody(event);
  const date = body.date || getQueryParam(event, 'date') || todayIsoDate();

  try {
    const report = await reportService.completeAndSendReport(user._id, child, date);
    return successResponse(
      { report, parentEmail: child.parentEmail },
      'Report sent to parent'
    );
  } catch (err) {
    if (err instanceof ReportSendError) {
      return errorResponse(err.statusCode, err.message);
    }
    throw err;
  }
}

export async function handleRetrySend(event, user, childId) {
  const child = await childService.getChildById(user._id, childId);
  const body = parseJsonBody(event);
  const date = body.date || getQueryParam(event, 'date') || todayIsoDate();

  try {
    const report = await reportService.retrySendReport(user._id, child, date);
    return successResponse(
      { report, parentEmail: child.parentEmail },
      'Report re-sent to parent'
    );
  } catch (err) {
    if (err instanceof ReportSendError) {
      return errorResponse(err.statusCode, err.message);
    }
    throw err;
  }
}
