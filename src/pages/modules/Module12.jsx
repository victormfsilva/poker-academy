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
  const monotone = suits[0] === suits[1] && suits[1] === suits[2]
  const sorted = [...ranks].sort((a, b) => a - b)
  const connected = (sorted[2] - sorted[0]) <= 4
  const paired = ranks[0] === ranks[1] || ranks[1] === ranks[2] || ranks[0] === ranks[2]
  return { suited, monotone, connected, paired, isWet: suited || connected, isDry: !suited && !connected }
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

function hasOverpair(hole, flop) {
  const holeRanks = hole.map(c => c.slice(0, -1))
  if (holeRanks[0] !== holeRanks[1]) return false
  const pocketIdx = RANKS.indexOf(holeRanks[0])
  const topFlopIdx = Math.min(...flop.map(c => RANKS.indexOf(c.slice(0, -1))))
  return pocketIdx < topFlopIdx
}

// Decide: check-raise (valor ou blefe) ou check-call ou check-fold
// Cenario: voce esta OOP (BB), adversario fez c-bet, voce decide se check-raise
function getCorrectAction(hole, flop) {
  const texture = getBoardTexture(flop)

  // Check-raise de valor: mao monstruosa
  if (hasMadeFlush(hole, flop)) {
    return { action: 'raise-value', reason: 'Flush completo! Check-raise de VALOR — mao nuts ou perto. Construa o pote ao maximo.' }
  }
  if (hasSetFn(hole, flop)) {
    return { action: 'raise-value', reason: 'Set (trinca)! Check-raise de VALOR — mao muito forte e disfarçada. O adversario dificilmente coloca voce nessa mao.' }
  }
  if (hasTwoPairFn(hole, flop)) {
    if (texture.isWet) {
      return { action: 'raise-value', reason: 'Dois pares em board umido — check-raise de VALOR para proteger e construir pote. Muitos draws podem te ultrapassar se voce so chamar.' }
    }
    return { action: 'raise-value', reason: 'Dois pares — check-raise de VALOR. Mao forte o suficiente pra construir pote.' }
  }

  // Check-raise de blefe: draw forte em board umido
  if (hasFlushDraw(hole, flop) && texture.isWet) {
    return { action: 'raise-bluff', reason: 'Flush draw em board umido — check-raise de BLEFE! Voce tem ~35% equity (9 outs) e pressiona o adversario. Se ele foldar, voce ganha na hora. Se chamar, voce ainda pode completar.' }
  }
  if (hasStraightDraw(hole, flop) && hasFlushDraw(hole, flop)) {
    return { action: 'raise-bluff', reason: 'Combo draw (flush + straight draw)! Check-raise de BLEFE com equity monstruosa (~45%+). Uma das melhores maos pra semi-blefe.' }
  }
  if (hasStraightDraw(hole, flop) && texture.isWet && !texture.paired) {
    return { action: 'raise-bluff', reason: 'Straight draw em board umido nao-pareado — check-raise de BLEFE. Boa equity (~32%) e fold equity combinados.' }
  }

  // Check-call: mao decente mas nao forte o bastante pra raise
  if (hasOverpair(hole, flop) || hasTopPair(hole, flop)) {
    return { action: 'call', reason: 'Top pair ou overpair — check-call. Mao boa demais pra foldar, mas check-raise transforma sua mao em blefe desnecessariamente. Mantenha o pote controlado.' }
  }
  if (hasAnyPair(hole, flop)) {
    if (texture.isDry) {
      return { action: 'call', reason: 'Par medio em board seco — check-call. Poucas cartas assustam no turn, e voce pode ter a melhor mao. Mantenha o pote pequeno.' }
    }
  }
  if (hasFlushDraw(hole, flop) && !texture.isWet) {
    return { action: 'call', reason: 'Flush draw em board relativamente seco — check-call. Boas odds implicitas e voce nao precisa inflar o pote ainda.' }
  }

  // Check-fold: sem nada
  return { action: 'fold', reason: 'Sem mao forte, sem draw relevante. Check-fold — nao desperdice fichas defendendo lixo.' }
}

