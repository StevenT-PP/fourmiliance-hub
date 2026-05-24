import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Pencil, FolderPlus, Phone, Mail, MapPin, User,
  CalendarClock, Tag, PhoneCall, MessageSquare, AtSign, CalendarDays,
  CheckSquare, Square, Plus, Briefcase,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { Contact, ContactNote, ContactTask, Project } from '../../types'
import {
  PIPELINE_LABELS,
  PIPELINE_COLORS,
  SERVICE_LABELS,
  PROJECT_STATUS_LABELS,
} from '../../lib/constants'
import { formatCurrency, formatDate, formatDateTime, getInitials } from '../../lib/utils'
import ContactForm from './ContactForm'

type NoteType = 'note' | 'appel' | 'email' | 'rdv'

const NOTE_TYPE_META: Record<NoteType, { label: string; icon: typeof Phone; color: string }> = {
  note:  { label: 'Note',    icon: MessageSquare, color: 'text-fourmiliance-tertiary' },
  appel: { label: 'Appel',   icon: PhoneCall,     color: 'text-fourmiliance-ocre' },
  email: { label: 'Email',   icon: AtSign,         color: 'text-fourmiliance-mid' },
  rdv:   { label: 'RDV',     icon: CalendarDays,   color: 'text-fourmiliance-forest' },
}

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const [showEditForm,  setShowEditForm]  = useState(false)
  const [noteContent,   setNoteContent]   = useState('')
  const [noteType,      setNoteType]      = useState<NoteType>('note')
  const [newTaskTitle,  setNewTaskTitle]  = useState('')
  const [newTaskDue,    setNewTaskDue]    = useState('')

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: contact, isLoading: loadingContact } = useQuery({
    queryKey: ['contact', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*, assignee:assigned_to(id, full_name, avatar_url)')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as Contact
    },
    enabled: !!id,
  })

  const { data: notes = [] } = useQuery({
    queryKey: ['contact-notes', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_notes')
        .select('*, author:author_id(id, full_name)')
        .eq('contact_id', id!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as ContactNote[]
    },
    enabled: !!id,
  })

  const { data: tasks = [] } = useQuery({
    queryKey: ['contact-tasks', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_tasks')
        .select('*')
        .eq('contact_id', id!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as ContactTask[]
    },
    enabled: !!id,
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['contact-projects', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, tasks:tasks(status)')
        .eq('contact_id', id!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as (Project & { tasks: { status: string }[] })[]
    },
    enabled: !!id,
  })

  // ── Mutations ─────────────────────────────────────────────────────────────

  const addNote = useMutation({
    mutationFn: async () => {
      if (!contact || !user || !noteContent.trim()) return
      const { error } = await supabase.from('contact_notes').insert({
        contact_id: contact.id,
        author_id:  user.id,
        content:    noteContent.trim(),
        note_type:  noteType,
      })
      if (error) throw error
      await supabase.from('activity_log').insert({
        user_id:      user.id,
        action:       'note_added',
        entity_type:  'contact',
        entity_id:    contact.id,
        entity_label: contact.company,
      })
    },
    onSuccess: () => {
      setNoteContent('')
      void queryClient.invalidateQueries({ queryKey: ['contact-notes', id] })
    },
  })

  const toggleTask = useMutation({
    mutationFn: async ({ taskId, done }: { taskId: string; done: boolean }) => {
      const { error } = await supabase
        .from('contact_tasks')
        .update({ done })
        .eq('id', taskId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contact-tasks', id] }),
  })

  const addTask = useMutation({
    mutationFn: async () => {
      if (!newTaskTitle.trim() || !id) return
      const { error } = await supabase.from('contact_tasks').insert({
        contact_id: id,
        title:      newTaskTitle.trim(),
        due_date:   newTaskDue || null,
        done:       false,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setNewTaskTitle('')
      setNewTaskDue('')
      void queryClient.invalidateQueries({ queryKey: ['contact-tasks', id] })
    },
  })

  // ── Loading / error ───────────────────────────────────────────────────────

  if (loadingContact) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-fourmiliance-mid border-t-transparent rounded-full animate-spin" role="status" aria-label="Chargement en cours" />
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="text-center py-20 text-fourmiliance-ghost">Contact introuvable.</div>
    )
  }

  const pendingTasks = tasks.filter(t => !t.done)
  const doneTasks    = tasks.filter(t => t.done)

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Retour"
          className="mt-1 p-1.5 rounded-lg hover:bg-fourmiliance-cream-dark text-fourmiliance-ghost hover:text-fourmiliance-ink transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <ArrowLeft size={16} aria-hidden="true" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-heading text-2xl text-fourmiliance-forest truncate">
              {contact.company}
            </h1>
            <span className={`badge ${PIPELINE_COLORS[contact.pipeline_stage]}`}>
              {PIPELINE_LABELS[contact.pipeline_stage]}
            </span>
            {contact.service_type && (
              <span className={`badge ${SERVICE_LABELS[contact.service_type].badge}`}>
                {SERVICE_LABELS[contact.service_type].label}
              </span>
            )}
          </div>
          <p className="text-sm text-fourmiliance-tertiary mt-0.5">{contact.contact_name}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setShowEditForm(true)}
            className="flex items-center gap-1.5 border border-fourmiliance-border bg-white text-fourmiliance-tertiary px-3 py-2 rounded-lg text-sm hover:bg-fourmiliance-cream-dark transition-colors"
          >
            <Pencil size={13} />
            Modifier
          </button>
          <button
            className="flex items-center gap-1.5 bg-fourmiliance-mid text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-fourmiliance-forest transition-colors"
          >
            <FolderPlus size={13} />
            Créer projet
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Colonne gauche — infos + valeur + tâches ────────────────── */}
        <div className="space-y-4">

          {/* Informations */}
          <div className="bg-white rounded-xl border border-fourmiliance-border shadow-card p-4 space-y-3">
            <h2 className="text-xs font-semibold text-fourmiliance-ghost uppercase tracking-wider">Informations</h2>
            <InfoRow icon={User}       label={contact.contact_name} />
            {contact.email && (
              <InfoRow icon={Mail}     label={contact.email} href={`mailto:${contact.email}`} />
            )}
            {contact.phone && (
              <InfoRow icon={Phone}    label={contact.phone} href={`tel:${contact.phone}`} />
            )}
            {(contact.address || contact.city) && (
              <InfoRow
                icon={MapPin}
                label={[contact.address, contact.city, contact.postal_code].filter(Boolean).join(', ')}
              />
            )}
            {contact.source && (
              <InfoRow icon={Tag}      label={contact.source} />
            )}
            {contact.assignee && (
              <InfoRow icon={User}     label={contact.assignee.full_name ?? '—'} />
            )}
            <InfoRow icon={CalendarClock} label={`Créé le ${formatDate(contact.created_at)}`} />
          </div>

          {/* Valeur estimée */}
          {contact.estimated_value != null && (
            <div className="bg-white rounded-xl border border-fourmiliance-border shadow-card p-4">
              <h2 className="text-xs font-semibold text-fourmiliance-ghost uppercase tracking-wider mb-2">Valeur estimée</h2>
              <p className="text-2xl font-bold text-fourmiliance-forest">
                {formatCurrency(contact.estimated_value)}
              </p>
              <p className="text-xs text-fourmiliance-ghost mt-0.5">Pipeline : {PIPELINE_LABELS[contact.pipeline_stage]}</p>
            </div>
          )}

          {/* Tâches */}
          <div className="bg-white rounded-xl border border-fourmiliance-border shadow-card p-4">
            <h2 className="text-xs font-semibold text-fourmiliance-ghost uppercase tracking-wider mb-3">
              Tâches ({pendingTasks.length} en attente)
            </h2>
            <div className="space-y-1.5 mb-3">
              {tasks.length === 0 && (
                <p className="text-xs text-fourmiliance-ghost">Aucune tâche</p>
              )}
              {[...pendingTasks, ...doneTasks].map(task => (
                <div key={task.id} className="flex items-start gap-2">
                  <button
                    onClick={() => toggleTask.mutate({ taskId: task.id, done: !task.done })}
                    aria-label={task.done ? `Marquer "${task.title}" comme non terminé` : `Marquer "${task.title}" comme terminé`}
                    aria-pressed={task.done}
                    className="mt-0.5 flex-shrink-0 text-fourmiliance-ghost hover:text-fourmiliance-mid transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                  >
                    {task.done
                      ? <CheckSquare size={14} className="text-fourmiliance-mid" aria-hidden="true" />
                      : <Square size={14} aria-hidden="true" />
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${task.done ? 'line-through text-fourmiliance-ghost' : 'text-fourmiliance-ink'}`}>
                      {task.title}
                    </p>
                    {task.due_date && (
                      <p className="text-[10px] text-fourmiliance-ghost">{formatDate(task.due_date)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* Ajout rapide */}
            <div className="border-t border-fourmiliance-border pt-3 space-y-2">
              <label htmlFor="new-task-title" className="sr-only">Titre de la nouvelle tâche</label>
              <input
                id="new-task-title"
                type="text"
                placeholder="Nouvelle tâche…"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTask.mutate()}
                className="w-full text-xs border border-fourmiliance-border rounded px-2 py-1.5 outline-none focus:border-fourmiliance-mid"
              />
              <label htmlFor="new-task-due" className="sr-only">Date d'échéance</label>
              <input
                id="new-task-due"
                type="date"
                value={newTaskDue}
                onChange={e => setNewTaskDue(e.target.value)}
                className="w-full text-xs border border-fourmiliance-border rounded px-2 py-1.5 outline-none focus:border-fourmiliance-mid text-fourmiliance-tertiary"
              />
              <button
                onClick={() => addTask.mutate()}
                disabled={!newTaskTitle.trim() || addTask.isPending}
                className="w-full flex items-center justify-center gap-1.5 bg-fourmiliance-cream text-fourmiliance-tertiary border border-fourmiliance-border rounded px-2 py-1.5 text-xs hover:bg-fourmiliance-cream-dark disabled:opacity-40 transition-colors"
              >
                <Plus size={11} />
                Ajouter
              </button>
            </div>
          </div>

          {/* Projets liés */}
          {projects.length > 0 && (
            <div className="bg-white rounded-xl border border-fourmiliance-border shadow-card p-4">
              <h2 className="text-xs font-semibold text-fourmiliance-ghost uppercase tracking-wider mb-3">
                Projets liés
              </h2>
              <div className="space-y-2.5">
                {projects.map(project => {
                  const projectTasks = project.tasks ?? []
                  const progress = projectTasks.length > 0
                    ? Math.round((projectTasks.filter(t => t.status === 'done').length / projectTasks.length) * 100)
                    : project.progress
                  return (
                    <div
                      key={project.id}
                      role="button"
                      tabIndex={0}
                      className="border border-fourmiliance-border rounded-lg p-3 cursor-pointer hover:bg-fourmiliance-cream transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fourmiliance-mid"
                      onClick={() => navigate(`/app/projects/${project.id}`)}
                      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && navigate(`/app/projects/${project.id}`)}
                      aria-label={`Ouvrir le projet ${project.name}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Briefcase size={12} className="text-fourmiliance-ghost flex-shrink-0" />
                          <p className="text-xs font-medium text-fourmiliance-ink leading-tight">{project.name}</p>
                        </div>
                        <span className="text-[10px] text-fourmiliance-ghost flex-shrink-0">
                          {PROJECT_STATUS_LABELS[project.status]}
                        </span>
                      </div>
                      <div
                        role="progressbar"
                        aria-valuenow={progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Progression : ${progress}%`}
                        className="h-1.5 bg-fourmiliance-border rounded-full overflow-hidden"
                      >
                        <div
                          className="h-full bg-fourmiliance-mid rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-fourmiliance-ghost mt-1">{progress}% terminé</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Colonne droite — notes ───────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Ajouter une note */}
          <div className="bg-white rounded-xl border border-fourmiliance-border shadow-card p-4">
            <h2 className="text-xs font-semibold text-fourmiliance-ghost uppercase tracking-wider mb-3">
              Ajouter une interaction
            </h2>
            <div className="flex gap-2 mb-3">
              {(Object.entries(NOTE_TYPE_META) as [NoteType, typeof NOTE_TYPE_META[NoteType]][]).map(([key, meta]) => {
                const Icon = meta.icon
                return (
                  <button
                    key={key}
                    onClick={() => setNoteType(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                      noteType === key
                        ? 'bg-fourmiliance-mid text-white border-fourmiliance-mid'
                        : 'bg-white text-fourmiliance-tertiary border-fourmiliance-border hover:bg-fourmiliance-cream-dark'
                    }`}
                  >
                    <Icon size={12} />
                    {meta.label}
                  </button>
                )
              })}
            </div>
            <textarea
              placeholder={`Contenu de la ${NOTE_TYPE_META[noteType].label.toLowerCase()}…`}
              value={noteContent}
              onChange={e => setNoteContent(e.target.value)}
              rows={3}
              className="w-full text-sm border border-fourmiliance-border rounded-lg px-3 py-2 outline-none focus:border-fourmiliance-mid resize-none placeholder:text-fourmiliance-ghost"
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={() => addNote.mutate()}
                disabled={!noteContent.trim() || addNote.isPending}
                className="flex items-center gap-1.5 bg-fourmiliance-mid text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-fourmiliance-forest disabled:opacity-40 transition-colors"
              >
                <Plus size={13} />
                Enregistrer
              </button>
            </div>
          </div>

          {/* Historique */}
          <div className="bg-white rounded-xl border border-fourmiliance-border shadow-card p-4">
            <h2 className="text-xs font-semibold text-fourmiliance-ghost uppercase tracking-wider mb-3">
              Historique ({notes.length})
            </h2>
            {notes.length === 0 && (
              <p className="text-sm text-fourmiliance-ghost text-center py-6">
                Aucune interaction enregistrée
              </p>
            )}
            <div className="space-y-3">
              {notes.map(note => {
                const meta = NOTE_TYPE_META[note.note_type]
                const Icon = meta.icon
                return (
                  <div
                    key={note.id}
                    className="flex gap-3 p-3 rounded-lg bg-fourmiliance-cream border border-fourmiliance-border"
                  >
                    <div className={`flex-shrink-0 mt-0.5 ${meta.color}`}>
                      <Icon size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${meta.color}`}>
                          {meta.label}
                        </span>
                        {note.author && (
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-4 rounded-full bg-fourmiliance-mid text-white text-[8px] font-bold flex items-center justify-center">
                              {getInitials(note.author.full_name ?? '?')}
                            </div>
                            <span className="text-[10px] text-fourmiliance-ghost">{note.author.full_name}</span>
                          </div>
                        )}
                        <span className="text-[10px] text-fourmiliance-ghost ml-auto">
                          {formatDateTime(note.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-fourmiliance-ink whitespace-pre-wrap">{note.content}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal édition */}
      {showEditForm && (
        <ContactForm
          contact={contact}
          onClose={() => setShowEditForm(false)}
          onSuccess={() => {
            setShowEditForm(false)
            void queryClient.invalidateQueries({ queryKey: ['contact', id] })
            void queryClient.invalidateQueries({ queryKey: ['contacts'] })
          }}
        />
      )}
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  href,
}: {
  icon: React.ElementType
  label: string
  href?: string
}) {
  const content = (
    <div className="flex items-center gap-2">
      <Icon size={13} className="text-fourmiliance-ghost flex-shrink-0" />
      <span className="text-sm text-fourmiliance-ink truncate">{label}</span>
    </div>
  )
  if (href) {
    return (
      <a href={href} className="block hover:text-fourmiliance-mid transition-colors">
        {content}
      </a>
    )
  }
  return content
}
