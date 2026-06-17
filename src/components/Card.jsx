// Componente de carta estilo profissional

const SUIT_SYMBOLS = { s: '\u2660', h: '\u2665', d: '\u2666', c: '\u2663' }
const SUIT_COLORS = { s: '#1a1a1d', h: '#e5484d', d: '#0a84d7', c: '#1a1a1d' }
const SUIT_BG = { s: '#fdfdfd', h: '#fdfdfd', d: '#fdfdfd', c: '#fdfdfd' }

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
  const color = SUIT_COLORS[suit] || '#1a1a1d'
  const rankDisplay = rank === 'T' ? '10' : rank

  if (size === 'sm') {
    return (
      <div
        className="flex flex-col items-center justify-center select-none overflow-hidden"
        style={{
          width: 36, height: 50, borderRadius: 6,
          background: '#fdfdfd',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ color, fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 13, lineHeight: 1 }}>
          {rankDisplay}
        </div>
        <div style={{ color, fontSize: 14, lineHeight: 1, marginTop: 1 }}>
          {symbol}
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col justify-between p-1.5 select-none overflow-hidden"
      style={{
        width: 56, height: 80, borderRadius: 8,
        background: '#fdfdfd',
        boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ color, fontFamily: 'Poppins, sans-serif', fontWeight: 700, lineHeight: 1 }}>
        <div style={{ fontSize: 15 }}>{rankDisplay}</div>
        <div style={{ fontSize: 12 }}>{symbol}</div>
      </div>
      <div style={{ color, fontSize: 22, textAlign: 'center', lineHeight: 1 }}>
        {symbol}
      </div>
      <div style={{ color, fontFamily: 'Poppins, sans-serif', fontWeight: 700, lineHeight: 1, alignSelf: 'flex-end', transform: 'rotate(180deg)' }}>
        <div style={{ fontSize: 15 }}>{rankDisplay}</div>
        <div style={{ fontSize: 12 }}>{symbol}</div>
      </div>
    </div>
  )
}
