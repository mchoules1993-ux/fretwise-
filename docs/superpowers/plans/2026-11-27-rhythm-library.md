# Rhythm Library (subtask 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn “Your rhythm trainer” on the Rhythm page into a library of ~21 rhythm patterns in 2/4, 3/4, 4/4, 6/8 and 12/8, in named genre styles (phase 1; 9/8, 5/4, 7/8 come in phase 2), that you can hear, count and tap on one guitar note.

**Architecture:** New `site/rhythm-library.js` (loaded just before `rhythm.js`) holds the meters, the pattern data and pure helpers. It still exports `RHYTHM_PATTERNS`, now built from a step grid, with the same `events` shape (`{b,d,rest}` in clicks) that `rhythm.js` and `tests/path.cjs` already use. `rhythm.js` keeps its lessons and gets a general trainer: any bar length, accents, swing, count-in, loops and sound choice.

**Tech Stack:** Hand-written JS/HTML/CSS in `site/`, the existing sample engine (`sampleVoice`, `lickClick`), Node `vm` tests with a fake audio clock (as in `tests/metronome.cjs`), optional Playwright check.

**Spec:** `docs/superpowers/specs/2026-11-27-rhythm-and-strumming-design.md` (section “Subtask 1”).

## Global Constraints

- Time signatures exactly: 2/4, 3/4, 4/4, 6/8, 12/8 (phase 1). Irregular signatures and more genre examples are phase 2.
- BPM counts every click, as in the metronome: a click is a quarter in x/4 and an eighth in x/8. Tempo range 40–220 (use `clampMetronomeBpm`).
- Accents: strong on click 1, medium on the first click of every other group, weak otherwise. Groups: 2/4 `[2]`, 3/4 `[3]`, 4/4 `[4]`, 6/8 `[3,3]`, 12/8 `[3,3,3,3]`.
- The first five `RHYTHM_PATTERNS` keep today's names and order: Quarter notes, Eighth notes, Long and short, Leave a space, Sixteenth notes. `RHYTHM_PATTERNS[3].events` rests stay at `b:1`. `site/path.js` and `tests/path.cjs` must not need changes.
- Shuffle: written as eighths with a “swung” label, played long-short on a triplet grid.
- Notation stays in today's box style (`.rhythm-score` / `.rhythm-event`), with dotted notes and eighth rests added. No beams.
- Sound: MIDI 69 (A), `'clean'`, volume 0.22, accented hits 0.3.
- No colours in JS. Works at 320 px with no sideways page scroll. Settings in the browser only.
- No strumming, chords, game scoring or microphone in this subtask.
- AGENTS.md: every listed test passes; new required check `tests/rhythm-library.cjs`; handoff entry in the same PR; fetch `main` again just before pushing; ask the owner before opening the PR.

## Review Focus

1. **Practice path steps** `count-four`, `eighths`, `space` (patterns 0, 1, 3 at 70 BPM) still open, show and play the same way: four count-in clicks, then two bars.
2. **Changing the time signature filter** while a pattern from another meter is selected: the selection moves to the first pattern of the new meter and any playback stops.
3. **Fast compound tempos** (12/8 at 220 clicks, 16ths at 220 in 4/4): every note has a positive duration that ends before the next hit, and the schedule is sorted.
4. **Tap practice on swung and x/8 patterns**: expected attacks are at the swung times, and the hit tolerance never exceeds half the shortest gap between attacks.
5. **Long count rows on phones** (12/8 has 24 cells): the row wraps or scrolls inside its own box. The page never scrolls sideways at 320 px.

---

## File Structure

- Create `site/rhythm-library.js` — meters, `RHYTHM_PATTERNS`, pure helpers.
- Modify `site/rhythm.js` — remove the old `RHYTHM_PATTERNS` constant; `rhythmOptions` gains fields; general trainer view, playback and tap practice. The lesson panels stay as they are.
- Modify `site/index.html` — `<script defer src="/rhythm-library.js">` right before `rhythm.js`.
- Modify `site/style.css` — dotted notes, meter/style badges, wrapping count row, phone layout.
- Modify `tests/audio-regression.cjs`, `tests/metronome.cjs`, `tests/navigation.cjs`, `tests/path.cjs` — add `'rhythm-library'` just before `'rhythm'` in each file list. That is the only change to those files.
- Modify `site/releases.js` (the `rhythm` catalogue entry), `AGENTS.md` (test list and handoff), `README.md` (test list).
- Create `tests/rhythm-library.cjs` (required) and `tests/rhythm-library-browser.cjs` (optional).

