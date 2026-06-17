import { Link } from 'react-router-dom'
import { useProgress } from '../context/ProgressContext'

const MODULES = [
  { id: 1, name: 'RFI ChipEV', desc: 'Raise First In \u2014 o spot mais importante do poker de torneios', icon: 'R', cat: 'fundamentals' },
  { id: 2, name: 'Push/Fold', desc: 'Short stack \u2014 abaixo de 15bb existem apenas 2 opcoes', icon: 'P', cat: 'fundamentals' },
  { id: 3, name: 'Pot Odds e Outs', desc: 'A matematica por tras de cada decisao no poker', icon: 'O', cat: 'fundamentals' },
  { id: 4, name: 'BB vs RFI', desc: 'Como defender o Big Blind contra qualquer raise', icon: 'D', cat: 'fundamentals' },
  { id: 5, name: 'CBet Flop IP + Bet Sizing', desc: 'Apostar no flop em posicao e escolher o tamanho certo', icon: 'C', cat: 'fundamentals' },
  { id: 6, name: 'Blind Wars', desc: 'SB vs BB \u2014 o confronto mais complexo do poker', icon: 'W', cat: 'fundamentals' },
  { id: 7, name: 'SB vs RFI', desc: 'Defendendo o Small Blind contra raises', icon: 'S', cat: 'intermediate' },
  { id: 8, name: 'BTN vs RFI', desc: 'A melhor posicao da mesa contra raises', icon: 'B', cat: 'intermediate' },
  { id: 9, name: '3-Bet Ranges', desc: 'Quando relancar pre-flop \u2014 valor e blefe', icon: '3', cat: 'intermediate' },
  { id: 10, name: 'Defesa vs CBet + Check-Raise', desc: 'Fold, call ou check-raise quando apostam em voce', icon: 'X', cat: 'intermediate' },
  { id: 13, name: 'Donk Bet', desc: 'Quando apostar antes do raiser no flop', icon: 'K', cat: 'advanced' },
  { id: 14, name: 'CBet Turn', desc: 'Double barrel \u2014 continuar no turn', icon: 'T', cat: 'advanced' },
  { id: 15, name: 'River Play', desc: 'Value bet, blefe ou check no river', icon: 'V', cat: 'advanced' },
  { id: 16, name: 'GTO vs Exploit', desc: 'Quando sair do livro e ajustar', icon: 'G', cat: 'advanced' },
  { id: 17, name: 'ICM', desc: 'Modelo de chip independente em torneios', icon: 'I', cat: 'advanced' },
  { id: 18, name: 'Multiway Pots', desc: 'Potes com 3+ jogadores', icon: 'M', cat: 'advanced' },
  { id: 19, name: 'Blockers', desc: 'Card removal e decisoes avancadas', icon: 'L', cat: 'advanced' },
  { id: 20, name: 'HUD e Solvers', desc: 'Estatisticas e estudo com solver', icon: 'H', cat: 'advanced' },
  { id: 21, name: 'Late Game MTT', desc: 'Dominando os momentos decisivos do torneio', icon: 'F', cat: 'advanced' },
]

const CATEGORIES = {
  fundamentals: { label: 'Fundamentos', desc: 'Construa uma base solida de estrategia pre-flop' },
  intermediate: { label: 'Intermediario', desc: 'Defesa, 3-bet e ajustes posicionais' },
  advanced: { label: 'Avancado', desc: 'Dominando spots complexos e estrategia de torneio' },
}

