-- 1. Add view_mode and cover_opacity to accounts
ALTER TABLE `cp_agenda_accounts`
ADD COLUMN `view_mode` VARCHAR(10) DEFAULT 'card' AFTER `cover_image`,
ADD COLUMN `cover_opacity` INT DEFAULT 100 AFTER `view_mode`;

-- 2. Add name_color and description_color to services
ALTER TABLE `cp_agenda_services`
ADD COLUMN `name_color` VARCHAR(7) DEFAULT NULL AFTER `image_opacity`,
ADD COLUMN `description_color` VARCHAR(7) DEFAULT NULL AFTER `name_color`;