---

### Task 1: Meters, patterns and pure helpers

**Files:**
- Create: `site/rhythm-library.js`, `tests/rhythm-library.cjs`
- Modify: `site/rhythm.js` (delete the old `RHYTHM_PATTERNS`), `site/index.html`, the four test loaders

**Interfaces:**
- Produces:
  - `RHYTHM_METERS: {id:string, clickDen:4|8, groups:number[], hint:string}[]`
  - `rhythmMeter(id:string) -> meter` (unknown id → 4/4)
  - `meterAccents(id:string) -> ('strong'|'medium'|'weak')[]` (one per click)
  - `RHYTHM_PATTERNS: Pattern[]`, where
    `Pattern = {id, name, meter, style, level:1|2|3, bpm, steps, swing?:true, hint, about, hits:{step,len,accent?}[], clicks, events:{b,d,rest?,accent?}[]}`.
    `steps` = grid steps per click (4 for straight x/4, 3 for swing, 2 for x/8). `clicks` = clicks per bar. `events` is in clicks, covers the whole bar, and fills gaps with rests split at click boundaries.
  - `makeRhythm(def) -> Pattern` (adds `clicks` and `events`)
  - `noteValue(pattern, lenSteps) -> {den:1|2|4|8|16, dotted:boolean} | null`
  - `rhythmCounts(pattern) -> string[]` (one label per grid step)
  - `RHYTHM_TIME_FILTERS = ['all','2/4','3/4','4/4','6/8','12/8']`

- [ ] **Step 1: Write failing tests in `tests/rhythm-library.cjs`.** Copy the `studio()` harness from `tests/metronome.cjs`, with `'rhythm-library'` before `'rhythm'` in the file list. Tests:
  - `meters and accents`: `meterAccents('6/8')` → `strong weak weak medium weak weak`; `'12/8'` has 12 entries with `medium` at 3, 6 and 9; `'3/4'` → `strong weak weak`; the groups match the metronome's for every id both define.
  - `first five patterns unchanged`: names in order; `RHYTHM_PATTERNS[3].events.filter(e=>e.rest).map(e=>e.b)` is `[1]`; every one is 4/4 with `bpm` 70.
  - `library coverage`: 19–23 patterns; ids unique; at least one pattern in every meter; these ids exist: `waltz`, `country-waltz`, `blues-shuffle`, `power-ballad`, `reggae-skank`, `jig`, `slow-blues-12-8`, `tresillo`, `polka`; every pattern name after the first five starts with its time signature (e.g. `4/4 blues shuffle`).
  - `every bar is complete`: for each pattern, hits are inside the bar, don't overlap and are in step order; the sum of `events[].d` equals `clicks`; every event `d > 0`.
  - `every length can be drawn`: for non-swing patterns `noteValue` is non-null for every hit and every rest.
  - `swing is long-short`: `blues-shuffle` has `swing:true`, `steps:3`, and pairs of hits at grid steps 0 and 2 of a beat with lengths 2 and 1.
  - `reggae skank is off the beat`: in 4/4 every hit sits on an "&" (step % 4 === 2) and beats 1–4 are rests.
  - `counts`: `rhythmCounts` gives `1 e & a 2 e & a…` for 4/4 straight, `1 trip let 2 trip let…` for the shuffle, and `1 & 2 & 3 & 4 & 5 & 6 &` for 6/8.

- [ ] **Step 2: Run `node tests/rhythm-library.cjs`.** Expected: FAIL (file not found).

- [ ] **Step 3: Implement `site/rhythm-library.js`.** Pattern names and levels (write the hits yourself; each must sound like its name):
  - 4/4 basics, level 1: the five existing patterns (port their rhythms exactly, with ids `quarter-notes`, `eighth-notes`, `long-and-short`, `leave-a-space`, `sixteenth-notes`).
  - 4/4 styles: `rock-eighths` (accents on 2 and 4), `pop-push` (anticipation on the & of 2), `power-ballad` (driving eighths with accents on 2 and 4, a held half note at the end of the bar), `tresillo` (3+3+2 eighths), `reggae-skank`, `funk-16ths`, `blues-shuffle`.
  - 3/4: `waltz` (three quarters, accent 1), `country-waltz` (quarter, then eighths on 2 and 3), `folk-3` (dotted quarter, eighth, quarter).
  - 2/4: `polka` (accented "&"s), `march` (quarter, two eighths).
  - 6/8: `ballad-6-8` (six eighths), `jig` (quarter-eighth ×2).
  - 12/8: `slow-blues-12-8` (twelve eighths), `long-short-12-8` (quarter-eighth ×4, with an `about` line linking it to the shuffle).
  Each pattern gets a plain one-sentence `hint` (what to count or feel) and a short `about` (where you hear this style). Then delete the old constant from `rhythm.js`, add the script tag and the four loader entries.

