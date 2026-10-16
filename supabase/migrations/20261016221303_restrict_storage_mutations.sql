-- Existing authenticated cover policies allow cross-project writes by clients.
-- Preserve existing strategist upload flows; restricted staff use server APIs only.
create policy rotevo_storage_insert_strategist_only on storage.objects
 as restrictive for insert to authenticated
 with check ((select public.is_strategist()));
create policy rotevo_storage_update_strategist_only on storage.objects
 as restrictive for update to authenticated
 using ((select public.is_strategist())) with check ((select public.is_strategist()));
create policy rotevo_storage_delete_strategist_only on storage.objects
 as restrictive for delete to authenticated
 using ((select public.is_strategist()));
