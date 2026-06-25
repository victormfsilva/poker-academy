import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'
import SessionReview from '../../components/SessionReview'
import Card from '../../components/Card'
import ModulePokerTable from '../../components/ModulePokerTable'
import { calcEquity } from '../../lib/equity'

const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2']
const SUITS = ['s','h','d','c']
const RANK_VAL = { A:14, K:13, Q:12, J:11, T:10, '9':9, '8':8, '7':7, '6':6, '5':5, '4':4, '3':3, '2':2 }

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
  // Tinha flush draw no turn (4 cartas do mesmo naipe com pelo menos 1 hole card) mas não completou no river
  const holeSuits = hole.map(c => c.slice(-1))
  const suitCounts = {}
  ;[...hole, ...board].forEach(c => { const s = c.slice(-1); suitCounts[s] = (suitCounts[s] || 0) + 1 })
  // Precisa ter exatamente 4 suited (não 5 = flush feito) E pelo menos 1 hole card daquele naipe
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
  // Precisa de pelo menos 3 cartas em span de 5 (mais restritivo que span ≤ 4 com 3)
  for (let start = 1; start <= 10; start++) {
    const window = [start, start+1, start+2, start+3, start+4]
    const count = window.filter(v => vals.includes(v)).length
    if (count >= 3) return true
  }
  return false
}

// Verifica se a mao faz sentido ter chegado ao river IP (teria c-betado no flop)
function wouldPlayToRiver(hole, board) {
  const flop = board.slice(0, 3)
  const flopRanks = flop.map(c => c.slice(0, -1))
  const holeRanks = hole.map(c => c.slice(0, -1))
  const isPocketPair = holeRanks[0] === holeRanks[1]

  // Mao forte no board completo: sempre faz sentido
  if (hasMadeFlush(hole, board) || hasMadeStraight(hole, board) || hasSetFn(hole, board)) return true
  if (hasTwoPairFn(hole, board) || hasOverpair(hole, board)) return true
  if (hasTopPair(hole, board) || hasAnyPair(hole, board)) return true

  // Flush draw que falhou (4 suited): faz sentido — chegou ao river com draw
  if (hasFlushDrawMissed(hole, board)) return true

  // Pocket pair: sempre c-betaria no flop
  if (isPocketPair) return true

  // Teria c-betado no flop? (par, draw, ou blefe em board seco)
  if (hasTopPair(hole, flop) || hasAnyPair(hole, flop)) return true
  const flopSuits = flop.map(c => c.slice(-1))
  const flopSuitCounts = {}
  ;[...hole, ...flop].forEach(c => { const s = c.slice(-1); flopSuitCounts[s] = (flopSuitCounts[s] || 0) + 1 })
  if (Object.values(flopSuitCounts).some(v => v >= 4)) return true // flush draw no flop

  const flopVals = flop.map(c => RANK_VAL[c.slice(0, -1)])
  const flopSuitsArr = flop.map(c => c.slice(-1))
  const suited = flopSuitsArr[0] === flopSuitsArr[1] || flopSuitsArr[1] === flopSuitsArr[2] || flopSuitsArr[0] === flopSuitsArr[2]
  const sortedVals = [...flopVals].sort((a, b) => a - b)
  const connected = (sortedVals[2] - sortedVals[0]) <= 4
  const isDry = !suited && !connected
  if (isDry) return true // teria blefado em board seco

  return false
}

