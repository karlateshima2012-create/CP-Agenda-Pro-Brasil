
-- Migration: 0005_crm_and_partial_blocking.sql
-- Description: Adds clients table, soft delete to appointments, and time ranges to blocked dates.

-- 1. Update cp_agenda_blocked_dates
ALTER TABLE `cp_agenda_blocked_dates` 
ADD COLUMN IF NOT EXISTS `start_time` TIME DEFAULT NULL AFTER `blocked_date`,
ADD COLUMN IF NOT EXISTS `end_time` TIME DEFAULT NULL AFTER `start_time`;

-- 2. Update cp_agenda_appointments for Soft Delete
ALTER TABLE `cp_agenda_appointments` 
ADD COLUMN IF NOT EXISTS `deleted_at` TIMESTAMP NULL DEFAULT NULL AFTER `notes`;

-- 3. Create cp_agenda_clients table
CREATE TABLE IF NOT EXISTS `cp_agenda_clients` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `account_id` INT NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(50) NOT NULL,
    `email` VARCHAR(255) DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_account_phone` (`account_id`, `phone`),
    CONSTRAINT `fk_client_account` FOREIGN KEY (`account_id`) REFERENCES `cp_agenda_accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
