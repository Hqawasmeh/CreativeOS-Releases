export const DRAFT_PREFIX='qanteak.rc9.v026.documentDraft';
export const DRAFT_MAX_AGE_MS=7*24*60*60*1000;

export function normalizeBlocks(blocks=[]){
  return blocks.map((b,i)=>({
    id:String(b?.id||`block-${i+1}`),
    type:['paragraph','heading','bullet','check'].includes(String(b?.type))?String(b.type):'paragraph',
    text:String(b?.text||'')
  }));
}

export function draftKey(recordId){
  const id=String(recordId||'').trim();
  if(!id)throw new Error('recordId is required');
  return `${DRAFT_PREFIX}.${id}`;
}

export function sameBlocks(a,b){
  return JSON.stringify(normalizeBlocks(a))===JSON.stringify(normalizeBlocks(b));
}

export function validDraft(value,now=Date.now()){
  if(!value||typeof value!=='object'||!value.recordId||!Array.isArray(value.blocks))return false;
  const saved=Date.parse(value.savedAt||'');
  return Number.isFinite(saved)&&now-saved>=0&&now-saved<=DRAFT_MAX_AGE_MS;
}

export function trimHistory(history=[],limit=40){
  const out=[];
  for(const item of history){
    const blocks=normalizeBlocks(item);
    if(!out.length||!sameBlocks(out[out.length-1],blocks))out.push(blocks);
  }
  return out.slice(-Math.max(2,limit));
}
