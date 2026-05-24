-- ═══════════════════════════════════════════════════════════════════
-- PATCH RLS — à coller dans Supabase SQL Editor → Run
-- Corrige les tables sans policies + tasks UPDATE pour sous_traitants
-- ═══════════════════════════════════════════════════════════════════

-- ─── RLS sur tables manquantes ───────────────────────────────────────

ALTER TABLE invoice_line_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE association_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE association_events  ENABLE ROW LEVEL SECURITY;

-- ─── CONTACT_NOTES ───────────────────────────────────────────────────

CREATE POLICY "contact_notes_admin"  ON contact_notes FOR ALL    USING (get_my_role() = 'admin');
CREATE POLICY "contact_notes_author" ON contact_notes FOR SELECT USING (author_id = auth.uid());
CREATE POLICY "contact_notes_insert" ON contact_notes FOR INSERT WITH CHECK (author_id = auth.uid());

-- ─── CONTACT_TASKS ───────────────────────────────────────────────────

CREATE POLICY "contact_tasks_admin"    ON contact_tasks FOR ALL    USING (get_my_role() = 'admin');
CREATE POLICY "contact_tasks_assignee" ON contact_tasks FOR SELECT USING (assigned_to = auth.uid());

-- ─── DELIVERABLES ────────────────────────────────────────────────────

CREATE POLICY "deliverables_admin" ON deliverables FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "deliverables_contractor_select" ON deliverables FOR SELECT
  USING (
    get_my_role() = 'sous_traitant' AND
    EXISTS (SELECT 1 FROM tasks WHERE tasks.project_id = deliverables.project_id AND tasks.assigned_to = auth.uid())
  );
CREATE POLICY "deliverables_client_select" ON deliverables FOR SELECT
  USING (
    get_my_role() = 'client' AND
    EXISTS (SELECT 1 FROM projects WHERE projects.id = deliverables.project_id AND projects.client_id = auth.uid())
  );

-- ─── ACTIVITY_LOG ────────────────────────────────────────────────────

CREATE POLICY "activity_admin"  ON activity_log FOR ALL    USING (get_my_role() = 'admin');
CREATE POLICY "activity_insert" ON activity_log FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "activity_own"    ON activity_log FOR SELECT USING (user_id = auth.uid());

-- ─── TASKS — ajouter UPDATE pour sous_traitants ──────────────────────
-- (renomme l'ancienne policy tasks_assignee → tasks_assignee_select)

DROP POLICY IF EXISTS "tasks_assignee" ON tasks;
CREATE POLICY "tasks_assignee_select" ON tasks FOR SELECT USING (assigned_to = auth.uid());
CREATE POLICY "tasks_assignee_update" ON tasks FOR UPDATE
  USING (assigned_to = auth.uid() AND get_my_role() = 'sous_traitant')
  WITH CHECK (assigned_to = auth.uid());

-- ─── INVOICE_LINE_ITEMS ──────────────────────────────────────────────

CREATE POLICY "invoice_line_items_admin" ON invoice_line_items FOR ALL USING (get_my_role() = 'admin');

-- ─── ASSOCIATION ─────────────────────────────────────────────────────

CREATE POLICY "assoc_members_admin" ON association_members FOR ALL    USING (get_my_role() = 'admin');
CREATE POLICY "assoc_members_self"  ON association_members FOR SELECT USING (get_my_role() = 'membre_association');
CREATE POLICY "assoc_events_read"   ON association_events  FOR SELECT USING (get_my_role() IN ('admin','membre_association'));
CREATE POLICY "assoc_events_admin"  ON association_events  FOR ALL    USING (get_my_role() = 'admin');
