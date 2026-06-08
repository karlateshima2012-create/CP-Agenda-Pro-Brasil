-- Migration 0001 — Schema inicial
-- Aplicar com: psql -U cpagenda -d cpagenda -f 0001_initial.sql
-- Idempotente: pode ser rodada múltiplas vezes com segurança

-- Registra esta migration
CREATE TABLE IF NOT EXISTS _migrations (
  id          SERIAL PRIMARY KEY,
  filename    TEXT NOT NULL UNIQUE,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Só aplica se ainda não foi rodada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM _migrations WHERE filename = '0001_initial'
  ) THEN

    -- Executa o schema completo
    \i ../schema.sql

    -- Registra como aplicada
    INSERT INTO _migrations (filename) VALUES ('0001_initial');

    RAISE NOTICE 'Migration 0001_initial aplicada com sucesso.';
  ELSE
    RAISE NOTICE 'Migration 0001_initial já foi aplicada. Pulando.';
  END IF;
END;
$$;
