document.addEventListener('click',e=>{const target=e.target.closest?.('.navItem[data-view]');if(!target)return;document.querySelector('#workspaceV020')?.classList.remove('active');document.querySelector('#workspaceV021')?.classList.remove('active')},true);
if(!document.querySelector('link[data-qanteak-v021]')){const link=document.createElement('link');link.rel='stylesheet';link.href='./v021-roadmap.css?v=d88f7e7320f7';link.dataset.qanteakV021='1';document.head.append(link)}
import('./v021-roadmap.js?v=d88f7e7320f7').catch(err=>{console.error('Could not load Qanteak RC9 V0.21 workspace',err);window.qanteakDesktop?.reportRendererError?.({message:`V0.21 workspace load failed: ${err.message}`,stack:err.stack||''})});

const theme=document.createElement('link');theme.rel='stylesheet';theme.href='./v022-design.css?v=d88f7e7320f7';document.head.append(theme);

const theme23=document.createElement('link');theme23.rel='stylesheet';theme23.href='./v023-design.css?v=d88f7e7320f7';document.head.append(theme23);
