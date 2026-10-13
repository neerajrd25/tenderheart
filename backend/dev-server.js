import 'dotenv/config';
import http from 'node:http';
import { handler } from './src/handlers/index.js';

const PORT = Number(process.env.PORT || 4000);

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function toApiGatewayEvent(req, body, url) {
  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    headers[key.toLowerCase()] = Array.isArray(value) ? value.join(',') : value;
  }

  const queryStringParameters = {};
  for (const [key, value] of url.searchParams.entries()) {
    queryStringParameters[key] = value;
  }

  return {
    version: '2.0',
    rawPath: url.pathname,
    rawQueryString: url.search.replace(/^\?/, ''),
    headers,
    queryStringParameters: Object.keys(queryStringParameters).length
      ? queryStringParameters
      : undefined,
    requestContext: {
      http: {
        method: req.method,
        path: url.pathname,
        sourceIp: req.socket.remoteAddress,
      },
    },
    body: body || undefined,
    isBase64Encoded: false,
  };
}

const server = http.createServer(async (req, res) => {
  try {
    const body = await readBody(req);
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const event = toApiGatewayEvent(req, body, url);
    const fakeContext = {};

    const result = await handler(event, fakeContext);

    res.writeHead(result.statusCode, result.headers || {});
    res.end(result.isBase64Encoded ? Buffer.from(result.body, 'base64') : result.body);
  } catch (err) {
    console.error('Dev server error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, message: 'Internal server error' }));
  }
});

server.listen(PORT, () => {
  console.log(`Baby's Day Out backend (dev) listening on http://localhost:${PORT}`);
});
