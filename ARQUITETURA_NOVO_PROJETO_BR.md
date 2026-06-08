# Avaliação Arquitetural — Nova Implementação Brasil

**Data:** 08/06/2026  
**Contexto:** Reescrita do zero para subdomínio brasileiro  
**Restrição removida:** Stack atual, banco de dados e hospedagem são todos substituíveis  
**Objetivo:** Melhor arquitetura para SaaS multi-tenant de agendamento  

---

## 1. O Que a Arquitetura Atual Faz Bem (Manter)

Antes de propor mudanças, o que já está correto e deve ser preservado:

| Decisão Atual | Por Que Manter |
|---|---|
| Motor de slots no frontend (TypeScript) | Correto — cálculo puro, sem round-trip. Permanece em React |
| Validação final de conflito no backend (transação) | Correto — lock de banco evita double-booking. Permanece |
| Tipagem TypeScript completa | Correto — manter e expandir |
| React + Vite como frontend | Correto — leve, moderno, sem motivo para mudar |
| Soft delete com `deleted_at` | Correto — nunca destruir dados de agendamento |
| Notificações via Telegram | Correto — integração simples e eficiente |
| Estrutura de dados (services, availability, blocked_dates) | Correto — o modelo de dados está sólido |
| Multi-tenant por `account_id` | Correto como conceito — mas a implementação pode melhorar |

---

## 2. O Que a Arquitetura Atual Tem de Problema

### Problema 1 — Isolamento de Tenant é Responsabilidade do Código (Risco Alto)

```php
// TODA query precisa lembrar de filtrar account_id:
$services = Db::fetchAll('SELECT ... FROM cp_agenda_services WHERE account_id = ?', [$accountId]);

// Se qualquer route ESQUECER esse filtro, dados de outros tenants vazam.
// Isso já acontece implicitamente — o backend confia no código, não no banco.
```

**Risco:** Se qualquer endpoint novo for escrito sem o filtro `account_id`, dados de tenants diferentes podem ser expostos. O banco de dados não impede isso — só o código.

---

### Problema 2 — Sessões PHP em Shared Hosting Não Escalam

O sistema usa `$_SESSION` nativo do PHP armazenado em arquivos no servidor. Em shared hosting isso funciona, mas:
- Não permite deploy em múltiplos servidores
- Rate limiting é feito em arquivo (mesmo problema)
- Sessões não têm expiração refinada por dispositivo
- Não suporta "logout de todos os dispositivos"

---

### Problema 3 — Polling de 15s no Frontend

```typescript
// App.tsx — polling manual a cada 15 segundos:
setInterval(() => fetchAppointments(), 15000);
```

O profissional recebe um novo agendamento com até 15 segundos de atraso. Não há notificação em tempo real.

---

### Problema 4 — Imagens Armazenadas como URLs Externas

O sistema salva `cover_image`, `profile_image` e `image_url` de serviços como strings de URL. Não há upload gerenciado, sem CDN, sem resize automático, sem segurança por tenant.

---

### Problema 5 — PHP Vanilla = Muito Código Boilerplate

O backend atual tem ~800 linhas de PHP para fazer: auth, queries SQL, CORS, sessão, headers de segurança, rate limiting. Tudo construído à mão. Cada feature nova exige reescrever infraestrutura.

---

## 3. As 3 Opções Arquiteturais

### Opção A — Refinar o Atual (PHP + MySQL melhorado)

Manter PHP + MySQL mas adicionar melhorias pontuais.

**Mudanças:**
- PHP sessions → JWT + Redis
- MySQL → MySQL com melhor indexação
- Rate limiting em Redis em vez de arquivo
- Upload para S3 (Wasabi/Cloudflare R2)

**Prós:**
- Menor esforço — reutiliza código existente
- Nada novo para aprender