function Lesson({ onComplete }) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        Check-Raise — A Arma Mais Poderosa do OOP
      </h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Quando e por que relançar depois de checar no flop</p>
      <div className="space-y-4">
        <Section title="O Que e Check-Raise?">
          Voce checa, o adversario aposta, e voce <strong style={{ color: '#f5a623' }}>relança</strong>.<br /><br />
          E a jogada mais forte que voce pode fazer fora de posicao. Sinaliza muita forca — ou simula forca com um blefe bem construido.
        </Section>
        <Section title="2 Tipos de Check-Raise">
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="rounded-lg p-4" style={{ background: '#0a0a0f', border: '1px solid #00d4aa' }}>
              <div style={{ color: '#00d4aa', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Check-Raise de Valor</div>
              <div style={{ color: '#ccc', fontSize: 13, lineHeight: 1.6 }}>
                Maos muito fortes que querem construir pote:<br />
                <strong>Sets, dois pares, flush completo</strong><br /><br />
                Voce checa pra induzir a aposta, depois relanca pra maximizar valor.
              </div>
            </div>
            <div className="rounded-lg p-4" style={{ background: '#0a0a0f', border: '1px solid #f5a623' }}>
              <div style={{ color: '#f5a623', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Check-Raise de Blefe</div>
              <div style={{ color: '#ccc', fontSize: 13, lineHeight: 1.6 }}>
                Draws fortes que querem fold equity:<br />
                <strong>Flush draw, straight draw, combo draw</strong><br /><br />
                Se o adversario foldar, voce ganha na hora. Se chamar, voce tem outs.
              </div>
            </div>
          </div>
        </Section>
        <Section title="Boards Bons pra Check-Raise">
          <div className="space-y-2">
            {[
              { board: 'Board umido (ex: 9♠ 8♥ 6♠)', reason: 'Muitos draws possiveis — check-raise tanto de valor quanto de blefe faz sentido.' },
              { board: 'Board com par (ex: 7♠ 7♦ 3♣)', reason: 'Se voce tem o 7, check-raise de valor e devastador — adversario nao te coloca nessa mao.' },
              { board: 'Board medio-baixo (ex: 8♦ 5♣ 3♠)', reason: 'Favorece seu range de BB — voce tem mais 85s, 53s, 33 que o raiser.' },
            ].map(r => (
              <div key={r.board} className="rounded-lg p-3" style={{ background: '#0a0a0f' }}>
                <div style={{ color: '#f5a623', fontWeight: 600, fontSize: 13 }}>{r.board}</div>
                <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>{r.reason}</div>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Boards Ruins pra Check-Raise">
          <div className="space-y-2">
            {[
              { board: 'Board alto e seco (ex: A♠ K♦ 7♣)', reason: 'Favorece o range do raiser (ele tem mais AK, AQ, KK). Check-raise e arriscado.' },
              { board: 'Board monotone (ex: Q♥ 9♥ 4♥)', reason: 'Muito perigoso — se voce nao tem a flush, o adversario pode ter. Cautela.' },
            ].map(r => (
              <div key={r.board} className="rounded-lg p-3" style={{ background: '#0a0a0f' }}>
                <div style={{ color: '#e94560', fontWeight: 600, fontSize: 13 }}>{r.board}</div>
                <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>{r.reason}</div>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Sizing do Check-Raise">
          <div className="rounded-lg p-3 mt-2" style={{ background: '#0a0a0f', border: '1px solid #4a90e2' }}>
            <div style={{ color: '#4a90e2', fontWeight: 700, marginBottom: 4 }}>Regra geral: 3x a aposta do adversario</div>
            <div style={{ color: '#ccc', fontSize: 13 }}>
              Adversario aposta 5bb → voce raise pra 15bb.<br />
              Isso da fold equity suficiente e constroi pote com maos de valor.
            </div>
          </div>
        </Section>
        <Section title="Quando NAO Check-Raise">
          <div className="space-y-2">
            {[
              'Top pair sem kicker forte — so chame, nao transforme em blefe',
              'Sem draw e sem mao — fold, nao invente',
              'Board alto que favorece o raiser — sua fold equity e baixa',
              'Adversario que nunca folda — check-raise de blefe nao funciona',
            ].map((t, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span style={{ color: '#e94560' }}>✗</span>
                <span style={{ color: '#ccc', fontSize: 14 }}>{t}</span>
              </div>
            ))}
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
    // raise-value e raise-bluff contam como "raise" pro jogador
    const userIsRaise = action === 'raise'
    const correctIsRaise = correct.action === 'raise-value' || correct.action === 'raise-bluff'
    const isCorrect = (userIsRaise && correctIsRaise) || (!userIsRaise && action === correct.action)
    const newStreak = isCorrect ? streak + 1 : 0
    setStreak(newStreak)
    const newTotal = sessionTotal + 1, newCorrect = sessionCorrect + (isCorrect ? 1 : 0)
    setSessionTotal(newTotal); setSessionCorrect(newCorrect)
    recordAnswer(12, isCorrect, newStreak)
    const isLast = newTotal >= 10
    if (isLast) recordSession(12, Math.round((newCorrect / newTotal) * 100))
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
        <div style={{ color: '#ccc', fontSize: 13, marginTop: 2 }}>Voce checou, adversario fez c-bet. Check-raise, call ou fold?</div>
        {texture && (
          <div className="mt-2 flex gap-2 justify-center flex-wrap">
            <span className="px-2 py-1 rounded text-xs" style={{ background: texture.isDry ? '#00d4aa22' : '#e9456022', color: texture.isDry ? '#00d4aa' : '#e94560' }}>
              {texture.isDry ? 'Board Seco' : 'Board Umido'}
            </span>
            {texture.monotone && <span className="px-2 py-1 rounded text-xs" style={{ background: '#e9456022', color: '#e94560' }}>Monotone</span>}
            {texture.suited && !texture.monotone && <span className="px-2 py-1 rounded text-xs" style={{ background: '#4a90e222', color: '#4a90e2' }}>Flush Possivel</span>}
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
            Correto: <strong style={{ color: '#f5a623' }}>
              {feedback.action === 'fold' ? 'FOLD' : feedback.action === 'call' ? 'CALL' : feedback.action === 'raise-value' ? 'CHECK-RAISE (valor)' : 'CHECK-RAISE (blefe)'}
            </strong>
          </div>
          {!feedback.isCorrect && (
            <div className="mt-3 rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #4a90e230' }}>
              <div style={{ color: '#4a90e2', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Regra geral Check-Raise</div>
              <div style={{ color: '#ccc', fontSize: 12, lineHeight: 1.7 }}>
                <div>• <strong style={{ color: '#00d4aa' }}>Set / Dois pares / Flush</strong> → CHECK-RAISE de valor</div>
                <div>• <strong style={{ color: '#f5a623' }}>Flush draw + board umido</strong> → CHECK-RAISE de blefe</div>
                <div>• <strong style={{ color: '#f5a623' }}>Combo draw (flush + straight)</strong> → CHECK-RAISE de blefe</div>
                <div>• <strong style={{ color: '#4a90e2' }}>Top pair / Overpair</strong> → CALL</div>
                <div>• <strong style={{ color: '#4a90e2' }}>Par medio em board seco</strong> → CALL</div>
                <div>• <strong style={{ color: '#e94560' }}>Sem mao, sem draw</strong> → FOLD</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Module12() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[12]?.lessonRead ? 'trainer' : 'lesson')
  if (!progress.modules[12]?.unlocked) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
      <div className="text-center"><div style={{ fontSize: 60 }}>🔒</div><h2 style={{ color: 'white', marginTop: 16 }}>Modulo Bloqueado</h2><p style={{ color: '#888', marginTop: 8 }}>Complete o Modulo 11 para desbloquear.</p></div>
    </div>
  )
  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setView('lesson')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'lesson' ? '#e94560' : '#12121a', color: view === 'lesson' ? 'white' : '#888', border: '1px solid #1e1e2e' }}>Aula</button>
          <button onClick={() => progress.modules[12]?.lessonRead && setView('trainer')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'trainer' ? '#e94560' : '#12121a', color: view === 'trainer' ? 'white' : (progress.modules[12]?.lessonRead ? '#888' : '#444'), border: '1px solid #1e1e2e', cursor: progress.modules[12]?.lessonRead ? 'pointer' : 'not-allowed' }}>Trainer {!progress.modules[12]?.lessonRead && '🔒'}</button>
        </div>
        {view === 'lesson' ? <Lesson onComplete={() => { markLessonRead(12); setView('trainer') }} /> : <Trainer />}
      </div>
    </div>
  )
}
