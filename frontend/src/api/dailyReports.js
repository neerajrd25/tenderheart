import apiClient from './client.js';

export async function fetchDailyReport(childId, date) {
  const { data } = await apiClient.get(`/children/${childId}/daily-report`, { params: { date } });
  return data.data;
}

export async function saveDailyReport(childId, payload) {
  const { data } = await apiClient.put(`/children/${childId}/daily-report`, payload);
  return data.data;
}

export async function checkIn(childId, payload) {
  const { data } = await apiClient.post(`/children/${childId}/check-in`, payload);
  return data.data;
}

export async function checkOut(childId, payload) {
  const { data } = await apiClient.post(`/children/${childId}/check-out`, payload);
  return data.data;
}

export async function startRest(childId, payload) {
  const { data } = await apiClient.post(`/children/${childId}/rest-start`, payload);
  return data.data;
}

export async function endRest(childId, payload) {
  const { data } = await apiClient.post(`/children/${childId}/rest-end`, payload);
  return data.data;
}

export async function completeAndSendReport(childId, payload) {
  const { data } = await apiClient.post(`/children/${childId}/daily-report/complete`, payload);
  return data.data;
}

export async function retrySendReport(childId, payload) {
  const { data } = await apiClient.post(`/children/${childId}/daily-report/retry-send`, payload);
  return data.data;
}
