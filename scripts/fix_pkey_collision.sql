-- 1. Limpeza de Orfãos (Dados corrompidos pelo bug anterior)
-- Remove slots ocupados que não têm agendamento correspondente (devido ao bug de exclusão)
DELETE FROM public_busy_slots 
WHERE appointment_id NOT IN (SELECT id FROM appointments);

-- 2. Trigger Robusto (com ON CONFLICT para evitar erros futuros)
CREATE OR REPLACE FUNCTION sync_public_busy_slots()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle DELETE
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public_busy_slots WHERE appointment_id = OLD.id;
    RETURN OLD;
  END IF;

  -- Handle UPDATE (Remove anterior para garantir limpo)
  IF (TG_OP = 'UPDATE') THEN
    DELETE FROM public_busy_slots WHERE appointment_id = OLD.id;
  END IF;

  -- Handle INSERT or UPDATE
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
     IF (NEW.status != 'canceled' AND NEW.status != 'rejected') THEN
         INSERT INTO public_busy_slots (user_id, appointment_id, start_at, duration, status)
         VALUES (NEW.user_id, NEW.id, NEW.start_at, NEW.duration, NEW.status)
         ON CONFLICT (appointment_id) 
         DO UPDATE SET 
            start_at = EXCLUDED.start_at,
            duration = EXCLUDED.duration,
            status = EXCLUDED.status;
     END IF;
     RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- (Re)cria o gatilho
DROP TRIGGER IF EXISTS sync_busy_slots_trigger ON appointments;

CREATE TRIGGER sync_busy_slots_trigger
AFTER INSERT OR UPDATE OR DELETE ON appointments
FOR EACH ROW EXECUTE FUNCTION sync_public_busy_slots();
