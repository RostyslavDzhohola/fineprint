# Fineprint

**Contest rules → a checklist where every line comes with the receipt.**

Paste a hackathon's or contest's official rules (or its URL). Fineprint pulls out deadlines (converted
to your time zone, with a countdown), who can enter, what to submit, how it's judged, and the
easy-to-miss gotchas. Every item carries the exact sentence it came from, and Fineprint
**mechanically checks that the quote really exists in the rules** — anything the AI can't back up
word-for-word is flagged amber instead of trusted. Load a second contest and ask
**"Can I stack these?"** to see, clause by clause, whether one project can go into both.

## Run it

Requires Node.js 20+. No dependencies to install.

```bash
npm start          # → http://localhost:3000
npm test           # unit tests + a mock-AI end-to-end test
```

Without an API key Fineprint runs in **offline mode**: a keyword-rule extractor, no AI, labelled
as such in the header. To turn on AI mode, copy `.env.example` to `.env` and set a key.

## AI: NVIDIA Nemotron on Nebius Token Factory (swappable)

AI mode calls any OpenAI-compatible Chat Completions API. The default is NVIDIA Nemotron 3 Super
(`nvidia/nemotron-3-super-120b-a12b`, 256K context, so a whole rules page fits in one call) on
[Nebius Token Factory](https://docs.tokenfactory.nebius.com/quickstart):

| Variable | Default |
| --- | --- |
| `NEBIUS_API_KEY` or `LLM_API_KEY` | *(unset → offline mode)* |
| `LLM_BASE_URL` | `https://api.tokenfactory.nebius.com/v1` |
| `LLM_MODEL` | `nvidia/nemotron-3-super-120b-a12b` |

Point `LLM_BASE_URL`/`LLM_MODEL` at another provider to swap models. The model is asked for JSON
with verbatim quotes; `lib/verify.js` then checks every quote against the source text. If the AI call
fails or returns bad JSON, Fineprint falls back to offline results and says so.

## How it works

```
browser ──POST /api/analyze──▶ server.js ─ fetch URL → lib/text.js (HTML→text)
                                   ├─ AI:      lib/llm.js (Nemotron via Token Factory)
                                   └─ offline: lib/heuristics.js
                               lib/verify.js  → every quote checked word-for-word
                               lib/dates.js   → "5:00 pm Eastern Time" → real instant
browser ──POST /api/compare──▶ lib/compare.js → stacking report from quoted clauses
```

Nothing is stored on the server. Checklist ticks are saved in your browser (localStorage).
Some sites (including Devpost) block automatic readers; Fineprint tells you to paste the text instead.

## Planning docs

Built with the [Devpost Learn Skill Pack](https://github.com/challengepost/learn-ai-basics):
[`devpost/scope.md`](devpost/scope.md), [`devpost/prd.md`](devpost/prd.md),
[`devpost/spec.md`](devpost/spec.md), [`devpost/checklist.md`](devpost/checklist.md),
[`devpost/app-map.html`](devpost/app-map.html).

`samples/` contains fictional rules written for the "Try an example" button and tests.

Fineprint quotes rules; it is not legal advice.

## License

MIT — see [LICENSE](LICENSE).
