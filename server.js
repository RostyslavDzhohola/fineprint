'use strict';
// Fineprint — local web server. `npm start`, then open http://localhost:3000
const http = require('http');
const fs = require('fs');
const path = require('path');
const { htmlToText } = require('./lib/text');
const { analyze } = require('./lib/analyze');
const { compare } = require('./lib/compare');
const { config } = require('./lib/llm');

// Load a local .env if present (no dependency needed).
try {
  for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} catch { /* no .env */ }

const PUBLIC = path.join(__dirname, 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8' };

function send(res, code, body, type = 'application/json') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > 1e6) { reject(new Error('body too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}')); } catch { reject(new Error('invalid JSON')); } });
    req.on('error', reject);
  });
}

async function loadSource(input) {
  if (!input) throw Object.assign(new Error('Paste a rules URL or the rules text.'), { code: 400 });
  if (input.text && input.text.trim()) return { text: input.text.trim().slice(0, 150000), url: null };
  const url = String(input.url || '').trim();
  if (!/^https?:\/\//i.test(url)) throw Object.assign(new Error('That doesn\'t look like a URL. Paste the rules text instead.'), { code: 400 });
  let res;
  try {
    res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Fineprint rules reader)', Accept: 'text/html,text/plain' }, signal: AbortSignal.timeout(20000) });
  } catch (e) {
    throw Object.assign(new Error('Couldn\'t fetch that page — paste the rules text instead.'), { code: 502 });
  }
  if (res.status === 403 || res.status === 503) {
    const peek = await res.text().catch(() => '');
    if (/just a moment|cf-chl|challenge-platform/i.test(peek)) throw Object.assign(new Error('This site blocks automatic readers. Open the rules page, select all (Ctrl/Cmd+A), copy, and paste the text here.'), { code: 502 });
  }
  if (!res.ok) throw Object.assign(new Error(`Couldn't fetch that page (HTTP ${res.status}) — paste the rules text instead.`), { code: 502 });
  const body = await res.text();
  const text = /html/i.test(res.headers.get('content-type') || '') || /<html/i.test(body) ? htmlToText(body) : body;
  if (text.length < 200) throw Object.assign(new Error('That page had almost no text — paste the rules text instead.'), { code: 422 });
  return { text: text.slice(0, 150000), url };
}

async function handleApi(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/config') {
    const c = config();
    return send(res, 200, { mode: c.enabled ? 'ai' : 'offline', model: c.enabled ? c.model : null, provider: c.enabled ? new URL(c.baseUrl).host : null });
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
  const body = await readBody(req);
  if (url.pathname === '/api/analyze') {
    const src = await loadSource(body);
    const result = await analyze(src.text);
    return send(res, 200, { ...result, sourceText: src.text, url: src.url });
  }
  if (url.pathname === '/api/compare') {
    const [a, b] = await Promise.all([loadSource(body.a), loadSource(body.b)]);
    const report = compare({ name: body.a?.name || 'Contest A', text: a.text }, { name: body.b?.name || 'Contest B', text: b.text });
    return send(res, 200, report);
  }
  return send(res, 404, { error: 'not found' });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (url.pathname === '/sample') return send(res, 200, fs.readFileSync(path.join(__dirname, 'samples', 'example-rules.txt'), 'utf8'), TYPES['.txt']);
    const file = path.normalize(path.join(PUBLIC, url.pathname === '/' ? 'index.html' : url.pathname));
    if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(res, 404, 'Not found', 'text/plain');
    send(res, 200, fs.readFileSync(file), TYPES[path.extname(file)] || 'application/octet-stream');
  } catch (e) {
    send(res, e.code && Number.isInteger(e.code) ? e.code : 500, { error: e.message || 'Something went wrong' });
  }
});

if (require.main === module) {
  const port = +process.env.PORT || 3000;
  server.listen(port, () => {
    const c = config();
    console.log(`Fineprint running at http://localhost:${port}  (${c.enabled ? 'AI mode: ' + c.model + ' via ' + c.baseUrl : 'offline mode — set LLM_API_KEY or NEBIUS_API_KEY for AI mode'})`);
  });
}

module.exports = { server, loadSource };
