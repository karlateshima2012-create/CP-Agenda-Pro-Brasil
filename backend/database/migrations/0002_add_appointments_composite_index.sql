-- Add composite index for performance optimization
-- Queries often filter by account_id AND start_at range.
-- This index will significantly speed up calendar views and conflict checks.

CREATE INDEX idx_acc_start ON cp_agenda_appointments (account_id, start_at);
