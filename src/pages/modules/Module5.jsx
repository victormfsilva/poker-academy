import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'
import SessionReview from '../../components/SessionReview'
import Card from '../../components/Card'
import ModulePokerTable from '../../components/ModulePokerTable'

const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2']
const SUITS = ['s','h','d','c']
const RANK_VAL = { A:14, K:13, Q:12, J:11, T:10, '9':9, '8':8, '7':7, '6':6, '5':5, '4':4, '3':3, '2':2 }

function randomFlop() {
  const cards = []
  while (cards.length < 3) {
    const r = RANKS[Math.floor(Math.random() * RANKS.length)]
    const s = SUITS[Math.floor(Math.random() * SUITS.length)]
    const c = r + s
    if (!cards.includes(c)) cards.push(c)
  }
  return cards
}

function randomHoleCards(exclude) {
  const cards = []
  while (cards.length < 2) {
    const r = RANKS[Math.floor(Math.random() * RANKS.length)]
    const s = SUITS[Math.floor(Math.random() * SUITS.length)]
    const c = r + s
    if (!cards.includes(c) && !exclude.includes(c)) cards.push(c)
  }
  return cards
}

function getBoardTexture(flop) {
  const vals = flop.map(c => RANK_VAL[c.slice(0, -1)])
  const suits = flop.map(c => c.slice(-1))
  const suited = suits[0] === suits[1] || suits[1] === suits[2] || suits[0] === suits[2]
  const sorted = [...vals].sort((a, b) => a - b)
  const span = sorted[2] - sorted[0]
  const connected = span <= 4
  const paired = vals[0] === vals[1] || vals[1] === vals[2] || vals[0] === vals[2]
  return { suited, connected, paired, isWet: suited || connected, isDry: !suited && !connected }
}

function hasTopPair(hole, flop) {
  const flopRanks = flop.map(c => c.slice(0, -1))
  const holeRanks = hole.map(c => c.slice(0, -1))
  const topFlopRank = [...flopRanks].sort((a, b) => RANKS.indexOf(a) - RANKS.indexOf(b))[0]
  return holeRanks.includes(topFlopRank)
}

function hasAnyPair(hole, flop) {
  const flopRanks = flop.map(c => c.slice(0, -1))
  const holeRanks = hole.map(c => c.slice(0, -1))
  return holeRanks.some(r => flopRanks.includes(r))
}

function hasFlushDraw(hole, flop) {
  const allCards = [...hole, ...flop]
  const suitCounts = {}
  allCards.forEach(c => { const s = c.slice(-1); suitCounts[s] = (suitCounts[s] || 0) + 1 })
  return Object.values(suitCounts).some(v => v === 4)
}

function hasMadeFlush(hole, flop) {
  const allCards = [...hole, ...flop]
  const suitCounts = {}
  allCards.forEach(c => { const s = c.slice(-1); suitCounts[s] = (suitCounts[s] || 0) + 1 })
  return Object.values(suitCounts).some(v => v >= 5)
}

function hasMadeStraight(hole, flop) {
  const holeVals = hole.map(c => RANK_VAL[c.slice(0, -1)])
  const allVals = [...new Set([...hole, ...flop].map(c => RANK_VAL[c.slice(0, -1)]))].sort((a, b) => a - b)
  // Ace can be low (1) for wheel
  if (allVals.includes(14)) allVals.unshift(1)
  for (let i = 0; i <= allVals.length - 5; i++) {
    if (allVals[i + 4] - allVals[i] === 4) {
      const run = [allVals[i], allVals[i+1], allVals[i+2], allVals[i+3], allVals[i+4]]
      if (holeVals.some(v => run.includes(v) || (v === 14 && run.includes(1)))) return true
    }
  }
  return false
}

function hasStraightDraw(hole, flop) {
  if (hasMadeStraight(hole, flop)) return false
  const holeVals = hole.map(c => RANK_VAL[c.slice(0, -1)])
  const allVals = [...new Set([...hole, ...flop].map(c => RANK_VAL[c.slice(0, -1)]))].sort((a, b) => a - b)
  if (allVals.includes(14)) allVals.unshift(1)
  for (let i = 0; i < allVals.length - 3; i++) {
    if (allVals[i + 3] - allVals[i] <= 4) {
      const window = allVals.slice(i, i + 4)
      if (holeVals.some(v => window.includes(v) || (v === 14 && window.includes(1)))) return true
    }
  }
  return false
}

