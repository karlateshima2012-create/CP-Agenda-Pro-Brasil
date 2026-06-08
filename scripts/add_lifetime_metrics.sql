-- 1. Add lifetime_appointments column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'lifetime_appointments') THEN
        ALTER TABLE profiles ADD COLUMN lifetime_appointments INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. Initialize the counter with existing confirmed appointments
-- This is a one-time sync. Future updates will be handled by the trigger.
UPDATE profiles p
SET lifetime_appointments = (
    SELECT COUNT(*)
    FROM appointments a
    WHERE a.user_id = p.id
    AND a.status = 'confirmed'
);

-- 3. Create or Replace the Trigger Function
CREATE OR REPLACE FUNCTION update_lifetime_appointments()
RETURNS TRIGGER AS $$
BEGIN
    -- Case 1: INSERT with status 'confirmed'
    -- (New appointment directly confirmed)
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.status = 'confirmed') THEN
            UPDATE profiles SET lifetime_appointments = lifetime_appointments + 1 WHERE id = NEW.user_id;
        END IF;
        RETURN NEW;
    END IF;

    -- Case 2: UPDATE status to 'confirmed'
    -- (Pending -> Confirmed)
    IF (TG_OP = 'UPDATE') THEN
        -- Only increment if it wasn't confirmed before AND is confirmed now
        IF (OLD.status != 'confirmed' AND NEW.status = 'confirmed') THEN
            UPDATE profiles SET lifetime_appointments = lifetime_appointments + 1 WHERE id = NEW.user_id;
        END IF;
        
        -- Optional: If we wanted to DECREMENT when un-confirming (e.g. canceling), we would add logic here.
        -- But the requirement is "Total confirmed EVER", even if deleted later.
        -- So we DO NOT decrement on cancellation or deletion.
        
        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create the Trigger
DROP TRIGGER IF EXISTS trg_update_lifetime_appointments ON appointments;

CREATE TRIGGER trg_update_lifetime_appointments
AFTER INSERT OR UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION update_lifetime_appointments();
