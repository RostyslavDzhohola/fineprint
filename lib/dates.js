'use strict';
// Find deadline-like dates in rules text and convert them to real instants.

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };
const ZONES = [
  [/^(eastern( (standard|daylight))?( time)?|et|est|edt)$/i, 'America/New_York', 'Eastern'],
  [/^(central( (standard|daylight))?( time)?|ct|cst|cdt)$/i, 'America/Chicago', 'Central'],
  [/^(mountain( (standard|daylight))?( time)?|mt|mst|mdt)$/i, 'America/Denver', 'Mountain'],
  [/^(pacific( (standard|daylight))?( time)?|pt|pst|pdt)$/i, 'America/Los_Angeles', 'Pacific'],
  [/^(utc|gmt|coordinated universal time)$/i, 'UTC', 'UTC'],
];
const ZONE_RE = '(Eastern(?: (?:Standard|Daylight))?(?: Time)?|Central(?: (?:Standard|Daylight))?(?: Time)?|Mountain(?: (?:Standard|Daylight))?(?: Time)?|Pacific(?: (?:Standard|Daylight))?(?: Time)?|E[SD]?T|C[SD]?T|M[SD]?T|P[SD]?T|UTC|GMT)';
const MONTH_RE = '(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
const DATE_RE = new RegExp(
  MONTH_RE + '\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?' +
  '(?:\\s*(?:\\(|@|at|,)?\\s*(\\d{1,2})(?::(\\d{2}))?\\s*(a\\.?m\\.?|p\\.?m\\.?)\\s*' + ZONE_RE + '?\\)?)?',
  'gi');

function zoneFor(word) {
  if (!word) return null;
  for (const [re, tz, label] of ZONES) if (re.test(word.trim())) return { tz, label };
  return null;
}

function tzOffsetMs(utcMs, tz) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const p = Object.fromEntries(f.formatToParts(new Date(utcMs)).map(x => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return asUtc - utcMs;
}

// Wall-clock time in an IANA zone -> UTC milliseconds.
function zonedToUtc(y, mo, d, h, mi, tz) {
  const guess = Date.UTC(y, mo, d, h, mi);
  let t = guess - tzOffsetMs(guess, tz);
  t = guess - tzOffsetMs(t, tz);
  return t;
}

function docYear(text) {
  const counts = {};
  for (const m of String(text).matchAll(/\b(20\d\d)\b/g)) counts[m[1]] = (counts[m[1]] || 0) + 1;
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best ? +best[0] : new Date().getUTCFullYear();
}

// Returns [{ original, iso, index, timeStated, zoneStated, zoneLabel }]
function findDates(sentence, fallbackYear) {
  const out = [];
  DATE_RE.lastIndex = 0;
  let m;
  while ((m = DATE_RE.exec(sentence))) {
    const [all, mon, day, year, hh, mm, ampm, zoneWord] = m;
    const mo = MONTHS[mon.slice(0, 4).toLowerCase()] ?? MONTHS[mon.slice(0, 3).toLowerCase()];
    if (mo === undefined) continue;
    const d = +day;
    if (d < 1 || d > 31) continue;
    // "May" is also a common word: require a digit right after and a plausible context.
    const y = year ? +year : fallbackYear;
    let h = 23, mi = 59, timeStated = false;
    if (hh) {
      timeStated = true;
      h = (+hh % 12) + (/p/i.test(ampm) ? 12 : 0);
      mi = mm ? +mm : 0;
    }
    const z = zoneFor(zoneWord);
    const tz = z ? z.tz : 'UTC';
    const ms = zonedToUtc(y, mo, d, h, mi, tz);
    out.push({ original: all.trim().replace(/[(@,]\s*$/, '').trim(), iso: new Date(ms).toISOString(), index: m.index,
      timeStated, zoneStated: !!z, zoneLabel: z ? z.label : null, yearStated: !!year });
  }
  return out;
}

module.exports = { findDates, zonedToUtc, docYear, zoneFor };
