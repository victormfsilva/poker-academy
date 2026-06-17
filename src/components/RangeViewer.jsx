import { useState } from 'react'
import { RFI_RANGES } from '../data/ranges'

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']

function getHandNotation(r1, r2, i, j) {
  if (i === j) return r1 + r2
  if (i < j) return r1 + r2 + 's'
  return r2 + r1 + 'o'
}

const STATUS_COLORS = {
  raise: { bg: '#4fce82', text: '#0f0f0f' },
  mix:   { bg: '#f5a623', text: '#0f0f0f' },
  fold:  { bg: '#2a2a2e', text: '#676671' },
  call:  { bg: '#0a84d7', text: '#fdfdfd' },
  threebet: { bg: '#e5484d', text: '#fdfdfd' },
  push:  { bg: '#4fce82', text: '#0f0f0f' },
  complete: { bg: '#f5a623', text: '#0f0f0f' },
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

  const resolvedLabel = label || `Ver range completo \u2014 ${pos} ${stack}bb`
  const resolvedLegend = legend || [['raise', 'Raise'], ['mix', 'Mix'], ['fold', 'Fold']]

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium w-full"
        style={{ background: '#222225', color: '#0a84d7', border: '1px solid #2a2a2e' }}
      >
        <span>{open ? '\u25BC' : '\u25B6'}</span>
        {resolvedLabel}
      </button>

      {open && (
        <div className="mt-3 rounded-xl p-3 overflow-x-auto" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
          <div className="flex gap-3 mb-3 flex-wrap">
            {resolvedLegend.map(([s, l]) => (
              <div key={s} className="flex items-center gap-1.5">
                <div style={{ width: 10, height: 10, borderRadius: 2, background: STATUS_COLORS[s]?.bg || '#2a2a2e' }} />
                <span style={{ color: '#b3b3b8', fontSize: 11 }}>{l}</span>
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
                      fontWeight: isHighlighted ? 900 : 500,
                      padding: '3px 1px',
                      textAlign: 'center',
                      borderRadius: 2,
                      outline: isHighlighted ? '2px solid #e5484d' : 'none',
                      minWidth: 0,
                      lineHeight: 1.2,
                      opacity: status === 'fold' ? 0.4 : 1,
                    }}
                  >
                    {hand.length <= 3 ? hand : hand.slice(0, 2)}
                  </div>
                )
              })
            )}
          </div>

          <div className="mt-3 flex gap-4 text-xs" style={{ color: '#676671' }}>
            <span>\u2197 Acima diagonal = suited</span>
            <span>\u2199 Abaixo diagonal = offsuit</span>
          </div>
        </div>
      )}
    </div>
  )
}
