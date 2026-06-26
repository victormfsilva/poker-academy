// ================================================================
// Rating ELO + ICM — funções compartilhadas entre Arena HU e MTT 6-max
// ================================================================

// ─── Constantes ─────────────────────────────────────────
export const RATING_KEY = 'poker-arena-rating'
export const STARTING_RATING = 1200

export const RATING_TIERS = [
  { min: 0, max: 999, label: 'Bronze', color: '#cd7f32' },
  { min: 1000, max: 1299, label: 'Prata', color: '#b3b3b8' },
  { min: 1300, max: 1599, label: 'Ouro', color: '#f5a623' },
  { min: 1600, max: 1899, label: 'Platina', color: '#00b4d8' },
  { min: 1900, max: 2199, label: 'Diamante', color: '#a855f7' },
  { min: 2200, max: 9999, label: 'Elite', color: '#e5484d' },
]

// ─── Rating helpers ─────────────────────────────────────
export function getRatingTier(rating) {
  return RATING_TIERS.find(t => rating >= t.min && rating <= t.max) || RATING_TIERS[0]
}

export function loadRating() {
  try {
    const raw = localStorage.getItem(RATING_KEY)
    if (!raw) return { rating: STARTING_RATING, peak: STARTING_RATING, history: [] }
    return JSON.parse(raw)
  } catch { return { rating: STARTING_RATING, peak: STARTING_RATING, history: [] } }
}

export function saveRating(data) {
  try { localStorage.setItem(RATING_KEY, JSON.stringify(data)) } catch {}
}

// Dificuldade da situação (afeta quanto ganha/perde)
export function spotDifficulty(strength, lastBet, pot, street) {
  if (strength === 'monster' && lastBet === 0) return 0.5
  if (strength === 'air' && lastBet > 0) return 0.5
  if (strength === 'draw') return 1.5
  if (strength === 'marginal' && lastBet > 0) return 1.8
  if ((strength === 'weak' || strength === 'air') && lastBet === 0) return 1.4
  if (strength === 'good' && street === 'river') return 1.3
  return 1.0
}

// Calcula mudança de rating por decisão
export function calcRatingChange(isCorrect, strength, lastBet, pot, street, currentRating) {
  const basePoints = 8
  const difficulty = spotDifficulty(strength, lastBet, pot, street)
  const kFactor = currentRating < 1400 ? 1.2 : currentRating < 1800 ? 1.0 : 0.8

  if (isCorrect) {
    return Math.round(basePoints * difficulty * kFactor)
  } else {
    return -Math.round(basePoints * (2.0 - difficulty * 0.5) * kFactor)
  }
}

// ─── ICM ────────────────────────────────────────────────
// Calcula equity ($EV) de cada jogador baseado nos stacks (Malmuth-Harville)
export function icmEquity(stacks, payouts) {
  const total = stacks.reduce((a, b) => a + b, 0)
  if (total === 0) return stacks.map(() => 0)
  const n = stacks.length
  const alive = stacks.map((s, i) => ({ idx: i, stack: s })).filter(p => p.stack > 0)

  const equity = new Array(n).fill(0)

  function distribute(remaining, probProduct, placeIdx) {
    if (placeIdx >= payouts.length || remaining.length === 0) return
    const totalRemaining = remaining.reduce((a, b) => a + b.stack, 0)
    for (let i = 0; i < remaining.length; i++) {
      const p = remaining[i]
      const prob = (p.stack / totalRemaining) * probProduct
      equity[p.idx] += prob * payouts[placeIdx]
      const next = remaining.filter((_, j) => j !== i)
      distribute(next, prob, placeIdx + 1)
    }
  }

  distribute(alive, 1, 0)
  return equity
}
