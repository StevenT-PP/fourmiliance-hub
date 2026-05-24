import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import {
  ArrowLeft, Copy, Check, CheckCircle2, Circle, ChevronDown, ChevronRight,
  Plus, Download, Pencil,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Task, Deliverable, Profile } from '../../types'
import type { ProjectStatus, TaskStatus, TaskPriority } from '../../lib/constants'
import {
  SERVICE_LABELS,
  PROJECT_STATUS_LABELS,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
  SERVICE_TYPES,
  PROJECT_STATUSES,
} from '../../lib/constants'
import { formatCurrency, formatDate, getInitials } from '../../lib/utils'

// ─── Types locaux ───────────────────────────────────────────────────────────

interface ProjectFull {
  id: string
  name: string
  type: string | null
  status: ProjectStatus
  progress: number
  start_date: string | null
  end_date: string | null
  budget: number | null
  description: string | null
  contact_id: string | null
  contact: { id: string; company: string; contact_name: string } | null
}

type DeliverableStatus = 'a_venir' | 'en_attente' | 'valide' | 'refuse'

const DELIVERABLE_LABELS: Record<DeliverableStatus, string> = {
  a_venir:    'À venir',
  en_attente: 'En attente',
  valide:     'Validé',
  refuse:     'Refusé',
}

const DELIVERABLE_COLORS: Record<DeliverableStatus, string> = {
  a_venir:    'badge-neutral',
  en_attente: 'badge-warm',
  valide:     'badge-green',
  refuse:     'badge-rust',
}

const TIMELINE_STEPS: { status: ProjectStatus; label: string }[] = [
  { status: 'briefing',      label: 'Briefing' },
  { status: 'maquette',      label: 'Maquette' },
  { status: 'developpement', label: 'Développement' },
  { status: 'validation',    label: 'Validation' },
  { status: 'livre',         label: 'Livraison' },
]

const TASK_GROUPS: { status: TaskStatus; label: string }[] = [
  { status: 'todo',        label: 'À faire' },
  { status: 'in_progress', label: 'En cours' },
  { status: 'review',      label: 'En révision' },
  { status: 'done',        label: 'Terminé' },
]

