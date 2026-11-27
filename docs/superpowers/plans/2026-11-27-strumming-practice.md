# Strumming Practice (task 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Strumming tab to the Rhythm page with 12 graded strum patterns, a chord picker, a strummed guitar sound and Practice mode (no Game, no microphone).

**Architecture:** New `site/strum.js` (loaded right after `rhythm.js`) holds pattern data, pure helpers, notation drawing, the view and playback. `rhythm.js` only gains a tab switch and a call to stop strumming. Playback reuses `getAudio`, `stopAudio`, `status`, `sampleVoice` and `lickClick`, and mirrors the structure of `startRhythm`.

**Tech Stack:** Hand-written JS/HTML/CSS in `site/`, Web Audio via the existing sample engine, Node `vm` tests with a fake audio clock (same pattern as `tests/metronome.cjs`). No build step.

**Spec:** `docs/superpowers/specs/2026-11-27-strumming-design.md`

## Global Constraints

- No build step. Edit `site/` files directly. Do not recreate `dist/`.
- Strumming is a **tab on the Rhythm page** (`state.view==='rhythm'`). No new section, Home card or menu item.
- The Rhythm page opens on the existing lessons tab. Existing Practice path steps (`count-four`, `eighths`, `space` in `site/path.js`) must keep working unchanged.
- Tempo range 40–200 BPM. 12 patterns, 4/4 only, 16-step grid (step = one sixteenth).
- Strum gap between strings: 12–18 ms (default 15 ms). Up strokes: top 4 sounding strings only, volume ×0.7 of down.
- No colours in JS (`tests/theme.cjs` bans hex and `rgb()`): use `currentColor` and CSS variables from `style.css`.
- Don't copy the reference site's sheets, names, text, layout or code. Pattern names below are generic.
- Settings live in the browser only; don't rename any existing saved ids.
- Out of scope: Game mode, microphone, swing, triplets, 6/8, 3/4, saving own patterns.
- AGENTS.md: all tests listed in it must pass; new required check `tests/strum.cjs`; handoff-log entry in the same PR; fetch `main` again just before pushing.

## Review Focus

1. **Chords with muted strings** (D, A, Dm: low strings are `-1`): down must skip them, up must not include them, and a strum never ends up empty.
2. **Changing pattern, chord or tempo while playing**: stops cleanly, never two runs at once, and old timers can't restart it.
3. **Leaving the tab or page, Stop audio, starting the metronome or any other sound**: strumming stops and stale frames do nothing.
4. **Audio blocked or not ready** (`getAudio` returns `null` or rejects): clear status message, buttons return to idle.
5. **Space key**: toggles play only on the Strumming tab and never when focus is in a button, select or input; the lessons-tab Space tap behaviour must not change.

---

## File Structure

- Create `site/strum.js` — data (`STRUM_PATTERNS`, `STRUM_CHORDS`, `strumOptions`), pure helpers, notation SVG, `strumView()`, playback, event handlers.
- Modify `site/rhythm.js` — `rhythmOptions.tab`, tab buttons in `rhythmView()`, `stopRhythm()` also stops strumming.
- Modify `site/index.html` — add `<script defer src="/strum.js">` right after `rhythm.js`.
- Modify `site/style.css` — `.strum-*` rules (reuse `.rhythm-*` look, theme variables only).
- Modify `site/releases.js` — new items under the `rhythm` entry of `FEATURE_CATALOGUE`.
- Modify `tests/audio-regression.cjs`, `tests/metronome.cjs`, `tests/navigation.cjs`, `tests/path.cjs` — add `'strum'` after `'rhythm'` in each file list so they still load the whole app.
- Create `tests/strum.cjs` (required), `tests/strum-browser.cjs` (optional).
- Modify `AGENTS.md` (test list + handoff entry) and `README.md` (test list).

---

### Task 1: Patterns and pure helpers

**Files:**
- Create: `site/strum.js`, `tests/strum.cjs`
- Test: `tests/strum.cjs`

