import { useState } from 'react'

// ================================================================
// Parsing de Hand History (PokerStars / generico)
// ================================================================

const RANKS_ORDER = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 }

function normalizeCard(card) {
  if (!card || card.length < 2) return null
  let r = card[0].toUpperCase()
  if (r === '1' && card[1] === '0') { r = 'T'; card = 'T' + card.slice(2) }
  const s = card[card.length - 1].toLowerCase()
  if (!RANKS_ORDER[r]) return null
  if (!['s', 'h', 'd', 'c'].includes(s)) return null
  return r + s
}

function parseHandHistory(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 3) return null

  const result = {
    heroHand: null,
    heroPos: null,
    board: { flop: [], turn: null, river: null },
    actions: { preflop: [], flop: [], turn: [], river: [] },
    potSize: 0,
    players: {},
    blinds: { sb: 0, bb: 0 },
    rawText: text,
  }

  let currentStreet = 'preflop'
  let heroName = null

  for (const line of lines) {
    const lower = line.toLowerCase()

    // Detect hero
    const dealtMatch = line.match(/Dealt to (.+?) \[(.+)\]/i)
    if (dealtMatch) {
      heroName = dealtMatch[1]
      const cards = dealtMatch[2].split(/\s+/).map(normalizeCard).filter(Boolean)
      result.heroHand = cards
      continue
    }

    // Detect blinds
    const sbMatch = line.match(/(.+?):\s*posts small blind\s*(\d+)/i)
    if (sbMatch) {
      result.blinds.sb = parseInt(sbMatch[2])
      result.players[sbMatch[1].trim()] = { pos: 'SB' }
      continue
    }
    const bbMatch = line.match(/(.+?):\s*posts big blind\s*(\d+)/i)
    if (bbMatch) {
      result.blinds.bb = parseInt(bbMatch[2])
      result.players[bbMatch[1].trim()] = { pos: 'BB' }
      continue
    }

    // Detect streets
    if (lower.includes('*** flop ***') || lower.includes('*** flop ***')) {
      currentStreet = 'flop'
      const boardMatch = line.match(/\[(.+)\]/)
      if (boardMatch) {
        result.board.flop = boardMatch[1].split(/\s+/).map(normalizeCard).filter(Boolean)
      }
      continue
    }
    if (lower.includes('*** turn ***')) {
      currentStreet = 'turn'
      const turnMatch = line.match(/\]\s*\[(.+?)\]/)
      if (turnMatch) result.board.turn = normalizeCard(turnMatch[1].trim())
      continue
    }
    if (lower.includes('*** river ***')) {
      currentStreet = 'river'
      const riverMatch = line.match(/\]\s*\[(.+?)\]/)
      if (riverMatch) result.board.river = normalizeCard(riverMatch[1].trim())
      continue
    }

    // Detect actions
    const actionMatch = line.match(/^(.+?):\s*(folds|checks|calls|bets|raises|all-in)[\s$]*(\d+)?/i)
    if (actionMatch) {
      const player = actionMatch[1].trim()
      const action = actionMatch[2].toLowerCase()
      const amount = actionMatch[3] ? parseInt(actionMatch[3]) : 0
      const isHero = heroName && player === heroName
      result.actions[currentStreet].push({ player, action, amount, isHero })
      continue
    }

    // Detect seat positions
    const seatMatch = line.match(/Seat \d+:\s*(.+?)\s*\((\d+)\s*in chips\)/i)
    if (seatMatch) {
      const name = seatMatch[1].trim()
      if (!result.players[name]) result.players[name] = {}
      result.players[name].stack = parseInt(seatMatch[2])
      continue
    }

    // Detect button
    const btnMatch = line.match(/Seat #(\d+) is the button/i)
    if (btnMatch) {
      result.buttonSeat = parseInt(btnMatch[1])
    }
  }

  // Detect hero position from seat info
  if (heroName && result.players[heroName]) {
    result.heroPos = result.players[heroName].pos || 'Unknown'
  }

  return result.heroHand ? result : null
}

// ================================================================
// Simplified hand input (manual)
// ================================================================

