# Tempo and Soloing Examples Implementation Plan

> Execute inline with the executing-plans workflow.

**Goal:** Fine tempo control for Legends and four practical Jam Room style tabs.
**Architecture:** Extend the shared lick speed setting and reuse the existing tablature renderer with original Jam Room example data.
**Tech Stack:** Plain HTML, CSS, JavaScript; existing Node and Python checks.
**Spec:** `docs/superpowers/specs/2026-11-05-tempo-soloing-design.md`

## Constraints and review focus

Preserve the orange amp theme, existing preset speeds and pitch. Prevent stale playback after tempo input, preserve slider focus, show BPM on phones, keep tabs within their container and ensure every landing note belongs to its stated chord.

## Steps

- [x] Extend `tests/audio-regression.cjs` with slider input, arbitrary-speed playback/export and four example chord-tone checks; observe failure.
- [x] In `site/licks.js`, add the Legends slider, live speed/BPM updates and validated 40–125% input; retain shared scheduling/export.
- [x] In `site/backing.js`, define four original two-bar examples and `soloingExamples()` using `lickTab()`. Insert it into the existing box in `site/app.js`; add scoped layout rules to `site/style.css`.
- [x] Run all six checks from `AGENTS.md`; inspect desktop and phone rendering if browser tooling is available.
- [ ] README and handoff log updated; remote main rechecked; feature committed locally. Push, create the PR and verify mergeability after explicit user approval. The owner handles merging and publication.

## Verification and decisions

All six required checks pass. Browser checks pass at 1400, 390 and 320 pixels for tempo input, focus retention, cancellation, preset reset, BPM labels, all four examples and keyboard disclosure operation. A source reviewer verified the chord targets and identified missing accessible note lists and an obsolete CSS variable; both are fixed. A failing accessibility check passed after adding shared Notes and timing rendering.

The pre-existing Sections header overflows at 320 pixels with fallback fonts; reproduced using the unchanged main stylesheet. The new lesson content fits. This unrelated header issue is recorded for the owner rather than changing navigation in this feature PR. Audio was exercised in Chromium but not auditioned on a physical device.

Latest main was retrieved and verified, including the merged orange amp redesign (PR #19). The six required checks and the new browser checks were rerun after the review fixes.

Publication handoff: automatic approval review rejected pushing the branch to the public GitHub repository, including a retry after confirming repository permissions and AGENTS.md instructions. No push, PR, merge or live deployment occurred. Explicit user approval is required to upload the completed source, tests and documentation.
