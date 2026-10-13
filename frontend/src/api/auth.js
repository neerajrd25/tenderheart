import apiClient from './client.js';

export async function fetchAuthenticatedUser() {
  const { data } = await apiClient.get('/auth');
  return data.data;
}

export async function loginWithGoogleIdToken(idToken) {
  const { data } = await apiClient.post('/auth/google', { idToken });
  return data.data;
}
