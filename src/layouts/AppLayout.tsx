import { useState, useRef, type ElementType } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, FolderKanban, TrendingUp, ExternalLink,
  Clock, Landmark, Building2, UserCog, Settings, Menu, Bell,
  PhoneCall, Target, Eye, Package, Database,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth.tsx'
import { useNotifications } from '../hooks/useNotifications'
import NotificationDropdown from '../features/notifications/NotificationDropdown'

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
    section: 'COMMERCIAL',
    items: [
      { label: 'Supervision',   path: '/app/supervision', icon: Eye },
      { label: 'Leads',         path: '/app/leads',       icon: Database },
      { label: 'Appels',        path: '/app/appels',      icon: PhoneCall },
      { label: 'Campagnes',     path: '/app/campagnes',   icon: Target },
      { label: 'Produits',      path: '/app/produits',    icon: Package },
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
      { label: 'Équipe',       path: '/app/team',       icon: UserCog },
      { label: 'Mes tâches',   path: '/app/mes-taches', icon: Clock },
      { label: 'Paramètres',   path: '/app/settings',   icon: Settings },
    ],
  },
]

const commercialNav: NavSection[] = [
  {
    section: 'MES APPELS',
    items: [
      { label: 'Appels',    path: '/app/appels',    icon: PhoneCall },
      { label: 'Leads',     path: '/app/leads',     icon: Database },
      { label: 'Campagnes', path: '/app/campagnes', icon: Target },
      { label: 'Produits',  path: '/app/produits',  icon: Package },
    ],
  },
  {
    section: 'COMPTE',
    items: [
      { label: 'Paramètres', path: '/app/settings', icon: Settings },
    ],
  },
]

const contractorNav: NavSection[] = [
  {
    section: 'MES APPELS',
    items: [
      { label: 'Appels',    path: '/app/appels',    icon: PhoneCall },
      { label: 'Leads',     path: '/app/leads',     icon: Database },
    ],
  },
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
    commercial: 'Commercial',
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
  // Sort by descending path length so /app/association/fonds matches before /app/association
  const allItems = adminNav.flatMap(s => s.items)
    .sort((a, b) => b.path.length - a.path.length)
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
  const [notifOpen, setNotifOpen] = useState(false)
  const bellRef = useRef<HTMLButtonElement>(null)
  const { unreadCount } = useNotifications()

  const nav = profile?.role === 'commercial'
    ? commercialNav
    : profile?.role === 'sous_traitant'
      ? contractorNav
      : adminNav

  const sidebar = (
    <aside className="w-[240px] flex-shrink-0 bg-fourmiliance-deep flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 flex items-center gap-3">
        <svg viewBox="0 0 30 24" className="w-8 h-6 flex-shrink-0" aria-hidden="true">
          <circle cx="2.5" cy="19"  r="2"   fill="white" opacity="0.35"/>
          <circle cx="8"   cy="13"  r="2.5" fill="white" opacity="0.52"/>
          <circle cx="14.5" cy="8.5" r="3"  fill="white" opacity="0.7"/>
          <circle cx="22"  cy="6"   r="3.5" fill="white" opacity="0.87"/>
          <circle cx="29"  cy="8.5" r="2.7" fill="white" opacity="0.65"/>
        </svg>
        <div className="min-w-0">
          <span className="font-brand italic text-white text-[1.1rem] tracking-wide leading-none block">
            fourmiliance
          </span>
          <span className="text-white/35 text-[9px] tracking-[0.22em] uppercase font-sans leading-none mt-0.5 block">
            hub
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-3 pb-4 space-y-6">
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
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50
                       ${isActive
                         ? 'border-l-2 border-fourmiliance-ocre bg-fourmiliance-ocre/10 text-white pl-[6px]'
                         : 'text-white/60 hover:bg-white/5 hover:text-white/90'
                       }`
                    }
                  >
                    <Icon size={16} className="flex-shrink-0" aria-hidden="true" />
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

          <div className="ml-auto flex items-center gap-3 relative">
            <button
              ref={bellRef}
              className="text-fourmiliance-ghost hover:text-fourmiliance-forest transition relative min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fourmiliance-mid rounded-lg"
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
              aria-expanded={notifOpen}
              aria-haspopup="dialog"
              onClick={() => setNotifOpen(v => !v)}
            >
              <Bell size={18} aria-hidden="true" />
              {unreadCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute top-2 right-2 w-4 h-4 rounded-full bg-fourmiliance-mid text-white text-[9px] font-bold flex items-center justify-center leading-none"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <NotificationDropdown
              open={notifOpen}
              onClose={() => setNotifOpen(false)}
              anchorRef={bellRef}
            />
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
