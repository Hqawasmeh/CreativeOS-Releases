import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../supabase/functions/qanteak-paypal/index.ts',import.meta.url),'utf8');
let served,environment='sandbox',mockFetch=()=>{throw Error('Unexpected network request')};
const context=vm.createContext({Deno:{env:{get:name=>({PAYPAL_ENV:environment,SUPABASE_URL:'https://example.supabase.co',SUPABASE_SECRET_KEYS:'{"default":"test-server-key"}',SUPABASE_PUBLISHABLE_KEYS:'{"default":"test-public-key"}',PAYPAL_CLIENT_ID:'test-id',PAYPAL_CLIENT_SECRET:'test-secret'})[name]},serve:handler=>served=handler},fetch:(...args)=>mockFetch(...args),URL,Response,Request,AbortSignal,btoa,console});
vm.runInContext(source,context);
for(const expression of ["selection({plan:'__proto__',billing:'monthly'})","selection({plan:'pro',billing:'annual',seats:2})","selection({plan:'teams',billing:'monthly',seats:1.5})","selection({plan:'teams',billing:'monthly',seats:101})"]){assert.throws(()=>vm.runInContext(expression,context));}
assert.equal(vm.runInContext("approvalURL('https://evil.example/pay')",context),null);
assert.equal(vm.runInContext("approvalURL('https://www.sandbox.paypal.com.evil.example/pay')",context),null);
assert.equal(vm.runInContext("approvalURL('http://www.sandbox.paypal.com/pay')",context),null);
const post=body=>new Request('https://example.supabase.co/functions/v1/qanteak-paypal',{method:'POST',body:JSON.stringify(body)});
assert.equal((await served(post({action:'create'}))).status,401);
environment='live';assert.equal((await served(post({action:'create'}))).status,503);environment='sandbox';
let writes=[];
mockFetch=async (url,options={})=>{
 if(url.endsWith('/auth/v1/user'))return Response.json({id:'user-1',email_confirmed_at:'2026-01-01'});
 if(url.endsWith('/v1/oauth2/token'))return Response.json({access_token:'test-token',expires_in:3600});
 if(url.includes('paypal_sandbox_config?key=eq.ready'))return Response.json([{value:true}]);
 if(url.includes('paypal_sandbox_config?key=eq.pro_annual'))return Response.json([{value:{id:'server-plan'}}]);
 if(url.includes('paypal_sandbox_config?key=eq.webhook'))return Response.json([{value:{id:'webhook-1'}}]);
 if(url.includes('paypal_sandbox_checkouts?user_id=')){assert.ok(url.includes('user_id=eq.user-1'));return Response.json([])}
 if(url.endsWith('/rest/v1/paypal_sandbox_checkouts')){const body=JSON.parse(options.body);assert.equal(body.user_id,'user-1');writes.push(body);return Response.json([{...body,id:'checkout-1',created_at:new Date().toISOString()}])}
 if(url.endsWith('/v1/billing/subscriptions')){const body=JSON.parse(options.body);assert.equal(body.plan_id,'server-plan');assert.equal(body.custom_id,'checkout-1');assert.equal(body.quantity,'1');assert.equal(body.price,undefined);assert.equal(options.headers['PayPal-Request-Id'],'checkout-1');assert.ok(body.application_context.return_url.startsWith('https://hqawasmeh.github.io/CreativeOS-Releases/checkout.html?'));return Response.json({id:'I-TEST',status:'APPROVAL_PENDING',links:[{rel:'approve',href:'https://www.sandbox.paypal.com/approve'}]})}
 if(url.includes('paypal_sandbox_checkouts?id=eq.checkout-1'))return Response.json([{id:'checkout-1',...JSON.parse(options.body)}]);
 throw Error('Unexpected URL '+url);
};
const create=new Request('https://example.supabase.co/functions/v1/qanteak-paypal',{method:'POST',headers:{Authorization:'Bearer test-user'},body:JSON.stringify({action:'create',plan:'pro',billing:'annual',seats:1,price:0.01,user_id:'other-user',plan_id:'attacker-plan'})});
const created=await served(create);assert.equal(created.status,200);assert.equal(writes.length,1);
const webhook=new Request('https://example.supabase.co/functions/v1/qanteak-paypal/webhook',{method:'POST',body:'{}'});assert.equal((await served(webhook)).status,401);
mockFetch=async url=>{
 if(url.includes('/v1/billing/subscriptions/'))return Response.json({plan_id:'wrong-plan',custom_id:'checkout-1',quantity:'1',status:'ACTIVE'});
 if(url.includes('paypal_sandbox_config?key='))return Response.json([{value:{id:'server-plan'}}]);
 throw Error('Must not write mismatched subscription');
};
await assert.rejects(vm.runInContext("refresh({provider_id:'I-TEST',id:'checkout-1',plan:'pro',billing:'annual',seats:1})",context),/does not match/);
console.log('PASS: selection validation, host checks, authentication, Sandbox guard, server pricing/ownership, idempotency, unsigned webhook rejection, and subscription identity checks.');
