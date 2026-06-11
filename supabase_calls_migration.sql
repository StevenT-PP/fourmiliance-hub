-- ============================================================
-- FOURMILIANCE HUB — Migration Call Center
-- Tables : campaigns, leads, call_logs, call_sessions, products
-- ============================================================

-- ─── Campagnes d'appels ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL,
  description           text,
  target_sector         text,
  target_naf            text,
  target_city           text,
  target_department     text,
  target_employee_range text,
  status                text NOT NULL DEFAULT 'brouillon'
                          CHECK (status IN ('brouillon','active','pausee','terminee')),
  created_by            uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ─── Leads ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id          uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  -- Identité entreprise
  company_name         text NOT NULL,
  siren                text,
  siret                text,
  naf_code             text,
  sector               text,
  -- Contact
  phone                text,
  email                text,
  website              text,
  contact_name         text,
  -- Localisation
  address              text,
  city                 text,
  postal_code          text,
  department           text,
  -- Enrichissement
  employee_range       text,
  revenue_range        text,
  google_place_id      text,
  google_rating        numeric(3,1),
  google_reviews_count integer,
  has_website          boolean,
  -- Source
  source               text NOT NULL DEFAULT 'manuel'
                         CHECK (source IN ('sirene','google_places','pappers','csv','manuel')),
  source_data          jsonb,
  -- Statut pipeline
  status               text NOT NULL DEFAULT 'nouveau'
                         CHECK (status IN ('nouveau','en_attente','pas_repondu','refus',
                                           'rappel','rdv_pris','presentation','proposition',
                                           'production','livre','perdu')),
  assigned_to          uuid REFERENCES profiles(id) ON DELETE SET NULL,
  next_call_at         timestamptz,
  last_called_at       timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ─── Journaux d'appels ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS call_logs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id          uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  commercial_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at       timestamptz NOT NULL,
  ended_at         timestamptz,
  duration_seconds integer,
  status           text NOT NULL
                     CHECK (status IN ('pas_repondu','refus','rappel','rdv_pris',
                                       'presentation','proposition','production','livre','perdu')),
  notes            text,
  next_call_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ─── Sessions actives (supervision temps réel) ────────────────────────────────
CREATE TABLE IF NOT EXISTS call_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commercial_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lead_id        uuid REFERENCES leads(id) ON DELETE SET NULL,
  campaign_id    uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  started_at     timestamptz NOT NULL DEFAULT now(),
  is_active      boolean NOT NULL DEFAULT true,
  UNIQUE (commercial_id, is_active)
);

-- ─── Catalogue produits ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  category            text NOT NULL
                        CHECK (category IN ('site_web','agent_ia','automatisation',
                                            'cle_en_main','formation')),
  description         text,
  base_price_ht       numeric(10,2) NOT NULL DEFAULT 0,
  recurring_price_ht  numeric(10,2),
  features            text[] NOT NULL DEFAULT '{}',
  delivery_days       integer,
  active              boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_campaign_id   ON leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_status        ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to   ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_next_call_at  ON leads(next_call_at);
