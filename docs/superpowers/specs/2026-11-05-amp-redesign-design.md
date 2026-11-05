# Fretwise redesign: orange amp look

Date: 2026-11-05 · Status: draft, waiting for owner review

## Why

The owner finds the current look generic ("vibe coded"): near-black
background, lime-green accent, Space Grotesk + DM Sans, identical rounded
cards with icon tiles, and Unicode symbols as icons.

The owner chose a Canva homepage design in an "orange valve amp / gig poster"
style. A screenshot of it is saved next to this file as
`2026-11-05-amp-redesign-reference.webp`. This spec turns that one homepage
into a look for the whole app.

## What stays the same

- Every feature, section, sound file, route (`#scales`, `#jam`, …) and
  keyboard behaviour.
- The navigation structure from PR #13: sidebar on desktop, "Sections" panel
  on phones, browser history. Only its styling changes.
- All element `id`s and the class names the tests use (`listen-board`,
  `intro`, etc.).
- Section text and lesson content. Only the home page wording changes (see
  below).
- No build step. Still plain HTML, CSS and JavaScript in `site/`.

## Colours

Taken from the Canva screenshot, then adjusted where text would be too hard
to read.

| Token            | Hex       | Used for |
|------------------|-----------|----------|
| `--orange`       | `#cb572a` | Large orange areas with only big headings on them, note dots, accents |
| `--orange-deep`  | `#a9441e` | Orange areas with normal-size text on them; orange text on cream |
| `--cream`        | `#f3e6c8` | Main page background, faceplate panels |
| `--ink`          | `#1e1611` | Main text, borders, dark buttons |
| `--ink-soft`     | `#6b5a48` | Secondary text on cream |
| `--black`        | `#181411` | Dark bands, sidebar, backing-track player (with grille texture) |
| `--gold`         | `#d29d3f` | Buttons and highlights on dark bands; "blue" notes on the fretboard |
| `--wood`         | `#af7748` | Fretboard wood |

Contrast checks (WCAG AA needs 4.5:1 for normal text):

- Cream on `#cb572a` is only 3.4:1, so the bright orange carries large
  headings only (3:1 is enough for large text).
- Cream on `#a9441e` is 4.9:1, which is fine for body text.
- Ink on cream is 14.4:1. Gold on black is 7.5:1. Soft ink on cream is
  5.3:1.

The page commits to this single look. There is no separate dark mode.

## Type

- **Headings:** Barlow Condensed, weight 700, sentence case. It is the closest
  free match to the condensed bold lettering in the Canva design.
- **Body and controls:** Barlow, weights 400, 500 and 600.
- **Small labels** (like "The channels" in the design): Barlow 600, 12px,
  uppercase with letter spacing, in `--orange-deep` on cream or cream on dark.
  Use them sparingly, one per block at most.
- Both fonts load from Google Fonts with system fallbacks. They replace Space
  Grotesk and DM Sans.

## Surfaces and shapes

- **Faceplate panel:** cream with a 1.5px `--ink` border, a 6px radius and a
  hard offset shadow (`5px 5px 0 var(--ink)`). Use it only for the main tool
  on each page (for example the fretboard explorer or the jam player), as in
  the design.
- **Plain panel:** cream with a 1.5px `--ink` border, no shadow. Use it for
  secondary blocks.
- **Section cards** (home page): the Canva "channel" card. Bordered, with a
  top strip holding a line icon, then the title and one line of text.
- **Dark band:** `--black` with a faint crosshatch grille texture made in
  CSS, for the backing-track player, the audio status bar and the sidebar.
- **Buttons:** primary is an `--ink` fill with cream text and a 3px radius.
  On dark bands it is a `--gold` fill with ink text. Secondary is an outlined
  ink button. Text links are underlined.
- **Icons:** the Unicode symbols (▦ ♬ ⇄ ◈ ▶ ♫ ♩ ★ ◉ ☷) are replaced with
  simple drawn line icons (inline SVG, `currentColor`) in
  `site/navigation.js`.

## Layout, page by page

**Sidebar (desktop):** a dark band with grille texture and cream text. The
active section shows in orange with a small orange lamp dot. The brand is
"FRETWISE" in Barlow Condensed, the same as in the design. Group headings
stay.

**Phone header:** an orange bar with the brand and the "Sections" button. The
Sections panel uses the same dark styling as the sidebar.

**Home:**
1. An orange hero with the heading "Find the notes. Make it music.", one
   short paragraph, a dark "Open the jam room" button and an underlined
   "Explore the fretboard" link. On the right sits a cream faceplate with
   corner screws holding a small static fretboard showing real notes. It
   stacks under the text on phones.
2. A slim dark band with three short facts (free to use, learn by ear, built
   for guitarists).
3. A cream area with the three existing section groups as Canva-style
   channel cards.

**Section pages:** each page opens with an orange band (deep orange) holding
the existing section title and intro text. Below it, on cream, the main tool
sits in a faceplate panel and other blocks sit in plain panels.

**Fretboards** (scale explorer, jam room, chord shapes, listen mode): wood
board, cream strings, dark frets, orange root notes with cream text, cream
scale notes with ink text, and gold for the notes that are orange today (the
"colour" notes such as ♭7 and blue notes). The hard-coded colours in
`site/app.js` and `site/listen.js` move to CSS classes or variables, so the
colours live in one place (`style.css`).

**Audio status bar** ("Ready to practise" / "Stop audio"): a dark band.

## Motion

None added. Existing hover and focus states are kept, restyled.

## Accessibility

- A visible focus ring on every control (2px `--ink` on cream, 2px `--gold` on
  dark).
- The contrast rules above.
- `prefers-reduced-motion` keeps working as today.

## Testing and checks

- All five existing checks must pass (`AGENTS.md`).
- Screenshots of all 11 views at desktop (1400px) and phone (390px) widths,
  before and after, attached to the PR.
- A quick check that no page scrolls sideways at 390px.
- The microphone (listen mode) and audio playback are tried by hand in the
  browser.

## Out of scope

- No new features, sections or audio changes.
- No rewording of lesson content.
- No publishing to the live site. That is a separate step, done when the
  owner asks.

## Small extra (owner to confirm)

The handoff log still marks PR #17 as "open", but it is merged. Fix that one
line in the same PR.
