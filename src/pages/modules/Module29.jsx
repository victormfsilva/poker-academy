import { useState, useCallback } from 'react'
import { useProgress } from '../../context/ProgressContext'
import SessionReview from '../../components/SessionReview'
import Card from '../../components/Card'
import ModulePokerTable from '../../components/ModulePokerTable'
import { calcEquity } from '../../lib/equity'

const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2']
const SUITS = ['s','h','d','c']
const RANK_VAL = { A:14, K:13, Q:12, J:11, T:10, '9':9, '8':8, '7':7, '6':6, '5':5, '4':4, '3':3, '2':2 }

// ─── Helper Functions ────────────────────────────────────────────────────────

function randomCards(n, exclude = []) {
  const cards = []
  while (cards.length < n) {
    const c = RANKS[Math.floor(Math.random() * RANKS.length)] + SUITS[Math.floor(Math.random() * SUITS.length)]
    if (!cards.includes(c) && !exclude.includes(c)) cards.push(c)
  }
  return cards
}

function hasTopPair(hole, board) {
  const boardRanks = board.map(c => c.slice(0, -1))
  const holeRanks = hole.map(c => c.slice(0, -1))
  const topRank = [...boardRanks].sort((a, b) => RANKS.indexOf(a) - RANKS.indexOf(b))[0]
  return holeRanks.includes(topRank)
}

function hasAnyPair(hole, board) {
  const boardRanks = board.map(c => c.slice(0, -1))
  return hole.map(c => c.slice(0, -1)).some(r => boardRanks.includes(r))
}

function hasMadeFlush(hole, board) {
  const suitCounts = {}
  ;[...hole, ...board].forEach(c => { const s = c.slice(-1); suitCounts[s] = (suitCounts[s] || 0) + 1 })
  return Object.values(suitCounts).some(v => v >= 5)
}

function hasMadeStraight(hole, board) {
  const holeVals = hole.map(c => RANK_VAL[c.slice(0, -1)])
  const allVals = [...new Set([...hole, ...board].map(c => RANK_VAL[c.slice(0, -1)]))].sort((a, b) => a - b)
  if (allVals.includes(14)) allVals.unshift(1)
  for (let i = 0; i <= allVals.length - 5; i++) {
    if (allVals[i + 4] - allVals[i] === 4) {
      const run = [allVals[i], allVals[i+1], allVals[i+2], allVals[i+3], allVals[i+4]]
      if (holeVals.some(v => run.includes(v) || (v === 14 && run.includes(1)))) return true
    }
  }
  return false
}

function hasSetFn(hole, board) {
  const holeRanks = hole.map(c => c.slice(0, -1))
  const boardRanks = board.map(c => c.slice(0, -1))
  return holeRanks[0] === holeRanks[1] && boardRanks.includes(holeRanks[0])
}

function hasTwoPairFn(hole, board) {
  const holeRanks = hole.map(c => c.slice(0, -1))
  const boardRanks = board.map(c => c.slice(0, -1))
  if (holeRanks[0] === holeRanks[1]) return false
  return [...new Set(holeRanks)].filter(r => boardRanks.includes(r)).length === 2
}

function hasOverpair(hole, board) {
  const holeRanks = hole.map(c => c.slice(0, -1))
  if (holeRanks[0] !== holeRanks[1]) return false
  const pocketVal = RANK_VAL[holeRanks[0]]
  const topBoardVal = Math.max(...board.map(c => RANK_VAL[c.slice(0, -1)]))
  return pocketVal > topBoardVal
}

function hasFlushDrawMissed(hole, board) {
  const holeSuits = hole.map(c => c.slice(-1))
  const suitCounts = {}
  ;[...hole, ...board].forEach(c => { const s = c.slice(-1); suitCounts[s] = (suitCounts[s] || 0) + 1 })
  return Object.entries(suitCounts).some(([suit, count]) => count === 4 && holeSuits.includes(suit))
}

function boardHasFlushPossible(board) {
  const suitCounts = {}
  board.forEach(c => { const s = c.slice(-1); suitCounts[s] = (suitCounts[s] || 0) + 1 })
  return Object.values(suitCounts).some(v => v >= 3)
}

function boardHasStraightPossible(board) {
  const vals = [...new Set(board.map(c => RANK_VAL[c.slice(0, -1)]))].sort((a, b) => a - b)
  if (vals.includes(14)) vals.unshift(1)
  for (let i = 0; i < vals.length - 2; i++) {
    if (vals[i + 2] - vals[i] <= 4) return true
  }
  return false
}

// ─── Filtro: hero teria chegado ao river como DEFENSOR (OOP, chamou cbets) ──

