/**
 * SPIN & GO RANGES GTO — Poker Academy BR
 * Formato: 3-max (BTN/SB/BB) hyper-turbo com 25bb start
 *
 * Fontes consolidadas:
 * - PokerSciences.com (HRC solver, 1M+ mãos de sample)
 * - Bluffaces / Team Bas Poker (charts exploitativos + GTO)
 * - PreFlopHero (Simple Preflop Holdem solver)
 * - PokerStars Learn (Nash push/fold Spin & Go)
 * - GTO Wizard (público, 3-max solutions)
 * - Upswing Poker (push/fold charts com antes)
 * - PokerCoaching.com (Jonathan Little, push/fold 3-handed)
 * - CMU Paper: "Computing an Approximate Jam/Fold Equilibrium for 3-player" (AAMAS08)
 *
 * Estrutura:
 * - SPIN_OPEN_RANGES: BTN e SB open raise (min-raise) para stacks 25/20/15bb
 * - SPIN_PUSH_RANGES: BTN e SB push (all-in) para stacks 15/13/10/8/5bb
 * - SPIN_DEFENSE_RANGES: BB e SB defense (call/3-bet) vs opens
 * - SPIN_CALL_PUSH_RANGES: BB e SB call vs all-in por stack
 * - SPIN_HU_RANGES: Ranges heads-up (após 1 bust) para SB e BB
 * - SPIN_MULTIPLIER_ADJUSTMENTS: Como o multiplicador afeta ICM
 *
 * Notação: "AKs" = suited, "AKo" = offsuit, "AA" = par
 * "mix" = mão de transição (~50/50 entre as ações)
 */

// ============================================================
// OPEN RAISE (Min-Raise) — Fase Deep (25bb → 15bb)
// 3-max: apenas BTN e SB abrem (BB defende)
// Fonte: PokerSciences + GTO Wizard + PreFlopHero consensus
// ============================================================

export const SPIN_OPEN_RANGES = {
  // BTN Open — 3-max, ninguém abriu
  // BTN abre MUITO mais wide que em 6-max (só 2 blinds pra roubar)
  BTN: {
    25: {
      // ~51% open range — fase inicial, room pra postflop
      raise: [
        'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
        'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s',
        'QJs','QTs','Q9s','Q8s',
        'JTs','J9s','J8s',
        'T9s','T8s',
        '98s','97s',
        '87s','86s',
        '76s','75s',
        '65s','64s',
        '54s',
        'AKo','AQo','AJo','ATo','A9o','A8o','A7o',
        'KQo','KJo','KTo','K9o',
        'QJo','QTo',
        'JTo',
      ],
      mix: ['K4s','Q7s','J7s','T7s','96s','85s','74s','53s','43s','A6o','A5o','K8o','Q9o','J9o','T9o'],
      fold: []
    },
    20: {
      // ~48% — ranges apertam ligeiramente
      raise: [
        'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
        'KQs','KJs','KTs','K9s','K8s','K7s','K6s',
        'QJs','QTs','Q9s','Q8s',
        'JTs','J9s','J8s',
        'T9s','T8s',
        '98s','97s',
        '87s','86s',
        '76s','75s',
        '65s',
        '54s',
        'AKo','AQo','AJo','ATo','A9o','A8o',
        'KQo','KJo','KTo',
        'QJo','QTo',
        'JTo',
      ],
      mix: ['K5s','Q7s','J7s','T7s','96s','85s','64s','53s','A7o','K9o','Q9o'],
      fold: []
    },
    15: {
      // ~38.9% raise + shove mix — transição push/fold começa
      // 16.6% min-raise + 22.3% shoves (PokerSciences)
      raise: [
        'AA','KK','QQ','JJ','TT','99','88','77','66',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A5s',
        'KQs','KJs','KTs','K9s',
        'QJs','QTs','Q9s',
        'JTs','J9s',
        'T9s',
        '98s',
        '87s',
        '76s',
        'AKo','AQo','AJo','ATo',
        'KQo','KJo',
      ],
      mix: ['55','44','A6s','A4s','A3s','K8s','Q8s','J8s','T8s','97s','86s','65s','54s','A9o','KTo','QJo'],
      fold: []
    }
  },

  // SB Open — 3-max, BTN foldou
  // SB vs BB é blind war: ranges MUITO mais wide
  SB: {
    25: {
      // ~65% — SB vs BB, posição não importa tanto (HU pré com posição)
      raise: [
        'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
        'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','K4s','K3s','K2s',
        'QJs','QTs','Q9s','Q8s','Q7s','Q6s','Q5s',
        'JTs','J9s','J8s','J7s','J6s',
        'T9s','T8s','T7s',
        '98s','97s','96s',
        '87s','86s','85s',
        '76s','75s','74s',
        '65s','64s','63s',
        '54s','53s',
        '43s',
        'AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o','A5o','A4o','A3o',
        'KQo','KJo','KTo','K9o','K8o','K7o',
        'QJo','QTo','Q9o',
        'JTo','J9o',
        'T9o',
        '98o',
      ],
      mix: ['Q4s','J5s','T6s','95s','84s','73s','62s','52s','42s','A2o','K6o','Q8o','J8o','T8o','87o'],
      fold: []
    },
    20: {
      // ~60%
      raise: [
        'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
        'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','K4s','K3s',
        'QJs','QTs','Q9s','Q8s','Q7s','Q6s',
        'JTs','J9s','J8s','J7s',
        'T9s','T8s','T7s',
        '98s','97s','96s',
        '87s','86s',
        '76s','75s',
        '65s','64s',
        '54s','53s',
        '43s',
        'AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o','A5o',
        'KQo','KJo','KTo','K9o','K8o',
        'QJo','QTo','Q9o',
        'JTo','J9o',
        'T9o',
      ],
      mix: ['K2s','Q5s','J6s','T6s','95s','85s','74s','63s','52s','A4o','K7o','Q8o','J8o'],
      fold: []
    },
    15: {
      // ~78.7% total (8.2% min-raise + 34.5% shove + 35.9% call/limp)
      // Na prática: 3-bet shove ou fold é a estratégia dominante do SB vs BB nesse stack
      raise: [
        'AA','KK','QQ','JJ','TT','99','88','77','66','55',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A5s',
        'KQs','KJs','KTs',
        'QJs','QTs',
        'JTs',
        'AKo','AQo','AJo',
      ],
      mix: ['44','33','A6s','A4s','K9s','Q9s','J9s','T9s','98s','ATo','KQo'],
      fold: []
    }
  }
}

