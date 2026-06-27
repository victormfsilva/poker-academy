/**
 * SPIN & GO SOLVER DATA — MCCFR Pre-Computed Ranges
 * Fonte: Spin_and_Go_Solver (jamdickin11) — MCCFR com 15bb, 3-max, 7% rake
 *
 * Ranges originais são FOLD sets. Invertemos para PLAY sets (tudo que NÃO está no fold).
 * Notação convertida de C++ ("810o" → "T8o", "3Ao" → "A3o", "10Qs" → "QTs")
 *
 * Action History:
 *   BTN age primeiro (depois de postar blinds)
 *   BET_2 = min-raise (2x), BET_3 = 3-bet, BET_4 = 4-bet, ALL_IN = shove
 *
 * Cada set cobre UM cenário de action history no preflop 3-max 15bb.
 */

// ─── Todas as 169 mãos possíveis ─────────────────────────
const ALL_HANDS = [
  // Pares
  'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
  // Suited
  'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
  'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','K4s','K3s','K2s',
  'QJs','QTs','Q9s','Q8s','Q7s','Q6s','Q5s','Q4s','Q3s','Q2s',
  'JTs','J9s','J8s','J7s','J6s','J5s','J4s','J3s','J2s',
  'T9s','T8s','T7s','T6s','T5s','T4s','T3s','T2s',
  '98s','97s','96s','95s','94s','93s','92s',
  '87s','86s','85s','84s','83s','82s',
  '76s','75s','74s','73s','72s',
  '65s','64s','63s','62s',
  '54s','53s','52s',
  '43s','42s',
  '32s',
  // Offsuit
  'AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o','A5o','A4o','A3o','A2o',
  'KQo','KJo','KTo','K9o','K8o','K7o','K6o','K5o','K4o','K3o','K2o',
  'QJo','QTo','Q9o','Q8o','Q7o','Q6o','Q5o','Q4o','Q3o','Q2o',
  'JTo','J9o','J8o','J7o','J6o','J5o','J4o','J3o','J2o',
  'T9o','T8o','T7o','T6o','T5o','T4o','T3o','T2o',
  '98o','97o','96o','95o','94o','93o','92o',
  '87o','86o','85o','84o','83o','82o',
  '76o','75o','74o','73o','72o',
  '65o','64o','63o','62o',
  '54o','53o','52o',
  '43o','42o',
  '32o',
]

// ─── Converter notação C++ → PA ──────────────────────────
// C++ usa: "10" para T, rank menor primeiro ("3Ao" = A3o), "810o" = T8o
function convertCppHand(h) {
  // Extrair suitedness
  const suit = h.endsWith('s') ? 's' : h.endsWith('o') ? 'o' : ''
  const body = suit ? h.slice(0, -1) : h

  // Parse ranks (handle "10" as special case)
  let ranks = []
  let i = 0
  while (i < body.length) {
    if (body.substring(i, i + 2) === '10') {
      ranks.push('T')
      i += 2
    } else {
      ranks.push(body[i])
      i++
    }
  }

  if (ranks.length !== 2) return null

  // Converter rank names
  const rankOrder = { 'A': 14, 'K': 13, 'Q': 12, 'J': 11, 'T': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 }
  const r0 = rankOrder[ranks[0]] || 0
  const r1 = rankOrder[ranks[1]] || 0

  // PA notation: higher rank first
  const hi = r0 >= r1 ? ranks[0] : ranks[1]
  const lo = r0 >= r1 ? ranks[1] : ranks[0]

  // Pairs have no suit suffix
  if (hi === lo) return `${hi}${lo}`
  return `${hi}${lo}${suit}`
}

// ─── FOLD sets do solver (convertidos) ───────────────────
// Cada set é o que o solver diz para FOLD naquela situação

