# Rhythm library and strumming — design and roadmap

Status: direction agreed with the owner on 2026-11-27. Subtask 1 (rhythm
library) is next. Each subtask is its own branch and PR, one at a time (AGENTS.md).

## Why

Fretwise teaches single notes and note lengths. Its Rhythm page has only five
fixed 4/4 patterns. The owner wants a library of **rhythmic patterns** in common
time signatures and styles (waltz, blues shuffle, old-style reggae skank…) to
listen to and practise. **Strumming patterns are then mapped onto those
rhythms**. The owner likes https://rhythm-practice.vercel.app/ (rhythm selection,
Practice mode, Game mode). That site could not be opened from the build
environment; we worked from the owner's screenshots. We copy ideas, not its
sheets, names, text, layout or code, and keep Fretwise's orange amp look.

## Roadmap (owner's order)

1. **Rhythm library** — patterns in several time signatures and styles; listen,
   count and tap them on a single guitar note. *(this subtask)*
2. **Strum mapping** — the same patterns as strums: chord picker, down/up arrows,
   strummed sound, plus named strum patterns. Lives on a Strumming tab on the
   Rhythm page.
3. **Game mode** — accuracy, combo, Easy/Normal/Hard, calibration.
4. **Microphone** — score real playing through the microphone (trial first).

Waiting after these, as agreed: Half / ¾ / Full speed buttons for licks and studies.

## One data model for all four

Each pattern has a time signature, a style, a grid and a list of hits. The
listening view, the notation and (later) strumming, game and microphone
scoring all read the same data. Strum direction is added in subtask 2 by a rule
(on the beat = down, off the beat = up) that a style can override (a skank is
up-strokes on the off-beats; a chuck is a muted stroke).

## Subtask 1: rhythm library

### Goals

- Replace the five fixed patterns in “Your rhythm trainer” with a library of
  about 22 patterns. The five existing ones stay first, in the same order and with
  the same names, so the Practice path keeps working.
- Time signatures: 2/4, 3/4, 4/4, 6/8, 9/8, 12/8. (5/4 and 7/8 left out for now.)
- Styles, at least:
  - 4/4: rock eighths, pop push, ballad, tresillo (3+3+2), old-style reggae
    skank, funk 16ths, blues shuffle.
  - 3/4: waltz (oom-pah-pah), country waltz, folk 3.
  - 2/4: polka, march.
  - 6/8: ballad, jig.
  - 9/8: slip jig.
  - 12/8: slow blues, 12/8 long-short (shows the link to the shuffle).
- Pick a pattern by time signature, then by name. Each pattern shows its
  notation, count, style note and a hint. Each has its own starting tempo.
- Practice controls: Hear & count, tap practice (as today, now for any pattern),
  Stop, tempo 40–220 with –/+, slider and tap tempo, count-in bar on/off,
  number of loops, and a sound choice of click and rhythm, rhythm only or click only.
- The click accents follow the time signature: strong on beat 1, medium on the
  start of each group, weak on the rest. This is the same rule the metronome uses.

### Decided calls

- **BPM counts every click, like the metronome.** In x/4 a click is a
  quarter note. In x/8 a click is an eighth note, so 6/8 has 6 clicks per bar
  in groups of 3. The hint says this in plain words.
- **Shuffle is written as eighths with a “swung” mark** and played long-short
  on a triplet grid. No triplet brackets.
- **Notation stays in today's box style** (a note symbol per box, box width =
  length, rests shown), with dotted notes and eighth rests added. Joined beams
  and proper staff notation are left for later. This keeps every time signature
  readable now.
- **Sound:** one guitar note (A, as today), accented hits a little louder.
- **The rest of the Rhythm page** (note lengths, rests and the guitar steps) is unchanged.

### Non-goals (later subtasks)

Strumming, chords, arrows, game scoring, microphone, 5/4 and 7/8, saving your
own patterns, staff notation with beams.

### Anti-goals

- Breaking the Practice path steps that open the rhythm trainer.
- Breaking the metronome, or letting two sounds play at once.
- Copying the reference site's content.

### Constraints

No build step. No colours in JS (`tests/theme.cjs`). Works at 320 px wide with
no page scroll sideways. Saved settings stay in the browser only. All AGENTS.md tests
pass, plus a new required `tests/rhythm-library.cjs`. Handoff entry in the same PR.
