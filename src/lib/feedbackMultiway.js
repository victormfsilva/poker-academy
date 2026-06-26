// ================================================================
// Feedback GTO Multiway — Arena MTT 6-max
// Usa handStrength/boardTexture do botAI.js e evalHand do pokerEngine.js
// ================================================================

import { RFI_RANGES, BB_VS_RFI, BLIND_WARS } from '../data/ranges.js'
import { handStrength, boardTexture } from './botAI.js'
import { holeToNotation, evalHand, getBlindIndexes, RANK_VAL } from './pokerEngine.js'

// ─── Helpers ─────────────────────────────────────────────

function mapPositionForRFI(position) {
  const map = { 'UTG': 'UTG', 'UTG+1': 'UTG+1', 'LJ': 'UTG', 'HJ': 'UTG+1', 'CO': 'CO', 'BTN': 'BTN', 'SB': 'SB', 'BB': 'BB' }
  return map[position] || 'CO'
}

function mapRaiserForDefense(raiserPosition) {
  const map = { 'UTG': 'vsUTG', 'UTG+1': 'vsUTG', 'LJ': 'vsUTG', 'HJ': 'vsHJ', 'CO': 'vsCO', 'BTN': 'vsBTN', 'SB': 'vsSB' }
  return map[raiserPosition] || 'vsCO'
}

function getStackTier(stackBB) {
  if (stackBB >= 75) return 100
  if (stackBB >= 37) return 50
  if (stackBB >= 20) return 25
  return 15
}

// ─── Hand description (compact) ──────────────────────────

function describeHand(hole, board) {
  if (!board || board.length === 0) return holeToNotation(hole)

  const e = evalHand(hole, board)
  const holeR = hole.map(c => c.slice(0, -1))
  const boardR = board.map(c => c.slice(0, -1))
  const boardRanks = board.map(c => RANK_VAL[c.slice(0, -1)])
  const holeRanks = hole.map(c => RANK_VAL[c.slice(0, -1)])

  const name = e.name || ''
  if (['Straight Flush', 'Four of a Kind', 'Full House', 'Flush', 'Straight'].includes(name)) {
    return e.label
  }

  if (holeR[0] === holeR[1] && boardR.includes(holeR[0])) return `Trinca de ${holeR[0]}`
  const pairsWithBoard = [...new Set(holeR)].filter(r => boardR.includes(r))
  if (pairsWithBoard.length === 2) return `Dois pares (${pairsWithBoard.join(' e ')})`
  if (holeR[0] === holeR[1] && boardRanks.every(v => v < RANK_VAL[holeR[0]])) return `Overpair (${holeR[0]}${holeR[0]})`

  const topBoardVal = Math.max(...boardRanks)
  if (holeRanks.some(v => v === topBoardVal)) {
    const topBoardRank = boardR[boardRanks.indexOf(topBoardVal)]
    return `Top pair (${topBoardRank})`
  }

  if (holeR.some(r => boardR.includes(r))) return 'Par medio/baixo'

  const strength = handStrength(hole, board)
  if (strength === 'draw') return 'Draw'

  const highVal = Math.max(...holeRanks)
  const highName = Object.entries(RANK_VAL).find(([, v]) => v === highVal)?.[0]
  return `${highName} high`
}

// ================================================================
// PREFLOP FEEDBACK — position-aware, multiway context
// ================================================================