const SOLVER_FOLD_SETS = {
  // BTN first to act (no prior action)
  BTN: new Set([
    'A3o','A2o',
    'K8o','K7o','K6o','K5o','K4o','K3o','K2o',
    'Q8o','Q7o','Q6o','Q5o','Q4o','Q3o','Q2o',
    'J8o','J7o','J6o','J5o','J4o','J3o','J2o',
    'T8o','T7o','T6o','T5o','T4o','T3o','T2o',
    '98o','97o','96o','95o','94o','93o','92o',
    '87o','86o','85o','84o','83o','82o',
    '76o','75o','74o','73o','72o',
    '65o','64o','63o','62o',
    '54o','53o','52o',
    '43o','42o',
    '32o',
    'K3s','K2s',
    'Q5s','Q4s','Q3s','Q2s',
    'J6s','J5s','J4s','J3s','J2s',
    'T6s','T5s','T4s','T3s','T2s',
    '96s','95s','94s','93s','92s',
    '85s','84s','83s','82s',
    '75s','74s','73s','72s',
    '65s','64s','63s','62s',
    '54s','53s','52s',
    '43s','42s',
    '32s',
  ]),

  // SB when BTN folded
  SB_BTN_FOLD: new Set([
    '52o','92o','75o','54o','93o','64o','53o','T4o','J6o','Q3o','J2o','32o',
    '95o','T6o','85o','47o','T5o','94o','69o','73o','83o','63o','T2o','43o',
    '42o','J5o','84o','72o','82o','83o','T3o','Q2o','62o',
    '62s','72s','73s','92s','82s','42s','32s',
    'J4o','J3o','Q4o',
  ]),

  // SB when BTN min-raised (BET_2)
  SB_BTN_RAISE: new Set([
    '95o','K3s','J2s','53s','86s','96o','J3s','Q5s','54o','86o','52s','K6s','K7s',
    '92o','J5s','85s','Q2o','73s','J3o','T2s','75o','Q5o','K8o','J8s','43s','67o',
    '73o','95s','K5o','94o','63o','A3o','T6s','67s','J8o','QTo','Q8o','K4o','87o',
    'K9o','Q2s','K7o','84s','T9o','K4s','83s','62s','57s','82s','J6o','32s','42o',
    'T5o','82o','85o','K2s','T4s','A4o','Q6o','T4o','93s','J4o','32o','93o','43o',
    '79s','52o','Q7o','T3o','J9o','J5o','Q7s','72o','94s','53o','Q9o','Q8s','T2o',
    'A2o','J2o','T7o','96s','Q4o','54s','T8o','64o','J7s','T6o','Q6s','72s','79o',
    '63s','K6o','83o','T7s','84o','74s','K3o','J7o','Q3s','42s','T5s','K2o','65o',
    'Q3o','J6s','92s','74o','J4s','T3s','46s','62o','56s','Q4s','K5s','98o',
  ]),

  // SB when BTN shoved (ALL_IN)
  SB_BTN_ALLIN: new Set([
    'QTs','T8s','K8o','A5o','Q6s','32s','Q6o','T2o','T8o','73o','74o','A4s','Q9o',
    'Q9s','TKo','K4s','K8s','73s','85s','J2o','72o','87o','K5o','T6o','87s','74s',
    '62o','A5s','83o','Q2s','Q3s','93s','T6s','K3s','79o','T4o','92s','Q8s','Q5o',
    '52o','J3s','TKs','QJo','22','K4o','53s','52s','T5o','Q5s','98o','A3s','J8s',
    'A2o','K6s','K3o','95o','95s','72s','K2o','A6s','63o','A2s','J9o','J6o','JKo',
    '62s','56s','K2s','K5s','J5o','TJs','Q4s','J4s','T9o','K7o','86s','T7s','86o',
    '93o','A7o','53o','46s','K9o','92o','32o','75o','85o','K9s','57s','A6o','TJo',
    '94s','T4s','96s','54o','54s','J5s','A4o','65o','T5s','98s','K7s','T7o','96o',
    'J4o','84s','J9s','QTo','82o','A3o','84o','64o','43s','82s','67s','Q4o','Q2o',
    '79s','J6s','Q7s','42o','J3o','J7s','67o','83s','42s','63s','J7o','J8o','J2s',
    'T3o','Q8o','Q3o','94o','Q7o','T3s','T9s','43o','T2s','K6o',
  ]),

  // BB when BTN folded, SB 3-bet (BET_3)
  BB_BTN_FOLD_SB_3BET: new Set([
    '92o','63o','94o','62o','83s','T3o','83o','Q5o','52o','T5o','Q3o','T6o','J5o',
    '82o','T2o','K3o','85o','32o','82s','T4o','93o','J4o','95o','72s','K2o','J6o',
    'Q4o','J2o','Q2o','84o','53o','42o','75o','J3o','K4o','73o','43o','64o','T7o',
    '86o','74o','96o','72o',
  ]),

  // BB when BTN folded, SB shoved (ALL_IN)
  BB_BTN_FOLD_SB_ALLIN: new Set([
    '85o','T8s','72o','K5s','K4s','84o','Q4s','J4s','J9o','96s','Q6o','J6o','84s',
    'T5s','87o','Q9o','92s','T2o','Q8s','83s','32o','Q4o','54o','T2s','62o','79s',
    '64o','92o','63o','98s','94o','K6o','73s','94s','96o','86s','J4o','T9o','Q7s',
    'K9o','T7o','Q3s','T3o','T5o','87s','82s','43o','42s','T6s','65o','Q8o','J5o',
    'Q3o','75o','K8o','Q7o','67o','K5o','95o','Q2o','T4o','82o','53s','52s','QTo',
    '53o','63s','54s','T8o','42o','74o','T6o','Q5o','62s','J6s','T3s','A2o','Q2s',
    'K2o','J8o','72s','K7o','J3o','Q5s','83o','K3o','J2o','73o','T7s','93s','85s',
    '74s','79o','43s','J7o','J5s','K6s','J7s','T4s','95s','46s','J8s','K7s','K2s',
    'J3s','52o','93o','67s','A3o','57s','K3s','32s','98o','K4o','J2s','56s','86o',
    'Q6s',
  ]),

  // BB when BTN raised, SB folded
  BB_BTN_RAISE_SB_FOLD: new Set([
    'J5o','52o','J4o','82o','84o','74o','62o','95o','Q2o','53o','93o','75o','73o',
    '32o','J6o','T4o','83o','63o','T3o','85o','72o','T5o','J2o','42o','J3o','T6o',
    '94o','T2o','92o',
  ]),

  // BB when BTN raised, SB called
  BB_BTN_RAISE_SB_CALL: new Set([
    '74o','Q6o','J4o','J5o','32o','86o','T5o','73o','J8o','42o','K2o','43o','93o',
    'T3o','K8o','63o','92o','79o','T4o','T7o','J3o','94o','62o','52o','87o','K7o',
    'Q7o','J6o','83o','Q8o','K5o','95o','Q3o','Q2o','T6o','85o','J2o','Q4o','Q5o',
    'J7o','K3o','96o','82o','84o','K4o','K6o','T2o','72o',
  ]),

  // BB when BTN raised, SB 4-bet (BET_4)
  BB_BTN_RAISE_SB_4BET: new Set([
    'J4s','Q2o','Q6s','92s','82s','TKo','K9s','96o','96s','K4s','44','94o','J3s',
    'K5s','K2o','92o','J8s','94s','Q5o','72o','J7s','54s','T4s','A5o','K6o','T8o',
    'Q7s','T7s','Q8o','63o','Q8s','95o','52o','JKo','A4o','74s','K4o','K5o','J8o',
    'QTo','56s','Q7o','Q9o','J5o','T9s','87o','84s','73s','57s','K7o','Q2s','43o',
    'K7s','84o','93o','53o','43s','K3o','22','A8o','86o','J2s','73o','K8s','K6s',
    '98s','J2o','98o','67s','K8o','J7o','A2o','A9o','74o','32o','62s','A7o','T5s',
    'QTs','Q3s','T6s','55','93s','J4o','75o','87s','T2s','65o','46s','T4o','83o',
    'T3s','J3o','52s','A6o','Q4s','64o','J9s','53s','63s','Q6o','TJo','42o','79o',
    '95s','J6o','54o','A2s','K3s','J5s','QJo','T6o','K2s','T8s','42s','85s','A3o',
    'T5o','J9o','J6s','Q4o','86s','T7o','72s','Q3o','67o','T9o','33','Q5s','85o',
    'Q9s','K9o','82o','T2o','79s','62o','83s','T3o','32s',
  ]),

  // BB when BTN raised, SB shoved (ALL_IN)
  BB_BTN_RAISE_SB_ALLIN: new Set([
    'A4s','J9o','T2o','74o','QKo','T6o','A7s','53s','63o','JKo','57s','T5o','62o',
    '72o','54o','Q6o','K8s','J8s','QJo','T4o','54s','73o','TJo','A6o','J6o','98o',
    'T7o','J7s','K6o','K6s','Q5s','Q2s','A5s','K7s','87s','84s','93o','T7s','K5o',
    '92o','94s','Q8o','Q4s','A3s','33','Q2o','T8s','46s','42o','Q7s','63s','T3s',
    'J2s','A5o','Q5o','98s','52s','79s','83o','T4s','86o','72s','95o','95s','75o',
    'Q9s','A2o','96s','J6s','Q9o','86s','A9o','J4o','K8o','32o','QTo','T3o','T5s',
    '73s','T9o','TKo','79o','85o','T2s','K9s','85s','67o','A3o','K2o','A4o','A6s',
    '87o','J4s','J5s','65o','Q3o','Q8s','T9s','52o','82o','93s','64o','Q3s','T6s',
    '62s','QTs','J8o','J2o','Q7o','K4s','Q6s','A8o','K4o','22','42s','K7o','K2s',
    'J3s','Q4o','A8s','94o','82s','A7o','K3s','K9o','74s','55','53o','96o','K3o',
    '92s','A2s','32s','J5o','67s','84o','TKs','43o','83s','43s','56s','J3o','J7o',
    'K5s','T8o',
  ]),

  // BB when BTN shoved, SB folded
  BB_BTN_ALLIN_SB_FOLD: new Set([
    '94s','92o','J7s','Q8o','QTo','A3o','K2s','J2o','53o','T9o','Q7o','Q7s','TKo',
    'J6o','72o','Q8s','T6s','K6s','56s','J3s','67s','K8s','Q2s','K9o','T2s','T7s',
    'Q9s','A6o','43o','Q3o','J4o','Q6o','84s','K3o','98o','32o','83s','A4o','93o',
    '22','J9o','65o','52o','J4s','87s','T6o','98s','85o','J2s','A2s','T3o','79s',
    '73s','K7o','K5s','Q3s','T5s','T2o','K4o','32s','T7o','T5o','96o','Q2o','J8o',
    '84o','TJo','54s','67o','J9s','94o','63o','79o','54o','75o','42s','64o','Q5s',
    'A2o','Q9o','63s','K2o','J5o','83o','J8s','96s','K3s','Q5o','J6s','K7s','T8o',
    '92s','K6o','T4s','K5o','K8o','95o','72s','87o','74o','K4s','86o','85s','52s',
    'J3o','J7o','74s','86s','53s','55','62o','T8s','43s','T4o','K9s','42o','62s',
    'T3s','73o','57s','93s','Q4s','95s','82s','J5s','A3s','46s','Q4o','T9s','82o',
  ]),

  // BB when BTN shoved, SB shoved (both all-in)
  BB_BTN_ALLIN_SB_ALLIN: new Set([
    'T3o','K3o','J5o','K8o','T4s','86o','Q9o','T5s','T6o','A5s','A9s','96s','Q6o',
    '96o','J5s','T3s','T8s','A7o','Q2o','Q4o','Q5s','K5o','A6o','J4o','82o','Q5o',
    'J6s','85o','46s','63o','K9s','93s','A10o','Q8o','K2o','42s','K9o','T8o','A6s',
    'QJo','A5o','K4o','TJo','T4o','56s','K8s','T6s','95s','K6o','65o','62s','54o',
    'J9s','J2s','JKo','52o','A8s','J3s','87s','73s','42o','98o','92s','74o','J6o',
    'T7o','67o','32o','A4s','98s','22','A3s','T5o','Q7s','A2s','J8s','K7s','QTo',
    'J3o','64o','33','94s','A2o','74s','TKo','93o','63s','83o','85s','K6s','K2s',
    '86s','J8o','K5s','J9o','Q7o','83s','84s','A3o','Q4s','73o','K7o','T9o','T2o',
    'A9o','J2o','J4s','32s','T9s','82s','92o','87o','Q3s','T7s','T2s','Q6s','67s',
    '79s','Q8s','53s','84o','K3s','54s','A8o','55','Q9s','43s','57s','A7s','Q3o',
    'J7o','J7s','94o','72o','95o','43o','A4o','72s','62o','75o','52s','Q2s','K4s',
    '79o',
  ]),
}

