begin;
-- Synthetic users/workspaces only. Every write is rolled back.
do $$
declare u uuid:=gen_random_uuid(); v uuid:=gen_random_uuid(); x uuid:=gen_random_uuid(); w uuid:=gen_random_uuid();
begin
 perform set_config('qanteak.qa_u',u::text,true);perform set_config('qanteak.qa_v',v::text,true);perform set_config('qanteak.qa_x',x::text,true);perform set_config('qanteak.qa_w',w::text,true);
 insert into auth.users(id,email) values(u,'qa-'||u||'@example.test'),(v,'qa-'||v||'@example.test'),(x,'qa-'||x||'@example.test');
 insert into public.q_workspaces(id,name,slug,owner_user_id) values(w,'Q23 transaction test','qa-'||w,u);
 insert into public.q_workspace_members(workspace_id,user_id,role,access,status) values(w,u,'owner','["Everything"]','active'),(w,v,'editor','["Everything"]','active'),(w,x,'viewer','["Everything"]','active') on conflict do nothing;
end $$;
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('qanteak.qa_u'),'role','authenticated')::text,true);
do $$
declare w uuid:=current_setting('qanteak.qa_w')::uuid; r jsonb; r2 jsonb; msgid uuid:=gen_random_uuid();
begin
 r:=public.q23_collaboration(w,'bootstrap');
 if jsonb_array_length(r->'members')<>3 then raise exception 'Member listing failed'; end if;
 r:=public.q23_collaboration(w,'room.create',jsonb_build_object('kind','direct','members',jsonb_build_array(current_setting('qanteak.qa_v'))));
 perform set_config('qanteak.qa_room',r->>'id',true);
 r2:=public.q23_collaboration(w,'room.create',jsonb_build_object('kind','direct','members',jsonb_build_array(current_setting('qanteak.qa_v'))));
 if r<>r2 then raise exception 'Direct deduplication failed'; end if;
 perform public.q23_collaboration(w,'message.send',jsonb_build_object('room_id',r->>'id','body','Synthetic test only','request_id',msgid));
 r2:=public.q23_collaboration(w,'message.send',jsonb_build_object('room_id',r->>'id','body','Synthetic test only','request_id',msgid));
 if jsonb_array_length(r2)<>1 then raise exception 'Message deduplication failed'; end if;
 perform public.q23_collaboration(w,'attendance.in');perform public.q23_collaboration(w,'attendance.in');
 r:=public.q23_collaboration(w,'bootstrap');if jsonb_array_length(r->'attendance')<>1 then raise exception 'Duplicate open shift'; end if;
 perform public.q23_collaboration(w,'attendance.out');r:=public.q23_collaboration(w,'bootstrap');
 if r->'attendance'->0->>'checked_out_at' is null then raise exception 'Checkout missing'; end if;
 perform public.q23_collaboration(w,'reminder.save',jsonb_build_object('request_id',msgid,'title','QA reminder','due_at',now()+interval '1 hour'));
 perform public.q23_collaboration(w,'reminder.save',jsonb_build_object('request_id',msgid,'title','QA reminder','due_at',now()+interval '1 hour'));
 perform public.q23_collaboration(w,'layout.save','{"positions":{"client:qa":{"x":40,"y":90}}}');
 r:=public.q23_collaboration(w,'bootstrap');if jsonb_array_length(r->'reminders')<>1 or r->'positions'->'client:qa'->>'x'<>'40' then raise exception 'Personal persistence failed'; end if;
 -- V24 permits participant SELECT through RLS for realtime.
 if (select count(*) from public.q23_messages)<>1 then raise exception 'Participant read failed';end if;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('qanteak.qa_v'),'role','authenticated')::text,true);
do $$
declare w uuid:=current_setting('qanteak.qa_w')::uuid; r jsonb;
begin
 r:=public.q23_collaboration(w,'messages',jsonb_build_object('room_id',current_setting('qanteak.qa_room')));if jsonb_array_length(r)<>1 then raise exception 'Recipient cannot read';end if;
 r:=public.q23_collaboration(w,'bootstrap');if jsonb_array_length(r->'reminders')<>0 or jsonb_array_length(r->'attendance')<>0 or r->'positions'<>'{}'::jsonb then raise exception 'Personal data leaked'; end if;
 begin perform public.q23_collaboration(w,'attendance.team');raise exception 'Editor accessed team time';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('qanteak.qa_x'),'role','authenticated')::text,true);
do $$
declare w uuid:=current_setting('qanteak.qa_w')::uuid; r jsonb;
begin
 r:=public.q23_collaboration(w,'bootstrap');if jsonb_array_length(r->'rooms')<>0 then raise exception 'Private conversation leaked'; end if;
 begin perform public.q23_collaboration(w,'messages',jsonb_build_object('room_id',current_setting('qanteak.qa_room')));raise exception 'Nonparticipant accessed messages';exception when insufficient_privilege then null;end;
 begin perform public.q23_collaboration(gen_random_uuid(),'bootstrap');raise exception 'Cross-workspace access allowed';exception when insufficient_privilege then null;end;
end $$;
set local role anon;
do $$ begin
 begin perform public.q23_collaboration(current_setting('qanteak.qa_w')::uuid,'bootstrap');raise exception 'Anonymous access allowed';exception when insufficient_privilege then null;end;
end $$;
rollback;
select 'PASS: membership, private chat isolation, direct/message deduplication, attendance, deduplicated personal reminders/layouts, admin and anonymous boundaries; all test writes rolled back' as result;
