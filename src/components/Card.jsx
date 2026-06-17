// Cartas estilo GTO Wizard — cada carta separada, cor de fundo = naipe, rank branco

// Cores extraidas do GTO Wizard (screenshot real)
const SUIT_BG = { s: '#4b4b5e', h: '#b8312a', d: '#2563b5', c: '#48824a' }

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
  const bg = SUIT_BG[suit] || '#4b4b5e'
  const rankDisplay = rank === 'T' ? '10' : rank

  const dims = size === 'sm'
    ? { w: 26, h: 34, r: 4, fs: 15 }
    : size === 'lg'
    ? { w: 44, h: 54, r: 6, fs: 26 }
    : { w: 36, h: 44, r: 5, fs: 21 }

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
        fontWeight: 700,
        fontSize: dims.fs,
        lineHeight: 1,
      }}
    >
      {rankDisplay}
    </div>
  )
}
