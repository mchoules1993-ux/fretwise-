'use strict';
// Checks the standalone metronome against the real app code, with a fake audio clock and timers.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');

function studio({store}={}){
 const elements=new Map(),listeners={};
 const element=id=>{if(!elements.has(id))elements.set(id,{id,innerHTML:'',textContent:'',value:'',hidden:false,disabled:false,dataset:{},attrs:{},classList:{remove(){},toggle(){}},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(){},focus(){}});return elements.get(id);};
 // Fake audio clock: oscillators record when they would sound; nothing is played.
 const started=[];
 class AudioContext{
  constructor(){this.state='running';this.currentTime=0;this.sampleRate=44100;this.destination={};}
  resume(){return Promise.resolve();}
  createBuffer(){return {};}
  createBufferSource(){return {connect(){},disconnect(){},start(){}};}
  createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
  createOscillator(){const o={frequency:{value:0},stopped:false,connect(){},disconnect(){},start(at){o.at=at;started.push(o);},stop(at){if(at===undefined)o.stopped=true;}};return o;}
 }
 // Timers run only when the test says so, so the scheduler can be stepped through time.
 let timerId=0;const timers=new Map();
 const document={hidden:false,body:element('body'),getElementById:element,querySelectorAll:()=>[],querySelector:()=>null,addEventListener(name,fn){(listeners[name]??=[]).push(fn);}};
 const window={AudioContext,addEventListener(name,fn){(listeners['window:'+name]??=[]).push(fn);},scrollTo(){}};
 const context={console,Math,Date,JSON,Promise,Float32Array,Uint8Array,Map,Set,URL,Blob,window,document,location:{hash:''},history:{replaceState(){},pushState(){}},
  setTimeout:(fn)=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),requestAnimationFrame:()=>0,cancelAnimationFrame(){}};
 if(store==='blocked')Object.defineProperty(context,'localStorage',{get(){throw new Error('SecurityError');}});
 else if(store)context.localStorage=store;
 const c=vm.createContext(context);
 for(const f of ['sampled-audio','backing','licks','rhythm-library','rhythm','releases','chords','listen','path','metronome','navigation','app'])vm.runInContext(fs.readFileSync(`site/${f}.js`,'utf8'),c,{filename:f});
 const run=code=>vm.runInContext(code,c);
 const flush=()=>{const due=[...timers.values()];timers.clear();due.forEach(fn=>fn());};
 const at=t=>{run('metronome.ctx').currentTime=t;flush();};
 // A click on the button with this id. Handlers that look for other kinds of target find nothing.
 const click=id=>{const button={id,dataset:{},matches:()=>false};listeners.click.forEach(fn=>fn({target:{closest:sel=>/(^|,)\s*button\b/.test(sel)?button:null}}));};
 return {run,element,started,flush,at,click,listeners,document,timers};
}
function memoryStore(initial={}){const data={...initial};return {data,getItem:k=>Object.hasOwn(data,k)?data[k]:null,setItem(k,v){data[k]=String(v);}};}
const close=(a,b)=>Math.abs(a-b)<1e-9;
const tests=[];const test=(name,fn)=>tests.push([name,fn]);