**Interfaces:**
- Produces:
  - `STRUM_PATTERNS: {id:string,name:string,level:1|2|3|4,hint:string,strokes:{step:number,dir:'D'|'U',mute?:boolean,ghost?:boolean}[]}[]` — 12 entries, `step` 0–15.
  - `STRUM_CHORDS: {id:string,name:string,pc:number,q:string}[]` — A, Am, C, D, Dm, E, Em, G, A7, D7, E7, Cmaj7 (`pc`/`q` as `chordShape(pc,q)` takes them).
  - `strumOptions = {pattern:0, chord:0, bpm:80, sound:'both', countIn:true, loops:4}` (the tab itself lives in `rhythmOptions.tab`) (`sound`: `'both'|'strum'|'click'`).
  - `strumNotes(chordId:string, dir:'D'|'U', stroke?:{mute?,ghost?}) -> {midi:number,offset:number,volume:number,duration:number}[]` — `offset` in seconds from the stroke time, ascending for `D` and descending-string order for `U`.
  - `strumSchedule(patternIndex:number, bpm:number, {countIn:boolean,loops:number}) -> {t:number,kind:'click'|'stroke',accent?:boolean,stroke?:object,step?:number}[]` — `t` in seconds from run start, sorted.
- Consumes: `chordShape(pc,q)` from `site/chords.js` (frets low E→high e, `-1` muted). Open-string MIDI low→high: `[40,45,50,55,59,64]`.

- [ ] **Step 1: Write the failing tests in `tests/strum.cjs`.** Copy the `studio()` harness from `tests/metronome.cjs` (fake `AudioContext`, element map, timers, same script list plus `'strum'` after `'rhythm'`). Add tests named:
  - `twelve patterns, valid grid`: exactly 12; every `step` an integer 0–15; no two strokes share a step; every pattern has ≥2 strokes; ids unique; levels only 1–4 and non-decreasing across the list.
  - `known strums are exact`: pattern `pop-strum` has steps `[0,4,6,10,12,14]` with dirs `D D U U D U`; `folk-strum` has steps `[0,4,6,8,10,12,14]` with dirs `D D U D U D U`.
  - `every chord resolves`: for each `STRUM_CHORDS` entry `chordShape` returns a shape with at least 4 sounding strings.
  - `down strum goes low to high`: `strumNotes('g','D')` has strictly rising `midi` and rising `offset`; MIDI values equal open-string MIDI + fret for the G shape `[3,2,0,0,0,3]` → `[43,47,50,55,59,67]`.
  - `up strum goes high to low, top four only, softer`: `strumNotes('g','U')` has 4 notes, falling `midi`, first note is the high e (67), volume of each is 0.7 × the matching down volume.
  - `muted strings are skipped`: `strumNotes('d','D')` has no note below MIDI 50 and exactly 4 notes; `strumNotes('a','U')` has 4 notes and none is the muted low E.
  - `mute and ghost strokes`: a `mute` stroke returns ≤3 notes with `duration` ≤ 0.08; a `ghost` stroke has volume ≤ 0.4 × normal.
  - `schedule at tempo extremes`: at 40 and 200 BPM the last offset inside any stroke is less than one sixteenth (`60/bpm/4`) and the schedule is sorted ascending.
  - `schedule shape`: with `countIn:true, loops:4` the first 4 entries are clicks with accent on the first only, then strokes; total bars = 5; with `countIn:false` the first entry is at `t=0`.

- [ ] **Step 2: Run `node tests/strum.cjs`.** Expected: FAIL (`STRUM_PATTERNS is not defined` or file not found).

