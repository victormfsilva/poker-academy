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
// MODULO 26 — Sizing Theory (Cada Sizing Conta uma Historia)
// ================================================================

// ----------------------------------------------------------------
// Pools de boards por textura
// ----------------------------------------------------------------
const DRY_HIGH_BOARDS   = [['A','K','5'],['A','Q','4'],['A','J','3'],['K','Q','6'],['A','K','2'],['K','J','4'],['A','T','7'],['Q','J','5']]
const DRY_LOW_BOARDS    = [['9','5','2'],['8','4','2'],['7','3','2'],['6','4','2'],['8','5','2'],['T','4','2'],['9','6','2'],['7','5','3']]
const MEDIUM_DRY_BOARDS = [['Q','7','3'],['J','6','3'],['T','8','3'],['J','9','4'],['T','6','2'],['Q','8','2'],['J','7','4'],['K','8','3']]
const WET_BOARDS        = [['J','T','8'],['T','9','7'],['9','8','6'],['Q','J','9'],['8','7','5'],['T','8','6'],['J','9','7'],['Q','T','8']]
const PAIRED_BOARDS     = [['A','A','7'],['K','K','5'],['Q','Q','4'],['J','J','3'],['T','T','6'],['9','9','2'],['8','8','5'],['7','7','K']]
const TURN_BOARDS       = [['Q','8','3','K'],['J','6','2','T'],['A','7','3','9'],['K','9','4','Q'],['T','6','2','A'],['8','5','2','K'],['J','8','4','Q'],['9','5','3','A']]
const RIVER_DRY_BOARDS  = [['A','7','2','4','9'],['K','6','3','5','Q'],['A','9','2','6','T'],['Q','7','2','4','K'],['A','8','3','5','T'],['K','7','2','4','J'],['A','6','2','3','Q'],['K','8','3','5','J']]
const RIVER_WET_BOARDS  = [['K','T','5','3','7'],['Q','J','4','2','8'],['A','T','6','3','8'],['K','J','5','4','9'],['Q','T','4','3','7'],['A','J','6','2','9'],['K','Q','5','3','8'],['A','T','5','2','7']]

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

// Hero hands por categoria
const HIGH_CARD_HANDS   = [['A','K'],['A','Q'],['A','J'],['K','Q'],['A','T'],['K','J'],['Q','J'],['A','9']]
const TOP_PAIR_HANDS    = [['A','K'],['A','Q'],['K','Q'],['A','J'],['Q','J'],['K','J'],['A','T'],['K','T']]
const OVERPAIR_HANDS    = [['A','A'],['K','K'],['Q','Q'],['J','J'],['T','T']]
const MEDIUM_PAIR_HANDS = [['9','9'],['8','8'],['7','7'],['6','6'],['5','5']]
const BLUFF_HANDS       = [['A','5'],['A','4'],['A','3'],['K','5'],['Q','5'],['J','4'],['T','5'],['9','4']]

const POT_FLOP   = ['6.5bb','7bb','7.5bb','8bb','9bb']
const POT_TURN   = ['13bb','14bb','15bb','16bb','18bb','20bb']
const POT_RIVER  = ['25bb','30bb','35bb','40bb','45bb','50bb','60bb']