function wouldPlayToRiver(hole, board) {
  const flop = board.slice(0, 3)
  const holeRanks = hole.map(c => c.slice(0, -1))
  const isPocketPair = holeRanks[0] === holeRanks[1]

  // Mao muito forte no board completo: sempre teria chamado
  if (hasMadeFlush(hole, board)) return true
  if (hasMadeStraight(hole, board)) return true
  if (hasSetFn(hole, board)) return true
  if (hasTwoPairFn(hole, board)) return true
  if (hasOverpair(hole, board)) return true
  if (hasTopPair(hole, board)) return true
  if (hasAnyPair(hole, board)) return true

  // Flush draw que falhou mas teria chegado chamando
  if (hasFlushDrawMissed(hole, board)) return true

  // Pocket pair: teria defendido e chamado no flop
  if (isPocketPair) return true

  // Teria chamado cbets no flop com par ou draw
  if (hasTopPair(hole, flop) || hasAnyPair(hole, flop)) return true
  const flopSuitCounts = {}
  ;[...hole, ...flop].forEach(c => { const s = c.slice(-1); flopSuitCounts[s] = (flopSuitCounts[s] || 0) + 1 })
  if (Object.values(flopSuitCounts).some(v => v >= 4)) return true

  return false
}

// ─── Lógica GTO: decisão do DEFENSOR enfrentando aposta no river ─────────────