// ============================================================
// PUSH RANGES (All-In) — Fase Short Stack (≤15bb)
// Quando o stack fica curto, min-raise perde fold equity
// Fonte: Nash equilibrium charts + PokerStars Learn + Upswing + PokerCoaching
// ============================================================

export const SPIN_PUSH_RANGES = {
  // BTN Push — all-in como primeiro a agir
  BTN: {
    15: {
      // ~35% push range
      push: [
        'AA','KK','QQ','JJ','TT','99','88','77','66','55',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
        'KQs','KJs','KTs','K9s','K8s','K7s',
        'QJs','QTs','Q9s',
        'JTs','J9s',
        'T9s',
        '98s',
        '87s',
        '76s',
        'AKo','AQo','AJo','ATo','A9o',
        'KQo','KJo',
      ],
      mix: ['44','33','K6s','Q8s','J8s','T8s','97s','86s','65s','A8o','KTo'],
      fold: []
    },
    13: {
      // ~40% push range
      push: [
        'AA','KK','QQ','JJ','TT','99','88','77','66','55','44',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
        'KQs','KJs','KTs','K9s','K8s','K7s','K6s',
        'QJs','QTs','Q9s','Q8s',
        'JTs','J9s','J8s',
        'T9s','T8s',
        '98s','97s',
        '87s','86s',
        '76s',
        '65s',
        'AKo','AQo','AJo','ATo','A9o','A8o',
        'KQo','KJo','KTo',
        'QJo',
      ],
      mix: ['33','K5s','Q7s','J7s','T7s','96s','75s','54s','A7o','K9o','QTo'],
      fold: []
    },
    10: {
      // ~50% push range
      push: [
        'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
        'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s',
        'QJs','QTs','Q9s','Q8s','Q7s',
        'JTs','J9s','J8s','J7s',
        'T9s','T8s','T7s',
        '98s','97s','96s',
        '87s','86s','85s',
        '76s','75s',
        '65s','64s',
        '54s',
        'AKo','AQo','AJo','ATo','A9o','A8o','A7o',
        'KQo','KJo','KTo','K9o',
        'QJo','QTo',
        'JTo',
      ],
      mix: ['22','K4s','Q6s','J6s','T6s','95s','84s','74s','53s','A6o','K8o','Q9o','J9o','T9o'],
      fold: []
    },
    8: {
      // ~58% push range
      push: [
        'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
        'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','K4s',
        'QJs','QTs','Q9s','Q8s','Q7s','Q6s',
        'JTs','J9s','J8s','J7s','J6s',
        'T9s','T8s','T7s','T6s',
        '98s','97s','96s',
        '87s','86s','85s',
        '76s','75s','74s',
        '65s','64s',
        '54s','53s',
        '43s',
        'AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o',
        'KQo','KJo','KTo','K9o','K8o',
        'QJo','QTo','Q9o',
        'JTo','J9o',
        'T9o',
      ],
      mix: ['K3s','Q5s','J5s','T5s','95s','84s','73s','63s','52s','A5o','K7o','Q8o','J8o','T8o','98o','87o'],
      fold: []
    },
    5: {
      // ~75% push range — quase qualquer mão
      push: [
        'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
        'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','K4s','K3s','K2s',
        'QJs','QTs','Q9s','Q8s','Q7s','Q6s','Q5s','Q4s','Q3s',
        'JTs','J9s','J8s','J7s','J6s','J5s','J4s',
        'T9s','T8s','T7s','T6s','T5s',
        '98s','97s','96s','95s',
        '87s','86s','85s','84s',
        '76s','75s','74s','73s',
        '65s','64s','63s',
        '54s','53s','52s',
        '43s','42s',
        '32s',
        'AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o','A5o','A4o','A3o','A2o',
        'KQo','KJo','KTo','K9o','K8o','K7o','K6o','K5o',
        'QJo','QTo','Q9o','Q8o','Q7o',
        'JTo','J9o','J8o','J7o',
        'T9o','T8o','T7o',
        '98o','97o',
        '87o','86o',
        '76o','75o',
        '65o',
        '54o',
      ],
      mix: ['Q2s','J3s','T4s','94s','83s','72s','62s','K4o','Q6o','J6o','T6o','96o','85o','74o','64o','53o'],
      fold: []
    }
  },

  // SB Push — all-in quando BTN foldou (SB vs BB)
  // Ranges mais wide que BTN porque só 1 jogador pra passar
  SB: {
    15: {
      // ~42% push range (SB vs BB)
      push: [
        'AA','KK','QQ','JJ','TT','99','88','77','66','55','44',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
        'KQs','KJs','KTs','K9s','K8s','K7s','K6s',
        'QJs','QTs','Q9s','Q8s',
        'JTs','J9s','J8s',
        'T9s','T8s',
        '98s','97s',
        '87s','86s',
        '76s','75s',
        '65s',
        '54s',
        'AKo','AQo','AJo','ATo','A9o','A8o','A7o',
        'KQo','KJo','KTo',
        'QJo','QTo',
        'JTo',
      ],
      mix: ['33','22','K5s','Q7s','J7s','T7s','96s','85s','64s','53s','A6o','K9o','Q9o','J9o','T9o'],
      fold: []
    },
    13: {
      // ~50%
      push: [
        'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
        'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s',
        'QJs','QTs','Q9s','Q8s','Q7s',
        'JTs','J9s','J8s','J7s',
        'T9s','T8s','T7s',
        '98s','97s','96s',
        '87s','86s','85s',
        '76s','75s',
        '65s','64s',
        '54s','53s',
        'AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o',
        'KQo','KJo','KTo','K9o',
        'QJo','QTo','Q9o',
        'JTo','J9o',
        'T9o',
      ],
      mix: ['22','K4s','Q6s','J6s','T6s','95s','84s','74s','43s','A5o','K8o','Q8o','J8o','T8o','98o'],
      fold: []
    },
    10: {
      // ~62%
      push: [
        'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
        'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','K4s','K3s',
        'QJs','QTs','Q9s','Q8s','Q7s','Q6s','Q5s',
        'JTs','J9s','J8s','J7s','J6s',
        'T9s','T8s','T7s','T6s',
        '98s','97s','96s','95s',
        '87s','86s','85s',
        '76s','75s','74s',
        '65s','64s','63s',
        '54s','53s',
        '43s',
        'AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o','A5o',
        'KQo','KJo','KTo','K9o','K8o','K7o',
        'QJo','QTo','Q9o','Q8o',
        'JTo','J9o','J8o',
        'T9o','T8o',
        '98o','97o',
        '87o',
        '76o',
      ],
      mix: ['K2s','Q4s','J5s','T5s','94s','84s','73s','62s','52s','42s','A4o','K6o','Q7o','J7o','T7o','96o','86o','75o','65o'],
      fold: []
    },
    8: {
      // ~72%
      push: [
        'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
        'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','K4s','K3s','K2s',
        'QJs','QTs','Q9s','Q8s','Q7s','Q6s','Q5s','Q4s',
        'JTs','J9s','J8s','J7s','J6s','J5s',
        'T9s','T8s','T7s','T6s','T5s',
        '98s','97s','96s','95s',
        '87s','86s','85s','84s',
        '76s','75s','74s','73s',
        '65s','64s','63s',
        '54s','53s','52s',
        '43s','42s',
        '32s',
        'AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o','A5o','A4o','A3o',
        'KQo','KJo','KTo','K9o','K8o','K7o','K6o',
        'QJo','QTo','Q9o','Q8o','Q7o',
        'JTo','J9o','J8o','J7o',
        'T9o','T8o','T7o',
        '98o','97o','96o',
        '87o','86o',
        '76o','75o',
        '65o','64o',
        '54o',
      ],
      mix: ['Q3s','J4s','T4s','94s','83s','72s','62s','A2o','K5o','Q6o','J6o','T6o','95o','85o','74o','63o','53o'],
      fold: []
    },
    5: {
      // ~85% push range
      push: [
        'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
        'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','K4s','K3s','K2s',
        'QJs','QTs','Q9s','Q8s','Q7s','Q6s','Q5s','Q4s','Q3s','Q2s',
        'JTs','J9s','J8s','J7s','J6s','J5s','J4s','J3s',
        'T9s','T8s','T7s','T6s','T5s','T4s',
        '98s','97s','96s','95s','94s',
        '87s','86s','85s','84s','83s',
        '76s','75s','74s','73s','72s',
        '65s','64s','63s','62s',
        '54s','53s','52s',
        '43s','42s',
        '32s',
        'AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o','A5o','A4o','A3o','A2o',
        'KQo','KJo','KTo','K9o','K8o','K7o','K6o','K5o','K4o',
        'QJo','QTo','Q9o','Q8o','Q7o','Q6o','Q5o',
        'JTo','J9o','J8o','J7o','J6o',
        'T9o','T8o','T7o','T6o',
        '98o','97o','96o',
        '87o','86o','85o',
        '76o','75o','74o',
        '65o','64o',
        '54o','53o',
        '43o',
      ],
      mix: ['J2s','T3s','93s','82s','K3o','Q4o','J5o','T5o','95o','84o','73o','63o','52o'],
      fold: []
    }
  }
}

