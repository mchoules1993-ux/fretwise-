'use strict';
const RHYTHM_VALUES=[
 {key:'whole',name:'Whole note',uk:'semibreve',beats:4,den:1,count:'1 — 2 — 3 — 4',tip:'One note held for the entire bar.'},
 {key:'half',name:'Half note',uk:'minim',beats:2,den:2,count:'1 — 2 · 3 — 4',tip:'Two notes per bar. Let each ring for two beats.'},
 {key:'quarter',name:'Quarter note',uk:'crotchet',beats:1,den:4,count:'1 · 2 · 3 · 4',tip:'One note on each beat: four notes per bar.'},
 {key:'eighth',name:'Eighth note',uk:'quaver',beats:.5,den:8,count:'1 & 2 & 3 & 4 &',tip:'Two equal notes in each beat. Say “and” halfway between clicks.'},
 {key:'sixteenth',name:'Sixteenth note',uk:'semiquaver',beats:.25,den:16,count:'1 e & a · 2 e & a · 3 e & a · 4 e & a',tip:'Four equal notes per beat. Say “one ee and uh”.'}
];
// RHYTHM_PATTERNS lives in rhythm-library.js.
const rhythmOptions={pattern:0,bpm:70,time:'all',rhythmSound:'woodblock',clickSound:'beep',countIn:true,loops:2};
// The two sound choices are kept on this device only. Blocked or damaged storage falls back to the defaults.
const RHYTHM_KEY='fretwise.rhythm.v1';
function rhythmStore(){try{return typeof localStorage==='undefined'?null:localStorage;}catch{return null;}}
function loadRhythmSounds(store=rhythmStore()){
 const out={rhythmSound:'woodblock',clickSound:'beep'};
 try{const saved=JSON.parse(store?.getItem(RHYTHM_KEY)||'null');if(saved&&typeof saved==='object'){if(RHYTHM_SOUND_IDS.includes(saved.rhythmSound))out.rhythmSound=saved.rhythmSound;if(CLICK_SOUND_IDS.includes(saved.clickSound))out.clickSound=saved.clickSound;}}catch{}
 return out;
}
function saveRhythmSounds(store=rhythmStore()){try{store?.setItem(RHYTHM_KEY,JSON.stringify({rhythmSound:rhythmOptions.rhythmSound,clickSound:rhythmOptions.clickSound}));}catch{}}
Object.assign(rhythmOptions,loadRhythmSounds());
let rhythmRun=null,rhythmFrame=0,rhythmGeneration=0,rhythmTapTimes=[];
// den: 1 whole … 16 sixteenth. dotted adds a dot after the note or rest.
function noteSymbol(den,rest=false,dotted=false){
 let marks='';
 if(rest){if(den===1||den===2)marks=`<path d="M18 ${den===1?22:16}h24v8H18z" fill="currentColor"/><path d="M10 ${den===1?22:24}h42" stroke="currentColor"/>`;else if(den>=8)marks=`<circle cx="25" cy="20" r="4" fill="currentColor"/><path d="M25 23c6 1 11-2 13-6L28 50" stroke="currentColor" stroke-width="3" fill="none"/>${den===16?'<circle cx="21" cy="33" r="4" fill="currentColor"/><path d="M21 36c6 1 9-1 12-4" stroke="currentColor" stroke-width="3" fill="none"/>':''}`;else marks='<path d="M32 6l-9 13 14 12-12 10 8 12-18-12 10-12-12-10z" fill="currentColor"/>';}
 else {marks=`<ellipse cx="22" cy="43" rx="11" ry="7" transform="rotate(-18 22 43)" fill="${den<=2?'none':'currentColor'}" stroke="currentColor" stroke-width="3"/>`;if(den>1)marks+='<path d="M32 40V5" stroke="currentColor" stroke-width="3"/>';if(den>=8)marks+='<path d="M32 5c0 11 21 11 10 28 3-15-10-11-10-20" fill="currentColor"/>';if(den===16)marks+='<path d="M32 17c0 11 21 11 10 28 3-15-10-11-10-20" fill="currentColor"/>';}
 if(dotted)marks+=`<circle cx="46" cy="${rest?30:42}" r="3.5" fill="currentColor"/>`;
 return `<svg class="rhythm-symbol" viewBox="0 0 60 60" aria-hidden="true">${marks}</svg>`;
}
function rhythmView(){const p=RHYTHM_PATTERNS[rhythmOptions.pattern];return intro()+`
 <section class="panel practice"><span class="eyebrow">START HERE · 4/4 TIME</span><h2>A beat is the pulse. A note has a length.</h2><p>Tap your foot at a steady pace: that is the beat. The rhythm tells you when to play and how long to hold each note.</p><div class="rhythm-basics"><div><strong>4 beats in a bar</strong><p>The top 4 tells you how many beats to count before starting again.</p></div><div><strong>¼ note = 1 beat</strong><p>The bottom 4 tells you that the quarter note gets one beat in this lesson.</p></div><div><strong>70 BPM = 70 beats a minute</strong><p>A faster tempo makes every note shorter in seconds; the beat proportions stay the same.</p></div></div><p class="tiny">“Quarter” means one quarter of a whole note, not one quarter of a beat. These beat lengths apply to 4/4; other time signatures can use a different beat unit.</p></section>
 <section class="panel"><div class="panel-head"><div><span class="eyebrow">SEE THE LENGTH</span><h2 style="margin-top:8px">One bar. Different ways to divide it.</h2></div><span class="badge">4/4 · straight rhythm</span></div><div class="rhythm-values">${RHYTHM_VALUES.map(v=>`<article class="rhythm-value">${noteSymbol(v.den)}<h3>${v.name}</h3><span class="tiny">${v.uk} · 1/${v.den} note</span><strong>${v.beats} beat${v.beats===1?'':'s'}</strong><div class="rhythm-length" style="--parts:${4/v.beats}">${Array.from({length:4/v.beats},()=>'<i></i>').join('')}</div><p>${v.tip}</p><code>${v.count}</code><button class="btn small" data-rhythm-demo="${v.key}">▶ Hear ${v.name.toLowerCase()}s</button></article>`).join('')}</div><p class="tiny" style="margin-top:18px">A filled notehead with a stem is a quarter note. Add one flag for an eighth, or two for a sixteenth. Flags may be joined into beams when notes are grouped.</p></section>
 ${rhythmTrainer()}
 <div class="two-col"><section class="panel"><span class="eyebrow">SILENCE HAS A LENGTH TOO</span><h2 style="margin-top:8px">A rest means keep time without playing.</h2><div class="rhythm-rest">${noteSymbol(4,true)}<p>A quarter rest lasts one beat in 4/4. Stop the sound for that beat, but keep your foot moving and continue counting.</p></div><p>After learning straight eighths, try the Blues shuffle in the Jam Room: the two parts of the beat are uneven, with a longer first note and a shorter second note.</p></section><section class="panel practice"><span class="eyebrow">TAKE IT TO YOUR GUITAR</span><h2>One note is enough.</h2><ol><li>Set 60–70 BPM and count with the clicks.</li><li>Play the rhythm on A at high e, fret 5. Mute during rests.</li><li>Keep the same timing and add a second note.</li><li>Open a Legends lick and read its count before playing.</li></ol><button class="btn" data-view="legends">Try the Legends licks →</button></section></div>`;}
