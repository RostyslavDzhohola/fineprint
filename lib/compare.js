'use strict';
// "Can I stack these?" — line up the clauses that decide whether one project can enter both contests.
// Built only from sentences found in the two sources (always quotable, always verifiable).

const { splitSentences } = require('./text');
const { findDates, docYear } = require('./dates');

const TOPICS = [
  { id: 'elsewhere', title: 'Entering the same project elsewhere',
    re: /(more than one submission|multiple submissions|substantially different|previously submitted|submitted to (any )?other|other (hackathons?|competitions?|contests?)|exclusiv|not been submitted)/i },
  { id: 'newness', title: 'New project vs. existing project',
    re: /(newly created|new projects? only|new software project|existed prior|significantly updated|pre-existing|empty folder|built during the submission period)/i },
  { id: 'video', title: 'Demo video rules', re: /\bvideo\b.*\b(youtube|vimeo|minutes?|publicly visible|uploaded)\b|\b(youtube|vimeo)\b/i },
  { id: 'repo', title: 'Code repository & license', re: /(repositor(y|ies)|open source license|license file)/i },
  { id: 'demo', title: 'Hosted / working demo link', re: /(working demo|hosted application|test build|url to a (working|live))/i },
  { id: 'prizes', title: 'Prize limits per project', re: /(each project is eligible|eligible for one \(1\)|one \(1\) (prize|overall))/i },
];
const BOILERPLATE = /(arbitration|indemnif|liabilit|punitive|released parties)/i;

function clauses(text, re, max = 3) {
  const out = [];
  for (const { text: s } of splitSentences(text)) {
    if (s.length > 600 || BOILERPLATE.test(s)) continue;
    if (/:\s*$/.test(s) || (s.length < 30 && !/[.!?]$/.test(s))) continue; // headings
    if (re.test(s) && !out.includes(s)) out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

function facets(text) {
  const t = text;
  const hosts = new Set();
  for (const s of clauses(t, /\bvideo\b|youtube|vimeo/i, 12)) {
    if (/youtube/i.test(s)) hosts.add('YouTube');
    if (/vimeo/i.test(s)) hosts.add('Vimeo');
  }
  return {
    newOnly: /(newly created during|new projects? only|must create a new|started from an empty folder)/i.test(t)
      && !/(existed prior|significantly updated)/i.test(t),
    existingAllowed: /(existed prior to|significantly updated)/i.test(t),
    exclusivity: /(submitted to any other (competition|contest|hackathon)[^.]*may not|not (have )?been (previously )?submitted|exclusive(ly)? (to|for) this|may not (be )?(entered|submitted) (in|to) (any )?other)/i.test(t),
    videoHosts: [...hosts].sort(),
    hostedDemo: /(url to a working demo|hosted application|test build)/i.test(t),
  };
}

function lastDeadline(text) {
  const year = docYear(text);
  const subs = clauses(text, /submission (period|deadline)|deadline/i, 6);
  let best = null;
  for (const s of subs) for (const d of findDates(s, year)) if (d.timeStated && (!best || d.iso > best.iso)) best = { ...d, quote: s };
  return best;
}

function compare(a, b) {
  const fa = facets(a.text), fb = facets(b.text);
  const topics = TOPICS.map(t => ({ id: t.id, title: t.title, a: clauses(a.text, t.re), b: clauses(b.text, t.re) }));
  const conflicts = [];
  if (fa.newOnly !== fb.newOnly || fa.existingAllowed !== fb.existingAllowed) {
    const [strict, loose] = fa.newOnly ? [a.name, b.name] : fb.newOnly ? [b.name, a.name] : [null, null];
    if (strict) conflicts.push({ topic: 'newness', text: `${strict} requires a brand-new project; ${loose} also accepts an existing one if significantly updated. Build it new, inside ${strict}'s submission window, and it qualifies for both.` });
  }
  if (fa.videoHosts.join() !== fb.videoHosts.join() && fa.videoHosts.length && fb.videoHosts.length) {
    const common = fa.videoHosts.filter(h => fb.videoHosts.includes(h));
    conflicts.push({ topic: 'video', text: `Video hosts differ (${a.name}: ${fa.videoHosts.join(' or ')}; ${b.name}: ${fb.videoHosts.join(' or ')}).` + (common.length ? ` Use ${common.join(' or ')} to satisfy both.` : ' No common host — you need two uploads.') });
  }
  if (fa.hostedDemo !== fb.hostedDemo) {
    conflicts.push({ topic: 'demo', text: `${fa.hostedDemo ? a.name : b.name} also asks for a working demo / hosted link; ${fa.hostedDemo ? b.name : a.name} only needs the video and repo.` });
  }
  const da = lastDeadline(a.text), db = lastDeadline(b.text);
  const deadlines = [da && { name: a.name, ...da }, db && { name: b.name, ...db }].filter(Boolean).sort((x, y) => x.iso.localeCompare(y.iso));
  let verdict;
  if (fa.exclusivity || fb.exclusivity) {
    verdict = { level: 'warn', text: `Exclusivity language found in ${[fa.exclusivity && a.name, fb.exclusivity && b.name].filter(Boolean).join(' and ')} — read the quoted clauses before entering both.` };
  } else {
    verdict = { level: 'ok', text: 'No clause in either rule set forbids entering the same project in another contest. The quoted "multiple submissions" clauses only limit entries within each contest. Not legal advice — when in doubt, ask the organizers.' };
  }
  return { verdict, conflicts, deadlines, topics, facets: { a: fa, b: fb } };
}

module.exports = { compare, facets };
