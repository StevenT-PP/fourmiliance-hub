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
  candidature: 'bg-gray-100 text-gray-600',
  selection:   'bg-blue-100 text-blue-700',
  actif:       'bg-green-100 text-green-700',
  diplome:     'bg-fourmiliance-ocre/15 text-fourmiliance-ocre',
  archive:     'bg-gray-50 text-gray-400',
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
        <div className="w-8 h-8 border-2 border-fourmiliance-mid border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterStage('all')}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors
              ${filterStage === 'all'
                ? 'bg-fourmiliance-forest text-white border-fourmiliance-forest'
                : 'border-[#E0DAD0] text-[#5A5A5A] hover:border-fourmiliance-mid'
              }`}
          >
            Tous ({companies.length})
          </button>
          {ALL_STAGES.map(s => (
            <button
              key={s}
              onClick={() => setFilterStage(s)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors
                ${filterStage === s
                  ? 'bg-fourmiliance-forest text-white border-fourmiliance-forest'
                  : 'border-[#E0DAD0] text-[#5A5A5A] hover:border-fourmiliance-mid'
                }`}
            >
              {STAGE_LABELS[s]}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 text-sm bg-fourmiliance-forest text-white
                     px-3 py-1.5 rounded-lg hover:bg-fourmiliance-mid transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouvelle entreprise
        </button>
      </div>

      {/* ── Grid entreprises ─────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E0DAD0] p-12 text-center">
          <p className="text-sm text-[#9A9A9A]">Aucune entreprise incubée dans cette catégorie.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <div
              key={c.id}
              onClick={() => setSelected(c)}
              className="bg-white rounded-xl border border-[#E0DAD0] p-5 cursor-pointer
                         hover:shadow-card hover:border-fourmiliance-mid/30 transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-semibold text-[#1A1A1A] text-sm leading-tight">{c.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${STAGE_COLORS[c.stage]}`}>
                  {STAGE_LABELS[c.stage]}
                </span>
              </div>
              {c.sector && (
                <p className="text-xs text-[#7A7A7A] mb-2">{c.sector}</p>
              )}
              {c.contact_name && (
                <p className="text-xs text-[#5A5A5A]">Contact : {c.contact_name}</p>
              )}
              {c.start_date && (
                <p className="text-xs text-[#9A9A9A] mt-2">
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0DAD0]">
          <h3 className="font-heading text-lg text-fourmiliance-forest">{company.name}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#9A9A9A]" /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Stade */}
          <div>
            <label className="block text-xs font-semibold text-[#7A7A7A] uppercase tracking-wide mb-2">
              Stade
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_STAGES.map(s => (
                <button
                  key={s}
                  onClick={() => void updateStage(s)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors
                    ${company.stage === s
                      ? `${STAGE_COLORS[s]} border-transparent font-medium`
                      : 'border-[#E0DAD0] text-[#7A7A7A] hover:border-[#C0B8B0]'
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
                <p className="text-xs text-[#9A9A9A]">Secteur</p>
                <p className="text-[#2A2A2A]">{company.sector}</p>
              </div>
            )}
            {company.contact_name && (
              <div>
                <p className="text-xs text-[#9A9A9A]">Contact</p>
                <p className="text-[#2A2A2A]">{company.contact_name}</p>
              </div>
            )}
            {company.email && (
              <div>
                <p className="text-xs text-[#9A9A9A]">Email</p>
                <a href={`mailto:${company.email}`}
                  className="text-fourmiliance-mid hover:underline">{company.email}</a>
              </div>
            )}
            {company.phone && (
              <div>
                <p className="text-xs text-[#9A9A9A]">Téléphone</p>
                <a href={`tel:${company.phone}`}
                  className="text-fourmiliance-mid hover:underline">{company.phone}</a>
              </div>
            )}
            {company.start_date && (
              <div>
                <p className="text-xs text-[#9A9A9A]">Date d'entrée</p>
                <p className="text-[#2A2A2A]">{formatDate(company.start_date)}</p>
              </div>
            )}
          </div>

          {company.description && (
            <div>
              <p className="text-xs text-[#9A9A9A] mb-1">Description</p>
              <p className="text-sm text-[#5A5A5A] leading-relaxed">{company.description}</p>
            </div>
          )}

          {company.notes && (
            <div>
              <p className="text-xs text-[#9A9A9A] mb-1">Notes internes</p>
              <p className="text-sm text-[#5A5A5A] leading-relaxed whitespace-pre-wrap">{company.notes}</p>
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0DAD0]">
          <h3 className="font-heading text-base text-fourmiliance-forest">Nouvelle entreprise</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#9A9A9A]" /></button>
        </div>
        <form onSubmit={e => void handleSave(e)} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#5A5A5A] mb-1">Nom de l'entreprise *</label>
            <input required value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border border-[#E0DAD0] rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#5A5A5A] mb-1">Secteur</label>
              <input value={form.sector}
                onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}
                placeholder="Tech, Agroalimentaire…"
                className="w-full border border-[#E0DAD0] rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5A5A5A] mb-1">Stade</label>
              <select value={form.stage}
                onChange={e => setForm(f => ({ ...f, stage: e.target.value as IncubatedStage }))}
                className="w-full border border-[#E0DAD0] rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30">
                {ALL_STAGES.map(s => (
                  <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#5A5A5A] mb-1">Contact</label>
              <input value={form.contact_name}
                onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                className="w-full border border-[#E0DAD0] rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5A5A5A] mb-1">Date d'entrée</label>
              <input type="date" value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="w-full border border-[#E0DAD0] rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5A5A5A] mb-1">Description</label>
            <textarea rows={3} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border border-[#E0DAD0] rounded-lg px-3 py-2 text-sm resize-none
                         focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-[#5A5A5A] hover:text-fourmiliance-forest">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 bg-fourmiliance-forest text-white text-sm rounded-lg
                         hover:bg-fourmiliance-mid transition-colors disabled:opacity-50">
              {saving ? 'Création…' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
