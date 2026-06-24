import { useState, useCallback } from 'react'

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']

function getHandNotation(i, j) {
  const r1 = RANKS[i], r2 = RANKS[j]
  if (i === j) return r1 + r2
  if (i < j) return r1 + r2 + 's'
  return r2 + r1 + 'o'
}

const ACTION_COLORS = {
  raise:    { bg: '#4fce82', text: '#0f0f0f', label: 'Raise' },
  call:     { bg: '#0a84d7', text: '#fdfdfd', label: 'Call' },
  threebet: { bg: '#e5484d', text: '#fdfdfd', label: '3-Bet' },
  fold:     { bg: '#2a2a2e', text: '#676671', label: 'Fold' },
}

// Build all 169 hands
const ALL_HANDS = []
for (let i = 0; i < 13; i++) {
  for (let j = 0; j < 13; j++) {
    ALL_HANDS.push(getHandNotation(i, j))
  }
}

export default function RangeBuilder({
  correctRange,       // { raise: [...], call: [...], threebet: [...], fold: [...] }
  actions = ['raise', 'fold'],  // which actions to use (e.g. ['raise','call','fold'] or ['threebet','call','fold'])
  onComplete,         // callback({ score, total, correct, wrong })
  title = 'Construa o Range',
}) {
  const [selected, setSelected] = useState({})  // { 'AKs': 'raise', 'AQo': 'fold', ... }
  const [activeAction, setActiveAction] = useState(actions[0])
  const [isDragging, setIsDragging] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)

  const getCorrectAction = useCallback((hand) => {
    if (!correctRange) return 'fold'
    for (const action of Object.keys(correctRange)) {
      if (correctRange[action]?.includes(hand)) return action
    }
    return 'fold'
  }, [correctRange])

  const handleCellDown = (hand) => {
    if (submitted) return
    setIsDragging(true)
    setSelected(prev => ({ ...prev, [hand]: activeAction }))
  }

  const handleCellEnter = (hand) => {
    if (!isDragging || submitted) return
    setSelected(prev => ({ ...prev, [hand]: activeAction }))
  }

  const handleMouseUp = () => setIsDragging(false)

  const handleSubmit = () => {
    let correct = 0
    let total = ALL_HANDS.length

    for (const hand of ALL_HANDS) {
      const userAction = selected[hand] || 'fold'
      const correctAction = getCorrectAction(hand)
      if (userAction === correctAction) correct++
    }

    const score = Math.round((correct / total) * 100)
    const res = { score, total, correct, wrong: total - correct }
    setResult(res)
    setSubmitted(true)
    if (onComplete) onComplete(res)
  }

  const handleReset = () => {
    setSelected({})
    setSubmitted(false)
    setResult(null)
  }

  const filledCount = Object.values(selected).filter(v => v && v !== 'fold').length

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => setIsDragging(false)}
    >
      <h3 className="text-sm font-bold mb-3" style={{ color: '#fdfdfd' }}>{title}</h3>

      {/* Action selector */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {actions.map(action => {
          const c = ACTION_COLORS[action] || ACTION_COLORS.fold
          const isActive = activeAction === action
          return (
            <button
              key={action}
              onClick={() => !submitted && setActiveAction(action)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{
                background: isActive ? c.bg : '#222225',
                color: isActive ? c.text : '#676671',
                border: isActive ? `2px solid ${c.bg}` : '2px solid #2a2a2e',
                opacity: submitted ? 0.5 : 1,
              }}
            >
              {c.label}
            </button>
          )
        })}
        <span className="ml-auto text-xs self-center" style={{ color: '#676671' }}>
          {filledCount} maos selecionadas
        </span>
      </div>

      {/* 13x13 Grid */}
      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gap: 2, userSelect: 'none' }}
      >
        {RANKS.map((_, i) =>
          RANKS.map((_, j) => {
            const hand = getHandNotation(i, j)
            const userAction = selected[hand] || null
            const correctAction = submitted ? getCorrectAction(hand) : null

            let bg, text, opacity
            if (submitted) {
              const isCorrect = (userAction || 'fold') === correctAction
              const cCorrect = ACTION_COLORS[correctAction] || ACTION_COLORS.fold
              bg = cCorrect.bg
              text = cCorrect.text
              opacity = isCorrect ? 1 : 0.3
            } else if (userAction) {
              const c = ACTION_COLORS[userAction] || ACTION_COLORS.fold
              bg = c.bg
              text = c.text
              opacity = 1
            } else {
              bg = '#2a2a2e'
              text = '#676671'
              opacity = 0.5
            }

            return (
              <div
                key={hand}
                onMouseDown={() => handleCellDown(hand)}
                onMouseEnter={() => handleCellEnter(hand)}
                title={hand}
                style={{
                  background: bg,
                  color: text,
                  fontSize: 8,
                  fontFamily: 'JetBrains Mono',
                  fontWeight: 500,
                  padding: '3px 1px',
                  textAlign: 'center',
                  borderRadius: 2,
                  minWidth: 0,
                  lineHeight: 1.2,
                  opacity,
                  cursor: submitted ? 'default' : 'pointer',
                  outline: submitted && (selected[hand] || 'fold') !== correctAction
                    ? '2px solid #e5484d' : 'none',
                }}
              >
                {hand.length <= 3 ? hand : hand.slice(0, 2)}
              </div>
            )
          })
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex gap-4 text-xs" style={{ color: '#676671' }}>
        <span>{'\u2197'} Acima diagonal = suited</span>
        <span>{'\u2199'} Abaixo diagonal = offsuit</span>
      </div>

      {/* Submit / Result */}
      <div className="mt-4">
        {!submitted ? (
          <button
            onClick={handleSubmit}
            className="w-full py-2.5 rounded-lg text-sm font-bold transition-all"
            style={{ background: '#0a84d7', color: '#fdfdfd' }}
          >
            Verificar Range
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#222225' }}>
              <div>
                <div className="text-2xl font-black" style={{ color: result.score >= 80 ? '#4fce82' : result.score >= 60 ? '#f5a623' : '#e5484d' }}>
                  {result.score}%
                </div>
                <div className="text-xs" style={{ color: '#676671' }}>
                  {result.correct}/{result.total} corretas
                </div>
              </div>
              <div className="text-right text-xs" style={{ color: '#b3b3b8' }}>
                {submitted && (
                  <div className="flex gap-3">
                    <div className="flex items-center gap-1">
                      <div style={{ width: 8, height: 8, borderRadius: 2, outline: '2px solid #e5484d' }} />
                      <span>Erradas</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleReset}
              className="w-full py-2 rounded-lg text-sm font-medium"
              style={{ background: '#2a2a2e', color: '#b3b3b8' }}
            >
              Tentar novamente
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
