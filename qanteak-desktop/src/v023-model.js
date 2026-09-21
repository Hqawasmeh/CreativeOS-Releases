export const STAGES=['To do','In progress','In review','Done'];
export function taskStage(t){return t.done?'Done':STAGES.includes(t.stage)&&t.stage!=='Done'?t.stage:'To do'}
export function matchParent(row,parents,field){const value=row[field+'Id']||row[field+'_id']||row[field];return parents.find(p=>String(p.id)===String(value))||parents.find(p=>p.name===value)}
export function graphData(state,allowed=()=>true){
 const nodes=[],edges=[],active=k=>(state[k]||[]).filter(x=>!x.archivedAt),clients=allowed('clients')?active('clients'):[],projects=allowed('projects')?active('projects'):[];
 const add=(kind,row,label,parent)=>{const id=kind+':'+row.id;nodes.push({id,kind,ref:String(row.id),label:label||'Untitled',parent,sub:kind==='task'?taskStage(row):row.status||row.type||kind});if(parent)edges.push({from:parent,to:id});};
 clients.forEach(c=>add('client',c,c.name));
 projects.forEach(p=>{const c=matchParent(p,clients,'client');add('project',p,p.name,c?'client:'+c.id:null)});
 for(const [key,kind] of [['tasks','task'],['documents','document'],['files','file'],['invoices','invoice'],['reviews','review']]){
  if(!allowed(key==='invoices'?'business':key))continue;
  active(key).forEach(o=>{const p=matchParent(o,projects,'project'),c=matchParent(o,clients,'client');add(kind,o,o.title||o.name||o.number,p?'project:'+p.id:c?'client:'+c.id:null)});
 }
 return {nodes,edges};
}
export function graphLayout(nodes,saved={}){
 const pos={},counts={};
 for(const n of nodes){const depth=n.kind==='client'?0:n.kind==='project'?1:2;counts[depth]=(counts[depth]||0)+1;const p=saved[n.id];pos[n.id]=p&&Number.isFinite(p.x)&&Number.isFinite(p.y)?{x:Math.max(0,Math.min(10000,p.x)),y:Math.max(0,Math.min(10000,p.y))}:{x:70+depth*340,y:60+(counts[depth]-1)*125};}
 return pos;
}
export function shiftDuration(rows,now=Date.now(),start=new Date(new Date(now).setHours(0,0,0,0)).getTime()){
 return rows.reduce((sum,r)=>sum+Math.max(0,Math.min(now,r.checked_out_at?Date.parse(r.checked_out_at):now)-Math.max(start,Date.parse(r.checked_in_at))),0);
}
export function duration(ms){const s=Math.floor(Math.max(0,ms)/1000);return [Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(n=>String(n).padStart(2,'0')).join(':')}
export function financeData(state,calc){
 const invoices=(state.invoices||[]).filter(x=>!x.archivedAt),expenses=(state.expenses||[]).filter(x=>!x.archivedAt);
 const paid=invoices.filter(i=>i.status==='Paid').reduce((s,i)=>s+Number(calc(i).total||0),0),outstanding=invoices.filter(i=>!['Paid','Cancelled','Void','Draft'].includes(i.status)).reduce((s,i)=>s+Number(calc(i).total||0),0),costs=expenses.reduce((s,e)=>s+(Number(e.amount)||0),0);
 const categories={};expenses.forEach(e=>categories[e.category||'Other']=(categories[e.category||'Other']||0)+(Number(e.amount)||0));
 return {paid,outstanding,costs,net:paid-costs,categories,invoices,expenses};
}