function parseSimpleInput(text) {
  const lower = text.toLowerCase().trim()

  // Try to parse: "AhKs on QhJd2c" or "AK vs QJ2" etc.
  const cardPattern = /[2-9tjqkaAKQJT][shdc]/g

  const allCards = lower.match(cardPattern)?.map(c => {
    const r = c[0].toUpperCase() === 'T' ? 'T' : c[0].toUpperCase()
    return r + c[1]
  }) || []

  if (allCards.length < 2) return null

  const heroHand = allCards.slice(0, 2)
  const board = allCards.slice(2, 7)

  return {
    heroHand,
    heroPos: null,
    board: {
      flop: board.slice(0, 3),
      turn: board[3] || null,
      river: board[4] || null,
    },
    actions: { preflop: [], flop: [], turn: [], river: [] },
    potSize: 0,
    players: {},
    blinds: { sb: 0, bb: 0 },
    rawText: text,
    isSimple: true,
  }
}

// ================================================================
// GTO Analysis Engine (local heuristics)
// ================================================================

function getHandStrength(heroCards, boardCards) {
  const all = [...heroCards, ...boardCards].map(c => ({ rank: c[0], suit: c[1], value: RANKS_ORDER[c[0]] }))
  const heroRanks = heroCards.map(c => ({ rank: c[0], suit: c[1], value: RANKS_ORDER[c[0]] }))
  const boardRanks = boardCards.map(c => ({ rank: c[0], suit: c[1], value: RANKS_ORDER[c[0]] }))

  const result = {
    category: 'high_card',
    strength: 0,
    draws: [],
    description: '',
  }

  // Check pairs, two pair, trips, sets, full house, quads
  const rankCounts = {}
  all.forEach(c => { rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1 })

  const boardRankCounts = {}
  boardRanks.forEach(c => { boardRankCounts[c.rank] = (boardRankCounts[c.rank] || 0) + 1 })

  const heroRankVals = heroRanks.map(c => c.value).sort((a, b) => b - a)

  // Quads
  const quads = Object.entries(rankCounts).find(([, c]) => c >= 4)
  if (quads) {
    result.category = 'quads'
    result.strength = 90
    result.description = `Quadra de ${quads[0]}`
    return result
  }

  // Full house
  const threeOfKind = Object.entries(rankCounts).find(([, c]) => c >= 3)
  const pair = Object.entries(rankCounts).find(([r, c]) => c >= 2 && (!threeOfKind || r !== threeOfKind[0]))
  if (threeOfKind && pair) {
    result.category = 'full_house'
    result.strength = 85
    result.description = `Full house: ${threeOfKind[0]} cheio de ${pair[0]}`
    return result
  }

  // Flush
  const suitCounts = {}
  all.forEach(c => { suitCounts[c.suit] = (suitCounts[c.suit] || []) ; suitCounts[c.suit].push(c.value) })
  // Fix: initialize arrays properly
  const suitArrays = {}
  all.forEach(c => { if (!suitArrays[c.suit]) suitArrays[c.suit] = []; suitArrays[c.suit].push(c.value) })
  const flushSuit = Object.entries(suitArrays).find(([, vals]) => vals.length >= 5)
  if (flushSuit) {
    const heroHasFlushCard = heroRanks.some(c => c.suit === flushSuit[0])
    if (heroHasFlushCard) {
      const maxHeroFlush = Math.max(...heroRanks.filter(c => c.suit === flushSuit[0]).map(c => c.value))
      result.category = 'flush'
      result.strength = maxHeroFlush === 14 ? 82 : maxHeroFlush >= 13 ? 78 : 72
      result.description = `Flush de ${flushSuit[0] === 'h' ? 'copas' : flushSuit[0] === 'd' ? 'ouros' : flushSuit[0] === 'c' ? 'paus' : 'espadas'}${maxHeroFlush === 14 ? ' (nut)' : ''}`
      return result
    }
  }

  // Straight
  const uniqueVals = [...new Set(all.map(c => c.value))].sort((a, b) => a - b)
  if (uniqueVals.includes(14)) uniqueVals.unshift(1) // Ace low
  for (let i = uniqueVals.length - 1; i >= 4; i--) {
    const top5 = uniqueVals.slice(i - 4, i + 1)
    if (top5[4] - top5[0] === 4 && new Set(top5).size === 5) {
      const heroContributes = heroRankVals.some(v => top5.includes(v) || (v === 14 && top5.includes(1)))
      if (heroContributes) {
        result.category = 'straight'
        result.strength = top5[4] === 14 ? 70 : top5[4] >= 13 ? 68 : 64
        result.description = `Straight ate ${top5[4] === 14 ? 'A' : top5[4] === 13 ? 'K' : top5[4] === 12 ? 'Q' : top5[4]}`
        return result
      }
    }
  }

  // Three of a kind / set
  if (threeOfKind) {
    const isSet = heroRankVals.filter(v => v === RANKS_ORDER[threeOfKind[0]]).length >= 2
    result.category = isSet ? 'set' : 'trips'
    result.strength = isSet ? 65 : 55
    result.description = isSet ? `Set de ${threeOfKind[0]}` : `Trips de ${threeOfKind[0]}`
    return result
  }

  // Two pair
  const pairs = Object.entries(rankCounts).filter(([, c]) => c >= 2).map(([r]) => r)
  if (pairs.length >= 2) {
    const heroPairs = pairs.filter(r => heroRankVals.includes(RANKS_ORDER[r]))
    if (heroPairs.length >= 1) {
      result.category = 'two_pair'
      result.strength = 50
      result.description = `Dois pares: ${pairs.slice(0, 2).join(' e ')}`
      return result
    }
  }

  // One pair
  if (pairs.length === 1) {
    const pairRank = pairs[0]
    const pairVal = RANKS_ORDER[pairRank]
    const heroHasPair = heroRankVals.includes(pairVal)
    const boardHasPair = boardRankCounts[pairRank] >= 2

    if (heroHasPair && !boardHasPair) {
      // Hero made a pair with the board
      const boardMax = boardRanks.length > 0 ? Math.max(...boardRanks.map(c => c.value)) : 0
      if (pairVal >= boardMax) {
        const kicker = heroRankVals.find(v => v !== pairVal) || 0
        result.category = 'top_pair'
        result.strength = kicker >= 14 ? 42 : kicker >= 13 ? 38 : kicker >= 12 ? 35 : 30
        result.description = `Top pair de ${pairRank} (kicker ${kicker >= 14 ? 'A' : kicker >= 13 ? 'K' : kicker >= 12 ? 'Q' : kicker})`
      } else if (pairVal >= boardMax - 2) {
        result.category = 'middle_pair'
        result.strength = 22
        result.description = `Middle pair de ${pairRank}`
      } else {
        result.category = 'bottom_pair'
        result.strength = 15
        result.description = `Bottom pair de ${pairRank}`
      }
      return result
    } else if (heroRankVals[0] === heroRankVals[1]) {
      // Pocket pair
      if (heroRankVals[0] > (boardRanks.length > 0 ? Math.max(...boardRanks.map(c => c.value)) : 0)) {
        result.category = 'overpair'
        result.strength = 45
        result.description = `Overpair: ${heroCards[0][0]}${heroCards[0][0]}`
      } else {
        result.category = 'underpair'
        result.strength = 18
        result.description = `Underpair: ${heroCards[0][0]}${heroCards[0][0]}`
      }
      return result
    }
  }

  // Check pocket pair (no board pair)
  if (heroRankVals[0] === heroRankVals[1] && boardCards.length === 0) {
    result.category = 'pocket_pair'
    result.strength = heroRankVals[0] >= 12 ? 45 : heroRankVals[0] >= 9 ? 35 : 25
    result.description = `Pocket pair: ${heroCards[0][0]}${heroCards[0][0]}`
    return result
  }

  // High card
  result.category = 'high_card'
  result.strength = heroRankVals[0] >= 14 ? 12 : heroRankVals[0] >= 13 ? 10 : 5
  result.description = `High card: ${heroRankVals[0] >= 14 ? 'A' : heroRankVals[0] >= 13 ? 'K' : heroRankVals[0] >= 12 ? 'Q' : heroRankVals[0]}`

  return result
}

