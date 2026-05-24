import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Plus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth.tsx'
import type { IncubatedCompany, IncubatedStage } from '../../types'
import { formatDate } from '../../lib/utils'

// ─── Config ───────────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<IncubatedStage, string> = {
  candidature: 'Candidature',
  selection:   'Sélection',
  actif:       'Actif',
  diplome:     'Diplômé',
  archive:     'Archivé',
}

const STAGE_COLORS: Record<IncubatedStage, string> = {
  candidature: 'badge-neutral',
  selection:   'badge-sage',
  actif:       'badge-green',
  diplome:     'badge-warm',
  archive:     'badge-neutral',
}

const ALL_STAGES: IncubatedStage[] = ['candidature', 'selection', 'actif', 'diplome', 'archive']

// ─── Composant principal ──────────────────────────────────────────────────────

export default function IncubateurPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [filterStage, setFilterStage] = useState<IncubatedStage | 'all'>('all')
  const [selected, setSelected]       = useState<IncubatedCompany | null>(null)
  const [showCreate, setShowCreate]   = useState(false)

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['incubated-companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incubated_companies')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as IncubatedCompany[]
    },
  })

  const filtered = filterStage === 'all'
    ? companies
    : companies.filter(c => c.stage === filterStage)

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-fourmiliance-mid border-t-transparent rounded-full animate-spin" role="status" aria-label="Chargement des entreprises incubées" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par stade">
          <button
            onClick={() => setFilterStage('all')}
            aria-pressed={filterStage === 'all'}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fourmiliance-mid
              ${filterStage === 'all'
                ? 'bg-fourmiliance-forest text-white border-fourmiliance-forest'
                : 'border-fourmiliance-border text-fourmiliance-tertiary hover:border-fourmiliance-mid'
              }`}
          >
            Tous ({companies.length})
          </button>
          {ALL_STAGES.map(s => (
            <button
              key={s}
              onClick={() => setFilterStage(s)}
              aria-pressed={filterStage === s}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fourmiliance-mid
                ${filterStage === s
                  ? 'bg-fourmiliance-forest text-white border-fourmiliance-forest'
                  : 'border-fourmiliance-border text-fourmiliance-tertiary hover:border-fourmiliance-mid'
                }`}
            >
              {STAGE_LABELS[s]}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 text-sm bg-fourmiliance-forest text-white
                     px-3 py-2 rounded-lg hover:bg-fourmiliance-mid transition-colors min-h-[44px]
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fourmiliance-mid"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Nouvelle entreprise
        </button>
      </div>

      {/* ── Grid entreprises ─────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-fourmiliance-border p-12 text-center">
          <p className="text-sm text-fourmiliance-ghost">Aucune entreprise incubée dans cette catégorie.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelected(c)}
              onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setSelected(c)}
              aria-label={`Voir les détails de ${c.name}`}
              className="bg-white rounded-xl border border-fourmiliance-border p-5 cursor-pointer
                         hover:shadow-card hover:border-fourmiliance-mid/30 transition-all
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fourmiliance-mid"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-semibold text-fourmiliance-ink text-sm leading-tight">{c.name}</h3>
                <span className={`badge flex-shrink-0 ${STAGE_COLORS[c.stage]}`}>
                  {STAGE_LABELS[c.stage]}
                </span>
              </div>
              {c.sector && (
                <p className="text-xs text-fourmiliance-muted mb-2">{c.sector}</p>
              )}
              {c.contact_name && (
                <p className="text-xs text-fourmiliance-tertiary">Contact : {c.contact_name}</p>
              )}
              {c.start_date && (
                <p className="text-xs text-fourmiliance-ghost mt-2">
                  Depuis {formatDate(c.start_date)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Modal détail ─────────────────────────────────────────────────── */}
      {selected && (
        <CompanyModal
          company={selected}
          onClose={() => setSelected(null)}
          onRefresh={() => {
            setSelected(null)
            void queryClient.invalidateQueries({ queryKey: ['incubated-companies'] })
          }}
        />
      )}

      {/* ── Modal création ───────────────────────────────────────────────── */}
      {showCreate && (
        <CompanyCreateModal
          userId={user?.id ?? null}
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false)
            void queryClient.invalidateQueries({ queryKey: ['incubated-companies'] })
          }}
        />
      )}

    </div>
  )
}

// ─── Modal détail entreprise ─────────────────────────────────────────────────

