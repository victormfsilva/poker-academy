// Teste standalone do Bot AI Multiway
// Rodar: node scripts/testBotAI.mjs
import {
  createGame, dealHand, processAction, getAvailableActions,
  calcPositions, getBlindIndexes, holeToNotation,
} from '../src/lib/pokerEngine.js'

import {
  botDecide, botPreflopDecision, botPostflopDecision,
  handStrength, boardTexture, blockerEffect,
  BOT_PROFILES, MTT_BOTS,
} from '../src/lib/botAI.js'

let passed = 0, failed = 0
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  OK: ${msg}`) }
  else { failed++; console.error(`  FAIL: ${msg}`) }
}

// ─── Teste 1: BOT_PROFILES e MTT_BOTS ───────────────────
console.log('\n=== Teste 1: Profiles e Bots ===')
assert(Object.keys(BOT_PROFILES).length >= 5, `${Object.keys(BOT_PROFILES).length} perfis de bot`)
assert(MTT_BOTS.length === 5, `${MTT_BOTS.length} bots para MTT`)
assert(MTT_BOTS.every(b => BOT_PROFILES[b.profile]), 'Todos bots têm perfil válido')
const uniqueProfiles = new Set(MTT_BOTS.map(b => b.profile))
assert(uniqueProfiles.size >= 4, `${uniqueProfiles.size} perfis únicos nos bots (>= 4)`)
console.log('  Bots:', MTT_BOTS.map(b => `${b.name}(${b.profile})`).join(', '))

// ─── Teste 2: handStrength ───────────────────────────────
console.log('\n=== Teste 2: handStrength ===')
assert(handStrength(['As','Ah'], ['Ac','Kd','7h']) === 'strong', 'Set de Ases = strong')
assert(handStrength(['As','Kh'], ['Ad','Kd','7h']) === 'strong', 'Two pair AK = strong')
assert(handStrength(['Qs','Qh'], ['7d','5c','2h']) === 'good', 'Overpair QQ = good')
assert(handStrength(['As','Kh'], ['Kd','7c','3h']) === 'good', 'Top pair AK = good')
assert(handStrength(['7s','6s'], ['8s','9s','2h']) === 'good', 'Flush+straight draw = good')
assert(handStrength(['7s','6s'], ['8d','9c','2h']) === 'draw', 'OESD = draw')
assert(handStrength(['5s','4s'], ['5d','Kc','Jh']) === 'marginal', 'Bottom pair = marginal')
assert(handStrength(['2s','3h'], ['Kd','Qc','Jh']) === 'air', 'Nada = air')

// ─── Teste 3: boardTexture ───────────────────────────────
console.log('\n=== Teste 3: boardTexture ===')
const wetBoard = boardTexture(['Kh','Qh','Jh'])
assert(wetBoard.monotone === true, 'KQJ todos hearts = monotone')
assert(wetBoard.connected === true, 'KQJ = connected')
assert(wetBoard.wet === true, 'KQJ = wet')

const dryBoard = boardTexture(['2d','7c','Ks'])
assert(dryBoard.wet === false, '2-7-K rainbow = dry')
assert(dryBoard.monotone === false, 'Rainbow = not monotone')

const pairedBoard = boardTexture(['Kd','Kc','3h'])
assert(pairedBoard.paired === true, 'KK3 = paired')

// ─── Teste 4: blockerEffect ──────────────────────────────
console.log('\n=== Teste 4: blockerEffect ===')
const fb = blockerEffect(['Ah','Kh'], ['Qh','Jh','2c'])
assert(fb.flushBlocker === true, 'AhKh com 2 hearts no board = flush blocker')
assert(fb.bluffBoost > 0, `bluffBoost = ${fb.bluffBoost.toFixed(2)} > 0`)

const noBlocker = blockerEffect(['2d','3c'], ['Kh','Qh','Js'])
assert(noBlocker.flushBlocker === false, '2d3c sem flush blocker')

// ─── Teste 5: RFI decision ──────────────────────────────
console.log('\n=== Teste 5: RFI (First In) ===')
const players6 = [
  { id: 'hero', name: 'Hero', stack: 1500, isHero: true },
  ...MTT_BOTS.map(b => ({ ...b, stack: 1500 }))
]
let g = createGame(players6, { sb: 10, bb: 20 }, 3) // dealer=3 (BTN)
g = dealHand(g)

// Forçar cartas para testar RFI
// UTG (seat 0 se dealer=3): deve ter posição UTG
console.log('  Posições:', g.players.map(p => `${p.name}=${p.position}`).join(', '))

// Testar RFI com AA — deve sempre raisar
const gTest = JSON.parse(JSON.stringify(g))
gTest.players[gTest.activePlayerIdx].holeCards = ['As', 'Ah']
const aaDecision = botDecide(gTest, gTest.activePlayerIdx)
assert(aaDecision.action === 'raise' || aaDecision.action === 'allin', `AA first in = ${aaDecision.action} (raise/allin)`)

// Testar RFI com 72o — deve foldar (quase sempre)
const gTest2 = JSON.parse(JSON.stringify(g))
gTest2.players[gTest2.activePlayerIdx].holeCards = ['7d', '2c']
let foldCount = 0
for (let i = 0; i < 20; i++) {
  const dec = botDecide(JSON.parse(JSON.stringify(gTest2)), gTest2.activePlayerIdx)
  if (dec.action === 'fold') foldCount++
}
assert(foldCount >= 15, `72o first in folda >= 75% (${foldCount}/20)`)

// ─── Teste 6: Vs Raise (BB defende) ─────────────────────
console.log('\n=== Teste 6: Vs Raise (BB defense) ===')
let g2 = createGame(players6, { sb: 10, bb: 20 }, 3)
g2 = dealHand(g2)
// UTG raises
const utgIdx = g2.activePlayerIdx
g2 = processAction(g2, utgIdx, 'raise', g2.blinds.bb * 2.5)
// MP folds
if (g2.activePlayerIdx !== null && !g2.handComplete) {
  g2 = processAction(g2, g2.activePlayerIdx, 'fold')
}
// CO folds
if (g2.activePlayerIdx !== null && !g2.handComplete) {
  g2 = processAction(g2, g2.activePlayerIdx, 'fold')
}
// BTN folds
if (g2.activePlayerIdx !== null && !g2.handComplete) {
  g2 = processAction(g2, g2.activePlayerIdx, 'fold')
}
// SB folds
if (g2.activePlayerIdx !== null && !g2.handComplete) {
  g2 = processAction(g2, g2.activePlayerIdx, 'fold')
}
// BB facing UTG raise com AKs — deve 3-bet ou call
if (g2.activePlayerIdx !== null && !g2.handComplete) {
  const bbIdx = g2.activePlayerIdx
  const gBB = JSON.parse(JSON.stringify(g2))
  gBB.players[bbIdx].holeCards = ['As', 'Ks']
  const bbDec = botDecide(gBB, bbIdx)
  assert(bbDec.action === 'raise' || bbDec.action === 'call', `BB AKs vs UTG raise = ${bbDec.action} (raise/call)`)
}

// ─── Teste 7: Push/Fold ─────────────────────────────────
console.log('\n=== Teste 7: Push/Fold (short stack) ===')
const shortPlayers = [
  { id: 'hero', name: 'Hero', stack: 200, isHero: true },
  ...MTT_BOTS.map(b => ({ ...b, stack: 1500 }))
]
let g3 = createGame(shortPlayers, { sb: 10, bb: 20 }, 3) // hero stack = 10bb
g3 = dealHand(g3)
// Encontrar hero
const heroIdx = g3.players.findIndex(p => p.isHero)
if (g3.activePlayerIdx === heroIdx) {
  const gShort = JSON.parse(JSON.stringify(g3))
  gShort.players[heroIdx].holeCards = ['As', 'Ks']
  const shortDec = botDecide(gShort, heroIdx)
  assert(shortDec.action === 'allin' || shortDec.action === 'raise', `AKs com 10bb first in = ${shortDec.action} (allin/raise)`)
}

// ─── Teste 8: Postflop multiway ─────────────────────────
console.log('\n=== Teste 8: Postflop multiway ===')
let g4 = createGame(players6, { sb: 10, bb: 20 }, 0)
g4 = dealHand(g4)
// Todos dão call preflop
let rounds = 0
while (g4.street === 'preflop' && !g4.handComplete && rounds < 20) {
  const active = g4.activePlayerIdx
  if (active === null) break
  g4 = processAction(g4, active, 'call')
  rounds++
}

if (!g4.handComplete && g4.street === 'flop') {
  const active = g4.activePlayerIdx
  if (active !== null) {
    const gFlop = JSON.parse(JSON.stringify(g4))
    gFlop.players[active].holeCards = ['As', 'Ad'] // AA no flop
    const flopDec = botPostflopDecision(gFlop, active)
    assert(['bet', 'check', 'raise'].includes(flopDec.action), `AA no flop multiway = ${flopDec.action}`)
    console.log(`  AA no flop 6-way: ${flopDec.action} (amount: ${flopDec.amount})`)
  }
}

// ─── Teste 9: Perfis diferenciados ──────────────────────
console.log('\n=== Teste 9: Perfis diferenciados ===')
// Simular 100 decisões RFI com mãos borderline para cada perfil
const borderlineHands = ['A7s', 'K9s', 'QTs', '76s', '55']
const profileStats = {}

for (const [profName, prof] of Object.entries(BOT_PROFILES)) {
  let raises = 0, folds = 0
  for (let i = 0; i < 100; i++) {
    const hand = borderlineHands[i % borderlineHands.length]
    // dealer=4 → SB=5, BB=0, first to act=1 (UTG position)
    let gSim = createGame([
      { id: 'bb', name: 'BB', stack: 1500 },
      { id: 'test', name: 'Test', stack: 1500, profile: profName },
      ...MTT_BOTS.slice(0, 4).map(b => ({ ...b, stack: 1500 }))
    ], { sb: 10, bb: 20 }, 4)
    gSim = dealHand(gSim)
    // Seat 1 (Test) deve ser o primeiro a agir (UTG)
    const testIdx = 1
    if (gSim.activePlayerIdx === testIdx) {
      gSim.players[testIdx].holeCards = hand === '55' ? ['5s', '5h'] :
        hand === 'A7s' ? ['As', '7s'] :
        hand === 'K9s' ? ['Ks', '9s'] :
        hand === 'QTs' ? ['Qs', 'Ts'] :
        ['7s', '6s']
      const dec = botDecide(gSim, testIdx)
      if (dec.action === 'raise' || dec.action === 'allin') raises++
      else folds++
    }
  }
  profileStats[profName] = { raises, folds }
}

console.log('  Perfis (borderline hands RFI):')
for (const [name, stats] of Object.entries(profileStats)) {
  console.log(`    ${name}: ${stats.raises} raises, ${stats.folds} folds`)
}

// LAG deve raisar mais que NIT
assert(
  (profileStats.lag?.raises || 0) > (profileStats.nit?.raises || 0),
  `LAG raises (${profileStats.lag?.raises}) > NIT raises (${profileStats.nit?.raises})`
)

// ─── Teste 10: Mão completa com bots decidindo ──────────
console.log('\n=== Teste 10: Mão completa com botDecide ===')
let g5 = createGame(players6, { sb: 10, bb: 20 }, 0)
g5 = dealHand(g5)
rounds = 0
while (!g5.handComplete && rounds < 80) {
  const active = g5.activePlayerIdx
  if (active === null) break
  const player = g5.players[active]

  if (player.isHero) {
    // Hero: fold pra simplificar o teste
    g5 = processAction(g5, active, 'fold')
  } else {
    // Bot decide
    const decision = botDecide(g5, active)
    const avail = getAvailableActions(g5, active)

    // Mapear decisão para ação válida
    let action = decision.action
    if (!avail.includes(action)) {
      // Fallback
      if (action === 'bet' && avail.includes('raise')) action = 'raise'
      else if (action === 'raise' && avail.includes('bet')) action = 'bet'
      else if (avail.includes('check')) action = 'check'
      else if (avail.includes('call')) action = 'call'
      else action = 'fold'
    }

    g5 = processAction(g5, active, action, decision.amount)
  }
  rounds++
}
assert(g5.handComplete, `Mão completou com bots decidindo (${rounds} rounds)`)
const totalChips = g5.players.reduce((s, p) => s + p.stack, 0)
const expectedChips = players6.reduce((s, p) => s + p.stack, 0)
assert(totalChips === expectedChips, `Conservação de chips: ${totalChips} = ${expectedChips}`)
console.log(`  Board: ${g5.board.join(' ')}`)
if (g5.winners) {
  console.log(`  Vencedores: ${g5.winners.map(w => `${g5.players[w.playerIdx].name}(${w.hand || 'fold win'}, +${w.amount})`).join(', ')}`)
}

// ─── Teste 11: Múltiplas mãos consecutivas ──────────────
console.log('\n=== Teste 11: 10 mãos consecutivas ===')
let gMulti = createGame(players6, { sb: 10, bb: 20 }, 0)
let handsCompleted = 0

for (let h = 0; h < 10; h++) {
  gMulti = dealHand(gMulti)
  rounds = 0
  while (!gMulti.handComplete && rounds < 80) {
    const active = gMulti.activePlayerIdx
    if (active === null) break
    const player = gMulti.players[active]

    if (player.isHero) {
      gMulti = processAction(gMulti, active, 'fold')
    } else {
      const decision = botDecide(gMulti, active)
      const avail = getAvailableActions(gMulti, active)
      let action = decision.action
      if (!avail.includes(action)) {
        if (action === 'bet' && avail.includes('raise')) action = 'raise'
        else if (action === 'raise' && avail.includes('bet')) action = 'bet'
        else if (avail.includes('check')) action = 'check'
        else if (avail.includes('call')) action = 'call'
        else action = 'fold'
      }
      gMulti = processAction(gMulti, active, action, decision.amount)
    }
    rounds++
  }

  if (gMulti.handComplete) {
    handsCompleted++
    // Preparar próxima mão
    const { advanceDealer } = await import('../src/lib/pokerEngine.js')
    gMulti.dealerIdx = advanceDealer(gMulti)
  }
}

const finalChips = gMulti.players.reduce((s, p) => s + p.stack, 0)
assert(handsCompleted === 10, `${handsCompleted}/10 mãos completaram`)
assert(finalChips === expectedChips, `Conservação de chips após 10 mãos: ${finalChips} = ${expectedChips}`)
console.log(`  Stacks finais: ${gMulti.players.map(p => `${p.name}:${p.stack}`).join(', ')}`)

// ─── Resumo ─────────────────────────────────────────────
console.log(`\n${'='.repeat(40)}`)
console.log(`Resultados: ${passed} OK, ${failed} FAIL`)
if (failed > 0) process.exit(1)
