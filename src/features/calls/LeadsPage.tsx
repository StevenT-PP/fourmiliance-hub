import { useState, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, Phone, Globe, MapPin, Users, Star, ChevronDown,
  Download, Zap, Database, X, Save, Edit2, ChevronLeft,
  ChevronRight, Upload, AlertCircle, Sparkles,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { enrichLeadsPhone, type EnrichProgress } from '../../lib/enrichment'
import type { Lead, Campaign } from '../../types'
import {
  LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, LEAD_SOURCE_LABELS,
  type LeadStatus, type LeadSource,
} from '../../lib/constants'

// ─── Constantes ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 50

const SECTOR_OPTIONS = [
  { q: 'restaurant brasserie snack traiteur', label: 'Restauration' },
  { q: 'hôtel hébergement chambre gîte', label: 'Hôtellerie' },
  { q: 'boutique commerce magasin vente', label: 'Commerce de détail' },
  { q: 'coiffeur esthétique beauté onglerie', label: 'Services personnels' },
  { q: 'plombier électricien maçon artisan charpentier', label: 'BTP / Artisanat' },
  { q: 'informatique développeur logiciel digital', label: 'Informatique' },
  { q: 'comptable avocat notaire conseil juridique', label: 'Juridique / Comptabilité' },
  { q: 'agence marketing communication publicité', label: 'Marketing / Com' },
  { q: 'médecin dentiste kiné pharmacie', label: 'Santé' },
  { q: 'salle sport fitness yoga pilates', label: 'Sport / Loisirs' },
  { q: 'garage mécanique carrosserie automobile', label: 'Automobile' },
  { q: 'architecte designer photographe', label: 'Design / Création' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${LEAD_STATUS_COLORS[status]}`}>
      {LEAD_STATUS_LABELS[status]}
    </span>
  )
}

function SourceBadge({ source }: { source: LeadSource }) {
  const colors: Record<LeadSource, string> = {
    sirene:        'bg-blue-50 text-blue-600',
    google_places: 'bg-red-50 text-red-600',
    pappers:       'bg-indigo-50 text-indigo-600',
    csv:           'bg-gray-100 text-gray-600',
    manuel:        'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${colors[source]}`}>
      {LEAD_SOURCE_LABELS[source]}
    </span>
  )
}

function EnrichmentScore({ lead }: { lead: Lead }) {
  let score = 0
  if (lead.phone) score += 30
  if (lead.email) score += 20
  if (lead.website !== null) score += 15
  if (lead.siren) score += 15
  if (lead.employee_range) score += 10
  if (lead.google_rating) score += 10

  const color = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-yellow-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-1.5" title={`Enrichissement : ${score}%`}>
      <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-fourmiliance-ghost tabular-nums">{score}%</span>
    </div>
  )
}

// ─── API gouvernementale entreprises (pas de clé, CORS OK) ───────────────────

function trancheToRange(t: string): Lead['employee_range'] {
  const map: Record<string, Lead['employee_range']> = {
    '00': '1', '01': '1', '02': '2-9', '03': '2-9',
    '11': '10-49', '12': '10-49', '21': '50-249', '22': '50-249',
    '31': '250+', '32': '250+', '41': '250+', '42': '250+',
    'NN': null,
  }
  return map[t] ?? null
}

function nafToSector(naf: string): string {
  const prefix = naf.slice(0, 2)
  const map: Record<string, string> = {
    '47': 'Commerce de détail', '56': 'Restauration', '55': 'Hôtellerie',
    '86': 'Santé', '85': 'Enseignement', '96': 'Services personnels',
    '41': 'Construction', '43': 'BTP / Artisanat', '62': 'Informatique',
    '69': 'Juridique / Comptabilité', '70': 'Conseil', '73': 'Marketing',
    '74': 'Design / Création', '77': 'Location', '81': 'Services bâtiment',
    '90': 'Arts / Spectacles', '93': 'Sport / Loisirs', '45': 'Automobile',
  }
  return map[prefix] ?? `Secteur ${prefix}`
}

