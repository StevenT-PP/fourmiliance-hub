import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.tsx'
import { supabase } from '../../lib/supabase'

async function resolveRoleRedirect(role: string, userId: string): Promise<string> {
  switch (role) {
    case 'admin':         return '/app/dashboard'
    case 'sous_traitant': return '/app/mes-taches'
    case 'commercial':    return '/app/appels'
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
    }
    // La redirection est gérée par le useEffect ci-dessus
    // dès que user + profile sont chargés dans useAuth
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
          <svg viewBox="0 0 56 26" className="w-36 h-auto mx-auto mb-3" aria-hidden="true">
            <circle cx="3"   cy="21"  r="2.2" fill="#2D5A1B" opacity="0.32"/>
            <circle cx="10"  cy="14.5" r="2.8" fill="#2D5A1B" opacity="0.48"/>
            <circle cx="18"  cy="9.5" r="3.3" fill="#2D5A1B" opacity="0.65"/>
            <circle cx="27"  cy="6.5" r="3.8" fill="#2D5A1B" opacity="0.82"/>
            <circle cx="36"  cy="5.5" r="3.8" fill="#2D5A1B"/>
            <circle cx="45"  cy="8"   r="3.2" fill="#2D5A1B" opacity="0.68"/>
            <circle cx="53"  cy="13.5" r="2.5" fill="#2D5A1B" opacity="0.42"/>
          </svg>
          <h1 className="font-brand italic text-3xl text-fourmiliance-forest tracking-wide leading-none">
            fourmiliance
          </h1>
          <p className="text-[10px] font-sans text-fourmiliance-ghost tracking-[0.25em] uppercase mt-1.5">hub</p>
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
