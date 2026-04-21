import { supabase } from '@/lib/supabase'

type UsageRow = {
  id: string
  user_id: string | null
  model: string | null
  prompt_tokens: number | null
  completion_tokens: number | null
  created_at: string
}

async function getUsage(): Promise<UsageRow[]> {
  const { data, error } = await supabase
    .from('ai_reviews')
    .select('id, user_id, model, prompt_tokens, completion_tokens, created_at')
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

export default async function UsagePage() {
  const rows = await getUsage()

  const totalPrompt = rows.reduce((s, r) => s + (r.prompt_tokens ?? 0), 0)
  const totalCompletion = rows.reduce(
    (s, r) => s + (r.completion_tokens ?? 0),
    0
  )

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">AI 사용량</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <p className="text-zinc-400 text-sm mb-2">총 리뷰 수</p>
          <p className="text-3xl font-bold">{rows.length.toLocaleString()}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <p className="text-zinc-400 text-sm mb-2">총 프롬프트 토큰</p>
          <p className="text-3xl font-bold">{totalPrompt.toLocaleString()}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <p className="text-zinc-400 text-sm mb-2">총 컴플리션 토큰</p>
          <p className="text-3xl font-bold">
            {totalCompletion.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400">
              <th className="text-left px-5 py-3 font-medium">사용자 ID</th>
              <th className="text-left px-5 py-3 font-medium">모델</th>
              <th className="text-right px-5 py-3 font-medium">프롬프트</th>
              <th className="text-right px-5 py-3 font-medium">컴플리션</th>
              <th className="text-left px-5 py-3 font-medium">날짜</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-zinc-500">
                  AI 사용 기록이 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/50 transition-colors"
                >
                  <td className="px-5 py-3 text-zinc-400 font-mono text-xs">
                    {row.user_id ? row.user_id.slice(0, 8) + '…' : '—'}
                  </td>
                  <td className="px-5 py-3 text-white">{row.model ?? '—'}</td>
                  <td className="px-5 py-3 text-zinc-400 text-right">
                    {row.prompt_tokens?.toLocaleString() ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-zinc-400 text-right">
                    {row.completion_tokens?.toLocaleString() ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-zinc-400">
                    {formatDate(row.created_at)}
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
