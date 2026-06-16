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
  const highCard = Math.min(...ranks)
  return { suited, connected, paired, highCard, isWet: suited || connected, isDry: !suited && !connected }
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

// Cenario: você está IP, fez raise pre, adversário checou. Qual sizing?
function getCorrectSizing(hole, flop) {
  const texture = getBoardTexture(flop)

  // Made flush
  if (hasMadeFlush(hole, flop)) {
    return { sizing: '75%', reason: 'Flush completo! Aposte grande (75%) — mão nuts, extraia o máximo de valor. O adversário pode ter draws ou pares que pagam.' }
  }

  // Set
  if (hasSetFn(hole, flop)) {
    if (texture.isWet) {
      return { sizing: '75%', reason: 'Set em board úmido — aposte grande (75%)! Proteja contra draws e construa pote com sua mão monstruosa.' }
    }
    return { sizing: '75%', reason: 'Set em board seco — aposte grande (75%). Mao muito forte, construa o pote. Mesmo em board seco, 75% extrai mais valor a longo prazo.' }
  }

  // Dois pares
  if (hasTwoPairFn(hole, flop)) {
    if (texture.isWet) {
      return { sizing: '75%', reason: 'Dois pares em board úmido — aposte grande (75%) pra proteger. Muitos draws podem ultrapassar sua mão se você apostar pouco.' }
    }
    return { sizing: '50%', reason: 'Dois pares em board seco — aposte médio (50%). Mao forte mas não precisa proteger tanto. Extraia valor sem assustar.' }
  }

  // Top pair / overpair
  if (hasOverpair(hole, flop)) {
    if (texture.isWet) {
      return { sizing: '75%', reason: 'Overpair em board úmido — aposte grande (75%) pra proteger contra draws. Sua mão provavelmente é a melhor agora.' }
    }
    return { sizing: '50%', reason: 'Overpair em board seco — aposte médio (50%). Mao forte, extraia valor. Poucas ameacas no board.' }
  }
  if (hasTopPair(hole, flop)) {
    return { sizing: '50%', reason: 'Top pair — aposte médio (50%). Bom equilibrio entre valor e proteção. Não aposte muito grande pra não pagar caro quando estiver atras.' }
  }

  // Draws: semi-blefe
  if (hasFlushDraw(hole, flop) && hasStraightDraw(hole, flop)) {
    return { sizing: '75%', reason: 'Combo draw (flush + straight)! Aposte grande (75%) como semi-blefe. Equity monstruosa (~45%+) — se chamar você tem muitos outs, se foldar você ganha na hora.' }
  }
  if (hasFlushDraw(hole, flop)) {
    return { sizing: '50%', reason: 'Flush draw — aposte médio (50%) como semi-blefe. 9 outs (~35% equity). Você ganha se ele foldar ou se completar o draw.' }
  }
  if (hasStraightDraw(hole, flop)) {
    return { sizing: '33%', reason: 'Straight draw — aposte pequeno (33%) como semi-blefe barato. 8 outs (~32%). Mantem a pressao sem arriscar muito.' }
  }

  // Par médio/baixo
  if (hasAnyPair(hole, flop)) {
    return { sizing: '33%', reason: 'Par médio/baixo — aposte pequeno (33%) pra proteção e thin value. Não inflando demais o pote com mão vulneravel.' }
  }

  // Nada em board seco: blefe barato
  if (texture.isDry) {
    return { sizing: '33%', reason: 'Board seco sem mão — aposte pequeno (33%) como blefe. O adversário provavelmente também errou. Aposta barata tem alta fold equity aqui.' }
  }

  // Nada em board úmido: check
  return { sizing: 'check', reason: 'Board úmido sem mão nem draw — check. Não desperdice fichas blefando num board que favorece o range do adversário.' }
}