export function getMultiwayPreflopFeedback(game, heroIdx, heroAction) {
  const hero = game.players[heroIdx]
  if (!hero || !hero.holeCards) return null

  const hand = holeToNotation(hero.holeCards)
  const position = hero.position
  if (!position) return null

  const stackBB = Math.round(hero.stack / game.blinds.bb)
  const stackTier = getStackTier(stackBB)

  // Analyze preflop action context (skip blind posts)
  const preflopActions = (game.actionHistory || []).filter(a =>
    a.street === 'preflop' && a.playerIdx !== heroIdx && a.action !== 'sb' && a.action !== 'bb'
  )

  let numRaisers = 0, firstRaiserPosition = null, numLimpers = 0
  for (const a of preflopActions) {
    if (a.action === 'raise' || a.action === 'allin') {
      numRaisers++
      if (numRaisers === 1) firstRaiserPosition = game.players[a.playerIdx]?.position
    } else if (a.action === 'call' && numRaisers === 0) {
      numLimpers++
    }
  }

  const isFirstIn = numRaisers === 0 && numLimpers === 0

  // ─── RFI (first in) ───
  if (isFirstIn) {
    if (position === 'SB') {
      return feedbackSBOpen(hand, heroAction, position)
    }
    if (position === 'BB') {
      return { recommended: 'check', reason: `Todos foldaram ate o BB. Check e veja o flop de graca.`, isCorrect: heroAction === 'check', position }
    }
    return feedbackRFI(hand, heroAction, position, stackTier)
  }

  // ─── Facing raise (single) ───
  if (numRaisers === 1) {
    return feedbackVsRaise(hand, heroAction, position, firstRaiserPosition)
  }

  // ─── Facing 3-bet+ ───
  if (numRaisers >= 2) {
    return feedbackVs3Bet(hand, heroAction, position)
  }

  // ─── Facing limpers ───
  if (numLimpers > 0) {
    return feedbackVsLimpers(hand, heroAction, position, numLimpers, stackTier)
  }

  return null
}

function feedbackRFI(hand, heroAction, position, stackTier) {
  const posKey = mapPositionForRFI(position)
  const posRanges = RFI_RANGES[posKey]
  if (!posRanges) return null

  const tierRange = posRanges[stackTier] || posRanges[100]
  if (!tierRange) return null

  const inRaise = (tierRange.raise || []).includes(hand)
  const inMix = (tierRange.mix || []).includes(hand)

  if (inRaise) {
    return {
      recommended: 'raise', position,
      reason: `${hand} esta no range de RFI do ${position}. Abra com raise — voce e o primeiro a entrar no pote.`,
      isCorrect: heroAction === 'raise' || heroAction === 'bet',
    }
  }
  if (inMix) {
    return {
      recommended: 'raise', position,
      reason: `${hand} e uma mao mista no ${position} — pode abrir ou foldar. Ambos sao aceitaveis.`,
      isCorrect: heroAction === 'raise' || heroAction === 'fold' || heroAction === 'bet',
      acceptable: ['fold'],
    }
  }
  return {
    recommended: 'fold', position,
    reason: `${hand} esta fora do range de abertura do ${position}. Fold.`,
    isCorrect: heroAction === 'fold',
  }
}

function feedbackSBOpen(hand, heroAction, position) {
  const raiseRange = BLIND_WARS.SB_raise?.raise || []
  const completeRange = BLIND_WARS.SB_complete?.complete || []

  if (raiseRange.includes(hand)) {
    return {
      recommended: 'raise', position,
      reason: `${hand} esta no range de RAISE do SB. Abra com raise para pressionar o BB.`,
      isCorrect: heroAction === 'raise' || heroAction === 'bet',
    }
  }
  if (completeRange.includes(hand)) {
    return {
      recommended: 'call', position,
      reason: `${hand} esta no range de COMPLETE do SB. Limp para ver flop barato.`,
      isCorrect: heroAction === 'call',
      acceptable: ['raise'],
    }
  }
  return {
    recommended: 'fold', position,
    reason: `${hand} nao tem equity suficiente para jogar do SB.`,
    isCorrect: heroAction === 'fold',
  }
}