function getCorrectAction(hole, flop) {
  const texture = getBoardTexture(flop)
  const flopRanks = flop.map(c => c.slice(0, -1))
  const holeRanks = hole.map(c => c.slice(0, -1))
  const isPocketPair = holeRanks[0] === holeRanks[1]
  const hasSet = isPocketPair && flopRanks.includes(holeRanks[0])
  const matchingFlopRanks = [...new Set(holeRanks)].filter(r => flopRanks.includes(r))
  const hasTwoPair = !isPocketPair && matchingFlopRanks.length === 2
  const hasTop = hasTopPair(hole, flop)
  const hasPair = hasAnyPair(hole, flop)
  const hasFlush = hasFlushDraw(hole, flop)
  const hasStraight = hasStraightDraw(hole, flop)

  if (hasMadeFlush(hole, flop)) {
    return { action: 'bet', sizing: '75%', reason: 'Flush completo! Aposte grande (75%) — mao nuts, extraia o maximo de valor.' }
  }
  if (hasMadeStraight(hole, flop)) {
    if (texture.isWet) return { action: 'bet', sizing: '75%', reason: 'Straight no flop em board umido — aposte grande (75%)! Proteja contra flush draws e construa pote.' }
    return { action: 'bet', sizing: '75%', reason: 'Straight no flop! Aposte grande (75%). Mao muito forte, construa o pote.' }
  }
  if (hasSet) {
    if (texture.isWet) return { action: 'bet', sizing: '75%', reason: 'Set em board umido — aposte grande (75%)! Proteja contra draws e construa pote.' }
    return { action: 'bet', sizing: '75%', reason: 'Set — aposte grande (75%). Mao muito forte, construa o pote.' }
  }
  if (hasTwoPair) {
    if (texture.isWet) return { action: 'bet', sizing: '75%', reason: 'Dois pares em board umido — aposte grande (75%) pra proteger. Muitos draws podem ultrapassar.' }
    return { action: 'bet', sizing: '50%', reason: 'Dois pares em board seco — aposte medio (50%). Extraia valor sem assustar.' }
  }
  if (isPocketPair && !hasSet) {
    const pocketVal = RANK_VAL[holeRanks[0]]
    const topFlopVal = Math.max(...flopRanks.map(r => RANK_VAL[r]))
    if (pocketVal > topFlopVal) {
      if (texture.isWet) return { action: 'bet', sizing: '75%', reason: 'Overpair em board umido — aposte grande (75%) pra proteger contra draws.' }
      return { action: 'bet', sizing: '50%', reason: 'Overpair em board seco — aposte medio (50%). Extraia valor, poucas ameacas.' }
    }
  }
  if (hasTop) return { action: 'bet', sizing: '50%', reason: 'Top pair — aposte medio (50%). Bom equilibrio entre valor e protecao.' }
  if (hasFlush && hasStraight) return { action: 'bet', sizing: '75%', reason: 'Combo draw (flush + straight)! Aposte grande (75%) como semi-blefe. Equity monstruosa (~45%+).' }
  if (hasFlush) return { action: 'bet', sizing: '50%', reason: 'Flush draw — aposte medio (50%) como semi-blefe. 9 outs (~35% equity).' }
  if (hasStraight) return { action: 'bet', sizing: '33%', reason: 'Straight draw — aposte pequeno (33%) como semi-blefe barato. 8 outs (~32%).' }
  if (hasPair || isPocketPair) {
    if (texture.isWet) return { action: 'bet', sizing: '50%', reason: 'Par num flop umido — aposte 50% pra proteger. Deixar ver cartas gratis pode custar caro.' }
    return { action: 'bet', sizing: '33%', reason: 'Par medio/baixo em board seco — aposte pequeno (33%) pra thin value e protecao.' }
  }
  if (texture.isDry) return { action: 'bet', sizing: '33%', reason: 'Board seco sem mao — aposte barato (33%). O adversario provavelmente errou tambem.' }
  return { action: 'check', sizing: null, reason: 'Board umido sem mao nem draw — check. Nao desperdice fichas blefando num board que favorece o adversario.' }
}

