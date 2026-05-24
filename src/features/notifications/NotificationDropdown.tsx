import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, CheckCheck, ArrowRight, User, FolderKanban,
  Receipt, CheckSquare, Upload, FileText,
} from 'lucide-react'
import { useNotifications } from '../../hooks/useNotifications'
import { formatRelativeTime } from '../../lib/utils'
import type { ActivityLog } from '../../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTION_MAP: Record<string, { label: string; IconEl: typeof Bell }> = {
  contact_stage_changed: { label: 'Contact déplacé',     IconEl: ArrowRight  },
  note_added:            { label: 'Note ajoutée',        IconEl: User        },
  task_status_changed:   { label: 'Tâche mise à jour',   IconEl: CheckSquare },
  invoice_created:       { label: 'Facture créée',       IconEl: Receipt     },
  devis_created:         { label: 'Devis créé',          IconEl: FileText    },
  file_uploaded:         { label: 'Fichier uploadé',     IconEl: Upload      },
  project_created:       { label: 'Projet créé',        IconEl: FolderKanban },
}

function actionInfo(action: string) {
  return ACTION_MAP[action] ?? { label: action.replace(/_/g, ' '), IconEl: Bell }
}

function navPath(notif: ActivityLog): string | null {
  if (!notif.entity_id) return null
  switch (notif.entity_type) {
    case 'contact': return `/app/crm/${notif.entity_id}`
    case 'project': return `/app/projects/${notif.entity_id}`
    case 'invoice': return '/app/finance'
    case 'task':    return '/app/mes-taches'
    default:        return null
  }
}

function NotifItem({ notif, isNew, onNavigate }: { notif: ActivityLog; isNew: boolean; onNavigate: (path: string) => void }) {
  const { label, IconEl } = actionInfo(notif.action)
  const path = navPath(notif)
  return (
    <li
      className={`flex gap-3 px-4 py-3 hover:bg-fourmiliance-cream/60 transition-colors
                  ${isNew ? 'bg-fourmiliance-success-bg/20' : ''}
                  ${path ? 'cursor-pointer' : ''}`}
      onClick={path ? () => onNavigate(path) : undefined}
      role={path ? 'button' : undefined}
      tabIndex={path ? 0 : undefined}
      onKeyDown={path ? (e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate(path) } : undefined}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5
                       ${isNew ? 'bg-fourmiliance-mid/20 text-fourmiliance-mid' : 'bg-gray-100 text-fourmiliance-ghost'}`}>
        <IconEl size={14} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-fourmiliance-body leading-snug">
          <strong className="text-fourmiliance-forest">
            {notif.actor?.full_name ?? 'Système'}
          </strong>
          {' — '}
          {label}
          {notif.entity_label ? ` : ${notif.entity_label}` : ''}
        </p>
        <p className="text-[10px] text-fourmiliance-ghost mt-0.5">
          {formatRelativeTime(notif.created_at)}
        </p>
      </div>
      {isNew && (
        <div
          className="w-2 h-2 rounded-full bg-fourmiliance-mid flex-shrink-0 mt-2"
          aria-label="Non lu"
        />
      )}
    </li>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  anchorRef: React.RefObject<HTMLButtonElement | null>
}

export default function NotificationDropdown({ open, onClose, anchorRef }: Props) {
  const { notifications, unreadCount, markAllRead, lastSeen } = useNotifications()
  const navigate = useNavigate()
  const panelRef = useRef<HTMLDivElement>(null)

  function handleNavigate(path: string) {
    markAllRead()
    onClose()
    navigate(path)
  }

  // Click outside to close
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onClose, anchorRef])

  // Escape key to close
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); anchorRef.current?.focus() }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose, anchorRef])

  if (!open) return null

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Notifications"
      className="absolute right-2 top-[calc(100%+6px)] z-50 w-80 bg-white rounded-xl shadow-lg border border-fourmiliance-border overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-fourmiliance-border">
        <h2 className="text-sm font-semibold text-fourmiliance-forest">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-fourmiliance-mid text-white text-[10px] font-bold">
              {unreadCount}
            </span>
          )}
        </h2>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1 text-[10px] text-fourmiliance-body hover:text-fourmiliance-mid transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fourmiliance-mid rounded"
            aria-label="Tout marquer comme lu"
          >
            <CheckCheck size={12} aria-hidden="true" />
            Tout lire
          </button>
        )}
      </div>

      {/* List */}
      {notifications.length === 0 ? (
        <div className="py-10 text-center">
          <Bell size={24} className="mx-auto text-fourmiliance-ghost mb-2" aria-hidden="true" />
          <p className="text-xs text-fourmiliance-ghost">Aucune activité récente</p>
        </div>
      ) : (
        <ul
          role="list"
          aria-label="Liste des notifications"
          className="divide-y divide-fourmiliance-border max-h-96 overflow-y-auto"
        >
          {notifications.map(notif => (
            <NotifItem
              key={notif.id}
              notif={notif}
              isNew={notif.created_at > lastSeen}
              onNavigate={handleNavigate}
            />
          ))}
        </ul>
      )}

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-fourmiliance-border bg-fourmiliance-cream/40">
        <p className="text-[10px] text-fourmiliance-ghost text-center">
          15 activités les plus récentes
        </p>
      </div>
    </div>
  )
}
