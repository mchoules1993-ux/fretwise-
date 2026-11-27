# Working on Fretwise

Two AI assistants (Claude and ChatGPT) work on this project, at different
times. The owner gives each one a task. These rules stop their work from
clashing. Read this whole file before starting any task.

## The main rule: one task at a time

Fully finish one feature or bug fix before anyone starts the next.

A task is **finished** only when all of these are true:

1. The change is on a branch, the tests pass, and it is pushed.
2. A pull request (PR) is open and has no merge conflicts.
3. The owner has **merged** it into `main`.
4. The handoff log at the bottom of this file is updated.

Until then, no one (neither AI) starts other work. If the owner hasn't
merged the last PR yet, remind them before starting anything new.

## How to do a task

1. **Start from the latest `main`.** Fetch it first. Never build on an old
   copy or on another branch.
2. **Check the handoff log below.** If the last task isn't marked merged,
   stop and tell the owner.
3. **Make a new branch** for this one task.
4. **Do only what was asked.** No extra changes, clean-ups or renames unless
   the owner agrees. If you spot something else worth doing, mention it to
   the owner instead.
5. **Run the tests** (see below). All must pass.
6. **Just before pushing, fetch `main` again.** If it has moved, merge it into
   your branch, fix any conflicts, and run the tests again.
7. **Push and open a PR** with a short, plain explanation of what changed and
   how you checked it.
8. **Add an entry to the handoff log**, in the same PR.
9. **Don't edit `main` directly.** The owner merges PRs.

## Project layout

