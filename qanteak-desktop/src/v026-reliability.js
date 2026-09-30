import {draftKey,normalizeBlocks,sameBlocks,validDraft,trimHistory} from './v026-reliability-model.js';

const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const TYPE_LABEL={paragraph:'Text',heading:'Heading',bullet:'Bullet',check:'Checklist'};
let dirtyCount=0;

function readBlocks(dialog){
  return normalizeBlocks($$('.q24-block',dialog).map((el,i)=>({
    id:el.dataset.block||`block-${i+1}`,
    type:$('select',el)?.value||'paragraph',
    text:$('textarea',el)?.value||''
  })));
}

function blockHTML(block,i){
  const options=Object.entries(TYPE_LABEL).map(([value,label])=>`<option value="${value}" ${block.type===value?'selected':''}>${label}</option>`).join('');
  return `<div class="q24-block" data-block="${esc(block.id)}"><select aria-label="Block type">${options}</select><textarea aria-label="Block ${i+1}">${esc(block.text)}</textarea><button type="button" class="textButton" data-remove-block>×</button></div>`;
}

function writeBlocks(dialog,blocks){
  const host=$('#q24-blocks',dialog);if(!host)return;
  host.innerHTML=normalizeBlocks(blocks).map(blockHTML).join('');
}

function setStatus(dialog,text,tone=''){
  const node=$('[data-v026-status]',dialog);if(!node)return;
  node.textContent=text;node.dataset.tone=tone;
}

function loadDraft(recordId){
  try{const value=JSON.parse(localStorage.getItem(draftKey(recordId))||'null');return validDraft(value)?value:null}catch{return null}
}

function saveDraft(recordId,version,blocks){
  const value={recordId,version:Number(version)||0,savedAt:new Date().toISOString(),blocks:normalizeBlocks(blocks)};
  localStorage.setItem(draftKey(recordId),JSON.stringify(value));return value;
}

function enhance(dialog){
  if(dialog.dataset.v026Enhanced==='1'||!$('#q24-blocks',dialog))return;
  const ref=$('[data-q24="history"][data-id]',dialog)||$('[data-q24="comments"][data-id]',dialog);
  const recordId=ref?.dataset.id;if(!recordId)return;
  dialog.dataset.v026Enhanced='1';
  const versionText=$('.q24-muted',dialog)?.textContent||'';
  const version=Number(versionText.match(/Version\s+(\d+)/i)?.[1]||0);
  const form=$('form',dialog);if(!form)return;
  const initial=readBlocks(dialog);
  let history=[initial],cursor=0,dirty=false,submitted=false,timer=0,historyTimer=0;

  const toolbar=document.createElement('section');
  toolbar.className='q26-draftbar';
  toolbar.innerHTML=`<div><strong>Editing recovery</strong><span data-v026-status>Local recovery on</span></div><div><button type="button" class="secondary" data-v026-undo disabled>Undo</button><button type="button" class="secondary" data-v026-redo disabled>Redo</button></div>`;
  $('#q24-blocks',dialog).before(toolbar);

  const updateButtons=()=>{
    $('[data-v026-undo]',dialog).disabled=cursor<=0;
    $('[data-v026-redo]',dialog).disabled=cursor>=history.length-1;
  };
  const pushSnapshot=()=>{
    const next=readBlocks(dialog);
    if(sameBlocks(history[cursor],next))return;
    history=trimHistory([...history.slice(0,cursor+1),next],40);
    cursor=history.length-1;updateButtons();
  };
  const markDirty=()=>{
    if(!dirty){dirty=true;dirtyCount++}
    setStatus(dialog,'Unsaved changes','warn');
    clearTimeout(timer);timer=setTimeout(()=>{
      const draft=saveDraft(recordId,version,readBlocks(dialog));
      setStatus(dialog,`Draft saved locally · ${new Date(draft.savedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`,'good');
    },500);
    clearTimeout(historyTimer);historyTimer=setTimeout(pushSnapshot,450);
  };
  const restore=(blocks)=>{
    writeBlocks(dialog,blocks);history=trimHistory([initial,readBlocks(dialog)],40);cursor=history.length-1;updateButtons();markDirty();
  };

  const recovered=loadDraft(recordId);
  if(recovered&&!sameBlocks(recovered.blocks,initial)){
    const notice=document.createElement('section');
    notice.className='q26-recovery';
    notice.innerHTML=`<div><strong>Recovered draft available</strong><span>Saved ${esc(new Date(recovered.savedAt).toLocaleString())}. Restore it or keep the current cloud version.</span></div><div><button type="button" class="primary" data-v026-restore>Restore draft</button><button type="button" class="secondary" data-v026-discard>Discard</button></div>`;
    toolbar.after(notice);
    $('[data-v026-restore]',notice).onclick=()=>{restore(recovered.blocks);notice.remove()};
    $('[data-v026-discard]',notice).onclick=()=>{localStorage.removeItem(draftKey(recordId));notice.remove();setStatus(dialog,'Recovered draft discarded')};
  }

  form.addEventListener('input',markDirty);
  form.addEventListener('change',markDirty);
  dialog.addEventListener('click',ev=>{
    if(ev.target.closest('[data-q24="add-block"],[data-remove-block],[data-q24="template"]'))setTimeout(markDirty,0);
    if(ev.target.closest('[data-v026-undo]')){
      if(cursor>0){cursor--;writeBlocks(dialog,history[cursor]);updateButtons();markDirty()}
    }
    if(ev.target.closest('[data-v026-redo]')){
      if(cursor<history.length-1){cursor++;writeBlocks(dialog,history[cursor]);updateButtons();markDirty()}
    }
  },true);
  dialog.addEventListener('keydown',ev=>{
    const mod=ev.ctrlKey||ev.metaKey;
    if(!mod||ev.key.toLowerCase()!=='z'||ev.target.matches('textarea,input'))return;
    ev.preventDefault();
    if(ev.shiftKey){if(cursor<history.length-1){cursor++;writeBlocks(dialog,history[cursor]);updateButtons();markDirty()}}
    else if(cursor>0){cursor--;writeBlocks(dialog,history[cursor]);updateButtons();markDirty()}
  });
  form.addEventListener('submit',()=>{submitted=true;clearTimeout(timer);saveDraft(recordId,version,readBlocks(dialog));setStatus(dialog,'Saving to workspace…')});
  dialog.addEventListener('close',()=>{
    clearTimeout(timer);clearTimeout(historyTimer);
    if(submitted){localStorage.removeItem(draftKey(recordId));if(dirty){dirty=false;dirtyCount=Math.max(0,dirtyCount-1)}}
    else if(dirty)saveDraft(recordId,version,readBlocks(dialog));
  },{once:true});
}

const observer=new MutationObserver(()=>$$('.q24-dialog[open]').forEach(enhance));
observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
$$('.q24-dialog[open]').forEach(enhance);
window.addEventListener('beforeunload',ev=>{if(dirtyCount>0){ev.preventDefault();ev.returnValue=''}});
