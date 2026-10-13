import { authenticate } from '../middleware/auth.js';
import { authenticateWithGoogleToken } from '../services/authService.js';
import { successResponse } from '../middleware/response.js';
import { parseJsonBody } from '../utils/http.js';
import { ValidationError } from '../utils/validation.js';

export async function handleGetAuth(event) {
  const user = await authenticate(event);
  return successResponse(user, 'Authenticated');
}

export async function handlePostGoogleAuth(event) {
  const body = parseJsonBody(event);
  if (!body.idToken) {
    throw new ValidationError('idToken is required');
  }

  const user = await authenticateWithGoogleToken(body.idToken);
  return successResponse(user, 'Signed in successfully');
}
