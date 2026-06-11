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
      <header className="bg-white border-b border-fourmiliance-border px-4 py-3 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {/* Logo */}
            <svg viewBox="0 0 32 22" className="w-8 h-6 flex-shrink-0" aria-hidden="true">
              <circle cx="2.5" cy="17.5" r="1.8" fill="#2D5A1B" opacity="0.33"/>
              <circle cx="8"   cy="12"   r="2.3" fill="#2D5A1B" opacity="0.52"/>
              <circle cx="14.5" cy="8"   r="2.8" fill="#2D5A1B" opacity="0.72"/>
              <circle cx="22"  cy="6"    r="2.8" fill="#2D5A1B" opacity="0.9"/>
              <circle cx="29.5" cy="9"   r="2.2" fill="#2D5A1B" opacity="0.58"/>
            </svg>
            <span className="font-brand italic text-fourmiliance-forest font-normal text-[1rem] leading-none flex-shrink-0">
              fourmiliance
            </span>
            {project && (
              <>
                <span className="text-fourmiliance-disabled flex-shrink-0">/</span>
                <span className="text-sm text-fourmiliance-tertiary font-medium truncate">
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
              <span className="text-xs text-fourmiliance-muted hidden sm:inline">{profile.full_name}</span>
              <button
                onClick={signOut}
                className="text-xs text-fourmiliance-ghost hover:text-fourmiliance-forest transition-colors"
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
