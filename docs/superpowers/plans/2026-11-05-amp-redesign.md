# Orange Amp Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the whole Fretwise app in the owner's chosen "orange valve amp" look without changing any feature or behaviour.

**Architecture:** All colour moves into CSS. The SVG builders in `app.js` and `listen.js` stop writing hex colours and emit class names instead. `style.css` is rewritten around the spec's tokens. `navigation.js` gets drawn line icons and the new home layout. A new `tests/theme.cjs` guards the palette, the contrast rules, "no colours in JS" and "no styled class lost".

**Tech Stack:** Plain HTML, CSS and JavaScript in `site/` (no build step), Node `node:assert` tests, Google Fonts (Barlow, Barlow Condensed).

**Spec:** `docs/superpowers/specs/2026-11-05-amp-redesign-design.md` (reference image beside it).

## Global Constraints

- Tokens, exactly: `--orange #cb572a`, `--orange-deep #a9441e`, `--cream #f3e6c8`, `--ink #1e1611`, `--ink-soft #6b5a48`, `--black #181411`, `--gold #d29d3f`, `--wood #af7748`.
- Cream on `--orange` is for large headings only. Body text on orange uses `--orange-deep`.
- Fonts: Barlow Condensed 700 for headings, Barlow 400/500/600 for everything else. No Space Grotesk, no DM Sans.
- Faceplate panel: `1.5px solid var(--ink)`, radius `6px`, `box-shadow: 5px 5px 0 var(--ink)`, on the main tool of each page only.
- One look only. No dark-mode variant.
- Keep every element `id`, every route, and the class names the tests use. Keep the PR #13 navigation behaviour.
- No new motion. Keep `prefers-reduced-motion` handling.
- Lesson copy unchanged. Only the home page wording changes, as the spec lists.
- All checks in `AGENTS.md` must pass, plus the new `node tests/theme.cjs`.

## Review Focus

1. **Phone width (390px):** no page scrolls sideways. Fretboards still scroll inside `.fret-scroll`. Checked in Task 4 with the layout script.
2. **Phone Sections panel open:** the dark panel covers the page, focus is trapped, and Esc closes it. The behaviour is unchanged, but the restyle could hide the close button or the backdrop. Checked by hand in Task 4.
3. **Jam room while playing:** `.jam-note` states (`chord-root`, `chord-tone`, `scale-tone`, `outside`) must stay distinguishable on the wood board. Pinned by the class-coverage check in Task 2, then looked at in Task 4 with the jam running.
4. **Keyboard focus:** every button, link, select and fretboard note shows a visible focus ring on cream, orange and dark backgrounds. Checked by hand with Tab in Task 4.
5. **Listen mode target marker:** the fret-0 ring and the fretted dot must still show after the colours move to classes. Pinned by `tests/listen.cjs` (markup) and checked visually in Task 4.

---

### Task 1: Move SVG colours out of JavaScript

**Files:**
- Create: `tests/theme.cjs`
- Modify: `site/app.js:25-29` (`fretboard`, `tabDiagram`), `site/app.js:50` (`jamFretboard`), `site/listen.js:83-90` (`listenFretboard`)
- Modify: `site/style.css` (temporary rules so the current dark theme still renders until Task 2)

**Interfaces:**
- Produces these SVG class names, which Task 2 styles:
  - Board: `fb-wood` (the board rect), `fb-nut` (the thick first line), `fb-fret`, `fb-fret-num`, `fb-inlay`, `fb-string-name`, `fb-string`.
  - Scale notes: the `<g class="note">` in `fretboard()` gains one of `root`, `color` or `scale`. The circle and text carry no `fill`.
  - Tab: `tab-string-name`, `tab-line`, `tab-cell` (the rect), `tab-fret`, plus `tab-fret root` for root notes.
  - Listen: `listen-target` on the marker circle (open ring or fretted dot). The fretted label text gets `listen-target-label`.

- [ ] **Step 1: Write the failing test** in `tests/theme.cjs`:

```js
'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const site=f=>fs.readFileSync(path.join(__dirname,'..','site',f),'utf8');
// 1. Colours live in CSS only.
for(const f of ['app.js','listen.js','navigation.js','chords.js']){
  assert.doesNotMatch(site(f),/(?<!&)#[0-9a-fA-F]{6}\b|(?<!&)#[0-9a-fA-F]{3}\b(?![\w-])/,`${f} must not hard-code colours`);
}
console.log('theme: ok');
```

Note: the 3-digit pattern must not match `href="#jam"`-style routes. Routes are letters, so `#[0-9a-fA-F]{3}\b` only false-matches a route like `#add`. Check that `site/*.js` has no such route (none today) and keep the pattern.

- [ ] **Step 2: Run it.** `node tests/theme.cjs`. Expected: FAIL, "app.js must not hard-code colours".

- [ ] **Step 3: Implement.** Replace every hex `fill`/`stroke` in the four functions with the class names above. Keep geometry, `stroke-width`, `font-size`, aria labels and `data-*` attributes exactly as they are. In `listenFretboard`, replace the inline `var(--accent)`/`var(--ink)` with the `listen-target` classes. Add matching rules to `style.css` that use today's values (for example `.fb-wood{fill:#171b18}`, `.fretboard .note.root circle{fill:#c1f56b}`), so the site looks the same until Task 2.

- [ ] **Step 4: Run all checks.**
`node tests/theme.cjs && node tests/audio-regression.cjs && node tests/chord-shapes.cjs && node tests/listen.cjs && node tests/navigation.cjs && python3 tests/validate_audio_assets.py`
Expected: all pass, `theme: ok`.

- [ ] **Step 5: Look once.** Serve `site/`, open `#scales`, `#jam` and `#listen`. The fretboards should look the same as before.

- [ ] **Step 6: Commit.** `git add tests/theme.cjs site/app.js site/listen.js site/style.css && git commit -m "Move fretboard and tab colours from JS into CSS classes"`

---

### Task 2: New stylesheet

**Files:**
- Create: `tests/fixtures/styled-classes.txt`
- Modify: `tests/theme.cjs`, `site/style.css` (full rewrite, readable formatting, one rule per line group), `site/index.html` (font link only, if the `@import` moves)

**Interfaces:**
- Consumes: the Task 1 class names.
- Produces: the tokens from Global Constraints on `:root`, plus these shared classes used by Task 3: `.faceplate` (the hard-shadow panel), `.grille` (dark crosshatch band), `.btn.primary`, `.btn` (outlined), `.btn.on-dark` (gold fill), `.home-card` (home section card; `.home-card-top` is its icon strip, `.home-card-icon` holds the icon), `.icon` (the 20px line-icon box).

- [ ] **Step 1: Create the fixture** from the CURRENT stylesheet, before rewriting it. It holds one class name per line: every class that appears in a selector in `site/style.css` AND appears in `site/*.js` or `site/index.html`. Generate it with a short Node one-off and commit the output, not the script. Remove `chapter-number` only if you decide to drop that element. Keep it by default.

- [ ] **Step 2: Extend the test.** Append these checks to `tests/theme.cjs`:

