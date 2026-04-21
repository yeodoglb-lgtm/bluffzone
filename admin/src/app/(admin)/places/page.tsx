import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Place = {
  id: string
  name: string
  address: string | null
  phone: string | null
  min_buyin: number | null
  max_buyin: number | null
  created_at: string
}

async function getPlaces(): Promise<Place[]> {
  const { data, error } = await supabase
    .from('places')
    .select('id, name, address, phone, min_buyin, max_buyin, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return []
  return data ?? []
}

function formatBuyin(min: number | null, max: number | null) {
  if (min == null && max == null) return '—'
  const minStr = min != null ? min.toLocaleString() : '?'
  const maxStr = max != null ? max.toLocaleString() : '?'
  return `${minStr} ~ ${maxStr}`
}

export default async function PlacesPage() {
  const places = await getPlaces()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">플레이스</h1>
        <Link
          href="/places/new"
          className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + 장소 추가
        </Link>
      </div>
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400">
              <th className="text-left px-5 py-3 font-medium">이름</th>
              <th className="text-left px-5 py-3 font-medium">주소</th>
              <th className="text-left px-5 py-3 font-medium">전화</th>
              <th className="text-left px-5 py-3 font-medium">바이인 범위</th>
            </tr>
          </thead>
          <tbody>
            {places.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-zinc-500">
                  등록된 장소가 없습니다.
                </td>
              </tr>
            ) : (
              places.map((place) => (
                <tr
                  key={place.id}
                  className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/50 transition-colors"
                >
                  <td className="px-5 py-3 text-white font-medium">
                    {place.name}
                  </td>
                  <td className="px-5 py-3 text-zinc-400">
                    {place.address ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-zinc-400">
                    {place.phone ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-zinc-400">
                    {formatBuyin(place.min_buyin, place.max_buyin)}
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
