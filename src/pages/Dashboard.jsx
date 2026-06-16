import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProgress } from '../context/ProgressContext'

const MODULES = [
  { id: 1, name: 'RFI ChipEV', desc: 'Raise First In — o spot mais importante', icon: '🎯' },
  { id: 2, name: 'Push/Fold', desc: 'Short stack abaixo de 15bb', icon: '💥' },
  { id: 3, name: 'Pot Odds e Outs', desc: 'A matemática por trás de cada decisão', icon: '🧮' },
  { id: 4, name: 'BB vs RFI', desc: 'Defender o Big Blind', icon: '🛡️' },
  { id: 5, name: 'CBet Flop IP + Bet Sizing', desc: 'Apostar no flop em posição e escolher o tamanho certo', icon: '⚡' },
  { id: 6, name: 'Blind Wars', desc: 'SB vs BB — confronto direto', icon: '⚔️' },
  { id: 7, name: 'SB vs RFI', desc: 'Defendendo o Small Blind contra raises', icon: '🛡️' },
  { id: 8, name: 'BTN vs RFI', desc: 'A melhor posição da mesa contra raises', icon: '👑' },
  { id: 9, name: '3-Bet Ranges', desc: 'Quando relançar pre-flop — valor e blefe', icon: '🔥' },
  { id: 10, name: 'Defesa vs CBet + Check-Raise', desc: 'Fold, call ou check-raise quando apostam em você', icon: '🛡️' },
  { id: 13, name: 'Donk Bet', desc: 'Quando apostar antes do raiser no flop', icon: '💣' },
  { id: 14, name: 'CBet Turn', desc: 'Double barrel — continuar no turn', icon: '🔄' },
  { id: 15, name: 'River Play', desc: 'Value bet, blefe ou check no river', icon: '🏁' },
  { id: 16, name: 'GTO vs Exploit', desc: 'Quando sair do livro e ajustar', icon: '🧠' },
  { id: 17, name: 'ICM', desc: 'Modelo de chip independente em torneios', icon: '🏆' },
  { id: 18, name: 'Multiway Pots', desc: 'Potes com 3+ jogadores', icon: '👥' },
  { id: 19, name: 'Blockers', desc: 'Card removal e decisões avançadas', icon: '🧩' },
  { id: 20, name: 'HUD e Solvers', desc: 'Estatísticas e estudo com solver', icon: '📊' },
  { id: 21, name: 'Late Game MTT', desc: 'Dominando os momentos decisivos do torneio', icon: '🎰' },
]

function motivationalMessage(globalStats) {
  const total = globalStats.totalHands
  const acc = total > 0 ? Math.round((globalStats.totalCorrect / total) * 100) : 0
  if (total === 0) return 'Bem-vindo! Comece pelo Módulo 1 — RFI é o fundamento de tudo.'
  if (acc >= 90) return `Incrível! ${acc}% de acerto. Você está jogando no nível dos regulares.`
  if (acc >= 75) return `Bom trabalho! ${acc}% de acerto. Continue praticando para chegar a 90%.`
  if (acc >= 60) return `Evoluindo! ${acc}% de acerto. Cada mão treinada te aproxima do profissionalismo.`
  return `${total} mãos treinadas. Consistência é o segredo — continue!`
}

function getBadge(completedIds) {
  const has = id => completedIds.includes(id)
  const advancedDone = [13,14,15,16,17,18,19,20,21].every(has)
  const intermediateDone = [7,8,9,10,11,12].every(has)
  const basicDone = [1,2,3,4,5,6].every(has)

  if (advancedDone && intermediateDone && basicDone) return { name: 'Avançado', icon: '🏆', color: '#f5a623', desc: 'Todos os 21 módulos completos!' }
  if (intermediateDone && basicDone) return { name: 'Intermediário Avançado', icon: '💎', color: '#4a90e2', desc: 'Módulos 1-12 completos' }
  if (basicDone) return { name: 'Iniciante Sólido', icon: '⭐', color: '#00d4aa', desc: 'Módulos 1-6 completos' }
  return { name: 'Aprendiz', icon: '📖', color: '#888', desc: 'Complete os módulos 1-6' }
}

