# Fretwise navigation redesign

Approved direction: full navigation redesign, selected by the owner in chat on 3 November 2026.

## Intent
Make every section reachable without zooming out. Provide a welcoming homepage and consistent navigation throughout the studio.

## Design
- Open the bare site URL at `#home`; preserve direct links to all ten existing sections.
- Show all ten sections as homepage cards with a title, short description and a clear link. Use the existing dark green palette, fonts and lime accent.
- Desktop: retain a left sidebar. Keep the brand/Home link at the top; let the section list scroll vertically within the available screen height. Use a visible scrollbar and prevent decorative footer content from displacing navigation.
- Phone and narrow/zoomed layouts: a persistent Sections button opens a side panel with the same vertical list, an accessible Close button and a backdrop.
- Highlight and announce the current section. Keep Home available in the sidebar and on the phone header.
- Close the phone menu after selecting a section, tapping the backdrop or pressing Escape. Move keyboard focus into the menu on opening, keep focus inside while open, and return it appropriately when closing. Prevent background page scrolling while the panel is open.
- Keep audio Stop reachable in the normal lesson view. Navigation continues to stop playback and microphone capture through the existing navigation lifecycle.
- Check short windows, phone portrait/landscape and enlarged browser zoom. Controls must remain reachable by touch and keyboard.

## Approaches
1. Sidebar-only repair: smallest change, but no overview and retains the current phone navigation pattern.
2. Homepage plus responsive scrolling section menu: selected by the owner; more work, but addresses discovery and navigation together.

## Constraints and scope
Plain HTML, CSS and JavaScript; no new runtime dependencies or build step. Preserve existing lessons, audio tools, listening behavior and direct section URLs. No progress tracking, new lessons or listening changes in this task. Follow AGENTS.md: branch, tests, PR, owner merge; publication is a separate owner-requested step.

## Implementation choices
Use a small navigation module for the homepage catalogue and responsive menu behavior. Reuse the existing view router, section names and descriptions. Home is the default entry; valid section fragments retain their destination. Native browser Back/Forward must keep the view and active navigation in sync.

## Acceptance
All ten sections open from Home and from the menu; the final menu entry is reachable on short screens; the phone panel supports touch and keyboard dismissal; opening Home never requests microphone access; existing audio/listening tests pass.
