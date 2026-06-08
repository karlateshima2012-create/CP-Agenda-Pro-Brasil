-- =============================================================
-- CP Agenda Pro Brasil — Schema PostgreSQL 16
-- Multi-tenant via Row-Level Security (RLS)
-- Fuso horário: America/Sao_Paulo (BRT, UTC-3)
-- =============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- busca por similaridade (CRM)

-- Timezone padrão da sessão
SET timezone = 'America/Sao_Paulo';

-- =============================================================
-- ENUM TYPES
-- =============================================================

CREATE TYPE account_status   AS ENUM ('active', 'expired', 'blocked', 'deleted');
CREATE TYPE plan_type        AS ENUM ('trial', '1m', '3m', '6m', '12m');
CREATE TYPE user_role        AS ENUM ('client', 'admin', 'super_admin');
CREATE TYPE appt_status      AS ENUM ('pending', 'confirmed', 'done', 'canceled', 'rejected');
CREATE TYPE view_mode_type   AS ENUM ('card', 'list');
CREATE TYPE invoice_status   AS ENUM ('pending', 'paid', 'overdue', 'canceled');
CREATE TYPE time_type        AS ENUM ('interval', 'fixed');

-- =============================================================
-- FUNÇÃO HELPER: Ler account_id do JWT (usada nas policies RLS)
-- Configurada via SET LOCAL app.current_account_id no middleware
-- =============================================================

CREATE OR REPLACE FUNCTION current_account_id()
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_account_id', true), '')::UUID;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- =============================================================
-- 1. ACCOUNTS (Tenants)
-- =============================================================

