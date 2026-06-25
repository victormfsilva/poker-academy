import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('Conta criada! Verifique seu email para confirmar.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('Email ou senha incorretos.')
    }
    setLoading(false)
  }

  const inputStyle = {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    fontSize: 14,
    borderRadius: 'var(--radius-sm)',
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm animate-in">
        <div className="text-center mb-10">
          <div style={{
            width: 52, height: 52, borderRadius: 'var(--radius-lg)', margin: '0 auto 16px',
            background: 'linear-gradient(135deg, var(--emerald), #2bc48a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-glow-emerald)',
          }}>
            <span style={{ color: 'var(--bg)', fontSize: 26, fontWeight: 700 }}>P</span>
          </div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.025em' }}>
            Poker Academy
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6 }}>Estude GTO do jeito certo</p>
        </div>

        <div className="card" style={{ borderRadius: 'var(--radius-xl)' }}>
          <div className="flex mb-6" style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: 3 }}>
            {['login', 'signup'].map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="flex-1 py-2 text-sm font-medium"
                style={{
                  background: mode === m ? 'var(--surface-2)' : 'transparent',
                  color: mode === m ? 'var(--text-primary)' : 'var(--text-muted)',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {m === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label style={{ color: 'var(--text-secondary)', fontSize: 13, display: 'block', marginBottom: 6, fontWeight: 500 }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full px-3 py-2.5"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ color: 'var(--text-secondary)', fontSize: 13, display: 'block', marginBottom: 6, fontWeight: 500 }}>Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="minimo 6 caracteres"
                required
                minLength={6}
                className="w-full px-3 py-2.5"
                style={inputStyle}
              />
            </div>

            {error && <p style={{ color: 'var(--crimson)', fontSize: 13 }}>{error}</p>}
            {message && <p style={{ color: 'var(--emerald)', fontSize: 13 }}>{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
              style={{ padding: '12px', fontSize: 14, opacity: loading ? 0.6 : 1 }}
            >
              {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
