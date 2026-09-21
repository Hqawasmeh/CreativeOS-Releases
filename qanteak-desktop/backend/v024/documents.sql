create or replace function qanteak_private.q24_document(w uuid,d jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.q24_records;blocks jsonb;patch jsonb;old jsonb;found_block boolean;
begin
 select * into r from public.q24_records where id=(d->>'id')::uuid and workspace_id=w and kind='knowledge' and not deleted for update;
 if r.id is null or not qanteak_private.q24_allowed(w,'knowledge','edit',r.created_by) then raise exception 'Document access denied' using errcode='42501';end if;
 blocks:=coalesce(r.data->'blocks','[]');
 if jsonb_array_length(coalesce(d->'patches','[]'))>500 then raise exception 'Too many block changes';end if;
 for patch in select * from jsonb_array_elements(coalesce(d->'patches','[]')) loop
 select value into old from jsonb_array_elements(blocks) where value->>'id'=patch->>'id';found_block:=found;
 if (found_block and old is distinct from patch->'base') or (not found_block and patch->'base' is not null and patch->'base'<>'null') then raise exception 'This block changed on another device. Your draft is preserved; reload and review it.' using errcode='40001';end if;
 if coalesce((patch->>'remove')::boolean,false) then blocks:=(select coalesce(jsonb_agg(value),'[]') from jsonb_array_elements(blocks) where value->>'id'<>patch->>'id');
 elsif found_block then blocks:=(select jsonb_agg(case when value->>'id'=patch->>'id' then patch->'value' else value end) from jsonb_array_elements(blocks));
 else blocks:=blocks||jsonb_build_array(patch->'value');end if;
 end loop;
 return qanteak_private.q24_workspace(w,'save',jsonb_build_object('id',r.id,'version',r.version,'kind',r.kind,'title',r.title,'status',r.status,'data',r.data||jsonb_build_object('blocks',blocks)));
end $$;
revoke all on function qanteak_private.q24_document(uuid,jsonb) from public,anon;
grant execute on function qanteak_private.q24_document(uuid,jsonb) to authenticated;
create or replace function public.q24_document(p_workspace_id uuid,p_data jsonb) returns jsonb language sql security invoker set search_path='' as $$select qanteak_private.q24_document(p_workspace_id,p_data)$$;
revoke all on function public.q24_document(uuid,jsonb) from public,anon;
grant execute on function public.q24_document(uuid,jsonb) to authenticated;
