export function parseJsonBody(event) {
  if (!event.body) return {};

  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf-8')
    : event.body;

  if (!raw || raw.trim() === '') return {};

  try {
    return JSON.parse(raw);
  } catch {
    const err = new Error('Request body must be valid JSON');
    err.statusCode = 400;
    throw err;
  }
}

export function getQueryParam(event, name) {
  return event.queryStringParameters?.[name];
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}
