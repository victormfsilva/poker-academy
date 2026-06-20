import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProgress } from '../context/ProgressContext'

const links = [
  {
    to: '/', label: 'Home',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    to: '/modulos', label: 'Treinar',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    to: '/infinito', label: 'Infinito',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z" />
      </svg>
    ),
  },
  {
    to: '/arena', label: 'Arena',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M8 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    to: '/stats', label: 'Stats',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    to: '/ferramentas', label: 'Tools',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    to: '/mental', label: 'Mental',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      {/* Top bar desktop */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 items-center justify-between px-6"
        style={{ background: 'rgba(15,15,15,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #2a2a2e', height: 56 }}>
        <Link to="/" className="flex items-center gap-2.5">
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: '#4fce82', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#0f0f0f', fontSize: 15, fontWeight: 700, fontFamily: 'Poppins' }}>P</span>
          </div>
          <span style={{ color: '#fdfdfd', fontWeight: 600, fontSize: 15 }}>
            Poker Academy
          </span>
        </Link>
        <div className="flex items-center gap-1">
          {links.map(l => {
            const active = location.pathname === l.to || (l.to !== '/' && location.pathname.startsWith(l.to))
            return (
              <Link
                key={l.to}
                to={l.to}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md"
                style={{
                  color: active ? '#fdfdfd' : '#b3b3b8',
                  background: active ? '#222225' : 'transparent',
                  fontWeight: 500,
                  fontSize: 13,
                  position: 'relative',
                }}
              >
                {l.icon}
                <span>{l.label}</span>
                {l.to === '/' && pendingReviews.length > 0 && (
                  <span style={{
                    position: 'absolute', top: -2, right: -2,
                    width: 16, height: 16, borderRadius: '50%',
                    background: '#f5a623', color: '#0f0f0f',
                    fontSize: 9, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{pendingReviews.length}</span>
                )}
              </Link>
            )
          })}
          <div style={{ width: 1, height: 20, background: '#2a2a2e', margin: '0 8px' }} />
          <button
            onClick={handleLogout}
            className="px-2 py-1.5 rounded-md"
            style={{ color: '#676671' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex"
        style={{ background: 'rgba(15,15,15,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid #2a2a2e', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {links.map(l => {
          const active = location.pathname === l.to || (l.to !== '/' && location.pathname.startsWith(l.to))
          return (
            <Link
              key={l.to}
              to={l.to}
              className="flex-1 flex flex-col items-center py-2.5 gap-1"
              style={{ color: active ? '#4fce82' : '#676671', position: 'relative' }}
            >
              {l.icon}
              <span style={{ fontSize: 9, fontWeight: active ? 600 : 400 }}>{l.label}</span>
              {l.to === '/' && pendingReviews.length > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: '25%',
                  width: 14, height: 14, borderRadius: '50%',
                  background: '#f5a623', color: '#0f0f0f',
                  fontSize: 8, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{pendingReviews.length}</span>
              )}
            </Link>
          )
        })}
        <button
          onClick={handleLogout}
          className="flex-1 flex flex-col items-center py-2.5 gap-1"
          style={{ color: '#676671' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span style={{ fontSize: 9 }}>Sair</span>
        </button>
      </nav>
    </>
  )
}
