import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'
import SessionReview from '../../components/SessionReview'
import Card, { handToCards } from '../../components/Card'
import RangeViewer from '../../components/RangeViewer'
import ModulePokerTable from '../../components/ModulePokerTable'
import {
  SPIN_CALL_PUSH_RANGES,
  getSpinCallRange,
  isHandInSpinRange
} from '../../data/spinRanges'

const SPOTS = ['BB_vs_BTN', 'BB_vs_SB', 'SB_vs_BTN']
const SPOT_LABELS = {
  BB_vs_BTN: 'BB vs BTN',
  BB_vs_SB: 'BB vs SB',
  SB_vs_BTN: 'SB vs BTN',
}
const SPOT_HERO = {
  BB_vs_BTN: 'BB',
  BB_vs_SB: 'BB',
  SB_vs_BTN: 'SB',
}
const SPOT_VILLAIN = {
  BB_vs_BTN: 'BTN',
  BB_vs_SB: 'SB',
  SB_vs_BTN: 'BTN',
}
const STACKS = [15, 10, 8, 5]

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

function randomHand(spot, stack) {
  const all = generateAllHands()
  const range = getSpinCallRange(spot, stack)
  const callList = range?.call || []

  const dice = Math.random()
  if (dice < 0.5 && callList.length > 0) {
    return callList[Math.floor(Math.random() * callList.length)]
  }
  const foldHands = all.filter(h => !callList.includes(h))
  return foldHands[Math.floor(Math.random() * foldHands.length)]
}

function getPotOdds(stack) {
  // Villain pushes X bb, hero must call X to win pot of (X + 1.5) [SB+BB already in]
  // Simplified: hero needs to call stack to win stack + 1.5
  const pot = stack + 1.5
  const odds = (stack / (pot + stack) * 100).toFixed(0)
  return { pot: pot.toFixed(1), odds }
}

function getFeedback(hand, action, spot, stack) {
  const range = getSpinCallRange(spot, stack)
  const result = isHandInSpinRange(hand, range)
  const shouldCall = result.inRange && (result.action === 'call' || result.action === 'mix')
  const correct = shouldCall ? 'call' : 'fold'
  const isCorrect = (action === 'call' && shouldCall) || (action === 'fold' && !shouldCall)

  const heroPos = SPOT_HERO[spot]
  const villainPos = SPOT_VILLAIN[spot]
  const { pot, odds } = getPotOdds(stack)

  let reason = ''

  if (shouldCall) {
    if (hand.length === 2) {
      reason = `${hand}: par e forte o suficiente pra chamar o push de ${villainPos} com ${stack}bb. `
    } else if (hand[0] === 'A') {
      reason = `${hand}: mao com As entra no range de call do ${heroPos} vs push de ${villainPos} com ${stack}bb. `
    } else {
      reason = `${hand} esta no range de call do ${heroPos} vs push de ${villainPos} com ${stack}bb. `
    }
    reason += `Pot odds: voce precisa chamar ${stack}bb pra ganhar ~${pot}bb (precisa de ~${odds}% de equity). Essa mao tem equity suficiente vs o range de push do vilao.`
  } else {
    if (result.action === 'mix') {
      reason = `${hand} e uma mao de transicao (mix) — as vezes chama, as vezes folda. Na duvida, fold e o mais seguro. `
    } else {
      reason = `${hand} nao tem equity suficiente pra chamar o push de ${villainPos} com ${stack}bb. `
    }
    reason += `Lembre: quem chama NAO tem fold equity. Voce precisa de ~60% de equity vs o range do vilao, e ${hand} nao alcanca isso.`

    if (stack <= 5) {
      reason += ` Porem, com ${stack}bb as pot odds sao otimas (~${odds}%) — o range de call abre bastante, mas ${hand} ainda nao entra.`
    }
  }

  if (spot === 'SB_vs_BTN' && !shouldCall) {
    reason += ' SB vs BTN e o spot mais tight pra chamar — voce esta OOP (fora de posicao) e isso reduz seu range.'
  }

  return { correct, isCorrect, reason }
}

