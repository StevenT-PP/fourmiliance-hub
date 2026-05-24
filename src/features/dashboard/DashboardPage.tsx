import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Users, FolderKanban, TrendingUp, Activity,
  ArrowRight, User, FolderOpen, Receipt, CheckSquare, Pin,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth.tsx'
import type { ActivityLog } from '../../types'
import { PIPELINE_LABELS, PIPELINE_COLORS } from '../../lib/constants'
import { formatCurrency, formatLongDate, formatRelativeTime } from '../../lib/utils'
import FundTracker from '../finance/FundTracker'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PipelineCount {
  pipeline_stage: string
}

interface ProjectSummary {
  id: string
  name: string
  status: string
  progress: number
}

interface InvoiceSummary {
  amount_ttc: number
  status: string
  issued_date: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PIPELINE_ORDER = ['prospect', 'contacte', 'devis', 'signe', 'en_cours', 'livre']

function ActivityIcon({ entityType }: { entityType: string | null }) {
  const cls = 'w-4 h-4 flex-shrink-0'
  switch (entityType) {
    case 'contact': return <User    className={`${cls} text-fourmiliance-mid`} />
    case 'project': return <FolderOpen className={`${cls} text-sky-500`} />
    case 'invoice': return <Receipt className={`${cls} text-amber-500`} />
    case 'task':    return <CheckSquare className={`${cls} text-emerald-500`} />
    default:        return <Pin     className={`${cls} text-[#9A9A9A]`} />
  }
}

function KpiSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-[#E0DAD0] border-l-4 border-l-[#E0DAD0] p-5 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 bg-[#E0DAD0] rounded" />
        <div className="h-3 w-24 bg-[#E0DAD0] rounded" />
      </div>
      <div className="h-7 w-20 bg-[#E0DAD0] rounded mb-1" />
      <div className="h-3 w-28 bg-[#E0DAD0] rounded" />
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const { profile } = useAuth()
  const firstName = profile?.full_name.split(' ')[0] ?? ''
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  // Contacts par stage (entonnoir)
  const { data: pipeline = [], isLoading: loadingPipeline } = useQuery({
    queryKey: ['pipeline-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('pipeline_stage')
        .not('pipeline_stage', 'in', '(archive,perdu)')
      if (error) throw error
      return (data ?? []) as PipelineCount[]
    },
  })

  // KPI projets actifs
  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['projects-kpi'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status, progress')
        .in('status', ['briefing', 'maquette', 'developpement', 'validation'])
        .order('updated_at', { ascending: false })
        .limit(5)
      if (error) throw error
      return (data ?? []) as ProjectSummary[]
    },
  })

  // KPI CA mois courant
  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['invoices-kpi'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('amount_ttc, status, issued_date')
        .gte('issued_date', monthStart)
      if (error) throw error
      return (data ?? []) as InvoiceSummary[]
    },
  })

  // Activité récente
  const { data: activity = [], isLoading: loadingActivity } = useQuery({
    queryKey: ['activity-recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*, actor:user_id(full_name)')
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return (data ?? []) as ActivityLog[]
    },
  })

  const kpisLoading = loadingPipeline || loadingInvoices

  // ── Calculs ──
  const kpis = useMemo(() => {
    const caMois = invoices
      .filter(i => i.status === 'paye')
      .reduce((s, i) => s + (i.amount_ttc ?? 0), 0)

    const pipelineCounts = PIPELINE_ORDER.reduce<Record<string, number>>((acc, stage) => {
      acc[stage] = pipeline.filter(c => c.pipeline_stage === stage).length
      return acc
    }, {})

    return { caMois, pipelineCounts, projetsActifs: projects.length }
  }, [invoices, pipeline, projects])

  const maxPipeline = Math.max(...Object.values(kpis.pipelineCounts), 1)

  return (
    <div className="space-y-6">

      {/* ── Greeting ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="font-heading text-2xl text-fourmiliance-forest font-semibold">
          Bonjour {firstName}
        </h1>
        <p className="text-sm text-[#7A7A7A] capitalize mt-0.5">
          {formatLongDate(now)}
        </p>
      </div>

      {/* ── KPI cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpisLoading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-[#E0DAD0] border-l-4 border-l-fourmiliance-mid p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-fourmiliance-mid" aria-hidden="true" />
                <span className="text-xs font-semibold text-[#7A7A7A] uppercase tracking-wide">CA ce mois</span>
              </div>
              <p className="font-heading text-2xl text-fourmiliance-forest font-semibold">
                {formatCurrency(kpis.caMois)}
              </p>
              <p className="text-xs text-[#9A9A9A] mt-1">factures encaissées</p>
            </div>

            <div className="bg-white rounded-xl border border-[#E0DAD0] border-l-4 border-l-sky-400 p-5">
              <div className="flex items-center gap-2 mb-3">
                <FolderKanban className="w-5 h-5 text-sky-500" aria-hidden="true" />
                <span className="text-xs font-semibold text-[#7A7A7A] uppercase tracking-wide">Projets actifs</span>
              </div>
              <p className="font-heading text-2xl text-fourmiliance-forest font-semibold">
                {kpis.projetsActifs}
              </p>
              <p className="text-xs text-[#9A9A9A] mt-1">en production</p>
            </div>

            <div className="bg-white rounded-xl border border-[#E0DAD0] border-l-4 border-l-amber-400 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-amber-500" aria-hidden="true" />
                <span className="text-xs font-semibold text-[#7A7A7A] uppercase tracking-wide">Pipeline</span>
              </div>
              <p className="font-heading text-2xl text-fourmiliance-forest font-semibold">
                {pipeline.length}
              </p>
              <p className="text-xs text-[#9A9A9A] mt-1">prospects actifs</p>
            </div>
          </>
        )}
      </div>

      {/* ── Entonnoir CRM ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#E0DAD0] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-base text-fourmiliance-forest">Pipeline CRM</h2>
          <Link to="/app/crm"
            className="flex items-center gap-1 text-xs text-fourmiliance-mid hover:underline">
            Voir le kanban <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="space-y-2">
          {PIPELINE_ORDER.map(stage => {
            const count = kpis.pipelineCounts[stage] ?? 0
            const widthPct = (count / maxPipeline) * 100
            const label = PIPELINE_LABELS[stage as keyof typeof PIPELINE_LABELS] ?? stage
            const colorClass = PIPELINE_COLORS[stage as keyof typeof PIPELINE_COLORS] ?? 'bg-gray-100 text-gray-700'
            return (
              <div key={stage} className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 w-28 text-center ${colorClass}`}>
                  {label}
                </span>
                <div className="flex-1 bg-[#F0EBE4] rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-fourmiliance-mid rounded-full transition-all"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-[#5A5A5A] w-5 text-right flex-shrink-0">
                  {count}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Projets en cours ───────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-[#E0DAD0] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-base text-fourmiliance-forest">Projets en cours</h2>
            <Link to="/app/projects"
              className="flex items-center gap-1 text-xs text-fourmiliance-mid hover:underline">
              Tous <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {loadingProjects ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i}>
                  <div className="flex justify-between mb-1.5">
                    <div className="h-3.5 w-32 bg-[#E0DAD0] rounded" />
                    <div className="h-3.5 w-8 bg-[#E0DAD0] rounded" />
                  </div>
                  <div className="h-1.5 bg-[#E0DAD0] rounded-full" />
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-6">
              <FolderKanban className="w-8 h-8 text-[#C0B8B0] mx-auto mb-2" aria-hidden="true" />
              <p className="text-sm text-[#9A9A9A] mb-3">Aucun projet en cours</p>
              <Link to="/app/projects"
                className="inline-flex items-center gap-1 text-xs text-fourmiliance-mid hover:underline font-medium">
                Créer un projet <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map(p => (
                <Link key={p.id} to={`/app/projects/${p.id}`}
                  className="block hover:bg-[#FAFAF8] rounded-lg p-2 -mx-2 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[#2A2A2A] truncate">{p.name}</span>
                    <span className="text-xs text-[#9A9A9A] flex-shrink-0 ml-2">{p.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-[#F0EBE4] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-fourmiliance-mid rounded-full"
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Activité récente ────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-[#E0DAD0] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-fourmiliance-forest" />
            <h2 className="font-heading text-base text-fourmiliance-forest">Activité récente</h2>
          </div>
          {loadingActivity ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex gap-3">
                  <div className="w-4 h-4 bg-[#E0DAD0] rounded flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-[#E0DAD0] rounded w-3/4" />
                    <div className="h-2.5 bg-[#E0DAD0] rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : activity.length === 0 ? (
            <div className="text-center py-6">
              <Activity className="w-8 h-8 text-[#C0B8B0] mx-auto mb-2" aria-hidden="true" />
              <p className="text-sm text-[#9A9A9A]">Aucune activité pour le moment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activity.map(log => (
                <div key={log.id} className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <ActivityIcon entityType={log.entity_type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#2A2A2A] leading-snug">
                      <strong>{log.actor?.full_name ?? 'Système'}</strong>
                      {' — '}
                      {log.action.replace(/_/g, ' ')}
                      {log.entity_label ? ` : ${log.entity_label}` : ''}
                    </p>
                    <p className="text-[10px] text-[#9A9A9A] mt-0.5">
                      {formatRelativeTime(log.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Tracker fonds (version compacte) ────────────────────────────── */}
      <div className="bg-white rounded-xl border border-fourmiliance-ocre/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-base text-fourmiliance-forest">Fonds Fourmiliance</h2>
          <Link to="/app/finance"
            className="flex items-center gap-1 text-xs text-fourmiliance-mid hover:underline">
            Détail finances <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <FundTracker compact />
      </div>

    </div>
  )
}
