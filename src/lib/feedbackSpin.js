// ================================================================
// Feedback GTO Spin & Go — Arena Spin 3-max
// Usa spinRanges.js para avaliar decisões do hero
// ================================================================

import {
  SPIN_OPEN_RANGES, SPIN_PUSH_RANGES, SPIN_CALL_PUSH_RANGES,
  SPIN_DEFENSE_RANGES, SPIN_HU_RANGES, SPIN_MULTIPLIER_ADJUSTMENTS,
  getSpinStackTier, shouldPushFold, isHandInSpinRange,
} from '../data/spinRanges.js'
import { lookupSolverRange, lookupHuNash, buildActionHistory } from '../data/spinSolverData.js'
import { holeToNotation, evalHand, getBlindIndexes, RANK_VAL } from './pokerEngine.js'

// ─── Hand description ─────────────────────────────────────
function describeHand(hole, board) {
  if (!board || board.length === 0) return holeToNotation(hole)
  const e = evalHand(hole, board)
  const name = e.name || ''
  if (['Straight Flush', 'Four of a Kind', 'Full House', 'Flush', 'Straight'].includes(name)) {
    return e.label
  }
  const holeR = hole.map(c => c.slice(0, -1))
  const boardR = board.map(c => c.slice(0, -1))
  const boardRanks = board.map(c => RANK_VAL[c.slice(0, -1)])
  if (holeR[0] === holeR[1] && boardR.includes(holeR[0])) return `Trinca de ${holeR[0]}`
  if (holeR[0] === holeR[1]) {
    const pairVal = RANK_VAL[holeR[0]]
    if (boardRanks.every(v => v < pairVal)) return `Overpair (${holeR[0]}${holeR[0]})`
  }
  const topBoardVal = Math.max(...boardRanks)
  const holeRanks = hole.map(c => RANK_VAL[c.slice(0, -1)])
  if (holeRanks.some(v => v === topBoardVal)) return 'Top pair'
  if (holeR.some(r => boardR.includes(r))) return 'Par medio/baixo'
  return holeToNotation(hole)
}

// ─── Preflop Feedback ─────────────────────────────────────
export function getSpinPreflopFeedback(game, heroIdx, heroAction, multiplier = 2, isHU = false) {
  const hero = game.players[heroIdx]
  if (!hero?.holeCards) return null

  const hand = holeToNotation(hero.holeCards)
  const position = hero.position
  if (!position) return null

  const stackBB = Math.round((hero.stack + hero.invested) / game.blinds.bb)
  const isPushZone = shouldPushFold(stackBB, game.players.filter(p => !p.folded).length)

  // Determinar contexto: abrir, defender, ou call push
  const actionsBefore = game.actionHistory.filter(
    a => a.street === 'preflop' && a.action !== 'sb' && a.action !== 'bb'
  )
  const hasRaise = actionsBefore.some(a => ['raise', 'bet'].includes(a.action))
  const hasAllIn = actionsBefore.some(a => a.action === 'allin')

  // ─── Solver lookup (MCCFR 15bb para 3-max, Nash HU para heads-up) ───
  const solverResult = !isHU ? getSolverEnrichedFeedback(hand, position, stackBB, heroAction, game, heroIdx) : null

  // ─── HU: Nash push/fold com tabelas dedicadas ───
  if (isHU && isPushZone) {
    const nashResult = lookupHuNash(hand, position, stackBB)
    if (nashResult) {
      if (hasAllIn && position === 'BB') {
        return formatHuNashFeedback(nashResult, hand, position, stackBB, heroAction, true)
      }
      if (!hasRaise && (position === 'SB' || position === 'BTN')) {
        return formatHuNashFeedback(nashResult, hand, position, stackBB, heroAction, false)
      }
    }
  }

  // ─── CALL vs ALL-IN (3-max) ───
  if (hasAllIn && (position === 'BB' || position === 'SB')) {
    const fb = getCallPushFeedback(hand, position, stackBB, heroAction, game, heroIdx, multiplier, isHU)
    return mergeSolverFeedback(fb, solverResult)
  }

  // ─── PUSH/FOLD ZONE (3-max) ───
  if (isPushZone && !hasRaise && (position === 'BTN' || position === 'SB')) {
    const fb = getPushFoldFeedback(hand, position, stackBB, heroAction, multiplier, isHU)
    return mergeSolverFeedback(fb, solverResult)
  }

  // ─── DEFENSE (BB vs open, SB vs BTN open) ───
  if (hasRaise && !hasAllIn && (position === 'BB' || position === 'SB')) {
    const fb = getDefenseFeedback(hand, position, stackBB, heroAction, game, heroIdx, multiplier, isHU)
    return mergeSolverFeedback(fb, solverResult)
  }

  // ─── OPEN RAISE ───
  if (!hasRaise && (position === 'BTN' || position === 'SB')) {
    const fb = getOpenFeedback(hand, position, stackBB, heroAction, multiplier, isHU)
    return mergeSolverFeedback(fb, solverResult)
  }

  // ─── HU: BB facing open ───
  if (isHU && position === 'BB' && hasRaise && !hasAllIn) {
    return getDefenseFeedback(hand, 'BB', stackBB, heroAction, game, heroIdx, multiplier, true)
  }

  return solverResult ? formatSolverOnlyFeedback(solverResult, heroAction) : null
}

