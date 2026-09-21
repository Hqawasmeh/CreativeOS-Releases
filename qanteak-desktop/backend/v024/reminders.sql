alter table public.q23_reminders add column if not exists request_id uuid;
create unique index if not exists q24_reminder_request on public.q23_reminders(user_id,request_id);
create or replace function qanteak_private.collaboration(p_workspace_id uuid,p_action text,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 u uuid:=auth.uid(); r uuid; ids uuid[]; k text; result jsonb; member_id uuid;
begin
 if u is null or not exists(select 1 from public.q_workspace_members where workspace_id=p_workspace_id and user_id=u and status='active') then
  raise exception 'Active workspace membership required' using errcode='42501';
 end if;
 if p_action='bootstrap' then
  return jsonb_build_object(
   'members',(select coalesce(jsonb_agg(jsonb_build_object('id',m.user_id,'name',coalesce(nullif(p.display_name,''),p.email,'Teammate'),'role',m.role)),'[]') from public.q_workspace_members m left join public.profiles p on p.id=m.user_id where m.workspace_id=p_workspace_id and m.status='active'),
   'rooms',(select coalesce(jsonb_agg(x order by x.last_at desc nulls last),'[]') from (
     select a.id,a.kind,a.title,a.created_by,
      (select coalesce(jsonb_agg(user_id),'[]') from public.q23_room_members where room_id=a.id) as member_ids,
      (select body from public.q23_messages where room_id=a.id order by id desc limit 1) as preview,
      (select created_at from public.q23_messages where room_id=a.id order by id desc limit 1) as last_at,
      (select count(*) from public.q23_messages where room_id=a.id and sender_id<>u and created_at>b.read_at) as unread
     from public.q23_rooms a join public.q23_room_members b on b.room_id=a.id and b.user_id=u where a.workspace_id=p_workspace_id
   )x),
   'attendance',(select coalesce(jsonb_agg(x order by x.checked_in_at desc),'[]') from (select * from public.q23_attendance where workspace_id=p_workspace_id and user_id=u order by checked_in_at desc limit 100)x),
   'reminders',(select coalesce(jsonb_agg(x order by x.due_at),'[]') from (select * from public.q23_reminders where workspace_id=p_workspace_id and user_id=u and not done order by due_at limit 500)x),
   'positions',coalesce((select positions from public.q23_layouts where workspace_id=p_workspace_id and user_id=u),'{}')
  );
 elsif p_action='room.create' then
  select array_agg(distinct value::uuid) into ids from jsonb_array_elements_text(coalesce(p_data->'members','[]'));
  ids:=array(select distinct unnest(coalesce(ids,'{}'::uuid[])||array[u]));
  if cardinality(ids)<2 or cardinality(ids)>100 then raise exception 'Choose between 1 and 99 coworkers'; end if;
  foreach member_id in array ids loop
   if not exists(select 1 from public.q_workspace_members where workspace_id=p_workspace_id and user_id=member_id and status='active') then raise exception 'All participants must belong to this workspace' using errcode='42501'; end if;
  end loop;
  if p_data->>'kind'='direct' then
   if cardinality(ids)<>2 then raise exception 'Private chats need exactly two people'; end if;
   select string_agg(x::text,':' order by x) into k from unnest(ids)x;
   insert into public.q23_rooms(workspace_id,kind,title,created_by,direct_key) values(p_workspace_id,'direct','Private chat',u,k) on conflict(workspace_id,direct_key) do update set direct_key=excluded.direct_key returning id into r;
  else
   insert into public.q23_rooms(workspace_id,kind,title,created_by) values(p_workspace_id,'group',trim(p_data->>'title'),u) returning id into r;
  end if;
  insert into public.q23_room_members(room_id,user_id) select r,unnest(ids) on conflict do nothing;
  return jsonb_build_object('id',r);
 elsif p_action in ('messages','message.send','room.read') then
  r:=(p_data->>'room_id')::uuid;
  if not exists(select 1 from public.q23_rooms a join public.q23_room_members b on b.room_id=a.id where a.id=r and a.workspace_id=p_workspace_id and b.user_id=u) then raise exception 'Conversation access denied' using errcode='42501'; end if;
  if p_action='message.send' then
   insert into public.q23_messages(room_id,sender_id,body,request_id) values(r,u,trim(p_data->>'body'),(p_data->>'request_id')::uuid) on conflict(sender_id,request_id) do nothing;
  elsif p_action='room.read' then
   update public.q23_room_members set read_at=least(now(),coalesce((p_data->>'through')::timestamptz,now())) where room_id=r and user_id=u;
  end if;
  return (select coalesce(jsonb_agg(x order by x.id),'[]') from (select id,room_id,sender_id,body,created_at from public.q23_messages where room_id=r and (p_data->>'before' is null or id<(p_data->>'before')::bigint) order by id desc limit 100)x);
 elsif p_action='attendance.in' then
  insert into public.q23_attendance(workspace_id,user_id) values(p_workspace_id,u) on conflict(workspace_id,user_id) where checked_out_at is null do nothing;
 elsif p_action='attendance.out' then
  update public.q23_attendance set checked_out_at=now() where workspace_id=p_workspace_id and user_id=u and checked_out_at is null;
 elsif p_action='attendance.team' then
  if not exists(select 1 from public.q_workspace_members where workspace_id=p_workspace_id and user_id=u and status='active' and lower(role) in ('owner','admin')) then raise exception 'Admin access required' using errcode='42501'; end if;
  return (select coalesce(jsonb_agg(x order by x.checked_in_at desc),'[]') from (select a.*,coalesce(p.display_name,p.email,'Teammate') as name from public.q23_attendance a left join public.profiles p on p.id=a.user_id where a.workspace_id=p_workspace_id and a.checked_in_at>now()-interval '31 days' order by a.checked_in_at desc limit 2000)x);
 elsif p_action='reminder.save' then
  if p_data->>'id' is null then
   insert into public.q23_reminders(workspace_id,user_id,title,due_at,request_id) values(p_workspace_id,u,trim(p_data->>'title'),(p_data->>'due_at')::timestamptz,nullif(p_data->>'request_id','')::uuid) on conflict(user_id,request_id) do nothing;
  else
   update public.q23_reminders set due_at=coalesce((p_data->>'due_at')::timestamptz,due_at),done=coalesce((p_data->>'done')::boolean,done),title=coalesce(nullif(trim(p_data->>'title'),''),title) where id=(p_data->>'id')::uuid and user_id=u and workspace_id=p_workspace_id;
  end if;
 elsif p_action='reminder.delete' then
  delete from public.q23_reminders where id=(p_data->>'id')::uuid and workspace_id=p_workspace_id and user_id=u;
 elsif p_action='layout.save' then
  insert into public.q23_layouts(workspace_id,user_id,positions) values(p_workspace_id,u,p_data->'positions') on conflict(workspace_id,user_id) do update set positions=excluded.positions,updated_at=now();
 else raise exception 'Unknown collaboration action';
 end if;
 return jsonb_build_object('ok',true);
end; $$;

notify pgrst, 'reload schema';
