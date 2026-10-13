import { successResponse } from '../middleware/response.js';
import { parseJsonBody, getQueryParam, todayIsoDate } from '../utils/http.js';
import * as childService from '../services/childService.js';
import * as reportService from '../services/dailyReportService.js';

function emptyReportShape(childId, date) {
  return {
    childId,
    date,
    attendance: 'Present',
    timeIn: null,
    timeOut: null,
    breakfast: '',
    lunch: '',
    eveningSnacks: '',
    restStart: null,
    restEnd: null,
    restDuration: null,
    bowelHabits: { type: 'None', note: '' },
    notes: '',
    status: 'NOT_STARTED',
    completedAt: null,
    sentAt: null,
  };
}

export async function handleGetDailyReport(event, user, childId) {
  await childService.getChildById(user._id, childId);
  const date = getQueryParam(event, 'date') || todayIsoDate();

  const report = await reportService.getDailyReport(user._id, childId, date);
  return successResponse(report || emptyReportShape(childId, date), 'Daily report fetched');
}

export async function handleCreateDailyReport(event, user, childId) {
  await childService.getChildById(user._id, childId);
  const body = parseJsonBody(event);
  const date = body.date || todayIsoDate();

  const report = await reportService.createDailyReport(user._id, childId, date, body);
  return successResponse(report, 'Daily report created', 201);
}

export async function handleUpdateDailyReport(event, user, childId) {
  await childService.getChildById(user._id, childId);
  const body = parseJsonBody(event);
  const date = body.date || todayIsoDate();

  const report = await reportService.saveReport(user._id, childId, date, body);
  return successResponse(report, 'Daily report saved');
}

export async function handleCheckIn(event, user, childId) {
  await childService.getChildById(user._id, childId);
  const body = parseJsonBody(event);
  const date = body.date || todayIsoDate();

  const report = await reportService.checkIn(user._id, childId, date, body.timeIn);
  return successResponse(report, 'Checked in');
}

export async function handleCheckOut(event, user, childId) {
  await childService.getChildById(user._id, childId);
  const body = parseJsonBody(event);
  const date = body.date || todayIsoDate();

  const report = await reportService.checkOut(user._id, childId, date, body.timeOut);
  return successResponse(report, 'Checked out');
}

export async function handleRestStart(event, user, childId) {
  await childService.getChildById(user._id, childId);
  const body = parseJsonBody(event);
  const date = body.date || todayIsoDate();

  const report = await reportService.startRest(user._id, childId, date, body.restStart);
  return successResponse(report, 'Rest started');
}

export async function handleRestEnd(event, user, childId) {
  await childService.getChildById(user._id, childId);
  const body = parseJsonBody(event);
  const date = body.date || todayIsoDate();

  const report = await reportService.endRest(user._id, childId, date, body.restEnd);
  return successResponse(report, 'Rest ended');
}
