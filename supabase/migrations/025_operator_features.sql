-- 025_operator_features.sql
-- Adds operator escalation phone, notification toggle, and quick reply templates

-- ─── 1. New columns on posada_whatsapp_config ────────────────────────────────

ALTER TABLE posada_whatsapp_config
  ADD COLUMN IF NOT EXISTS operator_phone TEXT,
  ADD COLUMN IF NOT EXISTS notify_escalations BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN posada_whatsapp_config.operator_phone IS
  'Operator personal WhatsApp number for receiving escalation notifications';
COMMENT ON COLUMN posada_whatsapp_config.notify_escalations IS
  'Toggle for sending escalation notifications to operator_phone';

-- ─── 2. quick_reply_templates table ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quick_reply_templates (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id     UUID          NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  title           TEXT          NOT NULL,
  body            TEXT          NOT NULL,
  shortcut        TEXT,
  sort_order      INTEGER       NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id, shortcut)
);

COMMENT ON TABLE quick_reply_templates IS
  'Canned quick-reply message templates per provider for WhatsApp conversations';

-- ─── 3. RLS ──────────────────────────────────────────────────────────────────

ALTER TABLE quick_reply_templates ENABLE ROW LEVEL SECURITY;

-- Service-role bypass (used by API routes with supabase service key)
CREATE POLICY "service_role_all"
  ON quick_reply_templates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Providers can manage their own templates
CREATE POLICY "providers_manage_own_templates"
  ON quick_reply_templates
  FOR ALL
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers WHERE user_id = auth.uid()
    )
  );

-- ─── 4. Updated-at trigger ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_quick_reply_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_quick_reply_templates_updated_at
  BEFORE UPDATE ON quick_reply_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_quick_reply_templates_updated_at();

-- ─── 5. Default Spanish quick-reply templates ────────────────────────────────
-- Inserted for every existing provider. New providers should receive these via
-- application code (or a DB trigger) when their whatsapp config is created.

INSERT INTO quick_reply_templates (provider_id, title, body, shortcut, sort_order)
SELECT
  p.id,
  t.title,
  t.body,
  t.shortcut,
  t.sort_order
FROM providers p
CROSS JOIN (
  VALUES
    ('Ubicacion',
     E'Nuestra posada esta ubicada en {{direccion}}.\n\nReferencias: {{referencias}}\n\nTe comparto la ubicacion por Google Maps: {{link_maps}}',
     '/ubicacion',
     1),
    ('Pago',
     E'Metodos de pago disponibles:\n- Pago movil: {{telefono}} / {{cedula}} / {{banco}}\n- Zelle: {{email_zelle}}\n- Efectivo (USD o Bs)\n\nPor favor envia el comprobante una vez realizado el pago.',
     '/pago',
     2),
    ('Confirmar reserva',
     E'Tu reserva esta confirmada:\n- Fechas: {{check_in}} al {{check_out}}\n- Habitacion: {{habitacion}}\n- Huespedes: {{huespedes}}\n- Total: ${{total}} USD\n\nTe esperamos!',
     '/confirmar',
     3),
    ('Check-in',
     E'Informacion de check-in:\n- Hora: {{hora_checkin}}\n- Direccion: {{direccion}}\n- Contacto al llegar: {{telefono_contacto}}\n\nSi llegas antes o despues del horario, avisanos con anticipacion.',
     '/checkin',
     4),
    ('Gracias',
     E'Gracias por hospedarte con nosotros! Fue un placer atenderte.\n\nSi te gusto la experiencia, te agradecemos una resena. Esperamos verte pronto de nuevo!',
     '/gracias',
     5)
) AS t(title, body, shortcut, sort_order)
ON CONFLICT (provider_id, shortcut) DO NOTHING;
