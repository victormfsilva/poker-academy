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
// MODULO 27 — Blocker Effects Avancados
// ================================================================

// Pools parametrizados
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function suitName(s) { return s === 'h' ? 'copas' : s === 'd' ? 'ouros' : s === 'c' ? 'paus' : 'espadas' }

const FLUSH_HIGHS = [['K','Q','7'],['A','J','5'],['Q','T','4'],['K','J','6'],['A','9','3'],['Q','8','4'],['K','T','5'],['A','Q','6'],['J','9','3'],['K','8','4']]
const STRAIGHT_BOARDS = [
  { ranks: ['Q','J','T','4','2'], nut: 'AK', nutName: 'broadway' },
  { ranks: ['J','T','9','3','7'], nut: 'KQ', nutName: 'K-high straight' },
  { ranks: ['T','9','8','2','K'], nut: 'QJ', nutName: 'Q-high straight' },
  { ranks: ['9','8','7','2','A'], nut: 'JT', nutName: 'J-high straight' },
  { ranks: ['8','7','6','3','K'], nut: 'T9', nutName: 'T-high straight' },
  { ranks: ['A','K','Q','J','4'], nut: 'AT', nutName: 'broadway' },
]
const CONNECTED_LOW = [['T','9','7','6','2'],['9','8','6','5','K'],['8','7','5','4','A'],['9','8','7','3','Q'],['T','9','8','4','2']]
const PAIRED_BOARDS = [['8','8','K','4','2'],['9','9','A','5','3'],['7','7','Q','3','2'],['T','T','K','5','4'],['6','6','J','4','2'],['Q','Q','7','3','2']]
const DRY_RIVER = [['A','K','8','5','3'],['K','J','7','4','2'],['A','Q','6','3','9'],['Q','T','5','2','8'],['A','J','7','3','6'],['K','T','8','4','2']]
const IP_POS = ['BTN','CO','HJ']
const OOP_POS = ['BB','SB']
const EP_POS = ['UTG','LJ','HJ']
const LP_POS = ['CO','BTN']
const POTS_SMALL = ['15bb','18bb','20bb','22bb']
const POTS_MED = ['25bb','28bb','30bb','35bb']
const POTS_BIG = ['40bb','45bb','50bb','60bb']
const BIG_BETS = ['Bet 75%','Bet 100%','Overbet','All-in']
const MED_BETS = ['Bet 50%','Bet 66%','Bet 75%']

