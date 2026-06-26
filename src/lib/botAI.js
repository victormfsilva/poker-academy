// ================================================================
// Bot AI Multiway — Lógica de decisão dos bots para mesas 2-9 jogadores
// Usa ranges GTO reais (RFI, BB_VS_RFI, SB_VS_RFI, BTN_VS_RFI, etc.)
// Usa equity calculator (phe) e cenários solver-computed (PokerBench 10k)
// Integra com pokerEngine.js
// ================================================================

import {
  RFI_RANGES, PUSH_FOLD_RANGES, BB_VS_RFI, BTN_VS_RFI,
  SB_VS_RFI, VS_3BET_RANGES, BLIND_WARS, ISO_RANGES,
} from '../data/ranges.js'
import {
  POSTFLOP_SCENARIOS,
} from '../data/postflopScenarios.js'
import { calcEquity } from './equity.js'
import {
  holeToNotation, evalHand, getCallAmount, getRaiseRange,
  getBlindIndexes, calcPositions, RANK_VAL,
} from './pokerEngine.js'

// ─── Bot Profiles ─────────────────────────────────────────
export const BOT_PROFILES = {
  gto:  { label: 'GTO',  desc: 'Equilibrado',       color: '#4fce82', betMult: 1,    bluffMult: 1,   callMult: 1,   foldMult: 1,   preflopTight: 0 },
  lag:  { label: 'LAG',  desc: 'Loose-Aggressive',  color: '#f5a623', betMult: 1.35, bluffMult: 1.5, callMult: 0.8, foldMult: 0.6, preflopTight: -0.15 },
  tag:  { label: 'TAG',  desc: 'Tight-Aggressive',  color: '#0a84d7', betMult: 1.2,  bluffMult: 0.6, callMult: 0.9, foldMult: 1.3, preflopTight: 0.2 },
  nit:  { label: 'Nit',  desc: 'Ultra-tight',       color: '#a78bfa', betMult: 0.8,  bluffMult: 0.2, callMult: 0.7, foldMult: 1.8, preflopTight: 0.35 },
  fish: { label: 'Fish', desc: 'Loose-Passive',     color: '#ef4444', betMult: 0.7,  bluffMult: 0.3, callMult: 1.6, foldMult: 0.4, preflopTight: -0.25 },
}

// ─── Nomes e perfis dos bots do torneio ───────────────────
export const MTT_BOTS = [
  { id: 'bot1', name: 'Shark_99',    profile: 'gto' },
  { id: 'bot2', name: 'AgressivoLAG', profile: 'lag' },
  { id: 'bot3', name: 'SolidTAG',    profile: 'tag' },
  { id: 'bot4', name: 'RockNit',     profile: 'nit' },
  { id: 'bot5', name: 'CallingStation', profile: 'fish' },
]

// ─── Determinar stack tier para lookup nos ranges ──────────
function getStackTier(stackBB) {
  if (stackBB <= 7)  return 5
  if (stackBB <= 12) return 8
  if (stackBB <= 18) return 15
  if (stackBB <= 35) return 25
  if (stackBB <= 70) return 50
  return 100
}

// ─── Mapear posição para chave de lookup nos ranges ────────
// RFI_RANGES usa UTG, UTG+1, LJ, HJ, CO, BTN, SB
// Para 6-max: UTG→UTG, MP→LJ/HJ, CO→CO, BTN→BTN, SB→SB
function mapPositionForRFI(position) {
  const map = {
    'UTG': 'UTG', 'UTG+1': 'UTG+1', 'LJ': 'LJ', 'HJ': 'HJ',
    'MP': 'HJ', 'CO': 'CO', 'BTN': 'BTN', 'SB': 'SB',
  }
  return map[position] || 'CO'
}

// ─── Mapear posição do raiser para chave de lookup nos defense ranges ──
function mapRaiserForDefense(raiserPosition) {
  const map = {
    'UTG': 'vsUTG', 'UTG+1': 'vsUTG+1', 'LJ': 'vsLJ', 'HJ': 'vsHJ',
    'MP': 'vsHJ', 'CO': 'vsCO', 'BTN': 'vsBTN', 'SB': 'vsSB',
  }
  return map[raiserPosition] || 'vsCO'
}

// ─── Mapear posição do 3bettor para chave VS_3BET_RANGES ──
function map3BettorForVs3bet(threeBettorPosition) {
  const map = {
    'UTG': 'vsMP', 'UTG+1': 'vsMP', 'LJ': 'vsCO', 'HJ': 'vsCO',
    'MP': 'vsCO', 'CO': 'vsBTN', 'BTN': 'vsBTN', 'SB': 'vsSB', 'BB': 'vsBB',
  }
  return map[threeBettorPosition] || 'vsBTN'
}

// ─── Verifica se mão está no range (inclui "mix" com probabilidade) ──
function isInRange(hand, range, includeMix = true) {
  if (!range) return false
  if (Array.isArray(range)) return range.includes(hand)
  // range é objeto com raise/call/threebet/etc
  for (const key of Object.keys(range)) {
    if (key === 'fold') continue
    const arr = range[key]
    if (Array.isArray(arr) && arr.includes(hand)) return true
  }
  return false
}