**Contras:**
- Multi-tenancy ainda é responsabilidade do código (não do banco)
- Não há realtime sem WebSocket manual
- PHP continua sendo boilerplate pesado
- Redis/S3 adicionam complexidade operacional
- Latência do MySQL em shared hosting não melhora

**Veredicto:** ❌ Não recomendado para uma reescrita — corrige sintomas, não a causa.

---

### Opção B — Node.js + PostgreSQL (Controle Total)

Backend em TypeScript com Hono ou Fastify + PostgreSQL no Neon ou self-hosted.

**Stack:**
- Backend: Node.js + Hono (TypeScript)
- Banco: PostgreSQL (Neon serverless)
- Auth: Better Auth ou Lucia
- Storage: Cloudflare R2 ou Supabase Storage
- Frontend: React + Vite (igual)
- Hosting: Vercel (frontend) + Fly.io ou Railway (backend)

**Prós:**
- TypeScript end-to-end
- PostgreSQL com suporte a RLS
- Muito mais flexível que PHP
- Hono é extremamente rápido e simples
- Controle total sobre cada detalhe

**Contras:**
- Auth, storage, realtime ainda precisam ser construídos manualmente
- Neon não tem região no Brasil (us-east-2)
- Mais peças para operar (3 serviços vs. 1)
- Sem realtime nativo — precisaria de WebSocket manual

**Veredicto:** ✅ Boa opção se você quer controle total. Mais trabalho inicial.

---

### Opção C — Supabase + React + Vercel (Recomendado)

Supabase é PostgreSQL gerenciado com Auth, Storage, Realtime e Edge Functions integrados.

**Stack:**
- Banco: PostgreSQL com RLS (Supabase)
- Auth: Supabase Auth (JWT + sessions)
- Storage: Supabase Storage (imagens com CDN)
- Realtime: Supabase Realtime (WebSocket)
- Edge Functions: Deno (notificações Telegram, email)
- Email: Resend
- Frontend: React + Vite (igual)
- Hosting: Vercel (frontend)

**Prós:**
- ✅ RLS = multi-tenancy no nível do banco — impossível vazar dados entre tenants
- ✅ Auth completo em 0 linhas de código
- ✅ Realtime nativo — substituí o polling de 15s
- ✅ Storage com CDN para imagens
- ✅ ~80% do PHP backend some (substituído por RLS + Auth)
- ✅ TypeScript SDK auto-gerado a partir do schema SQL
- ✅ CLI para migrations, local dev identico ao production
- ✅ Free tier robusto para MVP

**Contras:**
- ⚠️ Sem região no Brasil (mais próximo: us-east-1). Latência ~100-150ms
- ⚠️ Vendor lock-in parcial (RLS e Storage são portáveis, Auth tem migração)
- ⚠️ Edge Functions em Deno (aprendizado se não conhece)

**Veredicto:** ✅✅ **Recomendado** — resolve os 5 problemas arquiteturais de uma vez.

---

## 4. Recomendação Final e Justificativa

### Stack Recomendado

```
Frontend:    React 19 + TypeScript + Vite + Tailwind CSS  →  Vercel
Database:    PostgreSQL + Row-Level Security              →  Supabase
Auth:        JWT + Sessions nativas                       →  Supabase Auth
Storage:     Imagens de capa, perfil, serviços            →  Supabase Storage
Realtime:    Novos agendamentos em tempo real             →  Supabase Realtime
Email:       Recuperação de senha, confirmações           →  Resend
Notif.:      Telegram via Supabase Edge Function          →  Supabase Edge Functions
Rate limit:  Nativo no Supabase Auth + Upstash Redis      →  opcional
```

### Por Que Esta Combinação?

**O problema central de qualquer SaaS multi-tenant é o isolamento de dados.**

Com MySQL/PHP atual: Se uma query esquecer `WHERE account_id = ?`, outra empresa vê dados que não deveria. A segurança é um contrato entre desenvolvedores.

Com PostgreSQL + RLS: O banco de dados *fisicamente impede* que um tenant leia dados de outro, independente do que o código faça.

