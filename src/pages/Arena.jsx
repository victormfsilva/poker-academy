import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import Card, { parseCard, handToCards } from '../components/Card'
import { BLIND_WARS, BB_VS_RFI } from '../data/ranges'

// ─── Constantes ────────────────────────────────────────────
const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2']
const SUITS = ['s','h','d','c']
const RANK_VAL = { A:14,K:13,Q:12,J:11,T:10,9:9,8:8,7:7,6:6,5:5,4:4,3:3,2:2 }

// ─── Utilitarios de cartas ─────────────────────────────────
function newDeck() {
  const deck = []
  for (const r of RANKS) for (const s of SUITS) deck.push(r + s)
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

function cardRank(c) { return RANK_VAL[c[0]] || RANK_VAL[c.slice(0, -1)] }

// ─── Avaliacao de mao (simplificada) ──────────────────────
function evalHand(hole, board) {
  const all = [...hole, ...board]
  const ranks = all.map(c => RANK_VAL[c.slice(0, -1)])
  const suits = all.map(c => c.slice(-1))

  // Flush
  const sc = {}
  suits.forEach(s => { sc[s] = (sc[s] || 0) + 1 })
  const flushSuit = Object.entries(sc).find(([, v]) => v >= 5)?.[0]
  const hasFlush = !!flushSuit

  // Straight
  const unique = [...new Set(ranks)].sort((a, b) => a - b)
  if (unique.includes(14)) unique.unshift(1) // Ace low
  let hasStraight = false
  let straightHigh = 0
  for (let i = 0; i <= unique.length - 5; i++) {
    if (unique[i+4] - unique[i] === 4 &&
        unique[i+1] === unique[i]+1 && unique[i+2] === unique[i]+2 && unique[i+3] === unique[i]+3) {
      hasStraight = true
      straightHigh = unique[i+4]
    }
  }

  // Rank counts
  const rc = {}
  ranks.forEach(r => { rc[r] = (rc[r] || 0) + 1 })
  const counts = Object.entries(rc).sort((a, b) => b[1] - a[1] || b[0] - a[0])

  // Hand strength score (higher = better)
  // 9=straight flush, 8=quads, 7=full house, 6=flush, 5=straight, 4=trips, 3=two pair, 2=pair, 1=high card
  if (hasFlush && hasStraight) {
    const flushCards = all.filter(c => c.slice(-1) === flushSuit).map(c => RANK_VAL[c.slice(0, -1)])
    const fu = [...new Set(flushCards)].sort((a, b) => a - b)
    if (fu.includes(14)) fu.unshift(1)
    let sf = false
    for (let i = 0; i <= fu.length - 5; i++) {
      if (fu[i+4] - fu[i] === 4 && fu[i+1]===fu[i]+1 && fu[i+2]===fu[i]+2 && fu[i+3]===fu[i]+3) sf = true
    }
    if (sf) return { score: 9, label: 'Straight Flush' }
  }

  if (counts[0][1] === 4) return { score: 8, label: 'Quadra' }
  if (counts[0][1] === 3 && counts[1]?.[1] >= 2) return { score: 7, label: 'Full House' }
  if (hasFlush) return { score: 6, label: 'Flush' }
  if (hasStraight) return { score: 5, label: 'Straight' }
  if (counts[0][1] === 3) return { score: 4, label: 'Trinca' }
  if (counts[0][1] === 2 && counts[1]?.[1] === 2) return { score: 3, label: 'Dois Pares' }
  if (counts[0][1] === 2) return { score: 2, label: 'Par' }
  return { score: 1, label: 'High Card' }
}

function compareHands(h1, h2, board) {
  const e1 = evalHand(h1, board)
  const e2 = evalHand(h2, board)
  if (e1.score !== e2.score) return e1.score > e2.score ? 1 : -1
  // Tiebreak by high card
  const r1 = h1.map(c => RANK_VAL[c.slice(0, -1)]).sort((a,b) => b-a)
  const r2 = h2.map(c => RANK_VAL[c.slice(0, -1)]).sort((a,b) => b-a)
  for (let i = 0; i < Math.min(r1.length, r2.length); i++) {
    if (r1[i] !== r2[i]) return r1[i] > r2[i] ? 1 : -1
  }
  return 0
}

// ─── Hand strength relativa (pra bot decidir) ─────────────
function handStrength(hole, board) {
  const all = [...hole, ...board]
  const ranks = all.map(c => RANK_VAL[c.slice(0, -1)])
  const suits = all.map(c => c.slice(-1))
  const boardRanks = board.map(c => RANK_VAL[c.slice(0, -1)])
  const holeRanks = hole.map(c => RANK_VAL[c.slice(0, -1)])
  const holeSuits = hole.map(c => c.slice(-1))

  const e = evalHand(hole, board)

  // Categorize
  if (e.score >= 7) return 'monster'   // full house+
  if (e.score >= 5) return 'strong'    // straight/flush

  // Check specific made hands
  const boardR = board.map(c => c.slice(0, -1))
  const holeR = hole.map(c => c.slice(0, -1))

  // Set
  if (holeR[0] === holeR[1] && boardR.includes(holeR[0])) return 'strong'

  // Two pair
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
    if (unique[i+3] - unique[i] <= 4) {
      if (holeRanks.some(r => unique.slice(i, i+4).includes(r))) hasStraightDraw = true
    }
  }

  if (hasFlushDraw && hasStraightDraw) return 'good'
  if (hasFlushDraw || hasStraightDraw) return 'draw'

  // Any pair
  if (holeR.some(r => boardR.includes(r))) return 'marginal'

  // High cards
  if (holeRanks.some(v => v >= 12)) return 'weak' // A or K high

  return 'air'
}

// ─── Converter hole cards reais para notacao de hand ──────
// Ex: ['As','Kh'] → 'AKo', ['Ah','Kh'] → 'AKs', ['Ts','Td'] → 'TT'
function holeToNotation(hole) {
  const r1 = hole[0].slice(0, -1)
  const r2 = hole[1].slice(0, -1)
  const s1 = hole[0].slice(-1)
  const s2 = hole[1].slice(-1)
  const v1 = RANK_VAL[r1], v2 = RANK_VAL[r2]
  const high = v1 >= v2 ? r1 : r2
  const low = v1 >= v2 ? r2 : r1
  if (r1 === r2) return high + low // pocket pair
  const suited = s1 === s2 ? 's' : 'o'
  return high + low + suited
}

// ─── Bot pre-flop usando ranges GTO ──────────────────────
// botIsSB: true = bot é SB (age primeiro), false = bot é BB (defende)
function botPreflopDecision(botHole, botIsSB) {
  const hand = holeToNotation(botHole)

  if (botIsSB) {
    // Bot é SB: usar SB_raise range
    const raiseRange = BLIND_WARS.SB_raise?.raise || []
    if (raiseRange.includes(hand)) return 'raise'
    // Complete range (limp)
    const completeRange = BLIND_WARS.SB_complete?.complete || []
    if (completeRange.includes(hand)) return 'call' // limp/complete
    return 'fold'
  } else {
    // Bot é BB: facing SB raise, usar BB_VS_RFI.vsSB
    const bbRange = BB_VS_RFI.vsSB || {}
    if (bbRange.threebet?.includes(hand)) return 'raise' // 3-bet
    if (bbRange.call?.includes(hand)) return 'call'
    return 'fold'
  }
}

// ─── Feedback pre-flop para o hero ────────────────────────
function getHeroPreflopFeedback(heroHole, heroAction, heroIsSB) {
  const hand = holeToNotation(heroHole)

  if (heroIsSB) {
    // Hero é SB: deveria raise, complete ou fold?
    const raiseRange = BLIND_WARS.SB_raise?.raise || []
    const completeRange = BLIND_WARS.SB_complete?.complete || []
    let recommended, reason
    if (raiseRange.includes(hand)) {
      recommended = 'raise'
      reason = `${hand} esta no range de RAISE do SB. Abra com raise para pressionar o BB.`
    } else if (completeRange.includes(hand)) {
      recommended = 'call'
      reason = `${hand} esta no range de COMPLETE do SB. Limp para ver flop barato com boa jogabilidade.`
    } else {
      recommended = 'fold'
      reason = `${hand} nao tem equity suficiente para jogar do SB.`
    }
    const isCorrect = heroAction === recommended ||
      (recommended === 'raise' && heroAction === 'raise') ||
      (recommended === 'call' && heroAction === 'call')
    return { recommended, reason, isCorrect }
  } else {
    // Hero é BB: facing SB raise, deveria 3-bet, call ou fold?
    const bbRange = BB_VS_RFI.vsSB || {}
    let recommended, reason
    if (bbRange.threebet?.includes(hand)) {
      recommended = 'raise'
      reason = `${hand} esta no range de 3-BET do BB vs SB. Relance para construir pote ou fazer o SB foldar.`
    } else if (bbRange.call?.includes(hand)) {
      recommended = 'call'
      reason = `${hand} esta no range de CALL do BB vs SB. Boa equity para ver o flop.`
    } else {
      recommended = 'fold'
      reason = `${hand} nao tem equity suficiente para defender do BB vs raise do SB.`
    }
    const isCorrect = heroAction === recommended
    return { recommended, reason, isCorrect }
  }
}

