const MOD_NAMES = {
  1: 'RFI', 2: 'Push/Fold', 3: 'Pot Odds', 4: 'BB vs RFI', 5: 'CBet Flop',
  6: 'Blind Wars', 7: 'SB vs RFI', 8: 'BTN vs RFI', 9: '3-Bet', 10: 'Def vs CBet',
  13: 'Donk Bet', 14: 'CBet Turn', 15: 'River Play', 16: 'GTO vs Exploit',
  17: 'ICM', 18: 'Multiway', 19: 'Blockers', 20: 'HUD & Solvers', 21: 'Late Game',
  22: 'SPR', 23: 'Range/Nut',
}

export function analyzeLeaks(history) {
  if (!history || history.length < 20) return []

  const buckets = {}

  history.forEach(entry => {
    // Leak por modulo
    const modKey = `mod_${entry.m}`
    if (!buckets[modKey]) buckets[modKey] = { total: 0, errors: 0, label: MOD_NAMES[entry.m] || `Modulo ${entry.m}`, type: 'modulo', moduleId: entry.m }
    buckets[modKey].total++
    if (!entry.ok) buckets[modKey].errors++

    // Leak por posicao
    if (entry.p) {
      const posKey = `pos_${entry.p}`
      if (!buckets[posKey]) buckets[posKey] = { total: 0, errors: 0, label: `Posicao ${entry.p}`, type: 'posicao' }
      buckets[posKey].total++
      if (!entry.ok) buckets[posKey].errors++
    }

    // Leak por tipo de mao
    if (entry.h) {
      const hand = entry.h
      const r1 = hand[0], r2 = hand.length >= 2 ? hand[1] : null
      let handType = null
      if (r1 === r2) handType = 'Pocket Pairs'
      else if (hand.endsWith('s')) {
        const highs = 'AKQJT'
        if (highs.includes(r1) && highs.includes(r2)) handType = 'Broadways suited'
        else if (Math.abs('AKQJT98765432'.indexOf(r1) - 'AKQJT98765432'.indexOf(r2)) <= 2) handType = 'Suited Connectors'
        else handType = 'Suited Gappers'
      } else if (hand.endsWith('o')) {
        const highs = 'AKQJT'
        if (highs.includes(r1) && highs.includes(r2)) handType = 'Broadways offsuit'
        else handType = 'Offsuit fracos'
      }
      if (handType) {
        const htKey = `ht_${handType}`
        if (!buckets[htKey]) buckets[htKey] = { total: 0, errors: 0, label: handType, type: 'mao' }
        buckets[htKey].total++
        if (!entry.ok) buckets[htKey].errors++
      }
    }
  })

  return Object.values(buckets)
    .filter(b => b.total >= 5 && b.errors > 0)
    .map(b => ({ ...b, errorRate: Math.round((b.errors / b.total) * 100) }))
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, 3)
}
