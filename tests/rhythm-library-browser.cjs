'use strict';
// Optional browser check for the rhythm library: node tests/rhythm-library-browser.cjs
// Needs the Playwright package and Chromium (development only). Starts a temporary local server;
// never contacts or changes the live site. Runs at desktop, phone, phone-landscape and small-phone sizes.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');

const site=path.join(__dirname,'..','site');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.mp3':'audio/mpeg','.wav':'audio/wav','.txt':'text/plain'};
const server=http.createServer((req,res)=>{
 const file=path.join(site,decodeURIComponent(new URL(req.url,'http://x').pathname).replace(/\/$/,'/index.html'));
 if(!file.startsWith(site)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});

(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
 try{
  for(const [width,height] of [[1280,800],[390,844],[844,390],[320,568]]){
   const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   await page.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
   await page.goto(url+'/#rhythm');
   // The trainer must fit the screen. (At 320 px the header's Sections button already sticks out
   // on every page in main; that is a separate issue, so this checks the trainer itself.)
   // The notation strip may scroll inside its own box, as it already does for sixteenth notes.
   const noSideScroll=async what=>{const right=await page.evaluate(()=>Math.max(...[...document.querySelectorAll('.rhythm-console, .rhythm-console *')].filter(e=>!e.closest('.rhythm-score')||e.matches('.rhythm-score')).map(e=>e.getBoundingClientRect().right)));assert.ok(right<=width+.5,`${what}: the rhythm trainer must fit a ${width}×${height} screen (right edge ${Math.round(right)})`);};
   await noSideScroll('4/4 basics');

   // Choose 12/8, then the slow blues: the longest count row.
   await page.selectOption('#rhythm-time','12/8');
   await page.selectOption('#rhythm-pattern',{label:'12/8 slow blues'});
   assert.equal(await page.locator('[data-rhythm-tick]').count(),24);
   assert.match(await page.textContent('.rhythm-head'),/12\/8 slow blues/);
   await noSideScroll('12/8 slow blues');
   const row=await page.locator('.rhythm-counts').boundingBox();
   assert.ok(row.x>=0&&row.x+row.width<=width+.5,'the count row fits the screen');

   // Hear & count: the highlight moves through the bar, then Stop clears it.
   await page.click('#rhythm-play');
   await page.waitForFunction(()=>document.querySelector('[data-rhythm-tick].current'),null,{timeout:15000});
   const first=await page.getAttribute('[data-rhythm-tick].current','data-rhythm-tick');
   await page.waitForFunction(f=>{const c=document.querySelector('[data-rhythm-tick].current');return c&&c.dataset.rhythmTick!==f;},first,{timeout:5000});
   assert.equal(await page.evaluate(()=>audio.state),'running');
   await page.click('#rhythm-stop');
   assert.equal(await page.locator('[data-rhythm-tick].current').count(),0);
   assert.equal(await page.evaluate(()=>rhythmRun),null);

   // Rests light up as the beat passes through them, so you keep counting in the silence.
   await page.selectOption('#rhythm-time','4/4');
   await page.selectOption('#rhythm-pattern',{label:'Leave a space'});
   await page.click('#rhythm-play');
   await page.waitForFunction(()=>[...document.querySelectorAll('.rhythm-event.sounding')].some(e=>/rest/.test(e.textContent)),null,{timeout:15000});
   await page.click('#rhythm-stop');

   // Tempo controls and the swung shuffle.
   await page.selectOption('#rhythm-time','4/4');
   await page.selectOption('#rhythm-pattern',{label:'4/4 blues shuffle'});
   assert.match(await page.textContent('.rhythm-head'),/swung/);
   await page.click('#rhythm-bpm-up');await page.click('#rhythm-bpm-up');await page.click('#rhythm-bpm-down');
   assert.equal(await page.textContent('#rhythm-bpm'),'97');
   await noSideScroll('4/4 blues shuffle');

   assert.deepEqual(errors,[],'no page errors');
   console.log(`ok ${width}×${height}`);
   await context.close();
  }
 }finally{await browser.close();server.close();}
 console.log('rhythm-library-browser: ok');
})().catch(error=>{console.error(error);process.exit(1);});
