# Sound kit and unlimited loop — design

Status: asked for by the owner on 2026-11-27 (“generate the sound kit, the guitar tone
should be optional too … should be an unlimited loop”). Comes before rhythm library 1b.

## Why
The owner doesn't like the trainer's sound (a guitar note for the rhythm, a beep for the
click) and wants woodblock and other metronome sounds. They also want to loop a rhythm
without limit, to practise soloing over it.

## What
- New `site/sound-kit.js`: one shared kit, used by the rhythm trainer now and the metronome later.
  - Made in code (Web Audio, nothing to download): woodblock, clave, cowbell, rim click, beep.
  - Existing drum samples: snare, hi-hat, kick. Guitar note (A) from the guitar samples.
  - Accents: the strong click is louder and a little higher, the medium one a little louder.
- Rhythm trainer:
  - RHYTHM SOUND picker: woodblock (default), clave, cowbell, rim click, snare, hi-hat, guitar note, off.
  - CLICK SOUND picker: beep (default), woodblock, rim click, cowbell, hi-hat, kick, off.
    These replace the old “Click and rhythm / Rhythm only / Click only” choice.
  - The count-in always clicks (with beep if the click is off).
  - Tap practice: the rhythm sound is silent, the click plays (beep if off).
  - Sound choices are saved in the browser only (`fretwise.rhythm.v1`); blocked storage falls back to the defaults.
  - BARS gains “Until I stop”: the rhythm loops until Stop. In tap practice, Stop then shows the score for the bars played.
  - Bars are now scheduled a little ahead while playing (like the metronome), not all at once.
- The note-length demo buttons keep the guitar note: a woodblock can't show how long a note lasts.

## Not in this task
The metronome's own sound picker (next, reusing the kit). Recorded woodblock/cowbell samples
(only if the code-made ones don't pass the owner's ear). Changing tempo without stopping.

## Calls made (owner can override)
Defaults woodblock + beep; picker lists above; sound levels tuned by Claude, to be checked by ear.
