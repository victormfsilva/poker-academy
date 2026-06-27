import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'
import SessionReview from '../../components/SessionReview'
import { SPIN_OPEN_RANGES, getSpinOpenRange, isHandInSpinRange } from '../../data/spinRanges'
import Card, { handToCards } from '../../components/Card'
import RangeViewer from '../../components/RangeViewer'
import RangeBuilder from '../../components/RangeBuilder'
import ModulePokerTable from '../../components/ModulePokerTable'

const POSITIONS = ['BTN', 'SB']
const STACKS = [25, 20, 15]

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
  const range = getSpinOpenRange(pos, stack)
  if (!range) return all[Math.floor(Math.random() * all.length)]

  const raiseHands = [...(range.raise || []), ...(range.mix || [])]

  const dice = Math.random()
  if (dice < 0.5 && raiseHands.length > 0) {
    return raiseHands[Math.floor(Math.random() * raiseHands.length)]
  }
  const foldHands = all.filter(h => !raiseHands.includes(h))
  if (foldHands.length === 0) return all[Math.floor(Math.random() * all.length)]
  return foldHands[Math.floor(Math.random() * foldHands.length)]
}

function getFeedback(hand, action, pos, stack) {
  const range = getSpinOpenRange(pos, stack)
  const check = isHandInSpinRange(hand, range)

  const shouldRaise = check.inRange && (check.action === 'raise' || check.action === 'mix')
  const isMix = check.action === 'mix'
  const isCorrect = (action === 'raise' && shouldRaise) || (action === 'fold' && !shouldRaise)
  const correct = shouldRaise ? 'raise' : 'fold'

  let reason = ''
  const rank1 = hand[0]

  if (isMix) {
    reason = `${hand} e uma mao de transicao (mix) em ${pos} com ${stack}bb. Tanto raise quanto fold sao aceitaveis nesse spot — o solver divide ~50/50.`
  } else if (shouldRaise) {
    if (hand.length === 2) {
      reason = `Par de ${rank1}s em ${pos} com ${stack}bb — raise obrigatorio. Pares sempre entram no range de open raise no 3-max.`
    } else if (rank1 === 'A') {
      reason = `${hand} em ${pos} com ${stack}bb — raise. Maos com As tem fold equity extra porque reduz a chance do oponente ter premium.`
    } else {
      reason = `${hand} esta dentro do range de open raise de ${pos} com ${stack}bb. No 3-max, ${pos === 'BTN' ? 'o BTN abre wide porque so tem 2 blinds pra roubar' : 'o SB abre MUITO wide no blind war vs BB'}.`
    }
  } else {
    reason = `${hand} esta fora do range de open raise de ${pos} com ${stack}bb. Folde e espere uma mao melhor.`
    if (pos === 'BTN') {
      reason += ' Mesmo o BTN abrindo ~51% no 3-max, essa mao nao tem equity suficiente.'
    } else {
      reason += ' Apesar do SB abrir ~65%, essa mao nao tem equity suficiente contra o range de defesa do BB.'
    }
  }

  if (stack === 15) {
    reason += ' Com 15bb, o jogo ja mistura raises com shoves — fique atento ao stack efetivo.'
  }

  return { correct, isCorrect, reason }
}

