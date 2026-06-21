import { useState, useCallback } from 'react'
import SessionReview from '../../components/SessionReview'
import { useProgress } from '../../context/ProgressContext'
import DecisionTree from '../../components/DecisionTree'
import ModulePokerTable from '../../components/ModulePokerTable'

const SUITS_POOL = ['s','h','d','c']
function randSuit() { return SUITS_POOL[Math.floor(Math.random() * 4)] }
function randSuitExcluding(exclude) {
  const opts = SUITS_POOL.filter(s => s !== exclude)
  return opts[Math.floor(Math.random() * opts.length)]
}
function makeRainbowBoard(ranks) {
  const suits = []
  ranks.forEach(() => {
    let s
    do { s = randSuit() } while (suits.length > 0 && suits.length < 3 && suits.filter(x => x === s).length >= 1 && suits.length < ranks.length)
    suits.push(s)
  })
  // Ensure truly rainbow (all different suits for 3 cards)
  if (ranks.length >= 3) {
    const used = new Set()
    for (let i = 0; i < ranks.length; i++) {
      let s
      do { s = randSuit() } while (used.has(s) && used.size < 4)
      suits[i] = s
      used.add(s)
    }
  }
  return ranks.map((r, i) => r + suits[i])
}
function makeFlushDrawBoard(ranks) {
  const flushSuit = randSuit()
  return ranks.map((r, i) => r + (i < 2 ? flushSuit : randSuitExcluding(flushSuit)))
}
function makeHeroCards(r1, r2, suited) {
  const s1 = randSuit()
  const s2 = suited ? s1 : randSuitExcluding(s1)
  return [r1 + s1, r2 + s2]
}

// ================================================================
// MODULO 22 — SPR (Stack-to-Pot Ratio)
// ================================================================