function countDraws(heroCards, boardCards) {
  if (boardCards.length < 3) return []
  const all = [...heroCards, ...boardCards]
  const draws = []

  // Flush draw
  const suitArrays = {}
  all.forEach(c => { const s = c[1]; if (!suitArrays[s]) suitArrays[s] = []; suitArrays[s].push(RANKS_ORDER[c[0]]) })
  for (const [suit, vals] of Object.entries(suitArrays)) {
    const heroHasSuit = heroCards.some(c => c[1] === suit)
    if (vals.length === 4 && heroHasSuit) {
      const maxHero = Math.max(...heroCards.filter(c => c[1] === suit).map(c => RANKS_ORDER[c[0]]))
      draws.push({ type: 'flush_draw', outs: 9, description: maxHero === 14 ? 'Nut flush draw' : 'Flush draw' })
    }
  }

  // Straight draw (OESD + gutshot)
  const uniqueVals = [...new Set(all.map(c => RANKS_ORDER[c[0]]))].sort((a, b) => a - b)
  if (uniqueVals.includes(14)) uniqueVals.unshift(1)

  let maxConsec = 0
  for (let i = 0; i < uniqueVals.length - 1; i++) {
    if (uniqueVals[i + 1] - uniqueVals[i] === 1) maxConsec++
    else maxConsec = 0

    if (maxConsec >= 3) {
      const heroContrib = heroCards.some(c => {
        const v = RANKS_ORDER[c[0]]
        return uniqueVals.slice(Math.max(0, i - 2), i + 3).includes(v)
      })
      if (heroContrib) {
        draws.push({ type: 'oesd', outs: 8, description: 'Open-ended straight draw' })
        break
      }
    }
    if (maxConsec >= 2) {
      const heroContrib = heroCards.some(c => {
        const v = RANKS_ORDER[c[0]]
        return uniqueVals.slice(Math.max(0, i - 1), i + 3).includes(v)
      })
      if (heroContrib && !draws.find(d => d.type === 'oesd')) {
        draws.push({ type: 'gutshot', outs: 4, description: 'Gutshot straight draw' })
      }
    }
  }

  // Backdoor flush draw (only on flop)
  if (boardCards.length === 3) {
    for (const [suit, vals] of Object.entries(suitArrays)) {
      if (vals.length === 3 && heroCards.filter(c => c[1] === suit).length >= 1) {
        draws.push({ type: 'backdoor_flush', outs: 1.5, description: 'Backdoor flush draw' })
        break
      }
    }
  }

  return draws
}