CREATE INDEX IF NOT EXISTS idx_call_logs_lead_id   ON call_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_commercial ON call_logs(commercial_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_started_at ON call_logs(started_at);
CREATE INDEX IF NOT EXISTS idx_call_sessions_active ON call_sessions(commercial_id) WHERE is_active = true;

-- ─── Triggers updated_at ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_campaigns_updated_at') THEN
    CREATE TRIGGER set_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_leads_updated_at') THEN
    CREATE TRIGGER set_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_products_updated_at') THEN
    CREATE TRIGGER set_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE campaigns     ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE products      ENABLE ROW LEVEL SECURITY;

-- Campaigns : lisibles par admin + commercial, éditables par admin
CREATE POLICY "campaigns_select" ON campaigns FOR SELECT USING (get_my_role() IN ('admin','commercial','sous_traitant'));
CREATE POLICY "campaigns_insert" ON campaigns FOR INSERT WITH CHECK (get_my_role() = 'admin');
CREATE POLICY "campaigns_update" ON campaigns FOR UPDATE USING (get_my_role() = 'admin');
CREATE POLICY "campaigns_delete" ON campaigns FOR DELETE USING (get_my_role() = 'admin');

-- Leads : lisibles par admin + commercial ; commercial ne voit que ses leads assignés
CREATE POLICY "leads_select_admin" ON leads FOR SELECT USING (get_my_role() = 'admin');
CREATE POLICY "leads_select_commercial" ON leads FOR SELECT USING (
  get_my_role() IN ('commercial','sous_traitant') AND assigned_to = auth.uid()
);
CREATE POLICY "leads_insert" ON leads FOR INSERT WITH CHECK (get_my_role() IN ('admin','commercial','sous_traitant'));
CREATE POLICY "leads_update" ON leads FOR UPDATE USING (
  get_my_role() = 'admin' OR (get_my_role() IN ('commercial','sous_traitant') AND assigned_to = auth.uid())
);
CREATE POLICY "leads_delete" ON leads FOR DELETE USING (get_my_role() = 'admin');

-- Call logs : commercial voit les siens, admin voit tout
CREATE POLICY "call_logs_select_admin" ON call_logs FOR SELECT USING (get_my_role() = 'admin');
CREATE POLICY "call_logs_select_own"   ON call_logs FOR SELECT USING (
  get_my_role() IN ('commercial','sous_traitant') AND commercial_id = auth.uid()
);
CREATE POLICY "call_logs_insert" ON call_logs FOR INSERT WITH CHECK (
  get_my_role() IN ('admin','commercial','sous_traitant') AND commercial_id = auth.uid()
);
CREATE POLICY "call_logs_update" ON call_logs FOR UPDATE USING (
  get_my_role() = 'admin' OR commercial_id = auth.uid()
);

-- Call sessions : chacun gère la sienne, admin voit tout
CREATE POLICY "sessions_select_admin" ON call_sessions FOR SELECT USING (get_my_role() = 'admin');
CREATE POLICY "sessions_select_own"   ON call_sessions FOR SELECT USING (commercial_id = auth.uid());
CREATE POLICY "sessions_insert"       ON call_sessions FOR INSERT WITH CHECK (commercial_id = auth.uid());
CREATE POLICY "sessions_update"       ON call_sessions FOR UPDATE USING (
  get_my_role() = 'admin' OR commercial_id = auth.uid()
);
CREATE POLICY "sessions_delete"       ON call_sessions FOR DELETE USING (
  get_my_role() = 'admin' OR commercial_id = auth.uid()
);

-- Products : lisibles par tous les users connectés, éditables admin seulement
CREATE POLICY "products_select" ON products FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "products_insert" ON products FOR INSERT WITH CHECK (get_my_role() = 'admin');
CREATE POLICY "products_update" ON products FOR UPDATE USING (get_my_role() = 'admin');
CREATE POLICY "products_delete" ON products FOR DELETE USING (get_my_role() = 'admin');

-- ─── Données initiales — Catalogue produits ───────────────────────────────────
INSERT INTO products (name, category, description, base_price_ht, recurring_price_ht, features, delivery_days) VALUES
(
  'Site Vitrine Standard',
  'site_web',
  'Site vitrine professionnel 5-8 pages, responsive, SEO de base, formulaire de contact.',
  1200,
  49,
  ARRAY['5-8 pages', 'Design responsive', 'SEO technique', 'Formulaire contact', 'Google Analytics', 'Hébergement 1 an inclus', 'Maintenance 3 mois'],
  21
),
(
  'Site Vitrine Premium',
  'site_web',
  'Site vitrine avancé avec animations, blog, catalogue produits, SEO avancé.',
  2800,
  89,
  ARRAY['10-15 pages', 'Animations premium', 'Blog intégré', 'Catalogue produits', 'SEO avancé', 'Google Business Profile optimisé', 'Hébergement 1 an inclus', 'Maintenance 6 mois'],
  35
),
(
  'Agent IA Chatbot',
  'agent_ia',
  'Agent conversationnel IA sur le site web : répond aux clients 24h/24, qualifie les leads, prend des RDV.',
  1800,
  129,
  ARRAY['Chatbot IA sur site web', 'Réponses 24h/24', 'Qualification leads automatique', 'Prise de RDV intégrée', 'Base de connaissance personnalisée', 'Dashboard conversations', 'Intégration CRM'],
  14
),
(
  'Agent IA Vocal',
  'agent_ia',
  'Agent vocal IA qui répond au téléphone à la place du client : standard téléphonique automatisé.',
  2400,
  199,
  ARRAY['Standard téléphonique IA', 'Réponse appels entrants 24h/24', 'Qualification et routage', 'Transcription automatique', 'Résumé appels par email', 'Prise de messages', 'Intégration agenda'],
  21
),
(
  'Automatisation Back-office',
  'automatisation',
  'Automatisation des tâches répétitives : devis, factures, relances, reporting, emails.',
  1500,
  99,
  ARRAY['Automatisation devis/factures', 'Relances automatiques', 'Reporting hebdo auto', 'Intégration email/agenda', 'Tableau de bord personnalisé', 'Formation équipe'],
  14
),
(
  'Solution Clé en Main',
  'cle_en_main',
  'Pack complet : site web + agent IA chatbot + automatisation. Le client se concentre uniquement sur son métier.',
  5500,
  299,
  ARRAY['Site web premium', 'Agent IA chatbot + vocal', 'Automatisation back-office', 'Tableau de bord unifié', 'Accompagnement 6 mois', 'Support prioritaire', 'Formation équipe complète', 'Mises à jour incluses 1 an'],
  45
)
ON CONFLICT DO NOTHING;

-- ─── Realtime (supervision) ───────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE call_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE call_logs;
