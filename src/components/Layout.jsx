import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MODELS } from '../lib/constants'

export default function Layout({ children, model, setModel, kbStatus }) {
  const loc = useLocation()
  const nav = useNavigate()
  const [user, setUser] = useState(null)

  useState(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    nav('/login')
  }

  const navLink = (to, label) => (
    <Link
      to={to}
      className={`text-sm font-medium px-3 py-1 rounded transition-colors ${
        loc.pathname === to
          ? 'bg-white/20 text-white'
          : 'text-white/70 hover:text-white'
      }`}
    >
      {label}
    </Link>
  )

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Top nav */}
      <header className="bg-[#741B47] text-white px-6 py-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3 mr-4">
          <img
            src={import.meta.env.VITE_SELISE_LOGO_URL}
            alt="SELISE"
            className="h-7 object-contain brightness-0 invert"
            onError={e => { e.target.style.display = 'none' }}
          />
          <span className="text-sm font-bold tracking-wide hidden sm:inline">EOI Generator</span>
        </div>

        <nav className="flex items-center gap-1">
          {navLink('/generate', 'Generate')}
          {navLink('/history', 'History')}
          {navLink('/kb', 'Knowledge Base')}
        </nav>

        <div className="ml-auto flex items-center gap-3 flex-wrap">
          {/* KB status */}
          {kbStatus && (
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${kbStatus.cred === 'ok' ? 'bg-green-500/25 text-green-200' : kbStatus.cred === 'loading' ? 'bg-yellow-400/20 text-yellow-200' : 'bg-red-500/20 text-red-300'}`}>
                {kbStatus.cred === 'ok' ? '✓ Credentials' : kbStatus.cred === 'loading' ? '⟳ Credentials' : '✗ Credentials'}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${kbStatus.cvs === 'ok' ? 'bg-green-500/25 text-green-200' : kbStatus.cvs === 'loading' ? 'bg-yellow-400/20 text-yellow-200' : 'bg-red-500/20 text-red-300'}`}>
                {kbStatus.cvs === 'ok' ? '✓ CVs' : kbStatus.cvs === 'loading' ? '⟳ CVs' : '✗ CVs'}
              </span>
            </div>
          )}

          {/* Model selector */}
          {model !== undefined && (
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              className="bg-white/15 text-white border border-white/30 rounded px-2 py-1 text-xs font-medium cursor-pointer"
            >
              {MODELS.map(m => (
                <option key={m.id} value={m.id} className="bg-[#741B47]">{m.label}</option>
              ))}
            </select>
          )}

          {/* User */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/60 hidden md:inline">{user?.email}</span>
            <button onClick={signOut} className="text-xs text-white/70 hover:text-white underline">Sign out</button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  )
}
