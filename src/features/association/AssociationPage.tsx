import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { AssociationMember, AssociationEvent } from '../../types'
import { formatDate } from '../../lib/utils'
import FundTracker from '../finance/FundTracker'
import { Users, Calendar, MapPin, Leaf } from 'lucide-react'

export default function AssociationPage() {
  const [tab, setTab] = useState<'membres' | 'evenements' | 'fonds'>('membres')

  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['association-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('association_members')
        .select('*')
        .order('joined_date', { ascending: false })
      if (error) throw error
      return (data ?? []) as AssociationMember[]
    },
  })

  const { data: events = [] } = useQuery({
    queryKey: ['association-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('association_events')
        .select('*')
        .order('date', { ascending: true })
      if (error) throw error
      return (data ?? []) as AssociationEvent[]
    },
  })

  const activeMembers = members.filter(m => m.active)
  const upcomingEvents = events.filter(
    e => !e.date || e.date >= new Date().toISOString().slice(0, 10)
  )

  return (
    <div className="space-y-6">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1E4010, #2D5A1B)' }}>
        <div className="p-8 text-white">
          <div className="flex items-center gap-3 mb-3">
            <Leaf className="w-6 h-6 text-fourmiliance-ocre-light" />
            <h1 className="font-heading text-2xl font-semibold">Fourmiliance</h1>
          </div>
          <p className="text-white/70 text-sm max-w-lg">
            Association loi 1901 — Écovillage entrepreneurial en Occitanie.
            Phase actuelle : recherche d'un local pour bar associatif à Perpignan.
          </p>
          <div className="flex flex-wrap gap-6 mt-5 text-sm text-white/70">
            <span>
              <strong className="text-white">{activeMembers.length}</strong> membres actifs
            </span>
            <span>
              <strong className="text-white">{upcomingEvents.length}</strong> événements à venir
            </span>
          </div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-[#EDE8DF] p-1 rounded-xl w-fit">
        {([
          { key: 'membres',     label: 'Membres',     icon: Users },
          { key: 'evenements',  label: 'Événements',  icon: Calendar },
          { key: 'fonds',       label: 'Fonds',       icon: Leaf },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-colors
              ${tab === key
                ? 'bg-white text-fourmiliance-forest font-medium shadow-sm'
                : 'text-[#7A7A7A] hover:text-[#5A5A5A]'
              }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Contenu tabs ─────────────────────────────────────────────────── */}
      {tab === 'membres' && (
        <div className="bg-white rounded-xl border border-[#E0DAD0] p-6">
          <h2 className="font-heading text-base text-fourmiliance-forest mb-4">
            Membres ({activeMembers.length} actifs)
          </h2>
          {loadingMembers ? (
            <p className="text-sm text-[#9A9A9A]">Chargement…</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-[#9A9A9A]">Aucun membre enregistré.</p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm min-w-[420px]">
                <thead>
                  <tr className="text-left border-b border-[#E0DAD0]">
                    <th className="px-2 pb-2 text-xs font-semibold text-[#7A7A7A] uppercase tracking-wide">Nom</th>
                    <th className="px-2 pb-2 text-xs font-semibold text-[#7A7A7A] uppercase tracking-wide">Rôle</th>
                    <th className="px-2 pb-2 text-xs font-semibold text-[#7A7A7A] uppercase tracking-wide">Adhésion</th>
                    <th className="px-2 pb-2 text-xs font-semibold text-[#7A7A7A] uppercase tracking-wide">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EBE4]">
                  {members.map(m => (
                    <tr key={m.id} className="hover:bg-[#FAFAF8]">
                      <td className="px-2 py-2.5">
                        <p className="font-medium text-[#2A2A2A]">{m.full_name}</p>
                        {m.email && <p className="text-xs text-[#9A9A9A]">{m.email}</p>}
                      </td>
                      <td className="px-2 py-2.5 text-[#5A5A5A] text-xs">{m.role ?? '—'}</td>
                      <td className="px-2 py-2.5 text-xs text-[#7A7A7A] whitespace-nowrap">
                        {m.joined_date ? formatDate(m.joined_date) : '—'}
                      </td>
                      <td className="px-2 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full
                          ${m.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {m.active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'evenements' && (
        <div className="bg-white rounded-xl border border-[#E0DAD0] p-6">
          <h2 className="font-heading text-base text-fourmiliance-forest mb-4">
            Événements à venir
          </h2>
          {events.length === 0 ? (
            <p className="text-sm text-[#9A9A9A]">Aucun événement planifié.</p>
          ) : (
            <div className="space-y-3">
              {events.map(e => (
                <div key={e.id}
                  className="flex gap-4 p-4 border border-[#E0DAD0] rounded-xl">
                  <div className="bg-fourmiliance-forest/10 rounded-lg px-3 py-2 text-center flex-shrink-0">
                    {e.date ? (
                      <>
                        <p className="text-lg font-heading font-semibold text-fourmiliance-forest leading-none">
                          {new Date(e.date).getDate()}
                        </p>
                        <p className="text-[10px] text-[#7A7A7A] uppercase">
                          {new Date(e.date).toLocaleDateString('fr-FR', { month: 'short' })}
                        </p>
                      </>
                    ) : (
                      <Calendar className="w-5 h-5 text-fourmiliance-forest" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1A1A1A]">{e.title}</p>
                    {e.description && (
                      <p className="text-xs text-[#5A5A5A] mt-0.5 leading-relaxed">{e.description}</p>
                    )}
                    {e.location && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <MapPin className="w-3 h-3 text-[#9A9A9A]" />
                        <span className="text-xs text-[#7A7A7A]">{e.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'fonds' && (
        <div className="bg-white rounded-xl border border-fourmiliance-ocre/30 p-6">
          <FundTracker />
        </div>
      )}

    </div>
  )
}
