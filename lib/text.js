'use strict';
// HTML -> readable plain text, plus a sentence splitter.

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', copy: '©', reg: '®', trade: '™', bull: '•' };

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

function htmlToText(html) {
  let s = String(html);
  // Prefer the main content if the page has it.
  const main = s.match(/<main[\s\S]*?<\/main>/i) || s.match(/<article[\s\S]*?<\/article>/i);
  if (main && main[0].length > 2000) s = main[0];
  s = s.replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|nav|footer|header|form|iframe)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/(p|div|h[1-6]|li|tr|section|article|table|ul|ol|blockquote|dd|dt)>/gi, '\n')
    .replace(/<(td|th)[^>]*>/gi, ' | ')
    .replace(/<[^>]+>/g, ' ');
  s = decodeEntities(s);
  return s.split('\n').map(l => l.replace(/[ \t\u00a0]+/g, ' ').trim())
    .filter(Boolean).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// Split into sentences with their char offsets in the original text.
function splitSentences(text) {
  const out = [];
  // Walk lines, then split each line on sentence-ending punctuation.
  let lineStart = 0;
  for (const line of text.split('\n')) {
    let i = 0;
    const parts = line.split(/(?<=[.!?])\s+(?=[A-Z“"(•\d])/);
    for (const p of parts) {
      const idx = line.indexOf(p, i);
      const t = p.trim();
      if (t.length >= 3) out.push({ text: t, offset: lineStart + idx + (p.length - p.trimStart().length) });
      i = idx + p.length;
    }
    lineStart += line.length + 1;
  }
  return out;
}

module.exports = { htmlToText, splitSentences, decodeEntities };
