const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');

// Exercise the practice path against the real app code, without audio, a microphone or a browser.
// store: a fake localStorage ({getItem,setItem}), or 'blocked' for a browser that refuses storage.
function studio({store,hash=''}={}){
 const elements=new Map();
 const element=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',disabled:false,dataset:{},classList:{remove(){},toggle(){}},setAttribute(){},removeAttribute(){},focus(){this.focused=true;}});return elements.get(id);};
 const listeners={};let loading='';
 const context={console,Math,Date,JSON,Float32Array,Uint8Array,Map,Set,URL,Blob,window:{addEventListener(){},scrollTo(){}},document:{hidden:false,body:element('body'),getElementById:element,querySelectorAll:()=>[],querySelector:()=>null,addEventListener(name,fn){(listeners[`${loading}:${name}`]??=[]).push(fn);}},location:{hash},history:{replaceState(_s,_t,h){context.location.hash=h;},pushState(_s,_t,h){context.location.hash=h;}},setTimeout,clearTimeout,requestAnimationFrame:()=>0,cancelAnimationFrame(){}};
 if(store==='blocked')Object.defineProperty(context,'localStorage',{get(){throw new Error('SecurityError');}});
 else if(store)context.localStorage=store;
 const c=vm.createContext(context);
 for(const f of ['sampled-audio','backing','licks','rhythm','releases','chords','listen','path','navigation','app']){loading=f;vm.runInContext(fs.readFileSync(`site/${f}.js`,'utf8'),c,{filename:f});}
 const raw=code=>vm.runInContext(code,c);
 // Copy plain data out of the sandbox so it compares equal to arrays and objects made here.
 const run=code=>{const value=raw(code);return value&&typeof value==='object'?JSON.parse(JSON.stringify(value)):value;};
 // Send a click on a button with these data-* values to the path's own click handler.
 const click=dataset=>listeners['path:click'].forEach(fn=>fn({target:{closest:()=>({dataset})}}));
 return {c,run,raw,click,html:()=>element('main').innerHTML,said:()=>element('announcement').textContent};
}
function memoryStore(initial={}){const data={...initial};return {data,getItem:k=>Object.hasOwn(data,k)?data[k]:null,setItem(k,v){data[k]=String(v);}};}
const text=html=>html.replace(/<svg[\s\S]*?<\/svg>/g,' ').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ');
const KEY='fretwise.path.v1';

// ---- 1. The path itself: well-formed steps that point at real sections ----
const s=studio();
const steps=s.raw('PATH_STEPS'),stages=s.raw('PATH_STAGES'),views=s.run('VIEWS');
assert.equal(stages.length,6);assert.equal(steps.length,24);
assert.equal(new Set(steps.map(x=>x.id)).size,steps.length,'Step ids are saved in the browser, so they must be unique');
assert.equal(new Set(stages.map(x=>x.id)).size,stages.length);
steps.forEach((step,i)=>{
 assert.equal(step.number,i+1);
 assert.match(step.id,/^[a-z][a-z-]*$/);
 for(const view of [step.view,...(step.also||[])])assert.ok(Object.hasOwn(views,view)&&!['home','path'].includes(view),`${step.id} opens a real lesson section`);
 assert.ok(step.mins>=5&&step.mins<=15,`${step.id}: a step is a short task`);
 for(const field of ['title','task','goal'])assert.ok(typeof step[field]==='string'&&step[field].length>10,`${step.id} needs a ${field}`);
 assert.equal(typeof step.setup,'function');
});
for(const stage of stages)assert.ok(stage.steps.length>=3&&stage.title&&stage.about);
// The path must start with tuning and reach the jam room before the optional extras.
assert.equal(steps[0].id,'tune');
assert.ok(steps.findIndex(x=>x.view==='jam')>steps.findIndex(x=>x.id==='shape'),'Learn the scale before jamming with it');