function feedbackVsRaise(hand, heroAction, position, raiserPosition) {
  const raiserKey = mapRaiserForDefense(raiserPosition)

  // BB vs raise
  if (position === 'BB') {
    const defRange = BB_VS_RFI?.[raiserKey]
    if (!defRange) {
      // Fallback generico
      return feedbackVsRaiseGeneric(hand, heroAction, position, raiserPosition)
    }

    if ((defRange.threebet || []).includes(hand)) {
      return {
        recommended: 'raise', position,
        reason: `${hand} esta no range de 3-BET do BB vs ${raiserPosition}. Relance para construir pote ou forcar fold.`,
        isCorrect: heroAction === 'raise',
        acceptable: ['call'],
      }
    }
    if ((defRange.call || []).includes(hand)) {
      return {
        recommended: 'call', position,
        reason: `${hand} esta no range de CALL do BB vs ${raiserPosition}. Boa equity para defender.`,
        isCorrect: heroAction === 'call',
      }
    }
    return {
      recommended: 'fold', position,
      reason: `${hand} nao tem equity suficiente para defender do BB vs raise do ${raiserPosition}.`,
      isCorrect: heroAction === 'fold',
    }
  }

  return feedbackVsRaiseGeneric(hand, heroAction, position, raiserPosition)
}

function feedbackVsRaiseGeneric(hand, heroAction, position, raiserPosition) {
  const premium = ['AA','KK','QQ','JJ','AKs','AKo']
  const strong3bet = ['TT','99','AQs','AQo','AJs','KQs']
  const callable = ['88','77','66','ATs','A9s','KJs','KTs','QJs','JTs','T9s','98s','87s','76s']

  if (premium.includes(hand)) {
    return {
      recommended: 'raise', position,
      reason: `${hand} no ${position} vs raise do ${raiserPosition} — 3-bet por valor. Mao premium.`,
      isCorrect: heroAction === 'raise',
    }
  }
  if (strong3bet.includes(hand)) {
    return {
      recommended: 'raise', position,
      reason: `${hand} no ${position} vs raise do ${raiserPosition} — 3-bet padrao. Call tambem funciona.`,
      isCorrect: heroAction === 'raise' || heroAction === 'call',
      acceptable: ['call'],
    }
  }
  if (callable.includes(hand)) {
    return {
      recommended: 'call', position,
      reason: `${hand} no ${position} vs raise do ${raiserPosition} — call para ver flop com equity.`,
      isCorrect: heroAction === 'call',
    }
  }
  return {
    recommended: 'fold', position,
    reason: `${hand} no ${position} vs raise do ${raiserPosition} — fora do range de defesa, fold.`,
    isCorrect: heroAction === 'fold',
  }
}

function feedbackVs3Bet(hand, heroAction, position) {
  const premium = ['AA','KK','QQ','AKs']
  const fourBet = ['JJ','TT','AKo','AQs']
  const callable = ['99','88','AJs','ATs','KQs','AQo']

  if (premium.includes(hand)) {
    return {
      recommended: 'raise', position,
      reason: `${hand} vs 3-bet — 4-bet/all-in. Mao premium, construa o pote.`,
      isCorrect: heroAction === 'raise' || heroAction === 'allin',
    }
  }
  if (fourBet.includes(hand)) {
    return {
      recommended: 'raise', position,
      reason: `${hand} vs 3-bet — 4-bet como valor. Call tambem aceitavel.`,
      isCorrect: heroAction === 'raise' || heroAction === 'call' || heroAction === 'allin',
      acceptable: ['call'],
    }
  }
  if (callable.includes(hand)) {
    return {
      recommended: 'call', position,
      reason: `${hand} vs 3-bet — call com implied odds. Cautela pos-flop.`,
      isCorrect: heroAction === 'call',
    }
  }
  return {
    recommended: 'fold', position,
    reason: `${hand} vs 3-bet — range muito forte do oponente, fold.`,
    isCorrect: heroAction === 'fold',
  }
}

