import { useState, useMemo } from 'react'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { X, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Contact, Project } from '../../types'
import { formatCurrency } from '../../lib/utils'
import { useAuth } from '../../hooks/useAuth'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItem {
  description: string
  quantity: number
  unit_price: number
}

interface FormState {
  type: 'devis' | 'facture'
  contact_id: string
  project_id: string
  issued_date: string
  due_date: string
  tva_rate: number
  notes: string
  items: LineItem[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function in30Days(): string {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().slice(0, 10)
}

const DEFAULT: FormState = {
  type:        'facture',
  contact_id:  '',
  project_id:  '',
  issued_date: todayStr(),
  due_date:    in30Days(),
  tva_rate:    20,
  notes:       '',
  items:       [{ description: '', quantity: 1, unit_price: 0 }],
}

async function generateNumber(type: 'devis' | 'facture'): Promise<string> {
  const year   = new Date().getFullYear()
  const prefix = type === 'devis' ? 'D' : 'F'
  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('type', type)
    .gte('issued_date', `${year}-01-01`)
  return `${prefix}-${year}-${String((count ?? 0) + 1).padStart(3, '0')}`
}

// ─── Component ────────────────────────────────────────────────────────────────

interface InvoiceFormProps {
  onClose:   () => void
  onSuccess: () => void
}

export default function InvoiceForm({ onClose, onSuccess }: InvoiceFormProps) {
  const { user }   = useAuth()
  const qc         = useQueryClient()
  const [form, setForm]     = useState<FormState>(DEFAULT)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  // ── Fetching contacts & projects for selects ─────────────────────────────────

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-select'],
    queryFn:  async () => {
      const { data } = await supabase
        .from('contacts')
        .select('id, company, contact_name')
        .order('company')
      return (data ?? []) as Pick<Contact, 'id' | 'company' | 'contact_name'>[]
    },
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-select'],
    queryFn:  async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, name, contact_id')
        .in('status', ['briefing', 'maquette', 'developpement', 'validation'])
        .order('name')
      return (data ?? []) as Pick<Project, 'id' | 'name' | 'contact_id'>[]
    },
  })

  const filteredProjects = useMemo(
    () => form.contact_id
      ? projects.filter(p => p.contact_id === form.contact_id)
      : projects,
    [projects, form.contact_id],
  )

  // ── Computed totals ───────────────────────────────────────────────────────────

  const amountHt = useMemo(
    () => form.items.reduce((s, i) => s + i.quantity * i.unit_price, 0),
    [form.items],
  )
  const tvaAmt = amountHt * (form.tva_rate / 100)
  const ttc    = amountHt + tvaAmt

  // ── State helpers ─────────────────────────────────────────────────────────────

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function setItem(idx: number, key: keyof LineItem, raw: string) {
    setForm(prev => {
      const items = [...prev.items]
      items[idx] = {
        ...items[idx],
        [key]: key === 'description' ? raw : parseFloat(raw) || 0,
      }
      return { ...prev, items }
    })
  }

  function addItem() {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unit_price: 0 }],
    }))
  }

  function removeItem(idx: number) {
    setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))
  }

  // ── Submit ────────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.items.length === 0) { setError('Ajoutez au moins une ligne.'); return }
    if (form.items.some(i => !i.description.trim())) {
      setError('Chaque ligne doit avoir une désignation.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const number    = await generateNumber(form.type)
      const lineItems = form.items.map(i => ({
        description: i.description,
        quantity:    i.quantity,
        unit_price:  i.unit_price,
        total:       i.quantity * i.unit_price,
      }))

      const { error: err } = await supabase.from('invoices').insert({
        number,
        type:       form.type,
        contact_id: form.contact_id  || null,
        project_id: form.project_id  || null,
        amount_ht:  amountHt,
        tva_rate:   form.tva_rate,
        issued_date: form.issued_date,
        due_date:   form.due_date    || null,
        notes:      form.notes       || null,
        line_items: lineItems,
        status:     'brouillon',
      })
      if (err) throw err

      await supabase.from('activity_log').insert({
        user_id:      user?.id ?? null,
        action:       form.type === 'devis' ? 'devis_created' : 'invoice_created',
        entity_type:  'invoice',
        entity_label: number,
      })

      qc.invalidateQueries({ queryKey: ['invoices'] })
      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la création.')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0DAD0]">
          <h2 className="font-heading text-lg text-fourmiliance-forest">
            Nouveau document
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#F0EBE4] transition-colors"
          >
            <X className="w-5 h-5 text-[#7A7A7A]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">

            {/* Type */}
            <div>
              <span className="text-xs font-semibold text-[#7A7A7A] uppercase tracking-wide mb-2 block">
                Type de document
              </span>
              <div className="flex gap-3">
                {(['facture', 'devis'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set('type', t)}
                    className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all
                      ${form.type === t
                        ? 'bg-fourmiliance-mid text-white border-fourmiliance-mid'
                        : 'bg-white text-[#5A5A5A] border-[#E0DAD0] hover:border-fourmiliance-mid/50'
                      }`}
                  >
                    {t === 'facture' ? 'Facture' : 'Devis'}
                  </button>
                ))}
              </div>
            </div>

            {/* Client + Projet */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#7A7A7A] uppercase tracking-wide mb-1.5 block">
                  Client
                </label>
                <select
                  value={form.contact_id}
                  onChange={e => { set('contact_id', e.target.value); set('project_id', '') }}
                  className="w-full border border-[#E0DAD0] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-fourmiliance-mid"
                >
                  <option value="">— Sélectionner —</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.company}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#7A7A7A] uppercase tracking-wide mb-1.5 block">
                  Projet (optionnel)
                </label>
                <select
                  value={form.project_id}
                  onChange={e => set('project_id', e.target.value)}
                  className="w-full border border-[#E0DAD0] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-fourmiliance-mid"
                >
                  <option value="">—</option>
                  {filteredProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dates + TVA */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#7A7A7A] uppercase tracking-wide mb-1.5 block">
                  Date d'émission
                </label>
                <input
                  type="date"
                  value={form.issued_date}
                  onChange={e => set('issued_date', e.target.value)}
                  required
                  className="w-full border border-[#E0DAD0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-fourmiliance-mid"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#7A7A7A] uppercase tracking-wide mb-1.5 block">
                  Échéance
                </label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={e => set('due_date', e.target.value)}
                  className="w-full border border-[#E0DAD0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-fourmiliance-mid"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#7A7A7A] uppercase tracking-wide mb-1.5 block">
                  TVA %
                </label>
                <input
                  type="number"
                  value={form.tva_rate}
                  onChange={e => set('tva_rate', parseFloat(e.target.value) || 0)}
                  min={0}
                  max={100}
                  step={0.5}
                  className="w-full border border-[#E0DAD0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-fourmiliance-mid"
                />
              </div>
            </div>

            {/* Line items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#7A7A7A] uppercase tracking-wide">
                  Lignes ({form.items.length})
                </span>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-1 text-xs text-fourmiliance-mid hover:text-fourmiliance-light font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter une ligne
                </button>
              </div>

              <div className="grid grid-cols-[1fr_64px_96px_32px] gap-1.5 mb-1.5 text-xs font-semibold text-[#9A9A9A] uppercase tracking-wide px-0.5">
                <span>Désignation</span>
                <span className="text-right">Qté</span>
                <span className="text-right">PU HT (€)</span>
                <span />
              </div>

              <div className="space-y-1.5">
                {form.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_64px_96px_32px] gap-1.5">
                    <input
                      type="text"
                      value={item.description}
                      onChange={e => setItem(idx, 'description', e.target.value)}
                      placeholder="Description…"
                      className="border border-[#E0DAD0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-fourmiliance-mid"
                    />
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={e => setItem(idx, 'quantity', e.target.value)}
                      min={0}
                      step={0.5}
                      className="border border-[#E0DAD0] rounded-lg px-2 py-2 text-sm text-right focus:outline-none focus:border-fourmiliance-mid"
                    />
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={e => setItem(idx, 'unit_price', e.target.value)}
                      min={0}
                      step={10}
                      className="border border-[#E0DAD0] rounded-lg px-2 py-2 text-sm text-right focus:outline-none focus:border-fourmiliance-mid"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      disabled={form.items.length === 1}
                      className="flex items-center justify-center text-[#9A9A9A] hover:text-red-500 disabled:opacity-30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals preview */}
            <div className="bg-[#F5F0E8] rounded-lg p-4">
              <div className="flex justify-between text-sm text-[#5A5A5A] mb-1">
                <span>Sous-total HT</span>
                <span>{formatCurrency(amountHt)}</span>
              </div>
              <div className="flex justify-between text-sm text-[#5A5A5A] mb-2">
                <span>TVA {form.tva_rate} %</span>
                <span>{formatCurrency(tvaAmt)}</span>
              </div>
              <div className="flex justify-between font-semibold text-fourmiliance-forest border-t border-[#E0DAD0] pt-2">
                <span>Total TTC</span>
                <span className="text-fourmiliance-ocre">{formatCurrency(ttc)}</span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-[#7A7A7A] uppercase tracking-wide mb-1.5 block">
                Notes (optionnel)
              </label>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                rows={2}
                placeholder="Conditions particulières, informations complémentaires…"
                className="w-full border border-[#E0DAD0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-fourmiliance-mid resize-none"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#E0DAD0] flex items-center justify-between bg-white sticky bottom-0">
            <span className="text-xs text-[#9A9A9A]">Numéro généré automatiquement</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-[#5A5A5A] hover:text-[#1A1A1A] transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-fourmiliance-mid hover:bg-fourmiliance-light text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
              >
                {saving
                  ? 'Création…'
                  : `Créer ${form.type === 'devis' ? 'le devis' : 'la facture'}`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
