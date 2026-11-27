'use strict';
// Checks the shared sound kit (site/sound-kit.js) with a recording fake AudioContext. Nothing is played.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');

// A fake audio context that records every node and every scheduled value.
function fakeContext(){
 const log=[];
 const param=(node,name)=>({value:0,set value(v){this._v=v;log.push({node,name,v});},get value(){return this._v;},
  setValueAtTime(v,t){log.push({node,name,v,t});},linearRampToValueAtTime(v,t){log.push({node,name,v,t});},exponentialRampToValueAtTime(v,t){log.push({node,name,v,t});},setTargetAtTime(v,t){log.push({node,name,v,t});}});
 const node=kind=>{const n={kind,connect(){},disconnect(){},start(t){n.started=t;},stop(t){n.stopped=t;}};log.push({node:n,made:kind});return n;};
 return {log,currentTime:0,sampleRate:44100,destination:{},
  createOscillator(){const n=node('osc');n.frequency=param(n,'frequency');return n;},
  createGain(){const n=node('gain');n.gain=param(n,'gain');return n;},
  createBiquadFilter(){const n=node('filter');n.frequency=param(n,'frequency');n.Q=param(n,'Q');return n;},
  createBufferSource(){const n=node('source');n.playbackRate=param(n,'playbackRate');return n;},
  createBuffer(ch,len){const data=new Float32Array(len);return {length:len,getChannelData:()=>data};}};
}
function studio(){
 const el=()=>({innerHTML:'',textContent:'',dataset:{},classList:{remove(){},toggle(){},add(){}},setAttribute(){},removeAttribute(){}});
 const context={console,Math,Date,JSON,Promise,Float32Array,Uint8Array,Map,Set,WeakMap,URL,Blob,
  window:{addEventListener(){},scrollTo(){}},document:{hidden:false,body:el(),getElementById:el,querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}},
  location:{hash:''},history:{replaceState(){},pushState(){}},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:()=>0,cancelAnimationFrame(){}};
 const c=vm.createContext(context);
 for(const f of ['sampled-audio','sound-kit','backing','licks','rhythm-library','rhythm','releases','chords','listen','path','metronome','navigation','app'])vm.runInContext(fs.readFileSync(`site/${f}.js`,'utf8'),c,{filename:f});
 const raw=code=>vm.runInContext(code,c);
 raw(`var sampleCalls=[];sampledDrum=(ctx,type,when,volume)=>{sampleCalls.push({kind:'drum',type,when,volume});};
  sampleVoice=(ctx,midi,when,duration,volume)=>{sampleCalls.push({kind:'guitar',midi,when,duration,volume});return {};};`);
 return {raw,run:code=>{const v=raw(code);return v&&typeof v==='object'?JSON.parse(JSON.stringify(v)):v;},c};
}
const tests=[];const test=(name,fn)=>tests.push([name,fn]);
const s=studio();
const play=(id,accent='medium')=>{const ctx=fakeContext();s.c.__ctx=ctx;s.raw(`sampleCalls=[];playKitSound(__ctx,'${id}',1,{accent:'${accent}',duration:.3})`);return {ctx,samples:s.run('sampleCalls')};};
const peak=ctx=>Math.max(0,...ctx.log.filter(e=>e.name==='gain'&&typeof e.v==='number').map(e=>e.v));
const topFreq=ctx=>Math.max(0,...ctx.log.filter(e=>e.name==='frequency'&&e.node.kind==='osc').map(e=>e.v));

test('the kit lists every sound once',()=>{
 const ids=s.run('SOUND_KIT.map(k=>k.id)');
 assert.deepEqual(ids,['woodblock','clave','cowbell','rim','beep','snare','hihat','kick','guitar','off']);
 for(const id of s.run('RHYTHM_SOUND_IDS').concat(s.run('CLICK_SOUND_IDS')))assert.ok(ids.includes(id),id);
 assert.deepEqual(s.run('RHYTHM_SOUND_IDS'),['woodblock','clave','cowbell','rim','snare','hihat','guitar','off']);
 assert.deepEqual(s.run('CLICK_SOUND_IDS'),['beep','woodblock','rim','cowbell','hihat','kick','off']);
 for(const k of s.run('SOUND_KIT'))assert.ok(k.name,`${k.id} has a name`);
});
test('made-in-code sounds play without any samples',()=>{
 for(const id of ['woodblock','clave','cowbell','rim','beep']){
  const {ctx,samples}=play(id);
  assert.equal(samples.length,0,`${id} uses no samples`);
  const started=ctx.log.filter(e=>e.made&&(e.node.kind==='osc'||e.node.kind==='source'));
  assert.ok(started.length>=1&&started.every(e=>e.node.started===1&&e.node.stopped>1&&e.node.stopped<1.6),`${id} starts on time and stops soon after`);
  assert.ok(peak(ctx)>0&&peak(ctx)<=1,`${id} has a sensible level`);
 }
});
test('accents: strong is louder and higher than weak',()=>{
 for(const id of ['woodblock','clave','cowbell','rim','beep']){
  const strong=play(id,'strong').ctx,weak=play(id,'weak').ctx;
  assert.ok(peak(strong)>peak(weak),`${id} strong is louder`);
  assert.ok(topFreq(strong)>topFreq(weak),`${id} strong is higher`);
 }
});
test('sampled sounds use the drum and guitar samples',()=>{
 assert.deepEqual(play('snare').samples.map(x=>[x.kind,x.type]),[['drum','snare']]);
 assert.deepEqual(play('hihat').samples.map(x=>[x.kind,x.type]),[['drum','hat']]);
 assert.deepEqual(play('kick').samples.map(x=>[x.kind,x.type]),[['drum','kick']]);
 const g=play('guitar').samples;assert.equal(g.length,1);assert.equal(g[0].midi,69);assert.ok(Math.abs(g[0].duration-.3)<1e-9);
 assert.ok(play('snare','strong').samples[0].volume>play('snare','weak').samples[0].volume,'drum accents are louder');
});
test('off plays nothing',()=>{const {ctx,samples}=play('off');assert.equal(samples.length,0);assert.equal(ctx.log.filter(e=>e.made).length,0);});
test('instruments to load',()=>{
 assert.deepEqual(s.run(`kitInstruments(['woodblock','beep','off'])`),[]);
 assert.deepEqual(s.run(`kitInstruments(['guitar','beep'])`),['guitar']);
 assert.deepEqual(s.run(`kitInstruments(['snare','hihat','guitar'])`),['guitar','drums']);
});
test('an unknown id falls back to the beep',()=>{const {ctx}=play('nonsense');assert.ok(ctx.log.some(e=>e.made==='osc'));});

(async()=>{for(const[name,fn]of tests){try{await fn();}catch(error){console.error(`✗ ${name}`);throw error;}}console.log(`sound-kit: ok (${tests.length} checks)`);})().catch(error=>{console.error(error);process.exit(1);});
