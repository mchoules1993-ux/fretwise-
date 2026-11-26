'use strict';
// Optional browser check for the metronome: node tests/metronome-browser.cjs
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
   await page.goto(url+'/#scales');
   const state=()=>page.evaluate(()=>({running:metronome.running,bpm:metronome.bpm,meter:metronome.meter,clicks:metronome.click,lit:document.querySelectorAll('.metro-lights i.on').length}));
   const inView=async sel=>{const b=await page.locator(sel).boundingBox();assert.ok(b&&b.x>=0&&b.y>=0&&b.x+b.width<=width+.5&&b.y+b.height<=height+.5,`${sel} must fit on a ${width}×${height} screen`);};
   // The transport must not make the page scroll sideways.
   const transportWidth=await page.evaluate(()=>Math.max(...[...document.querySelectorAll('.audio-transport, .audio-transport *')].map(e=>e.getBoundingClientRect().right)));
   assert.ok(transportWidth<=width+.5,'The audio bar must fit the screen width');

   // Open, start, and hear (count) clicks; the lights follow.
   await page.click('#metro-toggle');
   assert.equal(await page.getAttribute('#metro-toggle','aria-expanded'),'true');
   await inView('#metro-panel');await inView('#metro-start');await inView('#metro-up');
   await page.click('#metro-start');await page.waitForTimeout(1600);
   let s=await state();
   assert.equal(s.running,true);assert.ok(s.clicks>=1,'Clicks are being scheduled');assert.equal(s.lit,1,'One light is on');
   assert.equal(await page.evaluate(()=>audio.state),'running');
   assert.equal(await page.isDisabled('#stop-all'),false);

   // Tempo controls.
   await page.click('#metro-up');await page.click('#metro-up');await page.click('#metro-down');
   assert.equal((await state()).bpm,81);
   await page.locator('#metro-bpm').fill('150');assert.equal((await state()).bpm,150);
   for(let i=0;i<4;i++){await page.click('#metro-tap');await page.waitForTimeout(500);}
   const tapped=(await state()).bpm;assert.ok(tapped>=100&&tapped<=125,`Four taps half a second apart should give about 120 BPM, got ${tapped}`);

   // Time signature.
   await page.selectOption('#metro-meter','6/8');
   assert.equal(await page.locator('.metro-lights i').count(),6);
   assert.match(await page.textContent('#metro-hint'),/120–180/);
   await page.selectOption('#metro-meter','3/4');
   assert.equal(await page.locator('.metro-lights i').count(),3);

   // Escape closes the panel; the click keeps going and the bar button shows it.
   await page.focus('#metro-start');await page.keyboard.press('Escape');
   assert.equal(await page.isHidden('#metro-panel'),true);
   assert.match(await page.textContent('#metro-toggle'),/· 3\/4/);
   assert.equal((await state()).running,true);

   // Changing the scale or the page keeps it running.
   await page.selectOption('#main select >> nth=0',{index:3});
   assert.equal((await state()).running,true,'Changing the key keeps it running');
   await page.goto(url+'/#legends');await page.waitForTimeout(300);
   assert.equal(await page.textContent('#breadcrumb'),'Legends');
   assert.equal((await state()).running,true,'Moving to another section keeps it running');
   await page.goBack();await page.waitForTimeout(300);
   assert.equal(await page.textContent('#breadcrumb'),'Scale explorer');
   assert.equal((await state()).running,true,'Going back keeps it running');

   // Playing something else stops it.
   await page.click('#play-scale');await page.waitForTimeout(400);
   s=await state();assert.equal(s.running,false,'Hear scale stops the metronome');
   assert.equal(await page.textContent('#metro-toggle'),'♩ Metronome');
   await page.click('#stop-all');

   // Stop audio stops it.
   await page.click('#metro-toggle');if(await page.isHidden('#metro-panel'))await page.click('#metro-toggle');
   await page.click('#metro-start');await page.waitForTimeout(300);
   assert.equal((await state()).running,true);
   await page.click('#stop-all');
   assert.equal((await state()).running,false);assert.equal(await page.isDisabled('#stop-all'),true);

   // Settings come back on the next visit.
   await page.reload();
   s=await state();assert.equal(s.meter,'3/4');assert.equal(s.bpm,tapped);
   assert.deepEqual(errors,[]);
   console.log(`PASS: ${width}×${height}: metronome fits, clicks, keeps going across pages and stops on other sound`);
   await context.close();
  }
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exit(1);});