function Lesson({ onComplete }) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        Modulo 37 — Spin & Go: Call vs Push
      </h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Quando chamar o all-in do adversario — e quando deixar pra la</p>

      <div className="space-y-4">
        <Section title="Chamar um All-In">
          Chamar um all-in e <strong style={{ color: '#e5484d' }}>completamente diferente</strong> de pushear. Quem pusha tem <strong style={{ color: '#f5a623' }}>fold equity</strong> — a chance de todo mundo foldar e voce ganhar sem showdown. Quem chama <strong>nao tem isso</strong>. Voce vai direto pro showdown e precisa ganhar com a forca da mao.
          <div className="mt-3 rounded-lg p-3" style={{ background: '#0f0f0f' }}>
            <div style={{ color: '#ccc', fontSize: 13 }}>
              Por isso, o range de call e SEMPRE mais tight que o range de push. Se voce pusharia com 50% das maos, chama com ~25%.
            </div>
          </div>
        </Section>

        <Section title="BB vs BTN Push">
          O BTN pusha wide — <strong style={{ color: '#f5a623' }}>~50% das maos com 10bb</strong>. Mas o BB so chama ~25%. Exemplos por stack:
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            {[
              { stack: '15bb', call: '~18%' },
              { stack: '10bb', call: '~25%' },
              { stack: '5bb', call: '~42%' },
            ].map(item => (
              <div key={item.stack} className="rounded-lg p-2" style={{ background: '#0f0f0f', border: '1px solid #2a2a2e' }}>
                <div style={{ color: '#e5484d', fontWeight: 700 }}>{item.stack}</div>
                <div style={{ color: '#ccc', fontSize: 12, marginTop: 2 }}>Call: {item.call}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="BB vs SB Push">
          O SB pusha ainda mais wide que o BTN (so 1 jogador pra passar), mas o BB chama de forma similar — <strong style={{ color: '#f5a623' }}>ligeiramente mais wide</strong> porque o range do vilao e mais fraco em media.
          <div className="mt-3 rounded-lg p-3" style={{ background: '#0f0f0f' }}>
            <div style={{ color: '#ccc', fontSize: 13 }}>
              Com 10bb: BB chama ~28% vs SB push (vs ~25% contra BTN push). A diferenca e pequena mas real.
            </div>
          </div>
        </Section>

        <Section title="SB vs BTN Push">
          Esse e o spot <strong style={{ color: '#e5484d' }}>mais tight</strong> pra chamar. O SB esta fora de posicao (OOP) e precisa de maos muito fortes:
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            {[
              { stack: '15bb', call: '~14%' },
              { stack: '10bb', call: '~20%' },
              { stack: '5bb', call: '~35%' },
            ].map(item => (
              <div key={item.stack} className="rounded-lg p-2" style={{ background: '#0f0f0f', border: '1px solid #2a2a2e' }}>
                <div style={{ color: '#e5484d', fontWeight: 700 }}>{item.stack}</div>
                <div style={{ color: '#ccc', fontSize: 12, marginTop: 2 }}>Call: {item.call}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="A Regra de Ouro">
          Pra chamar um all-in, voce precisa de <strong style={{ color: '#f5a623' }}>~60% de equity</strong> contra o range de push do vilao. Parece muito? E porque e.
          <div className="mt-3 rounded-lg p-3" style={{ background: '#0f0f0f' }}>
            <div style={{ color: '#ccc', fontSize: 13 }}>
              Voce esta arriscando TODO o seu stack pra ganhar o stack dele + os blinds. As pot odds nao sao tao boas assim. Na duvida, <strong style={{ color: '#4fce82' }}>fold e seguro</strong>.
            </div>
          </div>
        </Section>

        <Section title="Stack Curto Muda Tudo">
          Com <strong style={{ color: '#e5484d' }}>5bb</strong>, as pot odds mudam drasticamente. O pot ja tem 1.5bb dos blinds, entao chamar 5bb pra ganhar ~11.5bb e bem mais atrativo.
          <div className="mt-3 space-y-2">
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #2a2a2e' }}>
              <div style={{ color: '#f5a623', fontWeight: 600 }}>BB chama ~42% vs BTN push com 5bb</div>
              <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                Qualquer Ax, qualquer par, qualquer broadway suited e a maioria dos broadway offsuit entram no range de call.
              </div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #2a2a2e' }}>
              <div style={{ color: '#f5a623', fontWeight: 600 }}>BB chama ~45% vs SB push com 5bb</div>
              <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                O range abre ainda mais porque o SB pusha quase qualquer mao.
              </div>
            </div>
          </div>
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
  const [filterSpot, setFilterSpot] = useState('Todos')
  const [filterStack, setFilterStack] = useState('Todos')
  const [currentHand, setCurrentHand] = useState(null)
  const [currentSpot, setCurrentSpot] = useState(null)
  const [currentStack, setCurrentStack] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [sessionDone, setSessionDone] = useState(false)

  function newHand() {
    if (sessionTotal >= 10) { setSessionDone(true); return }
    const spots = filterSpot === 'Todos' ? SPOTS : [filterSpot]
    const stacks = filterStack === 'Todos' ? STACKS : [parseInt(filterStack)]
    const spot = spots[Math.floor(Math.random() * spots.length)]
    const stack = stacks[Math.floor(Math.random() * stacks.length)]
    setCurrentSpot(spot)
    setCurrentStack(stack)
    setCurrentHand(randomHand(spot, stack))
    setFeedback(null)
  }

  function answer(action) {
    if (!currentHand || feedback) return
    const fb = getFeedback(currentHand, action, currentSpot, currentStack)
    const newStreak = fb.isCorrect ? streak + 1 : 0
    setStreak(newStreak)
    const newTotal = sessionTotal + 1
    const newCorrect = sessionCorrect + (fb.isCorrect ? 1 : 0)
    setSessionTotal(newTotal)
    setSessionCorrect(newCorrect)
    recordAnswer(37, fb.isCorrect, newStreak)
    const isLast = newTotal >= 10
    if (isLast) recordSession(37, Math.round((newCorrect / newTotal) * 100))
    setFeedback({ ...fb, isLast })
  }

  function restart() {
    setSessionCorrect(0); setSessionTotal(0); setStreak(0)
    setSessionDone(false); setFeedback(null); setCurrentHand(null)
  }

  if (!currentHand && !sessionDone) newHand()

  if (sessionDone) {
    return <SessionReview moduleId={37} sessionCorrect={sessionCorrect} sessionTotal={sessionTotal} onContinue={restart} />
  }

  const cards = currentHand ? handToCards(currentHand) : []
  const heroPos = currentSpot ? SPOT_HERO[currentSpot] : ''
  const villainPos = currentSpot ? SPOT_VILLAIN[currentSpot] : ''

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <div className="mb-4 space-y-3">
        <div>
          <div style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>SPOT</div>
          <div className="flex flex-wrap gap-2">
            {['Todos', ...SPOTS].map(s => (
              <button key={s} onClick={() => { setFilterSpot(s); setFeedback(null); setCurrentHand(null) }}
                className="px-3 py-1 rounded-lg text-sm"
                style={{ background: filterSpot === s ? '#e5484d' : '#1a1a1d', color: filterSpot === s ? 'white' : '#888', border: '1px solid #2a2a2e' }}>
                {s === 'Todos' ? s : SPOT_LABELS[s]}
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

      {currentSpot && (
        <div className="text-center mb-4">
          <div className="inline-block rounded-xl px-5 py-3" style={{ background: '#1a1a1d', border: '2px solid #e5484d' }}>
            <div style={{ color: '#e5484d', fontSize: 14, fontWeight: 700 }}>
              {villainPos} foi ALL-IN ({currentStack}bb)
            </div>
            <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>
              Voce esta no <strong style={{ color: '#f5a623' }}>{heroPos}</strong>. Chamar ou foldar?
            </div>
          </div>
        </div>
      )}

      {currentSpot && (
        <ModulePokerTable
          heroPos={heroPos}
          heroCards={cards}
          potLabel={`${currentStack}bb`}
          contextTitle={`${SPOT_LABELS[currentSpot]} · ${currentStack}bb`}
          contextDesc={`${villainPos} foi all-in. Voce chama ou folda?`}
          villainAction={{ pos: villainPos, label: 'ALL-IN' }}
        />
      )}
      {currentHand && (
        <div className="text-center mb-4">
          <span style={{ color: '#888', fontSize: 14, fontFamily: 'Space Mono' }}>{currentHand}</span>
        </div>
      )}

      {!feedback && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <button onClick={() => answer('call')} className="py-5 rounded-xl font-bold text-xl" style={{ background: '#4fce82', color: '#0f0f0f' }}>
            CALL
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
            Correto: <strong style={{ color: '#f5a623' }}>{feedback.correct === 'call' ? 'CALL' : 'FOLD'}</strong>
            {' · '}{SPOT_LABELS[currentSpot]}
            {' · '}{currentStack}bb
            {' · '}Pot odds: ~{getPotOdds(currentStack).odds}%
          </div>
          {!feedback.isCorrect && (() => {
            const range = getSpinCallRange(currentSpot, currentStack)
            const callList = range?.call || []
            return (
              <RangeViewer
                customRange={{ call: callList }}
                label={`Range call — ${SPOT_LABELS[currentSpot]} ${currentStack}bb`}
                legend={[['call', 'Call'], ['fold', 'Fold']]}
                highlightHand={currentHand}
              />
            )
          })()}
        </div>
      )}
    </div>
  )
}

export default function Module37() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[37]?.lessonRead ? 'trainer' : 'lesson')

  if (!progress.modules[37]?.unlocked) {
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
          <button onClick={() => progress.modules[37]?.lessonRead && setView('trainer')} className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: view === 'trainer' ? '#e5484d' : '#1a1a1d', color: view === 'trainer' ? 'white' : (progress.modules[37]?.lessonRead ? '#888' : '#444'), border: '1px solid #2a2a2e', cursor: progress.modules[37]?.lessonRead ? 'pointer' : 'not-allowed' }}>
            Trainer {!progress.modules[37]?.lessonRead && '🔒'}
          </button>
        </div>
        {view === 'lesson' && <Lesson onComplete={() => { markLessonRead(37); setView('trainer') }} />}
        {view === 'trainer' && <Trainer />}
      </div>
    </div>
  )
}