```js
const css=site('style.css');
const root=(css.match(/:root\s*{([^}]*)}/)||[])[1]||'';
const tok=n=>(root.match(new RegExp(`--${n}\\s*:\\s*(#[0-9a-fA-F]{6})`))||[])[1];
const want={orange:'#cb572a','orange-deep':'#a9441e',cream:'#f3e6c8',ink:'#1e1611','ink-soft':'#6b5a48',black:'#181411',gold:'#d29d3f',wood:'#af7748'};
for(const[k,v]of Object.entries(want))assert.equal(tok(k)?.toLowerCase(),v,`--${k} must be ${v}`);
// WCAG contrast
const lum=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(x=>x<=.03928?x/12.92:((x+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];};
const ratio=(a,b)=>{const[x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return(x+.05)/(y+.05);};
for(const[fg,bg,min]of[['cream','orange-deep',4.5],['ink','cream',4.5],['ink-soft','cream',4.5],['orange-deep','cream',4.5],['gold','black',4.5],['cream','black',4.5],['cream','orange',3]])
  assert.ok(ratio(want[fg],want[bg])>=min,`${fg} on ${bg} needs ${min}:1`);
assert.doesNotMatch(css,/Space Grotesk|DM Sans/,'Old fonts must be gone');
assert.match(css,/Barlow\+Condensed|Barlow Condensed/);
const styled=new Set([...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(m=>m[1]));
for(const c of fs.readFileSync(path.join(__dirname,'fixtures','styled-classes.txt'),'utf8').split('\n').filter(Boolean))
  assert.ok(styled.has(c),`.${c} lost its styles`);
```

- [ ] **Step 3: Run it.** `node tests/theme.cjs`. Expected: FAIL, "--orange must be #cb572a".

- [ ] **Step 4: Rewrite `site/style.css`.** Start with the Google Fonts import for Barlow (400, 500, 600) and Barlow Condensed (700), then the `:root` tokens, then base, layout, components and media queries, keeping the current breakpoints (1150px, 960px for the Sections panel, 760px). Apply the spec's "Surfaces and shapes" and "Layout, page by page" sections:
  - The sidebar and Sections panel get `--black` plus grille. The active `.nav` gets orange text and a lamp dot (`::before`, 7px, `--orange`).
  - `.mobile-header` gets an `--orange` background.
  - `.intro` becomes the deep-orange band with cream text and the h1 in Barlow Condensed.
  - `main` gets a cream background. `.panel` becomes the plain panel. The first `.panel` after `.intro` on a page, and `.jam-console`, get the faceplate treatment.
  - `.jam-transport` and the audio status bar get `--black` plus grille, with the gold `.jam-play`.
  - Fretboard classes: wood board, cream strings, `--ink` frets and nut, root `--orange` with cream text, `color` `--gold` with ink text, scale cream with ink text. The jam states follow the same mapping (`chord-root` orange, `chord-tone` gold, `scale-tone` cream at 0.85 opacity).
  - Focus rings: `2px solid var(--ink)`, or `var(--gold)` inside dark areas.
  - The grille: two `repeating-linear-gradient`s at ±45° in `#221c17` over `--black`.
  - Chord diagrams (`.chord-diagram` and its parts) restyle to ink on cream.

- [ ] **Step 5: Run all checks** (the command from Task 1, Step 4). Expected: all pass.

- [ ] **Step 6: Commit.** `git add site/style.css site/index.html tests/theme.cjs tests/fixtures/styled-classes.txt && git commit -m "Restyle Fretwise in the orange amp look"`

---

### Task 3: Line icons and the new home page

**Files:**
- Modify: `site/navigation.js` (`SECTION_GROUPS` icons, `homeView()`, the sidebar link template), `site/index.html` (brand mark: replace the `♯` glyph with the text "FRETWISE"), `site/style.css` (home rules), `tests/navigation.cjs`

**Interfaces:**
- Consumes: `.faceplate`, `.grille`, `.home-card`, `.home-card-top`, `.home-card-icon`, `.icon`, `.btn.primary` from Task 2.
- Produces: `ICONS` (an object in `navigation.js` from view name to an SVG inner-markup string) and `icon(view: string): string`, which returns `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">…</svg>`. `SECTION_GROUPS` entries become `[view]` (the icon field is dropped). Every caller uses `icon(view)`.

- [ ] **Step 1: Write the failing test.** Add to `tests/navigation.cjs`, after the existing home assertions:

```js
const homeHtml=home.element('main').innerHTML;
assert.doesNotMatch(homeHtml,/[▦♬⇄◈▶♫♩★◉☷]/,'Home uses drawn icons, not symbol characters');
assert.match(homeHtml,/Find the notes\. Make it music\./);
assert.match(homeHtml,/href="#jam"[^>]*>Open the jam room</);
assert.match(homeHtml,/href="#scales"[^>]*>Explore the fretboard</);
assert.equal((homeHtml.match(/class="icon"/g)||[]).length>=10,true,'One icon per section card');
```

- [ ] **Step 2: Run it.** `node tests/navigation.cjs`. Expected: FAIL on the symbol-character assertion.

- [ ] **Step 3: Implement.** In `navigation.js`:
  - Add `ICONS` and `icon()` with one simple line drawing for each of the 10 sections and `home`. Use the mockup drawings as a starting point (ladder of dots for scales, stacked dots for harmony, loop arrow for progressions, dial for modes, speaker cone for jam, wave for licks, metronome for rhythm, plectrum for legends, microphone for listen, lines for releases, house for home).
  - Rewrite `homeView()` per the spec's Home section:
    1. `<section class="home-hero">`: the heading "Find the notes. Make it music.", the paragraph "Fretwise is a free guitar theory practice app. Learn the fretboard, hear how harmony works, and turn practice into playing.", `<a class="btn primary" href="#jam" data-view="jam">Open the jam room</a>`, `<a class="text-link" href="#scales" data-view="scales">Explore the fretboard</a>`, and a `.faceplate` with four corner screws holding a small static A minor pentatonic SVG that reuses the `fb-*` classes.
    2. `<div class="home-facts grille">` with three items: "Free to use", "Learn by ear", "Built for guitarists".
    3. The existing three groups, rendered as `.home-card` links (keep the existing class names). Each card is an `<a class="home-card" href="#view" data-view="view">` holding `.home-card-top` with `.home-card-icon` (the icon), the section title and its one-line description from `VIEWS` (`VIEWS[view][3]`). The card drops the "Open section ↗" line and the `01` number, so remove `home-card-open` from `tests/fixtures/styled-classes.txt` in this task. Every other fixture class stays.
  - Update the sidebar link template to use `icon(view)`.
  - Add the `.home-hero`, `.home-facts` and faceplate-screw rules to `style.css`. On phones the hero stacks and the faceplate goes under the text.

- [ ] **Step 4: Run all checks** (the command from Task 1, Step 4). Expected: all pass, including every existing `href="#route"` assertion.

- [ ] **Step 5: Commit.** `git add site/navigation.js site/index.html site/style.css tests/navigation.cjs && git commit -m "Add drawn section icons and the new home page"`

---

### Task 4: Visual check, docs and PR

**Files:**
- Modify: `AGENTS.md` (add `node tests/theme.cjs` to the test list; fix the PR #17 entry to "merged"; add the new handoff entry)
- Scratchpad only (not committed): a Playwright script that screenshots every view

- [ ] **Step 1: Screenshot every view.** Serve `site/` on a free port. For each of `home scales harmony progressions modes jam licks rhythm legends listen releases`, capture 1400×900 and 390×844 shots. For each shot, assert `document.documentElement.scrollWidth <= innerWidth` and print any view that fails. Also capture the same views from `origin/main` to use as "before" shots.
  Expected: no view prints an overflow.

- [ ] **Step 2: Look at every shot** against the spec and the reference image. Fix what is visibly wrong: clipped text, unreadable contrast, a lost style. Re-run Step 1 once.

- [ ] **Step 3: Check the Review Focus items by hand** in the browser:
  - Open and close the Sections panel at phone width, using Tab and Esc.
  - Start a jam and watch the note states change.
  - Tab through the scales page and check the focus rings.
  - Open listen mode and check the marker.
  - Note the results for the PR.

- [ ] **Step 4: Update `AGENTS.md`.**
  - Add `node tests/theme.cjs` to the test block.
  - Change the PR #17 entry status to "merged".
  - Add at the top: `- 2026-11-05 · Claude · Restyled the app in the owner's orange amp look (Canva reference): new colours, Barlow fonts, drawn icons, new home page; colours moved from JS into CSS; new check tests/theme.cjs. · <PR link> · open`.

- [ ] **Step 5: Final checks and sync.** Run `git fetch origin main`. If `main` moved, merge it. Then run all six checks.
  Expected: all pass.

- [ ] **Step 6: Push and open the PR.** Push to `claude/gracious-allen-o3xxiu`. Open a PR with a plain summary, the before and after screenshots (home, scales, jam and listen, at desktop and phone), the check results and the hand-check notes. Then fill the PR link into the handoff entry, commit and push.
