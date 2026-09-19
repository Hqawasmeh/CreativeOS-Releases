// Sandbox only. All privileged writes stay here; paid entitlements are untouched.
const SITE='https://hqawasmeh.github.io/CreativeOS-Releases/';
const ORIGIN='https://hqawasmeh.github.io';
const API='https://api-m.sandbox.paypal.com';
const PRICES={basic:{monthly:18,annual:180},pro:{monthly:29,annual:288},teams:{monthly:38,annual:384}};
const CORS={'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin'};
class HttpError extends Error {constructor(status,message){super(message);this.status=status}}
const env=(name)=>Deno.env.get(name)?.trim()||'';
const secretKeys=()=>[...Object.values(JSON.parse(env('SUPABASE_SECRET_KEYS')||'{}')),env('SUPABASE_SERVICE_ROLE_KEY')].filter(Boolean);
const dbKey=()=>secretKeys()[0];
let token='',expires=0;
async function paypalToken(){
 if(env('PAYPAL_ENV')!=='sandbox')throw new HttpError(503,'Only Sandbox testing is enabled.');
 if(token&&Date.now()<expires)return token;
 const id=env('PAYPAL_CLIENT_ID'),secret=env('PAYPAL_CLIENT_SECRET');
 if(!id||!secret)throw new HttpError(503,'PayPal credentials are not configured.');
 const r=await fetch(API+'/v1/oauth2/token',{method:'POST',headers:{Authorization:'Basic '+btoa(id+':'+secret),'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials',signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw new HttpError(502,'PayPal did not accept the Sandbox credentials.');
 const data=await r.json();token=data.access_token;expires=Date.now()+Math.min(data.expires_in-60,3000)*1000;return token;
}
async function pp(path,method='GET',body=undefined,requestId=undefined){
 const headers={Authorization:'Bearer '+await paypalToken(),'Content-Type':'application/json',Prefer:'return=representation'};
 if(requestId)headers['PayPal-Request-Id']=requestId;
 const r=await fetch(API+path,{method,headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
 if(!r.ok){const d=await r.json().catch(()=>({}));console.error('PayPal request failed',r.status,d.name,d.debug_id);throw new HttpError(502,'PayPal could not complete this request. Please try again.');}
 return r.status===204?{}:r.json();
}
async function db(path,method='GET',body=undefined,prefer='return=representation'){
 const key=dbKey();const headers={apikey:key,'Content-Type':'application/json',Prefer:prefer};
 if(key.startsWith('eyJ'))headers.Authorization='Bearer '+key;
 const r=await fetch(env('SUPABASE_URL')+'/rest/v1/'+path,{method,headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
 if(!r.ok){if(r.status===409)throw new HttpError(409,'A checkout is already in progress. Please refresh and continue it.');console.error('Payment database request failed',r.status);throw new HttpError(503,'Payment status could not be saved. Please retry.');}
 return r.status===204?[]:r.json();
}
async function config(key){return (await db('paypal_sandbox_config?key=eq.'+encodeURIComponent(key)))[0]?.value;}
async function saveConfig(key,value){await db('paypal_sandbox_config?on_conflict=key','POST',{key,value,updated_at:new Date().toISOString()},'resolution=merge-duplicates,return=representation');}
async function userFor(req){
 const authorization=req.headers.get('Authorization')||'';
 if(!authorization.startsWith('Bearer '))throw new HttpError(401,'Please log in to continue.');
 const key=Object.values(JSON.parse(env('SUPABASE_PUBLISHABLE_KEYS')||'{}'))[0]||env('SUPABASE_ANON_KEY');
 const r=await fetch(env('SUPABASE_URL')+'/auth/v1/user',{headers:{Authorization:authorization,apikey:key},signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw new HttpError(401,'Your session expired. Please log in again.');
 const user=await r.json();if(!user.email_confirmed_at)throw new HttpError(403,'Please confirm your email first.');return user;
}
function isAdmin(req){const provided=req.headers.get('apikey')||req.headers.get('Authorization')?.replace(/^Bearer /,'');return !!provided&&secretKeys().includes(provided);}
function selection(input){
 const {plan,billing}=input;const seats=Number(input.seats??1);
 if(!Object.hasOwn(PRICES,plan)||!['monthly','annual'].includes(billing)||!Number.isInteger(seats)||seats<1||seats>100||(plan!=='teams'&&seats!==1))throw new HttpError(400,'Choose a valid plan, billing period and seat count.');
 return {plan,billing,seats};
}
function approvalURL(value){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='www.sandbox.paypal.com'?u.href:null}catch{return null}}
async function setup(){
 await paypalToken();
 let product=await config('product');
 if(!product){product=await pp('/v1/catalogs/products','POST',{name:'Qanteak OS',type:'SERVICE',category:'SOFTWARE',description:'Connected workspace subscriptions',home_url:SITE},'qanteak-sandbox-product-v1');await saveConfig('product',{id:product.id});}
 for(const [plan,rates] of Object.entries(PRICES))for(const [billing,price] of Object.entries(rates)){
  const key=plan+'_'+billing;if(await config(key))continue;
  const p=await pp('/v1/billing/plans','POST',{product_id:product.id,name:`Qanteak ${plan} ${billing}`,status:'ACTIVE',quantity_supported:plan==='teams',billing_cycles:[{frequency:{interval_unit:billing==='annual'?'YEAR':'MONTH',interval_count:1},tenure_type:'REGULAR',sequence:1,total_cycles:0,pricing_scheme:{fixed_price:{value:price.toFixed(2),currency_code:'USD'}}}],payment_preferences:{auto_bill_outstanding:true,payment_failure_threshold:1}},'qt-sandbox-'+key+'-v1');
  await saveConfig(key,{id:p.id,price,currency:'USD'});
 }
 const webhookURL=env('SUPABASE_URL')+'/functions/v1/qanteak-paypal/webhook';
 let webhook=await config('webhook');
 if(!webhook){const existing=await pp('/v1/notifications/webhooks');webhook=existing.webhooks?.find(w=>w.url===webhookURL);if(!webhook)webhook=await pp('/v1/notifications/webhooks','POST',{url:webhookURL,event_types:['BILLING.SUBSCRIPTION.ACTIVATED','BILLING.SUBSCRIPTION.CANCELLED','BILLING.SUBSCRIPTION.EXPIRED','BILLING.SUBSCRIPTION.SUSPENDED','BILLING.SUBSCRIPTION.UPDATED','BILLING.SUBSCRIPTION.PAYMENT.FAILED','PAYMENT.SALE.COMPLETED','PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED'].map(name=>({name}))});await saveConfig('webhook',{id:webhook.id});}
 await saveConfig('ready',true);return {ready:true,environment:'sandbox',plans:6,webhook_registered:true};
}
async function refresh(row){
 if(!row.provider_id)return row;
 const started=new Date().toISOString();
 const current=await pp('/v1/billing/subscriptions/'+encodeURIComponent(row.provider_id));
 const expected=await config(row.plan+'_'+row.billing);
 if(current.plan_id!==expected?.id||current.custom_id!==row.id||Number(current.quantity||1)!==row.seats)throw new HttpError(409,'The PayPal subscription does not match this checkout.');
 const patch={status:current.status,approval_url:approvalURL(current.links?.find(l=>l.rel==='approve')?.href),next_billing_time:current.billing_info?.next_billing_time||null,last_payment_time:current.billing_info?.last_payment?.time||null,updated_at:started};
 const changed=await db('paypal_sandbox_checkouts?id=eq.'+row.id+'&updated_at=lte.'+encodeURIComponent(started),'PATCH',patch);
 return changed[0]||row;
}
async function openCheckout(user,input){
 const selected=selection(input);
 if(!await config('ready'))throw new HttpError(503,'Checkout is being configured. Please try again shortly.');
 let row=(await db('paypal_sandbox_checkouts?user_id=eq.'+user.id+'&status=not.in.(CANCELLED,EXPIRED)&limit=1'))[0];
 if(row){row=await refresh(row);if(['CANCELLED','EXPIRED'].includes(row.status))row=null;}
 if(row&&(row.plan!==selected.plan||row.billing!==selected.billing||row.seats!==selected.seats))throw new HttpError(409,'You already have a different checkout in progress. Open My account to continue or manage it.');
 if(row?.provider_id)return {checkout:row,approval_url:row.approval_url};
 if(!row)row=(await db('paypal_sandbox_checkouts','POST',{user_id:user.id,...selected}))[0];
 // Never retry creation past PayPal's 72-hour idempotency window without manual reconciliation.
 if(Date.now()-new Date(row.created_at).getTime()>70*3600000)throw new HttpError(409,'This checkout needs review. Please contact support before starting another.');
 const plan=await config(row.plan+'_'+row.billing);
 const query=`plan=${row.plan}&billing=${row.billing}&seats=${row.seats}`;
 const created=await pp('/v1/billing/subscriptions','POST',{plan_id:plan.id,quantity:String(row.seats),custom_id:row.id,application_context:{brand_name:'Qanteak OS',shipping_preference:'NO_SHIPPING',user_action:'SUBSCRIBE_NOW',return_url:SITE+'checkout.html?'+query+'&payment=return',cancel_url:SITE+'checkout.html?'+query+'&payment=cancel'}},row.id);
 const patch={provider_id:created.id,status:created.status,approval_url:approvalURL(created.links?.find(l=>l.rel==='approve')?.href),updated_at:new Date().toISOString()};
 row=(await db('paypal_sandbox_checkouts?id=eq.'+row.id,'PATCH',patch))[0];return {checkout:row,approval_url:row.approval_url};
}
async function webhook(req){
 const registered=await config('webhook');if(!registered)throw new HttpError(503,'Webhook is not configured.');
 const headers=['paypal-transmission-id','paypal-transmission-time','paypal-transmission-sig','paypal-cert-url','paypal-auth-algo'];
 if(headers.some(h=>!req.headers.get(h)))throw new HttpError(401,'Missing webhook signature.');
 const event=await req.json();
 const verified=await pp('/v1/notifications/verify-webhook-signature','POST',{transmission_id:req.headers.get(headers[0]),transmission_time:req.headers.get(headers[1]),transmission_sig:req.headers.get(headers[2]),cert_url:req.headers.get(headers[3]),auth_algo:req.headers.get(headers[4]),webhook_id:registered.id,webhook_event:event});
 if(verified.verification_status!=='SUCCESS')throw new HttpError(401,'Invalid webhook signature.');
 const id=event.resource?.billing_agreement_id||(event.event_type?.startsWith('BILLING.SUBSCRIPTION.')?event.resource?.id:null);
 if(id&&/^I-[A-Z0-9]+$/.test(id)){const row=(await db('paypal_sandbox_checkouts?provider_id=eq.'+encodeURIComponent(id)))[0];if(row)await refresh(row);}
 return {received:true};
}
async function handler(req){
 const respond=(data,status=200)=>Response.json(data,{status,headers:{...CORS,'Cache-Control':'no-store'}});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:CORS});
 try{
  if(env('PAYPAL_ENV')!=='sandbox')throw new HttpError(503,'Only Sandbox testing is enabled.');
  if(req.method==='GET')return respond({environment:'sandbox',ready:!!await config('ready'),prices:PRICES,currency:'USD'});
  if(req.method!=='POST')throw new HttpError(405,'Method not allowed.');
  if(new URL(req.url).pathname.endsWith('/webhook'))return respond(await webhook(req));
  const input=await req.json().catch(()=>{throw new HttpError(400,'Invalid request.');});
  if(isAdmin(req)){
   if(input.action==='setup')return respond(await setup());
   await paypalToken();return respond({ready:true,environment:'sandbox',provider_status:200});
  }
  const user=await userFor(req);
  if(input.action==='create')return respond(await openCheckout(user,input));
  if(input.action==='status'){
   let row=(await db('paypal_sandbox_checkouts?user_id=eq.'+user.id+'&order=created_at.desc&limit=1'))[0]||null;
   if(row)row=await refresh(row);return respond({checkout:row,environment:'sandbox'});
  }
  throw new HttpError(400,'Unknown checkout action.');
 }catch(error){return respond({error:error instanceof HttpError?error.message:'Payment services are temporarily unavailable.'},error instanceof HttpError?error.status:503);}
}
Deno.serve(handler);
