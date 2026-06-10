import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'
import { PUSH_FOLD_RANGES, POSITION_INFO } from '../../data/ranges'
import Card, { handToCards } from '../../components/Card'
import RangeViewer from '../../components/RangeViewer'

const POSITIONS = ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB']
const STACKS_OPTIONS = [5, 8, 10]

function isInPushRange(hand, pos, stack) {
  const range = PUSH_FOLD_RANGES[pos]
  if (!range) return false
  // Encontrar o stack mais próximo disponível
  const availableStacks = Object.keys(range).map(Number).sort((a, b) => a - b)
  const closest = availableStacks.reduce((prev, curr) =>
    Math.abs(curr - stack) < Math.abs(prev - stack) ? curr : prev
  )
  return range[closest]?.includes(hand) || false
}

function generateAllHands() {
  const ranks = ['A','K','Q','J','T','9','8','7','6','5','4','3','2']
  const hands = []
  for (let i = 0; i < ranks.length; i++) {
    hands.push(ranks[i] + ranks[i])
    for (let j = i + 1; j < ranks.length; j++) {
      hands.push(ranks[i] + ranks[j] + 's')
      hands.push(ranks[i] + ranks[j] + 'o')
    }
  }
  return hands
}

function randomHand(pos, stack) {
  const all = generateAllHands()
  const range = PUSH_FOLD_RANGES[pos]
  const stacks = Object.keys(range || {}).map(Number).sort((a, b) => a - b)
  const closest = stacks.reduce((prev, curr) =>
    Math.abs(curr - stack) < Math.abs(prev - stack) ? curr : prev, stacks[0])
  const pushRange = range?.[closest] || []

  const dice = Math.random()
  if (dice < 0.5 && pushRange.length > 0) {
    return pushRange[Math.floor(Math.random() * pushRange.length)]
  }
  const foldHands = all.filter(h => !pushRange.includes(h))
  return foldHands[Math.floor(Math.random() * foldHands.length)]
}

function getFeedback(hand, action, pos, stack) {
  const shouldPush = isInPushRange(hand, pos, stack)
  const correct = shouldPush ? 'push' : 'fold'
  const isCorrect = (action === 'push' && shouldPush) || (action === 'fold' && !shouldPush)

  let reason = ''
  const rank1 = hand[0], rank2 = hand[1], type = hand.length > 2 ? hand[2] : ''

  if (shouldPush) {
    if (hand.length === 2) reason = `Par de ${rank1}s com ${stack} fichas em ${pos} — vai all-in. Pares sempre atacam.`
    else if (rank1 === 'A') reason = `${hand} tem Ás com ${stack} fichas em ${pos} — vai all-in. O Ás reduz a chance de alguém te chamar com mão forte.`
    else reason = `${hand} entra no range de ataque de ${pos} com ${stack} fichas — vai all-in, a mão tem força relativa suficiente.`
  } else {
    reason = `${hand} está fora do range de ataque de ${pos} com ${stack} fichas. Folde e espere uma mão melhor — você ainda tem tempo.`
  }

  if (stack <= 8) {
    reason += ' Com tão poucas fichas, o range de ataque abre muito — seja agressivo antes que os blinds te comam.'
  }

  return { correct, isCorrect, reason }
}

