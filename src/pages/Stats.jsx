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

  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const data = progress.dailyHistory?.[key] || { hands: 0, correct: 0 }
    const acc = data.hands > 0 ? Math.round((data.correct / data.hands) * 100) : 0
    const weekday = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab'][d.getDay()]
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

  const globalAcc = progress.globalStats.totalHands > 0
    ? Math.round((progress.globalStats.totalCorrect / progress.globalStats.totalHands) * 100)
    : 0

  const allDays = Object.entries(progress.dailyHistory || {})
  const totalDaysPlayed = allDays.filter(([, d]) => d.hands > 0).length
  const totalDaysGoalMet = allDays.filter(([, d]) => d.hands >= goal).length

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-16 px-4" style={{ background: '#0f0f0f' }}>
      <div className="max-w-3xl mx-auto pt-6">
        <h1 style={{ color: '#fdfdfd', fontSize: 24, fontWeight: 600, marginBottom: 24 }}>Estatisticas</h1>

        {/* Daily goal */}
        <div className="rounded-xl p-5 mb-5" style={{ background: '#1a1a1d', border: `1px solid ${completed ? 'rgba(79,206,130,0.2)' : '#2a2a2e'}` }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: completed ? 'rgba(79,206,130,0.12)' : 'rgba(10,132,215,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {completed ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4fce82" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a84d7" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                )}
              </div>
              <span style={{ color: '#fdfdfd', fontWeight: 600, fontSize: 15 }}>Meta Diaria</span>
            </div>
            <button onClick={() => setEditingGoal(!editingGoal)} style={{ color: '#b3b3b8', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>
              {editingGoal ? 'Fechar' : 'Alterar'}
            </button>
          </div>

          {editingGoal && (
            <div className="flex gap-2 mb-4 flex-wrap">
              {GOAL_OPTIONS.map(g => (
                <button key={g} onClick={() => { setDailyGoal(g); setEditingGoal(false) }}
                  className="px-3 py-1.5 rounded-lg text-sm"
                  style={{
                    background: g === goal ? 'rgba(79,206,130,0.1)' : '#222225',
                    color: g === goal ? '#4fce82' : '#b3b3b8',
                    border: `1px solid ${g === goal ? 'rgba(79,206,130,0.3)' : '#2a2a2e'}`,
                    fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 600,
                  }}>
                  {g}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end justify-between mb-3">
            <div>
              <span style={{ color: '#4fce82', fontSize: 28, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{dayData.hands}</span>
              <span style={{ color: '#676671', fontSize: 14 }}> / {goal}</span>
            </div>
            <div className="text-right">
              {dayData.hands > 0 && <div style={{ color: dayAcc >= 90 ? '#4fce82' : dayAcc >= 60 ? '#f5a623' : '#e5484d', fontSize: 13, fontFamily: 'JetBrains Mono' }}>{dayAcc}% hoje</div>}
              {streak > 0 && <div style={{ color: '#f5a623', fontSize: 12, fontFamily: 'JetBrains Mono' }}>{streak} dia{streak > 1 ? 's' : ''} seguido{streak > 1 ? 's' : ''}</div>}
            </div>
          </div>

          <div className="rounded-full h-2" style={{ background: '#2a2a2e' }}>
            <div className="rounded-full h-2" style={{
              width: `${pct}%`,
              background: completed ? '#4fce82' : pct >= 60 ? '#f5a623' : '#0a84d7',
            }} />
          </div>

          {completed && (
            <div className="mt-3 text-center" style={{ color: '#4fce82', fontSize: 13, fontWeight: 500 }}>
              Meta cumprida. Continue treinando.
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="rounded-xl p-5 mb-5" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
          <div className="flex items-center justify-between mb-3">
            <span style={{ color: '#fdfdfd', fontWeight: 600, fontSize: 15 }}>Ultimos 7 dias</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5"><div style={{ width: 8, height: 8, borderRadius: 2, background: '#0a84d7' }} /><span style={{ color: '#b3b3b8', fontSize: 11 }}>Maos</span></div>
              <div className="flex items-center gap-1.5"><div style={{ width: 10, height: 2, borderRadius: 1, background: '#4fce82' }} /><span style={{ color: '#b3b3b8', fontSize: 11 }}>Acerto</span></div>
            </div>
          </div>
          {hasData ? (
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
              {[0, 25, 50, 75, 100].map(v => {
                const y = padT + chartH - (v / 100) * chartH
                return <line key={v} x1={padL} x2={W - padR} y1={y} y2={y} stroke="#2a2a2e" strokeWidth={1} />
              })}
              <text x={2} y={padT + 4} fill="#676671" fontSize={9}>100%</text>
              <text x={2} y={padT + chartH / 2 + 3} fill="#676671" fontSize={9}>50%</text>
              <text x={2} y={padT + chartH + 3} fill="#676671" fontSize={9}>0%</text>

              {days.map((d, i) => {
                const x = padL + gap * i + (gap - barW) / 2
                const barH = maxHands > 0 ? (d.hands / maxHands) * chartH : 0
                const y = padT + chartH - barH
                return (
                  <g key={d.key}>
                    <rect x={x} y={y} width={barW} height={barH} rx={3} fill="#0a84d7" opacity={0.7} />
                    {d.hands > 0 && <text x={x + barW / 2} y={y - 3} fill="#0a84d7" fontSize={9} textAnchor="middle" fontFamily="JetBrains Mono">{d.hands}</text>}
                    <text x={padL + gap * i + gap / 2} y={H - 5} fill="#676671" fontSize={9} textAnchor="middle">{d.weekday}</text>
                  </g>
                )
              })}

              {accLine && <path d={accLine} fill="none" stroke="#4fce82" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
              {accPoints.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r={3} fill="#0f0f0f" stroke="#4fce82" strokeWidth={2} />
                  <text x={p.x} y={p.y - 7} fill="#4fce82" fontSize={8} textAnchor="middle" fontFamily="JetBrains Mono">{p.acc}%</text>
                </g>
              ))}
            </svg>
          ) : (
            <div className="py-8 text-center" style={{ color: '#676671', fontSize: 14 }}>
              Treine para ver o grafico aparecer.
            </div>
          )}
        </div>

        {/* Weekly evolution chart */}
        {(() => {
          const allEntries = Object.entries(progress.dailyHistory || {}).sort(([a], [b]) => a.localeCompare(b))
          if (allEntries.length < 2) return null

          // Group by week (ISO week starting Monday)
          function getWeekKey(dateStr) {
            const d = new Date(dateStr + 'T12:00:00')
            const day = d.getDay() || 7
            d.setDate(d.getDate() + 4 - day)
            const yearStart = new Date(d.getFullYear(), 0, 1)
            const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
            return `${d.getFullYear()}-S${String(weekNum).padStart(2, '0')}`
          }

          const weekMap = {}
          allEntries.forEach(([date, data]) => {
            const wk = getWeekKey(date)
            if (!weekMap[wk]) weekMap[wk] = { hands: 0, correct: 0, days: 0 }
            weekMap[wk].hands += data.hands
            weekMap[wk].correct += data.correct
            if (data.hands > 0) weekMap[wk].days++
          })

          const weeks = Object.entries(weekMap).sort(([a], [b]) => a.localeCompare(b)).slice(-12)
          if (weeks.length < 2) return null

          const wW = 320, wH = 160, wPadL = 35, wPadR = 10, wPadT = 20, wPadB = 35
          const wChartW = wW - wPadL - wPadR
          const wChartH = wH - wPadT - wPadB
          const maxWeekHands = Math.max(...weeks.map(([, w]) => w.hands), 1)

          const accPts = weeks.map(([label, w], i) => {
            const x = wPadL + (i / (weeks.length - 1)) * wChartW
            const acc = w.hands > 0 ? Math.round((w.correct / w.hands) * 100) : 0
            const y = wPadT + wChartH - (acc / 100) * wChartH
            return { x, y, acc, label: label.split('-')[1], hands: w.hands }
          })

          const handsPts = weeks.map(([, w], i) => {
            const x = wPadL + (i / (weeks.length - 1)) * wChartW
            const y = wPadT + wChartH - (w.hands / maxWeekHands) * wChartH
            return { x, y, hands: w.hands }
          })

          const accLinePath = accPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
          const handsLinePath = handsPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
          const handsAreaPath = handsLinePath + ` L${handsPts[handsPts.length - 1].x},${wPadT + wChartH} L${handsPts[0].x},${wPadT + wChartH} Z`

          return (
            <div className="rounded-xl p-5 mb-5" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
              <div className="flex items-center justify-between mb-3">
                <span style={{ color: '#fdfdfd', fontWeight: 600, fontSize: 15 }}>Evolucao Semanal</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5"><div style={{ width: 10, height: 2, borderRadius: 1, background: '#0a84d7' }} /><span style={{ color: '#b3b3b8', fontSize: 11 }}>Maos</span></div>
                  <div className="flex items-center gap-1.5"><div style={{ width: 10, height: 2, borderRadius: 1, background: '#4fce82' }} /><span style={{ color: '#b3b3b8', fontSize: 11 }}>Acerto</span></div>
                </div>
              </div>
              <svg viewBox={`0 0 ${wW} ${wH}`} style={{ width: '100%', height: 'auto' }}>
                {[0, 25, 50, 75, 100].map(v => {
                  const y = wPadT + wChartH - (v / 100) * wChartH
                  return <line key={v} x1={wPadL} x2={wW - wPadR} y1={y} y2={y} stroke="#2a2a2e" strokeWidth={0.5} />
                })}
                <text x={2} y={wPadT + 4} fill="#676671" fontSize={8}>100%</text>
                <text x={2} y={wPadT + wChartH / 2 + 3} fill="#676671" fontSize={8}>50%</text>
                <text x={2} y={wPadT + wChartH + 3} fill="#676671" fontSize={8}>0%</text>

                <path d={handsAreaPath} fill="#0a84d7" opacity={0.08} />
                <path d={handsLinePath} fill="none" stroke="#0a84d7" strokeWidth={1.5} opacity={0.5} strokeLinecap="round" strokeLinejoin="round" />

                <path d={accLinePath} fill="none" stroke="#4fce82" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                {accPts.map((p, i) => (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r={3} fill="#0f0f0f" stroke="#4fce82" strokeWidth={1.5} />
                    {(i === 0 || i === accPts.length - 1 || i % Math.max(1, Math.floor(accPts.length / 4)) === 0) && (
                      <text x={p.x} y={p.y - 7} fill="#4fce82" fontSize={7} textAnchor="middle" fontFamily="JetBrains Mono">{p.acc}%</text>
                    )}
                  </g>
                ))}

                {accPts.map((p, i) => (
                  (i === 0 || i === accPts.length - 1 || i % Math.max(1, Math.floor(accPts.length / 3)) === 0) && (
                    <text key={`l${i}`} x={p.x} y={wH - 5} fill="#676671" fontSize={7} textAnchor="middle">{p.label}</text>
                  )
                ))}
              </svg>
              <div className="flex justify-between mt-2">
                <span style={{ color: '#676671', fontSize: 11 }}>{weeks.length} semanas</span>
                <span style={{ color: '#676671', fontSize: 11 }}>
                  {(() => {
                    const first = weeks[0][1], last = weeks[weeks.length - 1][1]
                    const firstAcc = first.hands > 0 ? Math.round((first.correct / first.hands) * 100) : 0
                    const lastAcc = last.hands > 0 ? Math.round((last.correct / last.hands) * 100) : 0
                    const diff = lastAcc - firstAcc
                    return diff > 0 ? `+${diff}% de evolucao` : diff < 0 ? `${diff}% de variacao` : 'Estavel'
                  })()}
                </span>
              </div>
            </div>
          )
        })()}

        {/* Summary grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Total de Maos', value: progress.globalStats.totalHands, color: '#0a84d7' },
            { label: 'Taxa de Acerto', value: `${globalAcc}%`, color: globalAcc >= 90 ? '#4fce82' : globalAcc >= 60 ? '#f5a623' : '#e5484d' },
            { label: 'Melhor Sequencia', value: progress.globalStats.bestStreak, color: '#f5a623' },
            { label: 'Dias Treinados', value: totalDaysPlayed, color: '#0a84d7' },
            { label: 'Metas Batidas', value: totalDaysGoalMet, color: '#4fce82' },
            { label: 'Streak Atual', value: `${streak} dia${streak !== 1 ? 's' : ''}`, color: streak > 0 ? '#f5a623' : '#676671' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4 text-center"
              style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
              <div style={{ color: s.color, fontSize: 22, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{s.value}</div>
              <div style={{ color: '#b3b3b8', fontSize: 11, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
