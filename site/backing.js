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
const SOLOING_EXAMPLES=[
 {name:'Slow minor blues · let the line breathe',feel:'Straight eighths · spacious phrasing',bars:[1,2],chords:['Am7','Dm7'],
  tip:'Count 1 & 2 & 3 & 4 & slowly. Hold the opening A, add gentle vibrato, then leave half a beat before the change. Land on F at B6 as Dm7 arrives: F is its minor third. Keep the answer soft and let the final A ring.',
  events:[{b:0,s:1,f:5,d:1.5,v:true},{b:2,s:3,f:5,d:.5},{b:2.5,s:3,f:7,d:.5},{b:3,s:2,f:5,d:.5},{b:4,s:2,f:6,d:1.5},{b:6,s:3,f:7,d:.5},{b:6.5,s:3,f:5,d:.5},{b:7,s:4,f:7,d:1,v:true}]},
 {name:'Texas shuffle · lean into the long–short feel',feel:'Shuffle · long–short eighths',bars:[1,2],chords:['A7','D7'],
  tip:'Count 1 trip let, playing the number and let for long–short eighths. Start on C♯ at G6, the third of A7. Bend G7 up a whole tone to E (the pitch at G9). The short C-to-C♯ hammer-on adds blues colour. Rest on beat 4, then land on F♯ at B7, the third of D7. Keep the shuffle relaxed.',
  events:[{b:0,s:3,f:6,d:2/3},{b:2/3,s:2,f:5,d:1/3},{b:1,s:3,f:7,d:2/3,bend:2},{b:5/3,s:2,f:5,d:1/3},{b:2,s:3,f:5,d:1/3},{b:7/3,s:3,f:6,d:2/3,legato:'h'},{b:4,s:2,f:7,d:2/3},{b:14/3,s:2,f:5,d:1/3},{b:5,s:3,f:7,d:2/3},{b:17/3,s:3,f:5,d:1/3},{b:6,s:4,f:7,d:1}]},
 {name:'Driving blues-rock · make the chord change count',feel:'Straight eighths · firm backbeat',bars:[4,5],chords:['E7','A7'],
  tip:'Play this at the change from track bar 4 to bar 5. Count even 1 & 2 & 3 & 4 & with a firm pick attack; do not swing. Use E minor pentatonic for the first bar, leave beat 3 empty, then land on C♯ at B14 when A7 begins. That major third makes the change clear. Finish on A at G14 with controlled vibrato.',
  events:[{b:0,s:1,f:12,d:.5},{b:.5,s:1,f:15,d:.5},{b:1,s:2,f:12,d:1},{b:3,s:2,f:15,d:.5},{b:3.5,s:2,f:12,d:.5},{b:4,s:2,f:14,d:1},{b:5,s:1,f:12,d:.5},{b:5.5,s:2,f:15,d:.5},{b:6,s:3,f:14,d:2,v:true}]},
 {name:'Clean funk · short notes, clear gaps',feel:'Straight sixteenths · syncopated attacks',bars:[1,2],chords:['Am7','D7'],
  tip:'Count 1 e & a throughout, including the gaps. Start on C at G5, the minor third of Am7. Keep each note short: release fretting pressure without lifting completely off the string to mute it. On the next downbeat, land on F♯ at B7, the major third of D7 and the bright sixth of A Dorian. Keep your picking hand moving evenly through the rests.',
  events:[{b:0,s:3,f:5,d:.25},{b:.75,s:2,f:5,d:.25},{b:1.5,s:1,f:5,d:.25},{b:2.75,s:2,f:8,d:.25},{b:3.5,s:2,f:5,d:.25},{b:4,s:2,f:7,d:.25},{b:4.75,s:3,f:7,d:.25},{b:5.5,s:3,f:5,d:.25},{b:6.75,s:4,f:7,d:.25},{b:7.5,s:3,f:7,d:.25}]}
];
function soloingExamples(){return `<div class="soloing-examples"><h3>Try it in each style</h3><p class="tiny">Four original two-bar examples for the arranged tracks, in standard tuning. Tab bars 1–2 show the two track bars named below. These examples keep their written keys when you change a transposable loop.</p><p class="tiny">High e is the top string. Numbers are frets; h = hammer-on, b = bend to the following fret’s pitch, ~ = vibrato. The bars below each tab show note length; empty time is a rest.</p>${SOLOING_EXAMPLES.map((example,i)=>{const track=BACKING_TRACKS[i];return `<details class="soloing-example" data-soloing-example="${i}"${state.jamMode==='studio'&&state.studioTrack===i?' open':''}><summary>${example.name}</summary><p class="tiny">${track.name} · ${track.key} · ${track.bpm} BPM<br>Track bars ${example.bars.join('–')}: ${example.chords.join(' → ')} · ${example.feel}</p><p>${example.tip}</p><div class="tab-scroll">${lickTab(example,`solo-${i}`)}</div><div class="lick-actions"><button class="btn primary" data-play-solo="${i}" aria-pressed="false" aria-label="Play ${track.style} example">▶ Play example</button><button class="btn" data-stop-solo="${i}" disabled aria-label="Stop ${track.style} example">■ Stop</button><button class="btn" data-download-solo="${i}" aria-label="Download ${track.style} example audio">↓ Download audio</button><span class="tiny">Solo guitar · four-beat count-in · ${track.bpm} BPM</span></div><p class="tiny" id="solo-status-${i}" role="status">Hear the written phrase, then try it yourself.</p><details><summary>Notes and timing</summary>${lickNoteList(example)}</details></details>`;}).join('')}</div>`;}
function studioMixControls(){return `<div class="studio-mixer" aria-label="Backing instrument levels">${['guitar','bass','drums'].map(name=>`<div class="field"><label for="mix-${name}">${name.toUpperCase()} · <span id="mix-value-${name}">${state.studioMix[name]}%</span></label><input type="range" id="mix-${name}" data-studio-mix="${name}" min="0" max="100" value="${state.studioMix[name]}"></div>`).join('')}</div>`;}
document.addEventListener('input',e=>{const name=e.target.dataset.studioMix;if(!name)return;state.studioMix[name]=Number(e.target.value);document.getElementById(`mix-value-${name}`).textContent=`${e.target.value}%`;applyStudioMix();});

function soloingRecording(index){
 const track=BACKING_TRACKS[index];
 return {...SOLOING_EXAMPLES[index],bpm:track.bpm,tone:['clean','warm','warm','muted'][index]};
}
function soloingAudioOptions(lick){return {speed:100,loop:false,backing:false,tone:lick.tone};}
function playSoloingExample(index){
 const lick=soloingRecording(index);
 return playTabExample(`solo-${index}`,lick,soloingAudioOptions(lick),`[data-play-solo="${index}"]`,`[data-stop-solo="${index}"]`,message=>{
  const output=document.getElementById(`solo-status-${index}`);if(output)output.textContent=message;
  status(message);
 });
}
function downloadSoloingExample(index,button){
 const lick=soloingRecording(index);
 return downloadTabExample(lick,soloingAudioOptions(lick),`fretwise-soloing-${BACKING_TRACKS[index].id}-${lick.bpm}bpm.wav`,button);
}
document.addEventListener('click',e=>{
 const button=e.target.closest('button');if(!button)return;
 if(button.dataset.playSolo!==undefined)playSoloingExample(Number(button.dataset.playSolo)).catch(audioError);
 if(button.dataset.stopSolo!==undefined){stopAudio();status('Example stopped.');}
 if(button.dataset.downloadSolo!==undefined)downloadSoloingExample(Number(button.dataset.downloadSolo),button);
});