function Lesson({ onComplete }) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        💥 Módulo 2 — Poucas Fichas (Push/Fold)
      </h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Quando suas fichas estão acabando, o jogo vira outra coisa</p>

      <div className="space-y-4">
        <Section title="Quando Isso Acontece?">
          Imagina que você estava bem no torneio, mas foi perdendo aos poucos. Agora você tem <strong style={{ color: '#e94560' }}>menos de 15 fichas grandes</strong> (big blinds). Nesse momento, o jogo muda completamente — só existem duas opções: ir <strong style={{ color: '#00d4aa' }}>all-in</strong> ou <strong style={{ color: '#e94560' }}>foldar</strong>. Acabou a opção de "dar um raise pequeno e ver o que acontece".
        </Section>

        <Section title="Por Que Não Posso Apostar Pequeno?">
          Simples: com poucas fichas, se você apostar pequeno e alguém relançar, você vai ser forçado a ir all-in de qualquer jeito — mas numa posição pior. É como tentar ameaçar sem poder cumprir. <br /><br />
          A solução é ir all-in direto: ou todo mundo folda e você ganha as fichas agora, ou vai pra showdown e tem a chance de dobrar. Sem meios-termos.
        </Section>

        <Section title="As Fichas que Importam Não São as Suas">
          Aqui tem um detalhe importante: o que define o tamanho do confronto é o <strong style={{ color: '#f5a623' }}>menor stack entre você e o adversário</strong>. <br /><br />
          Exemplo: você tem 20 fichas grandes, mas o Big Blind tem 10. O confronto máximo é de 10 fichas — o Big Blind não pode te dever mais do que ele tem. Então jogue como se você tivesse 10.
        </Section>

        <Section title="Quanto Menos Fichas, Mais Você Pode Atacar">
          <div className="space-y-2 mt-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              {STACKS_OPTIONS.map(s => (
                <div key={s} className="rounded-lg p-2" style={{ background: '#0a0a0f', border: '1px solid #1e1e2e' }}>
                  <div style={{ color: '#e94560', fontWeight: 700 }}>{s} fichas</div>
                  <div style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>
                    {s <= 5 ? 'Vai all-in com quase tudo' : s <= 8 ? 'Range bem amplo' : 'Mais seletivo'}
                  </div>
                </div>
              ))}
            </div>
            <p style={{ color: '#888', fontSize: 13, marginTop: 8 }}>
              Com 5 fichas, você não tem luxo de esperar a mão perfeita — vai all-in com qualquer mão razoável antes que os blinds te comam.
            </p>
          </div>
        </Section>

        <Section title="Quando o Adversário for All-in em Você">
          Isso é diferente de você atacar. Quando é o adversário que vai all-in, você precisa de <strong style={{ color: '#f5a623' }}>uma mão mais forte</strong> para chamar do que para atacar. Por quê? Porque quem ataca primeiro tem a vantagem de fazer todo mundo foldar — quem chama não tem essa vantagem, só pode ganhar no showdown.
          <div className="mt-3 rounded-lg p-3" style={{ background: '#0a0a0f' }}>
            <div style={{ color: '#ccc', fontSize: 13 }}>
              Regra simples: para chamar, exija mais da sua mão do que para atacar. Se você atacaria com A7, talvez precise de AJ para chamar.
            </div>
          </div>
        </Section>

        <Section title="O Poder do Ás com Poucas Fichas">
          Sabe por que A5 vai all-in mais fácil que K5 com as mesmas fichas? Porque o Ás na sua mão <strong style={{ color: '#e94560' }}>reduz a chance do adversário ter Ás</strong> — o que significa menos chance de alguém ter uma mão forte o suficiente para te chamar. É um efeito sutil mas real, e o GTO leva isso em conta.
        </Section>

        <Section title="Mentalidade">
          <ul className="space-y-1" style={{ color: '#ccc', fontSize: 14 }}>
            <li>⚡ Decida qual mão você vai atacar ANTES de ver as cartas — não na hora</li>
            <li>⚡ Com 10 fichas, você ainda tem tempo. Com 8, já é urgência</li>
            <li>⚡ Se perdeu e saiu, faz parte — nunca compre fichas no emocional</li>
            <li>⚡ Perto do prêmio: feche mais o range, sobreviver tem valor</li>
          </ul>
        </Section>
      </div>

      <button
        onClick={onComplete}
        className="w-full mt-8 py-4 rounded-xl font-bold text-white text-lg"
        style={{ background: '#e94560' }}
      >
        Entendi — Quero Treinar 💥
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
  const [filterPos, setFilterPos] = useState('Todas')
  const [filterStack, setFilterStack] = useState('Todos')
  const [currentHand, setCurrentHand] = useState(null)
  const [currentPos, setCurrentPos] = useState(null)
  const [currentStack, setCurrentStack] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [sessionDone, setSessionDone] = useState(false)

  function newHand() {
    const positions = filterPos === 'Todas' ? POSITIONS : [filterPos]
    const stacks = filterStack === 'Todos' ? STACKS_OPTIONS : [parseInt(filterStack)]
    const pos = positions[Math.floor(Math.random() * positions.length)]
    const stack = stacks[Math.floor(Math.random() * stacks.length)]
    setCurrentPos(pos)
    setCurrentStack(stack)
    setCurrentHand(randomHand(pos, stack))
    setFeedback(null)
  }

  function answer(action) {
    if (!currentHand || feedback) return
    const fb = getFeedback(currentHand, action, currentPos, currentStack)
    const newStreak = fb.isCorrect ? streak + 1 : 0
    setStreak(newStreak)
    setFeedback(fb)
    const newTotal = sessionTotal + 1
    const newCorrect = sessionCorrect + (fb.isCorrect ? 1 : 0)
    setSessionTotal(newTotal)
    setSessionCorrect(newCorrect)
    recordAnswer(2, fb.isCorrect, newStreak)
    if (newTotal >= 10) {
      recordSession(2, Math.round((newCorrect / newTotal) * 100))
      setSessionDone(true)
    }
  }

  function restart() {
    setSessionCorrect(0); setSessionTotal(0); setStreak(0)
    setSessionDone(false); setFeedback(null); setCurrentHand(null)
  }

  if (!currentHand && !sessionDone) newHand()

  if (sessionDone) {
    const acc = Math.round((sessionCorrect / sessionTotal) * 100)
    return (
      <div className="text-center" style={{ maxWidth: 400, margin: '0 auto', paddingTop: 40 }}>
        <div style={{ fontSize: 60 }}>{acc >= 90 ? '🎉' : '💪'}</div>
        <h2 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginTop: 16 }}>Sessão Completa!</h2>
        <div style={{ color: acc >= 90 ? '#00d4aa' : '#f5a623', fontSize: 36, fontWeight: 700, marginTop: 8 }}>{acc}%</div>
        {acc >= 90
          ? <p style={{ color: '#00d4aa', marginTop: 8 }}>Sessão conta para o próximo módulo!</p>
          : <p style={{ color: '#888', marginTop: 8 }}>Precisa de 90%+ para desbloquear o próximo módulo.</p>}
        <button onClick={restart} className="mt-6 px-8 py-3 rounded-xl font-bold" style={{ background: '#e94560', color: 'white' }}>
          Nova Sessão
        </button>
      </div>
    )
  }

  const cards = currentHand ? handToCards(currentHand) : []

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <div className="mb-4 space-y-3">
        <div>
          <div style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>POSIÇÃO</div>
          <div className="flex flex-wrap gap-2">
            {['Todas', ...POSITIONS].map(p => (
              <button key={p} onClick={() => { setFilterPos(p); setFeedback(null); setCurrentHand(null) }}
                className="px-3 py-1 rounded-lg text-sm"
                style={{ background: filterPos === p ? '#e94560' : '#12121a', color: filterPos === p ? 'white' : '#888', border: '1px solid #1e1e2e' }}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>STACK</div>
          <div className="flex gap-2 flex-wrap">
            {['Todos', ...STACKS_OPTIONS.map(String)].map(s => (
              <button key={s} onClick={() => { setFilterStack(s); setFeedback(null); setCurrentHand(null) }}
                className="px-3 py-1 rounded-lg text-sm"
                style={{ background: filterStack === s ? '#e94560' : '#12121a', color: filterStack === s ? 'white' : '#888', border: '1px solid #1e1e2e' }}>
                {s === 'Todos' ? s : `${s}bb`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl p-3 mb-4 flex justify-between" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
        <div style={{ color: '#888', fontSize: 13 }}>Sessão: {sessionCorrect}/{sessionTotal} · Seq: {streak}</div>
        <div style={{ color: '#888', fontSize: 13 }}>Meta: 10 mãos (90%+)</div>
      </div>
      <div className="rounded-full h-2 mb-6" style={{ background: '#1e1e2e' }}>
        <div className="rounded-full h-2 transition-all" style={{ width: `${(sessionTotal / 10) * 100}%`, background: '#e94560' }} />
      </div>

      {currentPos && (
        <div className="rounded-xl p-4 mb-4 text-center" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
          <div style={{ color: '#888', fontSize: 12 }}>SITUAÇÃO</div>
          <div style={{ color: '#e94560', fontSize: 22, fontWeight: 700 }}>{currentPos} · {currentStack}bb</div>
          <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>Todos foldaram até você. Foldar ou ir all-in?</div>
        </div>
      )}

      <div className="flex justify-center gap-4 mb-6">
        {cards.map((c, i) => <Card key={i} card={c} size="lg" />)}
      </div>
      {currentHand && (
        <div className="text-center mb-4">
          <span style={{ color: '#888', fontSize: 14, fontFamily: 'Space Mono' }}>{currentHand}</span>
        </div>
      )}

      {!feedback && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <button onClick={() => answer('push')} className="py-5 rounded-xl font-bold text-xl" style={{ background: '#00d4aa', color: '#0a0a0f' }}>
            ALL-IN 💥
          </button>
          <button onClick={() => answer('fold')} className="py-5 rounded-xl font-bold text-xl" style={{ background: '#e94560', color: 'white' }}>
            FOLD ✕
          </button>
        </div>
      )}

      {feedback && (
        <div className="rounded-xl p-4 mb-4" style={{ background: '#12121a', border: `2px solid ${feedback.isCorrect ? '#00d4aa' : '#e94560'}` }}>
          <div style={{ color: feedback.isCorrect ? '#00d4aa' : '#e94560', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
            {feedback.isCorrect ? '✓ Correto!' : '✗ Incorreto'}
          </div>
          <button onClick={newHand} className="w-full py-3 rounded-lg font-semibold mb-4" style={{ background: '#e94560', color: 'white', fontSize: 16 }}>
            Próxima Mão →
          </button>
          <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>{feedback.reason}</div>
          <div style={{ color: '#555', fontSize: 12, marginTop: 8 }}>
            Correto: <strong style={{ color: '#f5a623' }}>{feedback.correct === 'push' ? 'ALL-IN' : 'FOLD'}</strong>
          </div>
          {!feedback.isCorrect && (() => {
            const stacks = Object.keys(PUSH_FOLD_RANGES[currentPos] || {}).map(Number).sort((a, b) => a - b)
            const closest = stacks.reduce((prev, curr) => Math.abs(curr - currentStack) < Math.abs(prev - currentStack) ? curr : prev, stacks[0])
            const pushList = PUSH_FOLD_RANGES[currentPos]?.[closest] || []
            return (
              <RangeViewer
                customRange={{ push: pushList }}
                label={`Ver range push — ${currentPos} ${currentStack}bb`}
                legend={[['push', 'Push (All-in)'], ['fold', 'Fold']]}
                highlightHand={currentHand}
              />
            )
          })()}
        </div>
      )}
    </div>
  )
}

export default function Module2() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[2].lessonRead ? 'trainer' : 'lesson')

  if (!progress.modules[2].unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="text-center">
          <div style={{ fontSize: 60 }}>🔒</div>
          <h2 style={{ color: 'white', fontSize: 22, fontWeight: 700, marginTop: 16 }}>Módulo Bloqueado</h2>
          <p style={{ color: '#888', marginTop: 8 }}>Complete o Módulo 1 com 90%+ em 2 sessões para desbloquear.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setView('lesson')} className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: view === 'lesson' ? '#e94560' : '#12121a', color: view === 'lesson' ? 'white' : '#888', border: '1px solid #1e1e2e' }}>
            📖 Aula
          </button>
          <button onClick={() => progress.modules[2].lessonRead && setView('trainer')} className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: view === 'trainer' ? '#e94560' : '#12121a', color: view === 'trainer' ? 'white' : (progress.modules[2].lessonRead ? '#888' : '#444'), border: '1px solid #1e1e2e', cursor: progress.modules[2].lessonRead ? 'pointer' : 'not-allowed' }}>
            🎯 Trainer {!progress.modules[2].lessonRead && '🔒'}
          </button>
        </div>
        {view === 'lesson' ? <Lesson onComplete={() => { markLessonRead(2); setView('trainer') }} /> : <Trainer />}
      </div>
    </div>
  )
}
