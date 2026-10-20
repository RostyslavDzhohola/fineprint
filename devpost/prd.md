---
doc: prd
status: draft
---
<!-- Proposed by Ros's agent (Hustle) on 2026-10-19. Ros: review, then set status: approved. -->

# Fineprint — Product Requirements

A one-page web app for solo hackathon/contest entrants that turns official rules into a
quote-verified checklist and compares two contests. Source: `scope.md > The Unique Kernel`,
`scope.md > Who It's For`.

## The Core Journey
1. The entrant opens Fineprint (one page). An empty state explains: "Paste a rules page URL or
   the rules text." A "Try an example" button loads a bundled sample rules text.
2. They paste a URL (or text) into **Contest A** and press **Read the fine print**.
3. A progress line shows "Reading… (Nemotron on Nebius)" or "Reading… (offline mode)".
4. The **Checklist** appears in five sections: Deadlines, Eligibility, What to submit,
   How it's judged, Gotchas. Each item = short plain-English line + verification badge.
5. Deadlines show the original wording, the time converted to the viewer's timezone, and a
   live countdown ("6d 23h left"; red when < 48h; "passed" when over).
6. Clicking an item scrolls the **Source** pane to the quoted sentence and highlights it.
7. They tick items as done; ticks survive a page reload.
8. Optional: they fill **Contest B** and press **Compare** → a **Can I stack these?** panel
   lists: clauses about multiple submissions / using the project elsewhere, conflicts
   (e.g., video host, "new project only" vs "existing allowed"), and both deadlines in order.
   Success = the entrant knows exactly what to do, by when, and can prove each item from the rules.
(`scope.md > The Core Loop`, `scope.md > What "Working" Looks Like`)

## Screens and Layout
One screen. Top bar: name, mode badge (AI model name or "Offline mode — no AI"), timezone.
Left column: Contest A / Contest B inputs (tabs) and the Source pane. Right column: Checklist,
then the Compare panel when two contests are loaded. On narrow screens the columns stack.

## Look and Feel
Paper-white background, near-black ink text, one highlighter-yellow for quoted evidence,
green "✓ verified quote" and amber "⚠ quote not found" badges. Serif headings for a document
feel, monospace for quotes. Calm, spacious, no gradients or chat bubbles.
(`scope.md > Inspiration & Identity`; agent proposal — Ros to confirm.)

## Features and Behavior

### Reading the rules
- Accepts a URL (fetched server-side, HTML converted to text) or pasted text (up to ~120k chars).
- [ ] A Devpost rules URL produces readable text in the Source pane.
- [ ] Pasted text is used as-is.

### Quote-verified checklist
- Every item has: section, plain-English summary, verbatim quote, verified flag.
- A quote is "verified" only if it appears in the source after whitespace/quote-mark
  normalization. Unverified items are kept, visually marked amber, and sorted last in their section.
- [ ] Every item shows a badge; at least one test proves a fabricated quote is flagged.
- [ ] Clicking an item highlights that sentence in the Source pane.

### Deadlines in your timezone
- Recognizes dates like "October 26, 2026 (5:00 pm Eastern Time)", "Oct 30, 2026 10:00 am PT",
  "@ 5:00pm EDT"; converts to the viewer's timezone; shows a live countdown.
- [ ] "October 26, 2026 (5:00 pm Eastern Time)" displays as Oct 26, 2026 4:00 PM CDT for a
  Chicago viewer.

### Checklist ticks
- [ ] Ticking an item and reloading keeps the tick (per contest).

### Can I stack these? (compare)
- Shows multiple-submission / originality clauses from both, side-by-side conflicts, and the
  earlier deadline first. Always quotes; never a bare yes/no verdict without quotes.
- [ ] Basics + Nebius rules: shows "new project only" (A) vs "existing projects allowed if
  significantly updated" (B) and "YouTube or Vimeo" (A) vs "YouTube" (B).

## States and Boundaries
- **First use / empty** — explainer + "Try an example".
- **No AI key configured** — runs offline heuristic extraction; header badge says so plainly.
- **AI call fails** — falls back to offline mode and shows "AI unavailable, showing offline results".
- **URL fetch fails** — message asks to paste the text instead.
- **Nothing found** — section shows "Nothing found — check the source".
- **Persists** — only checklist ticks (browser storage). Rules text is not stored on a server.

## Product Decisions
- (Agent proposal) Quote verification is mechanical, not AI-judged — trust comes from the source.
- (Agent proposal) Offline mode exists so the app always works and the AI is optional, not magic.
- (Agent proposal) Not legal advice; a footer says so.

## What We're Building
Everything in Features and Behavior above, on one screen, runnable locally with `npm start`.

## Deferred From the POC
Calendar export, reminders, PDF upload, saved contest library — none needed to prove the kernel.

## Possible Later Enhancements
Browser extension on Devpost pages; watch a rules page for changes; team checklists.

## Non-Goals
Accounts, payments, auto-submission, legal interpretation.

## Open Questions
- Ros to confirm the name "Fineprint" and the idea itself (blocks submission, not the build).
