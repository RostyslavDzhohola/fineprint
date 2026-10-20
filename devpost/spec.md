---
doc: spec
status: draft
---
<!-- Proposed by Ros's agent (Hustle) on 2026-10-19. Ros: review, then set status: approved. -->

# Fineprint — Technical Spec

## How This Works, In Plain Language
Fineprint is a small Node.js program that serves one web page. When you paste a URL, the
program downloads the page and strips it down to plain text. Then it reads the text in one of
two ways: **AI mode** sends it to an AI model (by default NVIDIA Nemotron running on Nebius
Token Factory) and asks for a checklist where every item must include an exact quote;
**offline mode** splits the text into sentences and sorts them with keyword rules — no AI.
Either way, a **verifier** then checks every quote against the original text, letter for
letter (ignoring spacing and curly quotes). The page shows the checklist, converts deadlines to
your timezone, and remembers your ticks in your browser. Compare runs the same reading on two
contests and lines up the clauses that matter for entering both.
Why this shape: no database, no framework, no build step — it starts in one command and the
AI is swappable by changing three settings.

## The Core Journey Through the System
Paste URL → browser `POST /api/analyze {url|text}` → `server.js` fetches + `lib/text.js`
converts HTML to text → `lib/analyze.js` picks AI (`lib/llm.js`) or offline (`lib/heuristics.js`)
→ `lib/verify.js` marks each quote verified/unverified and finds its position →
`lib/dates.js` parses deadline phrases into UTC instants → JSON back to browser →
`public/app.js` renders checklist, countdowns (viewer timezone via `Intl`), highlights.
Compare: `POST /api/compare {a, b}` → analyze both → `lib/compare.js` builds the stack report.
PRD ref: `prd.md > The Core Journey`.

## Stack
- Node.js ≥ 20 (built-in `http`, `fetch`, `node:test`) — zero npm dependencies.
  Docs: https://nodejs.org/docs/latest-v20.x/api/
