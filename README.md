# Fretwise

Fretwise is an interactive guitar theory studio for learning scales, modes, harmony and chord progressions through the fretboard.

## Features

- Scale explorer in all 12 keys with note and degree labels
- Two-octave guitar tabs and note playback
- Major and natural-minor harmony lessons
- Playable chord progressions with song examples
- Major-scale mode explanations and genre suggestions
- Jam Room with live chord-tone highlighting
- 150 compact CC0 multisamples from Shinyguitar, Black And Blue Basses and Virtuosity Drums; soft/hard layers, alternating takes and guitar release sounds
- Singing lead, warm crunch and clean electric tones with cabinet EQ, compression and delay
- Four original A-minor blues-rock licks with rhythmic tabs, bend/vibrato audio, count-in, slower practice speeds, looping, optional backing and WAV downloads

- Rhythm & Beats: 4/4 note values, counting, rests, five playable patterns and tap practice with timing feedback
- Legends: ten distinct phrasing studies (five foundations and five faster studies at 112–140 BPM) for SRV, Hendrix, Page, Clapton and Moore, including three adapted public-domain motifs, song-study links, shuffle/triplet/sixteenth timing, appropriate backing, and a 40–125% tempo slider with live BPM and matching WAV exports
- Four original two-bar Jam Room soloing tabs for slow minor blues, Texas shuffle, driving blues-rock and clean funk, with counting, technique tips, chord-tone targets, accessible note lists and playable solo-guitar demos. Each demo has a four-beat count-in, synchronized tab highlighting, Stop and WAV download at its written tempo
- Four original arranged backing tracks with synchronized guitar/bass/drum stems, live mixer, count-in, MP3 downloads and chord-following note guides
- Practice path: 24 short steps in six stages, from tuning up to a first solo. Each step opens its lesson already set up, with a bar that says what to do and when it is done. Progress, practice time left and days practised are saved in the browser only
- Home: cards for every section; vertically scrolling desktop sidebar and a Sections side panel for phones and narrow windows, with keyboard focus handling and browser Back/Forward
- Fretwise listens (trial): a standard-tuning tuner that finds the string you play and shows how many cents flat or sharp it is, with tap-to-hear reference strings; plus a note game that asks for A, C or E and listens through the microphone
- Metronome: a button in the audio bar on every page. 40–220 BPM with –/+, slider and tap tempo; time signatures 2/4, 3/4, 4/4, 5/4, 6/8, 7/8 and 12/8 with accented beat 1 and beat lights. It keeps going across sections and stops when anything else plays. Tempo and time signature are saved in the browser only
- Release list: complete implemented-feature catalogue, section links and release history
- Persistent audio Stop/status, audio-clock lick loops, readable phone beat panels, responsive layouts, keyboard access and optional browser-assistant scale setup

## Run locally

The site is plain HTML, CSS and JavaScript with no build step or paid APIs. Serve the `site` directory with any static web server.

For example:

```bash
python3 -m http.server 8000 --directory site
```

Then open `http://localhost:8000`.

## Live site

https://fretwise-guitar-studio.mchoules1293.chatgpt.site

Audio sample sources and licenses: `site/assets/audio/CREDITS.txt`. The bundled bank avoids runtime third-party dependencies.

## Rebuild the audio assets

Requires Python 3 with numpy/scipy and ffmpeg. Keep the full source cache outside the repository.

```bash
python scripts/build_audio_assets.py --cache /absolute/path/to/audio-cache
python scripts/render_backing_tracks.py --cache /absolute/path/to/audio-cache
```

`site/assets/audio/studio/provenance.json` records each source file and SHA-256.
All newly bundled sample libraries are CC0; source licenses are retained alongside them.
The bass library uses transposing key labels; preparation maps its B1-labelled sample
(which sounds at approximately 31 Hz) to MIDI 23, B0.
Arranged backings have fixed key/tempo; transposable loops remain available separately.

## Practice path checks

```bash
node tests/path.cjs
```

Checks that all 24 steps open real lessons in the state their text describes (and that the buttons, licks, chords and frets they name exist), plus progress, saving, damaged or blocked browser storage, the coach bar, the path page and the home card. Step ids in `site/path.js` are saved in players' browsers: do not rename them.

## Rhythm library checks

```bash
node tests/rhythm-library.cjs
```

Checks every rhythm in `site/rhythm-library.js` (complete bars, drawable note lengths, counts, accents per time signature, swing timing) and the Rhythm page trainer: the time-signature filter, tempo controls, count-in, bars, sound choice, tap practice and that playback stops cleanly. The first five patterns are opened by Practice path steps by position: keep them first and in order.

Optional browser check (development-only Playwright and Chromium), at desktop and phone sizes:

```bash
node tests/rhythm-library-browser.cjs
```

## Navigation checks

```bash
node tests/navigation.cjs
```

Optional browser checks require the development-only Python Playwright package and Chromium (set `CHROMIUM_PATH` if needed). They start a temporary localhost server and cover all section cards, browser history, short windows, phone layouts, menu scrolling, keyboard dismissal and focus:

```bash
python3 tests/navigation-browser.py
```

## Tempo and soloing browser checks

With development-only Playwright and Chromium installed:

```bash
python3 tests/practice-browser.py
```

Checks the Legends slider, keyboard focus, playback cancellation, presets,
BPM labels and all four Jam Room style disclosures at desktop and phone widths.
Also checks soloing playback, count-in/highlighting, Stop, switching examples,
navigation cancellation and all four WAV downloads (duration, audible guitar and no clipping).
