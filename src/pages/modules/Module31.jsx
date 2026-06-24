import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'
import SessionReview from '../../components/SessionReview'
import Card, { parseCard } from '../../components/Card'
import { POSTFLOP_SCENARIOS, ALL_POSTFLOP_CATEGORIES } from '../../data/postflopScenarios'
import { Hand } from 'pokersolver'
import { calcEquity } from '../../lib/equity'

// ─── Hand analysis helpers ───────────────────────────────────────────────────
const RANK_VAL = { A:14,K:13,Q:12,J:11,T:10,'9':9,'8':8,'7':7,'6':6,'5':5,'4':4,'3':3,'2':2 }
const RANK_NAMES = { A:'As',K:'Reis',Q:'Damas',J:'Valetes',T:'Dez','9':'Noves','8':'Oitos','7':'Setes','6':'Seis','5':'Cincos','4':'Quatros','3':'Tres','2':'Doses' }

function analyzeBoard(board) {
  const vals = board.map(c => RANK_VAL[c.slice(0, -1)])
  const suits = board.map(c => c.slice(-1))
  const suitCounts = {}
  suits.forEach(s => { suitCounts[s] = (suitCounts[s] || 0) + 1 })
  const maxSuit = Math.max(...Object.values(suitCounts))
  const sorted = [...new Set(vals)].sort((a, b) => a - b)
  let maxRun = 1, run = 1
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] <= 2) { run++; maxRun = Math.max(maxRun, run) }
    else run = 1
  }
  const highCards = vals.filter(v => v >= 11).length
  return {
    flushDraw: maxSuit === 3, flushComplete: maxSuit >= 4, monotone: maxSuit >= 3,
    connected: maxRun >= 3, paired: new Set(vals).size < vals.length,
    highBoard: highCards >= 2, lowBoard: Math.max(...vals) <= 9,
    isWet: maxSuit >= 3 || maxRun >= 3, isDry: maxSuit < 3 && maxRun < 3,
  }
}

function analyzeHand(hole, board) {
  const holeRanks = hole.map(c => c.slice(0, -1))
  const holeVals = holeRanks.map(r => RANK_VAL[r])
  const holeSuits = hole.map(c => c.slice(-1))
  const boardRanks = board.map(c => c.slice(0, -1))
  const boardVals = boardRanks.map(r => RANK_VAL[r])
  const allVals = [...holeVals, ...boardVals]
  const allSuits = [...holeSuits, ...board.map(c => c.slice(-1))]
  const suitCounts = {}
  allSuits.forEach(s => { suitCounts[s] = (suitCounts[s] || 0) + 1 })
  const isPocket = holeRanks[0] === holeRanks[1]
  const topBoard = Math.max(...boardVals)
  const matchBoard = holeRanks.filter(r => boardRanks.includes(r))

  return {
    isPocket,
    isOverpair: isPocket && holeVals[0] > topBoard,
    isTopPair: matchBoard.length > 0 && Math.max(...matchBoard.map(r => RANK_VAL[r])) === topBoard,
    hasAnyPair: matchBoard.length > 0,
    isSet: isPocket && boardRanks.includes(holeRanks[0]),
    isTwoPair: !isPocket && new Set(matchBoard).size >= 2,
    hasFlushDraw: Object.values(suitCounts).some(v => v === 4),
    hasMadeFlush: Object.values(suitCounts).some(v => v >= 5),
    hasStraightDraw: (() => {
      let vals = [...new Set(allVals)].sort((a, b) => a - b)
      if (vals.includes(14)) vals = [1, ...vals]
      for (let lo = 1; lo <= 10; lo++) {
        const r5 = [lo,lo+1,lo+2,lo+3,lo+4]
        if (r5.every(v => vals.includes(v))) return false
      }
      for (let lo = 1; lo <= 11; lo++) {
        const r4 = [lo,lo+1,lo+2,lo+3]
        if (r4.every(v => vals.includes(v)) && holeVals.some(hv => r4.includes(hv) || (hv===14 && r4.includes(1)))) return true
      }
      return false
    })(),
    hasMadeStraight: (() => {
      let vals = [...new Set(allVals)].sort((a, b) => a - b)
      if (vals.includes(14)) vals = [1, ...vals]
      for (let lo = 1; lo <= 10; lo++) {
        const r5 = [lo,lo+1,lo+2,lo+3,lo+4]
        if (r5.every(v => vals.includes(v)) && holeVals.some(hv => r5.includes(hv) || (hv===14 && r5.includes(1)))) return true
      }
      return false
    })(),
    highHole: Math.max(...holeVals),
    lowHole: Math.min(...holeVals),
    holeDescr: holeRanks.join('') + (holeSuits[0] === holeSuits[1] ? 's' : 'o'),
  }
}