// ─── Board texture analysis ─────────────────────────────
function boardTexture(board) {
  if (board.length === 0) return { wet: false, paired: false, monotone: false, connected: false, highCards: 0 }
  const ranks = board.map(c => RANK_VAL[c.slice(0, -1)])
  const suits = board.map(c => c.slice(-1))

  // Paired board
  const rc = {}
  ranks.forEach(r => { rc[r] = (rc[r] || 0) + 1 })
  const paired = Object.values(rc).some(v => v >= 2)

  // Flush draw / monotone
  const sc = {}
  suits.forEach(s => { sc[s] = (sc[s] || 0) + 1 })
  const maxSuit = Math.max(...Object.values(sc))
  const monotone = maxSuit >= 3
  const flushDraw = maxSuit >= 2

  // Connectedness
  const sorted = [...new Set(ranks)].sort((a, b) => a - b)
  let connected = false
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1] - sorted[i] <= 2) { connected = true; break }
  }

  // High cards (T+)
  const highCards = ranks.filter(r => r >= 10).length

  const wet = (flushDraw && connected) || monotone || (connected && highCards >= 2)

  return { wet, paired, monotone, connected, highCards, flushDraw }
}

// ─── Bot GTO (decisoes heuristicas avancadas) ────────────
// Retorna { action, sizePct } onde sizePct = fracao do pote (0.33, 0.5, 0.75, 1.0)
function botDecision(botHole, board, street, pot, lastBet, isIP) {
  if (board.length === 0) return 'call' // fallback pre-flop

  const strength = handStrength(botHole, board)
  const texture = boardTexture(board)
  const rng = Math.random()
  const streetIdx = { flop: 0, turn: 1, river: 2 }[street] ?? 0

  // ─── Facing a bet ───
  if (lastBet > 0) {
    const potOdds = lastBet / (pot + lastBet)
    const betRelPot = lastBet / Math.max(pot - lastBet, 1) // bet as % of pot before bet

    switch (strength) {
      case 'monster':
        // Slowplay call sometimes on flop, raise more on later streets
        if (streetIdx === 0) return rng < 0.4 ? 'raise' : 'call'
        return rng < 0.7 ? 'raise' : 'call'

      case 'strong':
        // Raise more on wet boards (protect equity), flat on dry
        if (texture.wet) return rng < 0.45 ? 'raise' : 'call'
        return rng < 0.2 ? 'raise' : 'call'

      case 'good':
        // Call most, occasional raise on flop for protection
        if (streetIdx === 0 && texture.wet) return rng < 0.15 ? 'raise' : 'call'
        return 'call'

      case 'draw':
        // Semi-bluff raise sometimes, especially IP on flop
        if (streetIdx === 0 && isIP && rng < 0.25) return 'raise'
        // Call if pot odds are good enough
        if (potOdds < 0.30) return 'call'
        if (streetIdx === 0 && potOdds < 0.35) return 'call' // flop has more outs ahead
        return rng < 0.2 ? 'call' : 'fold'

      case 'marginal':
        // Only call small bets
        if (betRelPot < 0.4) return rng < 0.6 ? 'call' : 'fold'
        if (betRelPot < 0.6) return rng < 0.3 ? 'call' : 'fold'
        return 'fold'

      case 'weak':
        // Bluff-raise rarely, mostly fold
        if (streetIdx === 2 && rng < 0.08) return 'raise' // river bluff-raise
        return rng < 0.1 ? 'call' : 'fold'

      default: // air
        // Bluff-raise on flop sometimes
        if (streetIdx === 0 && rng < 0.06) return 'raise'
        return 'fold'
    }
  }

  // ─── No bet to face (can check or bet) ───
  switch (strength) {
    case 'monster':
      // Slowplay more on dry boards, bet wet boards
      if (texture.wet) return rng < 0.85 ? 'bet' : 'check'
      if (streetIdx === 0) return rng < 0.4 ? 'bet' : 'check' // trap on dry flop
      return rng < 0.75 ? 'bet' : 'check'

    case 'strong':
      // Bet for value, more on wet boards
      if (texture.wet) return rng < 0.85 ? 'bet' : 'check'
      return rng < 0.7 ? 'bet' : 'check'

    case 'good':
      // Bet flop/turn for value+protection, more cautious on river
      if (streetIdx <= 1) return rng < 0.65 ? 'bet' : 'check'
      return rng < 0.5 ? 'bet' : 'check'

    case 'draw':
      // Semi-bluff: more on flop, less on river (no more cards to come)
      if (streetIdx === 0) return rng < 0.50 ? 'bet' : 'check'
      if (streetIdx === 1) return rng < 0.35 ? 'bet' : 'check'
      return rng < 0.10 ? 'bet' : 'check' // river: draw missed, rare bluff

    case 'marginal':
      // Check most, thin value bet on river sometimes
      if (streetIdx === 2 && rng < 0.15) return 'bet'
      return 'check'

    case 'weak':
      // Bluff: more on dry boards, less on wet
      if (texture.wet) return rng < 0.08 ? 'bet' : 'check'
      if (streetIdx === 0) return rng < 0.25 ? 'bet' : 'check' // dry flop cbet bluff
      if (streetIdx === 1) return rng < 0.15 ? 'bet' : 'check' // barrel
      return rng < 0.12 ? 'bet' : 'check' // river bluff

    default: // air
      // Pure bluff: dry boards, IP, earlier streets
      if (!texture.wet && isIP) {
        if (streetIdx === 0) return rng < 0.30 ? 'bet' : 'check'
        if (streetIdx === 1) return rng < 0.18 ? 'bet' : 'check'
        return rng < 0.10 ? 'bet' : 'check'
      }
      if (streetIdx === 0) return rng < 0.15 ? 'bet' : 'check'
      return rng < 0.08 ? 'bet' : 'check'
  }
}

// ─── Bot bet sizing (retorna fracao do pote) ─────────────
function botBetSizing(botHole, board, street, pot, isIP) {
  const strength = handStrength(botHole, board)
  const texture = boardTexture(board)
  const streetIdx = { flop: 0, turn: 1, river: 2 }[street] ?? 0
  const rng = Math.random()

  // Polarizado: mãos muito fortes e bluffs usam sizing grande
  // Mãos medianas usam sizing menor
  switch (strength) {
    case 'monster':
      // Overbet river, big sizing on wet boards
      if (streetIdx === 2) return rng < 0.3 ? 1.25 : 0.75
      if (texture.wet) return 0.75
      return rng < 0.5 ? 0.75 : 0.5

    case 'strong':
      if (texture.wet) return 0.66
      return rng < 0.6 ? 0.5 : 0.66

    case 'good':
      // Smaller sizing for protection/thin value
      if (streetIdx === 0) return rng < 0.5 ? 0.5 : 0.33
      return 0.5

    case 'draw':
      // Semi-bluff: use bigger sizing to maximize fold equity
      return rng < 0.4 ? 0.66 : 0.5

    case 'marginal':
      return 0.33 // thin value = small

    default: // weak/air bluffs
      // Bluffs: mix sizing to stay balanced
      if (streetIdx === 2) return rng < 0.4 ? 0.75 : 0.5 // river bluffs bigger
      if (!texture.wet) return 0.33 // dry board cbet bluff = small
      return 0.5
  }
}

