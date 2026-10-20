---
doc: scope
status: draft
---
<!-- Proposed by Ros's agent (Hustle) on 2026-10-19 without a live interview.
     Ros: read it, change anything, then set status: approved. -->

# Fineprint

Paste a contest's official rules (or its URL) and get a deadline-and-deliverables checklist
where every line is backed by a verbatim quote from the rules — and see whether one project
can be entered into two contests.

## The Unique Kernel
**Every checklist item carries the exact sentence from the rules that it came from, and the app
mechanically verifies that the quote really exists in the source.** Anything the AI says that
can't be found word-for-word in the rules is flagged instead of trusted. Second beat: put two
rule sets side by side and get a "can I stack these?" answer built only from quoted clauses.

## Who It's For
A solo builder entering online hackathons and challenges (Devpost has ~4,200 people in this
one hackathon alone). Today they skim 4,000-word rules pages, miss a "video must be on YouTube"
or "project must be new" clause, mis-convert "5:00 pm Eastern" to their own timezone, and get
disqualified or lose hours. Asking a chatbot gives a summary they can't trust.

## The Core Loop
Open Fineprint → paste rules URL or text → in seconds see: deadlines in *your* timezone with a
countdown, eligibility, required deliverables, judging criteria, and gotchas — each with a
"✓ quote verified" badge; click any item to jump to the highlighted sentence in the source.
Tick items off as you prepare. Come back for every new contest; add a second contest to compare.

## Inspiration & Identity
Feels like a careful paralegal, not a chatbot: calm paper-white workspace, monospace quotes,
highlighter-yellow evidence, green/amber verification badges. Plain, trustworthy, fast.

## Why This Matters to the Learner
(Ros to fill in. Agent's note: this exact problem came up while preparing this entry.)

## What "Working" Looks Like
Paste the Build With AI: Basics rules URL → a checklist appears with "Submission deadline:
Oct 26, 2026 4:00 PM CDT (6d 23h left)", "Public repo with open-source license", "Video < 3
min on YouTube or Vimeo", each with a verified quote. **The "oh, that's cool" beat:** add the
Nebius hackathon rules → Fineprint shows that neither rule set forbids entering the same
project elsewhere, but Nebius requires YouTube-only video and a hosted demo URL while Basics
requires a brand-new project — all quoted.

## The POC Boundary
- Input: paste text, or a URL fetched server-side.
- Extraction into five sections (deadlines, eligibility, deliverables, judging, gotchas).
- Quote verification + click-to-highlight in the source.
- Deadline conversion to the viewer's timezone with countdown.
- Compare two rule sets.
- Works with an OpenAI-compatible model (default: NVIDIA Nemotron on Nebius Token Factory),
  and with a clearly labelled offline (no-AI) heuristic mode when no key is set.
- Checklist ticks remembered in the browser.

## Later
Calendar (.ics) export, email reminders, browser extension, PDF upload, tracking rule changes.

## Explicitly Cut
- Accounts/sync — not needed to prove the kernel.
- Legal advice — Fineprint quotes, it doesn't interpret law; says so in the UI.
- Auto-submitting or filling forms — out of scope and risky.