function Lesson({ onComplete }) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>CBet Flop IP + Bet Sizing</h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Voce abriu o pote e esta em posicao. Quando apostar, quanto apostar, e por que.</p>
      <div className="space-y-4">
        <Section title="O que e essa Aposta?">
          Quando voce e o primeiro a apostar antes do flop e o flop sai, os adversarios tendem a esperar que voce aposte de novo — porque foi voce que atacou primeiro. Essa aposta de continuacao existe pra aproveitar essa expectativa e pressionar o adversario.
        </Section>
        <Section title="O Flop Favorece Voce ou o Adversario?">
          A primeira coisa que voce analisa e: as cartas do flop combinam mais com as maos que voce teria ou com as maos que o adversario teria?
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #4fce82' }}>
              <div style={{ color: '#4fce82', fontWeight: 600 }}>Flop Seco</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Ex: A♠ 7♦ 2♣ (naipes diferentes)<br />Poucas chances de draw. Aposte frequente e barato (33% do pote).</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #e5484d' }}>
              <div style={{ color: '#e5484d', fontWeight: 600 }}>Flop Conectado</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Ex: 9♠ 8♥ 7♠<br />Muitos draws possiveis. So aposte se tiver boa mao — caso contrario, passe a vez.</div>
            </div>
          </div>
        </Section>

        <Section title="Os 4 Tamanhos Principais">
          <div className="grid grid-cols-2 gap-3 mt-2">
            {[
              { size: '33%', color: '#4fce82', name: 'Pequeno', when: 'Board seco, blefe barato, par medio, thin value', example: 'Pote 10bb → aposta 3.3bb' },
              { size: '50%', color: '#f5a623', name: 'Medio', when: 'Top pair, overpair seco, flush draw semi-blefe', example: 'Pote 10bb → aposta 5bb' },
              { size: '75%', color: '#e5484d', name: 'Grande', when: 'Set, dois pares, overpair wet, combo draw', example: 'Pote 10bb → aposta 7.5bb' },
              { size: '100%+', color: '#9b59b6', name: 'Overbet', when: 'Nuts no river, polarizado (muito forte ou blefe puro)', example: 'Pote 10bb → aposta 10-15bb' },
            ].map(s => (
              <div key={s.size} className="rounded-lg p-3" style={{ background: '#0f0f0f', border: `1px solid ${s.color}` }}>
                <div style={{ color: s.color, fontWeight: 700, fontSize: 18 }}>{s.size}</div>
                <div style={{ color: 'white', fontWeight: 600, fontSize: 13, marginTop: 2 }}>{s.name}</div>
                <div style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>{s.when}</div>
                <div style={{ color: '#666', fontSize: 11, marginTop: 4 }}>{s.example}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Regra de Ouro: Sizing Segue a Forca da Mao + Board">
          <div className="space-y-2 mt-2">
            {[
              { rule: 'Mao forte + board umido → aposte GRANDE', color: '#e5484d', why: 'Proteja contra draws e extraia valor enquanto podem pagar' },
              { rule: 'Mao forte + board seco → aposte MEDIO', color: '#f5a623', why: 'Sem urgencia de protecao. Extraia valor sem assustar' },
              { rule: 'Mao media → aposte PEQUENO', color: '#4fce82', why: 'Thin value. Nao inflando o pote com mao vulneravel' },
              { rule: 'Blefe → aposte o MINIMO efetivo', color: '#888', why: 'Risco minimo pra maxima fold equity. 33% em board seco ja funciona' },
            ].map(r => (
              <div key={r.rule} className="rounded-lg p-3" style={{ background: '#0f0f0f' }}>
                <div style={{ color: r.color, fontWeight: 600, fontSize: 13 }}>{r.rule}</div>
                <div style={{ color: '#ccc', fontSize: 12, marginTop: 2 }}>{r.why}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Flop Seco Sem Mao — Aposta Mesmo Assim!">
          Esse e o conceito mais contraintuitivo: <strong style={{ color: '#e5484d' }}>no flop seco, voce aposta mesmo sem ter nada.</strong><br /><br />
          Num flop como A-7-2 com naipes diferentes, o adversario tambem dificilmente acertou algo — uma aposta pequena de 33% vai fazer ele foldar a maioria das maos fracas. Voce nao precisa ter mao para apostar, precisa ter <strong style={{ color: '#4fce82' }}>uma boa razao para apostar</strong>.
        </Section>

        <Section title="Quando Passar a Vez (nao apostar)">
          <ul className="space-y-1 mt-2" style={{ color: '#ccc', fontSize: 14 }}>
            <li>• Flop conectado (ex: 9-8-7) e voce nao tem nada — nao aposte</li>
            <li>• Mais de 2 jogadores no pote — alguem quase certamente acertou algo</li>
            <li>• Adversario que ja relancou antes — cuidado, ele pode estar esperando</li>
          </ul>
        </Section>

        <Section title="Sizing no Turn e River">
          As mesmas regras se aplicam, mas com ajustes:<br /><br />
          <strong style={{ color: '#f5a623' }}>Turn:</strong> Se apostou 50% no flop e o draw nao completou, pode manter 50% ou subir pra 75%.<br />
          <strong style={{ color: '#e5484d' }}>River:</strong> Sizing polarizado — ou aposte grande (valor/blefe) ou check. Nao existe "aposta de protecao" no river porque nao tem mais cartas pra vir.
        </Section>

        <Section title="Overbet — Quando Usar">
          <div className="rounded-lg p-3 mt-2" style={{ background: '#0f0f0f', border: '1px solid #9b59b6' }}>
            <div style={{ color: '#9b59b6', fontWeight: 700, marginBottom: 4 }}>Apostar mais que o pote (100%+)</div>
            <div style={{ color: '#ccc', fontSize: 13 }}>
              Use no river quando voce tem nuts e o adversario tem um range capped (limitado).<br /><br />
              Exemplo: voce tem flush no river e o adversario nao pode ter flush. Overbet extrai maximo valor porque ele pode ter top pair forte que paga.
            </div>
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

  function answer(action, sizing) {
    if (!flop || feedback) return
    const correct = getCorrectAction(hole, flop)
    const isCorrect = action === correct.action && (action === 'check' || sizing === correct.sizing)
    const newStreak = isCorrect ? streak + 1 : 0
    setStreak(newStreak)
    const newTotal = sessionTotal + 1, newCorrect = sessionCorrect + (isCorrect ? 1 : 0)
    setSessionTotal(newTotal); setSessionCorrect(newCorrect)
    recordAnswer(5, isCorrect, newStreak)
    const isLast = newTotal >= 10
    if (isLast) recordSession(5, Math.round((newCorrect / newTotal) * 100))
    setFeedback({ ...correct, userAction: action, isCorrect, isLast })
  }

  function restart() { setSessionCorrect(0); setSessionTotal(0); setStreak(0); setSessionDone(false); setFeedback(null); setFlop(null); setHole(null) }

  if (!flop && !sessionDone) newHand()

  if (sessionDone) {
    return <SessionReview moduleId={5} sessionCorrect={sessionCorrect} sessionTotal={sessionTotal} onContinue={restart} />
  }

  const texture = flop ? getBoardTexture(flop) : null

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <div className="rounded-xl p-3 mb-4 flex justify-between" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
        <div style={{ color: '#888', fontSize: 13 }}>Sessao: {sessionCorrect}/{sessionTotal} · Seq: {streak}</div>
        <div style={{ color: '#888', fontSize: 13 }}>Meta: 10 maos</div>
      </div>
      <div className="rounded-full h-2 mb-6" style={{ background: '#2a2a2e' }}>
        <div className="rounded-full h-2 transition-all" style={{ width: `${(sessionTotal / 10) * 100}%`, background: '#e5484d' }} />
      </div>

      <ModulePokerTable
        heroPos="BTN"
        villainPos="BB"
        heroCards={hole || []}
        boardCards={flop || []}
        villainAction="Check"
        potLabel="6.5bb"
        contextTitle="Voce esta IP (em posicao)"
        contextDesc="Voce fez o raise pre-flop. Adversario checou para voce no flop."
        textureTags={texture ? [
          { label: texture.isDry ? 'Board Seco' : 'Board Umido', color: texture.isDry ? '#4fce82' : '#e5484d' },
          ...(texture.suited ? [{ label: 'Flush Draw', color: '#0a84d7' }] : []),
          ...(texture.connected ? [{ label: 'Conectado', color: '#f5a623' }] : []),
          ...(texture.paired ? [{ label: 'Pareado', color: '#888' }] : []),
        ] : null}
      />

      {!feedback && (
        <div className="space-y-3 mb-4">
          <button onClick={() => answer('check')} className="w-full py-4 rounded-xl font-bold text-xl" style={{ background: '#4a90e2', color: 'white' }}>
            CHECK
          </button>
          <div className="grid grid-cols-3 gap-2">
            {[['33%', '#4fce82'], ['50%', '#f5a623'], ['75%', '#e5484d']].map(([s, c]) => (
              <button key={s} onClick={() => answer('bet', s)} className="py-3 rounded-xl font-bold" style={{ background: c, color: '#0f0f0f' }}>
                BET {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {feedback && (
        <div className="rounded-xl p-4 mb-4" style={{ background: '#1a1a1d', border: `2px solid ${feedback.isCorrect ? '#4fce82' : '#e5484d'}` }}>
          <div style={{ color: feedback.isCorrect ? '#4fce82' : '#e5484d', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
            {feedback.isCorrect ? 'Correto!' : 'Incorreto'}
          </div>
          <button onClick={newHand} className="w-full py-3 rounded-lg font-semibold mb-4" style={{ background: '#e5484d', color: 'white', fontSize: 16 }}>Proxima Mao</button>
          <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>{feedback.reason}</div>
          <div style={{ color: '#555', fontSize: 12, marginTop: 8 }}>
            Correto: <strong style={{ color: '#f5a623' }}>{feedback.action === 'check' ? 'CHECK' : `BET ${feedback.sizing}`}</strong>
          </div>
          {!feedback.isCorrect && (
            <div className="mt-3 rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #4a90e230' }}>
              <div style={{ color: '#4a90e2', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Guia de Sizing</div>
              <div style={{ color: '#ccc', fontSize: 12, lineHeight: 1.7 }}>
                <div>• <strong style={{ color: '#e5484d' }}>Set / Dois pares wet / Overpair wet / Combo draw</strong> → 75%</div>
                <div>• <strong style={{ color: '#f5a623' }}>Top pair / Overpair seco / Dois pares seco / Flush draw</strong> → 50%</div>
                <div>• <strong style={{ color: '#4fce82' }}>Par medio / Straight draw / Board seco sem mao</strong> → 33%</div>
                <div>• <strong style={{ color: '#888' }}>Board umido sem nada</strong> → CHECK</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Module5() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[5].lessonRead ? 'trainer' : 'lesson')
  if (!progress.modules[5].unlocked) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f0f' }}>
      <div className="text-center"><div style={{ fontSize: 60 }}>🔒</div><h2 style={{ color: 'white', marginTop: 16 }}>Modulo Bloqueado</h2><p style={{ color: '#888', marginTop: 8 }}>Complete o Modulo 4 para desbloquear.</p></div>
    </div>
  )
  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0f0f0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setView('lesson')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'lesson' ? '#e5484d' : '#1a1a1d', color: view === 'lesson' ? 'white' : '#888', border: '1px solid #2a2a2e' }}>Aula</button>
          <button onClick={() => progress.modules[5].lessonRead && setView('trainer')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'trainer' ? '#e5484d' : '#1a1a1d', color: view === 'trainer' ? 'white' : (progress.modules[5].lessonRead ? '#888' : '#444'), border: '1px solid #2a2a2e', cursor: progress.modules[5].lessonRead ? 'pointer' : 'not-allowed' }}>Trainer {!progress.modules[5].lessonRead && '🔒'}</button>
        </div>
        {view === 'lesson' ? <Lesson onComplete={() => { markLessonRead(5); setView('trainer') }} /> : <Trainer />}
      </div>
    </div>
  )
}
