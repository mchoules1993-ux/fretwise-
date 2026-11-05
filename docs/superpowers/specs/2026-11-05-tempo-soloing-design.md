# Legends tempo and Jam Room soloing examples

Add fine tempo adjustment to Legends and guitar tablature in “A Simple Soloing Rule”. The owner confirmed the examples mean the four Jam Room styles: slow blues, shuffle, blues-rock and funk.

Use the current plain JavaScript app and orange amp design. Extend the existing percentage presets with a Legends slider from 40% to 125% in 1% steps. Display each study's effective BPM. Changes stop current playback; the next Play and WAV download use the selected speed without changing pitch. Keep the slider focused while dragging or using arrow keys.

Add four original two-bar tablature examples inside the existing soloing box. Each names its matching arranged track, key, exact bars/chords, counting feel, technique and chord-tone targets. Expand the current arranged track's example by default; all four remain accessible, including in transposable-loop mode. Use existing desktop and phone tab rendering. These are reading/practice examples, with no new audio assets or player.

## Approaches

Implementation choice: extend the existing shared speed setting instead of introducing independent per-study BPM overrides; this keeps count-in, looping and exports consistent. Use disclosure panels for the four examples instead of a new navigation tab system; this fits the current lesson UI and supports keyboards without extra state.

No backing-track tempo changes, dependencies, audio regeneration or live publication. Deliver a tested PR for the owner to merge under AGENTS.md.
