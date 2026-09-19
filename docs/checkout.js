(() => {
'use strict';
const client=window.qanteakAuth;
const endpoint='https://xohzqpattqeoowadssep.supabase.co/functions/v1/qanteak-paypal';
const key='sb_publishable_Zea_ustLC96qE3TURwemwg_OK6q56y3';
const $=id=>document.getElementById(id);
const isCheckout=!!$('checkout');
const params=new URLSearchParams(location.search);
const plan=params.get('plan'),billing=params.get('billing')==='annual'?'annual':'monthly';
const names={basic:'Basic',pro:'Pro',teams:'Teams'};
const descriptions={basic:'The essentials for independent work.',pro:'More room for your growing business.',teams:'One connected workspace for your team.'};
let seats=plan==='teams'?Math.max(1,Math.min(100,Math.floor(Number(params.get('seats'))||1))):1;
let config=null,session=null,busy=false,existing=null,generation=0;
const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(value);
const query=()=>new URLSearchParams({plan,billing,seats:String(seats)}).toString();
function feedback(text,error=false){if($('checkout-feedback')){$('checkout-feedback').textContent=text;$('checkout-feedback').className='form-message '+(error?'error':'success')}}
function errorMessage(error){return /fetch|network|timeout|abort/i.test(error.message)?'We could not reach the payment service. Please try again.':error.message}
async function request(action,extra={}){
 const {data,error}=await client.auth.getSession();if(error)throw error;
 if(!data.session)throw Error('Please log in to continue.');
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',apikey:key,Authorization:'Bearer '+data.session.access_token},body:JSON.stringify({action,...extra}),signal:AbortSignal.timeout(60000)});
 const result=await response.json();if(!response.ok)throw Error(result.error||'Payment services are unavailable.');return result;
}
function renderSummary(){
 if(!isCheckout||!Object.hasOwn(names,plan))return;
 $('checkout-plan').textContent='Qanteak '+names[plan];$('checkout-description').textContent=descriptions[plan];
 $('checkout-seats-label').hidden=plan!=='teams';$('checkout-seats').value=seats;
 $('checkout-login').href='login.html?'+query();$('checkout-signup').href='signup.html?'+query();
 if(config){const total=config.prices[plan][billing]*seats;$('checkout-price').textContent=money(total);$('checkout-period').textContent=billing==='annual'?'/year':'/month';$('checkout-renewal').textContent=`${plan==='teams'?seats+' seat'+(seats===1?'':'s')+' · ':''}${money(total)} USD billed ${billing==='annual'?'yearly':'monthly'}. Renews at this amount until cancelled. Sandbox funds only.`}
}
function buttons(){if(!isCheckout)return;const locked=existing&&['ACTIVE','APPROVED','SUSPENDED'].includes(existing.status);$('paypal-continue').disabled=busy||!session||!config?.ready||!Object.hasOwn(names,plan)||!!locked;$('checkout-seats').disabled=busy||!!existing;$('checkout-refresh').disabled=busy;$('paypal-continue').textContent=busy?'Connecting…':existing?.approval_url?'Continue test checkout →':'Continue with PayPal →'}
function renderStatus(row){
 existing=row;
 if(isCheckout){
  $('checkout-refresh').hidden=!row;
  if(row){
   if(row.status==='ACTIVE')feedback('Your test subscription is active in PayPal. '+(row.last_payment_time?'A Sandbox payment has been recorded. ':'')+'No real money was charged and paid workspace access is not activated.');
   else if(row.status==='APPROVED')feedback('PayPal approved the test subscription. Activation is still processing. Check payment status again shortly.');
   else if(row.status==='SUSPENDED')feedback('Your test subscription is suspended. Manage it in PayPal from My account.',true);
   else if(['CANCELLED','EXPIRED'].includes(row.status)){existing=null;feedback('Your previous test subscription has ended. You can start a new checkout.');}
   else if(params.get('payment')==='cancel')feedback('You left PayPal before finishing approval. Continue when you are ready.');
   else feedback('Your test checkout is waiting for PayPal approval.');
   if(existing&&(row.plan!==plan||row.billing!==billing||row.seats!==seats))feedback('You have another checkout in progress. Open My account to continue or manage that subscription.',true);
  }else feedback(session?'Ready for Sandbox checkout.':'Log in or create your Qanteak account to continue.');
  buttons();
 }else{
  const panel=$('sandbox-subscription');if(!panel)return;panel.hidden=!row;if(!row)return;
  const statusText=row.status.toLowerCase().replaceAll('_',' ');
  $('sandbox-status').textContent=`Qanteak ${names[row.plan]||row.plan} · ${row.billing==='annual'?'Yearly':'Monthly'}${row.plan==='teams'?' · '+row.seats+' seats':''} · ${statusText}. ${row.last_payment_time?'Sandbox payment recorded. ':''}This test does not activate paid access.`;
  const link=$('sandbox-continue');link.hidden=!['CREATING','APPROVAL_PENDING'].includes(row.status);link.href='checkout.html?'+new URLSearchParams({plan:row.plan,billing:row.billing,seats:row.seats});
 }
}
async function checkStatus(){
 busy=true;buttons();
 try{const result=await request('status');renderStatus(result.checkout)}catch(error){if(isCheckout)feedback(errorMessage(error),true);else if($('sandbox-subscription')){$('sandbox-subscription').hidden=false;$('sandbox-status').textContent='Test subscription status is temporarily unavailable. Please refresh to try again.'}}finally{busy=false;buttons()}
}
async function initialize(){
 const run=++generation;
 try{
  const {data,error}=await client.auth.getSession();if(error)throw error;if(run!==generation)return;session=data.session;
  if(isCheckout){$('checkout-identity').textContent=session?'Signed in as '+session.user.email:'Use your Qanteak account to keep your plan and payment connected.';$('checkout-auth').hidden=!!session;
   if(!Object.hasOwn(names,plan)){feedback('Choose a plan on the pricing page to start checkout.',true);$('checkout-price').textContent='Select a plan';buttons();return}
   if(!config){const response=await fetch(endpoint,{headers:{apikey:key},signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Checkout is temporarily unavailable. Please refresh to try again.');config=await response.json()}
   renderSummary();buttons();if(!config.ready){feedback('Checkout is being configured. Please try again shortly.',true);return}
  }
  if(session)await checkStatus();else renderStatus(null);
 }catch(error){feedback(errorMessage(error),true);if(isCheckout)$('checkout-identity').textContent='Please refresh to reconnect your account.'}
}
if(!client){feedback('Account services could not load. Please refresh the page.',true);return}
$('checkout-seats')?.addEventListener('change',()=>{const input=$('checkout-seats');if(!input.reportValidity()){$('paypal-continue').disabled=true;return}seats=Number(input.value);history.replaceState(null,'','checkout.html?'+query());renderSummary();buttons()});
$('paypal-continue')?.addEventListener('click',async()=>{
 if(busy||!$('checkout-seats').reportValidity())return;busy=true;buttons();feedback('Preparing your secure PayPal test checkout…');
 try{const result=await request('create',{plan,billing,seats});renderStatus(result.checkout);if(result.approval_url){const url=new URL(result.approval_url);if(url.protocol!=='https:'||url.hostname!=='www.sandbox.paypal.com')throw Error('PayPal returned an unexpected checkout address.');location.assign(url.href)}}catch(error){feedback(errorMessage(error),true)}finally{busy=false;buttons()}
});
$('checkout-refresh')?.addEventListener('click',checkStatus);
client.auth.onAuthStateChange(event=>{if(['SIGNED_IN','SIGNED_OUT'].includes(event))setTimeout(initialize,0)});
initialize();
})();
