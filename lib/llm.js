'use strict';
// OpenAI-compatible Chat Completions client. Default: NVIDIA Nemotron on Nebius Token Factory.
// Swap providers by setting LLM_BASE_URL / LLM_MODEL / LLM_API_KEY.

function config() {
  const key = process.env.LLM_API_KEY || process.env.NEBIUS_API_KEY || '';
  return {
    key,
    baseUrl: (process.env.LLM_BASE_URL || 'https://api.tokenfactory.nebius.com/v1').replace(/\/+$/, ''),
    model: process.env.LLM_MODEL || 'nvidia/nemotron-3-super-120b-a12b',
    enabled: !!key && process.env.FINEPRINT_OFFLINE !== '1',
  };
}

const SYSTEM = `You read official contest / hackathon rules and extract what an entrant must know.
Return ONLY a JSON object, no prose, in this shape:
{"title": string, "items": [{"section": "deadlines"|"eligibility"|"deliverables"|"judging"|"gotchas",
  "summary": string (<= 18 words, plain English, imperative where possible),
  "quote": string (an EXACT, contiguous, word-for-word excerpt copied from the rules that supports the summary; 8-60 words; do not paraphrase, do not join separate sentences),
  "deadline_text": string (deadlines only: the exact date/time phrase as written, e.g. "October 26, 2026 (5:00 pm Eastern Time)")}]}
Rules: 3-8 items per section. "gotchas" = easy-to-miss conditions that can disqualify or limit an entry
(new-project rules, video host/length, license, one-prize limits, multiple-submission rules).
Skip legal boilerplate (liability, arbitration, taxes). Never invent anything not in the text.`;

function extractJson(content) {
  let s = String(content || '');
  s = s.replace(/<think>[\s\S]*?<\/think>/gi, '');
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1];
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('model returned no JSON');
  return JSON.parse(s.slice(start, end + 1));
}

async function analyzeWithLLM(text, { timeoutMs = 90000 } = {}) {
  const cfg = config();
  if (!cfg.enabled) throw new Error('no API key configured');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(cfg.baseUrl + '/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.key },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.1,
        max_tokens: 4000,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: 'RULES TEXT:\n"""\n' + text.slice(0, 120000) + '\n"""' },
        ],
      }),
    });
    if (!res.ok) throw new Error('AI request failed: HTTP ' + res.status);
    const data = await res.json();
    const parsed = extractJson(data?.choices?.[0]?.message?.content);
    if (!Array.isArray(parsed.items)) throw new Error('model JSON missing items');
    return { mode: 'ai', model: cfg.model, title: parsed.title || null, items: parsed.items };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { analyzeWithLLM, config, extractJson, SYSTEM };
