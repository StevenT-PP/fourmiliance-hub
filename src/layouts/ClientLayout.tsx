import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PROJECT_STATUS_LABELS } from '../lib/constants'
import { useAuth } from '../hooks/useAuth.tsx'

interface ProjectMeta {
  id: string
  name: string
  status: string
}

export default function ClientLayout() {
  const { projectId } = useParams<{ projectId: string }>()
  const { signOut, profile } = useAuth()

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status')
        .eq('id', projectId!)
        .single()
      if (error) throw error
      return data as ProjectMeta
    },
    enabled: !!projectId,
  })

  const statusLabel = project
    ? (PROJECT_STATUS_LABELS[project.status as keyof typeof PROJECT_STATUS_LABELS] ?? project.status)
    : null

  return (
    <div className="min-h-screen bg-fourmiliance-cream">
      {/* Header simplifié */}
      <header className="bg-white border-b border-[#E4DDD4] px-4 py-3 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {/* Logo */}
            <div className="w-8 h-8 rounded-lg bg-fourmiliance-mid flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" aria-hidden="true">
                <path d="M12 3C9 3 6.5 5.5 6.5 8.5c0 2 .9 3.8 2.3 5L12 17l3.2-3.5c1.4-1.2 2.3-3 2.3-5C17.5 5.5 15 3 12 3zm0 7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
              </svg>
            </div>
            <span className="font-heading text-fourmiliance-forest font-semibold text-sm flex-shrink-0">
              Fourmiliance
            </span>
            {project && (
              <>
                <span className="text-[#C0B8B0] flex-shrink-0">/</span>
                <span className="text-sm text-[#5A5A5A] font-medium truncate">
                  {project.name}
                </span>
                {statusLabel && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-fourmiliance-forest/10
                                   text-fourmiliance-forest flex-shrink-0 hidden sm:inline">
                    {statusLabel}
                  </span>
                )}
              </>
            )}
          </div>

          {profile && (
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-xs text-[#7A7A7A] hidden sm:inline">{profile.full_name}</span>
              <button
                onClick={signOut}
                className="text-xs text-[#9A9A9A] hover:text-fourmiliance-forest transition-colors"
              >
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Contenu — max-w-3xl centré */}
      <main className="max-w-3xl mx-auto py-8 px-4">
        <Outlet />
      </main>
    </div>
  )
}
