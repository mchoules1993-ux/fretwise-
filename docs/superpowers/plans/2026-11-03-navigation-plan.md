# Fretwise Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Give Fretwise a homepage and responsive, vertically scrolling section navigation that works without zooming out.

**Architecture:** Keep the static app and existing view router. Add a focused navigation module for the section catalogue, homepage rendering and mobile menu; update the shell and responsive CSS. Existing audio and microphone cleanup stays in the navigation lifecycle.

**Tech Stack:** Plain HTML, CSS, JavaScript; Node regression checks and browser interaction checks where available.

**Spec:** `docs/superpowers/specs/2026-11-03-navigation-design.md`.

## Global Constraints
- No new runtime dependencies or build step.
- Preserve all ten existing section fragments and lesson behavior.
- Preserve the existing dark green palette, fonts and lime accent.
- Follow AGENTS.md: latest main, feature branch, all checks passing, PR; owner merges. Publish only when requested.
- Implement directly in this session; no parallel agents are needed for the tightly connected shell and router changes.

## Review Focus
- Short desktop windows: the last navigation item must be reachable by scrolling.
- Phone landscape and enlarged zoom: menu and close control remain reachable.
- Keyboard: focus stays inside the open panel; Escape and focus restoration work.
- Existing direct links and browser history: the right lesson and active navigation stay in sync.
- Audio and mic: changing sections still cleans them up; Home never starts either.

### Task 1: Homepage and responsive navigation

**Files:** Create `site/navigation.js`, `tests/navigation.cjs`; modify `site/index.html`, `site/app.js`, `site/style.css`.

**Interfaces:** `homeView(): string` renders section cards. `setupNavigation(): void` binds the persistent shell once. `closeSectionMenu(restoreFocus = true): void` closes the panel and releases focus/scroll constraints. The existing `navigate(view)` and `render()` functions continue to own section changes and cleanup; add `home` to the supported views and default state.

- [x] Refresh the latest main through Git; if shell network remains unavailable, use the GitHub connector to retrieve exact current source and commit metadata before preparing the branch. Confirm no open preceding task and preserve all current listening changes.
- [x] Run the four existing AGENTS.md regression commands and confirm a clean baseline.
- [x] Write `tests/navigation.cjs` behavioral checks for Home listing all ten valid routes, bare URL opening Home, direct links opening their section, navigation stopping audio/listening, and invalid fragments failing safely. Run and observe expected failures before implementation.
- [x] Add the catalogue and `homeView()` in `site/navigation.js`, loaded before `app.js`; use normal section links and existing `navigate()` behavior without audio autoplay.
- [x] Update the shell with brand/Home link, persistent phone header, Sections toggle, close button and backdrop. Use meaningful labels, aria-expanded/controls and an accessible panel name.
- [x] Implement panel lifecycle in `setupNavigation()` and `closeSectionMenu()`: open/close, selection, backdrop, Escape, focus containment/restoration, background inertness and scroll locking; reset mobile state when crossing to desktop.
- [x] Update routing/rendering for Home, current-section highlighting and Back/Forward. Do not let hash-only browser navigation trigger duplicate cleanup or lose the target section.
- [x] Consolidate conflicting sidebar media rules in `style.css`. Use bounded dynamic viewport height, nonshrinking controls, a min-height:0 scroll region with overflow-y:auto and visible scrollbar, and a narrow-screen side panel. Retain 44px minimum touch targets and reduced-motion support.
- [x] Run navigation checks and verify they pass. Exercise phone-menu focus, dismissal and scroll behaviors in the browser when browser QA tooling is available; report any unavailable verification explicitly.
- [x] Check desktop 1280×600, phone 390×844, phone landscape 844×390, and a narrow layout equivalent to enlarged zoom: reach the bottom menu item, open every section, dismiss the panel and use Home. Confirm audio Stop remains usable after menu dismissal.

### Task 2: Validation and review handoff

**Files:** Modify `site/releases.js`, `README.md`, `AGENTS.md`; add the approved spec and plan under `docs/superpowers/`.

- [x] Update the feature catalogue and README to describe the implemented navigation; record the task and PR status in AGENTS.md without claiming it is merged or published.
- [x] Run `node tests/audio-regression.cjs`, `python3 tests/validate_audio_assets.py`, `node tests/chord-shapes.cjs`, `node tests/listen.cjs`, and `node tests/navigation.cjs`; inspect all results.
- [x] Review the full diff against the spec, especially focus behavior, short-screen overflow, history and microphone cleanup. Run syntax and whitespace checks.
- [x] Refresh main before pushing. Resolve any changes and repeat affected checks. Commit and push the feature branch; open a PR with behavior, validation and any browser-verification limit. Leave merging and publication to the owner's requested workflow.

## Self-review
Both selected design elements are covered by Task 1. Each review-focus condition has an explicit behavior or viewport check. The four existing test commands include the new listening module. No audio asset rebuild, dependency installation, lesson rewrite or live deployment is required.

## Execution evidence

All four existing regression checks plus `tests/navigation.cjs` pass. Chromium navigation checks pass at 1280×600, 390×844, 844×390, 640×400 and 320×568. Independent review found a skip-link routing regression; the browser test reproduced it before the fix and passed afterward. Source transport uses the GitHub connector because shell Git cannot reach its proxy. The isolated clone preserves the original checkout. PR #13 was merged by the owner; publication remains separate.