// ---- 2. Every step opens its lesson in the state its text describes ----
for(const step of steps){
 const one=studio();
 one.run(`pathStart('${step.id}')`);
 assert.equal(one.run('state.view'),step.view,`${step.id} opens ${step.view}`);
 assert.equal(one.c.location.hash,'#'+step.view);
 const page=one.html();
 assert.match(page,/class="path-strip"/,`${step.id}: the coach bar is shown above the lesson`);
 assert.match(page,/class="path-strip path-strip-end"/,`${step.id}: and repeated under it`);
 assert.ok(page.indexOf('class="path-strip"')<page.indexOf('class="intro"'),'The coach bar comes first');
 assert.ok(text(page).includes(`STEP ${step.number} OF 24`)&&page.includes(step.task)&&page.includes(step.goal));
}
const open=id=>{const one=studio();one.run(`pathStart('${id}')`);return one;};
const has=(id,phrase)=>assert.ok(text(open(id).html()).includes(phrase),`${id}: the lesson should show “${phrase}”`);
// Listening: tuner first, then the note game. The buttons the text names must exist.
assert.equal(open('tune').run('listen.mode'),'tune');has('tune','Start listening');has('tune','In tune');
assert.equal(open('find-notes').run('listen.mode'),'note');has('find-notes','Start listening');has('find-notes','No notes matched yet.');
// Rhythm trainer patterns and wording.
for(const [id,pattern,name] of [['count-four',0,'Quarter notes'],['eighths',1,'Eighth notes'],['space',3,'Leave a space']]){
 const one=open(id);
 assert.equal(one.run('rhythmOptions.pattern'),pattern);assert.equal(one.run('rhythmOptions.bpm'),70);
 assert.equal(one.run(`RHYTHM_PATTERNS[${pattern}].name`),name);
 for(const phrase of ['Your rhythm trainer','Hear & count','Start tap practice'])assert.ok(text(one.html()).includes(phrase),`${id}: ${phrase}`);
}
assert.deepEqual(s.run('RHYTHM_PATTERNS[3].events.filter(e=>e.rest).map(e=>e.b)'),[1],'“Leave a space” rests on beat 2');
assert.match(s.run('rhythmFeedback({expected:[{hit:true}],errors:[0],extra:0})'),/note attacks matched/);
// Scale steps: A minor pentatonic, then degrees, then the blues scale, then Mixolydian.
const scale=id=>open(id).run('[state.root,state.scale,state.position,state.labels]');
assert.deepEqual(scale('shape'),[9,'minorPent','shape','notes']);
assert.deepEqual(scale('home-note'),[9,'minorPent','shape','degrees']);
assert.deepEqual(scale('drone'),[9,'minorPent','shape','notes']);
assert.deepEqual(scale('blue-note'),[9,'blues','shape','notes']);
assert.deepEqual(scale('mixolydian'),[9,'mixolydian','shape','notes']);
has('shape','Hear scale');has('shape','A Minor pentatonic');has('drone','Start A drone');has('mixolydian','Start A drone');
const pc=(string,fret)=>s.run(`mod(OPEN[${string}]+${fret})`); // string 0 = thickest
assert.deepEqual([pc(0,5),pc(2,7),pc(5,5)],[9,9,9],'The three A notes named in “Find the home note”');
assert.deepEqual([pc(1,6),pc(3,8)],[3,3],'The two E♭ blue notes named in “Add the blue note”');
assert.equal(s.run('mod(9+SCALES.blues.color)'),3,'E♭ is the highlighted note of A minor blues');
for(const string of [4,5])for(const fret of [5,8])assert.ok(s.run('SCALES.minorPent.intervals').includes((pc(string,fret)+3)%12),'Frets 5 and 8 on the two thinnest strings are in A minor pentatonic');
assert.ok(s.run('SCALES.mixolydian.intervals').includes(4)&&!s.run('SCALES.minorPent.intervals').includes(4)&&s.run('SCALES.minorPent.intervals').includes(3),'Mixolydian has C♯ where minor pentatonic has C');
// Harmony and progressions.
assert.deepEqual(open('build-chord').run('[state.root,state.harmony,state.chord]'),[0,'major',0]);has('build-chord','C = C + E + G');
const blues=open('blues-chords');
assert.deepEqual(blues.run('[state.root,state.progression,state.bpm]'),[9,3,60]);
assert.deepEqual(blues.run('[0,4,8].map(i=>progName(PROGS[3],i))'),['A7','D7','E7'],'Bars 1, 5 and 9 of the blues in A');
assert.equal(blues.run('PROGS[3].seq.length'),12);
assert.deepEqual(open('twelve-bars').run('[state.root,state.progression,state.bpm]'),[9,3,60]);has('twelve-bars','Play loop');
const pop=open('pop-loop');
assert.deepEqual(pop.run('PROGS[0].seq.map((_,i)=>progName(PROGS[0],i))'),['G','D','Em','C']);assert.equal(pop.run('state.bpm'),70);
// Licks: speeds the lick page offers, and the licks the text names.
for(const [id,speed] of [['lick-slow',60],['lick-full',75],['lick-answer',60]]){
 const one=open(id);
 assert.equal(one.run('lickOptions.speed'),speed);assert.equal(one.run('lickOptions.loop'),true);
 assert.match(one.html(),new RegExp(`<option value="${speed}" selected`),`${id}: ${speed}% is a real choice on the licks page`);
}
assert.equal(s.run('BLUES_LICKS[0].name'),'The soaring question');assert.equal(s.run('BLUES_LICKS[2].name'),'The velvet answer');
has('lick-slow','Play lick 1');has('lick-answer','Play lick 3');has('lick-full','PRACTICE SPEED');
const legend=open('legend');
assert.equal(legend.run('lickOptions.speed'),60);assert.ok(legend.run('LEGEND_LICKS.length')>=5);
// Jam room: the arranged tracks and note guides the text names.
const jam=id=>open(id).run('[state.jamMode,state.studioTrack,state.jamScale,state.root]');
assert.deepEqual(jam('jam-two-strings'),['studio',0,'minorPent',9]);
assert.deepEqual(jam('land'),['studio',0,'follow',9]);
assert.deepEqual(jam('written-solo'),['studio',0,'minorPent',9]);
assert.deepEqual(jam('one-minute'),['studio',0,'minorPent',9]);
assert.deepEqual(jam('shuffle'),['studio',1,'minorPent',9]);
assert.deepEqual(s.run('BACKING_TRACKS.slice(0,2).map(t=>[t.name,t.seq.length,t.root])'),[['After midnight',8,9],['Dusty road shuffle',12,9]]);
has('jam-two-strings','Start jam');has('land','Follow each chord');has('written-solo','Try it in each style');has('written-solo','Slow minor blues · let the line breathe');has('written-solo','Play example');
// Modes: the step carries on into the Scale explorer, so the coach bar must follow it there.
const moods=open('moods');
assert.match(moods.html(),/data-explore="dorian"/);
moods.run("state.scale='dorian';navigate('scales')");
assert.match(moods.html(),/class="path-strip"/,'“Find a mood you like” keeps its coach bar in the Scale explorer');
moods.run("navigate('harmony')");
assert.doesNotMatch(moods.html(),/path-strip/);

