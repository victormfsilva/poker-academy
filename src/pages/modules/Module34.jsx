import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'
import SessionReview from '../../components/SessionReview'
import Card, { handToCards } from '../../components/Card'
import RangeViewer from '../../components/RangeViewer'
import ModulePokerTable from '../../components/ModulePokerTable'
import {
  SPIN_PUSH_RANGES,
  getSpinPushRange,
  isHandInSpinRange,
  shouldPushFold
} from '../../data/spinRanges'

const POSITIONS = ['BTN', 'SB']
const STACKS = [15, 13, 10, 8, 5]

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
  const range = getSpinPushRange(pos, stack)
  const pushList = range?.push || []

  const dice = Math.random()
  if (dice < 0.5 && pushList.length > 0) {
    return pushList[Math.floor(Math.random() * pushList.length)]
  }
  const foldHands = all.filter(h => !pushList.includes(h))
  return foldHands[Math.floor(Math.random() * foldHands.length)]
}

function getRangePct(pos, stack) {
  const range = getSpinPushRange(pos, stack)
  const pushList = range?.push || []
  const total = generateAllHands().length
  return Math.round((pushList.length / total) * 100)
}

function getFeedback(hand, action, pos, stack) {
  const range = getSpinPushRange(pos, stack)
  const result = isHandInSpinRange(hand, range)
  const shouldPush = result.action === 'push'
  const isMix = result.action === 'mix'
  const correct = shouldPush || isMix ? 'push' : 'fold'
  const isCorrect = (action === 'push' && (shouldPush || isMix)) || (action === 'fold' && !shouldPush && !isMix)

  const pct = getRangePct(pos, stack)
  const posLabel = pos === 'BTN' ? 'no Button' : 'no Small Blind'
  let reason = ''

  if (shouldPush || isMix) {
    if (hand.length === 2) {
      reason = `Par de ${hand[0]}s com ${stack}bb ${posLabel} - vai all-in. Pares sempre entram no range de push em stacks curtos.`
    } else if (hand[0] === 'A') {
      reason = `${hand} com As ${posLabel} e ${stack}bb - vai all-in. O As na mao reduz a chance de alguem te chamar com mao forte.`
    } else {
      reason = `${hand} entra no range de push ${posLabel} com ${stack}bb. Com range de ~${pct}%, essa mao tem forca relativa suficiente.`
    }
    if (isMix) reason += ' (Mao de transicao - aceita tanto push quanto fold.)'
  } else {
    reason = `${hand} esta fora do range de push ${posLabel} com ${stack}bb (~${pct}%). Folde e espere uma mao melhor.`
  }

  if (stack <= 8) {
    reason += ` Com ${stack}bb, o range abre muito - seja agressivo antes que os blinds te comam.`
  } else if (stack >= 13) {
    reason += ` Com ${stack}bb, ainda tem fold equity significativa - use-a antes que o stack encolha.`
  }

  return { correct, isCorrect, reason }
}

