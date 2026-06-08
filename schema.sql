-- CP Agenda Pro - MySQL Schema (Multi-tenant)
-- Charset: utf8mb4

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Accounts (Tenants)
CREATE TABLE IF NOT EXISTS `cp_agenda_accounts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `owner_name` VARCHAR(255) DEFAULT '',
    `status` ENUM('active', 'expired', 'blocked', 'deleted') DEFAULT 'active',
    `plan_type` ENUM('trial', '6m', '12m') DEFAULT '6m',
    `plan_expires_at` DATETIME NULL,
    `primary_color` VARCHAR(7) DEFAULT '#25aae1',
    `secondary_color` VARCHAR(7) DEFAULT '#1f2937',
    `short_description` TEXT,
    `services_title` VARCHAR(255) DEFAULT 'Meus Serviços',
    `services_subtitle` VARCHAR(255) DEFAULT 'Selecione abaixo o serviço desejado',
    `cover_image` VARCHAR(255) DEFAULT '',
    `view_mode` VARCHAR(10) DEFAULT 'card',
    `cover_opacity` INT DEFAULT 100,
    `profile_image` VARCHAR(255) DEFAULT '',
    `telegram_bot_token` VARCHAR(255) DEFAULT '',
    `telegram_chat_id` VARCHAR(255) DEFAULT '',
    `invoices` JSON DEFAULT NULL,
    `onboarding_seen` TINYINT(1) DEFAULT 0,
    `lifetime_appointments` INT DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Users (Authentication)
CREATE TABLE IF NOT EXISTS `cp_agenda_users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `account_id` INT NOT NULL,
    `role` ENUM('super_admin', 'account_admin', 'staff', 'client') DEFAULT 'client',
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `reset_token` VARCHAR(100) DEFAULT NULL,
    `reset_expires` DATETIME DEFAULT NULL,
    `must_change_password` TINYINT(1) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_email` (`email`),
    CONSTRAINT `fk_user_account` FOREIGN KEY (`account_id`) REFERENCES `cp_agenda_accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Services
CREATE TABLE IF NOT EXISTS `cp_agenda_services` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `account_id` INT NOT NULL,
    `user_id` INT DEFAULT NULL, -- Optional, if tied to a specific staff
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `duration_min` INT NOT NULL DEFAULT 30,
    `price` DECIMAL(10, 2) DEFAULT 0.00,
    `is_active` TINYINT(1) DEFAULT 1,
    `sort_order` INT DEFAULT 0,
    `image_url` LONGTEXT DEFAULT NULL,
    `image_opacity` INT DEFAULT 100,
    `name_color` VARCHAR(7) DEFAULT '#ffffff',
    `description_color` VARCHAR(7) DEFAULT '#9ca3af',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_service_account` FOREIGN KEY (`account_id`) REFERENCES `cp_agenda_accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Availability
CREATE TABLE IF NOT EXISTS `cp_agenda_availability` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `account_id` INT NOT NULL,
    `user_id` INT DEFAULT NULL,
    `working_hours` JSON NOT NULL, -- Format: { "mon": { "active": true, "slots": [...] }, ... }
    `interval_minutes` INT DEFAULT 30,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_availability_account` FOREIGN KEY (`account_id`) REFERENCES `cp_agenda_accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Blocked Dates
CREATE TABLE IF NOT EXISTS `cp_agenda_blocked_dates` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `account_id` INT NOT NULL,
    `user_id` INT DEFAULT NULL,
    `blocked_date` DATE NOT NULL,
    `start_time` TIME DEFAULT NULL,
    `end_time` TIME DEFAULT NULL,
    `reason` VARCHAR(255) DEFAULT '',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_blocked_account` FOREIGN KEY (`account_id`) REFERENCES `cp_agenda_accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Appointments
CREATE TABLE IF NOT EXISTS `cp_agenda_appointments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `account_id` INT NOT NULL,
    `user_id` INT DEFAULT NULL,
    `client_name` VARCHAR(255) NOT NULL,
    `client_email` VARCHAR(255) DEFAULT '',
    `client_phone` VARCHAR(50) NOT NULL,
    `service_id` INT NOT NULL,
    `service_name` VARCHAR(255) NOT NULL,
    `start_at` DATETIME NOT NULL,
    `duration` INT NOT NULL,
    `status` ENUM('pending', 'confirmed', 'done', 'canceled', 'rejected') DEFAULT 'pending',
    `notes` TEXT,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_start_at` (`start_at`),
    CONSTRAINT `fk_appointment_account` FOREIGN KEY (`account_id`) REFERENCES `cp_agenda_accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Clients (CRM)
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

SET FOREIGN_KEY_CHECKS = 1;

-- SEED DATA (Demo)
/*
INSERT INTO `cp_agenda_accounts` (name, status) VALUES ('CP Demo', 'active');
SET @acc_id = LAST_INSERT_ID();

INSERT INTO `cp_agenda_users` (account_id, role, name, email, password_hash) 
VALUES (@acc_id, 'super_admin', 'Suporte', 'suporte@creativeprintjp.com', '$2y$10$U.p1b1Z9.I6/Wf.998uWEOzL/pY.o.S3M5rQf...REPLACE_WITH_ACTUAL_HASH');
*/