// ---- 3. The coach bar only belongs to the lesson that was opened from the path ----
const bar=studio();
bar.run("navigate('scales')");
assert.doesNotMatch(bar.html(),/path-strip/,'Browsing a section normally shows no coach bar');
bar.run("pathStart('shape')");
assert.match(bar.html(),/path-strip/);
bar.run("navigate('path')");
assert.doesNotMatch(bar.html(),/path-strip/,'The path page has no coach bar');
bar.run("navigate('scales')");
assert.doesNotMatch(bar.html(),/path-strip/,'Leaving a step ends it; coming back to the section later is normal browsing');
// Opening a step stops sound and the microphone first, like any other navigation.
bar.run('globalThis.audioStops=0;globalThis.micStops=0;stopAudio=()=>audioStops++;stopListening=()=>micStops++;');
bar.run("pathStart('tune')");
assert.ok(bar.run('audioStops')>=1&&bar.run('micStops')>=1);
bar.run("pathStart('no-such-step')");assert.equal(bar.run('state.view'),'listen','An unknown step does nothing');

// ---- 4. Progress: marking, next step, days and totals ----
const p=studio({store:memoryStore()});
assert.equal(p.run('pathNext().id'),'tune');assert.equal(p.run('pathDoneCount()'),0);
assert.equal(p.run('pathMinutesLeft()'),steps.reduce((sum,x)=>sum+x.mins,0));
assert.equal(p.run('pathMinutesText(185)'),'3 h 5 min');assert.equal(p.run('pathMinutesText(120)'),'2 h');assert.equal(p.run('pathMinutesText(45)'),'45 min');
p.run("pathSetDone('tune',true,new Date(2026,10,14,9))");
p.run("pathSetDone('shape',true,new Date(2026,10,16,23,50))");
assert.equal(p.run('pathDoneCount()'),2);
assert.equal(p.run('pathNext().id'),'find-notes','The next step is the first one not done, even if a later one is ticked');
assert.deepEqual(p.run('({...pathProgress.done})'),{tune:'2026-11-14',shape:'2026-11-16'});
assert.deepEqual(p.run('[...pathProgress.days]'),['2026-11-14','2026-11-16']);
p.run("pathSetDone('tune',true,new Date(2026,10,16))");
assert.equal(p.run('pathProgress.done.tune'),'2026-11-14','Ticking a done step again keeps its first date');
p.run("pathSetDone('shape',false)");
assert.equal(p.run("pathIsDone('shape')"),false);assert.deepEqual(p.run('[...pathProgress.days]'),['2026-11-14','2026-11-16'],'Unticking does not erase a day of practice');
p.run("pathSetDone('made-up',true)");assert.equal(p.run('pathDoneCount()'),1,'Unknown steps are ignored');
// Days use the player's local date, including just after midnight and across a month end.
assert.equal(p.run('pathToday(new Date(2026,0,5,0,1))'),'2026-01-05');
const week=p.run('pathWeek(new Date(2026,10,16,12))');
assert.deepEqual(week.map(d=>d.day),['2026-11-10','2026-11-11','2026-11-12','2026-11-13','2026-11-14','2026-11-15','2026-11-16']);
assert.deepEqual(week.map(d=>d.practised),[false,false,false,false,true,false,true]);
assert.deepEqual(week.map(d=>d.label),['Tue','Wed','Thu','Fri','Sat','Sun','Mon']);assert.equal(week[6].today,true);
assert.deepEqual(p.run('pathWeek(new Date(2026,2,2)).map(d=>d.day)').slice(0,2),['2026-02-24','2026-02-25']);