function Lesson({ onComplete }) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        Modulo 34 - Spin & Go: Push/Fold 3-Handed
      </h1>
      <p style={{ color: '#888', marginBottom: 24 }}>
        Domine os ranges de all-in no formato mais rapido do poker online
      </p>

      <div className="space-y-4">
        <Section title="Push/Fold no Spin & Go">
          No Spin & Go 3-max, os blinds sobem a cada 3 minutos. Quando seu stack fica
          com <strong style={{ color: '#e5484d' }}>15bb ou menos</strong>, o jogo muda
          completamente: min-raise perde fold equity porque voce compromete fichas demais
          sem pressionar o suficiente. A estrategia correta e{' '}
          <strong style={{ color: '#4fce82' }}>all-in ou fold</strong>.
          <div className="mt-3 rounded-lg p-3" style={{ background: '#0f0f0f' }}>
            <div style={{ color: '#ccc', fontSize: 13 }}>
              Regra de ouro: com 15bb ou menos, esqueqa raises pequenos.
              Ou voce vai all-in e pressiona, ou folda e espera uma mao melhor.
            </div>
          </div>
        </Section>

        <Section title="BTN Push 3-Max">
          O Button e a posicao mais lucrativa para pushear porque ainda tem{' '}
          <strong style={{ color: '#f5a623' }}>dois jogadores para foldar</strong> (SB e BB).
          Os ranges se expandem conforme o stack diminui:
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            {[{ s: 15, p: '~35%' }, { s: 10, p: '~50%' }, { s: 5, p: '~75%' }].map(({ s, p }) => (
              <div key={s} className="rounded-lg p-2" style={{ background: '#0f0f0f', border: '1px solid #2a2a2e' }}>
                <div style={{ color: '#e5484d', fontWeight: 700 }}>{s}bb</div>
                <div style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>{p} push</div>
              </div>
            ))}
          </div>
          <p style={{ color: '#888', fontSize: 13, marginTop: 8 }}>
            Com 15bb, pushamos mãos premium + Ax suited + broadways fortes.
            Com 5bb, quase tudo entra - ate Q3s e J4s.
          </p>
        </Section>

        <Section title="SB Push vs BB">
          Quando o BTN folda, sobra SB vs BB. O SB pushea{' '}
          <strong style={{ color: '#4fce82' }}>ainda mais wide</strong> que o BTN
          porque so tem 1 jogador para passar:
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            {[{ s: 15, p: '~42%' }, { s: 10, p: '~62%' }, { s: 5, p: '~85%' }].map(({ s, p }) => (
              <div key={s} className="rounded-lg p-2" style={{ background: '#0f0f0f', border: '1px solid #2a2a2e' }}>
                <div style={{ color: '#4fce82', fontWeight: 700 }}>{s}bb</div>
                <div style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>{p} push</div>
              </div>
            ))}
          </div>
          <p style={{ color: '#888', fontSize: 13, marginTop: 8 }}>
            Com 5bb no SB, voce pusha ate maos como 43o e 52s. So folda lixo absoluto.
          </p>
        </Section>

        <Section title="A Regra do Stack">
          A logica e simples: quanto menor o stack, mais wide o push. Por que?
          <ul className="space-y-2 mt-2" style={{ color: '#ccc', fontSize: 14 }}>
            <li>
              <strong style={{ color: '#f5a623' }}>Menos fichas = menos risco relativo.</strong>{' '}
              Com 5bb, voce arrisca pouco para ganhar os blinds. O adversario precisa de uma
              mao decente para chamar.
            </li>
            <li>
              <strong style={{ color: '#f5a623' }}>Blinds comem rapido.</strong>{' '}
              Cada orbita custa 1.5bb (SB+BB). Com 5bb, voce so aguenta 3 orbitas.
            </li>
            <li>
              <strong style={{ color: '#f5a623' }}>Fold equity ainda existe.</strong>{' '}
              Mesmo com 5bb, o adversario folda ~60% das maos. Isso e lucro imediato.
            </li>
          </ul>
        </Section>

        <Section title="Timing e Tudo">
          <div style={{ color: '#e5484d', fontWeight: 600, marginBottom: 8 }}>
            Nao espere ter 3bb para pushear!
          </div>
          O sweet spot para push/fold agressivo e entre{' '}
          <strong style={{ color: '#4fce82' }}>8-13bb</strong>. Nessa faixa voce ainda
          tem fold equity real - o adversario respeita seu all-in.
          <div className="mt-3 rounded-lg p-3" style={{ background: '#0f0f0f' }}>
            <div style={{ color: '#ccc', fontSize: 13 }}>
              Com 3bb, qualquer mao chama voce. Com 10bb, o adversario pensa duas vezes.
              Ataque quando seu stack ainda tem poder de pressao.
            </div>
          </div>
        </Section>

        <Section title="Mentalidade">
          <ul className="space-y-1" style={{ color: '#ccc', fontSize: 14 }}>
            <li>Pushear e levar call NAO e erro - e parte do jogo. Volume compensa.</li>
            <li>Voce vai perder all-ins. Faz parte. A matematica esta do seu lado no longo prazo.</li>
            <li>Decida ANTES de ver as cartas: "com esse stack e posicao, vou pushear X% das maos".</li>
            <li>Nao fique com medo de bust. Spin & Go e volume - jogue 100, nao 1.</li>
            <li>Se errar, ajuste. O range e um guia, nao uma prisao. Adapte contra adversarios fracos.</li>
          </ul>
        </Section>
      </div>

      <button
        onClick={onComplete}
        className="w-full mt-8 py-4 rounded-xl font-bold text-white text-lg"
        style={{ background: '#e5484d' }}
      >
        Entendi - Quero Treinar
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
    recordAnswer(34, fb.isCorrect, newStreak)
    const isLast = newTotal >= 10
    if (isLast) recordSession(34, Math.round((newCorrect / newTotal) * 100))
    setFeedback({ ...fb, isLast })
  }

  function restart() {
    setSessionCorrect(0); setSessionTotal(0); setStreak(0)
    setSessionDone(false); setFeedback(null); setCurrentHand(null)
  }

  if (!currentHand && !sessionDone) newHand()

  if (sessionDone) {
    return <SessionReview moduleId={34} sessionCorrect={sessionCorrect} sessionTotal={sessionTotal} onContinue={restart} />
  }

  const cards = currentHand ? handToCards(currentHand) : []
  const pct = currentPos && currentStack ? getRangePct(currentPos, currentStack) : 0

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
        <div style={{ color: '#888', fontSize: 13 }}>Sessao: {sessionCorrect}/{sessionTotal} . Seq: {streak}</div>
        <div style={{ color: '#888', fontSize: 13 }}>Meta: 10 maos (90%+)</div>
      </div>
      <div className="rounded-full h-2 mb-6" style={{ background: '#2a2a2e' }}>
        <div className="rounded-full h-2 transition-all" style={{ width: `${(sessionTotal / 10) * 100}%`, background: '#e5484d' }} />
      </div>

      {currentPos && currentStack && (
        <div className="text-center mb-3">
          <div className="inline-block rounded-lg px-4 py-2" style={{ background: '#2a2a2e', border: '1px solid #e5484d' }}>
            <span style={{ color: '#f5a623', fontWeight: 700, fontSize: 16 }}>
              {currentPos} . {currentStack}bb . Range ~{pct}%
            </span>
          </div>
        </div>
      )}

      {currentPos && (
        <ModulePokerTable
          heroPos={currentPos}
          heroCards={cards}
          potLabel={`${currentStack}bb`}
          contextTitle={`${currentPos} . ${currentStack}bb`}
          contextDesc={currentPos === 'BTN'
            ? 'Todos foldaram ate voce. All-in ou fold?'
            : 'BTN foldou. SB vs BB - all-in ou fold?'}
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
          </div>
          {!feedback.isCorrect && (() => {
            const range = getSpinPushRange(currentPos, currentStack)
            const pushList = range?.push || []
            return (
              <RangeViewer
                customRange={{ push: pushList }}
                label={`Ver range push - ${currentPos} ${currentStack}bb`}
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

export default function Module34() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[34]?.lessonRead ? 'trainer' : 'lesson')

  if (!progress.modules[34]?.unlocked) {
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
          <button onClick={() => progress.modules[34]?.lessonRead && setView('trainer')} className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: view === 'trainer' ? '#e5484d' : '#1a1a1d', color: view === 'trainer' ? 'white' : (progress.modules[34]?.lessonRead ? '#888' : '#444'), border: '1px solid #2a2a2e', cursor: progress.modules[34]?.lessonRead ? 'pointer' : 'not-allowed' }}>
            Trainer {!progress.modules[34]?.lessonRead && '🔒'}
          </button>
        </div>
        {view === 'lesson' && <Lesson onComplete={() => { markLessonRead(34); setView('trainer') }} />}
        {view === 'trainer' && <Trainer />}
      </div>
    </div>
  )
}