// ---- Pure helpers ----
test('accents follow the time signature',()=>{
 const s=studio(),acc=id=>JSON.parse(s.run(`JSON.stringify(metronomeAccents('${id}'))`));
 assert.deepEqual(acc('2/4'),['strong','weak']);
 assert.deepEqual(acc('3/4'),['strong','weak','weak']);
 assert.deepEqual(acc('4/4'),['strong','weak','weak','weak']);
 assert.equal(acc('5/4').length,5);
 assert.deepEqual(acc('6/8'),['strong','weak','weak','medium','weak','weak']);
 assert.deepEqual(acc('7/8'),['strong','weak','medium','weak','medium','weak','weak']);
 const twelve=acc('12/8');assert.equal(twelve.length,12);assert.deepEqual([0,3,6,9].map(i=>twelve[i]),['strong','medium','medium','medium']);
 assert.deepEqual(acc('9/9'),acc('4/4'),'An unknown meter falls back to 4/4');
 assert.deepEqual(JSON.parse(s.run('JSON.stringify(METRONOME_METERS.map(m=>m.id))')),['2/4','3/4','4/4','5/4','6/8','7/8','12/8']);
});
test('tempo stays between 40 and 220 whole BPM',()=>{
 const s=studio(),clamp=v=>s.run(`clampMetronomeBpm(${JSON.stringify(v)})`);
 assert.equal(clamp(10),40);assert.equal(clamp(300),220);assert.equal(clamp('95.6'),96);
 assert.equal(clamp('abc'),80);assert.equal(clamp(null),80);assert.equal(clamp(''),80);
});
test('tap tempo averages recent taps and restarts after a pause',()=>{
 const s=studio(),tap=t=>s.run(`tapTempoBpm(${JSON.stringify(t)})`);
 assert.equal(tap([0,500,1000,1500]),120);
 assert.equal(tap([0]),null);assert.equal(tap([]),null);
 assert.equal(tap([0,500,1000,5000,5600]),100,'A gap over two seconds starts a new run');
 assert.equal(tap([0,1000,1500,2000,2500,3000]),120,'Only the last four gaps count');
 assert.equal(tap([0,100,200]),220,'Very fast taps are capped');
});
test('settings load safely and round-trip',()=>{
 assert.deepEqual(JSON.parse(studio({store:memoryStore({'fretwise.metronome.v1':'{bad'})}).run('JSON.stringify(loadMetronomeSettings())')),{bpm:80,meter:'4/4'});
 assert.deepEqual(JSON.parse(studio({store:memoryStore({'fretwise.metronome.v1':'{"bpm":500,"meter":"9/9"}'})}).run('JSON.stringify(loadMetronomeSettings())')),{bpm:220,meter:'4/4'});
 const blocked=studio({store:'blocked'});
 assert.deepEqual(JSON.parse(blocked.run('JSON.stringify(loadMetronomeSettings())')),{bpm:80,meter:'4/4'});
 blocked.run("setMetronomeBpm(100)");assert.equal(blocked.run('metronome.bpm'),100,'A blocked store must not break the controls');
 const store=memoryStore(),s=studio({store});
 s.run("setMetronomeBpm(132);setMetronomeMeter('6/8')");
 assert.deepEqual(JSON.parse(store.data['fretwise.metronome.v1']),{bpm:132,meter:'6/8'});
 assert.deepEqual(JSON.parse(studio({store}).run('JSON.stringify({bpm:metronome.bpm,meter:metronome.meter})')),{bpm:132,meter:'6/8'},'Saved settings come back on the next visit');
});

// ---- Timing ----
async function running(opts){const s=studio(opts);s.run('setMetronomeBpm(120)');await s.run('startMetronome()');return s;}
test('clicks land on the audio clock at exact spacing, beat 1 accented',async()=>{
 const s=await running();
 assert.equal(s.run('metronome.running'),true);
 for(let t=0;t<=4;t+=.03)s.at(t);
 const times=s.started.map(o=>o.at);
 assert.ok(times.length>=8,'Expected at least eight clicks in four seconds');
 assert.ok(close(times[0],.08));
 times.slice(1).forEach((t,i)=>assert.ok(close(t-times[i],.5),`Click ${i+2} should be 0.5 s after the one before at 120 BPM`));
 assert.deepEqual(s.started.slice(0,8).map(o=>o.frequency.value),[1760,1050,1050,1050,1760,1050,1050,1050]);
 assert.equal(s.element('stop-all').disabled,false,'Stop audio is available while the metronome runs');
 s.run('stopMetronome()');
});
test('a tempo change applies from the next click, with no burst',async()=>{
 const s=await running();
 for(let t=0;t<=1;t+=.03)s.at(t);
 const before=s.started.length;s.run('setMetronomeBpm(60)');
 for(let t=1;t<=4;t+=.03)s.at(t);
 const times=s.started.map(o=>o.at);
 assert.ok(close(times[before]-times[before-1],.5),'The click already due keeps the old spacing');
 times.slice(before+1).forEach((t,i)=>assert.ok(close(t-times[before+i],1),'Then clicks are one second apart at 60 BPM'));
 s.run('stopMetronome()');
});
test('a time signature change restarts the bar on the next click',async()=>{
 const s=await running();
 for(let t=0;t<=.7;t+=.03)s.at(t);
 const before=s.started.length;s.run("setMetronomeMeter('3/4')");
 for(let t=.7;t<=3;t+=.03)s.at(t);
 assert.deepEqual(s.started.slice(before,before+4).map(o=>o.frequency.value),[1760,1050,1050,1760]);
 s.run('stopMetronome()');
});
test('after a long stall it carries on from now instead of catching up',async()=>{
 const s=await running();
 s.at(.03);const before=s.started.length;
 s.at(30);
 assert.ok(s.started.length-before<=1,'No burst of late clicks');
 assert.ok(s.started.at(-1).at>=30,'The next click is in the future');
 s.run('stopMetronome()');
});
test('pressing Start twice quickly runs one metronome, not two',async()=>{
 const s=studio();s.run('setMetronomeBpm(120)');
 await Promise.all([s.run('startMetronome()'),s.run('startMetronome()')]);
 for(let t=0;t<=2;t+=.03)s.at(t);
 const times=s.started.map(o=>o.at);
 assert.equal(new Set(times.map(t=>t.toFixed(6))).size,times.length,'No click is scheduled twice');
 s.run('stopMetronome()');
});