function analyzeStreet(heroCards, boardCards, street, actions, prevAnalysis) {
  const strength = getHandStrength(heroCards, boardCards)
  const draws = countDraws(heroCards, boardCards)
  const totalOuts = draws.reduce((sum, d) => sum + d.outs, 0)

  const feedback = []
  const heroActions = actions.filter(a => a.isHero)

  // Board texture
  const boardSuits = {}
  boardCards.forEach(c => { boardSuits[c[1]] = (boardSuits[c[1]] || 0) + 1 })
  const isMonotone = Object.values(boardSuits).some(v => v >= 3)
  const isTwoTone = Object.values(boardSuits).some(v => v >= 2)
  const boardVals = boardCards.map(c => RANKS_ORDER[c[0]]).sort((a, b) => b - a)
  const isConnected = boardVals.length >= 3 && (boardVals[0] - boardVals[2]) <= 4
  const isDry = !isMonotone && !isConnected && boardVals.length >= 3 && (boardVals[0] - boardVals[2]) >= 5
  const boardTexture = isMonotone ? 'monotone' : isConnected ? 'conectado' : isTwoTone ? 'two-tone' : isDry ? 'seco' : 'medio'

  // SPR estimate
  const potEstimate = street === 'flop' ? 7 : street === 'turn' ? 15 : 30

  // GTO recommendation based on strength + position + texture
  let recommendation = ''
  let emoji = ''

  if (strength.strength >= 70) {
    recommendation = `Mao muito forte (${strength.description}). Aposte por valor em todas as streets. Sizing grande (66-75%) em board ${boardTexture === 'seco' ? 'seco' : 'umido'}.`
    emoji = 'value'
  } else if (strength.strength >= 50) {
    recommendation = `Mao forte (${strength.description}). ${street === 'river' ? 'Value bet medio (50-66%)' : 'Bet por valor e protecao (50-66%). Construa o pote gradualmente.'}`
    emoji = 'value'
  } else if (strength.strength >= 35) {
    recommendation = `Mao boa (${strength.description}). ${boardTexture === 'seco' ? 'Bet por valor fino (33-50%). Pot control em streets futuras.' : 'Cuidado em board umido — protecao e importante. Bet 50-66%.'}`
    emoji = 'caution'
  } else if (strength.strength >= 20) {
    if (totalOuts >= 8) {
      recommendation = `Mao mediana com draw forte (${draws.map(d => d.description).join(' + ')}). Semi-bluff e correto — ${totalOuts} outs. Sizing 50-75%.`
      emoji = 'draw'
    } else {
      recommendation = `Mao marginal (${strength.description}). ${street === 'flop' ? 'Check ou bet fino de protecao (25-33%).' : street === 'turn' ? 'Check/pot control. Nao invista mais sem melhora.' : 'Check-back ou call se odds permitirem.'}`
      emoji = 'caution'
    }
  } else if (totalOuts >= 9) {
    recommendation = `Mao fraca MAS com draw muito forte (${draws.map(d => d.description).join(' + ')}, ${totalOuts} outs). Semi-bluff agressivo — bet 66-75% ou check-raise.`
    emoji = 'draw'
  } else if (totalOuts >= 4) {
    recommendation = `Mao fraca com draw fraco (${draws.map(d => d.description).join(', ')}, ${totalOuts} outs). ${street === 'flop' ? 'Pode semi-bluff se tiver fold equity. Senao, check.' : 'Give up — odds nao justificam investir mais.'}`
    emoji = 'fold'
  } else {
    recommendation = `Mao fraca (${strength.description}) sem draws. ${street === 'river' ? 'Pode considerar bluff se historia for consistente e vilao tiver range capped.' : 'Check/fold. Nao invista fichas sem equity.'}`
    emoji = 'fold'
  }

  // Analyze hero's actual action vs recommendation
  if (heroActions.length > 0) {
    const heroAction = heroActions[0]
    if (heroAction.action === 'folds' && strength.strength >= 35) {
      feedback.push({ type: 'leak', text: `Fold com ${strength.description} pode ser tight demais. Considere call ou bet dependendo do sizing do vilao.` })
    }
    if (heroAction.action === 'calls' && strength.strength >= 60 && street !== 'river') {
      feedback.push({ type: 'leak', text: `Call com ${strength.description} e passivo demais. Considere raise pra construir pote e proteger contra draws.` })
    }
    if ((heroAction.action === 'bets' || heroAction.action === 'raises') && strength.strength <= 15 && totalOuts <= 4) {
      feedback.push({ type: 'leak', text: `Bet/raise com ${strength.description} sem draws parece um bluff ruim. Voce tem equity pra justificar?` })
    }
  }

  return {
    street,
    strength,
    draws,
    totalOuts,
    boardTexture,
    recommendation,
    emoji,
    feedback,
    heroActions,
  }
}

