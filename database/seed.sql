-- =============================================================
-- Seed de desenvolvimento — CP Agenda Pro Brasil
-- Cria 2 tenants isolados para testar RLS
-- =============================================================

-- Não rodar em produção!

-- Desabilita RLS temporariamente para seed (só no dev)
SET LOCAL app.current_account_id = '';

-- =============================================================
-- CONTA 1: Barbearia Silva
-- =============================================================

INSERT INTO accounts (id, name, owner_name, status, plan_type, plan_expires_at,
  primary_color, secondary_color, short_description,
  services_title, services_subtitle, contact_phone)
VALUES (
  '11111111-0000-0000-0000-000000000001',
  'Barbearia Silva',
  'Carlos Silva',
  'active',
  '12m',
  NOW() + INTERVAL '12 months',
  '#1a1a2e',
  '#16213e',
  'Cortes modernos e tradicionais. Ambiente exclusivo para homens.',
  'Nossos Serviços',
  'Escolha o serviço que desejar',
  '(11) 99999-1111'
);

-- Credenciais: senha = "senha123"
INSERT INTO user_credentials (id, email, password_hash)
VALUES (
  'c1111111-0000-0000-0000-000000000001',
  'barbearia@teste.com',
  '$2b$10$abcdefghijklmnopqrstuvwxyz012345678901234567890'  -- trocar por bcrypt real
);

INSERT INTO users (credential_id, account_id, role, name)
VALUES (
  'c1111111-0000-0000-0000-000000000001',
  '11111111-0000-0000-0000-000000000001',
  'client',
  'Carlos Silva'
);

-- Serviços
INSERT INTO services (account_id, name, description, duration_min, cleaning_buffer_min, price, sort_order)
VALUES
  ('11111111-0000-0000-0000-000000000001', 'Corte Simples',     'Corte tradicional na tesoura ou máquina.',        30, 5, 35.00, 1),
  ('11111111-0000-0000-0000-000000000001', 'Corte + Barba',     'Corte completo com modelagem de barba.',          60, 5, 70.00, 2),
  ('11111111-0000-0000-0000-000000000001', 'Barba',             'Modelagem e hidratação de barba.',                30, 5, 40.00, 3),
  ('11111111-0000-0000-0000-000000000001', 'Pigmentação',       'Cobertura de cabelos brancos com pigmento.',      45, 10, 80.00, 4);

-- Disponibilidade
INSERT INTO availability (account_id, working_hours, interval_minutes, available_months)
VALUES (
  '11111111-0000-0000-0000-000000000001',
  '[
    {"day":"segunda","name":"Segunda-feira","isWorking":true,"startTime":"09:00","endTime":"19:00","timeType":"interval"},
    {"day":"terca","name":"Terça-feira","isWorking":true,"startTime":"09:00","endTime":"19:00","timeType":"interval"},
    {"day":"quarta","name":"Quarta-feira","isWorking":true,"startTime":"09:00","endTime":"19:00","timeType":"interval"},
    {"day":"quinta","name":"Quinta-feira","isWorking":true,"startTime":"09:00","endTime":"19:00","timeType":"interval"},
    {"day":"sexta","name":"Sexta-feira","isWorking":true,"startTime":"09:00","endTime":"19:00","timeType":"interval"},
    {"day":"sabado","name":"Sábado","isWorking":true,"startTime":"09:00","endTime":"14:00","timeType":"interval"},
    {"day":"domingo","name":"Domingo","isWorking":false,"startTime":"09:00","endTime":"13:00","timeType":"interval"}
  ]',
  30,
  '[1,2,3,4,5,6,7,8,9,10,11,12]'
);

-- =============================================================
-- CONTA 2: Studio Karla — para testar isolamento RLS
-- =============================================================

INSERT INTO accounts (id, name, owner_name, status, plan_type, plan_expires_at,
  primary_color, secondary_color, short_description, contact_phone)
VALUES (
  '22222222-0000-0000-0000-000000000002',
  'Studio Karla',
  'Karla Lima',
  'active',
  '6m',
  NOW() + INTERVAL '6 months',
  '#e91e8c',
  '#880e4f',
  'Especialista em coloração e tratamentos capilares.',
  '(11) 98888-2222'
);

INSERT INTO user_credentials (id, email, password_hash)
VALUES (
  'c2222222-0000-0000-0000-000000000002',
  'studio@teste.com',
  '$2b$10$abcdefghijklmnopqrstuvwxyz012345678901234567890'
);

INSERT INTO users (credential_id, account_id, role, name)
VALUES (
  'c2222222-0000-0000-0000-000000000002',
  '22222222-0000-0000-0000-000000000002',
  'client',
  'Karla Lima'
);

INSERT INTO services (account_id, name, description, duration_min, cleaning_buffer_min, price, sort_order)
VALUES
  ('22222222-0000-0000-0000-000000000002', 'Coloração completa', 'Aplicação com produto premium.',     120, 15, 250.00, 1),
  ('22222222-0000-0000-0000-000000000002', 'Mechas',             'Mechas californianas ou tradicionais.', 150, 15, 320.00, 2),
  ('22222222-0000-0000-0000-000000000002', 'Escova',             'Escova progressiva ou modeladora.',    90, 10, 180.00, 3);

INSERT INTO availability (account_id, working_hours, interval_minutes)
VALUES (
  '22222222-0000-0000-0000-000000000002',
  '[
    {"day":"segunda","name":"Segunda-feira","isWorking":false,"startTime":"09:00","endTime":"18:00","timeType":"interval"},
    {"day":"terca","name":"Terça-feira","isWorking":true,"startTime":"09:00","endTime":"18:00","timeType":"interval"},
    {"day":"quarta","name":"Quarta-feira","isWorking":true,"startTime":"09:00","endTime":"18:00","timeType":"interval"},
    {"day":"quinta","name":"Quinta-feira","isWorking":true,"startTime":"09:00","endTime":"18:00","timeType":"interval"},
    {"day":"sexta","name":"Sexta-feira","isWorking":true,"startTime":"09:00","endTime":"18:00","timeType":"interval"},
    {"day":"sabado","name":"Sábado","isWorking":true,"startTime":"09:00","endTime":"16:00","timeType":"interval"},
    {"day":"domingo","name":"Domingo","isWorking":false,"startTime":"09:00","endTime":"13:00","timeType":"interval"}
  ]',
  60
);

-- =============================================================
-- SUPER ADMIN
-- =============================================================

INSERT INTO accounts (id, name, owner_name, status, plan_type)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'CP Agenda Pro',
  'Administrador',
  'active',
  '12m'
);

INSERT INTO user_credentials (id, email, password_hash)
VALUES (
  'c0000000-0000-0000-0000-000000000000',
  'admin@cpagendapro.com.br',
  '$2b$10$abcdefghijklmnopqrstuvwxyz012345678901234567890'
);

INSERT INTO users (credential_id, account_id, role, name)
VALUES (
  'c0000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  'super_admin',
  'Administrador'
);
