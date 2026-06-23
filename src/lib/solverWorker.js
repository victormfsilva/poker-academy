/**
 * WASM Postflop Solver — Web Worker
 * Usa os bindings oficiais gerados pelo wasm-bindgen
 */
import initRange, { RangeManager } from './wasm/range.js'
import initSolver, { GameManager } from './wasm/solver.js'

let rangeReady = false
let solverReady = false
let gm = null

// Card encoding: rank*4 + suit
// rank: 2=0, 3=1, ..., A=12
// suit: c=0, d=1, h=2, s=3
const RANKS = '23456789TJQKA'
const SUITS = 'cdhs'

function cardToIndex(cardStr) {
  const r = RANKS.indexOf(cardStr[0].toUpperCase())
  const s = SUITS.indexOf(cardStr[1].toLowerCase())
  if (r === -1 || s === -1) throw new Error('Invalid card: ' + cardStr)
  return r * 4 + s
}

function indexToCard(idx) {
  return RANKS[Math.floor(idx / 4)] + SUITS[idx % 4]
}

// ==========================================
// Initialization
// ==========================================
async function ensureInit() {
  if (!rangeReady) {
    try {
      const rangeUrl = new URL('/wasm-range.wasm', self.location.href)
      await initRange(rangeUrl)
      rangeReady = true
    } catch (e) {
      throw new Error('Failed to load wasm-range: ' + e.message)
    }
  }
  if (!solverReady) {
    try {
      const solverUrl = new URL('/wasm-solver.wasm', self.location.href)
      await initSolver(solverUrl)
      solverReady = true
    } catch (e) {
      throw new Error('Failed to load wasm-solver: ' + e.message)
    }
  }
}

// ==========================================
// Range conversion: text notation → Float32Array(1326)
// ==========================================
function rangeTextToArray(rangeStr) {
  const rm = RangeManager.new()
  const err = rm.from_string(rangeStr)
  if (err) {
    rm.free()
    throw new Error('Range parse error: ' + err)
  }
  const data = rm.raw_data()
  rm.free()
  return data
}

// ==========================================
// Solve a situation
// ==========================================
function solveSituation(config) {
  const {
    oopRange, ipRange, board,
    startingPot = 6, effectiveStack = 100,
    iterations = 200,
    betSizings = null
  } = config

  const range1 = rangeTextToArray(oopRange)
  const range2 = rangeTextToArray(ipRange)
  const boardBytes = new Uint8Array(board.map(c => typeof c === 'string' ? cardToIndex(c) : c))

  if (gm) { gm.free(); gm = null }
  gm = GameManager.new()

  const bets = betSizings || {
    oopFlopBet: '33%', oopFlopRaise: '',
    oopTurnBet: '75%', oopTurnRaise: '',
    oopTurnDonk: '',
    oopRiverBet: '75%', oopRiverRaise: 'a',
    oopRiverDonk: '',
    ipFlopBet: '33%', ipFlopRaise: '',
    ipTurnBet: '75%', ipTurnRaise: '',
    ipRiverBet: '75%', ipRiverRaise: 'a',
  }

  const err = gm.init(
    range1, range2, boardBytes,
    startingPot, effectiveStack,
    0, 0,       // rake_rate, rake_cap
    false,      // donk_option
    bets.oopFlopBet, bets.oopFlopRaise,
    bets.oopTurnBet, bets.oopTurnRaise,
    bets.oopTurnDonk || '',
    bets.oopRiverBet, bets.oopRiverRaise,
    bets.oopRiverDonk || '',
    bets.ipFlopBet, bets.ipFlopRaise,
    bets.ipTurnBet, bets.ipTurnRaise,
    bets.ipRiverBet, bets.ipRiverRaise,
    1.5,        // add_allin_threshold
    0.67,       // force_allin_threshold
    0.1,        // merging_threshold
    '', ''      // added_lines, removed_lines
  )

  if (err) throw new Error('Solver init error: ' + err)

  try {
    gm.allocate_memory(false)
  } catch (e) {
    throw new Error('Memory allocation failed (tree too large?): ' + e.message)
  }

  for (let i = 0; i < iterations; i++) {
    gm.solve_step(i)
  }
  const exploit = gm.exploitability()
  gm.finalize()

  return { exploit, iterations }
}

