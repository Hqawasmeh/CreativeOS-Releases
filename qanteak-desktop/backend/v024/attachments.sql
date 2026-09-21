create or replace function qanteak_private.q24_file_allowed(r uuid,act text) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.q24_records where id=r and not deleted and qanteak_private.q24_allowed(workspace_id,kind,act,created_by))$$;
revoke all on function qanteak_private.q24_file_allowed(uuid,text) from public,anon;
grant execute on function qanteak_private.q24_file_allowed(uuid,text) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit) values('qanteak-modules','qanteak-modules',false,10485760) on conflict(id) do nothing;
create policy q24_module_upload on storage.objects for insert to authenticated with check(bucket_id='qanteak-modules' and qanteak_private.q24_file_allowed((storage.foldername(name))[1]::uuid,'edit'));
create policy q24_module_download on storage.objects for select to authenticated using(bucket_id='qanteak-modules' and qanteak_private.q24_file_allowed((storage.foldername(name))[1]::uuid,'view'));
