-- Migration: Add end_datetime to cp_agenda_appointments
ALTER TABLE `cp_agenda_appointments` 
ADD COLUMN IF NOT EXISTS `end_datetime` DATETIME NULL AFTER `start_at`;

-- Populate existing end_datetime based on start_at and duration
UPDATE `cp_agenda_appointments` 
SET `end_datetime` = DATE_ADD(`start_at`, INTERVAL `duration` MINUTE) 
WHERE `end_datetime` IS NULL;