// ==========================================
// Get strategy at a node
// ==========================================
function getNodeStrategy(history) {
  if (!gm) return null

  gm.apply_history(new Uint32Array(history))

  const player = gm.current_player()
  if (player === 'terminal' || player === 'chance') return { player, history }

  const numActions = gm.num_actions()
  const results = gm.get_results()       // Float64Array
  const actionsStr = gm.actions_after(new Uint32Array(history))
  const actions = actionsStr ? actionsStr.split(':') : []

  // private_cards: player 0=OOP, 1=IP
  const playerIdx = player === 'oop' ? 0 : 1
  const privateCards = gm.private_cards(playerIdx)
  const numCombos = privateCards.length

  // Results layout: [weights(n), normalization(n), equity(n), ev(n), eqr(n), strategy[action*n]...]
  const headerSize = 5 * numCombos

  // Strategy: frequency per action per combo
  const strategy = []
  for (let a = 0; a < numActions; a++) {
    strategy.push(Array.from(results.subarray(headerSize + a * numCombos, headerSize + (a + 1) * numCombos)))
  }

  // Weights for averaging
  const weights = Array.from(results.subarray(0, numCombos))
  const totalWeight = weights.reduce((s, w) => s + w, 0)

  // Average frequency per action
  const avgFreqs = strategy.map(freqs => {
    if (totalWeight === 0) return 0
    let sum = 0
    for (let i = 0; i < numCombos; i++) sum += freqs[i] * weights[i]
    return sum / totalWeight
  })

  // Average equity
  const equityArr = Array.from(results.subarray(2 * numCombos, 3 * numCombos))
  let avgEquity = 0
  if (totalWeight > 0) {
    for (let i = 0; i < numCombos; i++) avgEquity += equityArr[i] * weights[i]
    avgEquity /= totalWeight
  }

  // Average EV
  const evArr = Array.from(results.subarray(3 * numCombos, 4 * numCombos))
  let avgEV = 0
  if (totalWeight > 0) {
    for (let i = 0; i < numCombos; i++) avgEV += evArr[i] * weights[i]
    avgEV /= totalWeight
  }

  return {
    player,
    actions,
    avgFreqs,
    avgEquity,
    avgEV,
    numCombos,
    numActions,
    history
  }
}

// For a specific hand, get the strategy frequencies
function getHandStrategy(history, hand) {
  if (!gm) return null

  gm.apply_history(new Uint32Array(history))
  const player = gm.current_player()
  if (player === 'terminal' || player === 'chance') return null

  const numActions = gm.num_actions()
  const results = gm.get_results()
  const actionsStr = gm.actions_after(new Uint32Array(history))
  const actions = actionsStr ? actionsStr.split(':') : []

  const playerIdx = player === 'oop' ? 0 : 1
  const privateCards = gm.private_cards(playerIdx)
  const numCombos = privateCards.length

  // Find the combo index for the given hand
  const c1 = cardToIndex(hand[0])
  const c2 = cardToIndex(hand[1])
  const handEncoded = Math.min(c1, c2) * 52 + Math.max(c1, c2)
  // privateCards are Uint16Array of encoded combos
  let comboIdx = -1
  for (let i = 0; i < numCombos; i++) {
    if (privateCards[i] === handEncoded) { comboIdx = i; break }
  }

  // Try reverse encoding if not found
  if (comboIdx === -1) {
    const handEncoded2 = Math.min(c1, c2) + Math.max(c1, c2) * 52
    for (let i = 0; i < numCombos; i++) {
      if (privateCards[i] === handEncoded2) { comboIdx = i; break }
    }
  }

  if (comboIdx === -1) return { actions, freqs: actions.map(() => 0), notInRange: true }

  const headerSize = 5 * numCombos
  const freqs = []
  for (let a = 0; a < numActions; a++) {
    freqs.push(results[headerSize + a * numCombos + comboIdx])
  }

  const equity = results[2 * numCombos + comboIdx]
  const ev = results[3 * numCombos + comboIdx]

  return { actions, freqs, equity, ev, comboIdx }
}

// ==========================================
// Message handler
// ==========================================
self.onmessage = async (e) => {
  const { type, id, data } = e.data
  try {
    if (type === 'init') {
      await ensureInit()
      self.postMessage({ id, result: { ok: true } })
    }
    else if (type === 'solve') {
      await ensureInit()
      const result = solveSituation(data)
      self.postMessage({ id, result })
    }
    else if (type === 'getStrategy') {
      const result = getNodeStrategy(data.history || [])
      self.postMessage({ id, result })
    }
    else if (type === 'getHandStrategy') {
      const result = getHandStrategy(data.history || [], data.hand)
      self.postMessage({ id, result })
    }
    else if (type === 'convertRange') {
      await ensureInit()
      const arr = rangeTextToArray(data.range)
      self.postMessage({ id, result: { length: arr.length, nonZero: Array.from(arr).filter(x => x > 0).length } })
    }
  } catch (err) {
    self.postMessage({ id, error: err.message })
  }
}