const SCENARIOS = [
  // 1. Nut flush blocker bluff — parametrizado
  () => {
    const fs = randSuit()
    const board = pick(FLUSH_HIGHS)
    const kicker = pick(['3','4','5','6','2'])
    return {
      q: `River em board ${board[0]}-${board[1]}-${board[2]} com 3 ${suitName(fs)}. Voce tem A${fs}${kicker}x (blocker do nut flush) sem par. Blefar?`,
      a: 'Sim — voce bloqueia o nut flush, vilao raramente tem nuts',
      b: 'Nao — voce nao tem nada',
      aCorrect: true,
      explanation: `Ter o A${fs} bloqueia o nut flush do vilao. Ele nao pode ter a melhor mao possivel. Isso faz seu blefe mais credivel e reduz a chance dele chamar. Blocker de nuts = otimo bluff candidate.`,
      boardCards: [board[0]+fs, board[1]+fs, board[2]+fs, pick(['4','5','6','3'])+randSuitExcluding(fs), pick(['2','3','9'])+randSuitExcluding(fs)], heroCards: ['A'+fs, kicker+randSuitExcluding(fs)], heroPos: pick(IP_POS), villainPos: pick(OOP_POS), villainAction: 'Check', potLabel: pick(POTS_MED),
    }
  },
  // 2. Overpair ruim blocker pra call — parametrizado
  () => {
    const board = pick(DRY_RIVER)
    const topCard = board[0]
    const pair = topCard === 'A' ? 'KK' : topCard === 'K' ? 'QQ' : 'JJ'
    const r = pair[0]
    return {
      q: `River em board ${board.join('-')} rainbow. Voce tem ${pair}. Vilao betta grande. O que seus blockers dizem?`,
      a: `Voce bloqueia ${pair} mas NAO bloqueia ${topCard === 'A' ? 'AA, AK, sets' : 'maos fortes (sets, dois pares)'} — call e ruim`,
      b: `${pair} e forte, sempre call`,
      aCorrect: true,
      explanation: `Seus ${pair} bloqueiam ${r}x (vilao tem menos ${pair}, ${r}Q, ${r}J), mas voce NAO bloqueia as maos que te vencem (${topCard}x, sets). Bet grande no river geralmente e valor com maos que te vencem. Blockers nao ajudam no call.`,
      boardCards: makeRainbowBoard(board), heroCards: makeHeroCards(r,r,false), heroPos: pick(IP_POS), villainPos: pick(OOP_POS), villainAction: pick(BIG_BETS), potLabel: pick(POTS_MED),
    }
  },
  // 3. Tem nuts + bloqueia nuts do vilao — value bet grande
  () => {
    const spot = pick(STRAIGHT_BOARDS)
    return {
      q: `River: board ${spot.ranks.join('-')}. Voce tem ${spot.nut} (${spot.nutName}). Vilao checou. Qual o blocker effect?`,
      a: `Voce bloqueia ${spot.nut} — vilao nao pode ter a mesma straight. Aposte por valor (sizing depende do que ele paga)`,
      b: 'Blocker nao importa quando voce tem nuts',
      aCorrect: true,
      explanation: `Voce TEM a nuts (${spot.nut} = ${spot.nutName}). Voce bloqueia as maos que PAGARIAM grande (outras straights). Aposte por valor, mas considere sizing medio (33-50%) para extrair de pares e dois pares que nao foldam.`,
      boardCards: makeRainbowBoard(spot.ranks), heroCards: makeHeroCards(spot.nut[0], spot.nut[1], false), heroPos: pick(IP_POS), villainPos: pick(OOP_POS), villainAction: 'Check', potLabel: pick(POTS_MED),
    }
  },
  // 4. Par bloqueia straight do vilao — bom call
  () => {
    const spots = [
      { board: ['9','8','5','4','2'], pair: '7', blocks: '76' },
      { board: ['T','9','6','5','3'], pair: '8', blocks: '87' },
      { board: ['8','7','4','3','K'], pair: '6', blocks: '65' },
      { board: ['J','T','7','6','2'], pair: '9', blocks: '98' },
      { board: ['9','8','5','4','A'], pair: '7', blocks: '76' },
    ]
    const spot = pick(spots)
    return {
      q: `River em board ${spot.board.join('-')}. Vilao betta overbet. Voce tem ${spot.pair}${spot.pair} (bloqueia straight ${spot.blocks}). Call ou fold?`,
      a: `Melhor call — voce bloqueia ${spot.blocks} (straight), reduz combos de valor do vilao`,
      b: `Fold — ${spot.pair}${spot.pair} e muito fraco`,
      aCorrect: true,
      explanation: `Seus ${spot.pair}${spot.pair} bloqueiam ${spot.blocks}s (a straight mais provavel nesse board). Isso reduz os combos de valor do vilao. Voce nao bloqueia bluffs tipicos. Blocker favoravel = call.`,
      boardCards: makeRainbowBoard(spot.board), heroCards: makeHeroCards(spot.pair, spot.pair, false), heroPos: pick(OOP_POS), villainPos: pick(IP_POS), villainAction: 'Overbet', potLabel: pick(POTS_SMALL),
    }
  },
  // 5. Ax bloqueia bluffs — ruim pra call
  () => {
    const kickers = ['J','T','9','8']
    const kicker = pick(kickers)
    const boards = [['A','T','7','3','K'],['A','J','5','2','Q'],['A','8','6','3','K'],['A','9','4','2','J'],['A','Q','7','3','T']]
    const board = pick(boards)
    return {
      q: `River. Vilao betta grande. Voce tem A${kicker} em board ${board.join('-')}. Chamar?`,
      a: `A${kicker} bloqueia bluffs (maos com A que o vilao desistiria) — nao e bom call`,
      b: 'Top pair e sempre call',
      aCorrect: true,
      explanation: `Ter A${kicker} e ruim pra call: voce bloqueia maos que o vilao DESISTIRIA (bluffs com A). Voce NAO bloqueia maos fortes (sets, dois pares). Blockers desfavoraveis = nao ideal pra call.`,
      boardCards: makeRainbowBoard(board), heroCards: makeHeroCards('A', kicker, false), heroPos: pick(OOP_POS), villainPos: pick(IP_POS), villainAction: pick(BIG_BETS), potLabel: pick(POTS_MED),
    }
  },
  // 6. Conceito: blefar = bloqueie nuts
  () => {
    const board = pick([['J','8','4','2','6'],['Q','7','3','5','9'],['K','6','2','4','T'],['A','8','3','5','J'],['Q','9','4','2','7']])
    const hero = pick([['A','Q'],['A','J'],['A','T'],['K','Q'],['A','9']])
    return {
      q: 'Conceito: qual mao e melhor pra BLEFAR no river — uma que bloqueia as nuts ou que bloqueia bluffs?',
      a: 'Bloqueia as nuts (remove maos fortes do vilao = ele folda mais)',
      b: 'Bloqueia bluffs (remove lixo do vilao)',
      aCorrect: true,
      explanation: 'Pra BLEFAR voce quer bloquear as NUTS do vilao. Se voce tem o As em board com flush possivel, vilao nao pode ter nut flush e tera mais bluffs/maos medianas no range — que foldam ao seu blefe.',
      boardCards: makeRainbowBoard(board), heroCards: makeHeroCards(hero[0], hero[1], false), heroPos: pick(IP_POS), villainPos: pick(OOP_POS), villainAction: 'Check', potLabel: pick(POTS_SMALL),
    }
  },
  // 7. Conceito: call = bloqueie valor
  () => {
    const board = pick([['K','9','5','3','T'],['Q','8','4','2','J'],['A','7','3','5','K'],['J','6','2','4','Q'],['T','7','3','5','A']])
    const pair = pick(['T','9','8','7','J'])
    return {
      q: 'Conceito: qual mao e melhor pra CALL no river — uma que bloqueia valor ou que bloqueia bluffs?',
      a: 'Bloqueia VALOR do vilao (remove nuts, fica mais bluffs proporcionalmente)',
      b: 'Bloqueia bluffs (vilao blefa menos)',
      aCorrect: true,
      explanation: 'Pra CALL voce quer bloquear as maos de VALOR do vilao. Se voce bloqueia combos que te vencem, a proporcao de bluffs no range dele aumenta. Nunca bloqueie bluffs quando quer call — isso REDUZ a chance dele blefar.',
      boardCards: makeRainbowBoard(board), heroCards: makeHeroCards(pair, pair, false), heroPos: pick(OOP_POS), villainPos: pick(IP_POS), villainAction: pick(MED_BETS), potLabel: pick(POTS_MED),
    }
  },
  // 8. Blocker duplo (straight + flush) — bluff spot
  () => {
    const fs = randSuit()
    const configs = [
      { board: ['K','Q','J'], blocker: 'T', blockDesc: 'T bloqueia straight (AT, T9) + naipe bloqueia flush' },
      { board: ['Q','J','T'], blocker: 'K', blockDesc: 'K bloqueia straight (AK, KQ) + naipe bloqueia flush' },
      { board: ['J','T','9'], blocker: 'Q', blockDesc: 'Q bloqueia straight (KQ, Q8) + naipe bloqueia flush' },
      { board: ['A','K','Q'], blocker: 'J', blockDesc: 'J bloqueia straight (JT) + naipe bloqueia flush' },
    ]
    const cfg = pick(configs)
    return {
      q: `Board ${cfg.board.join('-')}-${pick(['5','4','3'])}-${pick(['2','3','6'])} (3 ${suitName(fs)}). Voce tem ${cfg.blocker}${fs} sem par. Blefar no river?`,
      a: `Sim — ${cfg.blockDesc}. Blocker duplo!`,
      b: 'Nao — voce nao tem nada',
      aCorrect: true,
      explanation: `${cfg.blockDesc}. Blocker duplo (straight + flush) faz essa uma das melhores maos pra blefar nesse board. Remove combos de valor e flush do vilao simultaneamente.`,
      boardCards: [cfg.board[0]+fs, cfg.board[1]+fs, cfg.board[2]+fs, pick(['5','4','3'])+randSuitExcluding(fs), pick(['2','3','6'])+randSuitExcluding(fs)], heroCards: [cfg.blocker+fs, '2'+randSuitExcluding(fs)], heroPos: pick(IP_POS), villainPos: pick(OOP_POS), villainAction: 'Check', potLabel: pick(POTS_MED),
    }
  },
  // 9. Board pareado — trips bloqueia quads
  () => {
    const bp = pick(PAIRED_BOARDS)
    const pairRank = bp[0]
    const kicker = pick(['9','T','J','Q','A','K'].filter(r => r !== pairRank && !bp.includes(r)))
    return {
      q: `Board pareado: ${bp.join('-')}. Voce tem ${pairRank}x (trips). Vilao faz overbet. Qual o blocker effect?`,
      a: `Voce bloqueia quads (${pairRank}${pairRank} impossivel) e trips — vilao quase nunca te vence`,
      b: 'Overbet = sempre forte, fold',
      aCorrect: true,
      explanation: `Voce tem um ${pairRank} — isso torna ${pairRank}${pairRank} (quads) impossivel pro vilao e reduz combos de trips. Seu blocker torna o call muito lucrativo.`,
      boardCards: [pairRank+randSuit(), pairRank+randSuit(), ...makeRainbowBoard(bp.slice(2))], heroCards: [pairRank+randSuit(), kicker+randSuit()], heroPos: pick(OOP_POS), villainPos: pick(IP_POS), villainAction: 'Overbet', potLabel: pick(POTS_MED),
    }
  },
  // 10. AA nao bloqueia nada em board conectado
  () => {
    const board = pick(CONNECTED_LOW)
    return {
      q: `Voce tem AA no river em board ${board.join('-')}. Vilao shova. Seus AA bloqueiam algo relevante?`,
      a: 'Nao — AA nao bloqueia straights nem sets. Call e baseado em pot odds puro.',
      b: 'AA bloqueia AA do vilao, entao call',
      aCorrect: true,
      explanation: 'AA nao bloqueia NADA relevante nesse board conectado. Straights, sets e duas-pairs nao sao afetados. Quando seus blockers nao ajudam, a decisao volta pra pot odds e leitura pura.',
      boardCards: makeRainbowBoard(board), heroCards: makeHeroCards('A','A',false), heroPos: pick(IP_POS), villainPos: pick(OOP_POS), villainAction: 'All-in', potLabel: pick(POTS_BIG),
    }
  },
  // 11. Unblocker conceito
  () => {
    const board = pick([['Q','8','5','3','K'],['J','7','4','2','A'],['T','6','3','2','K'],['Q','9','5','2','J'],['K','8','4','3','T']])
    const pair = pick(['9','8','7','6','T'])
    return {
      q: `Conceito de "unblocker": voce NAO tem cartas que o vilao usaria pra blefar (draws perdidos). Isso e bom pra call?`,
      a: 'Sim — unblocking bluffs = vilao pode ter mais bluffs = melhor pra call',
      b: 'Nao — nao importa o que voce nao tem',
      aCorrect: true,
      explanation: 'Unblocker e tao importante quanto blocker. Se voce NAO tem cartas de bluff do vilao (flush draws perdidos, straight draws perdidos), ele PODE ter essas maos. Mais bluffs no range dele = seu call e melhor.',
      boardCards: makeRainbowBoard(board), heroCards: makeHeroCards(pair, pair, false), heroPos: pick(OOP_POS), villainPos: pick(IP_POS), villainAction: pick(BIG_BETS), potLabel: pick(POTS_SMALL),
    }
  },
  // 12. Nao ter carta do naipe — neutro/positivo pra call
  () => {
    const fs = randSuit()
    const high = pick(['Q','K','A','J'])
    const mid = pick(['8','9','T','7'])
    const low = pick(['4','3','2','5'])
    const pair = pick(['T','9','8','J'])
    return {
      q: `Board com flush possivel (3 ${suitName(fs)}). Vilao betta river. Voce NAO tem nenhuma carta de ${suitName(fs)}. Isso e bom ou ruim pra call?`,
      a: 'BOM — voce nao bloqueia draws perdidos do vilao (bluffs dele)',
      b: 'RUIM — voce nao bloqueia nada',
      aCorrect: true,
      explanation: `Nao ter cartas de ${suitName(fs)} e NEUTRO a POSITIVO. Voce nao bloqueia bluffs (draws perdidos com 1 carta do naipe) E nao bloqueia valor. A decisao volta pra frequencia e sizing.`,
      boardCards: [high+fs, mid+fs, low+randSuitExcluding(fs), pick(['3','4','5'])+randSuitExcluding(fs), pick(['7','6','9'])+fs], heroCards: makeHeroCards(pair, pair, false), heroPos: pick(OOP_POS), villainPos: pick(IP_POS), villainAction: pick(MED_BETS), potLabel: pick(POTS_MED),
    }
  },
  // 13. Blocker de straight pra bluff — T em broadway board
  () => {
    const board = pick([['A','K','Q','J','4'],['A','K','Q','J','6'],['A','K','Q','J','3'],['A','K','Q','J','8']])
    const kicker = pick(['9','8','7','6','5'])
    return {
      q: `River board ${board.join('-')}. Voce tem T${kicker} (sem straight). Blefar?`,
      a: 'Sim — T bloqueia a nuts (AT = broadway). Vilao nao tem a melhor straight.',
      b: 'Nao — voce tem T-high, nao vale blefar',
      aCorrect: true,
      explanation: `O T na sua mao bloqueia AT (a nut straight broadway). Vilao tem menos combos de straight. T como blocker e suficiente pra tornar esse um bom bluff spot.`,
      boardCards: makeRainbowBoard(board), heroCards: makeHeroCards('T', kicker, false), heroPos: pick(IP_POS), villainPos: pick(OOP_POS), villainAction: 'Check', potLabel: pick(POTS_MED),
    }
  },
  // 14. Regra geral blockers
  () => {
    const board = pick([['K','J','7','4','2'],['Q','T','6','3','8'],['A','9','5','2','J'],['K','8','4','2','T']])
    return {
      q: 'Regra geral de blockers pra decisoes no river:',
      a: 'Blefar = bloqueie valor. Call = bloqueie valor + unblock bluffs.',
      b: 'Sempre considere blockers igualmente pra blefe e call',
      aCorrect: true,
      explanation: 'Resumo: BLEFAR = bloqueie nuts/valor (vilao folda mais). CALL = bloqueie valor do vilao E nao bloqueie bluffs (proporcao de bluffs aumenta). Os dois lados sao complementares mas funcionam diferente.',
      boardCards: makeRainbowBoard(board), heroCards: makeHeroCards('A','9',false), heroPos: pick(IP_POS), villainPos: pick(OOP_POS), villainAction: pick(BIG_BETS), potLabel: pick(POTS_MED),
    }
  },
  // 15. KQs/KJs bloqueia folds — ruim pra 3-bet bluff
  () => {
    const heroPos = pick(['BTN','CO','HJ','SB','BB'])
    const villainPos = pick(['UTG','LJ','HJ','CO','BTN'])
    const hand = pick(['KQs','KJs','QJs','KTs','QTs'])
    const r1 = hand[0]; const r2 = hand[1]
    return {
      q: `${villainPos} fez raise. Voce esta no ${heroPos} com ${hand}. ${hand} e um bom 3-bet blefe?`,
      a: `Nao — ${hand} bloqueia maos que FOLDAM (${r2}Ts, ${r1}9s), nao maos que continuam`,
      b: `Sim — ${hand} e forte o suficiente`,
      aCorrect: true,
      explanation: `${hand} bloqueia maos que voce QUER que ele folde. Para 3-bet blefe, bloqueie maos que CONTINUAM (AA, KK, AK) — nao maos que foldam. Use A5s/A4s como 3-bet blefe.`,
      boardCards: [], heroCards: makeHeroCards(r1, r2, true), heroPos, villainPos, villainAction: 'Raise 2.5x', potLabel: 'Pre-flop',
    }
  },
  // 16. A5s/A4s bom 3-bet bluff
  () => {
    const hand = pick(['A5s','A4s','A3s','A2s'])
    const heroPos = pick(['BB','SB','BTN','CO'])
    const villainPos = pick(['BTN','CO','HJ','LJ','UTG'])
    const kicker = hand[1]
    return {
      q: `${villainPos} fez raise. Voce esta no ${heroPos} com ${hand}. Bom 3-bet blefe?`,
      a: 'Sim — Ace bloqueia AA (de 6 pra 3 combos) e AK/AQ',
      b: 'Nao — mao muito fraca pra 3-bet',
      aCorrect: true,
      explanation: `${hand} e excelente para 3-bet blefe! O Ace bloqueia AA (de 6 combos para 3) e AK/AQ. Alem disso, tem equity de backup (wheel potential, suited).`,
      boardCards: [], heroCards: makeHeroCards('A', kicker, true), heroPos, villainPos, villainAction: 'Raise 2.5x', potLabel: 'Pre-flop',
    }
  },
  // 17. Straight blocker afeta sizing do value bet
  () => {
    const spot = pick(STRAIGHT_BOARDS)
    return {
      q: `River: board ${spot.ranks.join('-')}. Voce tem ${spot.nut} (${spot.nutName}). Vilao checou. Qual sizing?`,
      a: `Aposta media (33-50%) — voce bloqueia ${spot.nut} que pagaria grande`,
      b: 'Aposta grande (75%+) — straight e forte',
      aCorrect: true,
      explanation: `Voce BLOQUEIA ${spot.nut} do vilao — uma das maos que pagaria grande. Com board conectado, aposte menor para extrair de pares e dois pares que nao foldam a bet pequena.`,
      boardCards: makeRainbowBoard(spot.ranks), heroCards: makeHeroCards(spot.nut[0], spot.nut[1], false), heroPos: pick(IP_POS), villainPos: pick(OOP_POS), villainAction: 'Check', potLabel: pick(POTS_MED),
    }
  },
  // 18. AA bloqueia range de 3-bet — 4-bet sizing
  () => {
    const heroPos = pick(['UTG','LJ','CO','BTN','HJ'])
    const villainPos = pick(['BB','SB','BTN','CO'])
    return {
      q: `Voce abriu do ${heroPos} com AA. ${villainPos} fez 3-bet. Como blockers afetam seu 4-bet?`,
      a: '4-bet menor — voce bloqueia AA/AK dele, range de 3-bet e mais leve',
      b: '4-bet grande — AA e nuts, maximize valor',
      aCorrect: true,
      explanation: 'Com AA, voce bloqueia AA (0 combos) e AK (de 16 para 8). O range de 3-bet dele e mais leve. 4-bet menor induz calls de QQ, JJ, AQs que sizing grande assustaria.',
      boardCards: [], heroCards: makeHeroCards('A','A',false), heroPos, villainPos, villainAction: '3-Bet', potLabel: 'Pre-flop',
    }
  },
  // 19. Suit blocker em semi-blefe no flop
  () => {
    const sc = pick(['d','h','s','c'])
    const suitN = suitName(sc)
    const r1 = pick(['7','8','6','5','4'])
    const r2 = pick(['4','3','2','5'].filter(x => x !== r1))
    const high = pick(['A','K','Q','J'])
    const mid = pick(['8','9','T','7'].filter(x => x !== r1))
    return {
      q: `Flop: ${high}-${mid}-3 monotone (${suitN}). SB apostou 33%. Voce no BB com ${r1}${sc}${r2}${sc} (flush draw + 2 blockers). Check-raise?`,
      a: `Sim — flush draw + blockers de ${suitN} reduzem flush draws do vilao`,
      b: 'Nao — apenas call com flush draw',
      aCorrect: true,
      explanation: `Duas cartas de ${suitN} reduzem os combos de flush draw do vilao. Ele provavelmente nao tem flush draw — esta apostando com top pair ou air. Check-raise com fold equity + equity do draw.`,
      boardCards: [high+sc, mid+sc, '3'+sc], heroCards: [r1+sc, r2+sc], heroPos: 'BB', villainPos: 'SB', villainAction: 'Bet 33%', potLabel: pick(['6bb','7bb','8bb']),
    }
  },
  // 20. Blocker de continue vs blocker de fold
  () => {
    const hand1 = pick(['A5s','A4s','A3s','A2s'])
    const hand2 = pick(['KQs','KJs','QJs','KTs','QTs'])
    const heroPos = pick(['BTN','SB','BB','CO'])
    const villainPos = pick(['UTG','LJ','HJ','CO'])
    return {
      q: `${villainPos} fez raise. Voce esta no ${heroPos}. Qual e MELHOR pra 3-bet blefe: ${hand1} ou ${hand2}?`,
      a: `${hand1} — bloqueia continues (AA, AK)`,
      b: `${hand2} — cartas altas sao melhores`,
      aCorrect: true,
      explanation: `${hand1} bloqueia AA e AK (maos que 4-bet ou call). ${hand2} bloqueia maos que FOLDAM. Para 3-bet blefe, bloqueie continues, nao folds.`,
      boardCards: [], heroCards: makeHeroCards('A', hand1[1], true), heroPos, villainPos, villainAction: 'Raise 2.5x', potLabel: 'Pre-flop',
    }
  },
  // 21. Playability vs blockers — suited connectors = call
  () => {
    const hand = pick(['JTs','T9s','98s','QJs','87s','76s'])
    const heroPos = pick(['BTN','CO','HJ'])
    const villainPos = pick(['UTG','LJ','HJ','CO'])
    return {
      q: `${villainPos} fez raise. Voce esta no ${heroPos} com ${hand}. 3-bet blefe ou call?`,
      a: 'Call — mao com muita equity pos-flop, nao bloqueia continues',
      b: '3-bet blefe — suited connector e bom pra blefar',
      aCorrect: true,
      explanation: `${hand} tem muita equity pos-flop (faz straights, flushes) e nao bloqueia as maos de continue (AA, KK, AK). Melhor como call. Reserve 3-bet blefe para A5s/A4s que tem Ace blocker.`,
      boardCards: [], heroCards: makeHeroCards(hand[0], hand[1], true), heroPos, villainPos, villainAction: 'Raise 2.5x', potLabel: 'Pre-flop',
    }
  },
  // 22. Flush blocker pra bluff — K do naipe
  () => {
    const fs = randSuit()
    const board = pick(FLUSH_HIGHS)
    return {
      q: `River com 3 ${suitName(fs)} no board ${board[0]}-${board[1]}-${board[2]}. Voce tem K${fs} (segundo nut flush blocker) sem par. Blefar?`,
      a: 'Sim — K do naipe bloqueia o 2nd nut flush e reduz combos de flush forte',
      b: 'Nao — K nao bloqueia o nut flush (que e com A)',
      aCorrect: true,
      explanation: `K${fs} bloqueia o segundo nut flush. Combinado com o fato de que vilao tambem tem menos flush draws completados, seu blefe funciona bem. Nao e tao forte quanto ter o A do naipe, mas ainda e um bom blocker pra bluff.`,
      boardCards: [board[0]+fs, board[1]+fs, board[2]+fs, pick(['4','5','6'])+randSuitExcluding(fs), pick(['2','3','9'])+randSuitExcluding(fs)], heroCards: ['K'+fs, pick(['4','3','2'])+randSuitExcluding(fs)], heroPos: pick(IP_POS), villainPos: pick(OOP_POS), villainAction: 'Check', potLabel: pick(POTS_MED),
    }
  },
  // 23. Nao bloqueia valor — ruim pra call
  () => {
    const board = pick(CONNECTED_LOW)
    const high = pick(['A','K','Q'])
    return {
      q: `Board ${board.join('-')}. Vilao shova. Voce tem ${high}${high} (overpair). Seus blockers ajudam no call?`,
      a: `Nao — ${high}${high} nao bloqueia straights nem sets desse board. Decisao e de pot odds.`,
      b: `${high}${high} e forte, sempre call`,
      aCorrect: true,
      explanation: `${high}${high} nao bloqueia nada relevante nesse board conectado. As straights e sets possiveis nao envolvem ${high}. Quando seus blockers nao ajudam, a decisao e puramente de pot odds e frequencia de bluff do vilao.`,
      boardCards: makeRainbowBoard(board), heroCards: makeHeroCards(high, high, false), heroPos: pick(IP_POS), villainPos: pick(OOP_POS), villainAction: 'All-in', potLabel: pick(POTS_BIG),
    }
  },
  // 24. Combo math — quantos combos remove
  () => {
    const scenarios = [
      { mao: 'As', tipo: 'AA', antes: 6, depois: 3, desc: 'Voce tem As. AA passa de 6 para 3 combos' },
      { mao: 'As', tipo: 'AKo', antes: 12, depois: 9, desc: 'Voce tem As. AKo passa de 12 para 9 combos' },
      { mao: 'Ks+As', tipo: 'AK', antes: 16, depois: 9, desc: 'Voce tem AK. Outro AK passa de 16 para 9 combos' },
      { mao: 'Ks', tipo: 'KK', antes: 6, depois: 3, desc: 'Voce tem Ks. KK passa de 6 para 3 combos' },
    ]
    const sc = pick(scenarios)
    return {
      q: `Matematica de blockers: voce tem ${sc.mao}. Quantos combos de ${sc.tipo} o vilao pode ter agora?`,
      a: `${sc.depois} combos (antes eram ${sc.antes})`,
      b: `${sc.antes} combos (blocker nao muda nada)`,
      aCorrect: true,
      explanation: `${sc.desc}. Cada blocker remove combos significativamente. Entender a matematica e essencial pra avaliar blockers corretamente.`,
      boardCards: [], heroCards: makeHeroCards('A','K',false), heroPos: pick(IP_POS), villainPos: pick(OOP_POS), villainAction: '', potLabel: 'Conceito',
    }
  },
  // 25. Board seco — blockers menos relevantes
  () => {
    const board = pick(DRY_RIVER)
    const pair = pick(['T','J','Q','9','8'])
    return {
      q: `River em board seco ${board.join('-')}. Vilao betta 50%. Voce tem ${pair}${pair}. Blockers sao decisivos?`,
      a: 'Nao — em board seco sem draws completados, blockers sao menos relevantes. Foque em pot odds.',
      b: 'Sim — blockers sao sempre o fator principal',
      aCorrect: true,
      explanation: `Em boards secos sem flush ou straight completados, blockers tem impacto menor. Nao ha draws perdidos pra unblock nem nuts de flush/straight pra bloquear. A decisao volta pra fundamentals: pot odds, range do vilao, e sizing.`,
      boardCards: makeRainbowBoard(board), heroCards: makeHeroCards(pair, pair, false), heroPos: pick(OOP_POS), villainPos: pick(IP_POS), villainAction: 'Bet 50%', potLabel: pick(POTS_MED),
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
      title: 'O que sao Blockers?',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            <strong style={{ color: '#4fce82' }}>Blockers</strong> sao cartas na sua mao que
            REMOVEM combinacoes possiveis do range do vilao. Se voce tem o A de espadas,
            o vilao NAO pode ter o nut flush de espadas.
          </p>
          <div className="rounded-lg p-4 mb-4" style={{ background: '#222225' }}>
            <div style={{ color: '#fdfdfd', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Exemplo:</div>
            <div style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 1.8 }}>
              Board com 3 copas. Voce tem <strong style={{ color: '#e5484d' }}>Ah</strong> (As de copas).<br/>
              Vilao <strong style={{ color: '#4fce82' }}>nao pode ter nut flush</strong> = voce bloqueia a melhor mao.<br/>
              Isso muda TUDO: seus blefes funcionam mais, seus calls sao melhores.
            </div>
          </div>
          <div className="rounded-lg p-4" style={{ background: 'rgba(79,206,130,0.08)', border: '1px solid rgba(79,206,130,0.2)' }}>
            <div style={{ color: '#4fce82', fontSize: 13, fontWeight: 600 }}>
              Blockers = a razao pela qual a mesma mao pode ser blefe OU fold dependendo das cartas exatas
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Blockers pra Blefar',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            Pra BLEFAR, voce quer <strong style={{ color: '#fdfdfd' }}>bloquear as maos de VALOR</strong> do vilao.
          </p>
          <div className="space-y-2 mb-4">
            {[
              { card: 'As em board com flush', why: 'Bloqueia nut flush — vilao folda mais', color: '#4fce82' },
              { card: 'K em board K-high', why: 'Bloqueia top pair — vilao tem menos calls', color: '#4fce82' },
              { card: 'T em board Q-J-T', why: 'Bloqueia straight (AT) e sets (TT)', color: '#4fce82' },
              { card: 'Nao bloqueia draws perdidos', why: 'Vilao tem mais bluffs = nao precisa blefar', color: '#e5484d' },
            ].map((item, i) => (
              <div key={i} className="rounded-lg px-3 py-2.5" style={{ background: '#222225' }}>
                <div style={{ color: item.color, fontSize: 13, fontWeight: 600 }}>{item.card}</div>
                <div style={{ color: '#676671', fontSize: 12 }}>{item.why}</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg p-4" style={{ background: 'rgba(229,72,77,0.08)', border: '1px solid rgba(229,72,77,0.2)' }}>
            <div style={{ color: '#e5484d', fontSize: 13, fontWeight: 600 }}>
              BLEFAR = bloqueie nuts/valor do vilao. Quanto menos combos fortes ele tem, mais ele folda.
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Blockers pra Call',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            Pra CALL, voce quer <strong style={{ color: '#fdfdfd' }}>bloquear valor E nao bloquear bluffs</strong>.
          </p>
          <div className="space-y-2 mb-4">
            {[
              { card: 'Bloqueia sets/straights', why: 'Vilao tem menos value = mais bluffs proporcionalmente', color: '#4fce82' },
              { card: 'NAO bloqueia draws perdidos', why: 'Vilao ainda pode ter bluffs = seu call e melhor', color: '#4fce82' },
              { card: 'Bloqueia bluffs (flush draws)', why: 'RUIM — reduz bluffs do vilao, ele aposta com mais valor', color: '#e5484d' },
              { card: 'Bloqueia Ax em A-high board', why: 'RUIM — remove bluffs com Ax, vilao aposta mais valor', color: '#e5484d' },
            ].map((item, i) => (
              <div key={i} className="rounded-lg px-3 py-2.5" style={{ background: '#222225' }}>
                <div style={{ color: item.color, fontSize: 13, fontWeight: 600 }}>{item.card}</div>
                <div style={{ color: '#676671', fontSize: 12 }}>{item.why}</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg p-4" style={{ background: 'rgba(79,206,130,0.08)', border: '1px solid rgba(79,206,130,0.2)' }}>
            <div style={{ color: '#4fce82', fontSize: 13, fontWeight: 600 }}>
              CALL = bloqueie valor + unblock bluffs. Se seus blockers fazem o range do vilao ter mais bluffs, call e melhor.
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Matematica dos Blockers',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            Saber <strong style={{ color: '#fdfdfd' }}>quantos combos voce remove</strong> e essencial pra avaliar blockers.
          </p>
          <div className="space-y-2 mb-4">
            {[
              { type: 'Pocket Pairs', normal: '6 combos', blocked: '1 blocker = 3 combos. 2 blockers = 1 combo', color: '#e5484d' },
              { type: 'Offsuit', normal: '12 combos', blocked: 'Cada blocker remove 3 combos', color: '#f5a623' },
              { type: 'Suited', normal: '4 combos', blocked: 'Blocker do mesmo naipe remove 1 combo', color: '#4a90e2' },
            ].map((item, i) => (
              <div key={i} className="rounded-lg px-3 py-2.5" style={{ background: '#222225' }}>
                <div style={{ color: item.color, fontSize: 13, fontWeight: 600 }}>{item.type}: {item.normal}</div>
                <div style={{ color: '#676671', fontSize: 12 }}>{item.blocked}</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg p-4" style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)' }}>
            <div style={{ color: '#f5a623', fontSize: 13, fontWeight: 600 }}>
              Exemplo: voce tem As. AA passa de 6 pra 3 combos. AKo passa de 12 pra 9. Isso muda drasticamente a probabilidade do vilao ter essas maos.
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Blockers Pre-Flop',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            Blockers nao sao so pra pos-flop. <strong style={{ color: '#fdfdfd' }}>No pre-flop, eles definem seus 3-bet blefes</strong>.
          </p>
          <div className="space-y-2 mb-4">
            {[
              { card: 'A5s/A4s/A3s', why: 'Ace bloqueia AA (6→3) e AK/AQ — otimos 3-bet blefes', color: '#4fce82' },
              { card: 'KQs/KJs/QJs', why: 'Bloqueiam maos que FOLDAM — ruins pra 3-bet blefe', color: '#e5484d' },
              { card: 'JTs/T9s/98s', why: 'Muita equity pos-flop — melhor call que 3-bet', color: '#f5a623' },
              { card: 'AA fazendo 4-bet', why: 'Bloqueia AA/AK — 4-bet MENOR induz calls de QQ/JJ', color: '#4a90e2' },
            ].map((item, i) => (
              <div key={i} className="rounded-lg px-3 py-2.5" style={{ background: '#222225' }}>
                <div style={{ color: item.color, fontSize: 13, fontWeight: 600 }}>{item.card}</div>
                <div style={{ color: '#676671', fontSize: 12 }}>{item.why}</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg p-4" style={{ background: 'rgba(79,206,130,0.08)', border: '1px solid rgba(79,206,130,0.2)' }}>
            <div style={{ color: '#4fce82', fontSize: 13, fontWeight: 600 }}>
              Regra: pra 3-bet blefe, bloqueie maos que CONTINUAM (Ace blockers). Nao maos que ja foldariam.
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
                  <th style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>Decisao</th>
                  <th style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>Blocker ideal</th>
                  <th style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>Evitar</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Blefar', 'Bloqueie nuts/valor', 'Nao bloqueie bluffs'],
                  ['Call', 'Bloqueie valor + unblock bluffs', 'Nao bloqueie draws perdidos'],
                  ['Fold', 'Nao bloqueia valor do vilao', 'Bloqueia bluffs do vilao'],
                ].map(([dec, ideal, evitar], i) => (
                  <tr key={i} style={{ borderTop: '1px solid #2a2a2e' }}>
                    <td style={{ color: '#fdfdfd', fontSize: 12, padding: '8px 12px', fontWeight: 600 }}>{dec}</td>
                    <td style={{ color: '#4fce82', fontSize: 12, padding: '8px 12px' }}>{ideal}</td>
                    <td style={{ color: '#e5484d', fontSize: 12, padding: '8px 12px' }}>{evitar}</td>
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
            Modulo 27 - Blocker Effects Avancados
          </h1>
          <p style={{ color: '#676671', fontSize: 13, marginBottom: 20 }}>
            Como suas cartas afetam o range do vilao e mudam a decisao
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
  const progress = getModuleProgress(27)

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
    recordAnswer(27, isCorrect, newStreak, { tp: 'blk' })
    setResult({ isCorrect, explanation: scenario.explanation, chosenId: optionId })
  }, [result, scenario, streak, recordAnswer])

  const handleNext = useCallback(() => {
    const nextHand = handNum + 1
    if (nextHand >= 10) {
      const accuracy = Math.round((sessionCorrect / 10) * 100)
      recordSession(27, accuracy)
      setShowReview(true)
    } else {
      setHandNum(nextHand)
    }
    setResult(null)
    setScenario(generateScenario())
  }, [handNum, sessionCorrect, recordSession])

  const acc = progress.totalAnswered > 0 ? progress.accuracy : 0

  if (showReview) {
    return <SessionReview moduleId={27} sessionCorrect={sessionCorrect} sessionTotal={10} onContinue={() => { setHandNum(0); setSessionCorrect(0); setShowReview(false); setStreak(0) }} />
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
              contextTitle="Blocker Effects"
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
                {!result.isCorrect && <DecisionTree scenario={{ ...scenario, moduleId: 27 }} result={result} />}
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

export default function Module27() {
  const { progress, markLessonRead, getModuleProgress } = useProgress()
  const mod = progress.modules[27]
  const modProgress = getModuleProgress(27)
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
        {view === 'lesson' ? <Lesson onComplete={() => { markLessonRead(27); setView('trainer') }} /> : <Trainer />}
      </div>
    </div>
  )
}