function isInRangeArray(hand, arr) {
  return Array.isArray(arr) && arr.includes(hand)
}

function isInMix(hand, mixArr) {
  return Array.isArray(mixArr) && mixArr.includes(hand)
}


// ================================================================
// DECISÃO PREFLOP MULTIWAY
// ================================================================

// Contexto preflop extraído do gameState
function getPreflopContext(game, playerIdx) {
  const player = game.players[playerIdx]
  const n = game.players.length
  const { sbIdx, bbIdx } = getBlindIndexes(n, game.dealerIdx)
  const stackBB = Math.round((player.stack + player.invested) / game.blinds.bb)

  // Ações preflop até agora (exceto sb/bb posts)
  const preflopActions = game.actionHistory.filter(
    a => a.street === 'preflop' && a.action !== 'sb' && a.action !== 'bb'
  )

  // Encontrar o primeiro raiser, callers, 3bettors
  let firstRaiserIdx = null
  let firstRaiserPosition = null
  let numCallersBefore = 0
  let numRaisers = 0
  let has3Bet = false
  let threeBettorPosition = null

  for (const a of preflopActions) {
    if (a.action === 'raise' || a.action === 'allin') {
      numRaisers++
      if (numRaisers === 1) {
        firstRaiserIdx = a.playerIdx
        firstRaiserPosition = game.players[a.playerIdx].position
      }
      if (numRaisers === 2) {
        has3Bet = true
        threeBettorPosition = game.players[a.playerIdx].position
      }
    } else if (a.action === 'call') {
      if (numRaisers === 0) numCallersBefore++ // limpers
      else numCallersBefore++ // callers of the raise
    }
  }

  // Jogadores ainda por agir após nós
  let playersToActAfter = 0
  let idx = (playerIdx + 1) % n
  for (let i = 0; i < n - 1; i++) {
    const p = game.players[idx]
    if (!p.folded && !p.allIn) {
      const acted = preflopActions.some(a => a.playerIdx === idx)
      if (!acted) playersToActAfter++
    }
    idx = (idx + 1) % n
  }

  return {
    position: player.position,
    hand: holeToNotation(player.holeCards),
    stackBB,
    stackTier: getStackTier(stackBB),
    isSB: playerIdx === sbIdx,
    isBB: playerIdx === bbIdx,
    isBTN: player.position === 'BTN',
    numRaisers,
    firstRaiserPosition,
    has3Bet,
    threeBettorPosition,
    numCallersBefore,
    numLimpers: numRaisers === 0 ? numCallersBefore : 0,
    playersToActAfter,
    isFirstIn: numRaisers === 0 && numCallersBefore === 0,
    facingRaise: numRaisers === 1 && !has3Bet,
    facing3Bet: has3Bet,
    toCall: getCallAmount(game, playerIdx),
    raiseRange: getRaiseRange(game, playerIdx),
    potSize: game.pot,
  }
}

// Decisão preflop principal
export function botPreflopDecision(game, playerIdx) {
  const player = game.players[playerIdx]
  const prof = BOT_PROFILES[player.profile] || BOT_PROFILES.gto
  const ctx = getPreflopContext(game, playerIdx)
  const { hand, stackBB, stackTier, position } = ctx

  // ─── Push/Fold zone (≤ 12bb) ───
  if (stackBB <= 12 && ctx.isFirstIn) {
    return decidePushFold(ctx, prof)
  }

  // ─── Facing 3-bet ───
  if (ctx.facing3Bet) {
    return decideVs3Bet(ctx, prof)
  }

  // ─── Facing raise (single raiser) ───
  if (ctx.facingRaise) {
    return decideVsRaise(ctx, prof)
  }

  // ─── First in (RFI) ───
  if (ctx.isFirstIn) {
    return decideRFI(ctx, prof)
  }

  // ─── Facing limpers ───
  if (ctx.numLimpers > 0 && ctx.numRaisers === 0) {
    return decideVsLimpers(ctx, prof)
  }

  // Fallback
  return { action: 'fold', amount: 0 }
}

// ─── Push/Fold ────────────────────────────────────────────
function decidePushFold(ctx, prof) {
  const { hand, position, stackBB } = ctx
  const posKey = mapPositionForRFI(position)
  const pushRange = PUSH_FOLD_RANGES[posKey]

  if (!pushRange) return { action: 'fold', amount: 0 }

  // Encontrar o tier mais próximo
  const tiers = Object.keys(pushRange).map(Number).sort((a, b) => a - b)
  const tier = tiers.reduce((best, t) => Math.abs(t - stackBB) < Math.abs(best - stackBB) ? t : best, tiers[0])
  const range = pushRange[tier]

  if (!range) return { action: 'fold', amount: 0 }

  if (range.includes(hand)) {
    // Profile: nit fold mais mãos marginais
    if (prof.preflopTight > 0 && Math.random() < prof.preflopTight * 0.3) {
      return { action: 'fold', amount: 0 }
    }
    return { action: 'allin', amount: 0 }
  }

  // LAG/fish empurram mais mãos fora do range
  if (prof.preflopTight < 0 && Math.random() < Math.abs(prof.preflopTight) * 0.4) {
    return { action: 'allin', amount: 0 }
  }

  return { action: 'fold', amount: 0 }
}

