'use strict';
// Standalone metronome: a steady click for practising scales, and songs with no backing track.
// It lives in the audio bar at the bottom of every page and keeps running when you change page.
// It shares the studio's AudioContext. Starting any other sound stops it (see getAudio in app.js),
// and so do Stop audio, hiding the page and the microphone starting.

// groups: how the clicks in one bar are grouped. The first click of the bar is strong; the first
// click of every other group is medium; the rest are weak. BPM always counts every click.
const METRONOME_METERS=[
 {id:'2/4',groups:[2],hint:'Two beats in a bar: ONE two. Marches and polkas.'},
 {id:'3/4',groups:[3],hint:'Three beats: ONE two three. Waltzes and many folk songs.'},
 {id:'4/4',groups:[4],hint:'Four beats: ONE two three four. Most rock, pop and blues.'},
 {id:'5/4',groups:[5],hint:'Five beats: ONE two three four five. Uneven and restless.'},
 {id:'6/8',groups:[3,3],hint:'Six quick clicks in two groups of three: ONE two three FOUR five six. It feels like two slow beats.'},
 {id:'7/8',groups:[2,2,3],hint:'Seven quick clicks, grouped 2 + 2 + 3: ONE two THREE four FIVE six seven.'},
 {id:'12/8',groups:[3,3,3,3],hint:'Twelve quick clicks in four groups of three. The feel of slow blues and many shuffles.'}
];
const METRONOME_MIN=40,METRONOME_MAX=220,METRONOME_KEY='fretwise.metronome.v1';
const METRONOME_DEFAULTS={bpm:80,meter:'4/4'};
const METRONOME_SOUNDS={strong:{freq:1760,gain:.34},medium:{freq:1320,gain:.24},weak:{freq:1050,gain:.17}};
// Clicks are put on the audio clock a little ahead of time, so browser timer delays never move them.
const METRONOME_AHEAD=.12,METRONOME_TICK_MS=25,METRONOME_TAP_RESET_MS=2000;

const metronome={...METRONOME_DEFAULTS,running:false,starting:false,open:false,ctx:null,next:0,click:0,generation:0,timer:0,frame:0,nodes:[],queue:[],taps:[]};

function metronomeMeter(id){return METRONOME_METERS.find(m=>m.id===id)||METRONOME_METERS.find(m=>m.id===METRONOME_DEFAULTS.meter);}
function metronomeAccents(id){
 const out=[];metronomeMeter(id).groups.forEach((size,g)=>{for(let i=0;i<size;i++)out.push(i>0?'weak':g===0?'strong':'medium');});
 return out;
}
function clampMetronomeBpm(value,fallback=METRONOME_DEFAULTS.bpm){
 const n=Number(value);if(value===null||value===''||!Number.isFinite(n))return fallback;
 return Math.max(METRONOME_MIN,Math.min(METRONOME_MAX,Math.round(n)));
}
// times: tap moments in milliseconds, oldest first. Uses the last run of taps (a gap of more than
// two seconds starts a new run) and at most its last four gaps. Needs two taps.
function tapTempoBpm(times){
 const run=[];for(let i=times.length-1;i>=0;i--){if(run.length&&run[0]-times[i]>METRONOME_TAP_RESET_MS)break;run.unshift(times[i]);}
 const recent=run.slice(-5);if(recent.length<2)return null;
 const gap=(recent[recent.length-1]-recent[0])/(recent.length-1);
 return gap>0?clampMetronomeBpm(60000/gap):null;
}

// Settings are kept on this device only. A blocked or broken store falls back to the defaults.
function metronomeStore(){try{return typeof localStorage==='undefined'?null:localStorage;}catch{return null;}}
function loadMetronomeSettings(store=metronomeStore()){
 try{const saved=JSON.parse(store?.getItem(METRONOME_KEY)||'null');if(!saved||typeof saved!=='object')return {...METRONOME_DEFAULTS};
  return {bpm:clampMetronomeBpm(saved.bpm),meter:METRONOME_METERS.some(m=>m.id===saved.meter)?saved.meter:METRONOME_DEFAULTS.meter};
 }catch{return {...METRONOME_DEFAULTS};}
}
function saveMetronomeSettings(store=metronomeStore(),settings=metronome){
 try{store?.setItem(METRONOME_KEY,JSON.stringify({bpm:settings.bpm,meter:settings.meter}));}catch{}
}