// ─── Descricao da mao do hero em linguagem simples ──────
function describeHeroHand(hole, board) {
  const e = evalHand(hole, board)
  const holeR = hole.map(c => c.slice(0, -1))
  const boardR = board.map(c => c.slice(0, -1))
  const boardRanks = board.map(c => RANK_VAL[c.slice(0, -1)])
  const holeRanks = hole.map(c => RANK_VAL[c.slice(0, -1)])
  const holeSuits = hole.map(c => c.slice(-1))
  const all = [...hole, ...board]
  const allSuits = all.map(c => c.slice(-1))

  // Draws
  const sc = {}
  allSuits.forEach(s => { sc[s] = (sc[s] || 0) + 1 })
  const flushDraw = holeSuits.some(hs => (sc[hs] || 0) === 4)
  const allRanks = all.map(c => RANK_VAL[c.slice(0, -1)])
  const unique = [...new Set(allRanks)].sort((a, b) => a - b)
  if (unique.includes(14)) unique.unshift(1)
  let straightDraw = false
  for (let i = 0; i < unique.length - 3; i++) {
    if (unique[i + 3] - unique[i] <= 4 && holeRanks.some(r => unique.slice(i, i + 4).includes(r))) {
      straightDraw = true; break
    }
  }

  const parts = [e.label]

  // Contexto extra
  if (e.score >= 7) return parts.join('')
  if (e.score >= 5) return parts.join('')

  // Set
  if (holeR[0] === holeR[1] && boardR.includes(holeR[0])) {
    return `Trinca de ${holeR[0]}`
  }

  // Two pair using both hole cards
  const pairsWithBoard = [...new Set(holeR)].filter(r => boardR.includes(r))
  if (pairsWithBoard.length === 2) return `Dois pares (${pairsWithBoard.join(' e ')})`

  // Overpair
  if (holeR[0] === holeR[1] && boardRanks.every(v => v < RANK_VAL[holeR[0]])) {
    return `Overpair (${holeR[0]}${holeR[0]})`
  }

  // Top pair
  const topBoardVal = Math.max(...boardRanks)
  const topBoardRank = boardR[boardRanks.indexOf(topBoardVal)]
  if (holeRanks.some(v => v === topBoardVal)) {
    const kicker = holeRanks.find(v => v !== topBoardVal) || holeRanks[0]
    const kickerName = Object.entries(RANK_VAL).find(([, v]) => v === kicker)?.[0]
    return `Top pair (${topBoardRank}) com kicker ${kickerName}`
  }

  // Middle/bottom pair
  if (holeR.some(r => boardR.includes(r))) {
    const pairR = holeR.find(r => boardR.includes(r))
    const pairVal = RANK_VAL[pairR]
    if (pairVal < topBoardVal) return `Par medio/baixo (${pairR})`
  }

  // Pocket pair below board
  if (holeR[0] === holeR[1]) return `Par de bolso (${holeR[0]}${holeR[1]}) abaixo do board`

  // Draws
  if (flushDraw && straightDraw) return 'Combo draw (flush + sequencia)'
  if (flushDraw) return 'Draw de flush (faltam 1 carta)'
  if (straightDraw) return 'Draw de sequencia'

  // High card
  const highCard = Math.max(...holeRanks)
  const highName = Object.entries(RANK_VAL).find(([, v]) => v === highCard)?.[0]
  return `${highName} high (sem par)`
}

// ─── Feedback GTO sobre a acao do hero ────────────────────
function getHeroFeedback(heroHole, board, heroAction, pot, lastBet) {
  if (board.length === 0) return null

  const strength = handStrength(heroHole, board)
  const texture = boardTexture(board)
  const streetName = board.length === 3 ? 'flop' : board.length === 4 ? 'turn' : 'river'
  const handDesc = describeHeroHand(heroHole, board)
  const textureDesc = texture.wet ? 'board umido' : 'board seco'
  let recommended = ''
  let reason = ''
  const acceptable = [] // acoes aceitaveis alem da recomendada

  if (lastBet > 0) {
    const potOdds = lastBet / (pot + lastBet)
    const oddsPercent = Math.round(potOdds * 100)
    const betRelPot = Math.round((lastBet / Math.max(pot - lastBet, 1)) * 100)

    switch (strength) {
      case 'monster':
        recommended = 'raise'
        acceptable.push('call')
        reason = `${handDesc} — mao monstruosa no ${streetName}. Raise para extrair o maximo de valor. Call tambem funciona pra disfarcar a forca da sua mao (slowplay).`
        break
      case 'strong':
        recommended = 'call'
        acceptable.push('raise')
        if (texture.wet) {
          reason = `${handDesc} no ${textureDesc}. Num board com muitos draws, call protege sua mao sem inflar o pote demais. Raise tambem e ok pra negar equity dos draws do vilao.`
        } else {
          reason = `${handDesc} no ${textureDesc}. Call pra manter o vilao na mao com maos piores. Raise pode assustar e fazer ele foldar.`
        }
        break
      case 'good':
        recommended = 'call'
        reason = `${handDesc} — boa mao. Voce precisa de ${oddsPercent}% de equity pra call ser lucrativo (bet ${betRelPot}% do pote). Sua mao tem equity suficiente.`
        break
      case 'draw':
        if (potOdds < 0.30) {
          recommended = 'call'
          acceptable.push('raise')
          reason = `${handDesc} — pot odds de ${oddsPercent}% justificam o call. ${streetName === 'flop' ? 'Ainda tem turn e river pra completar.' : streetName === 'turn' ? 'Uma carta pra completar no river.' : 'Ultimo street — se nao completou, nao tem mais chances.'}`
          if (streetName === 'river') {
            recommended = 'fold'
            acceptable.length = 0
            reason = `${handDesc} — draw nao completou no river. Sem mais cartas pra vir, fold e a jogada correta.`
          }
        } else {
          recommended = 'fold'
          acceptable.push('raise')
          reason = `${handDesc} — pot odds de ${oddsPercent}% sao ruins pro seu draw. Fold e mais seguro. Raise como semi-bluff pode funcionar se o vilao foldar bastante.`
        }
        break
      case 'marginal':
        if (betRelPot <= 40) {
          recommended = 'call'
          reason = `${handDesc} — bet pequena (${betRelPot}% do pote). Com esse preco, call e aceitavel pra ver mais uma carta.`
        } else {
          recommended = 'fold'
          reason = `${handDesc} — mao marginal contra bet de ${betRelPot}% do pote. Sem equity suficiente pra continuar.`
        }
        break
      case 'weak':
        recommended = 'fold'
        reason = `${handDesc} — apenas carta alta. Sem mao feita nem draw, fold e a jogada correta.`
        break
      default:
        recommended = 'fold'
        reason = `${handDesc} — nada no board. Fold sem pensar duas vezes.`
    }
  } else {
    // Can bet or check
    switch (strength) {
      case 'monster':
        if (texture.wet) {
          recommended = 'bet'
          reason = `${handDesc} no ${textureDesc}. Bet por valor — existem muitos draws que podem pagar. Nao de carta gratis num board perigoso.`
        } else {
          recommended = 'bet'
          acceptable.push('check')
          reason = `${handDesc} no ${textureDesc}. Bet por valor e a jogada padrao. Check (slowplay) tambem funciona num board seco — pouca chance do vilao melhorar de graca.`
        }
        break
      case 'strong':
        recommended = 'bet'
        acceptable.push('check')
        reason = `${handDesc} — mao forte. Bet por valor pra cobrar de maos piores. ${texture.wet ? 'Board umido = nao de carta gratis.' : 'Board seco = vilao tem poucas saidas, sizing menor e ok.'}`
        break
      case 'good':
        recommended = 'bet'
        acceptable.push('check')
        if (streetName === 'river') {
          reason = `${handDesc} — boa mao no river. Bet fino por valor, pra cobrar de pares piores ou draws que nao completaram. Check tambem e safe.`
        } else {
          reason = `${handDesc} — bet por valor e protecao. ${texture.wet ? 'Board umido — proteja sua mao negando equity.' : 'Board seco — sizing menor funciona, tipo 33-50% do pote.'}`
        }
        break
      case 'draw':
        if (streetName === 'flop' || streetName === 'turn') {
          recommended = 'bet'
          acceptable.push('check')
          reason = `${handDesc} — semi-bluff e uma boa opcao. Voce pode ganhar agora se o vilao foldar, e se ele pagar, ainda tem outs pra melhorar. Check pra ver carta gratis tambem funciona.`
        } else {
          recommended = 'check'
          reason = `${handDesc} — draw nao completou no river. Check e a jogada mais segura. Bluff so se voce tiver uma boa leitura do vilao.`
        }
        break
      case 'marginal':
        recommended = 'check'
        if (streetName === 'river') {
          acceptable.push('bet')
          reason = `${handDesc} — mao marginal no river. Check pra controlar o pote. Bet fino por valor pode funcionar contra ranges muito fracos.`
        } else {
          reason = `${handDesc} — mao marginal. Check pra controlar o pote e ver a proxima carta de graca.`
        }
        break
      case 'weak':
        if (!texture.wet && streetName === 'flop') {
          recommended = 'bet'
          acceptable.push('check')
          reason = `${handDesc} no ${textureDesc}. Board seco no flop — bet pequeno (33%) como bluff e padrao GTO. Voce nao tem nada, mas o vilao provavelmente tambem nao.`
        } else {
          recommended = 'check'
          reason = `${handDesc} — sem nada feito. Check e de graca, nao invista mais fichas sem mao.`
        }
        break
      default:
        if (!texture.wet && streetName === 'flop') {
          recommended = 'bet'
          acceptable.push('check')
          reason = `${handDesc}. Board seco no flop — cbet bluff de 33% e lucrativo a longo prazo. Vilao vai foldar muitas maos fracas.`
        } else {
          recommended = 'check'
          reason = `${handDesc} no ${textureDesc}. Sem mao, sem draw. Desista silenciosamente com check.`
        }
    }
  }

  const isCorrect = heroAction === recommended || acceptable.includes(heroAction)

  return { recommended, reason, isCorrect, acceptable }
}

// ─── Componentes visuais ──────────────────────────────────

// Cores por tipo de acao
const ACTION_COLORS = {
  fold: '#e5484d', call: '#0a84d7', check: '#676671',
  raise: '#4fce82', bet: '#f5a623', 'all-in': '#ff8f00',
}