// ─── RFI (Raise First In) ──────────────────────────────────
function decideRFI(ctx, prof) {
  const { hand, position, stackTier } = ctx
  const posKey = mapPositionForRFI(position)
  const posRanges = RFI_RANGES[posKey]

  if (!posRanges) {
    // SB sem RFI no data — usar BLIND_WARS
    if (ctx.isSB) {
      return decideSBOpen(ctx, prof)
    }
    return { action: 'fold', amount: 0 }
  }

  const tierRange = posRanges[stackTier] || posRanges[100]
  if (!tierRange) return { action: 'fold', amount: 0 }

  const inRaise = isInRangeArray(hand, tierRange.raise)
  const inMix = isInMix(hand, tierRange.mix)

  if (inRaise) {
    // Profile: nit fold mãos da fronteira
    if (prof.preflopTight > 0 && Math.random() < prof.preflopTight * 0.15) {
      return { action: 'fold', amount: 0 }
    }
    // Sizing: 2.2-2.5x BB dependendo da posição
    const sizingMult = position === 'BTN' ? 2.2 : position === 'SB' ? 2.5 : 2.3
    const raiseAmount = Math.round(ctx.raiseRange.min > 0 ? ctx.raiseRange.min : sizingMult * (ctx.potSize / 1.5))
    return { action: 'raise', amount: raiseAmount }
  }

  if (inMix) {
    // 50% chance de abrir mãos mistas
    const mixChance = 0.5 - prof.preflopTight * 0.5
    if (Math.random() < mixChance) {
      const raiseAmount = ctx.raiseRange.min || 0
      return { action: 'raise', amount: raiseAmount }
    }
    return { action: 'fold', amount: 0 }
  }

  // Fora do range — LAG/fish abrem mais
  if (prof.preflopTight < 0 && Math.random() < Math.abs(prof.preflopTight) * 0.4) {
    const raiseAmount = ctx.raiseRange.min || 0
    return { action: 'raise', amount: raiseAmount }
  }

  return { action: 'fold', amount: 0 }
}

// ─── SB Open (sem RFI_RANGES para SB, usar BLIND_WARS) ────
function decideSBOpen(ctx, prof) {
  const { hand } = ctx
  const raiseRange = BLIND_WARS.SB_raise?.raise || []
  const completeRange = BLIND_WARS.SB_complete?.complete || []

  if (raiseRange.includes(hand)) {
    if (prof.preflopTight > 0 && Math.random() < prof.preflopTight * 0.2) {
      // TAG/nit completa em vez de raise com mãos borderline
      if (completeRange.includes(hand)) return { action: 'call', amount: 0 }
    }
    return { action: 'raise', amount: ctx.raiseRange.min || 0 }
  }

  if (completeRange.includes(hand)) {
    if (prof.preflopTight > 0 && Math.random() < prof.preflopTight * 0.3) {
      return { action: 'fold', amount: 0 }
    }
    return { action: 'call', amount: 0 }
  }

  // LAG completa/raise mais
  if (prof.preflopTight < 0 && Math.random() < Math.abs(prof.preflopTight) * 0.5) {
    return Math.random() < 0.4
      ? { action: 'raise', amount: ctx.raiseRange.min || 0 }
      : { action: 'call', amount: 0 }
  }

  return { action: 'fold', amount: 0 }
}

// ─── Vs single raise ─────────────────────────────────────
function decideVsRaise(ctx, prof) {
  const { hand, position, isBB, isBTN, isSB, firstRaiserPosition } = ctx
  const raiserKey = mapRaiserForDefense(firstRaiserPosition)

  let defenseRange = null

  // Escolher o range de defesa baseado na posição do defensor
  if (isBB) {
    defenseRange = BB_VS_RFI[raiserKey]
  } else if (isBTN) {
    defenseRange = BTN_VS_RFI[raiserKey]
  } else if (isSB) {
    defenseRange = SB_VS_RFI[raiserKey]
  } else {
    // Posição intermediária (CO facing UTG raise, etc.) — usar range mais tight
    // Aproximar com BTN_VS_RFI mas mais apertado
    defenseRange = BTN_VS_RFI[raiserKey]
    if (defenseRange) {
      // Reduzir call range para posições intermediárias
      return decideIntermediateVsRaise(ctx, prof, defenseRange)
    }
  }

  if (!defenseRange) return { action: 'fold', amount: 0 }

  // 3-bet
  const threebetRange = defenseRange.threebet || []
  if (threebetRange.includes(hand)) {
    if (prof.preflopTight > 0 && Math.random() < prof.preflopTight * 0.2) {
      // Nit flatia em vez de 3betar
      if ((defenseRange.call || []).includes(hand)) return { action: 'call', amount: 0 }
    }
    // 3-bet sizing: ~3x o raise
    const threeBetSize = Math.round(ctx.toCall * 3)
    return { action: 'raise', amount: Math.max(ctx.raiseRange.min, threeBetSize) }
  }

  // Call
  const callRange = defenseRange.call || []
  if (callRange.includes(hand)) {
    if (prof.preflopTight > 0 && Math.random() < prof.preflopTight * 0.25) {
      return { action: 'fold', amount: 0 }
    }
    return { action: 'call', amount: 0 }
  }

  // LAG/fish defende mais
  if (prof.preflopTight < 0) {
    const extraDefend = Math.abs(prof.preflopTight) * 0.5
    if (Math.random() < extraDefend) {
      return Math.random() < 0.3
        ? { action: 'raise', amount: ctx.raiseRange.min || 0 }
        : { action: 'call', amount: 0 }
    }
  }

  return { action: 'fold', amount: 0 }
}

