-- ============================================
-- 0003: Auto-create clinic + profile on signup
-- ============================================

-- Function that runs after a new user is created in auth.users
-- Creates a default clinic and links the user as OWNER
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  new_clinic_id uuid;
begin
  -- Create a new clinic for the user
  insert into public.clinics (id, name)
  values (gen_random_uuid(), coalesce(new.raw_user_meta_data->>'clinic_name', 'Minha Clínica'))
  returning id into new_clinic_id;

  -- Create profile linking user to clinic as OWNER
  insert into public.profiles (user_id, clinic_id, full_name, role)
  values (
    new.id,
    new_clinic_id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Usuário'),
    'OWNER'
  );

  return new;
end;
$$;

-- Trigger: fires after each new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
