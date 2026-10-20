'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { verifyQuote } = require('../lib/verify');
const { findDates } = require('../lib/dates');
const { htmlToText } = require('../lib/text');
const { analyzeOffline } = require('../lib/heuristics');
const { compare } = require('../lib/compare');
const { extractJson } = require('../lib/llm');

const sample = fs.readFileSync(path.join(__dirname, '..', 'samples', 'example-rules.txt'), 'utf8');
const sample2 = fs.readFileSync(path.join(__dirname, '..', 'samples', 'example-rules-2.txt'), 'utf8');

test('verified quote is found despite curly quotes and spacing', () => {
  const src = 'Entrants  must\nprovide a “public” repository with a license.';
  const v = verifyQuote(src, 'must provide a "public" repository');
  assert.equal(v.verified, true);
  assert.equal(src.slice(v.offset, v.offset + v.length), 'must\nprovide a “public” repository');
});

test('fabricated quote is flagged', () => {
  assert.equal(verifyQuote(sample, 'Teams of up to ten people may enter the Challenge.').verified, false);
  assert.equal(verifyQuote(sample, 'short').verified, false);
});

test('Eastern deadline converts to Central for a Chicago viewer', () => {
  const [d] = findDates('Deadline: October 26, 2026 (5:00 pm Eastern Time).', 2026);
  assert.equal(d.iso, '2026-10-26T21:00:00.000Z');
  const local = new Date(d.iso).toLocaleString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  assert.equal(local, '4:00 PM CDT');
});

test('date variants: @ time with abbreviation, ordinal without year, Pacific', () => {
  assert.equal(findDates('Oct 26, 2026 @ 5:00pm EDT', 2026)[0].iso, '2026-10-26T21:00:00.000Z');
  assert.equal(findDates('On or around November 4th (2:00 pm Eastern Time).', 2026)[0].iso, '2026-11-04T19:00:00.000Z');
  assert.equal(findDates('Friday, October 30, 2026 (10:00 am Pacific Time)', 2026)[0].iso, '2026-10-30T17:00:00.000Z');
});

test('html to text drops scripts and keeps list items', () => {
  const t = htmlToText('<html><script>x=1</script><h2>Rules</h2><ul><li>Be 18+</li><li>Submit by May 1</li></ul></html>');
  assert.ok(!t.includes('x=1'));
  assert.match(t, /Rules\n• Be 18\+\n• Submit by May 1/);
});

test('offline extractor fills every section of the sample with verified quotes', () => {
  const r = analyzeOffline(sample);
  for (const s of ['deadlines', 'eligibility', 'deliverables', 'judging', 'gotchas'])
    assert.ok(r.items.some(i => i.section === s), 'missing section ' + s);
  for (const i of r.items) assert.equal(verifyQuote(sample, i.quote).verified, true, i.quote);
  const end = r.items.find(i => i.section === 'deadlines' && /ends/.test(i.summary));
  assert.equal(end.deadline.iso, '2027-04-14T06:59:00.000Z'); // 11:59 pm PDT
});

test('compare finds exclusivity, newness, video-host and demo differences', () => {
  const c = compare({ name: 'Pinecone', text: sample }, { name: 'Harbor', text: sample2 });
  assert.equal(c.verdict.level, 'warn');
  assert.ok(c.conflicts.some(x => x.topic === 'newness'));
  assert.ok(c.conflicts.some(x => x.topic === 'video' && /YouTube/.test(x.text)));
  assert.ok(c.conflicts.some(x => x.topic === 'demo'));
  assert.equal(c.deadlines[0].name, 'Pinecone');
});

test('extractJson tolerates code fences and reasoning blocks', () => {
  assert.deepEqual(extractJson('<think>hmm</think>```json\n{"items":[]}\n```'), { items: [] });
  assert.throws(() => extractJson('no json here'));
});
