// ================================================================
// Poker Engine Multiway — suporta 2-9 jogadores
// Módulo puro (sem React). Usado pela Arena para MTT 6-max.
// ================================================================
import pokersolver from 'pokersolver'
const Hand = pokersolver.Hand || pokersolver.default?.Hand || pokersolver

// ─── Constantes ──────────────────────────────────────────
const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2']
const SUITS = ['s','h','d','c']
const RANK_VAL = { A:14,K:13,Q:12,J:11,T:10,9:9,8:8,7:7,6:6,5:5,4:4,3:3,2:2 }

// ─── Posições (baseado em número de jogadores) ───────────
const POSITION_NAMES = {
  2: ['BTN','BB'],
  3: ['BTN','SB','BB'],
  4: ['CO','BTN','SB','BB'],
  5: ['MP','CO','BTN','SB','BB'],
  6: ['UTG','MP','CO','BTN','SB','BB'],
  7: ['UTG','UTG+1','MP','CO','BTN','SB','BB'],
  8: ['UTG','UTG+1','MP','MP+1','CO','BTN','SB','BB'],
  9: ['UTG','UTG+1','LJ','HJ','CO','BTN','SB','BB','BB'],
}

// ─── Deck ────────────────────────────────────────────────
export function newDeck() {
  const deck = []
  for (const r of RANKS) for (const s of SUITS) deck.push(r + s)
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

// ─── Avaliação de mão ────────────────────────────────────
const HAND_LABELS = {
  'Straight Flush': 'Straight Flush', 'Four of a Kind': 'Quadra',
  'Full House': 'Full House', 'Flush': 'Flush', 'Straight': 'Straight',
  'Three of a Kind': 'Trinca', 'Two Pair': 'Dois Pares', 'Pair': 'Par',
  'High Card': 'High Card',
}

export function evalHand(hole, board) {
  const cards = [...hole, ...board]
  const solved = Hand.solve(cards)
  return {
    name: solved.name,
    label: HAND_LABELS[solved.name] || solved.name,
    descr: solved.descr,
    _hand: solved,
  }
}

// ─── Notação de mão (ex: AKs, QQ, T9o) ──────────────────
export function holeToNotation(hole) {
  const r1 = hole[0].slice(0, -1), r2 = hole[1].slice(0, -1)
  const s1 = hole[0].slice(-1), s2 = hole[1].slice(-1)
  const v1 = RANK_VAL[r1], v2 = RANK_VAL[r2]
  const high = v1 >= v2 ? r1 : r2
  const low = v1 >= v2 ? r2 : r1
  if (r1 === r2) return high + low
  return high + low + (s1 === s2 ? 's' : 'o')
}

// ─── Calcular posições dos jogadores ─────────────────────
export function calcPositions(numPlayers, dealerIdx) {
  const names = POSITION_NAMES[numPlayers] || POSITION_NAMES[6]
  const positions = []
  for (let i = 0; i < numPlayers; i++) {
    const offset = (i - dealerIdx + numPlayers) % numPlayers
    positions.push(names[offset] || `Seat${i}`)
  }
  return positions
}

// SB e BB indexes relativos ao dealer
export function getBlindIndexes(numPlayers, dealerIdx) {
  if (numPlayers === 2) {
    // Heads-up: BTN = SB, outro = BB
    return { sbIdx: dealerIdx, bbIdx: (dealerIdx + 1) % numPlayers }
  }
  return {
    sbIdx: (dealerIdx + 1) % numPlayers,
    bbIdx: (dealerIdx + 2) % numPlayers,
  }
}

// ─── Criar jogo ──────────────────────────────────────────
// playerDefs: [{ id, name, stack, isHero, profile }]
// blinds: { sb, bb, ante? }
// dealerIdx: seat index do BTN
export function createGame(playerDefs, blinds, dealerIdx = 0) {
  const numAlive = playerDefs.filter(p => p.stack > 0).length
  const positions = calcPositions(numAlive, dealerIdx)

  // Mapear posições apenas para jogadores com stack > 0
  let posIdx = 0
  const players = playerDefs.map((def, i) => ({
    id: def.id,
    name: def.name,
    stack: def.stack,
    holeCards: null,
    invested: 0,        // total investido na mão atual
    roundInvested: 0,   // investido na rodada de apostas atual
    folded: def.stack <= 0,
    allIn: false,
    isHero: def.isHero || false,
    seatIdx: i,
    position: def.stack > 0 ? positions[posIdx++] : null,
    profile: def.profile || 'gto',
  }))

  return {
    players,
    board: [],
    fullBoard: null,     // 5 cartas pré-determinadas
    street: null,        // null, 'preflop', 'flop', 'turn', 'river', 'showdown'
    pot: 0,
    sidePots: [],        // [{ amount, eligible: [playerIdx...] }]
    dealerIdx,
    blinds,
    activePlayerIdx: null,
    lastRaiserIdx: null, // quem fez o último raise (pra saber quando fechar action)
    lastBet: 0,          // maior aposta na rodada atual
    minRaise: 0,         // raise mínimo
    actionHistory: [],   // [{ playerIdx, action, amount, street }]
    handComplete: false,
    winners: null,       // preenchido no showdown
  }
}

// ─── Dealing ─────────────────────────────────────────────
export function dealHand(game) {
  const deck = newDeck()
  const g = deepCopy(game)
  let cardIdx = 0

  // Reset de cada jogador para nova mão
  g.players.forEach(p => {
    p.holeCards = null
    p.invested = 0
    p.roundInvested = 0
    p.folded = p.stack <= 0
    p.allIn = false
  })

  // Distribuir 2 cartas para cada jogador ativo
  const activePlayers = g.players.filter(p => !p.folded)
  for (const p of activePlayers) {
    p.holeCards = [deck[cardIdx++], deck[cardIdx++]]
  }

  // Board: 5 cartas reservadas
  g.fullBoard = [deck[cardIdx], deck[cardIdx+1], deck[cardIdx+2], deck[cardIdx+3], deck[cardIdx+4]]
  g.board = []
  g.street = 'preflop'
  g.pot = 0
  g.sidePots = []
  g.actionHistory = []
  g.handComplete = false
  g.winners = null
  g.lastBet = 0
  g.minRaise = 0
  g.lastRaiserIdx = null

  // Postar blinds
  const { sbIdx, bbIdx } = getBlindIndexes(g.players.length, g.dealerIdx)
  const sbPlayer = g.players[sbIdx]
  const bbPlayer = g.players[bbIdx]

  if (sbPlayer && !sbPlayer.folded) {
    const sbAmount = Math.min(g.blinds.sb, sbPlayer.stack)
    sbPlayer.stack -= sbAmount
    sbPlayer.invested += sbAmount
    sbPlayer.roundInvested += sbAmount
    g.pot += sbAmount
    if (sbPlayer.stack === 0) sbPlayer.allIn = true
    g.actionHistory.push({ playerIdx: sbIdx, action: 'sb', amount: sbAmount, street: 'preflop' })
  }

  if (bbPlayer && !bbPlayer.folded) {
    const bbAmount = Math.min(g.blinds.bb, bbPlayer.stack)
    bbPlayer.stack -= bbAmount
    bbPlayer.invested += bbAmount
    bbPlayer.roundInvested += bbAmount
    g.pot += bbAmount
    if (bbPlayer.stack === 0) bbPlayer.allIn = true
    g.actionHistory.push({ playerIdx: bbIdx, action: 'bb', amount: bbAmount, street: 'preflop' })
  }

  // Antes (opcional)
  if (g.blinds.ante) {
    g.players.forEach((p, i) => {
      if (p.folded || p.allIn) return
      const ante = Math.min(g.blinds.ante, p.stack)
      p.stack -= ante
      p.invested += ante
      g.pot += ante
      if (p.stack === 0) p.allIn = true
    })
  }

  g.lastBet = g.blinds.bb
  g.minRaise = g.blinds.bb * 2

  // Primeiro a agir: preflop = UTG (seat após BB)
  g.activePlayerIdx = getFirstToAct(g)

  return g
}

// ─── Quem age primeiro ───────────────────────────────────
function getFirstToAct(game) {
  const n = game.players.length
  const { bbIdx } = getBlindIndexes(n, game.dealerIdx)

  if (game.street === 'preflop') {
    // Preflop: primeiro a agir = seat após BB
    let idx = (bbIdx + 1) % n
    for (let i = 0; i < n; i++) {
      const p = game.players[idx]
      if (!p.folded && !p.allIn) return idx
      idx = (idx + 1) % n
    }
  } else {
    // Pós-flop: primeiro a agir = SB (ou próximo ativo após dealer)
    let idx = (game.dealerIdx + 1) % n
    for (let i = 0; i < n; i++) {
      const p = game.players[idx]
      if (!p.folded && !p.allIn) return idx
      idx = (idx + 1) % n
    }
  }
  return null // ninguém pode agir
}

// Próximo jogador ativo após idx
function nextActivePlayer(game, afterIdx) {
  const n = game.players.length
  let idx = (afterIdx + 1) % n
  for (let i = 0; i < n; i++) {
    const p = game.players[idx]
    if (!p.folded && !p.allIn) return idx
    idx = (idx + 1) % n
  }
  return null
}

// ─── Ações disponíveis para um jogador ───────────────────
export function getAvailableActions(game, playerIdx) {
  const p = game.players[playerIdx]
  if (!p || p.folded || p.allIn || game.handComplete) return []

  const toCall = game.lastBet - p.roundInvested
  const actions = ['fold']

  if (toCall <= 0) {
    actions.push('check')
  } else {
    actions.push('call')
  }

  // Pode apostar/raise se tem stack suficiente
  if (p.stack > toCall) {
    if (toCall <= 0) {
      actions.push('bet')
    } else {
      actions.push('raise')
    }
  }

  // All-in sempre disponível se tem stack
  if (p.stack > 0) {
    actions.push('allin')
  }

  return actions
}

// ─── Processar ação ──────────────────────────────────────
// Retorna novo gameState (imutável)
export function processAction(game, playerIdx, action, amount = 0) {
  if (game.handComplete) return game
  if (playerIdx !== game.activePlayerIdx) return game

  const g = deepCopy(game)
  const p = g.players[playerIdx]
  if (p.folded || p.allIn) return game

  const toCall = g.lastBet - p.roundInvested

  switch (action) {
    case 'fold':
      p.folded = true
      g.actionHistory.push({ playerIdx, action: 'fold', amount: 0, street: g.street })
      break

    case 'check':
      if (toCall > 0) return game // não pode check se tem bet
      g.actionHistory.push({ playerIdx, action: 'check', amount: 0, street: g.street })
      break

    case 'call': {
      const callAmount = Math.min(toCall, p.stack)
      p.stack -= callAmount
      p.invested += callAmount
      p.roundInvested += callAmount
      g.pot += callAmount
      if (p.stack === 0) p.allIn = true
      g.actionHistory.push({ playerIdx, action: 'call', amount: callAmount, street: g.street })
      break
    }

    case 'bet': {
      if (toCall > 0) return game // não pode bet se já tem aposta
      const betAmount = Math.min(Math.max(amount, g.blinds.bb), p.stack)
      p.stack -= betAmount
      p.invested += betAmount
      p.roundInvested += betAmount
      g.pot += betAmount
      g.lastBet = p.roundInvested
      g.minRaise = p.roundInvested + betAmount
      g.lastRaiserIdx = playerIdx
      if (p.stack === 0) p.allIn = true
      g.actionHistory.push({ playerIdx, action: 'bet', amount: betAmount, street: g.street })
      break
    }

    case 'raise': {
      const raiseTotal = Math.min(Math.max(amount, g.minRaise), p.stack + p.roundInvested)
      const additional = raiseTotal - p.roundInvested
      if (additional <= 0) return game
      const payAmount = Math.min(additional, p.stack)
      p.stack -= payAmount
      p.invested += payAmount
      p.roundInvested += payAmount
      g.pot += payAmount
      const raiseSize = p.roundInvested - g.lastBet
      g.lastBet = p.roundInvested
      g.minRaise = p.roundInvested + Math.max(raiseSize, g.blinds.bb)
      g.lastRaiserIdx = playerIdx
      if (p.stack === 0) p.allIn = true
      g.actionHistory.push({ playerIdx, action: 'raise', amount: payAmount, street: g.street })
      break
    }

    case 'allin': {
      const allInAmount = p.stack
      p.invested += allInAmount
      p.roundInvested += allInAmount
      g.pot += allInAmount
      p.stack = 0
      p.allIn = true
      if (p.roundInvested > g.lastBet) {
        const raiseSize = p.roundInvested - g.lastBet
        g.lastBet = p.roundInvested
        g.minRaise = p.roundInvested + Math.max(raiseSize, g.blinds.bb)
        g.lastRaiserIdx = playerIdx
      }
      g.actionHistory.push({ playerIdx, action: 'allin', amount: allInAmount, street: g.street })
      break
    }

    default:
      return game
  }

  // Verificar se só restou 1 jogador não-foldado
  const activePlayers = g.players.filter(p => !p.folded)
  if (activePlayers.length === 1) {
    return resolveWinByFold(g, activePlayers[0])
  }

  // Verificar se a rodada de apostas acabou
  if (isBettingRoundComplete(g, playerIdx)) {
    return advanceStreet(g)
  }

  // Próximo jogador
  g.activePlayerIdx = nextActivePlayer(g, playerIdx)
  if (g.activePlayerIdx === null) {
    return advanceStreet(g)
  }

  return g
}

// ─── Verificar se rodada de apostas acabou ───────────────
function isBettingRoundComplete(game, lastActorIdx) {
  const playersInHand = game.players.filter(p => !p.folded && !p.allIn)

  // Ninguém mais pode agir
  if (playersInHand.length === 0) return true

  // Se só 1 jogador pode agir e não tem bet pendente, acabou
  if (playersInHand.length === 1 && game.lastBet <= playersInHand[0].roundInvested) return true

  // Todos que podem agir igualaram a aposta?
  const allMatched = playersInHand.every(p => p.roundInvested === game.lastBet)
  if (!allMatched) return false

  // Preflop special: BB ainda precisa agir se ninguém raisou
  if (game.street === 'preflop') {
    const { bbIdx } = getBlindIndexes(game.players.length, game.dealerIdx)
    const bb = game.players[bbIdx]
    if (bb && !bb.folded && !bb.allIn) {
      // BB só pode ser pulado se: ele já agiu nessa rodada (não apenas postou blind)
      const bbActed = game.actionHistory.some(
        a => a.playerIdx === bbIdx && a.street === 'preflop' && a.action !== 'bb'
      )
      if (!bbActed) return false
    }
  }

  return true
}

// ─── Avançar street ──────────────────────────────────────
function advanceStreet(game) {
  const g = deepCopy(game)
  const streetOrder = ['preflop', 'flop', 'turn', 'river']
  const currentIdx = streetOrder.indexOf(g.street)

  // Reset round invested
  g.players.forEach(p => { p.roundInvested = 0 })
  g.lastBet = 0
  g.minRaise = g.blinds.bb
  g.lastRaiserIdx = null

  // Verificar se pode continuar jogando (2+ jogadores não-foldados que podem agir)
  const canAct = g.players.filter(p => !p.folded && !p.allIn)
  const inHand = g.players.filter(p => !p.folded)

  if (currentIdx >= 3 || inHand.length <= 1) {
    // River acabou ou só 1 jogador — showdown
    return goToShowdown(g)
  }

  // Se ninguém mais pode apostar (todos all-in ou fold), runout até showdown
  if (canAct.length <= 1 && inHand.length >= 2) {
    // Revelar todas as cartas restantes
    return runOutBoard(g)
  }

  // Avançar normalmente
  const nextStreet = streetOrder[currentIdx + 1]
  g.street = nextStreet

  switch (nextStreet) {
    case 'flop':
      g.board = g.fullBoard.slice(0, 3)
      break
    case 'turn':
      g.board = g.fullBoard.slice(0, 4)
      break
    case 'river':
      g.board = g.fullBoard.slice(0, 5)
      break
  }

  g.activePlayerIdx = getFirstToAct(g)
  if (g.activePlayerIdx === null) {
    // Ninguém pode agir — continua avançando
    return advanceStreet(g)
  }

  return g
}

// ─── Runout (todos all-in, revelar board e resolver) ─────
function runOutBoard(game) {
  const g = deepCopy(game)
  g.board = [...g.fullBoard]
  return goToShowdown(g)
}

// ─── Vitória por fold (todos foldaram) ───────────────────
function resolveWinByFold(game, winner) {
  const g = deepCopy(game)
  g.handComplete = true
  g.street = 'showdown'

  const winnerIdx = g.players.findIndex(p => p.id === winner.id)

  // Winner recebe o pot inteiro
  g.players[winnerIdx].stack += g.pot

  g.winners = [{
    playerIdx: winnerIdx,
    amount: g.pot,
    hand: null,
    potType: 'main',
  }]
  g.pot = 0
  g.sidePots = []
  return g
}

// ─── Side Pots ───────────────────────────────────────────
export function calculateSidePots(players) {
  // Todos que contribuíram (incluindo foldados — eles perderam fichas no pot)
  const contributors = players
    .map((p, i) => ({ idx: i, invested: p.invested, folded: p.folded, allIn: p.allIn }))
    .filter(c => c.invested > 0)

  if (contributors.length === 0) return []

  // Níveis de all-in (cada all-in cria um pot separado)
  const allInLevels = [...new Set(
    contributors.filter(c => c.allIn).map(c => c.invested)
  )].sort((a, b) => a - b)

  // Adicionar nível máximo
  const maxInvested = Math.max(...contributors.map(c => c.invested))
  const levels = [...new Set([...allInLevels, maxInvested])].sort((a, b) => a - b)

  const pots = []
  let previousLevel = 0

  for (const level of levels) {
    const layerSize = level - previousLevel
    if (layerSize <= 0) continue

    // Quanto cada contribuinte coloca nessa camada
    let potAmount = 0
    for (const c of contributors) {
      // Quanto esse jogador pode contribuir nessa camada
      const contribution = Math.min(c.invested, level) - Math.min(c.invested, previousLevel)
      potAmount += Math.max(0, contribution)
    }

    // Elegíveis: quem investiu pelo menos até esse nível E não foldou
    const eligible = contributors
      .filter(c => c.invested >= level && !c.folded)
      .map(c => c.idx)

    if (potAmount > 0 && eligible.length > 0) {
      pots.push({ amount: potAmount, eligible })
    }

    previousLevel = level
  }

  return pots
}

// ─── Showdown ────────────────────────────────────────────
function goToShowdown(game) {
  const g = deepCopy(game)
  g.handComplete = true
  g.street = 'showdown'
  g.board = g.fullBoard ? [...g.fullBoard] : g.board

  const inHand = g.players.filter(p => !p.folded)
  if (inHand.length <= 1) {
    // Só 1 jogador — ganha tudo
    const winner = inHand[0] || g.players[0]
    const winnerIdx = g.players.findIndex(p => p.id === winner.id)
    g.players[winnerIdx].stack += g.pot
    g.winners = [{ playerIdx: winnerIdx, amount: g.pot, hand: null, potType: 'main' }]
    g.pot = 0
    return g
  }

  // Calcular side pots
  const pots = calculateSidePots(g.players)
  if (pots.length === 0) {
    // Fallback: pot inteiro disputado por todos não-foldados
    pots.push({ amount: g.pot, eligible: inHand.map(p => g.players.indexOf(p)) })
  }

  g.winners = []

  for (let potIdx = 0; potIdx < pots.length; potIdx++) {
    const pot = pots[potIdx]
    const potType = potIdx === 0 ? 'main' : `side-${potIdx}`

    // Resolver mãos dos elegíveis
    const hands = pot.eligible.map(pIdx => {
      const p = g.players[pIdx]
      const solved = Hand.solve([...p.holeCards, ...g.board])
      return { pIdx, solved }
    })

    // Encontrar vencedor(es)
    const solvedHands = hands.map(h => h.solved)
    const winnerHands = Hand.winners(solvedHands)

    const winnerIdxs = hands
      .filter(h => winnerHands.includes(h.solved))
      .map(h => h.pIdx)

    // Distribuir pot igualmente entre vencedores (split)
    const share = Math.floor(pot.amount / winnerIdxs.length)
    const remainder = pot.amount - share * winnerIdxs.length

    winnerIdxs.forEach((pIdx, i) => {
      const winAmount = share + (i === 0 ? remainder : 0) // resto vai pro primeiro
      g.players[pIdx].stack += winAmount
      const eval_ = evalHand(g.players[pIdx].holeCards, g.board)
      g.winners.push({
        playerIdx: pIdx,
        amount: winAmount,
        hand: eval_.label,
        potType,
      })
    })
  }

  g.pot = 0
  g.sidePots = pots
  return g
}

// ─── Utilidades ──────────────────────────────────────────
function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj))
}