- [ ] **Step 3: Implement the data and helpers in `site/strum.js`.** Start the file with `'use strict';`. Pattern list (write the `strokes` arrays yourself; the two strums above are pinned, the rest only need to match the name and level):
  - Level 1: `quarter-downs` (D on every beat), `two-big-downs` (D on 1 and 3), `eighth-downs` (D on every eighth).
  - Level 2: `down-up-eighths` (alternating D U on every eighth), `down-down-up` (D, then D U on each of the next beats, your choice of a simple one), `pop-strum` (pinned), `folk-strum` (pinned).
  - Level 3: `offbeat-ups` (U on every "&"), `chuck-2-4` (D on 1 and 3, muted D on 2 and 4), `syncopated-down` (one clear syncopation on the "&" of 2).
  - Level 4: `sixteenth-down-up` (D U on every sixteenth), `funk-16ths` (accented D/U with muted `ghost` strokes between).
  Each `hint` is one plain sentence for the strumming hand. `strumNotes` builds MIDI from open-string MIDI + fret, drops `-1` strings; `D` = low→high with `offset = i*0.015`; `U` = top 4 sounding strings high→low, volume ×0.7; `mute` = at most 3 notes, `duration` 0.06; `ghost` = volume ×0.35. Base volume 0.2, duration 0.9 s for open strokes. `strumSchedule` puts one click per beat (accent on beat 1 of each bar), count-in bar first when asked, then `loops` bars of strokes at `step*60/bpm/4`, clicks continuing through every bar.

- [ ] **Step 4: Run `node tests/strum.cjs`.** Expected: all tests pass, ends with `strum: ok`.

- [ ] **Step 5: Commit.** `git add site/strum.js tests/strum.cjs` then `git commit` with message `Add strum patterns and helpers` (plus the attribution lines from the session).

---

### Task 2: Notation drawing

**Files:**
- Modify: `site/strum.js`
- Test: `tests/strum.cjs`

**Interfaces:**
- Consumes: `STRUM_PATTERNS`.
- Produces: `strumNotation(patternIndex:number) -> string` (HTML: one `<svg class="strum-score">` plus a count row), and `strumDescription(patternIndex:number) -> string` (plain text for screen readers, e.g. `Beat 1 down, beat 2 and up, …`).

- [ ] **Step 1: Add failing tests:** for every pattern, `strumNotation(i)` contains exactly one arrow element (`class="strum-arrow"`) per stroke, with `data-dir`; contains the 16-step count labels `1 e & a 2 e & a …` text from a `strum-count` row with numbers `1 2 3 4` marked `numbered`; contains no `#rrggbb` or `rgb(`; for `eighth-downs` there are 4 beams (`class="strum-beam"`), for `quarter-downs` none, for `sixteenth-down-up` 8 beams (two per beat). `strumDescription` for `pop-strum` equals `Beat 1 down, beat 2 down, 2-and up, 3-and up, beat 4 down, 4-and up.` (adjust the exact wording once, then pin it).

- [ ] **Step 2: Run `node tests/strum.cjs`.** Expected: new tests FAIL.

- [ ] **Step 3: Implement `strumNotation` and `strumDescription`.** One SVG per bar: staff line, 4/4 mark, a note stem and notehead at each stroke step, arrow above each stroke (down = ↓ path, up = ↑ path, `mute` drawn as a small × on the stem, `ghost` as a hollow notehead), beams joining neighbouring strokes that fall on eighth or sixteenth positions inside the same beat, counts below. Colours only via `currentColor` / CSS classes. Make it responsive with `viewBox` and no fixed pixel width.

- [ ] **Step 4: Run `node tests/strum.cjs` and `node tests/theme.cjs`.** Expected: both pass.

- [ ] **Step 5: Commit** `Draw strum notation`.

---

### Task 3: Strumming tab and controls

**Files:**
- Modify: `site/rhythm.js` (`rhythmOptions`, `rhythmView`), `site/strum.js`, `site/index.html`, `site/style.css`, four test loaders listed in File Structure
- Test: `tests/strum.cjs`