// ============================================================
// CALL vs ALL-IN — Ranges de call quando adversário vai all-in
// Fonte: Nash equilibrium + PokerStars Learn + Primedope charts
// ============================================================

export const SPIN_CALL_PUSH_RANGES = {
  // BB Call vs BTN Push
  BB_vs_BTN: {
    15: {
      // ~18% call range (tight, BTN range é wide)
      call: [
        'AA','KK','QQ','JJ','TT','99','88',
        'AKs','AQs','AJs','ATs','A9s',
        'KQs','KJs',
        'QJs',
        'AKo','AQo','AJo',
      ],
      mix: ['77','A8s','KTs','QTs','JTs','ATo','KQo'],
      fold: []
    },
    13: {
      // ~20%
      call: [
        'AA','KK','QQ','JJ','TT','99','88','77',
        'AKs','AQs','AJs','ATs','A9s','A8s',
        'KQs','KJs','KTs',
        'QJs','QTs',
        'JTs',
        'AKo','AQo','AJo','ATo',
      ],
      mix: ['66','A7s','K9s','Q9s','J9s','T9s','KQo'],
      fold: []
    },
    10: {
      // ~25%
      call: [
        'AA','KK','QQ','JJ','TT','99','88','77','66',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s',
        'KQs','KJs','KTs','K9s',
        'QJs','QTs','Q9s',
        'JTs','J9s',
        'T9s',
        'AKo','AQo','AJo','ATo','A9o',
        'KQo','KJo',
      ],
      mix: ['55','A6s','A5s','K8s','Q8s','J8s','T8s','98s','A8o','KTo','QJo'],
      fold: []
    },
    8: {
      // ~30%
      call: [
        'AA','KK','QQ','JJ','TT','99','88','77','66','55',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s',
        'KQs','KJs','KTs','K9s','K8s',
        'QJs','QTs','Q9s','Q8s',
        'JTs','J9s','J8s',
        'T9s','T8s',
        '98s',
        '87s',
        'AKo','AQo','AJo','ATo','A9o','A8o',
        'KQo','KJo','KTo',
        'QJo','QTo',
      ],
      mix: ['44','A4s','A3s','K7s','Q7s','J7s','T7s','97s','86s','76s','A7o','K9o','Q9o','JTo'],
      fold: []
    },
    5: {
      // ~42% — com 5bb praticamente qualquer Ax e broadway chama
      call: [
        'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
        'KQs','KJs','KTs','K9s','K8s','K7s','K6s',
        'QJs','QTs','Q9s','Q8s','Q7s',
        'JTs','J9s','J8s','J7s',
        'T9s','T8s','T7s',
        '98s','97s',
        '87s','86s',
        '76s','75s',
        '65s',
        'AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o','A5o','A4o',
        'KQo','KJo','KTo','K9o','K8o',
        'QJo','QTo','Q9o','Q8o',
        'JTo','J9o',
        'T9o',
      ],
      mix: ['22','K5s','Q6s','J6s','T6s','96s','85s','74s','64s','54s','A3o','K7o','Q7o','J8o','T8o','98o','87o'],
      fold: []
    }
  },

  // BB Call vs SB Push (SB ranges são mais wide, BB chama mais tight)
  BB_vs_SB: {
    15: {
      // ~22% — SB push range é mais wide, BB pode chamar um pouco mais
      call: [
        'AA','KK','QQ','JJ','TT','99','88','77',
        'AKs','AQs','AJs','ATs','A9s','A8s',
        'KQs','KJs','KTs',
        'QJs','QTs',
        'JTs',
        'AKo','AQo','AJo','ATo',
        'KQo',
      ],
      mix: ['66','A7s','K9s','Q9s','J9s','T9s','98s','A9o','KJo'],
      fold: []
    },
    10: {
      // ~28%
      call: [
        'AA','KK','QQ','JJ','TT','99','88','77','66',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s',
        'KQs','KJs','KTs','K9s',
        'QJs','QTs','Q9s',
        'JTs','J9s',
        'T9s',
        '98s',
        'AKo','AQo','AJo','ATo','A9o',
        'KQo','KJo','KTo',
        'QJo',
      ],
      mix: ['55','A5s','A4s','K8s','Q8s','J8s','T8s','97s','87s','A8o','Q9o','QTo','JTo'],
      fold: []
    },
    5: {
      // ~45%
      call: [
        'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
        'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s',
        'QJs','QTs','Q9s','Q8s','Q7s',
        'JTs','J9s','J8s','J7s',
        'T9s','T8s','T7s',
        '98s','97s','96s',
        '87s','86s',
        '76s','75s',
        '65s','64s',
        '54s',
        'AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o','A5o','A4o','A3o',
        'KQo','KJo','KTo','K9o','K8o','K7o',
        'QJo','QTo','Q9o','Q8o',
        'JTo','J9o',
        'T9o','T8o',
        '98o',
      ],
      mix: ['22','K4s','Q6s','J6s','T6s','95s','85s','74s','63s','53s','A2o','K6o','Q7o','J7o','T7o','97o','87o','76o'],
      fold: []
    }
  },

  // SB Call vs BTN Push (SB está OOP, chama mais tight)
  SB_vs_BTN: {
    15: {
      // ~14% — OOP, muito tight
      call: [
        'AA','KK','QQ','JJ','TT','99',
        'AKs','AQs','AJs',
        'KQs',
        'AKo','AQo',
      ],
      mix: ['88','ATs','KJs','QJs','AJo'],
      fold: []
    },
    10: {
      // ~20%
      call: [
        'AA','KK','QQ','JJ','TT','99','88',
        'AKs','AQs','AJs','ATs','A9s',
        'KQs','KJs','KTs',
        'QJs',
        'JTs',
        'AKo','AQo','AJo',
      ],
      mix: ['77','A8s','QTs','T9s','ATo','KQo'],
      fold: []
    },
    5: {
      // ~35%
      call: [
        'AA','KK','QQ','JJ','TT','99','88','77','66','55',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s',
        'KQs','KJs','KTs','K9s','K8s',
        'QJs','QTs','Q9s',
        'JTs','J9s',
        'T9s','T8s',
        '98s',
        '87s',
        'AKo','AQo','AJo','ATo','A9o','A8o',
        'KQo','KJo','KTo',
        'QJo','QTo',
        'JTo',
      ],
      mix: ['44','A4s','A3s','K7s','Q8s','J8s','T7s','97s','86s','76s','A7o','K9o','Q9o','J9o','T9o'],
      fold: []
    }
  }
}

