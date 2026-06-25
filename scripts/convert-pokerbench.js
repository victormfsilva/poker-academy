/**
 * Converte o CSV do PokerBench (10k cenários) para o formato JS da Poker Academy.
 *
 * Input:  pokerbench_postflop_10k.csv
 * Output: src/data/postflopScenarios.js (substitui o arquivo existente)
 *
 * Categorias baseadas em evaluation_at + última ação postflop:
 *   - facing_bet_flop: herói enfrenta bet no flop
 *   - facing_bet_turn: herói enfrenta bet no turn
 *   - facing_bet_river: herói enfrenta bet no river
 *   - bet_or_check_flop: herói decide apostar ou checar no flop
 *   - bet_or_check_turn: herói decide apostar ou checar no turn
 *   - bet_or_check_river: herói decide apostar ou checar no river
 *
 * Run: node scripts/convert-pokerbench.js
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const csvPath = resolve(__dirname, '..', 'pokerbench_postflop_10k.csv')
const outPath = resolve(__dirname, '..', 'src', 'data', 'postflopScenarios.js')

// Parse CSV (simple parser — fields don't contain newlines)
function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim())
  const header = parseCSVLine(lines[0])
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line)
    const obj = {}
    header.forEach((h, i) => obj[h] = vals[i] || '')
    return obj
  })
}

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

// Parse card string "Ks7h2d" → ["Ks","7h","2d"]
function parseBoard(boardStr) {
  if (!boardStr) return []
  const cards = []
  for (let i = 0; i < boardStr.length; i += 2) {
    cards.push(boardStr[i] + boardStr[i + 1])
  }
  return cards
}

// Parse holding "8h8c" → ["8h","8c"]
function parseHolding(h) {
  if (!h || h.length < 4) return []
  return [h[0] + h[1], h[2] + h[3]]
}

// Extract preflop position from preflop_action
// Format: "HJ/2.0bb/BB/call" → first position is the raiser
function extractPreflopPosition(preflopAction) {
  if (!preflopAction) return 'BTN'
  const parts = preflopAction.split('/')
  return parts[0] || 'BTN'
}

// Classify scenario into category
function classifyScenario(row) {
  const street = (row.evaluation_at || '').toLowerCase()
  const actions = row.postflop_action || ''
  const moves = row.available_moves || ''

  // Check if hero is facing a bet (available moves include Fold/Call)
  const isFacingBet = moves.includes('Fold') || moves.includes('Call')

  // Check if hero decides to bet or check (available moves include Check + Bet)
  const isBetOrCheck = moves.includes('Check') && (moves.includes('Bet') || moves.includes('Raise'))

  if (street === 'flop') {
    return isFacingBet ? 'facing_bet_flop' : 'bet_or_check_flop'
  } else if (street === 'turn') {
    return isFacingBet ? 'facing_bet_turn' : 'bet_or_check_turn'
  } else if (street === 'river') {
    return isFacingBet ? 'facing_bet_river' : 'bet_or_check_river'
  }
  return null
}

// Normalize decision
function normalizeDecision(decision) {
  if (!decision) return 'fold'
  const d = decision.toLowerCase().trim()
  if (d === 'check') return 'check'
  if (d === 'fold') return 'fold'
  if (d === 'call') return 'call'
  if (d.startsWith('raise') || d.startsWith('bet') || d.startsWith('all')) return 'raise'
  return d
}

// Build board based on evaluation street
function buildBoard(row) {
  const flop = parseBoard(row.board_flop)
  const street = (row.evaluation_at || '').toLowerCase()

  if (street === 'flop') return flop
  if (street === 'turn') return [...flop, ...parseBoard(row.board_turn)]
  if (street === 'river') return [...flop, ...parseBoard(row.board_turn), ...parseBoard(row.board_river)]
  return flop
}

// Main
const csv = readFileSync(csvPath, 'utf8')
const rows = parseCSV(csv)

console.log(`Parsed ${rows.length} rows from CSV`)

const categories = {
  facing_bet_flop: [],
  facing_bet_turn: [],
  facing_bet_river: [],
  bet_or_check_flop: [],
  bet_or_check_turn: [],
  bet_or_check_river: [],
}

let skipped = 0

for (const row of rows) {
  const cat = classifyScenario(row)
  if (!cat) { skipped++; continue }

  const board = buildBoard(row)
  const hand = parseHolding(row.holding)
  if (board.length < 3 || hand.length < 2) { skipped++; continue }

  const decision = normalizeDecision(row.correct_decision)
  const pot = parseInt(row.pot_size) || 0
  const heroPos = row.hero_position || 'IP'
  const pfPos = extractPreflopPosition(row.preflop_action)

  categories[cat].push({
    b: board,
    h: hand,
    d: decision,
    pot,
    hp: heroPos,
    pf: pfPos,
  })
}

// Stats
let total = 0
for (const [cat, items] of Object.entries(categories)) {
  console.log(`  ${cat}: ${items.length}`)
  total += items.length
}
console.log(`Total: ${total} scenarios (skipped: ${skipped})`)

// Generate JS output
let js = `// PokerBench GTO Postflop Scenarios
// Source: RZ412/PokerBench (solver-computed decisions)
// ${total} scenarios across 6 situation types
// Generated from postflop_10k_test_set (Hugging Face)

export const POSTFLOP_SCENARIOS = {
`

for (const [cat, items] of Object.entries(categories)) {
  const label = {
    facing_bet_flop: 'Facing a bet on the flop (call/fold/raise)',
    facing_bet_turn: 'Facing a bet on the turn',
    facing_bet_river: 'Facing a bet on the river',
    bet_or_check_flop: 'Bet or check on the flop',
    bet_or_check_turn: 'Bet or check on the turn',
    bet_or_check_river: 'Bet or check on the river',
  }[cat]

  js += `  // ${label}\n`
  js += `  ${cat}: [\n`
  for (const s of items) {
    const bStr = JSON.stringify(s.b)
    const hStr = JSON.stringify(s.h)
    js += `    {b:${bStr},h:${hStr},d:"${s.d}",pot:${s.pot},hp:"${s.hp}",pf:"${s.pf}"},\n`
  }
  js += `  ],\n\n`
}

js += `}

// Module mapping: which categories apply to which modules
export const POSTFLOP_MODULE_MAP = {
  5:  ['bet_or_check_flop'],           // CBet Flop IP
  10: ['facing_bet_flop'],             // Defesa vs CBet
  11: ['facing_bet_flop'],             // Check-Raise
  12: ['bet_or_check_flop'],           // Bet Sizing
  13: ['bet_or_check_flop'],           // Donk Bet
  14: ['bet_or_check_turn'],           // CBet Turn
  15: ['bet_or_check_river'],          // River Play
  25: ['bet_or_check_turn','bet_or_check_river'],  // Multi-Street Barrels
  28: ['facing_bet_turn'],             // Defesa vs Double Barrel
  29: ['facing_bet_river'],            // River Defense
  30: ['bet_or_check_turn'],           // Probe Bet
}

// All categories for Infinite mode
export const ALL_POSTFLOP_CATEGORIES = [
  'facing_bet_flop', 'facing_bet_turn', 'facing_bet_river',
  'bet_or_check_flop', 'bet_or_check_turn', 'bet_or_check_river',
]
`

writeFileSync(outPath, js)
console.log(`\nWritten to ${outPath}`)
