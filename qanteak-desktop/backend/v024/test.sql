begin;
do $$declare u uuid:=gen_random_uuid();v uuid:=gen_random_uuid();x uuid:=gen_random_uuid();w uuid:=gen_random_uuid();begin
 perform set_config('qa.u',u::text,true);perform set_config('qa.v',v::text,true);perform set_config('qa.x',x::text,true);perform set_config('qa.w',w::text,true);
 insert into auth.users(id,email) values(u,'qa-'||u||'@example.test'),(v,'qa-'||v||'@example.test'),(x,'qa-'||x||'@example.test');
 insert into public.q_workspaces(id,name,slug,owner_user_id) values(w,'Q24 transaction QA','qa-'||w,u);
 insert into public.q_workspace_members(workspace_id,user_id,role,access,status) values(w,u,'owner','["Everything"]','active'),(w,v,'editor','["Everything"]','active'),(w,x,'viewer','{"documents":{"view":false},"tasks":{"view":true}}','active') on conflict do nothing;
end $$;
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('qa.u'),'role','authenticated')::text,true);
do $$declare w uuid:=current_setting('qa.w')::uuid;r jsonb;v jsonb;room jsonb;s jsonb;begin
 r:=public.q24_workspace(w,'save','{"kind":"knowledge","title":"QA wiki","status":"Draft","data":{"blocks":[{"id":"one","type":"paragraph","text":"Original"}]}}');
 perform set_config('qa.record',r->>'id',true);
 v:=public.q24_workspace(w,'save',r||'{"title":"Updated wiki"}'::jsonb);if(v->>'version')::int<>2 then raise exception 'Version did not advance';end if;
 begin perform public.q24_workspace(w,'save',r);raise exception 'Stale version accepted';exception when serialization_failure then null;end;
 if jsonb_array_length(public.q24_workspace(w,'history',jsonb_build_object('id',r->>'id')))<>2 then raise exception 'History missing';end if;
 s:=public.q24_workspace(w,'share',jsonb_build_object('id',r->>'id'));perform set_config('qa.share',s->>'token',true);
 perform public.q24_workspace(w,'save','{"kind":"focus","title":"Private focus","data":{}}');
 room:=public.q23_collaboration(w,'room.create',jsonb_build_object('kind','direct','members',jsonb_build_array(current_setting('qa.v'))));perform set_config('qa.room',room->>'id',true);
 r:=public.q24_chat(w,'send',jsonb_build_object('room_id',room->>'id','body','QA message','request_id',gen_random_uuid()));perform set_config('qa.message',r->0->>'id',true);
 r:=public.q24_workspace(w,'save','{"kind":"equipment","title":"QA camera","status":"Available","data":{}}');perform set_config('qa.equipment',r->>'id',true);
 perform public.q24_workspace(w,'save',jsonb_build_object('kind','booking','title','QA booking','status','Confirmed','data',jsonb_build_object('resourceId',r->>'id','start','2028-01-01T10:00:00Z','end','2028-01-01T11:00:00Z')));
 begin perform public.q24_workspace(w,'save',jsonb_build_object('kind','booking','title','Overlap','status','Confirmed','data',jsonb_build_object('resourceId',r->>'id','start','2028-01-01T10:30:00Z','end','2028-01-01T11:30:00Z')));raise exception 'Overlap accepted' using errcode='ZX001';exception when raise_exception then if sqlerrm not like '%already booked%' then raise;end if;end;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('qa.v'),'role','authenticated')::text,true);
do $$declare w uuid:=current_setting('qa.w')::uuid;r jsonb;begin
 if exists(select 1 from public.q24_records where workspace_id=w and kind='focus') then raise exception 'Private focus leaked';end if;
 r:=public.q24_workspace(w,'save','{"kind":"requests","title":"QA leave","status":"Pending","data":{}}');perform set_config('qa.request',r->>'id',true);
 begin perform public.q24_workspace(w,'save',r||'{"status":"Approved"}'::jsonb);raise exception 'Employee self-approved';exception when insufficient_privilege then null;end;
 begin perform public.q24_chat(w,'edit',jsonb_build_object('room_id',current_setting('qa.room'),'id',current_setting('qa.message'),'body','Changed'));raise exception 'Non-author edited';exception when insufficient_privilege then null;end;
 if jsonb_array_length(public.q24_chat(w,'list',jsonb_build_object('room_id',current_setting('qa.room'))))<>1 then raise exception 'Participant cannot read';end if;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('qa.x'),'role','authenticated')::text,true);