// ============================================================
// BB DEFENSE vs OPEN RAISE (min-raise) — Fase Deep
// BB defende com 3-bet, call ou fold vs BTN/SB min-raise
// Fonte: GTO Wizard + PokerSciences consensus
// ============================================================

export const SPIN_DEFENSE_RANGES = {
  // BB vs BTN Open (min-raise)
  BB_vs_BTN: {
    25: {
      // BB defende ~59% vs BTN open (BTN abre ~51%)
      threebet: [
        'AA','KK','QQ','JJ','TT',
        'AKs','AQs','AJs',
        'A5s','A4s','A3s',
        'KQs',
        'AKo','AQo',
      ],
      call: [
        '99','88','77','66','55','44','33','22',
        'ATs','A9s','A8s','A7s','A6s',
        'KJs','KTs','K9s','K8s','K7s','K6s',
        'QJs','QTs','Q9s','Q8s',
        'JTs','J9s','J8s',
        'T9s','T8s',
        '98s','97s',
        '87s','86s',
        '76s','75s',
        '65s','64s',
        '54s','53s',
        '43s',
        'AJo','ATo','A9o','A8o','A7o',
        'KQo','KJo','KTo','K9o',
        'QJo','QTo','Q9o',
        'JTo','J9o',
        'T9o',
        '98o',
      ],
      mix: ['A2s','K5s','Q7s','J7s','T7s','96s','85s','74s','63s','52s','A6o','K8o','Q8o','J8o','T8o','87o'],
      fold: []
    },
    20: {
      // ~55% defense
      threebet: [
        'AA','KK','QQ','JJ','TT',
        'AKs','AQs','AJs',
        'A5s','A4s',
        'KQs',
        'AKo','AQo',
      ],
      call: [
        '99','88','77','66','55','44','33',
        'ATs','A9s','A8s','A7s','A6s',
        'KJs','KTs','K9s','K8s','K7s',
        'QJs','QTs','Q9s','Q8s',
        'JTs','J9s','J8s',
        'T9s','T8s',
        '98s','97s',
        '87s','86s',
        '76s','75s',
        '65s','64s',
        '54s',
        'AJo','ATo','A9o','A8o',
        'KQo','KJo','KTo',
        'QJo','QTo',
        'JTo',
        'T9o',
      ],
      mix: ['22','A3s','K6s','Q7s','J7s','T7s','96s','85s','53s','43s','A7o','K9o','Q9o','J9o','98o'],
      fold: []
    },
    15: {
      // ~48% defense — stack curto, 3-bet vira shove
      threebet_shove: [
        'AA','KK','QQ','JJ','TT','99',
        'AKs','AQs','AJs','ATs',
        'A5s','A4s',
        'KQs','KJs',
        'AKo','AQo','AJo',
      ],
      call: [
        '88','77','66','55',
        'A9s','A8s','A7s','A6s',
        'KTs','K9s','K8s',
        'QJs','QTs','Q9s',
        'JTs','J9s',
        'T9s','T8s',
        '98s','97s',
        '87s','86s',
        '76s',
        '65s',
        '54s',
        'ATo','A9o',
        'KQo','KJo','KTo',
        'QJo','QTo',
        'JTo',
      ],
      mix: ['44','A3s','K7s','Q8s','J8s','T7s','96s','85s','75s','64s','A8o','K9o','Q9o','J9o','T9o'],
      fold: []
    }
  },

  // BB vs SB Open (min-raise) — blind war, BB defende mais wide
  BB_vs_SB: {
    25: {
      // ~65% defense — SB abre wide, BB defende wide
      threebet: [
        'AA','KK','QQ','JJ','TT','99',
        'AKs','AQs','AJs','ATs',
        'A5s','A4s','A3s','A2s',
        'KQs','KJs',
        'AKo','AQo','AJo',
      ],
      call: [
        '88','77','66','55','44','33','22',
        'A9s','A8s','A7s','A6s',
        'KTs','K9s','K8s','K7s','K6s','K5s',
        'QJs','QTs','Q9s','Q8s','Q7s',
        'JTs','J9s','J8s','J7s',
        'T9s','T8s','T7s',
        '98s','97s','96s',
        '87s','86s','85s',
        '76s','75s','74s',
        '65s','64s','63s',
        '54s','53s',
        '43s',
        'ATo','A9o','A8o','A7o','A6o','A5o',
        'KQo','KJo','KTo','K9o','K8o',
        'QJo','QTo','Q9o','Q8o',
        'JTo','J9o','J8o',
        'T9o','T8o',
        '98o','97o',
        '87o',
        '76o',
      ],
      mix: ['K4s','Q6s','J6s','T6s','95s','84s','73s','62s','52s','42s','A4o','K7o','Q7o','J7o','T7o','96o','86o','75o','65o'],
      fold: []
    },
    15: {
      // ~55% — 3-bet vira shove
      threebet_shove: [
        'AA','KK','QQ','JJ','TT','99','88',
        'AKs','AQs','AJs','ATs','A9s',
        'A5s','A4s','A3s',
        'KQs','KJs','KTs',
        'QJs',
        'AKo','AQo','AJo','ATo',
      ],
      call: [
        '77','66','55','44',
        'A8s','A7s','A6s',
        'K9s','K8s','K7s',
        'QTs','Q9s','Q8s',
        'JTs','J9s','J8s',
        'T9s','T8s',
        '98s','97s',
        '87s','86s',
        '76s','75s',
        '65s','64s',
        '54s',
        'A9o','A8o','A7o',
        'KQo','KJo','KTo','K9o',
        'QJo','QTo','Q9o',
        'JTo','J9o',
        'T9o',
        '98o',
      ],
      mix: ['33','A2s','K6s','Q7s','J7s','T7s','96s','85s','74s','53s','43s','A6o','K8o','Q8o','J8o','T8o','87o'],
      fold: []
    }
  }
}