function generateExplanation(hole, board, correctAction, isFacing, street, heroPos) {
  const tex = analyzeBoard(board)
  const hand = analyzeHand(hole, board)
  let handName = ''
  try { handName = Hand.solve([...hole, ...board]).descr } catch {}
  const equity = calcEquity(hole, board)
  const posLabel = heroPos === 'IP' ? 'em posicao' : 'fora de posicao'
  const streetPT = street === 'Flop' ? 'flop' : street === 'Turn' ? 'turn' : 'river'
  const boardDesc = tex.isDry ? 'seco' : tex.isWet ? 'umido' : 'neutro'
  const eqStr = equity != null ? `${equity}% equity` : null
  const eqLabel = eqStr ? ` (${eqStr} vs range aleatorio)` : ''

  // Classifica equity em faixas
  const eqHigh = equity >= 65
  const eqMid = equity >= 40 && equity < 65
  const eqLow = equity < 40

  if (isFacing) {
    if (correctAction === 'fold') {
      if (eqStr && eqLow)
        return `${handName || 'Sua mao'}${eqLabel}. Equity muito baixa para continuar. ${!hand.hasAnyPair && !hand.hasFlushDraw ? 'Sem par ou draw — ' : ''}fold evita perder fichas no ${streetPT} ${boardDesc}.`
      if (!hand.hasAnyPair && !hand.hasFlushDraw && !hand.hasStraightDraw)
        return `Sem par, sem draw no ${streetPT}${eqLabel}. Fold — equity insuficiente contra a aposta do vilao.`
      if (hand.hasAnyPair && !hand.isTopPair)
        return `Par fraco no ${streetPT} ${boardDesc}${eqLabel}. Contra a aposta, voce esta atras do range do vilao. Fold.`
      return `${handName ? `${handName} — ` : ''}equity insuficiente no ${streetPT}${eqLabel}. Board ${boardDesc}, fold correto.`
    }
    if (correctAction === 'call') {
      if (hand.isOverpair || hand.isTopPair)
        return `${handName || 'Top pair/overpair'}${eqLabel}. Mao boa para call mas nao para raise. ${heroPos === 'OOP' ? 'Fora de posicao, controle o pote.' : 'Em posicao, chame e reavalie.'}`
      if (hand.hasMadeFlush || hand.hasMadeStraight)
        return `${handName || 'Mao forte'}${eqLabel}. Call para nao assustar o vilao. ${street === 'River' ? 'No river, call extrai mais do que raise.' : 'Slowplay para construir pote.'}`
      if (hand.hasFlushDraw)
        return `Flush draw — 9 outs${eqLabel}. Pot odds favorecem call. Se completar, mao forte.`
      if (hand.hasStraightDraw)
        return `Straight draw${eqLabel}. Call pelas odds implicitas — se acertar, pote grande.`
      if (hand.isSet || hand.isTwoPair)
        return `${handName || 'Mao forte'}${eqLabel}. Call para manter blefes do vilao no pote.`
      if (hand.hasAnyPair)
        return `${handName || 'Par'}${eqLabel}. Showdown value suficiente para call. Board ${boardDesc}.`
      return `${handName ? `${handName}` : 'Sua mao'}${eqLabel}. Equity suficiente para call ${posLabel}.`
    }
    if (correctAction === 'raise') {
      if (hand.hasMadeFlush || hand.hasMadeStraight || hand.isSet)
        return `${handName || 'Mao monstruosa'}!${eqLabel} Raise para valor maximo — o vilao ja apostou, construa o pote.`
      if (hand.isTwoPair)
        return `${handName || 'Dois pares'}${eqLabel}. Raise de valor! Vilao paga com top pair ou draws.`
      if (hand.isOverpair || hand.isTopPair)
        return `${handName || 'Top pair/overpair'}${eqLabel}. Raise de valor ${posLabel}. Board ${boardDesc} favorece proteger contra draws.`
      if (hand.hasFlushDraw || hand.hasStraightDraw)
        return `${handName ? `${handName} — ` : ''}semi-blefe!${eqLabel} Equity significativa + fold equity. Se foldar, ganha na hora.`
      return `${handName ? `${handName}` : 'Sua mao'}${eqLabel}. Raise ${posLabel} — board ${boardDesc} permite pressionar.`
    }
  } else {
    if (correctAction === 'check') {
      if (hand.hasMadeFlush || hand.hasMadeStraight || hand.isSet)
        return `${handName || 'Mao monstruosa'}${eqLabel}. Check para trapping — induza aposta do vilao com mao pior.`
      if (hand.isTopPair || hand.isOverpair)
        return `${handName || 'Top pair/overpair'}${eqLabel}. Check para controle de pote ${posLabel}. ${tex.isWet ? 'Board umido, nao infle desnecessariamente.' : ''}`
      if (hand.hasAnyPair)
        return `${handName || 'Par'}${eqLabel}. Showdown value mas nao forte para bet de valor. Check, controle o pote.`
      if (hand.hasFlushDraw || hand.hasStraightDraw)
        return `${handName ? `${handName} — ` : ''}draw${eqLabel}. Check ${heroPos === 'OOP' ? 'e reaja ao vilao.' : 'e tome carta gratis.'}`
      return `${handName ? `${handName}` : 'Sua mao'}${eqLabel}. Sem valor para apostar no ${streetPT} ${boardDesc}. Check.`
    }
    if (correctAction === 'bet') {
      if (hand.hasMadeFlush || hand.hasMadeStraight || hand.isSet)
        return `${handName || 'Mao monstruosa'}!${eqLabel} Bet de valor — mao forte demais para dar carta gratis.`
      if (hand.isTwoPair)
        return `${handName || 'Dois pares'}${eqLabel}. Bet de valor! Proteja sua mao e construa pote.`
      if (hand.isOverpair || hand.isTopPair)
        return `${handName || 'Top pair/overpair'}${eqLabel}. Bet de valor no ${streetPT}. ${tex.isWet ? 'Proteja contra draws.' : 'Extraia de maos piores.'}`
      if (hand.hasFlushDraw || hand.hasStraightDraw)
        return `${handName ? `${handName} — ` : ''}semi-blefe!${eqLabel} Outs + fold equity. Vilao folda ou voce completa o draw.`
      if (!hand.hasAnyPair && !hand.hasFlushDraw && !hand.hasStraightDraw)
        return `${handName ? `${handName} — ` : ''}blefe puro no ${streetPT}${eqLabel}! Board ${boardDesc}, represente mao forte. Sem showdown value, apostar e a unica forma de ganhar.`
      return `${handName ? `${handName}` : 'Sua mao'}${eqLabel}. Bet no ${streetPT} ${posLabel}. Board ${boardDesc} favorece agressividade.`
    }
    if (correctAction === 'raise') {
      if (hand.hasMadeFlush || hand.hasMadeStraight || hand.isSet)
        return `${handName || 'Mao monstruosa'}!${eqLabel} Raise para valor maximo — construa o pote.`
      return `${handName ? `${handName}` : 'Sua mao'}${eqLabel}. Raise no ${streetPT}! ${hand.hasFlushDraw || hand.hasStraightDraw ? 'Semi-blefe com draw forte.' : 'Pressione o range do vilao.'}`
    }
  }
  return handName ? `Sua mao: ${handName}${eqLabel}` : (eqStr || '')
}

