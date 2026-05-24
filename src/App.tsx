import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth.tsx'
import LoginPage from './features/auth/LoginPage'
import AppLayout from './layouts/AppLayout'
import ClientLayout from './layouts/ClientLayout'
import ClientPortal from './features/portal/ClientPortal'
import CrmPage from './features/crm/CrmPage'
import ContactDetail from './features/crm/ContactDetail'
import ProjectsPage from './features/projects/ProjectsPage'
import ProjectDetail from './features/projects/ProjectDetail'
import FinancePage from './features/finance/FinancePage'
import DashboardPage from './features/dashboard/DashboardPage'
import TeamPage from './features/team/TeamPage'
import MyTasksPage from './features/team/MyTasksPage'
import AssociationPage from './features/association/AssociationPage'
import IncubateurPage from './features/incubateur/IncubateurPage'

function ProtectedRoute({
  element,
  roles,
}: {
  element: JSX.Element
  roles?: string[]
}) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-fourmiliance-cream flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-fourmiliance-mid border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || !profile) return <Navigate to="/login" replace />
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

      {/* App — admin + sous_traitant */}
      <Route path="/app" element={
        <ProtectedRoute roles={['admin', 'sous_traitant']} element={<AppLayout />} />
      }>
        <Route path="dashboard"        element={<DashboardPage />} />
        <Route path="crm"              element={<CrmPage />} />
        <Route path="crm/:id"          element={<ContactDetail />} />
        <Route path="projects"         element={<ProjectsPage />} />
        <Route path="projects/:id"     element={<ProjectDetail />} />
        <Route path="finance"          element={<FinancePage />} />
        <Route path="team"             element={<TeamPage />} />
        <Route path="mes-taches"       element={<MyTasksPage />} />
        <Route path="association"      element={<AssociationPage />} />
        <Route path="association/fonds" element={<AssociationPage />} />
        <Route path="incubateur"       element={<IncubateurPage />} />
        <Route path="portal"           element={<Placeholder title="Portail Client — accès via /client/:projectId" />} />
        <Route path="settings"         element={<Placeholder title="Paramètres" />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Portail client */}
      <Route path="/client/:projectId" element={
        <ProtectedRoute roles={['client', 'admin']} element={<ClientLayout />} />
      }>
        <Route index element={<ClientPortal />} />
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
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