**Interfaces:**
- Consumes: Task 1 and 2 outputs; `chordDiagram(pc,q,name)` from `chords.js`; `tapTempoBpm(times:number[]) -> number|null` from `metronome.js` (check its exact return when fewer than 2 taps and use it as-is).
- Produces: `strumView() -> string` (HTML for the whole tab body); `rhythmOptions.tab: 'lessons'|'strum'` (default `'lessons'`); buttons with `data-rhythm-tab="lessons|strum"`; control ids `strum-pattern`, `strum-chord`, `strum-tempo`, `strum-bpm-down`, `strum-bpm-up`, `strum-tap`, `strum-sound`, `strum-countin`, `strum-loops`, `strum-play`, `strum-stop`; `setStrumBpm(value:number) -> number` clamps to 40–200 and returns the stored value.

- [ ] **Step 1: Add failing tests:** `lessons tab is the default and unchanged` (open view `rhythm`; html contains `Your rhythm trainer` and not `strum-play`); `strum tab shows pattern list, chord diagram and controls` (set `rhythmOptions.tab='strum'`, render; html contains all control ids above, a `chord-diagram` svg, and the first pattern name); `setStrumBpm clamps` (10→40, 500→200, 97→97); `changing chord updates the diagram aria-label`; `strokes show their length` (each arrow in `strumNotation` has a `title` and `data-length` such as `1 beat` or `½ beat`, and clicking a stroke writes that length to `#audio-status`); `practice path steps still open the lessons tab` (run the existing path step setup for `count-four` then render: html contains `Your rhythm trainer`).

- [ ] **Step 2: Run `node tests/strum.cjs`.** Expected: new tests FAIL.

- [ ] **Step 3: Implement the tab.**
  - `rhythm.js`: add `tab:'lessons'` to `rhythmOptions`; at the top of `rhythmView()` output a two-button segmented switch (reuse the existing `.segmented` class) and return `strumView()` when the tab is `'strum'`, otherwise today's markup unchanged. Add a click handler branch for `data-rhythm-tab` that stops audio, sets the tab and calls `render()`.
  - `strum.js`: `strumView()` shows the pattern list grouped by level as buttons (not just a select) plus the selected pattern's notation, hint and description; chord select with `chordDiagram`; tempo controls as listed; sound select (Click and strum / Strum only / Click only); count-in checkbox; loops select (1, 2, 4, 8, 16); Play and Stop buttons; the existing `#audio-status` element for messages.
  - Handlers for the controls update `strumOptions` and re-render the affected part; tap tempo keeps the last 4 taps and calls `tapTempoBpm`.
  - `index.html`: add the script tag. Add `'strum'` after `'rhythm'` in the four test loaders.
  - `style.css`: `.strum-*` rules reusing `.rhythm-*` spacing, existing variables only; single column on phones, no horizontal page scroll at 320 px.

- [ ] **Step 4: Run `node tests/strum.cjs`, `node tests/path.cjs`, `node tests/navigation.cjs`, `node tests/theme.cjs`.** Expected: all pass.

- [ ] **Step 5: Commit** `Add the Strumming tab and controls`.

---

### Task 4: Playback, stopping and keyboard

**Files:**
- Modify: `site/strum.js`, `site/rhythm.js` (`stopRhythm`)
- Test: `tests/strum.cjs`

**Interfaces:**
- Consumes: `strumSchedule`, `strumNotes`, `getAudio()`, `stopAudio()`, `status(text)`, `sampleVoice(ctx,midi,when,duration,volume,'clean',true)`, `lickClick(ctx,when,strong,track)`, `audioError`, `playing` (global flag the app already uses).
- Produces: `async startStrum() -> void`, `stopStrum() -> void`, `strumRun: null | {ctx,start,generation,schedule,index}`. `stopRhythm()` in `rhythm.js` also calls `stopStrum()` guarded with `typeof stopStrum==='function'`, so `stopAudio()` stops strumming.

