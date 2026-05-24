-- ═══════════════════════════════════════════════════════════════════
-- FOURMILIANCE HUB — Schéma complet
-- Coller intégralement dans Supabase SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════════

-- ─── TABLES CORE ────────────────────────────────────────────────────

CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('admin','sous_traitant','client','membre_association','incube')),
  avatar_url   TEXT,
  phone        TEXT,
  company      TEXT,
  status       TEXT DEFAULT 'offline' CHECK (status IN ('online','offline','away')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MODULE CRM ─────────────────────────────────────────────────────

CREATE TABLE contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company         TEXT NOT NULL,
  contact_name    TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  address         TEXT,
  city            TEXT,
  postal_code     TEXT,
  service_type    TEXT CHECK (service_type IN ('vitrine','ecommerce','agent_ia','automation')),
  pipeline_stage  TEXT DEFAULT 'prospect' CHECK (pipeline_stage IN (
    'prospect','contacte','devis','signe','en_cours','livre','archive','perdu'
  )),
  estimated_value NUMERIC(10,2),
  assigned_to     UUID REFERENCES profiles(id),
  source          TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contact_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id  UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES profiles(id),
  content     TEXT NOT NULL,
  note_type   TEXT DEFAULT 'note' CHECK (note_type IN ('note','appel','email','rdv')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contact_tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id  UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES profiles(id),
  title       TEXT NOT NULL,
  due_date    DATE,
  done        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MODULE PROJETS ──────────────────────────────────────────────────

CREATE TABLE projects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id   UUID REFERENCES contacts(id),
  client_id    UUID REFERENCES profiles(id),
  name         TEXT NOT NULL,
  type         TEXT CHECK (type IN ('vitrine','ecommerce','agent_ia','automation')),
  status       TEXT DEFAULT 'en_cours' CHECK (status IN (
    'briefing','maquette','developpement','validation','livre','archive'
  )),
  progress     INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  start_date   DATE,
  end_date     DATE,
  budget       NUMERIC(10,2),
  description  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID REFERENCES projects(id) ON DELETE CASCADE,
  contact_id    UUID REFERENCES contacts(id),
  client_id     UUID REFERENCES profiles(id),
  parent_id     UUID REFERENCES tasks(id),
  assigned_to   UUID REFERENCES profiles(id),
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT DEFAULT 'todo' CHECK (status IN ('todo','in_progress','review','done')),
  priority      TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  due_date      DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE deliverables (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id   UUID REFERENCES profiles(id),
  name        TEXT NOT NULL,
  type        TEXT,
  status      TEXT DEFAULT 'a_venir' CHECK (status IN ('a_venir','en_attente','valide','refuse')),
  file_url    TEXT,
  file_size   INTEGER,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MODULE MESSAGERIE ───────────────────────────────────────────────

CREATE TABLE messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id  UUID REFERENCES profiles(id),
  sender_id  UUID NOT NULL REFERENCES profiles(id),
  content    TEXT NOT NULL,
  read_by    UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MODULE FINANCES ─────────────────────────────────────────────────

CREATE TABLE invoices (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number       TEXT UNIQUE NOT NULL,
  contact_id   UUID REFERENCES contacts(id),
  project_id   UUID REFERENCES projects(id),
  type         TEXT DEFAULT 'facture' CHECK (type IN ('devis','facture')),
  status       TEXT DEFAULT 'brouillon' CHECK (status IN (
    'brouillon','envoye','en_attente','paye','en_retard','annule'
  )),
  amount_ht    NUMERIC(10,2) NOT NULL,
  tva_rate     NUMERIC(5,2) DEFAULT 20.0,
  amount_ttc   NUMERIC(10,2) GENERATED ALWAYS AS (amount_ht * (1 + tva_rate/100)) STORED,
  issued_date  DATE DEFAULT CURRENT_DATE,
  due_date     DATE,
  paid_date    DATE,
  notes        TEXT,
  line_items   JSONB DEFAULT '[]',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoice_line_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity    NUMERIC(10,2) DEFAULT 1,
  unit_price  NUMERIC(10,2) NOT NULL,
  total       NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

CREATE TABLE fund_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount      NUMERIC(10,2) NOT NULL,
  direction   TEXT DEFAULT 'versement' CHECK (direction IN ('versement','retrait')),
  description TEXT,
  reference   TEXT,
  date        DATE DEFAULT CURRENT_DATE,
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MODULE INCUBATEUR ───────────────────────────────────────────────

CREATE TABLE incubated_companies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  sector        TEXT,
  contact_name  TEXT,
  email         TEXT,
  phone         TEXT,
  stage         TEXT DEFAULT 'candidature' CHECK (stage IN (
    'candidature','selection','actif','diplome','archive'
  )),
  start_date    DATE,
  description   TEXT,
  notes         TEXT,
  user_id       UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MODULE ASSOCIATION ──────────────────────────────────────────────

CREATE TABLE association_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID REFERENCES profiles(id),
  full_name   TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  role        TEXT,
  joined_date DATE DEFAULT CURRENT_DATE,
  active      BOOLEAN DEFAULT TRUE
);

CREATE TABLE association_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  date        DATE,
  location    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── LOG D'ACTIVITÉ ──────────────────────────────────────────────────

CREATE TABLE activity_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES profiles(id),
  action       TEXT NOT NULL,
  entity_type  TEXT,
  entity_id    UUID,
  entity_label TEXT,
  metadata     JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
-- TABLE SHADOW user_roles (sans RLS — évite la récursion infinie)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role    TEXT NOT NULL
);
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Synchronisation automatique quand profiles.role change
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

-- Auto-fill client_id depuis projects à l'insertion
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

-- ═══════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_notes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tasks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables         ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices             ENABLE ROW LEVEL SECURITY;
ALTER TABLE fund_transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE incubated_companies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE association_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE association_events   ENABLE ROW LEVEL SECURITY;

-- Helper : rôle sans récursion (lit user_roles, table sans RLS)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM user_roles WHERE user_id = auth.uid();
$$;

-- PROFILES
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (id = auth.uid() OR get_my_role() = 'admin');
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (id = auth.uid() OR get_my_role() = 'admin');

-- CONTACTS
CREATE POLICY "contacts_admin" ON contacts FOR ALL
  USING (get_my_role() = 'admin');
CREATE POLICY "contacts_assignee_select" ON contacts FOR SELECT
  USING (assigned_to = auth.uid() AND get_my_role() = 'sous_traitant');

-- PROJECTS (sous_traitant sans jointure tasks — évite la récursion croisée)
CREATE POLICY "projects_admin" ON projects FOR ALL
  USING (get_my_role() = 'admin');
CREATE POLICY "projects_client_select" ON projects FOR SELECT
  USING (client_id = auth.uid() AND get_my_role() = 'client');
CREATE POLICY "projects_contractor_select" ON projects FOR SELECT
  USING (get_my_role() = 'sous_traitant');

-- CONTACT_NOTES
CREATE POLICY "contact_notes_admin" ON contact_notes FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "contact_notes_author" ON contact_notes FOR SELECT USING (author_id = auth.uid());
CREATE POLICY "contact_notes_insert" ON contact_notes FOR INSERT WITH CHECK (author_id = auth.uid());

-- CONTACT_TASKS
CREATE POLICY "contact_tasks_admin" ON contact_tasks FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "contact_tasks_assignee" ON contact_tasks FOR SELECT USING (assigned_to = auth.uid());

-- DELIVERABLES (client_id dénormalisé — sans jointure projects/tasks)
CREATE POLICY "deliverables_admin" ON deliverables FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "deliverables_contractor_select" ON deliverables FOR SELECT
  USING (get_my_role() = 'sous_traitant');
CREATE POLICY "deliverables_client_select" ON deliverables FOR SELECT
  USING (get_my_role() = 'client' AND client_id = auth.uid());

-- ACTIVITY_LOG
CREATE POLICY "activity_admin" ON activity_log FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "activity_insert" ON activity_log FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "activity_own" ON activity_log FOR SELECT USING (user_id = auth.uid());

-- TASKS (client_id dénormalisé — sans jointure projects)
CREATE POLICY "tasks_admin" ON tasks FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "tasks_assignee_select" ON tasks FOR SELECT USING (assigned_to = auth.uid());
CREATE POLICY "tasks_assignee_update" ON tasks FOR UPDATE
  USING (assigned_to = auth.uid() AND get_my_role() = 'sous_traitant')
  WITH CHECK (assigned_to = auth.uid());
CREATE POLICY "tasks_client_select" ON tasks FOR SELECT
  USING (get_my_role() = 'client' AND client_id = auth.uid());

-- MESSAGES (client_id dénormalisé — sans jointure projects)
CREATE POLICY "messages_admin" ON messages FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "messages_project_select" ON messages FOR SELECT
  USING (
    get_my_role() IN ('admin', 'sous_traitant') OR
    (get_my_role() = 'client' AND client_id = auth.uid())
  );
CREATE POLICY "messages_insert" ON messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- FINANCES
CREATE POLICY "invoices_admin" ON invoices FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "fund_admin" ON fund_transactions FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "invoice_line_items_admin" ON invoice_line_items FOR ALL USING (get_my_role() = 'admin');

-- ASSOCIATION
CREATE POLICY "assoc_members_admin" ON association_members FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "assoc_members_self" ON association_members FOR SELECT USING (get_my_role() = 'membre_association');
CREATE POLICY "assoc_events_read" ON association_events FOR SELECT USING (get_my_role() IN ('admin','membre_association'));
CREATE POLICY "assoc_events_admin" ON association_events FOR ALL USING (get_my_role() = 'admin');

-- INCUBATEUR
CREATE POLICY "incube_admin" ON incubated_companies FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "incube_self" ON incubated_companies FOR SELECT USING (user_id = auth.uid());

-- ─── INDEX ───────────────────────────────────────────────────────────

CREATE INDEX idx_contacts_stage    ON contacts(pipeline_stage);
CREATE INDEX idx_contacts_assigned ON contacts(assigned_to);
CREATE INDEX idx_tasks_project     ON tasks(project_id);
CREATE INDEX idx_tasks_assigned    ON tasks(assigned_to);
CREATE INDEX idx_messages_project  ON messages(project_id);
CREATE INDEX idx_invoices_status   ON invoices(status);
CREATE INDEX idx_activity_created  ON activity_log(created_at DESC);
