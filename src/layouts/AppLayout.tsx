import { useState, type ElementType } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, FolderKanban, TrendingUp, ExternalLink,
  Clock, Landmark, Building2, UserCog, Settings, Menu, Bell,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth.tsx'

type NavItem = { label: string; path: string; icon: ElementType }
type NavSection = { section: string; items: NavItem[] }

const adminNav: NavSection[] = [
  {
    section: 'AGENCE',
    items: [
      { label: 'Tableau de bord',  path: '/app/dashboard',  icon: LayoutDashboard },
      { label: 'CRM Prospection',  path: '/app/crm',        icon: Users },
      { label: 'Projets',          path: '/app/projects',   icon: FolderKanban },
      { label: 'Finances',         path: '/app/finance',    icon: TrendingUp },
      { label: 'Portail Client',   path: '/app/portal',     icon: ExternalLink },
    ],
  },
  {
    section: 'ASSOCIATION',
    items: [
      { label: 'Tableau de bord',  path: '/app/association',       icon: Clock },
      { label: 'Fonds foncier',    path: '/app/association/fonds', icon: Landmark },
    ],
  },
  {
    section: 'INCUBATEUR',
    items: [
      { label: 'Entreprises incubées', path: '/app/incubateur', icon: Building2 },
    ],
  },
  {
    section: 'COMPTE',
    items: [
      { label: 'Équipe',       path: '/app/team',     icon: UserCog },
      { label: 'Paramètres',   path: '/app/settings', icon: Settings },
    ],
  },
]

const contractorNav: NavSection[] = [
  {
    section: 'MON ESPACE',
    items: [
      { label: 'Mes tâches', path: '/app/mes-taches', icon: FolderKanban },
      { label: 'Projets',    path: '/app/projects',   icon: LayoutDashboard },
    ],
  },
  {
    section: 'COMPTE',
    items: [
      { label: 'Paramètres', path: '/app/settings', icon: Settings },
    ],
  },
]

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    admin: 'Administrateur',
    sous_traitant: 'Sous-traitant',
    client: 'Client',
    membre_association: 'Membre asso.',
    incube: 'Incubé',
  }
  return map[role] ?? role
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(' ')
  const ini = parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : parts[0].slice(0, 2)
  return (
    <div className="w-8 h-8 rounded-full bg-fourmiliance-mid flex items-center justify-center
                    text-white text-xs font-semibold flex-shrink-0">
      {ini.toUpperCase()}
    </div>
  )
}

function PageTitle() {
  const { pathname } = useLocation()
  const allItems = adminNav.flatMap(s => s.items)
  const found = allItems.find(i => pathname.startsWith(i.path))
  return (
    <span className="font-heading text-lg font-semibold text-fourmiliance-forest">
      {found?.label ?? 'Fourmiliance Hub'}
    </span>
  )
}

export default function AppLayout() {
  const { profile, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  const nav = profile?.role === 'sous_traitant' ? contractorNav : adminNav

  const sidebar = (
    <aside className="w-[240px] flex-shrink-0 bg-fourmiliance-deep flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-fourmiliance-mid flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" aria-hidden="true">
            <path d="M12 3C9 3 6.5 5.5 6.5 8.5c0 2 .9 3.8 2.3 5L12 17l3.2-3.5c1.4-1.2 2.3-3 2.3-5C17.5 5.5 15 3 12 3zm0 7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
          </svg>
        </div>
        <span className="font-heading text-white font-semibold text-sm leading-tight">
          Fourmiliance<br />Hub
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-6">
        {nav.map(({ section, items }) => (
          <div key={section}>
            <p className="text-[10px] font-semibold tracking-widest text-white/30 px-2 mb-1.5">
              {section}
            </p>
            <ul className="space-y-0.5">
              {items.map(({ label, path, icon: Icon }) => (
                <li key={path}>
                  <NavLink
                    to={path}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors
                       ${isActive
                         ? 'border-l-2 border-fourmiliance-ocre bg-fourmiliance-ocre/10 text-white pl-[6px]'
                         : 'text-white/60 hover:bg-white/5 hover:text-white/90'
                       }`
                    }
                  >
                    <Icon size={16} className="flex-shrink-0" />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer utilisateur */}
      {profile && (
        <div className="px-3 pb-4">
          <div className="border-t border-white/10 pt-4 flex items-center gap-2.5 min-h-[44px]">
            <Initials name={profile.full_name} />
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-medium truncate">{profile.full_name}</p>
              <p className="text-white/40 text-[10px] truncate">{roleLabel(profile.role)}</p>
            </div>
            <button
              onClick={signOut}
              aria-label="Se déconnecter"
              className="text-white/30 hover:text-white/70 transition flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </aside>
  )

  return (
    <div className="min-h-screen bg-fourmiliance-cream flex">
      {/* Skip link */}
      <a href="#main-content" className="skip-link">
        Aller au contenu principal
      </a>

      {/* Sidebar desktop */}
      <div className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-[240px]">
        {sidebar}
      </div>

      {/* Sidebar mobile — overlay */}
      {open && (
        <div className="fixed inset-0 z-40 flex md:hidden" role="dialog" aria-modal="true" aria-label="Menu de navigation">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-50 flex flex-col w-[240px] h-full">
            {sidebar}
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-col flex-1 md:ml-[240px] min-h-screen">

        {/* Topbar */}
        <header className="h-14 bg-white border-b border-fourmiliance-border flex items-center gap-4 px-4 flex-shrink-0 sticky top-0 z-30">
          <button
            className="md:hidden text-fourmiliance-forest min-w-[44px] min-h-[44px] flex items-center justify-center"
            onClick={() => setOpen(true)}
            aria-label="Ouvrir le menu"
            aria-expanded={open}
          >
            <Menu size={20} />
          </button>

          <PageTitle />

          <div className="ml-auto flex items-center gap-3">
            <button
              className="text-fourmiliance-ghost hover:text-fourmiliance-forest transition relative min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Notifications"
            >
              <Bell size={18} aria-hidden="true" />
            </button>
            {profile && <Initials name={profile.full_name} />}
          </div>
        </header>

        {/* Contenu */}
        <main id="main-content" className="flex-1 p-6" tabIndex={-1}>
          <Outlet />
        </main>

      </div>
    </div>
  )
}
