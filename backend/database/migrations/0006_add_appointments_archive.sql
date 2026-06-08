-- Migration: 0006_add_appointments_archive.sql
-- Description: Creates the archive table for appointments.

CREATE TABLE IF NOT EXISTS `cp_agenda_appointments_archive` LIKE `cp_agenda_appointments`;