- `site/` is the **real app**: hand-written HTML, CSS, JavaScript and audio.
  It is not build output. There is no build step. Edit these files directly.
  (It used to be called `dist/`. Don't recreate `dist/`.)
- `scripts/` holds the Python scripts that rebuild the audio files in
  `site/assets/audio/`. They need an external sample cache (see README).
  Only run them if the task is about audio assets.
- `tests/` holds the checks that must pass before any PR.

## Running and testing

```bash
# Run the site locally, then open http://localhost:8000
python3 -m http.server 8000 --directory site

# Tests (all must pass)
node tests/audio-regression.cjs
python3 tests/validate_audio_assets.py
node tests/chord-shapes.cjs
node tests/listen.cjs
node tests/navigation.cjs
node tests/theme.cjs
node tests/path.cjs
node tests/metronome.cjs
node tests/rhythm-library.cjs
```

Optional browser check (needs Playwright and Chromium):
`node tests/metronome-browser.cjs` runs the metronome at desktop and phone sizes.
`node tests/rhythm-library-browser.cjs` runs the rhythm trainer at desktop and phone sizes.

## Publishing the live site

Live site: https://fretwise-guitar-studio.mchoules1293.chatgpt.site

**Merging into `main` does not update the live site.** Publish manually
only when the owner asks. Any chat with repository and Sites access can
follow this checklist.

1. Fetch `origin/main` and record its full commit SHA. Use a clean checkout
   of that exact commit for both testing and packaging.
2. Run every required check under **Running and testing**. Stop if a check
   fails and report the failure before publishing.
3. Confirm that the tested commit is still the latest `origin/main`. If
   `main` advanced, repeat the checks on the new commit. Upload the contents
   of `site/` from the tested commit to the existing Fretwise Site.
4. Open the live URL, verify the affected feature, and play a sample to
   confirm audio works. Report any issue or check you could not complete.
5. Add the commit SHA, Sites version, and verification results to the
   handoff log through a PR. Give the owner the live URL, commit SHA,
   Sites version, and verification results.

## Handoff log

Newest at the top. One short entry per task: date, who, what changed,
PR, and status (open / merged / published).

- 2026-11-27 · ChatGPT · Documented the manual release checklist for the existing Fretwise Site. · `codex/release-checklist` · open
- 2026-11-27 · ChatGPT · Published `main` commit `5daaeecd35c343173a259d0a61e22beae74c0f1f` as version 19. All nine required checks passed; verified that the live rhythm library matches the source. · published
- 2026-11-27 · Claude · Rhythm library, phase 1a: the Rhythm page trainer now has 21 rhythms in 2/4, 3/4, 4/4, 6/8 and 12/8 (new `site/rhythm-library.js`), from the five basic patterns (kept first, in order, for the Practice path) to genre styles such as 4/4 blues shuffle (swung), power ballad, reggae skank, waltz, polka, jig and 12/8 slow blues. Pick a time signature, then a rhythm; tempo 40–220 with –/+ and tap, accented clicks, count-in on/off, 1–8 bars, sound choice, tap practice for any rhythm. New required check `tests/rhythm-library.cjs`, optional `tests/rhythm-library-browser.cjs` (passed at 1280×800, 390×844, 844×390 and 320×568). Agreed order next: 1b irregular signatures (9/8, 5/4, 7/8) and more genres → strum mapping → Game → Microphone; then the Half / ¾ / Full speed buttons. Found, not fixed: at 320 px the header's Sections button sticks out 20 px on every page (also on `main`). Design and plan in `docs/superpowers/`. · mchoules1993-ux/fretwise-#31 · merged and published
- 2026-11-26 · Claude · Added a standalone metronome: a “♩ Metronome” button in the audio bar on every page opens a panel with 40–220 BPM (–/+, slider, tap tempo), time signatures 2/4–12/8 with accents and beat lights. It keeps going across sections and key changes, and stops when anything else plays, on Stop audio, when the page is hidden or the microphone starts. Settings saved in the browser only. New required check `tests/metronome.cjs` and optional `tests/metronome-browser.cjs` (passed at 1280×800, 390×844, 844×390 and 320×568). Next agreed task: Half / ¾ / Full speed buttons for licks and studies. · mchoules1993-ux/fretwise-#28 · merged
- 2026-11-16 · ChatGPT · Published `main` commit `599305819a192e0d76da1909f9d4a2692221b31e` as version 17; all seven required checks passed. · published
- 2026-11-16 · Claude · Owner asked for every open PR to be merged. Merged #25. Brought the three old conflicting PRs into `main` through one PR: the version 15 and 16 deployment notes (#20, #22), and the microphone Start/Stop fix (#18), re-applied on top of the tuner so both the note game and the tuner show “Cancel microphone request” while permission is pending. `tests/listen.cjs` now also runs the 21 microphone lifecycle checks plus two tuner ones. · mchoules1993-ux/fretwise-#26 · merged
- 2026-11-16 · Claude · Added the Practice path: 24 short steps in six stages, from tuning up to a first solo. Each step opens its lesson already set up; a bar above and below the lesson has “Done · next step”. Progress is saved in the browser only. New Home card, first item in the section menu, and new required check `tests/path.cjs`. Step ids in `site/path.js` are saved in players’ browsers, so don’t rename them. · mchoules1993-ux/fretwise-#25 · merged
- 2026-11-11 · Claude · Added a tuner to “Fretwise listens” (a Find the note / Tuner switch): standard tuning only, finds the open string you play, shows a needle and cents flat/sharp, says tighten or loosen, and has six tap-to-hear reference strings. Reuses the existing pitch detector. New tuner checks in `tests/listen.cjs`; all six checks passed, plus desktop and phone browser runs with a fake microphone. · mchoules1993-ux/fretwise-#24 · merged
- 2026-11-05 · ChatGPT · Added sampled-guitar recordings to all four Simple Soloing Rule tabs: Play/Stop, four-beat count-in, note highlighting and WAV downloads at each written tempo. Six required checks and desktop/phone browser playback/export checks passed. · mchoules1993-ux/fretwise-#23 · merged
- 2026-11-05 · ChatGPT · Published `main` commit `15bf0c18f11481f51bba019207bfa6685e7868f3` as version 16; all six regression checks passed. · published
- 2026-11-05 · ChatGPT · Added fine Legends tempo control (40–125%, matching playback and WAV export) and four Jam Room soloing tabs with style guidance and accessible note lists. · mchoules1993-ux/fretwise-#21 · merged and published
- 2026-11-05 · ChatGPT · Published `main` commit `0b9d28370c99298c5979955743122b8eb8a20cae` to Fretwise as version 15; all six regression checks passed. · published
- 2026-11-05 · Claude · Restyled the whole app in the owner's orange amp look (from a Canva design): new colours, Barlow fonts, drawn line icons, faceplate panels, new home page. Colours moved from JS into CSS; new check `tests/theme.cjs`. No feature changes. · mchoules1993-ux/fretwise-#19 · merged and published
- 2026-11-03 · ChatGPT · Made Fretwise listens cancellation reliable: old permission requests cannot restart or disrupt a newer listener; Stop and setup failures release microphone resources; pending requests show Cancel. Added 21 lifecycle checks; all five required checks, five navigation browser layouts and two Chromium microphone layouts passed. · mchoules1993-ux/fretwise-#18 · merged (2026-11-16, joined with the tuner code in mchoules1993-ux/fretwise-#26)
- 2026-11-03 · Claude · Arranged backing tracks: light loop-safe room reverb on every stem, and a simple delta-style turnaround (root drone, upper note stepping ♭7–6–♭6–5) in the last I-chord bar of After midnight, Dusty road shuffle and Open road. Same instruments, keys, tempos and lengths; funk vamp unchanged apart from the reverb. Owner approved by ear in a listening test first. · mchoules1993-ux/fretwise-#17 · merged and published
- 2026-11-03 · ChatGPT · Published `main` commit `2479cd95475cf19f853c8d233396bff2951a1ce1` to Fretwise as version 14; all five regression checks passed. · published
- 2026-11-03 · ChatGPT · Added a section-card homepage, scrolling desktop menu and phone Sections panel with keyboard focus and browser history; includes navigation regressions. · mchoules1993-ux/fretwise-#13 · merged and published

- 2026-11-03 · ChatGPT · Published `main` commit `99b61ab14c33da2120895b7c0cdb9c315f80d71b` to Fretwise as version 13; all four regression checks passed. · published
- 2026-11-03 · Owner · Published `main` commit `38307bea96aa39ae2966552af3a54e69a304d293` (includes “Fretwise listens”) to the live site. Recorded by Claude from the owner’s report. · published
- 2026-11-03 · Claude · Added “Fretwise listens” (section 09, a trial): asks for A, C or E, listens through the microphone, shows the note heard and confirms a match; says when it can’t hear clearly instead of marking wrong. New test `tests/listen.cjs`. · mchoules1993-ux/fretwise-#10 · merged and published
- 2026-10-28 · ChatGPT · Published `main` commit `ee3a9b3883057872ed200c6ed3f7a1f06d6ff1ed` to Fretwise as version 12; all three checks passed. · published
- 2026-10-28 · Claude · Jam room now names notes from the current chord and scale, so A7 shows C♯ (not D♭) on the fretboard and in “land on”. Added a check to `tests/audio-regression.cjs`. · mchoules1993-ux/fretwise-#8 · merged and published
- 2026-10-27 · Claude · Added chord shape diagrams (finger numbers, open/muted strings, barres) to Chord progressions, Harmony and the Jam room; new test `tests/chord-shapes.cjs` checks all 12 roots × 6 chord types. · mchoules1993-ux/fretwise-#7 · merged and published
- 2026-10-26 · ChatGPT · Published `main` commit `d705637350a8a58de0776b8ecb01156122f65a92` to the existing Fretwise Site as version 11, using the exact contents of `site/`. Both regression checks passed. · published
- 2026-10-26 · ChatGPT · Published `main` commit `203bcfc8e1884e558bf8bf085b10782acba8e53d` to the existing Fretwise Site as version 10, using the exact contents of `site/`. Both regression checks passed. · published
- 2026-10-24 · ChatGPT · Published `main` commit `6a1135ffac327ccceaf80fe7e48a4f108d1ada3a` to the existing Fretwise Site as version 9, using the exact contents of `site/`. Both regression checks passed. · published
- 2026-10-26 · ChatGPT · Rewrote harmony explanations for guitar players; added play-and-listen examples and YouTube links for C major and A minor. · mchoules1993-ux/fretwise-#5 · merged and published
- 2026-10-26 · ChatGPT · Added five faster Legends studies (112–140 BPM), tabs, tips and credits; verified practice speeds and WAV downloads. · mchoules1993-ux/fretwise-#4 · merged and published
- 2026-10-20 · Claude · Added this rules file (`AGENTS.md`) and `CLAUDE.md`. · mchoules1993-ux/fretwise-#2 · merged, not yet published
- 2026-10-20 · Claude · Renamed `dist/` to `site/`. · mchoules1993-ux/fretwise-#1 · merged, not yet published
- 2026-10-20 · ChatGPT · Fixed Jam Room navigation for arranged tracks. · merged, not yet published