// ============================================================
// HEADS-UP RANGES — Após 1 jogador ser eliminado
// SB = BTN (abre), BB defende. Ranges BEM mais wide que 3-max
// Fonte: Nash HU + HoldemResources.net + Primedope
// ============================================================

export const SPIN_HU_RANGES = {
  // SB (=BTN) Open — Heads-Up
  SB_open: {
    25: {
      // ~80%+ open range HU
      raise: [
        'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
        'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','K4s','K3s','K2s',
        'QJs','QTs','Q9s','Q8s','Q7s','Q6s','Q5s','Q4s','Q3s','Q2s',
        'JTs','J9s','J8s','J7s','J6s','J5s','J4s',
        'T9s','T8s','T7s','T6s','T5s',
        '98s','97s','96s','95s',
        '87s','86s','85s','84s',
        '76s','75s','74s','73s',
        '65s','64s','63s',
        '54s','53s','52s',
        '43s','42s',
        '32s',
        'AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o','A5o','A4o','A3o','A2o',
        'KQo','KJo','KTo','K9o','K8o','K7o','K6o','K5o','K4o','K3o',
        'QJo','QTo','Q9o','Q8o','Q7o','Q6o','Q5o',
        'JTo','J9o','J8o','J7o','J6o',
        'T9o','T8o','T7o','T6o',
        '98o','97o','96o',
        '87o','86o','85o',
        '76o','75o','74o',
        '65o','64o',
        '54o','53o',
        '43o',
      ],
      mix: ['J3s','T4s','94s','83s','72s','62s','K2o','Q4o','J5o','T5o','95o','84o','73o','63o','52o'],
      fold: []
    },
    15: {
      // HU 15bb — mix de min-raise e shove
      raise: [
        'AA','KK','QQ','JJ','TT','99','88','77','66','55','44',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
        'KQs','KJs','KTs','K9s','K8s',
        'QJs','QTs','Q9s',
        'JTs','J9s',
        'T9s',
        '98s',
        'AKo','AQo','AJo','ATo','A9o',
        'KQo','KJo',
      ],
      mix: ['33','22','K7s','K6s','Q8s','J8s','T8s','97s','87s','86s','76s','65s','54s','A8o','KTo','QJo'],
      fold: []
    }
  },

  // BB Defense — Heads-Up
  BB_defense: {
    25: {
      // ~70% defense vs HU open
      threebet: [
        'AA','KK','QQ','JJ','TT','99',
        'AKs','AQs','AJs','ATs',
        'A5s','A4s','A3s','A2s',
        'KQs','KJs',
        'AKo','AQo',
      ],
      call: [
        '88','77','66','55','44','33','22',
        'A9s','A8s','A7s','A6s',
        'KTs','K9s','K8s','K7s','K6s','K5s','K4s','K3s',
        'QJs','QTs','Q9s','Q8s','Q7s','Q6s','Q5s',
        'JTs','J9s','J8s','J7s','J6s',
        'T9s','T8s','T7s','T6s',
        '98s','97s','96s','95s',
        '87s','86s','85s',
        '76s','75s','74s',
        '65s','64s','63s',
        '54s','53s','52s',
        '43s','42s',
        'AJo','ATo','A9o','A8o','A7o','A6o','A5o','A4o','A3o',
        'KQo','KJo','KTo','K9o','K8o','K7o','K6o',
        'QJo','QTo','Q9o','Q8o','Q7o',
        'JTo','J9o','J8o','J7o',
        'T9o','T8o','T7o',
        '98o','97o','96o',
        '87o','86o',
        '76o','75o',
        '65o',
        '54o',
      ],
      mix: ['K2s','Q4s','J5s','T5s','94s','84s','73s','62s','32s','A2o','K5o','Q6o','J6o','T6o','95o','85o','74o','64o','53o','43o'],
      fold: []
    },
    15: {
      // HU 15bb — 3-bet vira shove
      threebet_shove: [
        'AA','KK','QQ','JJ','TT','99','88',
        'AKs','AQs','AJs','ATs','A9s',
        'A5s','A4s','A3s','A2s',
        'KQs','KJs','KTs',
        'QJs',
        'AKo','AQo','AJo','ATo',
      ],
      call: [
        '77','66','55','44','33',
        'A8s','A7s','A6s',
        'K9s','K8s','K7s','K6s',
        'QTs','Q9s','Q8s',
        'JTs','J9s','J8s',
        'T9s','T8s','T7s',
        '98s','97s',
        '87s','86s',
        '76s','75s',
        '65s','64s',
        '54s',
        'A9o','A8o','A7o','A6o',
        'KQo','KJo','KTo','K9o',
        'QJo','QTo','Q9o',
        'JTo','J9o',
        'T9o',
        '98o',
        '87o',
      ],
      mix: ['22','K5s','Q7s','J7s','T6s','96s','85s','74s','53s','43s','A5o','K8o','Q8o','J8o','T8o','76o'],
      fold: []
    }
  }
}