// ─── Generate a solver scenario ──────────────────────────────────────────────
function generateScenario() {
  const cat = ALL_POSTFLOP_CATEGORIES[Math.floor(Math.random() * ALL_POSTFLOP_CATEGORIES.length)]
  const pool = POSTFLOP_SCENARIOS[cat]
  const sc = pool[Math.floor(Math.random() * pool.length)]
  const isFacing = cat.startsWith('facing_bet')
  const street = sc.b.length === 3 ? 'Flop' : sc.b.length === 4 ? 'Turn' : 'River'

  const LABELS = {
    facing_bet_flop: 'Facing Bet Flop',
    facing_bet_turn: 'Facing Bet Turn',
    facing_bet_river: 'Facing Bet River',
    bet_or_check_flop: 'Bet/Check Flop',
    bet_or_check_turn: 'Bet/Check Turn',
    bet_or_check_river: 'Bet/Check River',
  }

  let options, correct
  if (isFacing) {
    options = ['Fold', 'Call', 'Raise']
    correct = sc.d === 'fold' ? 0 : sc.d === 'call' ? 1 : 2
  } else {
    if (sc.d === 'raise') {
      options = ['Check', 'Bet', 'Raise']
      correct = 2
    } else {
      options = ['Check', 'Bet']
      correct = sc.d === 'bet' ? 1 : 0
    }
  }

  return {
    board: sc.b,
    hole: sc.h,
    street,
    category: LABELS[cat],
    heroPos: sc.hp,
    pot: sc.pot,
    isFacing,
    options,
    correct,
    sizing: sc.sz,
  }
}

