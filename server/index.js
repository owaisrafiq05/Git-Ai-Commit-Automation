// ai-commit-server
//
// A deliberately tiny proxy: it forwards commit-message requests to
// Gemini using a server-side API key, so that key never has to live
// inside the distributed npm package. No framework, no dependencies -
// keeps this comfortably inside Render's free tier (512MB RAM), since
// it's just forwarding small HTTP requests, not running any model.
//
// This is NOT where you should run Ollama / any local LLM - those need
// multiple GB of RAM that the free tier doesn't have. This server only
// proxies to Gemini's cloud API.

const http = require('http');

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
// Optional shared secret so randoms who find the URL can't burn your
// Gemini free-tier quota. Set this in Render's env vars and give the
// same value to your CLI users via `ai-commit config`.
const CLIENT_SECRET = process.env.CLIENT_SECRET;

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      // Basic guard against absurdly large payloads.
      if (data.length > 2_000_000) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 200 },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gemini error (${res.status}): ${errText || res.statusText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  if (!text.trim()) throw new Error('Gemini returned an empty response.');
  return text.trim();
}

const server = http.createServer(async (req, res) => {
  // Used by the GitHub Actions keep-alive workflow to prevent Render's
  // free tier from spinning the service down after 15 min idle.
  if (req.method === 'GET' && req.url === '/health') {
    return send(res, 200, { status: 'ok', time: new Date().toISOString() });
  }

  if (req.method === 'POST' && req.url === '/generate-commit-message') {
    if (CLIENT_SECRET && req.headers['x-client-secret'] !== CLIENT_SECRET) {
      return send(res, 401, { error: 'Unauthorized' });
    }
    if (!GEMINI_API_KEY) {
      return send(res, 500, { error: 'Server misconfigured: GEMINI_API_KEY not set' });
    }

    try {
      const raw = await readBody(req);
      const { prompt } = JSON.parse(raw || '{}');
      if (!prompt || typeof prompt !== 'string') {
        return send(res, 400, { error: 'Missing "prompt" string in request body' });
      }
      const message = await callGemini(prompt);
      return send(res, 200, { message });
    } catch (err) {
      return send(res, 502, { error: err.message || 'Upstream error' });
    }
  }

  send(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`ai-commit-server listening on port ${PORT}`);
});
