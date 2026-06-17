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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0f0f0f' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div style={{
            width: 48, height: 48, borderRadius: 12, margin: '0 auto 16px',
            background: '#4fce82', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#0f0f0f', fontSize: 24, fontWeight: 700, fontFamily: 'Poppins' }}>P</span>
          </div>
          <h1 style={{ color: '#fdfdfd', fontSize: 24, fontWeight: 600 }}>
            Poker Academy
          </h1>
          <p style={{ color: '#676671', fontSize: 14, marginTop: 6 }}>Estude GTO do jeito certo</p>
        </div>

        <div className="rounded-xl p-6" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
          <div className="flex mb-6" style={{ background: '#0f0f0f', borderRadius: 8, padding: 3 }}>
            <button
              onClick={() => setMode('login')}
              className="flex-1 py-2 rounded-md text-sm font-medium"
              style={{
                background: mode === 'login' ? '#222225' : 'transparent',
                color: mode === 'login' ? '#fdfdfd' : '#676671',
              }}
            >
              Entrar
            </button>
            <button
              onClick={() => setMode('signup')}
              className="flex-1 py-2 rounded-md text-sm font-medium"
              style={{
                background: mode === 'signup' ? '#222225' : 'transparent',
                color: mode === 'signup' ? '#fdfdfd' : '#676671',
              }}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label style={{ color: '#b3b3b8', fontSize: 13, display: 'block', marginBottom: 6, fontWeight: 500 }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full px-3 py-2.5 rounded-lg"
                style={{ background: '#0f0f0f', border: '1px solid #2a2a2e', color: '#fdfdfd', fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ color: '#b3b3b8', fontSize: 13, display: 'block', marginBottom: 6, fontWeight: 500 }}>Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="minimo 6 caracteres"
                required
                minLength={6}
                className="w-full px-3 py-2.5 rounded-lg"
                style={{ background: '#0f0f0f', border: '1px solid #2a2a2e', color: '#fdfdfd', fontSize: 14 }}
              />
            </div>

            {error && <p style={{ color: '#e5484d', fontSize: 13 }}>{error}</p>}
            {message && <p style={{ color: '#4fce82', fontSize: 13 }}>{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold"
              style={{ background: '#4fce82', color: '#0f0f0f', opacity: loading ? 0.6 : 1, fontSize: 14 }}
            >
              {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
