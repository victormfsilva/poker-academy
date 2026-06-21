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
// MODULO 25 — Multistreet Planning
// ================================================================

// ================================================================
// POOLS para parametrizacao
// ================================================================

const DRY_BOARDS = [
  ['K','7','2'],['A','8','3'],['J','6','2'],['Q','9','3'],['T','5','2'],
  ['K','8','3'],['A','7','2'],['J','5','2'],['Q','6','3'],['T','4','2'],
  ['K','6','2'],['A','9','4'],['J','7','3'],['Q','8','2'],['9','4','2'],
]
const WET_BOARDS = [
  ['J','T','9'],['T','9','8'],['9','8','7'],['8','7','6'],['J','9','8'],
  ['Q','J','T'],['K','Q','J'],['T','8','7'],['9','7','6'],['J','8','7'],
]
const SEMI_WET_BOARDS = [
  ['Q','J','5'],['J','T','4'],['T','9','3'],['K','J','8'],['A','J','T'],
  ['Q','T','6'],['K','T','7'],['J','9','5'],['T','8','4'],['Q','9','6'],
]
const PAIRED_BOARDS = [
  ['A','A','7'],['K','K','4'],['Q','Q','8'],['J','J','5'],['T','T','3'],
  ['9','9','2'],['8','8','4'],['7','7','6'],['A','A','9'],['K','K','6'],
]

const BLANK_TURNS = ['2','3','4','5','6']
const SCARE_TURNS = ['A','K','Q']
const DRAW_COMPLETE_TURNS = ['flush_complete','straight_complete']

const HERO_POSITIONS = ['BTN','CO','HJ','SB']
const VILLAIN_POSITIONS = ['BB','SB','CO','BB']
const VILLAIN_ACTIONS_PASSIVE = ['Call','Check, Call']
const VILLAIN_ACTIONS_BET = ['Bet 33%','Bet 50%','Bet 66%','Bet 75%']
const POT_LABELS_SMALL = ['6bb','7bb','8bb','9bb','10bb']
const POT_LABELS_MED = ['12bb','14bb','15bb','16bb','18bb']
const POT_LABELS_BIG = ['25bb','30bb','35bb','40bb','45bb']

