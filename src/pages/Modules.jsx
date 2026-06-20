import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProgress } from '../context/ProgressContext'

const MODULES = [
  { id: 1, name: 'RFI ChipEV', desc: 'Raise First In — o spot mais importante do poker de torneios', icon: 'R' },
  { id: 2, name: 'Push/Fold', desc: 'Short stack — abaixo de 15bb existem apenas 2 opcoes', icon: 'P' },
  { id: 3, name: 'Pot Odds e Outs', desc: 'A matematica por tras de cada decisao no poker', icon: 'O' },
  { id: 4, name: 'BB vs RFI', desc: 'Como defender o Big Blind contra qualquer raise', icon: 'D' },
  { id: 5, name: 'CBet Flop IP + Bet Sizing', desc: 'Apostar no flop em posicao e escolher o tamanho certo', icon: 'C' },
  { id: 6, name: 'Blind Wars', desc: 'SB vs BB — o confronto mais complexo do poker', icon: 'W' },
  { id: 7, name: 'SB vs RFI', desc: 'Defendendo o Small Blind contra raises', icon: 'S' },
  { id: 8, name: 'BTN vs RFI', desc: 'A melhor posicao da mesa contra raises', icon: 'B' },
  { id: 9, name: '3-Bet Ranges', desc: 'Quando relancar pre-flop — valor e blefe', icon: '3' },
  { id: 10, name: 'Defesa vs CBet + Check-Raise', desc: 'Fold, call ou check-raise quando apostam em voce', icon: 'X' },
  { id: 13, name: 'Donk Bet', desc: 'Quando apostar antes do raiser no flop', icon: 'K' },
  { id: 14, name: 'CBet Turn', desc: 'Double barrel — continuar no turn', icon: 'T' },
  { id: 15, name: 'River Play', desc: 'Value bet, blefe ou check no river', icon: 'V' },
  { id: 16, name: 'GTO vs Exploit', desc: 'Quando sair do livro e ajustar', icon: 'G' },
  { id: 17, name: 'ICM', desc: 'Modelo de chip independente em torneios', icon: 'I' },
  { id: 18, name: 'Multiway Pots', desc: 'Potes com 3+ jogadores', icon: 'M' },
  { id: 20, name: 'HUD e Solvers', desc: 'Estatisticas e estudo com solver', icon: 'H' },
  { id: 21, name: 'Late Game MTT', desc: 'Dominando os momentos decisivos do torneio', icon: 'F' },
  { id: 22, name: 'SPR', desc: 'Stack-to-Pot Ratio e estrategia pos-flop', icon: 'S' },
  { id: 23, name: 'Range vs Nut Advantage', desc: 'Como solvers decidem frequencia e sizing', icon: 'N' },
  { id: 24, name: 'Polarizacao vs Merge', desc: 'Quando usar cada tipo de range de aposta', icon: 'P' },
  { id: 25, name: 'Multistreet Planning', desc: 'Planeje flop + turn + river antes de agir', icon: 'U' },
  { id: 26, name: 'Sizing Theory', desc: 'Cada sizing conta uma historia diferente', icon: 'Z' },
  { id: 27, name: 'Blocker Effects', desc: 'Como suas cartas afetam o range do vilao', icon: 'B' },
]

const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'preflop', label: 'Pre-Flop' },
  { key: 'postflop', label: 'Pos-Flop' },
  { key: 'math', label: 'Matematica' },
  { key: 'mtt', label: 'Torneio' },
  { key: 'advanced', label: 'Avancado' },
  { key: 'order', label: 'Ordem de Estudo' },
]

const CATEGORY_IDS = {
  preflop: [1, 2, 4, 6, 7, 8, 9],
  postflop: [5, 10, 13, 14, 15],
  math: [3, 22, 23, 24, 25, 26],
  mtt: [2, 17, 21],
  advanced: [16, 18, 20, 27],
}

const STUDY_ORDER = [1, 3, 9, 4, 7, 8, 2, 6, 5, 10, 14, 15, 22, 23, 24, 25, 26, 17, 21, 16, 18, 27, 13, 20]

const FILTER_COLORS = {
  all: '#b3b3b8',
  preflop: '#4fce82',
  postflop: '#0a84d7',
  math: '#f5a623',
  mtt: '#e5484d',
  advanced: '#a78bfa',
  order: '#fdfdfd',
}

export default function Modules() {
  const { getModuleProgress } = useProgress()
  const [filter, setFilter] = useState('all')

  let displayModules
  if (filter === 'all') {
    displayModules = MODULES
  } else if (filter === 'order') {
    displayModules = STUDY_ORDER.map(id => MODULES.find(m => m.id === id)).filter(Boolean)
  } else {
    const ids = CATEGORY_IDS[filter] || []
    displayModules = MODULES.filter(m => ids.includes(m.id))
  }

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-16 px-4" style={{ background: '#0f0f0f' }}>
      <div className="max-w-5xl mx-auto pt-6">
        <div className="mb-6">
          <h1 style={{ color: '#fdfdfd', fontSize: 24, fontWeight: 600, marginBottom: 4 }}>Modulos de Estudo</h1>
          <p style={{ color: '#b3b3b8', fontSize: 14 }}>Complete cada modulo antes de avancar. Meta: 90%+ em 2 sessoes seguidas.</p>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {FILTERS.map(f => {
            const active = filter === f.key
            const color = FILTER_COLORS[f.key]
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
                style={{
                  background: active ? `${color}18` : 'transparent',
                  color: active ? color : '#676671',
                  border: `1px solid ${active ? `${color}60` : '#2a2a2e'}`,
                  cursor: 'pointer',
                }}
              >
                {f.label}
                {f.key !== 'all' && f.key !== 'order' && (
                  <span style={{ marginLeft: 4, opacity: 0.6 }}>
                    {(CATEGORY_IDS[f.key] || []).length}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Ordem de estudo — numeração */}
        {filter === 'order' && (
          <div className="rounded-xl p-3 mb-4" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
            <div style={{ color: '#676671', fontSize: 12 }}>
              Siga esta ordem para o estudo mais eficiente. Os numeros indicam a sequencia recomendada.
            </div>
          </div>
        )}

        {/* Grid de módulos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayModules.map((m, idx) => {
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
                        position: 'relative',
                      }}>
                        {filter === 'order' && (
                          <div style={{
                            position: 'absolute', top: -6, right: -6,
                            width: 18, height: 18, borderRadius: '50%',
                            background: '#4fce82', color: '#0f0f0f',
                            fontSize: 9, fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>{idx + 1}</div>
                        )}
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
    </div>
  )
}
