import apiClient from './client.js';

export async function fetchChildren() {
  const { data } = await apiClient.get('/children');
  return data.data;
}

export async function fetchChild(childId) {
  const { data } = await apiClient.get(`/children/${childId}`);
  return data.data;
}

export async function createChild(payload) {
  const { data } = await apiClient.post('/children', payload);
  return data.data;
}

export async function updateChild(childId, payload) {
  const { data } = await apiClient.put(`/children/${childId}`, payload);
  return data.data;
}
