// Synthetic interaction fixture only. Not included in the packaged desktop app.
// No authentication, payment, network or live workspace calls are made here.
(() => {
const store=window.localStorage;
const today=new Date().toISOString().slice(0,10);
const fixtureKey='qanteak.v022.preview.snapshot';
const initial={projects:[{id:'demo-p1',name:'Studio website',client:'North Studio',status:'In progress',progress:65,due:today,description:'A thoughtful new home for the studio.'},{id:'demo-p2',name:'Autumn collection',client:'Forma',status:'Client review',progress:82,due:today},{id:'demo-p3',name:'Brand guidelines',client:'Arc',status:'Planning',progress:24,due:today}],tasks:[{id:'demo-t1',title:'Review the homepage direction',project:'Studio website',date:today,due:today,done:false},{id:'demo-t2',title:'Share the first collection edits',project:'Autumn collection',date:today,due:today,done:false},{id:'demo-t3',title:'Outline the brand story',project:'Brand guidelines',date:today,due:today,done:false},{id:'demo-t4',title:'Organize reference images',project:'Studio website',done:true}],clients:[{id:'demo-c1',name:'North Studio',company:'North Studio',email:'studio@example.test',relationship:'Active client',value:4800,outstanding:1200}],reviews:[{id:'demo-r1',name:'Collection edits',client:'Forma',project:'Autumn collection',status:'Waiting',due:today}],documents:[{id:'demo-d1',title:'Website creative brief',project:'Studio website',client:'North Studio',type:'doc',updated:'Today',body:'<h2>A thoughtful new direction</h2><p>Make the studio’s work easy to explore, with a clear story and a quieter visual language.</p>'}],invoices:[{id:'demo-i1',number:'INV-021',client:'North Studio',project:'Studio website',amount:4800,status:'Paid',due:today}],files:[],leads:[],expenses:[],estimates:[],automations:[],notifications:[],members:[]};
let snapshot=JSON.parse(store.getItem(fixtureKey)||'null')||initial;
let platform=JSON.parse(store.getItem('qanteak.v022.preview.studio')||'null')||{};
const user={id:'preview-user',email:'preview@example.test',user_metadata:{name:'Alex Morgan'}};
window.qanteakDesktop={
 getVersion:async()=>window.QANTEAK_RELEASE.version,on:()=>{},reportRendererError:console.error,
 backendStatus:async()=>({configured:true,session:{user},backend:'Synthetic preview'}),backendEntitlement:async()=>({allowed:true,provider:'internal_qa',status:'active'}),
 backendWorkspaces:async()=>[{id:'preview-workspace',name:'Design studio · Preview'}],backendMembers:async()=>[{user_id:user.id,role:'Owner',access:['Everything'],name:'Alex Morgan',email:user.email}],backendInvites:async()=>[],backendBackups:async()=>[],backendStartRealtime:async()=>({ok:true}),backendConnectivity:async()=>({online:true,latencyMs:1}),backendDriveStatus:async()=>({configured:false}),
 backendGetUserSettings:async()=>({preferences:{onboardingComplete:true}}),backendSaveUserSettings:async()=>({}),backendPull:async()=>({snapshot,revision:1}),backendPush:async(_id,next)=>{snapshot=next;store.setItem(fixtureKey,JSON.stringify(next));return{revision:2}},
 getSecurityStatus:async()=>({signatureStatus:'Preview',secureStorage:false}),platformLoad:async()=>platform,platformSave:async next=>{platform=next;store.setItem('qanteak.v022.preview.studio',JSON.stringify(next));return next},platformApiStatus:async()=>({enabled:false}),
 backendSignOut:async()=>location.reload(),checkForUpdates:async()=>({message:'Updates are available in the installed desktop app.'}),pickFiles:async()=>[]
};
const notice=document.createElement('div');notice.textContent='DESIGN PREVIEW · Synthetic data · Changes stay in this browser';notice.style.cssText='position:fixed;bottom:8px;left:50%;transform:translateX(-50%);z-index:150;background:#17233b;color:white;border-radius:8px;padding:6px 12px;font:11px Segoe UI,sans-serif;pointer-events:none;white-space:nowrap';document.body.append(notice);
})();
// Synthetic V0.23 collaboration adapter. No live users or messages.
(() => {
const key='qanteak.v023.preview.collaboration';
let data=JSON.parse(localStorage.getItem(key)||'null')||{members:[{id:'preview-user',name:'Alex Morgan',role:'owner'},{id:'preview-teammate',name:'Sam Parker',role:'editor'},{id:'preview-designer',name:'Jordan Lee',role:'editor'}],rooms:[{id:'preview-room',kind:'group',title:'Creative team',created_by:'preview-user',member_ids:['preview-user','preview-teammate'],preview:'The brief is ready for review.',unread:1}],messages:{'preview-room':[{id:1,room_id:'preview-room',sender_id:'preview-teammate',body:'The brief is ready for review. Let’s keep feedback here so everyone has the same context.',created_at:new Date().toISOString()}]},attendance:[],reminders:[],positions:{}};
const persist=()=>localStorage.setItem(key,JSON.stringify(data));
window.qanteakDesktop.notifyReminder=async()=>({shown:false});
window.qanteakDesktop.collaboration=async(w,action,p={})=>{
 if(action==='bootstrap')return structuredClone(data);
 if(action==='messages')return structuredClone(data.messages[p.room_id]||[]);
 if(action==='room.read'){const r=data.rooms.find(r=>r.id===p.room_id);if(r)r.unread=0;persist();return []}
 if(action==='room.create'){const id=crypto.randomUUID();data.rooms.unshift({id,kind:p.kind,title:p.title,member_ids:['preview-user',...p.members],unread:0});persist();return{id}}
 if(action==='message.send'){const list=data.messages[p.room_id]||=[];if(!list.some(m=>m.request_id===p.request_id))list.push({id:Date.now(),room_id:p.room_id,sender_id:'preview-user',body:p.body,request_id:p.request_id,created_at:new Date().toISOString()});data.rooms.find(r=>r.id===p.room_id).preview=p.body;persist();return structuredClone(list)}
 if(action==='attendance.in'&&!data.attendance.some(r=>!r.checked_out_at))data.attendance.unshift({id:crypto.randomUUID(),checked_in_at:new Date().toISOString(),checked_out_at:null});
 if(action==='attendance.out')data.attendance.filter(r=>!r.checked_out_at).forEach(r=>r.checked_out_at=new Date().toISOString());
 if(action==='attendance.team')return data.attendance.map(r=>({...r,name:'Alex Morgan'}));
 if(action==='reminder.save'){if(p.id){Object.assign(data.reminders.find(r=>r.id===p.id),p);data.reminders=data.reminders.filter(r=>!r.done)}else data.reminders.push({id:crypto.randomUUID(),...p});data.reminders.sort((a,b)=>a.due_at.localeCompare(b.due_at));}
 if(action==='reminder.delete')data.reminders=data.reminders.filter(r=>r.id!==p.id);
 if(action==='layout.save')data.positions=structuredClone(p.positions);
 persist();return {ok:true};
};
})();
