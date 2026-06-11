-- ============================================================
-- FIX : call_sessions — contrainte unique partielle
-- Permet plusieurs sessions inactives par commercial
-- ============================================================

-- 1. Supprimer l'ancienne contrainte (une seule ligne is_active=false possible)
ALTER TABLE call_sessions
  DROP CONSTRAINT IF EXISTS call_sessions_commercial_id_is_active_key;

-- 2. Index unique partiel : unicité UNIQUEMENT sur les sessions actives
CREATE UNIQUE INDEX IF NOT EXISTS call_sessions_active_uniq
  ON call_sessions (commercial_id)
  WHERE is_active = true;