// ─── Open Raise Feedback ──────────────────────────────────
function getOpenFeedback(hand, position, stackBB, heroAction, multiplier, isHU) {
  const tier = getSpinStackTier(stackBB)
  let ranges

  if (isHU) {
    const huTier = stackBB >= 20 ? 25 : 15
    ranges = SPIN_HU_RANGES?.SB?.[huTier]
  } else {
    ranges = SPIN_OPEN_RANGES?.[position]?.[tier]
  }

  if (!ranges) return null

  const inRaise = ranges.raise?.includes(hand)
  const inMix = ranges.mix?.includes(hand)
  const shouldOpen = inRaise || inMix

  const heroOpened = heroAction !== 'fold'
  const isCorrect = (shouldOpen && heroOpened) || (!shouldOpen && !heroOpened)

  const adj = getMultiplierAdjustment(multiplier)
  let reason = ''

  if (isCorrect) {
    if (heroOpened && inRaise) {
      reason = `${hand} e open claro do ${position} com ${stackBB}bb.`
    } else if (heroOpened && inMix) {
      reason = `${hand} e borderline — abrir e OK mas fold tambem aceitavel.`
    } else {
      reason = `${hand} nao esta no range de abertura do ${position} com ${stackBB}bb. Fold correto.`
    }
  } else {
    if (heroOpened) {
      reason = `${hand} e muito fraca para abrir do ${position} com ${stackBB}bb. GTO indica fold.`
    } else {
      reason = `${hand} deveria ser aberta do ${position} com ${stackBB}bb — voce esta perdendo valor.`
    }
  }

  if (adj.tightenPct > 0.15) {
    reason += ` Multiplicador ${multiplier}x: jogue mais tight (ICM pressiona).`
  }

  return {
    isCorrect,
    correct: isCorrect,
    context: 'open',
    gtoAction: shouldOpen ? 'raise' : 'fold',
    position,
    hand: describeHand,
    recommended: isCorrect ? null : (shouldOpen ? 'Raise' : 'Fold'),
    reason,
  }
}