- [ ] **Step 1: Add failing tests** (fake clock, record every `sampleVoice` and click call by wrapping them in the sandbox):
  - `play schedules the clicks and strokes` — after `startStrum()` with `countIn:true, loops:1, sound:'both'`: 8 clicks (count-in bar + 1 bar) and the pattern's stroke notes at times `start + t`.
  - `sound option` — `'strum'` schedules no clicks; `'click'` schedules no strokes.
  - `second Play press stops` and `Stop button stops` — `strumRun` becomes `null`, `playing` is `false`.
  - `changing pattern, chord or tempo while playing stops the run`, and a later timer flush plays nothing.
  - `stopAudio() stops strumming` and `starting the metronome stops strumming`.
  - `leaving the rhythm view stops strumming` (change `state.view`, call the app's render/navigation path used by other tests).
  - `blocked audio` — make `getAudio` resolve `null`: `strumRun` stays `null`, status text mentions audio, Play button text is back to idle. Also when it rejects: `audioError` is called.
  - `space key` — on the strum tab with `document` as target, Space starts and stops; with target a `button`, `select` or `input` it does nothing; on the lessons tab Space still only taps during rhythm tap practice (existing behaviour).

- [ ] **Step 2: Run `node tests/strum.cjs`.** Expected: new tests FAIL.

- [ ] **Step 3: Implement `startStrum` / `stopStrum`.** Mirror `startRhythm` in `rhythm.js`: call `stopAudio()` first, take a generation number, await `getAudio()`, bail if the generation changed or the view or tab changed. Schedule all audio for the run in one go from `strumSchedule` (clicks via `lickClick`, strokes via `sampleVoice` with `strumNotes`). A `requestAnimationFrame` loop highlights the current step and the current beat dot and ends the run at the last bar. Toggle the Play button text between `▶ Play` and `■ Stop`, and write phase text (`Count in`, `Bar n of N`) to `#audio-status`. `stopStrum` bumps the generation, cancels the frame, clears highlights and sets `strumRun=null`. Add the keydown handler for Space as specified.

- [ ] **Step 4: Run the full required set:** `node tests/strum.cjs`, `node tests/metronome.cjs`, `node tests/path.cjs`, `node tests/navigation.cjs`, `node tests/audio-regression.cjs`. Expected: all pass.

- [ ] **Step 5: Commit** `Play strum patterns with a count-in and click`.

---

### Task 5: Browser check, catalogue, docs and handoff

**Files:**
- Create: `tests/strum-browser.cjs`
- Modify: `site/releases.js`, `AGENTS.md`, `README.md`

**Interfaces:**
- Consumes: everything above. Model the browser script on `tests/metronome-browser.cjs` (Playwright, local `python3 -m http.server` on `site/`).
- Produces: optional check `node tests/strum-browser.cjs`.

- [ ] **Step 1: Write `tests/strum-browser.cjs`.** At 1280×800, 390×844 and 320×568: open the Rhythm page, switch to Strumming, pick a pattern and chord, press Play with a fake audio context if needed (copy how the metronome check handles audio), confirm the notation SVG is visible, no horizontal page scroll (`document.documentElement.scrollWidth <= innerWidth`), and Stop works.

- [ ] **Step 2: Run it.** `node tests/strum-browser.cjs`. Expected: passes at all three sizes. If Playwright is missing, say so in the PR and don't claim it passed.

- [ ] **Step 3: Update the catalogue and docs.** In `site/releases.js` add items to the `rhythm` entry (strum patterns, chord picker, strummed sound, Practice mode controls). In `AGENTS.md` add `node tests/strum.cjs` to the test list and, at the top of the handoff log, an entry: today's date, Claude, what changed, PR link, status `open`. In that entry say Game mode, microphone scoring and the Half / ¾ / Full speed buttons are still waiting, and change the metronome entry (#28) status from `open` to `merged`. Add the test line to `README.md` where tests are listed.

- [ ] **Step 4: Run every required test from AGENTS.md** (`audio-regression`, `validate_audio_assets.py`, `chord-shapes`, `listen`, `navigation`, `theme`, `path`, `metronome`, `strum`). Expected: all pass. Then `git fetch origin main`; if it moved, merge it, fix conflicts and run them again.

- [ ] **Step 5: Commit** `Add strumming docs, catalogue and browser check`, then `git push -u origin claude/fervent-allen-bv0n14`. **Ask the owner before opening the PR.**
