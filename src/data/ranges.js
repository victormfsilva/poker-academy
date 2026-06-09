/**
 * RANGES GTO - Poker Academy BR
 * Fontes: PokerCoaching.com, Upswing Poker, Jonathan Little, TwoPlusTwo forums, RedChipPoker
 * Consenso de pelo menos 3 fontes por range. Mãos na zona de transição marcadas como "mix".
 * Formato: "AKs" = suited, "AKo" = offsuit, "AA" = par
 */

// ============================================================
// MÓDULO 1 — RFI (Raise First In) em ChipEV
// Ranges por posição e stack size
// Fonte principal: PokerCoaching + Upswing + Jonathan Little
// ============================================================

// Notação: cada mão é uma string. "mix" = mão de transição (pode abrir ou foldar)
// Stack: 100bb (deep), 50bb (médio), 25bb (curto), 15bb (push/fold)

export const RFI_RANGES = {
  // UTG (~17%) — 6 jogadores após, range mais fechado da mesa
  // Fonte: GTO Wizard (público), Upswing, PokerCoaching
  UTG: {
    100: {
      // GTO Wizard MTT Avg 100bb ChipEV — ~16.9%
      raise: [
        'AA','KK','QQ','JJ','TT','99','88',
        'AKs','AQs','AJs','ATs','A9s','A8s',
        'KQs','KJs','KTs','K9s',
        'QJs','QTs','JTs',
        'T9s','98s','87s','76s','65s',
        'AKo','AQo','AJo',
      ],
      mix: ['77','66','55','A7s','A6s','A5s','Q9s','J9s','T8s','97s','86s','75s','ATo','KQo'],
      fold: []
    },
    50: {
      // GTO Wizard MTT Avg 50bb ChipEV — 17.3%
      raise: [
        'AA','KK','QQ','JJ','TT','99','88','77',
        'AKs','AQs','AJs','ATs','A9s','A8s',
        'KQs','KJs','KTs','K9s',
        'QJs','QTs','JTs',
        'T9s','98s','87s','76s',
        'AKo','AQo','AJo',
      ],
      mix: ['66','55','A7s','A6s','A5s','Q9s','J9s','T8s','97s','ATo','KQo'],
      fold: []
    },
    25: {
      // GTO Wizard MTT Avg 25bb ChipEV — 18.4%
      raise: [
        'AA','KK','QQ','JJ','TT','99','88','77',
        'AKs','AQs','AJs','ATs','A9s',
        'KQs','KJs','KTs',
        'QJs','QTs','JTs',
        'T9s','98s','87s',
        'AKo','AQo','AJo','KJo',
      ],
      mix: ['66','55','A8s','A7s','K9s','J9s','76s','ATo','KQo'],
      fold: []
    },
    15: {
      // GTO Wizard MTT Avg 15bb ChipEV — Raise 15.5%
      raise: [
        'AA','KK','QQ','JJ','TT','99','88','77',
        'AKs','AQs','AJs','ATs','A9s',
        'KQs','KJs','KTs',
        'QJs','JTs',
        'AKo','AQo','AJo',
      ],
      mix: ['66','A8s','Q9s','ATo','KQo'],
      fold: []
    }
  },

  // UTG+1 (~19.6%) — range ligeiramente mais largo que UTG
  'UTG+1': {
    100: {
      // GTO Wizard MTT Avg 100bb ChipEV — ~19.6%
      raise: [
        'AA','KK','QQ','JJ','TT','99','88','77',
        'AKs','AQs','AJs','ATs','A9s','A8s',
        'KQs','KJs','KTs','K9s','K8s',
        'QJs','QTs','Q9s','JTs','J9s',
        'T9s','98s','87s','76s','65s',
        'AKo','AQo','AJo',
      ],
      mix: ['66','55','A7s','A6s','A5s','K6s','Q8s','T8s','97s','86s','ATo','KQo'],
      fold: []
    },
    50: {
      // GTO Wizard MTT Avg 50bb ChipEV — 19.6%
      raise: [
        'AA','KK','QQ','JJ','TT','99','88','77',
        'AKs','AQs','AJs','ATs','A9s','A8s',
        'KQs','KJs','KTs','K9s',
        'QJs','QTs','Q9s','JTs','J9s',
        'T9s','98s','87s','76s',
        'AKo','AQo','AJo',
      ],
      mix: ['66','55','A7s','A6s','T8s','97s','ATo','KQo'],
      fold: []
    },
    25: {
      // GTO Wizard MTT Avg 25bb ChipEV — 20.8%
      raise: [
        'AA','KK','QQ','JJ','TT','99','88','77',
        'AKs','AQs','AJs','ATs','A9s',
        'KQs','KJs','KTs','K9s',
        'QJs','QTs','JTs',
        'T9s','98s','87s',
        'AKo','AQo','AJo',
      ],
      mix: ['66','55','A8s','A7s','J9s','76s','ATo','KQo'],
      fold: []
    },
    15: {
      // GTO Wizard MTT Avg 15bb ChipEV — Raise 16.1%
      raise: [
        'AA','KK','QQ','JJ','TT','99','88','77',
        'AKs','AQs','AJs','ATs','A9s',
        'KQs','KJs','KTs',
        'QJs','JTs',
        'AKo','AQo','AJo',
      ],
      mix: ['66','A8s','K9s','T9s','ATo','KQo'],
      fold: []
    }
  },

  // LJ (~23.2%) — 4 jogadores após
  LJ: {
    100: {
      // GTO Wizard MTT Avg 100bb ChipEV — ~23.2%
      raise: [
        'AA','KK','QQ','JJ','TT','99','88','77','66',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s',
        'KQs','KJs','KTs','K9s','K8s','K7s',
        'QJs','QTs','Q9s','JTs','J9s','J8s',
        'T9s','T8s','98s','97s','87s','86s','76s','75s','65s',
        'AKo','AQo','AJo','ATo',
      ],
      mix: ['55','A6s','A5s','A4s','Q8s','J7s','T7s','96s','85s','74s','64s','54s','KQo'],
      fold: []
    },
    50: {
      // GTO Wizard MTT Avg 50bb ChipEV — 23.7%
      raise: [
        'AA','KK','QQ','JJ','TT','99','88','77','66',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s',
        'KQs','KJs','KTs','K9s','K8s',
        'QJs','QTs','Q9s','JTs','J9s',
        'T9s','T8s','98s','87s','76s','65s',
        'AKo','AQo','AJo','ATo',
      ],
      mix: ['55','A6s','A5s','K7s','Q8s','J8s','97s','86s','75s','KQo'],
      fold: []
    },
    25: {
      // GTO Wizard MTT Avg 25bb ChipEV — 23.9%
      raise: [
        'AA','KK','QQ','JJ','TT','99','88','77','66',
        'AKs','AQs','AJs','ATs','A9s','A8s',
        'KQs','KJs','KTs','K9s',
        'QJs','QTs','JTs','J9s',
        'T9s','98s','87s','76s',
        'AKo','AQo','AJo','ATo',
      ],
      mix: ['55','A7s','K8s','Q9s','T8s','65s','KQo'],
      fold: []
    },
    15: {
      // GTO Wizard MTT Avg 15bb ChipEV — Raise 15.4%
      raise: [
        'AA','KK','QQ','JJ','TT','99','88','77','66',
        'AKs','AQs','AJs','ATs','A9s','A8s',
        'KQs','KJs','KTs','K9s',
        'QJs','QTs','JTs',
        'T9s',
        'AKo','AQo','AJo','ATo',
        'KQo',
      ],
      mix: ['55','A7s','J9s'],
      fold: []
    }
  },

  // HJ (~28.5%) — salto de +5% vs LJ
  HJ: {
    100: {
      // GTO Wizard MTT Avg 100bb ChipEV — ~28.5%
      raise: [
        'AA','KK','QQ','JJ','TT','99','88','77','66','55',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s',
        'KQs','KJs','KTs','K9s','K8s','K7s',
        'QJs','QTs','Q9s','Q8s','Q5s','JTs','J9s','J8s',
        'T9s','T8s','98s','97s','87s','86s','76s','75s','65s','64s','54s',
        'AKo','AQo','AJo','ATo','A9o',
        'KQo','KJo',
      ],
      mix: ['44','A4s','A3s','A2s','K6s','Q7s','Q6s','J7s','T7s','96s','85s','74s','63s','53s','43s','A8o'],
      fold: []
    },
    50: {
      // GTO Wizard MTT Avg 50bb ChipEV — 28.4%
      raise: [
        'AA','KK','QQ','JJ','TT','99','88','77','66','55',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s',
        'KQs','KJs','KTs','K9s','K8s','K7s',
        'QJs','QTs','Q9s','Q8s','JTs','J9s','J8s','J7s','J6s',
        'T9s','T8s','98s','97s','87s','86s','76s','75s','65s',
        'AKo','AQo','AJo','ATo','A9o',
        'KQo','KJo',
      ],
      mix: ['44','A4s','K6s','Q7s','T7s','96s','85s','74s','64s','54s'],
      fold: []
    },
    25: {
      // GTO Wizard MTT Avg 25bb ChipEV — 27.6%
      raise: [
        'AA','KK','QQ','JJ','TT','99','88','77','66','55',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s',
        'KQs','KJs','KTs','K9s','K8s',
        'QJs','QTs','Q9s','JTs','J9s',
        'T9s','T8s','98s','87s','76s',
        'AKo','AQo','AJo','ATo',
        'KQo','KJo',
      ],
      mix: ['44','A6s','A5s','K7s','Q8s','J8s','97s','86s','65s','54s','A7o'],
      fold: []
    },
    15: {
      // GTO Wizard MTT Avg 15bb ChipEV — Raise 16.4%
      raise: [
        'AA','KK','QQ','JJ','TT','99','88','77','66','55',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s',
        'KQs','KJs','KTs','K9s',
        'QJs','QTs','JTs','J9s',
        'T9s','98s','87s',
        'AKo','AQo','AJo','ATo',
        'KQo','KJo',
      ],
      mix: ['44','A6s','A5s','K8s','Q9s','QJo'],
      fold: []
    }
  },

  // CO (~37.1%) — salto de +10% vs HJ, raise 2.2x
  CO: {
    100: {
      // GTO Wizard MTT Avg 100bb ChipEV — ~37.1%, raise 2.2x
      raise: [
        'AA','KK','QQ','JJ','TT','99','88','77','66','55','44',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
        'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s',
        'QJs','QTs','Q9s','Q8s','Q7s',
        'JTs','J9s','J8s','J7s',
        'T9s','T8s','T7s',
        '98s','97s','96s',
        '87s','86s','85s',
        '76s','75s','74s',
        '65s','64s',
        '54s','53s',
        'AKo','AQo','AJo','ATo','A9o','A8o',
        'KQo','KJo','KTo',
        'QJo','QTo',
        'JTo',
      ],
      mix: ['33','22','K4s','K3s','Q6s','J6s','T6s','95s','84s','73s','63s','43s','A7o','A6o','K9o','Q9o','J9o'],
      fold: []
    },
    50: {
      // GTO Wizard MTT Avg 50bb ChipEV — 37.5%
      raise: [
        'AA','KK','QQ','JJ','TT','99','88','77','66','55','44',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s',
        'KQs','KJs','KTs','K9s','K8s','K7s','K6s',
        'QJs','QTs','Q9s','Q8s','Q7s',
        'JTs','J9s','J8s','J7s',
        'T9s','T8s','T7s',
        '98s','97s','96s',
        '87s','86s','85s',
        '76s','75s','74s',
        '65s','64s','54s',
        'AKo','AQo','AJo','ATo','A9o','A8o',
        'KQo','KJo','KTo',
        'QJo','QTo',
        'JTo',
      ],
      mix: ['33','A2s','K5s','Q6s','J6s','T6s','95s','84s','73s','63s','53s','43s','A7o','K9o','Q9o'],
      fold: []
    },
    25: {
      // GTO Wizard MTT Avg 25bb ChipEV — 34%
      raise: [
        'AA','KK','QQ','JJ','TT','99','88','77','66','55','44',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s',
        'KQs','KJs','KTs','K9s','K8s',
        'QJs','QTs','Q9s',
        'JTs','J9s','J8s',
        'T9s','T8s','98s','97s',
        '87s','86s','76s','75s','65s',
        'AKo','AQo','AJo','ATo','A9o',
        'KQo','KJo','KTo',
        'QJo','QTo',
        'JTo',
      ],
      mix: ['33','A4s','A3s','A2s','K7s','Q8s','T7s','96s','85s','64s','54s','A8o','K9o','J9o'],
      fold: []
    },
    15: {
      // GTO Wizard MTT Avg 15bb ChipEV — Raise 17%
      raise: [
        'AA','KK','QQ','JJ','TT','99','88','77','66','55','44',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s',
        'KQs','KJs','KTs','K9s','K8s',
        'QJs','QTs','Q9s','JTs','J9s',
        'T9s','98s','87s',
        'AKo','AQo','AJo','ATo','A9o',
        'KQo','KJo','KTo',
        'QJo','QTo',
        'JTo',
      ],
      mix: ['33','A4s','A3s','A2s','K7s','Q8s','T8s','65s','A8o','K9o','Q9o'],
      fold: []
    }
  },

  // BTN (~54.4%) — melhor posição, range muito amplo, raise 2.5x
  BTN: {
    100: {
      // GTO Wizard MTT Avg 100bb ChipEV — ~54.4%, raise 2.5x
      raise: [
        'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
        'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','K4s','K3s','K2s',
        'QJs','QTs','Q9s','Q8s','Q7s','Q6s','Q5s',
        'JTs','J9s','J8s','J7s','J6s',
        'T9s','T8s','T7s','T6s',
        '98s','97s','96s','95s',
        '87s','86s','85s','84s',
        '76s','75s','74s',
        '65s','64s','63s',
        '54s','53s','52s',
        '43s','42s','32s',
        'AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o','A5o',
        'KQo','KJo','KTo','K9o','K8o',
        'QJo','QTo','Q9o','Q8o',
        'JTo','J9o','J8o',
        'T9o','T8o',
        '98o','97o',
        '87o','86o',
        '76o','75o',
      ],
      mix: ['Q4s','J5s','T5s','94s','83s','73s','62s','A4o','A3o','A2o','K7o','Q7o','J7o','T7o','98o'],
      fold: []
    },
    50: {
      // GTO Wizard MTT Avg 50bb ChipEV — 53.8%
      raise: [
        'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
        'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','K4s','K3s',
        'QJs','QTs','Q9s','Q8s','Q7s','Q6s','Q5s',
        'JTs','J9s','J8s','J7s','J6s',
        'T9s','T8s','T7s','T6s',
        '98s','97s','96s','95s',
        '87s','86s','85s',
        '76s','75s','74s',
        '65s','64s',
        '54s','53s',
        '43s',
        'AKo','AQo','AJo','ATo','A9o','A8o','A7o',
        'KQo','KJo','KTo','K9o','K8o',
        'QJo','QTo','Q9o',
        'JTo','J9o',
        'T9o','T8o',
        '98o','97o',
        '87o','86o',
        '76o','75o',
      ],
      mix: ['K2s','Q4s','J5s','T5s','94s','84s','73s','63s','52s','42s','32s','A6o','A5o','K7o','Q8o','J8o','T7o'],
      fold: []
    },
    25: {
      // GTO Wizard MTT Avg 25bb ChipEV — 45.1%
      raise: [
        'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
        'KQs','KJs','KTs','K9s','K8s','K7s','K6s',
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
        'QJo','QTo','Q9o',
        'JTo','J9o',
        'T9o','T8o',
        '98o','97o',
        '87o','86o',
        '76o',
      ],
      mix: ['K5s','K4s','Q6s','J6s','T6s','95s','84s','74s','63s','53s','43s','A6o','A5o','K8o','Q8o','J8o','T7o'],
      fold: []
    },
    15: {
      // GTO Wizard MTT Avg 15bb ChipEV — Raise 18.1% + Allin 20.2%
      raise: [
        'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33',
        'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s',
        'KQs','KJs','KTs','K9s','K8s','K7s',
        'QJs','QTs','Q9s','Q8s','JTs','J9s','J8s',
        'T9s','T8s','98s','97s','87s','86s','76s',
        'AKo','AQo','AJo','ATo','A9o','A8o',
        'KQo','KJo','KTo','K9o',
        'QJo','QTo','Q9o',
        'JTo','J9o',
        'T9o',
      ],
      mix: ['22','A2s','K6s','Q7s','J7s','T7s','96s','75s','65s','54s','A7o','K8o','Q8o'],
      fold: []
    }
  }
}

