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
// MODULO 24 — Polarizacao vs Merge
// ================================================================

// ── Pool de dados para parametrização ──────────────────────────────────────
const DRY_FLOPS = [
  ['K','7','2'], ['A','8','3'], ['Q','6','2'], ['J','7','2'], ['T','6','2'],
  ['K','8','3'], ['A','9','4'], ['Q','7','3'], ['J','6','2'], ['T','5','2'],
  ['K','9','4'], ['A','7','2'], ['Q','8','3'], ['9','5','2'], ['8','4','2'],
]
const WET_FLOPS_CONNECTED = [
  ['J','T','8'], ['T','9','7'], ['9','8','6'], ['8','7','5'], ['J','9','7'],
  ['Q','J','9'], ['T','8','6'], ['K','Q','J'], ['7','6','4'], ['6','5','3'],
]
const PAIRED_FLOPS = [
  ['A','A','5'], ['K','K','3'], ['Q','Q','7'], ['J','J','4'], ['T','T','6'],
  ['A','A','8'], ['K','K','9'], ['9','9','2'], ['8','8','3'], ['7','7','2'],
]
const DRY_TURNS = [
  ['A','K','8','4'], ['Q','9','3','2'], ['J','7','2','K'], ['T','6','2','A'],
  ['K','8','3','7'], ['A','9','4','2'], ['Q','7','3','8'], ['J','5','2','9'],
]
const DRY_RIVERS = [
  ['A','K','8','4','2'], ['Q','9','3','2','7'], ['J','7','2','K','5'],
  ['T','6','2','A','3'], ['K','8','3','7','4'], ['A','9','4','2','8'],
  ['Q','7','3','8','2'], ['J','5','2','9','6'], ['A','J','5','3','8'],
]
const IP_POSITIONS = [
  { hero: 'BTN', villain: 'BB' }, { hero: 'CO', villain: 'BB' },
  { hero: 'BTN', villain: 'SB' }, { hero: 'CO', villain: 'SB' },
  { hero: 'HJ', villain: 'BB' },
]
const OOP_POSITIONS = [
  { hero: 'BB', villain: 'BTN' }, { hero: 'SB', villain: 'BTN' },
  { hero: 'BB', villain: 'CO' }, { hero: 'SB', villain: 'CO' },
  { hero: 'BB', villain: 'HJ' },
]
const MEDIUM_PAIRS = [
  ['T','T'], ['9','9'], ['8','8'], ['7','7'], ['6','6'],
]
const OVERPAIRS = [
  ['A','A'], ['K','K'], ['Q','Q'], ['J','J'],
]
const TOP_PAIRS = [
  ['A','K'], ['A','Q'], ['A','J'], ['K','Q'], ['Q','J'],
]
const BLUFF_HANDS = [
  ['A','5'], ['A','4'], ['A','3'], ['K','J'], ['Q','T'],
]
const POT_LABELS_SRP = ['6.5bb','7bb','7.5bb','8bb']
const POT_LABELS_3BET = ['13bb','14bb','15bb','16bb','17bb']
const POT_LABELS_RIVER = ['12bb','14bb','16bb','18bb','20bb']

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function pickPos(arr) { const p = pick(arr); return { heroPos: p.hero, villainPos: p.villain } }
function makeBoardRainbow(ranks) { return makeRainbowBoard(ranks) }
function makeBoardMonotone(ranks) { const s = randSuit(); return ranks.map(r => r + s) }
function makeBoardFlushy(ranks) {
  const s = randSuit()
  return ranks.map((r, i) => i < 2 ? r + s : r + randSuitExcluding(s))
}
function makeBoardConnectedWet(ranks) {
  // first two cards share suit (flush draw), third differs
  const s = randSuit()
  return [ranks[0]+s, ranks[1]+s, ranks[2]+randSuitExcluding(s)]
}