function analyzeHand(parsed) {
  const analysis = []

  if (!parsed.heroHand || parsed.heroHand.length < 2) return analysis

  // Pre-flop
  const heroRanks = parsed.heroHand.map(c => RANKS_ORDER[c[0]]).sort((a, b) => b - a)
  const isSuited = parsed.heroHand[0][1] === parsed.heroHand[1][1]
  const isPocket = heroRanks[0] === heroRanks[1]
  const gap = heroRanks[0] - heroRanks[1]

  let preflopStrength = ''
  let preflopRec = ''
  if (isPocket) {
    if (heroRanks[0] >= 12) { preflopStrength = 'Premium pair'; preflopRec = 'Raise/3-bet forte de qualquer posicao.' }
    else if (heroRanks[0] >= 9) { preflopStrength = 'Medium pair'; preflopRec = 'Raise de MP+, call de EP contra raises. Set mine se SPR permitir.' }
    else { preflopStrength = 'Small pair'; preflopRec = 'Call em posicao pra set mine (precisa SPR 10+). Fold OOP contra 3-bet.' }
  } else if (heroRanks[0] === 14) {
    if (heroRanks[1] >= 12) { preflopStrength = isSuited ? 'Premium suited' : 'Premium offsuit'; preflopRec = 'Raise/3-bet de qualquer posicao.' }
    else if (heroRanks[1] >= 9) { preflopStrength = isSuited ? 'Axs forte' : 'Axo medio'; preflopRec = isSuited ? 'Raise de MP+, bom 3-bet bluff.' : 'Raise de LP, fold de EP.' }
    else { preflopStrength = isSuited ? 'Axs fraco' : 'Axo fraco'; preflopRec = isSuited ? 'Excelente 3-bet bluff (Ace blocker). Raise de LP.' : 'Fold na maioria das posicoes.' }
  } else if (heroRanks[0] >= 11 && gap <= 2 && isSuited) {
    preflopStrength = 'Suited connector/gapper alto'
    preflopRec = 'Muito playable — raise de LP, call contra raises em posicao. Faz straights e flushes.'
  } else if (heroRanks[0] >= 11 && gap <= 2) {
    preflopStrength = 'Broadway offsuit'
    preflopRec = 'Raise de MP+. Cuidado com dominacao (KJ vs AK, etc).'
  } else if (gap <= 2 && isSuited) {
    preflopStrength = 'Suited connector baixo'
    preflopRec = 'Call em posicao contra raises. Precisa de implied odds. Nao pague 3-bets.'
  } else {
    preflopStrength = 'Mao especulativa'
    preflopRec = 'Playable apenas em posicao com stack profundo. Fold na maioria dos spots.'
  }

  analysis.push({
    street: 'preflop',
    title: 'Pre-Flop',
    heroHand: parsed.heroHand,
    strength: { description: preflopStrength, strength: isPocket && heroRanks[0] >= 12 ? 80 : heroRanks[0] >= 14 && heroRanks[1] >= 12 ? 75 : 40 },
    recommendation: preflopRec,
    emoji: heroRanks[0] >= 12 || (heroRanks[0] === 14 && heroRanks[1] >= 10) ? 'value' : heroRanks[0] >= 9 ? 'caution' : 'fold',
    draws: [],
    feedback: [],
    heroActions: parsed.actions.preflop.filter(a => a.isHero),
  })

  // Flop
  if (parsed.board.flop.length >= 3) {
    const flopAnalysis = analyzeStreet(parsed.heroHand, parsed.board.flop, 'flop', parsed.actions.flop, null)
    analysis.push({ ...flopAnalysis, title: 'Flop', heroHand: parsed.heroHand })
  }

  // Turn
  if (parsed.board.turn) {
    const turnBoard = [...parsed.board.flop, parsed.board.turn]
    const turnAnalysis = analyzeStreet(parsed.heroHand, turnBoard, 'turn', parsed.actions.turn, analysis[1])
    analysis.push({ ...turnAnalysis, title: 'Turn', heroHand: parsed.heroHand })
  }

  // River
  if (parsed.board.river) {
    const riverBoard = [...parsed.board.flop, parsed.board.turn, parsed.board.river]
    const riverAnalysis = analyzeStreet(parsed.heroHand, riverBoard, 'river', parsed.actions.river, analysis[2])
    analysis.push({ ...riverAnalysis, title: 'River', heroHand: parsed.heroHand })
  }

  return analysis
}

