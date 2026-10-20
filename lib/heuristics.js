'use strict';
// Offline (no-AI) extractor: sorts source sentences into checklist sections with keyword rules.
// Quotes are the source sentences themselves, so they always verify.

const { splitSentences } = require('./text');
const { findDates, docYear } = require('./dates');

const SECTIONS = ['deadlines', 'eligibility', 'deliverables', 'judging', 'gotchas'];
const BOILERPLATE = /(arbitration|indemnif|liabilit|punitive|hereby waive|released parties|privacy policy|terms of service|governed by|jurisdiction|trojan|class action|w-9|w-8ben|wiring fees|affidavit)/i;

const RULES = {
  eligibility: /\b(is open to|are open to|is not open to|eligible individuals?|age of majority|years of age|18\+|residents? of|domiciled|employees?,? representatives|immediate family)\b/i,
  judging: /\b(judg(ed|ing criteria|es)|equally weighted|criteria|scored|evaluated (on|based))\b|^(design|potential impact|innovation|presentation|technological implementation|quality of the idea)\b/i,
  gotchas: /\b(must not|may not|newly created|new projects? only|existed prior|significantly updated|pre-existing|empty folder|substantially different|each project is eligible for|less than three|publicly visible|only on youtube|youtube|vimeo|open source license|disqualif|not required to (watch|test)|reviewers won't|must be public)\b/i,
  deliverables: /\b(must|required|should|include|provide|submit)\b[\s\S]*\b(submission|video|repositor(y|ies)|repo\b|description|url|license|readme|demo|scope\.md|prd\.md|spec\.md|planning documents|feedback|track|working (web|mobile|app|software|project))\b/i,
};

const LIMITS = { deadlines: 10, eligibility: 5, deliverables: 8, judging: 6, gotchas: 8 };

function shorten(s, n = 160) {
  s = s.replace(/^[•\-\s]+/, '').trim();
  return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s;
}

function deadlineLabel(sentence, first, i, count) {
  let before = sentence.slice(0, first.index).replace(/^[•\-\s]+/, '');
  before = before.replace(/\b(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day,?\s*/g, '').replace(/\(.*?\)/g, '').replace(/[\s:–—,(@-]+$/, '').trim();
  const words = before.split(/\s+/).slice(-8).join(' ');
  let label = words || 'Date';
  if (count > 1) label += i === count - 1 ? ' — ends' : ' — starts';
  return shorten(label, 70);
}

function analyzeOffline(text) {
  const year = docYear(text);
  const items = [];
  const seen = new Set();
  const counts = Object.fromEntries(SECTIONS.map(s => [s, 0]));
  const push = (section, summary, quote, extra = {}) => {
    if (counts[section] >= LIMITS[section]) return;
    const key = section + '|' + quote + '|' + (extra.deadline ? extra.deadline.iso : '');
    if (seen.has(key)) return;
    seen.add(key); counts[section]++;
    items.push({ section, summary, quote, ...extra });
  };
  for (const { text: s } of splitSentences(text)) {
    if (s.length < 15 || s.length > 600 || BOILERPLATE.test(s)) continue;
    if (/:\s*$/.test(s) || (s.length < 30 && !/[.!?]$/.test(s))) continue; // headings / list lead-ins
    const dates = findDates(s, year).filter(d => d.timeStated || d.yearStated);
    if (dates.length) {
      dates.forEach((d, i) => push('deadlines', deadlineLabel(s, dates[0], i, dates.length), s,
        { deadline: { iso: d.iso, original: d.original, timeStated: d.timeStated, zoneStated: d.zoneStated } }));
      continue;
    }
    if (RULES.eligibility.test(s)) { push('eligibility', shorten(s), s); continue; }
    const criterion = /^[A-Z][\w/ ]{2,40}:\s/.test(s) && RULES.judging.test(s);
    if (!criterion && RULES.gotchas.test(s)) { push('gotchas', shorten(s), s); continue; }
    if (RULES.judging.test(s)) { push('judging', shorten(s), s); continue; }
    if (RULES.deliverables.test(s)) { push('deliverables', shorten(s), s); continue; }
  }
  return { mode: 'offline', model: null, items };
}

module.exports = { analyzeOffline, SECTIONS };
