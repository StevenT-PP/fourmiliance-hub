-- ═══════════════════════════════════════════════════════════════════
-- PATCH : Correction récursion infinie RLS — Fourmiliance Hub
-- Coller en entier dans Supabase SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Table user_roles sans RLS (évite la récursion de get_my_role) ──

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role    TEXT NOT NULL
);
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Remplir depuis les profils existants
INSERT INTO user_roles (user_id, role)
SELECT id, role FROM profiles
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

-- Trigger : synchronisation automatique quand profiles.role change
CREATE OR REPLACE FUNCTION sync_user_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, NEW.role)
  ON CONFLICT (user_id) DO UPDATE SET role = NEW.role;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_role ON profiles;
CREATE TRIGGER trg_sync_user_role
  AFTER INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW EXECUTE FUNCTION sync_user_role();

-- ─── 2. Réécriture de get_my_role() sans récursion ───────────────────

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM user_roles WHERE user_id = auth.uid();
$$;

-- ─── 3. Dénormalisation client_id (évite les jointures cross-tables) ──

-- tasks : ajoute client_id pour les policies client sans jointure projects
ALTER TABLE tasks      ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES profiles(id);
ALTER TABLE messages   ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES profiles(id);
ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES profiles(id);

-- Backfill depuis projects
UPDATE tasks      t SET client_id = p.client_id FROM projects p WHERE t.project_id = p.id;
UPDATE messages   m SET client_id = p.client_id FROM projects p WHERE m.project_id = p.id;
UPDATE deliverables d SET client_id = p.client_id FROM projects p WHERE d.project_id = p.id;

-- Triggers : auto-fill client_id à la création
CREATE OR REPLACE FUNCTION fill_client_id_from_project()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    SELECT client_id INTO NEW.client_id FROM projects WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_task_client ON tasks;
CREATE TRIGGER trg_task_client
  BEFORE INSERT ON tasks FOR EACH ROW EXECUTE FUNCTION fill_client_id_from_project();

DROP TRIGGER IF EXISTS trg_message_client ON messages;
CREATE TRIGGER trg_message_client
  BEFORE INSERT ON messages FOR EACH ROW EXECUTE FUNCTION fill_client_id_from_project();

DROP TRIGGER IF EXISTS trg_deliverable_client ON deliverables;
CREATE TRIGGER trg_deliverable_client
  BEFORE INSERT ON deliverables FOR EACH ROW EXECUTE FUNCTION fill_client_id_from_project();

-- ─── 4. Correction des policies circulaires ──────────────────────────

-- PROJECTS : sous_traitant voit tous les projets (plus de jointure tasks)
DROP POLICY IF EXISTS "projects_contractor_select" ON projects;
CREATE POLICY "projects_contractor_select" ON projects FOR SELECT
  USING (get_my_role() = 'sous_traitant');

-- TASKS : client voit ses tâches via client_id dénormalisé
DROP POLICY IF EXISTS "tasks_client_select" ON tasks;
CREATE POLICY "tasks_client_select" ON tasks FOR SELECT
  USING (get_my_role() = 'client' AND client_id = auth.uid());

-- MESSAGES : rewrite sans jointure projects
DROP POLICY IF EXISTS "messages_project_select" ON messages;
CREATE POLICY "messages_project_select" ON messages FOR SELECT
  USING (
    get_my_role() IN ('admin', 'sous_traitant') OR
    (get_my_role() = 'client' AND client_id = auth.uid())
  );

-- DELIVERABLES : rewrite sans jointure projects/tasks
DROP POLICY IF EXISTS "deliverables_contractor_select" ON deliverables;
DROP POLICY IF EXISTS "deliverables_client_select"    ON deliverables;
CREATE POLICY "deliverables_contractor_select" ON deliverables FOR SELECT
  USING (get_my_role() = 'sous_traitant');
CREATE POLICY "deliverables_client_select" ON deliverables FOR SELECT
  USING (get_my_role() = 'client' AND client_id = auth.uid());

-- ─── 5. Vérification finale ──────────────────────────────────────────
-- Après Run, tester dans un nouvel onglet SQL Editor :
-- SELECT get_my_role(); -- doit retourner NULL si non connecté
-- SELECT * FROM projects LIMIT 1; -- doit retourner [] sans erreur