// ============================================================
// MÓDULO 2 — PUSH/FOLD (Short Stack)
// Ranges de open shove por posição e stack (5-10bb)
// Fonte: ICMIZER, HoldemResources Calculator, Jonathan Little
// ============================================================

export const PUSH_FOLD_RANGES = {
  // Ranges de PUSH (open shove) por posição e stack
  // Fonte: GTO Wizard MTT Avg ChipEV
  UTG: {
    // 10bb: Allin 12.5% | 8bb: Allin 19.4% | 5bb: Allin ~76% (quase tudo)
    10: ['AA','KK','QQ','JJ','TT','99','88','77','66',
         'AKs','AQs','AJs','ATs','A9s','A8s',
         'KQs','KJs','KTs',
         'QJs',
         'AKo','AQo','AJo','ATo'],
    8:  ['AA','KK','QQ','JJ','TT','99','88','77','66','55',
         'AKs','AQs','AJs','ATs','A9s','A8s','A7s',
         'KQs','KJs','KTs','K9s',
         'QJs','QTs','JTs',
         'AKo','AQo','AJo','ATo','A9o',
         'KQo'],
    5:  ['AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
         'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
         'KQs','KJs','KTs','K9s','K8s',
         'QJs','QTs','Q9s',
         'JTs','J9s',
         'T9s','98s',
         'AKo','AQo','AJo','ATo','A9o','A8o',
         'KQo','KJo','KTo',
         'QJo'],
  },
  'UTG+1': {
    // 10bb: Allin 15.8% | 8bb: Allin 21.9% | 5bb: Allin 28.5%
    10: ['AA','KK','QQ','JJ','TT','99','88','77','66','55',
         'AKs','AQs','AJs','ATs','A9s','A8s',
         'KQs','KJs','KTs',
         'QJs','JTs',
         'AKo','AQo','AJo','ATo'],
    8:  ['AA','KK','QQ','JJ','TT','99','88','77','66','55','44',
         'AKs','AQs','AJs','ATs','A9s','A8s','A7s',
         'KQs','KJs','KTs','K9s',
         'QJs','QTs','JTs','J9s',
         'T9s',
         'AKo','AQo','AJo','ATo','A9o',
         'KQo','KJo'],
    5:  ['AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33',
         'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s',
         'KQs','KJs','KTs','K9s','K8s',
         'QJs','QTs','Q9s',
         'JTs','J9s',
         'T9s','98s','87s',
         'AKo','AQo','AJo','ATo','A9o','A8o',
         'KQo','KJo','KTo',
         'QJo'],
  },
  LJ: {
    // 10bb: Allin 19.7% | 8bb: Allin 25.8% | 5bb: Allin 31.8%
    10: ['AA','KK','QQ','JJ','TT','99','88','77','66','55','44',
         'AKs','AQs','AJs','ATs','A9s','A8s','A7s',
         'KQs','KJs','KTs','K9s',
         'QJs','QTs','JTs',
         'T9s',
         'AKo','AQo','AJo','ATo','A9o',
         'KQo','KJo'],
    8:  ['AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33',
         'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s',
         'KQs','KJs','KTs','K9s','K8s',
         'QJs','QTs','Q9s','JTs','J9s',
         'T9s','98s',
         'AKo','AQo','AJo','ATo','A9o',
         'KQo','KJo'],
    5:  ['AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
         'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s',
         'KQs','KJs','KTs','K9s','K8s','K7s',
         'QJs','QTs','Q9s','Q8s',
         'JTs','J9s','J8s',
         'T9s','T8s','98s',
         'AKo','AQo','AJo','ATo','A9o','A8o',
         'KQo','KJo','KTo',
         'QJo','QTo'],
  },
  HJ: {
    // 10bb: Allin 25.7% | 8bb: Allin 30% | 5bb: Allin 32.8%
    10: ['AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33',
         'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s',
         'KQs','KJs','KTs','K9s','K8s',
         'QJs','QTs','Q9s','JTs','J9s',
         'T9s','98s',
         'AKo','AQo','AJo','ATo','A9o',
         'KQo','KJo'],
    8:  ['AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
         'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s',
         'KQs','KJs','KTs','K9s','K8s',
         'QJs','QTs','Q9s','Q8s','JTs','J9s',
         'T9s','T8s','98s','87s',
         'AKo','AQo','AJo','ATo','A9o','A8o',
         'KQo','KJo','KTo'],
    5:  ['AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
         'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
         'KQs','KJs','KTs','K9s','K8s','K7s',
         'QJs','QTs','Q9s','Q8s','Q7s',
         'JTs','J9s','J8s',
         'T9s','T8s','98s','97s',
         'AKo','AQo','AJo','ATo','A9o','A8o','A7o',
         'KQo','KJo','KTo','K9o',
         'QJo','QTo','JTo'],
  },
  CO: {
    // 10bb: Allin 31.2% | 8bb: Allin 33.1% | 5bb: Allin 39.5%
    10: ['AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33',
         'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s',
         'KQs','KJs','KTs','K9s','K8s',
         'QJs','QTs','Q9s','Q8s',
         'JTs','J9s','J8s',
         'T9s','T8s','98s',
         'AKo','AQo','AJo','ATo','A9o','A8o',
         'KQo','KJo','KTo',
         'QJo'],
    8:  ['AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
         'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s',
         'KQs','KJs','KTs','K9s','K8s','K7s',
         'QJs','QTs','Q9s','Q8s','Q7s',
         'JTs','J9s','J8s','J7s',
         'T9s','T8s','T7s','98s','97s',
         'AKo','AQo','AJo','ATo','A9o','A8o','A7o',
         'KQo','KJo','KTo','K9o',
         'QJo','QTo'],
    5:  ['AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
         'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
         'KQs','KJs','KTs','K9s','K8s','K7s','K6s',
         'QJs','QTs','Q9s','Q8s','Q7s','Q6s',
         'JTs','J9s','J8s','J7s',
         'T9s','T8s','T7s','98s','97s','96s',
         '87s','86s','76s',
         'AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o',
         'KQo','KJo','KTo','K9o',
         'QJo','QTo','Q9o','JTo'],
  },
  BTN: {
    // 10bb: Allin 33.5% + Raise 5.6% | 8bb: Allin 41.9% | 5bb: Allin 47.3%
    10: ['AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33',
         'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s',
         'KQs','KJs','KTs','K9s','K8s',
         'QJs','QTs','Q9s','Q8s',
         'JTs','J9s','J8s',
         'T9s','T8s','98s','97s',
         '87s','76s',
         'AKo','AQo','AJo','ATo','A9o','A8o','A7o',
         'KQo','KJo','KTo','K9o',
         'QJo','QTo','JTo'],
    8:  ['AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
         'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
         'KQs','KJs','KTs','K9s','K8s','K7s',
         'QJs','QTs','Q9s','Q8s','Q7s',
         'JTs','J9s','J8s','J7s',
         'T9s','T8s','T7s','98s','97s','96s',
         '87s','86s','76s','75s','65s',
         'AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o',
         'KQo','KJo','KTo','K9o','K8o',
         'QJo','QTo','Q9o','JTo','J9o'],
    5:  ['AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
         'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
         'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s',
         'QJs','QTs','Q9s','Q8s','Q7s','Q6s',
         'JTs','J9s','J8s','J7s','J6s',
         'T9s','T8s','T7s','T6s','98s','97s','96s',
         '87s','86s','85s','76s','75s','65s','64s',
         'AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o','A5o',
         'KQo','KJo','KTo','K9o','K8o',
         'QJo','QTo','Q9o','Q8o',
         'JTo','J9o','T9o'],
  },
  SB: {
    // 10bb: Allin 48.9% + Call 26.9% | 8bb: Allin 60.6% + Call 16.4% | 5bb: Allin 76% + Call ~1%
    10: ['AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
         'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
         'KQs','KJs','KTs','K9s','K8s','K7s','K6s',
         'QJs','QTs','Q9s','Q8s','Q7s',
         'JTs','J9s','J8s','J7s',
         'T9s','T8s','T7s','98s','97s',
         '87s','86s','76s','75s','65s',
         'AKo','AQo','AJo','ATo','A9o','A8o','A7o',
         'KQo','KJo','KTo','K9o',
         'QJo','QTo','JTo','T9o'],
    8:  ['AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
         'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
         'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','K4s',
         'QJs','QTs','Q9s','Q8s','Q7s','Q6s','Q5s',
         'JTs','J9s','J8s','J7s','J6s',
         'T9s','T8s','T7s','T6s','98s','97s','96s',
         '87s','86s','85s','76s','75s','65s','64s','54s',
         'AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o','A5o',
         'KQo','KJo','KTo','K9o','K8o',
         'QJo','QTo','Q9o','JTo','J9o','T9o','98o'],
    5:  ['AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
         'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
         'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','K4s','K3s','K2s',
         'QJs','QTs','Q9s','Q8s','Q7s','Q6s','Q5s','Q4s',
         'JTs','J9s','J8s','J7s','J6s','J5s',
         'T9s','T8s','T7s','T6s','98s','97s','96s','95s',
         '87s','86s','85s','76s','75s','74s','65s','64s','54s','53s',
         'AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o','A5o','A4o','A3o',
         'KQo','KJo','KTo','K9o','K8o','K7o',
         'QJo','QTo','Q9o','Q8o',
         'JTo','J9o','J8o','T9o','T8o','98o','97o'],
  }
}

