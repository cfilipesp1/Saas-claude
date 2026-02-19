-- ============================================================
-- O+ Dental SaaS — MIGRATION COMPLETA (cole tudo no SQL Editor)
-- ============================================================

-- 1. ENUMS
create type public.user_role as enum (
  'OWNER', 'ADMIN', 'MANAGER', 'RECEPTION', 'PROFESSIONAL'
);

create type public.waitlist_status as enum (
  'NEW', 'CONTACTING', 'SCHEDULED', 'UNREACHABLE', 'NO_SHOW', 'CANCELLED', 'DONE'
);

-- 2. TABLES

create table public.clinics (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  clinic_id  uuid not null references public.clinics(id) on delete cascade,
  full_name  text not null default '',
  role       public.user_role not null default 'RECEPTION',
  created_at timestamptz not null default now()
);

create table public.professionals (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  uuid not null references public.clinics(id) on delete cascade,
  name       text not null,
  specialty  text not null default '',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.patients (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  uuid not null references public.clinics(id) on delete cascade,
  name       text not null,
  phone      text not null default '',
  email      text not null default '',
  cpf        text not null default '',
  birth_date date,
  notes      text not null default '',
  created_at timestamptz not null default now()
);

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

create table public.anamnesis (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references public.clinics(id) on delete cascade,
  patient_id      uuid not null references public.patients(id) on delete cascade,
  has_allergy           boolean not null default false,
  allergy_details       text not null default '',
  has_heart_disease     boolean not null default false,
  heart_details         text not null default '',
  has_diabetes          boolean not null default false,
  diabetes_details      text not null default '',
  has_hypertension      boolean not null default false,
  hypertension_details  text not null default '',
  has_bleeding_disorder boolean not null default false,
  bleeding_details      text not null default '',
  uses_medication       boolean not null default false,
  medication_details    text not null default '',
  is_pregnant           boolean not null default false,
  is_smoker             boolean not null default false,
  other_conditions      text not null default '',
  has_alert             boolean not null default false,
  alert_message         text not null default '',
  updated_by      uuid references auth.users(id) on delete set null,
  updated_at      timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique(patient_id)
);

-- 3. INDEXES
create index idx_profiles_clinic on public.profiles(clinic_id);
create index idx_professionals_clinic on public.professionals(clinic_id);
create index idx_patients_clinic on public.patients(clinic_id);
create index idx_waitlist_entries_clinic on public.waitlist_entries(clinic_id);
create index idx_waitlist_entries_status on public.waitlist_entries(status);
create index idx_waitlist_events_entry on public.waitlist_events(waitlist_entry_id);
create index idx_anamnesis_patient on public.anamnesis(patient_id);
create index idx_anamnesis_clinic on public.anamnesis(clinic_id);

-- 4. HELPER FUNCTION
create or replace function public.current_clinic_id()
returns uuid
language sql
stable
security definer
as $$
  select clinic_id from public.profiles where user_id = auth.uid();
$$;

-- 5. ENABLE RLS
alter table public.clinics enable row level security;
alter table public.profiles enable row level security;
alter table public.professionals enable row level security;
alter table public.patients enable row level security;
alter table public.waitlist_entries enable row level security;
alter table public.waitlist_events enable row level security;
alter table public.anamnesis enable row level security;

-- 6. RLS POLICIES

create policy "clinics_select" on public.clinics
  for select using (id = public.current_clinic_id());
create policy "clinics_update" on public.clinics
  for update using (id = public.current_clinic_id())
  with check (id = public.current_clinic_id());

create policy "profiles_select" on public.profiles
  for select using (user_id = auth.uid());
create policy "profiles_update" on public.profiles
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "professionals_select" on public.professionals
  for select using (clinic_id = public.current_clinic_id());
create policy "professionals_insert" on public.professionals
  for insert with check (clinic_id = public.current_clinic_id());
create policy "professionals_update" on public.professionals
  for update using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());
create policy "professionals_delete" on public.professionals
  for delete using (clinic_id = public.current_clinic_id());

create policy "patients_select" on public.patients
  for select using (clinic_id = public.current_clinic_id());
create policy "patients_insert" on public.patients
  for insert with check (clinic_id = public.current_clinic_id());
create policy "patients_update" on public.patients
  for update using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());
create policy "patients_delete" on public.patients
  for delete using (clinic_id = public.current_clinic_id());

create policy "waitlist_entries_select" on public.waitlist_entries
  for select using (clinic_id = public.current_clinic_id());
create policy "waitlist_entries_insert" on public.waitlist_entries
  for insert with check (clinic_id = public.current_clinic_id());
create policy "waitlist_entries_update" on public.waitlist_entries
  for update using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());
create policy "waitlist_entries_delete" on public.waitlist_entries
  for delete using (clinic_id = public.current_clinic_id());

create policy "waitlist_events_select" on public.waitlist_events
  for select using (clinic_id = public.current_clinic_id());
create policy "waitlist_events_insert" on public.waitlist_events
  for insert with check (clinic_id = public.current_clinic_id());

create policy "anamnesis_select" on public.anamnesis
  for select using (clinic_id = public.current_clinic_id());
create policy "anamnesis_insert" on public.anamnesis
  for insert with check (clinic_id = public.current_clinic_id());
create policy "anamnesis_update" on public.anamnesis
  for update using (clinic_id = public.current_clinic_id())
  with check (clinic_id = public.current_clinic_id());
create policy "anamnesis_delete" on public.anamnesis
  for delete using (clinic_id = public.current_clinic_id());

-- 7. AUTO-SET clinic_id TRIGGER
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

create trigger trg_anamnesis_set_clinic
  before insert on public.anamnesis
  for each row execute function public.set_clinic_id();
