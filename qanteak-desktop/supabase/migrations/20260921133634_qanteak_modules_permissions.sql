create or replace function qanteak_private.q24_allowed(w uuid,k text,act text,creator uuid default null) returns boolean language plpgsql stable security definer set search_path='' as $$
declare m public.q_workspace_members; p text;
begin
 select * into m from public.q_workspace_members where workspace_id=w and user_id=auth.uid() and status='active';
 if m.user_id is null then return false;end if;
 if k not in ('studio','settings','templates','portal','crm','content','brand','goals','requests','support','equipment','booking','onboarding','focus','whiteboard','knowledge','clips','forms','workflows','planning') then return false;end if;
 if k='focus' then return creator is null or creator=auth.uid();end if;
 if lower(m.role) in ('owner','admin') then return true;end if;
 if k in ('settings','studio') then return k='studio' and (m.access ? 'Everything') and (act='view' or lower(m.role) not in ('viewer','guest'));end if;
 if k='portal' then return false;end if;
 if k='requests' and creator is not null and creator<>auth.uid() then return false;end if;
 if act<>'view' and lower(m.role) in ('viewer','guest') then return false;end if;
 p:=case when k in ('crm','support','forms') then 'clients' when k in ('brand','equipment','clips') then 'files' when k in ('planning','onboarding','requests') then 'tasks' when k='knowledge' then 'documents' when k='workflows' then 'business' when k in ('content','goals','whiteboard','booking','templates') then 'projects' else null end;
 if p is null then return false;end if;
 if jsonb_typeof(m.access)='array' then return m.access ? 'Everything' or m.access ? p or m.access ? (p||'.'||act) or m.access ? (p||':'||act);end if;
 return coalesce(m.access->p='true'::jsonb or m.access->p->>'all'='true' or m.access->p->>act='true',false);
end $$;
revoke all on function qanteak_private.q24_allowed(uuid,text,text,uuid) from public,anon;
grant execute on function qanteak_private.q24_allowed(uuid,text,text,uuid) to authenticated;

create policy q24_inbox_record_access on public.q24_inbox as restrictive for select to authenticated using(record_id is null or qanteak_private.q24_file_allowed(record_id,'view'));
