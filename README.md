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
- Legends: five distinct phrasing studies for SRV, Hendrix, Page, Clapton and Moore, including three adapted public-domain motifs, song-study links, shuffle/triplet/sixteenth timing, and appropriate backing
- Four original arranged backing tracks with synchronized guitar/bass/drum stems, live mixer, count-in, MP3 downloads and chord-following note guides
- Release list: complete implemented-feature catalogue, section links and release history
- Persistent audio Stop/status, audio-clock lick loops, readable phone beat panels, responsive layouts, keyboard access and optional browser-assistant scale setup

## Run locally

The site is plain HTML, CSS and JavaScript with no build step or paid APIs. Serve the `dist` directory with any static web server.

For example:

```bash
python3 -m http.server 8000 --directory dist
```

Then open `http://localhost:8000`.

## Live site

https://fretwise-guitar-studio.mchoules1293.chatgpt.site

Audio sample sources and licenses: `dist/assets/audio/CREDITS.txt`. The bundled bank avoids runtime third-party dependencies.

## Rebuild the audio assets

Requires Python 3 with numpy/scipy and ffmpeg. Keep the full source cache outside the repository.

```bash
python scripts/build_audio_assets.py --cache /absolute/path/to/audio-cache
python scripts/render_backing_tracks.py --cache /absolute/path/to/audio-cache
```

`dist/assets/audio/studio/provenance.json` records each source file and SHA-256.
All newly bundled sample libraries are CC0; source licenses are retained alongside them.
The bass library uses transposing key labels; preparation maps its B1-labelled sample
(which sounds at approximately 31 Hz) to MIDI 23, B0.
Arranged backings have fixed key/tempo; transposable loops remain available separately.
