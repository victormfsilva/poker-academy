// Componente de carta de baralho visual

const SUIT_SYMBOLS = { s: '♠', h: '♥', d: '♦', c: '♣' }
const SUIT_COLORS = { s: '#4488ff', h: '#ff4466', d: '#ff4466', c: '#4488ff' }

// Converte notação "As" → { rank: 'A', suit: 's' }
export function parseCard(str) {
  if (!str || str.length < 2) return null
  const rank = str.slice(0, -1)
  const suit = str.slice(-1)
  return { rank, suit }
}

// Gera uma carta aleatória
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

// Gera duas cartas de uma mão (ex: "AKs" → ['As', 'Ks'])
export function handToCards(hand) {
  const ranks = hand.slice(0, 2).split('')
  const type = hand.length > 2 ? hand[2] : 'o'
  if (ranks[0] === ranks[1]) {
    // Par
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
  const color = SUIT_COLORS[suit] || '#1a1a2e'

  const sizes = {
    xs: 'w-7 h-10 text-xs',
    sm: 'w-10 h-14 text-sm',
    md: 'w-16 h-24 text-xl',
    lg: 'w-20 h-28 text-2xl',
  }

  const rankDisplay = rank === 'T' ? '10' : rank

  if (size === 'sm') {
    return (
      <div
        className="w-10 h-14 rounded-md flex flex-col items-center justify-center select-none overflow-hidden"
        style={{ background: '#0c0c12', border: `1.5px solid ${color}44`, gap: 0 }}
      >
        <div style={{ color, fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: 13, lineHeight: 1 }}>
          {rankDisplay}
        </div>
        <div style={{ color, fontSize: 16, lineHeight: 1, marginTop: 1 }}>
          {symbol}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`${sizes[size]} rounded-lg flex flex-col justify-between p-1 select-none overflow-hidden`}
      style={{ background: '#0c0c12', border: `2px solid ${color}44` }}
    >
      <div style={{ color, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, lineHeight: 1 }}>
        <div style={{ fontSize: 16 }}>{rankDisplay}</div>
        <div style={{ fontSize: 14 }}>{symbol}</div>
      </div>
      <div style={{ color, fontSize: 28, textAlign: 'center', lineHeight: 1 }}>
        {symbol}
      </div>
      <div style={{ color, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, lineHeight: 1, alignSelf: 'flex-end', transform: 'rotate(180deg)' }}>
        <div style={{ fontSize: 16 }}>{rankDisplay}</div>
        <div style={{ fontSize: 14 }}>{symbol}</div>
      </div>
    </div>
  )
}
