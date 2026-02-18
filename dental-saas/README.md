# O+ Dental SaaS

Sistema multi-clínica (multi-tenant) para gestão odontológica.

**Stack:** Next.js 15 (App Router) · TypeScript · Supabase (Postgres + Auth) · Tailwind CSS · Row Level Security

---

## Funcionalidades do MVP

- **Autenticação** — Login com email/senha via Supabase Auth
- **Multi-tenant com RLS** — Cada clínica possui dados isolados no nível do banco
- **Profissionais** — CRUD completo (nome, especialidade, ativo/inativo)
- **Pacientes** — CRUD com busca por nome, telefone, CPF ou email
- **Fila de Espera** — Kanban por status com histórico de eventos (auditoria)
- **Dashboard** — Contadores de profissionais, pacientes e fila ativa

---

## 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Crie um novo projeto (anote a **URL** e **anon key**)
3. No painel do projeto, vá em **SQL Editor** e execute o conteúdo de:
   ```
   supabase/migrations/0001_init.sql
   ```
   Isso criará todas as tabelas, enums, RLS policies e triggers.

---

## 2. Configurar `.env.local`

Copie o arquivo de exemplo e preencha com suas credenciais:

```bash
cp .env.local.example .env.local
```

Edite `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_ANON_KEY
```

---

## 3. Criar Primeira Clínica + Usuário OWNER (Seed)

### Passo 1: Criar a clínica

No **SQL Editor** do Supabase:

```sql
INSERT INTO public.clinics (id, name)
VALUES (gen_random_uuid(), 'Minha Clínica Odontológica');
```

Anote o `id` retornado (ex: `aaaaaaaa-1111-2222-3333-444444444444`).

### Passo 2: Criar usuário

No painel do Supabase, vá em **Authentication > Users > Add User**:
- Email: `admin@suaclinica.com`
- Password: defina uma senha segura

Anote o **User UID** gerado.

### Passo 3: Vincular perfil

No **SQL Editor**:

```sql
INSERT INTO public.profiles (user_id, clinic_id, full_name, role)
VALUES (
  'USER_UID_AQUI',
  'CLINIC_ID_AQUI',
  'Administrador',
  'OWNER'
);
```

Pronto! Agora este usuário pode fazer login e acessar a clínica.

---

## 4. Rodar Localmente

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) e faça login com o usuário criado.

---

## 5. Build para Produção

```bash
npm run build
npm start
```

---

## Estrutura de Pastas

```
dental-saas/
├── src/
│   ├── app/
│   │   ├── (authenticated)/       # Rotas protegidas
│   │   │   ├── dashboard/
│   │   │   ├── professionals/
│   │   │   ├── patients/
│   │   │   ├── waitlist/
│   │   │   └── layout.tsx         # Layout com navbar
│   │   ├── login/
│   │   ├── globals.css
│   │   ├── layout.tsx             # Root layout
│   │   └── page.tsx               # Redireciona para /dashboard
│   ├── actions/                   # Server Actions
│   │   ├── auth.ts
│   │   ├── professionals.ts
│   │   ├── patients.ts
│   │   └── waitlist.ts
│   ├── components/
│   │   └── Navbar.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts          # Client-side Supabase
│   │   │   ├── server.ts          # Server-side Supabase
│   │   │   └── middleware.ts      # Auth middleware helper
│   │   └── types.ts
│   └── middleware.ts              # Next.js middleware
├── supabase/
│   └── migrations/
│       └── 0001_init.sql          # Schema completo com RLS
├── .env.local.example
├── next.config.ts
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Segurança (RLS)

- **Row Level Security** habilitado em TODAS as tabelas
- `current_clinic_id()` — função SQL que retorna a clínica do usuário logado
- **Triggers** auto-setam `clinic_id` em todo INSERT (nunca vem do frontend)
- Políticas garantem que SELECT/UPDATE/DELETE só funcionam dentro da clínica
- Mesmo que o frontend envie um `clinic_id` adulterado, o trigger sobrescreve com o correto
- Um usuário **nunca** consegue acessar dados de outra clínica

---

## Roles Disponíveis

| Role | Descrição |
|------|-----------|
| `OWNER` | Dono da clínica — acesso total |
| `ADMIN` | Administrador |
| `MANAGER` | Gerente |
| `RECEPTION` | Recepção |
| `PROFESSIONAL` | Profissional de saúde |

> As permissões por role podem ser implementadas no frontend e/ou via políticas RLS adicionais conforme necessidade.
