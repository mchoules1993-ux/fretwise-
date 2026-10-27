const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const elements=new Map();const element=id=>{if(!elements.has(id))elements.set(id,{textContent:'',innerHTML:'',disabled:false,dataset:{},classList:{remove(){},toggle(){}},setAttribute(){},removeAttribute(){},scrollIntoView(){},append(){},click(){},remove(){}});return elements.get(id)};
let serial=0;const timeouts=new Map(),frames=new Map(),sources=[];
class Param{constructor(){this.value=0}setValueAtTime(){}exponentialRampToValueAtTime(){}linearRampToValueAtTime(){}setValueCurveAtTime(){}setTargetAtTime(value){this.value=value}}
class Node{constructor(){this.gain=new Param;this.frequency=new Param;this.playbackRate=new Param;this.Q=new Param;this.threshold=new Param;this.knee=new Param;this.ratio=new Param;this.attack=new Param;this.release=new Param;this.delayTime=new Param}connect(){}disconnect(){this.disconnected=true}start(when=0){this.when=when;sources.push(this)}stop(){this.stopped=true}}
class Context{constructor(){this.currentTime=0;this.sampleRate=44100;this.state='running';this.destination=new Node}async resume(){this.state='running'}createBuffer(){return{duration:2,length:88200,sampleRate:44100,numberOfChannels:1,getChannelData:()=>new Float32Array(88200)}}createBufferSource(){return new Node}createGain(){return new Node}createOscillator(){return new Node}createDynamicsCompressor(){return new Node}createDelay(){return new Node}createBiquadFilter(){return new Node}createWaveShaper(){return new Node}}
const c=vm.createContext({console,Float32Array,Uint8Array,DataView,ArrayBuffer,Map,Set,Blob,URL,window:{AudioContext:Context,addEventListener(){}},document:{hidden:false,body:element('body'),getElementById:element,querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){},createElement:()=>element('download')},history:{replaceState(){}},location:{hash:''},setTimeout:(fn,ms)=>{const id=++serial;timeouts.set(id,{fn,ms});return id},clearTimeout:id=>timeouts.delete(id),requestAnimationFrame:fn=>{const id=++serial;frames.set(id,fn);return id},cancelAnimationFrame:id=>frames.delete(id),atob:()=>'',fetch:()=>{throw Error('Unexpected request')}});
for(const f of ['sampled-audio','backing','licks','rhythm','releases','chords','app'])vm.runInContext(fs.readFileSync(`site/${f}.js`,'utf8'),c,{filename:f});
const run=code=>vm.runInContext(code,c),flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve()};
(async()=>{
 // Opening Jam Room must render every arranged track without progression-only metadata.
 const expectedChords=[['Am7','Dm7','Am7','Am7','Fmaj7','Dm7','E7','Am7'],['A7','D7','A7','A7','D7','D7','A7','A7','E7','D7','A7','E7'],['E7','E7','E7','E7','A7','A7','E7','E7','B7','A7','E7','B7'],['Am7','D7','Am7','D7','Am7','D7','Am7','D7']];
 for(let i=0;i<expectedChords.length;i++){
  run(`state.studioTrack=${i};navigate('jam')`);
  assert.match(element('main').innerHTML,/id="start-jam"/);
  assert.equal(element('jam-now').textContent,`Bar 1 · ${expectedChords[i][0]}`);
  assert.deepEqual(JSON.parse(run('JSON.stringify(activeJamProgression().seq.map((_,i)=>progName(activeJamProgression(),i)))')),expectedChords[i]);
 }
 run("navigate('scales')");
 // Delay sample loading, then cancel. Completed loading must not restart playback.
 run("state.view='legends';loadGuitarSamples=()=>new Promise(resolve=>{globalThis.completeLoad=resolve});");
 const pending=run('playBluesLick(0)');await flush();run('stopAudio()');c.completeLoad();await pending;
 assert.equal(run('playing'),false);assert.equal(element('stop-all').disabled,true);
 // Two competing Play requests: only the latest request may schedule a phrase.
 run("loadGuitarSamples=()=>globalThis.loadGate;globalThis.loadGate=new Promise(resolve=>{globalThis.completeLoad=resolve});");
 const first=run('playBluesLick(0)'),second=run('playBluesLick(2)');
 run("for(const bank of Object.values(sampleBuffers))bank.set(69,audio.createBuffer());");
 c.completeLoad();await Promise.all([first,second]);assert.equal(run('lickRun.index'),2);assert.equal(run('playing'),true);
 // Absolute audio deadlines: browser callback delay must not accumulate into loop spacing.
 run('stopAudio();loadGuitarSamples=async()=>{};lickOptions.loop=true');await run('playBluesLick(2)');
 const start=run('lickRun.when'),seconds=run('lickRun.seconds');
 for(let cycle=1;cycle<=12;cycle++){
  run(`audio.currentTime=${start+cycle*12*seconds-.1}`);
  const timer=run('lickPumpTimer'),job=timeouts.get(timer);timeouts.delete(timer);job.fn();
  assert.ok(Math.abs(run('lickRun.next')-(start+(cycle+1)*12*seconds))<1e-8);
 }
 const cancelled=run('lickPumpTimer'),oldCallback=timeouts.get(cancelled).fn;run('stopAudio()');const count=sources.length;oldCallback();assert.equal(sources.length,count);assert.equal(timeouts.has(cancelled),false);assert.equal(run('lickRun'),null);
 // An export bus is independent: Stop live audio must not cut the render graph.
 run('globalThis.exportCtx=new window.AudioContext();globalThis.exportBus=sampleBus(exportCtx);');run('stopAudio()');assert.equal(run('exportBus.input.disconnected'),undefined);run('resetSampleAudio(exportCtx)');assert.equal(run('exportBus.input.disconnected'),true);
 // Ended one-shot nodes clean up and reset persistent Stop state.
 run('oscillators=[];audioPending=false;playing=false;globalThis.node=audio.createBufferSource();keepSource(node);transportActive(true);node.onended()');assert.equal(run('oscillators.length'),0);assert.equal(element('stop-all').disabled,true);
 // WAV exports retain the selected view/tempo even if the page changes during rendering.
 class Offline extends Context{startRendering(){return new Promise(resolve=>{c.finishRender=resolve})}}
 c.window.OfflineAudioContext=Offline;
 run("state.view='legends';lickOptions.speed=75;lickOptions.tone='clean';lickOptions.loop=false;globalThis.exportButton={disabled:false}");
 const exportPromise=run('downloadBluesLick(0,exportButton)');await flush();
 assert.equal(typeof c.finishRender,'function');
 run("state.view='licks';lickOptions.speed=100;lickOptions.tone='warm';stopAudio()");
 c.finishRender({getChannelData:()=>new Float32Array(128)});await exportPromise;
 assert.match(element('download').download,/fretwise-legends-lick-1-65bpm/);
 assert.equal(run('exportButton.disabled'),false);
 // Sample selection honours velocity and alternates repeated takes.
 run("sampleVariants.guitar=[{key:60,velocity:55,rr:1,articulation:'sustain',buffer:{}},{key:60,velocity:110,rr:1,articulation:'sustain',buffer:{}},{key:60,velocity:110,rr:2,articulation:'sustain',buffer:{}}];sampleCounters.clear()");
 assert.equal(run("chooseSample('guitar',60,52).velocity"),55);
 assert.equal(run("chooseSample('guitar',60,110).rr"),1);
 assert.equal(run("chooseSample('guitar',60,110).rr"),2);
 // Late-arriving backing downloads cannot restart after Stop.
 run("sampleVariants.guitar=[];state.view='jam';state.jamMode='studio';state.studioTrack=0;backingPromises.clear()");
 const gate=new Promise(resolve=>{c.finishBackingFetch=resolve});
 c.fetch=async()=>{await gate;return{ok:true,arrayBuffer:async()=>new ArrayBuffer(1)}};
 Context.prototype.decodeAudioData=async()=>({duration:26.67});
 const cancelledBacking=run('startStudioBacking()');await flush();run('stopAudio()');const stoppedCount=sources.length;c.finishBackingFetch();await cancelledBacking;assert.equal(sources.length,stoppedCount);assert.equal(run('studioRun'),null);
 // Aligned stems start together; mixer changes do not restart them.
 c.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});
 run('backingPromises.clear()');await run('startStudioBacking()');
 assert.equal(run('playing'),true);const stemStarts=sources.slice(-3).map(s=>s.when);assert.ok(stemStarts.every(v=>v===stemStarts[0]));
 const beforeMix=sources.length;run('state.studioMix.guitar=25;applyStudioMix()');assert.equal(run('studioGains.guitar.gain.value'),.25);assert.equal(sources.length,beforeMix);
 run('state.jamBass=false;applyStudioMix()');assert.equal(run('studioGains.bass.gain.value'),0);run('stopAudio()');assert.equal(run('studioRun'),null);
 // The live guide must distinguish minor-seventh and dominant-seventh harmony.
 assert.equal(run("state.jamMode='studio';state.studioTrack=0;state.root=9;state.jamScale='follow';jamTheory(0).scaleKey"),'dorian');
 assert.equal(run('jamTheory(6).scaleKey'),'mixolydian');
 // Each player has a genuinely new faster phrase; the shared player must schedule
 // every fast study at its own tempo and at both slower practice speeds.
 const fastStudies=JSON.parse(run('JSON.stringify(LEGEND_LICKS.slice(5))'));
 assert.deepEqual(fastStudies.map(l=>l.name.split(' · ')[0]),['SRV','Hendrix','Page','Clapton','Moore']);
 // The Hendrix double-stop hammers G5 to G7; the unchanged B5 must not
 // inherit that marking and falsely teach a same-fret hammer-on.
 const hendrixFastTab=run('lickTab(LEGEND_LICKS[6],6)');
 assert.match(hendrixFastTab,/>h7<\/text>/);
 assert.doesNotMatch(hendrixFastTab,/>h5<\/text>/);
 const fastBpms=[120,112,140,116,128];
 for(let offset=0;offset<5;offset++){
  const index=offset+5,lick=fastStudies[offset];
  assert.equal(lick.bpm,fastBpms[offset]);
  assert.notDeepEqual(lick.events,JSON.parse(run(`JSON.stringify(LEGEND_LICKS[${offset}].events)`)));
  for(const speed of [60,75,100]){
   run(`state.view='legends';lickOptions.speed=${speed};lickOptions.loop=false;lickOptions.backing=true`);
   await run(`playBluesLick(${index})`);
   const beatSeconds=60/(fastBpms[offset]*speed/100);
   assert.ok(Math.abs(run('lickRun.seconds')-beatSeconds)<1e-10);
   assert.ok(Math.abs(run('lickRun.when-lickRun.start')-4*beatSeconds)<1e-10);
   assert.equal(run('lickRun.index'),index);assert.equal(run('playing'),true);
   const page=run('legendsView()');
   assert.match(page,new RegExp(`${Math.round(fastBpms[offset]*speed/100)} BPM`));
   assert.match(page,/LICK 10 · /);assert.doesNotMatch(page,/LICK 010/);
   assert.equal((page.match(/class="panel lick-card"/g)||[]).length,10);
   run('stopAudio()');assert.equal(run('lickRun'),null);assert.equal(run('playing'),false);
  }
 }
 // Export the final fast study at 75%: 128 BPM becomes 96 BPM, including
 // the same two-bar phrase, without falling back to one of the original studies.
 run("state.view='legends';lickOptions.speed=75;globalThis.fastExportButton={disabled:false}");
 const fastExport=run('downloadBluesLick(9,fastExportButton)');await flush();
 c.finishRender({getChannelData:()=>new Float32Array(128)});await fastExport;
 assert.match(element('download').download,/fretwise-legends-lick-10-96bpm/);
 assert.equal(run('fastExportButton.disabled'),false);
 // Every new phrase must fit the declared two bars and generate valid mobile + wide SVG.
 for(let i=0;i<run('LEGEND_LICKS.length');i++){
  const events=JSON.parse(run(`JSON.stringify(LEGEND_LICKS[${i}].events)`));
  for(const e of events){assert.ok(e.b>=0&&e.d>0&&e.b+e.d<=8+1e-6);assert.ok(e.s>=1&&e.s<=6&&e.f>=0&&e.f<=24)}
  const html=run(`lickTab(LEGEND_LICKS[${i}],${i})`);assert.equal((html.match(/class="beat-tile"/g)||[]).length,8);assert.ok(!/NaN|undefined/.test(html));
  assert.equal((html.match(/<svg[ >]/g)||[]).length,(html.match(/<\/svg>/g)||[]).length);
 }
 console.log('PASS: cancelled loads, competing Play taps, 12 exact loop cycles, stopped callbacks, isolated export bus, source cleanup, ten valid phrasing studies, five fast studies at three practice speeds, fast WAV export, mobile SVGs, sample velocities/takes, cancelled backing downloads, aligned stems, live mixer and chord-guide quality.');
})().catch(e=>{console.error(e);process.exitCode=1});
