'use strict';
// Rhythm library: rhythm patterns in common time signatures and styles, for the Rhythm page trainer.
// Phase 1a: 2/4, 3/4, 4/4, 6/8 and 12/8. Irregular signatures (9/8, 5/4, 7/8) come later.
//
// Every pattern is written on a grid. A "click" is one metronome click: a quarter note in x/4,
// an eighth note in x/8 (BPM counts every click, as in the metronome). steps = grid steps per
// click: 4 for straight sixteenths in x/4, 3 for a swung (triplet) feel, 2 for sixteenths in x/8.
// hits: {step, len, accent?} in grid steps. Gaps between hits are rests.
// These patterns will later be strummed (down on the beat, up off the beat), so keep them clean.

// groups: how clicks are grouped. Matches METRONOME_METERS in metronome.js for the same ids.
const RHYTHM_METERS=[
 {id:'2/4',clickDen:4,groups:[2],hint:'Two beats in a bar. Count “1, 2”.'},
 {id:'3/4',clickDen:4,groups:[3],hint:'Three beats in a bar. Count “1, 2, 3”, with beat 1 the strongest.'},
 {id:'4/4',clickDen:4,groups:[4],hint:'Four beats in a bar. Count “1, 2, 3, 4”.'},
 {id:'6/8',clickDen:8,groups:[3,3],hint:'Six quick clicks in two groups of three. It feels like two slow beats: ONE two three FOUR five six.'},
 {id:'12/8',clickDen:8,groups:[3,3,3,3],hint:'Twelve quick clicks in four groups of three. It feels like four slow beats, each split in three.'}
];
const RHYTHM_TIME_FILTERS=['all',...RHYTHM_METERS.map(m=>m.id)];
function rhythmMeter(id){return RHYTHM_METERS.find(m=>m.id===id)||RHYTHM_METERS.find(m=>m.id==='4/4');}
function meterAccents(id){
 const out=[];rhythmMeter(id).groups.forEach((size,g)=>{for(let i=0;i<size;i++)out.push(i>0?'weak':g===0?'strong':'medium');});
 return out;
}

// Adds clicks (per bar) and events: {b, d, rest?, accent?} in clicks, covering the whole bar.
// Rests fill the gaps and are split at click boundaries, so each one can be drawn.
function makeRhythm(def){
 const clicks=rhythmMeter(def.meter).groups.reduce((a,b)=>a+b,0),bar=clicks*def.steps,events=[];
 const rest=(from,to)=>{while(from<to){const end=Math.min(to,(Math.floor(from/def.steps)+1)*def.steps);events.push({b:from/def.steps,d:(end-from)/def.steps,rest:true});from=end;}};
 let at=0;
 for(const h of def.hits){rest(at,h.step);events.push({b:h.step/def.steps,d:h.len/def.steps,...(h.accent?{accent:true}:{})});at=h.step+h.len;}
 rest(at,bar);
 return {...def,clicks,events};
}

// The written note value for a length in grid steps, or null if it has no single symbol.
// Swung patterns are written as straight eighths and quarters.
const NOTE_VALUES=[[1,1,false],[.75,2,true],[.5,2,false],[.375,4,true],[.25,4,false],[.1875,8,true],[.125,8,false],[.0625,16,false]];
function noteValue(pattern,lenSteps){
 if(pattern.swing){if(lenSteps%3===0){const q=lenSteps/3;return q===1?{den:4,dotted:false}:q===2?{den:2,dotted:false}:q===4?{den:1,dotted:false}:null;}return lenSteps<3?{den:8,dotted:false}:null;}
 const whole=lenSteps/(pattern.steps*rhythmMeter(pattern.meter).clickDen),hit=NOTE_VALUES.find(([w])=>Math.abs(w-whole)<1e-9);
 return hit?{den:hit[1],dotted:hit[2]}:null;
}
const COUNT_SYLLABLES={4:['e','&','a'],3:['trip','let'],2:['&'],1:[]};
function rhythmCounts(pattern){
 const out=[];for(let c=0;c<pattern.clicks;c++)out.push(String(c+1),...COUNT_SYLLABLES[pattern.steps]);
 return out;
}