// ─── Lesson ──────────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ color: '#4fce82', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{title}</h3>
      <div style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.7 }}>{children}</div>
    </div>
  )
}

function Lesson({ onComplete }) {
  return (
    <div>
      <h2 style={{ color: 'white', fontSize: 22, fontWeight: 800, marginBottom: 20 }}>
        GTO Postflop Solver
      </h2>

      <Section title="O que sao cenarios de solver?">
        <p>Solvers GTO (como PioSOLVER, GTO+) calculam a estrategia <b>matematicamente otima</b> para cada spot do poker.</p>
        <p style={{ marginTop: 8 }}>Diferente de heuristicas simplificadas, o solver considera TODOS os combos, todas as sizing opcoes e encontra o equilibrio de Nash.</p>
        <p style={{ marginTop: 8 }}>Este modulo usa <b>cenarios reais computados por solver</b> do dataset PokerBench — 10.000 situacoes com a decisao GTO correta.</p>
      </Section>

      <Section title="Tipos de cenarios">
        <p><b>Facing Bet</b> — Vilao apostou. Voce decide: Fold, Call ou Raise.</p>
        <p style={{ marginTop: 4 }}><b>Bet or Check</b> — Vilao checkou. Voce decide: Check ou Bet.</p>
        <p style={{ marginTop: 8 }}>Cenarios cobrem Flop, Turn e River em posicao IP e OOP.</p>
      </Section>

      <Section title="Por que treinar com solver?">
        <p>Heuristicas ("top pair = bet 50%") sao <b>aproximacoes uteis</b>, mas o solver mostra que a realidade e mais sutil.</p>
        <p style={{ marginTop: 8 }}>Exemplos de onde heuristicas falham:</p>
        <ul style={{ paddingLeft: 20, marginTop: 4 }}>
          <li>Top pair com kicker fraco em board conectado = check (nao bet)</li>
          <li>Overpair em board com 4 to straight = fold (nao call)</li>
          <li>Air total no river = bet como blefe (nao check)</li>
        </ul>
        <p style={{ marginTop: 8 }}>Praticar com cenarios de solver calibra sua intuicao para os spots nao-obvios.</p>
      </Section>

      <Section title="Como usar este modulo">
        <p>1. Analise o board, sua mao e a posicao (IP/OOP)</p>
        <p>2. Considere o tamanho do pot e a street</p>
        <p>3. Escolha a acao que voce acha correta</p>
        <p>4. Compare com a resposta do solver</p>
        <p style={{ marginTop: 8 }}>O objetivo nao e memorizar cada spot, mas <b>desenvolver intuicao</b> para quando suas heuristicas devem ser ajustadas.</p>
      </Section>

      <button
        onClick={onComplete}
        style={{
          width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
          background: '#4fce82', color: '#0f0f0f', fontWeight: 700, fontSize: 16,
          cursor: 'pointer', marginTop: 12,
        }}
      >
        Comecar a Treinar
      </button>
    </div>
  )
}

