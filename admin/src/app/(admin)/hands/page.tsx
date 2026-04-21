import { supabase } from '@/lib/supabase'

type Hand = {
  id: string
  user_id: string | null
  place_id: string | null
  created_at: string
  result: string | null
}

async function getHands(): Promise<Hand[]> {
  const { data, error } = await supabase
    .from('hands')
    .select('id, user_id, place_id, created_at, result')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return []
  return data ?? []
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export default async function HandsPage() {
  const hands = await getHands()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">핸드</h1>
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400">
              <th className="text-left px-5 py-3 font-medium">ID</th>
              <th className="text-left px-5 py-3 font-medium">사용자 ID</th>
              <th className="text-left px-5 py-3 font-medium">결과</th>
              <th className="text-left px-5 py-3 font-medium">날짜</th>
            </tr>
          </thead>
          <tbody>
            {hands.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-zinc-500">
                  핸드가 없습니다.
                </td>
              </tr>
            ) : (
              hands.map((hand) => (
                <tr
                  key={hand.id}
                  className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/50 transition-colors"
                >
                  <td className="px-5 py-3 text-zinc-400 font-mono text-xs">
                    {hand.id.slice(0, 8)}…
                  </td>
                  <td className="px-5 py-3 text-zinc-400 font-mono text-xs">
                    {hand.user_id ? hand.user_id.slice(0, 8) + '…' : '—'}
                  </td>
                  <td className="px-5 py-3 text-white">{hand.result ?? '—'}</td>
                  <td className="px-5 py-3 text-zinc-400">
                    {formatDate(hand.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
