import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { ActivityLog } from '../types'

const LS_KEY = 'fourmiliance_notif_last_seen'

function getLastSeen(): string {
  return localStorage.getItem(LS_KEY) ?? new Date(0).toISOString()
}

export function useNotifications() {
  const [lastSeen, setLastSeen] = useState<string>(getLastSeen)

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*, actor:user_id(full_name)')
        .order('created_at', { ascending: false })
        .limit(15)
      if (error) throw error
      return (data ?? []) as ActivityLog[]
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const unreadCount = notifications.filter(
    n => n.created_at > lastSeen,
  ).length

  const markAllRead = useCallback(() => {
    const now = new Date().toISOString()
    localStorage.setItem(LS_KEY, now)
    setLastSeen(now)
  }, [])

  return { notifications, unreadCount, markAllRead, lastSeen }
}
