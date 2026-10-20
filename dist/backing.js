'use strict';
const BACKING_TRACKS=[{"id":"slow-minor","name":"After midnight","style":"Slow minor blues","root":9,"key":"A minor","bpm":72,"scale":"aeolian","seq":[[0,"m7"],[5,"m7"],[0,"m7"],[0,"m7"],[8,"maj7"],[5,"m7"],[7,"7"],[0,"m7"]],"nums":["i7","iv7","i7","i7","\u266dVImaj7","iv7","V7","i7"],"description":"Spacious chord replies, melodic bass and a restrained acoustic kit.","duration":26.66665625,"stems":{"guitar":"/assets/audio/backing/slow-minor-guitar.mp3","bass":"/assets/audio/backing/slow-minor-bass.mp3","drums":"/assets/audio/backing/slow-minor-drums.mp3","mix":"/assets/audio/backing/slow-minor-mix.mp3"}},{"id":"texas-shuffle","name":"Dusty road shuffle","style":"Texas shuffle","root":9,"key":"A blues","bpm":86,"scale":"mixolydian","seq":[[0,"7"],[5,"7"],[0,"7"],[0,"7"],[5,"7"],[5,"7"],[0,"7"],[0,"7"],[7,"7"],[5,"7"],[0,"7"],[7,"7"]],"nums":["I7","IV7","I7","I7","IV7","IV7","I7","I7","V7","IV7","I7","V7"],"description":"Long\u2013short rhythm guitar, a walking bass line and shuffle drums.","duration":33.488375,"stems":{"guitar":"/assets/audio/backing/texas-shuffle-guitar.mp3","bass":"/assets/audio/backing/texas-shuffle-bass.mp3","drums":"/assets/audio/backing/texas-shuffle-drums.mp3","mix":"/assets/audio/backing/texas-shuffle-mix.mp3"}},{"id":"blues-rock","name":"Open road","style":"Driving blues rock","root":4,"key":"E blues","bpm":104,"scale":"mixolydian","seq":[[0,"7"],[0,"7"],[0,"7"],[0,"7"],[5,"7"],[5,"7"],[0,"7"],[0,"7"],[7,"7"],[5,"7"],[0,"7"],[7,"7"]],"nums":["I7","I7","I7","I7","IV7","IV7","I7","I7","V7","IV7","I7","V7"],"description":"Crunchy boogie guitar, picked-feel bass accents and a driving backbeat.","duration":27.6923125,"stems":{"guitar":"/assets/audio/backing/blues-rock-guitar.mp3","bass":"/assets/audio/backing/blues-rock-bass.mp3","drums":"/assets/audio/backing/blues-rock-drums.mp3","mix":"/assets/audio/backing/blues-rock-mix.mp3"}},{"id":"clean-funk","name":"Pocket conversation","style":"Clean funk","root":9,"key":"A Dorian","bpm":100,"scale":"dorian","seq":[[0,"m7"],[5,"7"],[0,"m7"],[5,"7"],[0,"m7"],[5,"7"],[0,"m7"],[5,"7"]],"nums":["i7","IV7","i7","IV7","i7","IV7","i7","IV7"],"description":"Muted guitar stabs, syncopated bass, hi-hat accents and ghost notes.","duration":19.2,"stems":{"guitar":"/assets/audio/backing/clean-funk-guitar.mp3","bass":"/assets/audio/backing/clean-funk-bass.mp3","drums":"/assets/audio/backing/clean-funk-drums.mp3","mix":"/assets/audio/backing/clean-funk-mix.mp3"}}];
const backingPromises=new Map();
let studioRun=null,studioFrame=0;
const studioGains={};
function activeJamProgression(){return state.jamMode==='studio'?BACKING_TRACKS[state.studioTrack]:PROGS[state.jamProgression];}
async function loadBacking(ctx,track){
 if(backingPromises.has(track.id))return backingPromises.get(track.id);
 const promise=Promise.all(['guitar','bass','drums'].map(async name=>{const response=await fetch(track.stems[name]);if(!response.ok)throw Error('Could not load backing track');const buffer=await ctx.decodeAudioData(await response.arrayBuffer());if(buffer.duration+.01<track.duration)throw Error('Backing stem is too short');return{name,buffer};})).catch(error=>{backingPromises.delete(track.id);throw error;});
 backingPromises.set(track.id,promise);
 // Keep decoded tracks bounded on phones; fetching again reuses the HTTP cache.
 if(backingPromises.size>2){const oldest=backingPromises.keys().next().value;if(oldest!==track.id)backingPromises.delete(oldest);}
 return promise;
}
function stopBackingPlayback(){cancelAnimationFrame(studioFrame);studioRun=null;for(const name of Object.keys(studioGains))delete studioGains[name];}
function applyStudioMix(){for(const name of ['guitar','bass','drums']){const enabled=name==='bass'?state.jamBass:name==='drums'?state.jamDrums:true;const gain=studioGains[name];if(gain)gain.gain.setTargetAtTime(enabled*state.studioMix[name]/100,audio.currentTime,.02);}}
async function startStudioBacking(){
 if(playing||audioPending){stopAudio();updateJamUI(0);status('Jam stopped.');return;}
 stopAudio();const generation=lickPlaybackGeneration,track=BACKING_TRACKS[state.studioTrack];
 const ctx=await getAudio({instruments:[],loadingMessage:'Preparing the rhythm section…'});if(!ctx)return;
 status(`Loading ${track.name}…`);audioPending=true;transportActive(true);
 let stems;try{stems=await loadBacking(ctx,track);}catch(error){if(generation!==lickPlaybackGeneration)return;throw error;}
 if(generation!==lickPlaybackGeneration||state.view!=='jam'||state.jamMode!=='studio'||document.hidden)return;
 const seconds=60/track.bpm,start=ctx.currentTime+.12,when=start+4*seconds;
 playing=true;audioPending=false;studioRun={ctx,when,track};document.getElementById('start-jam').textContent='■ Stop jam';
 for(let i=0;i<4;i++)lickClick(ctx,start+i*seconds,i===0,true);
 for(const {name,buffer}of stems){const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;source.loop=true;source.loopStart=0;source.loopEnd=track.duration;source.connect(gain);gain.connect(sampleBus(ctx).input);studioGains[name]=gain;source.start(when);keepSource(source,gain);}
 applyStudioMix();let lastBar=-1,lastCount=-1;
 function frame(){const r=studioRun;if(!r||generation!==lickPlaybackGeneration)return;const elapsed=ctx.currentTime-when;
  if(elapsed<0){const count=Math.max(1,Math.floor((elapsed+4*seconds)/seconds)+1);if(count!==lastCount){lastCount=count;status(`${track.name} · count in ${count} of 4`);}}
  else{const bar=Math.floor((elapsed%track.duration)/(4*seconds))%track.seq.length;if(bar!==lastBar){lastBar=bar;updateJamUI(bar);status(`${track.name} · ${track.key} · ${track.bpm} BPM · bar ${bar+1} of ${track.seq.length}`);}}
  studioFrame=requestAnimationFrame(frame);
 }
 studioFrame=requestAnimationFrame(frame);
}
function studioMixControls(){return `<div class="studio-mixer" aria-label="Backing instrument levels">${['guitar','bass','drums'].map(name=>`<div class="field"><label for="mix-${name}">${name.toUpperCase()} · <span id="mix-value-${name}">${state.studioMix[name]}%</span></label><input type="range" id="mix-${name}" data-studio-mix="${name}" min="0" max="100" value="${state.studioMix[name]}"></div>`).join('')}</div>`;}
document.addEventListener('input',e=>{const name=e.target.dataset.studioMix;if(!name)return;state.studioMix[name]=Number(e.target.value);document.getElementById(`mix-value-${name}`).textContent=`${e.target.value}%`;applyStudioMix();});
