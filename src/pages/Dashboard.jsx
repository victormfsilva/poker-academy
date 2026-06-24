import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useProgress } from '../context/ProgressContext'
import { analyzeLeaks } from '../utils/leaks'
import Card, { useCardStyle } from '../components/Card'

const MODULES = [
  { id: 1, name: 'RFI ChipEV', desc: 'Raise First In', icon: 'R', cat: 'fundamentals' },
  { id: 2, name: 'Push/Fold', desc: 'Short stack < 15bb', icon: 'P', cat: 'fundamentals' },
  { id: 3, name: 'Pot Odds', desc: 'Matematica do poker', icon: 'O', cat: 'fundamentals' },
  { id: 4, name: 'BB vs RFI', desc: 'Defender o Big Blind', icon: 'D', cat: 'fundamentals' },
  { id: 5, name: 'CBet Flop IP', desc: 'Apostar no flop em posicao', icon: 'C', cat: 'fundamentals' },
  { id: 6, name: 'Blind Wars', desc: 'SB vs BB confronto direto', icon: 'W', cat: 'fundamentals' },
  { id: 7, name: 'SB vs RFI', desc: 'Defendendo o Small Blind', icon: 'S', cat: 'intermediate' },
  { id: 8, name: 'BTN vs RFI', desc: 'Melhor posicao vs raises', icon: 'B', cat: 'intermediate' },
  { id: 9, name: '3-Bet Ranges', desc: 'Quando relancar pre-flop', icon: '3', cat: 'intermediate' },
  { id: 10, name: 'Def vs CBet', desc: 'Fold, call ou check-raise', icon: 'X', cat: 'intermediate' },
  { id: 13, name: 'Donk Bet', desc: 'Apostar antes do raiser', icon: 'K', cat: 'advanced' },
  { id: 14, name: 'CBet Turn', desc: 'Double barrel no turn', icon: 'T', cat: 'advanced' },
  { id: 15, name: 'River Play', desc: 'Value bet, blefe ou check', icon: 'V', cat: 'advanced' },
  { id: 16, name: 'GTO vs Exploit', desc: 'Quando sair do livro', icon: 'G', cat: 'advanced' },
  { id: 17, name: 'ICM', desc: 'Chip independente em MTT', icon: 'I', cat: 'advanced' },
  { id: 18, name: 'Multiway', desc: 'Potes com 3+ jogadores', icon: 'M', cat: 'advanced' },
  { id: 19, name: 'Blockers', desc: 'Card removal avancado', icon: 'L', cat: 'advanced' },
  { id: 20, name: 'HUD & Solvers', desc: 'Estatisticas e solver', icon: 'H', cat: 'advanced' },
  { id: 21, name: 'Late Game MTT', desc: 'Momentos decisivos', icon: 'F', cat: 'advanced' },
  { id: 22, name: 'SPR', desc: 'Stack-to-Pot Ratio', icon: 'S', cat: 'advanced' },
  { id: 23, name: 'Range vs Nut', desc: 'Frequencia e sizing', icon: 'N', cat: 'advanced' },
  { id: 24, name: 'Polar vs Merge', desc: 'Tipos de range de bet', icon: 'P', cat: 'advanced' },
  { id: 25, name: 'Multistreet', desc: 'Planejar 3 streets', icon: 'U', cat: 'advanced' },
  { id: 26, name: 'Sizing Theory', desc: 'Cada sizing conta historia', icon: 'Z', cat: 'advanced' },
  { id: 27, name: 'Blocker Effects', desc: 'Cartas que mudam range', icon: 'B', cat: 'advanced' },
  { id: 28, name: 'Facing Barrel', desc: 'Defender vs double barrel', icon: 'F', cat: 'advanced' },
  { id: 29, name: 'River Defense', desc: 'Call ou fold no river', icon: 'R', cat: 'advanced' },
  { id: 30, name: 'Probe Bet', desc: 'Apostar OOP quando checam', icon: 'Q', cat: 'advanced' },
]

const CATEGORIES = {
  fundamentals: 'Fundamentos',
  intermediate: 'Intermediario',
  advanced: 'Avancado',
}

