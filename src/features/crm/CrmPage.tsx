import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, LayoutGrid, List, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Contact, Profile } from '../../types'
import type { PipelineStage, ServiceType } from '../../lib/constants'
import {
  PIPELINE_LABELS,
  PIPELINE_STAGES,
  PIPELINE_COLORS,
  SERVICE_LABELS,
} from '../../lib/constants'
import { formatCurrency } from '../../lib/utils'
import KanbanBoard from './KanbanBoard'
import ContactForm from './ContactForm'

type ViewMode = 'kanban' | 'liste'

interface Filters {
  search:   string
  service:  ServiceType | ''
  assigned: string
  stage:    PipelineStage | ''
}

export default function CrmPage() {
  const [view, setView]               = useState<ViewMode>('kanban')
  const [showForm, setShowForm]       = useState(false)
  const [editContact, setEditContact] = useState<Contact | undefined>()
  const [filters, setFilters]         = useState<Filters>({
    search: '', service: '', assigned: '', stage: '',
  })
  const queryClient = useQueryClient()

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts', filters],
    queryFn: async () => {
      let q = supabase
        .from('contacts')
        .select('*, assignee:assigned_to(id, full_name, avatar_url)')
        .order('updated_at', { ascending: false })

      if (filters.search.trim()) {
        const s = filters.search.trim()
        q = q.or(`company.ilike.%${s}%,contact_name.ilike.%${s}%`)
      }
      if (filters.service)  q = q.eq('service_type',   filters.service)
      if (filters.assigned) q = q.eq('assigned_to',    filters.assigned)
      if (filters.stage)    q = q.eq('pipeline_stage', filters.stage)

      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as Contact[]
    },
  })

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['profiles', 'team'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('role', ['admin', 'sous_traitant'])
        .order('full_name')
      if (error) throw error
      return (data ?? []) as Pick<Profile, 'id' | 'full_name' | 'avatar_url'>[]
    },
  })

  function switchView(v: ViewMode) {
    setView(v)
    if (v === 'kanban') setFilters(f => ({ ...f, stage: '' }))
  }

  function openCreate() {
    setEditContact(undefined)
    setShowForm(true)
  }

  function openEdit(contact: Contact) {
    setEditContact(contact)
    setShowForm(true)
  }

  function handleFormSuccess() {
    void queryClient.invalidateQueries({ queryKey: ['contacts'] })
    setShowForm(false)
    setEditContact(undefined)
  }

  return (
    <div>
      {/* Barre de recherche + filtres */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {/* Recherche */}
        <div className="flex items-center gap-2 bg-white border border-[#E4DDD4] rounded-lg px-3 py-2 flex-1 min-w-[200px]">
          <Search size={14} className="text-[#9A9A9A] flex-shrink-0" />
          <input
            type="text"
            placeholder="Rechercher un prospect, une entreprise…"
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            className="border-none outline-none text-sm text-[#1A1A1A] bg-transparent w-full placeholder:text-[#9A9A9A]"
          />
        </div>

        {/* Filtre service */}
        <select
          value={filters.service}
          onChange={e => setFilters(f => ({ ...f, service: e.target.value as ServiceType | '' }))}
          className="bg-white border border-[#E4DDD4] rounded-lg px-3 py-2 text-sm text-[#5A5A5A] cursor-pointer outline-none"
        >
          <option value="">Tous les services</option>
          {Object.entries(SERVICE_LABELS).map(([k, { label }]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>

        {/* Filtre membre */}
        <select
          value={filters.assigned}
          onChange={e => setFilters(f => ({ ...f, assigned: e.target.value }))}
          className="bg-white border border-[#E4DDD4] rounded-lg px-3 py-2 text-sm text-[#5A5A5A] cursor-pointer outline-none"
        >
          <option value="">Tous les membres</option>
          {teamMembers.map(m => (
            <option key={m.id} value={m.id}>{m.full_name}</option>
          ))}
        </select>

        {/* Filtre étape — liste uniquement */}
        {view === 'liste' && (
          <select
            value={filters.stage}
            onChange={e => setFilters(f => ({ ...f, stage: e.target.value as PipelineStage | '' }))}
            className="bg-white border border-[#E4DDD4] rounded-lg px-3 py-2 text-sm text-[#5A5A5A] cursor-pointer outline-none"
          >
            <option value="">Toutes les étapes</option>
            {PIPELINE_STAGES.map(s => (
              <option key={s} value={s}>{PIPELINE_LABELS[s]}</option>
            ))}
          </select>
        )}

        {/* Toggle Kanban / Liste */}
        <div className="flex items-center gap-1 bg-white border border-[#E4DDD4] rounded-lg p-1">
          <button
            onClick={() => switchView('kanban')}
            title="Vue Kanban"
            className={`p-1.5 rounded transition-colors ${
              view === 'kanban'
                ? 'bg-fourmiliance-cream-dark text-[#1A1A1A]'
                : 'text-[#9A9A9A] hover:text-[#5A5A5A]'
            }`}
          >
            <LayoutGrid size={15} />
          </button>
          <button
            onClick={() => switchView('liste')}
            title="Vue liste"
            className={`p-1.5 rounded transition-colors ${
              view === 'liste'
                ? 'bg-fourmiliance-cream-dark text-[#1A1A1A]'
                : 'text-[#9A9A9A] hover:text-[#5A5A5A]'
            }`}
          >
            <List size={15} />
          </button>
        </div>

        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-fourmiliance-mid text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-fourmiliance-forest transition-colors"
        >
          <Plus size={14} />
          Nouveau contact
        </button>
      </div>

      {/* Chargement */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-fourmiliance-mid border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Vue Kanban */}
      {!isLoading && view === 'kanban' && (
        <KanbanBoard contacts={contacts} />
      )}

      {/* Vue liste */}
      {!isLoading && view === 'liste' && (
        <ListeContacts
          contacts={contacts}
          onEditContact={openEdit}
          formatCurrency={formatCurrency}
        />
      )}

      {/* Modal formulaire */}
      {showForm && (
        <ContactForm
          contact={editContact}
          onClose={() => { setShowForm(false); setEditContact(undefined) }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  )
}

function ListeContacts({
  contacts,
  onEditContact,
  formatCurrency,
}: {
  contacts: Contact[]
  onEditContact: (c: Contact) => void
  formatCurrency: (n: number) => string
}) {
  const navigate = useNavigate()
  return (
    <div className="bg-white rounded-xl border border-[#E4DDD4] shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-fourmiliance-cream">
              {['Entreprise', 'Contact', 'Service', 'Étape', 'Assigné à', 'Valeur', ''].map(h => (
                <th
                  key={h}
                  className="text-left text-[11px] font-semibold text-[#9A9A9A] uppercase tracking-[.6px] px-3.5 py-2.5 border-b-2 border-[#E4DDD4]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-sm text-[#9A9A9A]">
                  Aucun contact trouvé
                </td>
              </tr>
            )}
            {contacts.map(c => (
              <tr key={c.id} className="hover:bg-fourmiliance-cream transition-colors">
                <td className="px-3.5 py-3 border-b border-[#E4DDD4] text-sm font-medium text-[#1A1A1A]">
                  {c.company}
                </td>
                <td className="px-3.5 py-3 border-b border-[#E4DDD4]">
                  <div className="text-sm text-[#1A1A1A]">{c.contact_name}</div>
                  {c.email && (
                    <div className="text-[11px] text-[#9A9A9A]">{c.email}</div>
                  )}
                </td>
                <td className="px-3.5 py-3 border-b border-[#E4DDD4]">
                  {c.service_type && (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${SERVICE_LABELS[c.service_type].badge}`}
                    >
                      {SERVICE_LABELS[c.service_type].label}
                    </span>
                  )}
                </td>
                <td className="px-3.5 py-3 border-b border-[#E4DDD4]">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${PIPELINE_COLORS[c.pipeline_stage]}`}
                  >
                    {PIPELINE_LABELS[c.pipeline_stage]}
                  </span>
                </td>
                <td className="px-3.5 py-3 border-b border-[#E4DDD4] text-sm text-[#5A5A5A]">
                  {c.assignee?.full_name ?? '—'}
                </td>
                <td className="px-3.5 py-3 border-b border-[#E4DDD4] text-sm text-[#5A5A5A]">
                  {c.estimated_value != null ? formatCurrency(c.estimated_value) : '—'}
                </td>
                <td className="px-3.5 py-3 border-b border-[#E4DDD4]">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => navigate(`/app/crm/${c.id}`)}
                      className="text-xs text-fourmiliance-mid hover:text-fourmiliance-forest border border-fourmiliance-mid/30 rounded px-2 py-1 hover:bg-fourmiliance-cream-dark transition-colors"
                    >
                      Voir
                    </button>
                    <button
                      onClick={() => onEditContact(c)}
                      className="text-xs text-[#5A5A5A] hover:text-[#1A1A1A] border border-[#E4DDD4] rounded px-2 py-1 hover:bg-fourmiliance-cream-dark transition-colors"
                    >
                      Modifier
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {contacts.length > 0 && (
        <div className="px-4 py-2.5 border-t border-[#E4DDD4] text-xs text-[#9A9A9A]">
          {contacts.length} contact{contacts.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
