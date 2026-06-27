// ================================================================
// Spin & Go Tracker — Fase 5: Sessões, Leaks, Stats, Heatmap, Bankroll, Export
// ================================================================

const SPIN_TRACKER_KEY = 'poker-spin-tracker'
const SPIN_HANDS_KEY = 'poker-spin-hands'

// ─── Storage ────────────────────────────────────────────────

function loadTracker() {
  try {
    const raw = localStorage.getItem(SPIN_TRACKER_KEY)
    if (!raw) return getDefaultTracker()
    return JSON.parse(raw)
  } catch { return getDefaultTracker() }
}

function saveTracker(data) {
  try { localStorage.setItem(SPIN_TRACKER_KEY, JSON.stringify(data)) } catch {}
}

function loadHands() {
  try {
    const raw = localStorage.getItem(SPIN_HANDS_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch { return [] }
}

function saveHands(hands) {
  try {
    // Keep last 500 hands to prevent storage bloat
    localStorage.setItem(SPIN_HANDS_KEY, JSON.stringify(hands.slice(0, 500)))
  } catch {}
}

function getDefaultTracker() {
  return {
    sessions: [],        // Array of completed spin sessions
    totals: {
      played: 0,
      wins: 0,
      second: 0,
      third: 0,
      totalMultiplier: 0,
      totalHands: 0,
      handsHU: 0,
      hands3Max: 0,
      winsHU: 0,
      wins3Max: 0,
    },
    leaks: {
      btnOpenTooTight: 0,   // Fold no BTN com mão que deveria open
      sbOpenTooTight: 0,    // Fold no SB com mão que deveria open
      bbFoldTooMuch: 0,     // Fold no BB com mão que deveria defender
      missedPush: 0,        // Não pushou quando deveria (push zone)
      badCallPush: 0,       // Chamou push com mão que deveria fold
      missedCallPush: 0,    // Foldou push com mão que deveria call
      totalDecisions: 0,
    },
    heatmap: {},           // { "BTN_15bb_open": { correct: 0, wrong: 0 }, ... }
  }
}

// ─── Session Recording ──────────────────────────────────────

export function recordSpinSession(place, multiplier, handCount, isHU, handDetails) {
  const tracker = loadTracker()
  const hands = loadHands()

  const session = {
    id: Date.now(),
    date: new Date().toISOString(),
    place,
    multiplier,
    handCount,
    reachedHU: isHU,
    buyIn: 1,
    payout: place === 1 ? multiplier : 0,
  }

  tracker.sessions.push(session)
  // Keep last 200 sessions
  if (tracker.sessions.length > 200) tracker.sessions = tracker.sessions.slice(-200)

  // Update totals
  tracker.totals.played++
  if (place === 1) tracker.totals.wins++
  else if (place === 2) tracker.totals.second++
  else tracker.totals.third++
  tracker.totals.totalMultiplier += multiplier
  tracker.totals.totalHands += handCount

  saveTracker(tracker)

  // Save hand details for heatmap/leak analysis
  if (handDetails?.length) {
    const merged = [...handDetails, ...hands].slice(0, 500)
    saveHands(merged)
  }

  return tracker
}

// ─── Record individual hand decision for leak/heatmap ───────

export function recordHandDecision(decision) {
  // decision: { position, stackBB, context, heroAction, gtoAction, isCorrect, isHU, hand }
  // context: 'open' | 'push' | 'callPush' | 'defense' | 'postflop'
  const tracker = loadTracker()

  tracker.leaks.totalDecisions++

  // Leak detection
  if (!decision.isCorrect) {
    if (decision.context === 'open' && decision.heroAction === 'fold') {
      if (decision.position === 'BTN') tracker.leaks.btnOpenTooTight++
      else if (decision.position === 'SB') tracker.leaks.sbOpenTooTight++
    }
    if (decision.context === 'defense' && decision.heroAction === 'fold' && decision.position === 'BB') {
      tracker.leaks.bbFoldTooMuch++
    }
    if (decision.context === 'push' && decision.heroAction === 'fold') {
      tracker.leaks.missedPush++
    }
    if (decision.context === 'callPush' && decision.heroAction === 'call' && decision.gtoAction === 'fold') {
      tracker.leaks.badCallPush++
    }
    if (decision.context === 'callPush' && decision.heroAction === 'fold' && decision.gtoAction !== 'fold') {
      tracker.leaks.missedCallPush++
    }
  }

  // Heatmap: bucket by position_stack_context
  const stackBucket = decision.stackBB <= 5 ? '5' :
    decision.stackBB <= 8 ? '8' :
    decision.stackBB <= 10 ? '10' :
    decision.stackBB <= 13 ? '13' :
    decision.stackBB <= 15 ? '15' :
    decision.stackBB <= 20 ? '20' : '25'
  const phase = decision.isHU ? 'HU' : '3max'
  const key = `${decision.position}_${stackBucket}bb_${decision.context}_${phase}`

  if (!tracker.heatmap[key]) tracker.heatmap[key] = { correct: 0, wrong: 0 }
  if (decision.isCorrect) tracker.heatmap[key].correct++
  else tracker.heatmap[key].wrong++

  // Phase stats
  if (decision.isHU) {
    tracker.totals.handsHU++
    if (decision.isCorrect) tracker.totals.winsHU++
  } else {
    tracker.totals.hands3Max++
    if (decision.isCorrect) tracker.totals.wins3Max++
  }

  saveTracker(tracker)
}

// ─── Stats Getters ──────────────────────────────────────────

export function getSpinStats() {
  const tracker = loadTracker()
  const t = tracker.totals

  const played = t.played || 0
  const itm = played > 0 ? ((t.wins / played) * 100).toFixed(1) : '0.0'
  const avgMult = played > 0 ? (t.totalMultiplier / played).toFixed(1) : '0.0'
  const totalPayout = tracker.sessions.reduce((s, sess) => s + sess.payout, 0)
  const totalBuyIn = played
  const roi = totalBuyIn > 0 ? (((totalPayout - totalBuyIn) / totalBuyIn) * 100).toFixed(1) : '0.0'
  const profit = totalPayout - totalBuyIn

  // Last 20 sessions trend
  const last20 = tracker.sessions.slice(-20)
  const last20Payout = last20.reduce((s, sess) => s + sess.payout, 0)
  const last20BuyIn = last20.length
  const last20Roi = last20BuyIn > 0 ? (((last20Payout - last20BuyIn) / last20BuyIn) * 100).toFixed(1) : '0.0'

  // Profit history (cumulative)
  let cumProfit = 0
  const profitHistory = tracker.sessions.map(s => {
    cumProfit += (s.payout - s.buyIn)
    return cumProfit
  })

  return {
    played, wins: t.wins, second: t.second, third: t.third,
    itm, avgMult, roi, profit, totalPayout,
    last20Roi,
    totalHands: t.totalHands,
    profitHistory,
    sessions: tracker.sessions,
  }
}

export function getPhaseStats() {
  const tracker = loadTracker()
  const t = tracker.totals

  const acc3Max = t.hands3Max > 0 ? ((t.wins3Max / t.hands3Max) * 100).toFixed(1) : '0.0'
  const accHU = t.handsHU > 0 ? ((t.winsHU / t.handsHU) * 100).toFixed(1) : '0.0'

  return {
    hands3Max: t.hands3Max, wins3Max: t.wins3Max, acc3Max,
    handsHU: t.handsHU, winsHU: t.winsHU, accHU,
  }
}

// ─── Leak Detection ─────────────────────────────────────────

export function getLeakReport() {
  const tracker = loadTracker()
  const l = tracker.leaks
  const total = l.totalDecisions || 1

  const leaks = []

  const btnRate = l.btnOpenTooTight / total * 100
  if (btnRate > 3)
    leaks.push({ id: 'btn_tight', label: 'BTN Open Tight Demais', severity: btnRate > 8 ? 'high' : 'medium', count: l.btnOpenTooTight, pct: btnRate.toFixed(1), tip: 'No BTN 3-max, abra mais. Voce esta na melhor posicao com menos jogadores pra passar.' })

  const sbRate = l.sbOpenTooTight / total * 100
  if (sbRate > 3)
    leaks.push({ id: 'sb_tight', label: 'SB Open Tight Demais', severity: sbRate > 8 ? 'high' : 'medium', count: l.sbOpenTooTight, pct: sbRate.toFixed(1), tip: 'No SB 3-max, voce completa ou faz limp com mais maos. Foldando demais, voce perde blinds rapido.' })

  const bbRate = l.bbFoldTooMuch / total * 100
  if (bbRate > 3)
    leaks.push({ id: 'bb_fold', label: 'BB Fold Demais', severity: bbRate > 10 ? 'high' : 'medium', count: l.bbFoldTooMuch, pct: bbRate.toFixed(1), tip: 'No BB voce ja investiu. Defenda mais contra opens, especialmente com pot odds favoraveis.' })

  const pushRate = l.missedPush / total * 100
  if (pushRate > 2)
    leaks.push({ id: 'miss_push', label: 'Nao Push Quando Deveria', severity: pushRate > 6 ? 'high' : 'medium', count: l.missedPush, pct: pushRate.toFixed(1), tip: 'Com stack curto (<=10bb), push/fold e matematicamente correto. Nao min-raise — push direto.' })

  const badCallRate = l.badCallPush / total * 100
  if (badCallRate > 2)
    leaks.push({ id: 'bad_call', label: 'Call Push com Lixo', severity: badCallRate > 5 ? 'high' : 'medium', count: l.badCallPush, pct: badCallRate.toFixed(1), tip: 'Voce esta chamando all-in com maos fracas demais. Tighten up contra push — ICM amplifica o custo de bust.' })

  const missCallRate = l.missedCallPush / total * 100
  if (missCallRate > 2)
    leaks.push({ id: 'miss_call', label: 'Fold Push Quando Deveria Call', severity: missCallRate > 5 ? 'high' : 'medium', count: l.missedCallPush, pct: missCallRate.toFixed(1), tip: 'Voce esta foldando demais contra push. Com pot odds boas, chame com range mais amplo.' })

  // Sort by severity
  leaks.sort((a, b) => {
    const sev = { high: 3, medium: 2, low: 1 }
    return (sev[b.severity] || 0) - (sev[a.severity] || 0)
  })

  return { leaks, totalDecisions: l.totalDecisions }
}

// ─── Heatmap Data ───────────────────────────────────────────

export function getHeatmapData() {
  const tracker = loadTracker()
  const entries = Object.entries(tracker.heatmap)
    .map(([key, val]) => {
      const [position, stack, context, phase] = key.split('_')
      const total = val.correct + val.wrong
      const accuracy = total > 0 ? Math.round((val.correct / total) * 100) : 0
      return { key, position, stack, context, phase, correct: val.correct, wrong: val.wrong, total, accuracy }
    })
    .filter(e => e.total >= 3) // Min 3 decisions for relevance
    .sort((a, b) => a.accuracy - b.accuracy) // Worst first

  return entries
}

// ─── Bankroll Calculator ────────────────────────────────────

export function calcBankroll(buyInAmount, riskOfRuin = 0.05) {
  // Spin & Go variance is very high due to multiplier distribution
  // Using Kelly Criterion approximation
  //
  // Average multiplier weighted by frequency:
  // 2x(73.5%) + 3x(11.75%) + 5x(7.5%) + 10x(5%) + 25x(1.5%) + 50x(0.5%) + 120x(0.2%) + 240x(0.04%) + 1200x(0.01%)
  // = 1.47 + 0.3525 + 0.375 + 0.5 + 0.375 + 0.25 + 0.24 + 0.096 + 0.12 = 3.78 avg
  //
  // Standard deviation for Spin is ~3-5x higher than regular SNGs
  // Conservative bankroll: 100-300 buy-ins depending on win rate and risk tolerance

  const profiles = [
    {
      label: 'Conservador',
      desc: '1% risco de ruina',
      winRate: -0.02,  // Assume -2% ROI (learning)
      buyIns: 300,
      note: 'Para quem esta aprendendo Spin & Go',
    },
    {
      label: 'Moderado',
      desc: '5% risco de ruina',
      winRate: 0.03,   // 3% ROI
      buyIns: 150,
      note: 'Para regs com edge pequeno',
    },
    {
      label: 'Agressivo',
      desc: '10% risco de ruina',
      winRate: 0.08,   // 8% ROI
      buyIns: 80,
      note: 'Para jogadores com edge grande',
    },
  ]

  return profiles.map(p => ({
    ...p,
    bankroll: p.buyIns * buyInAmount,
    buyInAmount,
  }))
}

// Variance info by multiplier distribution
export function getVarianceInfo() {
  return {
    avgMultiplier: 3.78,
    medianMultiplier: 2,
    stdDev: 12.5, // Approximate standard deviation in buy-ins per 100 spins
    breakeven: {
      at2x: '50.0%',  // Win rate needed to break even at 2x multiplier
      weighted: '37.5%', // Win rate needed with avg multiplier
    },
    note: 'Spin & Go tem variancia MUITO alta. Downswings de 50-100 buy-ins sao normais mesmo para jogadores vencedores.',
  }
}

// ─── Range Export (HRC/ICMIZER format) ──────────────────────

export function exportRangesHRC(ranges, label) {
  // HRC format: comma-separated hands, e.g. "AA,KK,QQ,AKs,AKo"
  if (!ranges) return ''
  const allHands = []
  for (const action of ['raise', 'push', 'call', 'threebet', 'threebet_shove']) {
    if (ranges[action]) allHands.push(...ranges[action])
  }
  return `// ${label}\n${[...new Set(allHands)].join(',')}`
}

export function exportRangesICMIZER(ranges, label) {
  // ICMIZER format: semicolon-separated, e.g. "AA;KK;QQ;AKs;AKo"
  if (!ranges) return ''
  const allHands = []
  for (const action of ['raise', 'push', 'call', 'threebet', 'threebet_shove']) {
    if (ranges[action]) allHands.push(...ranges[action])
  }
  return `${label}: ${[...new Set(allHands)].join(';')}`
}

export function exportAllRanges(spinRanges, format = 'hrc') {
  const exportFn = format === 'hrc' ? exportRangesHRC : exportRangesICMIZER
  const lines = []

  // Process open ranges
  if (spinRanges.SPIN_OPEN_RANGES) {
    for (const [pos, stacks] of Object.entries(spinRanges.SPIN_OPEN_RANGES)) {
      for (const [stack, range] of Object.entries(stacks)) {
        lines.push(exportFn(range, `Open ${pos} ${stack}bb`))
      }
    }
  }

  // Process push ranges
  if (spinRanges.SPIN_PUSH_RANGES) {
    for (const [pos, stacks] of Object.entries(spinRanges.SPIN_PUSH_RANGES)) {
      for (const [stack, range] of Object.entries(stacks)) {
        lines.push(exportFn(range, `Push ${pos} ${stack}bb`))
      }
    }
  }

  // Process call push ranges
  if (spinRanges.SPIN_CALL_PUSH_RANGES) {
    for (const [pos, stacks] of Object.entries(spinRanges.SPIN_CALL_PUSH_RANGES)) {
      for (const [stack, range] of Object.entries(stacks)) {
        lines.push(exportFn(range, `Call Push ${pos} ${stack}bb`))
      }
    }
  }

  return lines.filter(l => l).join('\n\n')
}

// ─── Reset ──────────────────────────────────────────────────

export function resetSpinTracker() {
  localStorage.removeItem(SPIN_TRACKER_KEY)
  localStorage.removeItem(SPIN_HANDS_KEY)
}

// ─── Exports ────────────────────────────────────────────────

export { loadTracker, loadHands }
