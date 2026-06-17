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

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#050508' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div style={{ fontSize: 20, fontFamily: 'JetBrains Mono', color: '#00e68a', letterSpacing: 2 }}>♠</div>
          <h1 style={{ color: '#e8e8ed', fontSize: 26, fontWeight: 700, marginTop: 8 }}>
            Poker Academy <span style={{ color: '#00e68a' }}>BR</span>
          </h1>
          <p style={{ color: '#55556a', fontSize: 13, marginTop: 4, fontFamily: 'JetBrains Mono', letterSpacing: 1.5 }}>ESTUDE GTO DO JEITO CERTO</p>
        </div>

        <div className="rounded-xl p-6" style={{ background: '#0c0c12', border: '1px solid #1e1e30' }}>
          <div className="flex mb-6" style={{ background: '#050508', borderRadius: 8, padding: 4 }}>
            <button
              onClick={() => setMode('login')}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{ background: mode === 'login' ? '#12121c' : 'transparent', color: mode === 'login' ? '#00e68a' : '#55556a' }}
            >
              Entrar
            </button>
            <button
              onClick={() => setMode('signup')}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{ background: mode === 'signup' ? '#12121c' : 'transparent', color: mode === 'signup' ? '#00e68a' : '#55556a' }}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label style={{ color: '#8888a0', fontSize: 11, display: 'block', marginBottom: 4, fontFamily: 'JetBrains Mono', letterSpacing: 1, textTransform: 'uppercase' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full px-3 py-2.5 rounded-lg"
                style={{ background: '#050508', border: '1px solid #1e1e30', outline: 'none', color: '#e8e8ed', fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ color: '#8888a0', fontSize: 11, display: 'block', marginBottom: 4, fontFamily: 'JetBrains Mono', letterSpacing: 1, textTransform: 'uppercase' }}>Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="minimo 6 caracteres"
                required
                minLength={6}
                className="w-full px-3 py-2.5 rounded-lg"
                style={{ background: '#050508', border: '1px solid #1e1e30', outline: 'none', color: '#e8e8ed', fontSize: 14 }}
              />
            </div>

            {error && <p style={{ color: '#ff4466', fontSize: 13 }}>{error}</p>}
            {message && <p style={{ color: '#00e68a', fontSize: 13 }}>{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold"
              style={{ background: '#00e68a', color: '#050508', opacity: loading ? 0.6 : 1, fontSize: 14 }}
            >
              {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
