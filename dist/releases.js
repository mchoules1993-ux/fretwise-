'use strict';
// User-facing inventory of implemented capabilities. Keep this list current when shipping features.
const FEATURE_CATALOGUE=[
 {view:'scales',title:'Scale explorer',description:'See, hear and play the notes in a scale.',items:[
 'All 12 root notes, with key-aware note spelling and a choice of note names or scale degrees.',
 'Seven major-scale modes, major and minor pentatonic, minor blues and harmonic minor: 11 scale choices.',
 'Root-position shapes or frets 0–12, with root and characteristic-note highlighting.',
 'Clickable fretboard notes with pitch playback and frequency display; keyboard activation with Enter or Space.',
 'Two-octave ascending tabs, a readable string-and-fret note list, and up-and-down scale playback.',
 'A sustained root drone, scale explanations, chord-fit guidance and practice prompts.'
 ]},
 {view:'harmony',title:'Harmony essentials',description:'Understand how intervals become chords.',items:[
 'Major and natural-minor keys in all 12 roots, with seven diatonic triads per key.',
 'Select and hear a chord; inspect its constituent notes, quality and Roman numeral.',
 'Semitone, tone and octave explanations; major, minor and diminished triad formulas.',
 'Major-seventh, dominant-seventh, minor-seventh and half-diminished chord reference with suggested scales.',
 'Guidance on tension, resolution, voice leading and the major V in a minor key.'
 ]},
 {view:'progressions',title:'Chord progressions',description:'Hear the harmony move and learn what to play over it.',items:[
 'Six patterns: pop foundation, doo-wop circle, minor anthem, 12-bar blues, Mixolydian loop and jazz ii7–V7–Imaj7.',
 'Transpose each pattern through all 12 roots; see chord names, Roman numerals and bar numbers.',
 'Hear individual chords or loop the progression, with active-bar highlighting and a 50–140 BPM tempo control.',
 'Explanations of harmonic movement and scale choices, with direct links into the Scale explorer.',
 'Song examples and linked lessons where available; playback demonstrates the practice harmony.'
 ]},
 {view:'modes',title:'Modes & genres',description:'Compare the seven modes and find a sound to explore.',items:[
 'Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian and Locrian, with interval formulas and tonal-character explanations.',
 'Filter suggestions by blues, funk & soul, rock & metal, pop & folk, jazz or ambient.',
 'Choose a root, inspect suggested chord contexts and open that mode in the Scale explorer.',
 'Parallel-mode comparison guidance and a practical lesson on Mixolydian and minor pentatonic over blues.',
 'Direct access to the blues progression in A and further-reading links.'
 ]},
 {view:'jam',title:'Jam room',description:'Improvise over a backing loop with a live note guide.',items:[
 'Four original arranged backing tracks with fixed keys/tempos, plus six transposable progressions with a 50–140 BPM control.',
 'Slow minor blues, Texas shuffle, blues rock and clean funk tracks; guitar/bass/drum levels, four-click count-ins and MP3 downloads. Transposable loops offer straight/shuffle grooves and three guitar tones.',
 'CC0 multisampled guitar, bass and acoustic drums, with independent bass and drum switches.',
 'A live fretboard separating the current chord root, other chord tones and surrounding scale notes.',
 'Four note strategies: follow each chord, use the parent scale, tonic minor pentatonic or tonic blues scale.',
 'Current chord, suggested notes and active progression-bar display, plus phrasing and space challenges.'
 ]},
 {view:'licks',title:'Blues licks',description:'Four original Gary Moore-inspired A-minor studies.',items:[
 'The soaring question, The blue-note climb, The velvet answer and The midnight peak, at original tempos of 76–88 BPM.',
 'Two-bar tabs in 4/4, eighth-note counting, note-duration bars and playback highlighting.',
 'Bends, bend releases, vibrato, hammer-ons and pull-offs, with technique guidance and a note-by-note timing list.',
 'Four-beat count-in, 60%, 75% or 100% practice speed without changing pitch, and looping with a one-bar gap.',
 'Optional A-minor backing, singing lead / warm crunch / clean electric sound choices and stereo WAV downloads.'
 ]},
 {view:'rhythm',title:'Rhythm & beats',description:'Read note lengths, count steadily and practise the attacks.',items:[
 '4/4 time, beat versus rhythm and BPM explanations, with UK and US note names.',
 'Whole, half, quarter, eighth and sixteenth notes: symbols, beat lengths, counting and playable demonstrations.',
 'Quarter rests, counting through silence and an introduction to the difference between straight eighths and shuffle.',
 'Five patterns: quarter notes, eighth notes, long and short, leave a space and sixteenth notes.',
 '40–120 BPM tempo, a four-click count-in, two-bar demonstrations, animated counting and note highlighting.',
 'Tap or Space-key practice against the metronome, with matched attacks, missed notes, extra taps and average timing difference.',
 'One-note guitar practice prompts and a link to Legends; tap feedback notes the effect of device audio latency.'
 ]},
 {view:'legends',title:'Legends',description:'Five phrasing studies, public-domain motifs and linked player lessons.',items:[
 'SRV: Shuffle and sting — long–short eighths, accented bends and an A7 major-third resolution.',
 'Hendrix: Chord-fragment conversation — triplet double-stops and a moving voice inside a chord.',
 'Page: The triplet engine — a repeating hammer-on/pull-off cell and a descending answer.',
 'Clapton: Repeat, then resolve — a straight sixteenth-note figure and blues-to-major-third movement.',
 'Moore: Sustain, burst, resolve — wide delayed vibrato, silence, a faster run and slide resolution.',
 'Three adapted public-domain motifs with credits, linked artist lessons and free publisher sources for actual song excerpts.',
 'Readable beat panels on phones; synchronized highlighting, count-in, slower playback, loop gaps, appropriate A7/A-minor backing, tone and WAV downloads.'

 ]},
 {title:'Sound engine',description:'The audio tools used across the studio.',items:[
 '150 bundled CC0 samples: 82 guitar, 36 bass and 32 drum samples. Instrument banks load separately; sound credits and source licenses are retained.',
 'Amp and cabinet EQ, warm-crunch drive, compression, sustain and delay for expressive lick playback.',
 'Soft/hard note layers, alternating recorded takes and real guitar release sounds, plus rendered bends, vibrato, slides, softer legato attacks and simultaneous notes.',
 'Tempo changes preserve pitch; lick WAV exports include the count-in, selected sound, optional backing and delay tail.',
 'Audio starts after a user action and stops when changing sections, hiding the page or leaving it.'
 ]},
 {title:'Navigation & access',description:'Features that make the studio usable on different devices.',items:[
 'Responsive layouts, horizontal lesson navigation on phones, and scrollable wide fretboards and tabs.',
 'Direct section links, a current-section breadcrumb and highlighted navigation.',
 'Skip-to-lesson link, visible keyboard focus, accessible diagram labels and playback status announcements.',
 'Reduced-motion support and text note lists alongside visual tabs.',
 'Sound credits and theory references open from the site; the Release list is available from navigation and the footer.'
 ]},
 {title:'Assistant scale setup',description:'Optional support in browsers that expose assistant tools.',items:[
 'A supported browser assistant can select a root and scale and open the Scale explorer.',
 'Returns note names and string/fret positions; this action does not start audio.'
 ]}
];
const RELEASE_HISTORY=[
 {version:8,date:'2026-10-14',label:'14 October 2026',title:'Multisampled instruments & arranged backing tracks',changes:['Replaced the small General MIDI bank with 150 compact CC0 guitar, bass and acoustic-drum samples.','Added soft/hard note layers, alternate takes, guitar string-release sounds and stronger lead/crunch processing.','Added four original backing arrangements: After midnight, Dusty road shuffle, Open road and Pocket conversation.','Added continuous, synchronized guitar/bass/drum stems, live instrument levels, count-ins, track downloads and chord-following note guides.','Preserved transposable loops and upgraded their drums to the sampled acoustic kit.','Added reproducible sample-preparation and backing-render scripts, source provenance and retained CC0 licenses.']},
 {version:7,date:'2026-10-14',label:'14 October 2026',title:'Phone practice & distinct Legends phrasing',changes:['Added a persistent Stop button and audio status in every section, plus audio priming on the original tap.','Lick loops now schedule against the audio clock; highlights also follow audio time.','Changed phone tabs to readable beat panels and improved touch targets, safe-area spacing and active navigation visibility.','Reworked all five Legends studies with shuffle, triplets, double-stops, sixteenth-note cells and expressive bends/slides.','Credited three public-domain motifs and linked player lessons and actual song-tab sources.','Matched A7 or A-minor backing to each study and preserved export settings while WAV audio renders.']},
 {version:6,date:'2026-10-12',label:'12 October 2026',title:'Release list & complete feature catalogue',changes:['Added this Release list to navigation and the footer.','Documented all eight learning sections, the shared sound engine, navigation and optional assistant scale setup.','Added links from the catalogue to each learning section and recorded the earlier releases.']},
 {version:5,date:'2026-10-12',label:'12 October 2026',title:'Rhythm & beats + Legends',changes:['Added note lengths, 4/4 counting, rests, audio demonstrations and five rhythm patterns.','Added tap practice with timing feedback and a 40–120 BPM tempo control.','Added five original SRV-, Hendrix-, Page-, Clapton- and Moore-inspired licks.','Added double-stop tab and audio support; extended lick playback and WAV export to Legends.']},
 {version:4,date:'2026-10-12',label:'12 October 2026',title:'Sampled guitar & bass audio',changes:['Replaced the earlier guitar-like synthesis with a bundled sampled guitar and bass bank.','Added singing lead, warm crunch and clean electric sounds with EQ, sustain, compression and delay.','Updated Jam Room accompaniment and lick playback, including bends, vibrato and WAV exports.','Added sample-source credits.']},
 {version:3,date:'2026-10-12',label:'12 October 2026',title:'Expressive blues licks',changes:['Added four original, moderate-speed A-minor blues-rock licks.','Added rhythmic tabs, technique tips, note timing and playback highlighting.','Added count-in, slower practice speeds, loop gaps, optional backing and WAV downloads.']},
 {version:2,date:'2026-09-15',label:'15 September 2026',title:'Interactive Jam Room',changes:['Added progression backing loops, tempo, straight/shuffle options and rhythm-section controls.','Added live chord-tone highlighting and selectable note strategies.','Added a guitar-like browser audio engine, later upgraded to samples in Release 4.']},
 {version:1,date:'2026-09-15',label:'15 September 2026',title:'The theory studio',changes:['Launched Scale explorer, Harmony essentials, Chord progressions and Modes & genres.','Added 12 roots, 11 scales, two-octave tabs, note and chord playback and a root drone.','Added six progression patterns, mode/genre filters, practice guidance, responsive layouts and keyboard access.']}
];
function releasesView(){return intro()+`<section class="panel practice"><div class="panel-head"><div><span class="eyebrow">CURRENT RELEASE · ${RELEASE_HISTORY[0].label.toUpperCase()}</span><h2 style="margin-top:8px">Everything you can practise today.</h2></div><span class="badge">Release ${RELEASE_HISTORY[0].version}</span></div><p>A complete catalogue of the features implemented in Fretwise, followed by the release history. Open a section to try it.</p><div class="release-stats">${[[ROOTS.length,'keys'],[Object.keys(SCALES).length,'scales'],[PROGS.length,'progressions'],[BLUES_LICKS.length+LEGEND_LICKS.length,'practice licks']].map(([n,label])=>`<div><strong>${n}</strong><span>${label}</span></div>`).join('')}</div><button class="text-link" id="release-history-jump">Jump to release history ↓</button></section><section class="panel"><div class="panel-head"><div><span class="eyebrow">AVAILABLE NOW</span><h2 style="margin-top:8px">Complete feature catalogue</h2></div></div><p class="tiny">Expand a heading to see its features. Use Open to try a lesson.</p><div class="release-catalogue">${FEATURE_CATALOGUE.map(group=>`<details class="release-feature"><summary><span>${group.title}</span><small>${group.description}</small></summary><ul>${group.items.map(item=>`<li>${item}</li>`).join('')}</ul>${group.view?`<button class="btn small" data-view="${group.view}">Open ${group.title} →</button>`:''}</details>`).join('')}</div></section><section id="release-history" class="release-history" aria-label="Release history"><div class="panel-head"><div><span class="eyebrow">WHAT CHANGED</span><h2 style="margin-top:8px">Release history</h2></div></div>${RELEASE_HISTORY.map((r,i)=>`<article class="panel release-entry"><div class="release-meta"><span class="badge">Release ${r.version}${i===0?' · current':''}</span><time datetime="${r.date}">${r.label}</time></div><h3>${r.title}</h3><ul>${r.changes.map(c=>`<li>${c}</li>`).join('')}</ul></article>`).join('')}</section>`;}

document.addEventListener('click',e=>{if(e.target.closest('#release-history-jump'))document.getElementById('release-history')?.scrollIntoView();});
