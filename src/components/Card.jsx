// Cartas com toggle: estilo GTO Wizard (CSS) ou SVG profissional
import { useState, useEffect, useRef } from 'react'

// ── CSS Card Style (original GTO Wizard) ──
const SUIT_BG = { s: '#4b4b5e', h: '#b8312a', d: '#2563b5', c: '#48824a' }

// ── SVG Card Style ──
const SUIT_MAP = { s: 'spade', h: 'heart', d: 'diamond', c: 'club' }
const RANK_MAP = { A: '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', T: '10', J: 'jack', Q: 'queen', K: 'king' }
const CARD_W = 169.075
const CARD_H = 244.640

// Transforms de cada carta no sprite SVG (extraidos do svg-cards.svg)
const CARD_TRANSFORMS = {
  club_1:[1.25,236.52],club_2:[-166.325,236.52],club_3:[-333.9,236.52],club_4:[-501.475,236.52],club_5:[-669.05,236.52],club_6:[-836.625,236.52],club_7:[-1004.2,236.52],club_8:[-1171.77,236.52],club_9:[-1339.35,236.52],club_10:[-1506.92,236.52],club_jack:[-1674.5,236.52],club_queen:[-1842.07,236.52],club_king:[-2009.65,236.52],
  diamond_1:[1.25,-6.617],diamond_2:[-166.325,-6.617],diamond_3:[-333.9,-6.617],diamond_4:[-501.475,-6.617],diamond_5:[-669.05,-6.617],diamond_6:[-836.625,-6.617],diamond_7:[-1004.2,-6.617],diamond_8:[-1171.77,-6.617],diamond_9:[-1339.35,-6.617],diamond_10:[-1506.92,-6.617],diamond_jack:[-1674.5,-6.617],diamond_queen:[-1842.07,-6.617],diamond_king:[-2009.65,-6.617],
  heart_1:[1.25,-249.755],heart_2:[-166.325,-249.755],heart_3:[-333.9,-249.755],heart_4:[-501.475,-249.755],heart_5:[-669.05,-249.755],heart_6:[-836.625,-249.755],heart_7:[-1004.2,-249.755],heart_8:[-1171.77,-249.755],heart_9:[-1339.35,-249.755],heart_10:[-1506.92,-249.755],heart_jack:[-1674.5,-249.755],heart_queen:[-1842.07,-249.755],heart_king:[-2009.65,-249.755],
  spade_1:[1.25,-492.892],spade_2:[-166.325,-492.892],spade_3:[-333.9,-492.892],spade_4:[-501.475,-492.892],spade_5:[-669.05,-492.892],spade_6:[-836.625,-492.892],spade_7:[-1004.2,-492.892],spade_8:[-1171.77,-492.892],spade_9:[-1339.35,-492.892],spade_10:[-1506.92,-492.892],spade_jack:[-1674.5,-492.892],spade_queen:[-1842.07,-492.892],spade_king:[-2009.65,-492.892],
}

// Singleton: carrega o SVG sprite uma unica vez
let spriteLoaded = false
let spriteLoading = false
const spriteCallbacks = []

function ensureSvgSprite() {
  if (spriteLoaded) return
  if (spriteLoading) return
  spriteLoading = true

  fetch('/cards/svg-cards.svg')
    .then(r => r.text())
    .then(svgText => {
      const container = document.createElement('div')
      container.id = 'svg-card-sprite'
      container.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden'
      container.innerHTML = svgText
      document.body.appendChild(container)
      spriteLoaded = true
      spriteCallbacks.forEach(cb => cb())
      spriteCallbacks.length = 0
    })
    .catch(() => { spriteLoading = false })
}

function onSpriteReady(cb) {
  if (spriteLoaded) { cb(); return }
  spriteCallbacks.push(cb)
  ensureSvgSprite()
}

// ── Preferencia do usuario ──
const CARD_STYLE_KEY = 'poker_academy_card_style'

export function getCardStyle() {
  try { return localStorage.getItem(CARD_STYLE_KEY) || 'css' } catch { return 'css' }
}

export function setCardStyle(style) {
  try { localStorage.setItem(CARD_STYLE_KEY, style) } catch {}
}

// Hook para componentes que precisam reagir a mudanca de estilo
export function useCardStyle() {
  const [style, _setStyle] = useState(getCardStyle)

  useEffect(() => {
    function onStorage(e) {
      if (e.key === CARD_STYLE_KEY) _setStyle(e.newValue || 'css')
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('cardStyleChange', () => _setStyle(getCardStyle()))
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('cardStyleChange', () => {})
    }
  }, [])

  function toggle() {
    const next = style === 'css' ? 'svg' : 'css'
    setCardStyle(next)
    _setStyle(next)
    window.dispatchEvent(new Event('cardStyleChange'))
  }

  return [style, toggle]
}

// ── Funcoes utilitarias (mantidas iguais) ──

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

// ── Componente SVG Card ──

function SvgCard({ rank, suit, dims }) {
  const [ready, setReady] = useState(spriteLoaded)
  const svgRef = useRef(null)

  useEffect(() => {
    if (!spriteLoaded) {
      onSpriteReady(() => setReady(true))
    }
  }, [])

  const suitName = SUIT_MAP[suit]
  const rankId = RANK_MAP[rank]
  if (!suitName || !rankId) return null

  const cardId = suitName + '_' + rankId
  const t = CARD_TRANSFORMS[cardId]
  if (!t || !ready) {
    // Fallback while loading: show CSS card
    return <CssCard rank={rank} suit={suit} dims={dims} />
  }

  const vb = `${t[0]} ${t[1]} ${CARD_W} ${CARD_H}`

  return (
    <svg
      ref={svgRef}
      viewBox={vb}
      width={dims.w}
      height={dims.h}
      style={{ borderRadius: dims.r, overflow: 'hidden', display: 'block' }}
    >
      <use href={`#${cardId}`} />
    </svg>
  )
}

// ── Componente CSS Card (original) ──

function CssCard({ rank, suit, dims }) {
  const bg = SUIT_BG[suit] || '#4b4b5e'
  const rankDisplay = rank === 'T' ? '10' : rank

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

// ── Componente Principal ──

export default function Card({ card, size = 'md' }) {
  const parsed = typeof card === 'string' ? parseCard(card) : card
  if (!parsed) return null

  const { rank, suit } = parsed

  const dims = size === 'xs'
    ? { w: 20, h: 26, r: 3, fs: 11 }
    : size === 'sm'
    ? { w: 26, h: 34, r: 4, fs: 15 }
    : size === 'lg'
    ? { w: 44, h: 54, r: 6, fs: 26 }
    : { w: 36, h: 44, r: 5, fs: 21 }

  const style = getCardStyle()

  if (style === 'svg') {
    return <SvgCard rank={rank} suit={suit} dims={dims} />
  }

  return <CssCard rank={rank} suit={suit} dims={dims} />
}
