-- ============================================================
-- DIAGNÓSTICO DO BANCO DE DADOS — Cole e execute no Supabase SQL Editor
-- ============================================================
-- Este script verifica se todas as tabelas, funções, triggers e
-- políticas RLS estão configuradas corretamente.
-- ============================================================

-- 1. Verificar se as tabelas existem
SELECT '1. TABELAS' as check_group;
SELECT table_name,
       CASE WHEN table_name IS NOT NULL THEN '✅ Existe' ELSE '❌ Faltando' END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('clinics', 'profiles', 'patients', 'professionals', 'waitlist_entries', 'waitlist_events')
ORDER BY table_name;

-- 2. Verificar se RLS está habilitado
SELECT '2. RLS HABILITADO' as check_group;
SELECT relname as table_name,
       CASE WHEN relrowsecurity THEN '✅ RLS Ativo' ELSE '❌ RLS Desativado' END as rls_status
FROM pg_class
WHERE relname IN ('clinics', 'profiles', 'patients', 'professionals', 'waitlist_entries', 'waitlist_events')
  AND relnamespace = 'public'::regnamespace
ORDER BY relname;

-- 3. Verificar se a função current_clinic_id() existe
SELECT '3. FUNÇÕES' as check_group;
SELECT routine_name,
       CASE WHEN routine_name IS NOT NULL THEN '✅ Existe' ELSE '❌ Faltando' END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('current_clinic_id', 'set_clinic_id', 'handle_new_user');

-- 4. Verificar triggers
SELECT '4. TRIGGERS' as check_group;
SELECT trigger_name, event_object_table,
       CASE WHEN trigger_name IS NOT NULL THEN '✅ Existe' ELSE '❌ Faltando' END as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN ('trg_patients_set_clinic', 'trg_professionals_set_clinic', 'trg_waitlist_entries_set_clinic', 'trg_waitlist_events_set_clinic')
ORDER BY trigger_name;

-- 5. Verificar políticas RLS da tabela patients
SELECT '5. POLÍTICAS RLS (patients)' as check_group;
SELECT policyname, cmd as operation, qual as using_expr, with_check
FROM pg_policies
WHERE tablename = 'patients' AND schemaname = 'public'
ORDER BY policyname;

-- 6. Verificar dados do usuário logado
SELECT '6. PERFIL DO USUÁRIO LOGADO' as check_group;
SELECT
  p.user_id,
  p.full_name,
  p.role,
  p.clinic_id,
  c.name as clinic_name,
  CASE WHEN p.clinic_id IS NOT NULL AND c.id IS NOT NULL THEN '✅ OK'
       WHEN p.clinic_id IS NOT NULL AND c.id IS NULL THEN '❌ Clínica não existe na tabela clinics!'
       ELSE '❌ Sem clinic_id!'
  END as status
FROM public.profiles p
LEFT JOIN public.clinics c ON c.id = p.clinic_id
WHERE p.user_id = auth.uid();

-- 7. Testar current_clinic_id()
SELECT '7. TESTE current_clinic_id()' as check_group;
SELECT
  public.current_clinic_id() as clinic_id_retornado,
  CASE WHEN public.current_clinic_id() IS NOT NULL THEN '✅ Retorna valor'
       ELSE '❌ Retorna NULL — o trigger vai falhar!'
  END as status;

-- 8. Verificar colunas da tabela patients
SELECT '8. COLUNAS DA TABELA patients' as check_group;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'patients'
ORDER BY ordinal_position;

-- 9. Contar registros
SELECT '9. CONTAGEM DE REGISTROS' as check_group;
SELECT
  (SELECT count(*) FROM public.clinics) as clinics_count,
  (SELECT count(*) FROM public.profiles) as profiles_count,
  (SELECT count(*) FROM public.patients) as patients_count;
