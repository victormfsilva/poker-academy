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
  const connected = (sorted[2] - sorted[0]) <= 4
  const paired = ranks[0] === ranks[1] || ranks[1] === ranks[2] || ranks[0] === ranks[2]
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
  if ([0, 9, 10, 11, 12].every(v => unique.includes(v))) return false
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

function hasSet(hole, flop) {
  const holeRanks = hole.map(c => c.slice(0, -1))
  const flopRanks = flop.map(c => c.slice(0, -1))
  return holeRanks[0] === holeRanks[1] && flopRanks.includes(holeRanks[0])
}

function hasTwoPair(hole, flop) {
  const holeRanks = hole.map(c => c.slice(0, -1))
  const flopRanks = flop.map(c => c.slice(0, -1))
  if (holeRanks[0] === holeRanks[1]) return false
  return [...new Set(holeRanks)].filter(r => flopRanks.includes(r)).length === 2
}

function hasOverpair(hole, flop) {
  const holeRanks = hole.map(c => c.slice(0, -1))
  if (holeRanks[0] !== holeRanks[1]) return false
  const pocketIdx = RANKS.indexOf(holeRanks[0])
  const topFlopIdx = Math.min(...flop.map(c => RANKS.indexOf(c.slice(0, -1))))
  return pocketIdx < topFlopIdx
}

const CBET_SIZES = ['33%', '50%', '75%']

function getCorrectAction(hole, flop, cbetSize) {
  const texture = getBoardTexture(flop)
  const potOdds = cbetSize === '33%' ? 25 : cbetSize === '50%' ? 33 : 43

  // Mao muito forte: check-raise
  if (hasMadeFlush(hole, flop) || hasSet(hole, flop) || hasTwoPair(hole, flop)) {
    return { action: 'raise', reason: `Voce tem mao muito forte! Check-raise para construir o pote. O adversario ja apostou — relance para extrair o maximo de valor.` }
  }

  // Overpair ou top pair forte: call
  if (hasOverpair(hole, flop) || hasTopPair(hole, flop)) {
    return { action: 'call', reason: `Voce tem par forte (top pair ou overpair). Call e a melhor opcao — sua mao e boa demais pra foldar, mas nao forte o bastante pra check-raise na maioria dos spots.` }
  }

  // Draw forte (flush draw ou straight draw): depende do sizing
  if (hasFlushDraw(hole, flop)) {
    if (cbetSize === '75%') {
      return { action: 'raise', reason: `Flush draw contra aposta grande — check-raise como semi-blefe! Voce tem ~35% de equity (9 outs). Raiseando, pressiona o adversario a foldar ou paga pra ver se completa.` }
    }
    return { action: 'call', reason: `Flush draw com pot odds favoraveis (${potOdds}% necessario, voce tem ~35% de equity com 9 outs). Call e continue no pote.` }
  }

  if (hasStraightDraw(hole, flop)) {
    if (cbetSize === '33%') {
      return { action: 'call', reason: `Straight draw com aposta pequena — pot odds excelentes (so precisa de ${potOdds}%). Com 8 outs (~32% de equity), call e facil.` }
    }
    if (cbetSize === '50%') {
      return { action: 'call', reason: `Straight draw com pot odds razoaveis (${potOdds}% necessario, voce tem ~32% com 8 outs). Call e correto.` }
    }
    return { action: 'fold', reason: `Straight draw contra aposta grande (75%) — pot odds ruins (precisa ${potOdds}%, voce tem ~32%). Sem implied odds claras, fold e mais seguro.` }
  }

  // Par medio/baixo: call se sizing pequeno, fold se grande
  if (hasAnyPair(hole, flop)) {
    if (cbetSize === '75%') {
      return { action: 'fold', reason: `Par medio/baixo contra aposta grande — voce provavelmente esta atras. O adversario esta representando mao forte com sizing de 75%. Fold e mais correto.` }
    }
    return { action: 'call', reason: `Par medio/baixo contra aposta ${cbetSize === '33%' ? 'pequena' : 'media'} — pot odds razoaveis e voce pode melhorar. Call.` }
  }

  // Nada: fold (exceto sizing muito pequeno em board seco com backdoor equity)
  if (cbetSize === '33%' && texture.isDry) {
    return { action: 'call', reason: `Aposta pequena em board seco — voce tem pot odds bons (so precisa de ${potOdds}%) e pode ter alguma equity de backdoor. Call leve e aceitavel.` }
  }

  return { action: 'fold', reason: `Sem mao, sem draw, sem equity. Contra c-bet de ${cbetSize}, fold e a unica opcao correta. Nao desperdice fichas defendendo sem motivo.` }
}