- [ ] **Step 4: Run `node tests/rhythm-library.cjs` and `node tests/path.cjs`.** Expected: both pass.

- [ ] **Step 5: Commit** `Add the rhythm library data and helpers` (attribution lines from the session).

---

### Task 2: The library view

**Files:**
- Modify: `site/rhythm.js` (`noteSymbol`, `rhythmView`, change/input handlers), `site/style.css`
- Test: `tests/rhythm-library.cjs`

**Interfaces:**
- Consumes: Task 1 exports; `clampMetronomeBpm(value)`, `tapTempoBpm(times)` from `metronome.js`.
- Produces: `rhythmOptions = {pattern:0, bpm:70, time:'all', sound:'both', countIn:true, loops:2}`; `noteSymbol(den, rest=false, dotted=false)`; control ids `rhythm-time`, `rhythm-pattern` (kept), `rhythm-tempo` (kept, now 40–220), `rhythm-bpm-down`, `rhythm-bpm-up`, `rhythm-tap-tempo`, `rhythm-sound`, `rhythm-countin`, `rhythm-loops`; `selectRhythm(index:number)` sets the pattern and its `bpm` and stops audio; `setRhythmTime(id:string)` sets the filter and, if the current pattern doesn't match, selects the first one that does.

- [ ] **Step 1: Add failing tests:** `trainer shows meter, style and hint` (render `rhythm`; the html contains the pattern's meter, style, hint and one `.rhythm-event` per event); `time filter` (`setRhythmTime('6/8')` → the current pattern's meter is `6/8`; the pattern select lists only 6/8 patterns; `'all'` lists all, grouped by time signature with `<optgroup>`); `selecting a pattern uses its tempo` (`selectRhythm` index of `waltz` → `rhythmOptions.bpm` equals its `bpm`); `tempo buttons clamp` (down at 40 stays 40; up at 220 stays 220); `dotted notes draw a dot` (`noteSymbol(4,false,true)` contains a `circle`); `count row length` (the html has `clicks × steps` `data-rhythm-tick` cells); `path setup is respected` (run the `count-four` step setup, then render: pattern 0 is selected and the tempo shows 70).

- [ ] **Step 2: Run `node tests/rhythm-library.cjs`.** Expected: new tests FAIL.

- [ ] **Step 3: Implement the view.** In the trainer panel: a TIME SIGNATURE select, a RHYTHM select (`<optgroup>` per meter when `all`), a header line showing name · meter · style (with “swung” for swing patterns), the `about` line, the hint, the notation boxes (box `flex` = `d`, label with the length, e.g. “dotted ¼” or “⅛ rest”), the count row from `rhythmCounts` (numbered cells on clicks, group starts marked), the tempo row (–, slider, value, +, Tap), the sound select (Click and rhythm / Rhythm only / Click only), the count-in checkbox, the loops select (1, 2, 4, 8) and the existing Hear & count / Start tap practice / Stop buttons and tap pad. Changing any control calls `stopAudio()` first. Update the small-print line under the buttons so it no longer says “Four count-in clicks, then two bars” when that isn't true. CSS: the count row uses `grid-template-columns:repeat(var(--cells),minmax(0,1fr))` and wraps into two rows below 480 px when there are more than 16 cells; theme variables only.

- [ ] **Step 4: Run `node tests/rhythm-library.cjs`, `node tests/path.cjs`, `node tests/theme.cjs`, `node tests/navigation.cjs`.** Expected: all pass.

- [ ] **Step 5: Commit** `Show the rhythm library in the trainer`.

---

### Task 3: Playback and tap practice for any pattern

**Files:**
- Modify: `site/rhythm.js` (`startRhythm`, `stopRhythm`, `rhythmFeedback`, `tapRhythm`)
- Test: `tests/rhythm-library.cjs`

**Interfaces:**
- Consumes: Task 1 and 2 outputs, `getAudio`, `stopAudio`, `status`, `sampleVoice`, `lickClick(ctx,when,strong,track)`, `audioError`.
- Produces: `rhythmSchedule(pattern, bpm, {countIn, loops, sound}) -> {t:number, kind:'click'|'note', accent?:string, len?:number}[]` (pure; `t` in seconds from the first count-in click, sorted). `startRhythm(practice=false, demo=null)` keeps its signature and uses `rhythmSchedule`. The note-length demo buttons (`data-rhythm-demo`) keep working as before.