// ============================================================
// MULTIPLICADOR — Como o prize pool afeta ICM e decisões
// Fonte: GTO Wizard blog + PokerSciences + VIP-Grinders
// ============================================================

export const SPIN_MULTIPLIER_ADJUSTMENTS = {
  // Distribuição real de multiplicadores (PokerStars Spin & Go)
  distribution: {
    2:   { frequency: 0.7350, description: '2x — mais comum, jogue ChipEV puro' },
    3:   { frequency: 0.1175, description: '3x — ainda ChipEV, ligeira cautela' },
    5:   { frequency: 0.0750, description: '5x — começa a importar, tighten marginally' },
    10:  { frequency: 0.0450, description: '10x — ICM começa a pesar, protect stack' },
    25:  { frequency: 0.0200, description: '25x — ICM significativo, survival matters' },
    120: { frequency: 0.0050, description: '120x — jackpot, survival > chips' },
    240: { frequency: 0.0020, description: '240x — mega jackpot, ultra tight é +EV' },
    1200:{ frequency: 0.0005, description: '1200x — max jackpot, sobreviver é tudo' },
  },

  // Ajuste de ranges por multiplicador
  // tightenPct: quanto apertar o range (0 = sem ajuste, 0.3 = 30% mais tight)
  // Aplicar: remover as últimas N% mãos do range
  adjustments: {
    2:    { tightenPct: 0.00, bubbleFactor: 1.00, description: 'Jogue ChipEV puro, sem ajuste ICM' },
    3:    { tightenPct: 0.02, bubbleFactor: 1.05, description: 'Ajuste mínimo, quase ChipEV' },
    5:    { tightenPct: 0.05, bubbleFactor: 1.15, description: 'Ligeiramente mais tight em spots marginais' },
    10:   { tightenPct: 0.10, bubbleFactor: 1.35, description: 'ICM relevante, evitar coin flips marginais' },
    25:   { tightenPct: 0.15, bubbleFactor: 1.60, description: 'ICM forte, fold equity > showdown value' },
    120:  { tightenPct: 0.25, bubbleFactor: 2.00, description: 'Survival mode, só jogue premium/strong' },
    240:  { tightenPct: 0.30, bubbleFactor: 2.50, description: 'Ultra survival, avoid marginal spots' },
    1200: { tightenPct: 0.40, bubbleFactor: 3.50, description: 'Sobreviver é tudo, fold tudo exceto nuts' },
  }
}