// ============================================================
// MÓDULO 3 — BB vs RFI
// Ranges de defesa do BB contra raises de cada posição
// Fonte: PokerCoaching, Upswing, RedChipPoker
// ============================================================

export const BB_VS_RFI = {
  // vs UTG raise (range mais fechado do adversário = BB defende menos)
  vsUTG: {
    call: ['AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s','KQs','KJs','KTs','K9s','QJs','QTs','Q9s','JTs','J9s','J8s','T9s','T8s','98s','97s','87s','86s','76s','75s','65s','54s','AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22','AKo','AQo','AJo','ATo','KQo'],
    threebet: ['AA','KK','QQ','JJ','AKs','AKo','AQs'],
    fold: [] // tudo que não é call ou 3bet
  },
  vsUTG1: {
    call: ['AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s','KQs','KJs','KTs','K9s','K8s','QJs','QTs','Q9s','Q8s','JTs','J9s','J8s','J7s','T9s','T8s','98s','97s','87s','86s','76s','75s','65s','54s','AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22','AKo','AQo','AJo','ATo','A9o','KQo','KJo'],
    threebet: ['AA','KK','QQ','JJ','AKs','AKo','AQs','AQo'],
    fold: []
  },
  vsLJ: {
    call: ['AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s','KQs','KJs','KTs','K9s','K8s','K7s','QJs','QTs','Q9s','Q8s','Q7s','JTs','J9s','J8s','J7s','T9s','T8s','T7s','98s','97s','87s','86s','76s','75s','65s','64s','54s','53s','AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22','AKo','AQo','AJo','ATo','A9o','A8o','KQo','KJo','KTo','QJo'],
    threebet: ['AA','KK','QQ','JJ','TT','AKs','AQs','AJs','AKo','AQo'],
    fold: []
  },
  vsHJ: {
    call: ['AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s','KQs','KJs','KTs','K9s','K8s','K7s','K6s','QJs','QTs','Q9s','Q8s','Q7s','Q6s','JTs','J9s','J8s','J7s','T9s','T8s','T7s','98s','97s','96s','87s','86s','76s','75s','65s','64s','54s','43s','AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22','AKo','AQo','AJo','ATo','A9o','A8o','A7o','KQo','KJo','KTo','QJo','QTo'],
    threebet: ['AA','KK','QQ','JJ','TT','99','AKs','AQs','AJs','ATs','AKo','AQo','AJo'],
    fold: []
  },
  vsCO: {
    call: ['AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s','KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','QJs','QTs','Q9s','Q8s','Q7s','Q6s','JTs','J9s','J8s','J7s','J6s','T9s','T8s','T7s','T6s','98s','97s','96s','95s','87s','86s','85s','76s','75s','65s','64s','54s','53s','43s','AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22','AKo','AQo','AJo','ATo','A9o','A8o','A7o','KQo','KJo','KTo','K9o','QJo','QTo','JTo','T9o'],
    threebet: ['AA','KK','QQ','JJ','TT','99','88','AKs','AQs','AJs','ATs','A5s','A4s','A3s','A2s','AKo','AQo','AJo','ATo'],
    fold: []
  },
  vsBTN: {
    call: ['AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s','KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','K4s','K3s','QJs','QTs','Q9s','Q8s','Q7s','Q6s','Q5s','JTs','J9s','J8s','J7s','J6s','T9s','T8s','T7s','T6s','98s','97s','96s','95s','87s','86s','85s','76s','75s','65s','64s','54s','53s','43s','32s','AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22','AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o','KQo','KJo','KTo','K9o','K8o','QJo','QTo','Q9o','JTo','J9o','T9o','T8o','98o'],
    threebet: ['AA','KK','QQ','JJ','TT','99','88','77','AKs','AQs','AJs','ATs','A5s','A4s','A3s','A2s','KQs','AKo','AQo','AJo','ATo','A9o'],
    fold: []
  },
  vsSB: {
    call: ['AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s','KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','K4s','K3s','K2s','QJs','QTs','Q9s','Q8s','Q7s','Q6s','JTs','J9s','J8s','J7s','T9s','T8s','T7s','98s','97s','96s','87s','86s','76s','75s','65s','54s','43s','AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22','AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o','A5o','KQo','KJo','KTo','K9o','QJo','QTo','JTo','T9o','98o','87o'],
    threebet: ['AA','KK','QQ','JJ','TT','99','88','AKs','AQs','AJs','ATs','A5s','A4s','A3s','A2s','KQs','KJs','AKo','AQo','AJo','ATo'],
    fold: []
  }
}

