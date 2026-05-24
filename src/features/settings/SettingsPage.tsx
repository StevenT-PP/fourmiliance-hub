import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { User, Lock, Bell, ExternalLink, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth.tsx'
import { ROLE_LABELS } from '../../lib/constants'
import { getInitials } from '../../lib/utils'

export default function SettingsPage() {
  const { user, profile } = useAuth()
  const queryClient = useQueryClient()

  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name ?? '',
    phone:     profile?.phone     ?? '',
    company:   profile?.company   ?? '',
  })
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwSaved, setPwSaved]   = useState(false)
  const [pwError, setPwError]   = useState<string | null>(null)

  const profileMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Non authentifié')
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.full_name.trim(),
          phone:     profileForm.phone.trim()   || null,
          company:   profileForm.company.trim() || null,
        })
        .eq('id', user.id)
      if (error) throw error
    },
    onSuccess: () => {
      setProfileSaved(true)
      setProfileError(null)
      void queryClient.invalidateQueries({ queryKey: ['profiles'] })
      setTimeout(() => setProfileSaved(false), 3000)
    },
    onError: () => setProfileError('Erreur lors de la mise à jour du profil.'),
  })

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    if (!profileForm.full_name.trim()) return
    profileMutation.mutate()
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwError(null)
    if (pwForm.next.length < 8) {
      setPwError('Le nouveau mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwError('Les mots de passe ne correspondent pas.')
      return
    }
    const { error } = await supabase.auth.updateUser({ password: pwForm.next })
    if (error) {
      setPwError('Erreur lors du changement de mot de passe.')
    } else {
      setPwSaved(true)
      setPwForm({ current: '', next: '', confirm: '' })
      setTimeout(() => setPwSaved(false), 3000)
    }
  }

  if (!profile) return null

  return (
    <div className="max-w-2xl space-y-6">

      {/* ── Profil ────────────────────────────────────────────────────────── */}
      <section aria-labelledby="settings-profile-title" className="bg-white rounded-xl border border-fourmiliance-border p-6">
        <div className="flex items-center gap-2 mb-5">
          <User className="w-5 h-5 text-fourmiliance-forest" aria-hidden="true" />
          <h2 id="settings-profile-title" className="font-heading text-base text-fourmiliance-forest">
            Profil
          </h2>
        </div>

        {/* Avatar + rôle */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-fourmiliance-mid flex items-center justify-center text-white text-lg font-semibold flex-shrink-0">
            {getInitials(profile.full_name)}
          </div>
          <div>
            <p className="font-semibold text-fourmiliance-ink">{profile.full_name}</p>
            <span className="badge badge-green mt-1">
              {ROLE_LABELS[profile.role] ?? profile.role}
            </span>
          </div>
        </div>

        <form onSubmit={e => void handleProfileSave(e)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sp-name" className="block text-xs font-medium text-fourmiliance-tertiary mb-1">
                Nom complet *
              </label>
              <input
                id="sp-name"
                required
                aria-required="true"
                value={profileForm.full_name}
                onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))}
                className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/40"
              />
            </div>
            <div>
              <label htmlFor="sp-phone" className="block text-xs font-medium text-fourmiliance-tertiary mb-1">
                Téléphone
              </label>
              <input
                id="sp-phone"
                type="tel"
                autoComplete="tel"
                value={profileForm.phone}
                onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/40"
              />
            </div>
          </div>

          <div>
            <label htmlFor="sp-company" className="block text-xs font-medium text-fourmiliance-tertiary mb-1">
              Entreprise
            </label>
            <input
              id="sp-company"
              autoComplete="organization"
              value={profileForm.company}
              onChange={e => setProfileForm(f => ({ ...f, company: e.target.value }))}
              className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/40"
            />
          </div>

          {profileError && (
            <p role="alert" className="text-xs text-fourmiliance-rust">{profileError}</p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={profileMutation.isPending}
              aria-busy={profileMutation.isPending}
              className="px-4 py-2 bg-fourmiliance-forest text-white text-sm rounded-lg min-h-[44px]
                         hover:bg-fourmiliance-mid transition-colors disabled:opacity-50
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fourmiliance-mid"
            >
              {profileMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            {profileSaved && (
              <span role="status" className="flex items-center gap-1.5 text-sm text-fourmiliance-mid">
                <Check className="w-4 h-4" aria-hidden="true" />
                Profil mis à jour
              </span>
            )}
          </div>
        </form>
      </section>

      {/* ── Sécurité ──────────────────────────────────────────────────────── */}
      <section aria-labelledby="settings-security-title" className="bg-white rounded-xl border border-fourmiliance-border p-6">
        <div className="flex items-center gap-2 mb-5">
          <Lock className="w-5 h-5 text-fourmiliance-forest" aria-hidden="true" />
          <h2 id="settings-security-title" className="font-heading text-base text-fourmiliance-forest">
            Sécurité
          </h2>
        </div>

        <p className="text-xs text-fourmiliance-ghost mb-4">
          Email connecté : <strong className="text-fourmiliance-ink">{user?.email}</strong>
        </p>

        <form onSubmit={e => void handlePasswordChange(e)} className="space-y-4">
          <div>
            <label htmlFor="sp-pw-new" className="block text-xs font-medium text-fourmiliance-tertiary mb-1">
              Nouveau mot de passe *
            </label>
            <input
              id="sp-pw-new"
              type="password"
              required
              aria-required="true"
              autoComplete="new-password"
              value={pwForm.next}
              onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
              placeholder="8 caractères minimum"
              className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/40"
            />
          </div>
          <div>
            <label htmlFor="sp-pw-confirm" className="block text-xs font-medium text-fourmiliance-tertiary mb-1">
              Confirmer le mot de passe *
            </label>
            <input
              id="sp-pw-confirm"
              type="password"
              required
              aria-required="true"
              autoComplete="new-password"
              value={pwForm.confirm}
              onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
              className="w-full border border-fourmiliance-border rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/40"
            />
          </div>

          {pwError && (
            <p role="alert" className="text-xs text-fourmiliance-rust">{pwError}</p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="px-4 py-2 bg-fourmiliance-forest text-white text-sm rounded-lg min-h-[44px]
                         hover:bg-fourmiliance-mid transition-colors
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fourmiliance-mid"
            >
              Changer le mot de passe
            </button>
            {pwSaved && (
              <span role="status" className="flex items-center gap-1.5 text-sm text-fourmiliance-mid">
                <Check className="w-4 h-4" aria-hidden="true" />
                Mot de passe modifié
              </span>
            )}
          </div>
        </form>
      </section>

      {/* ── Notifications ─────────────────────────────────────────────────── */}
      <section aria-labelledby="settings-notif-title" className="bg-white rounded-xl border border-fourmiliance-border p-6">
        <div className="flex items-center gap-2 mb-5">
          <Bell className="w-5 h-5 text-fourmiliance-forest" aria-hidden="true" />
          <h2 id="settings-notif-title" className="font-heading text-base text-fourmiliance-forest">
            Notifications
          </h2>
        </div>
        <p className="text-sm text-fourmiliance-ghost">
          Les notifications par email sont envoyées automatiquement pour les changements de statut de tâches et les nouveaux messages.
        </p>
        <p className="text-xs text-fourmiliance-disabled mt-2">Configuration avancée à venir.</p>
      </section>

      {/* ── Liens utiles ──────────────────────────────────────────────────── */}
      <section aria-labelledby="settings-links-title" className="bg-white rounded-xl border border-fourmiliance-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <ExternalLink className="w-5 h-5 text-fourmiliance-forest" aria-hidden="true" />
          <h2 id="settings-links-title" className="font-heading text-base text-fourmiliance-forest">
            Liens
          </h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://fourmiliance.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-fourmiliance-mid hover:text-fourmiliance-forest
                       border border-fourmiliance-mid/30 rounded-lg px-4 py-2 hover:bg-fourmiliance-cream-dark
                       transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fourmiliance-mid"
          >
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
            Site Fourmiliance
          </a>
          <a
            href="https://xkmqayluwjqktlsekhtu.supabase.co"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-fourmiliance-tertiary hover:text-fourmiliance-ink
                       border border-fourmiliance-border rounded-lg px-4 py-2 hover:bg-fourmiliance-cream-dark
                       transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fourmiliance-mid"
          >
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
            Supabase Dashboard
          </a>
        </div>
      </section>

    </div>
  )
}
