import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Target, Users, Play, Pause, ChevronDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import type { Campaign } from '../../types'
import {
  CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUS_COLORS,
  type CampaignStatus,
} from '../../lib/constants'

function StatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CAMPAIGN_STATUS_COLORS[status]}`}>
      {CAMPAIGN_STATUS_LABELS[status]}
    </span>
  )
}

interface CampaignFormData {
  name: string
  description: string
  target_sector: string
  target_naf: string
  target_city: string
  target_department: string
  target_employee_range: string
}

const EMPTY: CampaignFormData = {
  name: '', description: '', target_sector: '', target_naf: '',
  target_city: '', target_department: '', target_employee_range: '',
}

function CampaignModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Campaign
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<CampaignFormData>(initial ? {
    name: initial.name,
    description: initial.description ?? '',
    target_sector: initial.target_sector ?? '',
    target_naf: initial.target_naf ?? '',
    target_city: initial.target_city ?? '',
    target_department: initial.target_department ?? '',
    target_employee_range: initial.target_employee_range ?? '',
  } : EMPTY)
  const [loading, setLoading] = useState(false)
  const { profile } = useAuth()

  const set = (k: keyof CampaignFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const payload = {
      name: form.name.trim(),
      description: form.description || null,
      target_sector: form.target_sector || null,
      target_naf: form.target_naf || null,
      target_city: form.target_city || null,
      target_department: form.target_department || null,
      target_employee_range: form.target_employee_range || null,
      created_by: profile?.id,
    }
    let error
    if (initial) {
      ;({ error } = await supabase.from('campaigns').update(payload).eq('id', initial.id))
    } else {
      ;({ error } = await supabase.from('campaigns').insert(payload))
    }
    setLoading(false)
    if (error) { alert(error.message); return }
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="camp-modal-title"
      >
        <div className="px-6 pt-6 pb-4 border-b border-fourmiliance-border">
          <h2 id="camp-modal-title" className="font-heading text-xl text-fourmiliance-forest">
            {initial ? 'Modifier la campagne' : 'Nouvelle campagne'}
          </h2>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label htmlFor="camp-name" className="block text-sm font-medium text-fourmiliance-ink mb-1">Nom *</label>
            <input id="camp-name" required value={form.name} onChange={set('name')}
              placeholder="ex: Commerce de détail Perpignan"
              className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid" />
          </div>
          <div>
            <label htmlFor="camp-desc" className="block text-sm font-medium text-fourmiliance-ink mb-1">Description</label>
            <textarea id="camp-desc" value={form.description} onChange={set('description')} rows={2}
              className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="camp-dept" className="block text-sm font-medium text-fourmiliance-ink mb-1">Département</label>
              <input id="camp-dept" value={form.target_department} onChange={set('target_department')}
                placeholder="ex: 66" maxLength={3}
                className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid" />
            </div>
            <div>
              <label htmlFor="camp-city" className="block text-sm font-medium text-fourmiliance-ink mb-1">Ville</label>
              <input id="camp-city" value={form.target_city} onChange={set('target_city')}
                placeholder="ex: Perpignan"
                className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="camp-naf" className="block text-sm font-medium text-fourmiliance-ink mb-1">Code NAF</label>
              <input id="camp-naf" value={form.target_naf} onChange={set('target_naf')}
                placeholder="ex: 47"
                className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid" />
            </div>
            <div>
              <label htmlFor="camp-employees" className="block text-sm font-medium text-fourmiliance-ink mb-1">Effectif cible</label>
              <div className="relative">
                <select id="camp-employees" value={form.target_employee_range} onChange={set('target_employee_range')}
                  className="w-full appearance-none border border-fourmiliance-border rounded-lg px-3 py-2 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid">
                  <option value="">Tous</option>
                  <option value="1">1 salarié</option>
                  <option value="2-9">2-9</option>
                  <option value="10-49">10-49</option>
                  <option value="50-249">50-249</option>
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-fourmiliance-ghost pointer-events-none" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3 justify-end">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-fourmiliance-ink border border-fourmiliance-border rounded-lg hover:bg-gray-50 transition min-h-[44px]">
            Annuler
          </button>
          <button type="submit" disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-fourmiliance-mid rounded-lg hover:bg-fourmiliance-forest transition min-h-[44px] disabled:opacity-50">
            {loading ? 'Enregistrement...' : initial ? 'Modifier' : 'Créer'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function CampaignsPage() {
  const { show: toast } = useToast()
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Campaign | null>(null)

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns-full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*, creator:profiles!campaigns_created_by_fkey(id, full_name)')
        .order('created_at', { ascending: false })
      if (error) throw error

      // Compte les leads par campagne
      const ids = (data as Campaign[]).map(c => c.id)
      if (ids.length === 0) return data as Campaign[]

      const { data: counts } = await supabase
        .from('leads')
        .select('campaign_id')
        .in('campaign_id', ids)

      return (data as Campaign[]).map(c => ({
        ...c,
        leads_count: counts?.filter(l => l.campaign_id === c.id).length ?? 0,
      }))
    },
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CampaignStatus }) => {
      const { error } = await supabase.from('campaigns').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns-full'] })
      qc.invalidateQueries({ queryKey: ['campaigns'] })
      toast('Statut mis à jour')
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-fourmiliance-forest">Campagnes</h1>
          <p className="text-sm text-fourmiliance-ghost mt-0.5">
            Organisez vos appels par segment de marché
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-fourmiliance-mid rounded-lg hover:bg-fourmiliance-forest transition min-h-[44px]"
        >
          <Plus size={15} aria-hidden="true" />
          Nouvelle campagne
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-fourmiliance-mid border-t-transparent rounded-full animate-spin" role="status" aria-label="Chargement" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-fourmiliance-border p-12 text-center">
          <Target size={40} className="mx-auto text-fourmiliance-ghost/40 mb-3" aria-hidden="true" />
          <p className="font-medium text-fourmiliance-ink">Aucune campagne</p>
          <p className="text-sm text-fourmiliance-ghost mt-1">
            Créez votre première campagne pour organiser vos appels par secteur.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map(camp => (
            <div key={camp.id} className="bg-white rounded-2xl border border-fourmiliance-border p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-semibold text-fourmiliance-forest text-base leading-tight flex-1">
                  {camp.name}
                </h3>
                <StatusBadge status={camp.status} />
              </div>

              {camp.description && (
                <p className="text-sm text-fourmiliance-ghost mb-3 line-clamp-2">{camp.description}</p>
              )}

              <div className="flex flex-wrap gap-2 text-xs text-fourmiliance-ghost mb-4">
                {camp.target_department && (
                  <span className="bg-gray-100 px-2 py-1 rounded">Dept. {camp.target_department}</span>
                )}
                {camp.target_city && (
                  <span className="bg-gray-100 px-2 py-1 rounded">{camp.target_city}</span>
                )}
                {camp.target_naf && (
                  <span className="bg-gray-100 px-2 py-1 rounded">NAF {camp.target_naf}</span>
                )}
                {camp.target_employee_range && (
                  <span className="bg-gray-100 px-2 py-1 rounded">{camp.target_employee_range} sal.</span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm text-fourmiliance-ghost">
                  <Users size={13} aria-hidden="true" />
                  <span className="tabular-nums font-medium text-fourmiliance-ink">{camp.leads_count ?? 0}</span>
                  <span>leads</span>
                </div>
                <div className="flex gap-2">
                  {camp.status === 'brouillon' && (
                    <button
                      onClick={() => updateStatus.mutate({ id: camp.id, status: 'active' })}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition min-h-[36px]"
                    >
                      <Play size={12} aria-hidden="true" />Lancer
                    </button>
                  )}
                  {camp.status === 'active' && (
                    <button
                      onClick={() => updateStatus.mutate({ id: camp.id, status: 'pausee' })}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition min-h-[36px]"
                    >
                      <Pause size={12} aria-hidden="true" />Pause
                    </button>
                  )}
                  {camp.status === 'pausee' && (
                    <button
                      onClick={() => updateStatus.mutate({ id: camp.id, status: 'active' })}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition min-h-[36px]"
                    >
                      <Play size={12} aria-hidden="true" />Reprendre
                    </button>
                  )}
                  <button
                    onClick={() => { setEditing(camp); setShowModal(true) }}
                    className="px-2.5 py-1.5 text-xs font-medium text-fourmiliance-ghost border border-fourmiliance-border rounded-lg hover:bg-gray-50 transition min-h-[36px]"
                  >
                    Modifier
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <CampaignModal
          initial={editing ?? undefined}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['campaigns-full'] })
            qc.invalidateQueries({ queryKey: ['campaigns'] })
            toast(editing ? 'Campagne modifiée' : 'Campagne créée')
          }}
        />
      )}
    </div>
  )
}
