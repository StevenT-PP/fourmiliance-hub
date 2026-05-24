import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, Clock, Percent } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Invoice, Contact } from '../../types'

// ─── Type local ────────────────────────────────────────────────────────────────
interface InvoiceRow extends Invoice {
  contact: Pick<Contact, 'id' | 'company' | 'contact_name'> | null
}
import { formatCurrency } from '../../lib/utils'
import FundTracker from './FundTracker'
import InvoiceList from './InvoiceList'

// ─── Types locaux ─────────────────────────────────────────────────────────────

interface MonthBar {
  label: string
  amount: number
  isCurrent: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function monthLabel(date: Date): string {
  return date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
}

function last12Months(): { key: string; label: string; isCurrent: boolean }[] {
  const now = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: monthLabel(d),
      isCurrent: i === 11,
    }
  })
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function FinancePage() {
  const now = new Date()
  const ytdStart = `${now.getFullYear()}-01-01`

  // Toutes les factures
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, contact:contact_id(id, company, contact_name)')
        .order('issued_date', { ascending: false })
      if (error) throw error
      return (data ?? []) as InvoiceRow[]
    },
  })

  // Contacts (pour taux de transformation)
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-pipeline'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('pipeline_stage')
      if (error) throw error
      return (data ?? []) as { pipeline_stage: string }[]
    },
  })

  // ── KPIs ──
  const kpis = useMemo(() => {
    const paid = invoices.filter(
      i => i.status === 'paye' && i.issued_date >= ytdStart
    )
    const caYtd = paid.reduce((s, i) => s + (i.amount_ttc ?? 0), 0)

    const pending = invoices.filter(
      i => i.status === 'en_attente' || i.status === 'envoye'
    )
    const pendingTotal = pending.reduce((s, i) => s + (i.amount_ttc ?? 0), 0)

    const contacted = contacts.filter(
      c => !['prospect', 'archive', 'perdu'].includes(c.pipeline_stage)
    ).length
    const signed = contacts.filter(
      c => ['signe', 'en_cours', 'livre'].includes(c.pipeline_stage)
    ).length
    const convRate = contacted > 0 ? Math.round((signed / contacted) * 100) : 0

    return { caYtd, pendingTotal, convRate }
  }, [invoices, contacts, ytdStart])

  // ── Graphique CA 12 mois ──
  const chartBars = useMemo((): MonthBar[] => {
    const months = last12Months()
    const paidInvoices = invoices.filter(i => i.status === 'paye')
    return months.map(m => {
      const amount = paidInvoices
        .filter(i => i.issued_date?.startsWith(m.key))
        .reduce((s, i) => s + (i.amount_ttc ?? 0), 0)
      return { label: m.label, amount, isCurrent: m.isCurrent }
    })
  }, [invoices])

  const maxBar = Math.max(...chartBars.map(b => b.amount), 1)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-[#E0DAD0] border-l-4 border-l-[#E0DAD0] p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 bg-[#E0DAD0] rounded" />
                <div className="h-3 w-24 bg-[#E0DAD0] rounded" />
              </div>
              <div className="h-7 w-28 bg-[#E0DAD0] rounded mb-1" />
              <div className="h-3 w-20 bg-[#E0DAD0] rounded" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-[#E0DAD0] p-6 animate-pulse">
          <div className="h-4 w-48 bg-[#E0DAD0] rounded mb-6" />
          <div className="flex items-end gap-1.5 h-36">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-[#E0DAD0] rounded-t" style={{ height: `${20 + Math.random() * 60}%` }} />
                <div className="h-2 w-6 bg-[#E0DAD0] rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── KPI cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          icon={<TrendingUp className="w-5 h-5 text-fourmiliance-mid" />}
          label={`CA ${now.getFullYear()}`}
          value={formatCurrency(kpis.caYtd)}
          sub="factures payées"
          accent="green"
        />
        <KpiCard
          icon={<Clock className="w-5 h-5 text-amber-500" />}
          label="En attente"
          value={formatCurrency(kpis.pendingTotal)}
          sub="factures envoyées"
          accent="amber"
        />
        <KpiCard
          icon={<Percent className="w-5 h-5 text-sky-500" />}
          label="Taux de conversion"
          value={`${kpis.convRate} %`}
          sub="prospects → signés"
          accent="sky"
        />
      </div>

      {/* ── Graphique CA mensuel ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#E0DAD0] p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading text-base text-fourmiliance-forest">
            CA mensuel — 12 derniers mois
          </h2>
          {maxBar > 0 && (
            <span className="text-xs text-[#9A9A9A]">
              Max : {formatCurrency(maxBar)}
            </span>
          )}
        </div>
        {maxBar === 0 ? (
          <div className="h-36 flex flex-col items-center justify-center gap-2">
            <TrendingUp className="w-8 h-8 text-[#C0B8B0]" aria-hidden="true" />
            <p className="text-sm text-[#9A9A9A]">Aucune facture payée sur cette période</p>
          </div>
        ) : (
          <div role="img" aria-label="Graphique du chiffre d'affaires mensuel sur 12 mois">
            <div className="flex items-end gap-1.5 h-36">
              {chartBars.map(bar => {
                const heightPct = maxBar > 0 ? (bar.amount / maxBar) * 100 : 0
                return (
                  <div key={bar.label} className="flex-1 flex flex-col items-center gap-1 group relative">
                    {/* Tooltip valeur */}
                    {bar.amount > 0 && (
                      <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-fourmiliance-forest text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {formatCurrency(bar.amount)}
                      </span>
                    )}
                    <div
                      aria-label={`${bar.label} : ${formatCurrency(bar.amount)}`}
                      className={`w-full rounded-t transition-all cursor-default
                        ${bar.isCurrent ? 'bg-fourmiliance-ocre' : 'bg-fourmiliance-mid/40 group-hover:bg-fourmiliance-mid/60'}
                        ${bar.amount === 0 ? 'opacity-20' : ''}
                      `}
                      style={{ height: `${Math.max(heightPct, bar.amount > 0 ? 4 : 1)}%` }}
                    />
                    <span className="text-[10px] text-[#9A9A9A] text-center leading-none">
                      {bar.label}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#F0EBE4]">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-fourmiliance-mid/40" />
                <span className="text-[10px] text-[#9A9A9A]">Mois précédents</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-fourmiliance-ocre" />
                <span className="text-[10px] text-[#9A9A9A]">Mois en cours</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Devis & Factures ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#E0DAD0] p-6">
        <h2 className="font-heading text-base text-fourmiliance-forest mb-4">
          Devis &amp; Factures
        </h2>
        <InvoiceList />
      </div>

      {/* ── Tracker fonds Fourmiliance ───────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-fourmiliance-ocre/30 p-6">
        <FundTracker />
      </div>

    </div>
  )
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  accent: 'green' | 'amber' | 'sky'
}) {
  const border = {
    green: 'border-l-fourmiliance-mid',
    amber: 'border-l-amber-400',
    sky:   'border-l-sky-400',
  }[accent]

  return (
    <div className={`bg-white rounded-xl border border-[#E0DAD0] border-l-4 ${border} p-5`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-xs font-semibold text-[#7A7A7A] uppercase tracking-wide">{label}</span>
      </div>
      <p className="font-heading text-2xl text-fourmiliance-forest font-semibold">{value}</p>
      <p className="text-xs text-[#9A9A9A] mt-1">{sub}</p>
    </div>
  )
}
