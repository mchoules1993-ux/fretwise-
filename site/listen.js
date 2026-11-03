'use strict';
// Fretwise listens: a small trial of microphone note detection.
// Fretwise asks for A, C or E, the player holds the note, and the app says what it heard.
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

const listen={active:false,starting:false,session:null,ctx:null,stream:null,analyser:null,buffer:null,frame:0,lastAnalysis:0,
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
 let out=`<svg class="listen-board" viewBox="0 0 ${width} ${height}" role="img" aria-label="${listenSpotText(spot)}"><rect x="${left}" y="${top-6}" width="${cw*frets}" height="${rh*5+12}" rx="4" fill="#171b18"/>`;
 for(let f=0;f<=frets;f++){const x=left+f*cw;out+=`<line x1="${x}" y1="${top-6}" x2="${x}" y2="${top+rh*5+6}" stroke="${f===0?'#a3aa98':'#3e473c'}" stroke-width="${f===0?4:2}"/>`;if(f)out+=`<text x="${x-cw/2}" y="${height-4}" text-anchor="middle" fill="#9ca895" font-size="11">${f}</text>`;if([3,5,7,9].includes(f))out+=`<circle cx="${x-cw/2}" cy="${top+rh*2.5}" r="3.5" fill="#3e4939"/>`;}
 for(let row=0;row<6;row++){const s=5-row,y=top+row*rh;out+=`<text x="9" y="${y+4}" text-anchor="middle" fill="#b5c0ad" font-size="11">${['E','A','D','G','B','e'][s]}</text><line x1="${left}" y1="${y}" x2="${left+cw*frets}" y2="${y}" stroke="#6b7465" stroke-width="${.8+row*.3}"/>`;}
 const y=top+(5-spot.string)*rh,name=LISTEN_TARGETS[listen.target].name;
 out+=spot.fret===0?`<circle cx="${left-14}" cy="${y}" r="7" fill="none" stroke="var(--accent)" stroke-width="2.5"/>`:`<circle cx="${left+(spot.fret-.5)*cw}" cy="${y}" r="10" fill="var(--accent)"/><text x="${left+(spot.fret-.5)*cw}" y="${y+4}" text-anchor="middle" fill="var(--ink)" font-size="11" font-weight="700">${name}</text>`;
 return out+'</svg>';
}