function getLast7Days() {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

function getDayStreak(dailyHistory) {
  let streak = 0
  const d = new Date()
  while (true) {
    const key = d.toISOString().slice(0, 10)
    if (dailyHistory?.[key]?.hands > 0) {
      streak++
      d.setDate(d.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

export default function Dashboard() {
  const { progress, getModuleProgress, setDailyGoal, getPendingReviews } = useProgress()
  const [editingGoal, setEditingGoal] = useState(false)
  const [cardStyle, toggleCardStyle] = useCardStyle()

  const globalAcc = progress.globalStats.totalHands > 0
    ? Math.round((progress.globalStats.totalCorrect / progress.globalStats.totalHands) * 100)
    : 0

  const completedCount = MODULES.filter(m => getModuleProgress(m.id).completed).length
  const totalModules = MODULES.length
  const overallProgress = Math.round((completedCount / totalModules) * 100)

  const currentModule = MODULES.find(m => {
    const p = getModuleProgress(m.id)
    return !p.completed && p.unlocked
  }) || MODULES[MODULES.length - 1]

  const today = new Date().toISOString().slice(0, 10)
  const dayData = progress.dailyHistory?.[today] || { hands: 0, correct: 0 }
  const goal = progress.dailyGoal || 50

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-16 px-4" style={{ background: '#0f0f0f' }}>
      <div className="max-w-5xl mx-auto pt-6">

        {/* Hero section */}
        <div className="rounded-xl p-6 md:p-8 mb-8" style={{
          background: '#1a1a1d',
          border: '1px solid #2a2a2e',
        }}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div style={{ color: '#4fce82', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 8 }}>
                POKER ACADEMY
              </div>
              <h1 style={{ color: '#fdfdfd', fontSize: 28, fontWeight: 600, lineHeight: 1.2, marginBottom: 8 }}>
                {progress.globalStats.totalHands === 0
                  ? 'Comece sua jornada GTO'
                  : `${globalAcc}% de acerto geral`
                }
              </h1>
              <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.5, maxWidth: 400 }}>
                {progress.globalStats.totalHands === 0
                  ? 'Domine ranges pre-flop, pot odds, e estrategia avancada com treino pratico.'
                  : `${progress.globalStats.totalHands} maos treinadas. ${completedCount}/${totalModules} modulos completos.`
                }
              </p>
              {currentModule && (
                <Link
                  to={`/modulos/${currentModule.id}`}
                  className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-lg text-sm font-semibold"
                  style={{ background: '#4fce82', color: '#0f0f0f' }}
                >
                  Continuar treinando
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </Link>
              )}
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-3 gap-3 md:gap-4" style={{ minWidth: 280 }}>
              {[
                { label: 'Maos', value: progress.globalStats.totalHands, color: '#4fce82' },
                { label: 'Acerto', value: `${globalAcc}%`, color: globalAcc >= 90 ? '#4fce82' : globalAcc >= 60 ? '#f5a623' : '#e5484d' },
                { label: 'Streak', value: progress.globalStats.bestStreak, color: '#f5a623' },
              ].map(s => (
                <div key={s.label} className="rounded-lg p-3 text-center"
                  style={{ background: '#222225', border: '1px solid #2a2a2e' }}>
                  <div style={{ color: s.color, fontSize: 22, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{s.value}</div>
                  <div style={{ color: '#676671', fontSize: 10, fontFamily: 'JetBrains Mono', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Metas de treino */}
          <div className="mt-6 pt-5" style={{ borderTop: '1px solid #2a2a2e' }}>
            {/* Meta diaria + streak */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span style={{ color: '#b3b3b8', fontSize: 12, fontWeight: 600 }}>META DIARIA</span>
                {editingGoal ? (
                  <select
                    value={goal}
                    onChange={e => { setDailyGoal(Number(e.target.value)); setEditingGoal(false) }}
                    onBlur={() => setEditingGoal(false)}
                    autoFocus
                    style={{ background: '#2a2a2e', color: '#fdfdfd', border: '1px solid #3a3a42', borderRadius: 6, padding: '2px 6px', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                  >
                    {[20, 30, 50, 75, 100, 150, 200].map(v => (
                      <option key={v} value={v}>{v} maos</option>
                    ))}
                  </select>
                ) : (
                  <button onClick={() => setEditingGoal(true)}
                    style={{ color: '#676671', fontSize: 11, background: 'none', border: '1px solid #2a2a2e', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}>
                    {goal} maos
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {getDayStreak(progress.dailyHistory) > 0 && (
                  <span style={{
                    color: '#f5a623', fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono',
                    background: 'rgba(245,166,35,0.1)', padding: '2px 8px', borderRadius: 4,
                  }}>
                    {getDayStreak(progress.dailyHistory)} dias seguidos
                  </span>
                )}
                <span style={{ color: '#b3b3b8', fontSize: 12, fontFamily: 'JetBrains Mono' }}>
                  {dayData.hands}/{goal}
                </span>
              </div>
            </div>

            {/* Barra de progresso */}
            <div className="rounded-full h-2 mb-4" style={{ background: '#2a2a2e' }}>
              <div className="rounded-full h-2 transition-all" style={{
                width: `${Math.min(Math.round((dayData.hands / goal) * 100), 100)}%`,
                background: dayData.hands >= goal ? '#4fce82' : '#0a84d7',
              }} />
            </div>

            {/* Calendario semanal */}
            <div className="flex gap-1.5">
              {getLast7Days().map(day => {
                const d = progress.dailyHistory?.[day] || { hands: 0 }
                const pct = Math.min(d.hands / goal, 1)
                const isToday = day === today
                const dayOfWeek = DAY_NAMES[new Date(day + 'T12:00:00').getDay()]
                return (
                  <div key={day} className="flex-1 text-center">
                    <div style={{ color: isToday ? '#fdfdfd' : '#676671', fontSize: 9, fontWeight: isToday ? 700 : 400, marginBottom: 4 }}>
                      {dayOfWeek}
                    </div>
                    <div className="rounded-md mx-auto" style={{
                      height: 28,
                      background: d.hands === 0 ? '#222225'
                        : pct >= 1 ? '#4fce82'
                        : pct >= 0.5 ? 'rgba(79,206,130,0.4)'
                        : 'rgba(79,206,130,0.15)',
                      border: isToday ? '2px solid #4fce82' : '1px solid #2a2a2e',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{
                        color: d.hands === 0 ? '#444' : pct >= 1 ? '#0f0f0f' : '#b3b3b8',
                        fontSize: 10, fontWeight: 700, fontFamily: 'JetBrains Mono',
                      }}>
                        {d.hands || '-'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Total semanal */}
            {(() => {
              const weekHands = getLast7Days().reduce((sum, day) => sum + (progress.dailyHistory?.[day]?.hands || 0), 0)
              const weekGoal = goal * 7
              return weekHands > 0 ? (
                <div className="flex items-center justify-between mt-3">
                  <span style={{ color: '#676671', fontSize: 11 }}>Semana: {weekHands} maos</span>
                  <span style={{ color: '#676671', fontSize: 11 }}>{Math.round((weekHands / weekGoal) * 100)}% da meta semanal</span>
                </div>
              ) : null
            })()}
          </div>
        </div>

        {/* Revisoes Pendentes (Spaced Repetition) */}
        {(() => {
          const reviews = getPendingReviews()
          if (!reviews.length) return null
          return (
            <div className="rounded-xl p-5 mb-5" style={{
              background: '#1a1a1d',
              border: '1px solid rgba(245,166,35,0.3)',
            }}>
              <div className="flex items-center gap-2 mb-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f5a623" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <span style={{ color: '#fdfdfd', fontSize: 14, fontWeight: 600 }}>
                  {reviews.length} revisao{reviews.length > 1 ? 'es' : ''} pendente{reviews.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {reviews.map(r => {
                  const modInfo = MODULES.find(m => m.id === r.moduleId)
                  return modInfo ? (
                    <Link key={r.moduleId} to={`/modulos/${r.moduleId}`}
                      className="flex items-center gap-2 rounded-lg px-3 py-2"
                      style={{ background: '#222225', border: '1px solid #2a2a2e' }}>
                      <span style={{ color: '#f5a623', fontSize: 12, fontWeight: 700 }}>{modInfo.icon}</span>
                      <span style={{ color: '#fdfdfd', fontSize: 12 }}>{modInfo.name}</span>
                      <span style={{ color: '#676671', fontSize: 10 }}>({r.interval}d)</span>
                    </Link>
                  ) : null
                })}
              </div>
              <div style={{ color: '#676671', fontSize: 11, marginTop: 8 }}>
                Revise para fixar o conteudo na memoria de longo prazo
              </div>
            </div>
          )
        })()}

        {/* Leaks - Weak Spot Report */}
        {(() => {
          const leaks = analyzeLeaks(progress.answerHistory)
          if (!leaks.length) return null
          const typeIcon = { modulo: 'M', posicao: 'P', mao: 'H' }
          const typeColor = { modulo: '#0a84d7', posicao: '#f5a623', mao: '#e5484d' }
          return (
            <div className="rounded-xl p-5 mb-8" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
              <div className="flex items-center gap-2 mb-4">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e5484d" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <span style={{ color: '#fdfdfd', fontSize: 14, fontWeight: 600 }}>Seus 3 maiores leaks</span>
                <span style={{ color: '#676671', fontSize: 11, marginLeft: 'auto' }}>
                  Ultimas {(progress.answerHistory || []).length} maos
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {leaks.map((leak, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ background: '#222225' }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                      background: `${typeColor[leak.type]}15`,
                      color: typeColor[leak.type],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono',
                    }}>{typeIcon[leak.type]}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#fdfdfd', fontSize: 13, fontWeight: 500 }}>{leak.label}</div>
                      <div style={{ color: '#676671', fontSize: 11 }}>
                        {leak.errors} erros em {leak.total} ({leak.errorRate}% de erro)
                      </div>
                    </div>
                    <div style={{
                      color: leak.errorRate >= 50 ? '#e5484d' : leak.errorRate >= 30 ? '#f5a623' : '#b3b3b8',
                      fontSize: 18, fontWeight: 700, fontFamily: 'JetBrains Mono',
                    }}>{leak.errorRate}%</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Progress overview bar */}
        <div className="flex items-center gap-4 mb-8">
          <div style={{ flex: 1 }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ color: '#fdfdfd', fontSize: 14, fontWeight: 600 }}>Progresso geral</span>
              <span style={{ color: '#b3b3b8', fontSize: 12, fontFamily: 'JetBrains Mono' }}>{completedCount}/{totalModules}</span>
            </div>
            <div className="rounded-full h-1" style={{ background: '#2a2a2e' }}>
              <div className="rounded-full h-1" style={{ width: `${overallProgress}%`, background: '#4fce82' }} />
            </div>
          </div>
        </div>

        {/* Card style toggle */}
        <div className="flex items-center justify-between rounded-xl px-5 py-3 mb-8" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <Card card="As" size="sm" />
              <Card card="Kh" size="sm" />
            </div>
            <div>
              <div style={{ color: '#fdfdfd', fontSize: 13, fontWeight: 600 }}>Estilo das cartas</div>
              <div style={{ color: '#676671', fontSize: 11 }}>{cardStyle === 'css' ? 'GTO Wizard (texto)' : 'SVG profissional'}</div>
            </div>
          </div>
          <button
            onClick={toggleCardStyle}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{
              background: cardStyle === 'svg' ? 'rgba(79,206,130,0.12)' : '#222225',
              border: `1px solid ${cardStyle === 'svg' ? 'rgba(79,206,130,0.3)' : '#2a2a2e'}`,
              color: cardStyle === 'svg' ? '#4fce82' : '#b3b3b8',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <div style={{
              width: 32, height: 16, borderRadius: 8, position: 'relative',
              background: cardStyle === 'svg' ? '#4fce82' : '#3a3a42',
              transition: 'background 0.2s',
            }}>
              <div style={{
                width: 12, height: 12, borderRadius: 6, position: 'absolute', top: 2,
                left: cardStyle === 'svg' ? 18 : 2,
                background: '#fdfdfd',
                transition: 'left 0.2s',
              }} />
            </div>
            SVG
          </button>
        </div>

        {/* Module grid by category */}
        {Object.entries(CATEGORIES).map(([catKey, catLabel]) => {
          const catModules = MODULES.filter(m => m.cat === catKey)
          return (
            <div key={catKey} className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <h2 style={{ color: '#fdfdfd', fontSize: 15, fontWeight: 600 }}>{catLabel}</h2>
                <div style={{ flex: 1, height: 1, background: '#2a2a2e' }} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {catModules.map(m => {
                  const p = getModuleProgress(m.id)
                  const locked = !p.unlocked
                  const acc = p.accuracy || 0

                  return (
                    <div key={m.id} style={{
                      opacity: locked ? 0.35 : 1,
                      pointerEvents: locked ? 'none' : 'auto',
                    }}>
                      <Link
                        to={`/modulos/${m.id}`}
                        className="block rounded-xl p-4 group"
                        style={{
                          background: p.completed ? 'rgba(79,206,130,0.05)' : '#1a1a1d',
                          border: `1px solid ${p.completed ? 'rgba(79,206,130,0.2)' : '#2a2a2e'}`,
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div style={{
                            width: 36, height: 36, borderRadius: 8,
                            background: p.completed ? 'rgba(79,206,130,0.12)' : locked ? '#222225' : 'rgba(10,132,215,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: p.completed ? '#4fce82' : locked ? '#676671' : '#0a84d7',
                            fontSize: 14, fontWeight: 700, fontFamily: 'JetBrains Mono', flexShrink: 0,
                          }}>
                            {locked ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                            ) : p.completed ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            ) : m.icon}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="flex items-center gap-2">
                              <span style={{ color: '#fdfdfd', fontWeight: 600, fontSize: 13 }}>
                                {m.name}
                              </span>
                              {!locked && acc > 0 && (
                                <span style={{
                                  color: acc >= 90 ? '#4fce82' : acc >= 60 ? '#f5a623' : '#e5484d',
                                  fontSize: 11, fontFamily: 'JetBrains Mono', fontWeight: 600,
                                }}>{acc}%</span>
                              )}
                            </div>
                            <div style={{ color: '#b3b3b8', fontSize: 12, marginTop: 2 }}>{m.desc}</div>
                            {!locked && !p.completed && acc > 0 && (
                              <div className="mt-2.5 rounded-full h-1" style={{ background: '#2a2a2e' }}>
                                <div className="rounded-full h-1" style={{
                                  width: `${Math.min(acc, 100)}%`,
                                  background: acc >= 90 ? '#4fce82' : acc >= 60 ? '#f5a623' : '#e5484d',
                                }} />
                              </div>
                            )}
                          </div>
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
