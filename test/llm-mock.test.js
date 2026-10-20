'use strict';
// Exercises the AI path end to end against a local mock OpenAI-compatible server.
const test = require('node:test');
const assert = require('node:assert');
const http = require('http');

test('AI mode: request shape, verified + fabricated quotes, fallback on failure', async () => {
  let seen;
  let fail = false;
  const rules = 'Official Rules\nSubmission Period ends October 26, 2026 (5:00 pm Eastern Time).\nThe repository must be public and include an open source license file.';
  const mock = http.createServer((req, res) => {
    let b = ''; req.on('data', c => b += c); req.on('end', () => {
      seen = { url: req.url, auth: req.headers.authorization, body: JSON.parse(b) };
      if (fail) { res.writeHead(500); return res.end('boom'); }
      const content = '```json\n' + JSON.stringify({ title: 'Mock Rules', items: [
        { section: 'deadlines', summary: 'Submit by the deadline', quote: 'Submission Period ends October 26, 2026 (5:00 pm Eastern Time).', deadline_text: 'October 26, 2026 (5:00 pm Eastern Time)' },
        { section: 'deliverables', summary: 'Public repo with license', quote: 'The repository must be public and include an open source license file.' },
        { section: 'gotchas', summary: 'Invented rule', quote: 'Teams may not use any AI tools at all during the event.' },
      ] }) + '\n```';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content } }] }));
    });
  });
  await new Promise(r => mock.listen(0, r));
  process.env.LLM_API_KEY = 'test-key';
  process.env.LLM_BASE_URL = `http://127.0.0.1:${mock.address().port}/v1`;
  process.env.LLM_MODEL = 'nvidia/nemotron-3-super-120b-a12b';
  const { analyze } = require('../lib/analyze');
  try {
    const r = await analyze(rules);
    assert.equal(seen.url, '/v1/chat/completions');
    assert.equal(seen.auth, 'Bearer test-key');
    assert.equal(seen.body.model, 'nvidia/nemotron-3-super-120b-a12b');
    assert.equal(r.mode, 'ai');
    const dl = r.items.find(i => i.section === 'deadlines');
    assert.equal(dl.verified, true);
    assert.equal(dl.deadline.iso, '2026-10-26T21:00:00.000Z');
    assert.equal(r.items.find(i => i.summary === 'Invented rule').verified, false);

    fail = true;
    const r2 = await analyze(rules);
    assert.equal(r2.mode, 'offline');
    assert.match(r2.notice, /AI unavailable/);
  } finally {
    mock.close();
    delete process.env.LLM_API_KEY; delete process.env.LLM_BASE_URL; delete process.env.LLM_MODEL;
  }
});
