import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Copy, Check, Users } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '../../lib/constants'
import type { ProjectStatus } from '../../lib/constants'

interface PortalProject {
  id: string
  name: string
  status: ProjectStatus
  progress: number
  client_id: string
  client: { id: string; full_name: string } | null
  contact: { id: string; company: string; contact_name: string } | null
}

export default function PortalHubPage() {
  const [copied, setCopied] = useState<string | null>(null)

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['portal-hub'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status, progress, client_id, client:client_id(id, full_name), contact:contact_id(id, company, contact_name)')
        .not('client_id', 'is', null)
        .order('updated_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as PortalProject[]
    },
  })

  function copyLink(projectId: string) {
    navigator.clipboard.writeText(`${window.location.origin}/client/${projectId}`)
    setCopied(projectId)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl text-fourmiliance-forest">Portails clients</h1>
        <p className="text-sm text-fourmiliance-tertiary mt-0.5">
          {isLoading ? '…' : `${projects.length} portail${projects.length !== 1 ? 's' : ''} actif${projects.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-fourmiliance-mid border-t-transparent rounded-full animate-spin" role="status" aria-label="Chargement" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-10 h-10 text-fourmiliance-disabled mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm text-fourmiliance-ghost mb-2">Aucun portail client actif</p>
          <p className="text-xs text-fourmiliance-ghost max-w-xs mx-auto">
            Pour activer un portail, ouvrez un projet et liez-lui un compte client (client_id).
          </p>
          <Link to="/app/projects"
            className="inline-flex items-center gap-1 text-xs text-fourmiliance-mid hover:underline font-medium mt-4">
            Voir les projets
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map(p => (
            <div key={p.id}
              className="bg-white rounded-xl border border-fourmiliance-border p-5 hover:shadow-md transition-shadow">

              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-fourmiliance-forest text-sm leading-snug truncate">
                    {p.name}
                  </h3>
                  {p.contact && (
                    <p className="text-xs text-fourmiliance-muted mt-0.5 truncate">
                      {p.contact.company}
                    </p>
                  )}
                </div>
                <span className={`badge flex-shrink-0 ${PROJECT_STATUS_COLORS[p.status]}`}>
                  {PROJECT_STATUS_LABELS[p.status]}
                </span>
              </div>

              {/* Client linked */}
              {p.client && (
                <div className="flex items-center gap-1.5 mb-3 text-xs text-fourmiliance-mid">
                  <Users className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                  <span className="truncate">{p.client.full_name}</span>
                  <span className="badge badge-green ml-auto flex-shrink-0">Portail actif</span>
                </div>
              )}

              {/* Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-fourmiliance-ghost mb-1">
                  <span>Progression</span>
                  <span className="font-medium text-fourmiliance-forest">{p.progress}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={p.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Progression : ${p.progress}%`}
                  className="h-1.5 bg-fourmiliance-track rounded-full overflow-hidden"
                >
                  <div
                    className="h-full bg-fourmiliance-mid rounded-full transition-all"
                    style={{ width: `${p.progress}%` }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <a
                  href={`/client/${p.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Ouvrir le portail de ${p.name}`}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-fourmiliance-mid text-white
                             px-3 py-2 rounded-lg hover:bg-fourmiliance-light transition-colors font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  Ouvrir portail
                </a>
                <button
                  onClick={() => copyLink(p.id)}
                  aria-label={copied === p.id ? 'Lien copié !' : `Copier le lien du portail ${p.name}`}
                  className="flex items-center gap-1.5 text-xs border border-fourmiliance-border
                             px-3 py-2 rounded-lg hover:bg-fourmiliance-cream transition-colors"
                >
                  {copied === p.id
                    ? <Check className="w-3.5 h-3.5 text-fourmiliance-mid" aria-hidden="true" />
                    : <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  }
                  {copied === p.id ? 'Copié !' : 'Lien'}
                </button>
                <Link
                  to={`/app/projects/${p.id}`}
                  className="flex items-center gap-1.5 text-xs border border-fourmiliance-border
                             px-3 py-2 rounded-lg hover:bg-fourmiliance-cream transition-colors"
                  aria-label={`Voir les détails du projet ${p.name}`}
                >
                  Projet
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