function getActionColor(label) {
  const l = (label || '').toLowerCase()
  if (l.includes('all-in')) return ACTION_COLORS['all-in']
  if (l.includes('raise')) return ACTION_COLORS.raise
  if (l.includes('bet')) return ACTION_COLORS.bet
  if (l.includes('call') || l.includes('complete')) return ACTION_COLORS.call
  if (l.includes('fold')) return ACTION_COLORS.fold
  return ACTION_COLORS.check
}

// Bubble de acao animada
function ActionBubble({ label, isNew }) {
  if (!label) return null
  const color = getActionColor(label)
  return (
    <div style={{
      padding: '3px 10px', borderRadius: 12,
      background: `${color}20`, border: `1px solid ${color}60`,
      fontSize: 11, fontWeight: 700, color,
      fontFamily: 'JetBrains Mono',
      animation: isNew ? 'bubblePop 0.3s ease-out' : 'none',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </div>
  )
}

function CardBack() {
  return (
    <div style={{
      width: 32, height: 44, borderRadius: 4,
      background: 'linear-gradient(135deg, #e5484d 0%, #b5303a 100%)',
      border: '1px solid rgba(255,255,255,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>?</div>
    </div>
  )
}

// Carta do board com animacao de entrada
function BoardCard({ card, index, totalVisible }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      animation: 'cardDeal 0.35s ease-out both',
      animationDelay: `${index * 0.1}s`,
    }}>
      <Card card={parseCard(card)} size="sm" />
      {index === 2 && totalVisible > 3 && <div style={{ width: 4 }} />}
    </div>
  )
}

// Mini grafico de rating (sparkline)
function RatingChart({ history, color }) {
  if (!history || history.length < 2) return null
  const h = history.slice(-30)
  const min = Math.min(...h) - 10
  const max = Math.max(...h) + 10
  const range = max - min || 1
  const w = 120, ht = 32
  const points = h.map((v, i) => `${(i / (h.length - 1)) * w},${ht - ((v - min) / range) * ht}`).join(' ')
  return (
    <svg width={w} height={ht} style={{ display: 'block' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function HUTable({ heroCards, villainCards, board, pot, heroIsBtn, heroLabel, villainLabel, showVillain, boardKey }) {
  return (
    <div style={{
      position: 'relative', width: '100%', paddingBottom: '55%',
      userSelect: 'none', overflow: 'hidden',
    }}>
      {/* CSS animations */}
      <style>{`
        @keyframes bubblePop {
          0% { transform: scale(0.6); opacity: 0; }
          60% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes cardDeal {
          0% { transform: translateY(-8px) scale(0.8); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>

      {/* Mesa oval */}
      <div style={{
        position: 'absolute',
        top: '10%', left: '10%', right: '10%', bottom: '10%',
        borderRadius: 999,
        border: '1.5px solid #3a3a42',
        background: '#161618',
      }} />

      {/* Villain (topo) */}
      <div style={{
        position: 'absolute', top: '2%', left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, zIndex: 5,
      }}>
        <ActionBubble label={villainLabel} isNew />
        <div style={{
          padding: '4px 12px', borderRadius: 6,
          background: '#2a2a2e', border: '1px solid #e5484d',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#e5484d' }}>
            {heroIsBtn ? 'BB' : 'SB'}
          </div>
          <div style={{ fontSize: 9, color: '#676671', fontFamily: 'JetBrains Mono' }}>Bot GTO</div>
        </div>
        <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
          {showVillain && villainCards
            ? villainCards.map((c, i) => <Card key={i} card={parseCard(c)} size="sm" />)
            : [0, 1].map(i => <CardBack key={i} />)
          }
        </div>
      </div>

      {/* Centro: board + pot */}
      <div style={{
        position: 'absolute', top: '44%', left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center', pointerEvents: 'none',
      }}>
        {board.length > 0 && (
          <div key={boardKey} style={{ display: 'flex', gap: 3, justifyContent: 'center', marginBottom: 6 }}>
            {board.map((c, i) => (
              <BoardCard key={`${boardKey}-${i}`} card={c} index={i} totalVisible={board.length} />
            ))}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
          <div style={{ position: 'relative', width: 14, height: 16 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                position: 'absolute', bottom: i * 3, left: 0,
                width: 14, height: 6, borderRadius: 3,
                background: i === 2 ? '#4fce82' : i === 1 ? '#3ab870' : '#2a9a5a',
                border: '1px solid rgba(0,0,0,0.25)',
              }} />
            ))}
          </div>
          <span style={{ color: '#b3b3b8', fontSize: 12, fontWeight: 600, fontFamily: 'JetBrains Mono' }}>
            {pot.toFixed(1)}bb
          </span>
        </div>
      </div>

      {/* Dealer button */}
      <div style={{
        position: 'absolute',
        top: heroIsBtn ? '68%' : '8%',
        left: heroIsBtn ? '64%' : '64%',
        width: 16, height: 16, borderRadius: '50%',
        background: '#fdfdfd', color: '#0f0f0f',
        fontSize: 8, fontWeight: 900,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10,
      }}>D</div>

      {/* Hero (fundo) */}
      <div style={{
        position: 'absolute', bottom: '0%', left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, zIndex: 5,
      }}>
        <div style={{ display: 'flex', gap: 3, marginBottom: 2 }}>
          {heroCards.map((c, i) => <Card key={i} card={parseCard(c)} size="md" />)}
        </div>
        <div style={{
          padding: '4px 12px', borderRadius: 6,
          background: '#2a2a2e', border: '1px solid #4fce82',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#4fce82' }}>
            {heroIsBtn ? 'SB' : 'BB'}
          </div>
          <div style={{ fontSize: 9, color: '#676671', fontFamily: 'JetBrains Mono' }}>Voce</div>
        </div>
        <ActionBubble label={heroLabel} isNew />
      </div>
    </div>
  )
}

// ─── Streets ──────────────────────────────────────────────
const STREETS = ['preflop', 'flop', 'turn', 'river', 'showdown']

function streetName(s) {
  return { preflop: 'Pre-Flop', flop: 'Flop', turn: 'Turn', river: 'River', showdown: 'Showdown' }[s] || s
}

// ─── Blind structure (sobe a cada 5 maos) ─────────────────
const BLIND_LEVELS = [
  { sb: 1, bb: 2 },
  { sb: 2, bb: 4 },
  { sb: 3, bb: 6 },
  { sb: 5, bb: 10 },
  { sb: 7, bb: 14 },
  { sb: 10, bb: 20 },
  { sb: 15, bb: 30 },
  { sb: 20, bb: 40 },
  { sb: 30, bb: 60 },
  { sb: 50, bb: 100 },
  { sb: 75, bb: 150 },
  { sb: 100, bb: 200 },
]
const HANDS_PER_LEVEL = 5
const STARTING_STACK = 500

// ─── Rating ELO ─────────────────────────────────────────
const RATING_KEY = 'poker-arena-rating'
const STARTING_RATING = 1200

// Niveis de rating
const RATING_TIERS = [
  { min: 0, max: 999, label: 'Bronze', color: '#cd7f32' },
  { min: 1000, max: 1299, label: 'Prata', color: '#b3b3b8' },
  { min: 1300, max: 1599, label: 'Ouro', color: '#f5a623' },
  { min: 1600, max: 1899, label: 'Platina', color: '#00b4d8' },
  { min: 1900, max: 2199, label: 'Diamante', color: '#a855f7' },
  { min: 2200, max: 9999, label: 'Elite', color: '#e5484d' },
]

function getRatingTier(rating) {
  return RATING_TIERS.find(t => rating >= t.min && rating <= t.max) || RATING_TIERS[0]
}

// Dificuldade da situação (afeta quanto ganha/perde)
function spotDifficulty(strength, lastBet, pot, street) {
  // Decisões fáceis: monster bet, air fold
  if (strength === 'monster' && lastBet === 0) return 0.5
  if (strength === 'air' && lastBet > 0) return 0.5
  // Decisões difíceis: draws com pot odds borderline, marginal facing bet
  if (strength === 'draw') return 1.5
  if (strength === 'marginal' && lastBet > 0) return 1.8
  // Bluff spots
  if ((strength === 'weak' || strength === 'air') && lastBet === 0) return 1.4
  // Thin value
  if (strength === 'good' && street === 'river') return 1.3
  return 1.0
}

// Calcula mudança de rating por decisão
function calcRatingChange(isCorrect, strength, lastBet, pot, street, currentRating) {
  const basePoints = 8
  const difficulty = spotDifficulty(strength, lastBet, pot, street)

  // K-factor diminui conforme rating sobe (mais difícil subir no topo)
  const kFactor = currentRating < 1400 ? 1.2 : currentRating < 1800 ? 1.0 : 0.8

  if (isCorrect) {
    return Math.round(basePoints * difficulty * kFactor)
  } else {
    // Perde mais por erros fáceis, menos por erros difíceis
    return -Math.round(basePoints * (2.0 - difficulty * 0.5) * kFactor)
  }
}

function loadRating() {
  try {
    const raw = localStorage.getItem(RATING_KEY)
    if (!raw) return { rating: STARTING_RATING, peak: STARTING_RATING, history: [] }
    return JSON.parse(raw)
  } catch { return { rating: STARTING_RATING, peak: STARTING_RATING, history: [] } }
}

function saveRating(data) {
  try { localStorage.setItem(RATING_KEY, JSON.stringify(data)) } catch {}
}

// ─── localStorage helpers ─────────────────────────────────
const STORAGE_KEY = 'poker-arena-match'

function saveMatch(match) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(match)) } catch {}
}

function loadMatch() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function clearMatch() {
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
}

// ─── Componente principal ─────────────────────────────────
export default function Arena() {
  // Match = partida longa (muitas maos ate alguem zerar)
  const [match, setMatch] = useState(() => loadMatch())
  const [gameState, setGameState] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [betSize, setBetSize] = useState(0)
  const [ratingData, setRatingData] = useState(() => loadRating())
  const [ratingDelta, setRatingDelta] = useState(null) // +N ou -N pra animar

  // Persist match on every change
  const updateMatch = useCallback((updater) => {
    setMatch(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (next) saveMatch(next)
      return next
    })
  }, [])

  const getBlinds = useCallback((handNum) => {
    const levelIdx = Math.min(Math.floor(handNum / HANDS_PER_LEVEL), BLIND_LEVELS.length - 1)
    return BLIND_LEVELS[levelIdx]
  }, [])

  const startMatch = useCallback(() => {
    const m = {
      heroStack: STARTING_STACK,
      villainStack: STARTING_STACK,
      handNum: 0,
      stats: { hands: 0, won: 0, correctActions: 0, totalActions: 0 },
      handHistory: [],
      matchOver: false,
      winner: null,
    }
    updateMatch(m)
    setGameState(null)
    setFeedback(null)
  }, [updateMatch])

  const startNewHand = useCallback(() => {
    if (!match || match.matchOver) return

    const deck = newDeck()
    const heroIsBtn = match.handNum % 2 === 0 // alternate positions
    const blinds = getBlinds(match.handNum)

    const heroCards = [deck[0], deck[1]]
    const villainCards = [deck[2], deck[3]]
    const fullBoard = [deck[4], deck[5], deck[6], deck[7], deck[8]]

    // Post blinds
    const heroPosts = heroIsBtn ? blinds.sb : blinds.bb
    const villainPosts = heroIsBtn ? blinds.bb : blinds.sb

    const gs = {
      heroCards,
      villainCards,
      fullBoard,
      board: [],
      street: 'preflop',
      heroIsBtn,
      heroInvested: heroPosts,
      villainInvested: villainPosts,
      lastBet: blinds.bb,
      heroActed: false,
      villainActed: false,
      actions: [],
      result: null,
      showVillain: false,
      blinds,
    }

    if (!heroIsBtn) {
      // Hero is BB, villain is SB — bot acts first pre-flop
      const botAction = botPreflopDecision(villainCards, true)
      if (botAction === 'raise') {
        const raiseSize = Math.round(blinds.bb * 2.5)
        gs.villainInvested = raiseSize
        gs.lastBet = raiseSize
        gs.actions = [{ who: 'villain', action: 'raise', label: `Raise ${raiseSize}` }]
      } else if (botAction === 'call') {
        gs.villainInvested = blinds.bb // complete to BB
        gs.lastBet = 0
        gs.actions = [{ who: 'villain', action: 'call', label: 'Complete' }]
      } else {
        // SB folds — hero wins the blinds
        resolveHand('hero', gs)
        gs.result = { winner: 'hero', heroEval: { label: 'SB foldou' }, villainEval: { label: 'Fold' }, pot: heroPosts + villainPosts }
        gs.showVillain = true
      }
      gs.villainActed = true
    }

    setGameState(gs)
    setFeedback(null)
  }, [match, getBlinds, updateMatch])

  // Resolve hand result — update stacks
  const resolveHand = useCallback((winner, gs) => {
    const heroInv = gs.heroInvested || 0
    const villainInv = gs.villainInvested || 0
    const pot = heroInv + villainInv

    updateMatch(prev => {
      if (!prev) return prev
      let newHeroStack, newVillainStack
      if (winner === 'hero') {
        newHeroStack = prev.heroStack - heroInv + pot
        newVillainStack = prev.villainStack - villainInv
      } else if (winner === 'villain') {
        newHeroStack = prev.heroStack - heroInv
        newVillainStack = prev.villainStack - villainInv + pot
      } else {
        newHeroStack = prev.heroStack
        newVillainStack = prev.villainStack
      }

      const matchOver = newHeroStack <= 0 || newVillainStack <= 0
      const heroEval = gs.board.length >= 3 ? evalHand(gs.heroCards, gs.board) : { label: '-' }
      const villainEval = gs.board.length >= 3 ? evalHand(gs.villainCards, gs.board) : { label: '-' }

      return {
        ...prev,
        heroStack: Math.max(0, newHeroStack),
        villainStack: Math.max(0, newVillainStack),
        handNum: prev.handNum + 1,
        stats: {
          ...prev.stats,
          hands: prev.stats.hands + 1,
          won: prev.stats.won + (winner === 'hero' ? 1 : winner === 'tie' ? 0.5 : 0),
        },
        handHistory: [{ heroCards: gs.heroCards, villainCards: gs.villainCards, board: gs.board || [], winner, pot, heroHand: heroEval.label, villainHand: villainEval.label }, ...prev.handHistory].slice(0, 20),
        matchOver,
        winner: matchOver ? (newHeroStack <= 0 ? 'villain' : 'hero') : null,
      }
    })
  }, [updateMatch])

  const advanceStreet = useCallback((gs) => {
    const nextStreets = { preflop: 'flop', flop: 'turn', turn: 'river', river: 'showdown' }
    const next = nextStreets[gs.street]

    if (next === 'showdown') {
      const board = gs.fullBoard
      const cmp = compareHands(gs.heroCards, gs.villainCards, board)
      const heroEval = evalHand(gs.heroCards, board)
      const villainEval = evalHand(gs.villainCards, board)
      const winner = cmp > 0 ? 'hero' : cmp < 0 ? 'villain' : 'tie'

      resolveHand(winner, { ...gs, board })

      return {
        ...gs,
        street: 'showdown',
        board,
        result: { winner, heroEval, villainEval, pot: (gs.heroInvested || 0) + (gs.villainInvested || 0) },
        showVillain: true,
      }
    }

    const boardLen = { flop: 3, turn: 4, river: 5 }[next] || 0
    const board = gs.fullBoard.slice(0, boardLen)

    // Posicao pos-flop: BB (OOP) age primeiro, SB/BTN (IP) age por ultimo
    // heroIsBtn = hero eh SB/BTN = IP pos-flop -> bot (BB) age primeiro
    const heroIsIP = gs.heroIsBtn
    const nextGs = {
      ...gs,
      street: next,
      board,
      lastBet: 0,
      heroActed: false,
      villainActed: false,
    }

    // Bot age primeiro se eh OOP (BB)
    if (heroIsIP) {
      const currentPot = (gs.heroInvested || 0) + (gs.villainInvested || 0)
      const botAction = botDecision(gs.villainCards, board, next, currentPot, 0, false)
      if (botAction === 'bet') {
        const sizePct = botBetSizing(gs.villainCards, board, next, currentPot, false)
        const bSize = Math.max(gs.blinds?.bb || 2, Math.round(currentPot * sizePct))
        nextGs.villainInvested = (gs.villainInvested || 0) + bSize
        nextGs.lastBet = bSize
        nextGs.villainActed = true
        nextGs.heroActed = false
        nextGs.actions = [...(gs.actions || []), { who: 'villain', action: 'bet', label: `Bet ${bSize}` }]
      } else {
        nextGs.villainActed = true
        nextGs.heroActed = false
        nextGs.actions = [...(gs.actions || []), { who: 'villain', action: 'check', label: 'Check' }]
      }
    }

    return nextGs
  }, [resolveHand])

  const handleHeroAction = useCallback((action, customSize) => {
    if (!gameState || gameState.result || gameState.heroActed) return

    const gs = { ...gameState }
    const heroStack = match?.heroStack || STARTING_STACK
    const heroRemaining = heroStack - (gs.heroInvested || 0)
    const villainStack = (match?.villainStack || STARTING_STACK)
    const villainRemaining = villainStack - (gs.villainInvested || 0)
    const currentPot = (gs.heroInvested || 0) + (gs.villainInvested || 0)

    // Record feedback
    let fb = null
    if (gs.street === 'preflop') {
      fb = getHeroPreflopFeedback(gs.heroCards, action, gs.heroIsBtn)
    } else {
      fb = getHeroFeedback(gs.heroCards, gs.board, action, currentPot, gs.lastBet)
    }
    if (fb) {
      const strength = gs.street === 'preflop' ? 'good' : handStrength(gs.heroCards, gs.board)
      const delta = calcRatingChange(fb.isCorrect, strength, gs.lastBet, currentPot, gs.street, ratingData.rating)
      const newRating = Math.max(0, ratingData.rating + delta)
      const newPeak = Math.max(ratingData.peak, newRating)
      const newHistory = [...(ratingData.history || []), newRating].slice(-50)
      const newRatingData = { rating: newRating, peak: newPeak, history: newHistory }
      setRatingData(newRatingData)
      saveRating(newRatingData)
      setRatingDelta(delta)
      fb.ratingDelta = delta

      setFeedback(fb)
      // Vibrar no celular
      try {
        if (navigator.vibrate) navigator.vibrate(fb.isCorrect ? [50] : [50, 30, 50])
      } catch {}
      updateMatch(prev => prev && ({
        ...prev,
        stats: {
          ...prev.stats,
          correctActions: prev.stats.correctActions + (fb.isCorrect ? 1 : 0),
          totalActions: prev.stats.totalActions + 1,
        },
      }))
    }

    // Handle fold
    if (action === 'fold') {
      resolveHand('villain', gs)
      setGameState({
        ...gs,
        result: { winner: 'villain', heroEval: { label: 'Fold' }, villainEval: { label: '-' }, pot: currentPot },
        showVillain: true,
      })
      return
    }

    // Hero bets or raises
    let addedChips = 0
    let heroLabel = ''

    if (action === 'bet' || action === 'raise') {
      const size = customSize || (action === 'raise' ? Math.max(gs.lastBet * 2.5, gs.blinds.bb * 2) : Math.round(currentPot * 0.66))
      const callPortion = gs.lastBet > 0 ? Math.min(gs.lastBet, heroRemaining) : 0
      const raiseAmount = Math.min(size, heroRemaining - callPortion)
      addedChips = callPortion + raiseAmount
      gs.heroInvested = (gs.heroInvested || 0) + addedChips
      gs.lastBet = raiseAmount
      const isAllIn = addedChips >= heroRemaining
      heroLabel = isAllIn ? `All-In ${addedChips}` : action === 'raise' ? `Raise ${raiseAmount}` : `Bet ${raiseAmount}`
    } else if (action === 'call') {
      addedChips = Math.min(gs.lastBet, heroRemaining)
      gs.heroInvested = (gs.heroInvested || 0) + addedChips
      gs.lastBet = 0
      heroLabel = `Call ${addedChips}`
    } else {
      heroLabel = 'Check'
    }

    gs.heroActed = true
    gs.actions = [...gs.actions, { who: 'hero', action, label: heroLabel }]

    // Bot responds to hero bet/raise
    if (action === 'bet' || action === 'raise') {
      const newPot = (gs.heroInvested || 0) + (gs.villainInvested || 0)
      const botAction = gs.street === 'preflop'
        ? botPreflopDecision(gs.villainCards, !gs.heroIsBtn)
        : botDecision(gs.villainCards, gs.board, gs.street, newPot, gs.lastBet, !gs.heroIsBtn)

      if (botAction === 'fold') {
        resolveHand('hero', gs)
        setGameState({
          ...gs,
          result: { winner: 'hero', heroEval: { label: 'Villain Fold' }, villainEval: { label: 'Fold' }, pot: newPot },
          showVillain: true,
        })
        return
      }
      if (botAction === 'call') {
        const callAmt = Math.min(gs.lastBet, villainRemaining)
        gs.villainInvested = (gs.villainInvested || 0) + callAmt
        gs.lastBet = 0
        gs.actions = [...gs.actions, { who: 'villain', action: 'call', label: `Call ${callAmt}` }]
        gs.villainActed = true
        const nextGs = advanceStreet(gs)
        setGameState(nextGs)
        return
      }
      if (botAction === 'raise') {
        // Bot re-raises — hero needs to act again (real decision)
        const str = handStrength(gs.villainCards, gs.board)
        const mult = str === 'monster' || str === 'air' ? 3 : 2.5
        const callFirst = Math.min(gs.lastBet, villainRemaining)
        const raiseAmt = Math.min(Math.round(gs.lastBet * mult), villainRemaining - callFirst)
        gs.villainInvested = (gs.villainInvested || 0) + callFirst + raiseAmt
        gs.lastBet = raiseAmt
        gs.actions = [...gs.actions, { who: 'villain', action: 'raise', label: `Raise ${raiseAmt}` }]
        gs.villainActed = true
        gs.heroActed = false // Hero must respond
        setGameState({ ...gs })
        setFeedback(null)
        return
      }
    }

    // Hero checked
    if (action === 'check') {
      if (!gs.villainActed) {
        // Villain acts after hero check (hero is OOP)
        const cp = (gs.heroInvested || 0) + (gs.villainInvested || 0)
        const botAction = botDecision(gs.villainCards, gs.board, gs.street, cp, 0, true)
        if (botAction === 'bet') {
          const sizePct = botBetSizing(gs.villainCards, gs.board, gs.street, cp, true)
          const bSize = Math.max(gs.blinds?.bb || 2, Math.round(cp * sizePct))
          gs.villainInvested = (gs.villainInvested || 0) + bSize
          gs.lastBet = bSize
          gs.villainActed = true
          gs.heroActed = false // Hero can check-raise
          gs.actions = [...gs.actions, { who: 'villain', action: 'bet', label: `Bet ${bSize}` }]
          setGameState({ ...gs })
          setFeedback(null)
          return
        }
        // Both checked
        gs.villainActed = true
        gs.actions = [...gs.actions, { who: 'villain', action: 'check', label: 'Check' }]
        const nextGs = advanceStreet(gs)
        setGameState(nextGs)
        return
      }
      // Hero checked after villain already acted (both done)
      const nextGs = advanceStreet(gs)
      setGameState(nextGs)
      return
    }

    // Hero called a bet
    if (action === 'call') {
      gs.villainActed = true
      const nextGs = advanceStreet(gs)
      setGameState(nextGs)
      return
    }

    const nextGs = advanceStreet(gs)
    setGameState(nextGs)
  }, [gameState, match, advanceStreet, resolveHand, updateMatch, ratingData])

  // Sizing limits for the slider
  const sizingInfo = useMemo(() => {
    if (!gameState || gameState.result || !match) return null
    const heroRemaining = match.heroStack - (gameState.heroInvested || 0)
    const bb = gameState.blinds?.bb || 2
    const facingBet = gameState.lastBet > 0
    const currentPot = (gameState.heroInvested || 0) + (gameState.villainInvested || 0)

    if (facingBet) {
      const minRaise = Math.min(gameState.lastBet * 2, heroRemaining)
      return { minBet: minRaise, maxBet: heroRemaining, defaultBet: Math.min(Math.round(gameState.lastBet * 2.5), heroRemaining), canBet: heroRemaining > gameState.lastBet, action: 'raise' }
    }
    const minBet = Math.min(bb, heroRemaining)
    return { minBet, maxBet: heroRemaining, defaultBet: Math.min(Math.round(currentPot * 0.66), heroRemaining), canBet: true, action: 'bet' }
  }, [gameState, match])

  // Reset betSize when sizing context changes
  const prevSizingRef = useRef(null)
  if (sizingInfo && sizingInfo !== prevSizingRef.current) {
    if (prevSizingRef.current?.defaultBet !== sizingInfo.defaultBet) {
      setBetSize(sizingInfo.defaultBet)
    }
    prevSizingRef.current = sizingInfo
  }

  // Check match over
  const matchOver = match?.matchOver
  const blinds = match ? getBlinds(match.handNum) : BLIND_LEVELS[0]
  const handsUntilBlindUp = match ? (HANDS_PER_LEVEL - (match.handNum % HANDS_PER_LEVEL)) : HANDS_PER_LEVEL
  const acc = match?.stats.totalActions > 0 ? Math.round((match.stats.correctActions / match.stats.totalActions) * 100) : 0
  const winRate = match?.stats.hands > 0 ? Math.round((match.stats.won / match.stats.hands) * 100) : 0

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-16" style={{ background: '#0f0f0f' }}>
      <div className="max-w-lg mx-auto px-4 pt-6">

        {/* Header + Rating Badge */}
        <div className="text-center mb-4">
          <h1 style={{ color: 'white', fontSize: 22, fontWeight: 700, fontFamily: 'Poppins' }}>
            Arena HU
          </h1>
          <div className="flex items-center justify-center gap-3 mt-1">
            <p style={{ color: '#676671', fontSize: 13 }}>Heads-Up vs Bot GTO</p>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full" style={{
              background: `${getRatingTier(ratingData.rating).color}15`,
              border: `1px solid ${getRatingTier(ratingData.rating).color}40`,
            }}>
              <span style={{ color: getRatingTier(ratingData.rating).color, fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                {ratingData.rating}
              </span>
              <span style={{ color: getRatingTier(ratingData.rating).color, fontSize: 10, fontWeight: 600 }}>
                {getRatingTier(ratingData.rating).label}
              </span>
            </div>
          </div>
        </div>

        {/* No match started */}
        {!match ? (
          <div className="text-center" style={{ paddingTop: 40 }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>♠♥</div>
            {/* Rating card */}
            <div className="inline-flex flex-col items-center gap-1 mb-5 px-6 py-3 rounded-xl" style={{
              background: '#1a1a1d', border: `1px solid ${getRatingTier(ratingData.rating).color}40`,
            }}>
              <span style={{ color: getRatingTier(ratingData.rating).color, fontSize: 28, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                {ratingData.rating}
              </span>
              <span style={{ color: getRatingTier(ratingData.rating).color, fontSize: 14, fontWeight: 600 }}>
                {getRatingTier(ratingData.rating).label}
              </span>
              {ratingData.peak > STARTING_RATING && (
                <span style={{ color: '#676671', fontSize: 11 }}>Pico: {ratingData.peak}</span>
              )}
              {ratingData.history?.length >= 2 && (
                <div style={{ marginTop: 4 }}>
                  <RatingChart history={ratingData.history} color={getRatingTier(ratingData.rating).color} />
                </div>
              )}
            </div>
            <p style={{ color: '#b3b3b8', fontSize: 15, marginBottom: 24, lineHeight: 1.6 }}>
              Jogue Heads-Up contra um bot GTO.<br />
              500 vs 500 fichas. Blinds sobem a cada 5 maos.<br />
              Cada decisao afeta seu rating.
            </p>
            <button onClick={startMatch}
              className="px-10 py-4 rounded-xl font-bold text-lg"
              style={{ background: '#4fce82', color: '#0f0f0f', border: 'none', cursor: 'pointer' }}>
              Iniciar Partida
            </button>
          </div>
        ) : matchOver ? (
          /* Match over */
          <div className="text-center" style={{ paddingTop: 30 }}>
            <div style={{ fontSize: 60, marginBottom: 12 }}>{match.winner === 'hero' ? '🏆' : '💀'}</div>
            <h2 style={{ color: match.winner === 'hero' ? '#4fce82' : '#e5484d', fontSize: 28, fontWeight: 700 }}>
              {match.winner === 'hero' ? 'Voce venceu!' : 'Bot venceu'}
            </h2>
            <div className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full" style={{
              background: `${getRatingTier(ratingData.rating).color}15`,
              border: `1px solid ${getRatingTier(ratingData.rating).color}40`,
            }}>
              <span style={{ color: getRatingTier(ratingData.rating).color, fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                {ratingData.rating}
              </span>
              <span style={{ color: getRatingTier(ratingData.rating).color, fontSize: 13, fontWeight: 600 }}>
                {getRatingTier(ratingData.rating).label}
              </span>
              {ratingData.peak > ratingData.rating && (
                <span style={{ color: '#676671', fontSize: 11 }}>(pico: {ratingData.peak})</span>
              )}
            </div>
            {ratingData.history?.length >= 2 && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
                <RatingChart history={ratingData.history} color={getRatingTier(ratingData.rating).color} />
              </div>
            )}
            <div style={{ color: '#b3b3b8', fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
              {match.stats.hands} maos jogadas · Win rate {winRate}% · Acerto GTO {acc}%
            </div>
            <div className="flex gap-3 justify-center mt-6">
              <button onClick={() => { clearMatch(); setMatch(null); setGameState(null) }}
                className="px-6 py-3 rounded-xl font-bold"
                style={{ background: '#2a2a2e', color: '#b3b3b8', border: 'none', cursor: 'pointer' }}>
                Menu
              </button>
              <button onClick={startMatch}
                className="px-6 py-3 rounded-xl font-bold"
                style={{ background: '#4fce82', color: '#0f0f0f', border: 'none', cursor: 'pointer' }}>
                Revanche
              </button>
            </div>
          </div>
        ) : (
          /* Active match */
          <div>
            {/* Stacks + Blinds HUD */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="rounded-xl py-2 text-center" style={{ background: '#1a1a1d', border: '1px solid #4fce8244' }}>
                <div style={{ color: '#4fce82', fontSize: 18, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{match.heroStack}</div>
                <div style={{ color: '#676671', fontSize: 10 }}>Voce</div>
              </div>
              <div className="rounded-xl py-2 text-center" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
                <div style={{ color: '#f5a623', fontSize: 14, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{blinds.sb}/{blinds.bb}</div>
                <div style={{ color: '#676671', fontSize: 10 }}>Blinds · sobe em {handsUntilBlindUp}</div>
              </div>
              <div className="rounded-xl py-2 text-center" style={{ background: '#1a1a1d', border: '1px solid #e5484d44' }}>
                <div style={{ color: '#e5484d', fontSize: 18, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{match.villainStack}</div>
                <div style={{ color: '#676671', fontSize: 10 }}>Bot</div>
              </div>
            </div>

            {/* Stats bar */}
            <div className="flex gap-3 mb-3 justify-center">
              <span style={{ color: '#676671', fontSize: 11 }}>Mao #{match.handNum + 1}</span>
              <span style={{ color: '#676671', fontSize: 11 }}>·</span>
              <span style={{ color: '#676671', fontSize: 11 }}>Win {winRate}%</span>
              <span style={{ color: '#676671', fontSize: 11 }}>·</span>
              <span style={{ color: '#676671', fontSize: 11 }}>GTO {acc}%</span>
            </div>

            {/* No hand in progress — deal */}
            {!gameState || (gameState.result && !matchOver) ? (
              <div>
                {/* Show last hand result if exists */}
                {gameState?.result && (
                  <div className="rounded-xl p-4 mb-3" style={{
                    background: gameState.result.winner === 'hero' ? 'rgba(79,206,130,0.1)' : gameState.result.winner === 'tie' ? 'rgba(245,166,35,0.1)' : 'rgba(229,72,77,0.1)',
                    border: `1px solid ${gameState.result.winner === 'hero' ? '#4fce82' : gameState.result.winner === 'tie' ? '#f5a623' : '#e5484d'}`,
                  }}>
                    <div style={{
                      color: gameState.result.winner === 'hero' ? '#4fce82' : gameState.result.winner === 'tie' ? '#f5a623' : '#e5484d',
                      fontWeight: 700, fontSize: 16, marginBottom: 4,
                    }}>
                      {gameState.result.winner === 'hero' ? 'Voce ganhou!' : gameState.result.winner === 'tie' ? 'Empate' : 'Bot ganhou'}
                      <span style={{ fontSize: 13, fontWeight: 500, marginLeft: 8 }}>
                        Pot: {gameState.result.pot.toFixed(0)}
                      </span>
                    </div>
                    {gameState.showVillain && (
                      <div style={{ color: '#b3b3b8', fontSize: 12 }}>
                        Voce: <strong style={{ color: '#4fce82' }}>{gameState.result.heroEval.label}</strong>
                        {' · '}
                        Bot: <strong style={{ color: '#e5484d' }}>{gameState.result.villainEval.label}</strong>
                      </div>
                    )}
                  </div>
                )}

                <button onClick={startNewHand}
                  style={{
                    width: '100%', padding: '14px', borderRadius: 8,
                    background: '#4fce82', border: 'none',
                    color: '#0f0f0f', fontWeight: 600, fontSize: 15,
                    cursor: 'pointer',
                  }}>
                  {gameState ? 'Proxima Mao >' : 'Comecar Mao #1'}
                </button>

                {/* Hand history */}
                {match.handHistory.length > 0 && (
                  <div className="rounded-xl p-3 mt-3" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
                    <div style={{ color: '#676671', fontSize: 11, fontWeight: 600, marginBottom: 8 }}>HISTORICO</div>
                    <div className="space-y-2">
                      {match.handHistory.slice(0, 8).map((h, i) => (
                        <div key={i} className="flex items-center gap-2" style={{ fontSize: 12 }}>
                          <span style={{
                            color: h.winner === 'hero' ? '#4fce82' : h.winner === 'tie' ? '#f5a623' : '#e5484d',
                            fontWeight: 700, width: 14,
                          }}>
                            {h.winner === 'hero' ? 'W' : h.winner === 'tie' ? 'T' : 'L'}
                          </span>
                          <div className="flex gap-1">
                            {h.heroCards.map((c, j) => <Card key={j} card={parseCard(c)} size="xs" />)}
                          </div>
                          <span style={{ color: '#676671', fontSize: 10 }}>vs</span>
                          <div className="flex gap-1">
                            {h.villainCards.map((c, j) => <Card key={j} card={parseCard(c)} size="xs" />)}
                          </div>
                          <span style={{ color: '#676671', fontSize: 10, flex: 1, textAlign: 'right' }}>
                            {h.heroHand && h.heroHand !== '-' ? h.heroHand : ''}
                            {h.heroHand && h.heroHand !== '-' && h.villainHand && h.villainHand !== '-' ? ' vs ' : ''}
                            {h.villainHand && h.villainHand !== '-' ? h.villainHand : ''}
                          </span>
                          <span style={{ color: '#b3b3b8', fontSize: 11, fontWeight: 600, fontFamily: 'JetBrains Mono', minWidth: 28, textAlign: 'right' }}>
                            {h.pot.toFixed(0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Abandon match */}
                <button onClick={() => { clearMatch(); setMatch(null); setGameState(null) }}
                  className="w-full mt-3 py-2 rounded-lg text-sm"
                  style={{ background: 'transparent', color: '#676671', border: '1px solid #2a2a2e', cursor: 'pointer' }}>
                  Abandonar partida
                </button>
              </div>
            ) : (
              /* Hand in progress */
              <div>
                {/* Street indicator */}
                <div className="flex gap-1 mb-3 justify-center">
                  {STREETS.slice(0, -1).map(s => (
                    <div key={s} className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{
                        background: s === gameState.street ? '#4fce8222' : '#1a1a1d',
                        color: s === gameState.street ? '#4fce82' : '#676671',
                        border: `1px solid ${s === gameState.street ? '#4fce82' : '#2a2a2e'}`,
                      }}>
                      {streetName(s)}
                    </div>
                  ))}
                </div>

                {/* Mesa */}
                <div className="rounded-2xl mb-3" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e', padding: '8px 4px' }}>
                  <HUTable
                    heroCards={gameState.heroCards}
                    villainCards={gameState.villainCards}
                    board={gameState.board}
                    pot={(gameState.heroInvested || 0) + (gameState.villainInvested || 0)}
                    heroIsBtn={gameState.heroIsBtn}
                    showVillain={gameState.showVillain}
                    heroLabel={gameState.actions.filter(a => a.who === 'hero').slice(-1)[0]?.label}
                    villainLabel={gameState.actions.filter(a => a.who === 'villain').slice(-1)[0]?.label}
                    boardKey={`${gameState.street}-${gameState.board.length}`}
                  />
                </div>

                {/* Action log */}
                {gameState.actions.length > 0 && (
                  <div className="rounded-xl px-3 py-2 mb-3" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
                    <div className="flex flex-wrap gap-2">
                      {gameState.actions.map((a, i) => (
                        <span key={i} style={{
                          fontSize: 11, fontWeight: 600,
                          color: a.who === 'hero' ? '#4fce82' : '#e5484d',
                        }}>
                          {a.who === 'hero' ? 'Voce' : 'Bot'}: {a.label}
                          {i < gameState.actions.length - 1 ? ' →' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Feedback */}
                {feedback && !gameState.result && (
                  <div className="rounded-xl px-4 py-3 mb-3" style={{
                    background: feedback.isCorrect ? 'rgba(79,206,130,0.08)' : 'rgba(229,72,77,0.08)',
                    border: `1px solid ${feedback.isCorrect ? 'rgba(79,206,130,0.25)' : 'rgba(229,72,77,0.25)'}`,
                  }}>
                    <div className="flex items-center justify-between">
                      <span style={{ color: feedback.isCorrect ? '#4fce82' : '#e5484d', fontWeight: 700, fontSize: 14 }}>
                        {feedback.isCorrect ? 'Boa jogada!' : `Melhor jogada: ${feedback.recommended.toUpperCase()}`}
                      </span>
                      {feedback.ratingDelta != null && (
                        <span style={{
                          color: feedback.ratingDelta >= 0 ? '#4fce82' : '#e5484d',
                          fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono',
                        }}>
                          {feedback.ratingDelta >= 0 ? '+' : ''}{feedback.ratingDelta}
                        </span>
                      )}
                    </div>
                    <div style={{ color: '#b3b3b8', fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>{feedback.reason}</div>
                    {!feedback.isCorrect && feedback.acceptable?.length > 0 && (
                      <div style={{ color: '#676671', fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>
                        Tambem aceitavel: {feedback.acceptable.map(a => a.toUpperCase()).join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="mb-4">
                  {!gameState.heroActed ? (
                    <div>
                      {/* Slider de sizing */}
                      {sizingInfo && sizingInfo.canBet && (
                        <div className="rounded-xl px-4 py-3 mb-3" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
                          <div className="flex items-center justify-between mb-2">
                            <span style={{ color: '#676671', fontSize: 11, fontWeight: 600 }}>
                              {gameState.lastBet > 0 ? 'RAISE' : 'BET'}
                            </span>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={betSize}
                                onChange={e => {
                                  const v = Math.max(sizingInfo.minBet, Math.min(sizingInfo.maxBet, Number(e.target.value) || 0))
                                  setBetSize(v)
                                }}
                                style={{
                                  width: 60, background: '#2a2a2e', border: '1px solid #3a3a42', borderRadius: 6,
                                  color: '#fdfdfd', fontSize: 14, fontWeight: 700, fontFamily: 'JetBrains Mono',
                                  textAlign: 'center', padding: '4px 6px', outline: 'none',
                                }}
                              />
                            </div>
                          </div>
                          <input
                            type="range"
                            min={sizingInfo.minBet}
                            max={sizingInfo.maxBet}
                            step={1}
                            value={betSize}
                            onChange={e => setBetSize(Number(e.target.value))}
                            style={{ width: '100%', accentColor: '#4fce82', cursor: 'pointer' }}
                          />
                          <div className="flex justify-between mt-1" style={{ fontSize: 10, color: '#676671' }}>
                            <span>Min {sizingInfo.minBet}</span>
                            <div className="flex gap-2">
                              {[0.33, 0.5, 0.66, 1].map(pct => {
                                const val = Math.min(Math.round(((gameState.heroInvested || 0) + (gameState.villainInvested || 0)) * pct), sizingInfo.maxBet)
                                return (
                                  <button key={pct} onClick={() => setBetSize(val)}
                                    style={{
                                      padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                                      background: '#2a2a2e', color: '#b3b3b8', border: 'none', cursor: 'pointer',
                                    }}>
                                    {pct === 1 ? 'Pot' : `${Math.round(pct * 100)}%`}
                                  </button>
                                )
                              })}
                              <button onClick={() => setBetSize(sizingInfo.maxBet)}
                                style={{
                                  padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                                  background: '#ff8f00', color: '#0f0f0f', border: 'none', cursor: 'pointer',
                                }}>
                                All-In
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Botoes de acao */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleHeroAction('fold')}
                          style={{
                            flex: 1, padding: '14px 4px', borderRadius: 8,
                            fontWeight: 600, fontSize: 13, border: 'none',
                            cursor: 'pointer', color: '#0f0f0f', background: '#e5484d',
                          }}>
                          Fold
                        </button>
                        {gameState.lastBet > 0 ? (
                          <>
                            <button onClick={() => handleHeroAction('call')}
                              style={{
                                flex: 1, padding: '14px 4px', borderRadius: 8,
                                fontWeight: 600, fontSize: 13, border: 'none',
                                cursor: 'pointer', color: '#0f0f0f', background: '#0a84d7',
                              }}>
                              Call {gameState.lastBet.toFixed(0)}
                            </button>
                            {sizingInfo?.canBet && (
                              <button onClick={() => handleHeroAction('raise', betSize)}
                                style={{
                                  flex: 1, padding: '14px 4px', borderRadius: 8,
                                  fontWeight: 600, fontSize: 13, border: 'none',
                                  cursor: 'pointer', color: '#0f0f0f',
                                  background: betSize >= sizingInfo.maxBet ? '#ff8f00' : '#4fce82',
                                }}>
                                {betSize >= sizingInfo.maxBet ? `All-In` : `Raise ${betSize}`}
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleHeroAction('check')}
                              style={{
                                flex: 1, padding: '14px 4px', borderRadius: 8,
                                fontWeight: 600, fontSize: 13, border: 'none',
                                cursor: 'pointer', color: '#0f0f0f', background: '#0a84d7',
                              }}>
                              Check
                            </button>
                            <button onClick={() => handleHeroAction('bet', betSize)}
                              style={{
                                flex: 1, padding: '14px 4px', borderRadius: 8,
                                fontWeight: 600, fontSize: 13, border: 'none',
                                cursor: 'pointer', color: '#0f0f0f',
                                background: betSize >= sizingInfo?.maxBet ? '#ff8f00' : '#4fce82',
                              }}>
                              {betSize >= sizingInfo?.maxBet ? `All-In` : `Bet ${betSize}`}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => {
                      const nextGs = advanceStreet(gameState)
                      setGameState(nextGs)
                      setFeedback(null)
                    }}
                    style={{
                      width: '100%', padding: '14px', borderRadius: 8,
                      background: '#f5a623', border: 'none',
                      color: '#0f0f0f', fontWeight: 600, fontSize: 15,
                      cursor: 'pointer',
                    }}>
                      Proximo Street &gt;
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