```sql
-- RLS Policy: nenhuma query pode ler appointments de outro account
CREATE POLICY "tenant_isolation"
ON appointments
FOR ALL
USING (account_id = (current_setting('app.current_account_id'))::uuid);

-- Mesmo que o código esqueça o filtro, o banco retorna zero rows.
-- Segurança na camada certa.
```

---

## 5. Arquitetura Proposta — Detalhada

```
┌───────────────────────────────────────────────────────────────────────┐
│                    CLIENTE — Navegador                                │
│                                                                       │
│  React 19 + TypeScript + Vite + Tailwind CSS                          │
│  ┌──────────────────┐  ┌────────────────┐  ┌──────────────────────┐  │
│  │  PublicBookingPage│  │ClientDashboard │  │   AdminDashboard     │  │
│  │  (sem login)      │  │(profissional)  │  │   (super_admin)      │  │
│  └──────────────────┘  └────────────────┘  └──────────────────────┘  │
│                  │ Supabase JS Client (SDK)                           │
│                  │ + realtime subscription                            │
└──────────────────┼────────────────────────────────────────────────────┘
                   │ HTTPS  (Vercel CDN - PoP em São Paulo)
┌──────────────────┼────────────────────────────────────────────────────┐
│             SUPABASE (us-east-1)                                      │
│                  │                                                    │
│  ┌───────────────▼──────────────────────────────────────────────┐    │
│  │  PostgREST (API REST auto-gerada do schema)                   │    │
│  │  Supabase Auth (JWT, sessions, password reset, rate limit)    │    │
│  │  Supabase Realtime (WebSocket → novos agendamentos)           │    │
│  │  Supabase Storage (imagens: covers, perfis, serviços)         │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                  │ RLS enforced on all queries                        │
│  ┌───────────────▼──────────────────────────────────────────────┐    │
│  │  PostgreSQL 16                                                │    │
│  │  ├── accounts (tenants)                                       │    │
│  │  ├── services                    ← RLS: account_id           │    │
│  │  ├── availability                ← RLS: account_id           │    │
│  │  ├── blocked_dates               ← RLS: account_id           │    │
│  │  ├── appointments                ← RLS: account_id           │    │
│  │  ├── appointments_archive        ← RLS: account_id           │    │
│  │  └── clients (CRM)               ← RLS: account_id           │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  Edge Functions (Deno)                                        │    │
│  │  ├── /notify-telegram   (novo agendamento → bot)             │    │
│  │  ├── /send-email        (senha reset, confirmação)            │    │
│  │  ├── /book-appointment  (validação + insert transacional)     │    │
│  │  └── /archive-cleanup   (cron: arquiva agendamentos antigos) │    │
│  └──────────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────────┘
                   │
              Resend API  +  Telegram Bot API
```

---

## 6. Schema PostgreSQL com RLS

### 6.1 Estratégia de Multi-Tenancy

Cada tabela recebe `account_id UUID NOT NULL`. Após o login, o JWT carrega `account_id` como claim customizado. As policies RLS leem esse claim — automaticamente, em toda query.

```sql
-- Configuração global: JWT claim → setting do banco
-- Executado pelo Supabase Auth automaticamente via JWT hook

-- EXEMPLO de Policy (aplicada em todas as tabelas operacionais):
CREATE POLICY "tenant_isolation_select"
  ON services FOR SELECT
  USING (account_id = auth.uid_to_account_id());
  -- ou via custom JWT claim: (account_id = (auth.jwt() ->> 'account_id')::uuid)
```

### 6.2 Tabelas

