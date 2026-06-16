import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'
import Card from '../../components/Card'

const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2']
const SUITS = ['s','h','d','c']

function randomFlop() {
  const cards = []
  while (cards.length < 3) {
    const c = RANKS[Math.floor(Math.random() * RANKS.length)] + SUITS[Math.floor(Math.random() * SUITS.length)]
    if (!cards.includes(c)) cards.push(c)
  }
  return cards
}

function randomHoleCards(exclude) {
  const cards = []
  while (cards.length < 2) {
    const c = RANKS[Math.floor(Math.random() * RANKS.length)] + SUITS[Math.floor(Math.random() * SUITS.length)]
    if (!cards.includes(c) && !exclude.includes(c)) cards.push(c)
  }
  return cards
}

function getBoardTexture(flop) {
  const ranks = flop.map(c => RANKS.indexOf(c.slice(0, -1)))
  const suits = flop.map(c => c.slice(-1))
  const suited = suits[0] === suits[1] || suits[1] === suits[2] || suits[0] === suits[2]
  const sorted = [...ranks].sort((a, b) => a - b)
  const isBroadway = sorted[2] <= 4
  const connected = (sorted[2] - sorted[0]) <= 4 && !isBroadway
  const paired = ranks[0] === ranks[1] || ranks[1] === ranks[2] || ranks[0] === ranks[2]
  const lowBoard = Math.min(...ranks) >= 5 // todas as cartas 9 ou menos
  return { suited, connected, paired, lowBoard, isWet: suited || connected, isDry: !suited && !connected }
}

function hasTopPair(hole, flop) {
  const flopRanks = flop.map(c => c.slice(0, -1))
  const holeRanks = hole.map(c => c.slice(0, -1))
  const topFlopRank = [...flopRanks].sort((a, b) => RANKS.indexOf(a) - RANKS.indexOf(b))[0]
  return holeRanks.includes(topFlopRank)
}

function hasAnyPair(hole, flop) {
  const flopRanks = flop.map(c => c.slice(0, -1))
  return hole.map(c => c.slice(0, -1)).some(r => flopRanks.includes(r))
}

function hasFlushDraw(hole, flop) {
  const suitCounts = {}
  ;[...hole, ...flop].forEach(c => { const s = c.slice(-1); suitCounts[s] = (suitCounts[s] || 0) + 1 })
  return Object.values(suitCounts).some(v => v === 4)
}

function hasStraightDraw(hole, flop) {
  const holeRankIdx = hole.map(c => RANKS.indexOf(c.slice(0, -1)))
  const allRanks = [...hole, ...flop].map(c => RANKS.indexOf(c.slice(0, -1)))
  const unique = [...new Set(allRanks)].sort((a, b) => a - b)
  for (let i = 0; i <= unique.length - 5; i++) {
    if (unique[i + 4] - unique[i] === 4) return false
  }
  for (let i = 0; i < unique.length - 3; i++) {
    if (unique[i + 3] - unique[i] <= 4) {
      const windowRanks = unique.slice(i, i + 4)
      if (holeRankIdx.some(r => windowRanks.includes(r))) return true
    }
  }
  return false
}

function hasMadeFlush(hole, flop) {
  const suitCounts = {}
  ;[...hole, ...flop].forEach(c => { const s = c.slice(-1); suitCounts[s] = (suitCounts[s] || 0) + 1 })
  return Object.values(suitCounts).some(v => v >= 5)
}

function hasSetFn(hole, flop) {
  const holeRanks = hole.map(c => c.slice(0, -1))
  const flopRanks = flop.map(c => c.slice(0, -1))
  return holeRanks[0] === holeRanks[1] && flopRanks.includes(holeRanks[0])
}

function hasTwoPairFn(hole, flop) {
  const holeRanks = hole.map(c => c.slice(0, -1))
  const flopRanks = flop.map(c => c.slice(0, -1))
  if (holeRanks[0] === holeRanks[1]) return false
  return [...new Set(holeRanks)].filter(r => flopRanks.includes(r)).length === 2
}

