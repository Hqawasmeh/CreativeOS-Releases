create table public.q24_feedback(id uuid primary key default gen_random_uuid(),token uuid not null references public.q24_shares(token),name text not null check(length(name) between 1 and 100),email text not null check(length(email)<250),body text not null check(length(body) between 1 and 10000),decision text not null default 'Comment' check(decision in ('Comment','Approved','Changes requested','Submission')),created_at timestamptz not null default now());
create index q24_feedback_token on public.q24_feedback(token,created_at desc);
alter table public.q24_feedback enable row level security;
revoke all on public.q24_feedback from public,anon,authenticated;
create or replace function qanteak_private.q24_public(t uuid,a text,d jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.q24_records;s public.q24_shares;result jsonb;
begin
 select * into s from public.q24_shares where token=t and not revoked and expires_at>now();
 select * into r from public.q24_records where id=s.record_id and not deleted;
 if r.id is null then raise exception 'This link is unavailable or expired';end if;
 if a='view' then
 result:=jsonb_build_object('title',r.title,'kind',r.kind,'status',r.status,'expiresAt',s.expires_at,'data',case
 when r.kind='knowledge' then jsonb_build_object('blocks',coalesce(r.data->'blocks','[]'))
 when r.kind='content' then jsonb_build_object('caption',r.data->'caption','assetUrl',r.data->'assetUrl','platform',r.data->'platform','publishAt',r.data->'publishAt')
 when r.kind='brand' then jsonb_build_object('assetUrl',r.data->'assetUrl','colors',r.data->'colors','guidelines',r.data->'guidelines')
 when r.kind='forms' then jsonb_build_object('description',r.data->'description','questions',r.data->'questions')
 when r.kind='portal' then jsonb_build_object('welcome',r.data->'welcome','items',(select coalesce(jsonb_agg(jsonb_build_object('title',p.title,'kind',p.kind,'status',p.status,'blocks',p.data->'blocks','caption',p.data->'caption','assetUrl',p.data->'assetUrl')),'[]') from public.q24_records p where p.workspace_id=r.workspace_id and not p.deleted and p.kind in ('knowledge','content','brand') and r.data->'recordIds' ? p.id::text),'invoices',(select coalesce(jsonb_agg(jsonb_build_object('number',i->>'number','status',i->>'status','amount',i->'amount','due',i->>'due')),'[]') from public.q_workspace_snapshots snap cross join lateral jsonb_array_elements(coalesce(snap.snapshot->'invoices','[]')) i where snap.workspace_id=r.workspace_id and r.data->'invoiceIds' ? (i->>'id')))
 when r.kind='booking' then jsonb_build_object('start',r.data->'start','end',r.data->'end','location',r.data->'location') else '{}'::jsonb end);return result;
 elsif a='submit' then
 if r.kind='forms' and r.status<>'Open' then raise exception 'This form is closed';end if;
 perform pg_advisory_xact_lock(hashtextextended(t::text,0));
 if (select count(*) from public.q24_feedback where token=t and created_at>now()-interval '1 day')>=100 then raise exception 'This link has reached its daily submission limit';end if;
 insert into public.q24_feedback(token,name,email,body,decision) values(t,trim(d->>'name'),trim(coalesce(d->>'email','')),trim(d->>'body'),case when r.kind='forms' then 'Submission' else coalesce(d->>'decision','Comment') end);
 insert into public.q24_inbox(workspace_id,user_id,title,record_id,category) values(r.workspace_id,r.created_by,'Client response: '||r.title,r.id,'feedback');
 if r.kind='forms' then
 insert into public.q24_records(workspace_id,kind,title,status,data,created_by,updated_by) values(r.workspace_id,case when r.data->>'destination' in ('crm','support','requests') then r.data->>'destination' else 'support' end,'Form: '||left(r.title,150),case r.data->>'destination' when 'crm' then 'New lead' when 'requests' then 'Pending' else 'Open' end,jsonb_build_object('client',d->>'name','email',d->>'email','details',d->>'body','sourceForm',r.id),r.created_by,r.created_by);
 end if;
 return '{"ok":true}'::jsonb;
 end if;raise exception 'Unknown action';
end $$;
revoke all on function qanteak_private.q24_public(uuid,text,jsonb) from public;
grant usage on schema qanteak_private to anon;
grant execute on function qanteak_private.q24_public(uuid,text,jsonb) to anon,authenticated;
create or replace function public.q24_public(p_token uuid,p_action text,p_data jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select qanteak_private.q24_public(p_token,p_action,p_data)$$;
revoke all on function public.q24_public(uuid,text,jsonb) from public;
grant execute on function public.q24_public(uuid,text,jsonb) to anon,authenticated;

create or replace function qanteak_private.q24_feedback(w uuid,r uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.q24_records where id=r and workspace_id=w and qanteak_private.q24_allowed(w,kind,'view',created_by)) then raise exception 'Access denied' using errcode='42501';end if;
 return coalesce((select jsonb_agg(x order by x.created_at desc) from(select f.* from public.q24_feedback f join public.q24_shares s on s.token=f.token where s.record_id=r order by f.created_at desc limit 300)x),'[]');
end $$;
revoke all on function qanteak_private.q24_feedback(uuid,uuid) from public,anon;
grant execute on function qanteak_private.q24_feedback(uuid,uuid) to authenticated;
create or replace function public.q24_feedback(p_workspace_id uuid,p_record_id uuid) returns jsonb language sql security invoker set search_path='' as $$select qanteak_private.q24_feedback(p_workspace_id,p_record_id)$$;
revoke all on function public.q24_feedback(uuid,uuid) from public,anon;
grant execute on function public.q24_feedback(uuid,uuid) to authenticated;
