-- V0.24 additive shared modules. Optimistic versions and server authorization.
create table if not exists public.q24_records (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.q_workspaces(id) on delete cascade,
 kind text not null,title text not null check(length(title) between 1 and 250),status text not null default '',data jsonb not null default '{}',
 created_by uuid not null references auth.users(id),updated_by uuid not null references auth.users(id),version integer not null default 1,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),deleted boolean not null default false,
 check(jsonb_typeof(data)='object' and octet_length(data::text)<1000000)
);
create index if not exists q24_records_workspace on public.q24_records(workspace_id,kind,updated_at desc);
create table if not exists public.q24_versions(record_id uuid not null references public.q24_records(id) on delete cascade,version integer not null,payload jsonb not null,actor uuid not null,created_at timestamptz not null default now(),primary key(record_id,version));
create table if not exists public.q24_comments(id uuid primary key default gen_random_uuid(),record_id uuid not null references public.q24_records(id) on delete cascade,user_id uuid not null references auth.users(id),body text not null check(length(body) between 1 and 5000),created_at timestamptz not null default now());
create index if not exists q24_comments_record on public.q24_comments(record_id,created_at);
create table if not exists public.q24_inbox(id bigint generated always as identity primary key,workspace_id uuid not null references public.q_workspaces(id) on delete cascade,user_id uuid not null references auth.users(id),title text not null,record_id uuid references public.q24_records(id) on delete cascade,category text not null default 'activity',source_room uuid references public.q23_rooms(id) on delete cascade,read_at timestamptz,created_at timestamptz not null default now());
create index if not exists q24_inbox_user on public.q24_inbox(workspace_id,user_id,id desc);
create table if not exists public.q24_preferences(workspace_id uuid not null references public.q_workspaces(id) on delete cascade,user_id uuid not null references auth.users(id),data jsonb not null default '{}',primary key(workspace_id,user_id));
create table if not exists public.q24_shares(token uuid primary key default gen_random_uuid(),record_id uuid not null references public.q24_records(id) on delete cascade,created_by uuid not null references auth.users(id),expires_at timestamptz not null default now()+interval '14 days',revoked boolean not null default false);
create index if not exists q24_shares_record on public.q24_shares(record_id);
alter table public.q24_records enable row level security;
alter table public.q24_versions enable row level security;
alter table public.q24_comments enable row level security;
alter table public.q24_inbox enable row level security;
alter table public.q24_preferences enable row level security;
alter table public.q24_shares enable row level security;
revoke all on public.q24_records,public.q24_versions,public.q24_comments,public.q24_inbox,public.q24_preferences,public.q24_shares from public,anon,authenticated;
revoke all on sequence public.q24_inbox_id_seq from public,anon,authenticated;
create or replace function qanteak_private.q24_allowed(w uuid,k text,act text,creator uuid default null) returns boolean language plpgsql stable security definer set search_path='' as $$
declare m public.q_workspace_members; p text;
begin
 select * into m from public.q_workspace_members where workspace_id=w and user_id=auth.uid() and status='active';
 if m.user_id is null then return false;end if;
 if k='focus' then return creator is null or creator=auth.uid();end if;
 if lower(m.role) in ('owner','admin') then return true;end if;
 if k in ('settings','studio') then return k='studio' and (m.access ? 'Everything') and (act='view' or lower(m.role) not in ('viewer','guest'));end if;
 if k='portal' then return false;end if;
 if k='requests' and creator is not null and creator<>auth.uid() then return false;end if;
 if act<>'view' and lower(m.role) in ('viewer','guest') then return false;end if;
 p:=case when k in ('crm','support','forms') then 'clients' when k in ('brand','equipment','clips') then 'files' when k in ('planning','onboarding','requests') then 'tasks' when k='knowledge' then 'documents' when k='workflows' then 'business' when k in ('content','goals','whiteboard','booking') then 'projects' else null end;
 if p is null then return false;end if;
 if jsonb_typeof(m.access)='array' then return m.access ? 'Everything' or m.access ? p or m.access ? (p||'.'||act) or m.access ? (p||':'||act);end if;
 return coalesce(m.access->p='true'::jsonb or m.access->p->>'all'='true' or m.access->p->>act='true',false);