// ============================================================
// BLIND STRUCTURE — Estrutura de blinds para Spin & Go hyper-turbo
// Fonte: PokerStars Spin & Go standard structure
// ============================================================

export const SPIN_BLIND_STRUCTURE = {
  startingStack: 25, // em big blinds
  levels: [
    { level: 1, sb: 10,  bb: 20,  ante: 0,  effectiveBB: 25.0 },
    { level: 2, sb: 15,  bb: 30,  ante: 0,  effectiveBB: 16.7 },
    { level: 3, sb: 20,  bb: 40,  ante: 0,  effectiveBB: 12.5 },
    { level: 4, sb: 25,  bb: 50,  ante: 0,  effectiveBB: 10.0 },
    { level: 5, sb: 30,  bb: 60,  ante: 0,  effectiveBB: 8.3 },
    { level: 6, sb: 50,  bb: 100, ante: 0,  effectiveBB: 5.0 },
    { level: 7, sb: 75,  bb: 150, ante: 0,  effectiveBB: 3.3 },
    { level: 8, sb: 100, bb: 200, ante: 0,  effectiveBB: 2.5 },
  ],
  levelDurationSeconds: 180, // 3 minutos por nível
}

// ============================================================
// UTILITY: Funções auxiliares para lookup de ranges
// ============================================================

