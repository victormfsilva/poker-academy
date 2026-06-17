// Componente de carta estilo GTO Wizard (4-color, dark bg)

const SUIT_SYMBOLS = { s: '\u2660', h: '\u2665', d: '\u2666', c: '\u2663' }
const SUIT_COLORS = { s: '#c8c8d0', h: '#e5484d', d: '#559bef', c: '#4fce82' }

export function parseCard(str) {
  if (!str || str.length < 2) return null
  const rank = str.slice(0, -1)
  const suit = str.slice(-1)
  return { rank, suit }
}

export function randomCard(exclude = []) {
  const ranks = ['2','3','4','5','6','7','8','9','T','J','Q','K','A']
  const suits = ['s','h','d','c']
  let card
  do {
    const r = ranks[Math.floor(Math.random() * ranks.length)]
    const s = suits[Math.floor(Math.random() * suits.length)]
    card = r + s
  } while (exclude.includes(card))
  return card
}

export function handToCards(hand) {
  const ranks = hand.slice(0, 2).split('')
  const type = hand.length > 2 ? hand[2] : 'o'
  if (ranks[0] === ranks[1]) {
    const suits = ['s', 'h']
    return [ranks[0] + suits[0], ranks[1] + suits[1]]
  }
  if (type === 's') {
    return [ranks[0] + 's', ranks[1] + 's']
  }
  return [ranks[0] + 's', ranks[1] + 'h']
}

export default function Card({ card, size = 'md' }) {
  const parsed = typeof card === 'string' ? parseCard(card) : card
  if (!parsed) return null

  const { rank, suit } = parsed
  const symbol = SUIT_SYMBOLS[suit] || suit
  const color = SUIT_COLORS[suit] || '#c8c8d0'
  const rankDisplay = rank === 'T' ? '10' : rank

  if (size === 'sm') {
    return (
      <div
        className="flex flex-col items-center justify-center select-none"
        style={{
          width: 34, height: 48, borderRadius: 5,
          background: '#1e1e24',
          border: '1px solid #2e2e36',
          boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ color, fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 14, lineHeight: 1 }}>
          {rankDisplay}
        </div>
        <div style={{ color, fontSize: 12, lineHeight: 1, marginTop: 1 }}>
          {symbol}
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col select-none"
      style={{
        width: 52, height: 74, borderRadius: 7,
        background: '#1e1e24',
        border: '1px solid #2e2e36',
        boxShadow: '0 2px 12px rgba(0,0,0,0.7)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top-left rank + suit */}
      <div style={{ padding: '5px 0 0 6px', lineHeight: 1 }}>
        <div style={{ color, fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 16, lineHeight: 1 }}>
          {rankDisplay}
        </div>
        <div style={{ color, fontSize: 11, lineHeight: 1, marginTop: 1 }}>
          {symbol}
        </div>
      </div>

      {/* Center suit large */}
      <div style={{
        color,
        fontSize: 24,
        textAlign: 'center',
        lineHeight: 1,
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -4,
      }}>
        {symbol}
      </div>
    </div>
  )
}