function getCorrectAction(hole, board, villainSizing) {
  const flushOnBoard = boardHasFlushPossible(board)
  const straightOnBoard = boardHasStraightPossible(board)
  const isBigSizing = villainSizing === '75%' || villainSizing === '100%'
  const isSmallSizing = villainSizing === '33%'
  const isMedSizing = villainSizing === '50%'

  // Blocker concept: você tem o As do naipe do flush no board?
  const boardSuitCounts = {}
  board.forEach(c => { const s = c.slice(-1); boardSuitCounts[s] = (boardSuitCounts[s] || 0) + 1 })
  const flushSuit = Object.keys(boardSuitCounts).find(s => boardSuitCounts[s] >= 3)
  const holeSuits = hole.map(c => c.slice(-1))
  const holeRanks = hole.map(c => c.slice(0, -1))
  // Verifica se hero tem o Ás ESPECIFICAMENTE do naipe do flush
  const hasNutFlushBlocker = flushSuit && hole.some(c => c.slice(0, -1) === 'A' && c.slice(-1) === flushSuit)

  // ── NUTS / NEAR-NUTS: sempre call, considerar raise ──────────────────────
  if (hasMadeFlush(hole, board)) {
    return {
      action: 'raise',
      sizing: villainSizing,
      reason: `Flush completo no river! Você tem uma das mãos mais fortes possíveis como defensor. Raise para extrair valor máximo — o vilão está apostando com sua range de value e bluffs. Contra qualquer sizing (${villainSizing}), você deve fazer raise, pois tem equity enorme e o vilão pode continuar com mãos piores.`,
    }
  }

  if (hasMadeStraight(hole, board)) {
    if (flushOnBoard && !isBigSizing) {
      return {
        action: 'call',
        sizing: villainSizing,
        reason: `Straight no river, mas o board tem possibilidade de flush. Contra ${villainSizing} do pot você deve chamar — suas pot odds são boas (você precisa de ${villainSizing === '33%' ? '20%' : '25%'} de equity) e straight ainda vence a maioria dos bluffs e value hands inferiores. Cuidado se ele der raise.`,
      }
    }
    if (flushOnBoard && isBigSizing) {
      return {
        action: 'call',
        sizing: villainSizing,
        reason: `Straight no river, board tem flush possível. Contra ${villainSizing} você precisa de ~${villainSizing === '75%' ? '30%' : '33%'} de equity para justificar o call. Seu straight ainda bate bluffs e mãos de valor menores — call correto, mas cuidado com possível flush do vilão.`,
      }
    }
    return {
      action: 'raise',
      sizing: villainSizing,
      reason: `Straight no river em board sem flush! Você tem mão muito forte. Raise para extrair valor máximo do vilão. Ele pode continuar com pares, dois pares e bleffs. Não deixe ele ir grátis ao showdown.`,
    }
  }

  if (hasSetFn(hole, board)) {
    if (!flushOnBoard && !straightOnBoard) {
      return {
        action: 'raise',
        sizing: villainSizing,
        reason: `Set no river em board limpo! Raise para extrair valor máximo. Seu set vence top pair, dois pares e bluffs. O vilão pode continuar com mãos piores pensando que você está blefando.`,
      }
    }
    return {
      action: 'call',
      sizing: villainSizing,
      reason: `Set no river — mão muito forte, mas board tem ${flushOnBoard ? 'flush' : 'straight'} possível. Call é correto — você vence a maioria dos bluffs e value bets menores, mas raise pode ser explorado se vilão tiver nuts.`,
    }
  }

  // ── DOIS PARES ────────────────────────────────────────────────────────────
  if (hasTwoPairFn(hole, board)) {
    if (flushOnBoard && isBigSizing) {
      return {
        action: 'fold',
        sizing: villainSizing,
        reason: `Dois pares em board com flush possível, vilão apostou ${villainSizing} do pot. Sizing grande indica forte polarização — ou nuts (flush) ou bluff puro. Seus dois pares perdem para flush e o vilão não valueia assim tão grande com mãos piores. Fold é defensável.`,
      }
    }
    if (flushOnBoard && (isSmallSizing || isMedSizing)) {
      return {
        action: 'call',
        sizing: villainSizing,
        reason: `Dois pares, board perigoso, mas vilão apostou apenas ${villainSizing}. Sizing pequeno sugere range mais amplo e muitos bluffs. Suas pot odds são ${villainSizing === '33%' ? '20%' : '25%'} de equity necessária — dois pares têm equity suficiente contra o range do vilão. Call.`,
      }
    }
    if (straightOnBoard && isBigSizing) {
      return {
        action: 'fold',
        sizing: villainSizing,
        reason: `Dois pares em board com straight possível, ${villainSizing} do pot é sizing grande. O range de value do vilão bate você (straight, sets). Contra esse sizing você precisa de ~${villainSizing === '75%' ? '30%' : '33%'} de equity e dois pares ficam em posição difícil. Fold marginal mas correto.`,
      }
    }
    return {
      action: 'call',
      sizing: villainSizing,
      reason: `Dois pares no river em board razoavelmente seguro contra ${villainSizing} do pot. Você precisa de ${villainSizing === '33%' ? '20%' : villainSizing === '50%' ? '25%' : '30%'} de equity para justificar o call. Dois pares vence top pair, pares menores e todos os bluffs do vilão. Call correto.`,
    }
  }

  // ── OVERPAIR ──────────────────────────────────────────────────────────────
  if (hasOverpair(hole, board)) {
    if ((flushOnBoard || straightOnBoard) && isBigSizing) {
      return {
        action: 'fold',
        sizing: villainSizing,
        reason: `Overpair em board assustador (flush/straight possível) e vilão apostou ${villainSizing} do pot. Sizing polarizado grande indica nuts ou bluff puro — sua overpair perde para toda a range de valor (flush, straight, set). Você precisaria de ${villainSizing === '75%' ? '30%' : '33%'} de equity. Fold.`,
      }
    }
    if (flushOnBoard && (isSmallSizing || isMedSizing)) {
      return {
        action: 'call',
        sizing: villainSizing,
        reason: `Overpair em board com flush possível, mas vilão apostou apenas ${villainSizing}. Sizing pequeno indica range amplo com muitos bluffs. Suas pot odds justificam o call — overpair vence bluffs e value bets menores.`,
      }
    }
    if (straightOnBoard && isSmallSizing) {
      return {
        action: 'call',
        sizing: villainSizing,
        reason: `Overpair em board com straight possível, vilão apostou apenas ${villainSizing}. Pot odds exigem ~20% equity. Overpair vence bluffs e muitas mãos de valor — call correto contra sizing pequeno.`,
      }
    }
    if ((flushOnBoard || straightOnBoard) && isMedSizing) {
      return {
        action: 'fold',
        sizing: villainSizing,
        reason: `Overpair em board perigoso contra ${villainSizing}. Board completa draws e o sizing sugere que vilão tem range forte. Fold marginal mas prudente.`,
      }
    }
    if (isSmallSizing) {
      return {
        action: 'call',
        sizing: villainSizing,
        reason: `Overpair em board limpo, vilão apostou apenas ${villainSizing}. Suas pot odds são ótimas — precisa de apenas 20% de equity. Overpair bate todos os bluffs e pares menores. O range do vilão inclui muitos bluffs com sizing pequeno. Call.`,
      }
    }
    if (isMedSizing) {
      return {
        action: 'call',
        sizing: villainSizing,
        reason: `Overpair em board limpo contra ${villainSizing}. Você precisa de 25% de equity — overpair tem equity suficiente contra o range polarizado do vilão (valor + bluffs). Call correto em board seguro.`,
      }
    }
    // Big sizing on clean board
    return {
      action: 'fold',
      sizing: villainSizing,
      reason: `Overpair em board limpo mas vilão apostou ${villainSizing} — sizing grande polarizado. Você precisa de ${villainSizing === '75%' ? '30%' : '33%'} de equity. Quando o vilão valueia assim grande, ele geralmente tem sets, dois pares, ou straight. Overpair perde para todo o range de valor. Fold marginal.`,
    }
  }

  // ── TOP PAIR ──────────────────────────────────────────────────────────────
  if (hasTopPair(hole, board)) {
    const topPairRank = holeRanks.find(r => board.map(c => c.slice(0, -1)).includes(r))
    const topBoardRankVal = Math.max(...board.map(c => RANK_VAL[c.slice(0, -1)]))
    const myKickerVals = holeRanks.filter(r => r !== topPairRank).map(r => RANK_VAL[r])
    const goodKicker = myKickerVals.some(v => v >= RANK_VAL['J'])

    if ((flushOnBoard || straightOnBoard) && isBigSizing) {
      return {
        action: 'fold',
        sizing: villainSizing,
        reason: `Top pair em board perigoso (flush/straight possível), vilão apostou ${villainSizing}. Sizing grande polarizado — top pair perde para range de valor (flush, straight, sets). Fold.`,
      }
    }
    if ((flushOnBoard || straightOnBoard) && isSmallSizing) {
      return {
        action: 'call',
        sizing: villainSizing,
        reason: `Top pair em board perigoso, mas vilão apostou apenas ${villainSizing}. Pot odds de ~20% — top pair ${goodKicker ? 'com bom kicker' : ''} vence bluffs e thin value bets. Call correto contra sizing pequeno.`,
      }
    }
    if ((flushOnBoard || straightOnBoard) && isMedSizing) {
      return {
        action: goodKicker ? 'call' : 'fold',
        sizing: villainSizing,
        reason: goodKicker
          ? `Top pair bom kicker em board perigoso contra ${villainSizing}. Marginal mas pot odds de 25% justificam call com bom kicker.`
          : `Top pair kicker fraco em board perigoso contra ${villainSizing}. Sem kicker bom, fold é mais seguro.`,
      }
    }

    if (goodKicker && isSmallSizing) {
      return {
        action: 'call',
        sizing: villainSizing,
        reason: `Top pair com bom kicker em board limpo, vilão apostou apenas ${villainSizing}. Suas pot odds exigem apenas 20% de equity. Top pair bom kicker vence a maioria dos bluffs e mãos de valor inferiores. Com sizing pequeno o vilão tem range amplo com muitos bluffs. Call correto.`,
      }
    }
    if (goodKicker && isMedSizing) {
      return {
        action: 'call',
        sizing: villainSizing,
        reason: `Top pair bom kicker em board limpo contra ${villainSizing}. Precisa de 25% de equity — top pair bom kicker tem equity suficiente contra o range do vilão que inclui bluffs e mãos inferiores. Call.`,
      }
    }
    if (goodKicker && hasNutFlushBlocker && isBigSizing) {
      return {
        action: 'call',
        sizing: villainSizing,
        reason: `Top pair bom kicker, sizing grande (${villainSizing}), mas você tem blocker para o nut flush! Seu As de copas remove combos do range de valor do vilão, aumentando proporcionalmente os bluffs. Com blocker relevante, call se torna defensável mesmo contra sizing grande.`,
      }
    }
    if (goodKicker && isBigSizing) {
      return {
        action: 'fold',
        sizing: villainSizing,
        reason: `Top pair bom kicker, mas vilão apostou ${villainSizing} — sizing grande em board limpo. Você precisa de ${villainSizing === '75%' ? '30%' : '33%'} de equity. Contra sizing polarizado grande, o range de valor do vilão (sets, dois pares) bate você. Fold correto.`,
      }
    }

    // Top pair mau kicker
    if (isSmallSizing) {
      return {
        action: 'fold',
        sizing: villainSizing,
        reason: `Top pair com kicker fraco contra ${villainSizing}. Mesmo com pot odds de 20%, seu kicker ruim significa que você perde para top pair com kicker melhor além de toda a range de valor. Range de dominância é alto. Fold.`,
      }
    }
    return {
      action: 'fold',
      sizing: villainSizing,
      reason: `Top pair com kicker fraco contra ${villainSizing} do pot. Kicker fraco significa que você perde para qualquer top pair com kicker melhor, toda a range de valor, e muitas mãos two pair+. Fold correto na maioria dos sizings.`,
    }
  }

  // ── PAR MÉDIO / BAIXO ─────────────────────────────────────────────────────
  if (hasAnyPair(hole, board)) {
    if (isSmallSizing && !flushOnBoard && !straightOnBoard && hasNutFlushBlocker) {
      return {
        action: 'call',
        sizing: villainSizing,
        reason: `Par médio/baixo em board limpo contra sizing pequeno (${villainSizing}). Com blocker relevante para o range de valor do vilão e sizing pequeno, você tem as pot odds (20%) e o vilão tem muitos bluffs nessa range. Call de bluff catcher defensável.`,
      }
    }
    if (isSmallSizing && !flushOnBoard && !straightOnBoard) {
      return {
        action: 'fold',
        sizing: villainSizing,
        reason: `Par médio/baixo contra ${villainSizing}. Mesmo com pot odds razoáveis, par médio/baixo perde para top pair, dois pares, sets e qualquer mão de valor. Você não tem equity suficiente como bluff catcher puro. Fold.`,
      }
    }
    return {
      action: 'fold',
      sizing: villainSizing,
      reason: `Par médio/baixo no river contra ${villainSizing}. Board perigoso e/ou sizing muito grande. Você não tem equity suficiente para chamar — perde para toda a range de valor e precisa de muito mais equity do que par médio oferece. Fold.`,
    }
  }

  // ── SEM PAR (ar) ──────────────────────────────────────────────────────────
  return {
    action: 'fold',
    sizing: villainSizing,
    reason: `Sem par no river, vilão apostou ${villainSizing}. Você não tem showdown value nenhum — não pode vencer no showdown. Fold sempre. No river, mãos sem par não têm equity contra a range de value do vilão.`,
  }
}

