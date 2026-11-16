'use strict';
// Practice path: a guided route through the lessons that already exist in Fretwise.
// Each step opens a section already set up for the task, says what to do and how to know it is done.
// Progress is self-marked and saved in this browser only (localStorage). Nothing is uploaded.

// view = the section a step opens. also = other sections the step may lead into.
// setup() puts that section into the right state before it opens.
const PATH_STAGES=[
 {id:'ready',title:'Get ready',about:'Tune up, find three notes and feel the beat.',steps:[
  {id:'tune',title:'Tune your guitar',mins:5,view:'listen',
   task:'The tuner is open. Tap Start listening, then play each open string on its own and let it ring. Turn the tuning peg slowly until the needle sits in the middle.',
   goal:'All six strings read “In tune”.',
   setup(){listenSetMode('tune');}},
  {id:'find-notes',title:'Find A, C and E',mins:5,view:'listen',
   task:'Fretwise asks for a note and shows one place to play it. Tap Start listening, play the note and let it ring until it is matched.',
   goal:'The line under the buttons says you have matched 5 notes.',
   setup(){listenSetMode('note');}},
  {id:'count-four',title:'Count four beats',mins:5,view:'rhythm',
   task:'Scroll to “Your rhythm trainer”. Press Hear & count and say “1, 2, 3, 4” with the clicks. Then press Start tap practice and tap once on every beat.',
   goal:'The feedback says every note attack matched, two tries in a row.',
   setup(){rhythmOptions.pattern=0;rhythmOptions.bpm=70;}},
  {id:'eighths',title:'Split the beat in two',mins:5,view:'rhythm',
   task:'The rhythm trainer is set to eighth notes. Count “1 and 2 and 3 and 4 and”. Tap it first, then play it on your guitar with one note: A, on the thinnest string at fret 5.',
   goal:'You can play eight even notes in each bar, in time with the clicks.',
   setup(){rhythmOptions.pattern=1;rhythmOptions.bpm=70;}}
 ]},
 {id:'first-scale',title:'Your first scale',about:'A minor pentatonic: five notes behind a huge amount of blues and rock.',steps:[
  {id:'shape',title:'Learn the shape',mins:10,view:'scales',
   task:'The fretboard shows A minor pentatonic. Play the notes from fret 5 to fret 8, one string at a time, from the thickest string to the thinnest and back again. Go slowly. Press Hear scale to check the sound.',
   goal:'You can play it up and down twice without looking at the screen.',
   setup(){state.root=9;state.scale='minorPent';state.position='shape';state.labels='notes';}},
  {id:'home-note',title:'Find the home note',mins:5,view:'scales',
   task:'The labels now show scale degrees. Every note marked 1 is A, the home note. Play up the scale and stop on each A you reach.',
   goal:'You can find three A notes without the picture: thickest string fret 5, D string fret 7 and thinnest string fret 5.',
   setup(){state.root=9;state.scale='minorPent';state.position='shape';state.labels='degrees';}},
  {id:'drone',title:'Play over a drone',mins:5,view:'scales',
   task:'Press Start A drone so the home note keeps sounding. Play any notes from the shape, slowly, and listen to how each one sits against A. End every phrase on an A.',
   goal:'You have played for two minutes and ended each phrase on A.',
   setup(){state.root=9;state.scale='minorPent';state.position='shape';state.labels='notes';}},
  {id:'blue-note',title:'Add the blue note',mins:5,view:'scales',
   task:'The minor blues scale is the same shape with one extra note, E♭. Find it on the A string at fret 6 and on the G string at fret 8. Pass through it on the way to the next note; do not stop on it.',
   goal:'You can play the scale up and down with the blue note included.',
   setup(){state.root=9;state.scale='blues';state.position='shape';state.labels='notes';}}
 ]},
 {id:'chords',title:'Chords and the 12-bar blues',about:'See how chords are built, then play the best-known pattern in blues.',steps:[
  {id:'build-chord',title:'See what a chord is made of',mins:5,view:'harmony',
   task:'A basic chord is three notes from a scale: pick one, skip one, pick one, skip one, pick one. Tap each of the seven chords in C major and press Hear.',
   goal:'You can name the three notes in a C major chord (C, E, G) without looking.',
   setup(){state.root=0;state.harmony='major';state.chord=0;}},
  {id:'blues-chords',title:'Learn A7, D7 and E7',mins:10,view:'progressions',
   task:'The 12-bar blues in A uses three chords. Tap bars 1, 5 and 9 to hear A7, D7 and E7. Copy each chord box with your fingers and strum it.',
   goal:'You can change between the three chords without stopping, even slowly.',
   setup(){state.root=9;state.progression=3;state.bpm=60;}},
  {id:'twelve-bars',title:'Play all 12 bars',mins:10,view:'progressions',
   task:'Press Play loop. The tempo is set to 60 BPM. Strum once at the start of every bar, count the four beats and follow the highlighted bar.',
   goal:'You get through all 12 bars twice without losing your place.',
   setup(){state.root=9;state.progression=3;state.bpm=60;}},
  {id:'pop-loop',title:'Try a pop progression',mins:5,view:'progressions',
   task:'This is one of the most used progressions in pop, here in G: G, D, Em, C. Press Play loop and strum once in every bar.',
   goal:'You can hear the moment the loop comes home to G.',
   setup(){state.root=7;state.progression=0;state.bpm=70;}}
 ]},
 {id:'phrases',title:'First phrases',about:'Learn two short licks and the value of a gap.',steps:[
  {id:'lick-slow',title:'Learn a lick slowly',mins:10,view:'licks',
   task:'Find Lick 1, “The soaring question”. The speed is set to 60% with the loop on. Read the tip under the tab about the bend, press Play lick 1 and play along.',
   goal:'You can play along with the loop three times in a row.',
   setup(){lickOptions.speed=60;lickOptions.loop=true;}},
  {id:'lick-full',title:'Bring it up to speed',mins:10,view:'licks',
   task:'Play Lick 1 at 75%. When that feels easy, change Practice speed to 100%. Only speed up when the slower speed is comfortable.',
   goal:'You can play along at 100% twice in a row.',
   setup(){lickOptions.speed=75;lickOptions.loop=true;}},
  {id:'lick-answer',title:'Learn an answer',mins:10,view:'licks',
   task:'Find Lick 3, “The velvet answer”. It uses pull-offs and a hammer-on; the tip under the tab explains each one. The speed is back at 60%.',
   goal:'You can play Lick 1, leave a bar of silence, then play Lick 3.',
   setup(){lickOptions.speed=60;lickOptions.loop=true;}},
  {id:'space',title:'Leave a space',mins:5,view:'rhythm',
   task:'Silence is part of the rhythm. The rhythm trainer is set to “Leave a space”, which has a rest on beat 2. Listen, tap it, then play it on one note and mute the string during the rest.',
   goal:'You can keep counting through the rest and come back in on time.',
   setup(){rhythmOptions.pattern=3;rhythmOptions.bpm=70;}}
 ]},
 {id:'solo',title:'Your first solo',about:'Use what you know over a real backing track.',steps:[
  {id:'jam-two-strings',title:'Jam on two strings',mins:10,view:'jam',
   task:'Press Start jam to play “After midnight”, a slow blues in A minor. Use only the two thinnest strings, at frets 5 and 8. Play a short phrase, then rest for about as long as you played.',
   goal:'You have played through the 8-bar loop three times, with gaps between your phrases.',
   setup(){state.jamMode='studio';state.studioTrack=0;state.jamScale='minorPent';}},
  {id:'land',title:'Land on a chord tone',mins:10,view:'jam',
   task:'The note guide is set to “Follow each chord”. Start the jam and watch the live fretboard as the chords change. End each phrase on one of the highlighted chord tones.',
   goal:'You have landed on a chord tone at four chord changes in a row.',
   setup(){state.jamMode='studio';state.studioTrack=0;state.jamScale='follow';}},
  {id:'written-solo',title:'Play a written solo phrase',mins:10,view:'jam',
   task:'Scroll down to “Try it in each style” and open “Slow minor blues”. Press Play example, read the advice above the tab, then learn the two bars.',
   goal:'You can play the two bars along with the example.',
   setup(){state.jamMode='studio';state.studioTrack=0;state.jamScale='minorPent';}},
  {id:'one-minute',title:'Play a one-minute solo',mins:10,view:'jam',
   task:'Start the jam and put it together. Play Lick 1 as a question, leave a gap, then answer with Lick 3 or with your own notes from the shape. Mistakes are fine; keep going.',
   goal:'You have played for about one minute without stopping.',
   setup(){state.jamMode='studio';state.studioTrack=0;state.jamScale='minorPent';}}
 ]},
 {id:'further',title:'Go further',about:'New sounds and harder studies for when the basics feel steady.',steps:[
  {id:'mixolydian',title:'Hear a brighter scale',mins:5,view:'scales',
   task:'A Mixolydian has a major third, C♯, where A minor pentatonic has C. Press Start A drone, play the scale slowly and listen for that brighter note.',
   goal:'You can hear the difference between C and C♯ over the A drone.',
   setup(){state.root=9;state.scale='mixolydian';state.position='shape';state.labels='notes';}},
  {id:'moods',title:'Find a mood you like',mins:5,view:'modes',also:['scales'],
   task:'Pick a style, read the suggestions, then press one of the Explore buttons to open that mode in the Scale explorer. Play it over the drone.',
   goal:'You have tried one new mode and can say what it sounds like to you.',
   setup(){state.root=9;state.genre='All modes';}},
  {id:'shuffle',title:'Feel the shuffle',mins:10,view:'jam',
   task:'“Dusty road shuffle” splits each beat into a long note and a short note. Start the jam, tap your foot and play your A minor pentatonic shape with that long–short feel.',
   goal:'You have played three times through the 12 bars and kept the shuffle feel.',
   setup(){state.jamMode='studio';state.studioTrack=1;state.jamScale='minorPent';}},
  {id:'legend',title:'Study a legend',mins:15,view:'legends',
   task:'Choose one of the first five studies. The speed is set to 60% with the loop on. Read the timing line under its name, listen once, then play along.',
   goal:'You can play your chosen study along with the audio at 60%, twice in a row.',
   setup(){lickOptions.speed=60;lickOptions.loop=true;}}
 ]}
];
// The same steps as one flat list, each with its stage and its number on the path.
const PATH_STEPS=PATH_STAGES.flatMap((stage,stageIndex)=>stage.steps.map(step=>({...step,stage:stage.id,stageIndex})));
PATH_STEPS.forEach((step,i)=>{step.number=i+1;});
const PATH_KEY='fretwise.path.v1';
const PATH_DAY=/^\d{4}-\d{2}-\d{2}$/;