function Lesson({ onComplete }) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        Modulo 32 — Spin & Go: Open Raise 3-Max
      </h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Dominando os ranges de abertura no formato mais rapido do poker</p>

      <div className="space-y-4">
        <Section title="O que e Spin & Go?">
          Spin & Go e um formato de torneio hyper-turbo com <strong style={{ color: '#e5484d' }}>3 jogadores</strong>, comecando com <strong style={{ color: '#f5a623' }}>25bb</strong> cada. Os blinds sobem rapido e cada partida dura apenas <strong style={{ color: '#4fce82' }}>5-10 minutos</strong>. O prize pool e definido por um multiplicador aleatorio no inicio. <br /><br />
          Por ser tao rapido, cada decisao preflop tem um impacto enorme. Nao ha tempo pra esperar AA — voce precisa saber EXATAMENTE quais maos abrir em cada posicao e stack.
        </Section>

        <Section title="3-Max vs 6-Max: A Diferenca">
          A diferenca fundamental e que no 3-max so existem <strong style={{ color: '#e5484d' }}>3 jogadores</strong> na mesa. Isso muda TUDO nos ranges:
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #2a2a2e' }}>
              <div style={{ color: '#f5a623', fontWeight: 700, fontSize: 14 }}>6-Max</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>BTN abre ~45%</div>
              <div style={{ color: '#ccc', fontSize: 13 }}>SB abre ~40%</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #2a2a2e' }}>
              <div style={{ color: '#4fce82', fontWeight: 700, fontSize: 14 }}>3-Max (Spin)</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>BTN abre ~51%</div>
              <div style={{ color: '#ccc', fontSize: 13 }}>SB abre ~65%</div>
            </div>
          </div>
          <p style={{ color: '#888', fontSize: 13, marginTop: 8 }}>
            Menos jogadores = menos chance de alguem ter mao forte = voce pode abrir MUITO mais wide.
          </p>
        </Section>

        <Section title="BTN: Sua Posicao Favorita">
          O BTN e <strong style={{ color: '#4fce82' }}>rei no 3-max</strong>. Voce so precisa passar por 2 blinds (SB e BB) para roubar o pote. Compare com 6-max onde tem 5 jogadores depois de voce. <br /><br />
          Com 25bb, o BTN abre <strong style={{ color: '#f5a623' }}>~51% das maos</strong> — isso inclui todos os pares, qualquer As suited, broadway suited, e muitos conectores. Abra wide e aproveite a posicao pos-flop.
          <div className="mt-3 rounded-lg p-3" style={{ background: '#0f0f0f' }}>
            <div style={{ color: '#ccc', fontSize: 13 }}>
              Regra pratica: no BTN com 25bb, se a mao tem ALGUM potencial (par, As, broadway, suited connector), abra.
            </div>
          </div>
        </Section>

        <Section title="SB: Blind War">
          Quando o BTN folda, o SB fica em <strong style={{ color: '#e5484d' }}>blind war puro</strong> contra o BB. E basicamente heads-up com posicao. <br /><br />
          O SB abre <strong style={{ color: '#f5a623' }}>~65% das maos</strong> com 25bb — isso e BEM mais wide que qualquer outra situacao. A logica e simples: so tem 1 jogador pra passar, e voce tem posicao pos-flop.
          <div className="mt-3 rounded-lg p-3" style={{ background: '#0f0f0f' }}>
            <div style={{ color: '#ccc', fontSize: 13 }}>
              No blind war, ate maos como K2s, Q5s e 43s entram no range de open. Nao tenha medo de abrir wide.
            </div>
          </div>
        </Section>

        <Section title="Stack Depth Matters">
          O tamanho do stack muda drasticamente os ranges:
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            {STACKS.map(s => (
              <div key={s} className="rounded-lg p-2" style={{ background: '#0f0f0f', border: '1px solid #2a2a2e' }}>
                <div style={{ color: '#e5484d', fontWeight: 700 }}>{s}bb</div>
                <div style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>
                  {s === 25 ? 'Room pra postflop, open wide' : s === 20 ? 'Ranges apertam um pouco' : 'Mistura raises com shoves'}
                </div>
              </div>
            ))}
          </div>
          <p style={{ color: '#888', fontSize: 13, marginTop: 8 }}>
            Com 25bb voce tem espaco pra jogar pos-flop. Com 15bb, ja comeca a misturar all-ins — o min-raise perde fold equity.
          </p>
        </Section>

        <Section title="Mentalidade Spin">
          <ul className="space-y-1" style={{ color: '#ccc', fontSize: 14 }}>
            <li>* Sessoes curtas — cada Spin dura 5-10 minutos, jogue volume</li>
            <li>* Nao tilt por 1 jogo — a variancia e altissima, foque em decisoes corretas</li>
            <li>* Multiplicador nao muda os ranges basicos — jogue GTO ate entender exploits</li>
            <li>* Cada mao conta — com 25bb de inicio, 1 erro pode custar o torneio</li>
            <li>* Volume e rei — jogue 4-8 Spins simultaneamente para reduzir variancia</li>
          </ul>
        </Section>
      </div>

      <button
        onClick={onComplete}
        className="w-full mt-8 py-4 rounded-xl font-bold text-white text-lg"
        style={{ background: '#e5484d' }}
      >
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
    if (sessionTotal >= 10) { setSessionDone(true); return }
    const positions = filterPos === 'Todas' ? POSITIONS : [filterPos]
    const stacks = filterStack === 'Todos' ? STACKS : [parseInt(filterStack)]
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
    const newTotal = sessionTotal + 1
    const newCorrect = sessionCorrect + (fb.isCorrect ? 1 : 0)
    setSessionTotal(newTotal)
    setSessionCorrect(newCorrect)
    recordAnswer(32, fb.isCorrect, newStreak)
    const isLast = newTotal >= 10
    if (isLast) recordSession(32, Math.round((newCorrect / newTotal) * 100))
    setFeedback({ ...fb, isLast })
  }

  function restart() {
    setSessionCorrect(0); setSessionTotal(0); setStreak(0)
    setSessionDone(false); setFeedback(null); setCurrentHand(null)
  }

  if (!currentHand && !sessionDone) newHand()

  if (sessionDone) {
    return <SessionReview moduleId={32} sessionCorrect={sessionCorrect} sessionTotal={sessionTotal} onContinue={restart} />
  }

  const cards = currentHand ? handToCards(currentHand) : []
  const contextDesc = currentPos === 'BTN'
    ? 'SB e BB ainda nao agiram. Abrir ou foldar?'
    : 'BTN foldou. Blind war vs BB. Abrir ou foldar?'

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <div className="mb-4 space-y-3">
        <div>
          <div style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>POSICAO</div>
          <div className="flex flex-wrap gap-2">
            {['Todas', ...POSITIONS].map(p => (
              <button key={p} onClick={() => { setFilterPos(p); setFeedback(null); setCurrentHand(null) }}
                className="px-3 py-1 rounded-lg text-sm"
                style={{ background: filterPos === p ? '#e5484d' : '#1a1a1d', color: filterPos === p ? 'white' : '#888', border: '1px solid #2a2a2e' }}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>STACK</div>
          <div className="flex gap-2 flex-wrap">
            {['Todos', ...STACKS.map(String)].map(s => (
              <button key={s} onClick={() => { setFilterStack(s); setFeedback(null); setCurrentHand(null) }}
                className="px-3 py-1 rounded-lg text-sm"
                style={{ background: filterStack === s ? '#e5484d' : '#1a1a1d', color: filterStack === s ? 'white' : '#888', border: '1px solid #2a2a2e' }}>
                {s === 'Todos' ? s : `${s}bb`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl p-3 mb-4 flex justify-between" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
        <div style={{ color: '#888', fontSize: 13 }}>Sessao: {sessionCorrect}/{sessionTotal} · Seq: {streak}</div>
        <div style={{ color: '#888', fontSize: 13 }}>Meta: 10 maos (90%+)</div>
      </div>
      <div className="rounded-full h-2 mb-6" style={{ background: '#2a2a2e' }}>
        <div className="rounded-full h-2 transition-all" style={{ width: `${(sessionTotal / 10) * 100}%`, background: '#e5484d' }} />
      </div>

      {currentPos && (
        <ModulePokerTable
          heroPos={currentPos}
          heroCards={cards}
          potLabel={`${currentStack}bb`}
          contextTitle={`${currentPos} · ${currentStack}bb · 3-Max`}
          contextDesc={contextDesc}
        />
      )}
      {currentHand && (
        <div className="text-center mb-4">
          <span style={{ color: '#888', fontSize: 14, fontFamily: 'Space Mono' }}>{currentHand}</span>
        </div>
      )}

      {!feedback && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <button onClick={() => answer('raise')} className="py-5 rounded-xl font-bold text-xl" style={{ background: '#4fce82', color: '#0f0f0f' }}>
            RAISE
          </button>
          <button onClick={() => answer('fold')} className="py-5 rounded-xl font-bold text-xl" style={{ background: '#e5484d', color: 'white' }}>
            FOLD
          </button>
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
            Correto: <strong style={{ color: '#f5a623' }}>{feedback.correct === 'raise' ? 'RAISE' : 'FOLD'}</strong>
          </div>
          {!feedback.isCorrect && (() => {
            const range = getSpinOpenRange(currentPos, currentStack)
            const raiseList = [...(range?.raise || []), ...(range?.mix || [])]
            return (
              <RangeViewer
                customRange={{ raise: raiseList }}
                label={`Ver range open — ${currentPos} ${currentStack}bb`}
                legend={[['raise', 'Raise (Open)'], ['fold', 'Fold']]}
                highlightHand={currentHand}
              />
            )
          })()}
        </div>
      )}
    </div>
  )
}

function M32RangeBuilder() {
  const [pos, setPos] = useState('BTN')
  const [stack, setStack] = useState(25)
  const range = getSpinOpenRange(pos, stack)
  const raiseList = [...(range?.raise || []), ...(range?.mix || [])]
  const allHands = generateAllHands()
  const correctRange = {
    raise: raiseList,
    fold: allHands.filter(h => !raiseList.includes(h)),
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h2 className="text-lg font-bold mb-4" style={{ color: '#fdfdfd' }}>Construa o Range de Open Raise</h2>
      <p className="text-sm mb-4" style={{ color: '#676671' }}>
        Selecione todas as maos que voce abriria com raise nessa posicao e stack no Spin & Go 3-max.
      </p>
      <div className="flex gap-3 mb-4 flex-wrap">
        <div>
          <label className="text-xs block mb-1" style={{ color: '#676671' }}>Posicao</label>
          <div className="flex gap-1">
            {POSITIONS.map(p => (
              <button key={p} onClick={() => setPos(p)} className="px-2 py-1 rounded text-xs font-bold"
                style={{ background: pos === p ? '#e5484d' : '#222225', color: pos === p ? '#fdfdfd' : '#676671' }}>{p}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs block mb-1" style={{ color: '#676671' }}>Stack</label>
          <div className="flex gap-1">
            {STACKS.map(s => (
              <button key={s} onClick={() => setStack(s)} className="px-2 py-1 rounded text-xs font-bold"
                style={{ background: stack === s ? '#0a84d7' : '#222225', color: stack === s ? '#fdfdfd' : '#676671' }}>{s}bb</button>
            ))}
          </div>
        </div>
      </div>
      <RangeBuilder correctRange={correctRange} actions={['raise', 'fold']} title={`Range Open — ${pos} ${stack}bb`} />
    </div>
  )
}

export default function Module32() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[32]?.lessonRead ? 'trainer' : 'lesson')

  if (!progress.modules[32]?.unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f0f' }}>
        <div className="text-center">
          <div style={{ fontSize: 60 }}>🔒</div>
          <h2 style={{ color: 'white', fontSize: 22, fontWeight: 700, marginTop: 16 }}>Modulo Bloqueado</h2>
          <p style={{ color: '#888', marginTop: 8 }}>Complete o modulo anterior com 90%+ em 2 sessoes para desbloquear.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0f0f0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setView('lesson')} className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: view === 'lesson' ? '#e5484d' : '#1a1a1d', color: view === 'lesson' ? 'white' : '#888', border: '1px solid #2a2a2e' }}>
            Aula
          </button>
          <button onClick={() => progress.modules[32]?.lessonRead && setView('trainer')} className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: view === 'trainer' ? '#e5484d' : '#1a1a1d', color: view === 'trainer' ? 'white' : (progress.modules[32]?.lessonRead ? '#888' : '#444'), border: '1px solid #2a2a2e', cursor: progress.modules[32]?.lessonRead ? 'pointer' : 'not-allowed' }}>
            Trainer {!progress.modules[32]?.lessonRead && '🔒'}
          </button>
          <button onClick={() => progress.modules[32]?.lessonRead && setView('builder')} className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: view === 'builder' ? '#0a84d7' : '#1a1a1d', color: view === 'builder' ? 'white' : (progress.modules[32]?.lessonRead ? '#888' : '#444'), border: '1px solid #2a2a2e', cursor: progress.modules[32]?.lessonRead ? 'pointer' : 'not-allowed' }}>
            Range Builder {!progress.modules[32]?.lessonRead && '🔒'}
          </button>
        </div>
        {view === 'lesson' && <Lesson onComplete={() => { markLessonRead(32); setView('trainer') }} />}
        {view === 'trainer' && <Trainer />}
        {view === 'builder' && <M32RangeBuilder />}
      </div>
    </div>
  )
}