// ============================================================
// MÓDULO 5 — BLIND WARS (SB vs BB)
// Fonte: PokerCoaching, Upswing, RedChipPoker
// ============================================================

export const BLIND_WARS = {
  // SB completa (limp) vs BB
  SB_complete: {
    complete: ['AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22','AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s','KQs','KJs','KTs','K9s','K8s','K7s','QJs','QTs','Q9s','Q8s','JTs','J9s','J8s','T9s','T8s','98s','97s','87s','86s','76s','75s','65s','64s','54s','AKo','AQo','AJo','ATo','A9o','A8o','A7o','KQo','KJo','KTo','K9o','QJo','QTo','JTo','T9o'],
    raise: ['AA','KK','QQ','JJ','TT','99','AKs','AQs','AJs','ATs','A5s','A4s','AKo','AQo'],
    fold: ['72o','73o','82o','83o','84o','92o','93o','94o','T2o','T3o','T4o']
  },
  // BB vs SB complete — quando checar ou apostar
  BB_vs_complete: {
    check: [],
    bet: ['AA','KK','QQ','JJ','TT','99','AKs','AQs','AJs','AKo','AQo','AJo']
  },
  // SB raise vs BB
  SB_raise: {
    raise: ['AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22','AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s','KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','QJs','QTs','Q9s','Q8s','Q7s','JTs','J9s','J8s','J7s','T9s','T8s','T7s','98s','97s','96s','87s','86s','85s','76s','75s','65s','64s','54s','53s','43s','AKo','AQo','AJo','ATo','A9o','A8o','A7o','KQo','KJo','KTo','K9o','QJo','QTo','Q9o','JTo','J9o','T9o','T8o','98o','87o','76o'],
    fold: []
  }
}