const SPR_SCENARIOS = [
  // ── SPR BAIXO (1-4): commit com top pair+ ──────────────────────────────────

  // T1: Top pair no A-high board, SPR baixo, villain bet
  () => {
    const spr = [1.5, 2, 2.5, 3, 3.5, 4][Math.floor(Math.random() * 6)]
    const lowCards = ['7','2','3','4','5','6'][Math.floor(Math.random() * 6)]
    const midCards = ['8','9','T'][Math.floor(Math.random() * 3)]
    const board = makeRainbowBoard(['A', midCards, lowCards])
    const kickers = ['K','Q','J','T'][Math.floor(Math.random() * 4)]
    const hero = makeHeroCards('A', kickers, false)
    const betSize = ['33%','50%','66%','75%'][Math.floor(Math.random() * 4)]
    const pos = [['CO','BB'],['BTN','SB'],['HJ','CO'],['MP','BTN']][Math.floor(Math.random() * 4)]
    return {
      q: `Flop A-${midCards}-${lowCards} rainbow. Voce tem A${kickers}o (top pair top kicker). SPR = ${spr}. Vilao betta ${betSize}.`,
      a: 'All-in / Raise (SPR baixo = commit com top pair+)',
      b: 'Call e avaliar turn',
      aCorrect: true,
      explanation: `Com SPR ${spr}, voce ja esta comprometido com o pote. Top pair+ em SPR baixo = vai com tudo. Nao tem estofo para jogar 3 streets — matematica manda commitar.`,
      heroCards: hero, boardCards: board, heroPos: pos[0], villainPos: pos[1], villainAction: `Bet ${betSize}`, potLabel: `SPR ${spr}`,
    }
  },

  // T2: Overpair em K-high board, 3-bet pot, SPR baixo, villain check
  () => {
    const spr = [1.5, 2, 2.5, 3][Math.floor(Math.random() * 4)]
    const lowA = ['2','3','4','5'][Math.floor(Math.random() * 4)]
    const lowB = ['6','7','8'][Math.floor(Math.random() * 3)]
    const board = makeRainbowBoard(['K', lowB, lowA])
    const pairs = ['Q','J'][Math.floor(Math.random() * 2)]
    const hero = makeHeroCards(pairs, pairs, false)
    const pos = [['BTN','BB'],['CO','SB'],['HJ','BB']][Math.floor(Math.random() * 3)]
    return {
      q: `3-bet pot. Flop K-${lowB}-${lowA} seco. Voce tem ${pairs}${pairs} (overpair). SPR = ${spr}. Vilao checka.`,
      a: 'Bet e commit (SPR baixo, overpair forte)',
      b: 'Check pra pot control',
      aCorrect: true,
      explanation: `SPR ${spr} = so cabe 1 bet e all-in. ${pairs}${pairs} em K-high board e overpair forte nesse SPR. Betta qualquer sizing e vai tudo.`,
      heroCards: hero, boardCards: board, heroPos: pos[0], villainPos: pos[1], villainAction: 'Check', potLabel: `SPR ${spr}`,
    }
  },

  // T3: Top set em board conectado perigoso, SPR baixo, villain bet
  () => {
    const spr = [2, 2.5, 3, 3.5][Math.floor(Math.random() * 4)]
    const tops = [['J','T','9'],['Q','J','T'],['T','9','8'],['9','8','7']][Math.floor(Math.random() * 4)]
    const s1 = randSuit()
    const s2 = randSuitExcluding(s1)
    const s3 = randSuitExcluding(s1)
    const board = [tops[0]+s1, tops[1]+s2, tops[2]+s3]
    const setRank = tops[0]
    const hero = [setRank+randSuitExcluding(s1), setRank+randSuitExcluding(s1)]
    const pos = [['CO','BTN'],['BTN','BB'],['HJ','CO']][Math.floor(Math.random() * 3)]
    return {
      q: `SPR = ${spr}. Flop ${tops[0]}-${tops[1]}-${tops[2]} conectado. Voce tem ${setRank}${setRank} (top set). Vilao betta.`,
      a: 'Raise all-in (proteger o set em board perigoso)',
      b: 'Call (slowplay)',
      aCorrect: true,
      explanation: `Board muito perigoso com muitos draws. SPR baixo = nao dar carta gratis. Raise all-in protege seu set e extrai valor dos draws imediatamente.`,
      heroCards: hero, boardCards: board, heroPos: pos[0], villainPos: pos[1], villainAction: 'Bet', potLabel: `SPR ${spr}`,
    }
  },

  // T4: Two pair em board seco, SPR baixo, villain check-raise
  () => {
    const spr = [2, 2.5, 3][Math.floor(Math.random() * 3)]
    const pairs = [['A','7'],['K','8'],['Q','9'],['J','6']][Math.floor(Math.random() * 4)]
    const kicker = ['2','3','4','5'][Math.floor(Math.random() * 4)]
    const board = makeRainbowBoard([pairs[0], pairs[1], kicker])
    const hero = makeHeroCards(pairs[0], pairs[1], false)
    const pos = [['CO','BB'],['BTN','SB'],['HJ','BB']][Math.floor(Math.random() * 3)]
    return {
      q: `SPR = ${spr}. Flop ${pairs[0]}-${pairs[1]}-${kicker} rainbow. Voce tem ${pairs[0]}${pairs[1]}o (two pair). Vilao check-raisa.`,
      a: 'Shove (two pair em SPR baixo = commit total)',
      b: 'Fold (check-raise = mao forte)',
      aCorrect: true,
      explanation: `Com SPR ${spr} e two pair, voce tem equity alta o suficiente pra commitar mesmo contra check-raise. Two pair nao faz fold em SPR baixo — e matematicamente errado.`,
      heroCards: hero, boardCards: board, heroPos: pos[0], villainPos: pos[1], villainAction: 'Check-Raise', potLabel: `SPR ${spr}`,
    }
  },

  // T5: Par medio FRACO em board dangerous, SPR baixo, villain bet pot
  () => {
    const spr = [2.5, 3, 3.5][Math.floor(Math.random() * 3)]
    const boardRanks = [['T','6','2'],['J','5','3'],['Q','7','4'],['9','4','2']][Math.floor(Math.random() * 4)]
    const board = makeRainbowBoard(boardRanks)
    const pairRank = ['8','7','6'][Math.floor(Math.random() * 3)]
    const hero = makeHeroCards(pairRank, pairRank, false)
    const pos = [['CO','BTN'],['BTN','BB'],['SB','BB']][Math.floor(Math.random() * 3)]
    return {
      q: `SPR = ${spr}. Flop ${boardRanks[0]}-${boardRanks[1]}-${boardRanks[2]} seco. Voce tem ${pairRank}${pairRank} (par medio, underpair). Vilao betta pot.`,
      a: 'Fold/Call marginal (par medio sem top pair = fraco em SPR baixo)',
      b: 'Raise (par medio = valor)',
      aCorrect: true,
      explanation: `SPR ${spr} com par medio sem top pair = situacao ruim. Precisa de top pair+ pra commitar. Call se pot odds forem boas, mas raise e erro — voce nao tem mao forte o bastante.`,
      heroCards: hero, boardCards: board, heroPos: pos[0], villainPos: pos[1], villainAction: 'Bet Pot', potLabel: `SPR ${spr}`,
    }
  },

  // T6: AA em 4-bet pot, board seco baixo, SPR baixo, villain check
  () => {
    const spr = [2, 2.5, 3, 3.5][Math.floor(Math.random() * 4)]
    const lowBoards = [['9','5','2'],['8','4','2'],['7','3','2'],['6','4','2']][Math.floor(Math.random() * 4)]
    const board = makeRainbowBoard(lowBoards)
    const hero = makeHeroCards('A','A', false)
    const pos = [['BTN','BB'],['CO','SB'],['HJ','BB']][Math.floor(Math.random() * 3)]
    const betAction = ['Bet pequeno','Bet 33%','Shove'][Math.floor(Math.random() * 3)]
    return {
      q: `4-bet pot. SPR = ${spr}. Flop ${lowBoards[0]}-${lowBoards[1]}-${lowBoards[2]} rainbow. Voce tem AA. Vilao checka.`,
      a: `${betAction} (SPR baixo, AA = commit total)`,
      b: 'Check (trap para extrair valor no turn)',
      aCorrect: true,
      explanation: `SPR ${spr} com AA em board seco = commit total. Qualquer sizing funciona — ate shove. Check desperica valor contra o range de 4-bet do vilao que paga tudo.`,
      heroCards: hero, boardCards: board, heroPos: pos[0], villainPos: pos[1], villainAction: 'Check', potLabel: `SPR ${spr}`,
    }
  },

  // ── SPR MEDIO (4-8): protecao, sizing importa ──────────────────────────────

  // T7: Top pair + flush draw em board umido, SPR medio, villain check
  () => {
    const spr = [4.5, 5, 6, 7][Math.floor(Math.random() * 4)]
    const flushSuit = randSuit()
    const topRanks = [['Q','9','4'],['J','8','3'],['K','T','5'],['A','7','2']][Math.floor(Math.random() * 4)]
    const board = [topRanks[0]+flushSuit, topRanks[1]+flushSuit, topRanks[2]+randSuitExcluding(flushSuit)]
    const kicker = ['K','J','T','9'][Math.floor(Math.random() * 4)]
    const hero = [topRanks[0]+flushSuit, kicker+flushSuit]
    const pos = [['CO','BB'],['BTN','SB'],['HJ','BB']][Math.floor(Math.random() * 3)]
    const sizing = ['66%','75%'][Math.floor(Math.random() * 2)]
    return {
      q: `SPR = ${spr}. Flop ${topRanks[0]}-${topRanks[1]}-${topRanks[2]} com flush draw. Voce tem top pair + flush draw (suited). Vilao checka.`,
      a: `Bet ${sizing} (proteger + valor, SPR medio)`,
      b: 'Bet 25-33% (sizing pequeno demais)',
      aCorrect: true,
      explanation: `SPR medio com top pair + draw em board umido = sizing medio-grande. Voce quer proteger contra draws adversarios e construir pote. Bet pequeno nao protege o suficiente.`,
      heroCards: hero, boardCards: board, heroPos: pos[0], villainPos: pos[1], villainAction: 'Check', potLabel: `SPR ${spr}`,
    }
  },

  // T8: Underpair em board A-K, SPR medio, villain bet
  () => {
    const spr = [4.5, 5, 5.5, 6][Math.floor(Math.random() * 4)]
    const lowCard = ['2','3','4','5'][Math.floor(Math.random() * 4)]
    const board = makeRainbowBoard(['A','K', lowCard])
    const pairs = ['T','9','J'][Math.floor(Math.random() * 3)]
    const hero = makeHeroCards(pairs, pairs, false)
    const betSize = ['50%','66%','75%'][Math.floor(Math.random() * 3)]
    const pos = [['BTN','CO'],['CO','HJ'],['BTN','SB']][Math.floor(Math.random() * 3)]
    return {
      q: `SPR = ${spr}. Flop A-K-${lowCard} rainbow. Voce tem ${pairs}${pairs} (underpair). Vilao betta ${betSize}.`,
      a: 'Fold (SPR medio, underpair em AK board = muito fraco)',
      b: 'Call (par e par, esperar turn)',
      aCorrect: true,
      explanation: `SPR medio com par de ${pairs} em board AK = muito ruim. Vilao representa range forte (AK, AQ, AJ, KQ). Seu par quase nunca e bom — fold direto.`,
      heroCards: hero, boardCards: board, heroPos: pos[0], villainPos: pos[1], villainAction: `Bet ${betSize}`, potLabel: `SPR ${spr}`,
    }
  },

  // T9: Set em board seco, SPR medio, villain check
  () => {
    const spr = [5, 6, 7][Math.floor(Math.random() * 3)]
    const setBoards = [['7','6','3'],['8','4','2'],['9','5','2'],['T','3','2']][Math.floor(Math.random() * 4)]
    const board = makeRainbowBoard(setBoards)
    const setRank = setBoards[0]
    const hero = [setRank+randSuit(), setRank+randSuit()]
    const pos = [['BTN','BB'],['CO','SB'],['HJ','BB']][Math.floor(Math.random() * 3)]
    const betSizes = ['40%','50%','55%']
    const betSize = betSizes[Math.floor(Math.random() * betSizes.length)]
    return {
      q: `SPR = ${spr}. Flop ${setBoards[0]}-${setBoards[1]}-${setBoards[2]} seco. Voce tem ${setRank}${setRank} (top set). Vilao checka.`,
      a: `Bet ${betSize} (valor e protecao, construir pote)`,
      b: 'Check (slowplay, esperar turn)',
      aCorrect: true,
      explanation: `SPR medio com set em board seco: betta por valor. Slowplay e arriscado — com SPR medio voce precisa construir pote em 3 streets pra stackar o vilao.`,
      heroCards: hero, boardCards: board, heroPos: pos[0], villainPos: pos[1], villainAction: 'Check', potLabel: `SPR ${spr}`,
    }
  },

  // T10: Flush draw em board medio, SPR medio, villain bet — semi-bluff vs call
  () => {
    const spr = [4.5, 5.5, 6.5, 7][Math.floor(Math.random() * 4)]
    const flushSuit = randSuit()
    const boardRanks = [['K','9','4'],['Q','8','3'],['J','7','2'],['T','8','3']][Math.floor(Math.random() * 4)]
    const board = [boardRanks[0]+flushSuit, boardRanks[1]+flushSuit, boardRanks[2]+randSuitExcluding(flushSuit)]
    const hero = ['A'+flushSuit, '5'+flushSuit]
    const betSize = ['33%','40%','50%'][Math.floor(Math.random() * 3)]
    const pos = [['BTN','BB'],['CO','BB'],['SB','BB']][Math.floor(Math.random() * 3)]
    return {
      q: `SPR = ${spr}. Flop ${boardRanks[0]}-${boardRanks[1]}-${boardRanks[2]} com 2 cartas do mesmo naipe. Voce tem A5s (nut flush draw). Vilao betta ${betSize}.`,
      a: 'Call (draw com pot odds aceitaveis, SPR medio)',
      b: 'Fold (so tem draw, SPR medio)',
      aCorrect: true,
      explanation: `SPR medio com nut flush draw e pot odds razoaveis = call. Voce tem ~36% de equity em 2 cartas. Implied odds existem mas sao menores que no SPR alto.`,
      heroCards: hero, boardCards: board, heroPos: pos[0], villainPos: pos[1], villainAction: `Bet ${betSize}`, potLabel: `SPR ${spr}`,
    }
  },

  // T11: Two pair em board umido, SPR medio, villain bet — protection sizing
  () => {
    const spr = [5, 6, 7][Math.floor(Math.random() * 3)]
    const combos = [['K','T'],['Q','9'],['J','8'],['A','6']][Math.floor(Math.random() * 4)]
    const low = ['3','4','5'][Math.floor(Math.random() * 3)]
    const flushSuit = randSuit()
    const board = [combos[0]+flushSuit, combos[1]+flushSuit, low+randSuitExcluding(flushSuit)]
    const hero = makeHeroCards(combos[0], combos[1], false)
    const pos = [['BTN','BB'],['CO','SB'],['HJ','CO']][Math.floor(Math.random() * 3)]
    return {
      q: `SPR = ${spr}. Flop ${combos[0]}-${combos[1]}-${low} com flush draw. Voce tem two pair (${combos[0]}${combos[1]}). Vilao betta 50%.`,
      a: 'Raise (proteger two pair contra draws, SPR medio)',
      b: 'Call (pot control com two pair)',
      aCorrect: true,
      explanation: `SPR medio com two pair em board umido = raise por protecao. Voce nao quer dar flush draw gratis. Com SPR medio, construir pote agora e essencial.`,
      heroCards: hero, boardCards: board, heroPos: pos[0], villainPos: pos[1], villainAction: 'Bet 50%', potLabel: `SPR ${spr}`,
    }
  },

  // T12: TPTK em board medio seco, SPR medio, villain check-raise
  () => {
    const spr = [5, 6, 7][Math.floor(Math.random() * 3)]
    const topRanks = [['Q','7','2'],['J','6','3'],['K','5','2'],['T','8','3']][Math.floor(Math.random() * 4)]
    const board = makeRainbowBoard(topRanks)
    const kicker = ['A','K','J'][Math.floor(Math.random() * 3)]
    const hero = makeHeroCards(topRanks[0], kicker, false)
    const pos = [['CO','BB'],['BTN','SB'],['HJ','BB']][Math.floor(Math.random() * 3)]
    return {
      q: `SPR = ${spr}. Flop ${topRanks[0]}-${topRanks[1]}-${topRanks[2]} seco. Voce tem top pair + kicker alto. Vilao check-raisa sua cbet.`,
      a: 'Call (pot control, reavalie turn)',
      b: 'Shove (top pair e forte)',
      aCorrect: true,
      explanation: `SPR medio com TPTK e check-raise = vilao tem range polarizado (sets, two pair, ou bluffs). Shove e muito agressivo — call e mais prudente para controlar o pote.`,
      heroCards: hero, boardCards: board, heroPos: pos[0], villainPos: pos[1], villainAction: 'Check-Raise', potLabel: `SPR ${spr}`,
    }
  },

  // ── SPR ALTO (8+): implied odds, draws, pot control ────────────────────────

  // T13: TPTK em board seco, SPR alto, villain bet
  () => {
    const spr = [9, 10, 12, 15][Math.floor(Math.random() * 4)]
    const boardRanks = [['K','8','3'],['A','7','2'],['Q','6','2'],['J','5','3']][Math.floor(Math.random() * 4)]
    const board = makeRainbowBoard(boardRanks)
    const kicker = ['A','Q','J','T'][Math.floor(Math.random() * 4)]
    const hero = makeHeroCards(boardRanks[0], kicker, false)
    const betSize = ['50%','66%','75%'][Math.floor(Math.random() * 3)]
    const pos = [['BTN','CO'],['CO','HJ'],['BTN','SB']][Math.floor(Math.random() * 3)]
    return {
      q: `SPR = ${spr}. Flop ${boardRanks[0]}-${boardRanks[1]}-${boardRanks[2]} rainbow. Voce tem TPTK. Vilao betta ${betSize}.`,
      a: 'Call (pot control com TPTK, SPR alto)',
      b: 'Raise (top pair top kicker e forte)',
      aCorrect: true,
      explanation: `SPR alto com TPTK = mao forte mas nao monstro. Raise infla o pote demais — voce perde pra sets e two pair que nao largam. Call e jogue as streets com cautela.`,
      heroCards: hero, boardCards: board, heroPos: pos[0], villainPos: pos[1], villainAction: `Bet ${betSize}`, potLabel: `SPR ${spr}`,
    }
  },

  // T14: Set mine pre-flop, SPR alto, villain raise pre
  () => {
    const spr = [10, 12, 14, 15][Math.floor(Math.random() * 4)]
    const smallPairs = ['22','33','44','55','66','77']
    const pairIdx = Math.floor(Math.random() * smallPairs.length)
    const pairR = smallPairs[pairIdx][0]
    const hero = makeHeroCards(pairR, pairR, false)
    const pos = [['BTN','UTG'],['CO','MP'],['HJ','UTG'],['SB','BTN']][Math.floor(Math.random() * 4)]
    return {
      q: `SPR = ${spr}. Pre-flop single raise pot. Voce tem ${pairR}${pairR} no ${pos[0]}. ${pos[1]} raisa.`,
      a: 'Call (set mine — implied odds altas com SPR alto)',
      b: 'Fold (par baixo nao tem valor)',
      aCorrect: true,
      explanation: `SPR alto = implied odds excelentes pra set mine. Se acertar o set (~12%), ganha pilhas grandes. Regra geral: SPR 10+ torna set mine lucrativo a longo prazo.`,
      heroCards: hero, boardCards: [], heroPos: pos[0], villainPos: pos[1], villainAction: 'Raise', potLabel: `SPR ${spr}`,
    }
  },

  // T15: Nut flush draw em board medio, SPR alto, villain bet
  () => {
    const spr = [9, 11, 13, 15][Math.floor(Math.random() * 4)]
    const flushSuit = randSuit()
    const boardRanks = [['9','8','6'],['T','7','5'],['J','6','4'],['8','7','3']][Math.floor(Math.random() * 4)]
    const board = [boardRanks[0]+randSuitExcluding(flushSuit), boardRanks[1]+flushSuit, boardRanks[2]+flushSuit]
    const hero = ['A'+flushSuit, '5'+flushSuit]
    const betSize = ['50%','66%','75%'][Math.floor(Math.random() * 3)]
    const pos = [['BTN','BB'],['CO','SB'],['HJ','BB']][Math.floor(Math.random() * 3)]
    return {
      q: `SPR = ${spr}. Flop ${boardRanks[0]}-${boardRanks[1]}-${boardRanks[2]} com 2 cartas do naipe. Voce tem A5s (nut flush draw). Vilao betta ${betSize}.`,
      a: 'Call (draw com implied odds enormes, SPR alto)',
      b: 'Fold (sem par feito)',
      aCorrect: true,
      explanation: `SPR alto com nut flush draw = call otimo. Implied odds enormes — se completar, vilao vai pagar muito. Draw tem ~18% em 1 carta, ~36% em 2.`,
      heroCards: hero, boardCards: board, heroPos: pos[0], villainPos: pos[1], villainAction: `Bet ${betSize}`, potLabel: `SPR ${spr}`,
    }
  },

  // T16: TPTK vs check-raise em board umido, SPR alto
  () => {
    const spr = [10, 12, 15][Math.floor(Math.random() * 3)]
    const topRanks = [['A','7','2'],['K','9','4'],['Q','8','5'],['J','T','3']][Math.floor(Math.random() * 4)]
    const board = makeRainbowBoard(topRanks)
    const kicker = ['K','Q','J','T'][Math.floor(Math.random() * 4)]
    const hero = makeHeroCards(topRanks[0], kicker, false)
    const pos = [['CO','BB'],['BTN','SB'],['HJ','BB']][Math.floor(Math.random() * 3)]
    return {
      q: `SPR = ${spr}. Flop ${topRanks[0]}-${topRanks[1]}-${topRanks[2]}. Voce tem top pair kicker alto. Vilao checka-raisa sua cbet.`,
      a: 'Call (pot control, nao re-raise em SPR alto)',
      b: 'Re-raise (top pair justifica aggressao)',
      aCorrect: true,
      explanation: `SPR alto e check-raise = vilao tem mao forte (set, two pair) ou bluff draw grande. TPTK nao quer inflar mais. Call e reavalie no turn com mais informacao.`,
      heroCards: hero, boardCards: board, heroPos: pos[0], villainPos: pos[1], villainAction: 'Check-Raise', potLabel: `SPR ${spr}`,
    }
  },

  // T17: Combo draw (flush + straight) em board, SPR alto, semi-bluff
  () => {
    const spr = [12, 14, 15, 18][Math.floor(Math.random() * 4)]
    const flushSuit = randSuit()
    const drawBoards = [
      { b: ['5','8','T'], h: ['6','7'] },
      { b: ['4','7','9'], h: ['5','6'] },
      { b: ['6','9','J'], h: ['7','8'] },
      { b: ['3','6','8'], h: ['4','5'] },
    ][Math.floor(Math.random() * 4)]
    const board = [drawBoards.b[0]+flushSuit, drawBoards.b[1]+flushSuit, drawBoards.b[2]+randSuitExcluding(flushSuit)]
    const hero = [drawBoards.h[0]+flushSuit, drawBoards.h[1]+flushSuit]
    const pos = [['BTN','BB'],['CO','SB'],['HJ','BB']][Math.floor(Math.random() * 3)]
    return {
      q: `SPR = ${spr}. Voce tem ${drawBoards.h[0]}${drawBoards.h[1]}s. Flop ${drawBoards.b[0]}-${drawBoards.b[1]}-${drawBoards.b[2]} com 2 do naipe. Flush draw + gutshot straight draw.`,
      a: 'Semi-bluff bet (12+ outs, implied odds enormes)',
      b: 'Check/fold (sem mao feita)',
      aCorrect: true,
      explanation: `SPR alto com combo draw (flush + straight = 12+ outs) = semi-bluff perfeito. ~45% de equity com 2 cartas. Se vilao folda, ótimo. Se chama, voce tem equity real.`,
      heroCards: hero, boardCards: board, heroPos: pos[0], villainPos: pos[1], villainAction: 'Check', potLabel: `SPR ${spr}`,
    }
  },

  // T18: Set forte em board seco, SPR alto — construir pote em 3 streets
  () => {
    const spr = [9, 10, 12, 14][Math.floor(Math.random() * 4)]
    const setBoards = [['A','7','2'],['K','6','3'],['Q','8','2'],['J','5','3']][Math.floor(Math.random() * 4)]
    const board = makeRainbowBoard(setBoards)
    const setRank = setBoards[0]
    const hero = [setRank+randSuit(), setRank+randSuit()]
    const pos = [['BTN','BB'],['CO','SB'],['HJ','CO']][Math.floor(Math.random() * 3)]
    return {
      q: `SPR = ${spr}. Flop ${setBoards[0]}-${setBoards[1]}-${setBoards[2]} seco. Voce tem set de ${setRank}s. Vilao checka.`,
      a: 'Bet pequeno (construir pote em 3 streets, SPR alto)',
      b: 'Check (slowplay pra induzi-lo a bluffar)',
      aCorrect: true,
      explanation: `Set em SPR alto = voce tem estofo pra jogar 3 streets. Betta pequeno (25-33%) pra construir gradualmente. Slowplay pode funcionar, mas bet cria pote maior no longo prazo.`,
      heroCards: hero, boardCards: board, heroPos: pos[0], villainPos: pos[1], villainAction: 'Check', potLabel: `SPR ${spr}`,
    }
  },

  // T19: Overpair forte em board perigoso, SPR alto — pot control
  () => {
    const spr = [10, 12, 15][Math.floor(Math.random() * 3)]
    const flushSuit = randSuit()
    const boardRanks = [['J','T','6'],['Q','9','5'],['T','8','7'],['9','7','6']][Math.floor(Math.random() * 4)]
    const board = makeFlushDrawBoard(boardRanks)
    const overPairs = ['K','Q','J'][Math.floor(Math.random() * 3)]
    const hero = makeHeroCards(overPairs, overPairs, false)
    const betSize = ['50%','66%'][Math.floor(Math.random() * 2)]
    const pos = [['BTN','BB'],['CO','SB'],['HJ','BB']][Math.floor(Math.random() * 3)]
    return {
      q: `SPR = ${spr}. Flop ${boardRanks[0]}-${boardRanks[1]}-${boardRanks[2]} umido com flush draw. Voce tem ${overPairs}${overPairs} (overpair). Vilao betta ${betSize}.`,
      a: 'Call (pot control com overpair em board perigoso, SPR alto)',
      b: 'Raise (overpair = mao forte)',
      aCorrect: true,
      explanation: `SPR alto com overpair em board conectado/umido = pot control. Raise infla o pote quando voce pode estar atras de sets, two pair e combo draws. Call e defensivo e correto.`,
      heroCards: hero, boardCards: board, heroPos: pos[0], villainPos: pos[1], villainAction: `Bet ${betSize}`, potLabel: `SPR ${spr}`,
    }
  },

  // ── IDENTIFICAR SPR ────────────────────────────────────────────────────────

  // T20: Calcular SPR e categorizar
  () => {
    const pots = [10, 15, 20, 25, 30, 40, 50]
    const pot = pots[Math.floor(Math.random() * pots.length)]
    const multipliers = [2, 3, 4, 5, 6, 8, 10, 12, 15]
    const mult = multipliers[Math.floor(Math.random() * multipliers.length)]
    const stack = pot * mult
    const spr = Math.round((stack / pot) * 10) / 10
    const category = spr <= 4 ? 'Baixo' : spr <= 8 ? 'Medio' : 'Alto'
    const boardRanks = [['K','J','4'],['A','8','3'],['Q','T','5'],['J','7','2']][Math.floor(Math.random() * 4)]
    const board = makeRainbowBoard(boardRanks)
    const hero = makeHeroCards('A','Q', false)
    const wrongCategory = category === 'Baixo' ? 'Alto' : category === 'Alto' ? 'Baixo' : (Math.random() > 0.5 ? 'Baixo' : 'Alto')
    return {
      q: `Stack efetivo: ${stack}bb. Pote no flop: ${pot}bb. Qual o SPR e a categoria?`,
      a: `${category} — SPR = ${spr}`,
      b: `${wrongCategory} — SPR = ${spr}`,
      aCorrect: true,
      explanation: `SPR = Stack / Pot = ${stack} / ${pot} = ${spr}. Categorias: Baixo (1-4), Medio (4-8), Alto (8+). SPR ${spr} = ${category}.`,
      heroCards: hero, boardCards: board, heroPos: 'BTN', villainPos: 'BB', villainAction: '', potLabel: `${pot}bb`,
    }
  },

  // T21: SPR edge case — identificar categoria borderline
  () => {
    const edgeCases = [
      { stack: 32, pot: 8, spr: 4, category: 'Baixo', wrong: 'Medio' },
      { stack: 40, pot: 5, spr: 8, category: 'Medio', wrong: 'Alto' },
      { stack: 80, pot: 10, spr: 8, category: 'Medio', wrong: 'Baixo' },
      { stack: 15, pot: 5, spr: 3, category: 'Baixo', wrong: 'Medio' },
      { stack: 100, pot: 10, spr: 10, category: 'Alto', wrong: 'Medio' },
    ][Math.floor(Math.random() * 5)]
    const board = makeRainbowBoard(['K','8','2'])
    const hero = makeHeroCards('A','K', false)
    return {
      q: `Stack efetivo: ${edgeCases.stack}bb. Pote: ${edgeCases.pot}bb. SPR = ${edgeCases.spr}. Categoria correta?`,
      a: `${edgeCases.category} (SPR ${edgeCases.spr})`,
      b: `${edgeCases.wrong} (SPR ${edgeCases.spr})`,
      aCorrect: true,
      explanation: `SPR ${edgeCases.spr} = categoria ${edgeCases.category}. Lembre: Baixo = 1 a 4, Medio = 4 a 8, Alto = 8+. Casos borderline (4 e 8 exatos) tendem a ser tratados como o limite superior.`,
      heroCards: hero, boardCards: board, heroPos: 'BTN', villainPos: 'BB', villainAction: '', potLabel: `${edgeCases.pot}bb`,
    }
  },

  // T22: SPR e decisao — qual o efeito no jogo
  () => {
    const spr = [2, 5, 12][Math.floor(Math.random() * 3)]
    const category = spr <= 4 ? 'Baixo' : spr <= 8 ? 'Medio' : 'Alto'
    const board = makeRainbowBoard(['T','6','2'])
    const hero = makeHeroCards('T','9', false)
    const pos = [['CO','BB'],['BTN','SB'],['HJ','BB']][Math.floor(Math.random() * 3)]
    const correctAction = spr <= 4
      ? 'Commit (SPR baixo = top pair vai tudo)'
      : spr <= 8
        ? 'Bet medio e avaliar (SPR medio = protecao)'
        : 'Pot control / Call (SPR alto = nao inflar)'
    const wrongAction = spr <= 4
      ? 'Pot control (call e esperar turn)'
      : spr <= 8
        ? 'All-in imediato (SPR medio nao justifica)'
        : 'All-in imediato (top pair nao vale stacks profundos)'
    return {
      q: `Voce tem T9o. Flop T-6-2 rainbow (top pair). SPR = ${spr} (${category}). Vilao betta 50%. Melhor acao?`,
      a: correctAction,
      b: wrongAction,
      aCorrect: true,
      explanation: `Com SPR ${spr} (${category}) e top pair: ${correctAction}. O SPR define completamente o quanto voce deve comprometer com top pair.`,
      heroCards: hero, boardCards: board, heroPos: pos[0], villainPos: pos[1], villainAction: 'Bet 50%', potLabel: `SPR ${spr}`,
    }
  },

  // T23: Par medio fraco, SPR baixo — fold vs call
  () => {
    const spr = [2.5, 3, 3.5][Math.floor(Math.random() * 3)]
    const boards = [['T','6','2'],['J','5','3'],['Q','7','4'],['K','8','3']][Math.floor(Math.random() * 4)]
    const board = makeRainbowBoard(boards)
    const pairR = ['8','7','6','5'][Math.floor(Math.random() * 4)]
    const hero = makeHeroCards(pairR, pairR, false)
    const pos = [['CO','BTN'],['BTN','BB'],['SB','BB']][Math.floor(Math.random() * 3)]
    return {
      q: `SPR = ${spr}. Flop ${boards[0]}-${boards[1]}-${boards[2]}. Voce tem ${pairR}${pairR} (par medio, underpair). Vilao betta pot.`,
      a: 'Call/Fold (par medio sem top pair = marginal)',
      b: 'Raise (proteger o par)',
      aCorrect: true,
      explanation: `SPR ${spr} com par medio sem top pair = situacao ruim. Nao tem mao forte o suficiente pra commitar. Call se pot odds forem boas, fold se nao. Nunca raise.`,
      heroCards: hero, boardCards: board, heroPos: pos[0], villainPos: pos[1], villainAction: 'Bet Pot', potLabel: `SPR ${spr}`,
    }
  },

  // T24: Straight draw em SPR alto — implied odds call
  () => {
    const spr = [10, 12, 14][Math.floor(Math.random() * 3)]
    const flushSuit = randSuit()
    const draws = [
      { board: ['T','9','3'], hero: ['J','Q'] },
      { board: ['8','7','2'], hero: ['9','T'] },
      { board: ['6','5','K'], hero: ['7','8'] },
      { board: ['J','T','4'], hero: ['Q','9'] },
    ][Math.floor(Math.random() * 4)]
    const board = makeRainbowBoard(draws.board)
    const hero = makeHeroCards(draws.hero[0], draws.hero[1], false)
    const betSize = ['50%','66%'][Math.floor(Math.random() * 2)]
    const pos = [['BTN','BB'],['CO','SB'],['HJ','BB']][Math.floor(Math.random() * 3)]
    return {
      q: `SPR = ${spr}. Flop ${draws.board[0]}-${draws.board[1]}-${draws.board[2]}. Voce tem ${draws.hero[0]}${draws.hero[1]}o (open-ended straight draw). Vilao betta ${betSize}.`,
      a: 'Call (OESD com implied odds altas, SPR alto)',
      b: 'Fold (so tem draw)',
      aCorrect: true,
      explanation: `SPR alto com OESD (8 outs = ~32% em 2 cartas) = call correto. Implied odds enormes — se completar o straight, pilhas grandes. SPR ${spr} justifica o call facilmente.`,
      heroCards: hero, boardCards: board, heroPos: pos[0], villainPos: pos[1], villainAction: `Bet ${betSize}`, potLabel: `SPR ${spr}`,
    }
  },

  // T25: KK em board low, SPR medio, villain raise — decisao difícil
  () => {
    const spr = [5, 6, 7][Math.floor(Math.random() * 3)]
    const boards = [['8','5','2'],['7','4','2'],['9','3','2'],['6','4','3']][Math.floor(Math.random() * 4)]
    const board = makeRainbowBoard(boards)
    const hero = makeHeroCards('K','K', false)
    const pos = [['BTN','BB'],['CO','SB'],['HJ','BB']][Math.floor(Math.random() * 3)]
    return {
      q: `SPR = ${spr}. Flop ${boards[0]}-${boards[1]}-${boards[2]} seco. Voce tem KK (overpair). Vilao raisa sua cbet.`,
      a: 'Call e avaliar turn (SPR medio, KK pode estar bem ou mal)',
      b: 'Shove imediato (KK e muito forte)',
      aCorrect: true,
      explanation: `SPR medio com KK e raise do vilao = complicado. KK pode estar frente a set ou bluff. Call e mais seguro que shove — com SPR medio, voce ainda tem estofo para desistir no turn.`,
      heroCards: hero, boardCards: board, heroPos: pos[0], villainPos: pos[1], villainAction: 'Raise', potLabel: `SPR ${spr}`,
    }
  },
]

