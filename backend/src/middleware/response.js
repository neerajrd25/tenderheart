const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Max-Age': '86400',
};

export function jsonResponse(statusCode, payload, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
    body: JSON.stringify(payload),
  };
}

export function successResponse(data, message = 'OK', statusCode = 200) {
  return jsonResponse(statusCode, { success: true, message, data });
}

export function errorResponse(statusCode, message) {
  return jsonResponse(statusCode, { success: false, message });
}

export function binaryResponse(statusCode, base64Body, contentType, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': contentType,
      ...CORS_HEADERS,
      ...extraHeaders,
    },
    body: base64Body,
    isBase64Encoded: true,
  };
}

export function optionsResponse() {
  return {
    statusCode: 204,
    headers: CORS_HEADERS,
    body: '',
  };
}