function pathStep(id){return PATH_STEPS.find(step=>step.id===id)||null}
// Some browsers block storage (private windows, strict settings). The path then works for this visit only.
function pathStorage(){try{return typeof localStorage==='undefined'?null:localStorage;}catch{return null;}}
// Keep only what we understand, so old, edited or damaged saved data can never break the page.
function pathClean(raw){
 const clean={done:{},days:[]};
 if(!raw||typeof raw!=='object')return clean;
 if(raw.done&&typeof raw.done==='object')for(const step of PATH_STEPS){const day=raw.done[step.id];if(typeof day==='string'&&PATH_DAY.test(day))clean.done[step.id]=day;}
 if(Array.isArray(raw.days))clean.days=[...new Set(raw.days.filter(day=>typeof day==='string'&&PATH_DAY.test(day)))].sort().slice(-60);
 return clean;
}
function pathLoad(){
 const store=pathStorage();
 if(!store)return {...pathClean(null),saved:false};
 try{return {...pathClean(JSON.parse(store.getItem(PATH_KEY)||'null')),saved:true};}catch{return {...pathClean(null),saved:true};}
}
const pathProgress=pathLoad();
// active = the step the player opened from the path. open = which stages are unfolded on the path page.
const pathUi={active:null,open:null,confirmReset:false};

