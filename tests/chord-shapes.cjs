const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const c=vm.createContext({});
vm.runInContext(fs.readFileSync('site/chords.js','utf8'),c,{filename:'chords'});
const run=code=>vm.runInContext(code,c),mod=n=>(n%12+12)%12;
const OPEN=[40,45,50,55,59,64],FORMULAS={'':[0,4,7],m:[0,3,7],'7':[0,4,7,10],m7:[0,3,7,10],maj7:[0,4,7,11],dim:[0,3,6]};
// Every root and quality used by the app must have a correct, playable shape.
for(let root=0;root<12;root++)for(const [q,formula] of Object.entries(FORMULAS)){
 const s=JSON.parse(run(`JSON.stringify(chordShape(${root},'${q}'))`)),label=`root ${root} ${q||'major'}`;
 assert.equal(s.frets.length,6,label);assert.equal(s.fingers.length,6,label);
 const played=s.frets.map((f,i)=>f<0?null:OPEN[i]+f).filter(x=>x!==null);
 const pcs=new Set(played.map(mod)),allowed=formula.map(x=>mod(root+x));
 // Guitar seventh chords may drop the perfect fifth; every other chord note is required.
 const required=formula.filter(x=>!(formula.length===4&&x===7)).map(x=>mod(root+x));
 assert.ok(played.length>=3,`${label}: too few strings`);
 assert.ok([...pcs].every(pc=>allowed.includes(pc)),`${label}: note outside the chord ${s.frets}`);
 assert.ok(required.every(pc=>pcs.has(pc)),`${label}: missing a chord note ${s.frets}`);
 assert.equal(mod(Math.min(...played)),root,`${label}: lowest note is not the root`);
 const fretted=s.frets.filter(f=>f>0);
 assert.ok(Math.max(...fretted)-Math.min(...fretted)<=3,`${label}: stretch wider than 4 frets`);
 s.frets.forEach((f,i)=>{
  if(f>0)assert.ok(s.fingers[i]>=1&&s.fingers[i]<=4,`${label}: string ${i} has no finger`);
  else assert.equal(s.fingers[i],0,`${label}: open or muted string ${i} has a finger`);
 });
 if(s.barre){
  assert.equal(s.fingers[s.barre.from],1,`${label}: barre must start with finger 1`);
  for(let i=s.barre.from;i<=s.barre.to;i++)assert.ok(s.frets[i]>=s.barre.fret,`${label}: barre string ${i} below barre`);
 }
 assert.ok(s.base>=1&&Math.max(...fretted,s.base)-s.base<=3,`${label}: diagram window misses a note`);
}
// Beginners see the familiar open shape where one exists.
assert.deepEqual(JSON.parse(run(`JSON.stringify(chordShape(0,'').frets)`)),[-1,3,2,0,1,0]);
assert.deepEqual(JSON.parse(run(`JSON.stringify(chordShape(7,'').frets)`)),[3,2,0,0,0,3]);
assert.deepEqual(JSON.parse(run(`JSON.stringify(chordShape(9,'m').frets)`)),[-1,0,2,2,1,0]);
// Other chords use the lowest movable barre shape: F♯m is the E-shape minor at fret 2.
assert.deepEqual(JSON.parse(run(`JSON.stringify(chordShape(6,'m'))`)),{frets:[2,4,4,2,2,2],fingers:[1,3,4,1,1,1],barre:{fret:2,from:0,to:5},base:1});
// The diagram is an accessible SVG with a position marker when it sits up the neck.
const svg=run(`chordDiagram(1,'','D♭')`);
assert.match(svg,/^<svg class="chord-diagram"/);assert.match(svg,/role="img"/);assert.match(svg,/aria-label="D♭ chord shape/);assert.match(svg,/4fr/);
assert.doesNotMatch(run(`chordDiagram(0,'','C')`),/fr</);
console.log('Chord shape checks passed for 12 roots × 6 chord types.');
