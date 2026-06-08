-- Redefine a função para lidar explicitamente com DELETE e usar as colunas corretas (DURATION)
CREATE OR REPLACE FUNCTION sync_public_busy_slots()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle DELETE: Remove o slot
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public_busy_slots WHERE appointment_id = OLD.id;
    RETURN OLD;
  END IF;

  -- Handle UPDATE: Remove anterior (para evitar duplicatas ou dados velhos)
  IF (TG_OP = 'UPDATE') THEN
    DELETE FROM public_busy_slots WHERE appointment_id = OLD.id;
  END IF;

  -- Handle INSERT or UPDATE (adiciona novo slot se ativo)
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
     -- Apenas adiciona se status não for cancelado/rejeitado
     IF (NEW.status != 'canceled' AND NEW.status != 'rejected') THEN
         -- CORREÇÃO: Usa 'duration' e 'status' em vez de calcular 'end_at'
         INSERT INTO public_busy_slots (user_id, appointment_id, start_at, duration, status)
         VALUES (NEW.user_id, NEW.id, NEW.start_at, NEW.duration, NEW.status);
     END IF;
     RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recria o gatilho para garantir que ele use a nova função
DROP TRIGGER IF EXISTS sync_busy_slots_trigger ON appointments;

CREATE TRIGGER sync_busy_slots_trigger
AFTER INSERT OR UPDATE OR DELETE ON appointments
FOR EACH ROW EXECUTE FUNCTION sync_public_busy_slots();