/**
 * Retorna o tier de stack mais próximo disponível nos ranges
 */
export function getSpinStackTier(effectiveBB, availableTiers) {
  const tiers = availableTiers || [5, 8, 10, 13, 15, 20, 25]
  const sorted = [...tiers].sort((a, b) => a - b)
  // Encontrar o tier mais próximo (arredonda pra baixo se entre dois)
  let best = sorted[0]
  for (const tier of sorted) {
    if (tier <= effectiveBB) best = tier
    else break
  }
  return best
}

/**
 * Retorna o range de open raise para uma posição e stack
 */
export function getSpinOpenRange(position, effectiveBB) {
  const ranges = SPIN_OPEN_RANGES[position]
  if (!ranges) return null
  const tiers = Object.keys(ranges).map(Number)
  const tier = getSpinStackTier(effectiveBB, tiers)
  return ranges[tier]
}

/**
 * Retorna o range de push para uma posição e stack
 */
export function getSpinPushRange(position, effectiveBB) {
  const ranges = SPIN_PUSH_RANGES[position]
  if (!ranges) return null
  const tiers = Object.keys(ranges).map(Number)
  const tier = getSpinStackTier(effectiveBB, tiers)
  return ranges[tier]
}

/**
 * Retorna o range de call vs push
 */
export function getSpinCallRange(spot, effectiveBB) {
  const ranges = SPIN_CALL_PUSH_RANGES[spot]
  if (!ranges) return null
  const tiers = Object.keys(ranges).map(Number)
  const tier = getSpinStackTier(effectiveBB, tiers)
  return ranges[tier]
}

/**
 * Retorna o range de defesa vs open raise
 */
export function getSpinDefenseRange(spot, effectiveBB) {
  const ranges = SPIN_DEFENSE_RANGES[spot]
  if (!ranges) return null
  const tiers = Object.keys(ranges).map(Number)
  const tier = getSpinStackTier(effectiveBB, tiers)
  return ranges[tier]
}

/**
 * Retorna o range HU apropriado
 */
export function getSpinHURange(spot, effectiveBB) {
  const ranges = SPIN_HU_RANGES[spot]
  if (!ranges) return null
  const tiers = Object.keys(ranges).map(Number)
  const tier = getSpinStackTier(effectiveBB, tiers)
  return ranges[tier]
}

/**
 * Aplica ajuste de multiplicador a um range
 * Remove as últimas N% mãos do range (as mais marginais)
 */
export function adjustRangeForMultiplier(range, multiplier) {
  const adj = SPIN_MULTIPLIER_ADJUSTMENTS.adjustments[multiplier]
  if (!adj || adj.tightenPct === 0) return range

  const result = { ...range }
  // Para cada tipo de ação (raise/push/call), remover as últimas N% mãos
  for (const key of Object.keys(result)) {
    if (Array.isArray(result[key]) && key !== 'fold') {
      const hands = result[key]
      const cutoff = Math.floor(hands.length * (1 - adj.tightenPct))
      result[key] = hands.slice(0, cutoff)
    }
  }
  return result
}

/**
 * Determina se deve usar push/fold ou open raise baseado no stack
 */
export function shouldPushFold(effectiveBB) {
  if (effectiveBB <= 10) return 'push_only'    // Sempre push/fold
  if (effectiveBB <= 15) return 'mixed'         // Mix de raise e push
  return 'raise_only'                           // Min-raise only
}

/**
 * Verifica se uma mão está no range (raise, push, call, threebet, etc.)
 */
export function isHandInSpinRange(hand, range) {
  if (!range) return { inRange: false, action: 'fold' }

  for (const key of ['raise','push','threebet','threebet_shove','call']) {
    if (range[key] && range[key].includes(hand)) {
      return { inRange: true, action: key }
    }
  }
  if (range.mix && range.mix.includes(hand)) {
    return { inRange: true, action: 'mix' }
  }
  return { inRange: false, action: 'fold' }
}
