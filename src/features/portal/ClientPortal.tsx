import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Download, MessageSquare } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth.tsx'
import type { Deliverable } from '../../types'
import type { ProjectStatus } from '../../lib/constants'
import { formatDate, formatCurrency } from '../../lib/utils'
import FileUpload from './FileUpload'
import Messaging from './Messaging'

// ─── Types locaux ────────────────────────────────────────────────────────────

interface ProjectPortal {
  id: string
  name: string
  type: string | null
  status: ProjectStatus
  progress: number
  start_date: string | null
  end_date: string | null
  budget: number | null
  description: string | null
}

type DeliverableStatus = 'a_venir' | 'en_attente' | 'valide' | 'refuse'

const DELIVERABLE_LABELS: Record<DeliverableStatus, string> = {
  a_venir:    'À venir',
  en_attente: 'En attente',
  valide:     'Validé',
  refuse:     'Refusé',
}

const DELIVERABLE_COLORS: Record<DeliverableStatus, string> = {
  a_venir:    'bg-gray-100 text-gray-600',
  en_attente: 'bg-amber-100 text-amber-700',
  valide:     'bg-green-100 text-green-700',
  refuse:     'bg-red-100 text-red-700',
}

const TIMELINE_STEPS: { status: ProjectStatus; label: string }[] = [
  { status: 'briefing',      label: 'Briefing' },
  { status: 'maquette',      label: 'Maquette' },
  { status: 'developpement', label: 'Développement' },
  { status: 'validation',    label: 'Validation' },
  { status: 'livre',         label: 'Livraison' },
]

// ─── Composant principal ─────────────────────────────────────────────────────

