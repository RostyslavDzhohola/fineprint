'use strict';
// Mechanical quote verification: a quote counts only if it is literally in the source.

function normChar(c) {
  if (/[‘’‚‛′`]/.test(c)) return "'";
  if (/[“”„‟″]/.test(c)) return '"';
  if (/[‐‑‒–—―]/.test(c)) return '-';
  if (c === '…') return '...';
  return c.toLowerCase();
}

// Normalize and keep a map from normalized index -> original index.
function normalizeWithMap(s) {
  let out = '';
  const map = [];
  let lastSpace = true;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (/\s/.test(c) || c === '•' || c === '|') {
      if (!lastSpace) { out += ' '; map.push(i); lastSpace = true; }
      continue;
    }
    const n = normChar(c);
    for (const ch of n) { out += ch; map.push(i); }
    lastSpace = false;
  }
  return { out, map };
}

function normalize(s) { return normalizeWithMap(String(s || '')).out.trim(); }

// Returns { verified, offset, length } with offsets into the ORIGINAL source.
function verifyQuote(source, quote) {
  const q = normalize(quote).replace(/^["'.\s]+|["'\s]+$/g, '');
  if (q.length < 8) return { verified: false, offset: -1, length: 0 };
  const { out, map } = normalizeWithMap(String(source || ''));
  const idx = out.indexOf(q);
  if (idx === -1) return { verified: false, offset: -1, length: 0 };
  const start = map[idx];
  const end = map[idx + q.length - 1] + 1;
  return { verified: true, offset: start, length: end - start };
}

module.exports = { verifyQuote, normalize };