// ─── Gerar PLAY sets (inverso dos FOLD sets) ─────────────
const ALL_SET = new Set(ALL_HANDS)

function invertToPlaySet(foldSet) {
  return ALL_HANDS.filter(h => !foldSet.has(h))
}

/**
 * SOLVER_RANGES — Ranges GTO MCCFR para 15bb 3-max
 * Cada entry: { play: string[], fold: Set }
 * play = mãos que o solver recomenda jogar (raise/call/shove)
 * fold = Set original para lookup rápido
 */
export const SOLVER_RANGES = {
  // BTN abre (primeiro a agir, ninguem abriu)
  BTN_OPEN: {
    play: invertToPlaySet(SOLVER_FOLD_SETS.BTN),
    fold: SOLVER_FOLD_SETS.BTN,
    description: 'BTN open range 15bb 3-max (MCCFR)',
    playPct: Math.round((1 - SOLVER_FOLD_SETS.BTN.size / 169) * 100),
  },

  // SB quando BTN foldou
  SB_BTN_FOLD: {
    play: invertToPlaySet(SOLVER_FOLD_SETS.SB_BTN_FOLD),
    fold: SOLVER_FOLD_SETS.SB_BTN_FOLD,
    description: 'SB open quando BTN fold, 15bb 3-max',
    playPct: Math.round((1 - SOLVER_FOLD_SETS.SB_BTN_FOLD.size / 169) * 100),
  },

  // SB vs BTN min-raise
  SB_VS_BTN_RAISE: {
    play: invertToPlaySet(SOLVER_FOLD_SETS.SB_BTN_RAISE),
    fold: SOLVER_FOLD_SETS.SB_BTN_RAISE,
    description: 'SB defend vs BTN min-raise, 15bb 3-max',
    playPct: Math.round((1 - SOLVER_FOLD_SETS.SB_BTN_RAISE.size / 169) * 100),
  },

  // SB vs BTN all-in
  SB_VS_BTN_ALLIN: {
    play: invertToPlaySet(SOLVER_FOLD_SETS.SB_BTN_ALLIN),
    fold: SOLVER_FOLD_SETS.SB_BTN_ALLIN,
    description: 'SB call vs BTN shove, 15bb 3-max',
    playPct: Math.round((1 - SOLVER_FOLD_SETS.SB_BTN_ALLIN.size / 169) * 100),
  },

  // BB vs SB 3-bet (BTN foldou)
  BB_VS_SB_3BET: {
    play: invertToPlaySet(SOLVER_FOLD_SETS.BB_BTN_FOLD_SB_3BET),
    fold: SOLVER_FOLD_SETS.BB_BTN_FOLD_SB_3BET,
    description: 'BB defend vs SB 3-bet (BTN fold), 15bb 3-max',
    playPct: Math.round((1 - SOLVER_FOLD_SETS.BB_BTN_FOLD_SB_3BET.size / 169) * 100),
  },

  // BB vs SB all-in (BTN foldou)
  BB_VS_SB_ALLIN: {
    play: invertToPlaySet(SOLVER_FOLD_SETS.BB_BTN_FOLD_SB_ALLIN),
    fold: SOLVER_FOLD_SETS.BB_BTN_FOLD_SB_ALLIN,
    description: 'BB call vs SB shove (BTN fold), 15bb 3-max',
    playPct: Math.round((1 - SOLVER_FOLD_SETS.BB_BTN_FOLD_SB_ALLIN.size / 169) * 100),
  },

  // BB vs BTN raise (SB foldou)
  BB_VS_BTN_RAISE: {
    play: invertToPlaySet(SOLVER_FOLD_SETS.BB_BTN_RAISE_SB_FOLD),
    fold: SOLVER_FOLD_SETS.BB_BTN_RAISE_SB_FOLD,
    description: 'BB defend vs BTN raise (SB fold), 15bb 3-max',
    playPct: Math.round((1 - SOLVER_FOLD_SETS.BB_BTN_RAISE_SB_FOLD.size / 169) * 100),
  },

  // BB vs BTN raise + SB call (multiway pot)
  BB_VS_BTN_RAISE_SB_CALL: {
    play: invertToPlaySet(SOLVER_FOLD_SETS.BB_BTN_RAISE_SB_CALL),
    fold: SOLVER_FOLD_SETS.BB_BTN_RAISE_SB_CALL,
    description: 'BB defend vs BTN raise + SB call, 15bb 3-max',
    playPct: Math.round((1 - SOLVER_FOLD_SETS.BB_BTN_RAISE_SB_CALL.size / 169) * 100),
  },

  // BB vs BTN raise + SB 4-bet
  BB_VS_BTN_RAISE_SB_4BET: {
    play: invertToPlaySet(SOLVER_FOLD_SETS.BB_BTN_RAISE_SB_4BET),
    fold: SOLVER_FOLD_SETS.BB_BTN_RAISE_SB_4BET,
    description: 'BB defend vs SB 4-bet (BTN raised), 15bb 3-max',
    playPct: Math.round((1 - SOLVER_FOLD_SETS.BB_BTN_RAISE_SB_4BET.size / 169) * 100),
  },

  // BB vs BTN raise + SB all-in
  BB_VS_BTN_RAISE_SB_ALLIN: {
    play: invertToPlaySet(SOLVER_FOLD_SETS.BB_BTN_RAISE_SB_ALLIN),
    fold: SOLVER_FOLD_SETS.BB_BTN_RAISE_SB_ALLIN,
    description: 'BB call vs SB shove (BTN raised), 15bb 3-max',
    playPct: Math.round((1 - SOLVER_FOLD_SETS.BB_BTN_RAISE_SB_ALLIN.size / 169) * 100),
  },

  // BB vs BTN all-in (SB foldou)
  BB_VS_BTN_ALLIN: {
    play: invertToPlaySet(SOLVER_FOLD_SETS.BB_BTN_ALLIN_SB_FOLD),
    fold: SOLVER_FOLD_SETS.BB_BTN_ALLIN_SB_FOLD,
    description: 'BB call vs BTN shove (SB fold), 15bb 3-max',
    playPct: Math.round((1 - SOLVER_FOLD_SETS.BB_BTN_ALLIN_SB_FOLD.size / 169) * 100),
  },

  // BB vs BTN all-in + SB all-in (both shoved)
  BB_VS_BTN_SB_ALLIN: {
    play: invertToPlaySet(SOLVER_FOLD_SETS.BB_BTN_ALLIN_SB_ALLIN),
    fold: SOLVER_FOLD_SETS.BB_BTN_ALLIN_SB_ALLIN,
    description: 'BB call vs BTN+SB double shove, 15bb 3-max',
    playPct: Math.round((1 - SOLVER_FOLD_SETS.BB_BTN_ALLIN_SB_ALLIN.size / 169) * 100),
  },
}

