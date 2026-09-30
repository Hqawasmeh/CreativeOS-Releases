(() => {
'use strict';

const qs=(selector,root=document)=>root.querySelector(selector);
const qsa=(selector,root=document)=>[...root.querySelectorAll(selector)];

const callbackParams=new URLSearchParams(location.search);
const authHash=location.hash;
if (
  authHash.includes('access_token=') ||
  authHash.includes('error_description=') ||
  callbackParams.has('code') ||
  callbackParams.has('error_description')
) {
  if (!location.pathname.endsWith('account.html')) {
    location.replace('account.html'+location.search+location.hash);
    return;
  }
}

const menu=qs('.menu-toggle');
const navigation=qs('#navigation');
function setMenu(open){
  if(!menu||!navigation)return;
  menu.setAttribute('aria-expanded',String(open));
  menu.setAttribute('aria-label',open?'Close menu':'Open menu');
  navigation.classList.toggle('open',open);
  document.body.classList.toggle('menu-open',open);
}
menu?.addEventListener('click',()=>setMenu(menu.getAttribute('aria-expanded')!=='true'));
navigation?.addEventListener('click',event=>{
  if(event.target.closest('a'))setMenu(false);
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape')setMenu(false);
});
addEventListener('resize',()=>{
  if(innerWidth>850)setMenu(false);
},{passive:true});

qsa('[data-billing]').forEach(button=>button.addEventListener('click',()=>{
  const annual=button.dataset.billing==='annual';
  qsa('[data-billing]').forEach(item=>{
    const active=item===button;
    item.classList.toggle('active',active);
    item.setAttribute('aria-pressed',String(active));
  });

  qsa('.price-card').forEach(card=>{
    const price=Number(card.dataset[annual?'annual':'monthly']);
    const priceNode=qs('.price strong',card);
    if(priceNode)priceNode.textContent='$'+price;

    const seat=qs('.price>span',card)?.textContent.includes('seat')||false;
    const free=card.dataset.free==='true';
    const note=qs('.billing-note',card);
    if(note){
      note.textContent=free
        ? 'Free forever'
        : annual
          ? '$'+(price*12)+(seat?' per seat':'')+' billed yearly'
          : 'Billed monthly';
    }

    const link=qs('a[href]',card);
    if(!free&&link){
      const url=new URL(link.href,location.href);
      url.searchParams.set('billing',annual?'annual':'monthly');
      link.href=url.href;
    }
  });
}));

qsa('.show-password').forEach(button=>button.addEventListener('click',()=>{
  const input=button.previousElementSibling;
  if(!(input instanceof HTMLInputElement))return;
  const show=input.type==='password';
  input.type=show?'text':'password';
  button.textContent=show?'Hide':'Show';
  button.setAttribute('aria-label',show?'Hide password':'Show password');
}));

const contact=qs('#contact-form');
contact?.addEventListener('submit',event=>{
  event.preventDefault();
  if(!contact.reportValidity())return;
  const data=new FormData(contact);
  const subject='Qanteak: '+data.get('topic');
  const body='Name: '+data.get('name')+'\nEmail: '+data.get('email')+'\n\n'+data.get('message');
  location.href='mailto:hamza.workjo@gmail.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
  const message=qs('.form-message',contact);
  if(message)message.textContent='Your email draft is ready. If your email app did not open, email hamza.workjo@gmail.com.';
});

if('IntersectionObserver' in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('reveal');
        observer.unobserve(entry.target);
      }
    });
  },{threshold:.08,rootMargin:'0px 0px -3% 0px'});
  qsa('.section-heading,.bento-card,.feature-detail,.solution-section,.closing,.problem-card,.system-step,.trust-card,.resource-card').forEach(el=>{
    el.classList.add('reveal-ready');
    observer.observe(el);
  });
}

const downloadLinks=qsa('a[href*="/releases/download/"]');
if(downloadLinks.length){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),8000);
  fetch('https://api.github.com/repos/Hqawasmeh/CreativeOS-Releases/releases?per_page=30',{signal:controller.signal})
    .then(response=>{
      if(!response.ok)throw Error('release lookup failed');
      return response.json();
    })
    .then(releases=>{
      const latest=releases
        .filter(release=>!release.draft&&release.assets?.some(asset=>/^QanteakOS-Setup-.*\.exe$/i.test(asset.name)))
        .sort((a,b)=>new Date(b.published_at)-new Date(a.published_at))[0];
      const asset=latest?.assets.find(item=>/^QanteakOS-Setup-.*\.exe$/i.test(item.name));
      if(!asset||!asset.browser_download_url.startsWith('https://github.com/Hqawasmeh/CreativeOS-Releases/releases/download/'))return;
      downloadLinks.forEach(link=>{link.href=asset.browser_download_url});
      const label=qs('#release-info');
      if(label)label.textContent=latest.name||latest.tag_name;
    })
    .catch(()=>{})
    .finally(()=>clearTimeout(timeout));
}

qsa('a[target="_blank"]').forEach(link=>{
  const rel=new Set((link.getAttribute('rel')||'').split(/\s+/).filter(Boolean));
  rel.add('noopener');
  rel.add('noreferrer');
  link.setAttribute('rel',[...rel].join(' '));
});
})();
