import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Contact, Profile } from '../../types'
import type { PipelineStage, ServiceType } from '../../lib/constants'
import { PIPELINE_LABELS, PIPELINE_STAGES, SERVICE_LABELS } from '../../lib/constants'

interface Props {
  contact?:  Contact
  onClose:   () => void
  onSuccess: () => void
}

interface FormData {
  company:         string
  contact_name:    string
  email:           string
  phone:           string
  address:         string
  city:            string
  postal_code:     string
  service_type:    ServiceType | ''
  estimated_value: string
  assigned_to:     string
  source:          string
  pipeline_stage:  PipelineStage
}

const EMPTY: FormData = {
  company:         '',
  contact_name:    '',
  email:           '',
  phone:           '',
  address:         '',
  city:            '',
  postal_code:     '',
  service_type:    '',
  estimated_value: '',
  assigned_to:     '',
  source:          '',
  pipeline_stage:  'prospect',
}

export default function ContactForm({ contact, onClose, onSuccess }: Props) {
  const isEditing = !!contact

  const [form,    setForm]    = useState<FormData>(EMPTY)
  const [errors,  setErrors]  = useState<Partial<Record<keyof FormData, string>>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (contact) {
      setForm({
        company:         contact.company,
        contact_name:    contact.contact_name,
        email:           contact.email        ?? '',
        phone:           contact.phone        ?? '',
        address:         contact.address      ?? '',
        city:            contact.city         ?? '',
        postal_code:     contact.postal_code  ?? '',
        service_type:    contact.service_type ?? '',
        estimated_value: contact.estimated_value != null ? String(contact.estimated_value) : '',
        assigned_to:     contact.assigned_to  ?? '',
        source:          contact.source       ?? '',
        pipeline_stage:  contact.pipeline_stage,
      })
    } else {
      setForm(EMPTY)
    }
    setErrors({})
  }, [contact])

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['profiles', 'team'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('role', ['admin', 'sous_traitant'])
        .order('full_name')
      return (data ?? []) as Pick<Profile, 'id' | 'full_name'>[]
    },
  })

  function update(field: keyof FormData, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }))
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormData, string>> = {}
    if (!form.company.trim())      e.company      = 'Champ obligatoire'
    if (!form.contact_name.trim()) e.contact_name = 'Champ obligatoire'
    if (!form.service_type)        e.service_type = 'Champ obligatoire'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)

    const payload = {
      company:         form.company.trim(),
      contact_name:    form.contact_name.trim(),
      email:           form.email.trim()       || null,
      phone:           form.phone.trim()       || null,
      address:         form.address.trim()     || null,
      city:            form.city.trim()        || null,
      postal_code:     form.postal_code.trim() || null,
      service_type:    form.service_type       || null,
      estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : null,
      assigned_to:     form.assigned_to        || null,
      source:          form.source.trim()      || null,
      pipeline_stage:  form.pipeline_stage,
      updated_at:      new Date().toISOString(),
    }

    const { error } = isEditing
      ? await supabase.from('contacts').update(payload).eq('id', contact!.id)
      : await supabase.from('contacts').insert(payload)

    setLoading(false)
    if (!error) onSuccess()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Fond */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      {/* Modale */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-form-title"
        className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-fourmiliance-border flex-shrink-0">
          <h2 id="contact-form-title" className="font-heading text-lg font-semibold text-fourmiliance-forest">
            {isEditing ? 'Modifier le contact' : 'Nouveau contact'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="p-1.5 rounded-lg hover:bg-fourmiliance-cream-dark transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X size={18} className="text-fourmiliance-tertiary" aria-hidden="true" />
          </button>
        </div>

        {/* Corps du formulaire */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto flex-1 p-6 space-y-4">
            {/* Entreprise + Nom contact */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Entreprise *" error={errors.company} htmlFor="cf-company">
                <input
                  id="cf-company"
                  type="text"
                  value={form.company}
                  onChange={e => update('company', e.target.value)}
                  placeholder="Nom de l'entreprise"
                  aria-required="true"
                  className={inputCls(!!errors.company)}
                />
              </Field>
              <Field label="Nom du contact *" error={errors.contact_name} htmlFor="cf-contact-name">
                <input
                  id="cf-contact-name"
                  type="text"
                  value={form.contact_name}
                  onChange={e => update('contact_name', e.target.value)}
                  placeholder="Prénom Nom"
                  aria-required="true"
                  className={inputCls(!!errors.contact_name)}
                />
              </Field>
            </div>

            {/* Email + Téléphone */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Email" htmlFor="cf-email">
                <input
                  id="cf-email"
                  type="email"
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                  placeholder="contact@exemple.fr"
                  autoComplete="email"
                  className={inputCls(false)}
                />
              </Field>
              <Field label="Téléphone" htmlFor="cf-phone">
                <input
                  id="cf-phone"
                  type="tel"
                  value={form.phone}
                  onChange={e => update('phone', e.target.value)}
                  placeholder="06 12 34 56 78"
                  autoComplete="tel"
                  className={inputCls(false)}
                />
              </Field>
            </div>

            {/* Adresse */}
            <Field label="Adresse" htmlFor="cf-address">
              <input
                id="cf-address"
                type="text"
                value={form.address}
                onChange={e => update('address', e.target.value)}
                placeholder="Numéro, rue…"
                autoComplete="street-address"
                className={inputCls(false)}
              />
            </Field>

            {/* Ville + Code postal */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Ville" htmlFor="cf-city">
                <input
                  id="cf-city"
                  type="text"
                  value={form.city}
                  onChange={e => update('city', e.target.value)}
                  placeholder="Perpignan"
                  autoComplete="address-level2"
                  className={inputCls(false)}
                />
              </Field>
              <Field label="Code postal" htmlFor="cf-postal">
                <input
                  id="cf-postal"
                  type="text"
                  value={form.postal_code}
                  onChange={e => update('postal_code', e.target.value)}
                  placeholder="66000"
                  autoComplete="postal-code"
                  className={inputCls(false)}
                />
              </Field>
            </div>

            {/* Service + Valeur */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Type de service *" error={errors.service_type} htmlFor="cf-service">
                <select
                  id="cf-service"
                  value={form.service_type}
                  onChange={e => update('service_type', e.target.value)}
                  aria-required="true"
                  className={inputCls(!!errors.service_type)}
                >
                  <option value="">— Choisir —</option>
                  {Object.entries(SERVICE_LABELS).map(([k, { label }]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Valeur estimée (€)" htmlFor="cf-value">
                <input
                  id="cf-value"
                  type="number"
                  min="0"
                  step="50"
                  value={form.estimated_value}
                  onChange={e => update('estimated_value', e.target.value)}
                  placeholder="1500"
                  className={inputCls(false)}
                />
              </Field>
            </div>

            {/* Assigné à + Source */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Assigné à" htmlFor="cf-assigned">
                <select
                  id="cf-assigned"
                  value={form.assigned_to}
                  onChange={e => update('assigned_to', e.target.value)}
                  className={inputCls(false)}
                >
                  <option value="">— Non assigné —</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Source" htmlFor="cf-source">
                <input
                  id="cf-source"
                  type="text"
                  value={form.source}
                  onChange={e => update('source', e.target.value)}
                  placeholder="LinkedIn, Recommandation…"
                  className={inputCls(false)}
                />
              </Field>
            </div>

            {/* Étape pipeline */}
            <Field label="Étape pipeline" htmlFor="cf-pipeline">
              <select
                id="cf-pipeline"
                value={form.pipeline_stage}
                onChange={e => update('pipeline_stage', e.target.value)}
                className={inputCls(false)}
              >
                {PIPELINE_STAGES.map(s => (
                  <option key={s} value={s}>{PIPELINE_LABELS[s]}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-fourmiliance-border flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-fourmiliance-tertiary border border-fourmiliance-border hover:bg-fourmiliance-cream-dark transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-fourmiliance-mid hover:bg-fourmiliance-forest transition-colors disabled:opacity-50"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {isEditing ? 'Enregistrer les modifications' : 'Créer le contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  error,
  htmlFor,
  children,
}: {
  label:    string
  error?:   string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-fourmiliance-tertiary mb-1">{label}</label>
      {children}
      {error && <p role="alert" className="text-xs text-fourmiliance-rust mt-1">{error}</p>}
    </div>
  )
}

function inputCls(hasError: boolean): string {
  return [
    'w-full px-3 py-2 rounded-lg text-sm text-fourmiliance-ink border outline-none transition-colors bg-white',
    hasError
      ? 'border-fourmiliance-rust focus:border-fourmiliance-rust focus:ring-1 focus:ring-fourmiliance-rust/30'
      : 'border-fourmiliance-border focus:border-fourmiliance-mid focus:ring-1 focus:ring-fourmiliance-mid/30',
  ].join(' ')
}
