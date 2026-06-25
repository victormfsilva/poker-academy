import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useProgress } from '../context/ProgressContext'
import { analyzeLeaks } from '../utils/leaks'

const MODULES = [
  { id: 1, name: 'RFI ChipEV', desc: 'Raise First In', icon: 'R', cat: 'fundamentals' },
  { id: 2, name: 'Push/Fold', desc: 'Short stack < 15bb', icon: 'P', cat: 'fundamentals' },
  { id: 3, name: 'Pot Odds', desc: 'Matematica do poker', icon: 'O', cat: 'fundamentals' },
  { id: 4, name: 'BB vs RFI', desc: 'Defender o Big Blind', icon: 'D', cat: 'fundamentals' },
  { id: 5, name: 'CBet Flop IP', desc: 'Apostar no flop em posição', icon: 'C', cat: 'fundamentals' },
  { id: 6, name: 'Blind Wars', desc: 'SB vs BB confronto direto', icon: 'W', cat: 'fundamentals' },
  { id: 7, name: 'SB vs RFI', desc: 'Defendendo o Small Blind', icon: 'S', cat: 'intermediate' },
  { id: 8, name: 'BTN vs RFI', desc: 'Melhor posição vs raises', icon: 'B', cat: 'intermediate' },
  { id: 9, name: '3-Bet Ranges', desc: 'Quando relancar pre-flop', icon: '3', cat: 'intermediate' },
  { id: 10, name: 'Def vs CBet', desc: 'Fold, call ou check-raise', icon: 'X', cat: 'intermediate' },
  { id: 13, name: 'Donk Bet', desc: 'Apostar antes do raiser', icon: 'K', cat: 'advanced' },
  { id: 14, name: 'CBet Turn', desc: 'Double barrel no turn', icon: 'T', cat: 'advanced' },
  { id: 15, name: 'River Play', desc: 'Value bet, blefe ou check', icon: 'V', cat: 'advanced' },
  { id: 16, name: 'GTO vs Exploit', desc: 'Quando sair do livro', icon: 'G', cat: 'advanced' },
  { id: 17, name: 'ICM', desc: 'Chip independente em MTT', icon: 'I', cat: 'advanced' },
  { id: 18, name: 'Multiway', desc: 'Potes com 3+ jogadores', icon: 'M', cat: 'advanced' },
  { id: 19, name: 'Blockers', desc: 'Card removal avançado', icon: 'L', cat: 'advanced' },
  { id: 20, name: 'HUD & Solvers', desc: 'Estatisticas e solver', icon: 'H', cat: 'advanced' },
  { id: 21, name: 'Late Game MTT', desc: 'Momentos decisivos', icon: 'F', cat: 'advanced' },
  { id: 22, name: 'SPR', desc: 'Stack-to-Pot Ratio', icon: 'S', cat: 'advanced' },
  { id: 23, name: 'Range vs Nut', desc: 'Frequencia e sizing', icon: 'N', cat: 'advanced' },
  { id: 24, name: 'Polar vs Merge', desc: 'Tipos de range de bet', icon: 'P', cat: 'advanced' },
  { id: 25, name: 'Multistreet', desc: 'Planejar 3 streets', icon: 'U', cat: 'advanced' },
  { id: 26, name: 'Sizing Theory', desc: 'Cada sizing conta história', icon: 'Z', cat: 'advanced' },
  { id: 27, name: 'Blocker Effects', desc: 'Cartas que mudam range', icon: 'B', cat: 'advanced' },
  { id: 28, name: 'Facing Barrel', desc: 'Defender vs double barrel', icon: 'F', cat: 'advanced' },
  { id: 29, name: 'River Defense', desc: 'Call ou fold no river', icon: 'R', cat: 'advanced' },
  { id: 30, name: 'Probe Bet', desc: 'Apostar OOP quando checam', icon: 'Q', cat: 'advanced' },
]