// ============================================================
// MÓDULO 6 — SB e BTN vs RFI
// Fonte: PokerCoaching, Upswing
// ============================================================

export const BTN_VS_RFI = {
  vsUTG: {
    call: ['AKs','AQs','AJs','ATs','A9s','A8s','A5s','A4s','KQs','KJs','KTs','K9s','QJs','QTs','JTs','J9s','T9s','T8s','98s','97s','87s','76s','65s','54s','AA','KK','QQ','JJ','TT','99','88','77','66','55','AKo','AQo'],
    threebet: ['AA','KK','QQ','JJ','TT','AKs','AQs','AJs','ATs','A5s','A4s','AKo','AQo'],
    fold: []
  },
  vsHJ: {
    call: ['AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','KQs','KJs','KTs','K9s','K8s','QJs','QTs','Q9s','JTs','J9s','J8s','T9s','T8s','T7s','98s','97s','87s','86s','76s','75s','65s','54s','AA','KK','QQ','JJ','TT','99','88','77','66','55','44','AKo','AQo','AJo'],
    threebet: ['AA','KK','QQ','JJ','TT','99','AKs','AQs','AJs','ATs','A5s','A4s','A3s','AKo','AQo','AJo'],
    fold: []
  },
  vsCO: {
    call: ['AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s','KQs','KJs','KTs','K9s','K8s','K7s','QJs','QTs','Q9s','Q8s','JTs','J9s','J8s','T9s','T8s','T7s','98s','97s','96s','87s','86s','76s','75s','65s','64s','54s','AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','AKo','AQo','AJo','ATo'],
    threebet: ['AA','KK','QQ','JJ','TT','99','88','AKs','AQs','AJs','ATs','A5s','A4s','A3s','A2s','AKo','AQo','AJo'],
    fold: []
  }
}