function metronomeRunning(){return metronome.running||metronome.starting;}
function metronomeClick(ctx,when,accent){
 const s=METRONOME_SOUNDS[accent],o=ctx.createOscillator(),g=ctx.createGain();
 o.frequency.value=s.freq;g.gain.setValueAtTime(.0001,when);g.gain.linearRampToValueAtTime(s.gain,when+.002);g.gain.exponentialRampToValueAtTime(.0001,when+.05);
 o.connect(g);g.connect(ctx.destination);o.start(when);o.stop(when+.06);
 metronome.nodes.push(o);o.onended=()=>{o.disconnect();g.disconnect();metronome.nodes=metronome.nodes.filter(n=>n!==o);};
}
function metronomePump(generation){
 if(generation!==metronome.generation||!metronome.running)return;
 const ctx=metronome.ctx;
 // After a long stall (a busy or throttled page), carry on from now instead of a burst of late clicks.
 if(metronome.next<ctx.currentTime-.05)metronome.next=ctx.currentTime+.05;
 while(metronome.next<ctx.currentTime+METRONOME_AHEAD){
  const accents=metronomeAccents(metronome.meter),index=metronome.click%accents.length;
  metronomeClick(ctx,metronome.next,accents[index]);metronome.queue.push({at:metronome.next,index});
  metronome.click=index+1;metronome.next+=60/metronome.bpm;
 }
 metronome.timer=setTimeout(()=>metronomePump(generation),METRONOME_TICK_MS);
}
function metronomeFrame(generation){
 if(generation!==metronome.generation||!metronome.running)return;
 let current=null;while(metronome.queue.length&&metronome.queue[0].at<=metronome.ctx.currentTime)current=metronome.queue.shift();
 if(current)showMetronomeBeat(current.index);
 metronome.frame=requestAnimationFrame(()=>metronomeFrame(generation));
}
async function startMetronome(){
 const generation=++metronome.generation;metronome.starting=true;updateMetronomeUI();
 stopAudio();
 let ctx=null;try{ctx=await getAudio({instruments:[],metronome:true,loadingMessage:'Starting the metronome…'});}catch{ctx=null;}
 if(generation!==metronome.generation)return;
 metronome.starting=false;
 if(!ctx){updateMetronomeUI();transportActive(playing||audioPending);status('The metronome could not start. Check your device volume and try again.');return;}
 Object.assign(metronome,{ctx,running:true,click:0,next:ctx.currentTime+.08,queue:[]});
 transportActive(true);metronomePump(generation);metronome.frame=requestAnimationFrame(()=>metronomeFrame(generation));
 updateMetronomeUI();status(`Metronome on · ${metronome.bpm} BPM · ${metronome.meter}`);
}
// Returns true if it was running (or starting) and is now stopped.
function stopMetronome(){
 const was=metronomeRunning();metronome.generation++;
 clearTimeout(metronome.timer);cancelAnimationFrame(metronome.frame);
 metronome.nodes.forEach(n=>{try{n.stop();}catch{}});
 Object.assign(metronome,{running:false,starting:false,nodes:[],queue:[]});
 if(was){updateMetronomeUI();transportActive(playing||audioPending);}
 return was;
}

function setMetronomeBpm(value){
 metronome.bpm=clampMetronomeBpm(value,metronome.bpm);saveMetronomeSettings();updateMetronomeUI();
 if(metronome.running)status(`Metronome · ${metronome.bpm} BPM · ${metronome.meter}`);
}
function setMetronomeMeter(id){
 metronome.meter=metronomeMeter(id).id;metronome.click=0;metronome.queue=[];saveMetronomeSettings();renderMetronomeLights();updateMetronomeUI();
 if(metronome.running)status(`Metronome · ${metronome.bpm} BPM · ${metronome.meter}`);
}
function tapMetronome(now=Date.now()){
 metronome.taps=[...metronome.taps.filter(t=>now-t<=METRONOME_TAP_RESET_MS*5),now].slice(-8);
 const bpm=tapTempoBpm(metronome.taps);
 if(bpm)setMetronomeBpm(bpm);else status('Keep tapping in time: two or more taps set the tempo.');
}
function setMetronomeOpen(open){
 metronome.open=open;
 const panel=document.getElementById('metro-panel'),toggle=document.getElementById('metro-toggle');
 if(panel)panel.hidden=!open;if(toggle)toggle.setAttribute('aria-expanded',String(open));
}

