'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type FormState = {
  name: string
  address: string
  lat: string
  lng: string
  phone: string
  description: string
  games: string
  min_buyin: string
  max_buyin: string
}

const initialForm: FormState = {
  name: '',
  address: '',
  lat: '',
  lng: '',
  phone: '',
  description: '',
  games: '',
  min_buyin: '',
  max_buyin: '',
}

export default function NewPlacePage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(initialForm)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const payload = {
      name: form.name.trim(),
      address: form.address.trim() || null,
      lat: form.lat ? parseFloat(form.lat) : null,
      lng: form.lng ? parseFloat(form.lng) : null,
      phone: form.phone.trim() || null,
      description: form.description.trim() || null,
      games: form.games
        ? form.games.split(',').map((g) => g.trim()).filter(Boolean)
        : null,
      min_buyin: form.min_buyin ? parseInt(form.min_buyin, 10) : null,
      max_buyin: form.max_buyin ? parseInt(form.max_buyin, 10) : null,
    }

    const { error: insertError } = await supabase.from('places').insert(payload)

    setLoading(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    router.push('/places')
    router.refresh()
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/places"
          className="text-zinc-400 hover:text-white transition-colors text-sm"
        >
          ← 플레이스
        </Link>
        <span className="text-zinc-700">/</span>
        <h1 className="text-2xl font-bold">새 장소 추가</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 flex flex-col gap-5"
      >
        <Field label="이름 *">
          <input
            required
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="장소 이름"
            className={inputClass}
          />
        </Field>

        <Field label="주소">
          <input
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder="서울시 강남구 …"
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="위도 (lat)">
            <input
              name="lat"
              type="number"
              step="any"
              value={form.lat}
              onChange={handleChange}
              placeholder="37.5665"
              className={inputClass}
            />
          </Field>
          <Field label="경도 (lng)">
            <input
              name="lng"
              type="number"
              step="any"
              value={form.lng}
              onChange={handleChange}
              placeholder="126.9780"
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="전화번호">
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="02-0000-0000"
            className={inputClass}
          />
        </Field>

        <Field label="설명">
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            placeholder="장소 설명"
            className={inputClass + ' resize-none'}
          />
        </Field>

        <Field label="게임 종류 (쉼표 구분)">
          <input
            name="games"
            value={form.games}
            onChange={handleChange}
            placeholder="No-Limit Hold'em, PLO"
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="최소 바이인">
            <input
              name="min_buyin"
              type="number"
              min={0}
              value={form.min_buyin}
              onChange={handleChange}
              placeholder="50000"
              className={inputClass}
            />
          </Field>
          <Field label="최대 바이인">
            <input
              name="max_buyin"
              type="number"
              min={0}
              value={form.max_buyin}
              onChange={handleChange}
              placeholder="500000"
              className={inputClass}
            />
          </Field>
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-950/40 border border-red-800 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg transition-colors text-sm"
          >
            {loading ? '저장 중…' : '장소 추가'}
          </button>
          <Link
            href="/places"
            className="px-6 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors text-sm"
          >
            취소
          </Link>
        </div>
      </form>
    </div>
  )
}

const inputClass =
  'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500 transition-colors'

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-zinc-400">{label}</label>
      {children}
    </div>
  )
}