export const SB_VS_RFI = {
  vsUTG: {
    call: ['AKs','AQs','AJs','ATs','A9s','A8s','KQs','KJs','KTs','QJs','QTs','JTs','T9s','98s','AA','KK','QQ','JJ','TT','99','88','77','66'],
    threebet: ['AA','KK','QQ','JJ','AKs','AKo'],
    fold: []
  },
  vsHJ: {
    call: ['AKs','AQs','AJs','ATs','A9s','A8s','A7s','A5s','A4s','KQs','KJs','KTs','QJs','QTs','JTs','J9s','T9s','98s','87s','76s','65s','AA','KK','QQ','JJ','TT','99','88','77','66','55'],
    threebet: ['AA','KK','QQ','JJ','TT','AKs','AQs','AJs','A5s','A4s','AKo','AQo'],
    fold: []
  },
  vsCO: {
    call: ['AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','KQs','KJs','KTs','K9s','QJs','QTs','Q9s','JTs','J9s','T9s','T8s','98s','87s','76s','65s','54s','AA','KK','QQ','JJ','TT','99','88','77','66','55','44'],
    threebet: ['AA','KK','QQ','JJ','TT','99','AKs','AQs','AJs','ATs','A5s','A4s','AKo','AQo','AJo'],
    fold: []
  },
  vsBTN: {
    call: ['AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','KQs','KJs','KTs','K9s','K8s','QJs','QTs','Q9s','JTs','J9s','J8s','T9s','T8s','98s','97s','87s','86s','76s','65s','54s','AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33'],
    threebet: ['AA','KK','QQ','JJ','TT','99','88','AKs','AQs','AJs','ATs','A5s','A4s','A3s','KQs','AKo','AQo','AJo'],
    fold: []
  }
}

