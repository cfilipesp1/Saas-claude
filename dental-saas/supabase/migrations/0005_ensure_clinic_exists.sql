-- ============================================================
-- Migration: Self-healing clinic existence check
-- If the signup trigger failed to create the clinic row,
-- this function re-creates it so inserts don't fail with FK errors.
-- ============================================================

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

  -- Get the clinic_id from the user's profile
  select clinic_id into v_clinic_id
    from public.profiles
   where user_id = v_user_id;

  if v_clinic_id is null then
    raise exception 'User has no profile';
  end if;

  -- Check if the clinic actually exists
  if not exists (select 1 from public.clinics where id = v_clinic_id) then
    -- Re-create the missing clinic row
    insert into public.clinics (id, name)
    values (v_clinic_id, 'Minha Clínica');
  end if;

  return v_clinic_id;
end;
$$;
