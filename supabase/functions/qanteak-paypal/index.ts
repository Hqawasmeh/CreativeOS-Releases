Deno.serve(async(req)=>{
 if(req.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});
 const keys=Object.values(JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}')).filter(x=>typeof x==='string'&&x.length>0);
 const legacy=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(legacy)keys.push(legacy);
 const provided=req.headers.get('apikey')||req.headers.get('Authorization')?.replace(/^Bearer /,'');
 if(!provided||!keys.includes(provided))return Response.json({error:'Administrator required'},{status:403});
 const id=Deno.env.get('PAYPAL_CLIENT_ID')?.trim(),secret=Deno.env.get('PAYPAL_CLIENT_SECRET')?.trim(),env=Deno.env.get('PAYPAL_ENV')?.trim();
 if(!id||!secret||env!=='sandbox')return Response.json({ready:false,reason:'Sandbox credentials missing or PAYPAL_ENV is not sandbox'});
 try{
 const r=await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token',{method:'POST',headers:{Authorization:'Basic '+btoa(id+':'+secret),'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials',signal:AbortSignal.timeout(15000)});
 return Response.json({ready:r.ok,environment:'sandbox',provider_status:r.status});
 }catch{return Response.json({ready:false,reason:'Provider unavailable'},{status:502})}
});