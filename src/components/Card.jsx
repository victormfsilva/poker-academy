// Cartas com toggle: estilo GTO Wizard (CSS) ou SVG profissional
import { useState, useEffect, useRef } from 'react'

// ── CSS Card Style (original GTO Wizard) ──
const SUIT_BG = { s: '#4b4b5e', h: '#b8312a', d: '#2563b5', c: '#48824a' }

// ── SVG Card Style ──
const SUIT_MAP = { s: 'spade', h: 'heart', d: 'diamond', c: 'club' }
const RANK_MAP = { A: '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', T: '10', J: 'jack', Q: 'queen', K: 'king' }

// Singleton: carrega e parseia o SVG sprite uma unica vez
let spriteSvgEl = null
let spriteLoading = false
const spriteCallbacks = []

function ensureSvgSprite() {
  if (spriteSvgEl) return
  if (spriteLoading) return
  spriteLoading = true

  fetch('/cards/svg-cards.svg')
    .then(r => r.text())
    .then(svgText => {
      const parser = new DOMParser()
      const doc = parser.parseFromString(svgText, 'image/svg+xml')
      spriteSvgEl = doc.documentElement
      spriteCallbacks.forEach(cb => cb())
      spriteCallbacks.length = 0
    })
    .catch(() => { spriteLoading = false })
}

function onSpriteReady(cb) {
  if (spriteSvgEl) { cb(); return }
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
    function onCustom() { _setStyle(getCardStyle()) }
    window.addEventListener('storage', onStorage)
    window.addEventListener('cardStyleChange', onCustom)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('cardStyleChange', onCustom)
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
// Clona os nodes DOM diretamente do sprite parseado para dentro de um container div.
// Isso garante que todas as referências internas (xlink:href) são resolvidas.

function SvgCard({ rank, suit, dims }) {
  const containerRef = useRef(null)
  const [ready, setReady] = useState(!!spriteSvgEl)

  useEffect(() => {
    if (!spriteSvgEl) {
      onSpriteReady(() => setReady(true))
    }
  }, [])

  useEffect(() => {
    if (!ready || !spriteSvgEl || !containerRef.current) return

    const suitName = SUIT_MAP[suit]
    const rankId = RANK_MAP[rank]
    if (!suitName || !rankId) return

    const cardId = suitName + '_' + rankId
    const cardGroup = spriteSvgEl.querySelector(`#${cardId}`)
    if (!cardGroup) return

    // Get card's transform to calculate viewBox
    const transform = cardGroup.getAttribute('transform') || ''
    const tMatch = transform.match(/translate\(([^,]+),([^)]+)\)/)
    const tx = tMatch ? parseFloat(tMatch[1]) : 0
    const ty = tMatch ? parseFloat(tMatch[2]) : 0

    // Clone the entire sprite SVG (with all defs)
    const svgClone = spriteSvgEl.cloneNode(true)

    // Set viewBox to show only this card
    svgClone.setAttribute('viewBox', `${tx} ${ty} 169.075 244.64`)
    svgClone.setAttribute('width', String(dims.w))
    svgClone.setAttribute('height', String(dims.h))
    svgClone.style.borderRadius = dims.r + 'px'
    svgClone.style.overflow = 'hidden'
    svgClone.style.display = 'block'

    // Move ALL card groups out of defs so they render
    const defs = svgClone.querySelector('defs')
    if (defs) {
      const allCards = defs.querySelectorAll(
        'g[id^="club_"], g[id^="diamond_"], g[id^="heart_"], g[id^="spade_"]'
      )
      allCards.forEach(g => {
        defs.removeChild(g)
        svgClone.appendChild(g)
      })
    }

    // Clear previous content and insert
    containerRef.current.innerHTML = ''
    containerRef.current.appendChild(svgClone)
  }, [ready, rank, suit, dims.w, dims.h, dims.r])

  if (!ready) {
    return <CssCard rank={rank} suit={suit} dims={dims} />
  }

  return <div ref={containerRef} style={{ width: dims.w, height: dims.h, display: 'inline-block' }} />
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