// ================================================================
// Card display helpers
// ================================================================

const SUIT_SYMBOLS = { s: '\u2660', h: '\u2665', d: '\u2666', c: '\u2663' }
const SUIT_COLORS = { s: '#b3b3b8', h: '#e5484d', d: '#0a84d7', c: '#4fce82' }

function CardDisplay({ card }) {
  if (!card) return null
  const rank = card[0]
  const suit = card[1]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 36, height: 48, borderRadius: 6, background: '#fdfdfd',
      color: SUIT_COLORS[suit] || '#333', fontSize: 14, fontWeight: 700,
      fontFamily: 'JetBrains Mono', margin: '0 2px', flexShrink: 0,
      border: '1px solid rgba(255,255,255,0.15)',
    }}>
      {rank}{SUIT_SYMBOLS[suit] || ''}
    </span>
  )
}

// ================================================================
// Component
// ================================================================

const EMOJI_MAP = {
  value: { icon: '\u2705', color: '#4fce82', label: 'Valor' },
  caution: { icon: '\u26A0\uFE0F', color: '#f5a623', label: 'Cautela' },
  draw: { icon: '\uD83C\uDCCF', color: '#0a84d7', label: 'Draw' },
  fold: { icon: '\u274C', color: '#e5484d', label: 'Fold/Bluff' },
}

const EXAMPLE_HAND = `PokerStars Hand #12345: Hold'em No Limit (50/100)
Seat 1: Player1 (5000 in chips)
Seat 2: Hero (4800 in chips)
Seat 3: Player3 (5200 in chips)
Player1: posts small blind 50
Hero: posts big blind 100
*** HOLE CARDS ***
Dealt to Hero [Ah Kd]
Player3: raises 200
Player1: folds
Hero: calls 100
*** FLOP *** [Ks 7h 3d]
Hero: checks
Player3: bets 300
Hero: raises 800
Player3: calls 500
*** TURN *** [Ks 7h 3d] [2c]
Hero: bets 1200
Player3: calls 1200
*** RIVER *** [Ks 7h 3d 2c] [Qh]
Hero: bets 2500
Player3: folds`

const EXAMPLE_SIMPLE = 'AhKd Ks7h3d 2c Qh'