```sql
-- ============================================================
-- TENANTS
-- ============================================================
CREATE TABLE accounts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,                         -- nome da empresa
  owner_name       TEXT,
  status           TEXT NOT NULL DEFAULT 'active'         -- active|expired|blocked|deleted
                   CHECK (status IN ('active','expired','blocked','deleted')),
  plan_type        TEXT NOT NULL DEFAULT 'trial'
                   CHECK (plan_type IN ('trial','1m','3m','6m','12m')),
  plan_expires_at  TIMESTAMPTZ,

  -- Branding
  primary_color    TEXT DEFAULT '#25aae1',
  secondary_color  TEXT DEFAULT '#1f2937',
  cover_image_path TEXT,                                  -- Supabase Storage path
  profile_image_path TEXT,
  short_description TEXT,
  services_title   TEXT,
  services_subtitle TEXT,
  view_mode        TEXT DEFAULT 'card' CHECK (view_mode IN ('card','list')),
  cover_opacity    INT DEFAULT 100 CHECK (cover_opacity BETWEEN 0 AND 100),

  -- Contato
  contact_phone    TEXT,
  contact_email    TEXT,

  -- Integrações
  telegram_bot_token TEXT,
  telegram_chat_id   TEXT,

  -- Billing
  invoices         JSONB DEFAULT '[]',

  -- Métricas
  lifetime_appointments INT NOT NULL DEFAULT 0,
  onboarding_seen  BOOLEAN DEFAULT FALSE,
  last_access_at   TIMESTAMPTZ,

  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USUÁRIOS (ligados ao Supabase Auth via auth.users.id)
-- ============================================================
CREATE TABLE user_profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id       UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role             TEXT NOT NULL DEFAULT 'client'
                   CHECK (role IN ('client','admin','super_admin')),
  must_change_password BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SERVIÇOS
-- ============================================================
CREATE TABLE services (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id       UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT DEFAULT '',
  duration_min     INT NOT NULL DEFAULT 30,
  cleaning_buffer_min INT NOT NULL DEFAULT 0,
  price            NUMERIC(10,2) DEFAULT 0,
  is_active        BOOLEAN DEFAULT TRUE,
  sort_order       INT DEFAULT 0,

  -- Customização visual
  image_path       TEXT,                                  -- Supabase Storage path
  image_opacity    INT DEFAULT 100,
  name_color       TEXT,
  description_color TEXT,

  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_services_account ON services(account_id, is_active, sort_order);

-- RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services_tenant_isolation"
  ON services FOR ALL
  USING (account_id = get_account_id());   -- função helper que lê do JWT

-- ============================================================
-- DISPONIBILIDADE
-- ============================================================
CREATE TABLE availability (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id       UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  working_hours    JSONB NOT NULL DEFAULT '[]',
  interval_minutes INT NOT NULL DEFAULT 30 CHECK (interval_minutes IN (15,30,60)),
  available_months JSONB DEFAULT '[1,2,3,4,5,6,7,8,9,10,11,12]',
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id)  -- uma config por conta
);

ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "availability_tenant_isolation"
  ON availability FOR ALL USING (account_id = get_account_id());

-- ============================================================
-- DATAS BLOQUEADAS
-- ============================================================
CREATE TABLE blocked_dates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id       UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  blocked_date     DATE NOT NULL,
  start_time       TIME,                                  -- NULL = dia inteiro
  end_time         TIME,
  reason           TEXT DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blocked_account_date ON blocked_dates(account_id, blocked_date);

ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocked_dates_tenant_isolation"
  ON blocked_dates FOR ALL USING (account_id = get_account_id());

-- ============================================================
-- AGENDAMENTOS
-- ============================================================
CREATE TABLE appointments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id       UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  client_name      TEXT NOT NULL,
  client_email     TEXT DEFAULT '',
  client_phone     TEXT NOT NULL,
  service_id       UUID REFERENCES services(id) ON DELETE SET NULL,
  service_name     TEXT NOT NULL,
  start_at         TIMESTAMPTZ NOT NULL,
  end_at           TIMESTAMPTZ NOT NULL,
  duration_min     INT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','confirmed','done','canceled','rejected')),
  notes            TEXT DEFAULT '',
  deleted_at       TIMESTAMPTZ,                           -- soft delete
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_appt_account_start  ON appointments(account_id, start_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_appt_account_status ON appointments(account_id, status, deleted_at);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Profissional vê todos os seus agendamentos
CREATE POLICY "appointments_owner_access"
  ON appointments FOR ALL
  USING (account_id = get_account_id());

-- Público pode VER apenas slots ocupados (sem dados do cliente)
-- (Implementado via Edge Function para /book, sem acesso direto à tabela)

-- ============================================================
-- ARQUIVO DE AGENDAMENTOS
-- ============================================================
CREATE TABLE appointments_archive
  (LIKE appointments INCLUDING ALL);

ALTER TABLE appointments_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "archive_tenant_isolation"
  ON appointments_archive FOR ALL USING (account_id = get_account_id());

-- ============================================================
-- CRM — CLIENTES
-- ============================================================
CREATE TABLE clients (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id       UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  phone            TEXT NOT NULL,
  email            TEXT DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, phone)
);

CREATE INDEX idx_clients_account ON clients(account_id);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients_tenant_isolation"
  ON clients FOR ALL USING (account_id = get_account_id());

-- ============================================================
-- HELPER: Ler account_id do JWT
-- ============================================================
CREATE OR REPLACE FUNCTION get_account_id()
RETURNS UUID AS $$
  SELECT ((auth.jwt() -> 'app_metadata') ->> 'account_id')::UUID;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- ACESSO PÚBLICO (booking sem login)
-- Política separada para a Edge Function /book-appointment
-- ============================================================
-- O endpoint público usa a service_role key apenas na Edge Function,
-- que faz suas próprias validações antes de inserir.
-- O cliente final NUNCA acessa o banco diretamente.
```

