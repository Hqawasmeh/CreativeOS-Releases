// Shared keyboard and focus behavior. No data access or new privileged bridge.
const clickable='.kanbanCard[data-open-project],.clientCard[data-open-client],.docCard[data-open-doc],.commandItem[data-command],.calendarCell[data-calendar-date]';
const dialogs=[['modal','modalTitle'],['detailModal','detailTitle'],['command',null],['notifications',null],['aiPanel',null],['v21Modal',null]];
let activeDialog=null,returnFocus=null,frame=0;
function decorate(){
 frame=0;
 document.querySelectorAll(clickable).forEach(el=>{el.tabIndex=0;el.setAttribute('role','button')});
 document.querySelectorAll('.navItem').forEach(el=>{if(el.classList.contains('active'))el.setAttribute('aria-current','page');else el.removeAttribute('aria-current')});
 document.querySelectorAll('.taskCheck').forEach(el=>{if(!el.getAttribute('aria-label'))el.setAttribute('aria-label','Toggle task: '+(el.closest('.taskItem')?.querySelector('b')?.textContent||'task'))});
 document.querySelectorAll('[data-close],[data-v21-close]').forEach(el=>el.setAttribute('aria-label','Close panel'));
 document.querySelectorAll('.field').forEach((field,index)=>{const label=field.querySelector('label'),input=field.querySelector('input,textarea,select');if(label&&input&&!label.contains(input)){if(!input.id)input.id='qanteak-field-'+index;label.htmlFor=input.id}});
 dialogs.forEach(([id])=>{const el=document.getElementById(id);if(el){el.inert=!el.classList.contains('open');el.setAttribute('aria-hidden',String(el.inert))}});
 const opened=dialogs.map(([id,label])=>{const el=document.getElementById(id);if(!el||!el.classList.contains('open'))return null;el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');if(label)el.setAttribute('aria-labelledby',label);else el.setAttribute('aria-label',id==='command'?'Search workspace':id==='v21Modal'?(el.querySelector('h3')?.textContent||'Studio dialog'):id==='aiPanel'?'Qanteak AI':'Notifications');return el}).filter(Boolean).at(-1)||null;
 document.getElementById('appShell').inert=!!opened;
 document.getElementById('authGate').inert=!!opened;
 if(opened!==activeDialog){if(opened){if(!activeDialog)returnFocus=document.activeElement;activeDialog=opened;const first=opened.querySelector('input:not([type=hidden]),textarea,select,button,[tabindex="0"]');first?.focus()}else{activeDialog=null;if(returnFocus?.isConnected)returnFocus.focus();returnFocus=null}}
 const menu=document.getElementById('mobileMenu');menu?.setAttribute('aria-expanded',String(document.getElementById('sidebar')?.classList.contains('mobileOpen')));
}
function queue(){if(!frame)frame=requestAnimationFrame(decorate)}
new MutationObserver(queue).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
document.addEventListener('keydown',event=>{
 if((event.key==='Enter'||event.key===' ')&&event.target.matches(clickable)){event.preventDefault();event.target.click();return}
 if(event.key==='Escape'){document.querySelector('#v21Modal.open [data-v21-close]')?.click();return}
 if(event.key==='Tab'&&activeDialog){const nodes=[...activeDialog.querySelectorAll('button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex="0"]')].filter(n=>!n.hidden&&n.getClientRects().length);if(!nodes.length){event.preventDefault();return}const first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&(document.activeElement===first||!activeDialog.contains(document.activeElement))){event.preventDefault();last.focus()}else if(!event.shiftKey&&(document.activeElement===last||!activeDialog.contains(document.activeElement))){event.preventDefault();first.focus()}}
 if(event.target.id==='commandInput'&&event.key==='ArrowDown'){event.preventDefault();document.querySelector('.commandItem')?.focus()}
 if(event.target.matches('.commandItem')&&['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();const items=[...document.querySelectorAll('.commandItem')],index=items.indexOf(event.target);items[(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus()}
});
decorate();
