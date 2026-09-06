const $=(s,r=document)=>r.querySelector(s);const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const scrim=$('#scrim'),drawer=$('#notifications'),command=$('#commandPalette'),ai=$('#aiPanel'),sidebar=$('#sidebar');
const setScrim=()=>{const open=drawer.classList.contains('open')||command.classList.contains('open')||sidebar.classList.contains('mobileOpen');scrim.classList.toggle('open',open)};
function openDrawer(){drawer.classList.add('open');drawer.setAttribute('aria-hidden','false');setScrim()}
function closeDrawer(){drawer.classList.remove('open');drawer.setAttribute('aria-hidden','true');setScrim()}
function openCommand(){command.classList.add('open');command.setAttribute('aria-hidden','false');setScrim();setTimeout(()=>$('#commandSearch')?.focus(),30)}
function closeCommand(){command.classList.remove('open');command.setAttribute('aria-hidden','true');setScrim()}
function openAi(){ai.classList.add('open');ai.setAttribute('aria-hidden','false');setTimeout(()=>$('#aiInput')?.focus(),30)}
function closeAi(){ai.classList.remove('open');ai.setAttribute('aria-hidden','true')}
$('#openCommand')?.addEventListener('click',openCommand);$('#notificationButton')?.addEventListener('click',openDrawer);$('#openNotificationsSide')?.addEventListener('click',openDrawer);$('#askButton')?.addEventListener('click',openAi);$('#openAiFromNav')?.addEventListener('click',openAi);
$$('[data-close="drawer"]').forEach(b=>b.addEventListener('click',closeDrawer));$$('[data-close="ai"]').forEach(b=>b.addEventListener('click',closeAi));
scrim?.addEventListener('click',()=>{closeDrawer();closeCommand();sidebar.classList.remove('mobileOpen');setScrim()});
$('#mobileMenu')?.addEventListener('click',()=>{sidebar.classList.toggle('mobileOpen');setScrim()});

document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openCommand()}if(e.ctrlKey&&e.code==='Space'){e.preventDefault();openAi()}if(e.key==='Escape'){closeDrawer();closeCommand();closeAi();sidebar.classList.remove('mobileOpen');setScrim()}});

const commandSearch=$('#commandSearch');commandSearch?.addEventListener('input',()=>{const q=commandSearch.value.trim().toLowerCase();$$('.commandItem').forEach(item=>{item.style.display=!q||item.dataset.keywords?.includes(q)||item.textContent.toLowerCase().includes(q)?'flex':'none'})});
$$('.commandItem').forEach(item=>item.addEventListener('click',()=>{closeCommand();openAi();const text=item.querySelector('b')?.textContent||'Action';$('#aiMessages').insertAdjacentHTML('beforeend',`<div class="bubble user">${text}</div><div class="bubble ai">I have prepared that action in the current workspace context. In production, Qanteak will show the affected records and request confirmation before sensitive changes.</div>`)}));

$$('.taskCheck').forEach(btn=>btn.addEventListener('click',()=>{const task=btn.closest('.task');task.classList.toggle('done');btn.textContent=task.classList.contains('done')?'✓':''}));

const pageMeta={home:['Home','Your command center for work, clients and business.'],work:['Work','Projects, tasks, calendar and planning.'],clients:['Clients','Relationships, portals, reviews and CRM.'],documents:['Documents','Briefs, notes, SOPs and knowledge.'],files:['Files','Connected assets, versions and delivery state.'],business:['Business','Invoices, estimates, expenses and profitability.'],automations:['Automations','Triggers, conditions and actions across Qanteak.'],ai:['Qanteak AI','Contextual intelligence and actions across the workspace.']};
$$('.navItem[data-page]').forEach(item=>item.addEventListener('click',()=>{const page=item.dataset.page;if(page==='ai')return;$$('.navItem[data-page]').forEach(n=>n.classList.remove('active'));item.classList.add('active');const [title,sub]=pageMeta[page]||pageMeta.home;$('#pageHeading').textContent=title;$('#pageSubheading').textContent=sub;if(page!=='home'){openAi();$('#aiMessages').insertAdjacentHTML('beforeend',`<div class="bubble ai">The ${title} surface is part of RC9 V0.1's navigation foundation. Its production data view is being connected next.</div>`)}if(window.innerWidth<781){sidebar.classList.remove('mobileOpen');setScrim()}}));

$('#newButton')?.addEventListener('click',openCommand);
$('#aiForm')?.addEventListener('submit',e=>{e.preventDefault();const input=$('#aiInput');const value=input.value.trim();if(!value)return;$('#aiMessages').insertAdjacentHTML('beforeend',`<div class="bubble user">${value.replace(/[<>]/g,'')}</div>`);input.value='';setTimeout(()=>{$('#aiMessages').insertAdjacentHTML('beforeend','<div class="bubble ai">I can use the current page context for that. RC9 V0.1 is wiring these commands to the unified action layer; sensitive writes will require confirmation.</div>');$('#aiMessages').scrollTop=$('#aiMessages').scrollHeight},180)});

const date=new Intl.DateTimeFormat(undefined,{weekday:'long',month:'short',day:'numeric'}).format(new Date());$('#todayLabel').textContent=date;