- Vanilla HTML/CSS/JS front end. Docs: https://developer.mozilla.org/
- AI: any OpenAI-compatible Chat Completions API. Default Nebius Token Factory
  (https://docs.tokenfactory.nebius.com/quickstart), model `nvidia/nemotron-3-super-120b-a12b`
  (256K context, $0.30/$0.90 per M tokens per the public catalog, checked 2026-10-19).
  **Unverified: no Nebius key was available, so the live Nebius call has not been run.**
  The AI path was tested against a local mock OpenAI-compatible server.

## Where It Runs and How Someone Tries It
Local web app. `npm start` → open http://localhost:3000.
Env (all optional, see `.env.example`): `LLM_API_KEY` (or `NEBIUS_API_KEY`), `LLM_BASE_URL`
(default `https://api.tokenfactory.nebius.com/v1`), `LLM_MODEL`
(default `nvidia/nemotron-3-super-120b-a12b`), `PORT`. With no key → offline mode.
Tests: `npm test`. Demo recording: run locally and screen-record the browser.
Deployment optional (Nebius hackathon requires a hosted demo URL; any Node host works).

## Look and Feel
Background #fbfaf7, ink #1d1d1f, highlight #fff3a3, verified #1f7a4d, unverified #b26a00,
danger #b42318. Headings: Georgia/serif; body: system-ui; quotes: ui-monospace. Generous
whitespace, 1px hairline borders, no shadows heavier than subtle. Copy is plain and direct.

## Components

### Server (`server.js`)
Static files + `POST /api/analyze`, `POST /api/compare`, `GET /api/config` (mode + model name,
never the key). Body limit 1 MB. PRD ref: `prd.md > Reading the rules`.

### Text extraction (`lib/text.js`)
HTML → text: drop script/style/nav, turn block tags into newlines, decode entities, collapse
spaces. Sentence splitter used by heuristics and highlighting. PRD ref: `prd.md > Reading the rules`.

### Offline extractor (`lib/heuristics.js`)
Keyword/regex classifier into the five sections; quotes are source sentences, so always
verified. PRD ref: `prd.md > Quote-verified checklist`.

### AI extractor (`lib/llm.js`)
One chat-completion call with a strict JSON instruction; tolerant JSON parsing (strips code
fences / reasoning text). 60 s timeout. PRD ref: `prd.md > Quote-verified checklist`.

### Verifier (`lib/verify.js`)
Normalizes both strings; exact substring match → verified + char offset; otherwise unverified.
PRD ref: `prd.md > Quote-verified checklist`.

### Deadline parser (`lib/dates.js`)
Regex for month-name dates with optional time and US/UTC zone words; converts wall time in an
IANA zone to UTC with `Intl`. PRD ref: `prd.md > Deadlines in your timezone`.

### Compare (`lib/compare.js`)
Topic probes (multiple submissions, new vs existing, video host, repo/license, hosted demo,
eligibility) run against both sources; reports quotes per side + a "differs" flag.
PRD ref: `prd.md > Can I stack these? (compare)`.

### Front end (`public/`)
`index.html`, `styles.css`, `app.js`: inputs, checklist, source pane highlight, countdowns,
localStorage ticks, compare panel. PRD ref: `prd.md > Screens and Layout`.

## Data Model
Analysis JSON: `{ mode, model, title, sourceText, items:[{id, section, summary, quote,
verified, offset, deadline?:{iso, original}}] }`. Ticks in localStorage key
`fineprint:<hash of source>` → array of item ids. Nothing stored server-side.

## File Structure
```
fineprint/ (repo root)
├── server.js            # HTTP server + API routes
├── lib/
│   ├── text.js          # HTML→text, sentence split
│   ├── heuristics.js    # offline extractor
│   ├── llm.js           # OpenAI-compatible client (Nemotron on Nebius by default)
│   ├── analyze.js       # picks AI or offline, runs verifier + date parser
│   ├── verify.js        # quote verification
│   ├── dates.js         # deadline parsing + timezone conversion
│   └── compare.js       # two-contest stack report
├── public/              # index.html, styles.css, app.js
├── samples/             # bundled example rules text (sample data, labelled)
├── test/                # node:test unit tests + mock LLM test
├── devpost/             # scope.md, prd.md, spec.md, checklist.md, app-map.html
├── .env.example
├── LICENSE              # MIT
└── README.md
```

## External Services and Dependencies
- Nebius Token Factory `POST {LLM_BASE_URL}/chat/completions` with
  `Authorization: Bearer <key>`, body `{model, messages, temperature:0.1, max_tokens:4000}`;
  response `choices[0].message.content`. Key from the free Nebius Builder Program (needs a Nebius
  account — Ros's decision). Cost per analysis ≈ 15k input tokens ≈ $0.005 on Nemotron Super.
- Swappable: any OpenAI-compatible endpoint by changing `LLM_BASE_URL`/`LLM_MODEL`.
- The page fetched by URL (public web).

## Important Failure Modes
- **AI returns invalid JSON / errors / times out** → offline results + notice.
- **AI invents a quote** → item shown amber "⚠ quote not found in rules".
- **Site blocks the fetch** → "Couldn't fetch — paste the rules text instead."

## What Was Simplified and Why
- **Keyword heuristics** instead of a trained classifier for offline mode — enough to prove the
  flow; AI mode gives better summaries.
- **US/UTC zone words only** in the date parser — covers Devpost; full tz database later.

## Decisions and Open Issues
- (Agent) Zero dependencies so judges/Ros can run it with only Node.
- (Agent) Default model Nemotron 3 Super — long context for full rules pages, cheap.
- Genuine uncertainty: does Nemotron Super reliably return verbatim quotes? The verifier makes
  this observable; to check once a key exists: run both sample rules and count amber items.
- Open: live Nebius call untested (no key).
