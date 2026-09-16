(() => {
'use strict';
// Supabase can return email confirmation links to the configured site root.
if (location.hash.includes('access_token=') || location.hash.includes('error_description=')) {
 if (!location.pathname.endsWith('account.html')) { location.replace('account.html'+location.hash); return; }
}
const menu=document.querySelector('.menu-toggle'),navigation=document.querySelector('#navigation');
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close menu':'Open menu');navigation.classList.toggle('open',open)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){navigation?.classList.remove('open');menu?.setAttribute('aria-expanded','false')}});
document.querySelectorAll('[data-billing]').forEach(button=>button.addEventListener('click',()=>{
 const annual=button.dataset.billing==='annual';
 document.querySelectorAll('[data-billing]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button))});
 document.querySelectorAll('.price-card').forEach(card=>{const price=Number(card.dataset[annual?'annual':'monthly']);card.querySelector('.price strong').textContent='$'+price;const seat=card.querySelector('.price>span').textContent.includes('seat');card.querySelector('.billing-note').textContent=annual?`$${price*12}${seat?' per seat':''} billed yearly`:'Billed monthly';const link=card.querySelector('a');const url=new URL(link.href);url.searchParams.set('billing',annual?'annual':'monthly');link.href=url.href});
}));
document.querySelectorAll('.show-password').forEach(b=>b.addEventListener('click',()=>{const input=b.previousElementSibling;const show=input.type==='password';input.type=show?'text':'password';b.textContent=show?'Hide':'Show';b.setAttribute('aria-label',show?'Hide password':'Show password')}));
// Contact address is taken from the existing published policy, not invented.
const contact=document.querySelector('#contact-form');
contact?.addEventListener('submit',e=>{e.preventDefault();const d=new FormData(contact);const subject=`Qanteak: ${d.get('topic')}`;const body=`Name: ${d.get('name')}\nEmail: ${d.get('email')}\n\n${d.get('message')}`;location.href=`mailto:hamza.workjo@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;contact.querySelector('.form-message').textContent='Your email draft is ready. If your email app did not open, email hamza.workjo@gmail.com.'});
if('IntersectionObserver' in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('reveal');observer.unobserve(entry.target)}}),{threshold:.08});document.querySelectorAll('.section-heading,.bento-card,.feature-detail,.solution-section,.closing').forEach(el=>observer.observe(el))}
const downloadLinks=[...document.querySelectorAll('a[href*="/releases/download/"]')];
if(downloadLinks.length){fetch('https://api.github.com/repos/Hqawasmeh/CreativeOS-Releases/releases?per_page=30',{signal:AbortSignal.timeout(8000)}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(releases=>{const choices=releases.filter(r=>!r.draft&&r.assets?.some(a=>/^QanteakOS-Setup-.*\.exe$/i.test(a.name))).sort((a,b)=>new Date(b.published_at)-new Date(a.published_at));const latest=choices[0],asset=latest?.assets.find(a=>/^QanteakOS-Setup-.*\.exe$/i.test(a.name));if(!asset||!asset.browser_download_url.startsWith('https://github.com/Hqawasmeh/CreativeOS-Releases/releases/download/'))return;downloadLinks.forEach(a=>a.href=asset.browser_download_url);const label=document.querySelector('#release-info');if(label)label.textContent=`${latest.tag_name} · ${latest.prerelease?'Preview release':'Release'}`}).catch(()=>{})}
})();