// ─── Push/Fold Feedback ───────────────────────────────────
function getPushFoldFeedback(hand, position, stackBB, heroAction, multiplier, isHU) {
  const tier = getSpinStackTier(stackBB)
  const ranges = SPIN_PUSH_RANGES?.[position]?.[tier]

  if (!ranges) return null

  const inPush = ranges.push?.includes(hand)
  const inMix = ranges.mix?.includes(hand)
  const shouldPush = inPush || inMix

  const heroAllIn = heroAction === 'allin'
  const heroFolded = heroAction === 'fold'
  const isCorrect = (shouldPush && (heroAllIn || heroAction === 'raise')) || (!shouldPush && heroFolded)

  const adj = getMultiplierAdjustment(multiplier)

  let reason = ''
  if (isCorrect) {
    if (heroAllIn && inPush) {
      reason = `${hand} e push claro do ${position} com ${stackBB}bb.`
    } else if (heroFolded && !shouldPush) {
      reason = `${hand} nao esta no range de push do ${position} com ${stackBB}bb.`
    } else if (inMix) {
      reason = `${hand} e borderline — ambos push e fold sao aceitaveis.`
    }
  } else {
    if (heroFolded && shouldPush) {
      reason = `Com ${stackBB}bb no ${position}, ${hand} deveria ser ALL-IN. Fold e leak.`
    } else {
      reason = `${hand} e fraca demais para push do ${position} com ${stackBB}bb.`
    }
  }

  if (adj.tightenPct > 0.10) {
    reason += ` Multiplicador ${multiplier}x: ranges de push apertam por ICM.`
  }

  return {
    isCorrect,
    correct: isCorrect,
    context: 'push',
    gtoAction: shouldPush ? 'allin' : 'fold',
    position,
    recommended: isCorrect ? null : (shouldPush ? 'All-In' : 'Fold'),
    reason,
  }
}

// ─── Defense Feedback ─────────────────────────────────────
function getDefenseFeedback(hand, position, stackBB, heroAction, game, heroIdx, multiplier, isHU) {
  const tier = getSpinStackTier(stackBB)

  // Determinar quem abriu
  const raiserAction = game.actionHistory.find(
    a => a.street === 'preflop' && ['raise', 'bet'].includes(a.action) && a.playerIdx !== heroIdx
  )
  const raiserPosition = raiserAction ? game.players[raiserAction.playerIdx]?.position : 'BTN'
  const vsKey = raiserPosition === 'BTN' ? 'vsBTN' : 'vsSB'

  let ranges
  if (isHU) {
    const huTier = stackBB >= 20 ? 25 : 15
    ranges = SPIN_HU_RANGES?.BB?.[huTier]
  } else {
    ranges = SPIN_DEFENSE_RANGES?.[position]?.[vsKey]?.[tier]
  }

  if (!ranges) return null

  const inThreeBet = ranges.threebet?.includes(hand) || ranges.shove?.includes(hand)
  const inCall = ranges.call?.includes(hand)
  const inMix = ranges.mix?.includes(hand)
  const shouldDefend = inThreeBet || inCall || inMix

  let recommended = null
  if (inThreeBet) recommended = stackBB <= 15 ? 'Shove' : '3-Bet'
  else if (inCall) recommended = 'Call'
  else recommended = 'Fold'

  const heroDefended = heroAction !== 'fold'
  const isCorrect = (shouldDefend && heroDefended) || (!shouldDefend && !heroDefended)

  let reason = ''
  if (isCorrect) {
    if (inThreeBet && (heroAction === 'raise' || heroAction === 'allin')) {
      reason = `${hand} e ${stackBB <= 15 ? 'shove' : '3-bet'} correto do ${position} vs ${raiserPosition}.`
    } else if (inCall && heroAction === 'call') {
      reason = `${hand} e call correto do ${position} vs open do ${raiserPosition}.`
    } else if (!shouldDefend && heroAction === 'fold') {
      reason = `${hand} nao justifica defesa vs ${raiserPosition} com ${stackBB}bb.`
    }
  } else {
    if (heroDefended && !shouldDefend) {
      reason = `${hand} e muito fraca para defender do ${position} vs ${raiserPosition}. GTO indica fold.`
    } else {
      reason = `${hand} deveria ${recommended?.toLowerCase()} do ${position} vs ${raiserPosition} com ${stackBB}bb.`
    }
  }

  return {
    isCorrect,
    correct: isCorrect,
    context: 'defense',
    gtoAction: inThreeBet ? 'raise' : (inCall ? 'call' : 'fold'),
    position,
    recommended: isCorrect ? null : recommended,
    reason,
  }
}