function listenView(){
 const t=LISTEN_TARGETS[listen.target],spot=t.spots[listen.spot];
 return intro()+`<section class="panel listen-card ${listen.mood}" id="listen-card"><div class="panel-head"><div><span class="eyebrow">YOUR NOTE</span><h2 class="listen-target">Play <b id="listen-target">${t.name}</b></h2><p id="listen-spot">${listenSpotText(spot)}. Any octave counts.</p></div><span class="badge">Trial</span></div>
<div class="listen-board-wrap" id="listen-board">${listenFretboard(spot)}</div>
<div class="listen-readout"><div><span class="eyebrow">HEARD</span><strong id="listen-heard">${listen.heard}</strong></div><div class="listen-meter" aria-hidden="true"><i id="listen-level" style="width:${Math.round(listen.level*100)}%"></i></div></div>
<p class="listen-message" id="listen-message" role="status">${listen.message}</p>
<div class="lick-actions"><button class="btn primary" id="listen-toggle">${listen.active?'■ Stop listening':listen.starting?'Cancel microphone request':'● Start listening'}</button><button class="btn" id="listen-hear">♪ Hear the note</button><button class="btn" id="listen-next">Next note →</button></div>
<p class="tiny" id="listen-tally">${listenTally()}</p></section>
<section class="panel practice"><span class="eyebrow">SET UP FOR A FAIR TEST</span><h2>Help your phone hear the amp.</h2><ol><li>Wear headphones for Fretwise’s sound, so the microphone only hears your guitar.</li><li>Put the phone 30–50 cm from the amp speaker.</li><li>Use a clean tone: no distortion, delay or reverb.</li><li>Play one string at a time and let the note ring for a second.</li></ol><p class="tiny">If Fretwise can’t hear a clear note, it says so. Unclear sound is never marked wrong. Sound is analysed on your device and is not recorded or uploaded.</p></section>`;
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

// A pending permission prompt can outlive Stop and a later Start. Each attempt
// owns its resources so late results can only release their own microphone.
function releaseListenSession(session){
 if(!session)return;
 session.stream?.getTracks().forEach(t=>t.stop());session.stream=null;
 try{session.ctx?.close()?.catch(()=>{})}catch{}
 session.ctx=null;
}

async function startListening(){
 if(listen.active||listen.starting)return;
 if(!window.isSecureContext){listenSay('The microphone only works on a secure (https) page. Open the live Fretwise site to try this.','unclear');return;}
 const C=window.AudioContext||window.webkitAudioContext;
 if(!navigator.mediaDevices?.getUserMedia||!C){listenSay('This browser can’t use the microphone. Try an up-to-date Safari or Chrome.','unclear');return;}
 const session={ctx:null,stream:null};listen.session=session;
 listen.starting=true;listenSet('listen-toggle','Cancel microphone request');listenSay('Waiting for microphone permission…','');
 try{
  // Create and resume the context inside the tap (needed on iPhone). Observe
  // resume and permission together so either failure cleans up immediately.
  const ctx=session.ctx=new C();
  // Phone voice processing (echo and noise removal, automatic volume) damages guitar notes, so switch it off.
  await Promise.all([ctx.resume(),(async()=>{
   session.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
   // Release late tracks even if the cancelled context never finishes resuming.
   if(listen.session!==session)releaseListenSession(session);
  })()]);
  if(listen.session!==session)return;
  if(state.view!=='listen'||document.hidden){stopListening();return;}
  const stream=session.stream;
  const analyser=ctx.createAnalyser();analyser.fftSize=2048;ctx.createMediaStreamSource(stream).connect(analyser);
  Object.assign(listen,{active:true,starting:false,ctx,stream,analyser,buffer:new Float32Array(analyser.fftSize),lastAnalysis:0});
  listen.judge=createListenJudge(LISTEN_TARGETS[listen.target].pc);
  listenSet('listen-toggle','■ Stop listening');listenSay('Listening… play the note and let it ring.','');
  listenTick();
 }catch(error){
  releaseListenSession(session);
  if(listen.session!==session)return;
  stopListening();
  const blocked=error&&(error.name==='NotAllowedError'||error.name==='SecurityError');
  listenSay(blocked?'Microphone access was blocked. Allow it for this site in your browser settings, then tap Start listening again.':error&&error.name==='NotFoundError'?'No microphone was found.':'The microphone could not start. Close other apps using it and try again.','unclear');
 }
}

function stopListening(){
 if(!listen.active&&!listen.starting&&!listen.session)return;
 const session=listen.session;listen.session=null;listen.starting=false;
 cancelAnimationFrame(listen.frame);
 releaseListenSession(session);
 Object.assign(listen,{active:false,ctx:null,stream:null,analyser:null,buffer:null,level:0});
 listenSet('listen-toggle','● Start listening');
 const meter=document.getElementById('listen-level');if(meter)meter.style.width='0%';
 if(listen.resolvedAt)listenNext(LISTEN_TARGETS[listen.target].pc);
 listenSay('Stopped listening. Tap Start listening to carry on.','');
}

async function hearListenTarget(){
 const spot=LISTEN_TARGETS[listen.target].spots[listen.spot];
 listen.pausedUntil=performance.now()+1800; // don't judge the reference note if it leaks into the microphone
 stopAudio();const a=await getAudio();if(a){tone(listenSpotMidi(spot),a.currentTime,1.2,.12,'clean');status(`Reference: ${listenNoteName(listenSpotMidi(spot))}`);}
}

document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.id==='listen-toggle'){if(listen.active||listen.starting)stopListening();else startListening();}
 if(b.id==='listen-next')listenNext(LISTEN_TARGETS[listen.target].pc);
 if(b.id==='listen-hear')hearListenTarget().catch(audioError);
});
window.addEventListener('pagehide',stopListening);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopListening()});