function feedbackVsLimpers(hand, heroAction, position, numLimpers, stackTier) {
  const posKey = mapPositionForRFI(position)
  const posRanges = RFI_RANGES[posKey]

  // Checka se ta no range de raise da posicao
  let inRaise = false
  if (posRanges) {
    const tierRange = posRanges[stackTier] || posRanges[100]
    if (tierRange) inRaise = (tierRange.raise || []).includes(hand)
  }

  if (inRaise) {
    return {
      recommended: 'raise', position,
      reason: `${hand} no ${position} com ${numLimpers} limper${numLimpers > 1 ? 's' : ''} — iso-raise para jogar heads-up contra range fraco.`,
      isCorrect: heroAction === 'raise' || heroAction === 'bet',
      acceptable: ['call'],
    }
  }

  const speculative = ['55','44','33','22','76s','65s','54s','87s','98s','T9s','J9s']
  if (speculative.includes(hand)) {
    return {
      recommended: 'call', position,
      reason: `${hand} com limpers — limp behind pra ver flop barato. Odds implicitas.`,
      isCorrect: heroAction === 'call',
      acceptable: ['fold'],
    }
  }

  return {
    recommended: 'fold', position,
    reason: `${hand} no ${position} — mao fraca mesmo com limpers. Fold.`,
    isCorrect: heroAction === 'fold',
  }
}

// ================================================================
// POSTFLOP FEEDBACK — multiway adjustments
// ================================================================