// Posições intermediárias vs raise (CO vs UTG, etc.)
function decideIntermediateVsRaise(ctx, prof, baseRange) {
  const { hand } = ctx
  const callRange = baseRange.call || []
  const threebetRange = baseRange.threebet || []

  // Range mais tight — 70% do range do BTN
  if (threebetRange.includes(hand) && Math.random() < 0.7) {
    return { action: 'raise', amount: ctx.raiseRange.min || 0 }
  }
  if (callRange.includes(hand) && Math.random() < 0.6) {
    return { action: 'call', amount: 0 }
  }
  return { action: 'fold', amount: 0 }
}

// ─── Vs 3-bet ────────────────────────────────────────────
function decideVs3Bet(ctx, prof) {
  const { hand, position, threeBettorPosition, stackBB } = ctx
  const posKey = mapPositionForRFI(position)
  const threeBetKey = map3BettorForVs3bet(threeBettorPosition)

  const vs3bet = VS_3BET_RANGES[posKey]
  if (!vs3bet) return { action: 'fold', amount: 0 }

  const range = vs3bet[threeBetKey]
  if (!range) return { action: 'fold', amount: 0 }

  // All-in (5-bet)
  if (isInRangeArray(hand, range.allin)) {
    return { action: 'allin', amount: 0 }
  }

  // 4-bet
  if (isInRangeArray(hand, range.fourbet)) {
    if (stackBB <= 25) return { action: 'allin', amount: 0 }
    return { action: 'raise', amount: ctx.raiseRange.min || 0 }
  }

  // Call
  if (isInRangeArray(hand, range.call)) {
    if (prof.preflopTight > 0 && Math.random() < prof.preflopTight * 0.3) {
      return { action: 'fold', amount: 0 }
    }
    return { action: 'call', amount: 0 }
  }

  // Mix
  if (isInMix(hand, range.mix)) {
    const mixChance = 0.4 - prof.preflopTight * 0.3
    if (Math.random() < mixChance) {
      return { action: 'call', amount: 0 }
    }
    return { action: 'fold', amount: 0 }
  }

  // LAG defende mais
  if (prof.preflopTight < 0 && Math.random() < Math.abs(prof.preflopTight) * 0.3) {
    return { action: 'call', amount: 0 }
  }

  return { action: 'fold', amount: 0 }
}

// ─── Vs limpers ──────────────────────────────────────────
function decideVsLimpers(ctx, prof) {
  const { hand, position, numLimpers } = ctx
  const posKey = mapPositionForRFI(position)

  // Tentar usar ISO_RANGES
  const isoRange = ISO_RANGES[posKey]
  if (isoRange) {
    const raiseHands = isoRange.raise || []
    if (raiseHands.includes(hand)) {
      // ISO raise: 4bb + 1bb por limper (IP), 5bb + 1bb (OOP)
      const isIP = ['BTN', 'CO'].includes(position)
      const isoSize = ((isIP ? 4 : 5) + numLimpers) * ctx.potSize / (1.5)
      return { action: 'raise', amount: Math.max(ctx.raiseRange.min, Math.round(isoSize)) }
    }
  }

  // Sem ISO range — usar RFI adaptado
  const posRanges = RFI_RANGES[posKey]
  if (posRanges) {
    const tierRange = posRanges[ctx.stackTier] || posRanges[100]
    if (tierRange && isInRangeArray(hand, tierRange.raise)) {
      // Raise com mãos fortes do range
      return { action: 'raise', amount: ctx.raiseRange.min || 0 }
    }
  }

  // Overlimpar com mãos especulativas
  const specHands = ['22','33','44','55','66','77','87s','76s','65s','54s','98s','T9s','J9s','QTs']
  if (specHands.includes(hand)) {
    return { action: 'call', amount: 0 }
  }

  // Fish overlimpa muito mais
  if (prof.preflopTight < 0 && Math.random() < Math.abs(prof.preflopTight) * 0.6) {
    return { action: 'call', amount: 0 }
  }

  return { action: 'fold', amount: 0 }
}


// ================================================================
// DECISÃO PÓS-FLOP MULTIWAY
// ================================================================

