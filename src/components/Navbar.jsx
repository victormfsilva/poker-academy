import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const links = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/modulos', label: 'Módulos', icon: '📚' },
  { to: '/infinito', label: 'Infinito', icon: '♾️' },
  { to: '/ferramentas', label: 'Ferramentas', icon: '🧮' },
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
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 items-center justify-between px-6 py-4"
        style={{ background: '#12121a', borderBottom: '1px solid #1e1e2e' }}>
        <Link to="/" className="flex items-center gap-2">
          <span style={{ color: '#e94560', fontSize: 22 }}>♠</span>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 18, fontFamily: 'Space Grotesk' }}>
            Poker Academy <span style={{ color: '#e94560' }}>BR</span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
              style={{
                color: location.pathname === l.to || (l.to !== '/' && location.pathname.startsWith(l.to)) ? '#e94560' : '#aaa',
                background: location.pathname === l.to || (l.to !== '/' && location.pathname.startsWith(l.to)) ? '#1e1e2e' : 'transparent',
                fontWeight: 500,
              }}
            >
              <span>{l.icon}</span>
              <span>{l.label}</span>
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ color: '#888', border: '1px solid #333', fontWeight: 500 }}
          >
            Sair
          </button>
        </div>
      </nav>

      {/* Bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex"
        style={{ background: '#12121a', borderTop: '1px solid #1e1e2e' }}>
        {links.map(l => {
          const active = location.pathname === l.to || (l.to !== '/' && location.pathname.startsWith(l.to))
          return (
            <Link
              key={l.to}
              to={l.to}
              className="flex-1 flex flex-col items-center py-3 gap-1"
              style={{ color: active ? '#e94560' : '#666' }}
            >
              <span style={{ fontSize: 20 }}>{l.icon}</span>
              <span style={{ fontSize: 11, fontWeight: active ? 600 : 400 }}>{l.label}</span>
            </Link>
          )
        })}
        <button
          onClick={handleLogout}
          className="flex-1 flex flex-col items-center py-3 gap-1"
          style={{ color: '#666' }}
        >
          <span style={{ fontSize: 20 }}>🚪</span>
          <span style={{ fontSize: 11 }}>Sair</span>
        </button>
      </nav>
    </>
  )
}
