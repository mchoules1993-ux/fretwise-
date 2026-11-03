'use strict';

// Shared order and grouping for the homepage and section menu.
const SECTION_GROUPS = [
 {title:'Explore the theory',description:'Find the notes and understand how they fit.',sections:[['scales','▦'],['harmony','♬'],['progressions','⇄'],['modes','◈']]},
 {title:'Pick up your guitar',description:'Put an idea into your hands, your ears and your playing.',sections:[['jam','▶'],['licks','♫'],['rhythm','♩'],['legends','★'],['listen','◉']]},
 {title:'Inside the studio',description:'See everything you can use in Fretwise.',sections:[['releases','☷']]}
];

function homeView(){
 return `<section class="home-intro"><span class="eyebrow chapter">YOUR GUITAR THEORY STUDIO</span><h1>A little theory.<br>A lot more playing.</h1><p>Choose a place to start. Explore a sound, work on a phrase, or plug in and play.</p><a class="btn primary" href="#jam" data-view="jam">Open the Jam room <span aria-hidden="true">↗</span></a></section>${SECTION_GROUPS.map(group=>`<section class="home-group" aria-label="${group.title}"><div class="home-group-heading"><h2>${group.title}</h2><p>${group.description}</p></div><div class="home-grid">${group.sections.map(([view,icon])=>{const [number,title,,description]=VIEWS[view];return `<a class="home-card" href="#${view}" data-view="${view}"><span class="home-card-top"><span class="home-card-icon" aria-hidden="true">${icon}</span><span class="eyebrow">${number}</span></span><h3>${title}</h3><p>${description}</p><span class="home-card-open">Open section <span aria-hidden="true">↗</span></span></a>`;}).join('')}</div></section>`).join('')}`;
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
 nav.innerHTML=SECTION_GROUPS.map(group=>`<div class="nav-group"><p class="eyebrow nav-group-title">${group.title}</p>${group.sections.map(([view,icon])=>`<a class="nav" href="#${view}" data-view="${view}"><span aria-hidden="true">${icon}</span><span class="nav-title">${VIEWS[view][1]}</span><small>${VIEWS[view][0]}</small></a>`).join('')}</div>`).join('');
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