// ─── Trainer ─────────────────────────────────────────────────────────────────
const BTN_COLORS = ['#0a84d7', '#4fce82', '#e5484d']

function Trainer() {
  const { recordAnswer, progress } = useProgress()
  const [scenario, setScenario] = useState(() => generateScenario())
  const [feedback, setFeedback] = useState(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [showReview, setShowReview] = useState(false)

  const handleAnswer = (idx) => {
    if (feedback) return
    const isCorrect = idx === scenario.correct
    setFeedback({ chosen: idx, isCorrect })
    setSessionTotal(t => t + 1)
    if (isCorrect) setSessionCorrect(c => c + 1)
    recordAnswer(31, isCorrect)
  }

  const next = () => {
    if (sessionTotal >= 20) { setShowReview(true); return }
    setScenario(generateScenario())
    setFeedback(null)
  }

  const restart = () => {
    setSessionCorrect(0)
    setSessionTotal(0)
    setShowReview(false)
    setScenario(generateScenario())
    setFeedback(null)
  }

  if (showReview) {
    return <SessionReview moduleId={31} sessionCorrect={sessionCorrect} sessionTotal={sessionTotal} onContinue={restart} />
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ color: '#00d4ff', fontSize: 13, fontWeight: 700 }}>{scenario.category}</div>
        <div style={{ color: '#666', fontSize: 12, fontFamily: 'JetBrains Mono' }}>
          {sessionCorrect}/{sessionTotal}
        </div>
      </div>

      {/* Info bar */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap',
      }}>
        <span style={{ background: '#1a1a2e', padding: '4px 10px', borderRadius: 6, color: '#b3b3b8', fontSize: 12 }}>
          {scenario.street}
        </span>
        <span style={{ background: '#1a1a2e', padding: '4px 10px', borderRadius: 6, color: '#b3b3b8', fontSize: 12 }}>
          {scenario.heroPos}
        </span>
        <span style={{ background: '#1a1a2e', padding: '4px 10px', borderRadius: 6, color: '#b3b3b8', fontSize: 12 }}>
          Pot: {scenario.pot}bb
        </span>
        {scenario.isFacing && (
          <span style={{ background: '#2a1a1a', padding: '4px 10px', borderRadius: 6, color: '#e5484d', fontSize: 12 }}>
            Vilao apostou
          </span>
        )}
      </div>

      {/* Board */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ color: '#666', fontSize: 11, marginBottom: 6 }}>BOARD</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
          {scenario.board.map((c, i) => <Card key={i} card={parseCard(c)} size="md" />)}
        </div>
      </div>

      {/* Hole */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ color: '#666', fontSize: 11, marginBottom: 6 }}>SUA MAO</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
          {scenario.hole.map((c, i) => <Card key={i} card={parseCard(c)} size="md" />)}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {scenario.options.map((opt, i) => {
          let bg = BTN_COLORS[i] || '#0a84d7'
          let border = 'none'
          if (feedback) {
            if (i === scenario.correct) { bg = '#4fce82'; border = '2px solid #4fce82' }
            else if (i === feedback.chosen && !feedback.isCorrect) { bg = '#e5484d'; border = '2px solid #e5484d' }
            else { bg = '#1a1a1d' }
          }
          return (
            <button
              key={opt}
              onClick={() => handleAnswer(i)}
              style={{
                flex: 1, padding: '14px 0', borderRadius: 10,
                border, background: bg, color: 'white',
                fontWeight: 700, fontSize: 15, cursor: feedback ? 'default' : 'pointer',
                opacity: feedback && i !== scenario.correct && i !== feedback.chosen ? 0.4 : 1,
              }}
            >
              {opt}
            </button>
          )
        })}
      </div>

      {/* Feedback */}
      {feedback && (
        <div style={{
          background: feedback.isCorrect ? '#0a2a1a' : '#2a0a0a',
          border: `1px solid ${feedback.isCorrect ? '#4fce82' : '#e5484d'}`,
          borderRadius: 10, padding: 16, marginBottom: 16,
        }}>
          <div style={{ color: feedback.isCorrect ? '#4fce82' : '#e5484d', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
            {feedback.isCorrect ? 'Correto!' : 'Incorreto'}
          </div>
          <div style={{ color: '#b3b3b8', fontSize: 13 }}>
            Resposta do solver: <b style={{ color: '#4fce82' }}>{scenario.options[scenario.correct]}</b>
            {scenario.sizing && <span> (sizing: {scenario.sizing})</span>}
          </div>
          {(() => {
            const correctAction = scenario.isFacing
              ? ['fold', 'call', 'raise'][scenario.correct]
              : scenario.options[scenario.correct].toLowerCase()
            const explanation = generateExplanation(
              scenario.hole, scenario.board, correctAction,
              scenario.isFacing, scenario.street, scenario.heroPos
            )
            return explanation ? (
              <div style={{ color: '#9d9da3', fontSize: 13, marginTop: 8, lineHeight: 1.6, borderTop: '1px solid #2a2a2e', paddingTop: 8 }}>
                {explanation}
              </div>
            ) : null
          })()}
        </div>
      )}

      {/* Next */}
      {feedback && (
        <button
          onClick={next}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
            background: '#00d4ff', color: '#0f0f0f', fontWeight: 700, fontSize: 16,
            cursor: 'pointer',
          }}
        >
          {sessionTotal >= 20 ? 'Ver Resultado' : 'Proximo'}
        </button>
      )}
    </div>
  )
}