function randFrom(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function randPot(pool) { return randFrom(pool) }
function heroIPPos() { const i = Math.floor(Math.random() * HERO_POSITIONS.length); return { heroPos: HERO_POSITIONS[i], villainPos: VILLAIN_POSITIONS[i] } }

// ================================================================
// SCENARIOS — 22 templates gerando combinacoes unicas
// ================================================================

const SCENARIOS = [

  // 1. TPTK em board seco — double barrel blank turn
  () => {
    const board = randFrom(DRY_BOARDS)
    const topRank = board[0]
    const blank = randFrom(BLANK_TURNS)
    const pos = heroIPPos()
    const pot = randPot(POT_LABELS_MED)
    const kickers = { 'K': 'A', 'A': 'K', 'J': 'A', 'Q': 'A', 'T': 'A', '9': 'A' }
    const kicker = kickers[topRank] || 'A'
    return {
      q: `Flop ${board.join('-')} rainbow. Voce IP com ${kicker}${topRank}o (TPTK). C-bet 50%, vilao call. Turn: ${blank}. O que fazer?`,
      a: `Bet turn (double barrel — TPTK forte, blank nao ajuda vilao)`,
      b: `Check (pot control, talvez virar showdown hand)`,
      aCorrect: true,
      explanation: `${kicker}${topRank} em board ${board.join('-')}-${blank} continua sendo uma mao muito forte. O ${blank} e um blank puro — nao conecta em quase nada da range do vilao. Plano de 3 streets: bet flop, bet turn por valor, avaliar river. Maos como ${topRank}x piores e pares medianos vao pagar turn.`,
      boardCards: [...makeRainbowBoard(board), blank + randSuit()],
      heroCards: makeHeroCards(kicker, topRank, false),
      ...pos, villainAction: 'Call', potLabel: pot,
    }
  },

  // 2. Overpair em board seco — turn scare card (A ou K)
  () => {
    const board = randFrom([['J','7','2'],['T','6','3'],['9','5','2'],['8','4','2'],['T','7','3'],['9','6','2']])
    const scareRank = Math.random() > 0.5 ? 'A' : 'K'
    const overPairs = { 'J': ['Q','Q'], 'T': ['Q','Q'], '9': ['J','J'], '8': ['J','J'] }
    const pp = overPairs[board[0]] || ['Q','Q']
    const pos = heroIPPos()
    const pot = randPot(POT_LABELS_MED)
    return {
      q: `Voce IP com ${pp[0]}${pp[1]}o, bettou flop ${board.join('-')} rainbow. Vilao call. Turn: ${scareRank}. O que fazer?`,
      a: `Check turn (${scareRank} no turn pode dar top pair ao vilao — pot control)`,
      b: `Bet turn (overpair ainda e forte no board baixo)`,
      aCorrect: true,
      explanation: `${pp[0]}${pp[0]} era favorito claro no flop ${board.join('-')}, mas o ${scareRank} no turn e uma scare card perigosa. Vilao que pagou flop pode ter Ax ou ${scareRank}x. Agora voce e segundo par mais alto. Check turn: pot control, e possivel call/fold river dependendo do sizing.`,
      boardCards: [...makeRainbowBoard(board), scareRank + randSuit()],
      heroCards: makeHeroCards(pp[0], pp[1], false),
      ...pos, villainAction: 'Call', potLabel: pot,
    }
  },

  // 3. Set em board umido — proteção urgente (bet grande)
  () => {
    const wetBoards = [['J','T','9'],['T','9','8'],['9','8','7'],['8','7','6'],['J','9','8'],['Q','J','T']]
    const board = randFrom(wetBoards)
    const setRank = board[0]
    const fs = randSuit()
    const s2 = randSuitExcluding(fs)
    const s3 = randSuitExcluding(fs)
    const pos = heroIPPos()
    const pot = randPot(POT_LABELS_SMALL)
    return {
      q: `Voce IP tem set de ${setRank} no flop ${board.join('-')} (board ultra-umido, flush draw + straight draw). Vilao bet 50%. Qual o plano?`,
      a: `Raise grande no flop e bet grande no turn — proteger de draws urgentemente`,
      b: `Call flop, avaliar turn (nao revelar forca)`,
      aCorrect: true,
      explanation: `Board ${board.join('-')} e ultra-umido: draws tem ~35-45% equity contra seu set. Slowplay aqui e um erro sério. Voce DEVE raise grande no flop pra cobrar equity dos draws e proteger sua mao. Plano: raise/bet grande flop, bet turn grande, shove river se necessario.`,
      boardCards: [board[0]+fs, board[1]+fs, board[2]+s3],
      heroCards: [setRank+s2, setRank+randSuitExcluding(s2)],
      ...pos, villainAction: 'Bet 50%', potLabel: pot,
    }
  },

  // 4. Draw semi-bluff — barrel turn com scare card
  () => {
    const semiWet = randFrom(SEMI_WET_BOARDS)
    const scareCards = ['A','K','Q']
    const scare = randFrom(scareCards.filter(c => !semiWet.includes(c)))
    const draws = [['8','7'],['9','8'],['7','6'],['6','5'],['J','T']]
    const draw = randFrom(draws)
    const suit = randSuit()
    const pos = heroIPPos()
    const pot = randPot(POT_LABELS_MED)
    return {
      q: `Voce IP bettou flop ${semiWet.join('-')} com ${draw[0]}${draw[1]}s (flush draw + OESD). Vilao call. Turn: ${scare} (sem completar draw). O que fazer?`,
      a: `Bet turn (barrel — scare card + equity residual = boa pressao)`,
      b: `Check/fold turn (draw nao melhorou, desistir)`,
      aCorrect: true,
      explanation: `O ${scare} no turn e uma scare card excelente. Vilao vai foldar maos medianas (pares medios, underpairs) que nao conectaram. Voce ainda tem flush draw e OESD como backup (~14 outs). O double barrel combina pressao de fold equity com equity real — plano correto.`,
      boardCards: [...makeRainbowBoard(semiWet), scare + randSuit()],
      heroCards: [draw[0]+suit, draw[1]+suit],
      ...pos, villainAction: 'Call', potLabel: pot,
    }
  },

  // 5. Nut flush draw — triple barrel bluff quando draw nao fecha
  () => {
    const suit = randSuit()
    const flops = [['K','8','3'],['Q','9','4'],['J','7','3'],['T','6','2'],['A','8','4'],['K','9','5']]
    const board = randFrom(flops)
    const turn = randFrom(['5','6','7','2','3'])
    const river = randFrom(['2','3','4','5'])
    const heroA = 'A'
    const heroB = randFrom(['2','3','4','5','6'])
    const pos = heroIPPos()
    const pot = randPot(POT_LABELS_BIG)
    return {
      q: `Voce bettou flop e turn com A${heroB}s (nut flush draw) em board ${board.join('-')}-${turn} com 2 cartas do mesmo naipe. River: ${river} offsuit (draw nao fechou). O que fazer?`,
      a: `Bluff river (triple barrel — historia consistente de mao forte, vilao pode foldar)`,
      b: `Give up (draw falhou, sem showdown value)`,
      aCorrect: true,
      explanation: `Voce representou mao forte nas primeiras duas streets. O river sem completar o draw nao precisa parar o plano. Vilao que sobreviveu ate aqui com maos medianas (pares medios, underpairs) vai foldar ao triple barrel. A historia e consistente — voce pode ter AA, KK, set. Triple barrel e a conclusao logica.`,
      boardCards: [board[0]+suit, board[1]+suit, board[2]+randSuitExcluding(suit), turn+randSuitExcluding(suit), river+randSuitExcluding(suit)],
      heroCards: [heroA+suit, heroB+suit],
      ...pos, villainAction: 'Call', potLabel: pot,
    }
  },

  // 6. OESD como caller OOP — call turn, avaliar river
  () => {
    const flop = randFrom([['Q','J','5'],['K','T','4'],['J','T','3'],['Q','T','6'],['K','J','7']])
    const blank = randFrom(BLANK_TURNS)
    const draws = [['T','9'],['9','8'],['A','Q'],['8','7']]
    const draw = randFrom(draws)
    const betAction = randFrom(VILLAIN_ACTIONS_BET.slice(1,3))
    const pot = randPot(POT_LABELS_MED)
    return {
      q: `Voce OOP com ${draw[0]}${draw[1]}s (OESD) no flop ${flop.join('-')}. Vilao bettou, voce call. Turn: ${blank}. Vilao bet ${betAction.replace('Bet ','')} novamente. Plano?`,
      a: `Call turn (8 outs = ~16% equity, recebendo odds), avaliar river`,
      b: `Raise turn (semi-bluff agressivo para pressionar)`,
      aCorrect: true,
      explanation: `Com OESD (8 outs), voce tem ~16% pra fechar no river. Se o sizing do vilao esta dando odds, call e matematicamente correto. Raise turn e muito agressivo — voce ficaria committed sem a melhor mao. O plano: call turn com odds, e no river: value bet se completar, check/fold se nao completar.`,
      boardCards: [...makeRainbowBoard(flop), blank + randSuit()],
      heroCards: makeHeroCards(draw[0], draw[1], true),
      heroPos: 'BB', villainPos: 'BTN', villainAction: betAction, potLabel: pot,
    }
  },

  // 7. QQ/JJ — turn completa board paired — re-avaliação
  () => {
    const overpairs = [['Q','Q'],['J','J'],['T','T']]
    const pp = randFrom(overpairs)
    const boards = [['A','7','3'],['K','6','2'],['A','8','4'],['K','9','5'],['A','6','2']]
    const board = randFrom(boards)
    const pairedTurn = board[0]
    const pos = heroIPPos()
    const pot = randPot(POT_LABELS_MED)
    return {
      q: `Voce IP com ${pp[0]}${pp[1]}o. Bettou flop ${board.join('-')}. Vilao call. Turn: ${pairedTurn} (pareia o top card). O que fazer?`,
      a: `Check turn (${pairedTurn} tripla o board — vilao com Ax ou ${pairedTurn}x agora te domina)`,
      b: `Bet turn (${pp[0]}${pp[1]} ainda e overpair ao ${board[1]} e ${board[2]})`,
      aCorrect: true,
      explanation: `Seu ${pp[0]}${pp[0]} era overpair confortavel no flop ${board.join('-')}, mas o ${pairedTurn} no turn muda tudo. Qualquer Ax ou ${pairedTurn}x do vilao (que pagou flop justamente por isso) agora tem trips. O plano muda: check turn por pot control. River: call pequeno, fold grande.`,
      boardCards: [...makeRainbowBoard(board), pairedTurn + randSuit()],
      heroCards: makeHeroCards(pp[0], pp[1], false),
      ...pos, villainAction: 'Call', potLabel: pot,
    }
  },

  // 8. KK/QQ — river A cai (muda plano completamente)
  () => {
    const heroHand = Math.random() > 0.5 ? ['K','K'] : ['Q','Q']
    const dryBoards = [['8','5','2'],['9','6','3'],['7','4','2'],['8','4','3'],['T','5','2']]
    const board = randFrom(dryBoards)
    const turnBlank = randFrom(['3','4','5','6','7'].filter(r => !board.includes(r)))
    const riverScare = Math.random() > 0.5 ? 'A' : 'K'
    const pos = heroIPPos()
    const pot = randPot(POT_LABELS_BIG)
    return {
      q: `Voce IP com ${heroHand[0]}${heroHand[1]}o. Bettou flop ${board.join('-')}, bettou turn ${turnBlank}. River: ${riverScare}. O que fazer?`,
      a: `Check river (${riverScare} e terrivel — vilao que pagou 2 streets com Ax agora te domina)`,
      b: `Bet river de valor (${heroHand[0]}${heroHand[0]} ainda pode ser melhor)`,
      aCorrect: true,
      explanation: `${heroHand[0]}${heroHand[0]} tinha plano solido de 3 streets em board ${board.join('-')}, mas o ${riverScare} no river cancela tudo. Vilao que chamou flop e turn pode facilmente ter A-x que esperava o ${riverScare}. Check river e obrigatorio — nao transforme uma hand de showdown em bluff perdedor.`,
      boardCards: [...makeRainbowBoard(board), turnBlank + randSuit(), riverScare + randSuit()],
      heroCards: makeHeroCards(heroHand[0], heroHand[1], false),
      ...pos, villainAction: 'Check', potLabel: pot,
    }
  },

  // 9. AA em board seco — plano de 3 streets correto
  () => {
    const board = randFrom(DRY_BOARDS)
    const pos = heroIPPos()
    const pot = randPot(POT_LABELS_SMALL)
    return {
      q: `Voce IP com AA em board ${board.join('-')} rainbow, SPR ~8-10. Qual o plano ideal de 3 streets?`,
      a: `Bet flop medio (~50%), bet turn medio (~60%), bet river por valor (~65%)`,
      b: `Bet flop grande, check turn (trap), bet river grande`,
      aCorrect: true,
      explanation: `AA em board seco como ${board.join('-')} e candidato perfeito pra 3 streets de valor. Com SPR 8-10, voce quer construir o pote gradualmente: 50% flop, 60% turn, 65% river. Nao precisa de check trap — vilao com Jx, 9x ou draws vai pagar incrementalmente. Bet grande no flop espanta exatamente quem vai pagar 3 streets.`,
      boardCards: makeRainbowBoard(board),
      heroCards: makeHeroCards('A','A',false),
      ...pos, villainAction: 'Call', potLabel: pot,
    }
  },

  // 10. Board pareia no river — full house opportunity
  () => {
    const heroHands = [['A','K'],['A','Q'],['A','J'],['K','Q']]
    const hh = randFrom(heroHands)
    const topCard = hh[1]
    const flops = { 'K': ['K','T','6'], 'Q': ['Q','9','4'], 'J': ['J','8','3'], 'K': ['K','7','3'] }
    const board3 = flops[topCard] || ['K','T','6']
    const turnBlank = randFrom(BLANK_TURNS.filter(r => !board3.includes(r)))
    const riverPairs = board3[1]
    const pos = heroIPPos()
    const pot = randPot(POT_LABELS_BIG)
    return {
      q: `Voce IP com ${hh[0]}${hh[1]}o (TPTK). Bettou flop ${board3.join('-')}, bettou turn ${turnBlank}. River: ${riverPairs} (pareia o board). O que fazer?`,
      a: `Bet river por valor (voce tem full house, vilao raramente tem trips de ${riverPairs})`,
      b: `Check (medo do vilao ter trips do ${riverPairs})`,
      aCorrect: true,
      explanation: `O ${riverPairs} no river pareia o board, mas com ${hh[0]}${topCard} voce tem dois pares (full house sobre ${riverPairs}s). Vilao raramente tem ${riverPairs}${riverPairs} — teria raisado flop ou turn geralmente. Maos como K${riverPairs}, Q${riverPairs}, J${riverPairs} do vilao agora tem 2 pares/trips e vao pagar o river. Continue o plano.`,
      boardCards: [...makeRainbowBoard(board3), turnBlank + randSuit(), riverPairs + randSuit()],
      heroCards: makeHeroCards(hh[0], hh[1], false),
      ...pos, villainAction: 'Call', potLabel: pot,
    }
  },

  // 11. Check-raise turn OOP como plano (set ou straight OOP)
  () => {
    const strongHands = [
      { cards: ['9','9'], board: ['9','7','3'], label: 'set de 9' },
      { cards: ['8','8'], board: ['8','5','2'], label: 'set de 8' },
      { cards: ['T','T'], board: ['T','6','2'], label: 'set de T' },
      { cards: ['J','9'], board: ['Q','T','8'], label: 'straight (J9)' },
      { cards: ['7','6'], board: ['8','5','4'], label: 'straight (76)' },
    ]
    const hand = randFrom(strongHands)
    const blank = randFrom(BLANK_TURNS)
    const betAction = randFrom(['Bet 66%','Bet 75%','Bet 50%'])
    const pot = randPot(POT_LABELS_MED)
    return {
      q: `Voce OOP com ${hand.label} no board ${hand.board.join('-')}. Check flop, vilao bet, voce call. Turn: ${blank}. Vilao betta de novo (${betAction}). Plano?`,
      a: `Check-raise turn (construir pote enorme com mao muito forte OOP)`,
      b: `Call turn (nao revelar forca ainda, esperar river)`,
      aCorrect: true,
      explanation: `Check-raise turn e o plano ideal aqui. Voce tem ${hand.label} — uma das maos mais fortes possiveis. OOP, voce precisa construir o pote ativamente. Se voce so chama, o vilao pode check river e extrair menos. Check-raise turn constroi pote enorme e te mantém com iniciativa. Call seria passivo demais com essa mao.`,
      boardCards: [...makeRainbowBoard(hand.board), blank + randSuit()],
      heroCards: makeHeroCards(hand.cards[0], hand.cards[1], false),
      heroPos: 'BB', villainPos: 'BTN', villainAction: betAction, potLabel: pot,
    }
  },

  // 12. JJ/TT — dois overcards no board + turn piora ainda mais
  () => {
    const ppairs = [['J','J'],['T','T'],['9','9']]
    const pp = randFrom(ppairs)
    const overcardBoards = {
      'J': [['Q','8','4'],['K','7','3'],['A','6','2']],
      'T': [['J','8','3'],['Q','7','2'],['K','6','2'],['A','5','2']],
      '9': [['T','6','3'],['J','7','2'],['Q','5','2'],['K','4','2']],
    }
    const board = randFrom(overcardBoards[pp[0]] || [['Q','7','3']])
    const scares = ['K','A','Q'].filter(c => !board.includes(c))
    const turn = randFrom(scares)
    const pos = heroIPPos()
    const pot = randPot(POT_LABELS_MED)
    return {
      q: `Voce IP com ${pp[0]}${pp[1]}o. Bettou flop ${board.join('-')}. Vilao call. Turn: ${turn}. Plano?`,
      a: `Check turn (DUAS overcards no board agora — ${pp[0]}${pp[0]} virou hand marginal)`,
      b: `Bet turn (ainda tenho overpair ao ${board[1]} e ${board[2]})`,
      aCorrect: true,
      explanation: `${pp[0]}${pp[0]} em ${board.join('-')}-${turn} tem DUAS overcards no board. Qualquer ${board[0]}x ou ${turn}x te domina. A range do vilao que chamou flop e muito pesada em ${board[0]}x e draws. Agora com o ${turn}, ainda mais maos te batem. Check turn: pot control. River: call pequeno possivel, fold grande.`,
      boardCards: [...makeRainbowBoard(board), turn + randSuit()],
      heroCards: makeHeroCards(pp[0], pp[1], false),
      ...pos, villainAction: 'Call', potLabel: pot,
    }
  },

  // 13. Bluff com ar — give up no turn (sem equity, sem fold equity)
  () => {
    const board = randFrom([['A','K','8'],['A','Q','7'],['K','Q','9'],['A','J','6'],['K','J','8']])
    const turn = randFrom(BLANK_TURNS)
    const bluffs = [['J','T'],['T','9'],['8','7'],['6','5'],['7','6']]
    const bluff = randFrom(bluffs)
    const pos = heroIPPos()
    const pot = randPot(POT_LABELS_MED)
    return {
      q: `Voce IP bettou flop ${board.join('-')} com ${bluff[0]}${bluff[1]}o (puro bluff, sem equity). Turn: ${turn}. Vilao call de novo. O que fazer?`,
      a: `Give up — check turn (sem equity, vilao mostra forca, historia nao sustenta)`,
      b: `Double barrel — continuar a pressao no turn`,
      aCorrect: true,
      explanation: `Bluffar no flop ${board.join('-')} tem logica (voce pode representar Ax ou Kx). Mas ${bluff[0]}${bluff[1]} nao tem equity real — sem draws, sem pares. No turn, vilao que chamou flop provavelmente tem Ax, Kx ou draw forte. Double barrel sem backup equity e queimar fichas. Give up: check turn, avaliar se o river da uma oportunidade de bluff final.`,
      boardCards: [...makeRainbowBoard(board), turn + randSuit()],
      heroCards: makeHeroCards(bluff[0], bluff[1], false),
      ...pos, villainAction: 'Call', potLabel: pot,
    }
  },

  // 14. JTs/98s com backdoor perde equity no turn — give up
  () => {
    const boards = [['A','K','8'],['A','Q','6'],['K','Q','7'],['A','J','9'],['K','T','8']]
    const board = randFrom(boards)
    const turn = randFrom(['4','5','3','2'])
    const draws = [['J','T'],['9','8'],['T','9'],['8','7']]
    const draw = randFrom(draws)
    const pos = heroIPPos()
    const pot = randPot(POT_LABELS_MED)
    return {
      q: `Board ${board.join('-')}-${turn}. Voce IP bettou flop com ${draw[0]}${draw[1]}s (backdoor draws). Turn ${turn} completou nada. Decisao?`,
      a: `Check turn (mao perdeu equity de backdoor, so tem gutshot fraco)`,
      b: `Barrel turn (manter pressao na range do vilao)`,
      aCorrect: true,
      explanation: `${draw[0]}${draw[1]}s no flop ${board.join('-')} tinha backdoor flush + gutshot ou OESD. No turn ${turn}, as backdoor draws falharam e so restam 3-4 outs. Nao vale investir mais fichas sem equity real. Plano correto: bet flop (equity + bluff), check turn (desistir graciosamente), considerar river bluff so se a carta for perfeita.`,
      boardCards: makeRainbowBoard([...board, turn]),
      heroCards: makeHeroCards(draw[0], draw[1], true),
      ...pos, villainAction: 'Call', potLabel: pot,
    }
  },

  // 15. Top pair kicker fraco — quantas streets apostar?
  () => {
    const tpwk = [
      { hero: ['K','7'], board: ['K','9','4'], label: 'top pair kicker fraco (K7)' },
      { hero: ['A','6'], board: ['A','T','5'], label: 'top pair kicker fraco (A6)' },
      { hero: ['Q','5'], board: ['Q','8','3'], label: 'top pair kicker fraco (Q5)' },
      { hero: ['J','6'], board: ['J','9','4'], label: 'top pair kicker fraco (J6)' },
    ]
    const sc = randFrom(tpwk)
    const blank = randFrom(BLANK_TURNS)
    const pos = heroIPPos()
    const pot = randPot(POT_LABELS_MED)
    return {
      q: `Voce IP com ${sc.label} no flop ${sc.board.join('-')}. Bettou flop, vilao call. Turn: ${blank} (blank). Qual a abordagem correta de multistreet?`,
      a: `Check turn (top pair kicker fraco aguenta 1-2 streets, nao 3)`,
      b: `Bet turn (top pair e top pair, apostar 3 streets)`,
      aCorrect: true,
      explanation: `Top pair kicker fraco como ${sc.hero[0]}${sc.hero[1]} em ${sc.board.join('-')} nao aguenta 3 streets de valor. A pergunta-chave: "quais maos piores me pagam em 3 streets?". A resposta e poucas — vilao raramente paga com mao mais fraca que ${sc.hero[0]}${sc.hero[1]}. Check turn: pot control, talvez thin value no river se check-check.`,
      boardCards: [...makeRainbowBoard(sc.board), blank + randSuit()],
      heroCards: makeHeroCards(sc.hero[0], sc.hero[1], false),
      ...pos, villainAction: 'Call', potLabel: pot,
    }
  },

  // 16. Draw completa no turn — vilao tem nuts, hero deve parar
  () => {
    const suit = randSuit()
    const s2 = randSuitExcluding(suit)
    const flops = [
      { board: ['K','8','3'], flushSuit: suit },
      { board: ['Q','9','4'], flushSuit: suit },
      { board: ['J','7','2'], flushSuit: suit },
      { board: ['T','6','3'], flushSuit: suit },
    ]
    const sc = randFrom(flops)
    const blank = randFrom(BLANK_TURNS)
    const pos = heroIPPos()
    const pot = randPot(POT_LABELS_MED)
    return {
      q: `Voce bettou flop ${sc.board.join('-')} (2 ${sc.flushSuit}). Turn: ${blank}${sc.flushSuit} (completa flush). Voce tem ${sc.board[0]}${s2} (top pair sem flush). Vilao check. O que fazer?`,
      a: `Check (draw completou, voce nao tem flush — pot control essencial)`,
      b: `Bet por valor (top pair ainda pode ser melhor)`,
      aCorrect: true,
      explanation: `O turn ${blank}${sc.flushSuit} completou o flush draw. Agora qualquer Xx${sc.flushSuit} do vilao que chamou flop tem flush e te domina. Bet aqui e apostar por valor sendo batido na maioria das vezes. Check turn: controlar pote. River: check/call pequeno se fizer sentido, fold para bet grande.`,
      boardCards: [sc.board[0]+sc.flushSuit, sc.board[1]+sc.flushSuit, sc.board[2]+s2, blank+sc.flushSuit],
      heroCards: [sc.board[0]+s2, randFrom(['K','Q','J','T','9'].filter(r => r !== sc.board[0]))+s2],
      ...pos, villainAction: 'Check', potLabel: pot,
    }
  },

  // 17. Straight completa no turn — hero tem set, cuidado!
  () => {
    const straights = [
      { board: ['J','T','9'], turn: '8', hero: ['J','J'] },
      { board: ['T','9','8'], turn: '7', hero: ['T','T'] },
      { board: ['9','8','7'], turn: '6', hero: ['9','9'] },
      { board: ['8','7','6'], turn: '5', hero: ['8','8'] },
      { board: ['Q','J','T'], turn: '9', hero: ['Q','Q'] },
    ]
    const sc = randFrom(straights)
    const pos = heroIPPos()
    const pot = randPot(POT_LABELS_MED)
    return {
      q: `Voce IP tem ${sc.hero[0]}${sc.hero[1]}o (set). Bettou flop ${sc.board.join('-')} (board umido). Vilao call. Turn: ${sc.turn} (completa reta). Vilao bet grande. O que fazer?`,
      a: `Fold ou call cauteloso (straight completou — set perdeu muito valor)`,
      b: `Raise (set ainda tem outs pra full house — press on)`,
      aCorrect: true,
      explanation: `O ${sc.turn} no turn completou straight (QJT9, JT98, etc.). Vilao que chamou flop umido e agora bettando grande provavelmente tem a reta. Seu set tem outs pra full house (~10 outs), mas nao com SPR suficiente pra um raise. Call/fold dependendo dos odds — mas nao raise. Plano: recalcular com as novas informacoes.`,
      boardCards: [...makeRainbowBoard(sc.board), sc.turn + randSuit()],
      heroCards: makeHeroCards(sc.hero[0], sc.hero[1], false),
      ...pos, villainAction: 'Bet 75%', potLabel: pot,
    }
  },

  // 18. Conceito — A pergunta-chave do multistreet
  () => {
    const hands = [
      { hero: 'AKo em A-high', streets: '2-3', board: makeRainbowBoard(['A','9','4']), heroCards: makeHeroCards('A','K',false) },
      { hero: 'QQ em board baixo', streets: '2-3', board: makeRainbowBoard(['7','4','2']), heroCards: makeHeroCards('Q','Q',false) },
      { hero: 'set de J', streets: '3', board: makeRainbowBoard(['J','7','3']), heroCards: makeHeroCards('J','J',false) },
    ]
    const sc = randFrom(hands)
    const pos = heroIPPos()
    return {
      q: `Conceito multistreet: antes de apostar no flop com ${sc.hero}, qual pergunta voce deve fazer?`,
      a: `"Quais maos piores me pagam em cada street?" — para definir quantas streets de valor`,
      b: `"Sou favorito agora?" — se sim, aposto 3 streets automaticamente`,
      aCorrect: true,
      explanation: `A pergunta-chave do multistreet planning nao e "sou favorito?" — e "quais maos piores me pagam?". Com ${sc.hero}, a resposta define ${sc.streets} streets de valor. Apostando sem essa analise, voce pode bet 3 streets em situacoes onde vilao so paga com maos que te dominam.`,
      boardCards: sc.board, heroCards: sc.heroCards,
      ...pos, villainAction: 'Call', potLabel: randPot(POT_LABELS_SMALL),
    }
  },

  // 19. Board paired no flop — set vs. full house dynamics
  () => {
    const pairedFlops = PAIRED_BOARDS.slice(0,6)
    const board3 = randFrom(pairedFlops)
    const setRank = board3[0]
    const blank = randFrom(BLANK_TURNS)
    const pos = heroIPPos()
    const pot = randPot(POT_LABELS_SMALL)
    return {
      q: `Flop ${board3.join('-')} (board pareado). Voce IP tem ${setRank}${setRank}o (full house no flop!). Vilao check. Qual a linha correta?`,
      a: `Bet (construir pote com full house — mesmo board pareado, voce e nut)`,
      b: `Check (slowplay — esperar que vilao aposte com trips ou two pair)`,
      aCorrect: true,
      explanation: `Com full house em flop ${board3.join('-')}, voce ja tem a nuts (ou perto). Slowplay tem valor aqui, mas bet tem mais: vilao pode ter trips de ${board3[0]} (ex: ${setRank}x), two pair fantasma, ou bluff. Bet leva o pote crescendo. Plano: bet flop/turn, e no river bet grande para extrair valor maximo de trips do vilao.`,
      boardCards: [...makeRainbowBoard([board3[0], board3[1], board3[2]]), blank + randSuit()],
      heroCards: makeHeroCards(setRank, setRank, false),
      ...pos, villainAction: 'Check', potLabel: pot,
    }
  },

  // 20. Middle pair OOP — quando parar de apostar
  () => {
    const middlePairs = [
      { hero: ['9','8'], board: ['A','9','4'], label: 'par medio (9)' },
      { hero: ['8','7'], board: ['K','8','3'], label: 'par medio (8)' },
      { hero: ['T','9'], board: ['A','T','5'], label: 'par medio (T)' },
      { hero: ['7','6'], board: ['Q','7','2'], label: 'par medio (7)' },
    ]
    const sc = randFrom(middlePairs)
    const blank = randFrom(BLANK_TURNS)
    const pot = randPot(POT_LABELS_MED)
    return {
      q: `Voce OOP com ${sc.label} no board ${sc.board.join('-')}. Vilao bet 50%, voce call. Turn: ${blank}. Voce checa. Vilao bet 66%. O que fazer?`,
      a: `Fold (middle pair nao aguenta 2 streets de bet — range de valor do vilao te domina)`,
      b: `Call (ainda tenho par, posso ser melhor)`,
      aCorrect: true,
      explanation: `Middle pair como ${sc.hero[0]}${sc.hero[1]} em ${sc.board.join('-')} aguenta 0-1 streets de call, nao 2. Vilao que bet flop E turn tem uma range muito forte: top pair+, draws fortes, sets. Seu ${sc.hero[0]}${sc.hero[1]} raramente e melhor aqui. Fold e a jogada disciplinada — nao "protect de draws" com par medio OOP.`,
      boardCards: [...makeRainbowBoard(sc.board), blank + randSuit()],
      heroCards: makeHeroCards(sc.hero[0], sc.hero[1], false),
      heroPos: 'BB', villainPos: 'BTN', villainAction: 'Bet 66%', potLabel: pot,
    }
  },

  // 21. Slowplay vs. bet imediato com nuts — analise de SPR
  () => {
    const nuts = [
      { hero: ['A','A'], board: ['K','7','2'], label: 'AA overpair' },
      { hero: ['K','K'], board: ['Q','8','3'], label: 'KK overpair' },
      { hero: ['A','K'], board: ['A','K','5'], label: 'dois pares (AK)' },
      { hero: ['J','J'], board: ['J','8','3'], label: 'set de J' },
    ]
    const sc = randFrom(nuts)
    const spr = randFrom(['alto (~15)', 'medio (~8)', 'baixo (~3)'])
    const pos = heroIPPos()
    const pot = randPot(POT_LABELS_SMALL)
    return {
      q: `SPR ${spr}. Voce IP com ${sc.label} no flop ${sc.board.join('-')}. Board seco. Vilao check. Qual o plano correto?`,
      a: `Bet imediato (construir o pote — nao depender de vilao fazer algo)`,
      b: `Check (slowplay — deixar vilao pegar outs e depois value bet)`,
      aCorrect: true,
      explanation: `Com ${sc.label} em board seco, slowplay e arriscado independente do SPR. Com SPR ${spr}, voce precisa construir o pote ativamente — nao pode depender do vilao ter iniciativa. Se voce checa e vilao tambem checa turn, voce perdeu uma street de valor. Bet: construa o pote no ritmo que voce controla.`,
      boardCards: makeRainbowBoard(sc.board),
      heroCards: makeHeroCards(sc.hero[0], sc.hero[1], false),
      ...pos, villainAction: 'Check', potLabel: pot,
    }
  },

  // 22. River decision — thin value bet ou check
  () => {
    const scenarios = [
      { hero: ['A','Q'], board5: ['A','9','4','2','7'], label: 'TPTK (AQ)', correct: 'bet', wrongLabel: 'check' },
      { hero: ['K','Q'], board5: ['K','8','3','2','6'], label: 'TPTK (KQ)', correct: 'bet', wrongLabel: 'check' },
      { hero: ['T','9'], board5: ['J','T','9','3','2'], label: 'dois pares (T9)', correct: 'bet', wrongLabel: 'check' },
    ]
    const sc = randFrom(scenarios)
    const pos = heroIPPos()
    const pot = randPot(POT_LABELS_BIG)
    return {
      q: `River completo: ${sc.board5.join('-')}. Voce IP com ${sc.label}. Vilao check. Voce bettou flop e turn. O que fazer no river?`,
      a: `Bet river por valor (${sc.label} ainda extrai de maos piores que pagam)`,
      b: `Check (pot control — nao exagerar no value)`,
      aCorrect: true,
      explanation: `Com ${sc.label} em ${sc.board5.join('-')}, voce ainda tem mao forte. Vilao que chegou ao river pode ter pares medios, draws perdidos, ou maos que pagam thin value. Check aqui seria deixar dinheiro na mesa. Bet pequeno (~33-40% pot): thinly value bet, extraindo de maos que chamam por pot odds.`,
      boardCards: sc.board5.slice(0,4).map((r,i) => i < 3 ? r+randSuit() : r+randSuit()).concat([sc.board5[4]+randSuit()]),
      heroCards: makeHeroCards(sc.hero[0], sc.hero[1], false),
      ...pos, villainAction: 'Check', potLabel: pot,
    }
  },

  // 23. Bluff com story consistente — quando triple barrel faz sentido
  () => {
    const bluffStories = [
      { hero: ['A','Q'], board: ['K','J','T'], turn: '5', river: '2', label: 'AQo (gutshot blocker)', story: 'AQ bloqueia nuts (AKs, AJ)' },
      { hero: ['A','K'], board: ['Q','J','T'], turn: '4', river: '3', label: 'AKo (nut straight blocker)', story: 'AK bloqueia A9 de straight' },
      { hero: ['J','T'], board: ['A','K','Q'], turn: '3', river: '2', label: 'JTo (straight blocker)', story: 'JT tem straight, representa nuts' },
    ]
    const sc = randFrom(bluffStories)
    const pos = heroIPPos()
    const pot = randPot(POT_LABELS_BIG)
    return {
      q: `Voce IP com ${sc.label} em board ${sc.board.join('-')}-${sc.turn}-${sc.river}. Bettou flop e turn representando mao forte. ${sc.story}. River brick. O que fazer?`,
      a: `Triple barrel bluff river (historia consistente — voce pode representar nuts convincentemente)`,
      b: `Give up river (mao nao melhorou, e perigoso)`,
      aCorrect: true,
      explanation: `Triple barrel faz sentido quando: 1) voce contou historia consistente nas 2 primeiras streets, 2) sua mao bloqueia a nuts do board, 3) vilao pode ter maos medias que dobram. ${sc.story}. River brick nao ajuda o vilao. O bluff precisa ter logica de range — e aqui tem.`,
      boardCards: [...makeRainbowBoard(sc.board), sc.turn + randSuit(), sc.river + randSuit()],
      heroCards: makeHeroCards(sc.hero[0], sc.hero[1], false),
      ...pos, villainAction: 'Call', potLabel: pot,
    }
  },

  // 24. Two pair no board umido — quando proteger vs slowplay
  () => {
    const twoPairs = [
      { hero: ['T','9'], board: ['T','9','8'], label: 'dois pares (T9) em board umido' },
      { hero: ['J','8'], board: ['J','8','7'], label: 'dois pares (J8) em board umido' },
      { hero: ['Q','9'], board: ['Q','9','8'], label: 'dois pares (Q9) em board umido' },
    ]
    const sc = randFrom(twoPairs)
    const pos = heroIPPos()
    const pot = randPot(POT_LABELS_SMALL)
    return {
      q: `Voce IP com ${sc.label}. Vilao check. Qual o plano multistreet correto?`,
      a: `Bet grande agora (board umido — draws tem muita equity, protecao urgente)`,
      b: `Check (slowplay dois pares — deixar vilao melhorar e pagar depois)`,
      aCorrect: true,
      explanation: `Dois pares em ${sc.board.join('-')} parece forte, mas o board tem muitos draws. Draws (flush, straight) tem ~35-50% equity. Slowplay aqui seria caro: se draw fecha no turn, voce perde muito valor. Bet grande: cobra equity dos draws AGORA e define o tamanho do pote que voce controla. Plano: bet grande flop, bet turn, avalie river.`,
      boardCards: makeRainbowBoard(sc.board),
      heroCards: makeHeroCards(sc.hero[0], sc.hero[1], false),
      ...pos, villainAction: 'Check', potLabel: pot,
    }
  },

  // 25 (bonus). Conceito — quantas streets de valor por tipo de mao
  () => {
    const handTypes = [
      { mao: 'set de 8', streets: 3, board: makeRainbowBoard(['8','5','2']), heroCards: makeHeroCards('8','8',false) },
      { mao: 'TPTK (AK)', streets: 3, board: makeRainbowBoard(['A','7','3']), heroCards: makeHeroCards('A','K',false) },
      { mao: 'top pair kicker medio (A7)', streets: 2, board: makeRainbowBoard(['A','9','4']), heroCards: makeHeroCards('A','7',false) },
      { mao: 'par medio (9 em K-9-4)', streets: 1, board: makeRainbowBoard(['K','9','4']), heroCards: makeHeroCards('T','9',false) },
    ]
    const sc = randFrom(handTypes)
    const pos = heroIPPos()
    return {
      q: `Regra de streets: com ${sc.mao}, quantas streets de valor voce deve planejar?`,
      a: `${sc.streets} street${sc.streets > 1 ? 's' : ''} — baseado em quais maos piores pagam`,
      b: `Sempre 3 streets se voce e favorito no flop`,
      aCorrect: true,
      explanation: `${sc.mao} suporta ${sc.streets} street${sc.streets > 1 ? 's' : ''} de valor. A regra nao e "sou favorito = 3 streets". E "quais maos piores pagam em cada street?". ${sc.streets === 3 ? 'Com set ou TPTK, muitas maos piores pagam 3 streets.' : sc.streets === 2 ? 'Com top pair kicker medio, poucas maos piores pagam 3 streets completos.' : 'Com par medio, raramente extraimos 2 streets de valor — 1 bet e suficiente.'}`,
      boardCards: sc.board, heroCards: sc.heroCards,
      ...pos, villainAction: 'Call', potLabel: randPot(POT_LABELS_SMALL),
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
      title: 'O que e Multistreet',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            <strong style={{ color: '#4fce82' }}>Multistreet Planning</strong> e pensar as 3 streets (flop, turn, river)
            ANTES de fazer sua primeira aposta. Em vez de decidir "o que faco agora?", voce planeja:
          </p>
          <div className="space-y-2 mb-4">
            {[
              { street: 'Flop', question: 'Minha mao merece apostar? Quantas streets de valor?' },
              { street: 'Turn', question: 'Quais cartas sao boas pra continuar? Quais me fazem parar?' },
              { street: 'River', question: 'Vou por valor, bluff, ou check? Como termino a mao?' },
            ].map((item, i) => (
              <div key={i} className="rounded-lg px-3 py-2.5" style={{ background: '#222225' }}>
                <div style={{ color: '#4fce82', fontSize: 13, fontWeight: 600 }}>{item.street}</div>
                <div style={{ color: '#b3b3b8', fontSize: 12 }}>{item.question}</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg p-4" style={{ background: 'rgba(79,206,130,0.08)', border: '1px solid rgba(79,206,130,0.2)' }}>
            <div style={{ color: '#4fce82', fontSize: 13, fontWeight: 600 }}>
              A pergunta-chave: "quais maos piores me pagam em cada street?"
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Streets de Valor',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            Nem toda mao forte merece 3 streets de valor. A regra:
          </p>
          <div className="rounded-lg overflow-hidden mb-4" style={{ border: '1px solid #2a2a2e' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#222225' }}>
                  <th style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>Mao</th>
                  <th style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>Streets</th>
                  <th style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>Por que</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Sets, straights, flushes', '3', 'Maos muito fortes, muitas piores pagam'],
                  ['TPTK (ex: AK em A-high)', '2-3', 'Forte mas depende do runout'],
                  ['Top pair kicker medio', '1-2', 'Poucas maos piores pagam 3 streets'],
                  ['Middle pair, bottom pair', '0-1', 'Check ou 1 bet fino de protecao'],
                ].map(([mao, streets, pq], i) => (
                  <tr key={i} style={{ borderTop: '1px solid #2a2a2e' }}>
                    <td style={{ color: '#fdfdfd', fontSize: 12, padding: '8px 12px' }}>{mao}</td>
                    <td style={{ color: '#4fce82', fontSize: 12, padding: '8px 12px', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{streets}</td>
                    <td style={{ color: '#676671', fontSize: 11, padding: '8px 12px' }}>{pq}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
    {
      title: 'Cartas que Mudam Planos',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            O plano muda conforme as cartas caem. Tipos de turn/river cards:
          </p>
          <div className="space-y-2 mb-4">
            {[
              { card: 'Blank (ex: 2, 3 off)', effect: 'Nao muda nada — continue o plano original', color: '#4fce82' },
              { card: 'Scare card (A, K)', effect: 'Overcards que podem dar top pair ao vilao — reavalie', color: '#f5a623' },
              { card: 'Draw completa (flush/straight)', effect: 'Perigo! Pot control se nao tiver nuts', color: '#e5484d' },
              { card: 'Board pareia', effect: 'Muda dinamica — quem tem full house?', color: '#e5484d' },
            ].map((item, i) => (
              <div key={i} className="rounded-lg px-3 py-2.5" style={{ background: '#222225' }}>
                <div style={{ color: item.color, fontSize: 13, fontWeight: 600 }}>{item.card}</div>
                <div style={{ color: '#b3b3b8', fontSize: 12 }}>{item.effect}</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg p-4" style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)' }}>
            <div style={{ color: '#f5a623', fontSize: 13, fontWeight: 600 }}>
              Bons jogadores ajustam o plano conforme as cartas caem — ruins seguem no piloto automatico
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Triple Barrel e Give Up',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            Duas situacoes extremas do multistreet planning:
          </p>
          <div className="rounded-lg p-4 mb-3" style={{ background: 'rgba(229,72,77,0.08)', border: '1px solid rgba(229,72,77,0.2)' }}>
            <div style={{ color: '#e5484d', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Triple Barrel (bet 3 streets)</div>
            <div style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 1.7 }}>
              Apostar flop, turn E river. Funciona com:<br/>
              - Maos muito fortes (valor em 3 streets)<br/>
              - Bluffs que contam historia consistente (representando nuts)
            </div>
          </div>
          <div className="rounded-lg p-4 mb-4" style={{ background: 'rgba(79,206,130,0.08)', border: '1px solid rgba(79,206,130,0.2)' }}>
            <div style={{ color: '#4fce82', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Give Up (desistir)</div>
            <div style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 1.7 }}>
              Parar de apostar quando:<br/>
              - Draw nao melhorou e nao tem fold equity<br/>
              - Carta ruim caiu e a historia nao faz sentido<br/>
              - Vilao mostra forca (raise, call rapido)
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
            Modulo 25 - Multistreet Planning
          </h1>
          <p style={{ color: '#676671', fontSize: 13, marginBottom: 20 }}>
            Planeje flop + turn + river antes de agir
          </p>

          <div className="flex gap-1 mb-6 overflow-x-auto">
            {sections.map((s, i) => (
              <button key={i} onClick={() => setSection(i)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
                style={{
                  background: section === i ? 'rgba(10,132,215,0.12)' : 'transparent',
                  color: section === i ? '#0a84d7' : '#676671',
                  border: `1px solid ${section === i ? '#0a84d7' : 'transparent'}`,
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
  const progress = getModuleProgress(25)

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
    recordAnswer(25, isCorrect, newStreak, { tp: 'msp' })
    setResult({ isCorrect, explanation: scenario.explanation, chosenId: optionId })
  }, [result, scenario, streak, recordAnswer])

  const handleNext = useCallback(() => {
    const nextHand = handNum + 1
    if (nextHand >= 10) {
      const accuracy = Math.round((sessionCorrect / 10) * 100)
      recordSession(25, accuracy)
      setShowReview(true)
    } else {
      setHandNum(nextHand)
    }
    setResult(null)
    setScenario(generateScenario())
  }, [handNum, sessionCorrect, recordSession])

  const acc = progress.totalAnswered > 0 ? progress.accuracy : 0

  if (showReview) {
    return <SessionReview moduleId={25} sessionCorrect={sessionCorrect} sessionTotal={10} onContinue={() => { setHandNum(0); setSessionCorrect(0); setShowReview(false); setStreak(0) }} />
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
              contextTitle="Multistreet Planning"
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
                {!result.isCorrect && <DecisionTree scenario={{ ...scenario, moduleId: 25 }} result={result} />}
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

export default function Module25() {
  const { progress, markLessonRead, getModuleProgress } = useProgress()
  const mod = progress.modules[25]
  const modProgress = getModuleProgress(25)
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
        {view === 'lesson' ? <Lesson onComplete={() => { markLessonRead(25); setView('trainer') }} /> : <Trainer />}
      </div>
    </div>
  )
}
