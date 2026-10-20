'use strict';
const { analyzeOffline, SECTIONS } = require('./heuristics');
const { analyzeWithLLM, config } = require('./llm');
const { verifyQuote } = require('./verify');
const { findDates, docYear } = require('./dates');

function guessTitle(text) {
  const first = String(text).split('\n').map(l => l.trim()).find(l => l.length > 6 && l.length < 140);
  return first || 'Untitled rules';
}

function finalize(raw, text) {
  const year = docYear(text);
  const items = [];
  (raw.items || []).forEach((it, i) => {
    const section = SECTIONS.includes(it.section) ? it.section : 'gotchas';
    const quote = String(it.quote || '').trim();
    const v = verifyQuote(text, quote);
    const item = { id: section + '-' + i, section, summary: String(it.summary || quote).trim(), quote, verified: v.verified, offset: v.offset, length: v.length };
    if (it.deadline) item.deadline = it.deadline;
    else if (section === 'deadlines') {
      const d = findDates(it.deadline_text || '', year)[0] || findDates(quote, year)[0];
      if (d) item.deadline = { iso: d.iso, original: d.original, timeStated: d.timeStated, zoneStated: d.zoneStated };
    }
    items.push(item);
  });
  // verified first within each section, deadlines chronological
  items.sort((a, b) => SECTIONS.indexOf(a.section) - SECTIONS.indexOf(b.section)
    || (b.verified - a.verified)
    || ((a.deadline && b.deadline) ? a.deadline.iso.localeCompare(b.deadline.iso) : 0));
  return { mode: raw.mode, model: raw.model, title: raw.title || guessTitle(text), notice: raw.notice || null, items };
}

async function analyze(text) {
  if (config().enabled) {
    try {
      return finalize(await analyzeWithLLM(text), text);
    } catch (e) {
      const off = analyzeOffline(text);
      off.notice = 'AI unavailable (' + e.message + ') — showing offline results.';
      return finalize(off, text);
    }
  }
  return finalize(analyzeOffline(text), text);
}

module.exports = { analyze, finalize };
