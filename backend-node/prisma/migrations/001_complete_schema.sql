-- Migração completa: adiciona campos ausentes ao banco existente
-- Execute: npx prisma migrate dev --name complete_schema
-- Ou aplique manualmente via MySQL client

-- cp_agenda_accounts: adicionar last_access_at
ALTER TABLE `cp_agenda_accounts`
  ADD COLUMN IF NOT EXISTS `last_access_at` DATETIME NULL DEFAULT NULL;

-- cp_agenda_services: adicionar cleaning_buffer_min
ALTER TABLE `cp_agenda_services`
  ADD COLUMN IF NOT EXISTS `cleaning_buffer_min` INT NOT NULL DEFAULT 0;

-- cp_agenda_availability: adicionar available_months
ALTER TABLE `cp_agenda_availability`
  ADD COLUMN IF NOT EXISTS `available_months` JSON NULL;

-- cp_agenda_appointments: adicionar end_datetime
ALTER TABLE `cp_agenda_appointments`
  ADD COLUMN IF NOT EXISTS `end_datetime` DATETIME NULL DEFAULT NULL,
  ADD INDEX IF NOT EXISTS `idx_end_datetime` (`end_datetime`);

-- Preencher end_datetime para agendamentos existentes (start_at + duration em minutos)
UPDATE `cp_agenda_appointments`
  SET `end_datetime` = DATE_ADD(`start_at`, INTERVAL `duration` MINUTE)
  WHERE `end_datetime` IS NULL AND `duration` IS NOT NULL;
