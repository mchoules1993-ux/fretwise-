# Strumming practice (task 1: patterns + Practice mode) — design

Status: draft, waiting for owner approval.

## Why

Fretwise teaches single notes and note lengths. The owner wants strumming,
because strumming is where rhythm matters most: a strum pattern only works if
the timing is right. The owner likes https://rhythm-practice.vercel.app/
(pattern list, Practice mode, Game mode). That site could not be opened from
the build environment; this design is based on three screenshots the owner
sent. We copy ideas, not code, wording or look. Fretwise keeps its own orange
amp theme.

## Goals

- Add a **Strumming** tab on the existing Rhythm & beats page (`site/rhythm.js`),
  next to the note-length lessons. The lessons stay as they are.
- 12–15 original strum patterns in 4/4, from easy to hard (all down-strums,
  eighths "D DU", the pop strum "D DU UDU", off-beat/skank, 16th funk, muted
  "chuck" strums).
- Each pattern shows: down/up arrows, notation, the count under it (1 & 2 &),
  and a hint for the strumming hand.
- Pick a chord (A, Am, C, D, E, Em, G and a few 7ths). Show its diagram with the
  existing `chordDiagram` / `chordShape()` from `site/chords.js`.
- **Hear the strum**: play the chord's notes a few ms apart. Down = low string
  to high string. Up = high to low, softer, fewer strings.
  Muted strokes are short and dry. Uses the existing guitar samples (`sampleVoice`).
- **Practice mode**: Play/Stop, tempo (40–200 BPM: –/+, slider, tap tempo),
  count-in bar, loop, a click / guide / both choice, a highlight that moves
  along the pattern, "hover or tap a note to see how long it lasts".

## Non-goals (later tasks, each its own PR)

- Game mode: accuracy, combo, Easy/Normal/Hard, calibration, key or tap scoring.
- Scoring real strums through the microphone (needs a trial first).
- Swing, triplets, 6/8, 3/4. My own saved patterns, copy/edit, export/import.
- Changing the existing note-length lessons or their tap practice.

## Anti-goals

- Don't copy the other site's pattern sheets, names, text, layout or code.
- Don't break the metronome, the Fretwise listens tuner or the Practice path.
  Rhythm audio must stop when anything else plays, like the rest of the app.
- Don't ship anything that looks like it scores real guitar playing. Task 1 only plays and shows.

## Constraints

- No build step: hand-written HTML/CSS/JS in `site/`. Must work on phones.
- Existing notation code (`noteSymbol`) draws single notes with flags only.
  This task needs joined beams for eighths and sixteenths, plus arrows.
- Reuse the shared audio: `getAudio`, `stopAudio`, `status`, `sampleVoice`.
- Saved settings stay in the browser only. Don't rename existing saved ids.
- AGENTS.md: all listed tests pass, new required test for this feature, handoff entry in the same PR.

## Approaches considered

1. **Tab inside the existing Rhythm page (picked).** Rhythm already owns the
   beat engine and tap code. No new Home card, section menu or navigation test
   changes. Cost: the page file grows; keep strumming in its own file
   (`site/strum.js`) to avoid that.
2. A new "Strumming" section. Cleaner page, but more changes to navigation,
   Home, the section menu and their tests, for no extra teaching value.
3. Replace the Rhythm page. Loses lesson content the owner likes.

## Plan of the how (builder's calls, owner can override)

- New `site/strum.js` holds the pattern data, drawing, and playback. It is loaded
  after `rhythm.js`. `rhythm.js` only gets the tab switch.
- A pattern is a list of strokes on a 16-step grid (`{step, dir:'D'|'U', mute?, ghost?}`);
  rests are empty steps. Arrows and the count are drawn from the same data.
- Beaming drawn in SVG: groups of eighths or sixteenths inside a beat share a beam.
- Strum timing: 12–18 ms between strings (my call, tune by ear). Up strokes use
  the top 3–4 strings at lower volume.
- New required check `tests/strum.cjs`: every pattern is valid on the 16-step
  grid, every chord resolves to a shape, strum notes are in tuning (E2 A2 D3 G3 B3 e4) and
  within the chord's notes, down goes low→high and up goes high→low.
  Optional browser check at desktop and phone sizes, like the metronome.

## Open question for the owner

The handoff log says the next agreed task after the metronome is
**Half / ¾ / Full speed buttons for licks and studies**. Do strumming first,
or that one first? (One task at a time.)

## What the owner should check

- Is Practice mode first, Game and microphone later, the right split?
- Is a tab on the Rhythm page OK (not a new section)?
- Calls I made: strum timing, 40–200 BPM, 12–15 patterns, the chord list.