function pathSave(){
 const store=pathStorage();
 try{if(!store)throw Error('no storage');store.setItem(PATH_KEY,JSON.stringify({done:pathProgress.done,days:pathProgress.days}));pathProgress.saved=true;}
 catch{pathProgress.saved=false;}
}
function pathToday(date=new Date()){const two=n=>String(n).padStart(2,'0');return `${date.getFullYear()}-${two(date.getMonth()+1)}-${two(date.getDate())}`}
function pathIsDone(id){return Object.hasOwn(pathProgress.done,id)}
function pathDoneCount(){return PATH_STEPS.filter(step=>pathIsDone(step.id)).length}
function pathNext(){return PATH_STEPS.find(step=>!pathIsDone(step.id))||null}
function pathMinutesLeft(){return PATH_STEPS.filter(step=>!pathIsDone(step.id)).reduce((sum,step)=>sum+step.mins,0)}
function pathMinutesText(mins){const h=Math.floor(mins/60),m=mins%60;return h?`${h} h${m?` ${m} min`:''}`:`${m} min`}
function pathLogDay(date=new Date()){const day=pathToday(date);if(!pathProgress.days.includes(day))pathProgress.days=[...pathProgress.days,day].sort().slice(-60);}
function pathSetDone(id,done,date=new Date()){
 if(!pathStep(id))return;
 if(done){if(!pathIsDone(id))pathProgress.done[id]=pathToday(date);pathLogDay(date);}
 else delete pathProgress.done[id];
 pathSave();
}
function pathReset(){pathProgress.done={};pathProgress.days=[];pathUi.active=null;pathUi.open=null;pathUi.confirmReset=false;pathSave();}
// The last seven days, oldest first, ending today.
function pathWeek(date=new Date()){
 return Array.from({length:7},(_,i)=>{const d=new Date(date.getFullYear(),date.getMonth(),date.getDate()-(6-i)),day=pathToday(d);
  return {day,label:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()],practised:pathProgress.days.includes(day),today:i===6};});
}
function pathSectionName(step){return VIEWS[step.view][1]}