// Donk bet: você está OOP (BB), chamou pre, flop saiu.
// Normalmente você checa pro raiser. Mas em certos spots, apostar primeiro (donk) é correto.
function getCorrectAction(hole, flop) {
  const texture = getBoardTexture(flop)

  // Donk bet de valor: mão muito forte em board que favorece SEU range
  if (hasMadeFlush(hole, flop)) {
    return { action: 'donk', reason: 'Flush completo! Donk bet de valor — você tem mão nuts e o adversário pode checar atras. Não de carta gratis, aposte!' }
  }
  if (hasSetFn(hole, flop)) {
    if (texture.lowBoard) {
      return { action: 'donk', reason: 'Set em board baixo — donk bet! Esse flop favorece seu range de BB (você tem mais sets de cartas baixas que o raiser). Aposte pra construir pote.' }
    }
    return { action: 'check', reason: 'Set em board alto — check pro raiser. Ele provavelmente vai c-betar e você pode check-raise. Board alto favorece o range dele.' }
  }
  if (hasTwoPairFn(hole, flop)) {
    if (texture.lowBoard && texture.isWet) {
      return { action: 'donk', reason: 'Dois pares em board baixo e úmido — donk bet! Proteja sua mão e construa pote. O raiser pode checar atras num board que não favorece ele.' }
    }
    return { action: 'check', reason: 'Dois pares mas board não favorece claramente seu range. Check e deixe o raiser c-betar — você pode check-raise.' }
  }

  // Donk bet como semi-blefe: draw forte em board que favorece seu range
  if (texture.lowBoard && texture.isWet && (hasFlushDraw(hole, flop) || hasStraightDraw(hole, flop))) {
    return { action: 'donk', reason: 'Draw forte em board baixo e úmido — donk bet como semi-blefe! O raiser pode checar atras num board que não favorece ele. Aposte pra ganhar na hora ou construir pote pro draw.' }
  }

  // Top pair em board baixo: pode donk
  if (hasTopPair(hole, flop) && texture.lowBoard) {
    return { action: 'donk', reason: 'Top pair em board baixo — donk bet de valor fino. Esse board favorece seu range. O raiser pode checar atras com overcards, então aposte você mesmo.' }
  }

  // Maioria dos casos: check (estratégia padrão)
  if (hasTopPair(hole, flop) || hasAnyPair(hole, flop) || hasFlushDraw(hole, flop) || hasStraightDraw(hole, flop)) {
    return { action: 'check', reason: 'Check pro raiser — estratégia padrão. Deixe ele c-betar e decida depois. Board não favorece seu range o suficiente pra donk bet.' }
  }

  return { action: 'check', reason: 'Sem mão forte nem draw — check. Donk bet sem motivo é desperdiçar fichas. Deixe o raiser agir primeiro.' }
}

