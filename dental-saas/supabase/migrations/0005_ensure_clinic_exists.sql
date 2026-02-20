-- ============================================================
-- Migration: Fix missing clinics + self-healing function
-- 1. Inserts missing clinic rows for any profile that references
--    a non-existent clinic (fixes FK constraint errors immediately)
-- 2. Creates ensure_clinic_exists() function for future protection
-- ============================================================

-- STEP 1: Fix existing data — create missing clinics
insert into public.clinics (id, name)
select p.clinic_id, 'Minha Clínica'
  from public.profiles p
 where not exists (
   select 1 from public.clinics c where c.id = p.clinic_id
 )
on conflict (id) do nothing;

-- STEP 2: Create self-healing function for future use
create or replace function public.ensure_clinic_exists()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clinic_id uuid;
  v_user_id   uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select clinic_id into v_clinic_id
    from public.profiles
   where user_id = v_user_id;

  if v_clinic_id is null then
    raise exception 'User has no profile';
  end if;

  if not exists (select 1 from public.clinics where id = v_clinic_id) then
    insert into public.clinics (id, name)
    values (v_clinic_id, 'Minha Clínica');
  end if;

  return v_clinic_id;
end;
$$;