do $$declare w uuid:=current_setting('qa.w')::uuid;r jsonb;begin
 if exists(select 1 from public.q24_records where id=current_setting('qa.record')::uuid) then raise exception 'False permission granted read';end if;
 if exists(select 1 from public.q24_records where id=current_setting('qa.request')::uuid) then raise exception 'Private request leaked';end if;
 if exists(select 1 from public.q23_messages where id=current_setting('qa.message')::bigint) then raise exception 'Private message leaked';end if;
 begin perform public.q24_workspace(w,'save','{"kind":"planning","title":"Forbidden","data":{}}');raise exception 'Viewer wrote';exception when insufficient_privilege then null;end;
 begin perform public.q24_workspace(gen_random_uuid(),'list');raise exception 'Cross-workspace list allowed';exception when insufficient_privilege then null;end;
 begin perform public.q24_workspace(w,'history',jsonb_build_object('id',current_setting('qa.record')));raise exception 'Restricted history leaked';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('qa.u'),'role','authenticated')::text,true);
do $$declare w uuid:=current_setting('qa.w')::uuid;r jsonb;begin
 r:=public.q24_workspace(w,'save','{"kind":"knowledge","title":"Concurrent blocks","status":"Draft","data":{"blocks":[{"id":"a","type":"paragraph","text":"A"},{"id":"b","type":"paragraph","text":"B"}]}}');
 perform public.q24_document(w,jsonb_build_object('id',r->>'id','patches','[{"id":"a","base":{"id":"a","type":"paragraph","text":"A"},"value":{"id":"a","type":"paragraph","text":"AA"}}]'::jsonb));
 r:=public.q24_document(w,jsonb_build_object('id',r->>'id','patches','[{"id":"b","base":{"id":"b","type":"paragraph","text":"B"},"value":{"id":"b","type":"paragraph","text":"BB"}}]'::jsonb));
 if not (r->'data'->'blocks' @> '[{"id":"a","text":"AA"},{"id":"b","text":"BB"}]'::jsonb) then raise exception 'Different-block merge lost an edit';end if;
 begin perform public.q24_document(w,jsonb_build_object('id',r->>'id','patches','[{"id":"a","base":{"id":"a","type":"paragraph","text":"A"},"value":{"id":"a","type":"paragraph","text":"Stale"}}]'::jsonb));raise exception 'Same-block conflict not rejected';exception when serialization_failure then null;end;
 perform public.q24_workspace(w,'save','{"kind":"workflows","title":"New lead task","status":"Active","data":{"trigger":"Record created","source":"crm","action":"Create task","template":"Follow up with new lead"}}');
 r:=public.q24_workspace(w,'save','{"kind":"crm","title":"QA lead","status":"New lead","data":{}}');
 if not exists(select 1 from public.q24_records where workspace_id=w and kind='planning' and data->>'sourceRecordId'=r->>'id') then raise exception 'Automatic recipe did not create task';end if;
end $$;
set local role anon;
do $$declare r jsonb;begin
 r:=public.q24_public(current_setting('qa.share')::uuid,'view');if r->>'title'<>'Updated wiki' then raise exception 'Share read failed';end if;
 if r ? 'created_by' or r ? 'workspace_id' then raise exception 'Share metadata leaked';end if;
 perform public.q24_public(current_setting('qa.share')::uuid,'submit','{"name":"QA guest","email":"qa@example.test","body":"QA feedback","decision":"Approved"}');
 begin perform public.q24_workspace(current_setting('qa.w')::uuid,'list');raise exception 'Anonymous modules access';exception when insufficient_privilege then null;end;
end $$;
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('qa.u'),'role','authenticated')::text,true);
do $$begin
 if jsonb_array_length(public.q24_feedback(current_setting('qa.w')::uuid,current_setting('qa.record')::uuid))<>1 then raise exception 'Feedback not received';end if;
 perform public.q24_workspace(current_setting('qa.w')::uuid,'revoke',jsonb_build_object('id',current_setting('qa.record')));
 begin perform public.q24_public(current_setting('qa.share')::uuid,'view');raise exception 'Revoked share still works' using errcode='ZX002';exception when raise_exception then if sqlerrm not like '%expired%' then raise;end if;end;
end $$;
rollback;
select 'PASS: record versions, stale writes, history, roles, explicit false permissions, personal data, bookings, chat authorship, room isolation, scoped sharing, feedback and revocation. All fixtures rolled back.' result;
