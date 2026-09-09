from pathlib import Path
p=Path(__file__).resolve().parents[1]/'src/app.js'
s=p.read_text()

if 'function canViewAppView(' not in s:
    old="function navigate(view){closeAll();render(view)}"
    new="function canViewAppView(view){if(!backendState?.session)return true;if(view==='home'||view==='settings'||view==='automations')return true;if(view==='clients')return accessAllows('clients','view');if(view==='documents')return accessAllows('documents','view');if(view==='files')return accessAllows('files','view');if(view==='business')return accessAllows('business','view');if(view==='work')return accessAllows('projects','view')||accessAllows('tasks','view')||accessAllows('reviews','view');return true}\nfunction navigate(view){if(!canViewAppView(view)){toast('Access restricted','This area is not included in your workspace permissions.');return}closeAll();render(view)}"
    if old not in s: raise SystemExit('navigate insertion point missing')
    s=s.replace(old,new,1)

old="function render(view=state.view){if(!renderers[view]||!meta[view])view='home';state.view=view;const [t,s]=meta[view];$('#pageTitle').textContent=t;$('#pageSubtitle').textContent=s;$('#aiContext').textContent=`Context: ${t}`;$('#content').innerHTML=renderers[view]();$$('.navItem[data-view]').forEach(n=>n.classList.toggle('active',n.dataset.view===view));bindContent();save();if(innerWidth<821){$('#sidebar').classList.remove('mobileOpen');setScrim(false)}}"
new="function render(view=state.view){if(!renderers[view]||!meta[view])view='home';if(backendState?.session&&!canViewAppView(view))view='home';state.view=view;const [t,s]=meta[view];$('#pageTitle').textContent=t;$('#pageSubtitle').textContent=s;$('#aiContext').textContent=`Context: ${t}`;$('#content').innerHTML=renderers[view]();$$('.navItem[data-view]').forEach(n=>{const allowed=canViewAppView(n.dataset.view);n.hidden=!allowed;n.classList.toggle('active',n.dataset.view===view)});bindContent();save();if(innerWidth<821){$('#sidebar').classList.remove('mobileOpen');setScrim(false)}}"
if old in s: s=s.replace(old,new,1)

s=s.replace("m.role==='Editor'?'selected':''", "String(m.role||'').toLowerCase()==='editor'?'selected':''")
s=s.replace("m.role==='Admin'?'selected':''", "String(m.role||'').toLowerCase()==='admin'?'selected':''")
s=s.replace("m.role==='Viewer'?'selected':''", "String(m.role||'').toLowerCase()==='viewer'?'selected':''")

# Hide create buttons for denied modules after each content bind as a second UI layer.
needle="function bindContent(){"
if 'data-permission-hidden' not in s and needle in s:
    s=s.replace(needle, needle+"setTimeout(()=>{$$('[data-create]').forEach(b=>{const map={task:'tasks',project:'projects',review:'reviews',client:'clients',document:'documents',note:'documents',sheet:'documents',slide:'documents',invoice:'business',expense:'business',automation:'business'};const mod=map[b.dataset.create];if(mod&&!accessAllows(mod,'create')){b.hidden=true;b.dataset.permissionHidden='1'}})},0);",1)

p.write_text(s)
print('V0.14 UI permission visibility hardening applied')
