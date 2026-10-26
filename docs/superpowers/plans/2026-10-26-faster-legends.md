# Faster Legends Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add five faster, original Legends studies with working practice playback and downloads.

**Architecture:** Append phrase data to the existing Legends array and reuse its
renderer and Web Audio player. Update catalogue copy and credits with no new assets.

**Tech Stack:** Plain JavaScript, HTML, Web Audio, Node regression harness, Python audio validation.

**Spec:** `docs/superpowers/specs/2026-10-26-faster-legends-design.md`

## Global Constraints

- Five new original two-bar A-based studies, one per existing player, 112–140 BPM.
- Retain existing five studies and their indices, 60/75/100% practice speeds and pitch.
- No new dependencies, audio assets, Jam Room tempo changes or publishing work.
- Develop on a feature branch; run both repository checks; push and open a PR.

## Review Focus

- Fast legato and bend durations must fit each note at full tempo.
- Mobile and wide tabs must describe all ten phrases without broken SVG or numbering.
- Playback and WAV exports must use selected speed and the correct phrase.
- A7/A-minor accompaniment must match each phrase's teaching notes.
- Existing indices and slow-study exports must retain their behavior.

## Task 1: Add and verify the five faster studies

**Files:** `site/licks.js`, `site/app.js`, `site/releases.js`,
`site/assets/LEGENDS-CREDITS.txt`, `README.md`, `tests/audio-regression.cjs`, `AGENTS.md`.

**Interfaces:** consume the existing `LEGEND_LICKS` schema and
`playBluesLick(index)` / `downloadBluesLick(index, button)`; produce ten studies
with new entries at indices 5–9, retaining all existing controls.

- [x] Extend the existing regression harness to require a faster study per player,
  exercise all five new indices at 60/75/100%, check count-in/phrase durations,
  generated tabs, effective BPM and a fast WAV download.
- [x] Run `node tests/audio-regression.cjs`; expect failure because fast studies are absent.
- [x] Append the five original studies, label them, fix two-digit numbering and
  update the Legends intro, release list, README and credits.
- [x] Run `node tests/audio-regression.cjs` and
  `python3 tests/validate_audio_assets.py`; both must exit 0 with PASS.
- [x] Review the diff and rendered page; commit changes and handoff entry.
- [x] Fetch main again, verify no conflict and push the feature branch.
- [ ] Open a PR: blocked by the environment's HTTP CONNECT 403 for api.github.com.

## Execution evidence

The regression test first failed because the five faster studies were absent,
then passed after implementation. Both repository checks and real Chromium
desktop/phone validation passed, including all five studies at 60/75/100% and
all five real stereo WAV exports with correct durations and non-silent audio.
A fresh code review found one Hendrix double-stop annotation inherited by an
unchanged note. A new failing tab test demonstrated it; the extra note now
explicitly clears the hammer-on marking. No other implementation issues found.
