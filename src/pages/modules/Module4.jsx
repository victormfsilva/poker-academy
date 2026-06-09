import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'
import Card, { randomCard } from '../../components/Card'
import RangeViewer from '../../components/RangeViewer'

const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2']
const SUITS = ['s','h','d','c']

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
  const ranks = flop.map(c => RANKS.indexOf(c.slice(0, -1)))
  const suits = flop.map(c => c.slice(-1))
  const suited = suits[0] === suits[1] || suits[1] === suits[2] || suits[0] === suits[2]
  const sorted = [...ranks].sort((a, b) => a - b)
  const connected = (sorted[2] - sorted[0]) <= 4
  const paired = ranks[0] === ranks[1] || ranks[1] === ranks[2] || ranks[0] === ranks[2]
  const highCard = Math.min(...ranks) // menor índice = carta mais alta

  return { suited, connected, paired, highCard, isWet: suited || connected, isDry: !suited && !connected }
}

function hasTopPair(hole, flop) {
  const flopRanks = flop.map(c => c.slice(0, -1))
  const holeRanks = hole.map(c => c.slice(0, -1))
  const topFlopRank = flopRanks.sort((a, b) => RANKS.indexOf(a) - RANKS.indexOf(b))[0]
  return holeRanks.includes(topFlopRank)
}

function hasFlushDraw(hole, flop) {
  const allCards = [...hole, ...flop]
  const suitCounts = {}
  allCards.forEach(c => { const s = c.slice(-1); suitCounts[s] = (suitCounts[s] || 0) + 1 })
  return Object.values(suitCounts).some(v => v >= 4)
}

function hasStraightDraw(hole, flop) {
  const allRanks = [...hole, ...flop].map(c => RANKS.indexOf(c.slice(0, -1)))
  const unique = [...new Set(allRanks)].sort((a, b) => a - b)
  for (let i = 0; i < unique.length - 2; i++) {
    if (unique[i + 2] - unique[i] <= 4) return true
  }
  return false
}

function getCorrectAction(hole, flop) {
  const texture = getBoardTexture(flop)
  const hasTop = hasTopPair(hole, flop)
  const hasFlush = hasFlushDraw(hole, flop)
  const hasStraight = hasStraightDraw(hole, flop)

  // Regras simplificadas de CBet IP
  if (texture.isDry) {
    // Board seco — CBet frequente, range advantage
    return { action: 'bet', sizing: '33%', reason: 'Board seco (dry) — você tem range advantage. CBet frequente com 33% do pote.' }
  }
  if (hasTop) {
    return { action: 'bet', sizing: '50%', reason: 'Você tem top pair — value bet. Tamanho médio para extrair valor e proteger.' }
  }
  if (hasFlush || hasStraight) {
    return { action: 'bet', sizing: '50%', reason: 'Você tem semi-draw (flush/straight draw) — semi-blefe com dois caminhos para ganhar.' }
  }
  if (texture.isWet && !hasTop) {
    return { action: 'check', sizing: null, reason: 'Board úmido (wet) sem equidade — sem range advantage, verifique. Não gaste fichas sem benefício.' }
  }
  return { action: 'check', sizing: null, reason: 'Você não conectou com o board. Com board úmido e sem draw, prefira check para controlar o pote.' }
}

