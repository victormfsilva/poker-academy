import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'
import SessionReview from '../../components/SessionReview'
import Card, { handToCards } from '../../components/Card'
import RangeViewer from '../../components/RangeViewer'
import ModulePokerTable from '../../components/ModulePokerTable'
import {
  SPIN_MULTIPLIER_ADJUSTMENTS,
  SPIN_PUSH_RANGES,
  getSpinPushRange,
  adjustRangeForMultiplier,
  isHandInSpinRange
} from '../../data/spinRanges'

const MULTIPLIERS = [2, 5, 10, 25, 120]
const STACKS = [25, 15, 10]

const MULT_COLORS = {
  2: '#ccc',
  5: '#3b82f6',
  10: '#f5a623',
  25: '#f97316',
  120: '#e5484d',
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

function randomHand(stack, multiplier) {
  const all = generateAllHands()
  const baseRange = getSpinPushRange('BTN', stack)
  const adjusted = adjustRangeForMultiplier(baseRange, multiplier)
  const pushList = adjusted?.push || []

  const dice = Math.random()
  if (dice < 0.5 && pushList.length > 0) {
    return pushList[Math.floor(Math.random() * pushList.length)]
  }
  const foldHands = all.filter(h => !pushList.includes(h))
  return foldHands[Math.floor(Math.random() * foldHands.length)]
}

function getFeedback(hand, action, stack, multiplier) {
  const baseRange = getSpinPushRange('BTN', stack)
  const adjustedRange = adjustRangeForMultiplier(baseRange, multiplier)
  const result = isHandInSpinRange(hand, adjustedRange)
  const shouldPush = result.inRange && (result.action === 'push' || result.action === 'mix')
  const correct = shouldPush ? 'push' : 'fold'
  const isCorrect = (action === 'push' && shouldPush) || (action === 'fold' && !shouldPush)

  const baseResult = isHandInSpinRange(hand, baseRange)
  const inBase = baseResult.inRange && (baseResult.action === 'push' || baseResult.action === 'mix')

  let reason = ''
  const adj = SPIN_MULTIPLIER_ADJUSTMENTS.adjustments[multiplier]

  if (shouldPush) {
    reason = `${hand} entra no range de push do BTN com ${stack}bb mesmo no multiplicador ${multiplier}x. `
    if (multiplier <= 5) {
      reason += 'Com multiplicador baixo, o ICM quase nao afeta — jogue ChipEV normal e ataque.'
    } else {
      reason += `Mesmo com ICM mais pesado (bubble factor ${adj.bubbleFactor}x), essa mao tem forca suficiente pra ir all-in.`
    }
  } else {
    if (inBase && !shouldPush) {
      reason = `${hand} estaria no range de push com ChipEV puro, mas no ${multiplier}x o ICM manda fold! `
      reason += `O range aperta ${Math.round(adj.tightenPct * 100)}% — cada chip vale mais em $EV. `
      reason += `Bubble factor ${adj.bubbleFactor}x: sobreviver tem mais valor que arriscar com mao marginal.`
    } else {
      reason = `${hand} esta fora do range de push do BTN com ${stack}bb. `
      if (multiplier >= 25) {
        reason += `No ${multiplier}x, voce deveria ser ainda MAIS tight. Folde e espere uma mao premium.`
      } else {
        reason += 'Folde e espere uma mao melhor — voce ainda tem fichas pra escolher seus spots.'
      }
    }
  }

  return { correct, isCorrect, reason }
}

function Lesson({ onComplete }) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        Modulo 36 — Spin & Go: ICM por Multiplicador
      </h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Como o multiplicador muda completamente suas decisoes</p>

      <div className="space-y-4">
        <Section title="O Que E o Multiplicador?">
          No Spin & Go, o multiplicador define o prize pool. Ele e sorteado antes da mao comecar e muda TUDO sobre como voce deve jogar.
          <div className="grid grid-cols-2 gap-2 mt-3">
            {[
              { mult: '2x', freq: '73.5%', desc: 'Mais comum' },
              { mult: '3x', freq: '11.75%', desc: 'Ainda frequente' },
              { mult: '5x', freq: '7.5%', desc: 'Comeca a importar' },
              { mult: '10x', freq: '4.5%', desc: 'ICM relevante' },
              { mult: '25x+', freq: 'Raros', desc: 'Cada chip vale ouro' },
            ].map(item => (
              <div key={item.mult} className="rounded-lg p-2" style={{ background: '#0f0f0f', border: '1px solid #2a2a2e' }}>
                <div style={{ color: '#e5484d', fontWeight: 700 }}>{item.mult} ({item.freq})</div>
                <div style={{ color: '#ccc', fontSize: 12, marginTop: 2 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="2x-3x: Jogue ChipEV">
          Nos multiplicadores baixos (2x e 3x), que representam <strong style={{ color: '#f5a623' }}>~85% dos jogos</strong>, o ICM quase nao afeta suas decisoes. Jogue como se cada ficha tivesse o mesmo valor em dinheiro.
          <div className="mt-3 rounded-lg p-3" style={{ background: '#0f0f0f' }}>
            <div style={{ color: '#ccc', fontSize: 13 }}>
              Sem ajuste ICM. Push/fold normal. O prize pool e pequeno, entao nao faz sentido jogar scared money.
            </div>
          </div>
        </Section>

        <Section title="10x-25x: ICM Comeca a Pesar">
          Quando o multiplicador sobe pra <strong style={{ color: '#f5a623' }}>10x ou 25x</strong>, cada ficha passa a valer mais em $EV do que em ChipEV. Isso significa:
          <ul className="space-y-1 mt-2" style={{ color: '#ccc', fontSize: 14 }}>
            <li>- Sobreviver importa mais que acumular fichas</li>
            <li>- Folde spots marginais que voce normalmente pusharia</li>
            <li>- Evite coinflips desnecessarios — prefira fold equity</li>
            <li>- O range de push aperta <strong style={{ color: '#e5484d' }}>10-15%</strong></li>
          </ul>
        </Section>

        <Section title="120x+: Survival Mode">
          Jackpot! No <strong style={{ color: '#e5484d' }}>120x</strong> ou acima, cada chip vale MUITO em $EV. O segundo lugar paga bem, entao sobreviver e quase tao importante quanto ganhar.
          <div className="mt-3 rounded-lg p-3" style={{ background: '#0f0f0f' }}>
            <div style={{ color: '#ccc', fontSize: 13 }}>
              Ultra tight e +EV. O range de push aperta <strong style={{ color: '#e5484d' }}>25%+</strong>. So va all-in com maos premium ou muito fortes. Deixe os outros se eliminarem.
            </div>
          </div>
        </Section>

        <Section title="Bubble Factor">
          No 3-max, <strong style={{ color: '#f5a623' }}>SEMPRE tem bubble</strong> (3 jogadores, 2 pagam, 1 sai). O bubble factor muda drasticamente com o multiplicador:
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            {[
              { mult: '2x', bf: '1.0x', color: '#ccc' },
              { mult: '10x', bf: '1.35x', color: '#f5a623' },
              { mult: '25x', bf: '1.6x', color: '#f97316' },
              { mult: '120x', bf: '2.0x', color: '#e5484d' },
            ].map(item => (
              <div key={item.mult} className="rounded-lg p-2" style={{ background: '#0f0f0f', border: '1px solid #2a2a2e' }}>
                <div style={{ color: item.color, fontWeight: 700, fontSize: 18 }}>{item.bf}</div>
                <div style={{ color: '#888', fontSize: 11 }}>Mult {item.mult}</div>
              </div>
            ))}
          </div>
          <p style={{ color: '#888', fontSize: 13, marginTop: 8 }}>
            Bubble factor 2.0x = voce perde 2x mais $EV ao bustar do que ganha ao dobrar.
          </p>
        </Section>

        <Section title="Na Pratica">
          Mesma mao, decisao oposta dependendo do multiplicador:
          <div className="mt-3 space-y-2">
            <div className="rounded-lg p-3 flex justify-between items-center" style={{ background: '#0f0f0f', border: '1px solid #2a2a2e' }}>
              <div>
                <span style={{ color: '#ccc', fontWeight: 600 }}>K9o — BTN 10bb</span>
              </div>
              <div className="flex gap-2">
                <span className="px-2 py-1 rounded text-xs font-bold" style={{ background: '#4fce82', color: '#0f0f0f' }}>2x: ALL-IN</span>
                <span className="px-2 py-1 rounded text-xs font-bold" style={{ background: '#e5484d', color: 'white' }}>25x: FOLD</span>
              </div>
            </div>
            <div className="rounded-lg p-3 flex justify-between items-center" style={{ background: '#0f0f0f', border: '1px solid #2a2a2e' }}>
              <div>
                <span style={{ color: '#ccc', fontWeight: 600 }}>QTo — BTN 15bb</span>
              </div>
              <div className="flex gap-2">
                <span className="px-2 py-1 rounded text-xs font-bold" style={{ background: '#4fce82', color: '#0f0f0f' }}>2x: ALL-IN</span>
                <span className="px-2 py-1 rounded text-xs font-bold" style={{ background: '#e5484d', color: 'white' }}>120x: FOLD</span>
              </div>
            </div>
          </div>
          <p style={{ color: '#888', fontSize: 13, marginTop: 8 }}>
            O multiplicador muda o valor de cada chip — mesma mao, contexto diferente, decisao diferente.
          </p>
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
  const [filterMult, setFilterMult] = useState('Todos')
  const [filterStack, setFilterStack] = useState('Todos')
  const [currentHand, setCurrentHand] = useState(null)
  const [currentMult, setCurrentMult] = useState(null)
  const [currentStack, setCurrentStack] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [sessionDone, setSessionDone] = useState(false)

  function newHand() {
    if (sessionTotal >= 10) { setSessionDone(true); return }
    const mults = filterMult === 'Todos' ? MULTIPLIERS : [parseInt(filterMult)]
    const stacks = filterStack === 'Todos' ? STACKS : [parseInt(filterStack)]
    const mult = mults[Math.floor(Math.random() * mults.length)]
    const stack = stacks[Math.floor(Math.random() * stacks.length)]
    setCurrentMult(mult)
    setCurrentStack(stack)
    setCurrentHand(randomHand(stack, mult))
    setFeedback(null)
  }

  function answer(action) {
    if (!currentHand || feedback) return
    const fb = getFeedback(currentHand, action, currentStack, currentMult)
    const newStreak = fb.isCorrect ? streak + 1 : 0
    setStreak(newStreak)
    const newTotal = sessionTotal + 1
    const newCorrect = sessionCorrect + (fb.isCorrect ? 1 : 0)
    setSessionTotal(newTotal)
    setSessionCorrect(newCorrect)
    recordAnswer(36, fb.isCorrect, newStreak)
    const isLast = newTotal >= 10
    if (isLast) recordSession(36, Math.round((newCorrect / newTotal) * 100))
    setFeedback({ ...fb, isLast })
  }

  function restart() {
    setSessionCorrect(0); setSessionTotal(0); setStreak(0)
    setSessionDone(false); setFeedback(null); setCurrentHand(null)
  }

  if (!currentHand && !sessionDone) newHand()

  if (sessionDone) {
    return <SessionReview moduleId={36} sessionCorrect={sessionCorrect} sessionTotal={sessionTotal} onContinue={restart} />
  }

  const cards = currentHand ? handToCards(currentHand) : []
  const multColor = currentMult ? (MULT_COLORS[currentMult] || '#ccc') : '#ccc'

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <div className="mb-4 space-y-3">
        <div>
          <div style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>MULTIPLICADOR</div>
          <div className="flex flex-wrap gap-2">
            {['Todos', ...MULTIPLIERS.map(String)].map(m => (
              <button key={m} onClick={() => { setFilterMult(m); setFeedback(null); setCurrentHand(null) }}
                className="px-3 py-1 rounded-lg text-sm"
                style={{ background: filterMult === m ? '#e5484d' : '#1a1a1d', color: filterMult === m ? 'white' : '#888', border: '1px solid #2a2a2e' }}>
                {m === 'Todos' ? m : `${m}x`}
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

      {currentMult && (
        <div className="text-center mb-4">
          <div className="inline-block rounded-xl px-6 py-3" style={{ background: '#1a1a1d', border: `2px solid ${multColor}` }}>
            <div style={{ color: multColor, fontSize: 32, fontWeight: 800, fontFamily: 'Space Mono' }}>
              {currentMult}x
            </div>
            <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>
              {currentMult <= 3 ? 'ChipEV puro' : currentMult <= 10 ? 'ICM relevante' : currentMult <= 25 ? 'ICM forte' : 'SURVIVAL MODE'}
            </div>
          </div>
        </div>
      )}

      {currentStack && (
        <ModulePokerTable
          heroPos="BTN"
          heroCards={cards}
          potLabel={`${currentStack}bb`}
          contextTitle={`BTN · ${currentStack}bb · ${currentMult}x`}
          contextDesc="Todos foldaram ate voce. Foldar ou ir all-in?"
        />
      )}
      {currentHand && (
        <div className="text-center mb-4">
          <span style={{ color: '#888', fontSize: 14, fontFamily: 'Space Mono' }}>{currentHand}</span>
        </div>
      )}

      {!feedback && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <button onClick={() => answer('push')} className="py-5 rounded-xl font-bold text-xl" style={{ background: '#4fce82', color: '#0f0f0f' }}>
            ALL-IN
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
            Correto: <strong style={{ color: '#f5a623' }}>{feedback.correct === 'push' ? 'ALL-IN' : 'FOLD'}</strong>
            {' · '}Multiplicador: <strong style={{ color: multColor }}>{currentMult}x</strong>
            {' · '}Bubble Factor: <strong style={{ color: '#f5a623' }}>{SPIN_MULTIPLIER_ADJUSTMENTS.adjustments[currentMult]?.bubbleFactor}x</strong>
          </div>
          {!feedback.isCorrect && (() => {
            const baseRange = getSpinPushRange('BTN', currentStack)
            const adjustedRange = adjustRangeForMultiplier(baseRange, currentMult)
            const pushList = adjustedRange?.push || []
            return (
              <RangeViewer
                customRange={{ push: pushList }}
                label={`Range push ajustado — BTN ${currentStack}bb · ${currentMult}x`}
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

export default function Module36() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[36]?.lessonRead ? 'trainer' : 'lesson')

  if (!progress.modules[36]?.unlocked) {
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
          <button onClick={() => progress.modules[36]?.lessonRead && setView('trainer')} className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: view === 'trainer' ? '#e5484d' : '#1a1a1d', color: view === 'trainer' ? 'white' : (progress.modules[36]?.lessonRead ? '#888' : '#444'), border: '1px solid #2a2a2e', cursor: progress.modules[36]?.lessonRead ? 'pointer' : 'not-allowed' }}>
            Trainer {!progress.modules[36]?.lessonRead && '🔒'}
          </button>
        </div>
        {view === 'lesson' && <Lesson onComplete={() => { markLessonRead(36); setView('trainer') }} />}
        {view === 'trainer' && <Trainer />}
      </div>
    </div>
  )
}