function Lesson({ onComplete }) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        Bet Sizing — Quanto Apostar em Cada Situacao
      </h1>
      <p style={{ color: '#888', marginBottom: 24 }}>O tamanho da aposta comunica informação e maximiza seu EV</p>
      <div className="space-y-4">
        <Section title="Por Que Sizing Importa?">
          Apostar o tamanho certo é tao importante quanto decidir se aposta ou nao. Um sizing errado pode:<br /><br />
          <div className="space-y-1">
            {[
              'Dar pot odds bons demais pro adversário (aposta pequena com mão forte)',
              'Inflar o pote desnecessariamente (aposta grande com mão fraca)',
              'Perder valor (aposta pequena quando poderia cobrar mais)',
            ].map((t, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span style={{ color: '#e94560' }}>✗</span>
                <span style={{ color: '#ccc', fontSize: 14 }}>{t}</span>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Os 4 Tamanhos Principais">
          <div className="grid grid-cols-2 gap-3 mt-2">
            {[
              { size: '33%', color: '#00d4aa', name: 'Pequeno', when: 'Board seco, blefe barato, par médio, thin value', example: 'Pote 10bb → aposta 3.3bb' },
              { size: '50%', color: '#f5a623', name: 'Medio', when: 'Top pair, overpair seco, flush draw semi-blefe', example: 'Pote 10bb → aposta 5bb' },
              { size: '75%', color: '#e94560', name: 'Grande', when: 'Set, dois pares, overpair wet, combo draw', example: 'Pote 10bb → aposta 7.5bb' },
              { size: '100%+', color: '#9b59b6', name: 'Overbet', when: 'Nuts no river, polarizado (muito forte ou blefe puro)', example: 'Pote 10bb → aposta 10-15bb' },
            ].map(s => (
              <div key={s.size} className="rounded-lg p-3" style={{ background: '#0a0a0f', border: `1px solid ${s.color}` }}>
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
              { rule: 'Mao forte + board úmido → aposte GRANDE', color: '#e94560', why: 'Proteja contra draws e extraia valor enquanto podem pagar' },
              { rule: 'Mao forte + board seco → aposte MEDIO', color: '#f5a623', why: 'Sem urgencia de proteção. Extraia valor sem assustar' },
              { rule: 'Mao média → aposte PEQUENO', color: '#00d4aa', why: 'Thin value. Não inflando o pote com mão vulneravel' },
              { rule: 'Blefe → aposte o MINIMO efetivo', color: '#888', why: 'Risco mínimo pra maxima fold equity. 33% em board seco já funciona' },
            ].map(r => (
              <div key={r.rule} className="rounded-lg p-3" style={{ background: '#0a0a0f' }}>
                <div style={{ color: r.color, fontWeight: 600, fontSize: 13 }}>{r.rule}</div>
                <div style={{ color: '#ccc', fontSize: 12, marginTop: 2 }}>{r.why}</div>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Sizing no Turn e River">
          As mesmas regras se aplicam, mas com ajustes:<br /><br />
          <strong style={{ color: '#f5a623' }}>Turn:</strong> Se apostou 50% no flop e o draw não completou, pode manter 50% ou subir pra 75%.<br />
          <strong style={{ color: '#e94560' }}>River:</strong> Sizing polarizado — ou aposte grande (valor/blefe) ou check. Não existe "aposta de proteção" no river porque não tem mais cartas pra vir.
        </Section>
        <Section title="Overbet — Quando Usar">
          <div className="rounded-lg p-3 mt-2" style={{ background: '#0a0a0f', border: '1px solid #9b59b6' }}>
            <div style={{ color: '#9b59b6', fontWeight: 700, marginBottom: 4 }}>Apostar mais que o pote (100%+)</div>
            <div style={{ color: '#ccc', fontSize: 13 }}>
              Use no river quando você tem nuts e o adversário tem um range capped (limitado).<br /><br />
              Exemplo: você tem flush no river e o adversário não pode ter flush. Overbet extrai máximo valor porque ele pode ter top pair forte que paga.
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

  function answer(sizing) {
    if (!flop || feedback) return
    const correct = getCorrectSizing(hole, flop)
    const isCorrect = sizing === correct.sizing
    const newStreak = isCorrect ? streak + 1 : 0
    setStreak(newStreak)
    const newTotal = sessionTotal + 1, newCorrect = sessionCorrect + (isCorrect ? 1 : 0)
    setSessionTotal(newTotal); setSessionCorrect(newCorrect)
    recordAnswer(12, isCorrect, newStreak)
    const isLast = newTotal >= 10
    if (isLast) recordSession(12, Math.round((newCorrect / newTotal) * 100))
    setFeedback({ ...correct, userSizing: sizing, isCorrect, isLast })
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
        <div style={{ color: '#00d4aa', fontSize: 18, fontWeight: 700 }}>Você está IP (em posição)</div>
        <div style={{ color: '#ccc', fontSize: 13, marginTop: 2 }}>Você fez raise pre-flop. Adversario checou. Qual sizing?</div>
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
        <div className="space-y-3 mb-4">
          <button onClick={() => answer('check')} className="w-full py-4 rounded-xl font-bold text-lg" style={{ background: '#4a90e2', color: 'white' }}>
            CHECK
          </button>
          <div className="grid grid-cols-3 gap-2">
            {[['33%', '#00d4aa'], ['50%', '#f5a623'], ['75%', '#e94560']].map(([s, c]) => (
              <button key={s} onClick={() => answer(s)} className="py-3 rounded-xl font-bold" style={{ background: c, color: '#0a0a0f' }}>
                BET {s}
              </button>
            ))}
          </div>
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
            Correto: <strong style={{ color: '#f5a623' }}>{feedback.sizing === 'check' ? 'CHECK' : `BET ${feedback.sizing}`}</strong>
          </div>
          {!feedback.isCorrect && (
            <div className="mt-3 rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #4a90e230' }}>
              <div style={{ color: '#4a90e2', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Guia de Sizing</div>
              <div style={{ color: '#ccc', fontSize: 12, lineHeight: 1.7 }}>
                <div>• <strong style={{ color: '#e94560' }}>Set / Dois pares wet / Overpair wet / Combo draw</strong> → 75%</div>
                <div>• <strong style={{ color: '#f5a623' }}>Top pair / Overpair seco / Dois pares seco / Flush draw</strong> → 50%</div>
                <div>• <strong style={{ color: '#00d4aa' }}>Par médio / Straight draw / Board seco sem mão</strong> → 33%</div>
                <div>• <strong style={{ color: '#888' }}>Board úmido sem nada</strong> → CHECK</div>
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
      <div className="text-center"><div style={{ fontSize: 60 }}>🔒</div><h2 style={{ color: 'white', marginTop: 16 }}>Módulo Bloqueado</h2><p style={{ color: '#888', marginTop: 8 }}>Complete o Módulo 11 para desbloquear.</p></div>
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