function Lesson({ onComplete }) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        Donk Bet — Quando Apostar Antes do Raiser
      </h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Quebrando a convencao: por que as vezes você deve liderar a aposta OOP</p>
      <div className="space-y-4">
        <Section title="O Que é Donk Bet?">
          Normalmente, quando você chamou um raise pre-flop e está OOP (fora de posição), você checa pro raiser no flop. Ele tem a "iniciativa".<br /><br />
          <strong style={{ color: '#f5a623' }}>Donk bet</strong> é quando você aposta ANTES do raiser ter chance de agir. E o contrário da estratégia convencional — e por isso é poderoso quando usado certo.
        </Section>
        <Section title="Por Que Donk Bet Normalmente é Ruim?">
          <div className="space-y-2">
            {[
              'Você abre mão da chance de check-raise (jogada mais forte)',
              'O raiser tem range mais forte na maioria dos boards',
              'Donk bet revela força — adversarios bons exploram isso',
            ].map((t, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span style={{ color: '#e94560' }}>✗</span>
                <span style={{ color: '#ccc', fontSize: 14 }}>{t}</span>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Quando Donk Bet é Correto">
          <div className="space-y-2">
            {[
              { spot: 'Board baixo (ex: 7-5-3, 8-6-2)', why: 'Favorece seu range de BB — você tem mais 75s, 53s, 86s que o raiser. Ele pode checar atras.' },
              { spot: 'Set ou dois pares em board baixo', why: 'Mao monstruosa que o raiser não espera. Se ele checar atras, você perde valor.' },
              { spot: 'Draw forte em board que favorece você', why: 'Semi-blefe. O raiser pode checar atrás e você perde fold equity.' },
              { spot: 'Top pair em board baixo', why: 'Thin value. O raiser pode checar overcards e você não extrai nada.' },
            ].map(r => (
              <div key={r.spot} className="rounded-lg p-3" style={{ background: '#0a0a0f' }}>
                <div style={{ color: '#00d4aa', fontWeight: 600, fontSize: 13 }}>{r.spot}</div>
                <div style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>{r.why}</div>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Quando NAO Donk Bet">
          <div className="space-y-2">
            {[
              { spot: 'Board alto (A-K-Q, A-J-T)', why: 'Favorece o range do raiser. Deixe ele c-betar e decida depois.' },
              { spot: 'Sem mão nem draw', why: 'Donk bet sem motivo é jogar dinheiro fora.' },
              { spot: 'Set em board alto', why: 'Check-raise é muito melhor. O raiser vai c-betar quase sempre nesse board.' },
            ].map(r => (
              <div key={r.spot} className="rounded-lg p-3" style={{ background: '#0a0a0f' }}>
                <div style={{ color: '#e94560', fontWeight: 600, fontSize: 13 }}>{r.spot}</div>
                <div style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>{r.why}</div>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Sizing do Donk Bet">
          <div className="rounded-lg p-3 mt-2" style={{ background: '#0a0a0f', border: '1px solid #f5a623' }}>
            <div style={{ color: '#f5a623', fontWeight: 700, marginBottom: 4 }}>33-50% do pote</div>
            <div style={{ color: '#ccc', fontSize: 13 }}>
              Donk bets geralmente são menores que c-bets. 33% em boards secos, 50% em boards umidos. O objetivo não é assustar — é construir pote ou semi-blefar barato.
            </div>
          </div>
        </Section>
      </div>
      <button onClick={onComplete} className="w-full mt-8 py-4 rounded-xl font-bold text-white text-lg" style={{ background: '#e94560' }}>
        Entendi — Quero Treinar
      </button>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
      <h3 style={{ color: 'white', fontWeight: 600, marginBottom: 8 }}>{title}</h3>
      <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>{children}</div>
    </div>
  )
}

function Trainer() {
  const { progress, recordAnswer, recordSession } = useProgress()
  const [flop, setFlop] = useState(null)
  const [hole, setHole] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [sessionDone, setSessionDone] = useState(false)

  function newHand() {
    if (sessionTotal >= 10) { setSessionDone(true); return }
    const f = randomFlop()
    const h = randomHoleCards(f)
    setFlop(f); setHole(h); setFeedback(null)
  }

  function answer(action) {
    if (!flop || feedback) return
    const correct = getCorrectAction(hole, flop)
    const isCorrect = action === correct.action
    const newStreak = isCorrect ? streak + 1 : 0
    setStreak(newStreak)
    const newTotal = sessionTotal + 1, newCorrect = sessionCorrect + (isCorrect ? 1 : 0)
    setSessionTotal(newTotal); setSessionCorrect(newCorrect)
    recordAnswer(13, isCorrect, newStreak)
    const isLast = newTotal >= 10
    if (isLast) recordSession(13, Math.round((newCorrect / newTotal) * 100))
    setFeedback({ ...correct, isCorrect, isLast })
  }

  function restart() { setSessionCorrect(0); setSessionTotal(0); setStreak(0); setSessionDone(false); setFeedback(null); setFlop(null) }

  if (!flop && !sessionDone) newHand()

  if (sessionDone) {
    const acc = Math.round((sessionCorrect / sessionTotal) * 100)
    return (
      <div className="text-center" style={{ maxWidth: 400, margin: '0 auto', paddingTop: 40 }}>
        <div style={{ fontSize: 60 }}>{acc >= 90 ? '🎉' : '💪'}</div>
        <h2 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginTop: 16 }}>Sessão Completa!</h2>
        <div style={{ color: acc >= 90 ? '#00d4aa' : '#f5a623', fontSize: 36, fontWeight: 700 }}>{acc}%</div>
        <button onClick={restart} className="mt-6 px-8 py-3 rounded-xl font-bold" style={{ background: '#e94560', color: 'white' }}>Nova Sessão</button>
      </div>
    )
  }

  const texture = flop ? getBoardTexture(flop) : null

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <div className="rounded-xl p-3 mb-4 flex justify-between" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
        <div style={{ color: '#888', fontSize: 13 }}>Sessão: {sessionCorrect}/{sessionTotal} · Seq: {streak}</div>
        <div style={{ color: '#888', fontSize: 13 }}>Meta: 10 mãos</div>
      </div>
      <div className="rounded-full h-2 mb-6" style={{ background: '#1e1e2e' }}>
        <div className="rounded-full h-2 transition-all" style={{ width: `${(sessionTotal / 10) * 100}%`, background: '#e94560' }} />
      </div>

      <div className="rounded-xl p-4 mb-4 text-center" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
        <div style={{ color: '#888', fontSize: 12 }}>SITUAÇÃO</div>
        <div style={{ color: '#e94560', fontSize: 18, fontWeight: 700 }}>Você está no BB (OOP)</div>
        <div style={{ color: '#ccc', fontSize: 13, marginTop: 2 }}>Você chamou o raise pre-flop. Flop saiu. Donk bet ou check?</div>
        {texture && (
          <div className="mt-2 flex gap-2 justify-center flex-wrap">
            <span className="px-2 py-1 rounded text-xs" style={{ background: texture.isDry ? '#00d4aa22' : '#e9456022', color: texture.isDry ? '#00d4aa' : '#e94560' }}>
              {texture.isDry ? 'Board Seco' : 'Board Umido'}
            </span>
            {texture.lowBoard && <span className="px-2 py-1 rounded text-xs" style={{ background: '#f5a62322', color: '#f5a623' }}>Board Baixo</span>}
            {!texture.lowBoard && <span className="px-2 py-1 rounded text-xs" style={{ background: '#88888822', color: '#888' }}>Board Alto</span>}
          </div>
        )}
      </div>

      <div className="mb-4">
        <div style={{ color: '#888', fontSize: 12, marginBottom: 8, textAlign: 'center' }}>SUAS CARTAS</div>
        <div className="flex justify-center gap-3 mb-4">
          {hole?.map((c, i) => <Card key={i} card={c} size="md" />)}
        </div>
        <div style={{ color: '#888', fontSize: 12, marginBottom: 8, textAlign: 'center' }}>FLOP</div>
        <div className="flex justify-center gap-3">
          {flop?.map((c, i) => <Card key={i} card={c} size="md" />)}
        </div>
      </div>

      {!feedback && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[['check', 'CHECK', '#4a90e2', 'white'], ['donk', 'DONK BET', '#f5a623', '#0a0a0f']].map(([action, label, bg, color]) => (
            <button key={action} onClick={() => answer(action)} className="py-4 rounded-xl font-bold text-lg" style={{ background: bg, color }}>{label}</button>
          ))}
        </div>
      )}

      {feedback && (
        <div className="rounded-xl p-4 mb-4" style={{ background: '#12121a', border: `2px solid ${feedback.isCorrect ? '#00d4aa' : '#e94560'}` }}>
          <div style={{ color: feedback.isCorrect ? '#00d4aa' : '#e94560', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
            {feedback.isCorrect ? 'Correto!' : 'Incorreto'}
          </div>
          <button onClick={newHand} className="w-full py-3 rounded-lg font-semibold mb-4" style={{ background: '#e94560', color: 'white', fontSize: 16 }}>Próxima Mao</button>
          <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>{feedback.reason}</div>
          <div style={{ color: '#555', fontSize: 12, marginTop: 8 }}>
            Correto: <strong style={{ color: '#f5a623' }}>{feedback.action === 'check' ? 'CHECK' : 'DONK BET'}</strong>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Module13() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[13]?.lessonRead ? 'trainer' : 'lesson')
  if (!progress.modules[13]?.unlocked) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
      <div className="text-center"><div style={{ fontSize: 60 }}>🔒</div><h2 style={{ color: 'white', marginTop: 16 }}>Módulo Bloqueado</h2><p style={{ color: '#888', marginTop: 8 }}>Complete o Módulo 12 para desbloquear.</p></div>
    </div>
  )
  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setView('lesson')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'lesson' ? '#e94560' : '#12121a', color: view === 'lesson' ? 'white' : '#888', border: '1px solid #1e1e2e' }}>Aula</button>
          <button onClick={() => progress.modules[13]?.lessonRead && setView('trainer')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'trainer' ? '#e94560' : '#12121a', color: view === 'trainer' ? 'white' : (progress.modules[13]?.lessonRead ? '#888' : '#444'), border: '1px solid #1e1e2e', cursor: progress.modules[13]?.lessonRead ? 'pointer' : 'not-allowed' }}>Trainer {!progress.modules[13]?.lessonRead && '🔒'}</button>
        </div>
        {view === 'lesson' ? <Lesson onComplete={() => { markLessonRead(13); setView('trainer') }} /> : <Trainer />}
      </div>
    </div>
  )
}