// Jogadores ativos (não foldaram, não eliminados)
export function getActivePlayers(game) {
  return game.players.filter(p => !p.folded && p.stack > 0)
}

// Jogadores na mão (não foldaram)
export function getPlayersInHand(game) {
  return game.players.filter(p => !p.folded)
}

// Verificar se é a vez do hero
export function isHeroTurn(game) {
  if (game.activePlayerIdx === null || game.handComplete) return false
  return game.players[game.activePlayerIdx]?.isHero || false
}

// Info pra UI: quanto o hero precisa pagar pra call
export function getCallAmount(game, playerIdx) {
  const p = game.players[playerIdx]
  if (!p) return 0
  return Math.min(game.lastBet - p.roundInvested, p.stack)
}

// Info pra UI: range de raise válido
export function getRaiseRange(game, playerIdx) {
  const p = game.players[playerIdx]
  if (!p) return { min: 0, max: 0 }
  const min = Math.min(game.minRaise, p.stack + p.roundInvested)
  const max = p.stack + p.roundInvested
  return { min, max }
}

// Avançar dealer para próxima mão
export function advanceDealer(game) {
  const n = game.players.length
  let next = (game.dealerIdx + 1) % n
  // Pular jogadores eliminados (stack 0 e sem cartas)
  for (let i = 0; i < n; i++) {
    if (game.players[next].stack > 0) return next
    next = (next + 1) % n
  }
  return game.dealerIdx
}

// Resetar jogadores para nova mão (mantém stacks)
export function prepareNextHand(game) {
  const g = deepCopy(game)
  g.dealerIdx = advanceDealer(g)
  return g
}

export { RANK_VAL, RANKS, SUITS }