// ---- When it stops, and when it does not ----
test('another sound starting stops the metronome and its pending clicks',async()=>{
 const s=await running();s.at(.03);
 await s.run('getAudio({instruments:[]})');
 assert.equal(s.run('metronome.running'),false);
 assert.ok(s.started.every(o=>o.stopped),'Clicks already queued are cancelled');
 assert.equal(s.timers.size,0,'The scheduler stops');
});
test('a silent WAV export does not stop it',async()=>{
 const s=await running();await s.run('getAudio({feedback:false,instruments:[]})');
 assert.equal(s.run('metronome.running'),true);s.run('stopMetronome()');
});
test('changing page or key keeps it running',async()=>{
 const s=await running();
 s.run("navigate('scales')");s.run("change('root',3)");
 assert.equal(s.run('metronome.running'),true);
 assert.equal(s.element('stop-all').disabled,false);
 s.run('stopMetronome()');
});
test('Stop audio stops it',async()=>{
 const s=await running();s.click('stop-all');
 assert.equal(s.run('metronome.running'),false);
 assert.equal(s.element('stop-all').disabled,true);
});
test('the Start/Stop button in the panel toggles it',async()=>{
 const s=studio();s.click('metro-start');await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));
 assert.equal(s.run('metronome.running'),true);assert.equal(s.element('metro-start').textContent,'■ Stop');
 assert.match(s.element('metro-toggle').textContent,/80 · 4\/4/,'The bar button shows it is on');
 s.click('metro-start');assert.equal(s.run('metronome.running'),false);assert.equal(s.element('metro-start').textContent,'▶ Start');
});
test('hiding the page stops it',async()=>{
 const s=await running();s.document.hidden=true;s.listeners.visibilitychange.forEach(fn=>fn());
 assert.equal(s.run('metronome.running'),false);
});
test('an audio interruption (phone call, lock screen) stops it',async()=>{
 const s=await running(),ctx=s.run('metronome.ctx');ctx.state='interrupted';ctx.onstatechange();
 assert.equal(s.run('metronome.running'),false);
});
test('the microphone starting stops it',async()=>{
 const s=await running();await s.run('startListening()');
 assert.equal(s.run('metronome.running'),false);
});
test('the panel opens and closes',()=>{
 const s=studio();assert.equal(s.element('metro-panel').hidden,true);
 s.click('metro-toggle');assert.equal(s.element('metro-panel').hidden,false);assert.equal(s.element('metro-toggle').attrs['aria-expanded'],'true');
 s.click('metro-close');assert.equal(s.element('metro-panel').hidden,true);
 assert.match(s.element('metro-panel').innerHTML,/id="metro-meter"/);
 assert.match(s.element('metro-panel').innerHTML,/<option value="6\/8">6\/8<\/option>/);
});

(async()=>{for(const[name,fn]of tests){try{await fn();}catch(error){console.error(`✗ ${name}`);throw error;}}console.log(`metronome: ok (${tests.length} checks)`);})().catch(error=>{console.error(error);process.exit(1);});
