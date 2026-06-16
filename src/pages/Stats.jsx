import { useState } from 'react'
import { useProgress } from '../context/ProgressContext'

export default function Stats() {
  const { progress, setDailyGoal } = useProgress()
  const [editingGoal, setEditingGoal] = useState(false)

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

  // Chart data - last 7 days
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

  // Global stats
  const globalAcc = progress.globalStats.totalHands > 0
    ? Math.round((progress.globalStats.totalCorrect / progress.globalStats.totalHands) * 100)
    : 0

  // All-time daily history stats
  const allDays = Object.entries(progress.dailyHistory || {})
  const totalDaysPlayed = allDays.filter(([, d]) => d.hands > 0).length
  const totalDaysGoalMet = allDays.filter(([, d]) => d.hands >= goal).length

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Estatísticas</h1>

        {/* Meta diária */}
        <div className="rounded-xl p-4 mb-4" style={{ background: '#12121a', border: `1px solid ${completed ? '#00d4aa' : '#1e1e2e'}` }}>
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

        {/* Gráfico diário */}
        <div className="rounded-xl p-4 mb-4" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>Últimos 7 dias</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1"><div style={{ width: 10, height: 10, borderRadius: 2, background: '#4a90e2' }} /><span style={{ color: '#888', fontSize: 11 }}>Mãos</span></div>
              <div className="flex items-center gap-1"><div style={{ width: 10, height: 3, borderRadius: 1, background: '#00d4aa' }} /><span style={{ color: '#888', fontSize: 11 }}>Acerto</span></div>
            </div>
          </div>
          {hasData ? (
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
          ) : (
            <div className="py-8 text-center" style={{ color: '#555', fontSize: 14 }}>
              Treine algumas mãos para ver o gráfico aparecer aqui.
            </div>
          )}
        </div>

        {/* Resumo geral */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: 'Total de Mãos', value: progress.globalStats.totalHands, color: '#4a90e2' },
            { label: 'Taxa de Acerto', value: `${globalAcc}%`, color: globalAcc >= 90 ? '#00d4aa' : globalAcc >= 60 ? '#f5a623' : '#e94560' },
            { label: 'Melhor Sequência', value: progress.globalStats.bestStreak, color: '#f5a623' },
            { label: 'Dias Treinados', value: totalDaysPlayed, color: '#4a90e2' },
            { label: 'Metas Batidas', value: totalDaysGoalMet, color: '#00d4aa' },
            { label: 'Streak Atual', value: `${streak} dia${streak !== 1 ? 's' : ''}`, color: streak > 0 ? '#f5a623' : '#666' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4 text-center"
              style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
              <div style={{ color: s.color, fontSize: 22, fontWeight: 700 }}>{s.value}</div>
              <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