// ─── Hand strength relativa ──────────────────────────────
export function handStrength(hole, board) {
  if (!board || board.length === 0) return 'air'

  const boardR = board.map(c => c.slice(0, -1))
  const holeR = hole.map(c => c.slice(0, -1))
  const holeRanks = hole.map(c => RANK_VAL[c.slice(0, -1)])
  const holeSuits = hole.map(c => c.slice(-1))
  const boardRanks = board.map(c => RANK_VAL[c.slice(0, -1)])
  const all = [...hole, ...board]
  const ranks = all.map(c => RANK_VAL[c.slice(0, -1)])
  const suits = all.map(c => c.slice(-1))

  const e = evalHand(hole, board)
  const eName = e.name || ''

  // Monster: Full House+
  if (['Straight Flush', 'Four of a Kind', 'Full House'].includes(eName)) return 'monster'
  // Strong: Flush/Straight
  if (['Flush', 'Straight'].includes(eName)) return 'strong'

  // Set
  if (holeR[0] === holeR[1] && boardR.includes(holeR[0])) return 'strong'

  // Trips
  const boardRankCount = {}
  boardR.forEach(r => { boardRankCount[r] = (boardRankCount[r] || 0) + 1 })
  if (holeR.some(r => boardRankCount[r] >= 2)) return 'strong'

  // Two pair (usando ambas as hole cards)
  const pairsWithBoard = [...new Set(holeR)].filter(r => boardR.includes(r))
  if (pairsWithBoard.length === 2) return 'strong'

  // Overpair
  if (holeR[0] === holeR[1]) {
    const pairVal = RANK_VAL[holeR[0]]
    if (boardRanks.every(v => v < pairVal)) return 'good'
  }

  // Top pair
  const topBoardVal = Math.max(...boardRanks)
  if (holeRanks.some(v => v === topBoardVal)) return 'good'

  // Draws
  const sc = {}
  suits.forEach(s => { sc[s] = (sc[s] || 0) + 1 })
  const hasFlushDraw = holeSuits.some(hs => (sc[hs] || 0) === 4)

  const unique = [...new Set(ranks)].sort((a, b) => a - b)
  if (unique.includes(14)) unique.unshift(1)
  let hasStraightDraw = false
  for (let i = 0; i < unique.length - 3; i++) {
    if (unique[i + 3] - unique[i] <= 4) {
      if (holeRanks.some(r => unique.slice(i, i + 4).includes(r))) hasStraightDraw = true
    }
  }

  if (hasFlushDraw && hasStraightDraw) return 'good'
  if (hasFlushDraw || hasStraightDraw) return 'draw'

  // Any pair
  if (holeR.some(r => boardR.includes(r))) return 'marginal'

  // High cards
  if (holeRanks.some(v => v >= 12)) return 'weak'

  return 'air'
}

// ─── Board texture ────────────────────────────────────────
export function boardTexture(board) {
  if (!board || board.length === 0) return { wet: false, paired: false, monotone: false, connected: false, highCards: 0, flushDraw: false }

  const ranks = board.map(c => RANK_VAL[c.slice(0, -1)])
  const suits = board.map(c => c.slice(-1))

  const rc = {}
  ranks.forEach(r => { rc[r] = (rc[r] || 0) + 1 })
  const paired = Object.values(rc).some(v => v >= 2)

  const sc = {}
  suits.forEach(s => { sc[s] = (sc[s] || 0) + 1 })
  const maxSuit = Math.max(...Object.values(sc))
  const monotone = maxSuit >= 3
  const flushDraw = maxSuit >= 2

  const sorted = [...new Set(ranks)].sort((a, b) => a - b)
  let connected = false
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1] - sorted[i] <= 2) { connected = true; break }
  }

  const highCards = ranks.filter(r => r >= 10).length
  const wet = (flushDraw && connected) || monotone || (connected && highCards >= 2)

  return { wet, paired, monotone, connected, highCards, flushDraw }
}

// ─── Blocker analysis ─────────────────────────────────────
export function blockerEffect(botHole, board) {
  if (!board || board.length === 0) return { nutBlocker: false, flushBlocker: false, straightBlocker: false, bluffBoost: 0, callBoost: 0 }

  const botRanks = botHole.map(c => RANK_VAL[c.slice(0, -1)])
  const botSuits = botHole.map(c => c.slice(-1))
  const boardRanks = board.map(c => RANK_VAL[c.slice(0, -1)])
  const boardSuits = board.map(c => c.slice(-1))

  const suitCount = {}
  boardSuits.forEach(s => { suitCount[s] = (suitCount[s] || 0) + 1 })
  const dominantSuit = Object.entries(suitCount).sort((a, b) => b[1] - a[1])[0]
  const flushBlocker = dominantSuit && dominantSuit[1] >= 2 && botSuits.some(s => s === dominantSuit[0])
  const hasAceFlushBlocker = flushBlocker && botHole.some(c => c.slice(0, -1) === 'A' && c.slice(-1) === dominantSuit[0])

  const sorted = [...new Set(boardRanks)].sort((a, b) => a - b)
  let straightBlocker = false
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1] - sorted[i] === 2) {
      const filler = sorted[i] + 1
      if (botRanks.includes(filler)) straightBlocker = true
    }
  }

  const topBoardRank = Math.max(...boardRanks)
  const nutBlocker = botRanks.includes(topBoardRank) || botRanks.includes(14)

  let bluffBoost = 0, callBoost = 0
  if (hasAceFlushBlocker) bluffBoost += 0.12
  else if (flushBlocker) bluffBoost += 0.06
  if (straightBlocker) bluffBoost += 0.05
  if (nutBlocker) callBoost += 0.08
  if (botRanks.every(r => r <= 6) && !flushBlocker && !straightBlocker) callBoost -= 0.05

  return { nutBlocker, flushBlocker, straightBlocker, bluffBoost, callBoost }
}

