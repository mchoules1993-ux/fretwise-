'use strict';
// Compact CC0 multisamples. Banks load independently; no third-party playback requests.
const sampleBuffers={lead:new Map(),clean:new Map(),bass:new Map()};
const sampleVariants={guitar:[],bass:[],drums:[]},samplePromises=new Map(),sampleCounters=new Map();
let sampleLoadPromise=null;
const sampleBuses=new Map();
async function loadInstrument(ctx,bank){
 if(samplePromises.has(bank))return samplePromises.get(bank);
 const promise=(async()=>{const response=await fetch(`/assets/audio/studio/${bank}.json`);if(!response.ok)throw Error(`Could not load ${bank} samples`);const entries=await response.json();let next=0;const prepared=[];
  await Promise.all(Array.from({length:4},async()=>{while(next<entries.length){const e=entries[next++],binary=atob(e.data),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0)),buffer=await ctx.decodeAudioData(bytes.buffer);const {data,...metadata}=e;prepared.push({...metadata,buffer});}}));
  prepared.sort((a,b)=>String(a.key).localeCompare(String(b.key))||a.velocity-b.velocity||a.rr-b.rr);sampleVariants[bank]=prepared;
  if(bank!=='drums')for(const e of prepared)if(e.articulation==='sustain'){const roles=bank==='guitar'?['lead','clean']:['bass'];for(const role of roles)if(!sampleBuffers[role].has(e.key))sampleBuffers[role].set(e.key,e.buffer);}
 })().catch(error=>{samplePromises.delete(bank);throw error;});samplePromises.set(bank,promise);return promise;
}
async function loadGuitarSamples(ctx,instruments=['guitar','bass']){sampleLoadPromise=Promise.all(instruments.map(bank=>loadInstrument(ctx,bank)));await sampleLoadPromise;}
function chooseSample(bank,midi,velocity=90,articulation='sustain'){
 const entries=sampleVariants[bank].filter(e=>e.articulation===articulation);if(!entries.length)return null;
 const key=typeof midi==='number'?entries.reduce((best,e)=>Math.abs(e.key-midi)<Math.abs(best-midi)?e.key:best,entries[0].key):midi;
 const notes=entries.filter(e=>e.key===key);if(!notes.length)return null;
 const layer=notes.reduce((best,e)=>Math.abs(e.velocity-velocity)<Math.abs(best-velocity)?e.velocity:best,notes[0].velocity),takes=notes.filter(e=>e.velocity===layer),counterKey=`${bank}:${key}:${layer}:${articulation}`,counter=sampleCounters.get(counterKey)||0;
 sampleCounters.set(counterKey,counter+1);return takes[counter%takes.length];
}
function sampledDrum(ctx,type,when,volume=.08,track=true,velocity=90){
 const e=chooseSample('drums',type,velocity,'hit');if(!e)throw Error('Drum samples are not ready');const src=ctx.createBufferSource(),g=ctx.createGain();src.buffer=e.buffer;g.gain.value=volume*3;src.connect(g);g.connect(sampleBus(ctx).input);src.start(when);if(track)keepSource(src,g);return src;
}
function smoothSampleLoop(buffer){
 // Match the end of the sustain loop to the audio immediately before its start.
 const start=Math.round(.6*buffer.sampleRate),end=Math.round(1.45*buffer.sampleRate),fade=Math.round(.025*buffer.sampleRate);
 if(buffer.length<=end)return;
 for(let c=0;c<buffer.numberOfChannels;c++){const d=buffer.getChannelData(c);for(let i=0;i<fade;i++){const weight=(i+1)/fade;d[end-fade+i]=d[end-fade+i]*(1-weight)+d[start-fade+i]*weight;}}
 let peak=0;for(let c=0;c<buffer.numberOfChannels;c++)for(const x of buffer.getChannelData(c))peak=Math.max(peak,Math.abs(x));
 if(peak>0)for(let c=0;c<buffer.numberOfChannels;c++){const d=buffer.getChannelData(c);for(let i=0;i<d.length;i++)d[i]*=.8/peak;}
}
function sampleBus(ctx){
 if(sampleBuses.has(ctx))return sampleBuses.get(ctx);
 const comp=ctx.createDynamicsCompressor(),out=ctx.createGain(),delay=ctx.createDelay(1),feedback=ctx.createGain(),wet=ctx.createGain(),rolloff=ctx.createBiquadFilter();
 comp.threshold.value=-15;comp.knee.value=12;comp.ratio.value=3;comp.attack.value=.006;comp.release.value=.16;out.gain.value=.85;
 delay.delayTime.value=.23;feedback.gain.value=.23;wet.gain.value=.16;rolloff.type='lowpass';rolloff.frequency.value=2800;
 comp.connect(out);out.connect(ctx.destination);delay.connect(rolloff);rolloff.connect(feedback);feedback.connect(delay);rolloff.connect(wet);wet.connect(comp);
 const bus={input:comp,delay,nodes:[comp,out,delay,feedback,wet,rolloff]};sampleBuses.set(ctx,bus);return bus;
}
function resetSampleAudio(ctx){const bus=sampleBuses.get(ctx);if(bus)bus.nodes.forEach(n=>n.disconnect());sampleBuses.delete(ctx);}
function sampleVoice(ctx,midi,when,duration,volume,kind='clean',track=true,event=null){
 const bank=kind==='bass'?'bass':kind==='lead'?'lead':'clean',map=sampleBuffers[bank];if(!map.size)throw Error('Guitar samples are not ready.');
 const variant=chooseSample(bank==='bass'?'bass':'guitar',midi,event?.velocity||(kind==='lead'?110:kind==='muted'?55:volume>.16?110:55)),sourceMidi=variant?variant.key:[...map.keys()].reduce((best,n)=>Math.abs(n-midi)<Math.abs(best-midi)?n:best),buffer=variant?variant.buffer:map.get(sourceMidi),src=ctx.createBufferSource(),amp=ctx.createGain(),high=ctx.createBiquadFilter(),cab=ctx.createBiquadFilter(),mid=ctx.createBiquadFilter();
 src.buffer=buffer;src.loop=!variant&&buffer.duration>1.45;src.loopStart=.6;src.loopEnd=Math.min(1.45,buffer.duration);const base=2**((midi-sourceMidi)/12);
 if(event&&(event.bend||event.v||event.slideFrom!==undefined)){const curve=new Float32Array(192);for(let i=0;i<curve.length;i++){const t=i/(curve.length-1);let bend=event.bend?Math.min(1,t/(event.bendTime||.28))*event.bend:0;if(event.slideFrom!==undefined)bend+=(event.slideFrom-event.f)*Math.max(0,1-t/.35);if(event.release&&t>.65)bend=event.bend*Math.max(0,(1-t)/.35);const vibrato=event.v&&t>.4?(event.vDepth||.17)*Math.sin((t-.4)*duration*2*Math.PI*(event.vRate||5.2)):0;curve[i]=base*2**((bend+vibrato)/12);}src.playbackRate.setValueCurveAtTime(curve,when,duration);}else src.playbackRate.setValueAtTime(base,when);
 high.type='highpass';high.frequency.value=kind==='bass'?35:95;cab.type='lowpass';cab.frequency.value=kind==='bass'?1800:kind==='clean'?6500:kind==='muted'?1600:4200;cab.Q.value=.7;
 mid.type='peaking';mid.frequency.value=850;mid.Q.value=.8;mid.gain.value=kind==='lead'?2.5:kind==='warm'?1.5:0;
 const attack=event?.legato?.018:.006,life=Math.max(.06,duration),release=Math.min(.08,life*.2);amp.gain.setValueAtTime(.0001,when);amp.gain.exponentialRampToValueAtTime(Math.max(.001,volume),when+attack);amp.gain.linearRampToValueAtTime(Math.max(.001,volume*.8),when+life-release);amp.gain.exponentialRampToValueAtTime(.0001,when+life);
 src.connect(high);high.connect(mid);mid.connect(cab);
 let drive=null;if(kind==='warm'||kind==='lead'){drive=ctx.createWaveShaper();const curve=new Float32Array(1024);for(let i=0;i<curve.length;i++)curve[i]=Math.tanh((i/511.5-1)*(kind==='lead'?4.2:2.2))/Math.tanh(kind==='lead'?4.2:2.2);drive.curve=curve;drive.oversample='2x';cab.connect(drive);drive.connect(amp);}else cab.connect(amp);
 const bus=sampleBus(ctx);amp.connect(bus.input);if(event)amp.connect(bus.delay);
 src.start(when,event?.legato?.03:0);src.stop(when+life+.015);
 if(track)keepSource(src,amp,high,mid,cab,...(drive?[drive]:[]));
 if(variant&&bank!=='bass'&&life>.12){const releaseSample=chooseSample('guitar',midi,90,'release');if(releaseSample){const tail=ctx.createBufferSource(),g=ctx.createGain();tail.buffer=releaseSample.buffer;tail.playbackRate.value=2**((midi-releaseSample.key)/12);g.gain.value=volume*.12;tail.connect(g);g.connect(bus.input);tail.start(when+life);if(track)keepSource(tail,g);}}
 return src;
}
