// ai-commit-server
//
// Runs in one of two modes, controlled by BACKEND:
//
//   BACKEND=ollama (default) - talks to a real Ollama instance (OLLAMA_HOST)
//     that has an actual model loaded. Use this on a host with enough
//     RAM for the model (several GB) - e.g. an EC2 / Oracle VM. Pairs
//     with the docker-compose.yml at the repo root.
//
//   BACKEND=gemini - tiny proxy, forwards to Gemini using a server-side
//     key. No dependencies, ~10MB RAM - fits Render's free tier.

const http = require('http');
const fs = require('fs');
const path = require('path');

// Load server/.env if present (no dotenv dependency).
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (key && process.env[key] === undefined) process.env[key] = val;
    }
  }
} catch (_) {
  // ignore
}

const PORT = process.env.PORT || 3000;
const BACKEND = process.env.BACKEND || 'ollama';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:3b';

// Optional shared secret so randoms who find the URL can't burn your
// Gemini free-tier quota or your VM's compute. Set this in the host's
// env vars and give the same value to your CLI users via `ai-commit config`.
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

async function callOllama(prompt) {
  const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: { temperature: 0.4 },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Ollama error (${res.status}): ${errText || res.statusText}`);
  }

  const data = await res.json();
  const text = (data.response || '').trim();
  if (!text) throw new Error('Ollama returned an empty response.');
  return text;
}

async function generate(prompt) {
  if (BACKEND === 'ollama') return callOllama(prompt);
  if (!GEMINI_API_KEY) throw new Error('Server misconfigured: GEMINI_API_KEY not set');
  return callGemini(prompt);
}

const server = http.createServer(async (req, res) => {
  // Used by the GitHub Actions keep-alive workflow to prevent Render's
  // free tier from spinning the service down after 15 min idle.
  if (req.method === 'GET' && req.url === '/health') {
    return send(res, 200, { status: 'ok', backend: BACKEND, time: new Date().toISOString() });
  }

  if (req.method === 'POST' && req.url === '/generate-commit-message') {
    if (CLIENT_SECRET && req.headers['x-client-secret'] !== CLIENT_SECRET) {
      return send(res, 401, { error: 'Unauthorized' });
    }

    try {
      const raw = await readBody(req);
      const { prompt } = JSON.parse(raw || '{}');
      if (!prompt || typeof prompt !== 'string') {
        return send(res, 400, { error: 'Missing "prompt" string in request body' });
      }
      const message = await generate(prompt);
      return send(res, 200, { message });
    } catch (err) {
      return send(res, 502, { error: err.message || 'Upstream error' });
    }
  }

  send(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`ai-commit-server listening on port ${PORT} (backend: ${BACKEND})`);
});