// ============================================================
// POSIÇÕES — Informações sobre cada posição
// ============================================================

export const POSITION_INFO = {
  UTG: {
    name: 'UTG (Under the Gun)',
    shortName: 'UTG',
    playersAfter: 6,
    rangePercent: { 100: 17, 50: 17, 25: 18, 15: 16 }, // GTO Wizard: 16.9% / 17.3% / 18.4% / 15.5%
    description: 'Posição mais fechada. 6 jogadores ainda falam depois de você.',
    color: '#e94560'
  },
  'UTG+1': {
    name: 'UTG+1',
    shortName: 'UTG+1',
    playersAfter: 5,
    rangePercent: { 100: 20, 50: 20, 25: 21, 15: 16 }, // GTO Wizard: 19.6% / 19.6% / 20.8% / 16.1%
    description: 'Segunda posição mais fechada. 5 jogadores ainda falam.',
    color: '#e94560'
  },
  LJ: {
    name: 'LJ (Lojack)',
    shortName: 'LJ',
    playersAfter: 4,
    rangePercent: { 100: 23, 50: 24, 25: 24, 15: 20 }, // GTO Wizard: 23.2% / 23.7% / 23.9% / 20.1%
    description: '4 jogadores falam depois. Range começa a abrir.',
    color: '#f5a623'
  },
  HJ: {
    name: 'HJ (Hijack)',
    shortName: 'HJ',
    playersAfter: 3,
    rangePercent: { 100: 29, 50: 28, 25: 28, 15: 24 }, // GTO Wizard: 28.5% / 28.4% / 27.6% / 23.8%
    description: 'Salto de +5% em relação ao LJ. 3 jogadores após.',
    color: '#f5a623'
  },
  CO: {
    name: 'CO (Cutoff)',
    shortName: 'CO',
    playersAfter: 2,
    rangePercent: { 100: 37, 50: 38, 25: 34, 15: 30 }, // GTO Wizard: 37.1% / 37.5% / 34% / 29.6%
    description: 'Salto de +10% em relação ao HJ. Posição muito boa.',
    color: '#4a90e2'
  },
  BTN: {
    name: 'BTN (Button)',
    shortName: 'BTN',
    playersAfter: 2,
    rangePercent: { 100: 54, 50: 54, 25: 45, 15: 38 }, // GTO Wizard: 54.4% / 53.8% / 45.1% / 38.3%
    description: 'Melhor posição pré-flop. Sempre IP no pós-flop.',
    color: '#00d4aa'
  },
  SB: {
    name: 'SB (Small Blind)',
    shortName: 'SB',
    playersAfter: 1,
    rangePercent: { 100: 45, 50: 40, 25: 34, 15: 28 },
    description: 'Sempre OOP no pós-flop. Range especial vs BB.',
    color: '#e94560'
  },
  BB: {
    name: 'BB (Big Blind)',
    shortName: 'BB',
    playersAfter: 0,
    rangePercent: { 100: 0, 50: 0, 25: 0, 15: 0 },
    description: 'Defende o investimento já feito. Último a agir pré-flop.',
    color: '#e94560'
  }
}

