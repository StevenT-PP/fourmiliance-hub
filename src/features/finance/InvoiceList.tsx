import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, CheckCircle, Send, Clock, Plus, SlidersHorizontal } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Contact, Invoice } from '../../types'
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
  type InvoiceStatus,
} from '../../lib/constants'
import { formatCurrency, formatDate } from '../../lib/utils'
import InvoiceForm from './InvoiceForm'

// ─── Types ────────────────────────────────────────────────────────────────────

interface InvoiceRow extends Invoice {
  contact: Pick<Contact, 'id' | 'company' | 'contact_name'> | null
}

// ─── PDF download helper (dynamic import — chargé uniquement au clic) ────────

async function downloadPDF(inv: InvoiceRow) {
  const [{ pdf }, { default: InvoicePDF }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./InvoicePDF'),
  ])
  const element = <InvoicePDF invoice={inv} />
  const blob = await pdf(element).toBlob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${inv.number}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function effectiveStatus(inv: InvoiceRow): InvoiceStatus {
  const isLate =
    (inv.status === 'en_attente' || inv.status === 'envoye') &&
    inv.due_date != null &&
    inv.due_date < new Date().toISOString().slice(0, 10)
  return isLate ? 'en_retard' : (inv.status as InvoiceStatus)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function InvoiceList() {
  const qc = useQueryClient()
  const [showForm, setShowForm]       = useState(false)
  const [typeFilter, setTypeFilter]   = useState<'all' | 'devis' | 'facture'>('all')
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all')

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, contact:contact_id(id, company, contact_name)')
        .order('issued_date', { ascending: false })
      if (error) throw error
      return (data ?? []) as InvoiceRow[]
    },
  })

  const filtered = invoices.filter(inv => {
    if (typeFilter !== 'all' && inv.type !== typeFilter) return false
    if (statusFilter !== 'all' && effectiveStatus(inv) !== statusFilter) return false
    return true
  })

  async function changeStatus(id: string, status: InvoiceStatus) {
    await supabase
      .from('invoices')
      .update({ status, ...(status === 'paye' ? { paid_date: new Date().toISOString().slice(0, 10) } : {}) })
      .eq('id', id)
    qc.invalidateQueries({ queryKey: ['invoices'] })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-fourmiliance-mid border-t-transparent rounded-full animate-spin" role="status" aria-label="Chargement des documents" />
      </div>
    )
  }

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <SlidersHorizontal className="w-4 h-4 text-fourmiliance-ghost" />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as typeof typeFilter)}
            className="border border-fourmiliance-border rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-fourmiliance-mid"
          >
            <option value="all">Tous types</option>
            <option value="facture">Factures</option>
            <option value="devis">Devis</option>
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
            className="border border-fourmiliance-border rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-fourmiliance-mid"
          >
            <option value="all">Tous statuts</option>
            {(
              ['brouillon', 'envoye', 'en_attente', 'paye', 'en_retard', 'annule'] as InvoiceStatus[]
            ).map(s => (
              <option key={s} value={s}>{INVOICE_STATUS_LABELS[s]}</option>
            ))}
          </select>
          <span className="text-xs text-fourmiliance-ghost">
            {filtered.length} document{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-fourmiliance-mid hover:bg-fourmiliance-light text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouveau document
        </button>
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <p className="text-sm text-fourmiliance-ghost py-8 text-center">Aucun document trouvé.</p>
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className="text-left border-b border-fourmiliance-border">
                {['N°', 'Type', 'Client', 'Émis le', 'TTC', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="pb-2 px-2 text-xs font-semibold text-fourmiliance-muted uppercase tracking-wide last:text-right">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-fourmiliance-track">
              {filtered.map(inv => {
                const eff = effectiveStatus(inv)
                return (
                  <tr key={inv.id} className="hover:bg-fourmiliance-surface">

                    {/* N° */}
                    <td className="px-2 py-3 font-mono text-xs text-fourmiliance-tertiary whitespace-nowrap">
                      {inv.number}
                    </td>

                    {/* Type */}
                    <td className="px-2 py-3">
                      <span className={`badge ${inv.type === 'devis' ? 'badge-warm' : 'badge-pine'}`}>
                        {inv.type === 'devis' ? 'Devis' : 'Facture'}
                      </span>
                    </td>

                    {/* Client */}
                    <td className="px-2 py-3 text-fourmiliance-body truncate max-w-[130px]">
                      {inv.contact?.company ?? '—'}
                    </td>

                    {/* Date */}
                    <td className="px-2 py-3 text-fourmiliance-muted text-xs whitespace-nowrap">
                      {inv.issued_date ? formatDate(inv.issued_date) : '—'}
                    </td>

                    {/* Montant */}
                    <td className="px-2 py-3 font-semibold text-fourmiliance-body whitespace-nowrap">
                      {formatCurrency(inv.amount_ttc ?? 0)}
                    </td>

                    {/* Statut */}
                    <td className="px-2 py-3">
                      <span className={`badge ${eff === 'en_retard' ? 'badge-rust' : (INVOICE_STATUS_COLORS[inv.status as InvoiceStatus] ?? 'badge-neutral')}`}>
                        {INVOICE_STATUS_LABELS[eff]}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-2 py-3">
                      <div className="flex items-center justify-end gap-1">

                        {/* Télécharger PDF */}
                        <button
                          aria-label={`Télécharger le PDF ${inv.number}`}
                          onClick={() => downloadPDF(inv)}
                          className="p-2 rounded hover:bg-fourmiliance-track text-fourmiliance-ghost hover:text-fourmiliance-mid transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                        >
                          <Download className="w-4 h-4" aria-hidden="true" />
                        </button>

                        {/* Marquer envoyé */}
                        {inv.status === 'brouillon' && (
                          <button
                            aria-label={`Marquer ${inv.number} comme envoyé`}
                            onClick={() => changeStatus(inv.id, 'envoye')}
                            className="p-2 rounded hover:bg-fourmiliance-surface text-fourmiliance-ghost hover:text-fourmiliance-mid transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                          >
                            <Send className="w-4 h-4" aria-hidden="true" />
                          </button>
                        )}

                        {/* Marquer en attente */}
                        {inv.status === 'envoye' && (
                          <button
                            aria-label={`Marquer ${inv.number} en attente de paiement`}
                            onClick={() => changeStatus(inv.id, 'en_attente')}
                            className="p-2 rounded hover:bg-fourmiliance-warm-bg text-fourmiliance-ghost hover:text-fourmiliance-ocre transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                          >
                            <Clock className="w-4 h-4" aria-hidden="true" />
                          </button>
                        )}

                        {/* Marquer payé */}
                        {(inv.status === 'envoye' || inv.status === 'en_attente' || eff === 'en_retard') && (
                          <button
                            aria-label={`Marquer ${inv.number} comme payé`}
                            onClick={() => changeStatus(inv.id, 'paye')}
                            className="p-2 rounded hover:bg-fourmiliance-success-bg text-fourmiliance-ghost hover:text-fourmiliance-mid transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                          >
                            <CheckCircle className="w-4 h-4" aria-hidden="true" />
                          </button>
                        )}

                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Formulaire modal ── */}
      {showForm && (
        <InvoiceForm
          onClose={() => setShowForm(false)}
          onSuccess={() => setShowForm(false)}
        />
      )}
    </>
  )
}