// ─── Lookup em cenários solver (PokerBench 10k) ──────────
// Tenta encontrar um cenário solver-computed similar à situação atual
function lookupSolverScenario(hole, board, street, facingBet, isIP, position) {
  // Mapear street + facingBet para categoria
  const streetName = { flop: 'flop', turn: 'turn', river: 'river' }[street]
  if (!streetName) return null

  const catKey = facingBet
    ? `facing_bet_${streetName}`
    : `bet_or_check_${streetName}`

  const scenarios = POSTFLOP_SCENARIOS[catKey]
  if (!scenarios || scenarios.length === 0) return null

  // Buscar cenário com board e hole cards exatamente iguais (raro mas possível)
  const boardSet = new Set(board)
  const holeSet = new Set(hole)
  const exact = scenarios.find(s =>
    s.h[0] === hole[0] && s.h[1] === hole[1] &&
    s.b.length === board.length && s.b.every(c => boardSet.has(c))
  )
  if (exact) return exact

  // Buscar cenário com mesmas hole cards e posição similar
  const holeNotation = holeToNotation(hole)
  const similar = scenarios.filter(s => {
    const sNotation = holeToNotation(s.h)
    return sNotation === holeNotation && s.hp === (isIP ? 'IP' : 'OOP')
  })

  if (similar.length > 0) {
    // Retorna um aleatório entre os similares (diversidade)
    return similar[Math.floor(Math.random() * similar.length)]
  }

  return null
}

// ─── Decisão pós-flop multiway ────────────────────────────
// Integra: equity calculator (phe), cenários solver (PokerBench), heurísticas GTO
export function botPostflopDecision(game, playerIdx) {
  const player = game.players[playerIdx]
  const prof = BOT_PROFILES[player.profile] || BOT_PROFILES.gto
  const { board, street, pot, lastBet } = game

  const hole = player.holeCards
  const strength = handStrength(hole, board)
  const texture = boardTexture(board)
  const blockers = blockerEffect(hole, board)

  // Quantos jogadores ativos no pot (não foldaram)
  const playersInPot = game.players.filter(p => !p.folded).length

  // Posição relativa: IP se somos o último ou perto do último a agir
  const isIP = isInPosition(game, playerIdx)

  const streetIdx = { flop: 0, turn: 1, river: 2 }[street] ?? 0
  const toCall = getCallAmount(game, playerIdx)
  const facingBet = toCall > 0

  // ─── Equity real via phe (Monte Carlo) ───
  // Usado para calibrar decisões de call/fold com pot odds reais
  const equity = calcEquity(hole, board, 500) // 500 iterações (rápido para bot)

  // ─── Lookup em cenários solver-computed ───
  // Se temos um cenário GTO exato/similar, usar como guia (para perfil GTO)
  if (prof.preflopTight === 0) { // apenas perfil GTO usa solver lookup
    const scenario = lookupSolverScenario(hole, board, street, facingBet, isIP, player.position)
    if (scenario) {
      // Cenário solver encontrado — seguir a decisão com alta probabilidade
      if (Math.random() < 0.75) {
        const solverAction = scenario.d
        if (solverAction === 'fold' && facingBet) return { action: 'fold', amount: 0 }
        if (solverAction === 'call' && facingBet) return { action: 'call', amount: 0 }
        if (solverAction === 'raise' && facingBet) {
          const { min } = getRaiseRange(game, playerIdx)
          return { action: 'raise', amount: min }
        }
        if (solverAction === 'bet' && !facingBet) {
          const betSize = calcBetSize(strength, texture, streetIdx, pot, isIP, prof, 1.0)
          return { action: 'bet', amount: Math.max(Math.round(pot * betSize), game.blinds.bb) }
        }
        if (solverAction === 'check' && !facingBet) return { action: 'check', amount: 0 }
      }
    }
  }

  // ─── Fator multiway ───
  // Em potes multiway, reduzir agressividade significativamente
  // HU: mult = 1.0, 3way: mult = 0.65, 4+: mult = 0.45
  const multiwayFactor = playersInPot <= 2 ? 1.0
    : playersInPot === 3 ? 0.65
    : playersInPot === 4 ? 0.50
    : 0.40

  // Profile RNG shift
  const rng = Math.min(1, Math.max(0, Math.random() * (1 / prof.betMult)))

  // Ajustes
  const ipBonus = isIP ? 0.08 * multiwayFactor : 0
  const oopProtect = !isIP ? 0.10 * multiwayFactor : 0
  const bluffAdj = blockers.bluffBoost * prof.bluffMult * multiwayFactor
  const callAdj = blockers.callBoost * prof.callMult

  if (facingBet) {
    return decideFacingBet(strength, texture, streetIdx, pot, toCall, isIP, rng, ipBonus, oopProtect, bluffAdj, callAdj, prof, multiwayFactor, game, playerIdx, equity)
  }
  return decideNoBet(strength, texture, streetIdx, pot, isIP, rng, ipBonus, oopProtect, bluffAdj, callAdj, prof, multiwayFactor, game, playerIdx, equity)
}