// Open a step's lesson, set up for the task.
function pathStart(id){
 const step=pathStep(id);
 if(!step)return;
 stopAudio();stopListening();
 step.setup();
 pathUi.active=step.id;
 pathLogDay();pathSave();
 navigate(step.view);
}
// The step to show in the coach bar on this page. Leaving the step's lesson ends it.
function pathActiveStep(){
 const step=pathStep(pathUi.active);
 if(!step)return null;
 if(step.view!==state.view&&!(step.also||[]).includes(state.view)){pathUi.active=null;return null;}
 return step;
}
function pathAnnounce(text){const live=document.getElementById('announcement');if(live)live.textContent=text;}
// Mark the open step as done and move straight on to the next one.
function pathFinishActive(){
 const step=pathStep(pathUi.active);
 if(!step)return;
 pathSetDone(step.id,true);
 const next=pathNext();
 if(next){pathStart(next.id);pathAnnounce(`Step ${step.number} done. Step ${next.number} of ${PATH_STEPS.length}: ${next.title}.`);}
 else{pathUi.active=null;navigate('path');pathAnnounce('Step done. You have finished the practice path.');}
}

// Coach bar for a lesson that was opened from the path. The full bar sits above the lesson;
// a short one repeats under it, so the Done button is also there after scrolling down.
function pathStrip(end=false){
 const step=pathActiveStep();
 if(!step)return '';
 const last=PATH_STEPS.every(other=>other.id===step.id||pathIsDone(other.id));
 const actions=`<div class="path-strip-actions"><button type="button" class="btn on-dark" data-path-finish>✓ Done · ${last?'finish the path':'next step'}</button><a class="text-link" href="#path" data-view="path">Back to the path</a></div>`;
 const label=`PRACTICE PATH · STEP ${step.number} OF ${PATH_STEPS.length}`;
 if(end)return `<aside class="path-strip path-strip-end" aria-label="Finish this practice path step"><div class="path-strip-text"><span class="eyebrow">${label} · ${step.title.toUpperCase()}</span><p class="path-goal"><b>Done when:</b> ${step.goal}</p></div>${actions}</aside>`;
 return `<aside class="path-strip" aria-label="Your practice path step"><div class="path-strip-text"><span class="eyebrow">${label}</span><strong class="path-strip-title">${step.title}</strong><p>${step.task}</p><p class="path-goal"><b>Done when:</b> ${step.goal}</p></div>${actions}</aside>`;
}

