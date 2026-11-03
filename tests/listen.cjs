const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
// Load the listening module on its own, with just enough of a browser around it.
const c=vm.createContext({Math,Float32Array,window:{addEventListener(){}},document:{addEventListener(){},getElementById(){return null}},intro:()=>'<section class="intro"></section>'});
vm.runInContext(fs.readFileSync('site/listen.js','utf8'),c,{filename:'listen'});
const run=code=>vm.runInContext(code,c),mod=n=>(n%12+12)%12;
const targets=JSON.parse(run('JSON.stringify(LISTEN_TARGETS)')),detect=(buf,sr)=>run('detectPitch')(buf,sr),judgeFor=(pc,opts)=>run('createListenJudge')(pc,opts);

// Every position shown for A, C and E really is that note.
const OPEN=[40,45,50,55,59,64];
assert.deepEqual(targets.map(t=>t.name),['A','C','E']);
for(const t of targets)for(const s of t.spots){assert.equal(mod(OPEN[s.string]+s.fret),t.pc,`${t.name} at string ${s.string} fret ${s.fret}`);assert.ok(s.fret>=0&&s.fret<=9);}

// Synthetic plucked notes: harmonics, decay, a little noise. Seeded so the test is repeatable.
let seed=1;const rand=()=>(seed=(seed*16807)%2147483647)/2147483647;
function pluck(midi,sr,{harmonics=[1,.6,.4,.25,.15,.1],noise=.01,amp=.3,start=.05}={}){
 const hz=440*2**((midi-69)/12),n=2048,buf=new Float32Array(n),phases=harmonics.map(()=>rand()*Math.PI*2);
 for(let i=0;i<n;i++){const t=start+i/sr;let v=0;harmonics.forEach((h,k)=>{v+=h*Math.sin(2*Math.PI*hz*(k+1)*t+phases[k])*Math.exp(-t*(1.5+k))});buf[i]=amp*v/harmonics.length*2+noise*(rand()*2-1);}
 return buf;
}
// Every note from low E (open 6th string) to the 12th fret of high E, at both common sample rates.
for(const sr of [44100,48000])for(let midi=40;midi<=76;midi++){
 const f=detect(pluck(midi,sr),sr);
 assert.equal(f.kind,'note',`midi ${midi} at ${sr} Hz was ${f.kind}`);
 assert.equal(Math.round(f.midi),midi,`midi ${midi} at ${sr} Hz heard as ${f.midi.toFixed(2)}`);
 assert.ok(Math.abs(f.cents)<=5,`midi ${midi} at ${sr} Hz is ${f.cents} cents out`);
}
// Small phone mics lose bass: a weak fundamental must still give the right note name.
for(const midi of [40,45,48,52]){const f=detect(pluck(midi,48000,{harmonics:[.2,1,.6,.3,.15]}),48000);assert.equal(f.kind,'note');assert.equal(f.pc,mod(midi),`weak fundamental at midi ${midi}`);}
// A guitar that is 30 cents sharp is still the right note, and the readout says so.
{const f=detect(pluck(45.3,48000),48000);assert.equal(f.pc,9);assert.ok(f.cents>=25&&f.cents<=35,`expected about +30 cents, got ${f.cents}`);}
// Silence is "quiet", and noise is "unclear", never a note.
assert.equal(detect(new Float32Array(2048),48000).kind,'quiet');
{const noise=new Float32Array(2048).map(()=>.3*(rand()*2-1));assert.equal(detect(noise,48000).kind,'unclear');}
// Two different notes at once (a chord) is not reported as one confident wrong note.
{const a=pluck(45,48000),cs=pluck(49,48000),both=a.map((v,i)=>v+cs[i]);const f=detect(both,48000);assert.ok(f.kind!=='note'||[9,1].includes(f.pc),`chord heard as ${f.pc}`);}