function CompanyModal({
  company,
  onClose,
  onRefresh,
}: {
  company: IncubatedCompany
  onClose: () => void
  onRefresh: () => void
}) {
  async function updateStage(stage: IncubatedStage) {
    await supabase.from('incubated_companies').update({ stage }).eq('id', company.id)
    onRefresh()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div role="dialog" aria-modal="true" aria-labelledby="company-detail-title" className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-fourmiliance-border">
          <h3 id="company-detail-title" className="font-heading text-lg text-fourmiliance-forest">{company.name}</h3>
          <button onClick={onClose} aria-label="Fermer" className="p-2 rounded-lg text-fourmiliance-ghost hover:text-fourmiliance-ink hover:bg-fourmiliance-cream-dark transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fourmiliance-mid">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Stade */}
          <div>
            <p className="block text-xs font-semibold text-fourmiliance-muted uppercase tracking-wide mb-2">
              Stade
            </p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Changer de stade">
              {ALL_STAGES.map(s => (
                <button
                  key={s}
                  onClick={() => void updateStage(s)}
                  aria-pressed={company.stage === s}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fourmiliance-mid
                    ${company.stage === s
                      ? `${STAGE_COLORS[s]} border-transparent font-medium`
                      : 'border-fourmiliance-border text-fourmiliance-muted hover:border-fourmiliance-disabled'
                    }`}
                >
                  {STAGE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            {company.sector && (
              <div>
                <p className="text-xs text-fourmiliance-ghost">Secteur</p>
                <p className="text-fourmiliance-body">{company.sector}</p>
              </div>
            )}
            {company.contact_name && (
              <div>
                <p className="text-xs text-fourmiliance-ghost">Contact</p>
                <p className="text-fourmiliance-body">{company.contact_name}</p>
              </div>
            )}
            {company.email && (
              <div>
                <p className="text-xs text-fourmiliance-ghost">Email</p>
                <a href={`mailto:${company.email}`}
                  className="text-fourmiliance-mid hover:underline">{company.email}</a>
              </div>
            )}
            {company.phone && (
              <div>
                <p className="text-xs text-fourmiliance-ghost">Téléphone</p>
                <a href={`tel:${company.phone}`}
                  className="text-fourmiliance-mid hover:underline">{company.phone}</a>
              </div>
            )}
            {company.start_date && (
              <div>
                <p className="text-xs text-fourmiliance-ghost">Date d'entrée</p>
                <p className="text-fourmiliance-body">{formatDate(company.start_date)}</p>
              </div>
            )}
          </div>

          {company.description && (
            <div>
              <p className="text-xs text-fourmiliance-ghost mb-1">Description</p>
              <p className="text-sm text-fourmiliance-tertiary leading-relaxed">{company.description}</p>
            </div>
          )}

          {company.notes && (
            <div>
              <p className="text-xs text-fourmiliance-ghost mb-1">Notes internes</p>
              <p className="text-sm text-fourmiliance-tertiary leading-relaxed whitespace-pre-wrap">{company.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Modal création ───────────────────────────────────────────────────────────

function CompanyCreateModal({
  userId,
  onClose,
  onSaved,
}: {
  userId: string | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    name:         '',
    sector:       '',
    contact_name: '',
    email:        '',
    phone:        '',
    stage:        'candidature' as IncubatedStage,
    start_date:   '',
    description:  '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    await supabase.from('incubated_companies').insert({
      name:         form.name.trim(),
      sector:       form.sector       || null,
      contact_name: form.contact_name || null,
      email:        form.email        || null,
      phone:        form.phone        || null,
      stage:        form.stage,
      start_date:   form.start_date   || null,
      description:  form.description  || null,
      user_id:      userId,
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div role="dialog" aria-modal="true" aria-labelledby="company-create-title" className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-fourmiliance-border">
          <h3 id="company-create-title" className="font-heading text-base text-fourmiliance-forest">Nouvelle entreprise</h3>
          <button onClick={onClose} aria-label="Fermer" className="p-2 rounded-lg text-fourmiliance-ghost hover:text-fourmiliance-ink hover:bg-fourmiliance-cream-dark transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fourmiliance-mid">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <form onSubmit={e => void handleSave(e)} className="p-6 space-y-4">
          <div>
            <label htmlFor="ic-name" className="block text-xs font-medium text-fourmiliance-tertiary mb-1">Nom de l'entreprise *</label>
            <input id="ic-name" required value={form.name} aria-required="true"
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="ic-sector" className="block text-xs font-medium text-fourmiliance-tertiary mb-1">Secteur</label>
              <input id="ic-sector" value={form.sector}
                onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}
                placeholder="Tech, Agroalimentaire…"
                className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30" />
            </div>
            <div>
              <label htmlFor="ic-stage" className="block text-xs font-medium text-fourmiliance-tertiary mb-1">Stade</label>
              <select id="ic-stage" value={form.stage}
                onChange={e => setForm(f => ({ ...f, stage: e.target.value as IncubatedStage }))}
                className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30">
                {ALL_STAGES.map(s => (
                  <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="ic-contact" className="block text-xs font-medium text-fourmiliance-tertiary mb-1">Contact</label>
              <input id="ic-contact" value={form.contact_name}
                onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30" />
            </div>
            <div>
              <label htmlFor="ic-start-date" className="block text-xs font-medium text-fourmiliance-tertiary mb-1">Date d'entrée</label>
              <input id="ic-start-date" type="date" value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30" />
            </div>
          </div>

          <div>
            <label htmlFor="ic-description" className="block text-xs font-medium text-fourmiliance-tertiary mb-1">Description</label>
            <textarea id="ic-description" rows={3} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm resize-none
                         focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-fourmiliance-tertiary hover:text-fourmiliance-forest min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fourmiliance-mid rounded-lg">
              Annuler
            </button>
            <button type="submit" disabled={saving} aria-busy={saving}
              className="px-4 py-2 bg-fourmiliance-forest text-white text-sm rounded-lg min-h-[44px]
                         hover:bg-fourmiliance-mid transition-colors disabled:opacity-50
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fourmiliance-mid">
              {saving ? 'Création…' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
