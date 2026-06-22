import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'
import SessionReview from '../../components/SessionReview'
import Card from '../../components/Card'
import ModulePokerTable from '../../components/ModulePokerTable'

const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2']
const SUITS = ['s','h','d','c']

function randomCards(n, exclude = []) {
  const cards = []
  while (cards.length < n) {
    const c = RANKS[Math.floor(Math.random() * RANKS.length)] + SUITS[Math.floor(Math.random() * SUITS.length)]
    if (!cards.includes(c) && !exclude.includes(c)) cards.push(c)
  }
  return cards
}

function getBoardTexture(cards) {
  const ranks = cards.map(c => RANKS.indexOf(c.slice(0, -1)))
  const suits = cards.map(c => c.slice(-1))
  const suitCounts = {}
  suits.forEach(s => { suitCounts[s] = (suitCounts[s] || 0) + 1 })
  const flushPossible = Object.values(suitCounts).some(v => v >= 3)
  const flushComplete = Object.values(suitCounts).some(v => v >= 4)
  const sorted = [...new Set(ranks)].sort((a, b) => a - b)
  let straightPossible = false
  for (let i = 0; i < sorted.length - 2; i++) {
    if (sorted[i + 2] - sorted[i] <= 4) { straightPossible = true; break }
  }
  return { flushPossible, flushComplete, straightPossible }
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

function hasFlushDraw(hole, board) {
  const suitCounts = {}
  ;[...hole, ...board].forEach(c => { const s = c.slice(-1); suitCounts[s] = (suitCounts[s] || 0) + 1 })
  return Object.values(suitCounts).some(v => v === 4)
}

function hasMadeFlush(hole, board) {
  const suitCounts = {}
  ;[...hole, ...board].forEach(c => { const s = c.slice(-1); suitCounts[s] = (suitCounts[s] || 0) + 1 })
  return Object.values(suitCounts).some(v => v >= 5)
}

function hasMadeStraight(hole, board) {
  const toVal = c => RANK_VAL[c.slice(0, -1)]
  const allCards = [...hole, ...board]
  let vals = [...new Set(allCards.map(toVal))].sort((a, b) => a - b)
  if (vals.includes(14)) vals = [1, ...vals]
  for (let lo = 1; lo <= 10; lo++) {
    const run = [lo, lo+1, lo+2, lo+3, lo+4]
    if (run.every(v => vals.includes(v))) {
      // Pelo menos uma carta da mao participa da sequencia
      const holeVals = hole.map(toVal)
      const participates = holeVals.some(hv => run.includes(hv) || (hv === 14 && run.includes(1)))
      if (participates) return true
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
  const pocketIdx = RANKS.indexOf(holeRanks[0])
  const topBoardIdx = Math.min(...board.map(c => RANKS.indexOf(c.slice(0, -1))))
  return pocketIdx < topBoardIdx
}

const RANK_VAL = { A:14,K:13,Q:12,J:11,T:10,'9':9,'8':8,'7':7,'6':6,'5':5,'4':4,'3':3,'2':2 }

function hasStraightDraw(hole, board) {
  const toVal = c => RANK_VAL[c.slice(0, -1)]
  const holeVals = hole.map(toVal)
  const allCards = [...hole, ...board]
  let vals = [...new Set(allCards.map(toVal))].sort((a, b) => a - b)
  if (vals.includes(14)) vals = [1, ...vals]

  // Se ja tem straight feito, nao e draw
  for (let lo = 1; lo <= 10; lo++) {
    const run = [lo, lo+1, lo+2, lo+3, lo+4]
    if (run.every(v => vals.includes(v))) return false
  }

  // OESD: 4 consecutivos com buraco aberto nas duas pontas
  for (let lo = 1; lo <= 11; lo++) {
    const run = [lo, lo+1, lo+2, lo+3]
    if (run.every(v => vals.includes(v))) {
      const holeContributes = holeVals.some(hv => run.includes(hv) || (hv === 14 && run.includes(1)))
      if (holeContributes) return true
    }
  }

  return false
}

function hasGutshot(hole, board) {
  const toVal = c => RANK_VAL[c.slice(0, -1)]
  const holeVals = hole.map(toVal)
  const allCards = [...hole, ...board]
  let vals = [...new Set(allCards.map(toVal))].sort((a, b) => a - b)
  if (vals.includes(14)) vals = [1, ...vals]

  // Se ja tem straight feito, nao e draw
  for (let lo = 1; lo <= 10; lo++) {
    const run = [lo, lo+1, lo+2, lo+3, lo+4]
    if (run.every(v => vals.includes(v))) return false
  }

  // Gutshot: 4 de 5 consecutivos presentes (falta 1 no meio ou ponta)
  for (let lo = 1; lo <= 10; lo++) {
    const run5 = [lo, lo+1, lo+2, lo+3, lo+4]
    const have = run5.filter(v => vals.includes(v))
    if (have.length === 4) {
      const holeContributes = holeVals.some(hv => have.includes(hv) || (hv === 14 && have.includes(1)))
      if (holeContributes) return true
    }
  }

  return false
}

// Hero teria chamado uma cbet no flop com esta mao? (filtro para cenario realista)
function wouldPlayTurn(hole, flop) {
  const holeRanks = hole.map(c => c.slice(0, -1))
  const isPocketPair = holeRanks[0] === holeRanks[1]

  // Mao feita forte: certamente chamou no flop
  if (hasMadeFlush(hole, flop) || hasSetFn(hole, flop) || hasTwoPairFn(hole, flop)) return true
  if (hasOverpair(hole, flop) || hasTopPair(hole, flop)) return true

  // Draw forte: chamaria no flop por outs
  if (hasFlushDraw(hole, flop) || hasStraightDraw(hole, flop)) return true

  // Par medio: chamaria em muitas situacoes
  if (hasAnyPair(hole, flop)) return true

  // Pocket pair abaixo do board (underpair): as vezes chama
  if (isPocketPair) return true

  // Dois overcards: raramente chama sem draw — exclui
  return false
}

function getKickerVal(hole, board) {
  const toVal = c => RANK_VAL[c.slice(0, -1)]
  const holeVals = hole.map(toVal)
  const boardRanks = board.map(c => c.slice(0, -1))
  const holeRanks = hole.map(c => c.slice(0, -1))
  const kickers = holeRanks
    .map((r, i) => ({ rank: r, val: holeVals[i] }))
    .filter(h => !boardRanks.includes(h.rank))
  return kickers.length > 0 ? Math.max(...kickers.map(k => k.val)) : Math.max(...holeVals)
}

function isTurnScary(flop, turn) {
  const toVal = c => RANK_VAL[c.slice(0, -1)]
  const turnVal = toVal(turn)
  const turnSuit = turn.slice(-1)
  const flopSuits = flop.map(c => c.slice(-1))
  const flopVals = flop.map(toVal)

  const flopSuitCount = flopSuits.filter(s => s === turnSuit).length
  if (flopSuitCount >= 2) return { scary: true, type: 'flush', desc: 'Turn completou possivel flush' }

  let allVals = [...new Set([...flopVals, turnVal])].sort((a, b) => a - b)
  if (allVals.includes(14)) allVals = [1, ...allVals]
  for (let lo = 1; lo <= 11; lo++) {
    const run = [lo, lo+1, lo+2, lo+3]
    if (run.every(v => allVals.includes(v))) {
      return { scary: true, type: 'straight', desc: 'Board muito conectado - possivel straight' }
    }
  }

  const maxFlop = Math.max(...flopVals)
  if (turnVal > maxFlop && turnVal >= 13) return { scary: true, type: 'overcard', desc: 'Overcard alta (A/K) no turn' }
  if (turnVal > maxFlop && turnVal >= 10) return { scary: false, type: 'overcard_low', desc: 'Overcard media no turn' }

  return { scary: false, type: 'brick', desc: 'Brick - turn inofensivo' }
}

// Logica GTO como DEFENSOR enfrentando double barrel (cbet flop + cbet turn)
function getCorrectAction(hole, flop, turn, villainSizing) {
  const board = [...flop, turn]
  const turnInfo = isTurnScary(flop, turn)

  // Sizing do villain: pequeno = range amplo, grande = polarizado
  const sizingNum = parseInt(villainSizing) // 33, 50, 66, 75

  // === MAOS MUITO FORTES: raise para valor ===
  if (hasMadeFlush(hole, board)) {
    return {
      action: 'raise',
      reason: `Flush completo! Esta e sua mao de valor maxima. Contra double barrel, raise e obrigatorio — construa o pote e extraia o maximo. Sizing sugerido: 2.5x a aposta do villain.`
    }
  }
  if (hasSetFn(hole, board)) {
    return {
      action: 'raise',
      reason: `Set no turn! Mao muito forte. O villain esta apostando duas ruas — provavelmente tem valor tambem. Raise para construir pote maximo. Voce bate quase tudo no range dele.`
    }
  }
  if (hasMadeStraight(hole, board)) {
    return {
      action: 'raise',
      reason: `Straight completo no turn! Raise e a jogada correta. O villain nao para de apostar — pode ter valor inferior ou blefe. Em ambos os casos, voce quer o pote maior.`
    }
  }
  if (hasTwoPairFn(hole, board)) {
    if (turnInfo.scary && turnInfo.type === 'flush') {
      return {
        action: 'call',
        reason: `Dois pares, mas o turn completou possivel flush. Contra double barrel em board com flush, call e mais seguro. Se o villain tiver flush, seu raise nao seria bom. Chame e avalie o river.`
      }
    }
    if (turnInfo.scary && turnInfo.type === 'straight') {
      return {
        action: 'call',
        reason: `Dois pares em board com straight possivel. Raise e arriscado — villain pode ter completado a straight. Call e avalie o river com cuidado.`
      }
    }
    return {
      action: 'raise',
      reason: `Dois pares no turn! Mao forte o suficiente para raise. Contra double barrel, voce quer construir pote — o villain pode ter top pair ou draw pagando caro.`
    }
  }

  // === OVERPAIR: call (forte mas nao e raise padrao contra double barrel) ===
  if (hasOverpair(hole, board)) {
    if (turnInfo.scary && (turnInfo.type === 'flush' || turnInfo.type === 'straight')) {
      if (sizingNum >= 66) {
        return {
          action: 'fold',
          reason: `Overpair, mas o turn completou draw perigoso e o villain apostou ${villainSizing}. Aposta grande + turn assustador = range polarizado do villain. Seu overpair pode estar atras. Fold defensavel.`
        }
      }
      return {
        action: 'call',
        reason: `Overpair em board perigoso, mas aposta de ${villainSizing} e razoavel. Chame com cautela — se o river vier perigoso e o villain apostar novamente, considere fold.`
      }
    }
    return {
      action: 'call',
      reason: `Overpair — mao forte! Contra double barrel, call e a linha padrao. Voce geralmente nao quer raise com overpair aqui porque o range do villain que continua apostando tende a te bater. Chame e avalie o river.`
    }
  }

  // === TOP PAIR: depende do kicker e do turn ===
  if (hasTopPair(hole, board)) {
    const kickerVal = getKickerVal(hole, board)
    const goodKicker = kickerVal >= 11 // J ou melhor

    if (turnInfo.scary && turnInfo.type === 'flush') {
      if (sizingNum >= 66) {
        return {
          action: 'fold',
          reason: `Top pair mas turn completou flush e villain aposta ${villainSizing}. Aposta grande em board com flush = muita força. Seu top pair nao bate flush. Fold correto.`
        }
      }
      return {
        action: 'call',
        reason: `Top pair com kicker ${goodKicker ? 'bom' : 'fraco'}, turn completou flush mas villain aposta apenas ${villainSizing}. Aposta pequena pode ser semi-blefe ou valor thin. Chame uma vez com cautela.`
      }
    }

    if (goodKicker) {
      if (sizingNum >= 75) {
        return {
          action: 'call',
          reason: `Top pair bom kicker contra aposta grande de ${villainSizing}. Aposta grande e polarizada — villain tem valor forte ou blefe total. Com top pair bom kicker, voce chama mas nao raise.`
        }
      }
      return {
        action: 'call',
        reason: `Top pair com bom kicker (J+) — call correto contra double barrel. Sua mao e forte o suficiente para continuar mas nao e nuts para raise. Aposta de ${villainSizing} mantem odds favoraveis.`
      }
    }

    // Top pair kicker fraco
    if (turnInfo.scary) {
      return {
        action: 'fold',
        reason: `Top pair com kicker fraco em turn assustador (${turnInfo.desc}). Contra double barrel com kicker ruim, voce esta em bad position. Fold evita perder mais chips em situacoes marginais.`
      }
    }
    if (sizingNum >= 66) {
      return {
        action: 'fold',
        reason: `Top pair com kicker fraco contra aposta grande de ${villainSizing}. Aposta grande + double barrel = range forte do villain. Sem kicker bom, voce perde para muitas maos no range dele.`
      }
    }
    return {
      action: 'call',
      reason: `Top pair com kicker fraco, mas turn e um brick e villain aposta apenas ${villainSizing}. Odds razoaveis para continuar uma vez. Fique alerta no river.`
    }
  }

  // === FLUSH DRAW: call (9 outs, boas odds) ===
  if (hasFlushDraw(hole, board)) {
    // Flush draw + par = combo draw: pode raise
    if (hasAnyPair(hole, board)) {
      if (sizingNum <= 50) {
        return {
          action: 'raise',
          reason: `Flush draw + par (combo draw)! Contra aposta de ${villainSizing}, voce tem equity para raise como semi-blefe. 9 outs de flush + equity de par = mao forte o suficiente para pressionar.`
        }
      }
      return {
        action: 'call',
        reason: `Flush draw + par contra aposta de ${villainSizing}. Combo draw poderoso. Call e correto — aposta grande do villain reduz conveniencia do raise mas voce tem equity para continuar.`
      }
    }
    // Flush draw puro: sempre call (9 outs = ~20% equity no river)
    if (sizingNum <= 66) {
      return {
        action: 'call',
        reason: `Flush draw com 9 outs! Voce tem ~20% de equity no river. Contra aposta de ${villainSizing}, voce esta recebendo odds suficientes para chamar. Pot odds: precisa de ~${sizingNum <= 33 ? '20%' : sizingNum <= 50 ? '25%' : '28%'} e tem 20% de outs.`
      }
    }
    return {
      action: 'call',
      reason: `Flush draw (9 outs) contra aposta de ${villainSizing}. Na borda das odds, mas flush draw e forte o suficiente para continuar. ~20% equity no river vs ~${Math.round(sizingNum / (sizingNum + 100) * 100)}% necessario.`
    }
  }

  // === STRAIGHT DRAW (OESD 8 outs): call se odds boas ===
  if (hasStraightDraw(hole, board)) {
    if (sizingNum <= 50) {
      return {
        action: 'call',
        reason: `Straight draw (OESD) com 8 outs! ~18% equity no river. Aposta de ${villainSizing} da odds de ${Math.round(sizingNum / (sizingNum + 100) * 100)}% necessario — voce esta recebendo 3:1+. Call correto para completar no river.`
      }
    }
    if (sizingNum <= 66) {
      return {
        action: 'call',
        reason: `OESD (8 outs) contra aposta de ${villainSizing}. Odds apertadas mas ainda viavel. Voce tem ~18% equity e precisa de ~28%. Chame pois pode ter implied odds no river.`
      }
    }
    return {
      action: 'fold',
      reason: `Straight draw (8 outs) contra aposta grande de ${villainSizing}. Odds muito ruins — voce precisa de ~30% equity mas tem apenas 18%. Sem implied odds suficientes. Fold correto.`
    }
  }

  // === GUTSHOT (4 outs): quase sempre fold ===
  if (hasGutshot(hole, board)) {
    if (sizingNum <= 33) {
      return {
        action: 'call',
        reason: `Gutshot (4 outs, ~9% equity) contra aposta pequena de ${villainSizing}. Unico caso onde vale chamar — odds de 3:1 com potencial implied odds no river se completar.`
      }
    }
    return {
      action: 'fold',
      reason: `Gutshot com apenas 4 outs (~9% equity) contra aposta de ${villainSizing}. Odds ruins — voce precisa de pelo menos ${Math.round(sizingNum / (sizingNum + 100) * 100)}% de equity mas tem apenas 9%. Fold correto.`
    }
  }

  // === PAR MEDIO: depende do turn e sizing ===
  if (hasAnyPair(hole, board)) {
    if (turnInfo.scary) {
      if (sizingNum >= 50) {
        return {
          action: 'fold',
          reason: `Par medio em turn assustador (${turnInfo.desc}) contra aposta de ${villainSizing}. Sem draw, sem top pair — sua mao esta atras de muitos combos no range do villain. Fold poupa chips.`
        }
      }
      return {
        action: 'call',
        reason: `Par medio em turn levemente perigoso, mas villain aposta apenas ${villainSizing}. Odds ainda razoaveis para um call — mas nao esperneie no river se vier outra carta ruim.`
      }
    }
    if (turnInfo.type === 'brick') {
      if (sizingNum >= 66) {
        return {
          action: 'fold',
          reason: `Par medio em turn brick, mas villain aposta ${villainSizing}. Aposta grande com double barrel em board seco = valor real (sets, dois pares, overpairs). Seu par medio esta atras.`
        }
      }
      return {
        action: 'call',
        reason: `Par medio em turn brick contra aposta de ${villainSizing}. Board seco + aposta pequena pode ser blefe. Seu par medio tem show-down value. Call defensavel — avalie o river.`
      }
    }
    return {
      action: 'fold',
      reason: `Par medio em board complicado contra double barrel. Sem draw, sem top pair — fold e a linha mais segura contra pressao continua.`
    }
  }

  // === SEM PAR SEM DRAW: fold ===
  return {
    action: 'fold',
    reason: `Sem par, sem draw contra double barrel. Voce nao tem equity suficiente para continuar. O villain esta apostando duas ruas — independente do sizing (${villainSizing}), fold e obrigatorio aqui.`
  }
}

const VILLAIN_SIZINGS = ['33%', '50%', '66%', '75%']

function generateScenario() {
  let flop, turn, hole, villainSizing, correct
  for (let i = 0; i < 200; i++) {
    flop = randomCards(3)
    ;[turn] = randomCards(1, flop)
    hole = randomCards(2, [...flop, turn])
    if (!wouldPlayTurn(hole, flop)) continue
    villainSizing = VILLAIN_SIZINGS[Math.floor(Math.random() * VILLAIN_SIZINGS.length)]
    correct = getCorrectAction(hole, flop, turn, villainSizing)
    break
  }
  const turnInfo = isTurnScary(flop, turn)
  const pot = '13bb'
  return {
    hole,
    flop,
    turn,
    boardCards: [...flop, turn],
    villainSizing,
    correct,
    heroPos: 'BB',
    villainPos: 'BTN',
    villainAction: `Bet ${villainSizing}`,
    potLabel: pot,
    question: `Villain apostou no flop e agora aposta ${villainSizing} no turn. O que voce faz?`,
    options: ['call', 'fold', 'raise'],
    turnInfo,
  }
}

function Lesson({ onComplete }) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        Enfrentando Double Barrel
      </h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Villain apostou no flop e agora aposta no turn. O que voce faz como defensor?</p>
      <div className="space-y-4">
        <Section title="O Que e Double Barrel?">
          Double barrel e quando o villain aposta no flop E no turn como continuacao. Ele esta mantendo pressao em duas ruas.<br /><br />
          <strong style={{ color: '#f5a623' }}>Seu trabalho como defensor:</strong> identificar se ele tem valor real ou esta blefando, e reagir de acordo com sua equity e as pot odds oferecidas.
        </Section>
        <Section title="Por que o Villain Double Barrel?">
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #4fce82' }}>
              <div style={{ color: '#4fce82', fontWeight: 600 }}>Com valor</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>
                Set, dois pares, overpair, top pair strong — quer ser pago em duas ruas
              </div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #e5484d' }}>
              <div style={{ color: '#e5484d', fontWeight: 600 }}>Como blefe</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>
                Draws, overcards, ou blefando puro em boards que o turn "ajudou" o range dele
              </div>
            </div>
          </div>
        </Section>
        <Section title="Quando Chamar (Call)">
          <div className="space-y-2">
            {[
              'Maos fortes: overpair, top pair bom kicker (J+) — voce esta na frente do range de blefe',
              'Flush draw (9 outs) — ~20% equity, boas odds na maioria das apostas',
              'OESD (8 outs) — ~18% equity, viavel contra apostas ate 66%',
              'Combo draw (par + draw) — equity combinada justifica continuar',
            ].map((t, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span style={{ color: '#0a84d7' }}>✓</span>
                <span style={{ color: '#ccc', fontSize: 14 }}>{t}</span>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Quando Foldar (Fold)">
          <div className="space-y-2">
            {[
              'Sem par e sem draw — zero equity, qualquer aposta e lucrativa pra ele',
              'Gutshot (4 outs) contra aposta de 50%+ — odds ruins, ~9% equity',
              'Par medio/baixo em turn assustador + aposta grande',
              'Top pair kicker fraco em board perigoso — atras de muitas maos melhores',
            ].map((t, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span style={{ color: '#e5484d' }}>✗</span>
                <span style={{ color: '#ccc', fontSize: 14 }}>{t}</span>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Quando Reraise (Raise)">
          <div className="space-y-2">
            {[
              'Flush completo, straight completo, set — maos de valor maximo, construa o pote',
              'Dois pares em board sem draws perigosos — valor forte contra range de valor do villain',
              'Combo draw (flush draw + par) contra aposta pequena — semi-blefe poderoso',
            ].map((t, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span style={{ color: '#4fce82' }}>↑</span>
                <span style={{ color: '#ccc', fontSize: 14 }}>{t}</span>
              </div>
            ))}
          </div>
        </Section>
        <Section title="O Sizing do Villain Importa">
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #f5a623' }}>
              <div style={{ color: '#f5a623', fontWeight: 700, fontSize: 18 }}>Aposta Pequena (33%)</div>
              <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>Range amplo — pode ser blefe. Chame mais largo.</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #e5484d' }}>
              <div style={{ color: '#e5484d', fontWeight: 700, fontSize: 18 }}>Aposta Grande (75%)</div>
              <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>Range polarizado — valor ou blefe forte. Fold mais.</div>
            </div>
          </div>
        </Section>
        <Section title="Pot Odds: Matematica das Odds">
          <div className="grid grid-cols-2 gap-3 mt-2">
            {[
              { size: '33%', equity: '20%' },
              { size: '50%', equity: '25%' },
              { size: '66%', equity: '28%' },
              { size: '75%', equity: '30%' },
            ].map(({ size, equity }) => (
              <div key={size} className="rounded-lg p-3 text-center" style={{ background: '#0f0f0f', border: '1px solid #2a2a2e' }}>
                <div style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>Bet {size}</div>
                <div style={{ color: '#f5a623', fontSize: 13, marginTop: 4 }}>Precisa de {equity} equity</div>
              </div>
            ))}
          </div>
          <div style={{ color: '#888', fontSize: 12, marginTop: 12 }}>
            Flush draw = ~20% outs · OESD = ~18% · Gutshot = ~9%
          </div>
        </Section>
      </div>
      <button onClick={onComplete} className="w-full mt-8 py-4 rounded-xl font-bold text-white text-lg" style={{ background: '#e5484d' }}>
        Entendi — Quero Treinar
      </button>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
      <h3 style={{ color: 'white', fontWeight: 600, marginBottom: 8 }}>{title}</h3>
      <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>{children}</div>
    </div>
  )
}

function Trainer() {
  const { progress, recordAnswer, recordSession } = useProgress()
  const [scenario, setScenario] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [sessionDone, setSessionDone] = useState(false)

  function newHand() {
    if (sessionTotal >= 10) { setSessionDone(true); return }
    setScenario(generateScenario())
    setFeedback(null)
  }

  function answer(action) {
    if (!scenario || feedback) return
    const correct = scenario.correct
    const isCorrect = action === correct.action
    const newStreak = isCorrect ? streak + 1 : 0
    setStreak(newStreak)
    const newTotal = sessionTotal + 1
    const newCorrect = sessionCorrect + (isCorrect ? 1 : 0)
    setSessionTotal(newTotal)
    setSessionCorrect(newCorrect)
    recordAnswer(28, isCorrect, newStreak)
    const isLast = newTotal >= 10
    if (isLast) recordSession(28, Math.round((newCorrect / newTotal) * 100))
    setFeedback({ ...correct, isCorrect, isLast })
  }

  function restart() {
    setSessionCorrect(0)
    setSessionTotal(0)
    setStreak(0)
    setSessionDone(false)
    setFeedback(null)
    setScenario(null)
  }

  if (!scenario && !sessionDone) newHand()

  if (sessionDone) {
    return <SessionReview moduleId={28} sessionCorrect={sessionCorrect} sessionTotal={sessionTotal} onContinue={restart} />
  }

  const turnInfo = scenario ? scenario.turnInfo : null

  const ACTION_LABELS = {
    call: 'CALL',
    fold: 'FOLD',
    raise: 'RAISE',
  }
  const ACTION_COLORS = {
    call: { bg: '#0a84d7', color: 'white' },
    fold: { bg: '#e5484d', color: 'white' },
    raise: { bg: '#4fce82', color: '#0f0f0f' },
  }

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <div className="rounded-xl p-3 mb-4 flex justify-between" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
        <div style={{ color: '#888', fontSize: 13 }}>Sessao: {sessionCorrect}/{sessionTotal} · Seq: {streak}</div>
        <div style={{ color: '#888', fontSize: 13 }}>Meta: 10 maos</div>
      </div>
      <div className="rounded-full h-2 mb-6" style={{ background: '#2a2a2e' }}>
        <div className="rounded-full h-2 transition-all" style={{ width: `${(sessionTotal / 10) * 100}%`, background: '#e5484d' }} />
      </div>

      {scenario && (
        <ModulePokerTable
          heroPos={scenario.heroPos}
          villainPos={scenario.villainPos}
          heroCards={scenario.hole}
          boardCards={scenario.boardCards}
          villainAction={scenario.villainAction}
          potLabel={scenario.potLabel}
          contextTitle="Voce esta OOP — Defensor"
          contextDesc={`Villain c-betou no flop, voce chamou. Agora ele aposta ${scenario.villainSizing} no turn. Call, Fold ou Raise?`}
          textureTags={turnInfo ? [
            { label: turnInfo.desc, color: turnInfo.scary ? '#e5484d' : '#4fce82' },
            { label: `Villain bet ${scenario.villainSizing}`, color: '#f5a623' },
          ] : [
            { label: `Villain bet ${scenario.villainSizing}`, color: '#f5a623' },
          ]}
        />
      )}

      {!feedback && scenario && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {['call', 'fold', 'raise'].map(action => (
            <button
              key={action}
              onClick={() => answer(action)}
              className="py-4 rounded-xl font-bold text-lg"
              style={{ background: ACTION_COLORS[action].bg, color: ACTION_COLORS[action].color }}
            >
              {ACTION_LABELS[action]}
            </button>
          ))}
        </div>
      )}

      {feedback && (
        <div className="rounded-xl p-4 mb-4" style={{ background: '#1a1a1d', border: `2px solid ${feedback.isCorrect ? '#4fce82' : '#e5484d'}` }}>
          <div style={{ color: feedback.isCorrect ? '#4fce82' : '#e5484d', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
            {feedback.isCorrect ? 'Correto!' : 'Incorreto'}
          </div>
          <button onClick={newHand} className="w-full py-3 rounded-lg font-semibold mb-4" style={{ background: '#e5484d', color: 'white', fontSize: 16 }}>
            Proxima Mao
          </button>
          <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>{feedback.reason}</div>
          <div style={{ color: '#555', fontSize: 12, marginTop: 8 }}>
            Correto: <strong style={{ color: '#f5a623' }}>{ACTION_LABELS[feedback.action]}</strong>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Module28() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[28]?.lessonRead ? 'trainer' : 'lesson')

  if (!progress.modules[28]?.unlocked) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f0f' }}>
      <div className="text-center">
        <div style={{ fontSize: 60 }}>🔒</div>
        <h2 style={{ color: 'white', marginTop: 16 }}>Modulo Bloqueado</h2>
        <p style={{ color: '#888', marginTop: 8 }}>Complete o Modulo 27 para desbloquear.</p>
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
              background: view === 'lesson' ? '#e5484d' : '#1a1a1d',
              color: view === 'lesson' ? 'white' : '#888',
              border: '1px solid #2a2a2e',
            }}
          >
            Aula
          </button>
          <button
            onClick={() => progress.modules[28]?.lessonRead && setView('trainer')}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{
              background: view === 'trainer' ? '#e5484d' : '#1a1a1d',
              color: view === 'trainer' ? 'white' : (progress.modules[28]?.lessonRead ? '#888' : '#444'),
              border: '1px solid #2a2a2e',
              cursor: progress.modules[28]?.lessonRead ? 'pointer' : 'not-allowed',
            }}
          >
            Trainer {!progress.modules[28]?.lessonRead && '🔒'}
          </button>
        </div>
        {view === 'lesson'
          ? <Lesson onComplete={() => { markLessonRead(28); setView('trainer') }} />
          : <Trainer />
        }
      </div>
    </div>
  )
}