// The judge: frames every 40 ms, like the app.
const note=pc=>({kind:'note',pc}),quiet={kind:'quiet'},unclear={kind:'unclear'};
function feed(judge,frames,start=0){let last;frames.forEach((f,i)=>{last=judge(f,start+i*40)});return last;}
const repeat=(f,n)=>Array(n).fill(f);
// Holding the right note for about a quarter of a second is a match; a short blip is not.
assert.equal(feed(judgeFor(9),repeat(note(9),4)).result,'hearing');
assert.equal(feed(judgeFor(9),repeat(note(9),8)).result,'match');
// A different note, held clearly, is a miss and says what was heard.
{const r=feed(judgeFor(9),repeat(note(0),17));assert.equal(r.result,'miss');assert.equal(r.pc,0);}
// A quick wrong note on the way to the right one is not a miss.
assert.equal(feed(judgeFor(9),[...repeat(note(8),5),...repeat(note(9),8)]).result,'match');
// Sound with no clear pitch is reported as unclear, and never as a miss.
{const j=judgeFor(9),results=repeat(unclear,40).map((f,i)=>j(f,i*40).result);assert.ok(!results.includes('miss'));assert.equal(results.at(-1),'unclear');}
// One unclear frame inside a held note does not restart the note.
assert.equal(feed(judgeFor(9),[...repeat(note(9),4),unclear,...repeat(note(9),3)]).result,'match');
// Silence means waiting.
assert.equal(feed(judgeFor(9),repeat(quiet,10)).result,'waiting');
// The last note ringing on does not count against the next target...
{const j=judgeFor(0,{ignorePc:9});const results=repeat(note(9),40).map((f,i)=>j(f,i*40).result);assert.ok(results.every(r=>r==='waiting'));
// ...but once the player stops and plays it again, it does.
 feed(j,[quiet],2000);assert.equal(feed(j,repeat(note(9),17),2100).result,'miss');}

// The page shows the target note, its position and the controls.
{const html=run('listenView()'),t=targets[run('listen.target')],s=t.spots[run('listen.spot')];
 assert.match(html,new RegExp(`id="listen-target">${t.name}<`));assert.match(html,/id="listen-toggle"/);assert.match(html,/id="listen-hear"/);assert.match(html,/class="listen-board"/);
 assert.ok(html.includes(run(`listenSpotText(${JSON.stringify(s)})`)));assert.match(html,/not recorded or uploaded/);}
// A new target is never the same note twice in a row.
for(let i=0;i<30;i++){const before=targets[run('listen.target')].pc;run(`listenPick(${before})`);assert.notEqual(targets[run('listen.target')].pc,before);}
console.log('Listening checks passed: 74 pitch tests, judge rules and the practice page.');

// Exercise the real startup/stop code with controllable permission and audio APIs.
// No hardware or browser permission prompt is available in Node.
const {test}=require('node:test');
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject};}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function microphone(){const tracks=[{readyState:'live',stop(){this.readyState='ended'}}];return {getTracks:()=>tracks};}
function listeningBrowser(){
 const requests=[],contexts=[],frames=new Set(),events={},elements=new Map();
 const faults={constructor:false,resume:false,graph:false,close:false};
 let frameId=0;
 class AudioContext{
  constructor(){if(faults.constructor)throw new Error('Context unavailable');this.state='suspended';this.resumed=deferred();this.sampleRate=48000;contexts.push(this);}
  resume(){if(faults.resume)throw new Error('Resume failed');return this.resumed.promise;}
  close(){this.state='closed';return faults.close?Promise.reject(new Error('Close failed')):Promise.resolve();}
  createAnalyser(){if(faults.graph)throw new Error('Graph failed');return {fftSize:2048,getFloatTimeDomainData(buf){buf.fill(0)}};}
  createMediaStreamSource(){return {connect(){}};}
 }
 const document={hidden:false,addEventListener(name,fn){events[name]=fn},getElementById(id){if(!elements.has(id))elements.set(id,{textContent:'',style:{}});return elements.get(id)}};
 const context=vm.createContext({window:{isSecureContext:true,AudioContext,addEventListener(name,fn){events[name]=fn}},document,
  navigator:{mediaDevices:{getUserMedia(){const request=deferred();requests.push(request);return request.promise}}},
  state:{view:'listen'},intro:()=>'',performance:{now:()=>100},
  requestAnimationFrame(){frames.add(++frameId);return frameId},cancelAnimationFrame(id){frames.delete(id)}});
 vm.runInContext(fs.readFileSync('site/listen.js','utf8'),context);
 const run=code=>vm.runInContext(code,context);
 return {run,requests,contexts,frames,events,document,faults,start:()=>run('startListening()'),stop:()=>run('stopListening()'),
  grant(i,stream=microphone()){contexts[i].resumed.resolve();requests[i].resolve(stream);return stream;},
  text:id=>document.getElementById(id).textContent};
}
const isStopped=stream=>stream.getTracks().every(track=>track.readyState==='ended');