function Lesson({ onComplete }) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>⚡ Módulo 4 — CBet Flop IP</h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Continuation bet quando você está em posição</p>
      <div className="space-y-4">
        <Section title="O que é CBet?">
          CBet (Continuation Bet) é a aposta no flop feita pelo jogador que fez o raise pré-flop. Como você foi o agressor, o adversário espera que você aposte — e isso cria uma oportunidade.
        </Section>
        <Section title="Board Texture — A Base da Decisão">
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #00d4aa' }}>
              <div style={{ color: '#00d4aa', fontWeight: 600 }}>Board Seco (Dry)</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Ex: A♠ 7♦ 2♣ rainbow<br />Poucas possibilidades de draw. CBet frequente e barato (33%).</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: "1px solid #e94560" }}>
              <div style={{ color: '#e94560', fontWeight: 600 }}>Board Úmido (Wet)</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Ex: 9♠ 8♥ 7♠<br />Muitos draws. CBet só com equidade — sem ele, prefira check.</div>
            </div>
          </div>
        </Section>
        <Section title="Sizing de CBet — 3 Opções">
          <div className="grid grid-cols-3 gap-2 mt-2">
            {[['33%', '#00d4aa', 'Board seco, blefe de baixo risco, muitas mãos'], ['50%', '#f5a623', 'Value bet padrão, semi-blefes'], ['75%', '#e94560', 'Value bet forte, boards úmidos com equidade']].map(([s, c, d]) => (
              <div key={s} className="rounded-lg p-3 text-center" style={{ background: '#0a0a0f', border: `1px solid ${c}` }}>
                <div style={{ color: c, fontWeight: 700, fontSize: 18 }}>{s}</div>
                <div style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>{d}</div>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Range Advantage — Quando Você Conecta Mais">
          Se você abriu de UTG e o board vem A-K-J, seu range conecta muito mais que o adversário do BB. Isso é <strong style={{ color: '#f5a623' }}>range advantage</strong> — CBet frequente. Se o board vem 9-8-7, o BB defende mais mãos conectadas e você perde o advantage.
        </Section>
        <Section title="Quando NÃO Fazer CBet">
          <ul className="space-y-1 mt-2" style={{ color: '#ccc', fontSize: 14 }}>
            <li>• Board úmido sem equidade — economize fichas</li>
            <li>• Multiway (3+ jogadores) — alguém certamente conectou</li>
            <li>• Adversário mostra muita força (check-raise no passado)</li>
            <li>• Você não tem equity de backup (sem draw, sem par)</li>
          </ul>
        </Section>
        <Section title="CBet de Valor vs CBet de Blefe">
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #00d4aa' }}>
              <div style={{ color: '#00d4aa', fontWeight: 600 }}>Value Bet</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Você quer ser chamado. Tem top pair, dois pares, set. Tamanho médio a grande.</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #e94560' }}>
              <div style={{ color: '#e94560', fontWeight: 600 }}>Blefe / Semi-blefe</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Você quer fold ou tem draw. Tamanho pequeno (33%) é mais eficiente.</div>
            </div>
          </div>
        </Section>
      </div>
      <button onClick={onComplete} className="w-full mt-8 py-4 rounded-xl font-bold text-white text-lg" style={{ background: '#e94560' }}>
        Entendi — Quero Treinar ⚡
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
    const f = randomFlop()
    const h = randomHoleCards(f)
    setFlop(f); setHole(h); setFeedback(null)
  }

  function answer(action, sizing) {
    if (!flop || feedback) return
    const correct = getCorrectAction(hole, flop)
    const isCorrect = action === correct.action
    const newStreak = isCorrect ? streak + 1 : 0
    setStreak(newStreak)
    setFeedback({ ...correct, userAction: action, isCorrect })
    const newTotal = sessionTotal + 1, newCorrect = sessionCorrect + (isCorrect ? 1 : 0)
    setSessionTotal(newTotal); setSessionCorrect(newCorrect)
    recordAnswer(4, isCorrect, newStreak)
    if (newTotal >= 10) { recordSession(4, Math.round((newCorrect / newTotal) * 100)); setSessionDone(true) }
  }

  function restart() { setSessionCorrect(0); setSessionTotal(0); setStreak(0); setSessionDone(false); setFeedback(null); setFlop(null); setHole(null) }

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
        <div style={{ color: '#4a90e2', fontSize: 18, fontWeight: 700 }}>Você está IP (em posição)</div>
        <div style={{ color: '#ccc', fontSize: 13, marginTop: 2 }}>Você fez o raise pré-flop. Adversário checou para você no flop.</div>
        {texture && (
          <div className="mt-2 flex gap-2 justify-center flex-wrap">
            <span className="px-2 py-1 rounded text-xs" style={{ background: texture.isDry ? '#00d4aa22' : '#e9456022', color: texture.isDry ? '#00d4aa' : '#e94560' }}>
              {texture.isDry ? 'Board Seco' : 'Board Úmido'}
            </span>
            {texture.suited && <span className="px-2 py-1 rounded text-xs" style={{ background: '#4a90e222', color: '#4a90e2' }}>Flush Draw</span>}
            {texture.connected && <span className="px-2 py-1 rounded text-xs" style={{ background: '#f5a62322', color: '#f5a623' }}>Conectado</span>}
            {texture.paired && <span className="px-2 py-1 rounded text-xs" style={{ background: '#88888822', color: '#888' }}>Pareado</span>}
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
        <div className="space-y-3 mb-4">
          <button onClick={() => answer('check')} className="w-full py-4 rounded-xl font-bold text-xl" style={{ background: '#4a90e2', color: 'white' }}>
            CHECK ✓
          </button>
          <div className="grid grid-cols-3 gap-2">
            {[['33%', '#00d4aa'], ['50%', '#f5a623'], ['75%', '#e94560']].map(([s, c]) => (
              <button key={s} onClick={() => answer('bet', s)} className="py-3 rounded-xl font-bold" style={{ background: c, color: '#0a0a0f' }}>
                BET {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {feedback && (
        <div className="rounded-xl p-4 mb-4" style={{ background: '#12121a', border: `2px solid ${feedback.isCorrect ? '#00d4aa' : '#e94560'}` }}>
          <div style={{ color: feedback.isCorrect ? '#00d4aa' : '#e94560', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
            {feedback.isCorrect ? '✓ Correto!' : '✗ Incorreto'}
          </div>
          <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>{feedback.reason}</div>
          {feedback.sizing && <div style={{ color: '#f5a623', fontSize: 13, marginTop: 8 }}>Sizing ideal: <strong>{feedback.sizing}</strong></div>}
          {!feedback.isCorrect && (
            <div className="mt-3 rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #4a90e230' }}>
              <div style={{ color: '#4a90e2', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>📋 Regra geral CBet IP</div>
              <div style={{ color: '#ccc', fontSize: 12, lineHeight: 1.7 }}>
                <div>• <strong style={{ color: '#00d4aa' }}>Board seco</strong> (A72 rainbow, K82 sem flush) → Bet 33%</div>
                <div>• <strong style={{ color: '#f5a623' }}>Top pair ou melhor</strong> → Bet 50%</div>
                <div>• <strong style={{ color: '#f5a623' }}>Semi-draw</strong> (flush/straight draw) → Bet 50%</div>
                <div>• <strong style={{ color: '#e94560' }}>Board úmido sem equidade</strong> → Check</div>
                <div>• <strong style={{ color: '#e94560' }}>Multiway sem top pair</strong> → Check</div>
              </div>
            </div>
          )}
          <button onClick={newHand} className="mt-4 w-full py-3 rounded-lg font-semibold" style={{ background: '#1e1e2e', color: 'white' }}>Próxima Mão →</button>
        </div>
      )}
    </div>
  )
}

export default function Module4() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[4].lessonRead ? 'trainer' : 'lesson')
  if (!progress.modules[4].unlocked) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
      <div className="text-center"><div style={{ fontSize: 60 }}>🔒</div><h2 style={{ color: 'white', marginTop: 16 }}>Módulo Bloqueado</h2><p style={{ color: '#888', marginTop: 8 }}>Complete o Módulo 3 para desbloquear.</p></div>
    </div>
  )
  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setView('lesson')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'lesson' ? '#e94560' : '#12121a', color: view === 'lesson' ? 'white' : '#888', border: '1px solid #1e1e2e' }}>📖 Aula</button>
          <button onClick={() => progress.modules[4].lessonRead && setView('trainer')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'trainer' ? '#e94560' : '#12121a', color: view === 'trainer' ? 'white' : (progress.modules[4].lessonRead ? '#888' : '#444'), border: '1px solid #1e1e2e', cursor: progress.modules[4].lessonRead ? 'pointer' : 'not-allowed' }}>🎯 Trainer {!progress.modules[4].lessonRead && '🔒'}</button>
        </div>
        {view === 'lesson' ? <Lesson onComplete={() => { markLessonRead(4); setView('trainer') }} /> : <Trainer />}
      </div>
    </div>
  )
}
