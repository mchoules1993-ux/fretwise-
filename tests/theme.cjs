'use strict';
// Guards the orange amp look: colours live in CSS only.
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const site=f=>fs.readFileSync(path.join(__dirname,'..','site',f),'utf8');

// 1. Colours live in CSS only, so the look can change in one place.
for(const f of ['app.js','listen.js','navigation.js','chords.js']){
  assert.doesNotMatch(site(f),/(?<!&)#[0-9a-fA-F]{6}\b|(?<!&)#[0-9a-fA-F]{3}\b(?![\w-])/,`${f} must not hard-code colours`);
}

// 2. The palette from the spec, on :root.
const css=site('style.css');
const root=(css.match(/:root\s*{([^}]*)}/)||[])[1]||'';
const tok=n=>(root.match(new RegExp(`--${n}\\s*:\\s*(#[0-9a-fA-F]{6})`))||[])[1];
const want={orange:'#cb572a','orange-deep':'#a9441e',cream:'#f3e6c8',ink:'#1e1611','ink-soft':'#6b5a48',black:'#181411',gold:'#d29d3f',wood:'#af7748'};
for(const[k,v]of Object.entries(want))assert.equal(tok(k)?.toLowerCase(),v,`--${k} must be ${v}`);

// 3. Readable text (WCAG AA: 4.5:1 normal text, 3:1 large headings).
const lum=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(x=>x<=.03928?x/12.92:((x+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];};
const ratio=(a,b)=>{const[x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return(x+.05)/(y+.05);};
for(const[fg,bg,min]of[['cream','orange-deep',4.5],['ink','cream',4.5],['ink-soft','cream',4.5],['orange-deep','cream',4.5],['gold','black',4.5],['cream','black',4.5],['cream','orange',3]])
  assert.ok(ratio(want[fg],want[bg])>=min,`${fg} on ${bg} needs ${min}:1`);

// 4. The new type, and none of the old.
assert.doesNotMatch(css,/Space Grotesk|DM Sans/,'Old fonts must be gone');
assert.match(css,/Barlow\+Condensed|Barlow Condensed/,'Barlow Condensed must load');

// 5. No class that had styles before the redesign loses them.
const styled=new Set([...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(m=>m[1]));
for(const c of fs.readFileSync(path.join(__dirname,'fixtures','styled-classes.txt'),'utf8').split('\n').filter(Boolean))
  assert.ok(styled.has(c),`.${c} lost its styles`);

console.log('theme: ok');
