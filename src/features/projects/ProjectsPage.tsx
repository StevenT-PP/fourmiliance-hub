import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Calendar, Euro } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Contact } from '../../types'
import type { ServiceType, ProjectStatus } from '../../lib/constants'
import { SERVICE_LABELS, PROJECT_STATUS_LABELS, SERVICE_TYPES } from '../../lib/constants'
import { formatCurrency } from '../../lib/utils'

type StatusFilter = 'all' | 'en_cours' | 'livre' | 'archive'

const EN_COURS_STATUSES: ProjectStatus[] = ['briefing', 'maquette', 'developpement', 'validation']

const STATUS_COLORS: Record<ProjectStatus, string> = {
  briefing:      'bg-gray-100 text-gray-700',
  maquette:      'bg-blue-100 text-blue-700',
  developpement: 'bg-amber-100 text-amber-700',
  validation:    'bg-purple-100 text-purple-700',
  livre:         'bg-green-100 text-green-700',
  archive:       'bg-gray-100 text-gray-500',
}

interface ProjectRow {
  id: string
  name: string
  type: ServiceType | null
  status: ProjectStatus
  progress: number
  computed_progress: number
  start_date: string | null
  end_date: string | null
  budget: number | null
  contact: { id: string; company: string; contact_name: string } | null
  tasks: { id: string; status: string }[]
}

interface NewProjectForm {
  name: string
  contact_id: string
  type: ServiceType | ''
  start_date: string
  end_date: string
  budget: string
}

const emptyForm: NewProjectForm = {
  name: '', contact_id: '', type: '', start_date: '', end_date: '', budget: '',
}