// ─── Sizing do vilão ──────────────────────────────────────────────────────────

const SIZINGS = ['33%', '50%', '75%', '100%']

const HERO_POSITIONS = ['BB', 'SB', 'UTG', 'MP']
const VILLAIN_POSITIONS = ['BTN', 'CO', 'HJ']
const POT_LABELS = ['22bb', '28bb', '34bb', '42bb', '18bb', '30bb', '26bb']

// ─── Generate Scenario ────────────────────────────────────────────────────────

function generateScenario() {
  let board, heroCards
  for (let i = 0; i < 200; i++) {
    board = randomCards(5)
    heroCards = randomCards(2, board)
    if (wouldPlayToRiver(heroCards, board)) break
  }

  const villainSizing = SIZINGS[Math.floor(Math.random() * SIZINGS.length)]
  const { action, reason } = getCorrectAction(heroCards, board, villainSizing)

  const heroPos = HERO_POSITIONS[Math.floor(Math.random() * HERO_POSITIONS.length)]
  const villainPos = VILLAIN_POSITIONS[Math.floor(Math.random() * VILLAIN_POSITIONS.length)]
  const potLabel = POT_LABELS[Math.floor(Math.random() * POT_LABELS.length)]

  // Build options: always call + fold, sometimes raise for strong hands
  const allOptions = [
    { id: 'call', label: 'Call', correct: action === 'call' },
    { id: 'fold', label: 'Fold', correct: action === 'fold' },
  ]
  if (action === 'raise') {
    allOptions.push({ id: 'raise', label: 'Raise', correct: true })
    // call becomes not correct when raise is best
    allOptions[0].correct = false
  }

  // For near-strong hands, also show raise as option but it's not correct
  const showRaise = action === 'raise' || hasMadeFlush(heroCards, board) || hasSetFn(heroCards, board) || hasMadeStraight(heroCards, board)
  if (showRaise && !allOptions.find(o => o.id === 'raise')) {
    allOptions.push({ id: 'raise', label: 'Raise', correct: false })
  }

  const equityNeeded = villainSizing === '33%' ? '20%' : villainSizing === '50%' ? '25%' : villainSizing === '75%' ? '30%' : '33%'

  const question = `Você está OOP como defensor. Vilão apostou ${villainSizing} do pot no river. Board: completo com todas as 5 cartas. Pot odds: você precisa de ${equityNeeded} de equity para justificar o call. Qual sua ação?`

  return {
    question,
    options: allOptions,
    explanation: reason + (() => { const eq = calcEquity(heroCards, board); return eq !== null ? ` (${eq}% equity vs range aleatorio)` : '' })(),
    heroCards,
    boardCards: board,
    heroPos,
    villainPos,
    villainAction: `Bet ${villainSizing}`,
    potLabel,
    correctAction: action,
  }
}

