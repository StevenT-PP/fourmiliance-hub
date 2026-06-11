import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth.tsx'
import { ToastProvider } from './hooks/useToast'
import LoginPage from './features/auth/LoginPage'
import AppLayout from './layouts/AppLayout'
import ClientLayout from './layouts/ClientLayout'

// ─── Lazy-loaded feature pages (code splitting) ────────────────────────────
const ClientPortal    = lazy(() => import('./features/portal/ClientPortal'))
const PortalHubPage   = lazy(() => import('./features/portal/PortalHubPage'))
const CrmPage         = lazy(() => import('./features/crm/CrmPage'))
const ContactDetail   = lazy(() => import('./features/crm/ContactDetail'))
const ProjectsPage    = lazy(() => import('./features/projects/ProjectsPage'))
const ProjectDetail   = lazy(() => import('./features/projects/ProjectDetail'))
const FinancePage     = lazy(() => import('./features/finance/FinancePage'))
const DashboardPage   = lazy(() => import('./features/dashboard/DashboardPage'))
const TeamPage        = lazy(() => import('./features/team/TeamPage'))
const MyTasksPage     = lazy(() => import('./features/team/MyTasksPage'))
const AssociationPage = lazy(() => import('./features/association/AssociationPage'))
const IncubateurPage  = lazy(() => import('./features/incubateur/IncubateurPage'))
const SettingsPage    = lazy(() => import('./features/settings/SettingsPage'))
// ─── Call Center ──────────────────────────────────────────────────────────────
const LeadsPage       = lazy(() => import('./features/calls/LeadsPage'))
const CallSessionPage = lazy(() => import('./features/calls/CallSessionPage'))
const SupervisionPage = lazy(() => import('./features/calls/SupervisionPage'))
const CampaignsPage   = lazy(() => import('./features/calls/CampaignsPage'))
const ProductsPage    = lazy(() => import('./features/calls/ProductsPage'))

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-fourmiliance-mid border-t-transparent rounded-full animate-spin" role="status" aria-label="Chargement de la page" />
    </div>
  )
}

function ProtectedRoute({
  element,
  roles,
}: {
  element: JSX.Element
  roles?: string[]
}) {
  const { user, profile, loading } = useAuth()
  const [profileTimeout, setProfileTimeout] = useState(false)

  // Timeout 10s : si le profil ne se charge pas, rediriger vers /login
  useEffect(() => {
    if (!loading && user && !profile) {
      const t = setTimeout(() => setProfileTimeout(true), 10_000)
      return () => clearTimeout(t)
    }
  }, [loading, user, profile])

  if (loading) {
    return (
      <div className="min-h-screen bg-fourmiliance-cream flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-fourmiliance-mid border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || profileTimeout) return <Navigate to="/login" replace />

  if (!profile) {
    return (
      <div className="min-h-screen bg-fourmiliance-cream flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-fourmiliance-mid border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (roles && !roles.includes(profile.role)) return <Navigate to="/login" replace />
  return element
}

function Placeholder({ title }: { title: string }) {
  const { profile, signOut } = useAuth()
  return (
    <div className="min-h-screen bg-fourmiliance-cream flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-heading text-3xl text-fourmiliance-forest mb-2">
          Fourmiliance Hub
        </h1>
        <p className="text-[#5A5A5A] mb-1">{title}</p>
        {profile && (
          <p className="text-xs text-[#9A9A9A] mb-4">
            Connecté en tant que <strong>{profile.full_name}</strong> ({profile.role})
          </p>
        )}
        <button
          onClick={signOut}
          className="text-xs text-fourmiliance-mid hover:underline"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* App — admin + sous_traitant + commercial */}
      <Route path="/app" element={
        <ProtectedRoute roles={['admin', 'sous_traitant', 'commercial']} element={<AppLayout />} />
      }>
        <Route path="dashboard"        element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
        <Route path="crm"              element={<Suspense fallback={<PageLoader />}><CrmPage /></Suspense>} />
        <Route path="crm/:id"          element={<Suspense fallback={<PageLoader />}><ContactDetail /></Suspense>} />
        <Route path="projects"         element={<Suspense fallback={<PageLoader />}><ProjectsPage /></Suspense>} />
        <Route path="projects/:id"     element={<Suspense fallback={<PageLoader />}><ProjectDetail /></Suspense>} />
        <Route path="finance"          element={<Suspense fallback={<PageLoader />}><FinancePage /></Suspense>} />
        <Route path="team"             element={<Suspense fallback={<PageLoader />}><TeamPage /></Suspense>} />
        <Route path="mes-taches"       element={<Suspense fallback={<PageLoader />}><MyTasksPage /></Suspense>} />
        <Route path="association"      element={<Suspense fallback={<PageLoader />}><AssociationPage /></Suspense>} />
        <Route path="association/fonds" element={<Suspense fallback={<PageLoader />}><AssociationPage /></Suspense>} />
        <Route path="incubateur"       element={<Suspense fallback={<PageLoader />}><IncubateurPage /></Suspense>} />
        <Route path="portal"           element={<Suspense fallback={<PageLoader />}><PortalHubPage /></Suspense>} />
        <Route path="settings"         element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
        {/* Call center */}
        <Route path="leads"       element={<Suspense fallback={<PageLoader />}><LeadsPage /></Suspense>} />
        <Route path="appels"      element={<Suspense fallback={<PageLoader />}><CallSessionPage /></Suspense>} />
        <Route path="supervision" element={<Suspense fallback={<PageLoader />}><SupervisionPage /></Suspense>} />
        <Route path="campagnes"   element={<Suspense fallback={<PageLoader />}><CampaignsPage /></Suspense>} />
        <Route path="produits"    element={<Suspense fallback={<PageLoader />}><ProductsPage /></Suspense>} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Portail client */}
      <Route path="/client/:projectId" element={
        <ProtectedRoute roles={['client', 'admin']} element={<ClientLayout />} />
      }>
        <Route index element={<Suspense fallback={<PageLoader />}><ClientPortal /></Suspense>} />
      </Route>

      {/* Association (rôle membre) */}
      <Route path="/association"
        element={<ProtectedRoute roles={['membre_association', 'admin']}
          element={<Placeholder title="Espace association — Tâche 8.1" />} />} />

      {/* Incubateur (rôle incubé) */}
      <Route path="/incubateur/:id"
        element={<ProtectedRoute roles={['incube', 'admin']}
          element={<Placeholder title="Fiche incubé — Tâche 8.2" />} />} />

      {/* Default */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
