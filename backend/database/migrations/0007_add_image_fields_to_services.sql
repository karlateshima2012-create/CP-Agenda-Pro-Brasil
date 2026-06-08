-- Migration: Add image_url and image_opacity to cp_agenda_services
ALTER TABLE `cp_agenda_services`
ADD COLUMN `image_url` LONGTEXT DEFAULT NULL,
ADD COLUMN `image_opacity` INT DEFAULT 100;
