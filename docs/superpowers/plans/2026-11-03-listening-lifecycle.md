# Reliable microphone lifecycle implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this single task inline. Steps use checkboxes for tracking.

**Goal:** A cancelled or failed microphone request cannot activate listening or interfere with a later attempt.

**Architecture:** Give each start attempt its own resource owner. Invalidate ownership synchronously on Stop; release resources on failure and late permission completion. Keep AudioContext resume in the user gesture.

**Tech Stack:** Plain browser JavaScript, Node VM regression checks, Python Playwright browser checks.

**Spec:** `docs/superpowers/specs/2026-11-03-listening-lifecycle-design.md`

## Global constraints

- Work on a new branch from latest main; do not deploy or merge.
- No dependencies, audio asset changes, or pitch-detection changes.
- Preserve user-friendly permission and missing-device errors.

## Review focus

- A late permission result after cancellation must stop its tracks even if resume never resolves.
- Stale errors must leave newer attempts and status alone.
- A context constructor/resume/graph failure must allow retry and release acquired resources.
- Navigation, pagehide and visibilitychange must cancel both active and pending listening.
- Pending and stopped button labels must match their actions.

## Task 1: Own and release each microphone attempt

**Files:** modify `site/listen.js`, extend `tests/listen.cjs`, update the handoff in `AGENTS.md`.

**Interfaces:** Preserve `startListening()`, `stopListening()` and the existing event bindings; use a per-attempt session inside the listening state.

- [x] Add asynchronous regressions using controlled browser API promises. Assert that only the latest attempt activates, stopped tracks stay stopped, errors permit retry and lifecycle events cancel acquisition.
- [x] Run `node tests/listen.cjs`; confirm the new cases fail for the reproduced lifecycle bug.
- [x] Implement ownership, cleanup and the pending Cancel label in `site/listen.js`.
- [x] Run all five checks from AGENTS.md and browser checks, including microphone controls in Chromium with a synthetic input device.
- [ ] Review the complete diff, record the handoff, commit, fetch main again, push and open a conflict-free PR.

## Execution record

- Latest main is `d2879da`; PR #17 is verified merged, although its handoff entry still says open. Correct that entry as part of the required handoff update.
- Baseline reproduction: cancelled request became active; current request was stopped.

- RED: 15 of 21 lifecycle cases failed against the original implementation; GREEN: all 21 passed after the fix, alongside existing pitch/judge checks.
- All five required checks passed. Chromium navigation passed at 1280×600, 390×844, 844×390, 640×400 and 320×568. A separate Chromium smoke test using native AudioContext and synthetic microphone tracks verified cancellation, stale grants, retry, track cleanup and navigation at 1280px and 390px; no browser errors.
- Independent read-only review found no actionable issues; real-device microphone accuracy and Safari permission UI were outside this validation.
