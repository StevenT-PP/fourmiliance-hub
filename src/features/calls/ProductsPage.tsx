import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Package, Check, Edit2, Euro, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import type { Product } from '../../types'
import {
  PRODUCT_CATEGORY_LABELS, PRODUCT_CATEGORY_COLORS,
  type ProductCategory,
} from '../../lib/constants'

function CategoryBadge({ category }: { category: ProductCategory }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${PRODUCT_CATEGORY_COLORS[category]}`}>
      {PRODUCT_CATEGORY_LABELS[category]}
    </span>
  )
}

interface ProductFormData {
  name: string
  category: ProductCategory
  description: string
  base_price_ht: string
  recurring_price_ht: string
  delivery_days: string
  features: string
}

const EMPTY: ProductFormData = {
  name: '', category: 'site_web', description: '',
  base_price_ht: '', recurring_price_ht: '', delivery_days: '', features: '',
}

function ProductModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Product
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<ProductFormData>(initial ? {
    name: initial.name,
    category: initial.category,
    description: initial.description ?? '',
    base_price_ht: String(initial.base_price_ht),
    recurring_price_ht: initial.recurring_price_ht ? String(initial.recurring_price_ht) : '',
    delivery_days: initial.delivery_days ? String(initial.delivery_days) : '',
    features: initial.features.join('\n'),
  } : EMPTY)
  const [loading, setLoading] = useState(false)

  const set = (k: keyof ProductFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const payload = {
      name: form.name.trim(),
      category: form.category,
      description: form.description || null,
      base_price_ht: parseFloat(form.base_price_ht) || 0,
      recurring_price_ht: form.recurring_price_ht ? parseFloat(form.recurring_price_ht) : null,
      delivery_days: form.delivery_days ? parseInt(form.delivery_days) : null,
      features: form.features.split('\n').map(f => f.trim()).filter(Boolean),
    }
    let error
    if (initial) {
      ;({ error } = await supabase.from('products').update(payload).eq('id', initial.id))
    } else {
      ;({ error } = await supabase.from('products').insert(payload))
    }
    setLoading(false)
    if (error) { alert(error.message); return }
    onSaved()
    onClose()
  }

  const categoryOptions = (Object.keys(PRODUCT_CATEGORY_LABELS) as ProductCategory[]).map(k => ({
    value: k,
    label: PRODUCT_CATEGORY_LABELS[k],
  }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prod-modal-title"
      >
        <div className="px-6 pt-6 pb-4 border-b border-fourmiliance-border">
          <h2 id="prod-modal-title" className="font-heading text-xl text-fourmiliance-forest">
            {initial ? 'Modifier le produit' : 'Nouveau produit'}
          </h2>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label htmlFor="p-name" className="block text-sm font-medium text-fourmiliance-ink mb-1">Nom *</label>
              <input id="p-name" required value={form.name} onChange={set('name')}
                className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid" />
            </div>

            <div>
              <label htmlFor="p-cat" className="block text-sm font-medium text-fourmiliance-ink mb-1">Catégorie *</label>
              <select id="p-cat" required value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as ProductCategory }))}
                className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid">
                {categoryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="p-days" className="block text-sm font-medium text-fourmiliance-ink mb-1">Délai livraison (jours)</label>
              <input id="p-days" type="number" min={1} value={form.delivery_days} onChange={set('delivery_days')}
                className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid" />
            </div>

            <div>
              <label htmlFor="p-price" className="block text-sm font-medium text-fourmiliance-ink mb-1">Prix HT *</label>
              <div className="relative">
                <Euro size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fourmiliance-ghost" aria-hidden="true" />
                <input id="p-price" type="number" required min={0} step="0.01" value={form.base_price_ht} onChange={set('base_price_ht')}
                  className="w-full pl-8 border border-fourmiliance-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid" />
              </div>
            </div>

            <div>
              <label htmlFor="p-recurring" className="block text-sm font-medium text-fourmiliance-ink mb-1">Abonnement /mois HT</label>
              <div className="relative">
                <Euro size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fourmiliance-ghost" aria-hidden="true" />
                <input id="p-recurring" type="number" min={0} step="0.01" value={form.recurring_price_ht} onChange={set('recurring_price_ht')}
                  className="w-full pl-8 border border-fourmiliance-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid" />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="p-desc" className="block text-sm font-medium text-fourmiliance-ink mb-1">Description</label>
            <textarea id="p-desc" value={form.description} onChange={set('description')} rows={2}
              className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid" />
          </div>

          <div>
            <label htmlFor="p-features" className="block text-sm font-medium text-fourmiliance-ink mb-1">
              Inclus <span className="text-fourmiliance-ghost font-normal">(1 par ligne)</span>
            </label>
            <textarea id="p-features" value={form.features} onChange={set('features')} rows={5}
              placeholder="5-8 pages&#10;Design responsive&#10;SEO technique"
              className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid font-mono text-xs" />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3 justify-end">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-fourmiliance-ink border border-fourmiliance-border rounded-lg hover:bg-gray-50 transition min-h-[44px]">
            Annuler
          </button>
          <button type="submit" disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-fourmiliance-mid rounded-lg hover:bg-fourmiliance-forest transition min-h-[44px] disabled:opacity-50">
            {loading ? 'Enregistrement...' : initial ? 'Modifier' : 'Créer'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Card produit ──────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onEdit,
  onToggle,
}: {
  product: Product
  onEdit: () => void
  onToggle: () => void
}) {
  return (
    <div className={`bg-white rounded-2xl border p-5 flex flex-col gap-4 transition-shadow hover:shadow-md ${
      product.active ? 'border-fourmiliance-border' : 'border-dashed border-gray-200 opacity-60'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <CategoryBadge category={product.category} />
          <h3 className="font-semibold text-fourmiliance-forest text-base mt-2 leading-tight">
            {product.name}
          </h3>
        </div>
        <button
          onClick={onEdit}
          className="flex-shrink-0 p-2 text-fourmiliance-ghost hover:text-fourmiliance-forest hover:bg-gray-100 rounded-lg transition min-w-[36px] min-h-[36px] flex items-center justify-center"
          aria-label={`Modifier ${product.name}`}
        >
          <Edit2 size={15} aria-hidden="true" />
        </button>
      </div>

      {product.description && (
        <p className="text-sm text-fourmiliance-ghost line-clamp-2">{product.description}</p>
      )}

      {/* Prix */}
      <div className="flex items-baseline gap-3">
        <div className="flex items-center gap-1">
          <Euro size={14} className="text-fourmiliance-earth" aria-hidden="true" />
          <span className="text-2xl font-bold tabular-nums text-fourmiliance-forest">
            {product.base_price_ht.toLocaleString('fr-FR')}
          </span>
          <span className="text-xs text-fourmiliance-ghost">HT</span>
        </div>
        {product.recurring_price_ht && (
          <span className="text-sm text-fourmiliance-ghost">
            + {product.recurring_price_ht}€/mois
          </span>
        )}
      </div>

      {/* Délai */}
      {product.delivery_days && (
        <div className="flex items-center gap-1.5 text-xs text-fourmiliance-ghost">
          <Clock size={12} aria-hidden="true" />
          <span>Livraison en {product.delivery_days} jours</span>
        </div>
      )}

      {/* Features */}
      {product.features.length > 0 && (
        <ul className="space-y-1.5">
          {product.features.slice(0, 5).map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-fourmiliance-ink">
              <Check size={14} className="text-fourmiliance-mid flex-shrink-0 mt-0.5" aria-hidden="true" />
              {f}
            </li>
          ))}
          {product.features.length > 5 && (
            <li className="text-xs text-fourmiliance-ghost pl-5">
              + {product.features.length - 5} autre{product.features.length - 5 > 1 ? 's' : ''}
            </li>
          )}
        </ul>
      )}

      {/* Toggle active */}
      <button
        onClick={onToggle}
        className={`mt-auto text-xs font-medium py-2 rounded-xl border transition min-h-[36px] ${
          product.active
            ? 'border-red-200 text-red-500 hover:bg-red-50'
            : 'border-fourmiliance-mid text-fourmiliance-mid hover:bg-fourmiliance-mid/5'
        }`}
      >
        {product.active ? 'Désactiver' : 'Réactiver'}
      </button>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ProductsPage() {
  const { profile } = useAuth()
  const { show: toast } = useToast()
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [filterCat, setFilterCat] = useState<ProductCategory | ''>('')

  const isAdmin = profile?.role === 'admin'

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('category')
        .order('base_price_ht')
      if (error) throw error
      return data as Product[]
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('products').update({ active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toast('Produit mis à jour')
    },
  })

  const filtered = filterCat ? products.filter(p => p.category === filterCat) : products
  const active = filtered.filter(p => p.active)
  const inactive = filtered.filter(p => !p.active)

  const categories = (Object.keys(PRODUCT_CATEGORY_LABELS) as ProductCategory[]).filter(
    k => products.some(p => p.category === k)
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-fourmiliance-forest">Catalogue produits</h1>
          <p className="text-sm text-fourmiliance-ghost mt-0.5">
            Ce que vous vendez — affiché aux commerciaux lors des appels
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setEditing(null); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-fourmiliance-mid rounded-lg hover:bg-fourmiliance-forest transition min-h-[44px]"
          >
            <Plus size={15} aria-hidden="true" />
            Nouveau produit
          </button>
        )}
      </div>

      {/* Filtres catégorie */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterCat('')}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition min-h-[36px] ${
              filterCat === '' ? 'bg-fourmiliance-mid text-white' : 'bg-white border border-fourmiliance-border text-fourmiliance-ink hover:bg-gray-50'
            }`}
          >
            Tous
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(filterCat === cat ? '' : cat)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition min-h-[36px] ${
                filterCat === cat ? 'bg-fourmiliance-mid text-white' : 'bg-white border border-fourmiliance-border text-fourmiliance-ink hover:bg-gray-50'
              }`}
            >
              {PRODUCT_CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-fourmiliance-mid border-t-transparent rounded-full animate-spin" role="status" aria-label="Chargement" />
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-fourmiliance-border p-12 text-center">
          <Package size={40} className="mx-auto text-fourmiliance-ghost/40 mb-3" aria-hidden="true" />
          <p className="font-medium text-fourmiliance-ink">Catalogue vide</p>
          <p className="text-sm text-fourmiliance-ghost mt-1">
            Ajoutez vos offres pour les afficher aux commerciaux lors des appels.
          </p>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                onEdit={() => { setEditing(p); setShowModal(true) }}
                onToggle={() => toggleMutation.mutate({ id: p.id, active: false })}
              />
            ))}
          </div>

          {inactive.length > 0 && (
            <>
              <p className="text-xs text-fourmiliance-ghost font-medium uppercase tracking-wider">
                Produits désactivés ({inactive.length})
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {inactive.map(p => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onEdit={() => { setEditing(p); setShowModal(true) }}
                    onToggle={() => toggleMutation.mutate({ id: p.id, active: true })}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {showModal && isAdmin && (
        <ProductModal
          initial={editing ?? undefined}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['products'] })
            toast(editing ? 'Produit modifié' : 'Produit créé')
          }}
        />
      )}
    </div>
  )
}