const SCENARIOS = [
  // 1 — Range advantage em board alto seco (parametrizado)
  () => {
    const board = pick(DRY_HIGH_BOARDS)
    const [r1, r2] = pick(TOP_PAIR_HANDS)
    const pot = pick(POT_FLOP)
    return {
      q: `Flop ${board[0]}-${board[1]}-${board[2]} rainbow. BTN (raiser) vs BB. BTN tem range advantage massivo. Qual sizing de c-bet?`,
      a: '25-33% pot (sizing pequeno — range advantage = bet frequente e barato)',
      b: '75% pot (sizing grande — board alto)',
      aCorrect: true,
      explanation: 'Range advantage = muitas maos no range conectam com o board. Aposta com muitas maos e sizing pequeno porque o lucro vem da frequencia, nao do tamanho. Sizing grande faz voce perder EV ao reduzir frequencia.',
      boardCards: makeRainbowBoard(board), heroCards: makeHeroCards(r1, r2, false),
      heroPos: 'BTN', villainPos: 'BB', villainAction: 'Check', potLabel: pot,
    }
  },

  // 2 — Semi-bluff em board umido com flush draw (parametrizado)
  () => {
    const wetRanks = pick([['J','T','8'],['T','9','7'],['9','8','6'],['Q','J','9'],['8','7','5']])
    const fs = randSuit()
    const board = [wetRanks[0]+fs, wetRanks[1]+fs, wetRanks[2]+randSuitExcluding(fs)]
    const setCard = wetRanks[0]
    const s2 = randSuitExcluding(fs)
    const s3 = randSuitExcluding(fs)
    const pot = pick(POT_FLOP)
    return {
      q: `Flop ${wetRanks[0]}-${wetRanks[1]}-${wetRanks[2]} com flush draw. IP com set de ${wetRanks[0]}s. Qual sizing?`,
      a: '66-75% pot (proteger contra draws, cobrar caro)',
      b: '25-33% pot (sizing padrao de range)',
      aCorrect: true,
      explanation: 'Board ultra-umido com flush draw + straight draws. Draws tem 30-40% equity. Sizing grande forca draws a pagar preco errado. Protecao e mais importante que frequencia neste tipo de board.',
      boardCards: board, heroCards: [setCard+s2, setCard+s3],
      heroPos: 'BTN', villainPos: 'BB', villainAction: 'Check', potLabel: pot,
    }
  },

  // 3 — River seco com nuts, vilao passivo (parametrizado)
  () => {
    const board = pick(RIVER_DRY_BOARDS)
    const pot = pick(POT_RIVER)
    return {
      q: `River em board seco ${board[0]}-${board[1]}-${board[2]}-${board[3]}-${board[4]}. Voce tem AA (nuts). Vilao checkou 3 streets. Qual sizing?`,
      a: '33-50% pot (vilao tem range fraco, sizing grande assusta)',
      b: '100%+ pot (overbet — maximizar valor)',
      aCorrect: true,
      explanation: 'Vilao checkou 3x: range e fraco (pares medianos, Ax fracos). Sizing grande faz ele foldar tudo. Sizing menor (33-50%) extrai valor fino de maos que pagam por curiosidade ou pot odds.',
      boardCards: makeRainbowBoard(board), heroCards: makeHeroCards('A','A',false),
      heroPos: 'BTN', villainPos: 'BB', villainAction: 'Check', potLabel: pot,
    }
  },

  // 4 — Quando usar overbet (conceitual, board varia)
  () => {
    const board = pick(RIVER_DRY_BOARDS)
    const [r1, r2] = pick(OVERPAIR_HANDS)
    const pot = pick(POT_RIVER)
    return {
      q: `Overbet (100%+ pot) no river em ${board[0]}-${board[1]}-${board[2]}-${board[3]}-${board[4]}. Quando isso faz sentido?`,
      a: 'Range polarizado: voce tem nuts ou nada, vilao tem range capped',
      b: 'Quando voce tem qualquer mao forte no river',
      aCorrect: true,
      explanation: 'Overbet e a arma do range polarizado. Funciona quando: 1) vilao tem range capped (nao pode ter nuts), 2) voce pode representar nuts e bluffs criveivelmente. Maximiza valor das nuts E fold equity dos bluffs.',
      boardCards: makeRainbowBoard(board), heroCards: makeHeroCards(r1, r2, false),
      heroPos: 'BTN', villainPos: 'BB', villainAction: 'Check', potLabel: pot,
    }
  },

  // 5 — Consistencia de sizing: AA em board seco com range advantage
  () => {
    const board = pick(DRY_LOW_BOARDS)
    const pot = pick(POT_FLOP)
    return {
      q: `Flop ${board[0]}-${board[1]}-${board[2]} rainbow. Voce e o raiser IP com range advantage. C-bet com AA. Qual sizing?`,
      a: '25-33% (mesmo com AA — sizing deve ser consistente com o range)',
      b: '75% (AA e forte, justifica bet grande)',
      aCorrect: true,
      explanation: 'AA e forte, mas o sizing deve ser identico para todas as maos da estrategia. Se voce aposta 25-33% com range advantage, AA tambem usa esse sizing. Variar sizing por mao doa informacao ao vilao.',
      boardCards: makeRainbowBoard(board), heroCards: makeHeroCards('A','A',false),
      heroPos: 'BTN', villainPos: 'BB', villainAction: 'Check', potLabel: pot,
    }
  },

  // 6 — Turn escalation com mao forte
  () => {
    const board = pick(TURN_BOARDS)
    const [r1, r2] = pick(TOP_PAIR_HANDS)
    const pot = pick(POT_TURN)
    return {
      q: `Turn em board ${board[0]}-${board[1]}-${board[2]}-${board[3]}. Voce IP bettou flop 33%. Agora tem ${r1}${r2} (mao forte). Qual sizing no turn?`,
      a: '60-75% pot (mao forte — construir pote para o river)',
      b: '33% pot (manter o mesmo sizing do flop)',
      aCorrect: true,
      explanation: 'Turn sizing escalona. Flop com range inteiro usa 33%, mas no turn voce tem mao forte e quer construir pote. 60-75% cobra draws e constroi pote pro river. Sizing do flop nao precisa ser o mesmo do turn.',
      boardCards: makeRainbowBoard(board), heroCards: makeHeroCards(r1, r2, false),
      heroPos: 'BTN', villainPos: 'BB', villainAction: 'Call', potLabel: pot,
    }
  },

  // 7 — Math da frequencia: 33% vs 75% em boards secos (conceitual)
  () => {
    const board = pick(MEDIUM_DRY_BOARDS)
    const [r1, r2] = pick(HIGH_CARD_HANDS)
    const pot = pick(POT_FLOP)
    return {
      q: `Flop ${board[0]}-${board[1]}-${board[2]} seco. Por que 33% e mais eficiente que 75% com range advantage?`,
      a: 'Bet 33% precisa funcionar ~25% das vezes; 75% precisa de ~43%. Mais lucrativo com frequencia',
      b: 'Porque maos fortes preferem sizing pequeno para extrair valor',
      aCorrect: true,
      explanation: 'Bet 33% pot precisa funcionar ~25% pra ser lucrativo. Bet 75% precisa de ~43%. Em boards secos com range advantage, voce lucra mais apostando 33% com MUITAS maos do que 75% com poucas maos.',
      boardCards: makeRainbowBoard(board), heroCards: makeHeroCards(r1, r2, false),
      heroPos: 'BTN', villainPos: 'BB', villainAction: 'Check', potLabel: pot,
    }
  },

  // 8 — River com straight em board com flush possible
  () => {
    const fs = randSuit()
    const straightRanks = pick([['T','9','6','7','2'],['J','T','7','8','3'],['9','8','5','6','2'],['Q','J','8','9','4']])
    const board = [straightRanks[0]+fs, straightRanks[1]+fs, straightRanks[2]+randSuitExcluding(fs), straightRanks[3]+randSuit(), straightRanks[4]+fs]
    const pot = pick(POT_RIVER)
    return {
      q: `River ${straightRanks[0]}-${straightRanks[1]}-${straightRanks[2]}-${straightRanks[3]}-${straightRanks[4]} com flush possible. Voce tem straight. Vilao checkou. Sizing?`,
      a: '75-100% (polarizado — straight forte, flush possible justifica sizing grande)',
      b: '33% (sizing fino para extrair valor)',
      aCorrect: true,
      explanation: 'Straight feito e mao forte mas nao invulneravel (flush possivel). Sizing grande (75-100%) maximiza valor contra maos que pagam (dois pares, sets) e tem fold equity contra air. Range polarizado = sizing grande.',
      boardCards: board, heroCards: makeHeroCards('J','8',false),
      heroPos: 'BTN', villainPos: 'BB', villainAction: 'Check', potLabel: pot,
    }
  },

  // 9 — 50% sizing como protecao moderada (parametrizado)
  () => {
    const board = pick(MEDIUM_DRY_BOARDS)
    const [r1, r2] = pick(TOP_PAIR_HANDS)
    const pot = pick(POT_FLOP)
    return {
      q: `Flop ${board[0]}-${board[1]}-${board[2]}. Voce tem top pair bom kicker (${r1}${r2}). Qual sizing de protecao?`,
      a: '50% pot — protecao moderada para mao boa mas nao monster',
      b: '25% pot — eficiente como no board seco com range advantage',
      aCorrect: true,
      explanation: '50% e o sizing de protecao padrao. Funciona com maos que querem valor mas nao sao nuts: top pair bom kicker, overpairs em boards medianos. Cobra draws sem over-investir em maos vulneraveis.',
      boardCards: makeRainbowBoard(board), heroCards: makeHeroCards(r1, r2, false),
      heroPos: 'BTN', villainPos: 'BB', villainAction: 'Check', potLabel: pot,
    }
  },

  // 10 — Semi-bluff em board monotone (parametrizado)
  () => {
    const ms = randSuit()
    const monoRanks = pick([['6','5','4'],['7','6','5'],['8','6','4'],['9','7','5'],['T','8','5'],['J','8','6']])
    const board = monoRanks.map(r => r+ms)
    const pot = pick(POT_FLOP)
    return {
      q: `Flop ${monoRanks[0]}-${monoRanks[1]}-${monoRanks[2]} monotone (3 cartas do mesmo naipe). Voce tem nut flush draw + equity extra. Sizing de semi-bluff?`,
      a: '66-75% (board perigoso, semi-bluff forte precisa de sizing grande)',
      b: '25% (manter o custo barato)',
      aCorrect: true,
      explanation: 'Semi-bluff forte em board ultra-umido = sizing grande. Voce quer: 1) forcar draws piores a pagar preco errado, 2) fold equity contra maos feitas fracas, 3) construir pote para quando fechar o flush.',
      boardCards: board, heroCards: ['A'+ms, '7'+randSuitExcluding(ms)],
      heroPos: 'BTN', villainPos: 'BB', villainAction: 'Check', potLabel: pot,
    }
  },

  // 11 — Overbet conta historia de nuts (conceitual)
  () => {
    const board = pick(RIVER_WET_BOARDS)
    const [r1, r2] = pick(TOP_PAIR_HANDS)
    const pot = pick(POT_RIVER)
    return {
      q: `River ${board[0]}-${board[1]}-${board[2]}-${board[3]}-${board[4]}. Qual sizing conta a historia mais consistente de "eu tenho nuts"?`,
      a: 'Overbet (100%+) — so faz sentido com range extremamente polarizado',
      b: '75% pot — sizing grande mas nao exagerado',
      aCorrect: true,
      explanation: 'Overbet grita "eu tenho nuts ou nada". E o sizing mais polarizado possivel. Se voce faz overbet sem ter nuts, precisa de bluffs criveis no range. Qualquer sizing menor pode ser feito com maos medianas.',
      boardCards: makeRainbowBoard(board), heroCards: makeHeroCards(r1, r2, false),
      heroPos: 'BTN', villainPos: 'BB', villainAction: 'Check', potLabel: pot,
    }
  },

  // 12 — Donk bet OOP (parametrizado)
  () => {
    const board = pick(MEDIUM_DRY_BOARDS)
    const [r1, r2] = pick(TOP_PAIR_HANDS)
    const pot = pick(POT_FLOP)
    return {
      q: `Flop ${board[0]}-${board[1]}-${board[2]}. Voce esta OOP (BB) e quer donk bet (apostar antes do raiser). Qual sizing?`,
      a: '50-66% pot (donk bet com sizing medio — equilibra valor e protecao)',
      b: '25% pot (sizing pequeno padrao)',
      aCorrect: true,
      explanation: 'Donk bet usa 50-66%. Sizing muito pequeno (25%) nao gera fold equity nem protege. Sizing muito grande overcommit sem necessidade. 50-66% equilibra valor e protecao, e tambem comunica forca ao raiser.',
      boardCards: makeRainbowBoard(board), heroCards: makeHeroCards(r1, r2, false),
      heroPos: 'BB', villainPos: 'BTN', villainAction: '', potLabel: pot,
    }
  },

  // 13 — Regra por street (conceitual, board varia)
  () => {
    const board = pick(WET_BOARDS)
    const [r1, r2] = pick(HIGH_CARD_HANDS)
    const pot = pick(POT_FLOP)
    return {
      q: `Qual e a regra de sizing por street no poker GTO?`,
      a: 'Flop: 25-50% | Turn: 50-75% | River: 66-100%+',
      b: 'Mesmo sizing em todas as streets para nao dar informacao',
      aCorrect: true,
      explanation: 'Sizings escalaonam pelas streets. Flop e mais frequente com sizing menor (muitas maos). Turn filtra ranges — sizing maior. River e polarizado — sizing grande ou overbet. Isso constroi pote naturalmente.',
      boardCards: makeRainbowBoard(board), heroCards: makeHeroCards(r1, r2, false),
      heroPos: 'BTN', villainPos: 'BB', villainAction: 'Check', potLabel: pot,
    }
  },

  // 14 — Ler sizing do vilao: min-bet no river
  () => {
    const board = pick(RIVER_WET_BOARDS)
    const [r1, r2] = pick(MEDIUM_PAIR_HANDS)
    const pot = pick(POT_RIVER)
    return {
      q: `River ${board[0]}-${board[1]}-${board[2]}-${board[3]}-${board[4]}. Vilao min-betta (2x big blind) em pote grande. Voce tem segundo par. O que o sizing dele diz?`,
      a: 'Provavelmente valor fino com mao mediana — quer ser pago por maos piores',
      b: 'Bluff claro — sizing pequeno revela fraqueza',
      aCorrect: true,
      explanation: 'Min-bet no river quase sempre e valor fino. Vilao quer ser pago por maos piores sem arriscar muito. Com segundo par voce tem decisao dificil — vilao raramente blefa com sizing minimo no river.',
      boardCards: makeRainbowBoard(board), heroCards: makeHeroCards(r1, r2, false),
      heroPos: 'BB', villainPos: 'BTN', villainAction: 'Bet 2bb', potLabel: pot,
    }
  },

  // 15 — Nut advantage em board paired (novo)
  () => {
    const board = pick(PAIRED_BOARDS)
    const [r1] = board
    const pot = pick(POT_FLOP)
    return {
      q: `Flop ${board[0]}-${board[1]}-${board[2]} (board pareado). Voce IP tem trips. Qual sizing?`,
      a: '66-75% pot (nut advantage — voce tem muito mais trips que o vilao)',
      b: '25-33% pot (range advantage = sizing pequeno)',
      aCorrect: true,
      explanation: 'Board pareado = nut advantage para o raiser IP. Voce tem muito mais trips (as duas cartas + board) no range do que o vilao. Nut advantage = sizing grande, frequencia menor — maximiza valor das maos mais fortes.',
      boardCards: makeRainbowBoard(board), heroCards: makeHeroCards(r1, 'K', false),
      heroPos: 'BTN', villainPos: 'BB', villainAction: 'Check', potLabel: pot,
    }
  },

  // 16 — Bluff sizing: grande para gerar fold equity (novo)
  () => {
    const board = pick(MEDIUM_DRY_BOARDS)
    const [r1, r2] = pick(BLUFF_HANDS)
    const pot = pick(POT_FLOP)
    return {
      q: `Flop ${board[0]}-${board[1]}-${board[2]}. Voce tem ${r1}${r2} (air/bluff). Qual sizing para maximizar fold equity?`,
      a: '50-66% pot (bluff precisa de fold equity — sizing muito pequeno nao funciona)',
      b: '25% pot (arriscar pouco no bluff)',
      aCorrect: true,
      explanation: 'Bluff precisa de fold equity para ser lucrativo. Bet 25% e facil de pagar (pot odds excelentes para o vilao). Bet 50-66% forca o vilao a tomar decisao real. Bluff com sizing pequeno raramente e lucrativo.',
      boardCards: makeRainbowBoard(board), heroCards: makeHeroCards(r1, r2, false),
      heroPos: 'BTN', villainPos: 'BB', villainAction: 'Check', potLabel: pot,
    }
  },

  // 17 — Ler sizing do vilao: overbet no river
  () => {
    const board = pick(RIVER_DRY_BOARDS)
    const [r1, r2] = pick(MEDIUM_PAIR_HANDS)
    const pot = pick(POT_RIVER)
    return {
      q: `River ${board[0]}-${board[1]}-${board[2]}-${board[3]}-${board[4]}. Vilao faz overbet (150% pot). Voce tem par do meio. O que esse sizing indica?`,
      a: 'Range polarizado: vilao tem nuts ou bluff — par do meio e call dificil',
      b: 'Vilao esta blefando — overbet e sempre sinal de fraqueza',
      aCorrect: true,
      explanation: 'Overbet do vilao = range extremamente polarizado. Ele tem nuts ou nada. Seu par do meio perde para nuts e ganha contra air. A decisao depende da frequencia de bluffs no range dele nessa run-out.',
      boardCards: makeRainbowBoard(board), heroCards: makeHeroCards(r1, r2, false),
      heroPos: 'BB', villainPos: 'BTN', villainAction: 'Bet 150%', potLabel: pot,
    }
  },

  // 18 — Turn com draw: sizing escalado (novo)
  () => {
    const board = pick(TURN_BOARDS)
    const fs = randSuit()
    const pot = pick(POT_TURN)
    return {
      q: `Turn ${board[0]}-${board[1]}-${board[2]}-${board[3]} com flush draw no board. Voce tem overpair + sem draw. Qual sizing?`,
      a: '66-75% pot (board umido no turn — proteger overpair, cobrar draws caro)',
      b: '33% pot (manter sizing do flop)',
      aCorrect: true,
      explanation: 'Turn com flush draw = board umido. Overpair quer cobrar draws cara. 66-75% no turn com draw presente e correto: forca draws a pagar preco errado e constroi pote. Sizing de flop NAO deve ser replicado no turn umido.',
      boardCards: makeRainbowBoard(board), heroCards: makeHeroCards('A','A',false),
      heroPos: 'BTN', villainPos: 'BB', villainAction: 'Call', potLabel: pot,
    }
  },

  // 19 — Variar sizing por mao = dar informacao (conceitual)
  () => {
    const board = pick(DRY_HIGH_BOARDS)
    const pot = pick(POT_FLOP)
    return {
      q: `Flop ${board[0]}-${board[1]}-${board[2]}. Com AA voce betta 75%, com AQ betta 33%. Qual o problema dessa estrategia?`,
      a: 'Voce revela a forca da sua mao pelo sizing — vilao pode explorar isso',
      b: 'Nao ha problema — e otimo variar para confundir o vilao',
      aCorrect: true,
      explanation: 'Variar sizing por mao especifica e um leak grave. Vilao aprende: sizing grande = mao forte, sizing pequeno = mao fraca. A solucao GTO e usar o MESMO sizing com todo o range e nao dar informacao gratis.',
      boardCards: makeRainbowBoard(board), heroCards: makeHeroCards('A','A',false),
      heroPos: 'BTN', villainPos: 'BB', villainAction: 'Check', potLabel: pot,
    }
  },

  // 20 — OOP c-bet: sizing maior que IP (novo)
  () => {
    const board = pick(MEDIUM_DRY_BOARDS)
    const [r1, r2] = pick(TOP_PAIR_HANDS)
    const pot = pick(POT_FLOP)
    return {
      q: `Flop ${board[0]}-${board[1]}-${board[2]}. Voce esta OOP (BB) e quer c-bet como o pre-flop aggressor. Qual sizing vs IP?`,
      a: '50-66% pot (OOP precisa de sizing maior para compensar desvantagem posicional)',
      b: '25-33% pot (mesmo sizing do IP)',
      aCorrect: true,
      explanation: 'OOP tem desvantagem posicional — precisa de sizing maior para compensar. IP pode usar 25-33% com frequencia alta. OOP geralmente usa 50-66% para gerar mais fold equity e proteger melhor a mao.',
      boardCards: makeRainbowBoard(board), heroCards: makeHeroCards(r1, r2, false),
      heroPos: 'BB', villainPos: 'BTN', villainAction: '', potLabel: pot,
    }
  },

  // 21 — River check-raise sizing (novo)
  () => {
    const board = pick(RIVER_WET_BOARDS)
    const [r1, r2] = pick(TOP_PAIR_HANDS)
    const pot = pick(POT_RIVER)
    return {
      q: `River ${board[0]}-${board[1]}-${board[2]}-${board[3]}-${board[4]}. Vilao bettou 50% pot. Voce quer check-raise com nuts. Qual sizing?`,
      a: '2.5x-3x o bet do vilao (overbet proporcional — polarizado, maximiza valor)',
      b: 'Min-raise (2x) — pressiona sem arriscar demais',
      aCorrect: true,
      explanation: 'Check-raise no river com nuts deve ser grande: 2.5x-3x ou mais. Check-raise polarizado (nuts ou bluff). Tamanho menor (min-raise) da pot odds excelentes para o vilao continuar com maos medianas. Maximizar com nuts = bet grande.',
      boardCards: makeRainbowBoard(board), heroCards: makeHeroCards(r1, r2, false),
      heroPos: 'BB', villainPos: 'BTN', villainAction: 'Bet 50%', potLabel: pot,
    }
  },

  // 22 — Sizing de bluff catch vs overbet (novo)
  () => {
    const board = pick(RIVER_DRY_BOARDS)
    const [r1, r2] = pick(MEDIUM_PAIR_HANDS)
    const pot = pick(POT_RIVER)
    return {
      q: `River ${board[0]}-${board[1]}-${board[2]}-${board[3]}-${board[4]}. Voce tem par do meio. Vilao apostou 75% pot. Pot odds = 30% equity. Como usar o sizing do vilao na sua decisao?`,
      a: 'Sizing de 75% e value-heavy — vilao precisa blefar 30% das vezes para call ser correto',
      b: 'Sizing de 75% e tipico de bluff — chamar e sempre correto',
      aCorrect: true,
      explanation: 'Pot odds definem a frequencia de bluff necessaria. Bet 75% = voce precisa de 30% equity (ou 30% bluffs no range do vilao). Sizing medio-grande e value-heavy, nao sinal de bluff. Analise matematicamente antes de chamar.',
      boardCards: makeRainbowBoard(board), heroCards: makeHeroCards(r1, r2, false),
      heroPos: 'BB', villainPos: 'BTN', villainAction: 'Bet 75%', potLabel: pot,
    }
  },

  // 23 — Flop seco com overpair: sizing choice (novo)
  () => {
    const board = pick(DRY_LOW_BOARDS)
    const [r1, r2] = pick(OVERPAIR_HANDS)
    const pot = pick(POT_FLOP)
    return {
      q: `Flop ${board[0]}-${board[1]}-${board[2]} rainbow. Voce IP tem ${r1}${r2} (overpair). Qual sizing?`,
      a: '25-33% pot (board seco com range advantage — overpair usa sizing de range)',
      b: '75% pot (overpair e forte — bet grande para proteger)',
      aCorrect: true,
      explanation: 'Overpair em board seco baixo NAO precisa de protecao — draws sao raros. Range advantage dita sizing pequeno com frequencia alta. Variar para 75% com overpairs doa informacao. Sizing consistente = GTO.',
      boardCards: makeRainbowBoard(board), heroCards: makeHeroCards(r1, r2, false),
      heroPos: 'BTN', villainPos: 'BB', villainAction: 'Check', potLabel: pot,
    }
  },

  // 24 — Blocking bet OOP (novo)
  () => {
    const board = pick(RIVER_WET_BOARDS)
    const [r1, r2] = pick(MEDIUM_PAIR_HANDS)
    const pot = pick(POT_RIVER)
    return {
      q: `River ${board[0]}-${board[1]}-${board[2]}-${board[3]}-${board[4]}. Voce OOP tem par medio (mao marginal). Vilao pode bet grande. Qual a jogada com blocking bet?`,
      a: '25-30% pot (blocking bet — bloqueia bet maior do vilao, define preco barato)',
      b: 'Check e aguardar — blocking bet so funciona com nuts',
      aCorrect: true,
      explanation: 'Blocking bet OOP com mao marginal: apostar pequeno (25-30%) "bloqueia" o vilao de apostar grande. Voce controla o preco. Se vilao raise, pode foldar. Se paga, voce chegou ao showdown barato. Util com maos medianas OOP.',
      boardCards: makeRainbowBoard(board), heroCards: makeHeroCards(r1, r2, false),
      heroPos: 'BB', villainPos: 'BTN', villainAction: '', potLabel: pot,
    }
  },

  // 25 — 3-bet pot: sizing de c-bet maior (novo)
  () => {
    const board = pick(DRY_HIGH_BOARDS)
    const [r1, r2] = pick(OVERPAIR_HANDS)
    return {
      q: `Flop ${board[0]}-${board[1]}-${board[2]} em pote de 3-bet (25bb). BTN 3-bettou, BB chamou. BTN tem ${r1}${r2}. Sizing de c-bet?`,
      a: '33-40% pot (pote de 3-bet = SPR baixo, sizing menor ja e suficiente)',
      b: '66-75% pot (pote grande justifica sizing grande)',
      aCorrect: true,
      explanation: 'Em potes de 3-bet o SPR (Stack to Pot Ratio) e baixo. Sizing menor (33-40%) ja constroi pote adequadamente e da boas pot odds pro vilao chamar com maos inferiores. Sizing muito grande pode assustar e induzir folds indesejados.',
      boardCards: makeRainbowBoard(board), heroCards: makeHeroCards(r1, r2, false),
      heroPos: 'BTN', villainPos: 'BB', villainAction: 'Check', potLabel: '25bb',
    }
  },

  // 26 — Turn check com set para induzir (novo)
  () => {
    const board = pick(TURN_BOARDS)
    const pot = pick(POT_TURN)
    return {
      q: `Turn ${board[0]}-${board[1]}-${board[2]}-${board[3]}. Voce IP tem set. Vilao checkou. Qual o risco de sempre bettar 100% pot com nuts?`,
      a: 'Sizing muito grande com muita frequencia colapsa o range — vilao so chama com maos muito fortes',
      b: 'Nenhum risco — nuts deve sempre maximizar sizing',
      aCorrect: true,
      explanation: 'Sizing extremo com nuts SEMPRE pode colapsar o range: vilao aprende que sizing grande = nuts e folda tudo mais. GTO equilibra bets de valor com bluffs no mesmo sizing. Nuts as vezes usa sizing menor para induzir mais calls.',
      boardCards: makeRainbowBoard(board), heroCards: makeHeroCards('J','J',false),
      heroPos: 'BTN', villainPos: 'BB', villainAction: 'Check', potLabel: pot,
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
      title: 'Sizing e Linguagem',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            Cada sizing de aposta <strong style={{ color: '#f5a623' }}>conta uma historia</strong>. O tamanho
            que voce escolhe comunica informacao sobre seu range — conscientemente ou nao.
          </p>
          <div className="rounded-lg p-4 mb-4" style={{ background: '#222225' }}>
            <div style={{ color: '#fdfdfd', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>O principio:</div>
            <div style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 1.8 }}>
              <strong style={{ color: '#4fce82' }}>Range advantage</strong> → sizing pequeno, frequencia alta<br/>
              <strong style={{ color: '#e5484d' }}>Nut advantage</strong> → sizing grande, frequencia baixa<br/>
              <strong style={{ color: '#f5a623' }}>Protecao</strong> → sizing medio, maos vulneraveis
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Cada Sizing Explicado',
      content: (
        <div>
          <div className="rounded-lg overflow-hidden mb-4" style={{ border: '1px solid #2a2a2e' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#222225' }}>
                  <th style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>Sizing</th>
                  <th style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>Quando usar</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['25%', 'Range advantage em board seco, c-bet frequente', '#4fce82'],
                  ['33%', 'C-bet padrao com range, info barata', '#4fce82'],
                  ['50%', 'Protecao moderada, top pair bom kicker', '#f5a623'],
                  ['66-75%', 'Valor forte, protecao em board umido, semi-bluff', '#e5484d'],
                  ['100%+', 'Polarizado puro: nuts ou bluff, vilao capped', '#e5484d'],
                ].map(([size, quando, color], i) => (
                  <tr key={i} style={{ borderTop: '1px solid #2a2a2e' }}>
                    <td style={{ color, fontSize: 14, padding: '8px 12px', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{size}</td>
                    <td style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px' }}>{quando}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
    {
      title: 'Sizing por Street',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            Sizings escalam naturalmente pelas streets:
          </p>
          <div className="space-y-2 mb-4">
            {[
              { street: 'Flop', range: '25-50%', why: 'Ranges amplos, muitas maos pra apostar, sizing menor', color: '#4fce82' },
              { street: 'Turn', range: '50-75%', why: 'Ranges mais definidos, valor mais claro, sizing cresce', color: '#f5a623' },
              { street: 'River', range: '66-100%+', why: 'Ranges polarizados, decisao final, sizing maximo', color: '#e5484d' },
            ].map((item, i) => (
              <div key={i} className="rounded-lg px-4 py-3" style={{ background: '#222225' }}>
                <div className="flex items-center gap-3 mb-1">
                  <div style={{ color: item.color, fontSize: 14, fontWeight: 700 }}>{item.street}</div>
                  <div style={{ color: '#fdfdfd', fontSize: 13, fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{item.range}</div>
                </div>
                <div style={{ color: '#676671', fontSize: 12 }}>{item.why}</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg p-4" style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)' }}>
            <div style={{ color: '#f5a623', fontSize: 13, fontWeight: 600 }}>
              Sizing escalando = construcao de pote natural. Nao aposte 75% no flop e 33% no turn.
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Overbet e Min-bet',
      content: (
        <div>
          <div className="rounded-lg p-4 mb-3" style={{ background: 'rgba(229,72,77,0.08)', border: '1px solid rgba(229,72,77,0.2)' }}>
            <div style={{ color: '#e5484d', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Overbet (100%+ pot)</div>
            <div style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 1.7 }}>
              Range ultra-polarizado. Funciona quando:<br/>
              - Vilao tem range capped (nao pode ter nuts)<br/>
              - Voce pode representar as nuts de forma credivel<br/>
              - Maximiza valor com nuts, maximiza fold equity com bluffs
            </div>
          </div>
          <div className="rounded-lg p-4 mb-4" style={{ background: 'rgba(10,132,215,0.08)', border: '1px solid rgba(10,132,215,0.2)' }}>
            <div style={{ color: '#0a84d7', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Min-bet (25-30%)</div>
            <div style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 1.7 }}>
              Valor ultra-fino ou blocking bet:<br/>
              - Quer ser pago por maos piores sem arriscar muito<br/>
              - "Bloqueia" apostas maiores do vilao (blocking bet OOP)<br/>
              - Nao recomendado como bluff (sizing nao gera fold equity)
            </div>
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
            Modulo 26 - Sizing Theory
          </h1>
          <p style={{ color: '#676671', fontSize: 13, marginBottom: 20 }}>
            Cada sizing conta uma historia — saiba quando usar cada um
          </p>

          <div className="flex gap-1 mb-6 overflow-x-auto">
            {sections.map((s, i) => (
              <button key={i} onClick={() => setSection(i)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
                style={{
                  background: section === i ? 'rgba(245,166,35,0.12)' : 'transparent',
                  color: section === i ? '#f5a623' : '#676671',
                  border: `1px solid ${section === i ? '#f5a623' : 'transparent'}`,
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
  const progress = getModuleProgress(26)

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
    recordAnswer(26, isCorrect, newStreak, { tp: 'siz' })
    setResult({ isCorrect, explanation: scenario.explanation, chosenId: optionId })
  }, [result, scenario, streak, recordAnswer])

  const handleNext = useCallback(() => {
    const nextHand = handNum + 1
    if (nextHand >= 10) {
      const accuracy = Math.round((sessionCorrect / 10) * 100)
      recordSession(26, accuracy)
      setShowReview(true)
    } else {
      setHandNum(nextHand)
    }
    setResult(null)
    setScenario(generateScenario())
  }, [handNum, sessionCorrect, recordSession])

  const acc = progress.totalAnswered > 0 ? progress.accuracy : 0

  if (showReview) {
    return <SessionReview moduleId={26} sessionCorrect={sessionCorrect} sessionTotal={10} onContinue={() => { setHandNum(0); setSessionCorrect(0); setShowReview(false); setStreak(0) }} />
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
              contextTitle="Sizing Theory"
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
                {!result.isCorrect && <DecisionTree scenario={{ ...scenario, moduleId: 26 }} result={result} />}
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

export default function Module26() {
  const { progress, markLessonRead, getModuleProgress } = useProgress()
  const mod = progress.modules[26]
  const modProgress = getModuleProgress(26)
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
        {view === 'lesson' ? <Lesson onComplete={() => { markLessonRead(26); setView('trainer') }} /> : <Trainer />}
      </div>
    </div>
  )
}
