import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Profile, Task } from '../../types'
import { ROLE_LABELS, ROLE_COLORS, TASK_PRIORITY_COLORS, TASK_PRIORITY_LABELS } from '../../lib/constants'
import { getInitials, formatDate } from '../../lib/utils'

// ─── Types locaux ─────────────────────────────────────────────────────────────

interface MemberWithTasks extends Profile {
  activeTasks: Task[]
}

interface TaskWithProject extends Task {
  project: { id: string; name: string } | null
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function TeamPage() {
  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['profiles', 'team'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['admin', 'sous_traitant'])
        .order('full_name')
      if (error) throw error
      return (data ?? []) as Profile[]
    },
  })

  const { data: activeTasks = [] } = useQuery({
    queryKey: ['tasks', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, project:project_id(id, name)')
        .in('status', ['todo', 'in_progress', 'review'])
        .not('assigned_to', 'is', null)
        .order('due_date', { ascending: true, nullsFirst: false })
      if (error) throw error
      return (data ?? []) as TaskWithProject[]
    },
  })

  const membersWithTasks: MemberWithTasks[] = members.map(m => ({
    ...m,
    activeTasks: activeTasks.filter(t => t.assigned_to === m.id),
  }))

  if (loadingMembers) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-fourmiliance-mid border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Grid membres ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map(m => {
          const tasks = activeTasks.filter(t => t.assigned_to === m.id)
          return (
            <div key={m.id} className="bg-white rounded-xl border border-[#E0DAD0] p-5">
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center
                                 text-white text-sm font-semibold flex-shrink-0
                                 ${ROLE_COLORS[m.role] ?? 'bg-fourmiliance-mid'}`}>
                  {getInitials(m.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#1A1A1A] truncate">{m.full_name}</p>
                    {/* Statut en ligne */}
                    <div className={`w-2 h-2 rounded-full flex-shrink-0
                      ${m.status === 'online' ? 'bg-green-400'
                        : m.status === 'away'   ? 'bg-amber-400'
                        : 'bg-[#C0B8B0]'}`}
                      title={m.status === 'online' ? 'En ligne' : m.status === 'away' ? 'Absent' : 'Hors ligne'}
                    />
                  </div>
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1
                    ${ROLE_COLORS[m.role] ?? 'bg-gray-100 text-gray-600'}`}>
                    {ROLE_LABELS[m.role] ?? m.role}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-[#7A7A7A]">
                  {tasks.length} tâche{tasks.length !== 1 ? 's' : ''} active{tasks.length !== 1 ? 's' : ''}
                </span>
                {m.phone && (
                  <a href={`tel:${m.phone}`}
                    className="text-xs text-fourmiliance-mid hover:underline">
                    {m.phone}
                  </a>
                )}
              </div>

              {/* Mini-barre charge */}
              {tasks.length > 0 && (
                <div className="mt-2 h-1 bg-[#E0DAD0] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      tasks.length >= 6 ? 'bg-red-400'
                      : tasks.length >= 3 ? 'bg-amber-400'
                      : 'bg-fourmiliance-mid'
                    }`}
                    style={{ width: `${Math.min((tasks.length / 8) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Table tâches en cours ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#E0DAD0] p-6">
        <h2 className="font-heading text-base text-fourmiliance-forest mb-4">
          Tâches en cours — équipe
        </h2>
        {activeTasks.length === 0 ? (
          <p className="text-sm text-[#9A9A9A]">Aucune tâche active.</p>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="text-left border-b border-[#E0DAD0]">
                  <th className="px-2 pb-2 text-xs font-semibold text-[#7A7A7A] uppercase tracking-wide">Membre</th>
                  <th className="px-2 pb-2 text-xs font-semibold text-[#7A7A7A] uppercase tracking-wide">Tâche</th>
                  <th className="px-2 pb-2 text-xs font-semibold text-[#7A7A7A] uppercase tracking-wide">Projet</th>
                  <th className="px-2 pb-2 text-xs font-semibold text-[#7A7A7A] uppercase tracking-wide">Échéance</th>
                  <th className="px-2 pb-2 text-xs font-semibold text-[#7A7A7A] uppercase tracking-wide">Priorité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EBE4]">
                {activeTasks.map(task => {
                  const member = membersWithTasks.find(m => m.id === task.assigned_to)
                  return (
                    <tr key={task.id} className="hover:bg-[#FAFAF8]">
                      <td className="px-2 py-2.5">
                        {member ? (
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center
                                             text-white text-[10px] font-semibold flex-shrink-0
                                             ${ROLE_COLORS[member.role] ?? 'bg-fourmiliance-mid'}`}>
                              {getInitials(member.full_name)}
                            </div>
                            <span className="text-xs truncate">{member.full_name.split(' ')[0]}</span>
                          </div>
                        ) : <span className="text-xs text-[#9A9A9A]">—</span>}
                      </td>
                      <td className="px-2 py-2.5 text-[#2A2A2A] max-w-[180px] truncate">
                        {task.title}
                      </td>
                      <td className="px-2 py-2.5 text-xs text-[#7A7A7A] truncate max-w-[120px]">
                        {(task as TaskWithProject).project?.name ?? '—'}
                      </td>
                      <td className="px-2 py-2.5 text-xs text-[#7A7A7A] whitespace-nowrap">
                        {task.due_date ? formatDate(task.due_date) : '—'}
                      </td>
                      <td className="px-2 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full
                          ${TASK_PRIORITY_COLORS[task.priority]}`}>
                          {TASK_PRIORITY_LABELS[task.priority]}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