export default function Dashboard() {
  const { progress, getModuleProgress, setDailyGoal } = useProgress()
  const [editingGoal, setEditingGoal] = useState(false)

  const globalAcc = progress.globalStats.totalHands > 0
    ? Math.round((progress.globalStats.totalCorrect / progress.globalStats.totalHands) * 100)
    : 0

  const completedIds = MODULES.filter(m => getModuleProgress(m.id).completed).map(m => m.id)
  const badge = getBadge(completedIds)

  const currentModule = MODULES.find(m => {
    const p = getModuleProgress(m.id)
    return !p.completed && p.unlocked
  }) || MODULES[MODULES.length - 1]

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h1 style={{ color: 'white', fontSize: 26, fontWeight: 700 }}>
              ♠ Poker Academy <span style={{ color: '#e94560' }}>BR</span>
            </h1>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: `${badge.color}15`, border: `1px solid ${badge.color}44` }}>
              <span style={{ fontSize: 16 }}>{badge.icon}</span>
              <span style={{ color: badge.color, fontSize: 13, fontWeight: 700 }}>{badge.name}</span>
            </div>
          </div>
          <p style={{ color: '#666', marginTop: 4 }}>{motivationalMessage(progress.globalStats)}</p>
        </div>

        {/* Stats globais */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Mãos Treinadas', value: progress.globalStats.totalHands, color: '#4a90e2' },
            { label: 'Taxa de Acerto', value: `${globalAcc}%`, color: globalAcc >= 90 ? '#00d4aa' : globalAcc >= 60 ? '#f5a623' : '#e94560' },
            { label: 'Melhor Sequência', value: progress.globalStats.bestStreak, color: '#f5a623' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4 text-center"
              style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
              <div style={{ color: s.color, fontSize: 24, fontWeight: 700 }}>{s.value}</div>
              <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Meta diária */}
        {(() => {
          const today = new Date().toISOString().slice(0, 10)
          const dayData = progress.dailyHistory?.[today] || { hands: 0, correct: 0 }
          const goal = progress.dailyGoal || 50
          const pct = Math.min(Math.round((dayData.hands / goal) * 100), 100)
          const completed = dayData.hands >= goal
          const dayAcc = dayData.hands > 0 ? Math.round((dayData.correct / dayData.hands) * 100) : 0

          const streak = (() => {
            let count = 0
            const d = new Date()
            d.setDate(d.getDate() - 1)
            while (true) {
              const key = d.toISOString().slice(0, 10)
              const day = progress.dailyHistory?.[key]
              if (day && day.hands >= goal) { count++; d.setDate(d.getDate() - 1) }
              else break
            }
            if (completed) count++
            return count
          })()

          const GOAL_OPTIONS = [25, 50, 75, 100, 150, 200]

          return (
            <div className="rounded-xl p-4 mb-6" style={{ background: '#12121a', border: `1px solid ${completed ? '#00d4aa' : '#1e1e2e'}` }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 20 }}>{completed ? '🔥' : '🎯'}</span>
                  <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>Meta Diária</span>
                </div>
                <button onClick={() => setEditingGoal(!editingGoal)} style={{ color: '#888', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>
                  {editingGoal ? 'Fechar' : 'Alterar meta'}
                </button>
              </div>

              {editingGoal && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  {GOAL_OPTIONS.map(g => (
                    <button key={g} onClick={() => { setDailyGoal(g); setEditingGoal(false) }}
                      className="px-3 py-1.5 rounded-lg text-sm font-semibold"
                      style={{ background: g === goal ? '#e9456033' : '#1e1e2e', color: g === goal ? '#e94560' : '#888', border: g === goal ? '1px solid #e94560' : '1px solid #2a2a3a' }}>
                      {g} mãos
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-end justify-between mb-2">
                <div>
                  <span style={{ color: completed ? '#00d4aa' : '#e94560', fontSize: 28, fontWeight: 700 }}>{dayData.hands}</span>
                  <span style={{ color: '#666', fontSize: 14 }}> / {goal} mãos</span>
                </div>
                <div className="text-right">
                  {dayData.hands > 0 && <div style={{ color: dayAcc >= 90 ? '#00d4aa' : dayAcc >= 60 ? '#f5a623' : '#e94560', fontSize: 13 }}>{dayAcc}% acerto hoje</div>}
                  {streak > 0 && <div style={{ color: '#f5a623', fontSize: 12 }}>🔥 {streak} dia{streak > 1 ? 's' : ''} seguido{streak > 1 ? 's' : ''}</div>}
                </div>
              </div>

              <div className="rounded-full h-3" style={{ background: '#1e1e2e' }}>
                <div className="rounded-full h-3 transition-all" style={{
                  width: `${pct}%`,
                  background: completed ? '#00d4aa' : pct >= 60 ? '#f5a623' : '#e94560'
                }} />
              </div>

              {completed && (
                <div className="mt-2 text-center" style={{ color: '#00d4aa', fontSize: 13, fontWeight: 600 }}>
                  Meta cumprida! Continue treinando para manter o ritmo.
                </div>
              )}
            </div>
          )
        })()}

        {/* Gráfico diário */}
        {(() => {
          const days = []
          for (let i = 6; i >= 0; i--) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            const key = d.toISOString().slice(0, 10)
            const data = progress.dailyHistory?.[key] || { hands: 0, correct: 0 }
            const acc = data.hands > 0 ? Math.round((data.correct / data.hands) * 100) : 0
            const weekday = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d.getDay()]
            days.push({ key, weekday, day: d.getDate(), hands: data.hands, acc })
          }
          const maxHands = Math.max(...days.map(d => d.hands), 1)
          const hasData = days.some(d => d.hands > 0)

          if (!hasData) return null

          const W = 320, H = 140, padL = 30, padR = 10, padT = 15, padB = 30
          const chartW = W - padL - padR
          const chartH = H - padT - padB
          const barW = chartW / 7 * 0.6
          const gap = chartW / 7

          const accPoints = days.map((d, i) => {
            const x = padL + gap * i + gap / 2
            const y = d.hands > 0 ? padT + chartH - (d.acc / 100) * chartH : padT + chartH
            return { x, y, acc: d.acc, has: d.hands > 0 }
          }).filter(p => p.has)

          const accLine = accPoints.length > 1
            ? accPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
            : null

          return (
            <div className="rounded-xl p-4 mb-6" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>Evolução Diária</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1"><div style={{ width: 10, height: 10, borderRadius: 2, background: '#4a90e2' }} /><span style={{ color: '#888', fontSize: 11 }}>Mãos</span></div>
                  <div className="flex items-center gap-1"><div style={{ width: 10, height: 3, borderRadius: 1, background: '#00d4aa' }} /><span style={{ color: '#888', fontSize: 11 }}>Acerto</span></div>
                </div>
              </div>
              <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
                {[0, 25, 50, 75, 100].map(v => {
                  const y = padT + chartH - (v / 100) * chartH
                  return <line key={v} x1={padL} x2={W - padR} y1={y} y2={y} stroke="#1e1e2e" strokeWidth={1} />
                })}
                <text x={2} y={padT + 4} fill="#555" fontSize={9}>100%</text>
                <text x={2} y={padT + chartH / 2 + 3} fill="#555" fontSize={9}>50%</text>
                <text x={2} y={padT + chartH + 3} fill="#555" fontSize={9}>0%</text>

                {days.map((d, i) => {
                  const x = padL + gap * i + (gap - barW) / 2
                  const barH = maxHands > 0 ? (d.hands / maxHands) * chartH : 0
                  const y = padT + chartH - barH
                  return (
                    <g key={d.key}>
                      <rect x={x} y={y} width={barW} height={barH} rx={3} fill="#4a90e2" opacity={0.7} />
                      {d.hands > 0 && <text x={x + barW / 2} y={y - 3} fill="#4a90e2" fontSize={9} textAnchor="middle">{d.hands}</text>}
                      <text x={padL + gap * i + gap / 2} y={H - 5} fill="#666" fontSize={9} textAnchor="middle">{d.weekday}</text>
                    </g>
                  )
                })}

                {accLine && <path d={accLine} fill="none" stroke="#00d4aa" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
                {accPoints.map((p, i) => (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r={3.5} fill="#12121a" stroke="#00d4aa" strokeWidth={2} />
                    <text x={p.x} y={p.y - 7} fill="#00d4aa" fontSize={8} textAnchor="middle">{p.acc}%</text>
                  </g>
                ))}
              </svg>
            </div>
          )
        })()}

        {/* Módulo atual */}
        {currentModule && (
          <div className="rounded-xl p-4 mb-6" style={{ background: '#12121a', border: '1px solid #e94560' }}>
            <div style={{ color: '#e94560', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>MÓDULO ATUAL</div>
            <div style={{ color: 'white', fontSize: 18, fontWeight: 700 }}>
              {currentModule.icon} {currentModule.name}
            </div>
            <div style={{ color: '#888', fontSize: 14, marginTop: 2 }}>{currentModule.desc}</div>
            <Link
              to={`/modulos/${currentModule.id}`}
              className="inline-block mt-3 px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: '#e94560', color: 'white' }}
            >
              Continuar →
            </Link>
          </div>
        )}

        {/* Lista de módulos */}
        <h2 style={{ color: 'white', fontWeight: 600, marginBottom: 12 }}>Todos os Módulos</h2>
        <div className="flex flex-col gap-3">
          {MODULES.map(m => {
            const p = getModuleProgress(m.id)
            const locked = !p.unlocked
            const acc = p.accuracy
            const goodSessions = (p.trainerSessions || []).slice(-2).filter(s => s.accuracy >= 90).length

            return (
              <div key={m.id}
                className="rounded-xl p-4"
                style={{
                  background: '#12121a',
                  border: `1px solid ${p.completed ? '#00d4aa' : locked ? '#1e1e2e' : '#1e1e2e'}`,
                  opacity: locked ? 0.6 : 1,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 24 }}>{locked ? '🔒' : p.completed ? '✅' : m.icon}</span>
                    <div>
                      <div style={{ color: 'white', fontWeight: 600 }}>Módulo {m.id} — {m.name}</div>
                      <div style={{ color: '#666', fontSize: 13 }}>{m.desc}</div>
                    </div>
                  </div>
                  {!locked && (
                    <Link
                      to={`/modulos/${m.id}`}
                      className="px-3 py-1 rounded-lg text-sm font-semibold"
                      style={{ background: '#1e1e2e', color: '#e94560' }}
                    >
                      {p.completed ? 'Revisar' : 'Abrir'}
                    </Link>
                  )}
                </div>

                {/* Barra de progresso */}
                {!locked && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1" style={{ color: '#666' }}>
                      <span>{acc}% de acerto · {p.totalAnswered || 0} mãos</span>
                      <span style={{ color: goodSessions >= 2 ? '#00d4aa' : '#666' }}>{goodSessions}/2 sessões 90%+</span>
                    </div>
                    <div className="rounded-full h-2" style={{ background: '#1e1e2e' }}>
                      <div
                        className="rounded-full h-2 transition-all"
                        style={{
                          width: `${Math.min(acc, 100)}%`,
                          background: acc >= 90 ? '#00d4aa' : acc >= 60 ? '#f5a623' : '#e94560'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