async function fetchEnterpriseLeads(
  query: string,
  department: string,
  limit: number,
): Promise<Partial<Lead>[]> {
  const perPage = 25
  const maxPages = Math.ceil(limit / perPage)
  const results: Partial<Lead>[] = []

  for (let page = 1; page <= maxPages && results.length < limit; page++) {
    const url = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(query)}&departement=${encodeURIComponent(department)}&per_page=${perPage}&page=${page}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`API entreprises ${res.status}`)
    const data = await res.json()
    if (!data.results?.length) break

    for (const e of data.results) {
      if (results.length >= limit) break
      const siege = e.siege ?? {}
      const tranche = e.tranche_effectif_salarie ?? siege.tranche_effectif_salarie ?? ''
      const director = e.dirigeants?.[0]
      const contactName = director
        ? `${director.prenoms ?? ''} ${director.nom ?? ''}`.trim() || null
        : null

      results.push({
        company_name: e.nom_complet ?? e.nom_raison_sociale ?? 'Entreprise',
        siren: e.siren ?? null,
        siret: siege.siret ?? null,
        naf_code: e.activite_principale ?? null,
        sector: e.activite_principale ? nafToSector(e.activite_principale) : null,
        postal_code: siege.code_postal ?? null,
        city: siege.libelle_commune ?? null,
        department,
        address: siege.adresse ?? null,
        employee_range: trancheToRange(tranche),
        contact_name: contactName,
        phone: null,
        source: 'sirene' as LeadSource,
        source_data: { siren: e.siren, naf: e.activite_principale, api: 'gouvernemental' },
        status: 'nouveau' as LeadStatus,
        has_website: null,
      })
    }
  }
  return results
}

// ─── Import CSV ───────────────────────────────────────────────────────────────