---

## 7. Mapeamento: O Que Muda, O Que Fica

### Frontend (React + TypeScript)

| Módulo | Status | Mudança Necessária |
|---|---|---|
| `PublicBookingPage.tsx` | Manter | Substituir `axios` por Supabase client; adaptar chamadas |
| `ClientDashboard.tsx` | Manter | Trocar chamadas de API por Supabase queries |
| `AdminDashboard.tsx` | Manter | Idem |
| Motor de slots `getSlotsForDate()` | **Manter integralmente** | Apenas timezone: Tokyo → BRT |
| `mapWorkingHours()` em utils | Manter | Sem mudança |
| Componentes UI (tabs, modals) | Manter | Sem mudança |
| `types.ts` | Atualizar | `id: number` → `id: string (UUID)` |
| `constants.ts` | Atualizar | Telefone BR, moeda BRL, fuso BRT |
| `src/apiClient.ts` (Axios) | Substituir | Supabase JS Client |
| `src/api.ts` | Substituir | Funções usando Supabase client |

### Backend (PHP → Edge Functions)

| PHP Route atual | Equivalente novo | Como |
|---|---|---|
| `auth.php` (login/logout/reset) | Supabase Auth | Zero código — nativo |
| `me.php` (perfil) | PostgREST + RLS | Query direta do frontend |
| `services.php` | PostgREST + RLS | Query direta do frontend |
| `availability.php` | PostgREST + RLS | Query direta do frontend |
| `blocked_dates.php` | PostgREST + RLS | Query direta do frontend |
| `appointments.php` (GET/PATCH/DELETE) | PostgREST + RLS | Query direta do frontend |
| `appointments/create` (PUBLIC) | **Edge Function** `/book-appointment` | Lógica transacional |
| `public.php` (dados públicos) | PostgREST com policy pública | Ou Edge Function |
| `admin.php` | PostgREST + RLS (role=super_admin) | Query direta |
| `clients.php` | PostgREST + RLS | Query direta |
| `telegram_webhook.php` | Edge Function `/notify-telegram` | Simples |
| `Mail.php` (email) | Edge Function `/send-email` + Resend | Simples |
| `Monitor.php` (erros Telegram) | Supabase Logs + Edge Function | Simples |
| `Auth.php` (sessions) | Supabase Auth | Deletar |
| `Db.php` (PDO) | Supabase client | Deletar |
| `Response.php` (JSON) | Desnecessário | Deletar |
| `config.php` | `.env` + Supabase config | Deletar |
| `migrate.php` | `supabase db push` | Deletar |
| `Rate limiting (arquivo)` | Supabase Auth nativo | Deletar |