end $$;
revoke all on function qanteak_private.q24_allowed(uuid,text,text,uuid) from public,anon;
grant execute on function qanteak_private.q24_allowed(uuid,text,text,uuid) to authenticated;
create policy q24_record_read on public.q24_records for select to authenticated using(qanteak_private.q24_allowed(workspace_id,kind,'view',created_by));
create policy q24_inbox_read on public.q24_inbox for select to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.q_workspace_members where workspace_id=q24_inbox.workspace_id and user_id=(select auth.uid()) and status='active'));
grant select on public.q24_records,public.q24_inbox to authenticated;
create or replace function qanteak_private.q24_workspace(w uuid,action text,d jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();r public.q24_records;v public.q24_records;k text;rid uuid;is_admin boolean;result jsonb;newdata jsonb;
begin
 if u is null or not exists(select 1 from public.q_workspace_members where workspace_id=w and user_id=u and status='active') then raise exception 'Active workspace membership required' using errcode='42501';end if;
 select lower(role) in ('owner','admin') into is_admin from public.q_workspace_members where workspace_id=w and user_id=u;
 if action='list' then
 return coalesce((select jsonb_agg(x order by x.updated_at desc) from (select * from public.q24_records where workspace_id=w and not deleted and (d->>'kind' is null or kind=d->>'kind') and qanteak_private.q24_allowed(w,kind,'view',created_by) and (d->>'before' is null or updated_at<(d->>'before')::timestamptz) order by updated_at desc limit 1000)x),'[]');
 elsif action='inbox' then
 return jsonb_build_object('items',coalesce((select jsonb_agg(x order by x.id desc) from (select i.* from public.q24_inbox i left join public.q24_records r on r.id=i.record_id where i.workspace_id=w and i.user_id=u and (i.source_room is null or qanteak_private.q24_room_allowed(i.source_room)) and (r.id is null or qanteak_private.q24_allowed(w,r.kind,'view',r.created_by)) order by i.id desc limit 300)x),'[]'),'preferences',coalesce((select data from public.q24_preferences where workspace_id=w and user_id=u),'{}'));
 elsif action='inbox.read' then
 update public.q24_inbox set read_at=now() where workspace_id=w and user_id=u and (d->>'id' is null or id=(d->>'id')::bigint);return '{}';
 elsif action='preferences' then
 insert into public.q24_preferences values(w,u,d) on conflict(workspace_id,user_id) do update set data=excluded.data;return d;
 elsif action='save' then
 k:=d->>'kind';rid:=coalesce((d->>'id')::uuid,gen_random_uuid());
 perform pg_advisory_xact_lock(hashtextextended(w::text||rid::text,0));
 select * into r from public.q24_records where id=rid for update;
 if r.id is not null and (r.workspace_id<>w or r.kind<>k) then raise exception 'Record access denied' using errcode='42501';end if;
 if not qanteak_private.q24_allowed(w,k,case when r.id is null then 'create' else 'edit' end,r.created_by) then raise exception 'Permission denied' using errcode='42501';end if;
 if coalesce(r.version,0)<>coalesce((d->>'version')::int,0) then raise exception 'Version conflict. Reload before saving; your draft is preserved.' using errcode='40001';end if;
 if k='requests' and coalesce(d->>'status','Pending')<>'Pending' and not is_admin then raise exception 'Only administrators can approve requests' using errcode='42501';end if;
 newdata:=coalesce(d->'data','{}');
 if k='planning' then
 if nullif(newdata->>'dependsOn','') is not null then
 if exists(select 1 from regexp_split_to_table(newdata->>'dependsOn','\s*,\s*') dep where not exists(select 1 from public.q24_records where id=dep::uuid and workspace_id=w and kind='planning' and not deleted)) then raise exception 'Dependency not found';end if;
 if exists(with recursive chain(id) as (select value::uuid from regexp_split_to_table(newdata->>'dependsOn','\s*,\s*') value union select dep::uuid from chain c join public.q24_records p on p.id=c.id cross join lateral regexp_split_to_table(nullif(p.data->>'dependsOn',''),'\s*,\s*') dep) select 1 from chain where id=rid) then raise exception 'Dependency cycle';end if;
 if d->>'status'='Done' and exists(select 1 from public.q24_records where workspace_id=w and id in(select value::uuid from regexp_split_to_table(newdata->>'dependsOn','\s*,\s*') value) and status<>'Done') then raise exception 'Complete dependencies first';end if;
 end if;end if;

 if k='booking' and coalesce(d->>'status','')<>'Cancelled' then
 if newdata->>'start' is null or newdata->>'end' is null or (newdata->>'end')::timestamptz<=(newdata->>'start')::timestamptz then raise exception 'Choose a valid booking time range';end if;
 perform pg_advisory_xact_lock(hashtextextended(w::text||coalesce(nullif(newdata->>'resourceId',''),u::text),0));
 if nullif(newdata->>'resourceId','') is not null and not exists(select 1 from public.q24_records where id=(newdata->>'resourceId')::uuid and workspace_id=w and kind='equipment' and status='Available' and not deleted and qanteak_private.q24_allowed(w,kind,'view',created_by)) then raise exception 'Choose an available resource';end if;
 if exists(select 1 from public.q24_records where workspace_id=w and kind='booking' and id<>rid and not deleted and status<>'Cancelled' and coalesce(nullif(data->>'resourceId',''),created_by::text)=coalesce(nullif(newdata->>'resourceId',''),u::text) and (data->>'start')::timestamptz<(newdata->>'end')::timestamptz and (data->>'end')::timestamptz>(newdata->>'start')::timestamptz) then raise exception 'This resource or calendar is already booked for that time';end if;
 end if;
 insert into public.q24_records(id,workspace_id,kind,title,status,data,created_by,updated_by) values(rid,w,k,trim(d->>'title'),coalesce(d->>'status',''),newdata,u,u)
 on conflict(id) do update set title=excluded.title,status=excluded.status,data=excluded.data,updated_by=u,version=q24_records.version+1,updated_at=now(),deleted=false returning * into v;
 insert into public.q24_versions(record_id,version,payload,actor) values(rid,v.version,to_jsonb(v),u);
 insert into public.q24_inbox(workspace_id,user_id,title,record_id,category)
 select w,m.user_id,case when r.id is null then 'Created: ' else 'Updated: ' end||v.title,rid,case when k='requests' then 'approval' else 'activity' end from public.q_workspace_members m where m.workspace_id=w and m.status='active' and m.user_id<>u and qanteak_private.q24_allowed(w,k,'view',v.created_by) and (m.user_id=v.created_by or (k='requests' and lower(m.role) in ('owner','admin')) or newdata->>'assigneeId'=m.user_id::text);
 return to_jsonb(v);
 end if;
 rid:=(d->>'id')::uuid;select * into r from public.q24_records where id=rid and workspace_id=w;
 if r.id is null or not qanteak_private.q24_allowed(w,r.kind,'view',r.created_by) then raise exception 'Record access denied' using errcode='42501';end if;
 if action='history' then return coalesce((select jsonb_agg(x order by x.version desc) from(select * from public.q24_versions where record_id=rid order by version desc limit 100)x),'[]');
 elsif action='comments' then return coalesce((select jsonb_agg(x order by x.created_at) from(select * from public.q24_comments where record_id=rid order by created_at desc limit 300)x),'[]');
 elsif action='comment' then
 if not qanteak_private.q24_allowed(w,r.kind,'edit',r.created_by) then raise exception 'Permission denied' using errcode='42501';end if;
 insert into public.q24_comments(record_id,user_id,body) values(rid,u,trim(d->>'body'));
 if r.created_by<>u then insert into public.q24_inbox(workspace_id,user_id,title,record_id,category) values(w,r.created_by,'Comment on '||r.title,rid,'comment');end if;
 return '{}';
 elsif action='delete' then
 if not qanteak_private.q24_allowed(w,r.kind,'delete',r.created_by) then raise exception 'Permission denied' using errcode='42501';end if;
 update public.q24_records set deleted=true,version=version+1,updated_at=now(),updated_by=u where id=rid and version=(d->>'version')::int;
 if not found then raise exception 'Version conflict' using errcode='40001';end if;return '{}';
 elsif action='share' then
 if not is_admin or r.kind not in ('knowledge','content','brand','forms','booking','portal') then raise exception 'An administrator can share a document, content item, brand asset, form or booking' using errcode='42501';end if;
 insert into public.q24_shares(record_id,created_by) values(rid,u) returning token into rid;return jsonb_build_object('token',rid);
 elsif action='revoke' then
 if not is_admin then raise exception 'Admin access required' using errcode='42501';end if;update public.q24_shares set revoked=true where record_id=rid;return '{}';
 end if;
 raise exception 'Unknown workspace action';
end $$;
revoke all on function qanteak_private.q24_workspace(uuid,text,jsonb) from public,anon;
grant execute on function qanteak_private.q24_workspace(uuid,text,jsonb) to authenticated;
create or replace function public.q24_workspace(p_workspace_id uuid,p_action text,p_data jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select qanteak_private.q24_workspace(p_workspace_id,p_action,p_data)$$;
revoke all on function public.q24_workspace(uuid,text,jsonb) from public,anon;
grant execute on function public.q24_workspace(uuid,text,jsonb) to authenticated;
do $$begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='q24_records') then alter publication supabase_realtime add table public.q24_records;end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='q24_inbox') then alter publication supabase_realtime add table public.q24_inbox;end if;
end $$;
create unique index if not exists q24_one_studio on public.q24_records(workspace_id,kind) where kind='studio' and not deleted;
create unique index if not exists q24_core_task_link on public.q24_records(workspace_id,(data->>'coreTaskId')) where kind='planning' and not deleted and data->>'coreTaskId' is not null;
