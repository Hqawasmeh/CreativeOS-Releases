CREATE OR REPLACE FUNCTION public.q_push_workspace_snapshot(p_workspace_id uuid, p_expected_revision bigint, p_snapshot jsonb)
 RETURNS q_workspace_snapshots
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare
  r public.q_workspace_snapshots;
  old_snapshot jsonb;
  next_snapshot jsonb := coalesce(p_snapshot,'{}'::jsonb);
begin
  if auth.uid() is null or not private.q_is_workspace_member(p_workspace_id) then
    raise exception 'workspace access denied' using errcode='42501';
  end if;
  select snapshot into old_snapshot from public.q_workspace_snapshots where workspace_id=p_workspace_id for update;
  if old_snapshot is null then raise exception 'workspace snapshot not found' using errcode='22023'; end if;

  if coalesce(old_snapshot->'projects','[]'::jsonb) is distinct from coalesce(next_snapshot->'projects','[]'::jsonb)
     and not private.q_has_module_write(p_workspace_id,'projects') then raise exception 'projects are read-only for this account' using errcode='42501'; end if;
  if coalesce(old_snapshot->'tasks','[]'::jsonb) is distinct from coalesce(next_snapshot->'tasks','[]'::jsonb)
     and not private.q_has_module_write(p_workspace_id,'tasks') then raise exception 'tasks are read-only for this account' using errcode='42501'; end if;
  if (coalesce(old_snapshot->'clients','[]'::jsonb) is distinct from coalesce(next_snapshot->'clients','[]'::jsonb)
      or coalesce(old_snapshot->'leads','[]'::jsonb) is distinct from coalesce(next_snapshot->'leads','[]'::jsonb))
     and not private.q_has_module_write(p_workspace_id,'clients') then raise exception 'clients are read-only for this account' using errcode='42501'; end if;
  if coalesce(old_snapshot->'reviews','[]'::jsonb) is distinct from coalesce(next_snapshot->'reviews','[]'::jsonb)
     and not private.q_has_module_write(p_workspace_id,'reviews') then raise exception 'reviews are read-only for this account' using errcode='42501'; end if;
  if coalesce(old_snapshot->'documents','[]'::jsonb) is distinct from coalesce(next_snapshot->'documents','[]'::jsonb)
     and not private.q_has_module_write(p_workspace_id,'documents') then raise exception 'documents are read-only for this account' using errcode='42501'; end if;
  if coalesce(old_snapshot->'files','[]'::jsonb) is distinct from coalesce(next_snapshot->'files','[]'::jsonb)
     and not private.q_has_module_write(p_workspace_id,'files') then raise exception 'files are read-only for this account' using errcode='42501'; end if;
  if (coalesce(old_snapshot->'invoices','[]'::jsonb) is distinct from coalesce(next_snapshot->'invoices','[]'::jsonb)
      or coalesce(old_snapshot->'estimates','[]'::jsonb) is distinct from coalesce(next_snapshot->'estimates','[]'::jsonb)
      or coalesce(old_snapshot->'expenses','[]'::jsonb) is distinct from coalesce(next_snapshot->'expenses','[]'::jsonb)
      or coalesce(old_snapshot->'automations','[]'::jsonb) is distinct from coalesce(next_snapshot->'automations','[]'::jsonb))
     and not private.q_has_module_write(p_workspace_id,'business') then raise exception 'business data is read-only for this account' using errcode='42501'; end if;

  if old_snapshot = next_snapshot then
    select * into r from public.q_workspace_snapshots where workspace_id=p_workspace_id;
    return r;
  end if;

  update public.q_workspace_snapshots
     set snapshot=next_snapshot, revision=revision+1, updated_by=auth.uid(), updated_at=now()
   where workspace_id=p_workspace_id and revision=p_expected_revision
   returning * into r;
  if r.workspace_id is null then raise exception 'workspace revision conflict' using errcode='40001'; end if;
  insert into public.q_workspace_events(workspace_id,actor_user_id,event_type,entity_type,entity_id,payload)
  values(p_workspace_id,auth.uid(),'snapshot.updated','workspace',p_workspace_id::text,jsonb_build_object('revision',r.revision));
  return r;
end $function$

