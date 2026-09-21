-- Server-side record-created recipes. Trigger writes only internal tasks/reminders.
create table public.q24_workflow_runs(id uuid primary key default gen_random_uuid(),workflow_id uuid not null references public.q24_records(id),source_id uuid not null references public.q24_records(id),status text not null,detail text,created_at timestamptz not null default now(),unique(workflow_id,source_id));
alter table public.q24_workflow_runs enable row level security;
revoke all on public.q24_workflow_runs from public,anon,authenticated;
create index q24_runs_source on public.q24_workflow_runs(source_id);
create or replace function qanteak_private.q24_automate() returns trigger language plpgsql security definer set search_path='' as $$
declare f public.q24_records;run uuid;
begin
 if pg_trigger_depth()>1 or new.kind not in('crm','content','support','forms') then return new;end if;
 for f in select * from public.q24_records where workspace_id=new.workspace_id and kind='workflows' and status='Active' and not deleted and data->>'trigger'='Record created' and data->>'source'=new.kind and (nullif(data->>'conditionStatus','') is null or data->>'conditionStatus'=new.status) loop
 insert into public.q24_workflow_runs(workflow_id,source_id,status) values(f.id,new.id,'Running') on conflict do nothing returning id into run;
 if run is null then continue;end if;
 begin
 if not exists(select 1 from public.q_workspace_members m where m.workspace_id=new.workspace_id and m.user_id=f.created_by and m.status='active' and (f.data->>'action'='Create reminder' or lower(m.role) in('owner','admin') or (lower(m.role) not in('viewer','guest') and ((jsonb_typeof(m.access)='array' and (m.access ? 'Everything' or m.access ? 'tasks' or m.access ? 'tasks.create')) or m.access->'tasks'->>'create'='true')))) then raise exception 'Workflow owner no longer has permission';end if;
 if f.data->>'action'='Create task' then
 insert into public.q24_records(workspace_id,kind,title,status,data,created_by,updated_by) values(new.workspace_id,'planning',left(coalesce(nullif(f.data->>'template',''),new.title),250),'To do',jsonb_build_object('sourceRecordId',new.id,'workflowId',f.id,'notes','Created by workflow: '||f.title),f.created_by,f.created_by);
 elsif f.data->>'action'='Create reminder' then
 insert into public.q23_reminders(workspace_id,user_id,title,due_at) values(new.workspace_id,f.created_by,left(coalesce(nullif(f.data->>'template',''),new.title),200),now()+interval '1 hour');
 else raise exception 'Unsupported automatic action';end if;
 update public.q24_workflow_runs set status='Completed' where id=run;
 exception when others then update public.q24_workflow_runs set status='Failed',detail=left(sqlerrm,500) where id=run;
 end;
 end loop;return new;
end $$;
revoke all on function qanteak_private.q24_automate() from public,anon,authenticated;
create trigger q24_record_created after insert on public.q24_records for each row execute function qanteak_private.q24_automate();
create or replace function qanteak_private.q24_runs(w uuid,r uuid) returns jsonb language plpgsql security definer set search_path='' as $$begin
 if not exists(select 1 from public.q24_records where id=r and workspace_id=w and kind='workflows' and qanteak_private.q24_allowed(w,kind,'view',created_by)) then raise exception 'Access denied' using errcode='42501';end if;
 return coalesce((select jsonb_agg(x order by x.created_at desc) from(select * from public.q24_workflow_runs where workflow_id=r order by created_at desc limit 100)x),'[]');end $$;
revoke all on function qanteak_private.q24_runs(uuid,uuid) from public,anon;
grant execute on function qanteak_private.q24_runs(uuid,uuid) to authenticated;
create or replace function public.q24_runs(p_workspace_id uuid,p_record_id uuid) returns jsonb language sql security invoker set search_path='' as $$select qanteak_private.q24_runs(p_workspace_id,p_record_id)$$;
revoke all on function public.q24_runs(uuid,uuid) from public,anon;
grant execute on function public.q24_runs(uuid,uuid) to authenticated;
