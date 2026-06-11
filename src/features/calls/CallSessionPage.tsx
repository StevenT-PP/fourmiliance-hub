import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Phone, PhoneOff, SkipForward, Clock, Globe, Users,
  Star, MapPin, StickyNote, ChevronRight, CheckCircle2,
  AlertCircle, CalendarClock, Target, Flame,
  Package, ChevronDown, ChevronUp,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import type { Lead, CallLog, Product } from '../../types'
import {
  LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, CALL_OUTCOME_STATUSES,
  type LeadStatus,
} from '../../lib/constants'

// ─── Objectif journalier (stocké en localStorage) ─────────────────────────────

const GOAL_KEY = 'fh_daily_call_goal'
const DEFAULT_GOAL = 30

function getDailyGoal(): number {
  try { return parseInt(localStorage.getItem(GOAL_KEY) ?? '') || DEFAULT_GOAL }
  catch { return DEFAULT_GOAL }
}
function setDailyGoal(n: number) {
  try { localStorage.setItem(GOAL_KEY, String(n)) } catch { /**/ }
}

// ─── Timer hook ────────────────────────────────────────────────────────────────

function useCallTimer() {
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const startRef = useRef<number | null>(null)
  const rafRef   = useRef<number>(0)

  const start = useCallback(() => {
    startRef.current = Date.now(); setSeconds(0); setRunning(true)
  }, [])

  const stop = useCallback(() => {
    setRunning(false)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    return startRef.current ? Math.floor((Date.now() - startRef.current) / 1000) : 0
  }, [])

  const reset = useCallback(() => {
    setSeconds(0); setRunning(false); startRef.current = null
  }, [])

  useEffect(() => {
    if (!running) return
    const tick = () => {
      if (startRef.current) setSeconds(Math.floor((Date.now() - startRef.current) / 1000))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [running])

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  return { seconds, running, formatted: fmt(seconds), start, stop, reset }
}

// ─── Pitch suggestion avec produit réel ───────────────────────────────────────

function PitchCard({ lead, products }: { lead: Lead; products: Product[] }) {
  const [open, setOpen] = useState(true)

  const pick = (): Product | null => {
    if (!products.length) return null
    if (lead.has_website === false)
      return products.find(p => p.name.includes('Vitrine Standard')) ?? products[0]
    if (lead.sector?.match(/Restaurant|Hôtel|Commerce|Bar/i))
      return products.find(p => p.name.includes('Chatbot')) ?? products[0]
    return products.find(p => p.category === 'cle_en_main') ?? products[0]
  }

  const product = pick()
  if (!product) return null

  const pitch = lead.has_website === false
    ? `"Bonjour, j'ai vu que ${lead.company_name} n'a pas encore de site web. On peut en faire un professionnel en ${product.delivery_days ?? 21} jours à partir de ${product.base_price_ht}€ HT."`
    : lead.sector?.match(/Restaurant|Hôtel|Commerce/i)
    ? `"Bonjour, on aide les ${lead.sector?.toLowerCase() ?? 'commerces'} à répondre automatiquement à leurs clients 24h/24 grâce à l'IA — sans changer votre façon de travailler."`
    : `"Bonjour, on accompagne les entreprises comme ${lead.company_name} pour automatiser leur prospection et leur présence en ligne — je voulais vous en parler en 2 minutes."`

  return (
    <div className="border border-fourmiliance-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-fourmiliance-cream text-left"
      >
        <div className="flex items-center gap-2">
          <Package size={14} className="text-fourmiliance-mid flex-shrink-0" aria-hidden="true" />
          <span className="text-sm font-semibold text-fourmiliance-forest">{product.name}</span>
          <span className="text-xs text-fourmiliance-ghost">{product.base_price_ht.toLocaleString('fr-FR')}€ HT</span>
        </div>
        {open ? <ChevronUp size={14} className="text-fourmiliance-ghost" /> : <ChevronDown size={14} className="text-fourmiliance-ghost" />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-3 space-y-3 bg-white">
          {/* Script d'accroche */}
          <div className="bg-fourmiliance-cream rounded-lg px-3 py-2.5">
            <p className="text-xs font-medium text-fourmiliance-ghost mb-1">Accroche suggérée</p>
            <p className="text-sm text-fourmiliance-forest italic leading-relaxed">{pitch}</p>
          </div>

          {/* Arguments clés */}
          {product.features.length > 0 && (
            <div>
              <p className="text-xs font-medium text-fourmiliance-ghost mb-1.5">Points clés à mentionner</p>
              <ul className="space-y-1">
                {product.features.slice(0, 4).map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-fourmiliance-ink">
                    <span className="w-1.5 h-1.5 rounded-full bg-fourmiliance-mid flex-shrink-0" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {product.recurring_price_ht && (
            <p className="text-xs text-fourmiliance-ghost">
              + {product.recurring_price_ht}€/mois · Livraison {product.delivery_days ?? '?'} jours
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Contexte enrichi lead ─────────────────────────────────────────────────────

function LeadContextCard({ lead, products }: { lead: Lead; products: Product[] }) {
  return (
    <div className="space-y-3">
      {/* Données */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {lead.sector && (
          <div className="flex items-center gap-2 text-fourmiliance-ghost">
            <Users size={13} className="flex-shrink-0" aria-hidden="true" />
            <span>{lead.sector}</span>
          </div>
        )}
        {lead.employee_range && (
          <div className="flex items-center gap-2 text-fourmiliance-ghost">
            <Users size={13} className="flex-shrink-0" aria-hidden="true" />
            <span>{lead.employee_range} salarié{lead.employee_range !== '1' ? 's' : ''}</span>
          </div>
        )}
        {(lead.city || lead.department) && (
          <div className="flex items-center gap-2 text-fourmiliance-ghost">
            <MapPin size={13} className="flex-shrink-0" aria-hidden="true" />
            <span>{lead.city ?? lead.department}</span>
          </div>
        )}
        {lead.google_rating && (
          <div className="flex items-center gap-2 text-fourmiliance-ghost">
            <Star size={13} className="flex-shrink-0" fill="currentColor" aria-hidden="true" />
            <span className="tabular-nums">{lead.google_rating} ({lead.google_reviews_count} avis)</span>
          </div>
        )}
        {lead.website && (
          <div className="flex items-center gap-2 col-span-2">
            <Globe size={13} className="flex-shrink-0 text-fourmiliance-mid" aria-hidden="true" />
            <a href={lead.website} target="_blank" rel="noopener noreferrer"
              className="text-fourmiliance-mid hover:underline truncate text-xs">
              {lead.website.replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}
        {lead.siren && (
          <p className="text-xs text-fourmiliance-ghost/70 font-mono col-span-2">SIREN : {lead.siren}</p>
        )}
      </div>

      {/* Fiche produit intelligente */}
      <PitchCard lead={lead} products={products} />
    </div>
  )
}

// ─── Bouton outcome ────────────────────────────────────────────────────────────

const OUTCOME_CONFIG: Record<LeadStatus, { icon: React.ReactNode; color: string }> = {
  pas_repondu:  { icon: <PhoneOff size={18} />, color: 'border-gray-300 text-gray-600 hover:bg-gray-50' },
  refus:        { icon: <AlertCircle size={18} />, color: 'border-red-200 text-red-600 hover:bg-red-50' },
  rappel:       { icon: <CalendarClock size={18} />, color: 'border-yellow-300 text-yellow-700 hover:bg-yellow-50' },
  rdv_pris:     { icon: <CheckCircle2 size={18} />, color: 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' },
  proposition:  { icon: <ChevronRight size={18} />, color: 'border-purple-200 text-purple-700 hover:bg-purple-50' },
  nouveau: { icon: null, color: '' }, en_attente: { icon: null, color: '' },
  presentation: { icon: null, color: '' }, production: { icon: null, color: '' },
  livre: { icon: null, color: '' }, perdu: { icon: null, color: '' },
}

// ─── Barre objectif journalier ─────────────────────────────────────────────────

function DailyGoalBar({
  done,
  goal,
  onChangeGoal,
}: {
  done: number
  goal: number
  onChangeGoal: (n: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(String(goal))
  const pct = Math.min(100, Math.round((done / goal) * 100))

  const save = () => {
    const n = parseInt(val)
    if (n > 0) { onChangeGoal(n); setDailyGoal(n) }
    setEditing(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-fourmiliance-border px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-fourmiliance-mid" aria-hidden="true" />
          <span className="text-xs font-medium text-fourmiliance-ink">Objectif journalier</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold tabular-nums text-fourmiliance-forest">{done}</span>
          <span className="text-xs text-fourmiliance-ghost">/</span>
          {editing ? (
            <input
              type="number"
              value={val}
              min={1}
              max={200}
              onChange={e => setVal(e.target.value)}
              onBlur={save}
              onKeyDown={e => e.key === 'Enter' && save()}
              className="w-12 text-xs text-center border border-fourmiliance-mid rounded px-1 py-0.5 focus:outline-none"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="text-sm font-medium text-fourmiliance-ghost hover:text-fourmiliance-mid transition tabular-nums"
              title="Cliquer pour modifier l'objectif"
            >
              {goal}
            </button>
          )}
          <span className="text-xs text-fourmiliance-ghost ml-1">appels</span>
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : pct >= 66 ? 'bg-fourmiliance-mid' : pct >= 33 ? 'bg-yellow-400' : 'bg-gray-300'}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${pct}% de l'objectif atteint`}
        />
      </div>
      <p className="text-xs text-fourmiliance-ghost mt-1 text-right">
        {pct >= 100
          ? <span className="text-emerald-600 font-medium flex items-center justify-end gap-1"><Flame size={11} />Objectif atteint !</span>
          : `${goal - done} appel${goal - done > 1 ? 's' : ''} restant${goal - done > 1 ? 's' : ''}`
        }
      </p>
    </div>
  )
}

// ─── Page principale ───────────────────────────────────────────────────────────

type Phase = 'idle' | 'calling' | 'logging'

export default function CallSessionPage() {
  const { profile } = useAuth()
  const { show: toast } = useToast()
  const qc = useQueryClient()
  const timer = useCallTimer()
  const notesRef = useRef<HTMLTextAreaElement>(null)

  const [phase,            setPhase]            = useState<Phase>('idle')
  const [notes,            setNotes]            = useState('')
  const [nextCallAt,       setNextCallAt]       = useState('')
  const [sessionLeadIndex, setSessionLeadIndex] = useState(0)
  const [callDuration,     setCallDuration]     = useState(0)
  const [dailyGoal,        setDailyGoalState]   = useState(getDailyGoal)

  // Catalogue produits (pour la fiche pitch)
  const { data: products = [] } = useQuery({
    queryKey: ['products-active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').eq('active', true).order('base_price_ht')
      if (error) throw error
      return data as Product[]
    },
  })

  // Rappels urgents (next_call_at <= maintenant, status=rappel)
  const { data: urgentRappels = [] } = useQuery({
    queryKey: ['urgent-rappels', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*, assignee:profiles!leads_assigned_to_fkey(id, full_name, avatar_url)')
        .eq('assigned_to', profile?.id)
        .eq('status', 'rappel')
        .lte('next_call_at', new Date().toISOString())
        .order('next_call_at', { ascending: true })
        .limit(20)
      if (error) throw error
      return data as Lead[]
    },
    enabled: !!profile?.id,
    refetchInterval: 60_000,
  })

  // File de leads normale (en_attente + nouveau)
  const { data: queue = [], isLoading } = useQuery({
    queryKey: ['my-call-queue', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*, assignee:profiles!leads_assigned_to_fkey(id, full_name, avatar_url)')
        .eq('assigned_to', profile?.id)
        .in('status', ['en_attente', 'nouveau'])
        .order('created_at', { ascending: true })
        .limit(100)
      if (error) throw error
      return data as Lead[]
    },
    enabled: !!profile?.id,
    refetchInterval: phase === 'idle' ? 30_000 : false,
  })

  // File complète : rappels urgents en tête, puis file normale
  const fullQueue = [...urgentRappels, ...queue]

  // Historique appels du jour
  const { data: todayLogs = [] } = useQuery({
    queryKey: ['my-call-logs-today', profile?.id],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('call_logs')
        .select('*, lead:leads(id, company_name, sector)')
        .eq('commercial_id', profile?.id)
        .gte('started_at', today)
        .order('started_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as CallLog[]
    },
    enabled: !!profile?.id,
  })

  const currentLead = fullQueue[sessionLeadIndex] ?? null

  // Session active Supabase (pour la supervision)
  const upsertSession = useCallback(async (leadId: string | null) => {
    if (!profile?.id) return
    await supabase.from('call_sessions')
      .update({ is_active: false })
      .eq('commercial_id', profile.id)
      .eq('is_active', true)

    if (leadId !== null) {
      await supabase.from('call_sessions').insert({
        commercial_id: profile.id,
        lead_id: leadId,
        campaign_id: null,
        started_at: new Date().toISOString(),
        is_active: true,
      })
    }
  }, [profile?.id])

  const logCallMutation = useMutation({
    mutationFn: async ({
      lead, status, durationSeconds, notes, nextCallAt,
    }: {
      lead: Lead; status: LeadStatus; durationSeconds: number
      notes: string; nextCallAt: string
    }) => {
      const now       = new Date().toISOString()
      const startedAt = new Date(Date.now() - durationSeconds * 1000).toISOString()

      const { error: logErr } = await supabase.from('call_logs').insert({
        lead_id: lead.id,
        commercial_id: profile?.id,
        started_at: startedAt,
        ended_at: now,
        duration_seconds: durationSeconds,
        status,
        notes: notes || null,
        next_call_at: nextCallAt || null,
      })
      if (logErr) throw logErr

      const { error: leadErr } = await supabase.from('leads').update({
        status,
        last_called_at: now,
        next_call_at: nextCallAt || null,
      }).eq('id', lead.id)
      if (leadErr) throw leadErr

      await upsertSession(null)
    },
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ['my-call-queue'] })
      qc.invalidateQueries({ queryKey: ['urgent-rappels'] })
      qc.invalidateQueries({ queryKey: ['my-call-logs-today'] })
      toast(`Appel enregistré · ${LEAD_STATUS_LABELS[status]}`)
    },
    onError: () => toast('Erreur lors de l\'enregistrement', 'error'),
  })

  const handleStartCall = async () => {
    if (!currentLead) return
    timer.start()
    setPhase('calling')
    await upsertSession(currentLead.id)
  }

  const handleEndCall = () => {
    const dur = timer.stop(); setCallDuration(dur); setPhase('logging')
  }

  const handleLogOutcome = async (status: LeadStatus) => {
    if (!currentLead) return
    await logCallMutation.mutateAsync({ lead: currentLead, status, durationSeconds: callDuration, notes, nextCallAt })
    setNotes(''); setNextCallAt(''); setCallDuration(0); timer.reset(); setPhase('idle')
    setSessionLeadIndex(i => Math.min(i + 1, fullQueue.length - 1))
  }

  const handleSkip = async () => {
    await upsertSession(null); timer.reset(); setPhase('idle')
    setNotes(''); setNextCallAt(''); setCallDuration(0)
    setSessionLeadIndex(i => Math.min(i + 1, fullQueue.length - 1))
  }

  const todayCount    = todayLogs.length
  const todayDuration = todayLogs.reduce((s, l) => s + (l.duration_seconds ?? 0), 0)
  const todayRdv      = todayLogs.filter(l => l.status === 'rdv_pris').length
  const avgDuration   = todayCount > 0 ? Math.round(todayDuration / todayCount) : 0
  const isUrgent      = currentLead ? urgentRappels.some(r => r.id === currentLead.id) : false

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-fourmiliance-mid border-t-transparent rounded-full animate-spin" role="status" aria-label="Chargement" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Stats du jour */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Appels',    value: todayCount,                                     accent: 'text-fourmiliance-forest' },
          { label: 'RDV pris',  value: todayRdv,                                       accent: 'text-emerald-600' },
          { label: 'Durée moy', value: `${Math.floor(avgDuration / 60)}:${String(avgDuration % 60).padStart(2, '0')}`, accent: 'text-blue-600' },
          { label: 'Temp total', value: `${Math.floor(todayDuration / 60)}min`,        accent: 'text-fourmiliance-ghost' },
        ].map(({ label, value, accent }) => (
          <div key={label} className="bg-white rounded-2xl border border-fourmiliance-border p-4 text-center">
            <p className={`text-2xl font-bold tabular-nums font-mono ${accent}`}>{value}</p>
            <p className="text-xs text-fourmiliance-ghost mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Objectif journalier */}
      <DailyGoalBar
        done={todayCount}
        goal={dailyGoal}
        onChangeGoal={setDailyGoalState}
      />

      {/* Rappels urgents */}
      {urgentRappels.length > 0 && phase === 'idle' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3">
          <p className="text-xs font-semibold text-yellow-800 flex items-center gap-1.5 mb-2">
            <CalendarClock size={13} aria-hidden="true" />
            {urgentRappels.length} rappel{urgentRappels.length > 1 ? 's' : ''} en retard
          </p>
          <div className="space-y-1">
            {urgentRappels.slice(0, 3).map(r => (
              <div key={r.id} className="flex items-center gap-2 text-xs text-yellow-900">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 flex-shrink-0" aria-hidden="true" />
                <span className="font-medium truncate flex-1">{r.company_name}</span>
                {r.next_call_at && (
                  <span className="text-yellow-600 flex-shrink-0">
                    {new Date(r.next_call_at).toLocaleString('fr-FR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progression dans la file */}
      {fullQueue.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-fourmiliance-mid rounded-full transition-all"
              style={{ width: `${(sessionLeadIndex / fullQueue.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-fourmiliance-ghost tabular-nums flex-shrink-0">
            {sessionLeadIndex}/{fullQueue.length}
          </span>
        </div>
      )}

      {/* Carte principale — lead courant */}
      {!currentLead ? (
        <div className="bg-white rounded-2xl border border-fourmiliance-border p-12 text-center">
          <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-3" aria-hidden="true" />
          <p className="font-heading text-xl text-fourmiliance-forest">File terminée !</p>
          <p className="text-sm text-fourmiliance-ghost mt-1">
            {todayCount} appel{todayCount > 1 ? 's' : ''} aujourd'hui · {todayRdv} RDV
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-fourmiliance-border overflow-hidden">

          {/* En-tête entreprise */}
          <div className={`px-6 pt-6 pb-4 border-b border-fourmiliance-border ${isUrgent ? 'bg-yellow-50' : ''}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-heading text-2xl text-fourmiliance-forest leading-tight">
                  {currentLead.company_name}
                </h2>
                {currentLead.contact_name && (
                  <p className="text-sm text-fourmiliance-ghost mt-0.5">{currentLead.contact_name}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${LEAD_STATUS_COLORS[currentLead.status]}`}>
                  {LEAD_STATUS_LABELS[currentLead.status]}
                </span>
                {isUrgent && (
                  <span className="text-[10px] font-semibold text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded">
                    RAPPEL URGENT
                  </span>
                )}
              </div>
            </div>

            {/* Téléphone central */}
            {currentLead.phone ? (
              <a
                href={`tel:${currentLead.phone}`}
                className="mt-4 flex items-center gap-3 group"
                aria-label={`Appeler le ${currentLead.phone}`}
              >
                <Phone size={20} className="text-fourmiliance-mid flex-shrink-0" aria-hidden="true" />
                <span className="text-3xl font-mono tabular-nums font-semibold text-fourmiliance-forest tracking-wide group-hover:text-fourmiliance-mid transition-colors">
                  {currentLead.phone}
                </span>
              </a>
            ) : (
              <div className="mt-4 flex items-center gap-3 text-fourmiliance-ghost">
                <Phone size={20} aria-hidden="true" />
                <span className="text-lg italic">Numéro non disponible — enrichir via la liste leads</span>
              </div>
            )}
          </div>

          {/* Corps */}
          <div className="px-6 py-5 space-y-5">

            {/* Contexte + pitch produit */}
            <LeadContextCard lead={currentLead} products={products} />

            {/* IDLE → appeler */}
            {phase === 'idle' && (
              <div className="flex gap-3">
                <button
                  onClick={handleStartCall}
                  disabled={!currentLead.phone}
                  className="flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-fourmiliance-mid text-white font-semibold text-lg hover:bg-fourmiliance-forest transition active:scale-95 disabled:opacity-40 min-h-[64px]"
                >
                  <Phone size={22} aria-hidden="true" />
                  Appeler
                </button>
                <button
                  onClick={handleSkip}
                  className="px-4 py-4 rounded-2xl border border-fourmiliance-border text-fourmiliance-ghost hover:bg-gray-50 transition min-h-[64px]"
                  aria-label="Passer ce lead"
                >
                  <SkipForward size={20} aria-hidden="true" />
                </button>
              </div>
            )}

            {/* CALLING → timer + raccrocher */}
            {phase === 'calling' && (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-4 py-4 bg-emerald-50 rounded-2xl">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                  <span
                    className="text-4xl font-mono tabular-nums font-bold text-emerald-700"
                    role="timer"
                    aria-label={`Durée : ${timer.formatted}`}
                    aria-live="off"
                  >
                    {timer.formatted}
                  </span>
                  <Clock size={20} className="text-emerald-600" aria-hidden="true" />
                </div>
                <button
                  onClick={handleEndCall}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-red-500 text-white font-semibold text-lg hover:bg-red-600 transition active:scale-95 min-h-[64px]"
                >
                  <PhoneOff size={22} aria-hidden="true" />
                  Raccrocher
                </button>
              </div>
            )}

            {/* LOGGING → statuts + notes */}
            {phase === 'logging' && (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-fourmiliance-ink">
                  Résultat de l'appel
                  <span className="ml-2 font-mono text-xs text-fourmiliance-ghost tabular-nums">
                    ({timer.formatted})
                  </span>
                </p>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {CALL_OUTCOME_STATUSES.map(status => {
                    const cfg = OUTCOME_CONFIG[status]
                    return (
                      <button
                        key={status}
                        onClick={() => handleLogOutcome(status)}
                        disabled={logCallMutation.isPending}
                        className={`flex flex-col items-center justify-center gap-2 px-3 py-4 rounded-xl border-2 font-medium text-sm transition active:scale-95 min-h-[80px] ${cfg.color} disabled:opacity-50`}
                      >
                        {cfg.icon}
                        {LEAD_STATUS_LABELS[status]}
                      </button>
                    )
                  })}
                </div>

                <div>
                  <label htmlFor="next-call" className="flex items-center gap-1.5 text-sm text-fourmiliance-ghost mb-1.5">
                    <CalendarClock size={13} aria-hidden="true" />
                    Rappel le (optionnel)
                  </label>
                  <input
                    id="next-call"
                    type="datetime-local"
                    value={nextCallAt}
                    onChange={e => setNextCallAt(e.target.value)}
                    className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid"
                  />
                </div>

                <div>
                  <label htmlFor="call-notes" className="flex items-center gap-1.5 text-sm text-fourmiliance-ghost mb-1.5">
                    <StickyNote size={13} aria-hidden="true" />
                    Notes (optionnel)
                  </label>
                  <textarea
                    id="call-notes"
                    ref={notesRef}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Résumé de l'échange..."
                    className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Historique du jour */}
      {todayLogs.length > 0 && (
        <div className="bg-white rounded-2xl border border-fourmiliance-border overflow-hidden">
          <div className="px-5 py-4 border-b border-fourmiliance-border flex items-center justify-between">
            <h3 className="font-semibold text-fourmiliance-ink text-sm">Appels du jour</h3>
            <div className="flex gap-3 text-xs text-fourmiliance-ghost">
              <span className="tabular-nums">{todayCount} appels</span>
              <span className="tabular-nums">{Math.floor(todayDuration / 60)}min</span>
              <span className="text-emerald-600 font-medium tabular-nums">{todayRdv} RDV</span>
            </div>
          </div>
          <ul className="divide-y divide-fourmiliance-border">
            {todayLogs.slice(0, 10).map(log => (
              <li key={log.id} className="flex items-center gap-3 px-5 py-3">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  log.status === 'rdv_pris' ? 'bg-emerald-500' :
                  log.status === 'refus'    ? 'bg-red-400' :
                  log.status === 'rappel'   ? 'bg-yellow-400' : 'bg-gray-300'
                }`} aria-hidden="true" />
                <span className="text-sm font-medium text-fourmiliance-ink truncate flex-1">
                  {log.lead?.company_name ?? '—'}
                </span>
                <span className="text-xs text-fourmiliance-ghost flex-shrink-0">
                  {LEAD_STATUS_LABELS[log.status as LeadStatus]}
                </span>
                {log.duration_seconds != null && (
                  <span className="text-xs text-fourmiliance-ghost tabular-nums flex-shrink-0 font-mono">
                    {Math.floor(log.duration_seconds / 60)}:{String(log.duration_seconds % 60).padStart(2, '0')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Indicateur TrendingUp */}
      {todayLogs.length > 0 && (
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-white rounded-xl border border-fourmiliance-border p-3">
            <p className="text-xs text-fourmiliance-ghost mb-0.5">Taux réponse</p>
            <p className="text-lg font-bold tabular-nums text-fourmiliance-forest">
              {Math.round((todayLogs.filter(l => l.status !== 'pas_repondu').length / Math.max(1, todayCount)) * 100)}%
            </p>
          </div>
          <div className="bg-white rounded-xl border border-fourmiliance-border p-3">
            <p className="text-xs text-fourmiliance-ghost mb-0.5">Taux RDV</p>
            <p className="text-lg font-bold tabular-nums text-emerald-600">
              {Math.round((todayRdv / Math.max(1, todayCount)) * 100)}%
            </p>
          </div>
          <div className="bg-white rounded-xl border border-fourmiliance-border p-3">
            <p className="text-xs text-fourmiliance-ghost mb-0.5">File restante</p>
            <p className="text-lg font-bold tabular-nums text-fourmiliance-forest">
              {Math.max(0, fullQueue.length - sessionLeadIndex)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
