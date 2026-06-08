-- Migration: Add cleaning_buffer_min to cp_agenda_services
ALTER TABLE `cp_agenda_services` 
ADD COLUMN `cleaning_buffer_min` INT NOT NULL DEFAULT 0 AFTER `duration_min`;
