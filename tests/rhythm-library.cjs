'use strict';
// Checks the rhythm library (site/rhythm-library.js) and the Rhythm page trainer against the real
// app code, with a fake audio clock. Nothing is played.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');

function studio({store}={}){
 const elements=new Map(),listeners={};
 const element=id=>{if(!elements.has(id))elements.set(id,{id,innerHTML:'',textContent:'',value:'',hidden:false,disabled:false,dataset:{},attrs:{},classList:{remove(){},toggle(){},add(){}},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(){},focus(){}});return elements.get(id);};
 class AudioContext{
  constructor(){this.state='running';this.currentTime=0;this.sampleRate=44100;this.destination={};}
  resume(){return Promise.resolve();}
  createBuffer(){return {};}
  createBufferSource(){return {connect(){},disconnect(){},start(){}};}
  createGain(){return {gain:{value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
  createOscillator(){const o={frequency:{value:0},connect(){},disconnect(){},start(at){o.at=at;},stop(){}};return o;}
 }
 let timerId=0;const timers=new Map();
 const document={hidden:false,body:element('body'),getElementById:element,querySelectorAll:()=>[],querySelector:()=>null,addEventListener(name,fn){(listeners[name]??=[]).push(fn);}};
 const window={AudioContext,addEventListener(name,fn){(listeners['window:'+name]??=[]).push(fn);},scrollTo(){}};
 const context={console,Math,Date,JSON,Promise,Float32Array,Uint8Array,Map,Set,URL,Blob,window,document,location:{hash:''},history:{replaceState(){},pushState(){}},
  setTimeout:(fn)=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),requestAnimationFrame:()=>0,cancelAnimationFrame(){}};
 if(store==='blocked')Object.defineProperty(context,'localStorage',{get(){throw new Error('SecurityError');}});
 else if(store)context.localStorage=store;
 const c=vm.createContext(context);
 for(const f of ['sampled-audio','sound-kit','backing','licks','rhythm-library','rhythm','releases','chords','listen','path','metronome','navigation','app'])vm.runInContext(fs.readFileSync(`site/${f}.js`,'utf8'),c,{filename:f});
 const raw=code=>vm.runInContext(code,c);
 // Copy plain data out of the sandbox so it compares equal to arrays and objects made here.
 const run=code=>{const value=raw(code);return value&&typeof value==='object'?JSON.parse(JSON.stringify(value)):value;};
 return {raw,run,element,listeners,document,timers,html:()=>element('main').innerHTML};
}
const tests=[];const test=(name,fn)=>tests.push([name,fn]);
const close=(a,b)=>Math.abs(a-b)<1e-9;
const s=studio();
const patterns=s.run('RHYTHM_PATTERNS');
const byId=id=>{const p=patterns.find(p=>p.id===id);assert.ok(p,`pattern ${id} exists`);return p;};

// ---- Task 1: meters, patterns and pure helpers ----
test('meters and accents',()=>{
 assert.deepEqual(s.run(`meterAccents('6/8')`),['strong','weak','weak','medium','weak','weak']);
 const twelve=s.run(`meterAccents('12/8')`);
 assert.equal(twelve.length,12);assert.deepEqual([3,6,9].map(i=>twelve[i]),['medium','medium','medium']);assert.equal(twelve[0],'strong');
 assert.deepEqual(s.run(`meterAccents('3/4')`),['strong','weak','weak']);
 assert.deepEqual(s.run('RHYTHM_METERS.map(m=>m.id)'),['2/4','3/4','4/4','6/8','12/8']);
 for(const m of s.run('RHYTHM_METERS'))assert.deepEqual(m.groups,s.run(`metronomeMeter('${m.id}').groups`),`${m.id} groups match the metronome`);
 assert.deepEqual(s.run('RHYTHM_TIME_FILTERS'),['all','2/4','3/4','4/4','6/8','12/8']);
});
test('first five patterns unchanged',()=>{
 assert.deepEqual(patterns.slice(0,5).map(p=>p.name),['Quarter notes','Eighth notes','Long and short','Leave a space','Sixteenth notes']);
 assert.deepEqual(patterns[3].events.filter(e=>e.rest).map(e=>e.b),[1]);
 for(const p of patterns.slice(0,5)){assert.equal(p.meter,'4/4');assert.equal(p.bpm,70);}
 assert.deepEqual(patterns[2].events.map(e=>[e.b,e.d]),[[0,1],[1,.5],[1.5,.5],[2,2]]);
});
test('library coverage',()=>{
 assert.ok(patterns.length>=19&&patterns.length<=23,`${patterns.length} patterns`);
 assert.equal(new Set(patterns.map(p=>p.id)).size,patterns.length,'ids unique');
 for(const m of ['2/4','3/4','4/4','6/8','12/8'])assert.ok(patterns.some(p=>p.meter===m),`a ${m} pattern`);
 for(const id of ['waltz','country-waltz','blues-shuffle','power-ballad','reggae-skank','jig','slow-blues-12-8','tresillo','polka'])byId(id);
 for(const p of patterns.slice(5))assert.ok(p.name.startsWith(p.meter+' '),`${p.name} starts with ${p.meter}`);
 for(const p of patterns){assert.ok(p.hint&&p.about&&p.style,`${p.id} has hint, about and style`);assert.ok(p.bpm>=40&&p.bpm<=220,`${p.id} tempo in range`);}
});
test('every bar is complete',()=>{
 for(const p of patterns){
  const bar=p.clicks*p.steps;let end=0;
  for(const h of p.hits){assert.ok(Number.isInteger(h.step)&&h.step>=end,`${p.id} hits in order, no overlap`);assert.ok(h.len>0&&h.step+h.len<=bar,`${p.id} hit inside the bar`);end=h.step+h.len;}
  assert.ok(close(p.events.reduce((a,e)=>a+e.d,0),p.clicks),`${p.id} events fill the bar`);
  for(const e of p.events)assert.ok(e.d>0,`${p.id} event length`);
  assert.equal(p.events.filter(e=>!e.rest).length,p.hits.length,`${p.id} one event per hit`);
 }
});
test('every length can be drawn',()=>{
 for(const p of patterns.filter(p=>!p.swing))for(const e of p.events)
  assert.ok(s.run(`noteValue(RHYTHM_PATTERNS.find(p=>p.id==='${p.id}'),${e.d*p.steps})`),`${p.id} ${e.rest?'rest':'note'} at ${e.b} (${e.d} clicks) can be drawn`);
 assert.deepEqual(s.run(`noteValue(RHYTHM_PATTERNS[0],6)`),{den:4,dotted:true});
 assert.deepEqual(s.run(`noteValue(RHYTHM_PATTERNS.find(p=>p.id==='jig'),4)`),{den:4,dotted:false});
 assert.equal(s.run(`noteValue(RHYTHM_PATTERNS[0],5)`),null);
});
test('swing is long-short',()=>{
 const p=byId('blues-shuffle');assert.equal(p.swing,true);assert.equal(p.steps,3);assert.equal(p.meter,'4/4');
 for(let beat=0;beat<4;beat++){const pair=p.hits.filter(h=>Math.floor(h.step/3)===beat);assert.deepEqual(pair.map(h=>[h.step%3,h.len]),[[0,2],[2,1]]);}
 assert.deepEqual(s.run(`noteValue(RHYTHM_PATTERNS.find(p=>p.id==='blues-shuffle'),2)`),{den:8,dotted:false});
});
test('reggae skank is off the beat',()=>{
 const p=byId('reggae-skank');assert.equal(p.meter,'4/4');
 for(const h of p.hits)assert.equal(h.step%4,2);
 for(const b of [0,1,2,3])assert.ok(p.events.some(e=>e.rest&&close(e.b,b)),`rest on beat ${b+1}`);
});
test('counts',()=>{
 assert.deepEqual(s.run('rhythmCounts(RHYTHM_PATTERNS[0])').join(' '),'1 e & a 2 e & a 3 e & a 4 e & a');
 assert.deepEqual(s.run(`rhythmCounts(RHYTHM_PATTERNS.find(p=>p.id==='blues-shuffle'))`).join(' '),'1 trip let 2 trip let 3 trip let 4 trip let');
 assert.deepEqual(s.run(`rhythmCounts(RHYTHM_PATTERNS.find(p=>p.id==='jig'))`).join(' '),'1 & 2 & 3 & 4 & 5 & 6 &');
});

// ---- Task 2: the library view ----
const indexOf=id=>patterns.findIndex(p=>p.id===id);
const open=(t,setup='')=>{t.raw(`${setup};state.view='rhythm';render();`);return t.html();};
const click=(t,id,dataset={})=>t.listeners.click.forEach(fn=>fn({target:{closest:sel=>/button/.test(sel)?{id,dataset,matches:()=>false}:null}}));
const change=(t,id,value,checked)=>t.listeners.change.forEach(fn=>fn({target:{id,value:String(value),checked}}));
test('trainer shows meter, style and hint',()=>{
 const t=studio(),p=byId('waltz');const html=open(t,`selectRhythm(${indexOf('waltz')})`);
 assert.ok(html.includes(p.name)&&html.includes(p.style)&&html.includes(p.hint)&&html.includes(p.about),'name, style, hint and about shown');
 assert.equal((html.match(/data-rhythm-event=/g)||[]).length,p.events.length);
 assert.ok(open(t,`selectRhythm(${indexOf('blues-shuffle')})`).includes('swung'),'the shuffle says it is swung');
});
test('time filter',()=>{
 const t=studio();t.raw(`setRhythmTime('6/8')`);
 assert.equal(t.run('RHYTHM_PATTERNS[rhythmOptions.pattern].meter'),'6/8');
 const html=open(t);
 for(const p of patterns)assert.equal(html.includes(`>${p.name}</option>`),p.meter==='6/8',`${p.name} listed only under its own time signature`);
 t.raw(`setRhythmTime('all')`);const all=open(t);
 assert.ok(all.includes('<optgroup label="4/4">')&&all.includes('<optgroup label="12/8">'),'all: grouped by time signature');
 for(const p of patterns)assert.ok(all.includes(`>${p.name}</option>`));
 change(t,'rhythm-time','3/4');assert.equal(t.run('RHYTHM_PATTERNS[rhythmOptions.pattern].meter'),'3/4');assert.equal(t.run('rhythmOptions.time'),'3/4');
});
test('selecting a pattern uses its tempo',()=>{
 const t=studio();change(t,'rhythm-pattern',indexOf('waltz'));
 assert.equal(t.run('rhythmOptions.pattern'),indexOf('waltz'));assert.equal(t.run('rhythmOptions.bpm'),byId('waltz').bpm);
});
test('tempo buttons clamp',()=>{
 const t=studio();open(t);
 t.raw('rhythmOptions.bpm=40');click(t,'rhythm-bpm-down');assert.equal(t.run('rhythmOptions.bpm'),40);
 t.raw('rhythmOptions.bpm=220');click(t,'rhythm-bpm-up');assert.equal(t.run('rhythmOptions.bpm'),220);
 t.raw('rhythmOptions.bpm=100');click(t,'rhythm-bpm-up');assert.equal(t.run('rhythmOptions.bpm'),101);assert.equal(t.element('rhythm-bpm').textContent,'101');
 assert.match(open(t),/id="rhythm-tempo" type="range" min="40" max="220"/);
});
test('practice options are stored',()=>{
 const t=studio();open(t);
 change(t,'rhythm-voice','snare');change(t,'rhythm-click','hihat');change(t,'rhythm-countin','',false);change(t,'rhythm-loops',4);
 assert.deepEqual([t.run('rhythmOptions.rhythmSound'),t.run('rhythmOptions.clickSound'),t.run('rhythmOptions.countIn'),t.run('rhythmOptions.loops')],['snare','hihat',false,4]);
 const html=open(t);assert.match(html,/id="rhythm-voice"/);assert.match(html,/id="rhythm-click"/);assert.match(html,/id="rhythm-countin"/);assert.match(html,/id="rhythm-loops"/);assert.match(html,/id="rhythm-tap-tempo"/);
});
test('dotted notes draw a dot',()=>{
 assert.match(s.run('noteSymbol(4,false,true)'),/<circle/);assert.doesNotMatch(s.run('noteSymbol(4,false,false)'),/<circle/);
 assert.notEqual(s.run('noteSymbol(8,true)'),s.run('noteSymbol(4,true)'),'an eighth rest looks different from a quarter rest');
});
test('count row length',()=>{
 const t=studio(),p=byId('slow-blues-12-8');const html=open(t,`selectRhythm(${indexOf('slow-blues-12-8')})`);
 assert.equal((html.match(/data-rhythm-tick=/g)||[]).length,p.clicks*p.steps);
});
test('path setup is respected',()=>{
 const t=studio();t.raw(`setRhythmTime('6/8')`);
 const html=open(t,`PATH_STAGES.flatMap(s=>s.steps).find(s=>s.id==='count-four').setup()`);
 assert.equal(t.run('rhythmOptions.pattern'),0);assert.match(html,/id="rhythm-bpm">70</);assert.ok(html.includes('>Quarter notes</option>'),'the 4/4 pattern is listed');
});

// ---- Task 3: playback and tap practice ----
const sched=(id,bpm,opts)=>s.run(`rhythmSchedule(RHYTHM_PATTERNS[${typeof id==='number'?id:indexOf(id)}],${bpm},${JSON.stringify(opts)})`);
const notesOf=list=>list.filter(e=>e.kind==='note'),clicksOf=list=>list.filter(e=>e.kind==='click');
// A studio whose audio is a fake clock: guitar notes and clicks are recorded, not played.
function playing(opts){
 const t=studio(opts);
 t.raw(`var heard=[],audioAsks=[];audio=new window.AudioContext();getAudio=async(o)=>{audioAsks.push(o||{});return audio;};
  playKitSound=(ctx,id,when,o={})=>{heard.push({kind:o.role,id,when,accent:o.accent,duration:o.duration});};`);
 return t;
}
// Moves the fake audio clock forward in small steps, running the scheduler's timers as it goes.
function playThrough(t,seconds){const a=t.raw('audio'),endAt=a.currentTime+seconds;while(a.currentTime<endAt-1e-9){a.currentTime=Math.min(endAt,a.currentTime+.05);const due=[...t.timers.values()];t.timers.clear();due.forEach(fn=>fn());}}
function memoryStore(initial={}){const data={...initial};return {data,getItem:k=>Object.hasOwn(data,k)?data[k]:null,setItem(k,v){data[k]=String(v);}};}
test('schedule for path patterns is unchanged',()=>{
 const sec=60/70,list=sched(0,70,{countIn:true,loops:2,sound:'both'});
 assert.equal(clicksOf(list).length,12);
 assert.ok(clicksOf(list).slice(0,4).every((c,i)=>close(c.t,i*sec)),'four count-in clicks');
 const want=[0,1].flatMap(bar=>[0,1,2,3].map(b=>(4+bar*4+b)*sec));
 assert.deepEqual(notesOf(list).map(n=>+n.t.toFixed(9)),want.map(x=>+x.toFixed(9)));
});
test('accents follow the meter',async()=>{
 assert.deepEqual(clicksOf(sched('jig',180,{countIn:false,loops:1,sound:'both'})).map(c=>c.accent),s.run(`meterAccents('6/8')`));
 const t=playing();t.raw(`selectRhythm(${indexOf('jig')});rhythmOptions.loops=1;state.view='rhythm';`);await t.raw('startRhythm()');playThrough(t,30);
 const accents=s.run(`meterAccents('6/8')`);assert.deepEqual(t.run('heard').filter(h=>h.kind==='click').map(h=>h.accent),[...accents,...accents]);
});
test('swing timing',()=>{
 const n=notesOf(sched('blues-shuffle',120,{countIn:false,loops:1,sound:'both'}));
 assert.ok(close(n[0].t,0)&&close(n[1].t,.5*2/3),'the short note falls two-thirds through the beat');
});
test('fast tempos stay clean',()=>{
 for(const id of ['slow-blues-12-8','sixteenth-notes','funk-16ths']){
  const list=sched(id,220,{countIn:true,loops:2,sound:'both'}),n=notesOf(list);
  for(let i=1;i<list.length;i++)assert.ok(list[i].t>=list[i-1].t,`${id} sorted`);
  n.forEach((x,i)=>{assert.ok(x.dur>0,`${id} positive length`);if(n[i+1])assert.ok(x.t+x.dur<=n[i+1].t+1e-9,`${id} note ${i} ends before the next`);});
 }
});
test('sound and count-in options',()=>{
 const bar=4*60/100;
 assert.ok(clicksOf(sched(0,100,{countIn:true,loops:2,sound:'rhythm'})).every(c=>c.t<bar-1e-9),'rhythm only: clicks only in the count-in');
 assert.equal(notesOf(sched(0,100,{countIn:true,loops:2,sound:'click'})).length,0);
 assert.equal(sched(0,100,{countIn:false,loops:2,sound:'both'})[0].t,0);
 assert.ok(notesOf(sched(0,100,{countIn:false,loops:2,sound:'both'}))[0].t===0,'no count-in: the rhythm starts at once');
});
test('loops',()=>{
 assert.equal(notesOf(sched('waltz',90,{countIn:true,loops:4,sound:'both'})).length,4*byId('waltz').hits.length);
});
test('tap practice uses the real attacks',async()=>{
 const t=playing();t.raw(`selectRhythm(${indexOf('blues-shuffle')});state.view='rhythm';`);await t.raw('startRhythm(true)');playThrough(t,30);
 const run=t.run('({expected:rhythmRun.expected,tolerance:rhythmRun.tolerance,when:rhythmRun.when,seconds:rhythmRun.seconds})');
 const n=notesOf(sched('blues-shuffle',96,{countIn:true,loops:2,sound:'both'})),start=run.when-4*run.seconds;
 assert.deepEqual(run.expected.map(e=>+e.at.toFixed(9)),n.map(x=>+(start+x.t).toFixed(9)));
 const gaps=n.slice(1).map((x,i)=>x.t-n[i].t);
 assert.ok(run.tolerance<=Math.min(...gaps)/2+1e-9&&run.tolerance<=.2,'tolerance never reaches the next attack');
 const heard=t.run('heard');assert.equal(heard.filter(h=>h.kind==='note').length,0,'the guitar is silent');assert.ok(heard.some(h=>h.kind==='click'));
});
test('stops cleanly',async()=>{
 for(const stop of [`change('rhythm-pattern')`,`change('rhythm-time')`,'setRhythmBpm(90)','stopAudio()','startMetronome()']){
  const t=playing();t.raw(`state.view='rhythm';render();`);await t.raw('startRhythm()');assert.ok(t.run('rhythmRun!==null'),'it starts');
  if(stop==="change('rhythm-pattern')")change(t,'rhythm-pattern',indexOf('waltz'));
  else if(stop==="change('rhythm-time')")change(t,'rhythm-time','6/8');
  else await t.raw(stop);
  assert.equal(t.run('rhythmRun'),null,`${stop} stops the rhythm`);
 }
 // An old start that finishes loading after Stop must not play.
 const t=playing();t.raw(`state.view='rhythm';var release;getAudio=()=>new Promise(r=>{release=()=>r(audio);});`);
 const late=t.raw('startRhythm()');t.raw('stopAudio()');t.raw('release()');await late;
 assert.equal(t.run('rhythmRun'),null);assert.equal(t.run('heard').length,0);
});
test('note-length demos still play four count-in clicks and two bars',async()=>{
 const t=playing();t.raw(`state.view='rhythm';setRhythmTime('6/8');`);await t.raw(`startRhythm(false,RHYTHM_VALUES.find(v=>v.key==='half'))`);playThrough(t,30);
 const heard=t.run('heard');assert.equal(heard.filter(h=>h.kind==='click').length,12);assert.deepEqual(heard.filter(h=>h.kind==='note').map(h=>h.id),['guitar','guitar','guitar','guitar'],'demos use the guitar note, which shows how long a note lasts');
});

// ---- Sound kit in the trainer ----
const startWith=async(t,setup)=>{t.raw(`state.view='rhythm';rhythmOptions.loops=1;${setup||''}`);await t.raw('startRhythm()');playThrough(t,30);return t.run('heard');};
test('sound pickers and defaults',()=>{
 const t=studio();assert.equal(t.run('rhythmOptions.rhythmSound'),'woodblock');assert.equal(t.run('rhythmOptions.clickSound'),'beep');
 const html=open(t),voice=html.match(/<select id="rhythm-voice">([\s\S]*?)<\/select>/)[1],click=html.match(/<select id="rhythm-click">([\s\S]*?)<\/select>/)[1];
 for(const id of t.run('RHYTHM_SOUND_IDS'))assert.ok(voice.includes(`value="${id}"`),`rhythm sound ${id}`);
 for(const id of t.run('CLICK_SOUND_IDS'))assert.ok(click.includes(`value="${id}"`),`click sound ${id}`);
 assert.doesNotMatch(html,/id="rhythm-sound"/,'the old sound choice is gone');
});
test('sound choices are saved in this browser',()=>{
 const store=memoryStore(),t=studio({store});change(t,'rhythm-voice','cowbell');change(t,'rhythm-click','rim');
 assert.deepEqual(JSON.parse(store.data['fretwise.rhythm.v1']),{rhythmSound:'cowbell',clickSound:'rim'});
 const again=studio({store});assert.equal(again.run('rhythmOptions.rhythmSound'),'cowbell');assert.equal(again.run('rhythmOptions.clickSound'),'rim');
});
test('broken or blocked storage falls back to the defaults',()=>{
 for(const store of ['blocked',memoryStore({'fretwise.rhythm.v1':'{not json'}),memoryStore({'fretwise.rhythm.v1':JSON.stringify({rhythmSound:'tuba',clickSound:'guitar'})})]){
  const t=studio({store});assert.equal(t.run('rhythmOptions.rhythmSound'),'woodblock');assert.equal(t.run('rhythmOptions.clickSound'),'beep');
  change(t,'rhythm-voice','clave');assert.equal(t.run('rhythmOptions.rhythmSound'),'clave','still works without saving');
 }
});
test('the chosen sounds play',async()=>{
 const heard=await startWith(playing(),`rhythmOptions.rhythmSound='clave';rhythmOptions.clickSound='cowbell';`);
 assert.ok(heard.some(h=>h.kind==='note')&&heard.filter(h=>h.kind==='note').every(h=>h.id==='clave'));
 assert.ok(heard.filter(h=>h.kind==='click').every(h=>h.id==='cowbell'));
});
test('only the needed samples load',async()=>{
 for(const [voice,click,want] of [['woodblock','beep',[]],['snare','beep',['drums']],['guitar','hihat',['guitar','drums']]]){
  const t=playing();await startWith(t,`rhythmOptions.rhythmSound='${voice}';rhythmOptions.clickSound='${click}';`);
  assert.deepEqual(t.run('audioAsks')[0].instruments,want,`${voice} + ${click}`);
 }
});
test('click off: the count-in still beeps, then only the rhythm',async()=>{
 const heard=await startWith(playing(),`rhythmOptions.clickSound='off';`),clicks=heard.filter(h=>h.kind==='click');
 assert.equal(clicks.length,4);assert.ok(clicks.every(h=>h.id==='beep'));assert.ok(heard.some(h=>h.kind==='note'));
});
test('rhythm off: clicks only',async()=>{
 const heard=await startWith(playing(),`rhythmOptions.rhythmSound='off';`);
 assert.equal(heard.filter(h=>h.kind==='note').length,0);assert.equal(heard.filter(h=>h.kind==='click').length,8);
});
test('tap practice keeps the click even when it is off',async()=>{
 const t=playing();t.raw(`state.view='rhythm';rhythmOptions.loops=1;rhythmOptions.clickSound='off';`);await t.raw('startRhythm(true)');playThrough(t,30);
 const heard=t.run('heard');assert.equal(heard.filter(h=>h.kind==='note').length,0);assert.equal(heard.filter(h=>h.kind==='click').length,8);
 assert.deepEqual(t.run('audioAsks')[0].instruments,[],'practice does not load the rhythm sound');
});

// ---- Unlimited loop: bars are scheduled a little ahead while playing ----
test('bars menu has Until I stop',()=>{
 const t=studio();const html=open(t),bars=html.match(/<select id="rhythm-loops">([\s\S]*?)<\/select>/)[1];
 assert.match(bars,/value="0"[^>]*>Until I stop</);
 change(t,'rhythm-loops',0);assert.equal(t.run('rhythmOptions.loops'),0,'0 means unlimited, not the default');
 assert.match(t.run('rhythmPlanText()'),/until you press Stop/);
 change(t,'rhythm-loops','junk');assert.equal(t.run('rhythmOptions.loops'),2);
});
test('finite runs play exactly their bars',async()=>{
 const t=playing();t.raw(`state.view='rhythm';rhythmOptions.loops=2;`);await t.raw('startRhythm()');playThrough(t,30);
 const heard=t.run('heard');assert.equal(heard.filter(h=>h.kind==='note').length,8);assert.equal(heard.filter(h=>h.kind==='click').length,12);
 assert.equal(t.timers.size,0,'nothing left running');
});
test('nothing is scheduled far ahead',async()=>{
 const t=playing();t.raw(`state.view='rhythm';rhythmOptions.loops=0;rhythmOptions.bpm=120;`);await t.raw('startRhythm()');
 const heard=t.run('heard');assert.ok(heard.length>0);assert.ok(heard.every(h=>h.when<0.12+0.3+2+1e-9),'only the next bar is queued');
});
test('Until I stop keeps going, and Stop ends it',async()=>{
 const t=playing();t.raw(`state.view='rhythm';rhythmOptions.loops=0;rhythmOptions.bpm=120;`);await t.raw('startRhythm()');
 playThrough(t,40);
 const notes=t.run('heard').filter(h=>h.kind==='note');assert.ok(notes.length>=4*15,`at least 15 bars after 40 s, got ${notes.length/4}`);
 assert.ok(t.timers.size>0,'still running');
 t.raw('stopAudio()');const before=t.run('heard').length;playThrough(t,10);
 assert.equal(t.run('heard').length,before,'nothing plays after Stop');assert.equal(t.run('rhythmRun'),null);
});
test('Stop in unlimited tap practice shows the score so far',async()=>{
 const t=playing();t.raw(`state.view='rhythm';rhythmOptions.loops=0;rhythmOptions.bpm=60;`);await t.raw('startRhythm(true)');
 playThrough(t,6.5);
 const attacks=t.run('rhythmRun.expected').map(e=>e.at).filter(at=>at<6.5);
 for(const at of attacks.slice(0,3)){t.raw(`audio.currentTime=${at+0.01};tapRhythm();`);}
 t.raw('audio.currentTime=6.5');click(t,'rhythm-stop');
 assert.match(t.element('audio-status').textContent,new RegExp(`3/${attacks.length} note attacks matched`));
 assert.equal(t.run('rhythmRun'),null);
});

(async()=>{for(const[name,fn]of tests){try{await fn();}catch(error){console.error(`✗ ${name}`);throw error;}}console.log(`rhythm-library: ok (${tests.length} checks)`);})().catch(error=>{console.error(error);process.exit(1);});