// ─── Call vs Push Feedback ────────────────────────────────
function getCallPushFeedback(hand, position, stackBB, heroAction, game, heroIdx, multiplier, isHU) {
  const tier = getSpinStackTier(stackBB)

  const pusherAction = game.actionHistory.find(
    a => a.street === 'preflop' && a.action === 'allin' && a.playerIdx !== heroIdx
  )
  const pusherPosition = pusherAction ? game.players[pusherAction.playerIdx]?.position : 'BTN'

  let spot = 'BBvsBTN'
  if (position === 'BB' && pusherPosition === 'SB') spot = 'BBvsSB'
  else if (position === 'SB') spot = 'SBvsBTN'

  const ranges = SPIN_CALL_PUSH_RANGES?.[spot]?.[tier]
  if (!ranges) return null

  const inCall = ranges.call?.includes(hand)
  const inMix = ranges.mix?.includes(hand)
  const shouldCall = inCall || inMix

  const heroCalled = heroAction === 'call' || heroAction === 'allin'
  const isCorrect = (shouldCall && heroCalled) || (!shouldCall && !heroCalled)

  const adj = getMultiplierAdjustment(multiplier)

  // Pot odds context
  const pusherStack = pusherAction ? game.players[pusherAction.playerIdx]?.invested || 0 : 0
  const potBefore = game.pot - (game.players[heroIdx]?.invested || 0)
  const toCall = pusherStack - (game.players[heroIdx]?.roundInvested || 0)
  const potOdds = toCall > 0 ? Math.round((toCall / (potBefore + toCall)) * 100) : 0

  let reason = ''
  if (isCorrect) {
    if (heroCalled && inCall) {
      reason = `${hand} e call correto vs push do ${pusherPosition}. Pot odds: ${potOdds}%.`
    } else if (!shouldCall && heroAction === 'fold') {
      reason = `${hand} nao tem equity suficiente vs range de push do ${pusherPosition}.`
    }
  } else {
    if (heroCalled && !shouldCall) {
      reason = `${hand} e muito fraca para call vs push do ${pusherPosition}. Pot odds ${potOdds}% nao compensa.`
    } else {
      reason = `${hand} deveria call vs push do ${pusherPosition} — equity vs range justifica com pot odds ${potOdds}%.`
    }
  }

  if (adj.tightenPct > 0.10) {
    reason += ` Multiplicador ${multiplier}x: ICM reduz calls marginais.`
  }

  return {
    isCorrect,
    correct: isCorrect,
    context: 'callPush',
    gtoAction: shouldCall ? 'call' : 'fold',
    position,
    recommended: isCorrect ? null : (shouldCall ? 'Call' : 'Fold'),
    reason,
    potOdds,
  }
}

// ─── ICM Feedback Spin ────────────────────────────────────
export function getSpinICMFeedback(game, heroIdx, heroAction, multiplier = 2) {
  const adj = getMultiplierAdjustment(multiplier)
  if (!adj || adj.bubbleFactor <= 1.0) return null

  const hero = game.players[heroIdx]
  if (!hero) return null

  const alivePlayers = game.players.filter(p => p.stack > 0 || !p.folded)
  const stackBB = Math.round((hero.stack + hero.invested) / game.blinds.bb)

  // Bubble de 3 jogadores — ICM sempre importa
  if (alivePlayers.length === 3 && multiplier >= 5) {
    const stacks = game.players.filter(p => p.stack > 0).map(p => p.stack)
    const isShortStack = hero.stack === Math.min(...stacks)
    const isBigStack = hero.stack === Math.max(...stacks)

    if (isShortStack && (heroAction === 'allin' || heroAction === 'call')) {
      return `3-way com ${multiplier}x: voce e short stack — ICM penaliza risco. Bubble factor ${adj.bubbleFactor.toFixed(1)}.`
    }
    if (isBigStack && heroAction === 'fold' && stackBB > 10) {
      return `Big stack no ${multiplier}x: pode pressionar mais — os medium/short stacks evitam confronto.`
    }
  }

  if (multiplier >= 25) {
    return `Multiplicador ${multiplier}x: cada decisao vale muito. ICM pressao maxima.`
  }

  return null
}

