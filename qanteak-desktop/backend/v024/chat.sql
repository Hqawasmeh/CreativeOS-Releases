alter table public.q23_messages add column if not exists parent_id bigint references public.q23_messages(id);
alter table public.q23_messages add column if not exists edited_at timestamptz;
alter table public.q23_messages add column if not exists attachments jsonb not null default '[]';
create or replace function qanteak_private.q24_room_allowed(r uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.q23_room_members m join public.q23_rooms r1 on r1.id=m.room_id join public.q_workspace_members w on w.workspace_id=r1.workspace_id and w.user_id=m.user_id and w.status='active' where m.room_id=r and m.user_id=(select auth.uid()))
$$;
revoke all on function qanteak_private.q24_room_allowed(uuid) from public,anon;
grant execute on function qanteak_private.q24_room_allowed(uuid) to authenticated;
create policy q24_message_read on public.q23_messages for select to authenticated using(qanteak_private.q24_room_allowed(room_id));
grant select on public.q23_messages to authenticated;
create or replace function qanteak_private.q24_chat(w uuid,a text,d jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare r uuid:=(d->>'room_id')::uuid;u uuid:=auth.uid();msg public.q23_messages;member_id uuid;att jsonb;
begin
 if not qanteak_private.q24_room_allowed(r) or not exists(select 1 from public.q23_rooms where id=r and workspace_id=w) then raise exception 'Conversation access denied' using errcode='42501';end if;
 if a='send' then
 if d->>'parent_id' is not null and not exists(select 1 from public.q23_messages where id=(d->>'parent_id')::bigint and room_id=r) then raise exception 'Reply target is not in this conversation';end if;
 if jsonb_array_length(coalesce(d->'attachments','[]'))>5 then raise exception 'Maximum five attachments';end if;
 for att in select * from jsonb_array_elements(coalesce(d->'attachments','[]')) loop
 if split_part(att->>'path','/',1)<>r::text or not exists(select 1 from storage.objects where bucket_id='qanteak-chat' and name=att->>'path') then raise exception 'Invalid attachment';end if;
 end loop;
 insert into public.q23_messages(room_id,sender_id,body,request_id,parent_id,attachments) values(r,u,trim(d->>'body'),(d->>'request_id')::uuid,(d->>'parent_id')::bigint,coalesce(d->'attachments','[]')) on conflict(sender_id,request_id) do nothing returning * into msg;
 if msg.id is not null then
 insert into public.q24_inbox(workspace_id,user_id,title,category,source_room) select w,m.user_id,'New message in '||rooms.title,'chat',r from public.q23_room_members m join public.q23_rooms rooms on rooms.id=m.room_id where m.room_id=r and m.user_id<>u;
 end if;
 elsif a='edit' then
 update public.q23_messages set body=trim(d->>'body'),edited_at=now() where id=(d->>'id')::bigint and room_id=r and sender_id=u;
 if not found then raise exception 'Only the author can edit this message' using errcode='42501';end if;
 elsif a<>'list' then raise exception 'Unknown chat action';end if;
 return coalesce((select jsonb_agg(x order by x.id) from(select * from public.q23_messages where room_id=r and (nullif(d->>'query','') is null or body ilike '%'||(d->>'query')||'%') and (d->>'thread' is null or id=(d->>'thread')::bigint or parent_id=(d->>'thread')::bigint) and (d->>'before' is null or id<(d->>'before')::bigint) order by id desc limit 100)x),'[]');
end $$;
revoke all on function qanteak_private.q24_chat(uuid,text,jsonb) from public,anon;
grant execute on function qanteak_private.q24_chat(uuid,text,jsonb) to authenticated;
create or replace function public.q24_chat(p_workspace_id uuid,p_action text,p_data jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select qanteak_private.q24_chat(p_workspace_id,p_action,p_data)$$;
revoke all on function public.q24_chat(uuid,text,jsonb) from public,anon;
grant execute on function public.q24_chat(uuid,text,jsonb) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit) values('qanteak-chat','qanteak-chat',false,10485760) on conflict(id) do nothing;
create policy q24_chat_upload on storage.objects for insert to authenticated with check(bucket_id='qanteak-chat' and qanteak_private.q24_room_allowed((storage.foldername(name))[1]::uuid));
create policy q24_chat_download on storage.objects for select to authenticated using(bucket_id='qanteak-chat' and qanteak_private.q24_room_allowed((storage.foldername(name))[1]::uuid));
do $$begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='q23_messages') then alter publication supabase_realtime add table public.q23_messages;end if;
end $$;

create policy q24_inbox_room_scope on public.q24_inbox as restrictive for select to authenticated using(source_room is null or qanteak_private.q24_room_allowed(source_room));
