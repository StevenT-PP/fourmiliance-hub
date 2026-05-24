import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const PROFILE_CACHE_KEY = 'fh_profile_v1'

function getCachedProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY)
    return raw ? (JSON.parse(raw) as Profile) : null
  } catch { return null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Lecture localStorage — pas de réseau, débloque l'UI immédiatement
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user)
          setProfile(getCachedProfile())  // null si première visite
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))

    // Mises à jour auth : connexion, déconnexion, refresh token
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser(session.user)

          // Fetch / rafraîchit le profil en arrière-plan
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (data) {
            setProfile(data as Profile)
            localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data))
          } else {
            // Utilisateur sans profil — déconnexion forcée
            void supabase.auth.signOut()
            setUser(null)
            setProfile(null)
            localStorage.removeItem(PROFILE_CACHE_KEY)
          }
        } else {
          setUser(null)
          setProfile(null)
          localStorage.removeItem(PROFILE_CACHE_KEY)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: 'Email ou mot de passe incorrect.' }
    return { error: null }
  }

  function signOut() {
    localStorage.removeItem(PROFILE_CACHE_KEY)
    void supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider')
  return ctx
}