// ─── Facing a bet ────────────────────────────────────────
function decideFacingBet(strength, texture, streetIdx, pot, toCall, isIP, rng, ipBonus, oopProtect, bluffAdj, callAdj, prof, mwf, game, playerIdx, equity) {
  const potOdds = toCall / (pot + toCall)
  const betRelPot = toCall / Math.max(pot - toCall, 1)

  // Equity real (phe) vs pot odds — decisão matemática de call/fold
  // equity é % (0-100), potOdds é fração (0-1)
  const equityFraction = (equity || 50) / 100
  const hasEquityToCall = equityFraction >= potOdds

  const result = (action, amount) => {
    if (action === 'raise') {
      const { min, max } = getRaiseRange(game, playerIdx)
      return { action, amount: amount || min }
    }
    return { action, amount: 0 }
  }

  switch (strength) {
    case 'monster':
      if (streetIdx === 0 && !texture.wet) return result(rng < 0.30 * mwf ? 'raise' : 'call')
      if (streetIdx === 0) return result(rng < 0.50 * mwf ? 'raise' : 'call')
      if (streetIdx === 2) return result(rng < 0.80 ? 'raise' : 'call')
      return result(rng < 0.65 ? 'raise' : 'call')

    case 'strong':
      if (texture.wet) return result(rng < (0.45 + oopProtect) * mwf ? 'raise' : 'call')
      if (streetIdx === 2) return result(rng < 0.35 * mwf ? 'raise' : 'call')
      return result(rng < 0.20 * mwf ? 'raise' : 'call')

    case 'good':
      if (streetIdx === 0 && texture.wet && !isIP) return result(rng < 0.20 * mwf ? 'raise' : 'call')
      if (streetIdx === 2 && betRelPot > 0.8) {
        // River overbet: usar equity real para decidir
        return result(!hasEquityToCall ? 'fold' : 'call')
      }
      return result('call')

    case 'draw': {
      const semiBluffRate = mwf * (isIP ? 0.28 + bluffAdj : 0.12 + bluffAdj)
      if (streetIdx === 0 && rng < semiBluffRate) return result('raise')
      if (streetIdx === 1 && isIP && rng < 0.15 * mwf + bluffAdj) return result('raise')
      // Usar equity real para decisão de call com draws
      if (hasEquityToCall) return result('call')
      // Sem equity para call — fold (a não ser que implied odds justifiquem)
      if (streetIdx < 2 && equityFraction > potOdds * 0.7) return result('call') // implied odds
      return result('fold')
    }

    case 'marginal':
      // Usar equity real como base, ajustado por profile
      if (hasEquityToCall) {
        const callChance = Math.min(1, (equityFraction / potOdds) * 0.5 / prof.foldMult)
        return result(rng < callChance ? 'call' : 'fold')
      }
      return result('fold')

    case 'weak':
      if (streetIdx === 2 && isIP && rng < (0.10 + bluffAdj) * mwf * 0.3) return result('raise')
      // Equity check: às vezes temos equity suficiente com high cards
      if (hasEquityToCall && betRelPot < 0.35 && streetIdx === 0) return result('call')
      return result('fold')

    default: // air
      if (streetIdx === 0 && isIP && rng < (0.08 + bluffAdj) * mwf * 0.3) return result('raise')
      return result('fold')
  }
}

