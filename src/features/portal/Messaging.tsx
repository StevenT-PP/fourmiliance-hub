import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Send } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth.tsx'
import type { Message } from '../../types'
import { formatDateTime, getInitials } from '../../lib/utils'

// ─── Composant principal ─────────────────────────────────────────────────────

export default function Messaging({ projectId }: { projectId: string }) {
  const { user, profile } = useAuth()
  const queryClient = useQueryClient()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)

  // Fetch initial des messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:sender_id(id, full_name, avatar_url, role)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as Message[]
    },
  })

  // Abonnement Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          // On invalide la query pour recharger — plus simple que d'injecter le payload
          void queryClient.invalidateQueries({ queryKey: ['messages', projectId] })
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [projectId, queryClient])

  // Scroll vers le bas à chaque nouveau message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    const text = content.trim()
    if (!text || !user) return
    setSending(true)
    setContent('')
    await supabase.from('messages').insert({
      project_id: projectId,
      sender_id:  user.id,
      content:    text,
    })
    setSending(false)
  }

  const isAgency = (role: string | undefined) =>
    role === 'admin' || role === 'sous_traitant'

  const myRole = profile?.role

  return (
    <div className="flex flex-col" style={{ minHeight: '320px' }}>
      {/* Fil de messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1" style={{ maxHeight: '400px' }}>
        {isLoading && (
          <p className="text-xs text-[#9A9A9A] text-center py-4">Chargement…</p>
        )}
        {!isLoading && messages.length === 0 && (
          <p className="text-sm text-[#9A9A9A] text-center py-8">
            Aucun message pour le moment. Démarrez la conversation !
          </p>
        )}

        {messages.map(msg => {
          const senderRole  = msg.sender?.role
          const isFromAgency = isAgency(senderRole)
          const isMine      = msg.sender_id === user?.id
          const alignRight  = isMine || (isFromAgency && isAgency(myRole))

          return (
            <div key={msg.id} className={`flex gap-2 ${alignRight ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center
                               text-white text-[10px] font-semibold flex-shrink-0
                ${isFromAgency ? 'bg-fourmiliance-mid' : 'bg-sky-500'}`}>
                {msg.sender?.full_name ? getInitials(msg.sender.full_name) : '?'}
              </div>

              {/* Bulle */}
              <div className={`max-w-[75%] ${alignRight ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed
                  ${alignRight
                    ? 'bg-fourmiliance-mid text-white rounded-tr-sm'
                    : 'bg-white border border-[#E0DAD0] text-[#2A2A2A] rounded-tl-sm'
                  }`}>
                  {msg.content}
                </div>
                <p className="text-[10px] text-[#9A9A9A] mt-1 px-1">
                  {msg.sender?.full_name ?? 'Inconnu'} · {formatDateTime(msg.created_at)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Zone de saisie */}
      <form
        onSubmit={e => void sendMessage(e)}
        className="flex gap-2 items-end border-t border-[#E0DAD0] pt-4"
      >
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void sendMessage(e as unknown as React.FormEvent)
            }
          }}
          placeholder="Écrire un message… (Entrée pour envoyer)"
          rows={2}
          disabled={sending}
          className="flex-1 border border-[#E0DAD0] rounded-xl px-3 py-2 text-sm resize-none
                     focus:outline-none focus:ring-2 focus:ring-fourmiliance-mid/30
                     disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={sending || !content.trim()}
          className="flex items-center justify-center w-10 h-10 bg-fourmiliance-mid text-white
                     rounded-xl hover:bg-fourmiliance-forest transition-colors
                     disabled:opacity-40 flex-shrink-0"
          aria-label="Envoyer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