function Lesson({ onComplete }) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        Defesa vs CBet — O Que Fazer Quando Apostam em Voce
      </h1>
      <p style={{ color: '#888', marginBottom: 24 }}>O adversario abriu e apostou no flop. Fold, call ou check-raise?</p>
      <div className="space-y-4">
        <Section title="O Cenario">
          Voce esta no Big Blind. Alguem fez raise pre-flop, voce chamou. O flop saiu e o adversario faz uma aposta de continuacao (c-bet).<br /><br />
          Agora voce tem 3 opcoes: <strong style={{ color: '#e94560' }}>fold</strong>, <strong style={{ color: '#4a90e2' }}>call</strong> ou <strong style={{ color: '#f5a623' }}>check-raise</strong>.
        </Section>
        <Section title="Quando Foldar">
          <div className="space-y-2">
            {[
              'Sem par, sem draw, sem equity nenhuma',
              'Aposta grande (75%) e voce so tem par baixo',
              'Board favorece muito o range do adversario (ex: A-K-Q e voce tem 7-6)',
            ].map((t, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span style={{ color: '#e94560' }}>✗</span>
                <span style={{ color: '#ccc', fontSize: 14 }}>{t}</span>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Quando Chamar (Call)">
          <div className="space-y-2">
            {[
              'Top pair ou overpair — mao boa mas nao excepcional',
              'Draw de flush (9 outs, ~35% equity) com pot odds favoraveis',
              'Draw de straight (8 outs, ~32% equity) contra sizing pequeno/medio',
              'Par medio contra aposta pequena (33%) — pot odds bons',
              'Board seco e aposta pequena — pode flotar com backdoor equity',
            ].map((t, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span style={{ color: '#4a90e2' }}>✓</span>
                <span style={{ color: '#ccc', fontSize: 14 }}>{t}</span>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Quando Check-Raise">
          <div className="space-y-2">
            {[
              'Set (trinca) — mao monstruosa, construa o pote',
              'Dois pares — forte o bastante pra raise',
              'Flush completado — nuts ou perto disso',
              'Flush draw forte contra aposta grande — semi-blefe agressivo',
            ].map((t, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span style={{ color: '#f5a623' }}>⚡</span>
                <span style={{ color: '#ccc', fontSize: 14 }}>{t}</span>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Pot Odds na Defesa">
          O tamanho da aposta muda quanto voce precisa ganhar pra justificar o call:
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[['33%', '25%', '#00d4aa'], ['50%', '33%', '#f5a623'], ['75%', '43%', '#e94560']].map(([bet, need, c]) => (
              <div key={bet} className="rounded-lg p-3 text-center" style={{ background: '#0a0a0f', border: `1px solid ${c}` }}>
                <div style={{ color: c, fontWeight: 700 }}>CBet {bet}</div>
                <div style={{ color: 'white', fontSize: 20, fontWeight: 700, marginTop: 4 }}>{need}</div>
                <div style={{ color: '#888', fontSize: 11 }}>equity necessaria</div>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Board Texture Importa">
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #00d4aa' }}>
              <div style={{ color: '#00d4aa', fontWeight: 600 }}>Board Seco</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Ex: K♠ 7♦ 2♣<br />Adversario c-beta com muito lixo. Pode chamar mais leve ou flotar.</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #e94560' }}>
              <div style={{ color: '#e94560', fontWeight: 600 }}>Board Umido</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Ex: 9♠ 8♥ 7♠<br />Adversario c-beta mais seletivamente. Exija mais equity pra continuar.</div>
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
  const [cbetSize, setCbetSize] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [sessionDone, setSessionDone] = useState(false)

  function newHand() {
    if (sessionTotal >= 10) { setSessionDone(true); return }
    const f = randomFlop()
    const h = randomHoleCards(f)
    const size = CBET_SIZES[Math.floor(Math.random() * CBET_SIZES.length)]
    setFlop(f); setHole(h); setCbetSize(size); setFeedback(null)
  }

  function answer(action) {
    if (!flop || feedback) return
    const correct = getCorrectAction(hole, flop, cbetSize)
    const isCorrect = action === correct.action
    const newStreak = isCorrect ? streak + 1 : 0
    setStreak(newStreak)
    const newTotal = sessionTotal + 1, newCorrect = sessionCorrect + (isCorrect ? 1 : 0)
    setSessionTotal(newTotal); setSessionCorrect(newCorrect)
    recordAnswer(11, isCorrect, newStreak)
    const isLast = newTotal >= 10
    if (isLast) recordSession(11, Math.round((newCorrect / newTotal) * 100))
    setFeedback({ ...correct, userAction: action, isCorrect, isLast })
  }

  function restart() { setSessionCorrect(0); setSessionTotal(0); setStreak(0); setSessionDone(false); setFeedback(null); setFlop(null) }

  if (!flop && !sessionDone) newHand()

  if (sessionDone) {
    const acc = Math.round((sessionCorrect / sessionTotal) * 100)
    return (
      <div className="text-center" style={{ maxWidth: 400, margin: '0 auto', paddingTop: 40 }}>
        <div style={{ fontSize: 60 }}>{acc >= 90 ? '🎉' : '💪'}</div>
        <h2 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginTop: 16 }}>Sessao Completa!</h2>
        <div style={{ color: acc >= 90 ? '#00d4aa' : '#f5a623', fontSize: 36, fontWeight: 700 }}>{acc}%</div>
        <button onClick={restart} className="mt-6 px-8 py-3 rounded-xl font-bold" style={{ background: '#e94560', color: 'white' }}>Nova Sessao</button>
      </div>
    )
  }

  const texture = flop ? getBoardTexture(flop) : null

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <div className="rounded-xl p-3 mb-4 flex justify-between" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
        <div style={{ color: '#888', fontSize: 13 }}>Sessao: {sessionCorrect}/{sessionTotal} · Seq: {streak}</div>
        <div style={{ color: '#888', fontSize: 13 }}>Meta: 10 maos</div>
      </div>
      <div className="rounded-full h-2 mb-6" style={{ background: '#1e1e2e' }}>
        <div className="rounded-full h-2 transition-all" style={{ width: `${(sessionTotal / 10) * 100}%`, background: '#e94560' }} />
      </div>

      <div className="rounded-xl p-4 mb-4 text-center" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
        <div style={{ color: '#888', fontSize: 12 }}>SITUACAO</div>
        <div style={{ color: '#e94560', fontSize: 18, fontWeight: 700 }}>Voce esta no BB (OOP)</div>
        <div style={{ color: '#ccc', fontSize: 13, marginTop: 2 }}>Adversario fez c-bet de <strong style={{ color: '#f5a623' }}>{cbetSize}</strong> do pote</div>
        {texture && (
          <div className="mt-2 flex gap-2 justify-center flex-wrap">
            <span className="px-2 py-1 rounded text-xs" style={{ background: texture.isDry ? '#00d4aa22' : '#e9456022', color: texture.isDry ? '#00d4aa' : '#e94560' }}>
              {texture.isDry ? 'Board Seco' : 'Board Umido'}
            </span>
            {texture.suited && <span className="px-2 py-1 rounded text-xs" style={{ background: '#4a90e222', color: '#4a90e2' }}>Flush Possivel</span>}
            {texture.connected && <span className="px-2 py-1 rounded text-xs" style={{ background: '#f5a62322', color: '#f5a623' }}>Conectado</span>}
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
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[['fold', 'FOLD', '#e94560', 'white'], ['call', 'CALL', '#4a90e2', 'white'], ['raise', 'CHECK-RAISE', '#f5a623', '#0a0a0f']].map(([action, label, bg, color]) => (
            <button key={action} onClick={() => answer(action)} className="py-4 rounded-xl font-bold text-sm" style={{ background: bg, color }}>{label}</button>
          ))}
        </div>
      )}

      {feedback && (
        <div className="rounded-xl p-4 mb-4" style={{ background: '#12121a', border: `2px solid ${feedback.isCorrect ? '#00d4aa' : '#e94560'}` }}>
          <div style={{ color: feedback.isCorrect ? '#00d4aa' : '#e94560', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
            {feedback.isCorrect ? 'Correto!' : 'Incorreto'}
          </div>
          <button onClick={newHand} className="w-full py-3 rounded-lg font-semibold mb-4" style={{ background: '#e94560', color: 'white', fontSize: 16 }}>Proxima Mao</button>
          <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>{feedback.reason}</div>
          <div style={{ color: '#555', fontSize: 12, marginTop: 8 }}>
            Correto: <strong style={{ color: '#f5a623' }}>{feedback.action === 'fold' ? 'FOLD' : feedback.action === 'call' ? 'CALL' : 'CHECK-RAISE'}</strong>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Module11() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[11]?.lessonRead ? 'trainer' : 'lesson')
  if (!progress.modules[11]?.unlocked) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
      <div className="text-center"><div style={{ fontSize: 60 }}>🔒</div><h2 style={{ color: 'white', marginTop: 16 }}>Modulo Bloqueado</h2><p style={{ color: '#888', marginTop: 8 }}>Complete o Modulo 10 para desbloquear.</p></div>
    </div>
  )
  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setView('lesson')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'lesson' ? '#e94560' : '#12121a', color: view === 'lesson' ? 'white' : '#888', border: '1px solid #1e1e2e' }}>Aula</button>
          <button onClick={() => progress.modules[11]?.lessonRead && setView('trainer')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'trainer' ? '#e94560' : '#12121a', color: view === 'trainer' ? 'white' : (progress.modules[11]?.lessonRead ? '#888' : '#444'), border: '1px solid #1e1e2e', cursor: progress.modules[11]?.lessonRead ? 'pointer' : 'not-allowed' }}>Trainer {!progress.modules[11]?.lessonRead && '🔒'}</button>
        </div>
        {view === 'lesson' ? <Lesson onComplete={() => { markLessonRead(11); setView('trainer') }} /> : <Trainer />}
      </div>
    </div>
  )
}
