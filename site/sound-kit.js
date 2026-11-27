'use strict';
// Shared sound kit: percussion for the rhythm trainer (and, later, the metronome).
// Woodblock, clave, cowbell, rim click and beep are made in code with Web Audio, so nothing is
// downloaded. Snare, hi-hat and kick reuse the Jam room drum samples; the guitar note reuses the
// guitar samples (load them with getAudio({instruments:kitInstruments(ids)}) first).
// Accents: 'strong' (beat 1) is louder and a little higher, 'medium' a little less, 'weak' softest.
const SOUND_KIT=[
 {id:'woodblock',name:'Woodblock',source:'synth'},
 {id:'clave',name:'Clave',source:'synth'},
 {id:'cowbell',name:'Cowbell',source:'synth'},
 {id:'rim',name:'Rim click',source:'synth'},
 {id:'beep',name:'Beep',source:'synth'},
 {id:'snare',name:'Snare',source:'drums',sample:'snare'},
 {id:'hihat',name:'Hi-hat',source:'drums',sample:'hat'},
 {id:'kick',name:'Kick',source:'drums',sample:'kick'},
 {id:'guitar',name:'Guitar note (A)',source:'guitar'},
 {id:'off',name:'Off',source:'none'}
];
const RHYTHM_SOUND_IDS=['woodblock','clave','cowbell','rim','snare','hihat','guitar','off'];
const CLICK_SOUND_IDS=['beep','woodblock','rim','cowbell','hihat','kick','off'];
const KIT_ACCENTS={strong:{gain:1,pitch:1.25},medium:{gain:.8,pitch:1.1},weak:{gain:.6,pitch:1}};
const KIT_BEEP={strong:1760,medium:1320,weak:1050};
function kitSound(id){return SOUND_KIT.find(k=>k.id===id)||SOUND_KIT.find(k=>k.id==='beep');}
// The sample banks the chosen sounds need, for getAudio({instruments}).
function kitInstruments(ids){const banks=new Set(ids.map(id=>kitSound(id).source));return ['guitar','drums'].filter(b=>banks.has(b));}

const kitNoise=new WeakMap();
function kitNoiseBuffer(ctx){
 if(!kitNoise.has(ctx)){const len=Math.ceil(ctx.sampleRate*.1),buffer=ctx.createBuffer(1,len,ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<len;i++)data[i]=Math.random()*2-1;kitNoise.set(ctx,buffer);}
 return kitNoise.get(ctx);
}
// A gain that rises to peak in 2 ms, then dies away over decay seconds.
function kitEnvelope(ctx,when,peak,decay){const g=ctx.createGain();g.gain.setValueAtTime(.0001,when);g.gain.linearRampToValueAtTime(peak,when+.002);g.gain.exponentialRampToValueAtTime(.0001,when+decay);g.connect(ctx.destination);return g;}
function kitTone(ctx,when,{freq,from=freq,type='sine',peak,decay,out=null}){
 const o=ctx.createOscillator(),g=out||kitEnvelope(ctx,when,peak,decay);o.type=type;
 o.frequency.setValueAtTime(from,when);if(from!==freq)o.frequency.exponentialRampToValueAtTime(freq,when+.02);
 o.connect(g);o.start(when);o.stop(when+decay+.02);return [o,g];
}
function kitHiss(ctx,when,{filter,freq,q=1,peak,decay}){
 const src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=kitEnvelope(ctx,when,peak,decay);
 src.buffer=kitNoiseBuffer(ctx);f.type=filter;f.frequency.value=freq;f.Q.value=q;src.connect(f);f.connect(g);src.start(when);src.stop(when+decay+.02);return [src,f,g];
}
function playKitSound(ctx,id,when,{accent='medium',duration=.2,track=true}={}){
 const k=kitSound(id),a=KIT_ACCENTS[accent]||KIT_ACCENTS.medium,parts=[];
 if(k.source==='none')return;
 if(k.source==='drums'){sampledDrum(ctx,k.sample,when,.1*a.gain,track,accent==='strong'?110:accent==='medium'?90:70);return;}
 if(k.source==='guitar'){sampleVoice(ctx,69,when,duration,.3*a.gain,'clean',track);return;}
 const p=a.pitch,lvl=a.gain;
 if(k.id==='woodblock'){parts.push(kitTone(ctx,when,{freq:1000*p,from:1060*p,peak:.45*lvl,decay:.07}),kitHiss(ctx,when,{filter:'bandpass',freq:2000*p,q:6,peak:.15*lvl,decay:.012}));}
 else if(k.id==='clave')parts.push(kitTone(ctx,when,{freq:2500*p,peak:.35*lvl,decay:.045}));
 else if(k.id==='cowbell'){const f=ctx.createBiquadFilter(),g=kitEnvelope(ctx,when,.25*lvl,.3);f.type='bandpass';f.frequency.value=800*p;f.Q.value=2.5;f.connect(g);
  for(const hz of [540,800])parts.push(kitTone(ctx,when,{freq:hz*p,type:'square',decay:.3,out:f}));parts.push([f,g]);}
 else if(k.id==='rim'){parts.push(kitTone(ctx,when,{freq:1700*p,peak:.4*lvl,decay:.025}),kitHiss(ctx,when,{filter:'highpass',freq:2500,peak:.2*lvl,decay:.02}));}
 else parts.push(kitTone(ctx,when,{freq:KIT_BEEP[accent]||KIT_BEEP.medium,peak:{strong:.34,medium:.24,weak:.17}[accent]||.24,decay:.05}));
 // Track every sounding source so Stop audio can silence it, and disconnect it afterwards.
 if(track&&typeof keepSource==='function')for(const [src,...nodes] of parts)if(src.start)keepSource(src,...nodes);
}