// ─── No bet to face ──────────────────────────────────────
function decideNoBet(strength, texture, streetIdx, pot, isIP, rng, ipBonus, oopProtect, bluffAdj, callAdj, prof, mwf, game, playerIdx, equity) {
  const betSize = calcBetSize(strength, texture, streetIdx, pot, isIP, prof, mwf)
  // Equity boost: equity alta (>65%) incentiva value bet, baixa (<30%) incentiva check
  const eqBoost = equity !== null ? (equity - 50) / 200 : 0 // -0.10 a +0.25

  const result = (action) => {
    if (action === 'bet') {
      const amount = Math.round(pot * betSize)
      return { action: 'bet', amount: Math.max(amount, game.blinds.bb) }
    }
    return { action: 'check', amount: 0 }
  }

  switch (strength) {
    case 'monster':
      if (texture.wet) return result(rng < 0.90 * mwf ? 'bet' : 'check')
      if (streetIdx === 0) return result(rng < 0.35 * mwf ? 'bet' : 'check')
      if (streetIdx === 2) return result(rng < 0.85 ? 'bet' : 'check')
      return result(rng < 0.70 ? 'bet' : 'check')

    case 'strong':
      if (texture.wet) return result(rng < (0.85 + ipBonus) * mwf ? 'bet' : 'check')
      if (streetIdx === 2) return result(rng < (0.75 + eqBoost) * mwf ? 'bet' : 'check')
      return result(rng < (0.70 + eqBoost) * mwf ? 'bet' : 'check')

    case 'good':
      // C-bet: ~70% HU, ~30% multiway. Equity calibra: alta = bet mais, baixa = check
      if (streetIdx === 0) return result(rng < (0.65 + oopProtect + eqBoost) * mwf ? 'bet' : 'check')
      if (streetIdx === 1) return result(rng < (0.55 + eqBoost) * mwf ? 'bet' : 'check')
      return result(rng < (0.40 + eqBoost) * mwf ? 'bet' : 'check')

    case 'draw':
      // Semi-bluff: equity alta (bom draw) incentiva bet, equity baixa = check
      if (streetIdx === 0) return result(rng < (0.45 + ipBonus + eqBoost) * mwf ? 'bet' : 'check')
      if (streetIdx === 1) return result(rng < (0.30 + ipBonus + eqBoost) * mwf ? 'bet' : 'check')
      return result(rng < 0.08 * mwf ? 'bet' : 'check')

    case 'marginal':
      // Equity > 55%: thin value bet mais frequente
      if (equity && equity > 55 && streetIdx === 2 && rng < 0.25 * mwf) return result('bet')
      if (streetIdx === 0 && !isIP && rng < 0.12 * mwf) return result('bet')
      if (streetIdx === 2 && rng < 0.12 * mwf) return result('bet')
      return result('check')

    case 'weak':
      // Bluffs: muito menos freq multiway
      if (!texture.wet && isIP) {
        if (streetIdx === 0) return result(rng < (0.30 + bluffAdj) * mwf ? 'bet' : 'check')
        if (streetIdx === 1) return result(rng < (0.20 + bluffAdj) * mwf ? 'bet' : 'check')
        return result(rng < (0.15 + bluffAdj) * mwf ? 'bet' : 'check')
      }
      if (streetIdx === 0) return result(rng < (0.22 + bluffAdj) * mwf ? 'bet' : 'check')
      return result(rng < (0.10 + bluffAdj) * mwf ? 'bet' : 'check')

    default: // air
      if (!texture.wet && isIP) {
        if (streetIdx === 0) return result(rng < (0.28 + bluffAdj) * mwf * 0.5 ? 'bet' : 'check')
        return result(rng < (0.12 + bluffAdj) * mwf * 0.3 ? 'bet' : 'check')
      }
      if (streetIdx === 0) return result(rng < (0.14 + bluffAdj) * mwf * 0.4 ? 'bet' : 'check')
      return result(rng < (0.06 + bluffAdj) * mwf * 0.3 ? 'bet' : 'check')
  }
}

// ─── Bet sizing ──────────────────────────────────────────
function calcBetSize(strength, texture, streetIdx, pot, isIP, prof, mwf) {
  const rng = Math.random()

  // Multiway: sizing menor (menos fold equity, mais pots multiway = sizing menor)
  const sizeAdj = mwf < 0.8 ? 0.85 : 1.0

  switch (strength) {
    case 'monster':
      if (streetIdx === 2) return (rng < 0.35 ? 1.5 : rng < 0.7 ? 1.0 : 0.75) * sizeAdj
      if (texture.wet) return (rng < 0.4 ? 0.75 : 0.66) * sizeAdj
      return (rng < 0.5 ? 0.5 : 0.66) * sizeAdj

    case 'strong':
      if (streetIdx === 2) return (rng < 0.4 ? 0.75 : 0.66) * sizeAdj
      if (texture.wet) return 0.66 * sizeAdj
      return (rng < 0.5 ? 0.5 : 0.66) * sizeAdj

    case 'good':
      if (streetIdx === 0) return (rng < 0.6 ? 0.33 : 0.5) * sizeAdj
      if (streetIdx === 1) return 0.5 * sizeAdj
      return (rng < 0.6 ? 0.33 : 0.5) * sizeAdj

    case 'draw':
      if (streetIdx === 0) return (rng < 0.5 ? 0.66 : 0.5) * sizeAdj
      return (rng < 0.3 ? 0.75 : 0.66) * sizeAdj

    case 'marginal':
      return 0.33 * sizeAdj

    default:
      if (streetIdx === 2) return (rng < 0.45 ? 0.75 : 0.66) * sizeAdj
      if (!texture.wet) return 0.33 * sizeAdj
      return 0.5 * sizeAdj
  }
}

// ─── Verificar se está em posição ─────────────────────────
function isInPosition(game, playerIdx) {
  const n = game.players.length
  const activePlayers = game.players
    .map((p, i) => ({ i, p }))
    .filter(({ p }) => !p.folded && !p.allIn)

  if (activePlayers.length <= 1) return true

  // Encontrar quem age por último nessa street (mais perto do dealer em sentido horário)
  let lastToAct = -1
  for (let offset = 0; offset < n; offset++) {
    const idx = (game.dealerIdx - offset + n) % n
    const p = game.players[idx]
    if (!p.folded && !p.allIn) {
      lastToAct = idx
      break
    }
  }

  return playerIdx === lastToAct
}


// ================================================================
// DECISÃO PRINCIPAL (preflop + postflop)
// ================================================================

export function botDecide(game, playerIdx) {
  const player = game.players[playerIdx]
  if (!player || player.folded || player.allIn) return { action: 'check', amount: 0 }

  if (game.street === 'preflop') {
    return botPreflopDecision(game, playerIdx)
  }
  return botPostflopDecision(game, playerIdx)
}