function metronomePanel(){
 return `<div class="metro-head"><span class="eyebrow">METRONOME</span><button class="btn small" id="metro-close" type="button" aria-label="Close metronome">✕</button></div>
 <div class="metro-tempo"><button class="btn metro-step" id="metro-down" type="button" aria-label="1 BPM slower">–</button><label for="metro-bpm" class="metro-readout"><output id="metro-bpm-value">${metronome.bpm}</output> <span>BPM</span></label><button class="btn metro-step" id="metro-up" type="button" aria-label="1 BPM faster">+</button></div>
 <input id="metro-bpm" type="range" min="${METRONOME_MIN}" max="${METRONOME_MAX}" step="1" value="${metronome.bpm}" aria-valuetext="${metronome.bpm} clicks per minute">
 <div class="metro-row"><div class="field"><label for="metro-meter">TIME SIGNATURE</label><select id="metro-meter">${METRONOME_METERS.map(m=>`<option value="${m.id}"${m.id===metronome.meter?' selected':''}>${m.id}</option>`).join('')}</select></div><button class="btn" id="metro-tap" type="button">Tap tempo</button><button class="btn primary" id="metro-start" type="button" aria-pressed="false">▶ Start</button></div>
 <div class="metro-lights" id="metro-lights" aria-hidden="true"></div>
 <p class="tiny" id="metro-hint"></p>
 <p class="tiny metro-note">Playing anything else in the studio stops the metronome. Close this panel to see the page; the click keeps going.</p>`;
}
function renderMetronomeLights(){
 const lights=document.getElementById('metro-lights');if(!lights)return;
 lights.innerHTML=metronomeAccents(metronome.meter).map((a,i)=>`<i data-metro-light="${i}" class="${a}"><b>${i+1}</b></i>`).join('');
}
function showMetronomeBeat(index){
 document.querySelectorAll('[data-metro-light]').forEach(e=>e.classList.toggle('on',Number(e.dataset.metroLight)===index));
}
function updateMetronomeUI(){
 const on=metronomeRunning(),byId=id=>document.getElementById(id);
 const toggle=byId('metro-toggle');
 if(toggle){toggle.textContent=metronome.running?`♩ ${metronome.bpm} · ${metronome.meter}`:'♩ Metronome';toggle.classList.toggle('metro-on',metronome.running);}
 const start=byId('metro-start');if(start){start.textContent=on?'■ Stop':'▶ Start';start.setAttribute('aria-pressed',String(on));}
 const value=byId('metro-bpm-value');if(value)value.textContent=metronome.bpm;
 const slider=byId('metro-bpm');if(slider){slider.value=metronome.bpm;slider.setAttribute('aria-valuetext',`${metronome.bpm} clicks per minute`);}
 const meter=byId('metro-meter');if(meter)meter.value=metronome.meter;
 // In /8 time each click is a quick eighth note, so the same song needs a bigger number.
 const hint=byId('metro-hint');if(hint)hint.textContent=metronomeMeter(metronome.meter).hint+(metronome.meter.endsWith('/8')?' BPM counts every click, so try about 120–180.':'');
 if(!metronome.running)document.querySelectorAll('[data-metro-light]').forEach(e=>e.classList.remove('on'));
}
function setupMetronome(){
 Object.assign(metronome,loadMetronomeSettings());
 const panel=document.getElementById('metro-panel');if(panel)panel.innerHTML=metronomePanel();
 renderMetronomeLights();updateMetronomeUI();setMetronomeOpen(false);
}

document.addEventListener('click',e=>{
 const b=e.target.closest?.('button');if(!b)return;
 if(b.id==='metro-toggle')setMetronomeOpen(!metronome.open);
 else if(b.id==='metro-close'){setMetronomeOpen(false);document.getElementById('metro-toggle')?.focus();}
 else if(b.id==='metro-start'){if(metronomeRunning()){stopMetronome();status('Metronome stopped.');}else startMetronome();}
 else if(b.id==='metro-down')setMetronomeBpm(metronome.bpm-1);
 else if(b.id==='metro-up')setMetronomeBpm(metronome.bpm+1);
 else if(b.id==='metro-tap')tapMetronome();
});
document.addEventListener('input',e=>{if(e.target.id==='metro-bpm')setMetronomeBpm(e.target.value);});
document.addEventListener('change',e=>{if(e.target.id==='metro-meter')setMetronomeMeter(e.target.value);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&metronome.open&&e.target.closest?.('#metro-panel')){setMetronomeOpen(false);document.getElementById('metro-toggle')?.focus();}});
setupMetronome();