// ============================================================
// GLOSSÁRIO
// ============================================================

export const GLOSSARIO = [
  { termo: 'RFI', definicao: 'Raise First In — quando ninguém ainda abriu o pote e você faz o primeiro raise' },
  { termo: 'CBet', definicao: 'Continuation Bet — aposta no flop feita pelo jogador que fez o raise pré-flop' },
  { termo: 'IP', definicao: 'In Position — quando você age depois do seu adversário no pós-flop (vantagem)' },
  { termo: 'OOP', definicao: 'Out of Position — quando você age antes do adversário no pós-flop (desvantagem)' },
  { termo: 'BTN', definicao: 'Button — a melhor posição da mesa, último a agir no pós-flop' },
  { termo: 'CO', definicao: 'Cutoff — segunda melhor posição, à direita do Button' },
  { termo: 'HJ', definicao: 'Hijack — terceira posição contando da direita' },
  { termo: 'LJ', definicao: 'Lojack — quarta posição contando da direita' },
  { termo: 'UTG', definicao: 'Under the Gun — primeiro a agir pré-flop, posição mais fechada' },
  { termo: 'SB', definicao: 'Small Blind — posta metade do big blind obrigatório' },
  { termo: 'BB', definicao: 'Big Blind — posta o big blind completo obrigatório' },
  { termo: 'ICM', definicao: 'Independent Chip Model — modelo que considera o valor dos chips em dinheiro real no torneio' },
  { termo: 'EV', definicao: 'Expected Value — valor esperado. EV+ significa lucrativo a longo prazo' },
  { termo: 'ChipEV', definicao: 'Chip EV — maximizar chips sem considerar ICM. Usado no início dos torneios' },
  { termo: 'VPIP', definicao: 'Voluntarily Put $ In Pot — % de mãos que o jogador entra voluntariamente' },
  { termo: 'PFR', definicao: 'Pre-Flop Raise — % de mãos que o jogador abre com raise' },
  { termo: 'GTO', definicao: 'Game Theory Optimal — estratégia matematicamente equilibrada, impossível de explorar' },
  { termo: 'Range', definicao: 'Conjunto de todas as mãos possíveis que um jogador pode ter em uma situação' },
  { termo: '3-bet', definicao: 'Terceira aposta da sequência — re-raise sobre um raise' },
  { termo: '4-bet', definicao: 'Quarta aposta — raise sobre um 3-bet' },
  { termo: 'Pot Odds', definicao: 'Relação entre o tamanho da aposta e o pote — decide se um call é lucrativo' },
  { termo: 'Outs', definicao: 'Cartas do baralho que melhoram a sua mão para a mão vencedora' },
  { termo: 'Equity', definicao: '% de vezes que sua mão vence o range do adversário no showdown' },
  { termo: 'Board Texture', definicao: 'Característica do flop: seco (dry), úmido (wet), conectado, pareado' },
  { termo: 'Dry Board', definicao: 'Board seco — poucas possibilidades de draws. Ex: A72 rainbow' },
  { termo: 'Wet Board', definicao: 'Board úmido — muitos draws possíveis. Ex: 789 com dois naipes iguais' },
  { termo: 'Stack', definicao: 'Quantidade de fichas que você tem' },
  { termo: 'BB (stack)', definicao: 'Big Blinds — unidade de medida do stack. 100bb = 100 vezes o big blind' },
  { termo: 'Push/Fold', definicao: 'Estratégia com stack curto (abaixo de 15bb): só vai all-in ou folda' },
  { termo: 'Open Shove', definicao: 'Ir all-in como primeiro a agir' },
  { termo: 'Blockers', definicao: 'Cartas na sua mão que reduzem a probabilidade do adversário ter certas mãos' },
  { termo: 'Suited', definicao: 'Dois naipes iguais — ex: As Ks (s = suited)' },
  { termo: 'Offsuit', definicao: 'Naipes diferentes — ex: Ao Kc (o = offsuit)' },
  { termo: 'Connector', definicao: 'Cartas em sequência — ex: 87, T9' },
  { termo: 'Semi-blefe', definicao: 'Blefar com uma mão que ainda pode melhorar (draw)' },
  { termo: 'Value Bet', definicao: 'Apostar com a melhor mão para ganhar mais quando chamado' },
  { termo: 'Blind Wars', definicao: 'Confronto entre SB e BB quando todos os outros jogadores foldaram' },
  { termo: 'Multiway', definicao: 'Pote com 3 ou mais jogadores' },
  { termo: 'HU', definicao: 'Heads-Up — confronto entre apenas 2 jogadores' },
  { termo: 'Showdown', definicao: 'Revelação das cartas ao final da mão para determinar o vencedor' },
  { termo: 'ITM', definicao: 'In The Money — já premiado no torneio' },
  { termo: 'Bolha', definicao: 'Momento em que um jogador ainda pode sair sem prêmio' },
  { termo: 'ROI', definicao: 'Return on Investment — lucro percentual sobre o buy-in investido' },
  { termo: 'Reg', definicao: 'Regular — jogador experiente que joga frequentemente' },
  { termo: 'Fish', definicao: 'Jogador fraco/inexperiente' },
  { termo: 'Tilt', definicao: 'Estado emocional negativo que piora as decisões' },
]
