// ================================================================
// Feedback GTO Multiway — Arena MTT 6-max
// Feedback contextual por posicao, num. jogadores, ICM pressure
// ================================================================

import { RFI_RANGES, BB_VS_RFI, BLIND_WARS } from '../data/ranges.js'
import { Hand } from 'pokersolver'

const RANK_VAL = { A:14,K:13,Q:12,J:11,T:10,9:9,8:8,7:7,6:6,5:5,4:4,3:3,2:2 }

// ─── Helpers ─────────────────────────────────────────────

function holeToNotation(hole) {
  const r0 = hole[0].slice(0, -1), s0 = hole[0].slice(-1)
  const r1 = hole[1].slice(0, -1), s1 = hole[1].slice(-1)
  const v0 = RANK_VAL[r0], v1 = RANK_VAL[r1]
  const hi = v0 >= v1 ? r0 : r1, lo = v0 >= v1 ? r1 : r0
  if (r0 === r1) return `${hi}${lo}`
  return s0 === s1 ? `${hi}${lo}s` : `${hi}${lo}o`
}

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

// ─── Hand strength (same logic as Arena.jsx) ─────────────

function handStrength(hole, board) {
  const all = [...hole, ...board]
  const ranks = all.map(c => RANK_VAL[c.slice(0, -1)])
  const suits = all.map(c => c.slice(-1))
  const boardRanks = board.map(c => RANK_VAL[c.slice(0, -1)])
  const holeRanks = hole.map(c => RANK_VAL[c.slice(0, -1)])

  const solved = Hand.solve(all)
  const score = { 'Straight Flush': 9, 'Four of a Kind': 8, 'Full House': 7, 'Flush': 6,
    'Straight': 5, 'Three of a Kind': 4, 'Two Pair': 3, 'Pair': 2, 'High Card': 1 }[solved.name] || 1

  if (score >= 7) return 'monster'
  if (score >= 5) return 'strong'

  // Set
  if (holeRanks[0] === holeRanks[1] && boardRanks.includes(holeRanks[0])) return 'monster'

  // Two pair using both hole cards
  const uniq = [...new Set(holeRanks)]
  const boardRankSet = new Set(boardRanks)
  if (uniq.length === 2 && uniq.every(r => boardRankSet.has(r))) return 'strong'

  // Overpair
  if (holeRanks[0] === holeRanks[1] && boardRanks.every(v => v < holeRanks[0])) return 'strong'

  // Top pair
  const topBoardVal = Math.max(...boardRanks)
  if (holeRanks.some(v => v === topBoardVal)) {
    const kicker = Math.max(...holeRanks.filter(v => v !== topBoardVal), 0)
    return kicker >= 11 ? 'good' : 'marginal'
  }

  // Draws
  const sc = {}
  suits.forEach(s => { sc[s] = (sc[s] || 0) + 1 })
  const maxSuit = Math.max(...Object.values(sc))
  const allRanks = [...new Set(ranks)].sort((a, b) => a - b)
  let oesd = false
  for (let i = 0; i < allRanks.length - 3; i++) {
    if (allRanks[i + 3] - allRanks[i] <= 4) { oesd = true; break }
  }
  if (maxSuit >= 4 || (oesd && holeRanks.some(r => allRanks.includes(r)))) return 'draw'

  // Middle/bottom pair
  if (score === 2) return 'weak'

  // Pocket pair below board
  if (holeRanks[0] === holeRanks[1]) return 'weak'

  // High cards
  if (Math.max(...holeRanks) >= 13) return 'weak'
  return 'air'
}

// ─── Board texture ───────────────────────────────────────