export default function Modules() {
  const { getModuleProgress } = useProgress()

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-16 px-4" style={{ background: '#0f0f0f' }}>
      <div className="max-w-5xl mx-auto pt-6">
        <div className="mb-8">
          <h1 style={{ color: '#fdfdfd', fontSize: 24, fontWeight: 600, marginBottom: 4 }}>Modulos de Estudo</h1>
          <p style={{ color: '#b3b3b8', fontSize: 14 }}>Complete cada modulo antes de avancar. Meta: 90%+ em 2 sessoes seguidas.</p>
        </div>

        {Object.entries(CATEGORIES).map(([catKey, cat]) => {
          const catModules = MODULES.filter(m => m.cat === catKey)
          const completed = catModules.filter(m => getModuleProgress(m.id).completed).length

          return (
            <div key={catKey} className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 style={{ color: '#fdfdfd', fontSize: 16, fontWeight: 600 }}>{cat.label}</h2>
                    <span style={{ color: '#b3b3b8', fontSize: 12, fontFamily: 'JetBrains Mono' }}>{completed}/{catModules.length}</span>
                  </div>
                  <p style={{ color: '#676671', fontSize: 13, marginTop: 2 }}>{cat.desc}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {catModules.map(m => {
                  const p = getModuleProgress(m.id)
                  const locked = !p.unlocked
                  const acc = p.accuracy || 0
                  const goodSessions = (p.trainerSessions || []).slice(-2).filter(s => s.accuracy >= 90).length

                  return (
                    <div key={m.id} style={{ opacity: locked ? 0.3 : 1, pointerEvents: locked ? 'none' : 'auto' }}>
                      <Link
                        to={`/modulos/${m.id}`}
                        className="block rounded-xl overflow-hidden group"
                        style={{
                          background: '#1a1a1d',
                          border: `1px solid ${p.completed ? 'rgba(79,206,130,0.2)' : '#2a2a2e'}`,
                        }}
                      >
                        {/* Top accent line */}
                        <div style={{
                          height: 2,
                          background: p.completed ? '#4fce82' : acc >= 90 ? '#4fce82' : acc >= 60 ? '#f5a623' : acc > 0 ? '#e5484d' : '#2a2a2e',
                          opacity: p.completed || acc > 0 ? 1 : 0.3,
                        }} />

                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            <div style={{
                              width: 40, height: 40, borderRadius: 8,
                              background: p.completed ? 'rgba(79,206,130,0.1)' : locked ? '#222225' : 'rgba(10,132,215,0.08)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: p.completed ? '#4fce82' : locked ? '#676671' : '#0a84d7',
                              fontSize: 15, fontWeight: 700, fontFamily: 'JetBrains Mono', flexShrink: 0,
                            }}>
                              {locked ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                              ) : p.completed ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              ) : m.icon}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ color: '#fdfdfd', fontWeight: 600, fontSize: 14 }}>
                                {m.name}
                              </div>
                              <div style={{ color: '#b3b3b8', fontSize: 12, marginTop: 2, lineHeight: 1.4 }}>{m.desc}</div>
                            </div>
                          </div>

                          {!locked && (
                            <div className="mt-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {acc > 0 && (
                                  <span style={{
                                    color: acc >= 90 ? '#4fce82' : acc >= 60 ? '#f5a623' : '#e5484d',
                                    fontSize: 12, fontFamily: 'JetBrains Mono', fontWeight: 600,
                                  }}>{acc}%</span>
                                )}
                                <span style={{
                                  color: goodSessions >= 2 ? '#4fce82' : '#676671',
                                  fontSize: 11, fontFamily: 'JetBrains Mono',
                                }}>{goodSessions}/2 sessoes</span>
                              </div>
                              <span style={{
                                color: p.completed ? '#4fce82' : '#b3b3b8',
                                fontSize: 12, fontWeight: 500,
                              }}>
                                {p.completed ? 'Revisar' : p.lessonRead ? 'Treinar' : 'Iniciar'}
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', marginLeft: 4, verticalAlign: 'middle' }}>
                                  <polyline points="9 18 15 12 9 6" />
                                </svg>
                              </span>
                            </div>
                          )}

                          {!locked && !p.lessonRead && !p.completed && (
                            <div className="mt-2" style={{ color: '#676671', fontSize: 11 }}>Leia a aula antes de treinar</div>
                          )}
                        </div>
                      </Link>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
