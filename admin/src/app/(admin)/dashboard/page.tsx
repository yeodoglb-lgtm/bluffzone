import { Suspense } from 'react'
import { supabase } from '@/lib/supabase'

async function getStats() {
  const [users, sessions, hands, aiReviews] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('sessions').select('*', { count: 'exact', head: true }),
    supabase.from('hands').select('*', { count: 'exact', head: true }),
    supabase.from('ai_reviews').select('*', { count: 'exact', head: true }),
  ])

  return {
    users: users.count ?? 0,
    sessions: sessions.count ?? 0,
    hands: hands.count ?? 0,
    aiReviews: aiReviews.count ?? 0,
  }
}

const statCards = [
  { label: '총 사용자', key: 'users' as const },
  { label: '총 세션', key: 'sessions' as const },
  { label: '총 핸드', key: 'hands' as const },
  { label: 'AI 리뷰 수', key: 'aiReviews' as const },
]

async function StatsGrid() {
  const stats = await getStats()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((card) => (
        <div
          key={card.key}
          className="bg-zinc-900 rounded-xl border border-zinc-800 p-6"
        >
          <p className="text-zinc-400 text-sm mb-2">{card.label}</p>
          <p className="text-3xl font-bold text-white">
            {stats[card.key].toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 animate-pulse"
        >
          <div className="h-4 bg-zinc-800 rounded w-24 mb-3" />
          <div className="h-8 bg-zinc-800 rounded w-16" />
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">대시보드</h1>
      <Suspense fallback={<StatsSkeleton />}>
        <StatsGrid />
      </Suspense>
    </div>
  )
}
