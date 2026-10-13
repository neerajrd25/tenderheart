import { errorResponse, optionsResponse, successResponse } from '../middleware/response.js';
import { authenticate } from '../middleware/auth.js';
import { handleGetAuth, handlePostGoogleAuth } from './auth.js';
import {
  handleListChildren,
  handleCreateChild,
  handleGetChild,
  handleUpdateChild,
} from './children.js';
import {
  handleGetDailyReport,
  handleCreateDailyReport,
  handleUpdateDailyReport,
  handleCheckIn,
  handleCheckOut,
  handleRestStart,
  handleRestEnd,
} from './dailyReports.js';
import { handleCompleteAndSend, handleRetrySend } from './email.js';
import { handleAutoSend } from './autoSend.js';
import { AUTO_SEND_SOURCE } from '../services/autoSendService.js';

const ROUTES = [
  { method: 'GET', pattern: /^\/$/, auth: false, fn: () => successResponse(null, 'TenderHeart API') },
  {
    method: 'GET',
    pattern: /^\/health$/,
    auth: false,
    fn: () => successResponse({ status: 'ok', timestamp: new Date().toISOString() }, 'Healthy'),
  },
  { method: 'GET', pattern: /^\/auth$/, auth: false, fn: (event) => handleGetAuth(event) },
  { method: 'POST', pattern: /^\/auth\/google$/, auth: false, fn: (event) => handlePostGoogleAuth(event) },

  { method: 'GET', pattern: /^\/children$/, auth: true, fn: (event, user) => handleListChildren(event, user) },
  { method: 'POST', pattern: /^\/children$/, auth: true, fn: (event, user) => handleCreateChild(event, user) },
  {
    method: 'GET',
    pattern: /^\/children\/([^/]+)$/,
    auth: true,
    fn: (event, user, [id]) => handleGetChild(event, user, id),
  },
  {
    method: 'PUT',
    pattern: /^\/children\/([^/]+)$/,
    auth: true,
    fn: (event, user, [id]) => handleUpdateChild(event, user, id),
  },

  {
    method: 'GET',
    pattern: /^\/children\/([^/]+)\/daily-report$/,
    auth: true,
    fn: (event, user, [id]) => handleGetDailyReport(event, user, id),
  },
  {
    method: 'POST',
    pattern: /^\/children\/([^/]+)\/daily-report$/,
    auth: true,
    fn: (event, user, [id]) => handleCreateDailyReport(event, user, id),
  },
  {
    method: 'PUT',
    pattern: /^\/children\/([^/]+)\/daily-report$/,
    auth: true,
    fn: (event, user, [id]) => handleUpdateDailyReport(event, user, id),
  },
  {
    method: 'POST',
    pattern: /^\/children\/([^/]+)\/check-in$/,
    auth: true,
    fn: (event, user, [id]) => handleCheckIn(event, user, id),
  },
  {
    method: 'POST',
    pattern: /^\/children\/([^/]+)\/check-out$/,
    auth: true,
    fn: (event, user, [id]) => handleCheckOut(event, user, id),
  },
  {
    method: 'POST',
    pattern: /^\/children\/([^/]+)\/rest-start$/,
    auth: true,
    fn: (event, user, [id]) => handleRestStart(event, user, id),
  },
  {
    method: 'POST',
    pattern: /^\/children\/([^/]+)\/rest-end$/,
    auth: true,
    fn: (event, user, [id]) => handleRestEnd(event, user, id),
  },
  {
    method: 'POST',
    pattern: /^\/children\/([^/]+)\/daily-report\/complete$/,
    auth: true,
    fn: (event, user, [id]) => handleCompleteAndSend(event, user, id),
  },
  {
    method: 'POST',
    pattern: /^\/children\/([^/]+)\/daily-report\/retry-send$/,
    auth: true,
    fn: (event, user, [id]) => handleRetrySend(event, user, id),
  },
];

function normalizePath(rawPath) {
  if (!rawPath) return '/';
  if (rawPath.length > 1 && rawPath.endsWith('/')) return rawPath.slice(0, -1);
  return rawPath;
}

function matchRoute(method, path) {
  for (const route of ROUTES) {
    if (route.method !== method) continue;
    const match = route.pattern.exec(path);
    if (match) {
      return { route, params: match.slice(1) };
    }
  }
  return null;
}

export async function handler(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;

  // Scheduled invocation (EventBridge Scheduler), not an HTTP request.
  if (event.source === AUTO_SEND_SOURCE) {
    return handleAutoSend(event);
  }

  const method = event.requestContext?.http?.method || 'GET';

  if (method === 'OPTIONS') {
    return optionsResponse();
  }

  const path = normalizePath(event.rawPath);
  const matched = matchRoute(method, path);

  if (!matched) {
    return errorResponse(404, `No route for ${method} ${path}`);
  }

  const { route, params } = matched;

  try {
    const user = route.auth ? await authenticate(event) : null;
    return await route.fn(event, user, params);
  } catch (err) {
    if (err.statusCode) {
      return errorResponse(err.statusCode, err.message);
    }
    console.error('Unhandled error:', err);
    return errorResponse(500, 'Internal server error');
  }
}
