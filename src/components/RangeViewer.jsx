import { useState } from 'react'
import { RFI_RANGES } from '../data/ranges'

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']

function getHandNotation(r1, r2, i, j) {
  if (i === j) return r1 + r2
  if (i < j) return r1 + r2 + 's'
  return r2 + r1 + 'o'
}

const STATUS_COLORS = {
  raise: { bg: '#00e68a', text: '#050508' },
  mix:   { bg: '#ffaa33', text: '#050508' },
  fold:  { bg: '#1e1e30', text: '#55556a' },
  call:  { bg: '#4488ff', text: '#050508' },
  threebet: { bg: '#ff4466', text: 'white' },
  push:  { bg: '#00e68a', text: '#050508' },
  complete: { bg: '#ffaa33', text: '#050508' },
}

export default function RangeViewer({ pos, stack, customRange, label, legend, highlightHand }) {
  const [open, setOpen] = useState(false)

  function getStatus(hand) {
    if (customRange) {
      for (const [key, list] of Object.entries(customRange)) {
        if (list?.includes(hand)) return key
      }
      return 'fold'
    }
    const range = RFI_RANGES[pos]?.[stack]
    if (!range) return 'fold'
    if (range.raise?.includes(hand)) return 'raise'
    if (range.mix?.includes(hand)) return 'mix'
    return 'fold'
  }

  const resolvedLabel = label || `Ver range completo — ${pos} ${stack}bb`
  const resolvedLegend = legend || [['raise', 'Raise'], ['mix', 'Mix'], ['fold', 'Fold']]

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold w-full"
        style={{ background: '#12121c', color: '#4488ff', border: '1px solid #4488ff30' }}
      >
        <span>{open ? '▼' : '▶'}</span>
        {resolvedLabel}
      </button>

      {open && (
        <div className="mt-3 rounded-xl p-3 overflow-x-auto" style={{ background: '#050508', border: '1px solid #1e1e30' }}>
          <div className="flex gap-3 mb-3 flex-wrap">
            {resolvedLegend.map(([s, l]) => (
              <div key={s} className="flex items-center gap-1">
                <div style={{ width: 12, height: 12, borderRadius: 3, background: STATUS_COLORS[s]?.bg || '#1e1e30' }} />
                <span style={{ color: '#8888a0', fontSize: 11 }}>{l}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gap: 2 }}>
            {RANKS.map((r1, i) =>
              RANKS.map((r2, j) => {
                const hand = getHandNotation(r1, r2, i, j)
                const status = getStatus(hand)
                const isHighlighted = hand === highlightHand
                const { bg, text } = STATUS_COLORS[status] || STATUS_COLORS.fold

                return (
                  <div
                    key={hand}
                    title={hand}
                    style={{
                      background: bg,
                      color: text,
                      fontSize: 8,
                      fontFamily: 'JetBrains Mono',
                      fontWeight: isHighlighted ? 900 : 400,
                      padding: '3px 1px',
                      textAlign: 'center',
                      borderRadius: 2,
                      outline: isHighlighted ? '2px solid #ff4466' : 'none',
                      minWidth: 0,
                      lineHeight: 1.2,
                      opacity: status === 'fold' ? 0.35 : 1,
                    }}
                  >
                    {hand.length <= 3 ? hand : hand.slice(0, 2)}
                  </div>
                )
              })
            )}
          </div>

          <div className="mt-3 flex gap-4 text-xs" style={{ color: '#55556a' }}>
            <span>↗ Acima diagonal = suited</span>
            <span>↙ Abaixo diagonal = offsuit</span>
          </div>
        </div>
      )}
    </div>
  )
}
