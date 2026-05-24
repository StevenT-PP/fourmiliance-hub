import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, LayoutGrid, List, Search, Users } from 'lucide-react'
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
        <div className="flex items-center gap-2 bg-white border border-fourmiliance-border rounded-lg px-3 py-2 flex-1 min-w-[200px] min-h-[44px]">
          <Search size={14} className="text-fourmiliance-ghost flex-shrink-0" aria-hidden="true" />
          <input
            type="search"
            placeholder="Rechercher un prospect, une entreprise…"
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            aria-label="Rechercher un contact"
            className="border-none outline-none text-sm text-fourmiliance-ink bg-transparent w-full placeholder:text-fourmiliance-ghost"
          />
        </div>

        {/* Filtre service */}
        <select
          value={filters.service}
          onChange={e => setFilters(f => ({ ...f, service: e.target.value as ServiceType | '' }))}
          aria-label="Filtrer par service"
          className="bg-white border border-fourmiliance-border rounded-lg px-3 py-2 text-sm text-fourmiliance-tertiary cursor-pointer outline-none min-h-[44px]"
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
          aria-label="Filtrer par membre"
          className="bg-white border border-fourmiliance-border rounded-lg px-3 py-2 text-sm text-fourmiliance-tertiary cursor-pointer outline-none min-h-[44px]"
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
            className="bg-white border border-fourmiliance-border rounded-lg px-3 py-2 text-sm text-fourmiliance-tertiary cursor-pointer outline-none min-h-[44px]"
          >
            <option value="">Toutes les étapes</option>
            {PIPELINE_STAGES.map(s => (
              <option key={s} value={s}>{PIPELINE_LABELS[s]}</option>
            ))}
          </select>
        )}

        {/* Toggle Kanban / Liste */}
        <div className="flex items-center gap-1 bg-white border border-fourmiliance-border rounded-lg p-1" role="group" aria-label="Mode d'affichage">
          <button
            onClick={() => switchView('kanban')}
            aria-label="Vue Kanban"
            aria-pressed={view === 'kanban'}
            className={`p-2 rounded transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${
              view === 'kanban'
                ? 'bg-fourmiliance-cream-dark text-fourmiliance-ink'
                : 'text-fourmiliance-ghost hover:text-fourmiliance-tertiary'
            }`}
          >
            <LayoutGrid size={15} aria-hidden="true" />
          </button>
          <button
            onClick={() => switchView('liste')}
            aria-label="Vue liste"
            aria-pressed={view === 'liste'}
            className={`p-2 rounded transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${
              view === 'liste'
                ? 'bg-fourmiliance-cream-dark text-fourmiliance-ink'
                : 'text-fourmiliance-ghost hover:text-fourmiliance-tertiary'
            }`}
          >
            <List size={15} aria-hidden="true" />
          </button>
        </div>

        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-fourmiliance-mid text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-fourmiliance-forest transition-colors min-h-[44px]"
        >
          <Plus size={14} />
          Nouveau contact
        </button>
      </div>

      {/* Chargement */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="spinner" role="status" aria-label="Chargement des contacts" />
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
    <div className="bg-white rounded-xl border border-fourmiliance-border shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-fourmiliance-cream">
              {['Entreprise', 'Contact', 'Service', 'Étape', 'Assigné à', 'Valeur', ''].map(h => (
                <th
                  key={h}
                  className="text-left text-[11px] font-semibold text-fourmiliance-ghost uppercase tracking-[.6px] px-3.5 py-2.5 border-b-2 border-fourmiliance-border"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="w-8 h-8 text-fourmiliance-disabled" aria-hidden="true" />
                    <p className="text-sm text-fourmiliance-ghost">Aucun contact trouvé</p>
                  </div>
                </td>
              </tr>
            )}
            {contacts.map(c => (
              <tr key={c.id} className="hover:bg-fourmiliance-cream transition-colors">
                <td className="px-3.5 py-3 border-b border-fourmiliance-border text-sm font-medium text-fourmiliance-ink">
                  {c.company}
                </td>
                <td className="px-3.5 py-3 border-b border-fourmiliance-border">
                  <div className="text-sm text-fourmiliance-ink">{c.contact_name}</div>
                  {c.email && (
                    <div className="text-[11px] text-fourmiliance-ghost">{c.email}</div>
                  )}
                </td>
                <td className="px-3.5 py-3 border-b border-fourmiliance-border">
                  {c.service_type && (
                    <span className={`badge ${SERVICE_LABELS[c.service_type].badge}`}>
                      {SERVICE_LABELS[c.service_type].label}
                    </span>
                  )}
                </td>
                <td className="px-3.5 py-3 border-b border-fourmiliance-border">
                  <span className={`badge ${PIPELINE_COLORS[c.pipeline_stage]}`}>
                    {PIPELINE_LABELS[c.pipeline_stage]}
                  </span>
                </td>
                <td className="px-3.5 py-3 border-b border-fourmiliance-border text-sm text-fourmiliance-tertiary">
                  {c.assignee?.full_name ?? '—'}
                </td>
                <td className="px-3.5 py-3 border-b border-fourmiliance-border text-sm text-fourmiliance-tertiary">
                  {c.estimated_value != null ? formatCurrency(c.estimated_value) : '—'}
                </td>
                <td className="px-3.5 py-3 border-b border-fourmiliance-border">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => navigate(`/app/crm/${c.id}`)}
                      aria-label={`Voir la fiche de ${c.company}`}
                      className="text-xs text-fourmiliance-mid hover:text-fourmiliance-forest border border-fourmiliance-mid/30 rounded px-2 py-1 hover:bg-fourmiliance-cream-dark transition-colors min-h-[36px]"
                    >
                      Voir
                    </button>
                    <button
                      onClick={() => onEditContact(c)}
                      aria-label={`Modifier ${c.company}`}
                      className="text-xs text-fourmiliance-tertiary hover:text-fourmiliance-ink border border-fourmiliance-border rounded px-2 py-1 hover:bg-fourmiliance-cream-dark transition-colors min-h-[36px]"
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
        <div className="px-4 py-2.5 border-t border-fourmiliance-border text-xs text-fourmiliance-ghost">
          {contacts.length} contact{contacts.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