// ---- 5. Saving: survives a reload, tolerates damaged data, works without storage ----
const saved=memoryStore();
const first=studio({store:saved});
first.run("pathSetDone('tune',true,new Date(2026,10,16))");
assert.deepEqual(JSON.parse(saved.data[KEY]),{done:{tune:'2026-11-16'},days:['2026-11-16']});
const second=studio({store:saved});
assert.equal(second.run("pathIsDone('tune')"),true,'Progress is still there after a reload');
assert.equal(second.run('pathNext().id'),'find-notes');assert.equal(second.run('pathProgress.saved'),true);
second.run('pathReset()');
assert.deepEqual(JSON.parse(saved.data[KEY]),{done:{},days:[]});assert.equal(studio({store:saved}).run('pathDoneCount()'),0);
for(const junk of ['not json','null','[]','42','{"done":[1,2],"days":"x"}','{"done":{"tune":true,"shape":"yesterday","gone":"2026-01-01","__proto__":"2026-01-01"},"days":["2026-01-01",7,"bad","2026-01-01"]}']){
 const damaged=studio({store:memoryStore({[KEY]:junk})});
 assert.equal(damaged.run('pathDoneCount()'),0,`Damaged saved data must not break the path: ${junk}`);
 assert.equal(damaged.run('pathNext().id'),'tune');
 damaged.run("navigate('path')");assert.match(damaged.html(),/Tune your guitar/);
}
assert.deepEqual(studio({store:memoryStore({[KEY]:'{"done":{},"days":["2026-01-01",7,"bad","2026-01-01"]}'})}).run('[...pathProgress.days]'),['2026-01-01']);
assert.equal(studio({store:memoryStore({[KEY]:JSON.stringify({done:{},days:Array.from({length:90},(_,i)=>`2026-${String(1+Math.floor(i/28)).padStart(2,'0')}-${String(1+i%28).padStart(2,'0')}`)})})}).run('pathProgress.days.length'),60,'Only recent practice days are kept');
// No storage at all, storage that throws when touched, and storage that is full.
for(const store of [undefined,'blocked',{getItem(){throw new Error('denied');},setItem(){throw new Error('denied');}},{getItem:()=>null,setItem(){throw new Error('QuotaExceededError');}}]){
 const none=studio({store});
 none.run("pathSetDone('tune',true)");
 assert.equal(none.run("pathIsDone('tune')"),true,'The path still works for this visit');
 assert.equal(none.run('pathProgress.saved'),false);
 none.run("navigate('path')");
 assert.match(none.html(),/not letting Fretwise save/,'Say plainly when progress cannot be saved');
}

