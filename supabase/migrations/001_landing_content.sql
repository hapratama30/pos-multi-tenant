-- Landing page marketing (global, 1 row) — AGRAPos
-- Jalankan di Supabase SQL Editor, lalu set PIN:
-- INSERT INTO app_secrets (key, value) VALUES ('landing_admin_pin', 'PinRahasiaMin8Char')
-- ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

CREATE TABLE IF NOT EXISTS landing_content (
  id text PRIMARY KEY DEFAULT 'global',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE landing_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS landing_select_public ON landing_content;
CREATE POLICY landing_select_public ON landing_content
  FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS app_secrets (
  key text PRIMARY KEY,
  value text NOT NULL
);

ALTER TABLE app_secrets ENABLE ROW LEVEL SECURITY;
-- app_secrets: no public policies — only SECURITY DEFINER RPC reads it

CREATE OR REPLACE FUNCTION upsert_landing_content(p_content jsonb, p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE expected text;
BEGIN
  SELECT value INTO expected FROM app_secrets WHERE key = 'landing_admin_pin';
  IF expected IS NULL OR p_pin IS DISTINCT FROM expected THEN
    RAISE EXCEPTION 'invalid_pin';
  END IF;
  INSERT INTO landing_content (id, content, updated_at)
  VALUES ('global', p_content, now())
  ON CONFLICT (id) DO UPDATE
    SET content = EXCLUDED.content, updated_at = now();
  RETURN p_content;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_landing_content(jsonb, text) TO anon, authenticated;

INSERT INTO landing_content (id, content) VALUES ('global', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;
