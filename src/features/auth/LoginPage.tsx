import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.tsx'
import { supabase } from '../../lib/supabase'

async function resolveRoleRedirect(role: string, userId: string): Promise<string> {
  switch (role) {
    case 'admin':         return '/app/dashboard'
    case 'sous_traitant': return '/app/mes-taches'
    case 'client': {
      const { data } = await supabase
        .from('projects').select('id').eq('client_id', userId).limit(1).single()
      return data ? `/client/${data.id}` : '/login'
    }
    case 'membre_association': return '/association'
    case 'incube': {
      const { data } = await supabase
        .from('incubated_companies').select('id').eq('user_id', userId).limit(1).single()
      return data ? `/incubateur/${data.id}` : '/login'
    }
    default: return '/login'
  }
}

export default function LoginPage() {
  const { user, profile, loading, signIn } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode]             = useState<'password' | 'magic'>('password')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [magicSent, setMagicSent]   = useState(false)

  useEffect(() => {
    if (!loading && user && profile) {
      void resolveRoleRedirect(profile.role, user.id).then(path =>
        navigate(path, { replace: true })
      )
    }
  }, [loading, user, profile, navigate])

  async function handlePassword(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { error: signInError } = await signIn(email, password)
    if (signInError) {
      setError(signInError)
      setSubmitting(false)
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSubmitting(false); return }

    const { data: profileData } = await supabase
      .from('profiles').select('role, id').eq('id', session.user.id).single()

    if (!profileData) {
      setError('Profil introuvable. Contactez un administrateur.')
      setSubmitting(false)
      return
    }

    const path = await resolveRoleRedirect(profileData.role, profileData.id)
    navigate(path, { replace: true })
  }

  async function handleMagicLink(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })

    if (error) {
      setError('Impossible d\'envoyer le lien. Vérifiez l\'adresse e-mail.')
      setSubmitting(false)
      return
    }

    setMagicSent(true)
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-fourmiliance-cream flex items-center justify-center">
        <div className="spinner" role="status" aria-label="Chargement en cours" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-fourmiliance-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-fourmiliance-mid mb-4">
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white" aria-hidden="true">
              <path d="M12 3C9 3 6.5 5.5 6.5 8.5c0 2 .9 3.8 2.3 5L12 17l3.2-3.5c1.4-1.2 2.3-3 2.3-5C17.5 5.5 15 3 12 3zm0 7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
              <path d="M12 19c-2 0-6 1-6 3v.5h12V22c0-2-4-3-6-3z" opacity=".5" />
            </svg>
          </div>
          <h1 className="font-heading text-2xl font-semibold text-fourmiliance-forest">
            Fourmiliance Hub
          </h1>
          <p className="text-sm text-fourmiliance-ghost mt-1">Espace de gestion</p>
        </div>

        {/* Toggle mode */}
        <div className="flex rounded-lg bg-fourmiliance-cream-dark p-1 mb-5 gap-1">
          <button
            onClick={() => { setMode('password'); setError(null); setMagicSent(false) }}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition min-h-[40px]
              ${mode === 'password' ? 'bg-white text-fourmiliance-forest shadow-sm' : 'text-fourmiliance-ghost hover:text-fourmiliance-tertiary'}`}
          >
            Mot de passe
          </button>
          <button
            onClick={() => { setMode('magic'); setError(null); setMagicSent(false) }}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition min-h-[40px]
              ${mode === 'magic' ? 'bg-white text-fourmiliance-forest shadow-sm' : 'text-fourmiliance-ghost hover:text-fourmiliance-tertiary'}`}
          >
            Lien magique
          </button>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-card p-8">

          {magicSent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-fourmiliance-success-bg flex items-center justify-center mx-auto mb-4">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-fourmiliance-mid" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-sm font-medium text-fourmiliance-ink mb-1">Lien envoyé !</p>
              <p className="text-xs text-fourmiliance-ghost">
                Vérifie ta boîte mail et clique sur le lien de connexion.
              </p>
              <button
                onClick={() => setMagicSent(false)}
                className="mt-4 text-xs text-fourmiliance-mid hover:underline"
              >
                Renvoyer
              </button>
            </div>
          ) : mode === 'password' ? (
            <form onSubmit={handlePassword} className="space-y-5" noValidate>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-fourmiliance-ink mb-1.5">
                  Adresse e-mail
                </label>
                <input
                  id="email" type="email" autoComplete="email" required
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-fourmiliance-border text-fourmiliance-ink text-sm
                             focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30 focus:border-fourmiliance-mid
                             placeholder:text-fourmiliance-ghost transition"
                  placeholder="vous@exemple.fr"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-fourmiliance-ink mb-1.5">
                  Mot de passe
                </label>
                <input
                  id="password" type="password" autoComplete="current-password" required
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-fourmiliance-border text-fourmiliance-ink text-sm
                             focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30 focus:border-fourmiliance-mid
                             placeholder:text-fourmiliance-ghost transition"
                  placeholder="••••••••"
                />
              </div>
              {error && (
                <p role="alert" className="text-sm text-fourmiliance-rust bg-fourmiliance-rust-bg px-3.5 py-2.5 rounded-lg border border-fourmiliance-rust/20">
                  {error}
                </p>
              )}
              <button
                type="submit" disabled={submitting}
                className="w-full bg-fourmiliance-mid hover:bg-fourmiliance-forest text-white font-medium
                           py-2.5 px-4 rounded-lg text-sm transition disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
              >
                {submitting ? 'Connexion…' : 'Se connecter'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-5" noValidate>
              <div>
                <label htmlFor="email-magic" className="block text-sm font-medium text-fourmiliance-ink mb-1.5">
                  Adresse e-mail
                </label>
                <input
                  id="email-magic" type="email" autoComplete="email" required
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-fourmiliance-border text-fourmiliance-ink text-sm
                             focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30 focus:border-fourmiliance-mid
                             placeholder:text-fourmiliance-ghost transition"
                  placeholder="vous@exemple.fr"
                />
              </div>
              {error && (
                <p role="alert" className="text-sm text-fourmiliance-rust bg-fourmiliance-rust-bg px-3.5 py-2.5 rounded-lg border border-fourmiliance-rust/20">
                  {error}
                </p>
              )}
              <button
                type="submit" disabled={submitting}
                className="w-full bg-fourmiliance-mid hover:bg-fourmiliance-forest text-white font-medium
                           py-2.5 px-4 rounded-lg text-sm transition disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
              >
                {submitting ? 'Envoi…' : 'Recevoir un lien de connexion'}
              </button>
              <p className="text-xs text-fourmiliance-ghost text-center">
                Un lien valable 1h sera envoyé à ton adresse e-mail.
              </p>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-fourmiliance-ghost mt-6">
          Accès réservé aux membres de l'équipe Fourmiliance.
        </p>
      </div>
    </div>
  )
}