// ─── Helper: multiplier adjustment ────────────────────────
function getMultiplierAdjustment(multiplier) {
  const key = multiplier <= 2 ? 2 : multiplier <= 5 ? 5 : multiplier <= 10 ? 10 : multiplier <= 25 ? 25 : 120
  return SPIN_MULTIPLIER_ADJUSTMENTS?.adjustments?.[key] || { tightenPct: 0, bubbleFactor: 1.0 }
}

// ─── Solver-backed Feedback (MCCFR 15bb) ─────────────────
function getSolverEnrichedFeedback(hand, position, stackBB, heroAction, game, heroIdx) {
  const ah = buildActionHistory(game, heroIdx)
  const result = lookupSolverRange(hand, position, ah, stackBB)
  if (!result) return null
  return result
}

function mergeSolverFeedback(baseFeedback, solverResult) {
  if (!baseFeedback) {
    return solverResult ? formatSolverOnlyFeedback(solverResult) : null
  }
  if (!solverResult) return baseFeedback

  // Adicionar info do solver ao feedback existente
  const conf = solverResult.confidence >= 0.75 ? '' : ' (stack fora do range ideal do solver)'
  const solverVerdict = solverResult.shouldPlay ? 'jogar' : 'fold'

  // Se solver concorda com o feedback base, reforçar
  if (baseFeedback.isCorrect) {
    baseFeedback.reason += ` Solver MCCFR confirma: ${solverVerdict} (${solverResult.rangePct}% play range).`
    baseFeedback.solverAgreement = true
  } else {
    // Se solver também discorda, é forte indicação de erro
    const heroPlayed = baseFeedback.recommended === 'Fold'
    const solverAgrees = (heroPlayed && solverResult.shouldFold) || (!heroPlayed && solverResult.shouldPlay)
    if (!solverAgrees) {
      baseFeedback.reason += ` Solver MCCFR tambem indica ${solverVerdict}${conf}.`
      baseFeedback.solverAgreement = true
    } else {
      baseFeedback.reason += ` Nota: solver MCCFR sugere ${solverVerdict} neste spot${conf}.`
      baseFeedback.solverAgreement = false
    }
  }

  baseFeedback.solverData = {
    source: solverResult.source,
    confidence: solverResult.confidence,
    rangePct: solverResult.rangePct,
    scenario: solverResult.rangeDescription,
  }

  return baseFeedback
}

function formatSolverOnlyFeedback(solverResult, heroAction) {
  if (!solverResult) return null
  const heroPlayed = heroAction !== 'fold'
  const isCorrect = (solverResult.shouldPlay && heroPlayed) || (solverResult.shouldFold && !heroPlayed)
  const conf = solverResult.confidence >= 0.75 ? '' : ' (aproximado — stack diferente de 15bb)'

  return {
    isCorrect,
    reason: isCorrect
      ? `Solver MCCFR: decisao correta. ${solverResult.rangeDescription}${conf}.`
      : `Solver MCCFR: ${solverResult.shouldPlay ? 'deveria jogar' : 'deveria fold'}. ${solverResult.rangeDescription}${conf}.`,
    recommended: isCorrect ? null : (solverResult.shouldPlay ? 'Play' : 'Fold'),
    solverData: {
      source: solverResult.source,
      confidence: solverResult.confidence,
      rangePct: solverResult.rangePct,
      scenario: solverResult.rangeDescription,
    },
  }
}

