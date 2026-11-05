const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');

// Exercise the real router and homepage without starting audio or a microphone.
function studio(hash=''){
 const elements=new Map();
 const element=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',disabled:false,dataset:{},classList:{remove(){},toggle(){}},setAttribute(){},removeAttribute(){},focus(){this.focused=true;}});return elements.get(id);};
 const events={},visits=[];
 const c=vm.createContext({console,Math,Float32Array,Uint8Array,Map,Set,URL,Blob,window:{addEventListener:(name,fn)=>events[name]=fn,scrollTo(){}},document:{hidden:false,body:element('body'),getElementById:element,querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}},location:{hash},history:{replaceState(_s,_t,h){c.location.hash=h;},pushState(_s,_t,h){visits.push(h);c.location.hash=h;}},setTimeout,clearTimeout,requestAnimationFrame:()=>0,cancelAnimationFrame(){}});
 for(const f of ['sampled-audio','backing','licks','rhythm','releases','chords','listen',...(fs.existsSync('site/navigation.js')?['navigation']:[]),'app'])vm.runInContext(fs.readFileSync(`site/${f}.js`,'utf8'),c,{filename:f});
 return {c,element,events,visits,run:code=>vm.runInContext(code,c)};
}

const home=studio();
assert.equal(home.run('state.view'),'home','A bare URL should open the section homepage');
const routes=['scales','harmony','progressions','modes','jam','licks','rhythm','legends','listen','releases'];
for(const route of routes){
 assert.match(home.element('main').innerHTML,new RegExp(`href="#${route}"`),`${route} must be available on Home`);
 const direct=studio('#'+route);
 assert.equal(direct.run('state.view'),route,`Preserve #${route} deep links`);
}
// The orange amp home page: drawn icons, the Canva hero copy and its two calls to action.
const homeHtml=home.element('main').innerHTML;
assert.doesNotMatch(homeHtml,/[▦♬⇄◈▶♫♩★◉☷]/,'Home uses drawn icons, not symbol characters');
assert.match(homeHtml,/Find the notes\. Make it music\./);
assert.match(homeHtml,/href="#jam"[^>]*>Open the jam room</);
assert.match(homeHtml,/href="#scales"[^>]*>Explore the fretboard</);
assert.ok((homeHtml.match(/class="icon"/g)||[]).length>=10,'One icon per section card');
assert.equal(studio('#unknown').run('state.view'),'home');
assert.equal(studio('#constructor').run('state.view'),'home','Prototype properties are not routes');
home.run('globalThis.audioStops=0;globalThis.micStops=0;stopAudio=()=>audioStops++;stopListening=()=>micStops++;');
home.run("navigate('listen')");
assert.equal(home.run('audioStops'),1);assert.equal(home.run('micStops'),1);
assert.equal(home.element('main').focused,true);
assert.deepEqual(home.visits,['#listen']);
home.run("navigate('listen')");assert.equal(home.visits.length,1,'Do not add duplicate history entries');
home.c.location.hash='#harmony';home.events.hashchange();
assert.equal(home.run('state.view'),'harmony');assert.equal(home.visits.length,1,'Back/Forward must not push another history entry');
home.c.location.hash='#bad';home.events.hashchange();
assert.equal(home.run('state.view'),'home','Invalid history destinations should return to Home');
home.run("navigate('constructor')");assert.equal(home.run('state.view'),'home');
console.log('PASS: homepage destinations, ten direct links, safe unknown routes, section cleanup and browser-history routing.');