CREATE TABLE accounts (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identidade
  name                TEXT        NOT NULL CHECK (length(trim(name)) > 0),
  owner_name          TEXT        NOT NULL DEFAULT '',
  status              account_status NOT NULL DEFAULT 'active',
  plan_type           plan_type   NOT NULL DEFAULT 'trial',
  plan_expires_at     TIMESTAMPTZ,

  -- Branding
  primary_color       TEXT        NOT NULL DEFAULT '#25aae1',
  secondary_color     TEXT        NOT NULL DEFAULT '#1f2937',
  cover_image_url     TEXT        DEFAULT '',   -- URL do Cloudflare R2
  profile_image_url   TEXT        DEFAULT '',   -- URL do Cloudflare R2
  cover_opacity       SMALLINT    NOT NULL DEFAULT 100 CHECK (cover_opacity BETWEEN 0 AND 100),
  view_mode           view_mode_type NOT NULL DEFAULT 'card',

  -- Textos da página pública
  short_description   TEXT        DEFAULT '',
  services_title      TEXT        DEFAULT 'Nossos Serviços',
  services_subtitle   TEXT        DEFAULT 'Selecione o serviço desejado',

  -- Contato
  contact_email       TEXT        DEFAULT '',
  contact_phone       TEXT        DEFAULT '',

  -- Integração Telegram
  telegram_bot_token  TEXT        DEFAULT '',
  telegram_chat_id    TEXT        DEFAULT '',

  -- Faturamento (array de faturas em JSONB)
  invoices            JSONB       NOT NULL DEFAULT '[]',

  -- Métricas e estado
  lifetime_appointments INT       NOT NULL DEFAULT 0,
  onboarding_seen     BOOLEAN     NOT NULL DEFAULT FALSE,
  last_access_at      TIMESTAMPTZ,

  -- Auditoria
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de accounts
CREATE INDEX idx_accounts_status      ON accounts(status);
CREATE INDEX idx_accounts_plan_expiry ON accounts(plan_expires_at) WHERE status = 'active';

-- RLS: accounts não tem RLS direto — acesso via user_profiles
-- Super admin acessa tudo; client acessa só a própria conta via JOIN

-- =============================================================
-- 2. USER PROFILES (vinculado ao sistema de auth)
-- =============================================================
-- A tabela de credenciais (email/senha/hash/reset_token) fica
-- em uma tabela separada para manter concerns separados.
-- =============================================================

CREATE TABLE user_credentials (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT        NOT NULL UNIQUE CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$'),
  password_hash   TEXT        NOT NULL,
  reset_token     TEXT,
  reset_expires   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credentials_email ON user_credentials(email);

-- Perfil e papel do usuário
CREATE TABLE users (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id           UUID        NOT NULL UNIQUE REFERENCES user_credentials(id) ON DELETE CASCADE,
  account_id              UUID        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role                    user_role   NOT NULL DEFAULT 'client',
  name                    TEXT        NOT NULL DEFAULT '',
  must_change_password    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_account_id    ON users(account_id);
CREATE INDEX idx_users_credential_id ON users(credential_id);

-- =============================================================
-- 3. SERVICES (Catálogo de serviços por tenant)
-- =============================================================

CREATE TABLE services (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          UUID        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  name                TEXT        NOT NULL CHECK (length(trim(name)) > 0),
  description         TEXT        NOT NULL DEFAULT '',
  duration_min        INT         NOT NULL DEFAULT 30 CHECK (duration_min > 0),
  cleaning_buffer_min INT         NOT NULL DEFAULT 0  CHECK (cleaning_buffer_min >= 0),
  price               NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order          INT         NOT NULL DEFAULT 0,

  -- Customização visual
  image_url           TEXT        DEFAULT '',
  image_opacity       SMALLINT    NOT NULL DEFAULT 100 CHECK (image_opacity BETWEEN 0 AND 100),
  name_color          TEXT        DEFAULT '',
  description_color   TEXT        DEFAULT '',

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_services_account    ON services(account_id, is_active, sort_order);

-- RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY services_tenant_read
  ON services FOR SELECT
  USING (account_id = current_account_id());

CREATE POLICY services_tenant_write
  ON services FOR ALL
  USING (account_id = current_account_id());

-- =============================================================
-- 4. AVAILABILITY (Configuração de horários por tenant)
-- =============================================================

CREATE TABLE availability (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          UUID        NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,

  -- Array de objetos: [{day, name, isWorking, startTime, endTime, timeType, fixedTimes}]
  working_hours       JSONB       NOT NULL DEFAULT '[]',
  interval_minutes    SMALLINT    NOT NULL DEFAULT 30 CHECK (interval_minutes IN (15, 30, 60)),

  -- Meses disponíveis para agendamento (1=Jan ... 12=Dez)
  available_months    JSONB       NOT NULL DEFAULT '[1,2,3,4,5,6,7,8,9,10,11,12]',

  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY availability_tenant
  ON availability FOR ALL
  USING (account_id = current_account_id());

-- =============================================================
-- 5. BLOCKED_DATES (Exceções de horário — feriados, almoço, etc.)
-- =============================================================

CREATE TABLE blocked_dates (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID    NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  blocked_date    DATE    NOT NULL,
  start_time      TIME,   -- NULL = bloqueia o dia inteiro
  end_time        TIME,   -- NULL = bloqueia o dia inteiro
  reason          TEXT    NOT NULL DEFAULT '',

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Garante que o mesmo bloco não seja duplicado
  CONSTRAINT no_time_inversion CHECK (
    start_time IS NULL OR end_time IS NULL OR start_time < end_time
  )
);

CREATE INDEX idx_blocked_account_date ON blocked_dates(account_id, blocked_date);

-- RLS
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY blocked_dates_tenant
  ON blocked_dates FOR ALL
  USING (account_id = current_account_id());

-- =============================================================
-- 6. APPOINTMENTS (Agendamentos ativos)
-- =============================================================

CREATE TABLE appointments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Cliente (desnormalizado intencionalmente — histórico permanece mesmo se cliente for deletado)
  client_name     TEXT        NOT NULL CHECK (length(trim(client_name)) > 0),
  client_email    TEXT        NOT NULL DEFAULT '',
  client_phone    TEXT        NOT NULL CHECK (length(trim(client_phone)) > 0),

  -- Serviço (desnormalizado pelo mesmo motivo)
  service_id      UUID        REFERENCES services(id) ON DELETE SET NULL,
  service_name    TEXT        NOT NULL,

  -- Tempo (TIMESTAMPTZ: sem ambiguidade de fuso horário)
  start_at        TIMESTAMPTZ NOT NULL,
  end_at          TIMESTAMPTZ NOT NULL,     -- start_at + duration + cleaning_buffer
  duration_min    INT         NOT NULL CHECK (duration_min > 0),

  status          appt_status NOT NULL DEFAULT 'pending',
  notes           TEXT        NOT NULL DEFAULT '',

  -- Soft delete
  deleted_at      TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT end_after_start CHECK (end_at > start_at)
);

-- Índices críticos para performance
CREATE INDEX idx_appt_account_start
  ON appointments(account_id, start_at)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_appt_account_status
  ON appointments(account_id, status, deleted_at);

-- Índice para detecção de conflitos (booking)
CREATE INDEX idx_appt_conflict_check
  ON appointments(account_id, start_at, end_at)
  WHERE deleted_at IS NULL AND status NOT IN ('canceled', 'rejected');

-- RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Profissional e admin veem tudo da sua conta
CREATE POLICY appointments_tenant
  ON appointments FOR ALL
  USING (account_id = current_account_id());

-- =============================================================
-- 7. APPOINTMENTS_ARCHIVE (Histórico arquivado)
-- =============================================================
-- Agendamentos passados movidos periodicamente para reduzir
-- o tamanho da tabela principal.
-- =============================================================

CREATE TABLE appointments_archive (
  LIKE appointments INCLUDING ALL
);

-- Recria índices
CREATE INDEX idx_archive_account_start
  ON appointments_archive(account_id, start_at);

CREATE INDEX idx_archive_account_status
  ON appointments_archive(account_id, status);

-- RLS (mesma política)
ALTER TABLE appointments_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY archive_tenant
  ON appointments_archive FOR ALL
  USING (account_id = current_account_id());

-- =============================================================
-- 8. CLIENTS (CRM por tenant)
-- =============================================================

CREATE TABLE clients (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID    NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  name            TEXT    NOT NULL DEFAULT '',
  phone           TEXT    NOT NULL CHECK (length(trim(phone)) > 0),
  email           TEXT    NOT NULL DEFAULT '',

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Telefone único por conta (chave de deduplicação do CRM)
  UNIQUE(account_id, phone)
);

CREATE INDEX idx_clients_account       ON clients(account_id);
CREATE INDEX idx_clients_name_trgm     ON clients USING gin(name gin_trgm_ops);   -- busca por nome
CREATE INDEX idx_clients_phone_account ON clients(account_id, phone);

-- RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY clients_tenant
  ON clients FOR ALL
  USING (account_id = current_account_id());

-- =============================================================
-- 9. SESSIONS (Refresh tokens — substituem cookies de sessão)
-- =============================================================
-- Em produção, os refresh tokens ficam no Redis para performance.
-- Esta tabela serve como fallback e auditoria.
-- =============================================================

CREATE TABLE sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token   TEXT        NOT NULL UNIQUE,
  user_agent      TEXT        NOT NULL DEFAULT '',
  ip_address      INET,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id      ON sessions(user_id);
CREATE INDEX idx_sessions_token        ON sessions(refresh_token);
CREATE INDEX idx_sessions_expires      ON sessions(expires_at);

-- =============================================================
-- 10. TRIGGERS: updated_at automático
-- =============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_credentials_updated_at
  BEFORE UPDATE ON user_credentials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_availability_updated_at
  BEFORE UPDATE ON availability
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================
-- 11. FUNÇÃO: Booking com detecção de conflito (atômica)
-- Chamada pela API para criar agendamentos de forma segura
-- =============================================================

CREATE OR REPLACE FUNCTION create_booking(
  p_account_id    UUID,
  p_client_name   TEXT,
  p_client_phone  TEXT,
  p_client_email  TEXT,
  p_service_id    UUID,
  p_service_name  TEXT,
  p_start_at      TIMESTAMPTZ,
  p_duration_min  INT          -- total = duração do serviço + cleaning_buffer
)
RETURNS TABLE(
  success      BOOLEAN,
  appointment_id UUID,
  error_code   TEXT,
  error_msg    TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_end_at      TIMESTAMPTZ;
  v_conflict    INT;
  v_blocked     INT;
  v_now_brt     TIMESTAMPTZ;
  v_today_brt   DATE;
  v_appt_date   DATE;
  v_new_id      UUID;
BEGIN
  v_end_at    := p_start_at + (p_duration_min || ' minutes')::INTERVAL;
  v_now_brt   := NOW() AT TIME ZONE 'America/Sao_Paulo';
  v_today_brt := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  v_appt_date := (p_start_at AT TIME ZONE 'America/Sao_Paulo')::DATE;

  -- 1. Data no passado?
  IF v_appt_date < v_today_brt THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'PAST_DATE',
      'Não é possível agendar em datas passadas.';
    RETURN;
  END IF;

  -- 2. É hoje? (exige 1 dia de antecedência)
  IF v_appt_date = v_today_brt THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'SAME_DAY',
      'Agendamentos devem ser feitos com pelo menos 1 dia de antecedência.';
    RETURN;
  END IF;

  -- 3. Data bloqueada?
  SELECT COUNT(*) INTO v_blocked
  FROM blocked_dates
  WHERE account_id = p_account_id
    AND blocked_date = v_appt_date
    AND (
      -- Dia inteiro bloqueado
      (start_time IS NULL AND end_time IS NULL)
      OR
      -- Bloqueio parcial que intersecta com o slot
      (
        (p_start_at AT TIME ZONE 'America/Sao_Paulo')::TIME < end_time
        AND
        (v_end_at AT TIME ZONE 'America/Sao_Paulo')::TIME > start_time
      )
    );

  IF v_blocked > 0 THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'BLOCKED_DATE',
      'Este horário está bloqueado pelo estabelecimento.';
    RETURN;
  END IF;

  -- 4. Conflito com agendamento existente?
  --    Overlap: novo_inicio < existente_fim AND novo_fim > existente_inicio
  SELECT COUNT(*) INTO v_conflict
  FROM appointments
  WHERE account_id = p_account_id
    AND deleted_at IS NULL
    AND status NOT IN ('canceled', 'rejected')
    AND start_at < v_end_at
    AND end_at   > p_start_at;

  IF v_conflict > 0 THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'CONFLICT',
      'Este horário acabou de ser reservado. Por favor, escolha outro.';
    RETURN;
  END IF;

  -- 5. Upsert cliente no CRM
  --    phone já normalizado (só dígitos) pelo backend antes de chamar esta função
  INSERT INTO clients (account_id, name, phone, email)
  VALUES (p_account_id, p_client_name, p_client_phone, p_client_email)
  ON CONFLICT (account_id, phone)
  DO UPDATE SET
    name       = EXCLUDED.name,
    email      = COALESCE(NULLIF(EXCLUDED.email, ''), clients.email),
    updated_at = NOW();

  -- 6. Insere o agendamento
  INSERT INTO appointments (
    account_id, client_name, client_phone, client_email,
    service_id, service_name, start_at, end_at, duration_min, status
  )
  VALUES (
    p_account_id, p_client_name, p_client_phone, p_client_email,
    p_service_id, p_service_name, p_start_at, v_end_at, p_duration_min, 'pending'
  )
  RETURNING id INTO v_new_id;

  RETURN QUERY SELECT TRUE, v_new_id, NULL::TEXT, NULL::TEXT;
END;
$$;

-- =============================================================
-- 12. FUNÇÃO: Arquivar agendamentos antigos
-- Rodada por cron job (ex: todo domingo às 03:00 BRT)
-- Move agendamentos com mais de 90 dias para archive
-- =============================================================

CREATE OR REPLACE FUNCTION archive_old_appointments(p_days_old INT DEFAULT 90)
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  -- Move para archive
  WITH moved AS (
    DELETE FROM appointments
    WHERE (
      status IN ('done', 'canceled', 'rejected')
      OR deleted_at IS NOT NULL
    )
    AND created_at < NOW() - (p_days_old || ' days')::INTERVAL
    RETURNING *
  )
  INSERT INTO appointments_archive SELECT * FROM moved;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- 13. VIEWS úteis para o Admin Dashboard
-- =============================================================

-- Visão consolidada por conta (usada no admin)
CREATE OR REPLACE VIEW v_account_health AS
SELECT
  a.id                                AS account_id,
  a.name                              AS company_name,
  a.owner_name,
  a.status,
  a.plan_type,
  a.plan_expires_at,
  a.lifetime_appointments,
  a.last_access_at,
  a.created_at,

  -- Métricas de saúde
  (SELECT COUNT(*)
     FROM services s
    WHERE s.account_id = a.id AND s.is_active = TRUE)        AS services_count,

  (SELECT COUNT(*)
     FROM appointments ap
    WHERE ap.account_id = a.id
      AND ap.deleted_at IS NULL
      AND ap.status NOT IN ('canceled','rejected')
      AND ap.start_at >= NOW() - INTERVAL '30 days')          AS appointments_last_30d,

  (SELECT MAX(ap.start_at)
     FROM appointments ap
    WHERE ap.account_id = a.id
      AND ap.status = 'confirmed'
      AND ap.deleted_at IS NULL)                              AS last_appointment_at,

  -- Flags de configuração
  (a.telegram_chat_id <> '' AND a.telegram_chat_id IS NOT NULL) AS has_telegram,
  (a.profile_image_url <> '' AND a.profile_image_url IS NOT NULL) AS has_profile_image,
  (a.cover_image_url <> '' AND a.cover_image_url IS NOT NULL)   AS has_cover_image,
  (a.short_description <> '' AND a.short_description IS NOT NULL) AS has_description

FROM accounts a
WHERE a.status <> 'deleted';

-- =============================================================
-- 14. PERMISSÕES (aplicadas ao usuário da aplicação)
-- =============================================================
-- O usuário 'cpagenda_app' tem acesso apenas às tabelas necessárias.
-- Nunca usa o superuser em produção.
-- =============================================================

-- Executar como superuser na configuração inicial:
-- CREATE USER cpagenda_app WITH PASSWORD 'senha_forte_aqui';
-- GRANT CONNECT ON DATABASE cpagenda TO cpagenda_app;
-- GRANT USAGE ON SCHEMA public TO cpagenda_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cpagenda_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cpagenda_app;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO cpagenda_app;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public
--   GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cpagenda_app;
