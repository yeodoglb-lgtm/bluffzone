import Link from 'next/link'

const navLinks = [
  { href: '/dashboard', label: '대시보드' },
  { href: '/users', label: '사용자' },
  { href: '/hands', label: '핸드' },
  { href: '/places', label: '플레이스' },
  { href: '/usage', label: 'AI 사용량' },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 bg-zinc-900 border-r border-zinc-800 flex flex-col shrink-0">
        <div className="px-6 py-5 border-b border-zinc-800">
          <span className="text-orange-500 font-bold text-xl tracking-tight">
            BluffZone
          </span>
          <span className="text-zinc-400 text-sm ml-1">Admin</span>
        </div>
        <nav className="flex flex-col gap-1 p-3 flex-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-sm"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
