'use strict';

// Shared order and grouping for the homepage and section menu.
const SECTION_GROUPS = [
 {title:'Explore the theory',description:'Find the notes and understand how they fit.',sections:['scales','harmony','progressions','modes']},
 {title:'Pick up your guitar',description:'Put an idea into your hands, your ears and your playing.',sections:['jam','licks','rhythm','legends','listen']},
 {title:'Inside the studio',description:'See everything you can use in Fretwise.',sections:['releases']}
];

// Simple drawn line icons, one per section (24×24, stroked in the current text colour).
const ICONS = {
 home:'<path d="M3.5 11 12 4l8.5 7M6 9.5V20h12V9.5"/>',
 scales:'<circle cx="5" cy="18" r="1.8"/><circle cx="10" cy="14" r="1.8"/><circle cx="15" cy="10" r="1.8"/><circle cx="20" cy="6" r="1.8"/>',
 harmony:'<circle cx="12" cy="5.5" r="2.4"/><circle cx="12" cy="12" r="2.4"/><circle cx="12" cy="18.5" r="2.4"/>',
 progressions:'<path d="M5.5 14a7 7 0 1 0 1.6-6.5"/><path d="M6 3.5V8h4.5"/>',
 modes:'<circle cx="12" cy="12" r="8"/><path d="M12 12l4-5.5M4 12h1.5M18.5 12H20M12 4v1.5"/>',
 jam:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".8"/>',
 licks:'<path d="M2.5 13c2.5-6 4.5-6 6.5 0s4 6 6.5 0 3.5-5 6-2"/>',
 rhythm:'<path d="M8 20.5 11 3.5h2l3 17z"/><path d="M12 16l5.5-8.5"/>',
 legends:'<path d="M12 21c-4-3.8-7-8.7-7-12.6C5 5.5 8 4 12 4s7 1.5 7 4.4c0 3.9-3 8.8-7 12.6z"/>',
 listen:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>',
 releases:'<path d="M8 6h12M8 12h12M8 18h12M4 6h.5M4 12h.5M4 18h.5"/>'
};
function icon(view){
 return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[view]||''}</svg>`;
}

// A small, static A minor pentatonic box (frets 5–8) for the home faceplate.
function heroBoard(){
 const strings=['e','B','G','D','A','E'],frets=[5,6,7,8],notes={e:{5:'A',8:'C'},B:{5:'E',8:'G'},G:{5:'C',7:'D'},D:{5:'G',7:'A'},A:{5:'D',7:'E'},E:{5:'A',8:'C'}};
 const left=28,top=16,cw=74,rh=30,w=left+cw*4+8,h=top+rh*5+36;
 let out=`<svg class="hero-board" viewBox="0 0 ${w} ${h}" role="img" aria-label="A minor pentatonic, frets 5 to 8. Root notes are A."><rect x="${left}" y="${top-12}" width="${cw*4}" height="${rh*5+24}" rx="3" class="fb-wood"/>`;
 frets.forEach((f,i)=>{const x=left+(i+1)*cw;out+=`<line x1="${x}" y1="${top-12}" x2="${x}" y2="${top+rh*5+12}" class="fb-fret" stroke-width="2.5"/><text x="${x-cw/2}" y="${h-4}" text-anchor="middle" class="fb-fret-num" font-size="13">${f}</text>`;});
 strings.forEach((s,row)=>{const y=top+row*rh;out+=`<text x="10" y="${y+4}" text-anchor="middle" class="fb-string-name" font-size="13">${s}</text><line x1="${left}" y1="${y}" x2="${left+cw*4}" y2="${y}" class="fb-string" stroke-width="${(1+row*.3).toFixed(1)}"/>`;
  frets.forEach((f,i)=>{const n=notes[s][f];if(n)out+=`<g class="note ${n==='A'?'root':'scale'}"><circle cx="${left+(i+.5)*cw}" cy="${y}" r="12"/><text x="${left+(i+.5)*cw}" y="${y+4.5}" text-anchor="middle" font-size="12" font-weight="700">${n}</text></g>`;});});
 return out+'</svg>';
}

function homeView(){
 return `<section class="home-intro"><div class="home-hero-text"><h1>Find the notes. Make it music.</h1><p>Fretwise is a free guitar theory practice app. Learn the fretboard, hear how harmony works, and turn practice into playing.</p><div class="home-actions"><a class="btn primary" href="#jam" data-view="jam">Open the jam room</a><a class="text-link" href="#scales" data-view="scales">Explore the fretboard</a></div></div><figure class="faceplate home-plate"><span class="screw" aria-hidden="true"></span><span class="screw" aria-hidden="true"></span><span class="screw" aria-hidden="true"></span><span class="screw" aria-hidden="true"></span>${heroBoard()}<figcaption>A minor pentatonic, fifth position. Orange notes are the root.</figcaption></figure></section><div class="home-facts"><span>Free to use</span><span>Learn by ear</span><span>Built for guitarists</span></div>${SECTION_GROUPS.map(group=>`<section class="home-group" aria-label="${group.title}"><div class="home-group-heading"><h2>${group.title}</h2><p>${group.description}</p></div><div class="home-grid">${group.sections.map(view=>{const [,title,,description]=VIEWS[view];return `<a class="home-card" href="#${view}" data-view="${view}"><span class="home-card-top"><span class="home-card-icon">${icon(view)}</span></span><h3>${title}</h3><p>${description}</p></a>`;}).join('')}</div></section>`).join('')}`;
}

let sectionMenu = null;

function closeSectionMenu(restoreFocus = true){
 if(!sectionMenu)return;
 const {sidebar,toggle,backdrop,background,mobile}=sectionMenu;
 const wasOpen=sectionMenu.open;
 sectionMenu.open=false;
 sidebar.classList.remove('is-open');
 sidebar.inert=mobile.matches;
 sidebar.removeAttribute('role');
 sidebar.removeAttribute('aria-modal');
 toggle.setAttribute('aria-expanded','false');
 backdrop.hidden=true;
 background.forEach(node=>{node.inert=false;});
 document.body.classList.remove('sections-open');
 if(wasOpen&&restoreFocus)toggle.focus();
}

function revealActiveSection(){
 const nav=document.querySelector('.section-scroll');
 const active=document.querySelector('.section-scroll .nav.active');
 if(!nav||!active||nav.clientHeight===0)return;
 const bounds=nav.getBoundingClientRect(),item=active.getBoundingClientRect();
 if(item.top<bounds.top)nav.scrollTop-=bounds.top-item.top+8;
 else if(item.bottom>bounds.bottom)nav.scrollTop+=item.bottom-bounds.bottom+8;
}

function setupNavigation(){
 const sidebar=document.querySelector('.sidebar');
 if(!sidebar)return;
 document.querySelector('.skip').addEventListener('click',event=>{
  event.preventDefault();
  const main=document.getElementById('main');
  main.focus({preventScroll:true});
  main.scrollIntoView({block:'start'});
 });
 const toggle=document.getElementById('sections-toggle');
 const close=document.getElementById('sections-close');
 const backdrop=document.getElementById('sections-backdrop');
 const nav=document.querySelector('.section-scroll');
 nav.innerHTML=SECTION_GROUPS.map(group=>`<div class="nav-group"><p class="eyebrow nav-group-title">${group.title}</p>${group.sections.map(view=>`<a class="nav" href="#${view}" data-view="${view}"><span>${icon(view)}</span><span class="nav-title">${VIEWS[view][1]}</span><small>${VIEWS[view][0]}</small></a>`).join('')}</div>`).join('');
 const mobile=window.matchMedia('(max-width: 960px)');
 sectionMenu={sidebar,toggle,backdrop,mobile,open:false,background:[document.querySelector('.workspace'),document.querySelector('.mobile-header'),document.querySelector('.audio-transport'),document.querySelector('.skip')].filter(Boolean)};
 closeSectionMenu(false);
 toggle.addEventListener('click',()=>{
  if(!mobile.matches)return;
  if(sectionMenu.open){closeSectionMenu();return;}
  sectionMenu.open=true;
  sidebar.inert=false;
  sidebar.classList.add('is-open');
  sidebar.setAttribute('role','dialog');
  sidebar.setAttribute('aria-modal','true');
  toggle.setAttribute('aria-expanded','true');
  backdrop.hidden=false;
  sectionMenu.background.forEach(node=>{node.inert=true;});
  document.body.classList.add('sections-open');
  close.focus();
  revealActiveSection();
 });
 close.addEventListener('click',()=>closeSectionMenu());
 backdrop.addEventListener('click',()=>closeSectionMenu());
 document.addEventListener('keydown',event=>{
  if(!sectionMenu.open)return;
  if(event.key==='Escape'){event.preventDefault();closeSectionMenu();return;}
  if(event.key!=='Tab')return;
  const links=[...sidebar.querySelectorAll('a[href],button:not([disabled])')];
  const first=links[0],last=links[links.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 });
 mobile.addEventListener('change',()=>{
  const focusedSidebar=sidebar.contains(document.activeElement);
  const focusedToggle=document.activeElement===toggle;
  const wasOpen=sectionMenu.open;
  // A control hidden by the new media query may already have lost focus to body.
  const focusWasHidden=document.activeElement===document.body;
  closeSectionMenu(false);
  if(mobile.matches&&(focusedSidebar||focusWasHidden))toggle.focus();
  else if(!mobile.matches&&(focusedToggle||wasOpen))document.querySelector('.sidebar-home').focus();
  revealActiveSection();
 });
}
