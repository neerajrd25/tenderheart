import { successResponse } from '../middleware/response.js';
import { parseJsonBody } from '../utils/http.js';
import * as childService from '../services/childService.js';

export async function handleListChildren(event, user) {
  const children = await childService.listChildren(user._id);
  return successResponse(children, 'Children fetched');
}

export async function handleCreateChild(event, user) {
  const body = parseJsonBody(event);
  const child = await childService.createChild(user._id, body);
  return successResponse(child, 'Child created', 201);
}

export async function handleGetChild(event, user, childId) {
  const child = await childService.getChildById(user._id, childId);
  return successResponse(child, 'Child fetched');
}

export async function handleUpdateChild(event, user, childId) {
  const body = parseJsonBody(event);
  const child = await childService.updateChild(user._id, childId, body);
  return successResponse(child, 'Child updated');
}