export default function ProjectsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter]     = useState<ServiceType | ''>('')
  const [search, setSearch]             = useState('')
  const [showModal, setShowModal]       = useState(false)
  const [form, setForm]                 = useState<NewProjectForm>(emptyForm)
  const [saving, setSaving]             = useState(false)
  const [saveError, setSaveError]       = useState<string | null>(null)

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, contact:contact_id(id, company, contact_name), tasks(id, status)')
        .order('updated_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map((p: any): ProjectRow => ({
        ...p,
        computed_progress: p.tasks?.length > 0
          ? Math.round((p.tasks.filter((t: any) => t.status === 'done').length / p.tasks.length) * 100)
          : (p.progress ?? 0),
      }))
    },
  })

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts', 'list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, company, contact_name')
        .order('company')
      if (error) throw error
      return (data ?? []) as Pick<Contact, 'id' | 'company' | 'contact_name'>[]
    },
  })

  const filtered = projects.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilter && p.type !== typeFilter) return false
    if (statusFilter === 'en_cours' && !EN_COURS_STATUSES.includes(p.status)) return false
    if (statusFilter === 'livre'    && p.status !== 'livre')   return false
    if (statusFilter === 'archive'  && p.status !== 'archive') return false
    return true
  })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    const { error } = await supabase.from('projects').insert({
      name:        form.name.trim(),
      contact_id:  form.contact_id  || null,
      type:        form.type        || null,
      status:      'briefing',
      progress:    0,
      start_date:  form.start_date  || null,
      end_date:    form.end_date    || null,
      budget:      form.budget ? parseFloat(form.budget) : null,
    })
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    queryClient.invalidateQueries({ queryKey: ['projects'] })
    setShowModal(false)
    setForm(emptyForm)
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl text-fourmiliance-forest">Projets</h1>
          <p className="text-sm text-[#5A5A5A] mt-0.5">
            {filtered.length} projet{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setShowModal(true); setSaveError(null) }}
          className="flex items-center gap-2 bg-fourmiliance-forest text-white px-4 py-2
                     rounded-lg text-sm font-medium hover:bg-fourmiliance-mid transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouveau projet
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A9A9A]" />
          <input
            type="text"
            placeholder="Rechercher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 border border-[#E0DAD0] rounded-lg text-sm bg-white
                       focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30 w-52"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as StatusFilter)}
          className="border border-[#E0DAD0] rounded-lg text-sm bg-white px-3 py-2
                     focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30"
        >
          <option value="all">Tous les statuts</option>
          <option value="en_cours">En cours</option>
          <option value="livre">Livré</option>
          <option value="archive">Archivé</option>
        </select>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as ServiceType | '')}
          className="border border-[#E0DAD0] rounded-lg text-sm bg-white px-3 py-2
                     focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30"
        >
          <option value="">Tous les types</option>
          {SERVICE_TYPES.map(t => (
            <option key={t} value={t}>{SERVICE_LABELS[t].label}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-fourmiliance-mid border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#9A9A9A] text-sm">
          Aucun projet — créez-en un avec le bouton ci-dessus.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              statusColors={STATUS_COLORS}
              onClick={() => navigate(`/app/projects/${p.id}`)}
            />
          ))}
        </div>
      )}

      {/* Modal création */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0DAD0]">
              <h2 className="font-heading text-lg text-fourmiliance-forest">Nouveau projet</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#9A9A9A] hover:text-[#5A5A5A] text-2xl leading-none"
              >×</button>
            </div>
            <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#5A5A5A] mb-1">Nom du projet *</label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Site vitrine Dupont SARL"
                  className="w-full border border-[#E0DAD0] rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5A5A5A] mb-1">Client (CRM)</label>
                <select
                  value={form.contact_id}
                  onChange={e => setForm(f => ({ ...f, contact_id: e.target.value }))}
                  className="w-full border border-[#E0DAD0] rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30"
                >
                  <option value="">— Aucun —</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.company} · {c.contact_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5A5A5A] mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as ServiceType | '' }))}
                  className="w-full border border-[#E0DAD0] rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30"
                >
                  <option value="">— Choisir —</option>
                  {SERVICE_TYPES.map(t => (
                    <option key={t} value={t}>{SERVICE_LABELS[t].label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#5A5A5A] mb-1">Date début</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                    className="w-full border border-[#E0DAD0] rounded-lg px-3 py-2 text-sm
                               focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5A5A5A] mb-1">Date fin</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                    className="w-full border border-[#E0DAD0] rounded-lg px-3 py-2 text-sm
                               focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5A5A5A] mb-1">Budget (€ HT)</label>
                <input
                  type="number"
                  min="0"
                  value={form.budget}
                  onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                  placeholder="0"
                  className="w-full border border-[#E0DAD0] rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30"
                />
              </div>
              {saveError && (
                <p className="text-xs text-red-600">{saveError}</p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-[#5A5A5A] hover:text-fourmiliance-forest"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-fourmiliance-forest text-white text-sm rounded-lg
                             hover:bg-fourmiliance-mid transition-colors disabled:opacity-50"
                >
                  {saving ? 'Création…' : 'Créer le projet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function ProjectCard({
  project,
  statusColors,
  onClick,
}: {
  project: ProjectRow
  statusColors: Record<ProjectStatus, string>
  onClick: () => void
}) {
  const progress = project.computed_progress

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-[#E0DAD0] p-5 hover:shadow-md
                 transition-shadow cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-medium text-fourmiliance-forest text-sm leading-snug flex-1
                       group-hover:text-fourmiliance-mid transition-colors">
          {project.name}
        </h3>
        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${statusColors[project.status]}`}>
          {PROJECT_STATUS_LABELS[project.status]}
        </span>
      </div>

      {project.type && SERVICE_LABELS[project.type] && (
        <span className={`inline-block text-xs px-2 py-0.5 rounded-full mb-3 ${SERVICE_LABELS[project.type].badge}`}>
          {SERVICE_LABELS[project.type].label}
        </span>
      )}

      {project.contact && (
        <p className="text-xs text-[#7A7A7A] mb-3">
          {project.contact.company}
          {project.contact.contact_name && ` · ${project.contact.contact_name}`}
        </p>
      )}

      <div className="mb-3">
        <div className="flex justify-between text-xs text-[#9A9A9A] mb-1">
          <span>Progression</span>
          <span className="font-medium text-fourmiliance-forest">{progress}%</span>
        </div>
        <div className="h-1.5 bg-[#E0DAD0] rounded-full overflow-hidden">
          <div
            className="h-full bg-fourmiliance-mid rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-[#9A9A9A]">
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {project.end_date
            ? new Date(project.end_date).toLocaleDateString('fr-FR', {
                day: '2-digit', month: 'short', year: '2-digit',
              })
            : '—'
          }
        </div>
        {project.budget != null && (
          <div className="flex items-center gap-1">
            <Euro className="w-3.5 h-3.5" />
            {formatCurrency(project.budget)}
          </div>
        )}
      </div>
    </div>
  )
}