function parseCSV(text: string): Partial<Lead>[] {
  const sep = text.includes(';') ? ';' : ','
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const headers = lines[0].split(sep).map(h =>
    h.trim().replace(/^["'](.*)["']$/, '$1').toLowerCase()
  )

  const find = (keys: string[]) =>
    headers.findIndex(h => keys.some(k => h.includes(k)))

  const col = {
    name:    find(['nom', 'entreprise', 'company', 'raison', 'denomination']),
    phone:   find(['tel', 'phone', 'mobile', 'portable']),
    email:   find(['email', 'mail', 'courriel']),
    city:    find(['ville', 'city', 'commune']),
    cp:      find(['code_postal', 'cp', 'postal', 'zip']),
    sector:  find(['secteur', 'activite', 'sector', 'activité']),
    siren:   find(['siren']),
    contact: find(['contact', 'interlocuteur', 'prenom', 'prénom']),
    dept:    find(['departement', 'département', 'dept']),
  }

  const cell = (row: string[], idx: number) =>
    idx >= 0 ? row[idx]?.trim().replace(/^["'](.*)["']$/, '$1') || null : null

  return lines.slice(1).map(line => {
    const cols = line.split(sep)
    const name = cell(cols, col.name)
    if (!name) return null
    return {
      company_name: name,
      phone:    cell(cols, col.phone),
      email:    cell(cols, col.email),
      city:     cell(cols, col.city),
      postal_code: cell(cols, col.cp),
      sector:   cell(cols, col.sector),
      siren:    cell(cols, col.siren),
      contact_name: cell(cols, col.contact),
      department: cell(cols, col.dept),
      source: 'csv' as LeadSource,
      status: 'nouveau' as LeadStatus,
    } as Partial<Lead>
  }).filter(Boolean) as Partial<Lead>[]
}

// ─── Modal génération leads ───────────────────────────────────────────────────

function GenerateModal({
  campaigns,
  onClose,
  onGenerated,
}: {
  campaigns: Campaign[]
  onClose: () => void
  onGenerated: (count: number) => void
}) {
  const [source, setSource]         = useState<LeadSource>('sirene')
  const [sectorIdx, setSectorIdx]   = useState(0)
  const [dept, setDept]             = useState('66')
  const [limit, setLimit]           = useState(50)
  const [campaignId, setCampaignId] = useState<string>('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [csvPreview, setCsvPreview] = useState<Partial<Lead>[] | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { profile } = useAuth()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const parsed = parseCSV(text)
      if (!parsed.length) {
        setError('Fichier CSV invalide ou vide. Colonnes attendues : nom, telephone, email, ville...')
        return
      }
      setCsvPreview(parsed)
      setError(null)
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      let newLeads: Partial<Lead>[] = []

      if (source === 'sirene') {
        if (!dept.trim()) { setError('Renseignez un département.'); setLoading(false); return }
        newLeads = await fetchEnterpriseLeads(SECTOR_OPTIONS[sectorIdx].q, dept.trim(), limit)
        if (!newLeads.length) {
          setError('Aucun résultat. Essayez un autre secteur ou département.')
          setLoading(false); return
        }
      } else if (source === 'csv') {
        if (!csvPreview?.length) { setError('Chargez d\'abord un fichier CSV.'); setLoading(false); return }
        newLeads = csvPreview
      } else {
        setError('Cette source sera disponible prochainement.')
        setLoading(false); return
      }

      // Dédoublonnage par SIREN
      const sirens = newLeads.map(l => l.siren).filter(Boolean) as string[]
      let existingSirens: string[] = []
      if (sirens.length > 0) {
        const { data } = await supabase.from('leads').select('siren').in('siren', sirens)
        existingSirens = (data ?? []).map(r => r.siren).filter(Boolean) as string[]
      }
      const deduped = newLeads.filter(l => !l.siren || !existingSirens.includes(l.siren))
      const skipped = newLeads.length - deduped.length

      if (!deduped.length) {
        setError(`Tous les leads existent déjà (${skipped} doublons détectés).`)
        setLoading(false); return
      }

      const rows = deduped.map(l => ({
        ...l,
        campaign_id: campaignId || null,
        assigned_to: profile?.role !== 'admin' ? profile?.id : null,
      }))

      const { error: dbErr } = await supabase.from('leads').insert(rows)
      if (dbErr) throw dbErr

      onGenerated(rows.length)
      if (skipped > 0) onGenerated(0) // toast handled by caller, pass skip info
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la génération')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gen-modal-title"
      >
        <div className="px-6 pt-6 pb-4 border-b border-fourmiliance-border">
          <h2 id="gen-modal-title" className="font-heading text-xl text-fourmiliance-forest">
            Générer des leads
          </h2>
          <p className="text-sm text-fourmiliance-ghost mt-1">
            Extraction automatique depuis les bases officielles
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Source */}
          <div>
            <label htmlFor="gen-source" className="block text-sm font-medium text-fourmiliance-ink mb-1">Source</label>
            <select
              id="gen-source"
              value={source}
              onChange={e => { setSource(e.target.value as LeadSource); setCsvPreview(null); setError(null) }}
              className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid"
            >
              <option value="sirene">Base entreprises gouvernementale (gratuit)</option>
              <option value="csv">Import CSV</option>
              <option value="google_places" disabled>Google Maps (bientôt)</option>
              <option value="pappers" disabled>Pappers (bientôt)</option>
            </select>
          </div>

          {source === 'sirene' && (
            <>
              <div>
                <label htmlFor="gen-sector" className="block text-sm font-medium text-fourmiliance-ink mb-1">Secteur</label>
                <select
                  id="gen-sector"
                  value={sectorIdx}
                  onChange={e => setSectorIdx(Number(e.target.value))}
                  className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid"
                >
                  {SECTOR_OPTIONS.map((o, i) => (
                    <option key={i} value={i}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="gen-dept" className="block text-sm font-medium text-fourmiliance-ink mb-1">Département</label>
                  <input
                    id="gen-dept"
                    type="text"
                    value={dept}
                    onChange={e => setDept(e.target.value)}
                    placeholder="ex: 66"
                    maxLength={3}
                    className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid"
                  />
                </div>
                <div>
                  <label htmlFor="gen-limit" className="block text-sm font-medium text-fourmiliance-ink mb-1">Nombre max</label>
                  <input
                    id="gen-limit"
                    type="number"
                    value={limit}
                    min={1}
                    max={200}
                    onChange={e => setLimit(Number(e.target.value))}
                    className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid"
                  />
                </div>
              </div>

              <p className="text-xs text-fourmiliance-ghost bg-fourmiliance-cream rounded-lg px-3 py-2">
                Données officielles françaises — numéros de téléphone non inclus (source publique). Complétez manuellement ou via la fiche lead.
              </p>
            </>
          )}

          {source === 'csv' && (
            <div>
              <label className="block text-sm font-medium text-fourmiliance-ink mb-2">
                Fichier CSV <span className="text-fourmiliance-ghost font-normal">(séparateur ; ou ,)</span>
              </label>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-fourmiliance-border rounded-xl text-sm text-fourmiliance-ghost hover:border-fourmiliance-mid hover:text-fourmiliance-mid transition"
              >
                <Upload size={16} aria-hidden="true" />
                Choisir un fichier CSV
              </button>
              {csvPreview && (
                <p className="mt-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                  {csvPreview.length} lignes détectées
                  {csvPreview.filter(l => l.phone).length > 0 && ` · ${csvPreview.filter(l => l.phone).length} avec téléphone`}
                </p>
              )}
              <p className="mt-2 text-xs text-fourmiliance-ghost">
                Colonnes reconnues : nom, telephone, email, ville, code_postal, secteur, siren, contact
              </p>
            </div>
          )}

          {/* Campagne */}
          <div>
            <label htmlFor="gen-campaign" className="block text-sm font-medium text-fourmiliance-ink mb-1">
              Campagne <span className="text-fourmiliance-ghost font-normal">(optionnel)</span>
            </label>
            <select
              id="gen-campaign"
              value={campaignId}
              onChange={e => setCampaignId(e.target.value)}
              className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid"
            >
              <option value="">Sans campagne</option>
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {error && (
            <p role="alert" className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
              {error}
            </p>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3 justify-end">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-fourmiliance-ink border border-fourmiliance-border rounded-lg hover:bg-gray-50 transition min-h-[44px]">
            Annuler
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-fourmiliance-mid rounded-lg hover:bg-fourmiliance-forest transition min-h-[44px] flex items-center gap-2 disabled:opacity-50"
          >
            {loading
              ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" role="status" aria-label="Génération" /><span>Génération...</span></>
              : <><Zap size={15} aria-hidden="true" /><span>Générer</span></>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Drawer détail lead ───────────────────────────────────────────────────────

function LeadDrawer({
  lead,
  onClose,
  onUpdated,
}: {
  lead: Lead
  onClose: () => void
  onUpdated: () => void
}) {
  const { show: toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [form, setForm] = useState({
    phone:        lead.phone ?? '',
    email:        lead.email ?? '',
    contact_name: lead.contact_name ?? '',
    status:       lead.status,
    notes:        '',
  })

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('leads').update({
      phone:        form.phone || null,
      email:        form.email || null,
      contact_name: form.contact_name || null,
      status:       form.status,
    }).eq('id', lead.id)
    setSaving(false)
    if (error) { toast('Erreur de sauvegarde', 'error'); return }
    toast('Lead mis à jour')
    setEditing(false)
    onUpdated()
  }

  const statusOptions = (Object.keys(LEAD_STATUS_LABELS) as LeadStatus[]).map(v => ({
    value: v, label: LEAD_STATUS_LABELS[v],
  }))

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panneau */}
      <aside
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label={`Détail lead : ${lead.company_name}`}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-fourmiliance-border flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="font-heading text-xl text-fourmiliance-forest leading-tight truncate">
              {lead.company_name}
            </h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <StatusBadge status={lead.status} />
              <SourceBadge source={lead.source} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 transition text-fourmiliance-ghost min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Fermer"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Corps — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Téléphone prominent */}
          <div>
            <p className="text-xs font-medium text-fourmiliance-ghost uppercase tracking-wide mb-1.5">Téléphone</p>
            {editing ? (
              <input
                type="tel"
                value={form.phone}
                onChange={set('phone')}
                placeholder="+33 6 00 00 00 00"
                className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid"
              />
            ) : lead.phone ? (
              <a
                href={`tel:${lead.phone}`}
                className="flex items-center gap-2 text-fourmiliance-forest hover:text-fourmiliance-mid transition"
              >
                <Phone size={18} className="text-fourmiliance-mid flex-shrink-0" aria-hidden="true" />
                <span className="text-2xl font-mono font-semibold tabular-nums tracking-wide">
                  {lead.phone}
                </span>
              </a>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 text-sm text-fourmiliance-ghost hover:text-fourmiliance-mid transition"
              >
                <Phone size={15} aria-hidden="true" />
                <span className="italic">Ajouter un numéro</span>
              </button>
            )}
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <p className="text-xs font-medium text-fourmiliance-ghost uppercase tracking-wide mb-1.5">Contact</p>
              {editing ? (
                <input
                  type="text"
                  value={form.contact_name}
                  onChange={set('contact_name')}
                  placeholder="Nom du contact"
                  className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid"
                />
              ) : (
                <p className="text-sm text-fourmiliance-ink">{lead.contact_name || <span className="text-fourmiliance-ghost italic">Non renseigné</span>}</p>
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-fourmiliance-ghost uppercase tracking-wide mb-1.5">Email</p>
              {editing ? (
                <input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="email@domaine.fr"
                  className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid"
                />
              ) : lead.email ? (
                <a href={`mailto:${lead.email}`} className="text-sm text-fourmiliance-mid hover:underline">
                  {lead.email}
                </a>
              ) : (
                <p className="text-sm text-fourmiliance-ghost italic">Non renseigné</p>
              )}
            </div>

            {editing && (
              <div>
                <p className="text-xs font-medium text-fourmiliance-ghost uppercase tracking-wide mb-1.5">Statut</p>
                <select
                  value={form.status}
                  onChange={set('status')}
                  className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid"
                >
                  {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Séparateur */}
          <hr className="border-fourmiliance-border" />

          {/* Infos entreprise (lecture seule) */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-fourmiliance-ghost uppercase tracking-wide">Entreprise</p>

            {(lead.city || lead.department) && (
              <div className="flex items-center gap-2 text-sm text-fourmiliance-ink">
                <MapPin size={14} className="text-fourmiliance-ghost flex-shrink-0" aria-hidden="true" />
                <span>{[lead.city, lead.postal_code, lead.department && `(${lead.department})`].filter(Boolean).join(' ')}</span>
              </div>
            )}
            {lead.sector && (
              <div className="flex items-center gap-2 text-sm text-fourmiliance-ink">
                <Users size={14} className="text-fourmiliance-ghost flex-shrink-0" aria-hidden="true" />
                <span>{lead.sector}</span>
                {lead.employee_range && <span className="text-fourmiliance-ghost">· {lead.employee_range} sal.</span>}
              </div>
            )}
            {lead.website && (
              <div className="flex items-center gap-2 text-sm">
                <Globe size={14} className="text-fourmiliance-ghost flex-shrink-0" aria-hidden="true" />
                <a href={lead.website} target="_blank" rel="noopener noreferrer"
                  className="text-fourmiliance-mid hover:underline truncate">
                  {lead.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
            {lead.google_rating && (
              <div className="flex items-center gap-2 text-sm text-fourmiliance-ink">
                <Star size={14} className="text-fourmiliance-ghost flex-shrink-0" fill="currentColor" aria-hidden="true" />
                <span className="tabular-nums">{lead.google_rating}</span>
                {lead.google_reviews_count && <span className="text-fourmiliance-ghost">({lead.google_reviews_count} avis)</span>}
              </div>
            )}
            {lead.siren && (
              <p className="text-xs text-fourmiliance-ghost font-mono">SIREN : {lead.siren}</p>
            )}
            {lead.naf_code && (
              <p className="text-xs text-fourmiliance-ghost">NAF : {lead.naf_code}</p>
            )}
          </div>

          {/* Enrichissement */}
          <div className="bg-fourmiliance-cream rounded-xl p-3">
            <p className="text-xs font-medium text-fourmiliance-ghost mb-2">Score d'enrichissement</p>
            <EnrichmentScore lead={lead} />
          </div>
        </div>

        {/* Footer — actions */}
        <div className="px-5 py-4 border-t border-fourmiliance-border flex gap-3">
          {editing ? (
            <>
              <button
                onClick={() => setEditing(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-fourmiliance-ink border border-fourmiliance-border rounded-lg hover:bg-gray-50 transition min-h-[44px]"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-fourmiliance-mid rounded-lg hover:bg-fourmiliance-forest transition min-h-[44px] disabled:opacity-50"
              >
                <Save size={15} aria-hidden="true" />
                {saving ? 'Sauvegarde...' : 'Enregistrer'}
              </button>
            </>
          ) : (
            <>
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-fourmiliance-mid rounded-lg hover:bg-fourmiliance-forest transition min-h-[44px]"
                >
                  <Phone size={15} aria-hidden="true" />
                  Appeler
                </a>
              )}
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-fourmiliance-ink border border-fourmiliance-border rounded-lg hover:bg-gray-50 transition min-h-[44px]"
              >
                <Edit2 size={15} aria-hidden="true" />
                Modifier
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function LeadsPage() {
  const { profile } = useAuth()
  const { show: toast } = useToast()
  const qc = useQueryClient()

  const [search,        setSearch]        = useState('')
  const [filterStatus,  setFilterStatus]  = useState<LeadStatus | ''>('')
  const [filterSource,  setFilterSource]  = useState<LeadSource | ''>('')
  const [showGenModal,  setShowGenModal]  = useState(false)
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set())
  const [activeLead,    setActiveLead]    = useState<Lead | null>(null)
  const [page,          setPage]          = useState(0)
  const [enrichProgress, setEnrichProgress] = useState<EnrichProgress | null>(null)

  const isAdmin = profile?.role === 'admin'

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase.from('campaigns')
        .select('id, name, status')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Campaign[]
    },
  })

  const { data: result, isLoading } = useQuery({
    queryKey: ['leads', search, filterStatus, filterSource, page],
    queryFn: async () => {
      let q = supabase
        .from('leads')
        .select(`*, assignee:profiles!leads_assigned_to_fkey(id, full_name, avatar_url), campaign:campaigns(id, name)`, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (search)       q = q.ilike('company_name', `%${search}%`)
      if (filterStatus) q = q.eq('status', filterStatus)
      if (filterSource) q = q.eq('source', filterSource)

      const { data, error, count } = await q
      if (error) throw error
      return { leads: data as Lead[], total: count ?? 0 }
    },
    placeholderData: (prev) => prev,
  })
  const leads = result?.leads ?? []
  const total = result?.total ?? 0

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const assignMutation = useMutation({
    mutationFn: async ({ ids, assignee_id }: { ids: string[]; assignee_id: string }) => {
      const { error } = await supabase.from('leads')
        .update({ assigned_to: assignee_id, status: 'en_attente' })
        .in('id', ids)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      toast(`${selectedIds.size} leads assignés`)
      setSelectedIds(new Set())
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('leads').delete().in('id', ids)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      toast('Leads supprimés')
      setSelectedIds(new Set())
    },
  })

  const handleEnrich = async () => {
    const selected = leads.filter(l => selectedIds.has(l.id))
    setEnrichProgress({ done: 0, total: 1, found: 0 })
    const phoneMap = await enrichLeadsPhone(selected, p => setEnrichProgress(p))
    if (phoneMap.size === 0) {
      toast('Aucun numéro trouvé via OpenStreetMap pour ces leads')
      setEnrichProgress(null)
      return
    }
    // Mise à jour en base
    for (const [id, phone] of phoneMap) {
      await supabase.from('leads').update({ phone }).eq('id', id)
    }
    qc.invalidateQueries({ queryKey: ['leads'] })
    toast(`${phoneMap.size} numéro${phoneMap.size > 1 ? 's' : ''} trouvé${phoneMap.size > 1 ? 's' : ''} et ajouté${phoneMap.size > 1 ? 's' : ''}`)
    setEnrichProgress(null)
    setSelectedIds(new Set())
  }

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const allSelected = leads.length > 0 && leads.every(l => selectedIds.has(l.id))
  const toggleAll   = () => {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(leads.map(l => l.id)))
  }

  const handleSearchChange = (val: string) => { setSearch(val); setPage(0) }
  const handleStatusChange  = (val: LeadStatus | '') => { setFilterStatus(val); setPage(0) }
  const handleSourceToggle  = (src: LeadSource) => {
    setFilterSource(filterSource === src ? '' : src)
    setPage(0)
  }

  const exportCsv = () => {
    const cols = ['company_name', 'sector', 'phone', 'email', 'city', 'postal_code', 'status', 'source', 'siren']
    const header = cols.join(';')
    const rows = leads.map(l =>
      cols.map(c => String((l as unknown as Record<string, unknown>)[c] ?? '')).join(';')
    )
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'leads.csv' })
    a.click()
    URL.revokeObjectURL(url)
  }

  const statusOptions: { value: LeadStatus | ''; label: string }[] = [
    { value: '', label: 'Tous les statuts' },
    ...Object.entries(LEAD_STATUS_LABELS).map(([v, l]) => ({ value: v as LeadStatus, label: l })),
  ]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-fourmiliance-forest">Leads</h1>
          <p className="text-sm text-fourmiliance-ghost mt-0.5">
            {total.toLocaleString('fr-FR')} lead{total !== 1 ? 's' : ''} au total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-fourmiliance-ink border border-fourmiliance-border rounded-lg hover:bg-gray-50 transition min-h-[44px]"
          >
            <Download size={15} aria-hidden="true" />
            <span className="hidden sm:inline">Exporter</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowGenModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-fourmiliance-mid rounded-lg hover:bg-fourmiliance-forest transition min-h-[44px]"
            >
              <Zap size={15} aria-hidden="true" />
              Générer des leads
            </button>
          )}
        </div>
      </div>

      {/* Sources KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(Object.keys(LEAD_SOURCE_LABELS) as LeadSource[]).map(src => {
          const count = leads.filter(l => l.source === src).length
          return (
            <button
              key={src}
              onClick={() => handleSourceToggle(src)}
              className={`rounded-xl border p-3 text-left transition hover:shadow-sm ${
                filterSource === src
                  ? 'border-fourmiliance-mid bg-fourmiliance-mid/5'
                  : 'border-fourmiliance-border bg-white'
              }`}
            >
              <p className="text-xl font-bold text-fourmiliance-forest tabular-nums">{count}</p>
              <p className="text-xs text-fourmiliance-ghost mt-0.5">{LEAD_SOURCE_LABELS[src]}</p>
            </button>
          )
        })}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fourmiliance-ghost" aria-hidden="true" />
          <input
            type="search"
            placeholder="Rechercher une entreprise..."
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-fourmiliance-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid bg-white"
          />
        </div>
        <div className="relative">
          <select
            value={filterStatus}
            onChange={e => handleStatusChange(e.target.value as LeadStatus | '')}
            className="appearance-none pl-3 pr-8 py-2 text-sm border border-fourmiliance-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid bg-white min-h-[44px]"
            aria-label="Filtrer par statut"
          >
            {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-fourmiliance-ghost pointer-events-none" aria-hidden="true" />
        </div>
      </div>

      {/* Actions groupées */}
      {selectedIds.size > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-wrap items-center gap-3 p-3 bg-fourmiliance-mid/5 border border-fourmiliance-mid/20 rounded-xl"
        >
          <span className="text-sm font-medium text-fourmiliance-forest">
            {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
          </span>

          {enrichProgress && (
            <div className="flex items-center gap-2 text-xs text-fourmiliance-ghost">
              <div className="w-4 h-4 border-2 border-fourmiliance-mid border-t-transparent rounded-full animate-spin flex-shrink-0" />
              Enrichissement {enrichProgress.done}/{enrichProgress.total} depts · {enrichProgress.found} tél. trouvés
            </div>
          )}

          <div className="flex gap-2 ml-auto">
            <button
              onClick={handleEnrich}
              disabled={!!enrichProgress}
              title="Recherche les numéros de téléphone via OpenStreetMap (gratuit)"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition disabled:opacity-40"
            >
              <Sparkles size={12} aria-hidden="true" />
              Enrichir tél.
            </button>
            <button
              onClick={() => {
                if (profile) assignMutation.mutate({ ids: [...selectedIds], assignee_id: profile.id })
              }}
              className="px-3 py-1.5 text-xs font-medium text-fourmiliance-mid border border-fourmiliance-mid/30 rounded-lg hover:bg-fourmiliance-mid/10 transition"
            >
              M'assigner
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  if (confirm(`Supprimer ${selectedIds.size} leads ?`))
                    deleteMutation.mutate([...selectedIds])
                }}
                className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition"
              >
                Supprimer
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-fourmiliance-border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-fourmiliance-mid border-t-transparent rounded-full animate-spin mx-auto" role="status" aria-label="Chargement" />
          </div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center">
            <Database size={40} className="mx-auto text-fourmiliance-ghost/40 mb-3" aria-hidden="true" />
            <p className="font-medium text-fourmiliance-ink">Aucun lead</p>
            <p className="text-sm text-fourmiliance-ghost mt-1">
              Générez vos premiers leads ou importez un CSV.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="border-b border-fourmiliance-border bg-gray-50">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Tout sélectionner"
                      className="rounded border-gray-300 text-fourmiliance-mid focus:ring-fourmiliance-mid"
                    />
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-fourmiliance-ink">Entreprise</th>
                  <th className="text-left px-4 py-3 font-semibold text-fourmiliance-ink hidden md:table-cell">Contact</th>
                  <th className="text-left px-4 py-3 font-semibold text-fourmiliance-ink hidden lg:table-cell">Localisation</th>
                  <th className="text-left px-4 py-3 font-semibold text-fourmiliance-ink hidden xl:table-cell">Enrichissement</th>
                  <th className="text-left px-4 py-3 font-semibold text-fourmiliance-ink">Statut</th>
                  <th className="text-left px-4 py-3 font-semibold text-fourmiliance-ink hidden sm:table-cell">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fourmiliance-border">
                {leads.map(lead => (
                  <tr
                    key={lead.id}
                    onClick={() => setActiveLead(lead)}
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedIds.has(lead.id) ? 'bg-fourmiliance-mid/5' : ''}`}
                  >
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(lead.id)}
                        onChange={() => toggleSelect(lead.id)}
                        aria-label={`Sélectionner ${lead.company_name}`}
                        className="rounded border-gray-300 text-fourmiliance-mid focus:ring-fourmiliance-mid"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-fourmiliance-ink truncate max-w-[200px]">
                        {lead.company_name}
                      </p>
                      {lead.sector && <p className="text-xs text-fourmiliance-ghost">{lead.sector}</p>}
                      {lead.employee_range && (
                        <span className="inline-flex items-center gap-1 text-xs text-fourmiliance-ghost">
                          <Users size={11} aria-hidden="true" />{lead.employee_range} sal.
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {lead.phone ? (
                        <span className="flex items-center gap-1.5 text-fourmiliance-mid">
                          <Phone size={13} aria-hidden="true" />
                          <span className="tabular-nums">{lead.phone}</span>
                        </span>
                      ) : (
                        <span className="text-fourmiliance-ghost/40 text-xs italic">Pas de tel.</span>
                      )}
                      {lead.has_website === false && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded mt-1">
                          <Globe size={10} aria-hidden="true" />Sans site web
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {(lead.city || lead.department) && (
                        <span className="flex items-center gap-1 text-xs text-fourmiliance-ghost">
                          <MapPin size={11} aria-hidden="true" />
                          {lead.city}{lead.city && lead.department ? ` (${lead.department})` : lead.department}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <EnrichmentScore lead={lead} />
                      {lead.google_rating && (
                        <span className="flex items-center gap-0.5 text-xs text-fourmiliance-ghost mt-1">
                          <Star size={11} fill="currentColor" aria-hidden="true" />
                          <span className="tabular-nums">{lead.google_rating}</span>
                          {lead.google_reviews_count && <span>({lead.google_reviews_count})</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <SourceBadge source={lead.source} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-fourmiliance-ghost">
            Page {page + 1} sur {totalPages} · {total.toLocaleString('fr-FR')} leads
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex items-center gap-1 px-3 py-2 text-sm border border-fourmiliance-border rounded-lg hover:bg-gray-50 transition disabled:opacity-40 min-h-[44px]"
              aria-label="Page précédente"
            >
              <ChevronLeft size={15} aria-hidden="true" />
              Préc.
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="flex items-center gap-1 px-3 py-2 text-sm border border-fourmiliance-border rounded-lg hover:bg-gray-50 transition disabled:opacity-40 min-h-[44px]"
              aria-label="Page suivante"
            >
              Suiv.
              <ChevronRight size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Modal génération */}
      {showGenModal && (
        <GenerateModal
          campaigns={campaigns}
          onClose={() => setShowGenModal(false)}
          onGenerated={count => {
            qc.invalidateQueries({ queryKey: ['leads'] })
            if (count > 0) toast(`${count} leads générés avec succès`)
          }}
        />
      )}

      {/* Drawer détail lead */}
      {activeLead && (
        <LeadDrawer
          lead={activeLead}
          onClose={() => setActiveLead(null)}
          onUpdated={() => {
            qc.invalidateQueries({ queryKey: ['leads'] })
            setActiveLead(null)
          }}
        />
      )}
    </div>
  )
}