// ---- Rhythm library trainer (patterns in rhythm-library.js) ----
const NOTE_NAMES={1:'whole',2:'half',4:'quarter',8:'eighth',16:'sixteenth'};
function rhythmPatternsFor(time){return RHYTHM_PATTERNS.map((p,i)=>({p,i})).filter(({p})=>time==='all'||p.meter===time);}
function selectRhythm(index){stopAudio();const p=RHYTHM_PATTERNS[index]||RHYTHM_PATTERNS[0];rhythmOptions.pattern=RHYTHM_PATTERNS.indexOf(p);rhythmOptions.bpm=clampMetronomeBpm(p.bpm,70);}
// Choosing a time signature keeps the current rhythm if it fits, otherwise picks the first that does.
function setRhythmTime(id){stopAudio();rhythmOptions.time=RHYTHM_TIME_FILTERS.includes(id)?id:'all';const list=rhythmPatternsFor(rhythmOptions.time);if(!list.some(x=>x.i===rhythmOptions.pattern))selectRhythm(list[0].i);}
function setRhythmBpm(value){stopAudio();rhythmOptions.bpm=clampMetronomeBpm(value,rhythmOptions.bpm);const label=document.getElementById('rhythm-bpm');if(label)label.textContent=String(rhythmOptions.bpm);const slider=document.getElementById('rhythm-tempo');if(slider)slider.value=String(rhythmOptions.bpm);return rhythmOptions.bpm;}
function rhythmLengthName(p,e){const v=noteValue(p,Math.round(e.d*p.steps));if(!v)return `${+e.d.toFixed(2)} click${e.d===1?'':'s'}`;return `${v.dotted?'dotted ':''}${NOTE_NAMES[v.den]}${e.rest?' rest':''}`;}
function rhythmPlace(p,e){const step=Math.round(e.b*p.steps),click=Math.floor(step/p.steps)+1;return step%p.steps===0?`${rhythmMeter(p.meter).clickDen===4?'Beat':'Count'} ${click}`:`${click} ${rhythmCounts(p)[step]}`;}
function rhythmPlanText(){const {countIn,loops}=rhythmOptions;return `${countIn?'One count-in bar of clicks, then ':''}${loops} bar${loops===1?'':'s'}. The highlight shows the current step. Clicks mark the beats; the rhythm sound plays the rhythm. During tap practice only the click plays.`;}
function updateRhythmPlan(){const e=document.getElementById('rhythm-plan');if(e)e.textContent=rhythmPlanText();}
function rhythmTrainer(){
 const p=RHYTHM_PATTERNS[rhythmOptions.pattern]||RHYTHM_PATTERNS[0];
 // A Practice path step may pick a rhythm outside the current filter: show its time signature.
 if(rhythmOptions.time!=='all'&&p.meter!==rhythmOptions.time)rhythmOptions.time=p.meter;
 const meter=rhythmMeter(p.meter),counts=rhythmCounts(p),cells=counts.length,list=rhythmPatternsFor(rhythmOptions.time),groupStarts=new Set();
 meter.groups.reduce((at,size)=>{groupStarts.add(at);return at+size;},0);
 const option=({p:v,i})=>`<option value="${i}" ${i===rhythmOptions.pattern?'selected':''}>${v.name}</option>`;
 const options=rhythmOptions.time==='all'?RHYTHM_METERS.map(m=>`<optgroup label="${m.id}">${list.filter(x=>x.p.meter===m.id).map(option).join('')}</optgroup>`).join(''):list.map(option).join('');
 const select=(id,label,values,current)=>`<div class="field"><label for="${id}">${label}</label><select id="${id}">${values.map(([v,t])=>`<option value="${v}" ${String(v)===String(current)?'selected':''}>${t}</option>`).join('')}</select></div>`;
 return `<section class="panel rhythm-console"><div class="panel-head"><div><span class="eyebrow">LISTEN → COUNT → TAP → PLAY</span><h2 style="margin-top:8px">Your rhythm trainer</h2></div><span class="badge">${RHYTHM_PATTERNS.length} rhythms · ${RHYTHM_METERS.map(m=>m.id).join(' · ')}</span></div>
 <div class="controls">${select('rhythm-time','TIME SIGNATURE',RHYTHM_TIME_FILTERS.map(t=>[t,t==='all'?'All':t]),rhythmOptions.time)}<div class="field wide"><label for="rhythm-pattern">RHYTHM</label><select id="rhythm-pattern">${options}</select></div></div>
 <div class="rhythm-head"><h3>${p.name}</h3><span class="badge">${p.meter}</span><span class="badge">${p.style}</span>${p.swing?'<span class="badge">swung</span>':''}</div><p>${p.about}</p><p><strong>${p.hint}</strong></p><p class="tiny">${meter.hint}${p.swing?' Swung: each beat splits into three, and the first note is twice as long as the second.':''}</p>
 <div class="rhythm-score" aria-label="Rhythm notation from left to right">${p.events.map(e=>{const v=noteValue(p,Math.round(e.d*p.steps))||{den:4,dotted:false},name=rhythmLengthName(p,e);return `<div class="rhythm-event${e.accent?' accent':''}" data-rhythm-event="${e.b}" style="flex:${e.d}" title="${name}">${noteSymbol(v.den,e.rest,v.dotted)}<strong>${name}</strong><small>${rhythmPlace(p,e)}${e.accent?' · accent':''}</small></div>`;}).join('')}</div>
 <div class="rhythm-counts${cells>16?' many':''}" style="--cells:${cells};--half:${Math.ceil(cells/2)}" aria-label="${cells} steps in one bar">${counts.map((label,i)=>`<div data-rhythm-tick="${i}" class="${i%p.steps===0?'numbered':''}${i%p.steps===0&&groupStarts.has(i/p.steps)?' group':''}"><b>${label}</b></div>`).join('')}</div>
 <div class="controls rhythm-practice-controls"><div class="field wide"><label for="rhythm-tempo">TEMPO · <span id="rhythm-bpm">${rhythmOptions.bpm}</span> BPM${meter.clickDen===8?' (every click)':''}</label><div class="rhythm-tempo-row"><button class="btn small" id="rhythm-bpm-down" aria-label="Slower">–</button><input id="rhythm-tempo" type="range" min="40" max="220" value="${rhythmOptions.bpm}"><button class="btn small" id="rhythm-bpm-up" aria-label="Faster">+</button><button class="btn small" id="rhythm-tap-tempo">Tap</button></div></div>${select('rhythm-voice','RHYTHM SOUND',RHYTHM_SOUND_IDS.map(id=>[id,kitSound(id).name]),rhythmOptions.rhythmSound)}${select('rhythm-click','CLICK SOUND',CLICK_SOUND_IDS.map(id=>[id,kitSound(id).name]),rhythmOptions.clickSound)}${select('rhythm-loops','BARS',[1,2,4,8].map(n=>[n,n]),rhythmOptions.loops)}<label class="rhythm-check"><input type="checkbox" id="rhythm-countin" ${rhythmOptions.countIn?'checked':''}> Count-in bar</label></div>
 <div class="lick-actions"><button class="btn primary" id="rhythm-play">▶ Hear & count</button><button class="btn" id="rhythm-practice">Start tap practice</button><button class="btn" id="rhythm-stop">■ Stop</button></div><p class="tiny" style="margin-top:12px" id="rhythm-plan">${rhythmPlanText()}</p><button class="rhythm-tap" id="rhythm-tap" disabled>Tap here · or press Space</button><div id="audio-status" class="audio-note" role="status">Listen first, then tap the same pattern with the beat.</div><p class="tiny">Timing feedback is approximate: Bluetooth and device audio latency can affect the result.</p></section>`;
}
function stopRhythm(){rhythmGeneration++;cancelAnimationFrame(rhythmFrame);rhythmRun=null;document.querySelectorAll('[data-rhythm-event],[data-rhythm-tick]').forEach(e=>e.classList.remove('sounding','current'));const tap=document.getElementById('rhythm-tap');if(tap)tap.disabled=true;}
// Everything one run plays, in seconds from the first click. Pure, so it can be tested.
// sound: 'both', 'rhythm' (clicks only in the count-in) or 'click' (no guitar).
function rhythmSchedule(p,bpm,{countIn=true,loops=2,sound='both'}={}){
 const sec=60/bpm,step=sec/p.steps,bar=p.clicks*sec,accents=meterAccents(p.meter),lead=countIn?1:0,out=[];
 for(let b=0;b<lead+loops;b++){
  const t0=b*bar;
  if(b<lead||sound!=='rhythm')accents.forEach((accent,i)=>out.push({t:t0+i*sec,kind:'click',accent}));
  if(b>=lead&&sound!=='click')for(const h of p.hits)out.push({t:t0+h.step*step,kind:'note',accent:!!h.accent,step:h.step,dur:h.len*step*(p.staccato?.45:.94)});
 }
 return out.sort((x,y)=>x.t-y.t||(x.kind==='click'?-1:1));
}
async function startRhythm(practice=false,demo=null){
 // The note-length demos keep their fixed form: four count-in clicks, then two bars of 4/4, on the
 // guitar note, because a woodblock can't show how long a note lasts.
 const p=demo?makeRhythm({id:'demo',name:`${demo.name}s`,meter:'4/4',steps:4,hits:Array.from({length:4/demo.beats},(_,i)=>({step:i*demo.beats*4,len:demo.beats*4}))}):RHYTHM_PATTERNS[rhythmOptions.pattern];
 const opts=demo?{countIn:true,loops:2}:{countIn:rhythmOptions.countIn,loops:rhythmOptions.loops};
 // Tap practice keeps the rhythm silent and always clicks; the count-in always clicks too.
 const voice=practice?'off':demo?'guitar':rhythmOptions.rhythmSound,click=rhythmOptions.clickSound,countClick=click==='off'?'beep':click,barClick=practice?countClick:click;
 stopAudio();const generation=rhythmGeneration,ctx=await getAudio({instruments:kitInstruments([voice,countClick,barClick])});if(!ctx||generation!==rhythmGeneration||state.view!=='rhythm')return;
 const seconds=60/rhythmOptions.bpm,start=ctx.currentTime+.12,lead=opts.countIn?p.clicks*seconds:0,when=start+lead,end=when+opts.loops*p.clicks*seconds;
 const attacks=rhythmSchedule(p,rhythmOptions.bpm,{...opts,sound:'rhythm'}).filter(e=>e.kind==='note').map(e=>start+e.t);
 // A tap counts for the nearest attack, but never reaches halfway to the next one.
 const gaps=attacks.slice(1).map((t,i)=>t-attacks[i]),tolerance=Math.min(.2,seconds*.22,...gaps.map(g=>g/2));
 rhythmRun={ctx,start,when,end,seconds,practice,p,loops:opts.loops,tolerance,expected:attacks.map(at=>({at,hit:false})),errors:[],extra:0};playing=true;
 for(const e of rhythmSchedule(p,rhythmOptions.bpm,{...opts,sound:'both'})){
  if(e.kind==='click'){const id=start+e.t<when-1e-9?countClick:barClick;if(id!=='off')playKitSound(ctx,id,start+e.t,{accent:e.accent,role:'click'});}
  else if(voice!=='off')playKitSound(ctx,voice,start+e.t,{accent:e.accent?'strong':'medium',duration:e.dur,role:'note'});
 }
 const tap=document.getElementById('rhythm-tap');if(tap)tap.disabled=!practice;
 function frame(){const r=rhythmRun;if(!r||r.ctx!==ctx)return;const t=ctx.currentTime;if(t>=end){const message=practice?rhythmFeedback(r):`${p.name} finished. Now count it and play it on one guitar note.`;stopAudio();status(message);return;}
  const beat=(t-when)/seconds,local=((beat%p.clicks)+p.clicks)%p.clicks,tick=Math.floor(local*p.steps);
  // Demos play a fixed 4/4 bar, which may not match the rhythm shown, so they don't move the highlight.
  if(!demo){document.querySelectorAll('[data-rhythm-tick]').forEach(e=>e.classList.toggle('current',beat>=0&&Number(e.dataset.rhythmTick)===tick));document.querySelectorAll('[data-rhythm-event]').forEach(e=>{const n=Number(e.dataset.rhythmEvent),ev=p.events.find(v=>v.b===n);e.classList.toggle('sounding',beat>=0&&!!ev&&local>=n&&local<n+ev.d)});}
  const phase=beat<0?`Count in: ${Math.floor((t-start)/seconds)+1} of ${p.clicks}`:`Bar ${Math.floor(beat/p.clicks)+1} of ${opts.loops} · ${Math.floor(local)+1}${practice?' · tap the attacks':''}`;const statusEl=document.getElementById('audio-status');if(statusEl&&statusEl.textContent!==phase)statusEl.textContent=phase;rhythmFrame=requestAnimationFrame(frame);
 }
 status(practice?(opts.countIn?'Count in, then tap the note attacks. Keep silence during rests.':'Tap the note attacks. Keep silence during rests.'):(opts.countIn?'One bar of clicks, then listen to the rhythm.':'Listen to the rhythm.'));rhythmFrame=requestAnimationFrame(frame);
}
function rhythmFeedback(r){const hits=r.expected.filter(e=>e.hit).length,total=r.expected.length;if(!hits)return 'No taps recorded. Listen to the pattern, then try tap practice again.';const error=Math.round(r.errors.reduce((a,b)=>a+b,0)/hits*1000);return `${hits}/${total} note attacks matched · ${total-hits} missed · ${r.extra} extra tap${r.extra===1?'':'s'} · average timing difference ${error} ms. ${hits===total&&r.extra===0?'Good: try the same pattern on your guitar.':'Slow down and keep counting through the bar.'}`;}
function tapRhythm(){const r=rhythmRun;if(!r?.practice)return;const now=r.ctx.currentTime;if(now<r.when||now>=r.end)return;const candidates=r.expected.filter(e=>!e.hit),nearest=candidates.sort((a,b)=>Math.abs(a.at-now)-Math.abs(b.at-now))[0],tolerance=r.tolerance;if(nearest&&Math.abs(nearest.at-now)<=tolerance){nearest.hit=true;r.errors.push(Math.abs(nearest.at-now));}else r.extra++;const b=document.getElementById('rhythm-tap');b.textContent='Tap!';clearTimeout(b._tapTimer);b._tapTimer=setTimeout(()=>{b.textContent='Tap here · or press Space';},100);}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='rhythm-play')startRhythm().catch(audioError);if(b.id==='rhythm-practice')startRhythm(true).catch(audioError);if(b.id==='rhythm-stop'){stopAudio();status('Rhythm stopped.');}if(b.id==='rhythm-tap')tapRhythm();if(b.id==='rhythm-bpm-down')setRhythmBpm(rhythmOptions.bpm-1);if(b.id==='rhythm-bpm-up')setRhythmBpm(rhythmOptions.bpm+1);if(b.id==='rhythm-tap-tempo'){rhythmTapTimes=[...rhythmTapTimes,Date.now()].slice(-8);const bpm=tapTempoBpm(rhythmTapTimes);if(bpm)setRhythmBpm(bpm);}if(b.dataset.rhythmDemo)startRhythm(false,RHYTHM_VALUES.find(v=>v.key===b.dataset.rhythmDemo)).catch(audioError);});
document.addEventListener('change',e=>{const id=e.target.id;if(id==='rhythm-pattern'){selectRhythm(Number(e.target.value));render();}else if(id==='rhythm-time'){setRhythmTime(e.target.value);render();}else if(id==='rhythm-voice'||id==='rhythm-click'){const ids=id==='rhythm-voice'?RHYTHM_SOUND_IDS:CLICK_SOUND_IDS;if(ids.includes(e.target.value)){stopAudio();rhythmOptions[id==='rhythm-voice'?'rhythmSound':'clickSound']=e.target.value;saveRhythmSounds();}}else if(id==='rhythm-countin'){stopAudio();rhythmOptions.countIn=!!e.target.checked;updateRhythmPlan();}else if(id==='rhythm-loops'){stopAudio();rhythmOptions.loops=Number(e.target.value)||2;updateRhythmPlan();}});
document.addEventListener('input',e=>{if(e.target.id==='rhythm-tempo')setRhythmBpm(e.target.value);});
document.addEventListener('keydown',e=>{if(state.view==='rhythm'&&e.code==='Space'&&rhythmRun?.practice&&(e.target===document.body||e.target.id==='rhythm-tap')){e.preventDefault();if(!e.repeat)tapRhythm();}});