// ---- 6. The path page ----
const page=studio({store:memoryStore()});
page.run("navigate('path')");
let html=page.html(),words=text(html);
assert.match(html,/<h1>Know what to practise next\.<\/h1>/);
assert.ok(words.includes('START HERE · STEP 1 OF 24 · ABOUT 5 MIN')&&words.includes('Start: open Fretwise listens'));
assert.equal((html.match(/<details class="panel path-stage/g)||[]).length,6);
assert.equal((html.match(/data-path-toggle="/g)||[]).length,24,'Every step can be ticked');
assert.equal((html.match(/<details[^>]*data-path-stage="[a-z-]+" open>/g)||[]).length,1,'Only the stage with the next step starts unfolded');
assert.match(html,/data-path-stage="ready" open>/);
assert.match(html,/role="img" aria-label="0 of 24 steps done"/);assert.match(html,/aria-label="Practised on 0 of the last 7 days"/);
assert.match(html,/saved in this browser on this device only\. Nothing is uploaded\./);
assert.doesNotMatch(html,/data-path-reset/,'Nothing to clear yet');
assert.match(html,/aria-pressed="false" aria-label="Not done: Tune your guitar\. Tap to mark as done\."/);
// Tick the first step from the page.
page.click({pathToggle:'tune'});
html=page.html();words=text(html);
assert.match(html,/aria-pressed="true" aria-label="Done: Tune your guitar\. Tap to mark as not done\."/);
assert.ok(words.includes('NEXT UP · STEP 2 OF 24')&&words.includes('Continue: open Fretwise listens'));
assert.match(html,/aria-label="1 of 24 steps done"/);assert.match(html,/aria-label="Practised on 1 of the last 7 days"/);
assert.match(html,/class="path-step done "/);assert.match(html,/class="path-step  next"/);
assert.equal(page.said(),'Tune your guitar: done. 1 of 24 steps done.');
assert.match(html,/Practise again →/);
// Finishing a stage unfolds the next one and marks the finished one.
for(const id of ['find-notes','count-four','eighths'])page.click({pathToggle:id});
html=page.html();
assert.match(html,/class="panel path-stage complete" data-path-stage="ready" open>/);assert.match(html,/data-path-stage="first-scale" open>/);
assert.ok(text(html).includes('✓ Done')&&text(html).includes('NEXT UP · STEP 5 OF 24'));
// Clearing progress asks first.
page.click({pathReset:'ask'});
assert.match(page.html(),/role="alert">Clear all ticks and start the path again\?/);assert.equal(page.run('pathDoneCount()'),4,'Asking clears nothing');
page.click({pathReset:'no'});
assert.doesNotMatch(page.html(),/role="alert"/);assert.equal(page.run('pathDoneCount()'),4);
page.click({pathReset:'ask'});page.click({pathReset:'yes'});
assert.equal(page.run('pathDoneCount()'),0);assert.equal(page.run('pathProgress.days.length'),0);
assert.ok(text(page.html()).includes('START HERE · STEP 1 OF 24'));assert.equal(page.said(),'Progress cleared.');

// ---- 7. Working through the path with “Done · next step” ----
const walk=studio({store:memoryStore()});
walk.click({pathStart:'tune'});
assert.equal(walk.run('state.view'),'listen');assert.equal(walk.run('pathProgress.days.length'),1,'Opening a step counts as practising today');
assert.ok(text(walk.html()).includes('✓ Done · next step'));
walk.click({pathFinish:''});
assert.equal(walk.run("pathIsDone('tune')"),true);assert.equal(walk.run('pathUi.active'),'find-notes');
assert.equal(walk.run('listen.mode'),'note','The next lesson is set up too');
assert.equal(walk.said(),'Step 1 done. Step 2 of 24: Find A, C and E.');
walk.click({pathFinish:''});
assert.equal(walk.run('state.view'),'rhythm');assert.ok(text(walk.html()).includes('STEP 3 OF 24'));
// Practising a finished step again leads on to the next step that is not done.
walk.click({pathStart:'tune'});walk.click({pathFinish:''});
assert.equal(walk.run('pathUi.active'),'count-four');
// With nothing open, the Done button's handler does nothing.
walk.run("navigate('home')");walk.click({pathFinish:''});assert.equal(walk.run('pathDoneCount()'),2);
// The last step finishes the path.
walk.run("PATH_STEPS.slice(0,-1).forEach(step=>pathSetDone(step.id,true))");
walk.click({pathStart:'legend'});
assert.ok(text(walk.html()).includes('✓ Done · finish the path'));
walk.click({pathFinish:''});
assert.equal(walk.run('state.view'),'path');assert.equal(walk.run('pathNext()'),null);assert.equal(walk.run('pathUi.active'),null);
html=walk.html();words=text(html);
assert.ok(words.includes('PATH COMPLETE')&&words.includes('You finished all 24 steps.')&&words.includes('Every step is done.'));
assert.match(html,/aria-label="24 of 24 steps done"/);assert.match(html,/href="#jam" data-view="jam">Open the jam room →/);
assert.doesNotMatch(html,/path-step  next/);
assert.equal(walk.said(),'Step done. You have finished the practice path.');

// ---- 8. Home: one wide card that starts or continues the path ----
const home=studio({store:memoryStore()});
html=home.html();
assert.match(html,/aria-label="Start here"/);assert.ok(html.indexOf('aria-label="Start here"')<html.indexOf('aria-label="Explore the theory"'),'The path comes before the section cards');
assert.match(html,/class="faceplate path-home"/);assert.match(html,/data-path-start="tune">Start: Tune your guitar →/);assert.match(html,/href="#path" data-view="path">See the whole path</);
assert.ok(text(html).includes('24 short steps take you from tuning up to your first solo.'));
assert.equal((html.match(/class="home-card"/g)||[]).length,10,'The ten section cards are unchanged');
home.run("pathSetDone('tune',true);render()");
html=home.html();
assert.ok(text(html).includes('You have done 1 of 24 steps. Next: Find A, C and E, about 5 minutes.'));assert.match(html,/data-path-start="find-notes">Continue: Find A, C and E →/);
home.run("PATH_STEPS.forEach(step=>pathSetDone(step.id,true));render()");
html=home.html();
assert.ok(text(html).includes('You finished all 24 steps.'));assert.doesNotMatch(html,/data-path-start/);assert.match(html,/class="btn primary" href="#path" data-view="path">Open the practice path →/);
// The section menu lists the path first, and the release list describes it.
assert.equal(home.run('SECTION_GROUPS[0].sections[0]'),'path');assert.ok(home.run('ICONS.path').length>20);
assert.ok(home.run("FEATURE_CATALOGUE.some(group=>group.view==='path')"),'The release list must describe the practice path');

console.log(`Practice path checks passed: ${steps.length} steps open their lessons correctly; progress, saving, the coach bar, the path page and the home card.`);