/**
 * Lookup solver range para um cenário específico.
 * Retorna { shouldPlay, shouldFold, solverRange, confidence } ou null.
 *
 * @param {string} hand - Notação PA (ex: "AKs", "T9o", "JJ")
 * @param {string} position - "BTN", "SB", "BB"
 * @param {Object} actionHistory - { btnAction, sbAction } (ex: { btnAction: 'fold', sbAction: 'raise' })
 * @param {number} stackBB - Stack em big blinds
 */
export function lookupSolverRange(hand, position, actionHistory = {}, stackBB = 15) {
  // Solver data é para 15bb — para outros stacks, reduzir confiança
  const stackConfidence = stackBB >= 13 && stackBB <= 17 ? 1.0
    : stackBB >= 10 && stackBB <= 20 ? 0.75
    : 0.5

  const key = getSolverKey(position, actionHistory)
  if (!key || !SOLVER_RANGES[key]) return null

  const range = SOLVER_RANGES[key]
  const shouldFold = range.fold.has(hand)
  const shouldPlay = !shouldFold

  return {
    shouldPlay,
    shouldFold,
    solverRange: key,
    rangeDescription: range.description,
    rangePct: range.playPct,
    confidence: stackConfidence,
    source: 'MCCFR Solver (15bb, 3-max, 7% rake)',
  }
}

