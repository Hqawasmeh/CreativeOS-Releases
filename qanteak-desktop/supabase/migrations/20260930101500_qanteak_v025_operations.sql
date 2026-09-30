-- Qanteak OS V0.25 operations permissions + inbox alias hotfix.

create or replace function qanteak_private.q24_allowed(
  w uuid,
  k text,
  act text,
  creator uuid default null
) returns boolean
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  m public.q_workspace_members;
  p text;
begin
  select * into m
  from public.q_workspace_members
  where workspace_id=w and user_id=auth.uid() and status='active';

  if m.user_id is null then return false; end if;

  if k not in (
    'studio','settings','templates','portal','crm','content','brand','goals',
    'requests','support','equipment','booking','onboarding','focus','whiteboard',
    'knowledge','clips','forms','workflows','planning','timesheets','dashboards'
  ) then return false; end if;

  if k='focus' then return creator is null or creator=auth.uid(); end if;
  if lower(m.role) in ('owner','admin') then return true; end if;

  if k in ('settings','studio') then
    return k='studio'
      and (m.access ? 'Everything')
      and (act='view' or lower(m.role) not in ('viewer','guest'));
  end if;

  if k='portal' then return false; end if;
  if k='requests' and creator is not null and creator<>auth.uid() then return false; end if;
  if act<>'view' and lower(m.role) in ('viewer','guest') then return false; end if;

  p:=case
    when k in ('crm','support','forms') then 'clients'
    when k in ('brand','equipment','clips') then 'files'
    when k in ('planning','onboarding','requests') then 'tasks'
    when k='knowledge' then 'documents'
    when k in ('workflows','timesheets','dashboards') then 'business'
    when k in ('content','goals','whiteboard','booking','templates') then 'projects'
    else null
  end;

  if p is null then return false; end if;

  if jsonb_typeof(m.access)='array' then
    return m.access ? 'Everything'
      or m.access ? p
      or m.access ? (p||'.'||act)
      or m.access ? (p||':'||act);
  end if;

  return coalesce(
    m.access->p='true'::jsonb
    or m.access->p->>'all'='true'
    or m.access->p->>act='true',
    false
  );
end
$$;

revoke all on function qanteak_private.q24_allowed(uuid,text,text,uuid) from public,anon;
grant execute on function qanteak_private.q24_allowed(uuid,text,text,uuid) to authenticated;

drop policy if exists q24_preferences_read on public.q24_preferences;
create policy q24_preferences_read
on public.q24_preferences
for select
to authenticated
using (
  user_id=(select auth.uid())
  and exists(
    select 1
    from public.q_workspace_members m
    where m.workspace_id=q24_preferences.workspace_id
      and m.user_id=(select auth.uid())
      and m.status='active'
  )
);

grant select on public.q24_preferences to authenticated;

create or replace function public.q24_workspace(
  p_workspace_id uuid,
  p_action text,
  p_data jsonb default '{}'
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
begin
  if p_action='inbox' then
    return jsonb_build_object(
      'items',
      coalesce((
        select jsonb_agg(x order by x.id desc)
        from (
          select i.*
          from public.q24_inbox i
          left join public.q24_records qr on qr.id=i.record_id
          where i.workspace_id=p_workspace_id
            and i.user_id=auth.uid()
            and (
              i.source_room is null
              or qanteak_private.q24_room_allowed(i.source_room)
            )
            and (
              qr.id is null
              or qanteak_private.q24_allowed(
                p_workspace_id,
                qr.kind,
                'view',
                qr.created_by
              )
            )
          order by i.id desc
          limit 300
        ) x
      ), '[]'::jsonb),
      'preferences',
      coalesce((
        select p.data
        from public.q24_preferences p
        where p.workspace_id=p_workspace_id
          and p.user_id=auth.uid()
      ), '{}'::jsonb)
    );
  end if;

  return qanteak_private.q24_workspace(
    p_workspace_id,
    p_action,
    p_data
  );
end
$$;

revoke all on function public.q24_workspace(uuid,text,jsonb) from public,anon;
grant execute on function public.q24_workspace(uuid,text,jsonb) to authenticated;
