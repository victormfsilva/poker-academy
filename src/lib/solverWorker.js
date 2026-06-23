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
// Detect the exact offset where strategy frequencies live in get_results()
function detectResultsLayout(results, numCombosFiltered, numActions) {
  const stride = numCombosFiltered
  let bestMatch = { offset: 0, stride, score: 0 }
  const maxOffset = results.length - numActions * stride

  for (let offset = 0; offset <= maxOffset; offset++) {
    let goodCount = 0
    for (let i = 0; i < stride; i++) {
      let sum = 0
      let valid = true
      for (let a = 0; a < numActions; a++) {
        const v = results[offset + a * stride + i]
        if (v < -0.001 || v > 1.001) { valid = false; break }
        sum += v
      }
      if (valid && Math.abs(sum - 1.0) < 0.02) goodCount++
    }
    if (goodCount > bestMatch.score) {
      bestMatch = { offset, stride, score: goodCount }
      if (goodCount === stride) break
    }
  }

  return bestMatch
}

function getNodeStrategy(history) {
  if (!gm) return null

  gm.apply_history(new Uint32Array(history))

  const player = gm.current_player()
  if (player === 'terminal') return { player, history }
  if (player === 'chance') {
    // Return possible cards so frontend can pick a valid one
    const mask = gm.possible_cards()
    const possibleCards = []
    for (let i = 0; i < 52; i++) {
      if ((mask >> BigInt(i)) & 1n) possibleCards.push(i)
    }
    return { player, history, possibleCards }
  }

  const numActions = gm.num_actions()
  const resultsRaw = gm.get_results()
  const results = new Float64Array(resultsRaw)
  const actionsStr = gm.actions_after(new Uint32Array(history))
  const actions = actionsStr ? actionsStr.split('/') : []

  const playerIdx = player === 'oop' ? 0 : 1
  const pcRaw = gm.private_cards(playerIdx)
  const privateCards = new Uint16Array(pcRaw)
  const numCombos = privateCards.length

  // Auto-detect layout (offset and stride)
  const layout = detectResultsLayout(results, numCombos, numActions)
  const { offset: stratOffset, stride } = layout

  // Strategy: frequency per action per combo
  const strategy = []
  for (let a = 0; a < numActions; a++) {
    const arr = []
    for (let i = 0; i < numCombos; i++) {
      arr.push(results[stratOffset + a * stride + i])
    }
    strategy.push(arr)
  }

  // Weights are in block 0
  const weights = []
  for (let i = 0; i < numCombos; i++) weights.push(results[i])
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
  const resultsRaw = gm.get_results()
  const results = new Float64Array(resultsRaw)
  const actionsStr = gm.actions_after(new Uint32Array(history))
  const actions = actionsStr ? actionsStr.split('/') : []

  const playerIdx = player === 'oop' ? 0 : 1
  const pcRaw = gm.private_cards(playerIdx)
  const privateCards = new Uint16Array(pcRaw)
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

  // Auto-detect layout
  const layout = detectResultsLayout(results, numCombos, numActions)
  const { offset: stratOffset, stride } = layout

  const freqs = []
  for (let a = 0; a < numActions; a++) {
    freqs.push(results[stratOffset + a * stride + comboIdx])
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
