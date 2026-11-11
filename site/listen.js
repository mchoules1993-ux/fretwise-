'use strict';
// Fretwise listens: a small trial of microphone note detection.
// Fretwise asks for A, C or E, the player holds the note, and the app says what it heard.
// It also has a tuner for standard tuning, which uses the same microphone and pitch detection.
// Sound is analysed in the browser only; nothing is recorded or uploaded.

const LISTEN_NAMES=['C','D♭','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
const LISTEN_STRINGS=['low E','A','D','G','B','high E'];
const LISTEN_OPEN=[40,45,50,55,59,64];
// Each target note has three easy places to play it (string 0 = low E).
const LISTEN_TARGETS=[
 {name:'A',pc:9,spots:[{string:0,fret:5},{string:1,fret:0},{string:3,fret:2}]},
 {name:'C',pc:0,spots:[{string:1,fret:3},{string:0,fret:8},{string:4,fret:1}]},
 {name:'E',pc:4,spots:[{string:0,fret:0},{string:2,fret:2},{string:4,fret:5}]}
];
const LISTEN_TUNING={minHz:70,maxHz:1100,quietRms:.004,yinThreshold:.15,matchMs:250,missMs:600,unclearMs:900,gapMs:150};

function listenMod(n){return (n%12+12)%12}
function listenNoteName(midi){const m=Math.round(midi);return LISTEN_NAMES[listenMod(m)]+(Math.floor(m/12)-1)}

// YIN pitch detection on one block of samples.
// Returns {kind:'quiet'} when there is too little sound, {kind:'unclear'} when there is sound
// but no clear single pitch, or {kind:'note',hz,midi,pc,cents} for a clear note.
function detectPitch(buf,sampleRate,tuning=LISTEN_TUNING){
 const n=buf.length;let sum=0;for(let i=0;i<n;i++)sum+=buf[i]*buf[i];
 const rms=Math.sqrt(sum/n);
 if(rms<tuning.quietRms)return {kind:'quiet',rms};
 const maxTau=Math.min(Math.floor(sampleRate/tuning.minHz),n>>1),minTau=Math.max(2,Math.floor(sampleRate/tuning.maxHz)),w=n-maxTau-1;
 const cmnd=new Float32Array(maxTau+2);cmnd[0]=1;let running=0;
 for(let tau=1;tau<=maxTau+1;tau++){
  let d=0;for(let i=0;i<w;i++){const x=buf[i]-buf[i+tau];d+=x*x;}
  running+=d;cmnd[tau]=running>0?d*tau/running:1;
 }
 let tau=-1;
 for(let t=minTau;t<=maxTau;t++){if(cmnd[t]<tuning.yinThreshold){while(t+1<=maxTau&&cmnd[t+1]<cmnd[t])t++;tau=t;break;}}
 if(tau<0)return {kind:'unclear',rms};
 // Parabolic interpolation gives a fractional period, so tuning readouts are accurate.
 const a=cmnd[tau-1],b=cmnd[tau],c=cmnd[tau+1],den=a-2*b+c;
 const period=den>0?tau+(a-c)/(2*den):tau;
 const hz=sampleRate/period,midi=69+12*Math.log2(hz/440),nearest=Math.round(midi);
 return {kind:'note',hz,midi,pc:listenMod(nearest),cents:Math.round((midi-nearest)*100),clarity:1-b,rms};
}

// Turns a stream of detected frames into a decision for one target note.
// Results: waiting (nothing to judge), hearing (a note, not held long enough yet),
// match, miss (a different note, clearly heard and held) or unclear (sound, but no clear pitch).
// Unclear sound is never marked as a miss. ignorePc lets the previous note ring on without counting.
function createListenJudge(targetPc,{ignorePc=null,tuning=LISTEN_TUNING}={}){
 let run=null,unclearSince=null,ignoring=ignorePc;
 return function judge(frame,now){
  if(frame.kind==='quiet'){run=null;unclearSince=null;ignoring=null;return {result:'waiting'};}
  if(frame.kind==='unclear'){
   if(run&&now-run.last<=tuning.gapMs)return {result:'hearing',pc:run.pc};
   run=null;if(unclearSince===null)unclearSince=now;
   return {result:now-unclearSince>=tuning.unclearMs?'unclear':'waiting'};
  }
  unclearSince=null;
  if(ignoring!==null){if(frame.pc===ignoring)return {result:'waiting'};ignoring=null;}
  if(run&&run.pc===frame.pc&&now-run.last<=tuning.gapMs)run.last=now;else run={pc:frame.pc,since:now,last:now};
  const held=now-run.since;
  if(frame.pc===targetPc&&held>=tuning.matchMs)return {result:'match',pc:frame.pc};
  if(frame.pc!==targetPc&&held>=tuning.missMs)return {result:'miss',pc:frame.pc};
  return {result:'hearing',pc:frame.pc};
 };
}

// ---- Tuner (standard tuning) ----
const TUNER_STRINGS=[
 {name:'E',label:'Low E',midi:40},{name:'A',label:'A',midi:45},{name:'D',label:'D',midi:50},
 {name:'G',label:'G',midi:55},{name:'B',label:'B',midi:59},{name:'e',label:'High E',midi:64}
];
const TUNER_IN_TUNE=5;    // cents either side that count as in tune
const TUNER_RANGE=250;    // cents from the nearest open string before it is "out of range"
const TUNER_SETTLE_MS=300; // a new state must hold this long before it is announced

// Which open string a pitch (as a fractional MIDI number) is nearest, how far off it is, and what to do.
function tunerReading(midi){
 let best=0;
 TUNER_STRINGS.forEach((s,i)=>{if(Math.abs(midi-s.midi)<Math.abs(midi-TUNER_STRINGS[best].midi))best=i;});
 const cents=Math.round((midi-TUNER_STRINGS[best].midi)*100);
 const advice=cents<-TUNER_RANGE?'too low':cents>TUNER_RANGE?'too high':Math.abs(cents)<=TUNER_IN_TUNE?'in tune':cents<0?'tighten':'loosen';
 return {string:best,cents,advice};
}

// Steadies the reading: the middle of the last few frames, started afresh for each new note.
// Returns a fractional MIDI number, or null when there is nothing to show.
function createTunerSmoother({size=5,gapMs=LISTEN_TUNING.gapMs}={}){
 let recent=[],last=-Infinity;
 const median=()=>[...recent].sort((a,b)=>a-b)[recent.length>>1];
 return function smooth(frame,now){
  if(frame.kind==='quiet'){recent=[];return null;}
  if(frame.kind!=='note')return recent.length&&now-last<=gapMs?median():null;
  if(!recent.length||now-last>gapMs||Math.abs(frame.midi-median())>.5)recent=[];
  recent.push(frame.midi);if(recent.length>size)recent.shift();last=now;
  return median();
 };
}
function tunerLower(label){return label.replace(/^(Low|High)/,m=>m.toLowerCase())} // "Low E" → "low E", "A" stays "A"
function tunerHz(midi){return 440*2**((midi-69)/12)}
function tunerOffText(r){
 if(r.advice==='in tune')return 'In tune ✓';
 if(r.advice==='too low'||r.advice==='too high')return 'Out of range';
 return `${Math.abs(r.cents)} cents ${r.cents<0?'flat · tighten ↑':'sharp · loosen ↓'}`;
}
function tunerMessage(r,midi){
 const label=TUNER_STRINGS[r.string].label;
 if(r.advice==='in tune')return `${label} string is in tune.`;
 if(r.advice==='tighten')return `${label} string is flat (too low). Tighten it slowly.`;
 if(r.advice==='loosen')return `${label} string is sharp (too high). Loosen it a little, then tighten back up to the note.`;
 if(r.advice==='too low')return `That’s ${listenNoteName(midi)}, lower than the low E string. Is a string very loose?`;
 return `That’s ${listenNoteName(midi)}, higher than the open strings. Play one open string, with no frets held down.`;
}
function newTuner(){return {smooth:createTunerSmoother(),reading:null,midi:null,said:'',pending:'',pendingSince:0,unclearSince:null}}

const listen={mode:'note',tuner:newTuner(),active:false,starting:false,ctx:null,stream:null,analyser:null,buffer:null,frame:0,lastAnalysis:0,
 target:0,spot:0,judge:null,missed:false,resolvedAt:0,pausedUntil:0,hits:0,firstTry:0,message:'Tap Start listening, then allow the microphone.',heard:'—',level:0,mood:''};

function listenPick(previousPc=null){
 const options=LISTEN_TARGETS.map((_,i)=>i).filter(i=>LISTEN_TARGETS[i].pc!==previousPc);
 listen.target=options[Math.floor(Math.random()*options.length)];
 listen.spot=Math.floor(Math.random()*LISTEN_TARGETS[listen.target].spots.length);
 listen.judge=createListenJudge(LISTEN_TARGETS[listen.target].pc,{ignorePc:previousPc});
 listen.missed=false;listen.resolvedAt=0;listen.mood='';
}
listenPick();

function listenSpotText(spot){const name=LISTEN_STRINGS[spot.string];return spot.fret===0?`Open ${name} string`:`${name[0].toUpperCase()+name.slice(1)} string · fret ${spot.fret}`}
function listenSpotMidi(spot){return LISTEN_OPEN[spot.string]+spot.fret}

// A small fretboard (frets 0–9, high E at top) with the target position marked.
function listenFretboard(spot){
 const left=42,top=16,cw=34,rh=18,frets=9,width=left+cw*frets+14,height=top+rh*5+30;
 let out=`<svg class="listen-board" viewBox="0 0 ${width} ${height}" role="img" aria-label="${listenSpotText(spot)}"><rect x="${left}" y="${top-6}" width="${cw*frets}" height="${rh*5+12}" rx="4" class="fb-wood"/>`;
 for(let f=0;f<=frets;f++){const x=left+f*cw;out+=`<line x1="${x}" y1="${top-6}" x2="${x}" y2="${top+rh*5+6}" class="${f===0?'fb-nut':'fb-fret'}" stroke-width="${f===0?4:2}"/>`;if(f)out+=`<text x="${x-cw/2}" y="${height-4}" text-anchor="middle" class="fb-fret-num" font-size="11">${f}</text>`;if([3,5,7,9].includes(f))out+=`<circle cx="${x-cw/2}" cy="${top+rh*2.5}" r="3.5" class="fb-inlay"/>`;}
 for(let row=0;row<6;row++){const s=5-row,y=top+row*rh;out+=`<text x="9" y="${y+4}" text-anchor="middle" class="fb-string-name" font-size="11">${['E','A','D','G','B','e'][s]}</text><line x1="${left}" y1="${y}" x2="${left+cw*frets}" y2="${y}" class="fb-string" stroke-width="${.8+row*.3}"/>`;}
 const y=top+(5-spot.string)*rh,name=LISTEN_TARGETS[listen.target].name;
 out+=spot.fret===0?`<circle cx="${left-14}" cy="${y}" r="7" class="listen-spot open" stroke-width="2.5"/>`:`<circle cx="${left+(spot.fret-.5)*cw}" cy="${y}" r="10" class="listen-spot"/><text x="${left+(spot.fret-.5)*cw}" y="${y+4}" text-anchor="middle" class="listen-spot-label" font-size="11" font-weight="700">${name}</text>`;
 return out+'</svg>';
}

function listenModeSwitch(){
 const b=(mode,text)=>`<button type="button" data-listen-mode="${mode}" class="${listen.mode===mode?'selected':''}" aria-pressed="${listen.mode===mode}">${text}</button>`;
 return `<div class="segmented listen-modes" role="group" aria-label="Choose what Fretwise listens for">${b('note','Find the note')}${b('tune','Tuner')}</div>`;
}

function tunerView(){
 const tu=listen.tuner,r=tu.reading,far=!r||r.advice==='too low'||r.advice==='too high';
 const left=far?50:50+Math.max(-50,Math.min(50,r.cents));
 const strings=TUNER_STRINGS.map((s,i)=>`<button type="button" class="btn tuner-string ${r&&!far&&r.string===i?'selected':''}" data-tuner-ref="${i}" aria-label="Hear the ${tunerLower(s.label)} string (${listenNoteName(s.midi)})"><b>${s.name}</b><small>${listenNoteName(s.midi)}</small></button>`).join('');
 const ticks=[0,25,50,75,100].map(x=>`<span class="tuner-tick ${x===50?'centre':''}" style="left:${x}%"></span>`).join('');
 return `<section class="panel listen-card ${listen.mood}" id="listen-card"><div class="panel-head"><div><span class="eyebrow">TUNER · STANDARD TUNING</span><h2 class="listen-target">Tune <b id="tuner-string">${far?'—':TUNER_STRINGS[r.string].label}</b></h2><p>Play one open string at a time. Fretwise finds the string.</p></div><span class="badge">Trial</span></div>
<div class="tuner-gauge ${far?'idle':''} ${r&&r.advice==='in tune'?'in-tune':''}" id="tuner-gauge" aria-hidden="true"><span class="tuner-zone"></span>${ticks}<i class="tuner-needle" id="tuner-needle" style="left:${left}%"></i></div>
<div class="tuner-scale" aria-hidden="true"><span>♭ Flat</span><span>In tune</span><span>Sharp ♯</span></div>
<div class="listen-readout"><div><span class="eyebrow">TUNING</span><strong id="tuner-cents">${r?tunerOffText(r):'—'}</strong><span class="tiny" id="tuner-heard">${tu.midi===null?'Heard: —':`Heard ${listenNoteName(tu.midi)} · ${tunerHz(tu.midi).toFixed(1)} Hz`}</span></div><div class="listen-meter" aria-hidden="true"><i id="listen-level" style="width:${Math.round(listen.level*100)}%"></i></div></div>
<p class="listen-message" id="listen-message" role="status">${listen.message}</p>
<div class="lick-actions"><button class="btn primary" id="listen-toggle">${listen.active?'■ Stop listening':'● Start listening'}</button></div>
<span class="eyebrow tuner-strings-title">HEAR EACH STRING</span><div class="tuner-strings">${strings}</div></section>
<section class="panel practice"><span class="eyebrow">TUNING TIPS</span><h2>Tune up to the note.</h2><ol><li>Play one open string at a time and let it ring. Rest your hand lightly on the other strings so they stay quiet.</li><li>Pluck once, firmly, then watch the needle while the note rings.</li><li>If a string is sharp, loosen it a little below the note, then tighten back up. Strings hold their tuning better this way.</li><li>Go from low E to high E, then check them all once more: tuning one string can pull the others slightly.</li><li>Use a clean tone and put the phone near the amp, or close to an acoustic guitar’s sound hole.</li></ol><p class="tiny">Standard tuning, low to high: E A D G B E. Wear headphones when you tap a string to hear it, so the microphone only hears your guitar. Sound is analysed on your device and is not recorded or uploaded.</p></section>`;
}

function listenView(){
 if(listen.mode==='tune')return intro()+listenModeSwitch()+tunerView();
 const t=LISTEN_TARGETS[listen.target],spot=t.spots[listen.spot];
 return intro()+listenModeSwitch()+`<section class="panel listen-card ${listen.mood}" id="listen-card"><div class="panel-head"><div><span class="eyebrow">YOUR NOTE</span><h2 class="listen-target">Play <b id="listen-target">${t.name}</b></h2><p id="listen-spot">${listenSpotText(spot)}. Any octave counts.</p></div><span class="badge">Trial</span></div>
<div class="listen-board-wrap" id="listen-board">${listenFretboard(spot)}</div>
<div class="listen-readout"><div><span class="eyebrow">HEARD</span><strong id="listen-heard">${listen.heard}</strong></div><div class="listen-meter" aria-hidden="true"><i id="listen-level" style="width:${Math.round(listen.level*100)}%"></i></div></div>
<p class="listen-message" id="listen-message" role="status">${listen.message}</p>
<div class="lick-actions"><button class="btn primary" id="listen-toggle">${listen.active?'■ Stop listening':'● Start listening'}</button><button class="btn" id="listen-hear">♪ Hear the note</button><button class="btn" id="listen-next">Next note →</button></div>
<p class="tiny" id="listen-tally">${listenTally()}</p></section>
<section class="panel practice"><span class="eyebrow">SET UP FOR A FAIR TEST</span><h2>Help your phone hear the amp.</h2><ol><li>Wear headphones for Fretwise’s sound, so the microphone only hears your guitar.</li><li>Put the phone 30–50 cm from the amp speaker.</li><li>Use a clean tone: no distortion, delay or reverb.</li><li>Play one string at a time and let the note ring for a second.</li></ol><p class="tiny">If Fretwise can’t hear a clear note, it says so. Unclear sound is never marked wrong. Sound is analysed on your device and is not recorded or uploaded.</p></section>`;
}

const LISTEN_START={note:'Tap Start listening, then allow the microphone.',tune:'Tap Start listening, then play one open string.'};
const LISTEN_WAIT={note:'Listening… play the note and let it ring.',tune:'Listening… play one open string and let it ring.'};
// Switch between the note game and the tuner. The caller re-renders the page.
function listenSetMode(mode){
 if(!Object.hasOwn(LISTEN_START,mode)||mode===listen.mode)return;
 listen.mode=mode;listen.tuner=newTuner();
 if(mode==='note'){listen.judge=createListenJudge(LISTEN_TARGETS[listen.target].pc);listen.missed=false;listen.resolvedAt=0;}
 listen.message=listen.active?LISTEN_WAIT[mode]:LISTEN_START[mode];listen.mood='';
}

function listenTally(){return listen.hits?`Matched ${listen.hits} · ${listen.firstTry} on the first try.`:'No notes matched yet.'}
function listenSet(id,text){const e=document.getElementById(id);if(e&&e.textContent!==text)e.textContent=text;}
function listenSay(text,mood=listen.mood){listen.message=text;listen.mood=mood;listenSet('listen-message',text);const card=document.getElementById('listen-card');if(card)card.className=`panel listen-card ${mood}`;}
function listenShowTarget(){
 const t=LISTEN_TARGETS[listen.target],spot=t.spots[listen.spot];
 listenSet('listen-target',t.name);listenSet('listen-spot',`${listenSpotText(spot)}. Any octave counts.`);
 const board=document.getElementById('listen-board');if(board)board.innerHTML=listenFretboard(spot);
}
function listenNext(previousPc=null){listenPick(previousPc);listenShowTarget();listenSay(listen.active?'Listening… play the note and let it ring.':'Tap Start listening, then allow the microphone.','');}

function listenTick(){
 if(!listen.active)return;
 listen.frame=requestAnimationFrame(listenTick);
 const now=performance.now();
 if(now-listen.lastAnalysis<40)return; // about 25 checks a second is plenty and saves battery
 listen.lastAnalysis=now;
 listen.analyser.getFloatTimeDomainData(listen.buffer);
 const frame=detectPitch(listen.buffer,listen.ctx.sampleRate);
 listen.level=Math.min(1,(frame.rms||0)*8);
 const meter=document.getElementById('listen-level');if(meter)meter.style.width=Math.round(listen.level*100)+'%';
 if(listen.mode==='tune'){tunerTick(frame,now);return;}
 if(frame.kind==='note'){const off=Math.abs(frame.cents)<=10?'in tune':`${Math.abs(frame.cents)} cents ${frame.cents>0?'sharp':'flat'}`;listen.heard=`${listenNoteName(frame.midi)} · ${off}`;listenSet('listen-heard',listen.heard);}
 const target=LISTEN_TARGETS[listen.target];
 if(listen.resolvedAt){if(now-listen.resolvedAt>1400)listenNext(target.pc);return;}
 if(now<listen.pausedUntil)return;
 const {result,pc}=listen.judge(frame,now);
 if(result==='match'){listen.hits++;if(!listen.missed)listen.firstTry++;listen.resolvedAt=now;listenSet('listen-tally',listenTally());listenSay(`Match! That’s ${target.name}.`,'match');}
 else if(result==='miss'){listen.missed=true;listenSay(`That sounded like ${LISTEN_NAMES[pc]}. Looking for ${target.name}: try again.`,'miss');}
 else if(result==='unclear')listenSay('Can’t hear a clear note. That isn’t marked wrong. Try one string, a cleaner tone, or the phone closer to the amp.','unclear');
 else if(result==='hearing')listenSay(pc===target.pc?`Hearing ${target.name}… hold it.`:`Hearing ${LISTEN_NAMES[pc]}…`,listen.mood==='miss'?'miss':'');
 else if(listen.mood!=='miss')listenSay('Listening… play the note and let it ring.','');
}

// Show the tuner reading straight away; announce a change in words only once it has settled.
function tunerTick(frame,now){
 const tu=listen.tuner,midi=tu.smooth(frame,now),gauge=document.getElementById('tuner-gauge');
 if(midi===null){
  gauge?.classList.add('idle');gauge?.classList.remove('in-tune');
  if(frame.kind==='unclear'){
   if(tu.unclearSince===null)tu.unclearSince=now;
   if(now-tu.unclearSince>=LISTEN_TUNING.unclearMs&&tu.said!=='unclear'){tu.said='unclear';tu.pending='';listenSay('Can’t hear a clear note. Play one string at a time, with a clean tone, and the phone closer to the guitar.','unclear');}
  }else{tu.unclearSince=null;tu.pending='';if(!tu.reading&&tu.said!=='wait'){tu.said='wait';listenSay(LISTEN_WAIT.tune,'');}}
  return;
 }
 tu.unclearSince=null;
 const r=tunerReading(midi),far=r.advice==='too low'||r.advice==='too high';
 tu.reading=r;tu.midi=midi;
 const needle=document.getElementById('tuner-needle');
 if(needle)needle.style.left=(far?50:50+Math.max(-50,Math.min(50,r.cents)))+'%';
 if(gauge){gauge.classList.toggle('idle',far);gauge.classList.toggle('in-tune',r.advice==='in tune');}
 listenSet('tuner-string',far?'—':TUNER_STRINGS[r.string].label);
 listenSet('tuner-cents',tunerOffText(r));
 listenSet('tuner-heard',`Heard ${listenNoteName(midi)} · ${tunerHz(midi).toFixed(1)} Hz`);
 document.querySelectorAll('[data-tuner-ref]').forEach(b=>b.classList.toggle('selected',!far&&Number(b.dataset.tunerRef)===r.string));
 const key=r.string+':'+r.advice;
 if(key===tu.said){tu.pending='';return;}
 if(key!==tu.pending){tu.pending=key;tu.pendingSince=now;return;}
 if(now-tu.pendingSince>=TUNER_SETTLE_MS){tu.said=key;tu.pending='';listenSay(tunerMessage(r,midi),r.advice==='in tune'?'match':'');}
}

async function startListening(){
 if(listen.active||listen.starting)return;
 if(!window.isSecureContext){listenSay('The microphone only works on a secure (https) page. Open the live Fretwise site to try this.','unclear');return;}
 const C=window.AudioContext||window.webkitAudioContext;
 if(!navigator.mediaDevices?.getUserMedia||!C){listenSay('This browser can’t use the microphone. Try an up-to-date Safari or Chrome.','unclear');return;}
 listen.starting=true;listenSay('Waiting for microphone permission…','');
 // Create and resume the context inside the tap, before waiting for permission (needed on iPhone).
 const ctx=new C(),resume=ctx.resume();
 try{
  // Phone voice processing (echo and noise removal, automatic volume) damages guitar notes, so switch it off.
  const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
  await resume;
  if(!listen.starting||state.view!=='listen'){stream.getTracks().forEach(t=>t.stop());ctx.close();return;}
  const analyser=ctx.createAnalyser();analyser.fftSize=2048;ctx.createMediaStreamSource(stream).connect(analyser);
  Object.assign(listen,{active:true,starting:false,ctx,stream,analyser,buffer:new Float32Array(analyser.fftSize),lastAnalysis:0});
  listen.judge=createListenJudge(LISTEN_TARGETS[listen.target].pc);listen.tuner=newTuner();
  listenSet('listen-toggle','■ Stop listening');listenSay(LISTEN_WAIT[listen.mode],'');
  listenTick();
 }catch(error){
  listen.starting=false;ctx.close();
  const blocked=error&&(error.name==='NotAllowedError'||error.name==='SecurityError');
  listenSay(blocked?'Microphone access was blocked. Allow it for this site in your browser settings, then tap Start listening again.':error&&error.name==='NotFoundError'?'No microphone was found.':'The microphone could not start. Close other apps using it and try again.','unclear');
 }
}

function stopListening(){
 listen.starting=false;
 if(!listen.active&&!listen.stream)return;
 cancelAnimationFrame(listen.frame);
 listen.stream?.getTracks().forEach(t=>t.stop());
 try{listen.ctx?.close()}catch{}
 Object.assign(listen,{active:false,ctx:null,stream:null,analyser:null,buffer:null,level:0});
 listenSet('listen-toggle','● Start listening');
 const meter=document.getElementById('listen-level');if(meter)meter.style.width='0%';
 if(listen.resolvedAt)listenNext(LISTEN_TARGETS[listen.target].pc);
 listenSay('Stopped listening. Tap Start listening to carry on.','');
}

async function hearTunerString(i){
 const s=TUNER_STRINGS[i];if(!s)return;
 stopAudio();const a=await getAudio();if(a){tone(s.midi,a.currentTime,2.5,.12,'clean');status(`Reference: ${tunerLower(s.label)} string (${listenNoteName(s.midi)})`);}
}

async function hearListenTarget(){
 const spot=LISTEN_TARGETS[listen.target].spots[listen.spot];
 listen.pausedUntil=performance.now()+1800; // don't judge the reference note if it leaks into the microphone
 stopAudio();const a=await getAudio();if(a){tone(listenSpotMidi(spot),a.currentTime,1.2,.12,'clean');status(`Reference: ${listenNoteName(listenSpotMidi(spot))}`);}
}

document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.listenMode){const mode=b.dataset.listenMode;if(mode!==listen.mode){listenSetMode(mode);render();document.querySelector(`[data-listen-mode="${mode}"]`)?.focus();}return;}
 if(b.dataset.tunerRef!==undefined){hearTunerString(Number(b.dataset.tunerRef)).catch(audioError);return;}
 if(b.id==='listen-toggle'){if(listen.active||listen.starting)stopListening();else startListening();}
 if(b.id==='listen-next')listenNext(LISTEN_TARGETS[listen.target].pc);
 if(b.id==='listen-hear')hearListenTarget().catch(audioError);
});
window.addEventListener('pagehide',stopListening);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopListening()});