/**
 * Mapeia posição + action history para a key do SOLVER_RANGES
 */
function getSolverKey(position, ah) {
  const { btnAction, sbAction } = ah

  if (position === 'BTN') {
    // BTN é primeiro a agir
    return 'BTN_OPEN'
  }

  if (position === 'SB') {
    if (!btnAction || btnAction === 'fold') return 'SB_BTN_FOLD'
    if (btnAction === 'raise') return 'SB_VS_BTN_RAISE'
    if (btnAction === 'allin') return 'SB_VS_BTN_ALLIN'
  }

  if (position === 'BB') {
    if ((!btnAction || btnAction === 'fold') && sbAction === 'raise') return 'BB_VS_SB_3BET'
    if ((!btnAction || btnAction === 'fold') && sbAction === 'allin') return 'BB_VS_SB_ALLIN'
    if (btnAction === 'raise' && (!sbAction || sbAction === 'fold')) return 'BB_VS_BTN_RAISE'
    if (btnAction === 'raise' && sbAction === 'call') return 'BB_VS_BTN_RAISE_SB_CALL'
    if (btnAction === 'raise' && sbAction === 'raise') return 'BB_VS_BTN_RAISE_SB_4BET'
    if (btnAction === 'raise' && sbAction === 'allin') return 'BB_VS_BTN_RAISE_SB_ALLIN'
    if (btnAction === 'allin' && (!sbAction || sbAction === 'fold')) return 'BB_VS_BTN_ALLIN'
    if (btnAction === 'allin' && sbAction === 'allin') return 'BB_VS_BTN_SB_ALLIN'
  }

  return null
}

/**
 * Constrói action history a partir do game state do Arena Spin.
 */
export function buildActionHistory(game, heroIdx) {
  const players = game.players
  if (!players) return {}

  // Encontrar posições
  const btnIdx = players.findIndex(p => p.position === 'BTN')
  const sbIdx = players.findIndex(p => p.position === 'SB')

  const preflopActions = (game.actionHistory || []).filter(
    a => a.street === 'preflop' && a.action !== 'sb' && a.action !== 'bb'
  )

  let btnAction = null
  let sbAction = null

  for (const a of preflopActions) {
    if (a.playerIdx === btnIdx) {
      if (!btnAction) btnAction = normalizeAction(a.action)
    } else if (a.playerIdx === sbIdx) {
      if (!sbAction) sbAction = normalizeAction(a.action)
    }
  }

  return { btnAction, sbAction }
}

function normalizeAction(action) {
  if (action === 'allin') return 'allin'
  if (action === 'raise' || action === 'bet') return 'raise'
  if (action === 'call') return 'call'
  if (action === 'fold') return 'fold'
  return action
}