### Banco de Dados

| Tabela MySQL atual | Tabela PostgreSQL nova | Mudança |
|---|---|---|
| `cp_agenda_accounts` | `accounts` | Sem prefixo, UUID, JSONB para `invoices` |
| `cp_agenda_users` | `user_profiles` (+ `auth.users`) | Split: credenciais no Supabase Auth |
| `cp_agenda_services` | `services` | UUID, Storage path para imagens |
| `cp_agenda_availability` | `availability` | UNIQUE por account, JSONB nativo |
| `cp_agenda_blocked_dates` | `blocked_dates` | UUID |
| `cp_agenda_appointments` | `appointments` | UUID, TIMESTAMPTZ para datas |
| `cp_agenda_appointments_archive` | `appointments_archive` | UUID |
| `cp_agenda_clients` | `clients` | UUID |

---

## 8. Edge Functions: Os 4 Únicos Casos que Precisam de Backend Custom

### 8.1 `/book-appointment` — Booking com Validação Transacional

```typescript
// supabase/functions/book-appointment/index.ts
import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req) => {
  const { accountId, serviceIds, startAt, clientName, clientPhone, clientEmail } = await req.json();
  
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  
  // 1. Verificar se conta está ativa
  // 2. Buscar serviços e calcular duração total
  // 3. Validar: não é hoje nem passado (BRT)
  // 4. Verificar datas bloqueadas
  // 5. INSERT com verificação de conflito (SELECT FOR UPDATE + INSERT)
  // 6. Upsert no CRM
  // 7. Disparar notificação Telegram (assíncrono)
  
  return new Response(JSON.stringify({ id: newAppointmentId }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

### 8.2 `/notify-telegram` — Notificação de Novo Agendamento

```typescript
// Chamado internamente pelo /book-appointment
// Envia mensagem ao bot do profissional com dados do cliente
```

### 8.3 `/send-email` — Email Transacional via Resend

```typescript
// Chamado pelo Supabase Auth hook (password reset)
// Ou diretamente para confirmações de agendamento
import { Resend } from 'npm:resend';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
await resend.emails.send({
  from: 'noreply@cpagendapro.com.br',
  to: clientEmail,
  subject: 'Seu agendamento foi confirmado',
  html: `...`
});
```

### 8.4 `/archive-cleanup` — Cron Job (Opcional)

```typescript
// Scheduled: todo dia 00:00 BRT
// Move appointments antigos para appointments_archive
```

---

## 9. Realtime: Substituindo o Polling de 15s

```typescript
// Antes (App.tsx atual):
useEffect(() => {
  const interval = setInterval(() => fetchAppointments(), 15000);
  return () => clearInterval(interval);
}, []);

// Depois (Supabase Realtime):
useEffect(() => {
  const channel = supabase
    .channel('appointments-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'appointments',
        filter: `account_id=eq.${accountId}`
      },
      (payload) => {
        // Novo agendamento chegou — atualiza UI instantaneamente
        setAppointments(prev => [payload.new as Appointment, ...prev]);
        playNotificationSound();
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [accountId]);
```

---

## 10. Auth: Substituindo as Sessões PHP

### Antes (PHP sessions)
- `$_SESSION['user']` em arquivo no servidor
- Cookie httponly 30 dias
- Rate limiting manual em arquivo
- Reset token em banco com expiração 1h

### Depois (Supabase Auth)
```typescript
// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'profissional@email.com',
  password: 'senha123'
});

