-- ============================================================
-- O+ Dental SaaS — Multi-tenant schema with Row Level Security
-- ============================================================

-- 1. ENUMS
create type public.user_role as enum (
  'OWNER', 'ADMIN', 'MANAGER', 'RECEPTION', 'PROFESSIONAL'
);

create type public.waitlist_status as enum (
  'NEW', 'CONTACTING', 'SCHEDULED', 'UNREACHABLE', 'NO_SHOW', 'CANCELLED', 'DONE'
);

-- 2. TABLES

-- clinics
create table public.clinics (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

-- profiles (1 user = 1 clinic)
create table public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  clinic_id  uuid not null references public.clinics(id) on delete cascade,
  full_name  text not null default '',
  role       public.user_role not null default 'RECEPTION',
  created_at timestamptz not null default now()
);

-- professionals
create table public.professionals (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  uuid not null references public.clinics(id) on delete cascade,
  name       text not null,
  specialty  text not null default '',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- patients
create table public.patients (
  id                     uuid primary key default gen_random_uuid(),
  clinic_id              uuid not null references public.clinics(id) on delete cascade,
  codigo                 text not null default '',
  name                   text not null,
  birth_date             date,
  phone                  text not null default '',
  email                  text not null default '',
  address                text not null default '',
  responsavel_clinico_id text not null default '',
  responsavel_orto_id    text not null default '',
  created_at             timestamptz not null default now()
);

-- waitlist_entries
create table public.waitlist_entries (
  id                        uuid primary key default gen_random_uuid(),
  clinic_id                 uuid not null references public.clinics(id) on delete cascade,
  patient_id                uuid not null references public.patients(id) on delete cascade,
  specialty                 text not null default '',
  preferred_professional_id uuid references public.professionals(id) on delete set null,
  priority                  integer not null default 0,
  status                    public.waitlist_status not null default 'NEW',
  notes                     text not null default '',
  created_at                timestamptz not null default now()
);

-- waitlist_events (audit trail for status changes)
create table public.waitlist_events (
  id                uuid primary key default gen_random_uuid(),
  clinic_id         uuid not null references public.clinics(id) on delete cascade,
  waitlist_entry_id uuid not null references public.waitlist_entries(id) on delete cascade,
  from_status       public.waitlist_status,
  to_status         public.waitlist_status not null,
  actor_user_id     uuid references auth.users(id) on delete set null,
  note              text not null default '',
  created_at        timestamptz not null default now()
);

-- 3. INDEXES
create index idx_profiles_clinic on public.profiles(clinic_id);
create index idx_professionals_clinic on public.professionals(clinic_id);
create index idx_patients_clinic on public.patients(clinic_id);
create index idx_waitlist_entries_clinic on public.waitlist_entries(clinic_id);
create index idx_waitlist_entries_status on public.waitlist_entries(status);
create index idx_waitlist_events_entry on public.waitlist_events(waitlist_entry_id);

-- 4. HELPER FUNCTION — returns current user's clinic_id
create or replace function public.current_clinic_id()
returns uuid
language sql
stable
security definer
as $$
  select clinic_id from public.profiles where user_id = auth.uid();
$$;

-- 5. ENABLE RLS ON ALL TABLES
alter table public.clinics enable row level security;
alter table public.profiles enable row level security;
alter table public.professionals enable row level security;
alter table public.patients enable row level security;
alter table public.waitlist_entries enable row level security;
alter table public.waitlist_events enable row level security;

-- 6. RLS POLICIES

-- clinics: user can only see their own clinic
create policy "clinics_select" on public.clinics
  for select using (id = public.current_clinic_id());

create policy "clinics_update" on public.clinics
  for update using (id = public.current_clinic_id())
  with check (id = public.current_clinic_id());

-- profiles: user can only see their own profile
create policy "profiles_select" on public.profiles
  for select using (user_id = auth.uid());

create policy "profiles_update" on public.profiles
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- professionals: tenant-scoped
create policy "professionals_select" on public.professionals
  for select using (clinic_id = public.current_clinic_id());

create policy "professionals_insert" on public.professionals
  for insert with check (clinic_id = public.current_clinic_id());

create policy "professionals_update" on public.professionals
  for update using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());

create policy "professionals_delete" on public.professionals
  for delete using (clinic_id = public.current_clinic_id());

-- patients: tenant-scoped
create policy "patients_select" on public.patients
  for select using (clinic_id = public.current_clinic_id());

create policy "patients_insert" on public.patients
  for insert with check (clinic_id = public.current_clinic_id());

create policy "patients_update" on public.patients
  for update using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());

create policy "patients_delete" on public.patients
  for delete using (clinic_id = public.current_clinic_id());

-- waitlist_entries: tenant-scoped
create policy "waitlist_entries_select" on public.waitlist_entries
  for select using (clinic_id = public.current_clinic_id());

create policy "waitlist_entries_insert" on public.waitlist_entries
  for insert with check (clinic_id = public.current_clinic_id());

create policy "waitlist_entries_update" on public.waitlist_entries
  for update using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());

create policy "waitlist_entries_delete" on public.waitlist_entries
  for delete using (clinic_id = public.current_clinic_id());

-- waitlist_events: tenant-scoped
create policy "waitlist_events_select" on public.waitlist_events
  for select using (clinic_id = public.current_clinic_id());

create policy "waitlist_events_insert" on public.waitlist_events
  for insert with check (clinic_id = public.current_clinic_id());

-- 7. AUTO-SET clinic_id ON INSERT via trigger
-- This ensures the backend never trusts a client-provided clinic_id

create or replace function public.set_clinic_id()
returns trigger
language plpgsql
security definer
as $$
begin
  new.clinic_id := public.current_clinic_id();
  if new.clinic_id is null then
    raise exception 'User has no clinic assigned';
  end if;
  return new;
end;
$$;

create trigger trg_professionals_set_clinic
  before insert on public.professionals
  for each row execute function public.set_clinic_id();

create trigger trg_patients_set_clinic
  before insert on public.patients
  for each row execute function public.set_clinic_id();

create trigger trg_waitlist_entries_set_clinic
  before insert on public.waitlist_entries
  for each row execute function public.set_clinic_id();

create trigger trg_waitlist_events_set_clinic
  before insert on public.waitlist_events
  for each row execute function public.set_clinic_id();

-- 8. SEED HELPER — run this manually to create your first clinic + owner
-- Replace the email/password with your desired values.
-- Execute via Supabase SQL Editor or psql.
--
-- Step 1: Create clinic
--   insert into public.clinics (id, name) values ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'Minha Clínica');
--
-- Step 2: Create user via Supabase Auth (Dashboard > Authentication > Add User)
--
-- Step 3: Link profile (replace USER_UUID with the auth user id)
--   insert into public.profiles (user_id, clinic_id, full_name, role)
--   values ('USER_UUID', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'Admin', 'OWNER');