// River: você está IP, pot control até aqui ou apostou flop+turn. River saiu. Valor, blefe ou check?
function getCorrectAction(hole, board) {
  const flushOnBoard = boardHasFlushPossible(board)
  const straightOnBoard = boardHasStraightPossible(board)

  // Nuts ou perto: value bet grande
  if (hasMadeFlush(hole, board)) {
    return { action: 'value-big', reason: 'Flush completo no river! Value bet grande (75-100%). Mao nuts — extraia o máximo. Adversario pode pagar com top pair ou dois pares.' }
  }
  if (hasMadeStraight(hole, board)) {
    if (flushOnBoard) {
      return { action: 'value-small', reason: 'Straight no river mas flush possível no board. Value bet menor (50%) — você pode estar atras se adversário tem flush. Cuidado.' }
    }
    return { action: 'value-big', reason: 'Straight no river! Value bet grande (75%). Mao muito forte — adversário pode pagar com pares e dois pares.' }
  }
  if (hasSetFn(hole, board)) {
    return { action: 'value-big', reason: 'Set no river — value bet grande (75%). Mao muito forte. Adversario que pagou até aqui provavelmente tem algo que paga.' }
  }

  // Dois pares ou overpair: value bet médio
  if (hasTwoPairFn(hole, board)) {
    if (flushOnBoard || straightOnBoard) {
      return { action: 'check', reason: 'Dois pares mas board perigoso (flush/straight possível). Check — se apostar é levar raise, está em situação horrivel.' }
    }
    return { action: 'value-small', reason: 'Dois pares no river — value bet médio (50%). Mao boa mas não nuts. Adversario paga com pares inferiores.' }
  }
  if (hasOverpair(hole, board)) {
    if (flushOnBoard) {
      return { action: 'check', reason: 'Overpair mas flush possível no board. Check — não aposte valor quando pode estar dominado.' }
    }
    return { action: 'value-small', reason: 'Overpair no river — value bet fino (50%). Pode extrair de pares menores. Não aposte muito grande.' }
  }

  // Top pair: check na maioria (pot control) ou thin value em board limpo
  if (hasTopPair(hole, board)) {
    if (flushOnBoard || straightOnBoard) {
      return { action: 'check', reason: 'Top pair em board perigoso — check. Board tem muitas mãos que te vencem. Controle o pote.' }
    }
    return { action: 'value-small', reason: 'Top pair em board limpo — thin value bet (33-50%). Adversario pode pagar com pares menores. Mas não exagere no sizing.' }
  }

  // Par médio/baixo: check
  if (hasAnyPair(hole, board)) {
    return { action: 'check', reason: 'Par médio/baixo no river — check. Sua mão tem showdown value mas não aguenta apostar é ser chamada por melhor.' }
  }

  // Sem nada: blefe ou give up
  if (flushOnBoard && !hasMadeFlush(hole, board)) {
    // Pode blefar representando flush
    const holeSuits = hole.map(c => c.slice(-1))
    const boardSuits = board.map(c => c.slice(-1))
    const suitCounts = {}
    boardSuits.forEach(s => { suitCounts[s] = (suitCounts[s] || 0) + 1 })
    const flushSuit = Object.keys(suitCounts).find(s => suitCounts[s] >= 3)
    if (flushSuit && holeSuits.includes(flushSuit)) {
      return { action: 'bluff', reason: 'Sem mão mas você pode representar o flush! Blefe grande (75%) — você tem uma carta do naipe que completou. Adversario com pares vai ter dificuldade de chamar.' }
    }
  }

  if (hasFlushDrawMissed(hole, board)) {
    return { action: 'bluff', reason: 'Flush draw que não completou — blefe no river! Você não tem showdown value nenhum, então a unica forma de ganhar é fazendo o adversário foldar. Aposte grande.' }
  }

  // Straight draw que não completou — pode blefar se board tem straight possível (representa a straight)
  if (straightOnBoard) {
    const holeVals = hole.map(c => RANK_VAL[c.slice(0, -1)])
    const allVals = [...new Set([...hole, ...board].map(c => RANK_VAL[c.slice(0, -1)]))].sort((a, b) => a - b)
    // Verifica se hero tem cartas conectadas ao board (tinha draw)
    const boardVals = board.map(c => RANK_VAL[c.slice(0, -1)])
    const hasConnector = holeVals.some(v => boardVals.some(bv => Math.abs(v - bv) <= 2))
    if (hasConnector) {
      return { action: 'bluff', reason: 'Straight draw que não completou, mas board tem straight possível — blefe representando a straight! Aposte grande (75%). Sem showdown value, blefe é a única forma de ganhar.' }
    }
  }

  return { action: 'check', reason: 'Sem mão e sem historia pra blefar. Check e desista — dar give up no river é correto quando não tem motivo pra apostar.' }
}

