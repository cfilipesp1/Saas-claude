-- Make birth_date optional (nullable) so patients can be created without it
ALTER TABLE public.patients ALTER COLUMN birth_date DROP NOT NULL;