const CATEGORIES = {
  fundamentals: 'Fundamentos',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
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
    <div className="min-h-screen pb-28 md:pb-8 md:pt-16 px-4" style={{ background: 'var(--bg)' }}>
      <div className="max-w-5xl mx-auto pt-6 animate-in">

        {/* Hero */}
        <div className="card mb-6" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div style={{ color: 'var(--emerald)', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', marginBottom: 10, fontFamily: 'JetBrains Mono, monospace' }}>
                  POKER ACADEMY
                </div>
                <h1 style={{ color: 'var(--text-primary)', fontSize: 28, fontWeight: 700, lineHeight: 1.2, marginBottom: 8, letterSpacing: '-0.025em' }}>
                  {progress.globalStats.totalHands === 0
                    ? 'Comece sua jornada GTO'
                    : `${globalAcc}% de acerto geral`
                  }
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, maxWidth: 420 }}>
                  {progress.globalStats.totalHands === 0
                    ? 'Domine ranges pre-flop, pot odds e estratégia avançada com treino prático.'
                    : `${progress.globalStats.totalHands} mãos treinadas. ${completedCount}/${totalModules} módulos completos.`
                  }
                </p>
                {currentModule && (
                  <Link
                    to={`/modulos/${currentModule.id}`}
                    className="btn-primary inline-flex items-center gap-2 mt-5"
                  >
                    Continuar treinando
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                  </Link>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3" style={{ minWidth: 280 }}>
                {[
                  { label: 'MAOS', value: progress.globalStats.totalHands, color: 'var(--emerald)' },
                  { label: 'ACERTO', value: `${globalAcc}%`, color: globalAcc >= 90 ? 'var(--emerald)' : globalAcc >= 60 ? 'var(--gold)' : 'var(--crimson)' },
                  { label: 'STREAK', value: progress.globalStats.bestStreak, color: 'var(--gold)' },
                ].map(s => (
                  <div key={s.label} className="text-center" style={{
                    background: 'var(--surface-2)', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)', padding: '14px 12px',
                  }}>
                    <div style={{ color: s.color, fontSize: 24, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{s.value}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', marginTop: 6, letterSpacing: '0.06em' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Daily goal */}
          <div style={{ borderTop: '1px solid var(--border)', padding: '20px 24px' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span style={{ color: 'var(--text-tertiary)', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace' }}>META DIARIA</span>
                {editingGoal ? (
                  <select
                    value={goal}
                    onChange={e => { setDailyGoal(Number(e.target.value)); setEditingGoal(false) }}
                    onBlur={() => setEditingGoal(false)}
                    autoFocus
                    style={{ background: 'var(--surface-3)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', padding: '2px 8px', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {[20, 30, 50, 75, 100, 150, 200].map(v => (
                      <option key={v} value={v}>{v} mãos</option>
                    ))}
                  </select>
                ) : (
                  <button onClick={() => setEditingGoal(true)} className="btn-secondary" style={{ padding: '2px 10px', fontSize: 11 }}>
                    {goal} mãos
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                {getDayStreak(progress.dailyHistory) > 0 && (
                  <span className="badge badge-gold">{getDayStreak(progress.dailyHistory)} dias seguidos</span>
                )}
                <span style={{ color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>
                  {dayData.hands}/{goal}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="rounded-full" style={{ height: 6, background: 'var(--surface-3)' }}>
              <div className="rounded-full transition-all" style={{
                height: 6,
                width: `${Math.min(Math.round((dayData.hands / goal) * 100), 100)}%`,
                background: dayData.hands >= goal
                  ? 'linear-gradient(90deg, var(--emerald), #2bc48a)'
                  : 'linear-gradient(90deg, var(--sapphire), #60a5fa)',
              }} />
            </div>

            {/* Weekly calendar */}
            <div className="flex gap-1.5 mt-4">
              {getLast7Days().map(day => {
                const d = progress.dailyHistory?.[day] || { hands: 0 }
                const pct = Math.min(d.hands / goal, 1)
                const isToday = day === today
                const dayOfWeek = DAY_NAMES[new Date(day + 'T12:00:00').getDay()]
                return (
                  <div key={day} className="flex-1 text-center">
                    <div style={{ color: isToday ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: 9, fontWeight: isToday ? 600 : 400, marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>
                      {dayOfWeek}
                    </div>
                    <div style={{
                      height: 30, borderRadius: 'var(--radius-sm)',
                      background: d.hands === 0 ? 'var(--surface-2)'
                        : pct >= 1 ? 'var(--emerald)'
                        : pct >= 0.5 ? 'rgba(52,211,153,0.3)'
                        : 'rgba(52,211,153,0.1)',
                      border: isToday ? '2px solid var(--emerald)' : '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: isToday && d.hands > 0 ? 'var(--shadow-glow-emerald)' : 'none',
                    }}>
                      <span style={{
                        color: d.hands === 0 ? 'var(--text-muted)' : pct >= 1 ? 'var(--bg)' : 'var(--text-secondary)',
                        fontSize: 10, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                      }}>
                        {d.hands || '-'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {(() => {
              const weekHands = getLast7Days().reduce((sum, day) => sum + (progress.dailyHistory?.[day]?.hands || 0), 0)
              const weekGoal = goal * 7
              return weekHands > 0 ? (
                <div className="flex items-center justify-between mt-3">
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Semana: {weekHands} mãos</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{Math.round((weekHands / weekGoal) * 100)}% da meta semanal</span>
                </div>
              ) : null
            })()}
          </div>
        </div>

        {/* Pending Reviews */}
        {(() => {
          const reviews = getPendingReviews()
          if (!reviews.length) return null
          return (
            <div className="card mb-5" style={{ borderColor: 'rgba(245,158,11,0.25)' }}>
              <div className="flex items-center gap-2.5 mb-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>
                  {reviews.length} revisão{reviews.length > 1 ? 'es' : ''} pendente{reviews.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {reviews.map(r => {
                  const modInfo = MODULES.find(m => m.id === r.moduleId)
                  return modInfo ? (
                    <Link key={r.moduleId} to={`/modulos/${r.moduleId}`}
                      className="flex items-center gap-2 rounded-lg px-3 py-2"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{modInfo.icon}</span>
                      <span style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 500 }}>{modInfo.name}</span>
                      <span className="badge badge-gold" style={{ fontSize: 9 }}>{r.interval}d</span>
                    </Link>
                  ) : null
                })}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 10 }}>
                Revise para fixar o conteúdo na memória de longo prazo
              </div>
            </div>
          )
        })()}

        {/* Leaks */}
        {(() => {
          const leaks = analyzeLeaks(progress.answerHistory)
          if (!leaks.length) return null
          const typeIcon = { modulo: 'M', posicao: 'P', mao: 'H' }
          const typeColor = { modulo: 'var(--sapphire)', posicao: 'var(--gold)', mao: 'var(--crimson)' }
          const typeBg = { modulo: 'var(--sapphire-soft)', posicao: 'var(--gold-soft)', mao: 'var(--crimson-soft)' }
          return (
            <div className="card mb-6">
              <div className="flex items-center gap-2.5 mb-4">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--crimson)" strokeWidth="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>Seus 3 maiores leaks</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace' }}>
                  {(progress.answerHistory || []).length} mãos
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {leaks.map((leak, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 'var(--radius-sm)', flexShrink: 0,
                      background: typeBg[leak.type], color: typeColor[leak.type],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                    }}>{typeIcon[leak.type]}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 500 }}>{leak.label}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                        {leak.errors} erros em {leak.total} ({leak.errorRate}% de erro)
                      </div>
                    </div>
                    <div style={{
                      color: leak.errorRate >= 50 ? 'var(--crimson)' : leak.errorRate >= 30 ? 'var(--gold)' : 'var(--text-secondary)',
                      fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                    }}>{leak.errorRate}%</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Module Evolution Charts */}
        {(() => {
          const modulesWithSessions = MODULES.filter(m => {
            const mod = progress.modules[m.id]
            return mod?.trainerSessions?.length >= 2
          })
          if (!modulesWithSessions.length) return null

          return (
            <div className="card mb-6">
              <div className="flex items-center gap-2.5 mb-4">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--emerald)" strokeWidth="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>Evolução por Módulo</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace' }}>% por sessão</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {modulesWithSessions.slice(0, 8).map(m => {
                  const sessions = progress.modules[m.id].trainerSessions
                  const last = sessions[sessions.length - 1]
                  const prev = sessions[sessions.length - 2]
                  const trend = last.accuracy - prev.accuracy
                  const points = sessions.slice(-10)
                  const w = 120, h = 32, pad = 2
                  const maxPts = points.length
                  const pathD = points.map((p, i) => {
                    const x = pad + (i / (maxPts - 1)) * (w - pad * 2)
                    const y = h - pad - (p.accuracy / 100) * (h - pad * 2)
                    return `${i === 0 ? 'M' : 'L'}${x},${y}`
                  }).join(' ')
                  const lineColor = last.accuracy >= 90 ? 'var(--emerald)' : last.accuracy >= 60 ? 'var(--gold)' : 'var(--crimson)'

                  return (
                    <Link key={m.id} to={`/modulos/${m.id}`} className="flex items-center gap-3 rounded-lg px-3 py-3 card-interactive"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="flex items-center gap-2">
                          <span style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 600 }}>{m.name}</span>
                          <span className={`badge ${trend > 0 ? 'badge-emerald' : trend < 0 ? 'badge-crimson' : 'badge-sapphire'}`} style={{ fontSize: 10 }}>
                            {trend > 0 ? '+' : ''}{trend}%
                          </span>
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                          {sessions.length} sessoes · {last.accuracy}%
                        </div>
                      </div>
                      <svg width={w} height={h} style={{ flexShrink: 0 }}>
                        <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity="0.8" />
                        <circle cx={pad + ((maxPts - 1) / (maxPts - 1)) * (w - pad * 2)} cy={h - pad - (last.accuracy / 100) * (h - pad * 2)} r="3" fill={lineColor} />
                      </svg>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* Activity 14 days */}
        {(() => {
          const days = []
          for (let i = 13; i >= 0; i--) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            days.push(d.toISOString().slice(0, 10))
          }
          const data = days.map(day => {
            const d = progress.dailyHistory?.[day] || { hands: 0, correct: 0 }
            return { day, hands: d.hands, correct: d.correct, acc: d.hands > 0 ? Math.round((d.correct / d.hands) * 100) : 0 }
          })
          const maxHands = Math.max(...data.map(d => d.hands), 1)
          const hasData = data.some(d => d.hands > 0)
          if (!hasData) return null

          return (
            <div className="card mb-6">
              <div className="flex items-center gap-2.5 mb-4">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--sapphire)" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>Atividade (14 dias)</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace' }}>
                  {data.reduce((s, d) => s + d.hands, 0)} maos
                </span>
              </div>
              <div className="flex items-end gap-1" style={{ height: 72 }}>
                {data.map(d => {
                  const barH = d.hands > 0 ? Math.max(6, (d.hands / maxHands) * 64) : 3
                  const color = d.acc >= 90 ? 'var(--emerald)' : d.acc >= 60 ? 'var(--gold)' : d.hands > 0 ? 'var(--crimson)' : 'var(--surface-3)'
                  const isToday = d.day === today
                  return (
                    <div key={d.day} className="flex-1 flex flex-col items-center" title={`${d.day}: ${d.hands} mãos, ${d.acc}% acerto`}>
                      <div style={{
                        height: barH, width: '100%', maxWidth: 24, minWidth: 4,
                        background: color, opacity: isToday ? 1 : 0.65,
                        borderRadius: '3px 3px 1px 1px',
                        boxShadow: isToday && d.hands > 0 ? `0 0 8px ${color}40` : 'none',
                      }} />
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between mt-2">
                <span style={{ color: 'var(--text-muted)', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}>14d atras</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}>Hoje</span>
              </div>
            </div>
          )
        })()}

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>Progresso geral</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>{completedCount}/{totalModules}</span>
          </div>
          <div className="rounded-full" style={{ height: 4, background: 'var(--surface-3)' }}>
            <div className="rounded-full" style={{
              width: `${overallProgress}%`, height: 4,
              background: 'linear-gradient(90deg, var(--emerald), #2bc48a)',
            }} />
          </div>
        </div>

        {/* Module grid */}
        {Object.entries(CATEGORIES).map(([catKey, catLabel]) => {
          const catModules = MODULES.filter(m => m.cat === catKey)
          return (
            <div key={catKey} className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <h2 style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{catLabel}</h2>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {catModules.map(m => {
                  const p = getModuleProgress(m.id)
                  const locked = !p.unlocked
                  const acc = p.accuracy || 0

                  return (
                    <div key={m.id} style={{
                      opacity: locked ? 0.3 : 1,
                      pointerEvents: locked ? 'none' : 'auto',
                    }}>
                      <Link
                        to={`/modulos/${m.id}`}
                        className="block rounded-xl p-4 card-interactive"
                        style={{
                          background: p.completed ? 'var(--emerald-soft)' : 'var(--surface-1)',
                          border: `1px solid ${p.completed ? 'rgba(52,211,153,0.2)' : 'var(--border)'}`,
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div style={{
                            width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                            background: p.completed ? 'var(--emerald-soft)' : locked ? 'var(--surface-2)' : 'var(--sapphire-soft)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: p.completed ? 'var(--emerald)' : locked ? 'var(--text-muted)' : 'var(--sapphire)',
                            fontSize: 14, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', flexShrink: 0,
                          }}>
                            {locked ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
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
                              <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13, letterSpacing: '-0.01em' }}>
                                {m.name}
                              </span>
                              {!locked && acc > 0 && (
                                <span style={{
                                  color: acc >= 90 ? 'var(--emerald)' : acc >= 60 ? 'var(--gold)' : 'var(--crimson)',
                                  fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
                                }}>{acc}%</span>
                              )}
                            </div>
                            <div style={{ color: 'var(--text-tertiary)', fontSize: 12, marginTop: 2 }}>{m.desc}</div>
                            {!locked && !p.completed && acc > 0 && (
                              <div className="mt-2.5 rounded-full" style={{ height: 3, background: 'var(--surface-3)' }}>
                                <div className="rounded-full" style={{
                                  height: 3,
                                  width: `${Math.min(acc, 100)}%`,
                                  background: acc >= 90 ? 'var(--emerald)' : acc >= 60 ? 'var(--gold)' : 'var(--crimson)',
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
