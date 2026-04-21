import { supabase } from '@/lib/supabase'

type Profile = {
  id: string
  display_name: string | null
  role: string | null
  created_at: string
}

async function getUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, role, created_at')
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

export default async function UsersPage() {
  const users = await getUsers()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">사용자</h1>
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400">
              <th className="text-left px-5 py-3 font-medium">이름</th>
              <th className="text-left px-5 py-3 font-medium">역할</th>
              <th className="text-left px-5 py-3 font-medium">가입일</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-8 text-center text-zinc-500">
                  사용자가 없습니다.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/50 transition-colors"
                >
                  <td className="px-5 py-3 text-white">
                    {user.display_name ?? '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-zinc-400 capitalize">
                      {user.role ?? '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-zinc-400">
                    {formatDate(user.created_at)}
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
