-- Activate the explicitly identified ROTEVO owner only after team_roles has been applied.
-- Fail closed if identity is absent, duplicated, renamed, or not a strategist.
do $$
declare owner_id uuid;
begin
 select p.id into strict owner_id
 from public.profiles p
 join auth.users u on u.id=p.id
 where lower(p.email)='contato@rotevo.com.br'
   and lower(u.email)='contato@rotevo.com.br'
   and p.full_name='Otávio Silva'
   and p.role='strategist';
 if exists(select 1 from public.team_members where role='admin' and user_id<>owner_id) then
  raise exception 'Unexpected existing team administrator; manual review required';
 end if;
 insert into public.team_members(user_id,display_name,role,active)
 values(owner_id,'Otávio Silva','admin',true)
 on conflict(user_id) do update
 set display_name=excluded.display_name,role='admin',active=true,updated_at=now()
 where public.team_members.role='admin';
 if not exists(select 1 from public.team_members where user_id=owner_id and role='admin' and active) then
  raise exception 'Owner membership conflicts with an existing non-admin record';
 end if;
end $$;