function pathMeter(done,total){return `<div class="path-meter" role="img" aria-label="${done} of ${total} steps done"><i style="width:${Math.round(done/total*100)}%"></i></div>`}
function pathWeekRow(){
 const week=pathWeek(),count=week.filter(d=>d.practised).length;
 return `<div class="path-week"><span class="eyebrow">LAST 7 DAYS</span><ol class="path-days" aria-label="Practised on ${count} of the last 7 days">${week.map(d=>`<li class="${d.practised?'practised':''} ${d.today?'today':''}"><i aria-hidden="true"></i><span>${d.today?'Today':d.label}</span></li>`).join('')}</ol></div>`;
}
function pathStepRow(step,next){
 const done=pathIsDone(step.id),isNext=next&&next.id===step.id;
 return `<li class="path-step ${done?'done':''} ${isNext?'next':''}"><button type="button" class="path-check" data-path-toggle="${step.id}" aria-pressed="${done}" aria-label="${done?'Done':'Not done'}: ${step.title}. Tap to mark as ${done?'not done':'done'}."><span aria-hidden="true">${done?'✓':''}</span></button><div class="path-step-body"><span class="eyebrow">STEP ${step.number}${isNext?' · NEXT UP':''} · ${step.mins} MIN · ${pathSectionName(step).toUpperCase()}</span><h4>${step.title}</h4><p>${step.task}</p><p class="path-goal"><b>Done when:</b> ${step.goal}</p></div><button type="button" class="btn small ${isNext?'primary':''}" data-path-start="${step.id}">${done?'Practise again':'Open lesson'} →</button></li>`;
}
function pathStageBlock(stage,index,next){
 const done=stage.steps.filter(step=>pathIsDone(step.id)).length,total=stage.steps.length;
 return `<details class="panel path-stage ${done===total?'complete':''}" data-path-stage="${stage.id}" ${pathUi.open.has(stage.id)?'open':''}><summary><span class="path-stage-title"><span class="eyebrow">STAGE ${index+1} OF ${PATH_STAGES.length}</span><h3>${stage.title}</h3><small>${stage.about}</small></span><span class="badge">${done===total?'✓ Done':`${done} of ${total}`}</span></summary><ol class="path-steps">${stage.steps.map(step=>pathStepRow(pathStep(step.id),next)).join('')}</ol></details>`;
}
function pathNextPanel(next){
 const done=pathDoneCount(),total=PATH_STEPS.length;
 const side=`<div class="path-summary"><span class="eyebrow">YOUR PROGRESS</span><strong class="path-count">${done}<small> of ${total} steps</small></strong>${pathMeter(done,total)}<p class="tiny">${next?`About ${pathMinutesText(pathMinutesLeft())} of practice left.`:'Every step is done.'}</p>${pathWeekRow()}</div>`;
 if(!next)return `<section class="panel path-next"><div class="path-next-main"><span class="eyebrow">PATH COMPLETE</span><h2>You finished all ${total} steps.</h2><p>You can tune up, find your notes, keep time, play the 12-bar blues and solo over a backing track. Keep it going: jam for ten minutes a day, or pick a new Legends study.</p><div class="lick-actions"><a class="btn primary" href="#jam" data-view="jam">Open the jam room →</a><a class="text-link" href="#legends" data-view="legends">Pick a Legends study</a></div></div>${side}</section>`;
 return `<section class="panel path-next"><div class="path-next-main"><span class="eyebrow">${done?'NEXT UP':'START HERE'} · STEP ${next.number} OF ${total} · ABOUT ${next.mins} MIN</span><h2>${next.title}</h2><p>${next.task}</p><p class="path-goal"><b>Done when:</b> ${next.goal}</p><div class="lick-actions"><button type="button" class="btn primary" data-path-start="${next.id}">${done?'Continue':'Start'}: open ${pathSectionName(next)} →</button></div></div>${side}</section>`;
}
function pathView(){
 const next=pathNext();
 // First visit: unfold the stage that holds the next step. After that, keep what the player opened.
 if(!pathUi.open)pathUi.open=new Set(next?[next.stage]:[]);
 // Only offer to clear progress when there is some.
 const hasProgress=pathDoneCount()>0||pathProgress.days.length>0||pathUi.confirmReset;
 const reset=pathUi.confirmReset
  ?`<p class="path-reset" role="alert">Clear all ticks and start the path again? <button type="button" class="btn small" data-path-reset="yes">Yes, clear my progress</button> <button type="button" class="btn small" data-path-reset="no">No, keep it</button></p>`
  :`<p class="path-reset"><button type="button" class="text-link" data-path-reset="ask">Clear my progress and start again</button></p>`;
 return intro()+pathNextPanel(next)+`<section class="path-stages" aria-label="All stages"><div class="home-group-heading"><h2>The whole path</h2><p>${PATH_STAGES.length} stages, ${PATH_STEPS.length} short steps. Do them in order, or open any step you like. Tick a step when you can do what it asks.</p></div>${PATH_STAGES.map((stage,i)=>pathStageBlock(stage,i,next)).join('')}</section><section class="panel practice path-how"><span class="eyebrow">HOW THE PATH WORKS</span><h2>Little and often beats long and rare.</h2><ol><li>One or two steps a day is plenty. Ten focused minutes helps more than an hour of noodling.</li><li>Each step opens a lesson already set up for you. A bar at the top of the lesson reminds you what to do.</li><li>You decide when a step is done. If it still feels shaky tomorrow, do it again; that is normal practice, not failure.</li></ol></section><div class="path-foot"><p class="tiny">${pathProgress.saved?'Your progress is saved in this browser on this device only. Nothing is uploaded. Clearing your browser data will clear it.':'This browser is not letting Fretwise save. Your ticks will last until you close or reload this page.'}</p>${hasProgress?reset:''}</div>`;
}