// ─── HU Nash Push/Fold Feedback ───────────────────────────
function formatHuNashFeedback(nashResult, hand, position, stackBB, heroAction, hasAllIn) {
  const isHeroPusher = position === 'SB' || position === 'BTN'

  if (isHeroPusher && !hasAllIn) {
    // SB decide push ou fold
    const heroAllIn = heroAction === 'allin' || heroAction === 'raise'
    const isCorrect = (nashResult.shouldPlay && heroAllIn) || (nashResult.shouldFold && heroAction === 'fold')
    return {
      isCorrect,
      position,
      recommended: isCorrect ? null : (nashResult.shouldPlay ? 'All-In' : 'Fold'),
      reason: isCorrect
        ? `Nash HU: ${hand} e ${nashResult.shouldPlay ? 'push' : 'fold'} correto com ${stackBB}bb (${nashResult.rangePct}% push range).`
        : `Nash HU: ${hand} deveria ${nashResult.shouldPlay ? 'ALL-IN' : 'fold'} com ${stackBB}bb. ${nashResult.source}.`,
      solverData: { source: nashResult.source, confidence: 1.0, rangePct: nashResult.rangePct, scenario: nashResult.rangeDescription },
    }
  }

  if (position === 'BB' && hasAllIn) {
    // BB decide call ou fold vs push
    const heroCalled = heroAction === 'call' || heroAction === 'allin'
    const isCorrect = (nashResult.shouldPlay && heroCalled) || (nashResult.shouldFold && heroAction === 'fold')
    return {
      isCorrect,
      position,
      recommended: isCorrect ? null : (nashResult.shouldPlay ? 'Call' : 'Fold'),
      reason: isCorrect
        ? `Nash HU: ${hand} e ${nashResult.shouldPlay ? 'call' : 'fold'} correto vs push com ${stackBB}bb (${nashResult.rangePct}% call range).`
        : `Nash HU: ${hand} deveria ${nashResult.shouldPlay ? 'CALL' : 'fold'} vs push com ${stackBB}bb. ${nashResult.source}.`,
      solverData: { source: nashResult.source, confidence: 1.0, rangePct: nashResult.rangePct, scenario: nashResult.rangeDescription },
    }
  }

  return null
}

// ─── Postflop Feedback (simplified for Spin) ──────────────
export function getSpinPostflopFeedback(game, heroIdx, heroAction, amount) {
  const hero = game.players[heroIdx]
  if (!hero?.holeCards || !game.board?.length) return null

  const e = evalHand(hero.holeCards, game.board)
  const handDesc = describeHand(hero.holeCards, game.board)
  const stackBB = Math.round(hero.stack / game.blinds.bb)
  const potBB = Math.round(game.pot / game.blinds.bb)

  const name = e.name || ''
  const isMonster = ['Straight Flush', 'Four of a Kind', 'Full House'].includes(name)
  const isStrong = ['Flush', 'Straight'].includes(name) || isMonster

  const spr = hero.stack > 0 ? (hero.stack / game.pot).toFixed(1) : 0

  let isCorrect = true
  let reason = ''
  let recommended = null

  // SPR baixo (< 2) — commit or fold
  if (spr < 2 && !isMonster) {
    if (heroAction === 'check' || heroAction === 'call') {
      if (isStrong) {
        reason = `SPR ${spr} com ${handDesc} — considere shove para maximizar valor.`
        recommended = 'All-In'
        isCorrect = false
      } else {
        reason = `SPR ${spr} com ${handDesc} — call/check OK, nao comprometer com mao fraca.`
      }
    } else if (heroAction === 'allin' && !isStrong) {
      reason = `SPR ${spr} mas ${handDesc} nao justifica all-in.`
      isCorrect = false
      recommended = 'Check/Fold'
    }
  }

  // Value bet com mao forte
  if (isStrong && heroAction === 'check' && game.lastBet === 0) {
    reason = `${handDesc} merece aposta de valor. Check deixa dinheiro na mesa.`
    isCorrect = false
    recommended = 'Bet'
  }

  // Fold com mao forte
  if (isStrong && heroAction === 'fold') {
    reason = `Fold com ${handDesc}? Muito forte para largar aqui.`
    isCorrect = false
    recommended = 'Call/Raise'
  }

  if (!reason) {
    if (heroAction === 'fold' && game.lastBet === 0) {
      reason = `Check gratis disponivel — nao precisa foldar sem aposta.`
      isCorrect = false
      recommended = 'Check'
    } else {
      reason = `${handDesc} no ${game.street}. SPR: ${spr}.`
    }
  }

  return { isCorrect, position: hero.position, reason, recommended }
}
