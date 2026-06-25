import { useState, useCallback } from 'react'
import SessionReview from '../../components/SessionReview'
import { useProgress } from '../../context/ProgressContext'
import DecisionTree from '../../components/DecisionTree'
import ModulePokerTable from '../../components/ModulePokerTable'

const SUITS_POOL = ['s','h','d','c']
function randSuit() { return SUITS_POOL[Math.floor(Math.random() * 4)] }
function randSuitExcluding(s) { const o = SUITS_POOL.filter(x => x !== s); return o[Math.floor(Math.random() * o.length)] }
function makeRainbowBoard(ranks) {
  const used = new Set()
  return ranks.map(r => { let s; do { s = randSuit() } while (used.has(s) && used.size < 4); used.add(s); return r + s })
}
function makeHeroCards(r1, r2, suited) { const s1 = randSuit(); return [r1 + s1, r2 + (suited ? s1 : randSuitExcluding(s1))] }

// ================================================================
// MÓDULO 23 — Range Advantage vs Nut Advantage
// ================================================================

// ----------------------------------------------------------------
// Pools de posicoes e ranks por textura
// ----------------------------------------------------------------
const EP_POSITIONS = ['UTG', 'LJ']
const MP_POSITIONS = ['HJ', 'CO']
const LP_POSITIONS = ['BTN', 'CO']
const ALL_POSITIONS = ['UTG', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB']
const POS_ORDER = { UTG: 0, LJ: 1, HJ: 2, CO: 3, BTN: 4, SB: 5, BB: 6 }

// Retorna [raiserPos, callerPos] validos (raiser abre antes ou SB/BB dinamica)
function randRaiserCaller(raiserPool, callerPool) {
  const r = raiserPool[Math.floor(Math.random() * raiserPool.length)]
  const valid = callerPool.filter(p => p !== r && (POS_ORDER[p] > POS_ORDER[r] || p === 'BB' || p === 'SB'))
  const c = valid.length ? valid[Math.floor(Math.random() * valid.length)] : 'BB'
  return [r, c]
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

// Ranks por textura
const HIGH_RANKS   = [['A','K','7'],['A','K','5'],['A','K','2'],['A','Q','6'],['A','Q','3'],['A','J','4'],['A','T','2']]
const MID_HIGH     = [['K','Q','7'],['K','J','6'],['K','T','5'],['Q','J','8'],['Q','T','4'],['J','T','3']]
const MID_BOARDS   = [['T','8','4'],['9','8','3'],['T','7','2'],['J','8','2'],['T','6','3'],['9','7','4']]
const LOW_BOARDS   = [['7','6','3'],['7','5','2'],['6','5','2'],['8','4','2'],['6','4','2'],['5','4','2']]
const CONNECTED_HI = [['Q','J','T'],['K','Q','J'],['J','T','9'],['Q','J','9']]
const CONNECTED_LO = [['8','7','6'],['7','6','5'],['6','5','4'],['5','4','3']]
const LOW_POTS     = ['5.5bb','6bb','6.5bb','7bb']
const THREBET_POTS = ['13bb','14bb','15bb','16bb']

// board pareado alto: AA-x, KK-x
function makePairedHighBoard() {
  const pair = pick(['A','K','Q','J'])
  const kick = pick(['9','8','7','6','5','4','3','2'].filter(r => r !== pair))
  const s1 = randSuit(); const s2 = randSuitExcluding(s1); const s3 = randSuit()
  return [pair + s1, pair + s2, kick + s3]
}

// board pareado baixo: 22-x, 33-x, 44-x
function makePairedLowBoard() {
  const pair = pick(['2','3','4','5','6','7'])
  const high = pick(['A','K','Q','J','T'].filter(r => r !== pair))
  const s1 = randSuit(); const s2 = randSuitExcluding(s1); const s3 = randSuit()
  return [high + s3, pair + s1, pair + s2]
}

// board monotone
function makeMonotoneBoard(ranks) {
  const s = randSuit()
  return ranks.map(r => r + s)
}

// board com flush draw (2 cartas do mesmo naipe)
function makeFlushDrawBoard(ranks) {
  const fs = randSuit()
  const other = randSuitExcluding(fs)
  return [ranks[0] + fs, ranks[1] + fs, ranks[2] + other]
}

// ----------------------------------------------------------------
// SCENARIOS — 25 templates parametrizados
// ----------------------------------------------------------------
const SCENARIOS = [

  // ── T01: Range advantage em board alto (A-high) ─────────────────
  () => {
    const ranks = pick(HIGH_RANKS)
    const board = makeRainbowBoard(ranks)
    const [raiser, caller] = randRaiserCaller(LP_POSITIONS, ['BB','SB'])
    const heroHand = pick([makeHeroCards('A','Q',false), makeHeroCards('A','J',false), makeHeroCards('K','Q',false)])
    return {
      q: `Flop ${ranks[0]}-${ranks[1]}-${ranks[2]} rainbow. ${raiser} (raiser) vs ${caller} (caller). Quem tem range advantage?`,
      a: `${raiser} (range de open tem mais Ax, Kx, broadways)`,
      b: caller,
      aCorrect: true,
      explanation: `${raiser} abriu o pote com range forte cheio de Ax, Kx e broadways. ${caller} defende wide mas com mãos menos conectadas a esse board alto. Range advantage clara para o raiser.`,
      boardCards: board, heroPos: raiser, villainPos: caller,
      heroCards: heroHand, villainAction: 'Check', potLabel: pick(LOW_POTS),
    }
  },

  // ── T02: Range advantage em board baixo (BB favorecido) ──────────
  () => {
    const ranks = pick(LOW_BOARDS)
    const board = makeRainbowBoard(ranks)
    const [raiser, caller] = randRaiserCaller(LP_POSITIONS, ['BB'])
    const heroHand = makeHeroCards('A', pick(['J','T','9']), false)
    return {
      q: `Flop ${ranks[0]}-${ranks[1]}-${ranks[2]} rainbow. ${raiser} (raiser) vs ${caller} (caller). Quem tem range advantage?`,
      a: `${caller} (defende com mais ${ranks[0]}x, sets baixos, suited connectors)`,
      b: raiser,
      aCorrect: true,
      explanation: `Board baixo favorece o ${caller}. BB/SB defende com muitas mãos conectadas baixas (suited connectors, pares pequenos) que o raiser não teria aberto ou teria descartado. Range advantage vai para o caller.`,
      boardCards: board, heroPos: raiser, villainPos: caller,
      heroCards: heroHand, villainAction: 'Check', potLabel: pick(LOW_POTS),
    }
  },

  // ── T03: Estrategia com range advantage — sizing pequeno ─────────
  () => {
    const ranks = pick([...HIGH_RANKS, ...MID_HIGH])
    const board = makeRainbowBoard(ranks)
    const [raiser, caller] = randRaiserCaller(LP_POSITIONS, ['BB','SB'])
    const heroHand = pick([makeHeroCards('K','T',false), makeHeroCards('Q','J',false), makeHeroCards('A','9',false)])
    return {
      q: `${raiser} tem range advantage no flop ${ranks[0]}-${ranks[1]}-${ranks[2]}. Qual a estratégia correta de c-bet?`,
      a: 'C-bet frequente (70%+) com sizing PEQUENO (25-33%)',
      b: 'C-bet seletiva com sizing grande (66-75%)',
      aCorrect: true,
      explanation: 'Range advantage = bet com alta frequência e sizing pequeno. Você aposta com muitas mãos, entao usa um sizing que não precisa funcionar muito pra ser lucrativo. Sizing pequeno maximiza EV com range inteiro.',
      boardCards: board, heroPos: raiser, villainPos: caller,
      heroCards: heroHand, villainAction: 'Check', potLabel: pick(LOW_POTS),
    }
  },

  // ── T04: Nut advantage em board conectado alto ───────────────────
  () => {
    const ranks = pick(CONNECTED_HI)
    const board = [ranks[0]+randSuit(), ranks[1]+randSuit(), ranks[2]+randSuit()]
    const [raiser, caller] = randRaiserCaller([...MP_POSITIONS, 'BTN'], ['BB','SB'])
    return {
      q: `Flop ${ranks[0]}-${ranks[1]}-${ranks[2]} conectado. ${raiser} (raiser) vs ${caller}. Quem tem nut advantage?`,
      a: `${raiser} (tem mais AK/nuts, sets de ${ranks[0]}/${ranks[1]}/${ranks[2]}, overpairs premium)`,
      b: caller,
      aCorrect: true,
      explanation: `${raiser} abriu com range mais forte e tem mais combos das nuts — sets dos tres ranks, AK (straight quando aplicavel), KK, QQ. Nut advantage para o raiser em boards conectados altos.`,
      boardCards: board, heroPos: raiser, villainPos: caller,
      heroCards: makeHeroCards('A','K',false), villainAction: 'Check', potLabel: pick(LOW_POTS),
    }
  },

  // ── T05: Nut advantage sem range advantage — polarizar ───────────
  () => {
    const ranks = pick(LOW_BOARDS)
    const board = makeRainbowBoard(ranks)
    const [raiser, caller] = randRaiserCaller([...MP_POSITIONS, 'BTN'], ['BB'])
    return {
      q: `Flop ${ranks[0]}-${ranks[1]}-${ranks[2]} rainbow. ${raiser} raiser, ${caller} caller. ${raiser} tem nut advantage mas NAO range advantage. Qual a estratégia?`,
      a: 'Bet MENOS frequente mas com sizing GRANDE (66-100%)',
      b: 'Bet muito frequente com sizing pequeno',
      aCorrect: true,
      explanation: 'Nut advantage sem range advantage = polarize. Você não tem muitas mãos boas no geral, mas quando tem sao monstros. Bet grande com mãos fortes e bluffs polarizados, check com range médio.',
      boardCards: board, heroPos: raiser, villainPos: caller,
      heroCards: makeHeroCards('A','A',false), villainAction: 'Check', potLabel: pick(LOW_POTS),
    }
  },

  // ── T06: EP raiser — range + nut advantage em K-high ────────────
  () => {
    const kick = pick(['8','7','6','5','4','3','2'])
    const ranks = ['K', pick(['9','8','7','6']), kick]
    const board = makeRainbowBoard(ranks)
    const [raiser, caller] = randRaiserCaller(EP_POSITIONS, ['BTN','CO','HJ','BB'])
    return {
      q: `Flop ${ranks[0]}-${ranks[1]}-${ranks[2]} rainbow. ${raiser} (raiser) vs ${caller} (caller). Quem domina em range E nut advantage?`,
      a: `${raiser} (range mais forte: KK, AA, AK, KQs — todos no range de EP)`,
      b: caller,
      aCorrect: true,
      explanation: `${raiser} abre de early position com range muito forte. Tem todos os premium: AA, KK, AK, KQs. ${caller} tem range mais wide mas mais fraco. EP domina tanto em range quanto em nut advantage em boards com K alto.`,
      boardCards: board, heroPos: raiser, villainPos: caller,
      heroCards: makeHeroCards('A','K',false), villainAction: 'Call', potLabel: pick(LOW_POTS),
    }
  },

  // ── T07: BB com range advantage — donk/check-raise ──────────────
  () => {
    const ranks = pick(LOW_BOARDS)
    const board = makeRainbowBoard(ranks)
    const [raiser, caller] = randRaiserCaller([...MP_POSITIONS, 'BTN'], ['BB'])
    return {
      q: `Flop ${ranks[0]}-${ranks[1]}-${ranks[2]} rainbow. ${raiser} (raiser) vs BB (caller). BB tem range advantage. O que BB deve fazer?`,
      a: 'Check-raise ou donk bet mais frequente (explorar a vantagem de range)',
      b: 'Sempre checar pro raiser sem opção de raise',
      aCorrect: true,
      explanation: `Quando BB tem range advantage em board baixo, pode donk bet ou check-raise com mais frequência. ${raiser} vai c-betar pouco nesse board, e BB pode tomar a iniciativa e explorar a vantagem.`,
      boardCards: board, heroPos: 'BB', villainPos: raiser,
      heroCards: makeHeroCards(ranks[0], pick(['5','6','7']), true), villainAction: `Bet ${pick(['33%','25%'])}`, potLabel: pick(LOW_POTS),
    }
  },

  // ── T08: Board pareado alto — nut advantage do raiser ───────────
  () => {
    const board = makePairedHighBoard()
    const pairRank = board[0][0]
    const [raiser, caller] = randRaiserCaller(LP_POSITIONS, ['BB','SB'])
    return {
      q: `Flop ${board[0][0]}-${board[1][0]}-${board[2][0]} (board pareado). ${raiser} (raiser) vs ${caller}. Quem tem nut advantage?`,
      a: `${raiser} (tem muito mais ${pairRank}x no range — A${pairRank}, K${pairRank}, ${pairRank}Q, etc.)`,
      b: `${caller} (defende com mais maos)`,
      aCorrect: true,
      explanation: `Board pareado com ${pairRank}: ${raiser} tem muito mais combinacoes de ${pairRank}x do que ${caller}, que teria 3-bet ou foldado muitas dessas mãos. Nut advantage claro para o raiser.`,
      boardCards: board, heroPos: raiser, villainPos: caller,
      heroCards: makeHeroCards('A', pairRank, false), villainAction: 'Check', potLabel: pick(LOW_POTS),
    }
  },

  // ── T09: Board conectado baixo com flush draw — equilibrado ──────
  () => {
    const ranks = pick(CONNECTED_LO)
    const board = makeFlushDrawBoard(ranks)
    const [raiser, caller] = randRaiserCaller(['SB','BTN'], ['BTN','BB'])
    return {
      q: `Flop ${ranks[0]}-${ranks[1]}-${ranks[2]} com flush draw. ${raiser} (3-bettor) vs ${caller} (caller). Quem tem nut advantage?`,
      a: 'Equilibrado (ambos tem sets, straights e flush draws nessa textura)',
      b: `${raiser} tem nut advantage claro`,
      aCorrect: true,
      explanation: 'Em boards muito conectados com flush draw, ambos os ranges se conectam bem. O 3-bettor tem overpairs fortes, o caller tem mais suited connectors. Nut advantage e equilibrado — sizing médio e correto.',
      boardCards: board, heroPos: raiser, villainPos: caller,
      heroCards: makeHeroCards('Q','Q',false), villainAction: 'Call', potLabel: pick(THREBET_POTS),
    }
  },

  // ── T10: Ambos advantages — mix de sizing ───────────────────────
  () => {
    const ranks = pick([['J','7','2'],['K','6','2'],['A','5','2'],['Q','8','3']])
    const board = makeRainbowBoard(ranks)
    const [raiser, caller] = randRaiserCaller([...MP_POSITIONS, 'BTN'], ['BB'])
    return {
      q: `Flop ${ranks[0]}-${ranks[1]}-${ranks[2]}. ${raiser} (raiser) tem range advantage E nut advantage. Qual a estratégia?`,
      a: 'C-bet com frequência ALTA e sizing variado (mix de pequeno e grande)',
      b: 'Sempre check pra induzir bluff',
      aCorrect: true,
      explanation: 'Quando você domina em ambos, c-bet com alta frequência. Use sizing pequeno com range advantage (maos medianas) e sizing grande com nut advantage (monstros + bluffs polarizados). Mix confunde o vilão.',
      boardCards: board, heroPos: raiser, villainPos: caller,
      heroCards: makeHeroCards('K','K',false), villainAction: 'Check', potLabel: pick(LOW_POTS),
    }
  },

  // ── T11: Board dinamico — nut advantage dita sizing ─────────────
  () => {
    const fs = randSuit()
    const ranks = pick([['K','Q','J'],['Q','J','T'],['A','T','9']])
    const board = [ranks[0]+fs, ranks[1]+fs, ranks[2]+randSuitExcluding(fs)]
    const [raiser, caller] = randRaiserCaller([...MP_POSITIONS, 'BTN'], ['BB','SB'])
    return {
      q: `Board ${ranks[0]}-${ranks[1]}-${ranks[2]} com flush draw. IP raiser vs OOP caller. O que dita o sizing?`,
      a: 'Nut advantage dita o sizing (quem tem os nuts betta grande pra proteger e valorar)',
      b: 'Range advantage dita o sizing',
      aCorrect: true,
      explanation: 'Em boards dinamicos com draws, o nut advantage importa mais pro sizing. Quem tem mais nuts pode bet grande pra proteger a mão e extrair valor contra draws antes que o turn chegue.',
      boardCards: board, heroPos: raiser, villainPos: caller,
      heroCards: makeHeroCards('A','T',false), villainAction: 'Check', potLabel: pick(LOW_POTS),
    }
  },

  // ── T12: Board pareado baixo — range advantage do raiser ────────
  () => {
    const board = makePairedLowBoard()
    const highCard = board[0][0]
    const [raiser, caller] = randRaiserCaller([...MP_POSITIONS, 'BTN'], ['BB'])
    return {
      q: `Flop ${board[0][0]}-${board[1][0]}-${board[2][0]} (board pareado baixo). ${raiser} raiser vs ${caller}. Qual a estratégia?`,
      a: `Board seco e pareado — ${raiser} tem range advantage, c-bet pequeno e frequente`,
      b: `${caller} tem vantagem por ter mais pares pequenos`,
      aCorrect: true,
      explanation: `Board muito seco e pareado. ${raiser} tem range advantage com overpairs (77-AA) e ${highCard}x. ${caller} tem poucos pares do board. ${raiser} deve c-bet frequente com sizing mínimo (25-33%).`,
      boardCards: board, heroPos: raiser, villainPos: caller,
      heroCards: makeHeroCards('T','T',false), villainAction: 'Check', potLabel: pick(LOW_POTS),
    }
  },

  // ── T13: Board monotone conectado — check-back predomina ─────────
  () => {
    const ranks = pick([['T','9','8'],['J','T','9'],['9','8','7'],['8','7','6']])
    const board = makeMonotoneBoard(ranks)
    const [raiser, caller] = randRaiserCaller([...LP_POSITIONS], ['BB','SB'])
    return {
      q: `Flop ${ranks[0]}-${ranks[1]}-${ranks[2]} monotone (3 do mesmo naipe). ${raiser} vs ${caller}. Qual a abordagem correta?`,
      a: 'Check-back mais frequente (board perigoso, nut advantage diluido)',
      b: 'C-bet grande sempre para proteger',
      aCorrect: true,
      explanation: 'Board monotone conectado = muito perigoso. Ninguem tem nut advantage claro — flushes, straights e draws estao distribuidos. Check-back mais pra proteger o range e não inflar pote em posição ruim.',
      boardCards: board, heroPos: raiser, villainPos: caller,
      heroCards: makeHeroCards('A','Q',false), villainAction: 'Check', potLabel: pick(LOW_POTS),
    }
  },

  // ── T14: Por que sizing pequeno em A-K-x? ────────────────────────
  () => {
    const low = pick(['2','3','4','5','6','7'])
    const ranks = ['A','K', low]
    const board = makeRainbowBoard(ranks)
    const [raiser, caller] = randRaiserCaller([...LP_POSITIONS], ['BB'])
    return {
      q: `Flop ${ranks[0]}-${ranks[1]}-${ranks[2]} rainbow. ${raiser} e o raiser IP. Por que o sizing PEQUENO e o melhor?`,
      a: 'Range advantage enorme — não precisa de sizing grande pra gerar lucro',
      b: 'Para dar odds ao vilão e fazê-lo chamar mais',
      aCorrect: true,
      explanation: `${raiser} tem range advantage massivo (todos Ax, Kx, AK). Sizing pequeno (25-33%) funciona porque: 1) lucra contra range fraco, 2) não precisa de fold equity alta, 3) permite bet com mais mãos do range.`,
      boardCards: board, heroPos: raiser, villainPos: caller,
      heroCards: makeHeroCards('K','J',false), villainAction: 'Check', potLabel: pick(LOW_POTS),
    }
  },

  // ── T15: 3-bet pot — range advantage do 3-betttor em board alto ──
  () => {
    const ranks = pick(HIGH_RANKS)
    const board = makeRainbowBoard(ranks)
    const [raiser, caller] = randRaiserCaller(['SB','BB'], ['BTN','CO','HJ'])
    return {
      q: `Pote 3-bet. ${raiser} (3-bettor) vs ${caller} (caller). Flop ${ranks[0]}-${ranks[1]}-${ranks[2]}. Quem tem range advantage?`,
      a: `${raiser} (range de 3-bet e mais forte: AA, KK, AK, AQs dominam o board)`,
      b: caller,
      aCorrect: true,
      explanation: `Em pote 3-bet, o 3-betttor tem range condensado e forte. No board ${ranks[0]}-${ranks[1]}-${ranks[2]}, ${raiser} tem muito mais Ax e Kx premium. Range advantage e nut advantage sao do 3-betttor.`,
      boardCards: board, heroPos: raiser, villainPos: caller,
      heroCards: makeHeroCards('A','A',false), villainAction: 'Check', potLabel: pick(THREBET_POTS),
    }
  },

  // ── T16: Caller tem range advantage em board médio-baixo ─────────
  () => {
    const ranks = pick(MID_BOARDS)
    const board = makeRainbowBoard(ranks)
    const [raiser, caller] = randRaiserCaller([...LP_POSITIONS], ['BB'])
    return {
      q: `Flop ${ranks[0]}-${ranks[1]}-${ranks[2]}. ${raiser} (raiser) vs BB (caller). Qual das opções e verdadeira?`,
      a: 'BB tem vantagem de range nesse board médio-baixo por defender com suited connectors e pares médios',
      b: `${raiser} tem range advantage claro com broadways`,
      aCorrect: true,
      explanation: `Em boards médios (${ranks[0]}-${ranks[1]}-${ranks[2]}), BB defende com muitas mãos conectadas medias que o raiser não tem: 9-8s, 8-7s, T-9s, pares médios. BB tem range advantage moderada aqui.`,
      boardCards: board, heroPos: raiser, villainPos: caller,
      heroCards: makeHeroCards('A','Q',false), villainAction: 'Check', potLabel: pick(LOW_POTS),
    }
  },

  // ── T17: Flush draw board — quem tem mais nuts ───────────────────
  () => {
    const fs = randSuit()
    const ranks = pick([['A','8','4'],['K','T','5'],['Q','9','3'],['J','7','2']])
    const board = [ranks[0]+fs, ranks[1]+fs, ranks[2]+randSuitExcluding(fs)]
    const [raiser, caller] = randRaiserCaller([...MP_POSITIONS, 'BTN'], ['BB'])
    return {
      q: `Flop ${ranks[0]}-${ranks[1]}-${ranks[2]} com flush draw. ${raiser} vs ${caller}. Quem tem nut flush advantage?`,
      a: `${raiser} (Axs do naipe do flush esta mais no range de open do que no range de call do BB)`,
      b: `${caller} (BB defende com todos os suited)`,
      aCorrect: true,
      explanation: `${raiser} tem mais combos de Axs e Kxs suited no seu range de abertura. BB defende mais suited connectors e suited gappers, mas o NUT flush draw (Axs) esta mais concentrado no raiser.`,
      boardCards: board, heroPos: raiser, villainPos: caller,
      heroCards: makeHeroCards('A','5',true), villainAction: 'Check', potLabel: pick(LOW_POTS),
    }
  },

  // ── T18: SB vs BB — quem tem range advantage ─────────────────────
  () => {
    const ranks = pick([...HIGH_RANKS, ...MID_HIGH])
    const board = makeRainbowBoard(ranks)
    const potLabel = pick(LOW_POTS)
    return {
      q: `Pote SB vs BB (limpou). Flop ${ranks[0]}-${ranks[1]}-${ranks[2]}. SB c-betta. Quem tem range advantage?`,
      a: `SB (range de complete/limp tem mais ${ranks[0]}x e mãos fortes que BB defende em blind)`,
      b: 'BB (defende wide)',
      aCorrect: true,
      explanation: 'SB que completa ou abre pequeno ainda tem range relativamente forte contra BB. Em boards altos, SB tem mais mãos que conectam. Mas a vantagem e menor que IP vs BB — SB deve usar sizing médio.',
      boardCards: board, heroPos: 'SB', villainPos: 'BB',
      heroCards: makeHeroCards(ranks[0], pick(['J','T','9']), false), villainAction: 'Check', potLabel,
    }
  },

  // ── T19: Quando raiser NAO tem vantagem (board baixo conectado) ──
  () => {
    const ranks = pick(CONNECTED_LO)
    const board = makeRainbowBoard(ranks)
    const [raiser, caller] = randRaiserCaller([...EP_POSITIONS, ...MP_POSITIONS], ['BB'])
    return {
      q: `Flop ${ranks[0]}-${ranks[1]}-${ranks[2]} rainbow. ${raiser} (raiser) vs BB. O que ${raiser} deve fazer nesse board?`,
      a: `C-bet com frequência BAIXA (menos de 40%) e preferir check pra proteger range`,
      b: 'C-bet 100% do range — sempre tem fold equity',
      aCorrect: true,
      explanation: `BB tem range advantage em boards baixos conectados. ${raiser} deve desacelerar: c-bet seletivo com mãos fortes (overpairs altos) e check com range fraco. Evitar ser check-raised fora do pote.`,
      boardCards: board, heroPos: raiser, villainPos: caller,
      heroCards: makeHeroCards('A','K',false), villainAction: 'Check', potLabel: pick(LOW_POTS),
    }
  },

  // ── T20: Sizing em board monotone A-high ─────────────────────────
  () => {
    const ranks = pick([['A','7','3'],['A','9','5'],['K','8','4'],['A','6','2']])
    const board = makeMonotoneBoard(ranks)
    const [raiser, caller] = randRaiserCaller([...LP_POSITIONS], ['BB'])
    return {
      q: `Flop ${ranks[0]}-${ranks[1]}-${ranks[2]} monotone. ${raiser} tem range advantage mas board e perigoso. Qual o sizing ideal?`,
      a: 'Sizing PEQUENO (25-33%) pra manter potencia sem inflar o pote',
      b: 'Sizing grande (75%+) pra proteger contra flushes',
      aCorrect: true,
      explanation: 'Em board monotone, mesmo com range advantage, o sizing deve ser pequeno. Bet grande pode ser perigoso pois o BB pode ter o flush completo ou flush draw poderoso. Sizing pequeno extrai valor sem inflar o pote em situações ruins.',
      boardCards: board, heroPos: raiser, villainPos: caller,
      heroCards: makeHeroCards(ranks[0], pick(['Q','J','T']), false), villainAction: 'Check', potLabel: pick(LOW_POTS),
    }
  },

  // ── T21: 3-bet pot board baixo — caller tem nut advantage ────────
  () => {
    const ranks = pick(CONNECTED_LO)
    const board = makeFlushDrawBoard(ranks)
    const [caller3, raiser3] = randRaiserCaller(['BTN','CO'], ['SB','BB'])
    return {
      q: `Pote 3-bet. ${raiser3} (3-bettor OOP) vs ${caller3} (caller IP). Flop ${ranks[0]}-${ranks[1]}-${ranks[2]}. Quem tem nut advantage?`,
      a: `${caller3} (range de call inclui mais suited connectors, sets baixos e straights)`,
      b: `${raiser3} (range de 3-bet e mais forte)`,
      aCorrect: true,
      explanation: `Surpresa: em boards conectados baixos em pote 3-bet, o CALLER IP frequentemente tem nut advantage. ${caller3} tem muitos suited connectors, pares pequenos (sets) que o 3-betttor descartou do range de 3-bet.`,
      boardCards: board, heroPos: raiser3, villainPos: caller3,
      heroCards: makeHeroCards('A','A',false), villainAction: 'Call', potLabel: pick(THREBET_POTS),
    }
  },

  // ── T22: Board A-A-x pareado — estratégia do raiser ─────────────
  () => {
    const s1 = randSuit(); const s2 = randSuitExcluding(s1)
    const kick = pick(['K','Q','J','T','9','8','7'])
    const board = ['A'+s1, 'A'+s2, kick+randSuit()]
    const [raiser, caller] = randRaiserCaller([...LP_POSITIONS], ['BB'])
    return {
      q: `Flop A-A-${kick}. ${raiser} (raiser) vs ${caller}. Qual a estratégia de c-bet?`,
      a: 'C-bet PEQUENO com alta frequência (raiser tem mais Ax, board favorece)',
      b: 'Check sempre — board muito perigoso para c-bet',
      aCorrect: true,
      explanation: `Board A-A-${kick}: ${raiser} tem muito mais Ax no range (AK, AQ, AJ, ATs). Deve c-bet pequeno e frequente para valorar e manter range advantage. Checking cede a iniciativa desnecessariamente.`,
      boardCards: board, heroPos: raiser, villainPos: caller,
      heroCards: makeHeroCards('K',kick,false), villainAction: 'Check', potLabel: pick(LOW_POTS),
    }
  },

  // ── T23: Mid board seco — c-bet frequency drop ───────────────────
  () => {
    const ranks = pick([['T','6','2'],['J','5','2'],['9','4','2'],['8','5','2']])
    const board = makeRainbowBoard(ranks)
    const [raiser, caller] = randRaiserCaller([...EP_POSITIONS], ['BTN','CO','HJ'])
    return {
      q: `Flop ${ranks[0]}-${ranks[1]}-${ranks[2]} seco. ${raiser} (EP raiser) vs ${caller}. Qual a frequência de c-bet ideal?`,
      a: `Alta frequência (65%+) com sizing pequeno — ${raiser} tem range advantage com overpairs`,
      b: 'Baixa frequência — board favorece o caller',
      aCorrect: true,
      explanation: `${raiser} de EP tem range muito forte: AA, KK, QQ, JJ, TT — todos overpairs nesse board. Tem range advantage clara. C-bet pequeno e frequente e o padrão do solver aqui.`,
      boardCards: board, heroPos: raiser, villainPos: caller,
      heroCards: makeHeroCards('Q','Q',false), villainAction: 'Check', potLabel: pick(LOW_POTS),
    }
  },

  // ── T24: Board K-high seco vs BB — range advantage + sizing ──────
  () => {
    const low1 = pick(['6','5','4','3','2'])
    const low2 = pick(['8','7','6','5','4','3'].filter(r => r !== low1))
    const ranks = ['K', low2, low1]
    const board = makeRainbowBoard(ranks)
    const [raiser, caller] = randRaiserCaller([...LP_POSITIONS], ['BB'])
    return {
      q: `Flop ${ranks[0]}-${ranks[1]}-${ranks[2]} rainbow. ${raiser} vs BB. Qual sizing maximiza EV?`,
      a: `Sizing pequeno (25-33%) — ${raiser} tem range advantage mas board e parcialmente bom pra BB`,
      b: 'Sizing grande (75%) — K-high sempre favorece o raiser',
      aCorrect: true,
      explanation: `Board K-low-low: ${raiser} tem range advantage (Kx, overpairs), mas BB tem pares pequenos/draws. Sizing pequeno funciona melhor: extrai valor sem inflar pote onde BB tem equity.`,
      boardCards: board, heroPos: raiser, villainPos: caller,
      heroCards: makeHeroCards('K','Q',false), villainAction: 'Check', potLabel: pick(LOW_POTS),
    }
  },

  // ── T25: Conceito consolidado — board que não favorece ninguem ───
  () => {
    const fs = randSuit()
    const ranks = pick([['9','7','5'],['8','6','4'],['T','8','6'],['9','6','4']])
    const board = [ranks[0]+fs, ranks[1]+randSuitExcluding(fs), ranks[2]+randSuit()]
    const [raiser, caller] = randRaiserCaller([...MP_POSITIONS, 'BTN'], ['BB'])
    return {
      q: `Flop ${ranks[0]}-${ranks[1]}-${ranks[2]} com flush draw. ${raiser} vs BB. Ninguem tem vantagem clara. O que fazer?`,
      a: 'Frequencia BAIXA de c-bet, preferir check — evitar situações desfavoravelmente polarizadas',
      b: 'C-bet 100% com sizing grande — sempre tem fold equity',
      aCorrect: true,
      explanation: 'Quando ninguem tem range advantage nem nut advantage claro, o solver tende a check-back com alta frequência. Apostas criam riscos sem beneficios estruturais: o vilão tem muitas mãos que chamam ou raises.',
      boardCards: board, heroPos: raiser, villainPos: caller,
      heroCards: makeHeroCards('A','Q',false), villainAction: 'Check', potLabel: pick(LOW_POTS),
    }
  },
]

function generateScenario() {
  const chosen = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)]
  const t = typeof chosen === 'function' ? chosen() : chosen
  const swap = Math.random() > 0.5
  const opts = swap
    ? [{ id: 'a', label: t.b, correct: !t.aCorrect }, { id: 'b', label: t.a, correct: t.aCorrect }]
    : [{ id: 'a', label: t.a, correct: t.aCorrect }, { id: 'b', label: t.b, correct: !t.aCorrect }]
  return { question: t.q, options: opts, explanation: t.explanation, heroCards: t.heroCards, boardCards: t.boardCards, heroPos: t.heroPos, villainPos: t.villainPos, villainAction: t.villainAction, potLabel: t.potLabel }
}

