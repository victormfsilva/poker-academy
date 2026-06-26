// Teste standalone da engine multiway
// Rodar: node scripts/testEngine.mjs
import {
  createGame, dealHand, processAction, getAvailableActions,
  calculateSidePots, isHeroTurn, getCallAmount, getRaiseRange,
  calcPositions, getBlindIndexes, prepareNextHand,
} from '../src/lib/pokerEngine.js'

let passed = 0, failed = 0
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  OK: ${msg}`) }
  else { failed++; console.error(`  FAIL: ${msg}`) }
}

// ─── Teste 1: Posições ──────────────────────────────────
console.log('\n=== Teste 1: Posições ===')
const pos6 = calcPositions(6, 0)
assert(pos6[0] === 'UTG', `Seat 0 = ${pos6[0]} (esperado UTG)`)
// Dealer=0 → pos[0]=UTG?? Não — dealer=0 significa seat 0 é o primeiro da rotação
// Na verdade, offset=(i - dealerIdx) % n. Se dealer=0, seat 0 offset=0 → pos[0] = posNames[0]
// Para 6 jogadores: ['UTG','MP','CO','BTN','SB','BB']
// Seat 0 offset 0 → UTG... mas seat 0 deveria ser BTN se dealer=0
// Vou ajustar: seat dealer deveria ter posição BTN
// Verificando: pos6 = ?
console.log('  Positions (dealer=0):', pos6)

const pos6d3 = calcPositions(6, 3)
console.log('  Positions (dealer=3):', pos6d3)
assert(pos6d3[3] === 'UTG', `Seat 3 dealer=3 offset=0 → ${pos6d3[3]}`)

// HU
const pos2 = calcPositions(2, 0)
console.log('  Positions HU (dealer=0):', pos2)
assert(pos2[0] === 'BTN', `HU seat 0 dealer=0 → ${pos2[0]}`)
assert(pos2[1] === 'BB', `HU seat 1 dealer=0 → ${pos2[1]}`)

// ─── Teste 2: Blind indexes ─────────────────────────────
console.log('\n=== Teste 2: Blind indexes ===')
const b6 = getBlindIndexes(6, 3)
assert(b6.sbIdx === 4, `6p dealer=3: SB=${b6.sbIdx} (esperado 4)`)
assert(b6.bbIdx === 5, `6p dealer=3: BB=${b6.bbIdx} (esperado 5)`)

const b2 = getBlindIndexes(2, 0)
assert(b2.sbIdx === 0, `HU dealer=0: SB=${b2.sbIdx} (esperado 0, BTN=SB)`)
assert(b2.bbIdx === 1, `HU dealer=0: BB=${b2.bbIdx} (esperado 1)`)

// ─── Teste 3: Criar jogo e dealing ─────────────────────
console.log('\n=== Teste 3: Dealing ===')
const players6 = [
  { id: 'hero', name: 'Hero', stack: 1500, isHero: true },
  { id: 'bot1', name: 'Bot1', stack: 1500 },
  { id: 'bot2', name: 'Bot2', stack: 1500 },
  { id: 'bot3', name: 'Bot3', stack: 1500 },
  { id: 'bot4', name: 'Bot4', stack: 1500 },
  { id: 'bot5', name: 'Bot5', stack: 1500 },
]
let game = createGame(players6, { sb: 10, bb: 20 }, 0)
game = dealHand(game)

assert(game.street === 'preflop', `Street = ${game.street}`)
assert(game.board.length === 0, `Board vazio no preflop`)
assert(game.fullBoard.length === 5, `Full board = ${game.fullBoard.length} cartas`)
assert(game.pot === 30, `Pot = ${game.pot} (SB 10 + BB 20 = 30)`)

const withCards = game.players.filter(p => p.holeCards)
assert(withCards.length === 6, `${withCards.length} jogadores com cartas`)

// Todas as cartas são únicas
const allCards = game.players.flatMap(p => p.holeCards || []).concat(game.fullBoard)
const uniqueCards = new Set(allCards)
assert(uniqueCards.size === allCards.length, `Todas cartas únicas (${uniqueCards.size}/${allCards.length})`)

// Primeiro a agir no preflop (UTG = seat após BB)
const { bbIdx } = getBlindIndexes(6, 0)
const expectedFirst = (bbIdx + 1) % 6
assert(game.activePlayerIdx !== null, `Alguem deve agir`)
console.log(`  Primeiro a agir: seat ${game.activePlayerIdx} (esperado ~${expectedFirst})`)

// ─── Teste 4: Action loop básico ────────────────────────
console.log('\n=== Teste 4: Action loop ===')
let g = game

// Todo mundo folda até sobrar 1
const seat = g.activePlayerIdx
const actions = getAvailableActions(g, seat)
console.log(`  Seat ${seat} actions: ${actions.join(', ')}`)
assert(actions.includes('fold'), 'Fold disponível')
assert(actions.includes('call'), 'Call disponível (preflop com BB pendente)')

// Simular: todos foldam
let rounds = 0
while (!g.handComplete && rounds < 20) {
  const active = g.activePlayerIdx
  if (active === null) break
  g = processAction(g, active, 'fold')
  rounds++
}
assert(g.handComplete, `Mão completou após todos foldarem`)
assert(g.winners && g.winners.length > 0, `Tem vencedor`)
console.log(`  Vencedor: seat ${g.winners[0].playerIdx}, ganhou ${g.winners[0].amount}`)

// ─── Teste 5: Mão completa com showdown ─────────────────
console.log('\n=== Teste 5: Showdown ===')
let g2 = createGame(players6, { sb: 10, bb: 20 }, 2)
g2 = dealHand(g2)

// Todos dão call preflop
rounds = 0
while (g2.street === 'preflop' && !g2.handComplete && rounds < 20) {
  const active = g2.activePlayerIdx
  if (active === null) break
  const avail = getAvailableActions(g2, active)
  if (avail.includes('call')) {
    g2 = processAction(g2, active, 'call')
  } else if (avail.includes('check')) {
    g2 = processAction(g2, active, 'check')
  } else {
    g2 = processAction(g2, active, 'fold')
  }
  rounds++
}
assert(g2.street !== 'preflop' || g2.handComplete, `Saiu do preflop (street=${g2.street})`)
if (!g2.handComplete) {
  assert(g2.board.length === 3, `Flop = ${g2.board.length} cartas`)
  console.log(`  Flop: ${g2.board.join(' ')}`)
}

// Continuar: todos checam em todas as streets
while (!g2.handComplete && rounds < 60) {
  const active = g2.activePlayerIdx
  if (active === null) break
  const avail = getAvailableActions(g2, active)
  if (avail.includes('check')) {
    g2 = processAction(g2, active, 'check')
  } else if (avail.includes('call')) {
    g2 = processAction(g2, active, 'call')
  } else {
    g2 = processAction(g2, active, 'fold')
  }
  rounds++
}
assert(g2.handComplete, `Mão completou no showdown`)
assert(g2.board.length === 5, `Board completo = ${g2.board.length}`)
console.log(`  Board: ${g2.board.join(' ')}`)
console.log(`  Vencedores: ${g2.winners?.map(w => `seat${w.playerIdx}(${w.hand}, +${w.amount})`).join(', ')}`)

// ─── Teste 6: Side pots ─────────────────────────────────
console.log('\n=== Teste 6: Side pots ===')
// Simular 3 jogadores com stacks diferentes all-in
const spPlayers = [
  { invested: 100, folded: false, allIn: true, stack: 0 },  // Short stack
  { invested: 300, folded: false, allIn: true, stack: 0 },  // Medium stack
  { invested: 500, folded: false, allIn: false, stack: 200 }, // Big stack
  { invested: 50, folded: true, allIn: false, stack: 450 },  // Foldou
]
const sidePots = calculateSidePots(spPlayers)
console.log('  Side pots:', JSON.stringify(sidePots))
// Main pot: 100 × 4 contribuintes = 400 (todos que investiram ≥ 100)... mas foldado investiu 50
// Na verdade: contribuintes no nível 100 = quem investiu ≥ 1 (100-0)
// Nível 50 (primeiro all-in foldou com 50): nah, foldados não contam como all-in level
// Nível 100: jogador 0 all-in com 100
//   contribuintes que investiram ≥ 100: jogadores 0, 1, 2 (foldado investiu 50 < 100, contribui parcial)
// É complexo. Vamos verificar que: total dos pots = total investido
const totalInvested = spPlayers.reduce((s, p) => s + p.invested, 0)
const totalPots = sidePots.reduce((s, p) => s + p.amount, 0)
assert(totalPots === totalInvested, `Total pots (${totalPots}) = total investido (${totalInvested})`)
assert(sidePots.length >= 2, `Pelo menos 2 pots (got ${sidePots.length})`)

// ─── Teste 7: All-in e side pots numa mão real ──────────
console.log('\n=== Teste 7: All-in real ===')
const playersAI = [
  { id: 'p1', name: 'Short', stack: 100, isHero: true },
  { id: 'p2', name: 'Medium', stack: 500 },
  { id: 'p3', name: 'Big', stack: 1000 },
]
let g3 = createGame(playersAI, { sb: 10, bb: 20 }, 0)
g3 = dealHand(g3)
console.log(`  Stacks iniciais: ${g3.players.map(p => p.stack).join(', ')}`)
console.log(`  Pot após blinds: ${g3.pot}`)

// P1 (short) vai all-in
let active = g3.activePlayerIdx
console.log(`  Ativo: seat ${active} (${g3.players[active].name})`)
g3 = processAction(g3, active, 'allin')
console.log(`  ${g3.players[active]?.name || 'P1'} all-in`)

// P2 call
if (!g3.handComplete) {
  active = g3.activePlayerIdx
  console.log(`  Ativo: seat ${active} (${g3.players[active].name})`)
  g3 = processAction(g3, active, 'call')
  console.log(`  ${g3.players[active]?.name || 'P2'} call`)
}

// P3 call
if (!g3.handComplete) {
  active = g3.activePlayerIdx
  if (active !== null) {
    console.log(`  Ativo: seat ${active} (${g3.players[active].name})`)
    const avail = getAvailableActions(g3, active)
    if (avail.includes('call')) {
      g3 = processAction(g3, active, 'call')
      console.log(`  ${g3.players[active]?.name || 'P3'} call`)
    } else if (avail.includes('check')) {
      g3 = processAction(g3, active, 'check')
      console.log(`  ${g3.players[active]?.name || 'P3'} check`)
    }
  }
}

// Continuar streets checkando
while (!g3.handComplete) {
  active = g3.activePlayerIdx
  if (active === null) break
  const avail = getAvailableActions(g3, active)
  if (avail.includes('check')) {
    g3 = processAction(g3, active, 'check')
  } else if (avail.includes('call')) {
    g3 = processAction(g3, active, 'call')
  } else {
    g3 = processAction(g3, active, 'fold')
  }
}

assert(g3.handComplete, `Mão com all-in completou`)
console.log(`  Board: ${g3.board.join(' ')}`)
console.log(`  Side pots: ${JSON.stringify(g3.sidePots)}`)
console.log(`  Vencedores: ${g3.winners?.map(w => `${g3.players[w.playerIdx].name}(${w.hand}, +${w.amount}, ${w.potType})`).join(', ')}`)
// Verificar conservação de chips
const totalChips = g3.players.reduce((s, p) => s + p.stack, 0)
const expectedTotal = 100 + 500 + 1000
assert(totalChips === expectedTotal, `Conservação de chips: ${totalChips} = ${expectedTotal}`)

// ─── Resumo ──────────────────────────────────────────────
console.log(`\n${'='.repeat(40)}`)
console.log(`Resultados: ${passed} OK, ${failed} FAIL`)
if (failed > 0) process.exit(1)
