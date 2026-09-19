(() => {
'use strict';
// Public client configuration from the desktop app's committed .env.example.
// Never add a service-role key here. Authorization remains enforced by Supabase RLS.
const URL='https://xohzqpattqeoowadssep.supabase.co';
const KEY='sb_publishable_Zea_ustLC96qE3TURwemwg_OK6q56y3';
const form=document.querySelector('#auth-form');
const status=document.querySelector('#account-status');
function message(target,text,error=false){if(!target)return;target.textContent=text;target.className='form-message '+(error?'error':'success')}
if(!window.supabase){message(form?.querySelector('.form-message')||status,'Account services could not load. Please refresh and try again.',true);return}
const client=window.supabase.createClient(URL,KEY,{auth:{storageKey:'qanteak-web-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true},global:{fetch:(url,options={})=>fetch(url,{...options,signal:options.signal||AbortSignal.timeout(15000)})}});
window.qanteakAuth=client;
const confirmedFromEmail=new URLSearchParams(location.hash.slice(1)).get('type')==='signup';
const params=new URLSearchParams(location.search);
const plan=['basic','pro','teams'].includes(params.get('plan'))?params.get('plan'):null;
const billing=params.get('billing')==='annual'?'annual':'monthly';
const seats=plan==='teams'?Math.max(1,Math.min(100,Number(params.get('seats'))||1)):1;
const planQuery=plan?`?plan=${plan}&billing=${billing}&seats=${seats}`:'';
const accountDestination=plan?'checkout.html'+planQuery:'account.html';
const callback=new window.URL('account.html',location.href).href;
if(plan){
 const selected=document.querySelector('#selected-plan');
 if(selected)selected.textContent=`Selected plan: ${plan[0].toUpperCase()+plan.slice(1)} · ${billing==='annual'?'Yearly':'Monthly'}. No charge today.`;
 form?.querySelectorAll('a[href="login.html"],a[href="signup.html"]').forEach(link=>{link.href=link.getAttribute('href')+planQuery});
}
function friendly(error){const text=error?.message||'Something went wrong. Please try again.';if(/fetch|network|timeout|abort/i.test(text))return 'We could not reach the account service. Check your connection and try again.';if(error?.code==='email_address_not_authorized'||/email address not authorized/i.test(text))return 'We could not send your confirmation email. Email delivery is not available for this address yet. Please contact support.';if(/smtp|error sending|email delivery/i.test(text))return 'We could not send the email. Please try again later or contact support.';if(error?.code==='email_not_confirmed')return 'Please confirm your email before logging in. Use Resend confirmation email below if you need a new link.';if(/rate limit|too many/i.test(text))return 'Email or sign-in attempts are temporarily limited. Please wait before trying again.';return text}
const resendButton=document.querySelector('#resend-confirmation');
let resendReadyAt=0,resendTimer;
function startResendCooldown(){
 if(!resendButton)return;
 resendReadyAt=Date.now()+60000;clearInterval(resendTimer);
 function update(){const seconds=Math.max(0,Math.ceil((resendReadyAt-Date.now())/1000));resendButton.disabled=seconds>0;resendButton.textContent=seconds?`Resend in ${seconds}s`:'Resend confirmation email';if(!seconds)clearInterval(resendTimer)}
 update();resendTimer=setInterval(update,1000);
}
resendButton?.addEventListener('click',async()=>{
 const emailInput=form.querySelector('[name="email"]'),feedback=document.querySelector('#resend-message');
 if(!emailInput.reportValidity()||Date.now()<resendReadyAt)return;
 resendButton.disabled=true;message(feedback,'Requesting a new confirmation link…');
 try{
  const {error}=await client.auth.resend({type:'signup',email:emailInput.value.trim(),options:{emailRedirectTo:callback}});
  if(error)throw error;
  message(feedback,'If this address has an unconfirmed account, a new link has been requested. Check your inbox and spam folder. Already confirmed? Log in instead.');
  startResendCooldown();
 }catch(error){message(feedback,friendly(error),true);if(error?.status===429)startResendCooldown();else resendButton.disabled=false}
});
form?.addEventListener('submit',async e=>{
 e.preventDefault();const button=form.querySelector('button[type="submit"]'),feedback=form.querySelector('.form-message'),d=new FormData(form),mode=form.dataset.mode;button.disabled=true;message(feedback,'Connecting…');
 try{
  if(mode==='signup'){
   const {data,error}=await client.auth.signUp({email:d.get('email').trim(),password:d.get('password'),options:{emailRedirectTo:callback,data:{name:d.get('name').trim(),workspace_name:d.get('workspace').trim(),requested_plan:plan||'none',requested_billing:billing,requested_seats:seats}}});
   if(error)throw error;
   if(data.session){location.assign(accountDestination);return}
   message(feedback,'Check your inbox and spam folder for a confirmation link. If you already have an account, log in or reset your password. You can request another confirmation below.');startResendCooldown();form.querySelector('[name="password"]').value='';
  }else if(mode==='login'){
   const {error}=await client.auth.signInWithPassword({email:d.get('email').trim(),password:d.get('password')});if(error)throw error;location.assign(accountDestination);return;
  }else{
   const {error}=await client.auth.resetPasswordForEmail(d.get('email').trim(),{redirectTo:callback+'?recovery=1'});if(error)throw error;message(feedback,'If an account exists for this address, you will receive a password reset email.');
  }
 }catch(error){message(feedback,friendly(error),true)}finally{button.disabled=false}
});
let recovering=params.get('recovery')==='1'||new URLSearchParams(location.hash.slice(1)).get('type')==='recovery';
function showRecovery(){recovering=true;document.querySelector('#account-content')?.setAttribute('hidden','');document.querySelector('#recovery-section')?.removeAttribute('hidden');if(status)status.textContent='Choose a new password for your account.'}
function updateNavigation(session){
 document.querySelectorAll('.price-card a[href*="plan="]').forEach(link=>{
  const destination=new window.URL(link.href);
  destination.pathname=destination.pathname.replace(/[^/]+$/,'checkout.html');
  link.href=destination.href;
 });
 if(session&&form&&['signup','login'].includes(form.dataset.mode)){
  location.replace(accountDestination);return;
 }
 document.querySelectorAll('.login-link,.mobile-login').forEach(link=>{link.href=session?'account.html':'login.html';link.textContent=session?'My profile':'Log in'});
 const start=document.querySelector('.nav-actions .start-button');
 if(start){start.href=session?'account.html':'signup.html';start.textContent=session?'My account':'Start for free'}
}
let accountTimer;
client.auth.onAuthStateChange((event,session)=>{
 updateNavigation(session);
 if(event==='PASSWORD_RECOVERY')showRecovery();
 // Run account queries after the auth callback releases its session lock.
 if(status){clearTimeout(accountTimer);accountTimer=setTimeout(loadAccount,0)}
});
async function loadAccount(){
 if(!status)return;
 try{
  const hash=new URLSearchParams(location.hash.slice(1));if(hash.get('error_description')||params.get('error_description'))throw Error(hash.get('error_description')||params.get('error_description'));
  const {data:{session},error}=await client.auth.getSession();if(error)throw error;
  if(!session){document.querySelector('#account-content').hidden=true;document.querySelector('#recovery-section').hidden=true;status.textContent='Sign in to view your account and connected workspaces.';const a=document.createElement('a');a.href='login.html'+planQuery;a.className='button primary';a.textContent='Log in';status.append(document.createElement('br'),a);return}
  const {data:{user},error:userError}=await client.auth.getUser();if(userError)throw userError;
  if(recovering){showRecovery();return}
  const desiredPlan=plan||(confirmedFromEmail&&['basic','pro','teams'].includes(user.user_metadata?.requested_plan)?user.user_metadata.requested_plan:null);
  if(desiredPlan){const desiredBilling=plan?billing:user.user_metadata?.requested_billing==='annual'?'annual':'monthly';const desiredSeats=plan?seats:Math.max(1,Math.min(100,Number(user.user_metadata?.requested_seats)||1));location.replace(`checkout.html?plan=${desiredPlan}&billing=${desiredBilling}&seats=${desiredSeats}`);return}
  status.textContent='Your account, workspace access and next steps.';
  document.querySelector('#account-content').hidden=false;
  document.querySelector('#account-name').textContent=user.user_metadata?.name||'Your account';
  document.querySelector('#account-email').textContent=user.email;
  const results=await Promise.allSettled([
   client.from('q_workspaces').select('id,name').order('created_at',{ascending:true}),
   client.from('subscriptions').select('plan,status,current_period_end,test_mode').order('updated_at',{ascending:false}).limit(1)
  ]);
  const workspaces=results[0].status==='fulfilled'?results[0].value:null,subscription=results[1].status==='fulfilled'?results[1].value:null;
  const list=document.querySelector('#workspace-list');list.replaceChildren();
  if(!workspaces||workspaces.error){list.textContent='Workspaces could not be loaded. Please try again later.'}
  else if(workspaces.data.length){const ul=document.createElement('ul');workspaces.data.forEach(w=>{const li=document.createElement('li');li.textContent=w.name;ul.append(li)});list.append(ul)}
  else{list.textContent='No cloud workspace is linked yet. Sign in to the desktop app to set up or join your workspace.'}
  const sub=subscription?.data?.[0];
  if(!subscription||subscription.error){document.querySelector('#subscription-plan').textContent='Subscription unavailable';document.querySelector('#subscription-description').textContent='We could not load your access details. Please try again later.'}
  else{document.querySelector('#subscription-plan').textContent=sub?`${sub.plan} · ${sub.status}`:'No active subscription';document.querySelector('#subscription-description').textContent=sub?`${sub.test_mode?'Test subscription. ':''}${sub.current_period_end?'Current period ends '+new Date(sub.current_period_end).toLocaleDateString()+'.':'Access is managed by your subscription.'}`:'Your account is ready. PayPal checkout is in Sandbox testing; test subscriptions do not activate paid access.'}
 }catch(error){message(status,friendly(error),true)}
}
document.querySelector('#sign-out')?.addEventListener('click',async e=>{e.target.disabled=true;try{const {error}=await client.auth.signOut();if(error)throw error;location.replace('login.html')}catch(error){message(status,friendly(error),true);e.target.disabled=false}});
document.querySelector('#recovery-form')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,d=new FormData(f),feedback=f.querySelector('.form-message'),button=f.querySelector('button');if(d.get('password')!==d.get('confirm')){message(feedback,'The passwords do not match.',true);return}button.disabled=true;try{const {error}=await client.auth.updateUser({password:d.get('password')});if(error)throw error;message(feedback,'Your password has been updated. You can now sign in to Qanteak.');f.reset();await client.auth.signOut();const a=document.createElement('a');a.href='login.html';a.textContent='Continue to log in →';feedback.append(document.createElement('br'),a)}catch(error){message(feedback,friendly(error),true)}finally{button.disabled=false}});
client.auth.getSession().then(({data,error})=>{if(error){message(status,friendly(error),true);return}updateNavigation(data.session);if(status){clearTimeout(accountTimer);accountTimer=setTimeout(loadAccount,0)}}).catch(error=>message(status,friendly(error),true));
})();