// AULA
function Lesson({ onComplete }) {
  const [section, setSection] = useState(0)

  const sections = [
    {
      title: 'O que e Range Advantage?',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            <strong style={{ color: '#4fce82' }}>Range Advantage</strong> significa que seu range tem
            MAIS mãos boas no geral naquele board. Não e sobre ter a melhor mão — e sobre ter mais maos
            que conectam com o flop.
          </p>
          <div className="rounded-lg p-4 mb-4" style={{ background: '#222225' }}>
            <div style={{ color: '#fdfdfd', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Exemplo:</div>
            <div style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 1.8 }}>
              Flop <strong style={{ color: '#fdfdfd' }}>A-K-5</strong> rainbow.<br/>
              BTN (raiser): range cheio de Ax, Kx, AK, AA, KK = <strong style={{ color: '#4fce82' }}>range advantage</strong><br/>
              BB (caller): range mais amplo mas menos conectado com board alto
            </div>
          </div>
          <div className="rounded-lg p-4" style={{ background: 'rgba(79,206,130,0.08)', border: '1px solid rgba(79,206,130,0.2)' }}>
            <div style={{ color: '#4fce82', fontSize: 13, fontWeight: 600 }}>
              Range advantage = C-bet FREQUENTE com sizing PEQUENO (25-33%)
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'O que e Nut Advantage?',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            <strong style={{ color: '#e5484d' }}>Nut Advantage</strong> e diferente: quem tem mais
            mãos MONSTRO (sets, straights, flushes, full houses). Não importa quantas mãos boas
            você tem no geral — importa quem tem mais nuts.
          </p>
          <div className="rounded-lg p-4 mb-4" style={{ background: '#222225' }}>
            <div style={{ color: '#fdfdfd', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Exemplo:</div>
            <div style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 1.8 }}>
              Flop <strong style={{ color: '#fdfdfd' }}>Q-J-T</strong> conectado.<br/>
              CO (raiser): tem AK (nuts), KK, QQ, JJ, TT = <strong style={{ color: '#e5484d' }}>nut advantage</strong><br/>
              BB: tem menos combos premium nessa textura
            </div>
          </div>
          <div className="rounded-lg p-4" style={{ background: 'rgba(229,72,77,0.08)', border: '1px solid rgba(229,72,77,0.2)' }}>
            <div style={{ color: '#e5484d', fontSize: 13, fontWeight: 600 }}>
              Nut advantage = Bet MENOS frequente com sizing GRANDE (66-100%)
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Como Solvers Decidem',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            Isso e LITERALMENTE como solvers GTO decidem frequência e sizing de bet. A lógica:
          </p>
          <div className="rounded-lg overflow-hidden mb-4" style={{ border: '1px solid #2a2a2e' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#222225' }}>
                  <th style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>Situacao</th>
                  <th style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>Frequencia</th>
                  <th style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>Sizing</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderTop: '1px solid #2a2a2e' }}>
                  <td style={{ color: '#4fce82', fontSize: 13, padding: '8px 12px' }}>Range Adv</td>
                  <td style={{ color: '#fdfdfd', fontSize: 12, padding: '8px 12px' }}>Alta (70%+)</td>
                  <td style={{ color: '#fdfdfd', fontSize: 12, padding: '8px 12px' }}>Pequeno (25-33%)</td>
                </tr>
                <tr style={{ borderTop: '1px solid #2a2a2e' }}>
                  <td style={{ color: '#e5484d', fontSize: 13, padding: '8px 12px' }}>Nut Adv</td>
                  <td style={{ color: '#fdfdfd', fontSize: 12, padding: '8px 12px' }}>Baixa (30-50%)</td>
                  <td style={{ color: '#fdfdfd', fontSize: 12, padding: '8px 12px' }}>Grande (66-100%)</td>
                </tr>
                <tr style={{ borderTop: '1px solid #2a2a2e' }}>
                  <td style={{ color: '#f5a623', fontSize: 13, padding: '8px 12px' }}>Ambos</td>
                  <td style={{ color: '#fdfdfd', fontSize: 12, padding: '8px 12px' }}>Alta</td>
                  <td style={{ color: '#fdfdfd', fontSize: 12, padding: '8px 12px' }}>Mix (peq + grande)</td>
                </tr>
                <tr style={{ borderTop: '1px solid #2a2a2e' }}>
                  <td style={{ color: '#676671', fontSize: 13, padding: '8px 12px' }}>Nenhum</td>
                  <td style={{ color: '#fdfdfd', fontSize: 12, padding: '8px 12px' }}>Baixa</td>
                  <td style={{ color: '#fdfdfd', fontSize: 12, padding: '8px 12px' }}>Check mais</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8 }}>
            Se você entender so isso, ja joga melhor que 90% dos jogadores de poker.
            A maioria aposta baseado na propria mão — você aposta baseado no RANGE.
          </p>
        </div>
      ),
    },
    {
      title: 'Boards que Favorecem Quem',
      content: (
        <div>
          <div className="space-y-3 mb-4">
            {[
              { board: 'A-K-x', who: 'Raiser IP', why: 'Mais Ax, Kx, AK', color: '#4fce82' },
              { board: '7-6-3', who: 'BB / Caller', why: 'Mais suited connectors baixos, sets', color: '#0a84d7' },
              { board: 'Q-J-T', who: 'Raiser (nuts)', why: 'Mais AK, KK, QQ, JJ, TT', color: '#e5484d' },
              { board: '2-2-7', who: 'Raiser (range)', why: 'Overpairs dominam, board seco', color: '#4fce82' },
              { board: 'T-9-8 mono', who: 'Equilibrado', why: 'Ambos ranges se conectam', color: '#f5a623' },
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ background: '#222225' }}>
                <div style={{ color: '#fdfdfd', fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono', minWidth: 70 }}>{b.board}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: b.color, fontSize: 12, fontWeight: 600 }}>{b.who}</div>
                  <div style={{ color: '#676671', fontSize: 11 }}>{b.why}</div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={onComplete}
            style={{
              width: '100%', padding: '14px', borderRadius: 8, marginTop: 8,
              background: '#4fce82', border: 'none', color: '#0f0f0f',
              fontWeight: 600, fontSize: 15, cursor: 'pointer',
            }}>
            Comecar a treinar
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-16" style={{ background: '#0f0f0f' }}>
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="rounded-2xl p-6" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
          <h1 style={{ color: '#fdfdfd', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
            Modulo 23 - Range vs Nut Advantage
          </h1>
          <p style={{ color: '#676671', fontSize: 13, marginBottom: 20 }}>
            Como solvers decidem frequência e sizing de aposta
          </p>

          <div className="flex gap-1 mb-6 overflow-x-auto">
            {sections.map((s, i) => (
              <button key={i} onClick={() => setSection(i)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
                style={{
                  background: section === i ? 'rgba(79,206,130,0.12)' : 'transparent',
                  color: section === i ? '#4fce82' : '#676671',
                  border: `1px solid ${section === i ? '#4fce82' : 'transparent'}`,
                }}>
                {s.title}
              </button>
            ))}
          </div>

          <h2 style={{ color: '#fdfdfd', fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
            {sections[section].title}
          </h2>
          {sections[section].content}

          {section < sections.length - 1 && (
            <button onClick={() => setSection(section + 1)}
              style={{
                width: '100%', padding: '12px', borderRadius: 8, marginTop: 16,
                background: '#2a2a2e', border: 'none', color: '#fdfdfd',
                fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}>
              Proximo &rsaquo;
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// TRAINER
function Trainer() {
  const { recordAnswer, recordSession, getModuleProgress } = useProgress()
  const progress = getModuleProgress(23)

  const [scenario, setScenario] = useState(() => generateScenario())
  const [result, setResult] = useState(null)
  const [handNum, setHandNum] = useState(0)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [streak, setStreak] = useState(0)
  const [showReview, setShowReview] = useState(false)

  const handleAnswer = useCallback((optionId) => {
    if (result) return
    const chosen = scenario.options.find(o => o.id === optionId)
    const isCorrect = chosen?.correct || false
    const newStreak = isCorrect ? streak + 1 : 0
    setStreak(newStreak)
    if (isCorrect) setSessionCorrect(s => s + 1)
    recordAnswer(23, isCorrect, newStreak, { tp: 'rna' })
    setResult({ isCorrect, explanation: scenario.explanation, chosenId: optionId })
  }, [result, scenario, streak, recordAnswer])

  const handleNext = useCallback(() => {
    const nextHand = handNum + 1
    if (nextHand >= 10) {
      const accuracy = Math.round((sessionCorrect / 10) * 100)
      recordSession(23, accuracy)
      setShowReview(true)
    } else {
      setHandNum(nextHand)
    }
    setResult(null)
    setScenario(generateScenario())
  }, [handNum, sessionCorrect, recordSession])

  const acc = progress.totalAnswered > 0 ? progress.accuracy : 0

  if (showReview) {
    return <SessionReview moduleId={23} sessionCorrect={sessionCorrect} sessionTotal={10} onContinue={() => { setHandNum(0); setSessionCorrect(0); setShowReview(false); setStreak(0) }} />
  }

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-16" style={{ background: '#0f0f0f' }}>
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { label: 'Sessao', value: `${handNum}/10`, color: '#e5484d' },
            { label: 'Acerto', value: acc > 0 ? `${acc}%` : '--', color: acc >= 90 ? '#4fce82' : acc >= 60 ? '#f5a623' : '#e5484d' },
            { label: 'Sequencia', value: streak, color: '#f5a623' },
          ].map(s => (
            <div key={s.label} className="rounded-xl py-3 text-center" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
              <div style={{ color: s.color, fontSize: 22, fontWeight: 700, fontFamily: 'JetBrains Mono', lineHeight: 1 }}>{s.value}</div>
              <div style={{ color: '#676671', fontSize: 11, marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl p-5 mb-4" style={{
          background: '#1a1a1d',
          border: `1px solid ${result ? (result.isCorrect ? '#4fce8255' : '#e5484d55') : '#2a2a2e'}`,
        }}>
          <div style={{ color: '#676671', fontSize: 11, fontWeight: 600, marginBottom: 12 }}>
            RANGE vs NUT ADVANTAGE - {handNum + 1}/10
          </div>

          {scenario.heroCards && scenario.heroCards.length > 0 && (
            <ModulePokerTable
              heroPos={scenario.heroPos || 'BTN'}
              villainPos={scenario.villainPos || 'BB'}
              heroCards={scenario.heroCards}
              boardCards={scenario.boardCards || []}
              villainAction={scenario.villainAction || ''}
              potLabel={scenario.potLabel || ''}
              contextTitle="Range vs Nut Advantage"
              contextDesc=""
            />
          )}

          <p style={{ color: '#fdfdfd', fontSize: 15, lineHeight: 1.7, marginBottom: 20 }}>
            {scenario.question}
          </p>

          {result && (
            <div className="rounded-lg px-4 py-3 mb-4" style={{
              background: result.isCorrect ? 'rgba(79,206,130,0.1)' : 'rgba(229,72,77,0.1)',
              border: `1px solid ${result.isCorrect ? 'rgba(79,206,130,0.25)' : 'rgba(229,72,77,0.25)'}`,
            }}>
              <div style={{ color: result.isCorrect ? '#4fce82' : '#e5484d', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
                {result.isCorrect ? 'Correto!' : 'Errou'}
              </div>
              <div style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 1.6 }}>
                {result.explanation}
              </div>
              {!result.isCorrect && <DecisionTree scenario={{ ...scenario, moduleId: 23 }} result={result} />}
            </div>
          )}

          {!result ? (
            <div className="flex flex-col gap-3">
              {scenario.options.map(o => (
                <button key={o.id} onClick={() => handleAnswer(o.id)}
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: 8,
                    background: '#222225', border: '1px solid #2a2a2e',
                    color: '#fdfdfd', fontSize: 14, fontWeight: 500,
                    cursor: 'pointer', textAlign: 'left', lineHeight: 1.4,
                  }}>
                  {o.label}
                </button>
              ))}
            </div>
          ) : (
            <button onClick={handleNext}
              style={{
                width: '100%', padding: '14px', borderRadius: 8,
                background: '#4fce82', border: 'none',
                color: '#0f0f0f', fontWeight: 600, fontSize: 15, cursor: 'pointer',
              }}>
              {handNum >= 9 ? 'Finalizar Sessao' : 'Proximo >'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Module23() {
  const { progress, markLessonRead } = useProgress()
  const mod = progress.modules[23]
  const [view, setView] = useState(mod?.lessonRead ? 'trainer' : 'lesson')

  if (!mod?.unlocked) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f0f' }}>
      <div className="text-center"><div style={{ fontSize: 60 }}>🔒</div><h2 style={{ color: 'white', marginTop: 16 }}>Modulo Bloqueado</h2><p style={{ color: '#888', marginTop: 8 }}>Complete o módulo anterior para desbloquear.</p></div>
    </div>
  )
  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0f0f0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setView('lesson')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'lesson' ? '#e5484d' : '#1a1a1d', color: view === 'lesson' ? 'white' : '#888', border: '1px solid #2a2a2e' }}>Aula</button>
          <button onClick={() => mod?.lessonRead && setView('trainer')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'trainer' ? '#e5484d' : '#1a1a1d', color: view === 'trainer' ? 'white' : (mod?.lessonRead ? '#888' : '#444'), border: '1px solid #2a2a2e', cursor: mod?.lessonRead ? 'pointer' : 'not-allowed' }}>Trainer {!mod?.lessonRead && '🔒'}</button>
        </div>
        {view === 'lesson' ? <Lesson onComplete={() => { markLessonRead(23); setView('trainer') }} /> : <Trainer />}
      </div>
    </div>
  )
}