- [ ] **Step 1: Add failing tests** (wrap `sampleVoice` and `lickClick` in the sandbox to record calls):
  - `schedule for path patterns is unchanged`: pattern 0 at 70 BPM with the defaults → 4 count-in clicks then 2 bars (8 more clicks), and notes at the same times today's code uses (`when + (bar*4 + b) * 60/70`).
  - `accents follow the meter`: 6/8 with 1 loop → clicks 1 and 4 of the bar are strong/medium (`lickClick` strong=true), the others weak.
  - `swing timing`: `blues-shuffle` at 120 → the second note of the first beat is at 2/3 of a beat.
  - `fast tempos stay clean`: `slow-blues-12-8` and `sixteenth-notes` at 220: every note duration > 0 and ends before the next note's start; the schedule is sorted.
  - `sound and count-in options`: `'rhythm'` → no clicks after the count-in; `'click'` → no notes; `countIn:false` → the first entry is at `t=0`.
  - `loops`: `loops:4` → 4 bars of notes.
  - `tap practice uses the real attacks`: for `blues-shuffle`, `rhythmRun.expected` times equal the note times; the tolerance is ≤ half the shortest gap between attacks and ≤ 0.2 s.
  - `stops cleanly`: changing the pattern, time filter or tempo while playing sets `rhythmRun` to `null`, and a later frame plays nothing; `stopAudio()` and starting the metronome stop it too.

- [ ] **Step 2: Run `node tests/rhythm-library.cjs`.** Expected: new tests FAIL.

- [ ] **Step 3: Implement.** Keep the shape of today's `startRhythm` (stop first, generation guard, `getAudio`, one-shot scheduling, a `requestAnimationFrame` highlight loop). Swap the fixed 4-beat/2-bar numbers for `pattern.clicks`, `rhythmOptions.loops` and `rhythmSchedule`. Accented hits use volume 0.3, others 0.22, note length `len × stepSeconds × 0.94`. The highlight loop uses `clicks × steps` cells. Status shows `Count in: n of N`, then `Bar n of N · beat n`. `rhythmFeedback` stays the same apart from the counts.

- [ ] **Step 4: Run every required test** (`audio-regression`, `validate_audio_assets.py`, `chord-shapes`, `listen`, `navigation`, `theme`, `path`, `metronome`, `rhythm-library`). Expected: all pass.

- [ ] **Step 5: Commit** `Play and tap any rhythm in the library`.

---

### Task 4: Browser check, catalogue, docs and handoff

**Files:**
- Create: `tests/rhythm-library-browser.cjs`
- Modify: `site/releases.js`, `AGENTS.md`, `README.md`

- [ ] **Step 1: Write `tests/rhythm-library-browser.cjs`,** modelled on `tests/metronome-browser.cjs`. At 1280×800, 390×844, 844×390 and 320×568: open `#rhythm`, choose 12/8 then `slow-blues-12-8`, press Hear & count, see the count-row highlight move, press Stop. Check no sideways page scroll (`scrollWidth <= innerWidth`) and no console errors.

- [ ] **Step 2: Run `node tests/rhythm-library-browser.cjs`.** Expected: pass at all four sizes. If Playwright can't run, say so in the PR. Don't claim it passed.

- [ ] **Step 3: Listen by ear.** Serve `site/` and play the waltz, blues shuffle, reggae skank, jig and slow blues at their default tempos. Note anything that doesn't sound like its name, fix it, and list in the PR what was checked by ear.

- [ ] **Step 4: Update the catalogue and docs.** Add the library to the `rhythm` entry in `site/releases.js`. Add `node tests/rhythm-library.cjs` to the test lists in `AGENTS.md` and `README.md`. Add a handoff entry at the top of the log: date, Claude, what changed, PR, `open`. Say subtasks 2–4 (strum mapping, game, microphone) and the Half / ¾ / Full speed buttons are still waiting. Change the metronome entry (#28) to `merged`.

- [ ] **Step 5: Final checks and push.** Run all required tests. Then `git fetch origin main`; if it moved, merge it and run them again. Commit `Add rhythm library docs, catalogue and browser check` and push to `claude/fervent-allen-bv0n14`. Ask the owner before opening the PR.