// ─── Composant principal ────────────────────────────────────────────────────

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [selectedTask, setSelectedTask]   = useState<Task | null>(null)
  const [copiedLink, setCopiedLink]       = useState(false)
  const [editHeader, setEditHeader]       = useState(false)
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())

  // ── Fetch project ──
  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, contact:contact_id(id, company, contact_name)')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as ProjectFull
    },
    enabled: !!id,
  })

  // ── Fetch tasks ──
  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks', 'project', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, assignee:assigned_to(id, full_name, avatar_url)')
        .eq('project_id', id!)
        .order('created_at')
      if (error) throw error
      return (data ?? []) as Task[]
    },
    enabled: !!id,
  })

  // ── Fetch deliverables ──
  const { data: deliverables = [] } = useQuery({
    queryKey: ['deliverables', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deliverables')
        .select('*')
        .eq('project_id', id!)
        .order('created_at')
      if (error) throw error
      return (data ?? []) as Deliverable[]
    },
    enabled: !!id,
  })

  // ── Fetch team ──
  const { data: team = [] } = useQuery({
    queryKey: ['profiles', 'team'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('role', ['admin', 'sous_traitant'])
      if (error) throw error
      return (data ?? []) as Pick<Profile, 'id' | 'full_name' | 'avatar_url'>[]
    },
  })

  const topLevelTasks = allTasks.filter(t => !t.parent_id)
  const subtaskMap = allTasks.reduce<Record<string, Task[]>>((acc, t) => {
    if (t.parent_id) {
      acc[t.parent_id] = [...(acc[t.parent_id] ?? []), t]
    }
    return acc
  }, {})

  const computedProgress = allTasks.length > 0
    ? Math.round((allTasks.filter(t => t.status === 'done').length / allTasks.length) * 100)
    : (project?.progress ?? 0)

  function copyClientLink() {
    navigator.clipboard.writeText(`${window.location.origin}/client/${id}`)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  function toggleExpand(taskId: string) {
    setExpandedTasks(prev => {
      const next = new Set(prev)
      next.has(taskId) ? next.delete(taskId) : next.add(taskId)
      return next
    })
  }

  if (loadingProject) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-fourmiliance-mid border-t-transparent rounded-full animate-spin" role="status" aria-label="Chargement en cours" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-6 text-center text-fourmiliance-ghost">
        Projet introuvable.{' '}
        <button onClick={() => navigate('/app/projects')} className="text-fourmiliance-mid hover:underline">
          Retour
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* ── Main content ── */}
      <div className="flex-1 overflow-auto p-6">
        {/* Back */}
        <button
          onClick={() => navigate('/app/projects')}
          aria-label="Retour à la liste des projets"
          className="flex items-center gap-1.5 text-sm text-fourmiliance-muted hover:text-fourmiliance-forest mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Projets
        </button>

        {/* ── Header ── */}
        <div className="bg-white rounded-xl border border-fourmiliance-border p-6 mb-6">
          {editHeader ? (
            <EditHeaderForm
              project={project}
              onClose={() => setEditHeader(false)}
              onSaved={() => {
                setEditHeader(false)
                queryClient.invalidateQueries({ queryKey: ['project', id] })
                queryClient.invalidateQueries({ queryKey: ['projects'] })
              }}
            />
          ) : (
            <>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h1 className="font-heading text-2xl text-fourmiliance-forest mb-1">{project.name}</h1>
                  <div className="flex flex-wrap gap-2 items-center">
                    {project.type && SERVICE_LABELS[project.type as keyof typeof SERVICE_LABELS] && (
                      <span className={`text-xs px-2 py-0.5 rounded-full
                        ${SERVICE_LABELS[project.type as keyof typeof SERVICE_LABELS].badge}`}>
                        {SERVICE_LABELS[project.type as keyof typeof SERVICE_LABELS].label}
                      </span>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded-full bg-fourmiliance-forest/10 text-fourmiliance-forest">
                      {PROJECT_STATUS_LABELS[project.status]}
                    </span>
                    {project.contact && (
                      <span className="text-xs text-fourmiliance-muted">
                        {project.contact.company}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={copyClientLink}
                    className="flex items-center gap-1.5 text-sm border border-fourmiliance-border px-3 py-1.5
                               rounded-lg hover:bg-fourmiliance-cream transition-colors"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-fourmiliance-mid" /> : <Copy className="w-4 h-4" />}
                    {copiedLink ? 'Copié !' : 'Portail client'}
                  </button>
                  <button
                    onClick={() => setEditHeader(true)}
                    className="flex items-center gap-1.5 text-sm bg-fourmiliance-forest text-white
                               px-3 py-1.5 rounded-lg hover:bg-fourmiliance-mid transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    Modifier
                  </button>
                </div>
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap gap-6 text-sm text-fourmiliance-tertiary mb-4">
                {project.start_date && (
                  <span>Début : <strong>{formatDate(project.start_date)}</strong></span>
                )}
                {project.end_date && (
                  <span>Fin : <strong>{formatDate(project.end_date)}</strong></span>
                )}
                {project.budget != null && (
                  <span>Budget : <strong>{formatCurrency(project.budget)}</strong></span>
                )}
              </div>

              {/* Progress */}
              <div>
                <div className="flex justify-between text-xs text-fourmiliance-ghost mb-1">
                  <span>Progression globale</span>
                  <span className="font-semibold text-fourmiliance-forest">{computedProgress}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={computedProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Progression globale : ${computedProgress}%`}
                  className="h-2 bg-fourmiliance-border rounded-full overflow-hidden"
                >
                  <div
                    className="h-full bg-fourmiliance-mid rounded-full transition-all"
                    style={{ width: `${computedProgress}%` }}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Timeline ── */}
        {project.status !== 'archive' && (
          <div className="bg-white rounded-xl border border-fourmiliance-border p-6 mb-6">
            <h2 className="font-heading text-base text-fourmiliance-forest mb-4">Étapes</h2>
            <div className="flex items-center gap-0">
              {TIMELINE_STEPS.map((step, idx) => {
                const statusOrder = TIMELINE_STEPS.findIndex(s => s.status === project.status)
                const isDone    = idx < statusOrder
                const isCurrent = idx === statusOrder
                const isLast    = idx === TIMELINE_STEPS.length - 1
                return (
                  <div key={step.status} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold mb-1
                        ${isDone    ? 'bg-fourmiliance-mid text-white' : ''}
                        ${isCurrent ? 'bg-fourmiliance-ocre text-white ring-2 ring-fourmiliance-ocre ring-offset-2' : ''}
                        ${!isDone && !isCurrent ? 'bg-fourmiliance-track text-fourmiliance-ghost' : ''}
                      `}>
                        {isDone ? <Check className="w-4 h-4" /> : idx + 1}
                      </div>
                      <span className={`text-xs text-center leading-tight
                        ${isCurrent ? 'text-fourmiliance-ocre font-medium' : 'text-fourmiliance-ghost'}
                      `}>
                        {step.label}
                      </span>
                    </div>
                    {!isLast && (
                      <div className={`h-0.5 flex-shrink-0 w-4 -mt-4
                        ${idx < statusOrder ? 'bg-fourmiliance-mid' : 'bg-fourmiliance-track'}
                      `} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Tâches ── */}
        <div className="bg-white rounded-xl border border-fourmiliance-border p-6 mb-6">
          <h2 className="font-heading text-base text-fourmiliance-forest mb-4">
            Tâches
            {allTasks.length > 0 && (
              <span className="ml-2 text-sm font-normal text-fourmiliance-ghost">
                {allTasks.filter(t => t.status === 'done').length}/{allTasks.length} terminées
              </span>
            )}
          </h2>
          <div className="space-y-6">
            {TASK_GROUPS.map(group => (
              <TaskGroup
                key={group.status}
                groupStatus={group.status}
                label={group.label}
                tasks={topLevelTasks.filter(t => t.status === group.status)}
                subtaskMap={subtaskMap}
                expandedTasks={expandedTasks}
                onToggleExpand={toggleExpand}
                onSelectTask={setSelectedTask}
                projectId={id!}
                onRefresh={() => queryClient.invalidateQueries({ queryKey: ['tasks', 'project', id] })}
              />
            ))}
          </div>
        </div>

        {/* ── Livrables ── */}
        <DeliverableSection
          deliverables={deliverables}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['deliverables', id] })}
        />
      </div>

      {/* ── Side panel tâche ── */}
      {selectedTask && (
        <TaskPanel
          task={selectedTask}
          team={team}
          subtasks={subtaskMap[selectedTask.id] ?? []}
          projectId={id!}
          onClose={() => setSelectedTask(null)}
          onRefresh={() => {
            queryClient.invalidateQueries({ queryKey: ['tasks', 'project', id] })
            setSelectedTask(null)
          }}
        />
      )}
    </div>
  )
}

// ─── EditHeaderForm ──────────────────────────────────────────────────────────

function EditHeaderForm({
  project,
  onClose,
  onSaved,
}: {
  project: ProjectFull
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    name:       project.name,
    type:       project.type ?? '',
    status:     project.status,
    start_date: project.start_date ?? '',
    end_date:   project.end_date   ?? '',
    budget:     project.budget != null ? String(project.budget) : '',
    description: project.description ?? '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('projects').update({
      name:        form.name.trim(),
      type:        form.type || null,
      status:      form.status as ProjectStatus,
      start_date:  form.start_date || null,
      end_date:    form.end_date   || null,
      budget:      form.budget ? parseFloat(form.budget) : null,
      description: form.description || null,
    }).eq('id', project.id)
    setSaving(false)
    onSaved()
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-fourmiliance-tertiary mb-1">Nom *</label>
          <input
            required
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-fourmiliance-tertiary mb-1">Type</label>
          <select
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30"
          >
            <option value="">— Choisir —</option>
            {SERVICE_TYPES.map(t => (
              <option key={t} value={t}>{SERVICE_LABELS[t].label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-fourmiliance-tertiary mb-1">Statut</label>
          <select
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value as ProjectStatus }))}
            className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30"
          >
            {PROJECT_STATUSES.map(s => (
              <option key={s} value={s}>{PROJECT_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-fourmiliance-tertiary mb-1">Date début</label>
          <input type="date" value={form.start_date}
            onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
            className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-fourmiliance-tertiary mb-1">Date fin</label>
          <input type="date" value={form.end_date}
            onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
            className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-fourmiliance-tertiary mb-1">Budget (€ HT)</label>
          <input type="number" min="0" value={form.budget}
            onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
            className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30" />
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onClose}
          className="px-4 py-2 text-sm text-fourmiliance-tertiary hover:text-fourmiliance-forest">
          Annuler
        </button>
        <button type="submit" disabled={saving}
          className="px-4 py-2 bg-fourmiliance-forest text-white text-sm rounded-lg
                     hover:bg-fourmiliance-mid transition-colors disabled:opacity-50">
          {saving ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
      </div>
    </form>
  )
}

// ─── TaskGroup ───────────────────────────────────────────────────────────────

function TaskGroup({
  groupStatus,
  label,
  tasks,
  subtaskMap,
  expandedTasks,
  onToggleExpand,
  onSelectTask,
  projectId,
  onRefresh,
}: {
  groupStatus: TaskStatus
  label: string
  tasks: Task[]
  subtaskMap: Record<string, Task[]>
  expandedTasks: Set<string>
  onToggleExpand: (id: string) => void
  onSelectTask: (t: Task) => void
  projectId: string
  onRefresh: () => void
}) {
  const [quickTitle, setQuickTitle] = useState('')
  const [adding, setAdding]         = useState(false)

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!quickTitle.trim()) return
    setAdding(true)
    await supabase.from('tasks').insert({
      project_id: projectId,
      title:      quickTitle.trim(),
      status:     groupStatus,
      priority:   'medium',
    })
    setAdding(false)
    setQuickTitle('')
    onRefresh()
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-fourmiliance-muted uppercase tracking-wide">{label}</span>
        <span className="text-xs text-fourmiliance-ghost">({tasks.length})</span>
      </div>
      <div className="space-y-1 mb-2">
        {tasks.map(task => (
          <TaskRow
            key={task.id}
            task={task}
            subtasks={subtaskMap[task.id] ?? []}
            expanded={expandedTasks.has(task.id)}
            onToggleExpand={() => onToggleExpand(task.id)}
            onSelect={() => onSelectTask(task)}
            onToggleDone={() => {
              const newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done'
              supabase.from('tasks').update({ status: newStatus }).eq('id', task.id)
                .then(() => onRefresh())
            }}
          />
        ))}
        {tasks.length === 0 && (
          <p className="text-xs text-fourmiliance-disabled py-1 pl-1">Aucune tâche</p>
        )}
      </div>
      {/* Inline quick-add */}
      <form onSubmit={addTask} className="flex items-center gap-2">
        <Plus className="w-3.5 h-3.5 text-fourmiliance-ghost shrink-0" />
        <input
          value={quickTitle}
          onChange={e => setQuickTitle(e.target.value)}
          placeholder="Ajouter une tâche…"
          className="flex-1 text-xs text-fourmiliance-tertiary bg-transparent border-b border-transparent
                     hover:border-fourmiliance-border focus:border-fourmiliance-mid focus:outline-none py-0.5"
          disabled={adding}
        />
        {quickTitle.trim() && (
          <button type="submit" disabled={adding}
            className="text-xs text-fourmiliance-mid hover:underline shrink-0">
            Ajouter
          </button>
        )}
      </form>
    </div>
  )
}

// ─── TaskRow ─────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  subtasks,
  expanded,
  onToggleExpand,
  onSelect,
  onToggleDone,
}: {
  task: Task
  subtasks: Task[]
  expanded: boolean
  onToggleExpand: () => void
  onSelect: () => void
  onToggleDone: () => void
}) {
  const isDone = task.status === 'done'
  const hasSubtasks = subtasks.length > 0

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-fourmiliance-surface group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fourmiliance-mid"
        onClick={onSelect}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onSelect()}
        aria-label={`Ouvrir les détails de la tâche : ${task.title}`}
      >
        <button
          onClick={e => { e.stopPropagation(); onToggleDone() }}
          aria-label={isDone ? `Marquer "${task.title}" comme non terminé` : `Marquer "${task.title}" comme terminé`}
          aria-pressed={isDone}
          className="shrink-0 text-fourmiliance-ghost hover:text-fourmiliance-mid transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
        >
          {isDone
            ? <CheckCircle2 className="w-4 h-4 text-fourmiliance-mid" aria-hidden="true" />
            : <Circle className="w-4 h-4" aria-hidden="true" />
          }
        </button>
        {hasSubtasks && (
          <button
            onClick={e => { e.stopPropagation(); onToggleExpand() }}
            aria-label={expanded ? 'Réduire les sous-tâches' : 'Afficher les sous-tâches'}
            aria-expanded={expanded}
            className="shrink-0 text-fourmiliance-ghost hover:text-fourmiliance-tertiary min-w-[28px] min-h-[28px] flex items-center justify-center"
          >
            {expanded
              ? <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              : <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            }
          </button>
        )}
        <span className={`flex-1 text-sm ${isDone ? 'line-through text-fourmiliance-ghost' : 'text-fourmiliance-body'}`}>
          {task.title}
        </span>
        {task.priority && task.priority !== 'medium' && (
          <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${TASK_PRIORITY_COLORS[task.priority]}`}>
            {TASK_PRIORITY_LABELS[task.priority]}
          </span>
        )}
        {task.assignee && (
          <div className="w-5 h-5 rounded-full bg-fourmiliance-mid text-white text-[9px]
                          font-semibold flex items-center justify-center shrink-0">
            {getInitials(task.assignee.full_name)}
          </div>
        )}
        {task.due_date && (
          <span className="text-xs text-fourmiliance-ghost shrink-0">
            {new Date(task.due_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
          </span>
        )}
      </div>
      {/* Subtasks */}
      {expanded && hasSubtasks && (
        <div className="ml-8 space-y-0.5">
          {subtasks.map(sub => (
            <div key={sub.id}
              className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-fourmiliance-surface cursor-pointer text-xs text-fourmiliance-tertiary"
              onClick={onSelect}
            >
              <Circle className="w-3 h-3 shrink-0 text-fourmiliance-disabled" />
              <span className={sub.status === 'done' ? 'line-through text-fourmiliance-ghost' : ''}>{sub.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── DeliverableSection ──────────────────────────────────────────────────────

function DeliverableSection({
  deliverables,
  onRefresh,
}: {
  deliverables: Deliverable[]
  onRefresh: () => void
}) {
  async function validate(id: string) {
    await supabase.from('deliverables').update({ status: 'valide' }).eq('id', id)
    onRefresh()
  }

  return (
    <div className="bg-white rounded-xl border border-fourmiliance-border p-6">
      <h2 className="font-heading text-base text-fourmiliance-forest mb-4">Livrables</h2>
      {deliverables.length === 0 ? (
        <p className="text-sm text-fourmiliance-ghost">Aucun livrable pour ce projet.</p>
      ) : (
        <div className="space-y-2">
          {deliverables.map(d => {
            const status = d.status as DeliverableStatus
            return (
              <div key={d.id}
                className="flex items-center gap-3 p-3 border border-fourmiliance-border rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fourmiliance-body truncate">{d.name}</p>
                  {d.type && <p className="text-xs text-fourmiliance-ghost">{d.type}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${DELIVERABLE_COLORS[status]}`}>
                  {DELIVERABLE_LABELS[status]}
                </span>
                {d.file_url && (
                  <a
                    href={d.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Télécharger ${d.name}`}
                    className="text-fourmiliance-mid hover:text-fourmiliance-forest transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                    onClick={e => e.stopPropagation()}
                  >
                    <Download className="w-4 h-4" aria-hidden="true" />
                  </a>
                )}
                {status === 'en_attente' && (
                  <button
                    onClick={() => validate(d.id)}
                    className="text-xs badge-green border border-fourmiliance-success-bg
                               px-2 py-1 rounded hover:bg-fourmiliance-success-bg/80 transition-colors shrink-0"
                  >
                    Valider
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── TaskPanel (side panel) ──────────────────────────────────────────────────

function TaskPanel({
  task,
  team,
  subtasks,
  projectId,
  onClose,
  onRefresh,
}: {
  task: Task
  team: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>[]
  subtasks: Task[]
  projectId: string
  onClose: () => void
  onRefresh: () => void
}) {
  const [title, setTitle]           = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [status, setStatus]         = useState<TaskStatus>(task.status)
  const [priority, setPriority]     = useState<TaskPriority>(task.priority)
  const [assignedTo, setAssignedTo] = useState(task.assigned_to ?? '')
  const [dueDate, setDueDate]       = useState(task.due_date ?? '')
  const [saving, setSaving]         = useState(false)
  const [newSubtitle, setNewSubtitle] = useState('')
  const [addingSub, setAddingSub]   = useState(false)

  const updateMutation = useMutation({
    mutationFn: async () => {
      setSaving(true)
      const { error } = await supabase.from('tasks').update({
        title:       title.trim(),
        description: description.trim() || null,
        status,
        priority,
        assigned_to: assignedTo || null,
        due_date:    dueDate || null,
      }).eq('id', task.id)
      if (error) throw error
    },
    onSettled: () => { setSaving(false); onRefresh() },
  })

  async function addSubtask(e: React.FormEvent) {
    e.preventDefault()
    if (!newSubtitle.trim()) return
    setAddingSub(true)
    await supabase.from('tasks').insert({
      project_id: projectId,
      parent_id:  task.id,
      title:      newSubtitle.trim(),
      status:     'todo',
      priority:   'medium',
    })
    setAddingSub(false)
    setNewSubtitle('')
    onRefresh()
  }

  return (
    <div className="w-80 border-l border-fourmiliance-border bg-white flex flex-col shrink-0 overflow-auto">
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-fourmiliance-border">
        <span className="text-sm font-medium text-fourmiliance-forest">Détail tâche</span>
        <button
          onClick={onClose}
          aria-label="Fermer le panel"
          className="text-fourmiliance-ghost hover:text-fourmiliance-tertiary text-xl leading-none min-w-[44px] min-h-[44px] flex items-center justify-center"
        >×</button>
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-fourmiliance-tertiary mb-1">Titre</label>
          <textarea
            value={title}
            onChange={e => setTitle(e.target.value)}
            rows={2}
            className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm resize-none
                       focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30"
          />
        </div>

        {/* Status + Priority */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-fourmiliance-tertiary mb-1">Statut</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as TaskStatus)}
              className="w-full border border-fourmiliance-border rounded-lg px-2 py-1.5 text-xs
                         focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30"
            >
              {Object.entries(TASK_STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-fourmiliance-tertiary mb-1">Priorité</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value as TaskPriority)}
              className="w-full border border-fourmiliance-border rounded-lg px-2 py-1.5 text-xs
                         focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30"
            >
              {Object.entries(TASK_PRIORITY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Assigné */}
        <div>
          <label className="block text-xs font-medium text-fourmiliance-tertiary mb-1">Assigné à</label>
          <select
            value={assignedTo}
            onChange={e => setAssignedTo(e.target.value)}
            className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30"
          >
            <option value="">— Non assigné —</option>
            {team.map(m => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
        </div>

        {/* Date limite */}
        <div>
          <label className="block text-xs font-medium text-fourmiliance-tertiary mb-1">Date limite</label>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-fourmiliance-tertiary mb-1">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Détails, contexte…"
            className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm resize-none
                       focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30"
          />
        </div>

        {/* Sous-tâches */}
        <div>
          <label className="block text-xs font-medium text-fourmiliance-tertiary mb-2">
            Sous-tâches ({subtasks.length})
          </label>
          <div className="space-y-1 mb-2">
            {subtasks.map(sub => (
              <div key={sub.id}
                className="flex items-center gap-2 text-xs text-fourmiliance-tertiary">
                {sub.status === 'done'
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-fourmiliance-mid shrink-0" />
                  : <Circle className="w-3.5 h-3.5 text-fourmiliance-disabled shrink-0" />
                }
                <span className={sub.status === 'done' ? 'line-through text-fourmiliance-ghost' : ''}>
                  {sub.title}
                </span>
              </div>
            ))}
          </div>
          <form onSubmit={addSubtask} className="flex items-center gap-2">
            <Plus className="w-3.5 h-3.5 text-fourmiliance-ghost shrink-0" />
            <input
              value={newSubtitle}
              onChange={e => setNewSubtitle(e.target.value)}
              placeholder="Ajouter une sous-tâche…"
              disabled={addingSub}
              className="flex-1 text-xs border-b border-fourmiliance-border focus:border-fourmiliance-mid
                         focus:outline-none py-0.5 bg-transparent"
            />
          </form>
        </div>
      </div>

      {/* Save button */}
      <div className="px-5 py-4 border-t border-fourmiliance-border">
        <button
          onClick={() => updateMutation.mutate()}
          disabled={saving}
          className="w-full bg-fourmiliance-forest text-white text-sm py-2 rounded-lg
                     hover:bg-fourmiliance-mid transition-colors disabled:opacity-50"
        >
          {saving ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  )
}
