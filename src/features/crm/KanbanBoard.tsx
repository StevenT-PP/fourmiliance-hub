import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { GripVertical } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { Contact } from '../../types'
import type { PipelineStage } from '../../lib/constants'
import { SERVICE_LABELS } from '../../lib/constants'
import { formatCurrency, getInitials } from '../../lib/utils'

const COLUMNS: { key: PipelineStage; label: string }[] = [
  { key: 'prospect', label: 'Prospect'     },
  { key: 'contacte', label: 'Contacté'     },
  { key: 'devis',    label: 'Devis envoyé' },
  { key: 'signe',    label: 'Signé'        },
  { key: 'en_cours', label: 'En cours'     },
  { key: 'livre',    label: 'Livré'        },
]

interface Props {
  contacts: Contact[]
}

export default function KanbanBoard({ contacts }: Props) {
  const queryClient            = useQueryClient()
  const { user }               = useAuth()
  const [dragOverStage, setDragOverStage] = useState<PipelineStage | null>(null)
  const [draggingId,    setDraggingId]    = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async ({
      contactId,
      fromStage,
      toStage,
    }: {
      contactId: string
      fromStage: PipelineStage
      toStage:   PipelineStage
    }) => {
      const { error } = await supabase
        .from('contacts')
        .update({ pipeline_stage: toStage, updated_at: new Date().toISOString() })
        .eq('id', contactId)
      if (error) throw error

      if (user) {
        await supabase.from('activity_log').insert({
          user_id:     user.id,
          action:      'contact_stage_changed',
          entity_type: 'contact',
          entity_id:   contactId,
          metadata:    { from: fromStage, to: toStage },
        })
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })

  function handleDragStart(e: React.DragEvent, contact: Contact) {
    e.dataTransfer.setData('contactId', contact.id)
    e.dataTransfer.setData('fromStage', contact.pipeline_stage)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingId(contact.id)
  }

  function handleDragEnd() {
    setDraggingId(null)
    setDragOverStage(null)
  }

  function handleDragOver(e: React.DragEvent, stage: PipelineStage) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStage(stage)
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setDragOverStage(null)
    }
  }

  function handleDrop(e: React.DragEvent, toStage: PipelineStage) {
    e.preventDefault()
    setDragOverStage(null)
    setDraggingId(null)
    const contactId = e.dataTransfer.getData('contactId')
    const fromStage = e.dataTransfer.getData('fromStage') as PipelineStage
    if (!contactId || fromStage === toStage) return
    mutation.mutate({ contactId, fromStage, toStage })
  }

  const grouped = contacts.reduce<Partial<Record<PipelineStage, Contact[]>>>((acc, c) => {
    if (!acc[c.pipeline_stage]) acc[c.pipeline_stage] = []
    acc[c.pipeline_stage]!.push(c)
    return acc
  }, {})

  return (
    <div className="flex gap-3.5 overflow-x-auto pb-3 min-h-[400px]">
      {COLUMNS.map(col => {
        const colContacts = grouped[col.key] ?? []
        const isOver      = dragOverStage === col.key

        return (
          <div
            key={col.key}
            className={`min-w-[200px] flex-1 bg-fourmiliance-cream-dark rounded-xl p-3 transition-all ${
              isOver ? 'ring-2 ring-fourmiliance-mid ring-offset-1 bg-fourmiliance-cream' : ''
            }`}
            onDragOver={e  => handleDragOver(e, col.key)}
            onDragLeave={handleDragLeave}
            onDrop={e      => handleDrop(e, col.key)}
          >
            {/* En-tête colonne */}
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[12px] font-semibold text-fourmiliance-tertiary uppercase tracking-[.5px]">
                {col.label}
              </span>
              <span className="bg-white text-fourmiliance-ghost text-[11px] font-semibold px-1.5 py-0.5 rounded-full min-w-[22px] text-center">
                {colContacts.length}
              </span>
            </div>

            {/* Cartes */}
            <div className="space-y-2">
              {colContacts.map(contact => (
                <KanbanCard
                  key={contact.id}
                  contact={contact}
                  isDragging={draggingId === contact.id}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </div>

            {/* Zone drop vide */}
            {colContacts.length === 0 && (
              <div
                className={`rounded-lg border-2 border-dashed p-4 text-center text-xs transition-colors ${
                  isOver
                    ? 'border-fourmiliance-mid text-fourmiliance-mid bg-white/60'
                    : 'border-fourmiliance-border text-fourmiliance-ghost'
                }`}
              >
                Déposer ici
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function KanbanCard({
  contact,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  contact:     Contact
  isDragging:  boolean
  onDragStart: (e: React.DragEvent, contact: Contact) => void
  onDragEnd:   () => void
}) {
  const navigate    = useNavigate()
  const wasDragging = useRef(false)

  const isDevis   = contact.pipeline_stage === 'devis'
  const isSigne   = contact.pipeline_stage === 'signe'
  const isEnCours = contact.pipeline_stage === 'en_cours'
  const isLivre   = contact.pipeline_stage === 'livre'

  function handleDragStart(e: React.DragEvent) {
    wasDragging.current = true
    onDragStart(e, contact)
  }

  function handleDragEnd() {
    onDragEnd()
    setTimeout(() => { wasDragging.current = false }, 120)
  }

  function handleClick() {
    if (wasDragging.current) return
    navigate(`/app/crm/${contact.id}`)
  }

  const borderStyle: React.CSSProperties = isDevis
    ? { borderLeft: '3px solid #B87520' }   // fourmiliance-ocre
    : isSigne
    ? { borderLeft: '3px solid #2D5A1B' }   // fourmiliance-mid
    : {}

  return (
    <div
      draggable
      tabIndex={0}
      role="button"
      aria-label={`${contact.company} — ${contact.contact_name}${contact.estimated_value != null ? ` — ${formatCurrency(contact.estimated_value)}` : ''}`}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleClick()}
      style={borderStyle}
      className={[
        'bg-white rounded-lg p-3 border border-fourmiliance-border',
        'cursor-grab active:cursor-grabbing transition-all select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fourmiliance-mid',
        isDragging ? 'opacity-40 shadow-card'        : '',
        !isDragging ? 'hover:shadow-md hover:-translate-y-px' : '',
        isLivre && !isDragging ? 'opacity-75'        : '',
      ].filter(Boolean).join(' ')}
    >
      {/* Ligne 1 : nom + poignée */}
      <div className="flex items-start justify-between gap-1.5 mb-1.5">
        <span className="text-[13px] font-semibold text-fourmiliance-ink leading-tight">
          {contact.company}
        </span>
        <GripVertical size={13} className="text-fourmiliance-ghost flex-shrink-0 mt-0.5" />
      </div>

      {/* Ligne 2 : contact + ville */}
      <div className="text-xs text-fourmiliance-tertiary mb-2 leading-tight">
        {contact.contact_name}
        {contact.city ? ` · ${contact.city}` : ''}
      </div>

      {/* Valeur estimée (devis / signé) */}
      {(isDevis || isSigne) && contact.estimated_value != null && (
        <div
          className={`text-xs font-semibold mb-2 ${
            isSigne ? 'text-fourmiliance-mid' : 'text-fourmiliance-ocre'
          }`}
        >
          {formatCurrency(contact.estimated_value)}
          <span className="font-normal text-fourmiliance-ghost">
            {isDevis ? ' · En attente' : ' · Signé'}
          </span>
        </div>
      )}

      {/* Barre de progression (en cours) */}
      {isEnCours && (
        <div className="mb-2">
          <div className="h-1.5 bg-fourmiliance-cream-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-fourmiliance-mid rounded-full transition-all"
              style={{ width: '50%' }}
            />
          </div>
        </div>
      )}

      {/* Footer : badge service + avatar + date */}
      <div className="flex items-center justify-between">
        {contact.service_type ? (
          <span className={`badge ${SERVICE_LABELS[contact.service_type].badge}`}>
            {SERVICE_LABELS[contact.service_type].label}
          </span>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-1.5">
          {contact.assignee && (
            <div
              role="img"
              aria-label={`Assigné à ${contact.assignee.full_name}`}
              className="w-[26px] h-[26px] rounded-full bg-fourmiliance-mid text-white flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
            >
              {getInitials(contact.assignee.full_name)}
            </div>
          )}
          <span className="text-[11px] text-fourmiliance-ghost">
            {relativeDate(contact.updated_at)}
          </span>
        </div>
      </div>

      {/* Badge livré */}
      {isLivre && (
        <div className="mt-1.5 flex justify-end">
          <span className="badge badge-pine">
            ✓ Livré
          </span>
        </div>
      )}
    </div>
  )
}

function relativeDate(dateStr: string): string {
  const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  if (diffDays === 0) return "Aujourd'hui"
  if (diffDays === 1) return 'Hier'
  if (diffDays < 7)  return `Il y a ${diffDays}j`
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