// ─── Aula ─────────────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e', marginBottom: 12 }}>
      <h3 style={{ color: 'white', fontWeight: 600, marginBottom: 8, fontSize: 15 }}>{title}</h3>
      <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>{children}</div>
    </div>
  )
}

function Lesson({ onComplete }) {
  const [section, setSection] = useState(0)

  const sections = [
    {
      title: 'River: Decisao Final',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            No river como <strong style={{ color: '#0a84d7' }}>defensor</strong>, você não tem mais cards para receber.
            A decisão é simples: <strong style={{ color: '#fdfdfd' }}>você tem equity suficiente para chamar?</strong>
          </p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #0a84d7' }}>
              <div style={{ color: '#0a84d7', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>CALL</div>
              <div style={{ color: '#ccc', fontSize: 12 }}>Você vence bluffs do vilão e tem pot odds favoráveis</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #e5484d' }}>
              <div style={{ color: '#e5484d', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>FOLD</div>
              <div style={{ color: '#ccc', fontSize: 12 }}>Você perde para a maioria do range de valor do vilão</div>
            </div>
          </div>
          <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #4fce82' }}>
            <div style={{ color: '#4fce82', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>RAISE</div>
            <div style={{ color: '#ccc', fontSize: 12 }}>Apenas com mãos muito fortes (flush, straight em board limpo) para extrair valor máximo</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Pot Odds — O Calculo',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>
            Pot odds respondem: <strong style={{ color: '#fdfdfd' }}>qual % de equity você precisa para o call ser lucrativo?</strong>
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2a2a2e' }}>
                  <th style={{ color: '#888', padding: '8px 12px', textAlign: 'left' }}>Sizing do vilão</th>
                  <th style={{ color: '#888', padding: '8px 12px', textAlign: 'center' }}>Equity Necessaria</th>
                  <th style={{ color: '#888', padding: '8px 12px', textAlign: 'right' }}>Nivel de Dificuldade</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { sz: '33% do pot', eq: '20%', dif: 'Facil de chamar', color: '#4fce82' },
                  { sz: '50% do pot', eq: '25%', dif: 'Razoavel', color: '#f5a623' },
                  { sz: '75% do pot', eq: '30%', dif: 'Dificil', color: '#f5a623' },
                  { sz: '100% do pot', eq: '33%', dif: 'Muito difícil', color: '#e5484d' },
                ].map(r => (
                  <tr key={r.sz} style={{ borderBottom: '1px solid #1a1a1d' }}>
                    <td style={{ color: '#fdfdfd', padding: '8px 12px' }}>{r.sz}</td>
                    <td style={{ color: r.color, padding: '8px 12px', textAlign: 'center', fontWeight: 700 }}>{r.eq}</td>
                    <td style={{ color: '#888', padding: '8px 12px', textAlign: 'right', fontSize: 12 }}>{r.dif}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-lg p-3 mt-4" style={{ background: '#0f0f0f', border: '1px solid #2a2a2e' }}>
            <div style={{ color: '#888', fontSize: 12 }}>Formula: Equity = Bet / (Pot + Bet + Call)</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Quando Chamar?',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>
            Chame quando você for <strong style={{ color: '#fdfdfd' }}>bluff catcher eficiente</strong> — vence bluffs do vilão E tem pot odds adequadas.
          </p>
          <div className="space-y-2 mb-4">
            {[
              { mao: 'Flush / Straight', acao: 'Call ou Raise', color: '#4fce82' },
              { mao: 'Set', acao: 'Call sempre', color: '#4fce82' },
              { mao: 'Dois pares (board limpo)', acao: 'Call qualquer sizing', color: '#4fce82' },
              { mao: 'Dois pares (board perigoso)', acao: 'Call pequeno, fold grande', color: '#f5a623' },
              { mao: 'Overpair (board limpo)', acao: 'Call 33-50%, fold 75%+', color: '#f5a623' },
              { mao: 'Top pair bom kicker', acao: 'Call 33-50%, fold 75%+', color: '#f5a623' },
              { mao: 'Top pair kicker ruim', acao: 'Fold quase sempre', color: '#e5484d' },
              { mao: 'Par médio/baixo', acao: 'Fold (bluff catcher fraco)', color: '#e5484d' },
              { mao: 'Sem par', acao: 'Fold sempre', color: '#e5484d' },
            ].map(r => (
              <div key={r.mao} className="flex justify-between items-center rounded-lg px-3 py-2" style={{ background: '#0f0f0f' }}>
                <span style={{ color: '#ccc', fontSize: 13 }}>{r.mao}</span>
                <span style={{ color: r.color, fontWeight: 600, fontSize: 12 }}>{r.acao}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: 'Blockers e MDF',
      content: (
        <div>
          <Section title="Conceito de Blocker">
            Se você tem o <strong style={{ color: '#f5a623' }}>As de copas</strong> e o board tem 3 copas, o vilão
            NÃO pode ter nut flush. Isso remove combos de valor do range dele — proporcionalmente ele tem mais bluffs.
            <strong style={{ color: '#0a84d7' }}> Com blocker relevante → você pode chamar mais.</strong>
          </Section>
          <Section title="Frequencia Minima de Defesa (MDF)">
            Você não pode foldar demais ou o vilão imprime dinheiro blefando.
            <br /><br />
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #2a2a2e' }}>
              <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>MDF = 1 - (Bet / (Pot + Bet))</div>
              {[
                { sz: '33%', mdf: '75%' },
                { sz: '50%', mdf: '67%' },
                { sz: '75%', mdf: '57%' },
                { sz: '100%', mdf: '50%' },
              ].map(r => (
                <div key={r.sz} className="flex justify-between" style={{ padding: '4px 0', borderBottom: '1px solid #1a1a1d' }}>
                  <span style={{ color: '#ccc', fontSize: 13 }}>Bet {r.sz}</span>
                  <span style={{ color: '#4fce82', fontWeight: 700, fontSize: 13 }}>Defender {r.mdf} das maos</span>
                </div>
              ))}
            </div>
          </Section>
          <button onClick={onComplete}
            style={{
              width: '100%', padding: '14px', borderRadius: 8, marginTop: 16,
              background: '#0a84d7', border: 'none', color: 'white',
              fontWeight: 700, fontSize: 15, cursor: 'pointer',
            }}>
            Entendi — Quero Treinar
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
            Modulo 29 — Facing River Bet
          </h1>
          <p style={{ color: '#676671', fontSize: 13, marginBottom: 20 }}>
            vilão aposta o river. Voce defende: call, fold ou raise?
          </p>

          <div className="flex gap-1 mb-6 overflow-x-auto">
            {sections.map((s, i) => (
              <button key={i} onClick={() => setSection(i)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
                style={{
                  background: section === i ? 'rgba(10,132,215,0.15)' : 'transparent',
                  color: section === i ? '#0a84d7' : '#676671',
                  border: `1px solid ${section === i ? '#0a84d7' : 'transparent'}`,
                  cursor: 'pointer',
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

// ─── Trainer ──────────────────────────────────────────────────────────────────

function Trainer() {
  const { recordAnswer, recordSession, getModuleProgress } = useProgress()
  const progress = getModuleProgress(29)

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
    recordAnswer(29, isCorrect, newStreak, { tp: 'river-def' })
    setResult({ isCorrect, explanation: scenario.explanation, chosenId: optionId, correctAction: scenario.correctAction })
  }, [result, scenario, streak, recordAnswer])

  const handleNext = useCallback(() => {
    const nextHand = handNum + 1
    if (nextHand >= 10) {
      const accuracy = Math.round((sessionCorrect / 10) * 100)
      recordSession(29, accuracy)
      setShowReview(true)
    } else {
      setHandNum(nextHand)
    }
    setResult(null)
    setScenario(generateScenario())
  }, [handNum, sessionCorrect, recordSession])

  const acc = progress.totalAnswered > 0 ? progress.accuracy : 0

  if (showReview) {
    return (
      <SessionReview
        moduleId={29}
        sessionCorrect={sessionCorrect}
        sessionTotal={10}
        onContinue={() => { setHandNum(0); setSessionCorrect(0); setShowReview(false); setStreak(0) }}
      />
    )
  }

  const ACTION_COLOR = {
    call: '#0a84d7',
    fold: '#e5484d',
    raise: '#4fce82',
  }

  const ACTION_LABEL = {
    call: 'CALL',
    fold: 'FOLD',
    raise: 'RAISE',
  }

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-16" style={{ background: '#0f0f0f' }}>
      <div className="max-w-2xl mx-auto px-4 pt-6">

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { label: 'Sessao', value: `${handNum}/10`, color: '#e5484d' },
            { label: 'Precisao', value: `${acc}%`, color: '#4fce82' },
            { label: 'Streak', value: streak, color: '#f5a623' },
          ].map((s, i) => (
            <div key={i} className="rounded-lg p-2.5 text-center" style={{ background: '#1a1a1d' }}>
              <div style={{ color: '#676671', fontSize: 10, marginBottom: 2 }}>{s.label}</div>
              <div style={{ color: s.color, fontSize: 18, fontWeight: 700, fontFamily: 'monospace' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="rounded-full h-1.5 mb-5" style={{ background: '#2a2a2e' }}>
          <div className="rounded-full h-1.5 transition-all" style={{ width: `${(handNum / 10) * 100}%`, background: '#0a84d7' }} />
        </div>

        <div className="rounded-2xl p-5" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>

          {/* Poker table */}
          <ModulePokerTable
            heroPos={scenario.heroPos}
            villainPos={scenario.villainPos}
            heroCards={scenario.heroCards}
            boardCards={scenario.boardCards}
            villainAction={scenario.villainAction}
            potLabel={scenario.potLabel}
            contextTitle="Voce esta OOP — Facing River Bet"
            contextDesc="vilão apostou o river. Voce defende."
          />

          {/* Question */}
          <div style={{ color: '#fdfdfd', fontSize: 15, lineHeight: 1.7, marginBottom: 20 }}>
            {scenario.question}
          </div>

          {/* Buttons */}
          {!result && (
            <div className="space-y-2">
              {/* Call button */}
              <button
                onClick={() => handleAnswer('call')}
                className="w-full py-4 rounded-xl font-bold text-white text-base"
                style={{ background: '#0a84d7', border: 'none', cursor: 'pointer', fontSize: 15 }}>
                Call
              </button>
              {/* Fold button */}
              <button
                onClick={() => handleAnswer('fold')}
                className="w-full py-4 rounded-xl font-bold text-white text-base"
                style={{ background: '#e5484d', border: 'none', cursor: 'pointer', fontSize: 15 }}>
                Fold
              </button>
              {/* Raise button — only when scenario has raise as option */}
              {scenario.options.find(o => o.id === 'raise') && (
                <button
                  onClick={() => handleAnswer('raise')}
                  className="w-full py-4 rounded-xl font-bold text-base"
                  style={{ background: '#4fce82', border: 'none', color: '#0f0f0f', cursor: 'pointer', fontSize: 15 }}>
                  Raise
                </button>
              )}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="mt-2">
              <div className="rounded-lg p-4 mb-3" style={{
                background: result.isCorrect ? 'rgba(79,206,130,0.08)' : 'rgba(229,72,77,0.08)',
                border: `1px solid ${result.isCorrect ? 'rgba(79,206,130,0.25)' : 'rgba(229,72,77,0.25)'}`,
              }}>
                <div style={{ color: result.isCorrect ? '#4fce82' : '#e5484d', fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
                  {result.isCorrect ? 'Correto!' : 'Errado'}
                </div>
                <div style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 1.6 }}>
                  {result.explanation}
                </div>
                {!result.isCorrect && (
                  <div style={{ color: '#555', fontSize: 12, marginTop: 8 }}>
                    Resposta correta:{' '}
                    <strong style={{ color: ACTION_COLOR[result.correctAction] || '#f5a623' }}>
                      {ACTION_LABEL[result.correctAction] || result.correctAction.toUpperCase()}
                    </strong>
                  </div>
                )}
              </div>
              <button onClick={handleNext}
                style={{
                  width: '100%', padding: '12px', borderRadius: 8,
                  background: '#0a84d7', border: 'none', color: 'white',
                  fontWeight: 700, fontSize: 14, cursor: 'pointer',
                }}>
                {handNum >= 9 ? 'Finalizar Sessao' : 'Proxima Mao →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Export default ───────────────────────────────────────────────────────────

export default function Module29() {
  const { progress, markLessonRead, getModuleProgress } = useProgress()
  const mod = progress.modules[29]
  const modProgress = getModuleProgress(29)
  const [view, setView] = useState(modProgress.lessonRead ? 'trainer' : 'lesson')

  if (!mod?.unlocked) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f0f' }}>
      <div className="text-center">
        <div style={{ fontSize: 60 }}>🔒</div>
        <h2 style={{ color: 'white', marginTop: 16 }}>Modulo Bloqueado</h2>
        <p style={{ color: '#888', marginTop: 8 }}>Complete o Modulo 28 para desbloquear.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0f0f0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setView('lesson')}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{
              background: view === 'lesson' ? '#0a84d7' : '#1a1a1d',
              color: view === 'lesson' ? 'white' : '#888',
              border: '1px solid #2a2a2e',
              cursor: 'pointer',
            }}>
            Aula
          </button>
          <button
            onClick={() => modProgress.lessonRead && setView('trainer')}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{
              background: view === 'trainer' ? '#0a84d7' : '#1a1a1d',
              color: view === 'trainer' ? 'white' : (modProgress.lessonRead ? '#888' : '#444'),
              border: '1px solid #2a2a2e',
              cursor: modProgress.lessonRead ? 'pointer' : 'not-allowed',
            }}>
            Trainer {!modProgress.lessonRead && '🔒'}
          </button>
        </div>
        {view === 'lesson'
          ? <Lesson onComplete={() => { markLessonRead(29); setView('trainer') }} />
          : <Trainer />
        }
      </div>
    </div>
  )
}
