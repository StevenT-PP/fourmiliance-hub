import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth.tsx'
import type { FundTransaction } from '../../types'
import { FUND_OBJECTIVE, FUND_MILESTONES } from '../../lib/constants'
import { formatCurrency, formatDate } from '../../lib/utils'
import { Plus, X, TrendingUp, Leaf } from 'lucide-react'

// ─── Composant principal ──────────────────────────────────────────────────────

export default function FundTracker({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['fund-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fund_transactions')
        .select('*')
        .order('date', { ascending: false })
      if (error) throw error
      return (data ?? []) as FundTransaction[]
    },
  })

  const totalVerse = transactions
    .filter(t => t.direction === 'versement')
    .reduce((s, t) => s + t.amount, 0)

  const totalRetrait = transactions
    .filter(t => t.direction === 'retrait')
    .reduce((s, t) => s + t.amount, 0)

  const solde = totalVerse - totalRetrait
  const pct   = Math.min((solde / FUND_OBJECTIVE) * 100, 100)

  const nextMilestone = FUND_MILESTONES.find(m => m.amount > solde)

  if (isLoading) return (
    <div className="flex justify-center py-4">
      <div className="w-6 h-6 border-2 border-fourmiliance-ocre border-t-transparent rounded-full animate-spin" role="status" aria-label="Chargement des données du fonds" />
    </div>
  )

  return (
    <div>
      {/* Solde */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Leaf className="w-5 h-5 text-fourmiliance-ocre" />
            <span className="text-xs font-semibold text-fourmiliance-muted uppercase tracking-wide">
              Fonds foncier
            </span>
          </div>
          <p className="font-heading text-3xl text-fourmiliance-ocre font-semibold">
            {formatCurrency(solde)}
          </p>
          <p className="text-xs text-fourmiliance-ghost mt-0.5">
            sur {formatCurrency(FUND_OBJECTIVE)} objectif
          </p>
        </div>
        {!compact && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 text-sm bg-fourmiliance-ocre text-white
                       px-3 py-1.5 rounded-lg hover:bg-fourmiliance-ocre-dark transition-colors flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Versement
          </button>
        )}
      </div>

      {/* Barre de progression avec jalons */}
      <div className="relative mb-2">
        <div
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Fonds foncier : ${formatCurrency(solde)} sur ${formatCurrency(FUND_OBJECTIVE)} (${Math.round(pct)}%)`}
          className="h-3 bg-fourmiliance-border rounded-full overflow-hidden"
        >
          <div
            className="h-full bg-fourmiliance-ocre rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        {/* Marqueurs jalons */}
        {FUND_MILESTONES.map(ms => {
          const pos = (ms.amount / FUND_OBJECTIVE) * 100
          const reached = solde >= ms.amount
          return (
            <div
              key={ms.amount}
              className="absolute top-0 -translate-x-1/2"
              style={{ left: `${pos}%` }}
              title={`${ms.label} — ${formatCurrency(ms.amount)}`}
            >
              <div className={`w-1 h-3 ${reached ? 'bg-fourmiliance-ocre-dark' : 'bg-fourmiliance-disabled'}`} />
            </div>
          )
        })}
      </div>

      {/* Légende jalons */}
      {!compact && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-5">
          {FUND_MILESTONES.map(ms => {
            const reached = solde >= ms.amount
            return (
              <span key={ms.amount} className="text-[10px] text-fourmiliance-ghost">
                <span className={reached ? 'text-fourmiliance-ocre font-medium' : ''}>{ms.label}</span>
                {' '}— {formatCurrency(ms.amount)}
              </span>
            )
          })}
        </div>
      )}

      {/* Prochain jalon */}
      {nextMilestone && !compact && (
        <div className="bg-fourmiliance-ocre/8 border border-fourmiliance-ocre/20 rounded-lg px-4 py-3 mb-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-fourmiliance-ocre" />
            <p className="text-sm text-fourmiliance-tertiary">
              Prochain objectif :{' '}
              <strong className="text-fourmiliance-ocre">{nextMilestone.label}</strong>
              {' '}— encore{' '}
              <strong>{formatCurrency(nextMilestone.amount - solde)}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Historique (mode complet uniquement) */}
      {!compact && transactions.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-fourmiliance-muted uppercase tracking-wide mb-3">
            Historique des versements
          </h3>
          <div className="space-y-2">
            {transactions.slice(0, 8).map(t => (
              <div key={t.id}
                className="flex items-center gap-3 text-sm">
                <span className={`w-2 h-2 rounded-full flex-shrink-0
                  ${t.direction === 'versement' ? 'bg-fourmiliance-ocre' : 'bg-fourmiliance-rust'}`} />
                <span className="flex-1 text-fourmiliance-body truncate">{t.description ?? '—'}</span>
                <span className={`font-semibold tabular-nums flex-shrink-0
                  ${t.direction === 'versement' ? 'text-fourmiliance-ocre' : 'text-fourmiliance-rust'}`}>
                  {t.direction === 'retrait' ? '-' : '+'}{formatCurrency(t.amount)}
                </span>
                <span className="text-xs text-fourmiliance-ghost flex-shrink-0">
                  {formatDate(t.date)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal versement */}
      {showModal && (
        <VersementModal
          userId={user?.id ?? null}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false)
            void queryClient.invalidateQueries({ queryKey: ['fund-transactions'] })
          }}
        />
      )}
    </div>
  )
}

// ─── Modal versement ──────────────────────────────────────────────────────────

function VersementModal({
  userId,
  onClose,
  onSaved,
}: {
  userId: string | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    amount:      '',
    direction:   'versement' as 'versement' | 'retrait',
    description: '',
    reference:   '',
    date:        new Date().toISOString().slice(0, 10),
  })
  const [saving, setSaving] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.amount) return
    setSaving(true)
    await supabase.from('fund_transactions').insert({
      amount:      parseFloat(form.amount),
      direction:   form.direction,
      description: form.description || null,
      reference:   form.reference   || null,
      date:        form.date,
      created_by:  userId,
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="versement-title"
        className="bg-white rounded-2xl shadow-xl w-full max-w-md"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-fourmiliance-border">
          <h3 id="versement-title" className="font-heading text-base text-fourmiliance-forest">
            Enregistrer un mouvement
          </h3>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="text-fourmiliance-ghost hover:text-fourmiliance-tertiary min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={e => void handleSave(e)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="vm-direction" className="block text-xs font-medium text-fourmiliance-tertiary mb-1">Type</label>
              <select
                id="vm-direction"
                value={form.direction}
                onChange={e => setForm(f => ({ ...f, direction: e.target.value as 'versement' | 'retrait' }))}
                className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-fourmiliance-ocre/30"
              >
                <option value="versement">Versement</option>
                <option value="retrait">Retrait</option>
              </select>
            </div>
            <div>
              <label htmlFor="vm-amount" className="block text-xs font-medium text-fourmiliance-tertiary mb-1">Montant (€) *</label>
              <input
                id="vm-amount"
                required
                aria-required="true"
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-fourmiliance-ocre/30"
              />
            </div>
          </div>

          <div>
            <label htmlFor="vm-desc" className="block text-xs font-medium text-fourmiliance-tertiary mb-1">Description</label>
            <input
              id="vm-desc"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Ex : 10% CA avril 2026"
              className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-fourmiliance-ocre/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="vm-ref" className="block text-xs font-medium text-fourmiliance-tertiary mb-1">Réf. facture</label>
              <input
                id="vm-ref"
                value={form.reference}
                onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                placeholder="F-2026-042"
                className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-fourmiliance-ocre/30"
              />
            </div>
            <div>
              <label htmlFor="vm-date" className="block text-xs font-medium text-fourmiliance-tertiary mb-1">Date</label>
              <input
                id="vm-date"
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-fourmiliance-ocre/30"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-fourmiliance-tertiary hover:text-fourmiliance-forest">
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-fourmiliance-ocre text-white text-sm rounded-lg
                         hover:bg-fourmiliance-ocre-dark transition-colors disabled:opacity-50"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
