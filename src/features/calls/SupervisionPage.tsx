import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Phone, PhoneOff, TrendingUp, Clock, Target, Award, BarChart2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { CallSession, CallLog, Profile } from '../../types'
import { LEAD_STATUS_LABELS, type LeadStatus } from '../../lib/constants'

// ─── Live timer ────────────────────────────────────────────────────────────────

function LiveDuration({ startedAt }: { startedAt: string }) {
  const [s, setS] = useState(0)

  useEffect(() => {
    const base = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
    setS(Math.max(0, base))
    const id = setInterval(() => setS(v => v + 1), 1000)
    return () => clearInterval(id)
  }, [startedAt])

  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return (
    <span className="font-mono tabular-nums text-emerald-600 font-semibold" role="timer" aria-live="off">
      {m}:{sec}
    </span>
  )
}

// ─── Carte commercial actif ────────────────────────────────────────────────────

function ActiveCallCard({ session }: { session: CallSession }) {
  return (
    <div className="bg-white rounded-2xl border-2 border-emerald-300 p-5 shadow-sm shadow-emerald-100">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-fourmiliance-mid flex items-center justify-center text-white text-sm font-semibold">
              {session.commercial?.full_name?.slice(0, 2).toUpperCase() ?? '??'}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-fourmiliance-ink">{session.commercial?.full_name ?? 'Commercial'}</p>
            <p className="text-xs text-fourmiliance-ghost">En ligne</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <Phone size={14} className="text-emerald-500" aria-hidden="true" />
          <LiveDuration startedAt={session.started_at} />
        </div>
      </div>
      {session.lead && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-sm font-medium text-fourmiliance-forest">{session.lead.company_name}</p>
          {session.lead.sector && (
            <p className="text-xs text-fourmiliance-ghost">{session.lead.sector}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CommercialStat {
  commercial_id: string
  full_name: string
  calls: number
  duration_total: number
  rdv: number
  refus: number
}

type Tab = 'today' | '7d' | '30d' | 'ranking'

// ─── Entonnoir conversion ──────────────────────────────────────────────────────

function ConversionFunnel({ logs }: { logs: CallLog[] }) {
  const statuses: LeadStatus[] = ['pas_repondu', 'rappel', 'rdv_pris', 'proposition', 'production', 'livre']
  const counts = statuses.map(s => ({ status: s, count: logs.filter(l => l.status === s).length }))
  const max = Math.max(...counts.map(c => c.count), 1)

  const colors: Partial<Record<LeadStatus, string>> = {
    pas_repondu: 'bg-gray-300',
    rappel:      'bg-yellow-400',
    rdv_pris:    'bg-blue-400',
    proposition: 'bg-purple-400',
    production:  'bg-fourmiliance-mid',
    livre:       'bg-fourmiliance-ocre',
  }

  return (
    <div className="space-y-2">
      {counts.map(({ status, count }) => (
        <div key={status} className="flex items-center gap-3">
          <span className="text-xs text-fourmiliance-ghost w-24 flex-shrink-0 text-right">
            {LEAD_STATUS_LABELS[status]}
          </span>
          <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden">
            <div
              className={`h-full rounded-lg transition-all ${colors[status] ?? 'bg-gray-400'}`}
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <span className="text-sm font-bold text-fourmiliance-ink tabular-nums w-8">{count}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Bar chart journalier ──────────────────────────────────────────────────────

function DailyBarChart({ logs, days }: { logs: CallLog[]; days: number }) {
  const buckets = useMemo(() => {
    const today = new Date()
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() - (days - 1 - i))
      const key = d.toISOString().slice(0, 10)
      const count = logs.filter(l => l.started_at.startsWith(key)).length
      const label = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
      return { key, label, count }
    })
  }, [logs, days])

  const max = Math.max(...buckets.map(b => b.count), 1)
  const todayKey = new Date().toISOString().slice(0, 10)

  return (
    <div className="flex items-end gap-1 h-32">
      {buckets.map(b => (
        <div key={b.key} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <span className="text-[10px] tabular-nums text-fourmiliance-ghost leading-none">
            {b.count > 0 ? b.count : ''}
          </span>
          <div className="w-full flex-1 flex items-end">
            <div
              className={`w-full rounded-t transition-all ${b.key === todayKey ? 'bg-fourmiliance-mid' : 'bg-fourmiliance-mid/30'}`}
              style={{ height: `${Math.max(b.count > 0 ? 4 : 0, (b.count / max) * 100)}%` }}
            />
          </div>
          {days <= 14 && (
            <span className={`text-[9px] tabular-nums leading-none ${b.key === todayKey ? 'text-fourmiliance-forest font-bold' : 'text-fourmiliance-ghost'}`}>
              {b.label}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Tableau commercial stats ──────────────────────────────────────────────────

function CommercialTable({ stats, label }: { stats: CommercialStat[]; label: string }) {
  const maxCalls = Math.max(...stats.map(s => s.calls), 1)

  if (stats.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-fourmiliance-ghost">Aucune activité</div>
    )
  }

  return (
    <div className="divide-y divide-fourmiliance-border">
      {stats.map((stat, i) => {
        const conv = stat.calls > 0 ? Math.round((stat.rdv / stat.calls) * 100) : 0
        return (
          <div key={stat.commercial_id} className="px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-fourmiliance-ghost/40 w-4 flex-shrink-0">{i + 1}</span>
              <div className="w-8 h-8 rounded-full bg-fourmiliance-mid/10 flex items-center justify-center text-fourmiliance-mid text-xs font-bold flex-shrink-0">
                {stat.full_name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-fourmiliance-ink truncate">{stat.full_name}</p>
                <p className="text-xs text-fourmiliance-ghost">
                  {Math.floor(stat.duration_total / 60)}min ·{' '}
                  {stat.calls > 0 ? `moy. ${Math.round(stat.duration_total / stat.calls / 60)}min/appel` : '—'}
                </p>
              </div>
              <div className="flex gap-4 text-right flex-shrink-0">
                <div>
                  <p className="text-sm font-bold tabular-nums text-fourmiliance-forest">{stat.calls}</p>
                  <p className="text-[10px] text-fourmiliance-ghost">appels</p>
                </div>
                <div>
                  <p className="text-sm font-bold tabular-nums text-emerald-600">{stat.rdv}</p>
                  <p className="text-[10px] text-fourmiliance-ghost">RDV</p>
                </div>
                <div>
                  <p className={`text-sm font-bold tabular-nums ${conv >= 10 ? 'text-emerald-600' : conv >= 5 ? 'text-yellow-600' : 'text-fourmiliance-ghost'}`}>
                    {conv}%
                  </p>
                  <p className="text-[10px] text-fourmiliance-ghost">conv.</p>
                </div>
              </div>
            </div>
            <div className="mt-2 ml-11 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-fourmiliance-mid rounded-full transition-all"
                style={{ width: `${(stat.calls / maxCalls) * 100}%` }}
              />
            </div>
          </div>
        )
      })}
      {label && (
        <p className="px-5 py-2 text-[11px] text-fourmiliance-ghost">{label}</p>
      )}
    </div>
  )
}

// ─── Vue période (7j / 30j) ────────────────────────────────────────────────────

function PeriodView({ logs, commercials, days }: { logs: CallLog[]; commercials: Profile[]; days: number }) {
  const total = logs.length
  const totalRdv = logs.filter(l => l.status === 'rdv_pris').length
  const totalDuration = logs.reduce((s, l) => s + (l.duration_seconds ?? 0), 0)
  const avgDuration = total > 0 ? Math.round(totalDuration / total) : 0
  const conversion = total > 0 ? Math.round((totalRdv / total) * 100) : 0
  const avgPerDay = total > 0 ? Math.round(total / days) : 0

  const statsByC = useMemo<CommercialStat[]>(() => (
    commercials.map(c => {
      const my = logs.filter(l => l.commercial_id === c.id)
      return {
        commercial_id: c.id,
        full_name: c.full_name,
        calls: my.length,
        duration_total: my.reduce((s, l) => s + (l.duration_seconds ?? 0), 0),
        rdv: my.filter(l => l.status === 'rdv_pris').length,
        refus: my.filter(l => l.status === 'refus').length,
      }
    }).filter(s => s.calls > 0).sort((a, b) => b.calls - a.calls)
  ), [logs, commercials])

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total appels', value: total, color: 'text-fourmiliance-forest' },
          { label: 'Moy. / jour', value: avgPerDay, color: 'text-blue-600' },
          { label: 'RDV pris', value: totalRdv, color: 'text-emerald-600' },
          {
            label: 'Durée moy.',
            value: `${Math.floor(avgDuration / 60)}:${String(avgDuration % 60).padStart(2, '0')}`,
            color: 'text-purple-600',
          },
          { label: 'Conversion', value: `${conversion}%`, color: 'text-orange-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-fourmiliance-border p-4 text-center">
            <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
            <p className="text-[11px] text-fourmiliance-ghost mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Bar chart + entonnoir */}
      <div className="grid lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border border-fourmiliance-border overflow-hidden">
          <div className="px-5 py-4 border-b border-fourmiliance-border flex items-center gap-2">
            <BarChart2 size={16} className="text-fourmiliance-mid" aria-hidden="true" />
            <h2 className="font-semibold text-fourmiliance-ink text-sm">Appels par jour</h2>
          </div>
          <div className="p-5">
            {total === 0 ? (
              <p className="text-sm text-fourmiliance-ghost text-center py-4">Aucune donnée sur la période</p>
            ) : (
              <DailyBarChart logs={logs} days={days} />
            )}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-fourmiliance-border overflow-hidden">
          <div className="px-5 py-4 border-b border-fourmiliance-border flex items-center gap-2">
            <TrendingUp size={16} className="text-fourmiliance-mid" aria-hidden="true" />
            <h2 className="font-semibold text-fourmiliance-ink text-sm">Entonnoir de conversion</h2>
          </div>
          <div className="p-5">
            {total === 0 ? (
              <p className="text-sm text-fourmiliance-ghost text-center py-4">Aucune donnée sur la période</p>
            ) : (
              <ConversionFunnel logs={logs} />
            )}
          </div>
        </section>
      </div>

      {/* Stats par commercial */}
      <section className="bg-white rounded-2xl border border-fourmiliance-border overflow-hidden">
        <div className="px-5 py-4 border-b border-fourmiliance-border flex items-center gap-2">
          <Award size={16} className="text-fourmiliance-mid" aria-hidden="true" />
          <h2 className="font-semibold text-fourmiliance-ink text-sm">Performance sur la période</h2>
        </div>
        <CommercialTable stats={statsByC} label="" />
      </section>
    </div>
  )
}

// ─── Classement all-time ───────────────────────────────────────────────────────

function RankingView({ logs, commercials }: { logs: CallLog[]; commercials: Profile[] }) {
  const stats = useMemo<CommercialStat[]>(() => (
    commercials.map(c => {
      const my = logs.filter(l => l.commercial_id === c.id)
      return {
        commercial_id: c.id,
        full_name: c.full_name,
        calls: my.length,
        duration_total: my.reduce((s, l) => s + (l.duration_seconds ?? 0), 0),
        rdv: my.filter(l => l.status === 'rdv_pris').length,
        refus: my.filter(l => l.status === 'refus').length,
      }
    }).filter(s => s.calls > 0).sort((a, b) => b.rdv - a.rdv || b.calls - a.calls)
  ), [logs, commercials])

  if (stats.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-fourmiliance-border p-12 text-center">
        <Award size={40} className="mx-auto text-fourmiliance-ghost/20 mb-3" aria-hidden="true" />
        <p className="text-sm text-fourmiliance-ghost">Le classement apparaitra apres les premiers appels</p>
      </div>
    )
  }

  const medalColors = [
    'bg-yellow-50 text-yellow-700 border-yellow-200',
    'bg-gray-50 text-gray-600 border-gray-200',
    'bg-orange-50 text-orange-700 border-orange-200',
  ]

  return (
    <section className="bg-white rounded-2xl border border-fourmiliance-border overflow-hidden">
      <div className="px-5 py-4 border-b border-fourmiliance-border flex items-center gap-2">
        <Award size={16} className="text-fourmiliance-mid" aria-hidden="true" />
        <h2 className="font-semibold text-fourmiliance-ink text-sm">Classement general — 12 derniers mois</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-fourmiliance-ghost">
              <th className="px-5 py-3 text-left font-medium w-12">#</th>
              <th className="px-5 py-3 text-left font-medium">Commercial</th>
              <th className="px-5 py-3 text-right font-medium">Appels</th>
              <th className="px-5 py-3 text-right font-medium">Temps conv.</th>
              <th className="px-5 py-3 text-right font-medium">Moy./appel</th>
              <th className="px-5 py-3 text-right font-medium">RDV</th>
              <th className="px-5 py-3 text-right font-medium">Conv.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-fourmiliance-border">
            {stats.map((stat, i) => {
              const avgSec = stat.calls > 0 ? Math.round(stat.duration_total / stat.calls) : 0
              const conv = stat.calls > 0 ? Math.round((stat.rdv / stat.calls) * 100) : 0
              const hours = Math.floor(stat.duration_total / 3600)
              const mins = Math.floor((stat.duration_total % 3600) / 60)
              return (
                <tr key={stat.commercial_id} className="hover:bg-fourmiliance-surface transition-colors">
                  <td className="px-5 py-3.5">
                    {i < 3 ? (
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold border ${medalColors[i]}`}>
                        {i + 1}
                      </span>
                    ) : (
                      <span className="text-fourmiliance-ghost font-bold">{i + 1}</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-fourmiliance-mid/10 flex items-center justify-center text-fourmiliance-mid text-xs font-bold flex-shrink-0">
                        {stat.full_name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium text-fourmiliance-ink">{stat.full_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums font-semibold text-fourmiliance-forest">
                    {stat.calls}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-fourmiliance-ghost font-mono text-xs">
                    {hours > 0 ? `${hours}h` : ''}{String(mins).padStart(hours > 0 ? 2 : 1, '0')}min
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums font-mono text-xs text-fourmiliance-ghost">
                    {Math.floor(avgSec / 60)}:{String(avgSec % 60).padStart(2, '0')}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums font-semibold text-emerald-600">
                    {stat.rdv}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      conv >= 10 ? 'bg-emerald-50 text-emerald-700' :
                      conv >= 5  ? 'bg-yellow-50 text-yellow-700' :
                                   'bg-gray-100 text-gray-500'
                    }`}>
                      {conv}%
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ─── Page principale ───────────────────────────────────────────────────────────

export default function SupervisionPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('today')

  const { data: activeSessions = [] } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('call_sessions')
        .select(`
          *,
          commercial:profiles!call_sessions_commercial_id_fkey(id, full_name, avatar_url),
          lead:leads!call_sessions_lead_id_fkey(id, company_name, sector, phone)
        `)
        .eq('is_active', true)
      if (error) throw error
      return data as CallSession[]
    },
    refetchInterval: 5_000,
  })

  const { data: todayLogs = [] } = useQuery({
    queryKey: ['supervision-today-logs'],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('call_logs')
        .select(`
          *,
          commercial:profiles!call_logs_commercial_id_fkey(id, full_name),
          lead:leads!call_logs_lead_id_fkey(id, company_name, sector)
        `)
        .gte('started_at', today)
        .order('started_at', { ascending: false })
      if (error) throw error
      return data as CallLog[]
    },
    refetchInterval: 10_000,
  })

  const { data: logs7d = [] } = useQuery({
    queryKey: ['supervision-7d-logs'],
    queryFn: async () => {
      const from = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('call_logs')
        .select('*, commercial:profiles!call_logs_commercial_id_fkey(id, full_name)')
        .gte('started_at', from)
        .order('started_at', { ascending: true })
      if (error) throw error
      return data as CallLog[]
    },
    enabled: tab === '7d',
  })

  const { data: logs30d = [] } = useQuery({
    queryKey: ['supervision-30d-logs'],
    queryFn: async () => {
      const from = new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('call_logs')
        .select('*, commercial:profiles!call_logs_commercial_id_fkey(id, full_name)')
        .gte('started_at', from)
        .order('started_at', { ascending: true })
      if (error) throw error
      return data as CallLog[]
    },
    enabled: tab === '30d',
  })

  const { data: allLogs = [] } = useQuery({
    queryKey: ['supervision-all-logs'],
    queryFn: async () => {
      const from = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('call_logs')
        .select('*, commercial:profiles!call_logs_commercial_id_fkey(id, full_name)')
        .gte('started_at', from)
      if (error) throw error
      return data as CallLog[]
    },
    enabled: tab === 'ranking',
  })

  const { data: commercials = [] } = useQuery({
    queryKey: ['commercials-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .in('role', ['commercial', 'sous_traitant', 'admin'])
      if (error) throw error
      return data as Profile[]
    },
  })

  useEffect(() => {
    const channel = supabase
      .channel('supervision-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'call_sessions' }, () => {
        qc.invalidateQueries({ queryKey: ['active-sessions'] })
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_logs' }, () => {
        qc.invalidateQueries({ queryKey: ['supervision-today-logs'] })
        qc.invalidateQueries({ queryKey: ['supervision-7d-logs'] })
        qc.invalidateQueries({ queryKey: ['supervision-30d-logs'] })
        qc.invalidateQueries({ queryKey: ['supervision-all-logs'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [qc])

  // Aggregats today
  const totalCalls = todayLogs.length
  const totalRdv = todayLogs.filter(l => l.status === 'rdv_pris').length
  const totalDuration = todayLogs.reduce((s, l) => s + (l.duration_seconds ?? 0), 0)
  const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0
  const conversionRate = totalCalls > 0 ? Math.round((totalRdv / totalCalls) * 100) : 0

  const statsByCommercial = useMemo<CommercialStat[]>(() => (
    commercials.map(c => {
      const my = todayLogs.filter(l => l.commercial_id === c.id)
      return {
        commercial_id: c.id,
        full_name: c.full_name,
        calls: my.length,
        duration_total: my.reduce((s, l) => s + (l.duration_seconds ?? 0), 0),
        rdv: my.filter(l => l.status === 'rdv_pris').length,
        refus: my.filter(l => l.status === 'refus').length,
      }
    }).filter(s => s.calls > 0).sort((a, b) => b.calls - a.calls)
  ), [todayLogs, commercials])

  const tabs: { id: Tab; label: string }[] = [
    { id: 'today',   label: "Aujourd'hui" },
    { id: '7d',      label: '7 jours' },
    { id: '30d',     label: '30 jours' },
    { id: 'ranking', label: 'Classement' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl text-fourmiliance-forest">Supervision</h1>
          <p className="text-sm text-fourmiliance-ghost mt-0.5 flex items-center gap-1.5">
            {activeSessions.length > 0 ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" aria-hidden="true" />
                {activeSessions.length} appel{activeSessions.length !== 1 ? 's' : ''} en cours
              </>
            ) : (
              'Aucun appel en cours'
            )}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab === t.id
                  ? 'bg-white text-fourmiliance-forest shadow-sm'
                  : 'text-fourmiliance-ghost hover:text-fourmiliance-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Aujourd'hui ─────────────────────────────────────────────────────── */}
      {tab === 'today' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: <Phone size={20} />,     label: "Appels aujourd'hui", value: totalCalls,    color: 'text-fourmiliance-forest' },
              { icon: <Clock size={20} />,     label: 'Duree moy.',         value: `${Math.floor(avgDuration / 60)}:${String(avgDuration % 60).padStart(2, '0')}`, color: 'text-blue-600' },
              { icon: <Target size={20} />,    label: 'RDV pris',           value: totalRdv,      color: 'text-emerald-600' },
              { icon: <TrendingUp size={20} />, label: 'Taux conversion',   value: `${conversionRate}%`, color: 'text-purple-600' },
            ].map(({ icon, label, value, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-fourmiliance-border p-5">
                <div className={`${color} mb-2`} aria-hidden="true">{icon}</div>
                <p className={`text-3xl font-bold tabular-nums ${color}`}>{value}</p>
                <p className="text-xs text-fourmiliance-ghost mt-1">{label}</p>
              </div>
            ))}
          </div>

          <section>
            <h2 className="font-semibold text-fourmiliance-ink mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
              En cours d'appel
            </h2>
            {activeSessions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-fourmiliance-border p-8 text-center">
                <PhoneOff size={32} className="mx-auto text-fourmiliance-ghost/30 mb-2" aria-hidden="true" />
                <p className="text-sm text-fourmiliance-ghost">Aucun appel en cours</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeSessions.map(s => <ActiveCallCard key={s.id} session={s} />)}
              </div>
            )}
          </section>

          <div className="grid lg:grid-cols-2 gap-6">
            <section className="bg-white rounded-2xl border border-fourmiliance-border overflow-hidden">
              <div className="px-5 py-4 border-b border-fourmiliance-border flex items-center gap-2">
                <Award size={16} className="text-fourmiliance-mid" aria-hidden="true" />
                <h2 className="font-semibold text-fourmiliance-ink text-sm">Performances du jour</h2>
              </div>
              {statsByCommercial.length === 0 ? (
                <div className="p-8 text-center text-sm text-fourmiliance-ghost">Aucune activite aujourd'hui</div>
              ) : (
                <CommercialTable stats={statsByCommercial} label="" />
              )}
            </section>

            <section className="bg-white rounded-2xl border border-fourmiliance-border overflow-hidden">
              <div className="px-5 py-4 border-b border-fourmiliance-border flex items-center gap-2">
                <TrendingUp size={16} className="text-fourmiliance-mid" aria-hidden="true" />
                <h2 className="font-semibold text-fourmiliance-ink text-sm">Entonnoir du jour</h2>
              </div>
              <div className="p-5">
                {todayLogs.length === 0 ? (
                  <p className="text-sm text-fourmiliance-ghost text-center py-4">
                    Les donnees apparaitront des les premiers appels
                  </p>
                ) : (
                  <ConversionFunnel logs={todayLogs} />
                )}
              </div>
            </section>
          </div>

          <section className="bg-white rounded-2xl border border-fourmiliance-border overflow-hidden">
            <div className="px-5 py-4 border-b border-fourmiliance-border">
              <h2 className="font-semibold text-fourmiliance-ink text-sm">Activite recente</h2>
            </div>
            {todayLogs.length === 0 ? (
              <div className="p-8 text-center text-sm text-fourmiliance-ghost">Aucune activite aujourd'hui</div>
            ) : (
              <ul className="divide-y divide-fourmiliance-border max-h-[320px] overflow-y-auto">
                {todayLogs.slice(0, 20).map(log => (
                  <li key={log.id} className="flex items-center gap-3 px-5 py-3">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      log.status === 'rdv_pris'    ? 'bg-emerald-500' :
                      log.status === 'production'  ? 'bg-fourmiliance-mid' :
                      log.status === 'refus'       ? 'bg-red-400' :
                      log.status === 'rappel'      ? 'bg-yellow-400' : 'bg-gray-300'
                    }`} aria-hidden="true" />
                    <span className="text-xs text-fourmiliance-ghost flex-shrink-0 w-[5.5rem] tabular-nums">
                      {new Date(log.started_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-sm font-medium text-fourmiliance-ink flex-1 truncate">
                      {log.lead?.company_name ?? '—'}
                    </span>
                    <span className="text-xs text-fourmiliance-ghost flex-shrink-0">
                      {log.commercial?.full_name}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                      log.status === 'rdv_pris' ? 'bg-emerald-50 text-emerald-700' :
                      log.status === 'refus'    ? 'bg-red-50 text-red-600' :
                      log.status === 'rappel'   ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {LEAD_STATUS_LABELS[log.status as LeadStatus]}
                    </span>
                    {log.duration_seconds != null && (
                      <span className="text-xs tabular-nums font-mono text-fourmiliance-ghost flex-shrink-0">
                        {Math.floor(log.duration_seconds / 60)}:{String(log.duration_seconds % 60).padStart(2, '0')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* ── 7 jours ─────────────────────────────────────────────────────────── */}
      {tab === '7d' && (
        <PeriodView logs={logs7d} commercials={commercials} days={7} />
      )}

      {/* ── 30 jours ────────────────────────────────────────────────────────── */}
      {tab === '30d' && (
        <PeriodView logs={logs30d} commercials={commercials} days={30} />
      )}

      {/* ── Classement ──────────────────────────────────────────────────────── */}
      {tab === 'ranking' && (
        <RankingView logs={allLogs} commercials={commercials} />
      )}
    </div>
  )
}
