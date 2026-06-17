// Componente de carta estilo GTO Wizard — cor de fundo = naipe, rank branco centralizado

// 4-color: spades=cinza escuro, hearts=vermelho, diamonds=azul, clubs=verde
const SUIT_BG = { s: '#5a5a6e', h: '#c0392b', d: '#2980b9', c: '#27ae60' }

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
  const bg = SUIT_BG[suit] || '#5a5a6e'
  const rankDisplay = rank === 'T' ? '10' : rank

  const dims = size === 'sm'
    ? { w: 28, h: 36, r: 5, fs: 15, fw: 800 }
    : { w: 38, h: 50, r: 6, fs: 20, fw: 800 }

  return (
    <div
      className="inline-flex items-center justify-center select-none"
      style={{
        width: dims.w,
        height: dims.h,
        borderRadius: dims.r,
        background: bg,
        color: '#ffffff',
        fontFamily: 'Poppins, sans-serif',
        fontWeight: dims.fw,
        fontSize: dims.fs,
        lineHeight: 1,
        boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
        letterSpacing: -0.5,
      }}
    >
      {rankDisplay}
    </div>
  )
}