// ─── Module default export ───────────────────────────────────────────────────
export default function Module31() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[31]?.lessonRead ? 'trainer' : 'lesson')

  if (!progress.modules[31]?.unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f0f' }}>
        <div className="text-center">
          <div style={{ fontSize: 60 }}>🔒</div>
          <h2 style={{ color: 'white', marginTop: 16 }}>Modulo Bloqueado</h2>
          <p style={{ color: '#888', marginTop: 8 }}>Complete o Modulo 30 para desbloquear.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0f0f0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setView('lesson')}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{
              background: view === 'lesson' ? '#00d4ff' : '#1a1a1d',
              color: view === 'lesson' ? '#0f0f0f' : '#888',
              border: '1px solid #2a2a2e',
            }}
          >
            Aula
          </button>
          <button
            onClick={() => progress.modules[31]?.lessonRead && setView('trainer')}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{
              background: view === 'trainer' ? '#00d4ff' : '#1a1a1d',
              color: view === 'trainer' ? '#0f0f0f' : (progress.modules[31]?.lessonRead ? '#888' : '#444'),
              border: '1px solid #2a2a2e',
              cursor: progress.modules[31]?.lessonRead ? 'pointer' : 'not-allowed',
            }}
          >
            Trainer {!progress.modules[31]?.lessonRead && '🔒'}
          </button>
        </div>
        {view === 'lesson'
          ? <Lesson onComplete={() => { markLessonRead(31); setView('trainer') }} />
          : <Trainer />
        }
      </div>
    </div>
  )
}