export function getMultiwayPostflopFeedback(game, heroIdx, heroAction, betAmount) {
  const hero = game.players[heroIdx]
  if (!hero || !hero.holeCards || !game.board || game.board.length === 0) return null

  const strength = handStrength(hero.holeCards, game.board)
  const texture = boardTexture(game.board)
  const street = game.street
  const handDesc = describeHand(hero.holeCards, game.board)
  const textureDesc = texture.wet ? 'board umido' : 'board seco'

  // lastBet do engine = game.lastBet (maior aposta na rodada)
  // O que o hero precisa pagar = game.lastBet - hero.roundInvested
  const lastBet = Math.max(0, game.lastBet - (hero.roundInvested || 0))
  const pot = game.pot

  // Count active players (not folded)
  const activePlayers = game.players.filter(p => !p.folded && p.stack > 0).length
  const isMultiway = activePlayers >= 3

  let recommended = ''
  let reason = ''
  const acceptable = []

  if (lastBet > 0) {
    const potOdds = lastBet / (pot + lastBet)
    const oddsPercent = Math.round(potOdds * 100)
    const betRelPot = Math.round((lastBet / Math.max(pot - lastBet, 1)) * 100)

    switch (strength) {
      case 'monster':
        recommended = 'raise'
        acceptable.push('call')
        reason = `${handDesc} — mao monstruosa. Raise para extrair valor maximo.${isMultiway ? ' Multiway = mais chance de alguem pagar.' : ''} Call tambem funciona como slowplay.`
        break
      case 'strong':
        recommended = 'call'
        acceptable.push('raise')
        reason = isMultiway
          ? `${handDesc} no ${textureDesc}. Pote multiway — call mais seguro. Raise ok pra proteger.`
          : `${handDesc} no ${textureDesc}. Call para manter vilao na mao. Raise ok pra negar draws.`
        break
      case 'good':
        recommended = 'call'
        reason = `${handDesc} — precisa de ${oddsPercent}% de equity (bet ${betRelPot}% do pote).${isMultiway ? ' Multiway: cuidado, ranges mais fortes.' : ''}`
        break
      case 'draw':
        if (potOdds < 0.30 && street !== 'river') {
          recommended = 'call'
          reason = `${handDesc} — pot odds de ${oddsPercent}% justificam call.${isMultiway ? ' Multiway: odds implicitas melhores mas semi-bluff arriscado.' : ''}`
          if (!isMultiway) acceptable.push('raise')
        } else if (street === 'river') {
          recommended = 'fold'
          reason = `${handDesc} — draw nao completou no river. Fold.`
        } else {
          recommended = 'fold'
          acceptable.push('call')
          reason = `${handDesc} — pot odds ruins (${oddsPercent}%). Fold mais seguro.`
        }
        break
      case 'marginal':
        if (betRelPot <= 40 && !isMultiway) {
          recommended = 'call'
          reason = `${handDesc} — bet pequena (${betRelPot}%). Call aceitavel.`
        } else {
          recommended = 'fold'
          reason = `${handDesc} — mao marginal${isMultiway ? ' em pote multiway. Perigoso continuar.' : `. Bet de ${betRelPot}% sem equity.`}`
        }
        break
      default:
        recommended = 'fold'
        reason = `${handDesc} — sem mao feita.${isMultiway ? ' Bluff multiway e -EV.' : ''} Fold.`
    }
  } else {
    // Can bet or check (lastBet === 0)
    switch (strength) {
      case 'monster':
        recommended = 'bet'
        acceptable.push('check')
        reason = isMultiway
          ? `${handDesc} no ${textureDesc}. Bet por valor — ${activePlayers} jogadores, mais chance de ser pago.`
          : `${handDesc} no ${textureDesc}. Bet por valor. Check (slowplay) ok em board seco.`
        break
      case 'strong':
        recommended = 'bet'
        acceptable.push('check')
        reason = isMultiway
          ? `${handDesc} — bet por valor e protecao. Multiway: nao de carta gratis.`
          : `${handDesc} — bet por valor. ${texture.wet ? 'Board umido = proteja.' : 'Board seco = sizing menor.'}`
        break
      case 'good':
        if (isMultiway) {
          recommended = 'check'
          acceptable.push('bet')
          reason = `${handDesc} — pote multiway. Check para controlar o pote.`
        } else {
          recommended = 'bet'
          acceptable.push('check')
          reason = `${handDesc} — bet por valor e protecao.`
        }
        break
      case 'draw':
        if (isMultiway) {
          recommended = 'check'
          reason = `${handDesc} — pote multiway. Semi-bluff arriscado com ${activePlayers} jogadores. Check.`
        } else if (street !== 'river') {
          recommended = 'bet'
          acceptable.push('check')
          reason = `${handDesc} — semi-bluff. Pode ganhar agora ou melhorar.`
        } else {
          recommended = 'check'
          reason = `${handDesc} — draw nao completou. Check.`
        }
        break
      case 'marginal':
        recommended = 'check'
        reason = `${handDesc} — mao marginal. Check para controlar o pote.`
        break
      case 'weak':
        if (!isMultiway && !texture.wet && street === 'flop') {
          recommended = 'bet'
          acceptable.push('check')
          reason = `${handDesc} no ${textureDesc}. C-bet bluff (33%) padrao GTO heads-up.`
        } else if (isMultiway) {
          recommended = 'check'
          reason = `${handDesc} — c-bet bluff multiway com ${activePlayers} jogadores e -EV. Check.`
        } else {
          recommended = 'check'
          reason = `${handDesc} — sem nada. Check.`
        }
        break
      default: // air
        if (isMultiway) {
          recommended = 'check'
          reason = `${handDesc} — bluff multiway e queimar fichas. Check.`
        } else if (!texture.wet && street === 'flop') {
          recommended = 'bet'
          acceptable.push('check')
          reason = `${handDesc} — cbet bluff 33% em board seco lucrativo HU.`
        } else {
          recommended = 'check'
          reason = `${handDesc} no ${textureDesc}. Check.`
        }
    }
  }

  const isCorrect = heroAction === recommended || acceptable.includes(heroAction)

  // Sizing feedback
  let sizingFeedback = null
  if ((heroAction === 'bet' || heroAction === 'raise') && betAmount && pot > 0) {
    sizingFeedback = getSizingFeedback(strength, texture, street, betAmount, pot, isMultiway)
  }

  return { recommended, reason, isCorrect, acceptable, sizingFeedback }
}

// ─── Sizing feedback ─────────────────────────────────────

