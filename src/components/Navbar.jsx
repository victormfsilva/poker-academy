import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProgress } from '../context/ProgressContext'

const links = [
  {
    to: '/', label: 'Home',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    to: '/modulos', label: 'Treinar',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    to: '/infinito', label: 'Infinito',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z" />
      </svg>
    ),
  },
  {
    to: '/arena', label: 'Arena',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M8 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    to: '/stats', label: 'Stats',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    to: '/guia', label: 'Guia',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    to: '/analise', label: 'Analise',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    to: '/mental', label: 'Mental',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
        <line x1="9" y1="21" x2="15" y2="21" />
      </svg>
    ),
  },
]

export default function Navbar({ user }) {
  const location = useLocation()
  const { getPendingReviews } = useProgress()
  const pendingReviews = getPendingReviews()

  function handleLogout() {
    supabase.auth.signOut()
  }

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 items-center justify-between px-5"
        style={{
          background: 'rgba(9,9,11,0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border)',
          height: 56,
        }}>
        <Link to="/" className="flex items-center gap-3">
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--emerald), #2bc48a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-glow-emerald)',
          }}>
            <span style={{ color: 'var(--bg)', fontSize: 15, fontWeight: 700, fontFamily: 'Inter' }}>P</span>
          </div>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 15, letterSpacing: '-0.02em' }}>
            Poker Academy
          </span>
        </Link>

        <div className="flex items-center gap-0.5">
          {links.map(l => {
            const active = location.pathname === l.to || (l.to !== '/' && location.pathname.startsWith(l.to))
            return (
              <Link
                key={l.to}
                to={l.to}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{
                  color: active ? 'var(--emerald)' : 'var(--text-tertiary)',
                  background: active ? 'var(--emerald-soft)' : 'transparent',
                  fontWeight: 500,
                  fontSize: 13,
                  position: 'relative',
                  letterSpacing: '-0.01em',
                }}
              >
                {l.icon}
                <span>{l.label}</span>
                {l.to === '/' && pendingReviews.length > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    minWidth: 18, height: 18, borderRadius: 9999,
                    background: 'var(--gold)', color: 'var(--bg)',
                    fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 5px',
                    boxShadow: 'var(--shadow-glow-gold)',
                  }}>{pendingReviews.length}</span>
                )}
              </Link>
            )
          })}
          <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 8px' }} />
          <button
            onClick={handleLogout}
            className="px-2.5 py-2 rounded-lg"
            style={{ color: 'var(--text-muted)' }}
            title="Sair"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex"
        style={{
          background: 'rgba(9,9,11,0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid var(--border)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
        {links.map(l => {
          const active = location.pathname === l.to || (l.to !== '/' && location.pathname.startsWith(l.to))
          return (
            <Link
              key={l.to}
              to={l.to}
              className="flex-1 flex flex-col items-center py-2.5 gap-1"
              style={{ color: active ? 'var(--emerald)' : 'var(--text-muted)', position: 'relative' }}
            >
              {l.icon}
              <span style={{ fontSize: 9, fontWeight: active ? 600 : 400, letterSpacing: '0.02em' }}>{l.label}</span>
              {l.to === '/' && pendingReviews.length > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: '22%',
                  minWidth: 14, height: 14, borderRadius: 9999,
                  background: 'var(--gold)', color: 'var(--bg)',
                  fontSize: 8, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 3px',
                }}>{pendingReviews.length}</span>
              )}
            </Link>
          )
        })}
        <button
          onClick={handleLogout}
          className="flex-1 flex flex-col items-center py-2.5 gap-1"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span style={{ fontSize: 9 }}>Sair</span>
        </button>
      </nav>
    </>
  )
}
