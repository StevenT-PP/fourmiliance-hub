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
  note:  { label: 'Note',    icon: MessageSquare, color: 'text-[#5A5A5A]' },
  appel: { label: 'Appel',   icon: PhoneCall,     color: 'text-orange-500' },
  email: { label: 'Email',   icon: AtSign,         color: 'text-blue-500' },
  rdv:   { label: 'RDV',     icon: CalendarDays,   color: 'text-purple-500' },
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
        <div className="w-8 h-8 border-2 border-fourmiliance-mid border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="text-center py-20 text-[#9A9A9A]">Contact introuvable.</div>
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
          className="mt-1 p-1.5 rounded-lg hover:bg-fourmiliance-cream-dark text-[#9A9A9A] hover:text-[#1A1A1A] transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-heading text-2xl text-fourmiliance-forest truncate">
              {contact.company}
            </h1>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PIPELINE_COLORS[contact.pipeline_stage]}`}>
              {PIPELINE_LABELS[contact.pipeline_stage]}
            </span>
            {contact.service_type && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${SERVICE_LABELS[contact.service_type].badge}`}>
                {SERVICE_LABELS[contact.service_type].label}
              </span>
            )}
          </div>
          <p className="text-sm text-[#5A5A5A] mt-0.5">{contact.contact_name}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setShowEditForm(true)}
            className="flex items-center gap-1.5 border border-[#E4DDD4] bg-white text-[#5A5A5A] px-3 py-2 rounded-lg text-sm hover:bg-fourmiliance-cream-dark transition-colors"
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
          <div className="bg-white rounded-xl border border-[#E4DDD4] shadow-card p-4 space-y-3">
            <h2 className="text-xs font-semibold text-[#9A9A9A] uppercase tracking-wider">Informations</h2>
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
            <div className="bg-white rounded-xl border border-[#E4DDD4] shadow-card p-4">
              <h2 className="text-xs font-semibold text-[#9A9A9A] uppercase tracking-wider mb-2">Valeur estimée</h2>
              <p className="text-2xl font-bold text-fourmiliance-forest">
                {formatCurrency(contact.estimated_value)}
              </p>
              <p className="text-xs text-[#9A9A9A] mt-0.5">Pipeline : {PIPELINE_LABELS[contact.pipeline_stage]}</p>
            </div>
          )}

          {/* Tâches */}
          <div className="bg-white rounded-xl border border-[#E4DDD4] shadow-card p-4">
            <h2 className="text-xs font-semibold text-[#9A9A9A] uppercase tracking-wider mb-3">
              Tâches ({pendingTasks.length} en attente)
            </h2>
            <div className="space-y-1.5 mb-3">
              {tasks.length === 0 && (
                <p className="text-xs text-[#9A9A9A]">Aucune tâche</p>
              )}
              {[...pendingTasks, ...doneTasks].map(task => (
                <div key={task.id} className="flex items-start gap-2">
                  <button
                    onClick={() => toggleTask.mutate({ taskId: task.id, done: !task.done })}
                    className="mt-0.5 flex-shrink-0 text-[#9A9A9A] hover:text-fourmiliance-mid transition-colors"
                  >
                    {task.done
                      ? <CheckSquare size={14} className="text-green-500" />
                      : <Square size={14} />
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${task.done ? 'line-through text-[#9A9A9A]' : 'text-[#1A1A1A]'}`}>
                      {task.title}
                    </p>
                    {task.due_date && (
                      <p className="text-[10px] text-[#9A9A9A]">{formatDate(task.due_date)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* Ajout rapide */}
            <div className="border-t border-[#E4DDD4] pt-3 space-y-2">
              <input
                type="text"
                placeholder="Nouvelle tâche…"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTask.mutate()}
                className="w-full text-xs border border-[#E4DDD4] rounded px-2 py-1.5 outline-none focus:border-fourmiliance-mid"
              />
              <input
                type="date"
                value={newTaskDue}
                onChange={e => setNewTaskDue(e.target.value)}
                className="w-full text-xs border border-[#E4DDD4] rounded px-2 py-1.5 outline-none focus:border-fourmiliance-mid text-[#5A5A5A]"
              />
              <button
                onClick={() => addTask.mutate()}
                disabled={!newTaskTitle.trim() || addTask.isPending}
                className="w-full flex items-center justify-center gap-1.5 bg-fourmiliance-cream text-[#5A5A5A] border border-[#E4DDD4] rounded px-2 py-1.5 text-xs hover:bg-fourmiliance-cream-dark disabled:opacity-40 transition-colors"
              >
                <Plus size={11} />
                Ajouter
              </button>
            </div>
          </div>

          {/* Projets liés */}
          {projects.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E4DDD4] shadow-card p-4">
              <h2 className="text-xs font-semibold text-[#9A9A9A] uppercase tracking-wider mb-3">
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
                      className="border border-[#E4DDD4] rounded-lg p-3 cursor-pointer hover:bg-fourmiliance-cream transition-colors"
                      onClick={() => navigate(`/app/projects/${project.id}`)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Briefcase size={12} className="text-[#9A9A9A] flex-shrink-0" />
                          <p className="text-xs font-medium text-[#1A1A1A] leading-tight">{project.name}</p>
                        </div>
                        <span className="text-[10px] text-[#9A9A9A] flex-shrink-0">
                          {PROJECT_STATUS_LABELS[project.status]}
                        </span>
                      </div>
                      <div className="h-1.5 bg-[#E4DDD4] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-fourmiliance-mid rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-[#9A9A9A] mt-1">{progress}% terminé</p>
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
          <div className="bg-white rounded-xl border border-[#E4DDD4] shadow-card p-4">
            <h2 className="text-xs font-semibold text-[#9A9A9A] uppercase tracking-wider mb-3">
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
                        : 'bg-white text-[#5A5A5A] border-[#E4DDD4] hover:bg-fourmiliance-cream-dark'
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
              className="w-full text-sm border border-[#E4DDD4] rounded-lg px-3 py-2 outline-none focus:border-fourmiliance-mid resize-none placeholder:text-[#9A9A9A]"
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
          <div className="bg-white rounded-xl border border-[#E4DDD4] shadow-card p-4">
            <h2 className="text-xs font-semibold text-[#9A9A9A] uppercase tracking-wider mb-3">
              Historique ({notes.length})
            </h2>
            {notes.length === 0 && (
              <p className="text-sm text-[#9A9A9A] text-center py-6">
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
                    className="flex gap-3 p-3 rounded-lg bg-fourmiliance-cream border border-[#E4DDD4]"
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
                            <span className="text-[10px] text-[#9A9A9A]">{note.author.full_name}</span>
                          </div>
                        )}
                        <span className="text-[10px] text-[#9A9A9A] ml-auto">
                          {formatDateTime(note.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-[#1A1A1A] whitespace-pre-wrap">{note.content}</p>
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
      <Icon size={13} className="text-[#9A9A9A] flex-shrink-0" />
      <span className="text-sm text-[#1A1A1A] truncate">{label}</span>
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