const even=(from,to,every,len,accents=[])=>{const out=[];for(let s=from;s<to;s+=every)out.push({step:s,len,...(accents.includes(s)?{accent:true}:{})});return out;};
const RHYTHM_PATTERNS=[
 // The first five keep their names and order: Practice path steps open them by index.
 {id:'quarter-notes',name:'Quarter notes',meter:'4/4',style:'Basics',level:1,bpm:70,steps:4,hits:even(0,16,4,4),
  hint:'Pick once on each numbered beat. Count “1, 2, 3, 4”.',about:'The steady pulse under almost every song.'},
 {id:'eighth-notes',name:'Eighth notes',meter:'4/4',style:'Basics',level:1,bpm:70,steps:4,hits:even(0,16,2,2),
  hint:'Pick on the numbers and the “ands”. Keep both halves of each beat equal.',about:'Two equal notes in each beat: the engine of rock and pop.'},
 {id:'long-and-short',name:'Long and short',meter:'4/4',style:'Basics',level:1,bpm:70,steps:4,hits:[{step:0,len:4},{step:4,len:2},{step:6,len:2},{step:8,len:8}],
  hint:'Quarter, two eighths, half note. Attack on 1, 2, the & of 2, and 3. Hold the last note through 4.',about:'Mixing note lengths in one bar.'},
 {id:'leave-a-space',name:'Leave a space',meter:'4/4',style:'Basics',level:1,bpm:70,steps:4,hits:[{step:0,len:4},{step:8,len:2},{step:10,len:2},{step:12,len:4}],
  hint:'Play 1, stay silent on 2, play 3 & 4. Keep counting through the rest.',about:'Silence has a length too.'},
 {id:'sixteenth-notes',name:'Sixteenth notes',meter:'4/4',style:'Basics',level:1,bpm:70,steps:4,hits:even(0,16,1,1),
  hint:'Four notes inside each beat: “1 e & a”. Begin at 50–60 BPM.',about:'Four equal notes per beat: the base of funk and fast picking.'},

 // 4/4 styles
 {id:'rock-eighths',name:'4/4 rock eighths',meter:'4/4',style:'Rock',level:2,bpm:100,steps:4,hits:even(0,16,2,2,[4,12]),
  hint:'Steady eighths. Lean on beats 2 and 4, where the snare drum would hit.',about:'Driving rock and punk rhythm guitar.'},
 {id:'pop-push',name:'4/4 pop push',meter:'4/4',style:'Pop',level:2,bpm:96,steps:4,hits:[{step:0,len:4},{step:4,len:2},{step:6,len:6,accent:true},{step:12,len:4}],
  hint:'Play the & of 2 a little early and hold it over beat 3: the “push”. Keep counting 3 in your head.',about:'Pop and rock songs push chords ahead of the beat to add energy.'},
 {id:'power-ballad',name:'4/4 power ballad',meter:'4/4',style:'Power ballad',level:2,bpm:72,steps:4,hits:[...even(0,8,2,2,[4]),{step:8,len:8,accent:true}],
  hint:'Four steady eighths, then let a big chord ring for beats 3 and 4.',about:'Slow rock ballads build up with driving eighths and big held chords.'},
 {id:'tresillo',name:'4/4 tresillo (3+3+2)',meter:'4/4',style:'Latin / pop',level:2,bpm:96,steps:4,hits:[{step:0,len:6,accent:true},{step:6,len:6,accent:true},{step:12,len:4,accent:true}],
  hint:'Count eight quick “ands”: 1 2 3, 1 2 3, 1 2. Play on each “1”.',about:'From Afro-Cuban music; now in reggaeton, pop and rock’n’roll.'},
 {id:'reggae-skank',name:'4/4 reggae skank (old style)',meter:'4/4',style:'Reggae',level:2,bpm:76,steps:4,staccato:true,hits:even(2,16,4,2),
  hint:'Stay silent on every number. Play short, choppy notes on each “&”.',about:'Ska and roots reggae guitar: the “skank” on the off-beat.'},
 {id:'funk-16ths',name:'4/4 funk 16ths',meter:'4/4',style:'Funk',level:3,bpm:90,steps:4,staccato:true,hits:[{step:0,len:1,accent:true},{step:3,len:1},{step:6,len:1,accent:true},{step:8,len:1},{step:10,len:1,accent:true},{step:11,len:1},{step:14,len:1}],
  hint:'Count “1 e & a” all the way through. Short, tight notes; the gaps make the groove.',about:'Funk guitar: short sixteenth-note stabs around the beat.'},
 {id:'blues-shuffle',name:'4/4 blues shuffle',meter:'4/4',style:'Blues',level:2,bpm:96,steps:3,swing:true,hits:[0,1,2,3].flatMap(b=>[{step:b*3,len:2,...(b%2?{accent:true}:{})},{step:b*3+2,len:1}]),
  hint:'Long-short, long-short. Split each beat in three: play on “1” and “let”.',about:'Written as eighths but swung: the heartbeat of blues and boogie.'},

 // 3/4
 {id:'waltz',name:'3/4 waltz',meter:'3/4',style:'Waltz',level:2,bpm:90,steps:4,hits:even(0,12,4,4,[0]),
  hint:'“Oom-pah-pah”: a strong beat 1, then two lighter beats.',about:'Waltzes, folk ballads and many country songs.'},
 {id:'country-waltz',name:'3/4 country waltz',meter:'3/4',style:'Country',level:2,bpm:100,steps:4,hits:[{step:0,len:4,accent:true},...even(4,12,2,2)],
  hint:'A long note on 1, then eighths on “2 & 3 &”.',about:'Country and folk waltzes fill beats 2 and 3.'},
 {id:'folk-3',name:'3/4 folk lilt',meter:'3/4',style:'Folk',level:2,bpm:84,steps:4,hits:[{step:0,len:6,accent:true},{step:6,len:2},{step:8,len:4}],
  hint:'Long on 1, short on the & of 2, then beat 3.',about:'A gentle lilt heard in folk songs and lullabies.'},

 // 2/4
 {id:'polka',name:'2/4 polka',meter:'2/4',style:'Polka',level:2,bpm:100,steps:4,hits:even(0,8,2,2,[2,6]),
  hint:'“Oom-pa, oom-pa”: lean on each “&”.',about:'Polkas and fast folk dances.'},
 {id:'march',name:'2/4 march',meter:'2/4',style:'March',level:2,bpm:104,steps:4,hits:[{step:0,len:4,accent:true},{step:4,len:2},{step:6,len:2}],
  hint:'Left, right-and. One long step, then two quick ones.',about:'Marches and brass-band music.'},

 // 6/8
 {id:'ballad-6-8',name:'6/8 ballad',meter:'6/8',style:'Ballad',level:2,bpm:150,steps:2,hits:even(0,12,2,2,[0,6]),
  hint:'Six even notes. Feel two big beats: ONE two three FOUR five six.',about:'Slow soul and rock ballads, such as many 1950s and 60s slow dances.'},
 {id:'jig',name:'6/8 jig',meter:'6/8',style:'Celtic',level:2,bpm:210,steps:2,hits:[{step:0,len:4,accent:true},{step:4,len:2},{step:6,len:4,accent:true},{step:10,len:2}],
  hint:'Long-short, long-short: “ONE three FOUR six”.',about:'Irish and Scottish jigs bounce in two beats of three.'},

 // 12/8
 {id:'slow-blues-12-8',name:'12/8 slow blues',meter:'12/8',style:'Blues',level:2,bpm:150,steps:2,hits:even(0,24,2,2,[6,18]),
  hint:'Twelve even notes, in four groups of three. Lean on the 2nd and 4th group.',about:'Slow blues and soul ballads.'},
 {id:'long-short-12-8',name:'12/8 long-short',meter:'12/8',style:'Blues',level:2,bpm:150,steps:2,hits:[0,6,12,18].flatMap(s=>[{step:s,len:4,...(s===6||s===18?{accent:true}:{})},{step:s+4,len:2}]),
  hint:'Long-short in every group of three.',about:'This is the blues shuffle written in 12/8: the same long-short feel, counted another way.'}
].map(makeRhythm);