function generateSPRScenario() {
  const pick = SPR_SCENARIOS[Math.floor(Math.random() * SPR_SCENARIOS.length)]
  const t = pick()
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
      title: 'O que e SPR?',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            <strong style={{ color: '#4fce82' }}>SPR (Stack-to-Pot Ratio)</strong> e a razao entre o stack efetivo e o pote no flop.
            E o conceito MAIS importante para decisoes pos-flop.
          </p>
          <div className="rounded-lg p-4 mb-4" style={{ background: '#222225' }}>
            <div style={{ color: '#fdfdfd', fontSize: 16, fontWeight: 700, fontFamily: 'JetBrains Mono', textAlign: 'center', marginBottom: 8 }}>
              SPR = Stack Efetivo / Pote no Flop
            </div>
            <div style={{ color: '#676671', fontSize: 13, textAlign: 'center' }}>
              Ex: Stack 100bb, Pote 10bb = SPR 10
            </div>
          </div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8 }}>
            O SPR muda COMPLETAMENTE como voce joga a mesma mao. Um par de As com SPR 2 e jogado
            de forma totalmente diferente do que com SPR 15.
          </p>
        </div>
      ),
    },
    {
      title: 'SPR Baixo (1-4)',
      content: (
        <div>
          <div className="rounded-lg p-4 mb-4" style={{ background: 'rgba(229,72,77,0.1)', border: '1px solid rgba(229,72,77,0.25)' }}>
            <div style={{ color: '#e5484d', fontSize: 14, fontWeight: 700, marginBottom: 6 }}>SPR 1-4: Commit Zone</div>
            <ul style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 2, paddingLeft: 16 }}>
              <li>Comum em <strong style={{ color: '#fdfdfd' }}>3-bet e 4-bet pots</strong></li>
              <li>Top pair+ = <strong style={{ color: '#4fce82' }}>vai com tudo</strong> (all-in)</li>
              <li>Matematica pura: pot odds ja te comprometem</li>
              <li>Draws perdem valor (poucas implied odds)</li>
              <li>Nao existe pot control — o pote ja e grande demais</li>
            </ul>
          </div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8 }}>
            <strong style={{ color: '#fdfdfd' }}>Regra de ouro:</strong> Se SPR &le; 4, qualquer mao
            top pair+ esta disposta a colocar todas as fichas. Nao tente ser esperto — va direto.
          </p>
        </div>
      ),
    },
    {
      title: 'SPR Medio (4-8)',
      content: (
        <div>
          <div className="rounded-lg p-4 mb-4" style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.25)' }}>
            <div style={{ color: '#f5a623', fontSize: 14, fontWeight: 700, marginBottom: 6 }}>SPR 4-8: Protecao e Valor</div>
            <ul style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 2, paddingLeft: 16 }}>
              <li>Zona mais complexa — <strong style={{ color: '#fdfdfd' }}>sizing importa muito</strong></li>
              <li>Top pair precisa de protecao (bet medio-grande)</li>
              <li>Sets e 2-pair = construir pote em 3 streets</li>
              <li>Draws tem alguma implied odds mas nao ilimitadas</li>
              <li>Pot control com maos marginais (call, nao raise)</li>
            </ul>
          </div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8 }}>
            <strong style={{ color: '#fdfdfd' }}>Sizing e arma:</strong> Com SPR medio, escolha cuidadosamente
            entre 33%, 50% e 75%. Cada sizing conta uma historia diferente.
          </p>
        </div>
      ),
    },
    {
      title: 'SPR Alto (8+)',
      content: (
        <div>
          <div className="rounded-lg p-4 mb-4" style={{ background: 'rgba(79,206,130,0.1)', border: '1px solid rgba(79,206,130,0.25)' }}>
            <div style={{ color: '#4fce82', fontSize: 14, fontWeight: 700, marginBottom: 6 }}>SPR 8+: Implied Odds</div>
            <ul style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 2, paddingLeft: 16 }}>
              <li>Potes single raise — stacks profundos</li>
              <li>Top pair = <strong style={{ color: '#fdfdfd' }}>pot control</strong> (nao inflar o pote)</li>
              <li>Sets, straights, flushes = <strong style={{ color: '#4fce82' }}>construir pote grande</strong></li>
              <li>Draws valem MUITO (implied odds altas)</li>
              <li>Set mine com pares baixos = lucrativo (precisa SPR 10+)</li>
              <li>Combo draws = semi-bluff agressivo</li>
            </ul>
          </div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8 }}>
            <strong style={{ color: '#fdfdfd' }}>A grande diferenca:</strong> Com SPR alto, top pair nao quer
            colocar todas as fichas. Mas set mining e flush draws sao muito mais valiosos porque quando acertam,
            ganham pilhas enormes.
          </p>
        </div>
      ),
    },
    {
      title: 'Resumo Pratico',
      content: (
        <div>
          <div className="rounded-lg overflow-hidden mb-4" style={{ border: '1px solid #2a2a2e' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#222225' }}>
                  <th style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>SPR</th>
                  <th style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>Top Pair</th>
                  <th style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>Draws</th>
                  <th style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>Sets</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderTop: '1px solid #2a2a2e' }}>
                  <td style={{ color: '#e5484d', fontSize: 13, padding: '8px 12px', fontWeight: 700 }}>1-4</td>
                  <td style={{ color: '#4fce82', fontSize: 12, padding: '8px 12px' }}>All-in</td>
                  <td style={{ color: '#e5484d', fontSize: 12, padding: '8px 12px' }}>Fraco</td>
                  <td style={{ color: '#4fce82', fontSize: 12, padding: '8px 12px' }}>All-in</td>
                </tr>
                <tr style={{ borderTop: '1px solid #2a2a2e' }}>
                  <td style={{ color: '#f5a623', fontSize: 13, padding: '8px 12px', fontWeight: 700 }}>4-8</td>
                  <td style={{ color: '#f5a623', fontSize: 12, padding: '8px 12px' }}>Proteger</td>
                  <td style={{ color: '#f5a623', fontSize: 12, padding: '8px 12px' }}>Semi-bluff</td>
                  <td style={{ color: '#4fce82', fontSize: 12, padding: '8px 12px' }}>Construir</td>
                </tr>
                <tr style={{ borderTop: '1px solid #2a2a2e' }}>
                  <td style={{ color: '#4fce82', fontSize: 13, padding: '8px 12px', fontWeight: 700 }}>8+</td>
                  <td style={{ color: '#0a84d7', fontSize: 12, padding: '8px 12px' }}>Pot control</td>
                  <td style={{ color: '#4fce82', fontSize: 12, padding: '8px 12px' }}>Implied odds</td>
                  <td style={{ color: '#4fce82', fontSize: 12, padding: '8px 12px' }}>Stack off</td>
                </tr>
              </tbody>
            </table>
          </div>
          <button onClick={onComplete}
            style={{
              width: '100%', padding: '14px', borderRadius: 8, marginTop: 16,
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
            Modulo 22 - SPR (Stack-to-Pot Ratio)
          </h1>
          <p style={{ color: '#676671', fontSize: 13, marginBottom: 20 }}>
            Como o tamanho do stack relativo ao pote muda toda a estrategia pos-flop
          </p>

          {/* Section nav */}
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
  const progress = getModuleProgress(22)

  const [scenario, setScenario] = useState(() => generateSPRScenario())
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
    recordAnswer(22, isCorrect, newStreak, { tp: 'spr' })
    setResult({ isCorrect, explanation: scenario.explanation, chosenId: optionId })
  }, [result, scenario, streak, recordAnswer])

  const handleNext = useCallback(() => {
    const nextHand = handNum + 1
    if (nextHand >= 10) {
      const accuracy = Math.round((sessionCorrect / 10) * 100)
      recordSession(22, accuracy)
      setShowReview(true)
    } else {
      setHandNum(nextHand)
    }
    setResult(null)
    setScenario(generateSPRScenario())
  }, [handNum, sessionCorrect, recordSession])

  const acc = progress.totalAnswered > 0 ? progress.accuracy : 0
  const sessionAcc = handNum > 0 ? Math.round((sessionCorrect / handNum) * 100) : 0

  if (showReview) {
    return <SessionReview moduleId={22} sessionCorrect={sessionCorrect} sessionTotal={10} onContinue={() => { setHandNum(0); setSessionCorrect(0); setShowReview(false); setStreak(0) }} />
  }

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-16" style={{ background: '#0f0f0f' }}>
      <div className="max-w-2xl mx-auto px-4 pt-6">

        {/* Stats */}
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

        {/* Card */}
        <div className="rounded-2xl p-5 mb-4" style={{
          background: '#1a1a1d',
          border: `1px solid ${result ? (result.isCorrect ? '#4fce8255' : '#e5484d55') : '#2a2a2e'}`,
        }}>
          <div style={{ color: '#676671', fontSize: 11, fontWeight: 600, marginBottom: 12 }}>
            SPR - CENARIO {handNum + 1}/10
          </div>

          {scenario.heroCards && scenario.heroCards.length > 0 && (
            <ModulePokerTable
              heroPos={scenario.heroPos || 'BTN'}
              villainPos={scenario.villainPos || 'BB'}
              heroCards={scenario.heroCards}
              boardCards={scenario.boardCards || []}
              villainAction={scenario.villainAction || ''}
              potLabel={scenario.potLabel || ''}
              contextTitle="SPR Analysis"
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
              {!result.isCorrect && <DecisionTree scenario={{ ...scenario, moduleId: 22 }} result={result} />}
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

export default function Module22() {
  const { progress, markLessonRead } = useProgress()
  const mod = progress.modules[22]
  const [view, setView] = useState(mod?.lessonRead ? 'trainer' : 'lesson')

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
          <button onClick={() => mod?.lessonRead && setView('trainer')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'trainer' ? '#e5484d' : '#1a1a1d', color: view === 'trainer' ? 'white' : (mod?.lessonRead ? '#888' : '#444'), border: '1px solid #2a2a2e', cursor: mod?.lessonRead ? 'pointer' : 'not-allowed' }}>Trainer {!mod?.lessonRead && '🔒'}</button>
        </div>
        {view === 'lesson' ? <Lesson onComplete={() => { markLessonRead(22); setView('trainer') }} /> : <Trainer />}
      </div>
    </div>
  )
}