// Home page: one wide card that says where the player is and continues from there.
function pathHomeCard(){
 const next=pathNext(),done=pathDoneCount(),total=PATH_STEPS.length;
 const lead=!next?`You finished all ${total} steps. Open the path to practise any step again.`
  :done?`You have done ${done} of ${total} steps. Next: ${next.title}, about ${next.mins} minutes.`
  :`${total} short steps take you from tuning up to your first solo. Fretwise remembers where you are.`;
 const action=next?`<button type="button" class="btn primary" data-path-start="${next.id}">${done?'Continue':'Start'}: ${next.title} →</button>`:'';
 return `<div class="faceplate path-home"><div class="path-home-text"><span class="home-card-icon">${icon('path')}</span><div><h3>${VIEWS.path[1]}</h3><p>${lead}</p></div></div>${pathMeter(done,total)}<div class="lick-actions">${action}<a class="${next?'text-link':'btn primary'}" href="#path" data-view="path">${next?'See the whole path':'Open the practice path →'}</a></div></div>`;
}

document.addEventListener('click',event=>{
 const b=event.target.closest('[data-path-start],[data-path-toggle],[data-path-finish],[data-path-reset]');
 if(!b)return;
 if(b.dataset.pathStart){pathStart(b.dataset.pathStart);return;}
 if(b.dataset.pathFinish!==undefined){pathFinishActive();return;}
 let focus=null;
 if(b.dataset.pathToggle){
  const step=pathStep(b.dataset.pathToggle);
  if(!step)return;
  pathSetDone(step.id,!pathIsDone(step.id));
  // Finishing a stage unfolds the one that holds the next step.
  const next=pathNext();if(next&&pathUi.open)pathUi.open.add(next.stage);
  pathAnnounce(`${step.title}: ${pathIsDone(step.id)?'done':'not done'}. ${pathDoneCount()} of ${PATH_STEPS.length} steps done.`);
  focus=`[data-path-toggle="${step.id}"]`;
 }else if(b.dataset.pathReset==='ask'){pathUi.confirmReset=true;focus='[data-path-reset="no"]';}
 else if(b.dataset.pathReset==='no'){pathUi.confirmReset=false;focus='[data-path-reset="ask"]';}
 else if(b.dataset.pathReset==='yes'){pathReset();pathAnnounce('Progress cleared.');focus='[data-path-start]';}
 render();
 if(focus)document.querySelector(focus)?.focus();
});
// Remember which stages the player unfolded, so ticking a step does not fold them again. (toggle does not bubble.)
document.addEventListener('toggle',event=>{
 const stage=event.target?.dataset?.pathStage;
 if(!stage||!pathUi.open)return;
 if(event.target.open)pathUi.open.add(stage);else pathUi.open.delete(stage);
},true);
