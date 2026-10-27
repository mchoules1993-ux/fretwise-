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
```

## Publishing the live site

Live site: https://fretwise-guitar-studio.mchoules1293.chatgpt.site

**Merging into `main` does not update the live site.** Publishing is a
separate, manual step: upload the contents of `site/` to the host. Only
publish when the owner asks, and always publish from the latest `main`.
After publishing, add a line to the handoff log saying which commit went live.

## Handoff log

Newest at the top. One short entry per task: date, who, what changed,
PR, and status (open / merged / published).

- 2026-10-27 · Claude · Added chord shape diagrams (finger numbers, open/muted strings, barres) to Chord progressions, Harmony and the Jam room; new test `tests/chord-shapes.cjs` checks all 12 roots × 6 chord types. · mchoules1993-ux/fretwise-#7 · open
- 2026-10-26 · ChatGPT · Published `main` commit `d705637350a8a58de0776b8ecb01156122f65a92` to the existing Fretwise Site as version 11, using the exact contents of `site/`. Both regression checks passed. · published
- 2026-10-26 · ChatGPT · Published `main` commit `203bcfc8e1884e558bf8bf085b10782acba8e53d` to the existing Fretwise Site as version 10, using the exact contents of `site/`. Both regression checks passed. · published
- 2026-10-24 · ChatGPT · Published `main` commit `6a1135ffac327ccceaf80fe7e48a4f108d1ada3a` to the existing Fretwise Site as version 9, using the exact contents of `site/`. Both regression checks passed. · published
- 2026-10-26 · ChatGPT · Rewrote harmony explanations for guitar players; added play-and-listen examples and YouTube links for C major and A minor. · mchoules1993-ux/fretwise-#5 · merged and published
- 2026-10-26 · ChatGPT · Added five faster Legends studies (112–140 BPM), tabs, tips and credits; verified practice speeds and WAV downloads. · mchoules1993-ux/fretwise-#4 · merged and published
- 2026-10-20 · Claude · Added this rules file (`AGENTS.md`) and `CLAUDE.md`. · mchoules1993-ux/fretwise-#2 · merged, not yet published
- 2026-10-20 · Claude · Renamed `dist/` to `site/`. · mchoules1993-ux/fretwise-#1 · merged, not yet published
- 2026-10-20 · ChatGPT · Fixed Jam Room navigation for arranged tracks. · merged, not yet published
