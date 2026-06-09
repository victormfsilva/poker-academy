import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0a0a0f' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div style={{ fontSize: 40 }}>🃏</div>
          <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginTop: 8 }}>Poker Academy BR</h1>
          <p style={{ color: '#666', fontSize: 14, marginTop: 4 }}>Estude GTO do jeito certo</p>
        </div>

        <div className="rounded-xl p-6" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
          <div className="flex mb-6" style={{ background: '#0a0a0f', borderRadius: 8, padding: 4 }}>
            <button
              onClick={() => setMode('login')}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{ background: mode === 'login' ? '#e94560' : 'transparent', color: mode === 'login' ? 'white' : '#666' }}
            >
              Entrar
            </button>
            <button
              onClick={() => setMode('signup')}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{ background: mode === 'signup' ? '#e94560' : 'transparent', color: mode === 'signup' ? 'white' : '#666' }}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full px-3 py-2 rounded-lg text-white"
                style={{ background: '#0a0a0f', border: '1px solid #1e1e2e', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>SENHA</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="mínimo 6 caracteres"
                required
                minLength={6}
                className="w-full px-3 py-2 rounded-lg text-white"
                style={{ background: '#0a0a0f', border: '1px solid #1e1e2e', outline: 'none' }}
              />
            </div>

            {error && <p style={{ color: '#e94560', fontSize: 13 }}>{error}</p>}
            {message && <p style={{ color: '#00d4aa', fontSize: 13 }}>{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold"
              style={{ background: '#e94560', color: 'white', opacity: loading ? 0.6 : 1 }}
            >
              {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