// O token JWT retornado contém:
// { role: 'client', account_id: 'uuid-da-conta', ... }
// RLS usa esse JWT automaticamente em todas as queries

// Logout
await supabase.auth.signOut();

// Reset de senha (email enviado automaticamente)
await supabase.auth.resetPasswordForEmail(email);

// Sessão persistente (localStorage ou cookie httponly)
// Configurado na criação do cliente Supabase
```

**Rate limiting:** Supabase Auth tem rate limiting nativo — 10 tentativas/minuto por IP, configurável.

---

## 11. Storage: Imagens com CDN

```typescript
// Upload de imagem de capa
const { data, error } = await supabase.storage
  .from('account-images')
  .upload(`${accountId}/cover.jpg`, file, {
    upsert: true,
    contentType: 'image/jpeg'
  });

// URL pública com CDN (Supabase usa Cloudflare)
const { data: { publicUrl } } = supabase.storage
  .from('account-images')
  .getPublicUrl(`${accountId}/cover.jpg`);

// A URL é servida via CDN — sem passar pelo banco
// Tem PoPs globais incluindo São Paulo
```

---

## 12. Infraestrutura e Hospedagem

### Serviços e Custos (Estimativa)

| Serviço | Plano | Custo/mês | Para Quê |
|---|---|---|---|
| **Supabase** | Free → Pro ($25) | $0–25 | DB, Auth, Storage, Realtime, Edge Fn |
| **Vercel** | Hobby → Pro ($20) | $0–20 | Frontend (CDN global com PoP em SP) |
| **Resend** | Free → Básico ($20) | $0–20 | Email (3000/dia no free) |
| **Domínio .com.br** | RegistroBR | ~R$40/ano | cpagendapro.com.br |
| **Total MVP** | | **$0/mês** | Até atingir limites do free tier |
| **Total Escalado** | | **~$65/mês** | ~R$330/mês |

### Limites do Free Tier Supabase (suficientes para MVP)
- Banco: 500 MB — suporta ~100.000 agendamentos
- Storage: 1 GB — ~500 imagens de qualidade media
- Bandwidth: 5 GB/mês
- Edge Functions: 500.000 invocações/mês
- Realtime: 200 conexões simultâneas

### Latência no Brasil

| Operação | Stack atual (Hostinger JP) | Stack novo (Vercel+Supabase us-east-1) |
|---|---|---|
| Frontend estático | ~200-300ms (Japão → Brasil) | ~15ms (Vercel CDN São Paulo) |
| API Login | ~300ms | ~120ms (us-east-1) |
| Carregar página pública | ~400ms | ~130ms |
| Criar agendamento | ~350ms | ~140ms |

**Resultado:** Frontend 10-20x mais rápido. API 2-3x mais rápida.

---

## 13. Estrutura de Pastas do Novo Projeto

```
cp-agenda-pro-br/
├── supabase/
│   ├── config.toml               # Config local
│   ├── migrations/               # SQL versioned (Supabase CLI)
│   │   ├── 20260608_initial.sql
│   │   └── ...
│   └── functions/
│       ├── book-appointment/     # Edge Function crítica
│       │   └── index.ts
│       ├── notify-telegram/
│       │   └── index.ts
│       ├── send-email/
│       │   └── index.ts
│       └── archive-cleanup/
│           └── index.ts
├── src/                          # Frontend React
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client singleton
│   │   └── queries/              # Funções tipadas por módulo
│   │       ├── appointments.ts
│   │       ├── services.ts
│   │       ├── availability.ts
│   │       └── admin.ts
│   ├── components/               # Mesmos componentes atuais
│   ├── utils/
│   │   └── availability.ts       # Motor de slots (igual ao atual)
│   ├── hooks/
│   │   ├── useAuth.ts            # Supabase Auth
│   │   ├── useAppointments.ts    # Query + Realtime
│   │   └── useAccount.ts
│   ├── types/
│   │   └── database.ts           # Auto-gerado pelo Supabase CLI
│   ├── App.tsx
│   └── constants.ts              # Adaptado para BR
├── public/
├── package.json
├── vite.config.ts
└── .env.local                    # SUPABASE_URL + SUPABASE_ANON_KEY
```

---

## 14. Roadmap de Implementação

### Fase 1 — Fundação (1-2 dias)
- [ ] Criar projeto Supabase
- [ ] Aplicar schema SQL com RLS
- [ ] Configurar Supabase Auth (email/password)
- [ ] Custom JWT claim: adicionar `account_id` e `role`
- [ ] Testar RLS com 2 tenants — confirmar isolamento

### Fase 2 — Edge Functions (1 dia)
- [ ] `/book-appointment` com validação transacional
- [ ] `/notify-telegram`
- [ ] `/send-email` com Resend

### Fase 3 — Frontend: Autenticação (1 dia)
- [ ] Criar `src/lib/supabase.ts`
- [ ] Migrar `LoginScreen` para Supabase Auth
- [ ] Migrar `ResetPasswordPage`
- [ ] Migrar check de sessão em `App.tsx`

### Fase 4 — Frontend: Dashboard (2-3 dias)
- [ ] Migrar `ClientDashboard` — queries Supabase
- [ ] Migrar `AppointmentsTab` + Realtime subscription
- [ ] Migrar `ServicesTab`
- [ ] Migrar `AvailabilityTab`
- [ ] Migrar `AccountTab` + Storage upload

### Fase 5 — Frontend: Booking Público (1 dia)
- [ ] Migrar `PublicBookingPage` → chamar Edge Function
- [ ] Adaptar timezone para BRT
- [ ] Adaptar telefone para BR
- [ ] Adaptar moeda para BRL

### Fase 6 — Admin (1 dia)
- [ ] Migrar `AdminDashboard`
- [ ] Criar super_admin policy

### Fase 7 — Validação (1-2 dias)
- [ ] Testes de isolamento multi-tenant (2 contas, nunca cruzam)
- [ ] Testes de booking com conflitos
- [ ] Testes de Realtime
- [ ] Performance: comparar latência com stack anterior
- [ ] Deploy em subdomínio `.com.br`

**Total estimado:** 8–12 dias de desenvolvimento

---

## 15. Comparativo Final

| Critério | Stack Atual (PHP+MySQL) | Recomendado (Supabase) |
|---|---|---|
| Isolamento multi-tenant | Código (vulnerável) | Banco de dados (garantido) |
| Auth | Manual (sessões PHP) | Nativo (JWT, rate limit, reset) |
| Realtime | Polling 15s | WebSocket nativo |
| Storage de imagens | URLs externas (sem gestão) | CDN gerenciado |
| Latência Brasil | ~300-400ms | ~120-140ms |
| Linhas de código backend | ~800 (PHP) | ~200 (Edge Functions) |
| Type-safety end-to-end | Parcial (TypeScript front, PHP back) | Total (schema → tipos automáticos) |
| Migrations | Script PHP manual | Supabase CLI versionado |
| Custo MVP | ~$10-15/mês (Hostinger) | $0/mês (free tier) |
| Custo produção | ~$15-20/mês | ~$45-65/mês |
| Monitoramento | Telegram manual | Supabase Dashboard nativo |

---

## Decisão Necessária

Antes de iniciar a implementação, confirme:

| Questão | Opções |
|---|---|
| Aceita Supabase (us-east-1) como banco? | Sim / Prefiro Brasil (aumenta custo/complexidade) |
| Email do sistema | Qual domínio? Ex: `noreply@cpagendapro.com.br` |
| Plano de migração de dados do Japão | Migrar dados existentes / Começar do zero |
| Domínio do novo SaaS | `cpagendapro.com.br` ou outro? |

---

*Documento de avaliação arquitetural. Pronto para aprovação e início de implementação.*  
*Projeto: CP Agenda Pro Brasil | Data: 08/06/2026*