function getSizingFeedback(strength, texture, street, betAmount, pot, isMultiway) {
  const sizePct = Math.round((betAmount / Math.max(pot, 1)) * 100)
  const streetIdx = { flop: 0, turn: 1, river: 2 }[street] ?? 0
  let idealMin, idealMax, idealDesc

  switch (strength) {
    case 'monster':
      if (streetIdx === 2) { idealMin = 75; idealMax = 150; idealDesc = '75-150% (value max river)' }
      else if (texture.wet) { idealMin = 66; idealMax = 80; idealDesc = '66-80% (proteger board umido)' }
      else { idealMin = 50; idealMax = 66; idealDesc = '50-66% (disfarcar forca)' }
      break
    case 'strong':
      if (streetIdx === 2) { idealMin = 66; idealMax = 80; idealDesc = '66-80% (value river)' }
      else { idealMin = 50; idealMax = 75; idealDesc = '50-75% (valor + protecao)' }
      break
    case 'good':
      idealMin = 25; idealMax = 50; idealDesc = '25-50% (protecao leve)'
      break
    case 'draw':
      idealMin = 50; idealMax = 75; idealDesc = '50-75% (semi-bluff)'
      break
    default:
      if (streetIdx === 2) { idealMin = 66; idealMax = 100; idealDesc = '66-100% (bluff polarizado)' }
      else { idealMin = 25; idealMax = 40; idealDesc = '25-40% (bluff pequeno)' }
  }

  const isGood = sizePct >= idealMin - 10 && sizePct <= idealMax + 15
  let comment
  if (isGood) {
    comment = `Sizing ${sizePct}% do pote — bom tamanho.`
  } else if (sizePct < idealMin - 10) {
    comment = `Sizing ${sizePct}% — muito pequeno. Ideal: ${idealDesc}.`
  } else {
    comment = `Sizing ${sizePct}% — muito grande. Ideal: ${idealDesc}.`
  }

  return { comment, isGood, sizePct, idealRange: `${idealMin}-${idealMax}%` }
}

// ================================================================
// ICM FEEDBACK — near-bubble adjustments
// ================================================================

export function getICMFeedback(game, heroIdx, heroAction, payouts) {
  if (!game || !payouts) return null

  const alive = game.players.filter(p => p.stack > 0)
  const numAlive = alive.length
  const payingPlaces = payouts.length

  // Only provide ICM feedback near bubble
  if (numAlive > payingPlaces + 2) return null

  const hero = game.players[heroIdx]
  if (!hero || hero.stack <= 0) return null

  const stacks = game.players.map(p => p.stack)
  const totalChips = stacks.reduce((a, b) => a + b, 0)
  const heroStackPct = Math.round((hero.stack / totalChips) * 100)

  const sortedStacks = stacks.filter(s => s > 0).sort((a, b) => b - a)
  const isShortStack = hero.stack <= sortedStacks[sortedStacks.length - 1]
  const isBigStack = hero.stack >= sortedStacks[0]
  const onBubble = numAlive === payingPlaces + 1

  if (onBubble) {
    if (isShortStack && (heroAction === 'call' || heroAction === 'raise')) {
      return `Na BOLHA com stack curto (${heroStackPct}%). Cuidado — bust aqui e 0% de premio. Considere fold para preservar ICM.`
    }
    if (isBigStack && heroAction === 'fold') {
      return `Na BOLHA como chip leader. Pressione stacks menores — eles precisam sobreviver.`
    }
    if (heroAction === 'fold') {
      return `Na bolha — fold conservador aceitavel para garantir ITM.`
    }
  } else if (numAlive <= payingPlaces) {
    if (heroAction === 'fold' && hero.stack > sortedStacks[Math.floor(sortedStacks.length / 2)]) {
      return `Ja no premio! Com stack acima da media, jogue mais agressivo para buscar o 1o lugar.`
    }
  }

  return null
}
