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
- [ ] Review the diff and rendered page; commit changes and handoff entry.
- [ ] Fetch main again, verify no conflict, push the feature branch and open a PR.
