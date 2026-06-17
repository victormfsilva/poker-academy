import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const links = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/modulos', label: 'Modulos', icon: '📚' },
  { to: '/infinito', label: 'Infinito', icon: '♾️' },
  { to: '/stats', label: 'Stats', icon: '📊' },
  { to: '/ferramentas', label: 'Tools', icon: '🧮' },
  { to: '/mental', label: 'Mental', icon: '🧠' },
]

export default function Navbar({ user }) {
  const location = useLocation()

  function handleLogout() {
    supabase.auth.signOut()
  }

  return (
    <>
      {/* Top bar desktop */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 items-center justify-between px-6 py-3"
        style={{ background: '#0c0c12', borderBottom: '1px solid #1e1e30' }}>
        <Link to="/" className="flex items-center gap-2">
          <span style={{ color: '#00e68a', fontSize: 20, fontFamily: 'JetBrains Mono' }}>♠</span>
          <span style={{ color: '#e8e8ed', fontWeight: 700, fontSize: 17 }}>
            Poker Academy <span style={{ color: '#00e68a' }}>BR</span>
          </span>
        </Link>
        <div className="flex items-center gap-1">
          {links.map(l => {
            const active = location.pathname === l.to || (l.to !== '/' && location.pathname.startsWith(l.to))
            return (
              <Link
                key={l.to}
                to={l.to}
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{
                  color: active ? '#00e68a' : '#8888a0',
                  background: active ? '#12121c' : 'transparent',
                  fontWeight: 500,
                  fontSize: 14,
                }}
              >
                <span style={{ fontSize: 15 }}>{l.icon}</span>
                <span>{l.label}</span>
              </Link>
            )
          })}
          <button
            onClick={handleLogout}
            className="px-3 py-2 rounded-lg text-sm ml-2"
            style={{ color: '#55556a', border: '1px solid #1e1e30', fontWeight: 500 }}
          >
            Sair
          </button>
        </div>
      </nav>

      {/* Bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex"
        style={{ background: '#0c0c12', borderTop: '1px solid #1e1e30' }}>
        {links.map(l => {
          const active = location.pathname === l.to || (l.to !== '/' && location.pathname.startsWith(l.to))
          return (
            <Link
              key={l.to}
              to={l.to}
              className="flex-1 flex flex-col items-center py-3 gap-1"
              style={{ color: active ? '#00e68a' : '#55556a' }}
            >
              <span style={{ fontSize: 18 }}>{l.icon}</span>
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{l.label}</span>
            </Link>
          )
        })}
        <button
          onClick={handleLogout}
          className="flex-1 flex flex-col items-center py-3 gap-1"
          style={{ color: '#55556a' }}
        >
          <span style={{ fontSize: 18 }}>🚪</span>
          <span style={{ fontSize: 10 }}>Sair</span>
        </button>
      </nav>
    </>
  )
}