function boardTexture(board) {
  if (board.length === 0) return { wet: false, paired: false, monotone: false, connected: false }
  const ranks = board.map(c => RANK_VAL[c.slice(0, -1)])
  const suits = board.map(c => c.slice(-1))
  const rc = {}; ranks.forEach(r => { rc[r] = (rc[r] || 0) + 1 })
  const paired = Object.values(rc).some(v => v >= 2)
  const sc = {}; suits.forEach(s => { sc[s] = (sc[s] || 0) + 1 })
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

// ─── Hand description ────────────────────────────────────

function describeHand(hole, board) {
  const holeR = hole.map(c => c.slice(0, -1))
  const boardR = board.map(c => c.slice(0, -1))
  const boardRanks = board.map(c => RANK_VAL[c.slice(0, -1)])
  const holeRanks = hole.map(c => RANK_VAL[c.slice(0, -1)])
  const solved = Hand.solve([...hole, ...board])
  const labels = { 'Straight Flush': 'Straight Flush', 'Four of a Kind': 'Quadra', 'Full House': 'Full House',
    'Flush': 'Flush', 'Straight': 'Straight', 'Three of a Kind': 'Trinca', 'Two Pair': 'Dois Pares',
    'Pair': 'Par', 'High Card': 'High Card' }
  const score = { 'Straight Flush': 9, 'Four of a Kind': 8, 'Full House': 7, 'Flush': 6,
    'Straight': 5, 'Three of a Kind': 4, 'Two Pair': 3, 'Pair': 2, 'High Card': 1 }[solved.name] || 1

  if (score >= 5) return labels[solved.name] || solved.name

  if (holeR[0] === holeR[1] && boardR.includes(holeR[0])) return `Trinca de ${holeR[0]}`
  const pairsWithBoard = [...new Set(holeR)].filter(r => boardR.includes(r))
  if (pairsWithBoard.length === 2) return `Dois pares (${pairsWithBoard.join(' e ')})`
  if (holeR[0] === holeR[1] && boardRanks.every(v => v < RANK_VAL[holeR[0]])) return `Overpair (${holeR[0]}${holeR[0]})`

  const topBoardVal = Math.max(...boardRanks)
  const topBoardRank = boardR[boardRanks.indexOf(topBoardVal)]
  if (holeRanks.some(v => v === topBoardVal)) {
    const kicker = holeRanks.find(v => v !== topBoardVal) || holeRanks[0]
    const kickerName = Object.entries(RANK_VAL).find(([, v]) => v === kicker)?.[0]
    return `Top pair (${topBoardRank}) kicker ${kickerName}`
  }

  if (holeR.some(r => boardR.includes(r))) return `Par medio/baixo`

  const allSuits = [...hole, ...board].map(c => c.slice(-1))
  const sc2 = {}; allSuits.forEach(s => { sc2[s] = (sc2[s] || 0) + 1 })
  const holeSuits = hole.map(c => c.slice(-1))
  const flushDraw = holeSuits.some(hs => (sc2[hs] || 0) === 4)
  if (flushDraw) return 'Draw de flush'

  const highCard = Math.max(...holeRanks)
  const highName = Object.entries(RANK_VAL).find(([, v]) => v === highCard)?.[0]
  return `${highName} high`
}

// ================================================================
// PREFLOP FEEDBACK — position-aware, multiway context
// ================================================================

export function getMultiwayPreflopFeedback(game, heroIdx, heroAction) {
  const hero = game.players[heroIdx]
  const hand = holeToNotation(hero.holeCards)
  const position = hero.position
  const stackBB = Math.round(hero.stack / game.blinds.bb)
  const stackTier = getStackTier(stackBB)

  // Analyze preflop action context
  const preflopActions = (game.actionHistory || []).filter(a =>
    a.street === 'preflop' && a.playerIdx !== heroIdx
  )

  let numRaisers = 0, firstRaiserPosition = null, numLimpers = 0
  for (const a of preflopActions) {
    if (a.action === 'raise' || a.action === 'allin') {
      numRaisers++
      if (numRaisers === 1) firstRaiserPosition = game.players[a.playerIdx].position
    } else if (a.action === 'call' && numRaisers === 0) {
      numLimpers++
    }
  }

  const isFirstIn = numRaisers === 0 && numLimpers === 0
  const facingRaise = numRaisers === 1
  const facing3Bet = numRaisers >= 2

  // ─── RFI (first in) ───
  if (isFirstIn) {
    if (position === 'SB') {
      return feedbackSBOpen(hand, heroAction, position)
    }
    if (position === 'BB') {
      // BB first in = everyone folded, hero checks
      return { recommended: 'check', reason: `Todos foldaram ate o BB. Check e veja o flop de graca.`, isCorrect: heroAction === 'check', position }
    }
    return feedbackRFI(hand, heroAction, position, stackTier)
  }

  // ─── Facing raise (single) ───
  if (facingRaise) {
    return feedbackVsRaise(hand, heroAction, position, firstRaiserPosition)
  }

  // ─── Facing 3-bet ───
  if (facing3Bet) {
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

  let recommended, reason
  if (inRaise) {
    recommended = 'raise'
    reason = `${hand} esta no range de RFI do ${position}. Abra com raise — voce e o primeiro a entrar no pote.`
  } else if (inMix) {
    recommended = 'raise'
    reason = `${hand} e uma mao mista no ${position} — pode abrir ou foldar. Raise e aceitavel, fold tambem.`
    const isCorrect = heroAction === 'raise' || heroAction === 'fold'
    return { recommended, reason, isCorrect, acceptable: ['fold'], position }
  } else {
    recommended = 'fold'
    reason = `${hand} esta fora do range de abertura do ${position}. Fold — posicao muito cedo pra essa mao.`
  }

  const isCorrect = heroAction === recommended
  return { recommended, reason, isCorrect, position }
}

function feedbackSBOpen(hand, heroAction, position) {
  const raiseRange = BLIND_WARS.SB_raise?.raise || []
  const completeRange = BLIND_WARS.SB_complete?.complete || []

  let recommended, reason
  if (raiseRange.includes(hand)) {
    recommended = 'raise'
    reason = `${hand} esta no range de RAISE do SB. Abra com raise para pressionar o BB.`
  } else if (completeRange.includes(hand)) {
    recommended = 'call'
    reason = `${hand} esta no range de COMPLETE do SB. Limp para ver flop barato.`
  } else {
    recommended = 'fold'
    reason = `${hand} nao tem equity suficiente para jogar do SB.`
  }

  const isCorrect = heroAction === recommended ||
    (recommended === 'raise' && heroAction === 'raise') ||
    (recommended === 'call' && heroAction === 'call')
  return { recommended, reason, isCorrect, position }
}

function feedbackVsRaise(hand, heroAction, position, raiserPosition) {
  const raiserKey = mapRaiserForDefense(raiserPosition)

  // BB vs raise
  if (position === 'BB') {
    const defRange = BB_VS_RFI[raiserKey]
    if (!defRange) return null

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

  // Outras posicoes vs raise — range mais apertado
  let recommended, reason
  // Simplified: top hands 3-bet, medium call, rest fold
  const premium = ['AA','KK','QQ','JJ','AKs','AKo']
  const strong3bet = ['TT','99','AQs','AQo','AJs','KQs']
  const callable = ['88','77','66','ATs','A9s','KJs','KTs','QJs','JTs','T9s','98s','87s','76s']

  if (premium.includes(hand)) {
    recommended = 'raise'
    reason = `${hand} no ${position} vs raise do ${raiserPosition} — 3-bet por valor. Mao premium.`
  } else if (strong3bet.includes(hand)) {
    recommended = 'raise'
    reason = `${hand} no ${position} vs raise do ${raiserPosition} — 3-bet e a jogada padrao. Call tambem funciona.`
    return { recommended, reason, isCorrect: heroAction === 'raise' || heroAction === 'call', acceptable: ['call'], position }
  } else if (callable.includes(hand)) {
    recommended = 'call'
    reason = `${hand} no ${position} vs raise do ${raiserPosition} — call para ver flop com posicao/equity.`
  } else {
    recommended = 'fold'
    reason = `${hand} no ${position} vs raise do ${raiserPosition} — fora do range de defesa, fold.`
  }

  return { recommended, reason, isCorrect: heroAction === recommended, position }
}

function feedbackVs3Bet(hand, heroAction, position) {
  const premium = ['AA','KK','QQ','AKs']
  const fourBet = ['JJ','TT','AKo','AQs']
  const callable = ['99','88','AJs','ATs','KQs','AQo']

  let recommended, reason
  if (premium.includes(hand)) {
    recommended = 'raise'
    reason = `${hand} vs 3-bet — 4-bet/all-in. Mao premium, construa o pote.`
  } else if (fourBet.includes(hand)) {
    recommended = 'raise'
    reason = `${hand} vs 3-bet — 4-bet como valor/proteção. Call tambem e aceitavel.`
    return { recommended, reason, isCorrect: heroAction === 'raise' || heroAction === 'call', acceptable: ['call'], position }
  } else if (callable.includes(hand)) {
    recommended = 'call'
    reason = `${hand} vs 3-bet — call com implied odds. Jogue com cautela pos-flop.`
  } else {
    recommended = 'fold'
    reason = `${hand} vs 3-bet — range muito forte do oponente, fold e mais seguro.`
  }

  return { recommended, reason, isCorrect: heroAction === recommended, position }
}

function feedbackVsLimpers(hand, heroAction, position, numLimpers, stackTier) {
  const posKey = mapPositionForRFI(position)
  const posRanges = RFI_RANGES[posKey]
  if (!posRanges) return null

  const tierRange = posRanges[stackTier] || posRanges[100]
  if (!tierRange) return null

  const inRaise = (tierRange.raise || []).includes(hand)

  if (inRaise) {
    return {
      recommended: 'raise', position,
      reason: `${hand} no ${position} com ${numLimpers} limper${numLimpers > 1 ? 's' : ''} — iso-raise para jogar heads-up contra range fraco.`,
      isCorrect: heroAction === 'raise',
      acceptable: ['call'],
    }
  }

  // Limp behind com maos especulativas
  const speculative = ['55','44','33','22','76s','65s','54s','87s','98s','T9s','J9s']
  if (speculative.includes(hand)) {
    return {
      recommended: 'call', position,
      reason: `${hand} com limpers — limp behind pra ver flop barato com mao especulativa. Odds implicitas.`,
      isCorrect: heroAction === 'call',
      acceptable: ['fold'],
    }
  }

  return {
    recommended: 'fold', position,
    reason: `${hand} no ${position} — mao fraca demais mesmo com limpers. Fold.`,
    isCorrect: heroAction === 'fold',
  }
}

// ================================================================
// POSTFLOP FEEDBACK — multiway adjustments
// ================================================================

export function getMultiwayPostflopFeedback(game, heroIdx, heroAction, betAmount) {
  const hero = game.players[heroIdx]
  if (!hero.holeCards || game.board.length === 0) return null

  const strength = handStrength(hero.holeCards, game.board)
  const texture = boardTexture(game.board)
  const street = game.street
  const handDesc = describeHand(hero.holeCards, game.board)
  const textureDesc = texture.wet ? 'board umido' : 'board seco'
  const lastBet = game.currentBet - (hero.currentBet || 0)
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
          ? `${handDesc} no ${textureDesc}. Em pote multiway, call e mais seguro — alguem pode ter mao melhor. Raise tambem e ok pra proteger.`
          : `${handDesc} no ${textureDesc}. Call para manter vilao na mao. Raise ok pra negar equity de draws.`
        break
      case 'good':
        recommended = 'call'
        reason = `${handDesc} — precisa de ${oddsPercent}% de equity (bet ${betRelPot}% do pote).${isMultiway ? ' Multiway: cuidado, mais jogadores = ranges mais fortes.' : ''}`
        break
      case 'draw':
        if (potOdds < 0.30 && street !== 'river') {
          recommended = 'call'
          reason = `${handDesc} — pot odds de ${oddsPercent}% justificam call.${isMultiway ? ' Multiway: melhores odds implicitas, mas semi-bluff raise e arriscado.' : ' Semi-bluff raise tambem funciona.'}`
          if (!isMultiway) acceptable.push('raise')
        } else if (street === 'river') {
          recommended = 'fold'
          reason = `${handDesc} — draw nao completou no river. Fold.`
        } else {
          recommended = 'fold'
          acceptable.push('call')
          reason = `${handDesc} — pot odds ruins (${oddsPercent}%). Fold mais seguro.${isMultiway ? '' : ' Raise como semi-bluff pode funcionar.'}`
        }
        break
      case 'marginal':
        if (betRelPot <= 40 && !isMultiway) {
          recommended = 'call'
          reason = `${handDesc} — bet pequena (${betRelPot}%). Call aceitavel.`
        } else {
          recommended = 'fold'
          reason = `${handDesc} — mao marginal${isMultiway ? ' em pote multiway. Muito perigoso continuar.' : `. Bet de ${betRelPot}% sem equity suficiente.`}`
        }
        break
      default:
        recommended = 'fold'
        reason = `${handDesc} — sem mao feita.${isMultiway ? ' Bluff multiway e -EV.' : ''} Fold.`
    }
  } else {
    // Can bet or check
    switch (strength) {
      case 'monster':
        recommended = 'bet'
        acceptable.push('check')
        reason = isMultiway
          ? `${handDesc} no ${textureDesc}. Bet por valor — com ${activePlayers} jogadores, maior chance de ser pago.`
          : `${handDesc} no ${textureDesc}. Bet por valor. Check (slowplay) ok em board seco.`
        break
      case 'strong':
        recommended = 'bet'
        acceptable.push('check')
        reason = isMultiway
          ? `${handDesc} — bet por valor e protecao. Multiway: nao de carta gratis, muitos draws possiveis.`
          : `${handDesc} — bet por valor. ${texture.wet ? 'Board umido = proteja.' : 'Board seco = sizing menor.'}`
        break
      case 'good':
        if (isMultiway) {
          recommended = 'check'
          acceptable.push('bet')
          reason = `${handDesc} — pote multiway com ${activePlayers} jogadores. Check para controlar o pote. Bet fino se board seco.`
        } else {
          recommended = 'bet'
          acceptable.push('check')
          reason = `${handDesc} — bet por valor e protecao.`
        }
        break
      case 'draw':
        if (isMultiway) {
          recommended = 'check'
          reason = `${handDesc} — pote multiway. Semi-bluff e arriscado com ${activePlayers} jogadores. Check para ver carta gratis.`
        } else if (street !== 'river') {
          recommended = 'bet'
          acceptable.push('check')
          reason = `${handDesc} — semi-bluff. Pode ganhar agora se vilao foldar, e tem outs pra melhorar.`
        } else {
          recommended = 'check'
          reason = `${handDesc} — draw nao completou. Check.`
        }
        break
      case 'marginal':
        recommended = 'check'
        reason = `${handDesc} — mao marginal. Check para controlar o pote.${isMultiway ? ' Multiway = mais risco.' : ''}`
        break
      case 'weak':
        if (!isMultiway && !texture.wet && street === 'flop') {
          recommended = 'bet'
          acceptable.push('check')
          reason = `${handDesc} no ${textureDesc}. C-bet bluff (33%) e padrao GTO heads-up.`
        } else if (isMultiway) {
          recommended = 'check'
          reason = `${handDesc} — sem mao. C-bet bluff multiway com ${activePlayers} jogadores e -EV. Check.`
        } else {
          recommended = 'check'
          reason = `${handDesc} — sem nada. Check.`
        }
        break
      default: // air
        if (isMultiway) {
          recommended = 'check'
          reason = `${handDesc} — nada no board. Bluff multiway e queimar fichas. Check.`
        } else if (!texture.wet && street === 'flop') {
          recommended = 'bet'
          acceptable.push('check')
          reason = `${handDesc} — cbet bluff 33% em board seco e lucrativo HU.`
        } else {
          recommended = 'check'
          reason = `${handDesc} no ${textureDesc}. Sem mao, sem draw. Check.`
        }
    }
  }

  const isCorrect = heroAction === recommended || acceptable.includes(heroAction)

  // Sizing feedback
  let sizingFeedback = null
  if ((heroAction === 'bet' || heroAction === 'raise') && betAmount && pot > 0) {
    sizingFeedback = getSizingFeedback(strength, texture, street, betAmount, pot, isMultiway, activePlayers)
  }

  return { recommended, reason, isCorrect, acceptable, sizingFeedback }
}

// ─── Sizing feedback ─────────────────────────────────────

function getSizingFeedback(strength, texture, street, betAmount, pot, isMultiway, activePlayers) {
  const sizePct = Math.round((betAmount / Math.max(pot, 1)) * 100)
  const streetIdx = { flop: 0, turn: 1, river: 2 }[street] ?? 0
  let idealMin, idealMax, idealDesc

  // Multiway = sizing menor em geral (menos fold equity)
  const mwAdj = isMultiway ? -10 : 0

  switch (strength) {
    case 'monster':
      if (streetIdx === 2) { idealMin = 75 + mwAdj; idealMax = 150; idealDesc = '75-150% (value max river)' }
      else if (texture.wet) { idealMin = 66 + mwAdj; idealMax = 80; idealDesc = '66-80% (proteger board umido)' }
      else { idealMin = 50 + mwAdj; idealMax = 66; idealDesc = '50-66% (disfarcar forca)' }
      break
    case 'strong':
      if (streetIdx === 2) { idealMin = 66 + mwAdj; idealMax = 80; idealDesc = '66-80% (value river)' }
      else { idealMin = 50 + mwAdj; idealMax = 75; idealDesc = '50-75% (valor + protecao)' }
      break
    case 'good':
      idealMin = 25; idealMax = 50; idealDesc = '25-50% (protecao leve)'
      break
    case 'draw':
      idealMin = 50 + mwAdj; idealMax = 75; idealDesc = '50-75% (semi-bluff)'
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
  const payingPlaces = payouts.length // top 3

  // Only provide ICM feedback near bubble (payingPlaces + 1 ou 2 jogadores)
  if (numAlive > payingPlaces + 2) return null

  const hero = game.players[heroIdx]
  if (!hero || hero.stack <= 0) return null

  const stacks = game.players.map(p => p.stack)
  const totalChips = stacks.reduce((a, b) => a + b, 0)
  const heroStackPct = Math.round((hero.stack / totalChips) * 100)

  // Check if hero is short/medium/big stack
  const sortedStacks = [...stacks.filter(s => s > 0)].sort((a, b) => b - a)
  const heroRank = sortedStacks.indexOf(hero.stack)
  const isShortStack = heroRank >= sortedStacks.length - 1
  const isBigStack = heroRank === 0

  const onBubble = numAlive === payingPlaces + 1

  let icmNote = null

  if (onBubble) {
    if (isShortStack && (heroAction === 'call' || heroAction === 'raise')) {
      icmNote = `Na BOLHA com stack curto (${heroStackPct}% das fichas). Cuidado — um bust aqui e 0% de premio. Considere fold para preservar ICM equity.`
    } else if (isBigStack && heroAction === 'fold') {
      icmNote = `Na BOLHA como chip leader. Voce pode pressionar stacks menores — eles precisam sobreviver. Aproveite para acumular.`
    } else if (onBubble && heroAction === 'fold') {
      icmNote = `Na bolha — fold conservador e aceitavel para garantir ITM.`
    }
  } else if (numAlive <= payingPlaces) {
    // Already ITM — can play more aggressively for 1st
    if (heroAction === 'fold' && hero.stack > sortedStacks[Math.floor(sortedStacks.length / 2)]) {
      icmNote = `Ja no premio! Com stack acima da media, jogue mais agressivo para buscar o 1o lugar.`
    }
  }

  return icmNote
}