export default function ClientPortal() {
  const { projectId } = useParams<{ projectId: string }>()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Fetch projet — queryKey partagé avec ClientLayout (TanStack déduplique)
  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, type, status, progress, start_date, end_date, budget, description')
        .eq('id', projectId!)
        .single()
      if (error) throw error
      return data as ProjectPortal
    },
    enabled: !!projectId,
  })

  // Fetch tâches (pour progression calculée)
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', 'project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, status')
        .eq('project_id', projectId!)
      if (error) throw error
      return (data ?? []) as { id: string; status: string }[]
    },
    enabled: !!projectId,
  })

  // Fetch livrables
  const { data: deliverables = [] } = useQuery({
    queryKey: ['deliverables', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deliverables')
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at')
      if (error) throw error
      return (data ?? []) as Deliverable[]
    },
    enabled: !!projectId,
  })

  const computedProgress = tasks.length > 0
    ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100)
    : (project?.progress ?? 0)

  async function validateDeliverable(deliverableId: string) {
    await supabase
      .from('deliverables')
      .update({ status: 'valide' })
      .eq('id', deliverableId)
    void queryClient.invalidateQueries({ queryKey: ['deliverables', projectId] })
  }

  async function requestModification(deliverableId: string, deliverableName: string) {
    if (!user || !projectId) return
    await supabase.from('messages').insert({
      project_id: projectId,
      sender_id: user.id,
      content: `Demande de modification pour le livrable : "${deliverableName}"`,
    })
    await supabase
      .from('deliverables')
      .update({ status: 'refuse' })
      .eq('id', deliverableId)
    void queryClient.invalidateQueries({ queryKey: ['deliverables', projectId] })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-fourmiliance-mid border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-20 text-[#9A9A9A]">Projet introuvable.</div>
    )
  }

  const statusOrder = TIMELINE_STEPS.findIndex(s => s.status === project.status)

  return (
    <div className="space-y-6">

      {/* ── Hero header ──────────────────────────────────────────────────── */}
      <div
        className="rounded-xl overflow-hidden text-white"
        style={{ background: 'linear-gradient(135deg, #1E4010 0%, #2D5A1B 100%)' }}
      >
        <div className="p-8">
          <p className="text-white/60 text-sm mb-1">Votre projet</p>
          <h1 className="font-heading text-3xl font-semibold mb-2">{project.name}</h1>
          {project.description && (
            <p className="text-white/70 text-sm mb-6 max-w-lg leading-relaxed">{project.description}</p>
          )}

          {/* Méta */}
          <div className="flex flex-wrap gap-6 text-sm text-white/70 mb-6">
            {project.start_date && (
              <span>
                Début : <strong className="text-white">{formatDate(project.start_date)}</strong>
              </span>
            )}
            {project.end_date && (
              <span>
                Fin prévue : <strong className="text-white">{formatDate(project.end_date)}</strong>
              </span>
            )}
            {project.budget != null && (
              <span>
                Budget : <strong className="text-white">{formatCurrency(project.budget)}</strong>
              </span>
            )}
          </div>

          {/* Barre de progression */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-white/60">Avancement global</span>
              <span className="font-semibold text-white">{computedProgress} %</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${computedProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Timeline (lecture seule) ─────────────────────────────────────── */}
      {project.status !== 'archive' && (
        <div className="bg-white rounded-xl border border-[#E0DAD0] p-6">
          <h2 className="font-heading text-base text-fourmiliance-forest mb-5">
            Étapes du projet
          </h2>
          <div className="flex items-start">
            {TIMELINE_STEPS.map((step, idx) => {
              const isDone    = idx < statusOrder
              const isCurrent = idx === statusOrder
              const isLast    = idx === TIMELINE_STEPS.length - 1
              return (
                <div key={step.status} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center
                                     text-xs font-semibold mb-2 flex-shrink-0
                      ${isDone    ? 'bg-fourmiliance-mid text-white' : ''}
                      ${isCurrent ? 'bg-fourmiliance-ocre text-white ring-2 ring-fourmiliance-ocre ring-offset-2' : ''}
                      ${!isDone && !isCurrent ? 'bg-[#E0DAD0] text-[#9A9A9A]' : ''}
                    `}>
                      {isDone ? <Check className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span className={`text-xs text-center leading-tight px-1
                      ${isCurrent ? 'text-fourmiliance-ocre font-semibold' : ''}
                      ${isDone    ? 'text-fourmiliance-mid font-medium' : ''}
                      ${!isDone && !isCurrent ? 'text-[#9A9A9A]' : ''}
                    `}>
                      {step.label}
                    </span>
                  </div>
                  {!isLast && (
                    <div className={`h-0.5 flex-shrink-0 w-4 -mt-5
                      ${idx < statusOrder ? 'bg-fourmiliance-mid' : 'bg-[#E0DAD0]'}
                    `} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Livrables ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#E0DAD0] p-6">
        <h2 className="font-heading text-base text-fourmiliance-forest mb-4">
          Livrables
          {deliverables.length > 0 && (
            <span className="ml-2 text-sm font-normal text-[#9A9A9A]">
              {deliverables.filter(d => d.status === 'valide').length}/{deliverables.length} validés
            </span>
          )}
        </h2>

        {deliverables.length === 0 ? (
          <p className="text-sm text-[#9A9A9A]">
            Aucun livrable disponible pour le moment.
          </p>
        ) : (
          <div className="space-y-3">
            {deliverables.map(d => {
              const status = d.status as DeliverableStatus
              return (
                <div
                  key={d.id}
                  className="flex flex-wrap items-center gap-3 p-4 border border-[#E0DAD0] rounded-xl"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#2A2A2A] truncate">{d.name}</p>
                    {d.type && (
                      <p className="text-xs text-[#9A9A9A] mt-0.5">{d.type}</p>
                    )}
                  </div>

                  <span className={`text-xs px-2.5 py-0.5 rounded-full flex-shrink-0 ${DELIVERABLE_COLORS[status]}`}>
                    {DELIVERABLE_LABELS[status]}
                  </span>

                  {d.file_url && (
                    <a
                      href={d.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-fourmiliance-mid
                                 hover:text-fourmiliance-forest transition-colors flex-shrink-0
                                 border border-[#E0DAD0] px-2.5 py-1.5 rounded-lg"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Télécharger
                    </a>
                  )}

                  {status === 'en_attente' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => validateDeliverable(d.id)}
                        className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700
                                   border border-green-200 px-2.5 py-1.5 rounded-lg
                                   hover:bg-green-100 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Valider
                      </button>
                      <button
                        onClick={() => requestModification(d.id, d.name)}
                        className="flex items-center gap-1.5 text-xs bg-amber-50 text-amber-700
                                   border border-amber-200 px-2.5 py-1.5 rounded-lg
                                   hover:bg-amber-100 transition-colors"
                      >
                        Demander modif.
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Upload fichiers — tâche 4.2 ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#E0DAD0] p-6">
        <h2 className="font-heading text-base text-fourmiliance-forest mb-4">Fichiers</h2>
        <FileUpload projectId={projectId!} />
      </div>

      {/* ── Messagerie temps réel — tâche 4.3 ──────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#E0DAD0] p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-fourmiliance-forest" />
          <h2 className="font-heading text-base text-fourmiliance-forest">Messages</h2>
        </div>
        <Messaging projectId={projectId!} />
      </div>

    </div>
  )
}
