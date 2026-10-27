// Chord shapes for standard tuning. Arrays run low E to high e; -1 = muted, 0 = open.
// Fingers: 1 index, 2 middle, 3 ring, 4 little. Open shapes win; otherwise use the lowest movable barre shape.
const CHORD_OPEN_STRINGS=[4,9,2,7,11,4];
const OPEN_CHORDS={
 '0:':[[-1,3,2,0,1,0],[0,3,2,0,1,0]],'2:':[[-1,-1,0,2,3,2],[0,0,0,1,3,2]],'4:':[[0,2,2,1,0,0],[0,2,3,1,0,0]],'7:':[[3,2,0,0,0,3],[2,1,0,0,0,3]],'9:':[[-1,0,2,2,2,0],[0,0,1,2,3,0]],
 '2:m':[[-1,-1,0,2,3,1],[0,0,0,2,3,1]],'4:m':[[0,2,2,0,0,0],[0,2,3,0,0,0]],'9:m':[[-1,0,2,2,1,0],[0,0,2,3,1,0]],
 '0:7':[[-1,3,2,3,1,0],[0,3,2,4,1,0]],'2:7':[[-1,-1,0,2,1,2],[0,0,0,2,1,3]],'4:7':[[0,2,0,1,0,0],[0,2,0,1,0,0]],'7:7':[[3,2,0,0,0,1],[3,2,0,0,0,1]],'9:7':[[-1,0,2,0,2,0],[0,0,2,0,3,0]],'11:7':[[-1,2,1,2,0,2],[0,2,1,3,0,4]],
 '2:m7':[[-1,-1,0,2,1,1],[0,0,0,2,1,1]],'4:m7':[[0,2,0,0,0,0],[0,2,0,0,0,0]],'9:m7':[[-1,0,2,0,1,0],[0,0,2,0,1,0]],
 '0:maj7':[[-1,3,2,0,0,0],[0,3,2,0,0,0]],'2:maj7':[[-1,-1,0,2,2,2],[0,0,0,1,2,3]],'4:maj7':[[0,2,1,1,0,0],[0,3,1,2,0,0]],'5:maj7':[[-1,-1,3,2,1,0],[0,0,3,2,1,0]],'7:maj7':[[3,2,0,0,0,2],[3,2,0,0,0,1]],'9:maj7':[[-1,0,2,1,2,0],[0,0,2,1,3,0]]
};
// Movable shapes: [root string, frets above the root fret (null = muted), fingers, barre strings or null].
const MOVABLE_CHORDS={
 '':[[0,[0,2,2,1,0,0],[1,3,4,2,1,1],[0,5]],[1,[null,0,2,2,2,0],[0,1,2,3,4,1],[1,5]]],
 m:[[0,[0,2,2,0,0,0],[1,3,4,1,1,1],[0,5]],[1,[null,0,2,2,1,0],[0,1,3,4,2,1],[1,5]]],
 '7':[[0,[0,2,0,1,0,0],[1,3,1,2,1,1],[0,5]],[1,[null,0,2,0,2,0],[0,1,3,1,4,1],[1,5]]],
 m7:[[0,[0,2,0,0,0,0],[1,3,1,1,1,1],[0,5]],[1,[null,0,2,0,1,0],[0,1,3,1,2,1],[1,5]]],
 maj7:[[0,[0,null,1,1,0,null],[2,0,3,4,1,0],null],[1,[null,0,2,1,2,0],[0,1,3,2,4,1],[1,5]]],
 dim:[[0,[0,1,2,0,null,null],[1,2,3,1,0,0],[0,3]],[1,[null,0,1,2,1,null],[0,1,2,4,3,0],null]]
};
function chordShape(pc,q=''){
 pc=(pc%12+12)%12;const open=OPEN_CHORDS[`${pc}:${q}`];let shape;
 if(open)shape={frets:[...open[0]],fingers:[...open[1]],barre:null};
 else{
  const options=MOVABLE_CHORDS[q].map(([string,rel,fingers,barre])=>({r:(pc-CHORD_OPEN_STRINGS[string]+12)%12,rel,fingers,barre}));
  const {r,rel,fingers,barre}=options.reduce((a,b)=>b.r<a.r?b:a);
  // At fret 0 the index finger's notes become open strings, so every other finger moves down one.
  shape={frets:rel.map(x=>x===null?-1:r+x),fingers:rel.map((x,i)=>x===null||(r===0&&x===0)?0:fingers[i]-(r===0?1:0)),barre:barre&&r>0?{fret:r,from:barre[0],to:barre[1]}:null};
 }
 const fretted=shape.frets.filter(f=>f>0);shape.base=Math.max(...fretted)<=4?1:Math.min(...fretted);
 return shape;
}
function chordDiagram(pc,q,name){
 const s=chordShape(pc,q),x=i=>26+i*14,y=f=>28+(f-s.base+.5)*20;
 const spoken=s.frets.map(f=>f<0?'x':f).join(' ');
 let out=`<svg class="chord-diagram" viewBox="0 0 110 116" role="img" aria-label="${name} chord shape. Frets from low E to high e: ${spoken}">`;
 out+=s.base===1?'<rect class="nut" x="25" y="25" width="72" height="4" rx="1"/>':`<text class="position" x="17" y="42">${s.base}fr</text>`;
 for(let f=0;f<=4;f++)out+=`<line class="fret" x1="26" y1="${28+f*20}" x2="96" y2="${28+f*20}"/>`;
 for(let i=0;i<6;i++){
  out+=`<line class="string" x1="${x(i)}" y1="28" x2="${x(i)}" y2="108"/>`;
  if(s.frets[i]<0)out+=`<text class="mute" x="${x(i)}" y="20">×</text>`;
  else if(s.frets[i]===0)out+=`<circle class="open" cx="${x(i)}" cy="16" r="3.5"/>`;
 }
 if(s.barre)out+=`<rect class="barre" x="${x(s.barre.from)-6.5}" y="${y(s.barre.fret)-6.5}" width="${x(s.barre.to)-x(s.barre.from)+13}" height="13" rx="6.5"/><text class="finger" x="${x(s.barre.from)}" y="${y(s.barre.fret)+3.5}">1</text>`;
 s.frets.forEach((f,i)=>{
  if(f<=0||(s.barre&&f===s.barre.fret&&i>=s.barre.from&&i<=s.barre.to))return;
  out+=`<circle class="dot" cx="${x(i)}" cy="${y(f)}" r="6.5"/><text class="finger" x="${x(i)}" y="${y(f)+3.5}">${s.fingers[i]}</text>`;
 });
 return out+'</svg>';
}
const CHORD_KEY='<p class="chord-key">Chord boxes: low E on the left. Numbers are fingers (1 = index … 4 = little). ○ = play open. × = don’t play. A long bar = one finger across several strings.</p>';