test('successful listening stops tracks, context and animation on Stop',async()=>{
 const b=listeningBrowser(),started=b.start(),stream=b.grant(0);await started;
 assert.equal(b.run('listen.active'),true);assert.equal(b.frames.size,1);assert.equal(isStopped(stream),false);
 b.stop();assert.equal(isStopped(stream),true);assert.equal(b.contexts[0].state,'closed');assert.equal(b.frames.size,0);
 assert.equal(b.run('listen.active || listen.starting'),false);assert.match(b.text('listen-toggle'),/Start listening/);
});

test('pending permission offers Cancel and Stop closes its context immediately',async()=>{
 const b=listeningBrowser(),started=b.start();
 assert.match(b.text('listen-toggle'),/Cancel/);assert.match(b.run('listenView()'),/>[^<]*Cancel[^<]*<\/button>/);
 b.stop();assert.equal(b.contexts[0].state,'closed');assert.match(b.text('listen-message'),/Stopped/);
 const stream=b.grant(0);await started;
 assert.equal(isStopped(stream),true);assert.equal(b.run('listen.active'),false);assert.equal(b.frames.size,0);
});

for(const order of ['old-first','new-first'])test(`cancelled request cannot replace the new listener (${order})`,async()=>{
 const b=listeningBrowser(),old=b.start();b.stop();const current=b.start();let stale,live;
 if(order==='old-first'){
  stale=b.grant(0);await old;assert.equal(b.run('listen.active'),false);assert.equal(b.run('listen.starting'),true);
  live=b.grant(1);await current;
 }else{live=b.grant(1);await current;stale=b.grant(0);await old;}
 assert.equal(isStopped(stale),true);assert.equal(isStopped(live),false);assert.equal(b.run('listen.active'),true);
 assert.equal(b.frames.size,1);b.stop();assert.equal(isStopped(live),true);assert.equal(b.frames.size,0);
});

for(const active of [false,true])test(`old permission rejection leaves the newer ${active?'active':'pending'} attempt alone`,async()=>{
 const b=listeningBrowser(),old=b.start();b.stop();const current=b.start();let stream;
 if(active){stream=b.grant(1);await current;}
 const message=b.text('listen-message');b.requests[0].reject({name:'NotAllowedError'});await old;
 assert.equal(b.text('listen-message'),message);assert.equal(b.run('listen.starting'),!active);assert.equal(b.run('listen.active'),active);
 if(!active){stream=b.grant(1);await current;}
 assert.equal(isStopped(stream),false);b.stop();assert.equal(isStopped(stream),true);
});

test('Stop releases granted tracks while audio resume is still pending',async()=>{
 const b=listeningBrowser(),started=b.start(),stream=microphone();b.requests[0].resolve(stream);await flush();
 b.stop();assert.equal(isStopped(stream),true);assert.equal(b.contexts[0].state,'closed');
 b.contexts[0].resumed.resolve();await started;assert.equal(b.run('listen.active'),false);
});