export default function HandAnalysis() {
  const [input, setInput] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('simple') // 'simple' or 'full'

  function handleAnalyze() {
    setError(null)
    setAnalysis(null)

    if (!input.trim()) {
      setError('Cole um hand history ou digite suas cartas.')
      return
    }

    // Try full HH first, then simple
    let parsed = parseHandHistory(input)
    if (!parsed) parsed = parseSimpleInput(input)

    if (!parsed || !parsed.heroHand || parsed.heroHand.length < 2) {
      setError('Nao consegui interpretar a mao. Use o formato: AhKs Qd7c2s (hero + board) ou cole um hand history do PokerStars.')
      return
    }

    const result = analyzeHand(parsed)
    setAnalysis({ parsed, streets: result })
  }

  function loadExample() {
    setInput(mode === 'full' ? EXAMPLE_HAND : EXAMPLE_SIMPLE)
  }

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-16 px-4" style={{ background: '#0f0f0f' }}>
      <div className="max-w-3xl mx-auto pt-6">
        {/* Header */}
        <div className="mb-6">
          <h1 style={{ color: '#fdfdfd', fontSize: 24, fontWeight: 700 }}>Analise de Mao</h1>
          <p style={{ color: '#b3b3b8', fontSize: 14, marginTop: 4 }}>
            Cole um hand history ou digite suas cartas para receber feedback GTO street-by-street.
          </p>
        </div>

        {/* Mode selector */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => { setMode('simple'); setInput(''); setAnalysis(null) }}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: mode === 'simple' ? '#4fce8218' : '#1a1a1d', color: mode === 'simple' ? '#4fce82' : '#676671', border: `1px solid ${mode === 'simple' ? '#4fce8260' : '#2a2a2e'}` }}>
            Rapido
          </button>
          <button onClick={() => { setMode('full'); setInput(''); setAnalysis(null) }}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: mode === 'full' ? '#0a84d718' : '#1a1a1d', color: mode === 'full' ? '#0a84d7' : '#676671', border: `1px solid ${mode === 'full' ? '#0a84d760' : '#2a2a2e'}` }}>
            Hand History
          </button>
        </div>

        {/* Input area */}
        <div className="rounded-xl p-4 mb-4" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
          {mode === 'simple' ? (
            <div>
              <div style={{ color: '#676671', fontSize: 12, marginBottom: 8 }}>
                Formato: <span style={{ color: '#b3b3b8', fontFamily: 'JetBrains Mono' }}>AhKs Qd7c2s Tc 5h</span> (hero + flop + turn + river)
              </div>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ex: AhKd Ks7h3d 2c Qh"
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 8,
                  background: '#222225', border: '1px solid #2a2a2e',
                  color: '#fdfdfd', fontSize: 15, fontFamily: 'JetBrains Mono',
                  outline: 'none',
                }}
              />
            </div>
          ) : (
            <div>
              <div style={{ color: '#676671', fontSize: 12, marginBottom: 8 }}>
                Cole o hand history completo (PokerStars, 888poker, etc.)
              </div>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Cole seu hand history aqui..."
                rows={10}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 8,
                  background: '#222225', border: '1px solid #2a2a2e',
                  color: '#fdfdfd', fontSize: 12, fontFamily: 'JetBrains Mono',
                  outline: 'none', resize: 'vertical', lineHeight: 1.6,
                }}
              />
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <button onClick={handleAnalyze}
              style={{
                flex: 1, padding: '12px', borderRadius: 8,
                background: '#4fce82', border: 'none', color: '#0f0f0f',
                fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}>
              Analisar
            </button>
            <button onClick={loadExample}
              style={{
                padding: '12px 16px', borderRadius: 8,
                background: '#222225', border: '1px solid #2a2a2e',
                color: '#b3b3b8', fontSize: 13, cursor: 'pointer',
              }}>
              Exemplo
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(229,72,77,0.1)', border: '1px solid rgba(229,72,77,0.3)' }}>
            <div style={{ color: '#e5484d', fontSize: 14 }}>{error}</div>
          </div>
        )}

        {/* Analysis results */}
        {analysis && (
          <div>
            {/* Hero cards + board display */}
            <div className="rounded-xl p-4 mb-4" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <div style={{ color: '#676671', fontSize: 10, fontWeight: 600, marginBottom: 4 }}>HERO</div>
                  <div className="flex">
                    {analysis.parsed.heroHand.map((c, i) => <CardDisplay key={i} card={c} />)}
                  </div>
                </div>
                {analysis.parsed.board.flop.length > 0 && (
                  <div>
                    <div style={{ color: '#676671', fontSize: 10, fontWeight: 600, marginBottom: 4 }}>BOARD</div>
                    <div className="flex">
                      {analysis.parsed.board.flop.map((c, i) => <CardDisplay key={i} card={c} />)}
                      {analysis.parsed.board.turn && <CardDisplay card={analysis.parsed.board.turn} />}
                      {analysis.parsed.board.river && <CardDisplay card={analysis.parsed.board.river} />}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Street by street analysis */}
            {analysis.streets.map((s, i) => {
              const em = EMOJI_MAP[s.emoji] || EMOJI_MAP.caution
              return (
                <div key={i} className="rounded-xl p-4 mb-3" style={{ background: '#1a1a1d', border: `1px solid ${em.color}25` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span style={{ fontSize: 16 }}>{em.icon}</span>
                    <span style={{ color: em.color, fontSize: 15, fontWeight: 700 }}>{s.title}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                      background: `${em.color}15`, color: em.color,
                    }}>{em.label}</span>
                    {s.strength && (
                      <span style={{ color: '#676671', fontSize: 12, fontFamily: 'JetBrains Mono', marginLeft: 'auto' }}>
                        {s.strength.description}
                      </span>
                    )}
                  </div>

                  {/* Draws */}
                  {s.draws && s.draws.length > 0 && (
                    <div className="flex gap-2 mb-3 flex-wrap">
                      {s.draws.map((d, di) => (
                        <span key={di} style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                          background: 'rgba(10,132,215,0.12)', color: '#0a84d7',
                        }}>
                          {d.description} ({d.outs} outs)
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Board texture */}
                  {s.boardTexture && (
                    <div style={{ color: '#676671', fontSize: 11, marginBottom: 6 }}>
                      Board: <span style={{ color: '#b3b3b8' }}>{s.boardTexture}</span>
                    </div>
                  )}

                  {/* Recommendation */}
                  <div style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 1.7 }}>
                    {s.recommendation}
                  </div>

                  {/* Hero action feedback */}
                  {s.heroActions && s.heroActions.length > 0 && (
                    <div className="mt-2 pt-2" style={{ borderTop: '1px solid #2a2a2e' }}>
                      <div style={{ color: '#676671', fontSize: 11, marginBottom: 4 }}>Sua acao:</div>
                      {s.heroActions.map((a, ai) => (
                        <span key={ai} style={{
                          fontSize: 12, fontWeight: 600, color: '#fdfdfd',
                          padding: '2px 8px', borderRadius: 4, background: '#222225',
                        }}>
                          {a.action} {a.amount > 0 ? a.amount : ''}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Leak feedback */}
                  {s.feedback && s.feedback.length > 0 && (
                    <div className="mt-2">
                      {s.feedback.map((f, fi) => (
                        <div key={fi} className="rounded-lg px-3 py-2 mt-1" style={{
                          background: f.type === 'leak' ? 'rgba(229,72,77,0.08)' : 'rgba(245,166,35,0.08)',
                          border: `1px solid ${f.type === 'leak' ? 'rgba(229,72,77,0.2)' : 'rgba(245,166,35,0.2)'}`,
                        }}>
                          <span style={{ color: f.type === 'leak' ? '#e5484d' : '#f5a623', fontSize: 12 }}>
                            {f.type === 'leak' ? 'Possivel leak: ' : 'Nota: '}
                          </span>
                          <span style={{ color: '#b3b3b8', fontSize: 12 }}>{f.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Summary */}
            <div className="rounded-xl p-4 mb-4" style={{ background: '#222225', border: '1px solid #2a2a2e' }}>
              <div style={{ color: '#676671', fontSize: 11, fontWeight: 600, marginBottom: 6 }}>NOTA</div>
              <div style={{ color: '#b3b3b8', fontSize: 12, lineHeight: 1.7 }}>
                Esta analise usa heuristicas GTO simplificadas. Para estudo aprofundado, use um solver dedicado (PioSolver, GTO+, etc). A analise aqui foca nos conceitos fundamentais de hand strength, draws, e board texture.
              </div>
            </div>
          </div>
        )}

        {/* Tips section */}
        {!analysis && (
          <div className="rounded-xl p-4" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
            <h3 style={{ color: '#fdfdfd', fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Como usar</h3>
            <div className="space-y-3">
              {[
                { title: 'Modo Rapido', desc: 'Digite suas cartas + board no formato: AhKs Qd7c2s Tc 5h', color: '#4fce82' },
                { title: 'Hand History', desc: 'Cole o historico completo do PokerStars ou sites similares', color: '#0a84d7' },
                { title: 'Analise', desc: 'Receba feedback GTO street-by-street: forca da mao, draws, textura do board e recomendacao', color: '#f5a623' },
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: tip.color, marginTop: 6, flexShrink: 0 }} />
                  <div>
                    <div style={{ color: '#fdfdfd', fontSize: 13, fontWeight: 600 }}>{tip.title}</div>
                    <div style={{ color: '#676671', fontSize: 12 }}>{tip.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