// ── 20 TEMPLATES ───────────────────────────────────────────────────────────
const SCENARIOS = [
  // 1. River IP — polarizar em board seco longo
  () => {
    const ranks = pick(DRY_RIVERS)
    const pos = pickPos(IP_POSITIONS)
    const heroHand = makeHeroCards(...pick(TOP_PAIRS), false)
    return {
      q: `River em board ${ranks.join('-')} rainbow. Voce e ${pos.heroPos} (IP) e quer apostar. Qual tipo de range usar?`,
      a: 'Polarizado (apostar com nuts e bluffs, check o meio)',
      b: 'Merged (apostar com tudo que e razoavel)',
      aCorrect: true,
      explanation: `No river IP, range polarizado e ideal: aposta com maos monstro (dois pares+, sets) e bluffs puros (draws que nao fecharam). Checa maos medianas — elas tem showdown value e nao precisam de fold equity. Sizing: 66-100%+.`,
      boardCards: makeBoardRainbow(ranks), heroCards: heroHand,
      heroPos: pos.heroPos, villainPos: pos.villainPos, villainAction: 'Check', potLabel: pick(POT_LABELS_RIVER),
    }
  },

  // 2. Flop OOP seco — mergear
  () => {
    const ranks = pick(DRY_FLOPS)
    const pos = pickPos(OOP_POSITIONS)
    const heroHand = makeHeroCards(...pick(OVERPAIRS), false)
    return {
      q: `Flop ${ranks.join('-')} rainbow. Voce e ${pos.heroPos} (OOP) e o raiser. Qual tipo de range usar para c-bet?`,
      a: 'Merged (apostar com overpairs, top pairs, middle pairs)',
      b: 'Polarizado (so nuts e bluffs)',
      aCorrect: true,
      explanation: `OOP voce precisa proteger seu range de check. Em boards secos, merge e melhor: aposta frequente com sizing pequeno (33-50%) cobrindo overpairs ate middle pairs. Polarizar OOP deixa o range de check vulneravel ao vilao IP.`,
      boardCards: makeBoardRainbow(ranks), heroCards: heroHand,
      heroPos: pos.heroPos, villainPos: pos.villainPos, villainAction: 'Call', potLabel: pick(POT_LABELS_SRP),
    }
  },

  // 3. Conceito: definicao de polarizado vs merged
  () => {
    const ranks = pick(DRY_FLOPS)
    const pos = pickPos(IP_POSITIONS)
    return {
      q: 'Qual a diferenca principal entre range polarizado e merged?',
      a: 'Polarizado: nuts + bluffs puros (nada no meio). Merged: tudo que e bom, do melhor ate maos medianas.',
      b: 'Polarizado: so maos fortes. Merged: so maos medianas.',
      aCorrect: true,
      explanation: `Polarizado = "bimodal" — aposta com o melhor OU o pior, nunca o meio. Merged = "linear" — aposta com qualquer mao que tem valor. A ausencia das maos medianas no range de aposta define o polarizado.`,
      boardCards: makeBoardRainbow(ranks), heroCards: makeHeroCards('A','K',false),
      heroPos: pos.heroPos, villainPos: pos.villainPos, villainAction: 'Check', potLabel: pick(POT_LABELS_SRP),
    }
  },

  // 4. Board seco IP — merge na c-bet
  () => {
    const ranks = pick(DRY_FLOPS)
    const pos = pickPos(IP_POSITIONS)
    const heroHand = makeHeroCards(...pick(TOP_PAIRS), false)
    return {
      q: `Board seco ${ranks.join('-')} rainbow. Raiser ${pos.heroPos} (IP) vs ${pos.villainPos}. Qual estrategia de c-bet?`,
      a: `Merge: c-bet frequente (70-90%) com sizing pequeno (25-33%), cobrindo overpairs, top pairs e overcards com backdoors`,
      b: 'Polarizado: apostar apenas com sets e total air',
      aCorrect: true,
      explanation: `Board seco = poucos draws = equities estaveis. IP com range advantage, merge e eficiente: aposta pequena com muitas maos de valor. O vilao nao melhora muito em turns secos, entao nao precisa de fold equity maxima agora.`,
      boardCards: makeBoardRainbow(ranks), heroCards: heroHand,
      heroPos: pos.heroPos, villainPos: pos.villainPos, villainAction: 'Check', potLabel: pick(POT_LABELS_SRP),
    }
  },

  // 5. Board umido IP — polarizar
  () => {
    const ranks = pick(WET_FLOPS_CONNECTED)
    const pos = pickPos(IP_POSITIONS)
    const fs = randSuit()
    const board = makeBoardConnectedWet(ranks)
    return {
      q: `Board umido ${ranks.join('-')} com flush draw. Raiser ${pos.heroPos} (IP). Qual estrategia?`,
      a: 'Polarizado: apostar grande com sets/overpairs fortes e semi-bluffs (draws), check maos medianas',
      b: 'Merge: apostar com tudo incluindo maos medianas',
      aCorrect: true,
      explanation: `Board umido = muitos draws = equities volateis. Polarizar IP e correto: aposta grande (66%+) com maos monstro e semi-bluffs (flush/straight draws). Maos medianas como segundo par tem showdown value mas nao querem enfrentar raise — check.`,
      boardCards: board, heroCards: makeHeroCards('A','A',false),
      heroPos: pos.heroPos, villainPos: pos.villainPos, villainAction: 'Check', potLabel: pick(POT_LABELS_SRP),
    }
  },

  // 6. River IP — bluff com mao sem showdown value
  () => {
    const ranks = pick(DRY_RIVERS)
    const pos = pickPos(IP_POSITIONS)
    const bluffHand = makeHeroCards(...pick(BLUFF_HANDS), true)
    return {
      q: `IP no river apos check-check no turn. Board ${ranks.join('-')}. Voce tem draw que nao fechou (sem showdown value). Apostar como bluff?`,
      a: 'Sim — mao sem showdown value e candidata ideal a bluff no range polarizado',
      b: 'Nao — check back, pode ganhar de alguma mao fraca',
      aCorrect: true,
      explanation: `Mao sem showdown value nao ganha no showdown de qualquer forma. Transformar em bluff e lucrativo: voce so ganha se o vilao foldar. O check-check no turn cappou o range do vilao — ambiente perfeito para bluff polarizado no river com sizing grande.`,
      boardCards: makeBoardRainbow(ranks), heroCards: bluffHand,
      heroPos: pos.heroPos, villainPos: pos.villainPos, villainAction: 'Check', potLabel: pick(POT_LABELS_RIVER),
    }
  },

  // 7. OOP flop conectado 3-bet pot — merge
  () => {
    const ranks = pick(WET_FLOPS_CONNECTED)
    const pos = pickPos(OOP_POSITIONS)
    const fs = randSuit()
    const board = makeBoardConnectedWet(ranks)
    return {
      q: `OOP no flop ${ranks.join('-')} em 3-bet pot. Voce e o 3-bettor com range premium. Qual abordagem?`,
      a: 'Merge: c-bet com overpairs e sets, check overcards que nao conectaram',
      b: 'Polarizado: apostar so com nuts absolutos e bluffs puros',
      aCorrect: true,
      explanation: `OOP em 3-bet pot, merge e correto mesmo em board conectado. Seus overpairs (AA-JJ) precisam de protecao. Aposte com maos de valor claras usando sizing medio (50-66%). Nao polarize OOP pois seu range de check fica vulneravel.`,
      boardCards: board, heroCards: makeHeroCards('K','K',false),
      heroPos: pos.heroPos, villainPos: pos.villainPos, villainAction: 'Call', potLabel: pick(POT_LABELS_3BET),
    }
  },

  // 8. Turn IP — vilao checou duas vezes, polarizar
  () => {
    const ranks = pick(DRY_TURNS)
    const pos = pickPos(IP_POSITIONS)
    const heroHand = makeHeroCards(...pick(TOP_PAIRS), false)
    return {
      q: `Turn ${ranks.join('-')}. ${pos.villainPos} checou flop e turn. Voce e ${pos.heroPos} (IP). Qual range para bet?`,
      a: 'Polarizado: apostar com maos muito fortes (dois pares+) e bluffs puros, check maos medianas',
      b: 'Merged: apostar com tudo que e razoavel',
      aCorrect: true,
      explanation: `Quando o vilao checa duas streets, o range dele esta fraco e cappado. IP voce polariza no turn: aposta grande (75-100%) com nuts e bluffs puros. Maos medianas ja ganham no showdown contra esse range fraco — nao precisam apostar.`,
      boardCards: makeBoardRainbow(ranks), heroCards: heroHand,
      heroPos: pos.heroPos, villainPos: pos.villainPos, villainAction: 'Check', potLabel: pick(POT_LABELS_RIVER),
    }
  },

  // 9. Conceito geral — quando polarizar
  () => {
    const ranks = pick(DRY_TURNS)
    const pos = pickPos(IP_POSITIONS)
    return {
      q: 'Regra geral: em quais situacoes voce tende a polarizar mais?',
      a: 'IP, streets tardias (turn/river), boards umidos/conectados',
      b: 'OOP, flop, boards secos/estaticos',
      aCorrect: true,
      explanation: `Polarizacao e mais eficiente: (1) IP — voce ve a reacao do vilao antes de agir; (2) Streets tardias — ranges mais definidos, mao ja esta mais "resolvida"; (3) Boards umidos — equities volateis criam bluffs naturais com draws. OOP prefere merge para proteger range de check.`,
      boardCards: makeBoardRainbow(ranks), heroCards: makeHeroCards('A','T',false),
      heroPos: pos.heroPos, villainPos: pos.villainPos, villainAction: 'Check', potLabel: pick(POT_LABELS_RIVER),
    }
  },

  // 10. Sizing — merged vs polarizado
  () => {
    const ranks = pick(DRY_FLOPS)
    const pos = pickPos(IP_POSITIONS)
    const heroHand = makeHeroCards(...pick(OVERPAIRS), false)
    return {
      q: 'Qual o sizing ideal para range merged vs range polarizado?',
      a: 'Merged = sizing pequeno (25-50%). Polarizado = sizing grande (66-100%+).',
      b: 'Merged = sizing grande. Polarizado = sizing pequeno.',
      aCorrect: true,
      explanation: `Merged aposta com muitas maos de valor — sizing pequeno extrai valor de todas e nao precisa de fold equity. Polarizado quer maximizar: maos fortes querem valor maximo do vilao; bluffs precisam de fold equity alta. Por isso sizing grande (66-100%+).`,
      boardCards: makeBoardRainbow(ranks), heroCards: heroHand,
      heroPos: pos.heroPos, villainPos: pos.villainPos, villainAction: 'Check', potLabel: pick(POT_LABELS_SRP),
    }
  },

  // 11. River IP — check back com mao mediana
  () => {
    const ranks = pick(DRY_RIVERS)
    const pos = pickPos(IP_POSITIONS)
    const pair = pick(MEDIUM_PAIRS)
    const heroHand = makeHeroCards(pair[0], pair[1], false)
    return {
      q: `River ${ranks.join('-')}. Voce e ${pos.heroPos} (IP) com par medio (${pair[0]}${pair[1]}). Apostar ou check?`,
      a: `Check back — par medio e mao do meio: nao e nuts (nao aposta por valor) nem bluff (tem showdown value)`,
      b: 'Apostar — proteger showdown value contra bluffs do vilao',
      aCorrect: true,
      explanation: `No river IP com range polarizado, maos medianas ficam no range de check. ${pair[0]}${pair[1]} nao e forte o suficiente para apostar por valor (muitas maos melhores chamam), e tem showdown value demais para bluffar. Check back e correto.`,
      boardCards: makeBoardRainbow(ranks), heroCards: heroHand,
      heroPos: pos.heroPos, villainPos: pos.villainPos, villainAction: 'Check', potLabel: pick(POT_LABELS_RIVER),
    }
  },

  // 12. Board seco IP — merge c-bet alta frequencia
  () => {
    const ranks = pick(DRY_FLOPS)
    const pos = pickPos(IP_POSITIONS)
    const freq = pick(['75%','80%','85%'])
    const sizing = pick(['25%','33%','30%'])
    return {
      q: `Board ${ranks.join('-')} rainbow. ${pos.heroPos} faz c-bet ${freq} do range com sizing ${sizing}. Isso e estrategia:`,
      a: 'Merged (alta frequencia, sizing pequeno = muitas maos de valor apostam)',
      b: 'Polarizada (baixa frequencia, sizing grande)',
      aCorrect: true,
      explanation: `C-bet frequente com sizing pequeno = estrategia merged classica. IP com range advantage em board seco, aposta com muitas maos (overpairs, top pairs, overcards com backdoors, underpairs) usando sizing minimo. Polarizado seria baixa frequencia (40-50%) com sizing grande.`,
      boardCards: makeBoardRainbow(ranks), heroCards: makeHeroCards('A','Q',false),
      heroPos: pos.heroPos, villainPos: pos.villainPos, villainAction: 'Check', potLabel: pick(POT_LABELS_SRP),
    }
  },

  // 13. OOP — fraqueza de polarizar
  () => {
    const ranks = pick(DRY_FLOPS)
    const pos = pickPos(OOP_POSITIONS)
    const heroHand = makeHeroCards(...pick(MEDIUM_PAIRS), false)
    return {
      q: `Qual a principal fraqueza de usar range polarizado OOP no flop ${ranks.join('-')}?`,
      a: 'Range de check fica cappado e vulneravel — vilao IP explora apostando frequentemente',
      b: 'Nao tem maos fortes suficientes para polarizar',
      aCorrect: true,
      explanation: `Se voce polariza OOP, seu range de check fica cheio de maos medianas sem protecao. O vilao IP ve isso e aposta com frequencia alta contra esse range fraco/cappado. Por isso OOP prefere merge: distribui maos boas entre aposta e check, protegendo ambos os ranges.`,
      boardCards: makeBoardRainbow(ranks), heroCards: heroHand,
      heroPos: pos.heroPos, villainPos: pos.villainPos, villainAction: 'Bet 66%', potLabel: pick(POT_LABELS_SRP),
    }
  },

  // 14. Board pareado com A — merge extremo
  () => {
    const paired = pick(PAIRED_FLOPS)
    const pos = pickPos(IP_POSITIONS)
    const s1 = randSuit()
    const s2 = randSuitExcluding(s1)
    const s3 = randSuit()
    return {
      q: `Flop ${paired[0]}-${paired[0]}-${paired[2]}. ${pos.heroPos} vs ${pos.villainPos}. ${pos.heroPos} faz c-bet 100% sizing 25%. Qual o conceito?`,
      a: 'Merge extremo: range advantage enorme — qualquer mao pode representar o trip',
      b: 'Polarizado: so apostas com sets/trips e total air',
      aCorrect: true,
      explanation: `Board pareado alto (${paired[0]}-${paired[0]}) e o extremo do merge. ${pos.heroPos} tem range advantage absurdo — todos os Ax/${paired[0]}x, enquanto ${pos.villainPos} raramente tem trips. C-bet 100% com sizing minimo funciona porque qualquer mao pode representar o trip, forcando o vilao a foldar muito.`,
      boardCards: [paired[0]+s1, paired[0]+s2, paired[2]+s3], heroCards: makeHeroCards('K','T',false),
      heroPos: pos.heroPos, villainPos: pos.villainPos, villainAction: 'Check', potLabel: pick(POT_LABELS_SRP),
    }
  },

  // 15. Monotone board — polarizar IP
  () => {
    const ranks = pick(WET_FLOPS_CONNECTED)
    const pos = pickPos(IP_POSITIONS)
    const fs = randSuit()
    const board = ranks.map(r => r + fs)
    return {
      q: `Flop monotone (${ranks.join('-')} todo ${fs === 's' ? 'espadas' : fs === 'h' ? 'copas' : fs === 'd' ? 'ouros' : 'paus'}). Voce e ${pos.heroPos} (IP). Qual estrategia?`,
      a: 'Polarizado: check quase todo o range — quem aposta tem nuts (flush) ou semi-bluff forte',
      b: 'Merged: apostar normalmente com overpairs e top pairs',
      aCorrect: true,
      explanation: `Em flop monotone, equity e muito concentrada — quem tem o flush (ou draw forte) tem vantagem enorme. IP o correto e polarizar muito: range de aposta = flushes feitos e semi-bluffs (draws faltando uma carta). Overpairs sem flush draw checam para proteger o range de check.`,
      boardCards: board, heroCards: makeHeroCards('A','K',false),
      heroPos: pos.heroPos, villainPos: pos.villainPos, villainAction: 'Check', potLabel: pick(POT_LABELS_SRP),
    }
  },

  // 16. Turn carta que fecha draw — IP polariza ainda mais
  () => {
    const fs = randSuit()
    const turn = pick(['2','3','4','5','6','7'])
    const board = [`J${fs}`, `T${fs}`, `8${randSuitExcluding(fs)}`, turn+randSuitExcluding(fs)]
    const pos = pickPos(IP_POSITIONS)
    return {
      q: `Turn ${turn} de naipe diferente em board J-T-8 (tinha flush draw). Draws de straight parcialmente fecharam. ${pos.heroPos} (IP). Qual estrategia?`,
      a: 'Polarizado: sizing grande com maos muito fortes (sets, dois pares) e bluffs puros (draws mortos)',
      b: 'Merged: apostar com tudo que e razoavel pois o board secou',
      aCorrect: true,
      explanation: `Turn que fecha draws parcialmente e board de turn — mais perto do river, ranges mais definidos. IP o correto e polarizar: sets/dois pares apostam por valor maximo; draws mortos (sem equity) se transformam em bluffs. Maos medianas como par simples checam — tem showdown value mas nao querem enfrentar raise.`,
      boardCards: board, heroCards: makeHeroCards('J','J',false),
      heroPos: pos.heroPos, villainPos: pos.villainPos, villainAction: 'Check', potLabel: pick(POT_LABELS_RIVER),
    }
  },

  // 17. 3-bet pot OOP flop seco — merge pequeno
  () => {
    const ranks = pick(DRY_FLOPS)
    const pos = pickPos(OOP_POSITIONS)
    const heroHand = makeHeroCards(...pick(OVERPAIRS), false)
    return {
      q: `3-bet pot. ${pos.heroPos} (OOP, 3-bettor) vs ${pos.villainPos}. Flop ${ranks.join('-')} seco. Qual c-bet?`,
      a: 'Merge: c-bet ~75% com sizing medio (50-66%), cobrindo toda a faixa de valor',
      b: 'Polarizado: c-bet 40% com sizing 100%, so nuts e bluffs',
      aCorrect: true,
      explanation: `Em 3-bet pot OOP, seus overpairs (AA, KK, QQ) precisam protecao contra overcards. Merge funciona: aposta com maos de valor (overpairs, top pairs fortes) usando sizing medio. Polarizar OOP deixaria range de check cheio de maos medianas vulneraveis.`,
      boardCards: makeBoardRainbow(ranks), heroCards: heroHand,
      heroPos: pos.heroPos, villainPos: pos.villainPos, villainAction: 'Call', potLabel: pick(POT_LABELS_3BET),
    }
  },

  // 18. River OOP — mergear frequencia de aposta low
  () => {
    const ranks = pick(DRY_RIVERS)
    const pos = pickPos(OOP_POSITIONS)
    const heroHand = makeHeroCards(...pick(TOP_PAIRS), false)
    return {
      q: `River ${ranks.join('-')}. Voce e ${pos.heroPos} (OOP) com top pair bom kicker. Apostar ou check?`,
      a: 'Check/call ou bet pequeno — OOP no river merge com sizing pequeno, nao polariza com sizing grande',
      b: 'Apostar 100% do pot — polarizar forte para maximizar valor',
      aCorrect: true,
      explanation: `OOP no river, mesmo com mao de valor, a tendencia e usar sizing menor ou check/call. Se apostar, sizing pequeno (33-50%) e merged: value bet contra range amplo do vilao. Sizing grande 100% seria polarizado e expoe a mao a raises com bluffs do vilao IP. OOP e sempre mais conservadora.`,
      boardCards: makeBoardRainbow(ranks), heroCards: heroHand,
      heroPos: pos.heroPos, villainPos: pos.villainPos, villainAction: 'Check', potLabel: pick(POT_LABELS_RIVER),
    }
  },

  // 19. Semi-bluff como parte do range polarizado
  () => {
    const fs = randSuit()
    const ranks = pick(WET_FLOPS_CONNECTED)
    const board = makeBoardConnectedWet(ranks)
    const pos = pickPos(IP_POSITIONS)
    return {
      q: `${pos.heroPos} (IP) tem flush draw em flop ${ranks.join('-')} umido. Apostar como semi-bluff faz parte de qual estrategia?`,
      a: 'Polarizado — draws sao bluffs com equity (semi-bluffs) que compoem o range de aposta polarizado',
      b: 'Merged — draws sao maos medianas que se encaixam no meio do range',
      aCorrect: true,
      explanation: `Semi-bluffs (draws com muitos outs) sao o "bluff" do range polarizado. Voce aposta com eles porque: (1) tem fold equity imediata; (2) se chamado, ainda tem equity para melhorar. No range polarizado: nuts + semi-bluffs = lado de aposta; maos medianas sem draw = lado de check.`,
      boardCards: board, heroCards: makeHeroCards('A','K',true),
      heroPos: pos.heroPos, villainPos: pos.villainPos, villainAction: 'Check', potLabel: pick(POT_LABELS_SRP),
    }
  },

  // 20. Conceito — IP vs OOP dinamica central
  () => {
    const ranks = pick(DRY_FLOPS)
    const posIP = pickPos(IP_POSITIONS)
    return {
      q: `Por que a posicao (IP vs OOP) muda a estrategia de range de aposta?`,
      a: 'IP polariza mais (ve reacao do vilao, age por ultimo). OOP merga mais (sem info, precisa proteger range de check).',
      b: 'IP merga mais (tem vantagem posicional). OOP polariza mais (precisa de fold equity).',
      aCorrect: true,
      explanation: `IP: voce age por ultimo, entao pode polarizar com eficiencia — ve se o vilao checa antes de decidir o sizing. OOP: voce age primeiro, nao sabe o que o vilao vai fazer. Polarizar OOP deixa o range de check vulneravel. Por isso OOP usa merge para distribuir maos de valor entre aposta e check, criando dois ranges defensaveis.`,
      boardCards: makeBoardRainbow(ranks), heroCards: makeHeroCards('K','Q',false),
      heroPos: posIP.heroPos, villainPos: posIP.villainPos, villainAction: 'Check', potLabel: pick(POT_LABELS_SRP),
    }
  },

  // 21. Edge case — board com draws fechados no river (draw miss)
  () => {
    const fs = randSuit()
    const riverBoard = [`J${fs}`, `T${fs}`, `8${randSuitExcluding(fs)}`, `2${randSuitExcluding(fs)}`, `3${randSuitExcluding(fs)}`]
    const pos = pickPos(IP_POSITIONS)
    return {
      q: `River em J-T-8-2-3 (flush draw nao fechou). ${pos.heroPos} (IP) tem Ax do mesmo naipe do board (draw morto). Apostar?`,
      a: 'Sim — Ax sem showdown value e candidato a bluff no range polarizado do river',
      b: 'Nao — Ace high ainda pode ganhar, check back',
      aCorrect: true,
      explanation: `Ax de naipe do flush draw que nao fechou = mao sem valor de showdown na maioria dos casos. No range polarizado do river, essa mao e um bluff natural: nao ganha no showdown mas pode forcar o vilao a foldar maos medias. Sizing grande (66-100%) para maximizar fold equity.`,
      boardCards: riverBoard, heroCards: ['A'+fs, '5'+fs],
      heroPos: pos.heroPos, villainPos: pos.villainPos, villainAction: 'Check', potLabel: pick(POT_LABELS_RIVER),
    }
  },

  // 22. Edge case — underpair em board seco com range advantage
  () => {
    const ranks = pick(DRY_FLOPS)
    const pos = pickPos(IP_POSITIONS)
    const smallPair = pick([['8','8'],['7','7'],['6','6'],['5','5']])
    return {
      q: `Flop ${ranks.join('-')} seco. ${pos.heroPos} (IP) tem ${smallPair[0]}${smallPair[1]} (underpair). Apostar como parte de range merged?`,
      a: 'Sim — underpairs com showdown value se encaixam no range merged com sizing pequeno',
      b: 'Nao — underpair e fraco demais, deve sempre checar',
      aCorrect: true,
      explanation: `Em estrategia merged com sizing pequeno (25-33%), underpairs podem fazer parte do range de aposta pois tem showdown value contra overcards do vilao. Nao e uma aposta de valor pura, mas contribui para densidade de range. Se o vilao raise, voce faz fold facil dado o sizing pequeno.`,
      boardCards: makeBoardRainbow(ranks), heroCards: makeHeroCards(smallPair[0], smallPair[1], false),
      heroPos: pos.heroPos, villainPos: pos.villainPos, villainAction: 'Check', potLabel: pick(POT_LABELS_SRP),
    }
  },

  // 23. Edge case — check-back IP com top pair kicker ruim (range polarizado)
  () => {
    const ranks = pick(DRY_RIVERS)
    const pos = pickPos(IP_POSITIONS)
    return {
      q: `River ${ranks.join('-')}. Voce e ${pos.heroPos} (IP) com top pair kicker ruim (ex: A2 em board com A). Apostar ou check?`,
      a: 'Check back — top pair kicker ruim e mao mediana no river polarizado: nao e nuts nem bluff',
      b: 'Apostar 50% pot — ainda e top pair, tem valor',
      aCorrect: true,
      explanation: `No river IP com estrategia polarizada, top pair kicker ruim e uma mao "do meio". Nao e forte o suficiente para valor (muitas maos melhores chamam), mas tem showdown value demais para bluffar. Check back e a jogada correta — voce ganha no showdown contra bluffs do vilao sem precisar apostar.`,
      boardCards: makeBoardRainbow(ranks), heroCards: makeHeroCards('A','2',false),
      heroPos: pos.heroPos, villainPos: pos.villainPos, villainAction: 'Check', potLabel: pick(POT_LABELS_RIVER),
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
      title: 'Polarizado vs Merged',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            Existem dois tipos fundamentais de range de aposta no poker:
          </p>
          <div className="rounded-lg p-4 mb-3" style={{ background: 'rgba(229,72,77,0.08)', border: '1px solid rgba(229,72,77,0.2)' }}>
            <div style={{ color: '#e5484d', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Range Polarizado</div>
            <div style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 1.7 }}>
              Aposta com o <strong style={{ color: '#fdfdfd' }}>melhor</strong> (nuts) e o <strong style={{ color: '#fdfdfd' }}>pior</strong> (bluffs).<br/>
              Checa tudo no <strong style={{ color: '#fdfdfd' }}>meio</strong> (maos medianas com showdown value).
            </div>
          </div>
          <div className="rounded-lg p-4" style={{ background: 'rgba(79,206,130,0.08)', border: '1px solid rgba(79,206,130,0.2)' }}>
            <div style={{ color: '#4fce82', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Range Merged (Linear)</div>
            <div style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 1.7 }}>
              Aposta com <strong style={{ color: '#fdfdfd' }}>tudo que e bom</strong>, do melhor ate maos medianas.<br/>
              Checa apenas o <strong style={{ color: '#fdfdfd' }}>lixo</strong> que nao tem valor.
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Quando Polarizar',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            Polarizacao funciona melhor quando:
          </p>
          <div className="space-y-2 mb-4">
            {[
              { cond: 'IP (em posicao)', why: 'Voce ve a reacao do vilao antes de agir' },
              { cond: 'Streets tardias (turn/river)', why: 'Ranges mais definidos, decisoes de showdown' },
              { cond: 'Boards umidos', why: 'Equities volateis, draws criam bluffs naturais' },
              { cond: 'Vilao com range capped', why: 'Ele checou 2x = range fraco, voce polariza contra' },
            ].map((item, i) => (
              <div key={i} className="rounded-lg px-3 py-2.5" style={{ background: '#222225' }}>
                <div style={{ color: '#e5484d', fontSize: 13, fontWeight: 600 }}>{item.cond}</div>
                <div style={{ color: '#676671', fontSize: 12 }}>{item.why}</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg p-4" style={{ background: 'rgba(229,72,77,0.08)', border: '1px solid rgba(229,72,77,0.2)' }}>
            <div style={{ color: '#e5484d', fontSize: 13, fontWeight: 600 }}>
              Polarizado = sizing GRANDE (66-100%+) — valor maximo ou fold equity maxima
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Quando Mergear',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            Merge funciona melhor quando:
          </p>
          <div className="space-y-2 mb-4">
            {[
              { cond: 'OOP (fora de posicao)', why: 'Sem info, precisa proteger range de check' },
              { cond: 'Flop (street inicial)', why: 'Ranges ainda amplos, nao da pra polarizar bem' },
              { cond: 'Boards secos', why: 'Poucas draws, equities estaveis' },
              { cond: 'Range advantage claro', why: 'Apostar com muitas maos e lucrativo com sizing pequeno' },
            ].map((item, i) => (
              <div key={i} className="rounded-lg px-3 py-2.5" style={{ background: '#222225' }}>
                <div style={{ color: '#4fce82', fontSize: 13, fontWeight: 600 }}>{item.cond}</div>
                <div style={{ color: '#676671', fontSize: 12 }}>{item.why}</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg p-4" style={{ background: 'rgba(79,206,130,0.08)', border: '1px solid rgba(79,206,130,0.2)' }}>
            <div style={{ color: '#4fce82', fontSize: 13, fontWeight: 600 }}>
              Merged = sizing PEQUENO (25-50%) — muitas maos de valor, nao precisa de fold equity
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Resumo e Regras',
      content: (
        <div>
          <div className="rounded-lg overflow-hidden mb-4" style={{ border: '1px solid #2a2a2e' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#222225' }}>
                  <th style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}></th>
                  <th style={{ color: '#e5484d', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>Polarizado</th>
                  <th style={{ color: '#4fce82', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>Merged</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Aposta com', 'Nuts + bluffs', 'Tudo que e bom'],
                  ['Checa', 'Maos medianas', 'Lixo'],
                  ['Sizing', '66-100%+', '25-50%'],
                  ['Posicao', 'IP preferido', 'OOP preferido'],
                  ['Board', 'Umido/conectado', 'Seco/estatico'],
                  ['Street', 'Turn/River', 'Flop'],
                ].map(([label, pol, mer], i) => (
                  <tr key={i} style={{ borderTop: '1px solid #2a2a2e' }}>
                    <td style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', fontWeight: 600 }}>{label}</td>
                    <td style={{ color: '#fdfdfd', fontSize: 12, padding: '8px 12px' }}>{pol}</td>
                    <td style={{ color: '#fdfdfd', fontSize: 12, padding: '8px 12px' }}>{mer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            Modulo 24 - Polarizacao vs Merge
          </h1>
          <p style={{ color: '#676671', fontSize: 13, marginBottom: 20 }}>
            Quando usar cada tipo de range de aposta
          </p>

          <div className="flex gap-1 mb-6 overflow-x-auto">
            {sections.map((s, i) => (
              <button key={i} onClick={() => setSection(i)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
                style={{
                  background: section === i ? 'rgba(229,72,77,0.12)' : 'transparent',
                  color: section === i ? '#e5484d' : '#676671',
                  border: `1px solid ${section === i ? '#e5484d' : 'transparent'}`,
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
  const progress = getModuleProgress(24)

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
    recordAnswer(24, isCorrect, newStreak, { tp: 'pol' })
    setResult({ isCorrect, explanation: scenario.explanation, chosenId: optionId })
  }, [result, scenario, streak, recordAnswer])

  const handleNext = useCallback(() => {
    const nextHand = handNum + 1
    if (nextHand >= 10) {
      const accuracy = Math.round((sessionCorrect / 10) * 100)
      recordSession(24, accuracy)
      setShowReview(true)
    } else {
      setHandNum(nextHand)
    }
    setResult(null)
    setScenario(generateScenario())
  }, [handNum, sessionCorrect, recordSession])

  const acc = progress.totalAnswered > 0 ? progress.accuracy : 0

  if (showReview) {
    return <SessionReview moduleId={24} sessionCorrect={sessionCorrect} sessionTotal={10} onContinue={() => { setHandNum(0); setSessionCorrect(0); setShowReview(false); setStreak(0) }} />
  }

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-16" style={{ background: '#0f0f0f' }}>
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { label: 'Sessao', value: `${handNum}/10`, color: '#e5484d' },
            { label: 'Precisao', value: `${acc}%`, color: '#4fce82' },
            { label: 'Streak', value: streak, color: '#f5a623' },
          ].map((s, i) => (
            <div key={i} className="rounded-lg p-2.5 text-center" style={{ background: '#1a1a1d' }}>
              <div style={{ color: '#676671', fontSize: 10, marginBottom: 2 }}>{s.label}</div>
              <div style={{ color: s.color, fontSize: 18, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl p-5" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
          {scenario.heroCards && scenario.heroCards.length > 0 && (
            <ModulePokerTable
              heroPos={scenario.heroPos || 'BTN'}
              villainPos={scenario.villainPos || 'BB'}
              heroCards={scenario.heroCards}
              boardCards={scenario.boardCards || []}
              villainAction={scenario.villainAction || ''}
              potLabel={scenario.potLabel || ''}
              contextTitle="Polarizacao vs Merge"
              contextDesc=""
            />
          )}

          <div style={{ color: '#fdfdfd', fontSize: 15, lineHeight: 1.7, marginBottom: 20 }}>
            {scenario.question}
          </div>

          <div className="space-y-2">
            {scenario.options.map(opt => {
              let bg = '#2a2a2e'
              let border = '#2a2a2e'
              if (result) {
                if (opt.correct) { bg = 'rgba(79,206,130,0.12)'; border = '#4fce82' }
                else if (opt.id === result.chosenId) { bg = 'rgba(229,72,77,0.12)'; border = '#e5484d' }
              }
              return (
                <button key={opt.id} onClick={() => handleAnswer(opt.id)}
                  disabled={!!result}
                  className="w-full text-left rounded-xl px-4 py-3"
                  style={{ background: bg, border: `1px solid ${border}`, color: '#fdfdfd', fontSize: 13, lineHeight: 1.5, cursor: result ? 'default' : 'pointer' }}>
                  {opt.label}
                </button>
              )
            })}
          </div>

          {result && (
            <div className="mt-4">
              <div className="rounded-lg p-3 mb-3" style={{
                background: result.isCorrect ? 'rgba(79,206,130,0.08)' : 'rgba(229,72,77,0.08)',
                border: `1px solid ${result.isCorrect ? 'rgba(79,206,130,0.2)' : 'rgba(229,72,77,0.2)'}`,
              }}>
                <div style={{ color: result.isCorrect ? '#4fce82' : '#e5484d', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                  {result.isCorrect ? 'Correto!' : 'Errado'}
                </div>
                <div style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 1.6 }}>{result.explanation}</div>
                {!result.isCorrect && <DecisionTree scenario={{ ...scenario, moduleId: 24 }} result={result} />}
              </div>
              <button onClick={handleNext}
                style={{
                  width: '100%', padding: '12px', borderRadius: 8,
                  background: '#4fce82', border: 'none', color: '#0f0f0f',
                  fontWeight: 600, fontSize: 14, cursor: 'pointer',
                }}>
                {handNum >= 9 ? 'Finalizar Sessao' : 'Proxima'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Module24() {
  const { progress, markLessonRead, getModuleProgress } = useProgress()
  const mod = progress.modules[24]
  const modProgress = getModuleProgress(24)
  const [view, setView] = useState(modProgress.lessonRead ? 'trainer' : 'lesson')

  if (!mod?.unlocked) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f0f' }}>
      <div className="text-center"><div style={{ fontSize: 60 }}>🔒</div><h2 style={{ color: 'white', marginTop: 16 }}>Modulo Bloqueado</h2><p style={{ color: '#888', marginTop: 8 }}>Complete o modulo anterior para desbloquear.</p></div>
    </div>
  )
  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0f0f0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setView('lesson')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'lesson' ? '#e5484d' : '#1a1a1d', color: view === 'lesson' ? 'white' : '#888', border: '1px solid #2a2a2e' }}>Aula</button>
          <button onClick={() => modProgress.lessonRead && setView('trainer')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'trainer' ? '#e5484d' : '#1a1a1d', color: view === 'trainer' ? 'white' : (modProgress.lessonRead ? '#888' : '#444'), border: '1px solid #2a2a2e', cursor: modProgress.lessonRead ? 'pointer' : 'not-allowed' }}>Trainer {!modProgress.lessonRead && '🔒'}</button>
        </div>
        {view === 'lesson' ? <Lesson onComplete={() => { markLessonRead(24); setView('trainer') }} /> : <Trainer />}
      </div>
    </div>
  )
}