test('late permission releases tracks without waiting for a cancelled audio resume',async()=>{
 const b=listeningBrowser(),started=b.start();b.stop();const stream=microphone();b.requests[0].resolve(stream);await flush();
 assert.equal(isStopped(stream),true);assert.equal(b.run('listen.active'),false);
 b.contexts[0].resumed.resolve();await started;
});

for(const granted of [false,true])test(`resume rejection cleans up with permission ${granted?'granted':'pending'}`,async()=>{
 const b=listeningBrowser(),started=b.start(),stream=microphone();
 if(granted){b.requests[0].resolve(stream);await flush();}
 b.contexts[0].resumed.reject(new Error('Resume failed'));await flush();
 assert.equal(b.run('listen.starting'),false);assert.equal(b.contexts[0].state,'closed');
 if(!granted){b.requests[0].resolve(stream);await flush();}
 await started;assert.equal(isStopped(stream),true);assert.equal(b.run('listen.active'),false);
});

for(const fault of ['constructor','resume','graph'])test(`${fault} failure releases resources and permits retry`,async()=>{
 const b=listeningBrowser();b.faults[fault]=true;const failed=b.start();let stream;
 if(fault==='graph')stream=b.grant(0);
 await failed;assert.equal(b.run('listen.starting || listen.active'),false);
 assert.match(b.text('listen-message'),/could not start/);assert.match(b.text('listen-toggle'),/Start listening/);
 assert.ok(b.contexts.every(ctx=>ctx.state==='closed'));if(stream)assert.equal(isStopped(stream),true);
 b.faults[fault]=false;const next=b.contexts.length,started=b.start();
 b.contexts[next].resumed.resolve();const live=microphone();b.requests.at(-1).resolve(live);await started;
 assert.equal(b.run('listen.active'),true);b.stop();assert.equal(isStopped(live),true);
});

for(const [name,message] of [['NotAllowedError',/blocked/],['NotFoundError',/No microphone/]])test(`${name} reports a useful message and allows retry`,async()=>{
 const b=listeningBrowser(),failed=b.start();b.contexts[0].resumed.resolve();b.requests[0].reject({name});await failed;
 assert.match(b.text('listen-message'),message);assert.equal(b.run('listen.starting'),false);assert.equal(b.contexts[0].state,'closed');
 const retry=b.start(),stream=b.grant(1);await retry;assert.equal(b.run('listen.active'),true);b.stop();assert.equal(isStopped(stream),true);
});

for(const event of ['pagehide','visibilitychange'])for(const active of [false,true])test(`${event} cancels ${active?'active':'pending'} listening`,async()=>{
 const b=listeningBrowser(),started=b.start();let stream;
 if(active){stream=b.grant(0);await started;}
 b.document.hidden=true;b.events[event]();
 assert.equal(b.contexts[0].state,'closed');assert.equal(b.run('listen.active || listen.starting'),false);
 if(!active){stream=b.grant(0);await started;}
 assert.equal(isStopped(stream),true);assert.equal(b.frames.size,0);
});

test('leaving the listening page before permission completes releases resources',async()=>{
 const b=listeningBrowser(),started=b.start();b.run("state.view='home'");const stream=b.grant(0);await started;
 assert.equal(isStopped(stream),true);assert.equal(b.run('listen.active || listen.starting'),false);assert.equal(b.frames.size,0);
});

test('repeated Start taps share one attempt and cleanup tolerates close rejection',async()=>{
 const b=listeningBrowser(),started=b.start();await b.start();assert.equal(b.requests.length,1);
 const stream=b.grant(0);await started;await b.start();assert.equal(b.requests.length,1);
 b.faults.close=true;b.stop();await flush();assert.equal(isStopped(stream),true);assert.equal(b.frames.size,0);
});
