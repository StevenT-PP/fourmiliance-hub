import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { CheckCircle2, Circle, Play, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth.tsx'
import type { Task } from '../../types'
import type { TaskStatus } from '../../lib/constants'
import {
  TASK_STATUS_LABELS,
  TASK_PRIORITY_COLORS,
  TASK_PRIORITY_LABELS,
} from '../../lib/constants'
import { formatDate } from '../../lib/utils'

type FilterStatus = 'all' | TaskStatus

interface TaskWithProject extends Task {
  project: { id: string; name: string } | null
}

export default function MyTasksPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<FilterStatus>('all')

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['my-tasks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, project:project_id(id, name)')
        .eq('assigned_to', user!.id)
        .order('priority', { ascending: false })
        .order('due_date', { ascending: true, nullsFirst: false })
      if (error) throw error
      return (data ?? []) as TaskWithProject[]
    },
    enabled: !!user,
  })

  const filtered = filter === 'all'
    ? tasks
    : tasks.filter(t => t.status === filter)

  async function updateStatus(taskId: string, newStatus: TaskStatus) {
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
    if (user) {
      await supabase.from('activity_log').insert({
        user_id:      user.id,
        action:       'task_status_changed',
        entity_type:  'task',
        entity_id:    taskId,
        metadata:     { status: newStatus },
      })
    }
    void queryClient.invalidateQueries({ queryKey: ['my-tasks', user?.id] })
    void queryClient.invalidateQueries({ queryKey: ['tasks', 'active'] })
  }

  // Tri : urgent > high > medium > low, puis date limite
  const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 }
  const sorted = [...filtered].sort((a, b) =>
    (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9)
  )

  const filters: { key: FilterStatus; label: string }[] = [
    { key: 'all',         label: `Tout (${tasks.length})` },
    { key: 'todo',        label: 'À faire' },
    { key: 'in_progress', label: 'En cours' },
    { key: 'review',      label: 'En révision' },
    { key: 'done',        label: 'Terminé' },
  ]

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-fourmiliance-mid border-t-transparent rounded-full animate-spin" role="status" aria-label="Chargement des tâches" />
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* ── Filtres ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors
              ${filter === f.key
                ? 'bg-fourmiliance-forest text-white border-fourmiliance-forest'
                : 'border-fourmiliance-border text-fourmiliance-tertiary hover:border-fourmiliance-mid hover:text-fourmiliance-mid'
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Liste des tâches ─────────────────────────────────────────────── */}
      {sorted.length === 0 ? (
        <div className="bg-white rounded-xl border border-fourmiliance-border p-12 text-center">
          <p className="text-sm text-fourmiliance-ghost">
            {filter === 'all'
              ? 'Aucune tâche assignée pour le moment.'
              : `Aucune tâche en statut "${TASK_STATUS_LABELS[filter as TaskStatus]}".`}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-fourmiliance-border divide-y divide-fourmiliance-track">
          {sorted.map(task => {
            const isDone       = task.status === 'done'
            const inProgress   = task.status === 'in_progress'
            const isOverdue    = task.due_date && task.due_date < new Date().toISOString().slice(0, 10) && !isDone

            return (
              <div key={task.id} className="flex items-center gap-3 px-4 py-3 hover:bg-fourmiliance-surface transition-colors">
                {/* Checkbox */}
                <button
                  onClick={() => void updateStatus(task.id, isDone ? 'todo' : 'done')}
                  aria-label={isDone ? `Marquer "${task.title}" comme non terminé` : `Marquer "${task.title}" comme terminé`}
                  aria-pressed={isDone}
                  className="flex-shrink-0 text-fourmiliance-ghost hover:text-fourmiliance-mid transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  {isDone
                    ? <CheckCircle2 className="w-5 h-5 text-fourmiliance-mid" aria-hidden="true" />
                    : <Circle className="w-5 h-5" aria-hidden="true" />
                  }
                </button>

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <span className={`text-sm ${isDone ? 'line-through text-fourmiliance-ghost' : 'text-fourmiliance-ink'}`}>
                    {task.title}
                  </span>
                  {task.project && (
                    <p className="text-xs text-fourmiliance-ghost mt-0.5 flex items-center gap-1">
                      <Link to={`/app/projects/${task.project.id}`}
                        className="hover:text-fourmiliance-mid transition-colors flex items-center gap-0.5">
                        {task.project.name}
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </p>
                  )}
                </div>

                {/* Priorité */}
                {task.priority !== 'medium' && (
                  <span className={`badge flex-shrink-0 ${TASK_PRIORITY_COLORS[task.priority]}`}>
                    {TASK_PRIORITY_LABELS[task.priority]}
                  </span>
                )}

                {/* Échéance */}
                {task.due_date && (
                  <span className={`text-xs flex-shrink-0 flex items-center gap-1
                    ${isOverdue ? 'text-fourmiliance-rust font-semibold' : 'text-fourmiliance-ghost'}`}>
                    {isOverdue && <span aria-label="En retard" role="img">⚠</span>}
                    {formatDate(task.due_date)}
                  </span>
                )}

                {/* Actions rapides */}
                {!isDone && (
                  <div className="flex gap-1 flex-shrink-0">
                    {!inProgress && (
                      <button
                        onClick={() => void updateStatus(task.id, 'in_progress')}
                        aria-label={`Démarrer la tâche "${task.title}"`}
                        className="text-fourmiliance-ghost hover:text-fourmiliance-mid transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                      >
                        <Play className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )}
                    {inProgress && (
                      <button
                        onClick={() => void updateStatus(task.id, 'review')}
                        className="text-xs bg-fourmiliance-warm-bg text-fourmiliance-ocre-dark border border-fourmiliance-ocre/30
                                   px-2 py-0.5 rounded hover:bg-fourmiliance-ocre/20 transition-colors"
                      >
                        En révision
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