function Lesson({ onComplete }) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        River Play — A Decisao Final
      </h1>
      <p style={{ color: '#888', marginBottom: 24 }}>No river não tem mais cartas. Value bet, blefe ou check?</p>
      <div className="space-y-4">
        <Section title="Por Que River é Diferente?">
          No river, não existem mais draws. Não existe "proteção". Toda aposta é por um de dois motivos:<br /><br />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #4fce82' }}>
              <div style={{ color: '#4fce82', fontWeight: 700 }}>Value Bet</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Você tem mão forte é quer que chamem</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #e5484d' }}>
              <div style={{ color: '#e5484d', fontWeight: 700 }}>Blefe</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Você não tem nada é quer que foldem</div>
            </div>
          </div>
          <div className="mt-3 rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #888' }}>
            <div style={{ color: '#888', fontSize: 13 }}>Não existe "aposta de proteção" no river — não tem mais cartas pra proteger contra.</div>
          </div>
        </Section>
        <Section title="Value Bet no River">
          <div className="space-y-2">
            {[
              { hand: 'Nuts (flush, straight, set)', sizing: '75-100%', color: '#4fce82' },
              { hand: 'Dois pares, overpair', sizing: '50%', color: '#f5a623' },
              { hand: 'Top pair bom kicker', sizing: '33-50%', color: '#f5a623' },
            ].map(r => (
              <div key={r.hand} className="flex justify-between items-center rounded-lg p-3" style={{ background: '#0f0f0f' }}>
                <span style={{ color: '#ccc', fontSize: 13 }}>{r.hand}</span>
                <span style={{ color: r.color, fontWeight: 700, fontSize: 14 }}>{r.sizing}</span>
              </div>
            ))}
          </div>
          <div style={{ color: '#888', fontSize: 13, marginTop: 8 }}>
            Regra: aposte mais quando tem mão mais forte. Quanto mais nuts, maior o sizing.
          </div>
        </Section>
        <Section title="Blefe no River">
          Blefar no river funciona quando:<br /><br />
          <div className="space-y-2">
            {[
              'Você pode representar uma mão forte (flush/straight completou)',
              'Seu draw não completou e você não tem showdown value',
              'O adversário tem range capped (não pode ter mão forte)',
              'Você apostou flop e turn — a historia faz sentido',
            ].map((t, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span style={{ color: '#f5a623' }}>•</span>
                <span style={{ color: '#ccc', fontSize: 14 }}>{t}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #e5484d' }}>
            <div style={{ color: '#e5484d', fontWeight: 600, fontSize: 13 }}>Sizing do blefe: GRANDE (75%+)</div>
            <div style={{ color: '#ccc', fontSize: 12, marginTop: 2 }}>Blefes pequenos no river não funcionam — o adversário tem pot odds bons demais pra foldar.</div>
          </div>
        </Section>
        <Section title="Quando Check (Give Up)">
          <div className="space-y-2">
            {[
              'Par médio/baixo — tem showdown value, não transforme em blefe',
              'Board perigoso e você tem mão boa mas não nuts — controle',
              'Sem mão e sem historia pra blefar — aceite o give up',
            ].map((t, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span style={{ color: '#888' }}>✓</span>
                <span style={{ color: '#ccc', fontSize: 14 }}>{t}</span>
              </div>
            ))}
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
  const [board, setBoard] = useState(null)
  const [hole, setHole] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [sessionDone, setSessionDone] = useState(false)

  function newHand() {
    if (sessionTotal >= 10) { setSessionDone(true); return }
    let b, h
    for (let i = 0; i < 100; i++) {
      b = randomCards(5)
      h = randomCards(2, b)
      if (wouldPlayToRiver(h, b)) break
    }
    setBoard(b); setHole(h); setFeedback(null)
  }

  function answer(action) {
    if (!board || feedback) return
    const correct = getCorrectAction(hole, board)
    const eq = calcEquity(hole, board)
    const eqStr = eq !== null ? ` (${eq}% equity vs range aleatorio)` : ''
    correct.reason = correct.reason + eqStr
    const isCorrect = action === correct.action
    const newStreak = isCorrect ? streak + 1 : 0
    setStreak(newStreak)
    const newTotal = sessionTotal + 1, newCorrect = sessionCorrect + (isCorrect ? 1 : 0)
    setSessionTotal(newTotal); setSessionCorrect(newCorrect)
    recordAnswer(15, isCorrect, newStreak)
    const isLast = newTotal >= 10
    if (isLast) recordSession(15, Math.round((newCorrect / newTotal) * 100))
    setFeedback({ ...correct, isCorrect, isLast })
  }

  function restart() { setSessionCorrect(0); setSessionTotal(0); setStreak(0); setSessionDone(false); setFeedback(null); setBoard(null) }

  if (!board && !sessionDone) newHand()

  if (sessionDone) {
    return <SessionReview moduleId={15} sessionCorrect={sessionCorrect} sessionTotal={sessionTotal} onContinue={restart} />
  }

  const ACTION_LABELS = {
    'value-big': 'VALUE BET GRANDE',
    'value-small': 'VALUE BET MEDIO',
    'bluff': 'BLEFE',
    'check': 'CHECK'
  }

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <div className="rounded-xl p-3 mb-4 flex justify-between" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
        <div style={{ color: '#888', fontSize: 13 }}>Sessão: {sessionCorrect}/{sessionTotal} · Seq: {streak}</div>
        <div style={{ color: '#888', fontSize: 13 }}>Meta: 10 mãos</div>
      </div>
      <div className="rounded-full h-2 mb-6" style={{ background: '#2a2a2e' }}>
        <div className="rounded-full h-2 transition-all" style={{ width: `${(sessionTotal / 10) * 100}%`, background: '#e5484d' }} />
      </div>

      <ModulePokerTable
        heroPos="BTN"
        villainPos="BB"
        heroCards={hole || []}
        boardCards={board || []}
        villainAction="Check"
        potLabel="26bb"
        contextTitle="Voce esta IP — River"
        contextDesc="Todas as cartas foram reveladas. Qual sua acao final?"
      />

      {!feedback && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            ['value-big', 'VALUE BIG', '#4fce82', '#0f0f0f'],
            ['value-small', 'VALUE MEDIO', '#f5a623', '#0f0f0f'],
            ['bluff', 'BLEFE', '#e5484d', 'white'],
            ['check', 'CHECK', '#4a90e2', 'white'],
          ].map(([action, label, bg, color]) => (
            <button key={action} onClick={() => answer(action)} className="py-4 rounded-xl font-bold text-sm" style={{ background: bg, color }}>{label}</button>
          ))}
        </div>
      )}

      {feedback && (
        <div className="rounded-xl p-4 mb-4" style={{ background: '#1a1a1d', border: `2px solid ${feedback.isCorrect ? '#4fce82' : '#e5484d'}` }}>
          <div style={{ color: feedback.isCorrect ? '#4fce82' : '#e5484d', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
            {feedback.isCorrect ? 'Correto!' : 'Incorreto'}
          </div>
          <button onClick={newHand} className="w-full py-3 rounded-lg font-semibold mb-4" style={{ background: '#e5484d', color: 'white', fontSize: 16 }}>Próxima Mao</button>
          <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>{feedback.reason}</div>
          <div style={{ color: '#555', fontSize: 12, marginTop: 8 }}>
            Correto: <strong style={{ color: '#f5a623' }}>{ACTION_LABELS[feedback.action]}</strong>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Module15() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[15]?.lessonRead ? 'trainer' : 'lesson')
  if (!progress.modules[15]?.unlocked) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f0f' }}>
      <div className="text-center"><div style={{ fontSize: 60 }}>🔒</div><h2 style={{ color: 'white', marginTop: 16 }}>Módulo Bloqueado</h2><p style={{ color: '#888', marginTop: 8 }}>Complete o Módulo 14 para desbloquear.</p></div>
    </div>
  )
  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0f0f0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setView('lesson')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'lesson' ? '#e5484d' : '#1a1a1d', color: view === 'lesson' ? 'white' : '#888', border: '1px solid #2a2a2e' }}>Aula</button>
          <button onClick={() => progress.modules[15]?.lessonRead && setView('trainer')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'trainer' ? '#e5484d' : '#1a1a1d', color: view === 'trainer' ? 'white' : (progress.modules[15]?.lessonRead ? '#888' : '#444'), border: '1px solid #2a2a2e', cursor: progress.modules[15]?.lessonRead ? 'pointer' : 'not-allowed' }}>Trainer {!progress.modules[15]?.lessonRead && '🔒'}</button>
        </div>
        {view === 'lesson' ? <Lesson onComplete={() => { markLessonRead(15); setView('trainer') }} /> : <Trainer />}
      </div>
    </div>
  )
}
