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
  cachedStrategyOffset = -1
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
// Find strategy offset in results by searching for blocks where action freqs sum to ~1
let cachedStrategyOffset = -1

function findStrategyOffset(results, numCombos, numActions) {
  if (cachedStrategyOffset >= 0) return cachedStrategyOffset
  // Scan possible header sizes (0 to 10 blocks)
  for (let h = 0; h <= 12; h++) {
    const offset = h * numCombos
    if (offset + numActions * numCombos > results.length) break
    let goodCount = 0
    for (let i = 0; i < numCombos; i++) {
      let sum = 0
      for (let a = 0; a < numActions; a++) {
        const v = results[offset + a * numCombos + i]
        if (v < -0.01 || v > 1.01) { sum = -999; break }
        sum += v
      }
      if (Math.abs(sum - 1.0) < 0.1) goodCount++
    }
    if (goodCount > numCombos * 0.4) {
      cachedStrategyOffset = h
      return h
    }
  }
  // Fallback: try header=5 (original assumption)
  return 5
}

function getNodeStrategy(history) {
  if (!gm) return null

  gm.apply_history(new Uint32Array(history))

  const player = gm.current_player()
  if (player === 'terminal' || player === 'chance') return { player, history }

  const numActions = gm.num_actions()
  const results = gm.get_results()
  const actionsStr = gm.actions_after(new Uint32Array(history))
  const actions = actionsStr ? actionsStr.split(':') : []

  const playerIdx = player === 'oop' ? 0 : 1
  const privateCards = gm.private_cards(playerIdx)
  const numCombos = privateCards.length

  // Auto-detect strategy offset
  const headerBlocks = findStrategyOffset(results, numCombos, numActions)
  const headerSize = headerBlocks * numCombos

  // Strategy: frequency per action per combo
  const strategy = []
  for (let a = 0; a < numActions; a++) {
    strategy.push(Array.from(results.subarray(headerSize + a * numCombos, headerSize + (a + 1) * numCombos)))
  }

  // Weights are in block 0
  const weights = Array.from(results.subarray(0, numCombos))
  const totalWeight = weights.reduce((s, w) => s + w, 0)

  // Average frequency per action
  const avgFreqs = strategy.map(freqs => {
    if (totalWeight === 0) return 0
    let sum = 0
    for (let i = 0; i < numCombos; i++) sum += freqs[i] * weights[i]
    return sum / totalWeight
  })

  return {
    player,
    actions,
    avgFreqs,
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
  // wasm-postflop encodes combos as: low_card | (high_card << 8)
  const c1 = cardToIndex(hand[0])
  const c2 = cardToIndex(hand[1])
  const lo = Math.min(c1, c2)
  const hi = Math.max(c1, c2)
  const handEncoded = lo | (hi << 8)
  let comboIdx = -1
  for (let i = 0; i < numCombos; i++) {
    if (privateCards[i] === handEncoded) { comboIdx = i; break }
  }

  if (comboIdx === -1) return { actions, freqs: actions.map(() => 0), notInRange: true }

  // Auto-detect strategy offset
  const headerBlocks = findStrategyOffset(results, numCombos, numActions)
  const headerSize = headerBlocks * numCombos

  const freqs = []
  for (let a = 0; a < numActions; a++) {
    freqs.push(results[headerSize + a * numCombos + comboIdx])
  }

  return { actions, freqs, comboIdx }
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
