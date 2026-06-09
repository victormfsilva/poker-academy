import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'
import { BLIND_WARS } from '../../data/ranges'
import Card, { handToCards } from '../../components/Card'
import RangeViewer from '../../components/RangeViewer'

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

// SB agindo vs BB
function getSBAction(hand) {
  if (BLIND_WARS.SB_raise.raise.includes(hand)) return 'raise'
  if (BLIND_WARS.SB_complete.raise.includes(hand)) return 'raise'
  if (BLIND_WARS.SB_complete.complete.includes(hand)) return 'complete'
  return 'fold'
}

// BB agindo vs SB complete
function getBBAction(hand) {
  if (BLIND_WARS.BB_vs_complete.bet.includes(hand)) return 'bet'
  return 'check'
}

function randomHandForScenario(scenario) {
  const all = generateAllHands()
  if (scenario === 'sb_vs_bb') {
    const options = [...BLIND_WARS.SB_raise.raise, ...BLIND_WARS.SB_complete.complete]
    const dice = Math.random()
    if (dice < 0.6 && options.length) return options[Math.floor(Math.random() * options.length)]
    const fold = all.filter(h => !options.includes(h))
    return fold[Math.floor(Math.random() * fold.length)]
  } else {
    const options = [...BLIND_WARS.BB_vs_complete.bet, ...all.filter(h => !BLIND_WARS.BB_vs_complete.bet.includes(h)).slice(0, 30)]
    return options[Math.floor(Math.random() * options.length)]
  }
}

function getFeedback(hand, action, scenario) {
  if (scenario === 'sb_vs_bb') {
    const correct = getSBAction(hand)
    const isCorrect = action === correct || (action === 'complete' && correct === 'complete') || (action === 'raise' && correct === 'raise') || (action === 'fold' && correct === 'fold')
    let reason = ''
    if (correct === 'raise') reason = `${hand} — raise do SB vs BB. Você tem posição relativa pré-flop mas será OOP pós-flop. Raise com mãos fortes o suficiente.`
    else if (correct === 'complete') reason = `${hand} — complete (limp) do SB. Mão com potencial mas não forte o suficiente para raise. Entre barato e veja o flop.`
    else reason = `${hand} — fold do SB. Mão fraca demais mesmo com desconto. Economize para situações melhores.`
    return { correct, isCorrect, reason }
  } else {
    const correct = getBBAction(hand)
    const isCorrect = action === correct
    let reason = ''
    if (correct === 'bet') reason = `${hand} — você está no BB, SB completou. Aposte para construir o pote com mão premium.`
    else reason = `${hand} — check no BB vs complete do SB. Veja o flop gratuitamente e jogue com base no board.`
    return { correct, isCorrect, reason }
  }
}

function Lesson({ onComplete }) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>⚔️ Módulo 5 — Blind Wars</h1>
      <p style={{ color: '#888', marginBottom: 24 }}>SB vs BB — o confronto mais frequente e complexo</p>
      <div className="space-y-4">
        <Section title="O que são Blind Wars?">
          Quando todos os outros jogadores foldaram, sobram apenas SB e BB. É um confronto direto entre dois jogadores, cada um com <strong style={{ color: '#e94560' }}>posições especiais</strong>: o SB age primeiro pré-flop mas <strong>perde a posição pós-flop</strong>. O BB age por último pré-flop mas tem posição pós-flop.
        </Section>
        <Section title="SB — Suas Opções">
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="rounded-lg p-3 text-center" style={{ background: '#0a0a0f', border: '1px solid #00d4aa' }}>
              <div style={{ color: '#00d4aa', fontWeight: 700 }}>FOLD</div>
              <div style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>Mãos fracas — não desperdice fichas</div>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: '#0a0a0f', border: '1px solid #f5a623' }}>
              <div style={{ color: '#f5a623', fontWeight: 700 }}>COMPLETE</div>
              <div style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>Mãos médias — entre barato</div>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: '#0a0a0f', border: '1px solid #e94560' }}>
              <div style={{ color: '#e94560', fontWeight: 700 }}>RAISE</div>
              <div style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>Mãos fortes — construa o pote</div>
            </div>
          </div>
        </Section>
        <Section title="Por Que Posição Importa Tanto Aqui?">
          O SB sempre age <strong style={{ color: '#e94560' }}>primeiro</strong> no flop, turn e river. Isso é uma <strong>desvantagem enorme</strong> — você revela informação sem saber o que o BB fará. Por isso o SB precisa de mãos mais fortes para chamar do que o BTN precisaria na mesma situação.
        </Section>
        <Section title="BB vs Complete do SB">
          Quando o SB completa, o BB pode apostar (squeeze) com mãos premium ou checar para ver o flop. Com mãos médias, prefira check — você já tem informação pelo complete do SB (range amplo).
        </Section>
        <Section title="BB vs Raise do SB">
          O SB levanta com range amplo (ele está tentando roubar). O BB pode defender muito — inclusive com 3-bet. Pense como se fosse BTN vs CO, mas com posição invertida no pós-flop.
        </Section>
        <Section title="Dica Prática">
          <ul className="space-y-1" style={{ color: '#ccc', fontSize: 14 }}>
            <li>⚡ SB com mãos medianas — complete, não folde de graça</li>
            <li>⚡ BB vs complete — check com a maioria, bet só com premium</li>
            <li>⚡ BB vs raise — defenda largo, o SB abusa com range amplo</li>
            <li>⚡ No pós-flop, o BB tem posição — use para controlar o pote</li>
          </ul>
        </Section>
      </div>
      <button onClick={onComplete} className="w-full mt-8 py-4 rounded-xl font-bold text-white text-lg" style={{ background: '#e94560' }}>
        Entendi — Quero Treinar ⚔️
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
  const [scenario, setScenario] = useState('sb_vs_bb')
  const [currentHand, setCurrentHand] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [sessionDone, setSessionDone] = useState(false)

  function newHand() { setCurrentHand(randomHandForScenario(scenario)); setFeedback(null) }

  function answer(action) {
    if (!currentHand || feedback) return
    const fb = getFeedback(currentHand, action, scenario)
    const newStreak = fb.isCorrect ? streak + 1 : 0
    setStreak(newStreak); setFeedback(fb)
    const newTotal = sessionTotal + 1, newCorrect = sessionCorrect + (fb.isCorrect ? 1 : 0)
    setSessionTotal(newTotal); setSessionCorrect(newCorrect)
    recordAnswer(5, fb.isCorrect, newStreak)
    if (newTotal >= 10) { recordSession(5, Math.round((newCorrect / newTotal) * 100)); setSessionDone(true) }
  }

  function restart() { setSessionCorrect(0); setSessionTotal(0); setStreak(0); setSessionDone(false); setFeedback(null); setCurrentHand(null) }

  if (!currentHand && !sessionDone) newHand()

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

  const cards = currentHand ? handToCards(currentHand) : []

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <div className="flex gap-2 mb-4">
        {[['sb_vs_bb', 'SB agindo'], ['bb_vs_complete', 'BB vs Complete']].map(([s, l]) => (
          <button key={s} onClick={() => { setScenario(s); setFeedback(null); setCurrentHand(null) }}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: scenario === s ? '#e94560' : '#12121a', color: scenario === s ? 'white' : '#888', border: '1px solid #1e1e2e' }}>
            {l}
          </button>
        ))}
      </div>

      <div className="rounded-xl p-3 mb-4 flex justify-between" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
        <div style={{ color: '#888', fontSize: 13 }}>Sessão: {sessionCorrect}/{sessionTotal} · Seq: {streak}</div>
        <div style={{ color: '#888', fontSize: 13 }}>Meta: 10 mãos</div>
      </div>
      <div className="rounded-full h-2 mb-6" style={{ background: '#1e1e2e' }}>
        <div className="rounded-full h-2 transition-all" style={{ width: `${(sessionTotal / 10) * 100}%`, background: '#e94560' }} />
      </div>

      <div className="rounded-xl p-4 mb-4 text-center" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
        <div style={{ color: '#888', fontSize: 12 }}>SITUAÇÃO</div>
        {scenario === 'sb_vs_bb'
          ? <><div style={{ color: '#e94560', fontSize: 18, fontWeight: 700 }}>Você é o SB</div><div style={{ color: '#ccc', fontSize: 13, marginTop: 2 }}>Todos foldaram. O que fazer vs BB?</div></>
          : <><div style={{ color: '#4a90e2', fontSize: 18, fontWeight: 700 }}>Você é o BB</div><div style={{ color: '#ccc', fontSize: 13, marginTop: 2 }}>SB completou. O que fazer?</div></>
        }
      </div>

      <div className="flex justify-center gap-4 mb-6">
        {cards.map((c, i) => <Card key={i} card={c} size="lg" />)}
      </div>
      {currentHand && <div className="text-center mb-4"><span style={{ color: '#888', fontSize: 14, fontFamily: 'Space Mono' }}>{currentHand}</span></div>}

      {!feedback && scenario === 'sb_vs_bb' && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[['fold', 'FOLD ✕', '#e94560', 'white'], ['complete', 'COMPLETE →', '#f5a623', '#0a0a0f'], ['raise', 'RAISE ↑', '#00d4aa', '#0a0a0f']].map(([a, l, bg, c]) => (
            <button key={a} onClick={() => answer(a)} className="py-4 rounded-xl font-bold text-sm" style={{ background: bg, color: c }}>{l}</button>
          ))}
        </div>
      )}
      {!feedback && scenario === 'bb_vs_complete' && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          {[['check', 'CHECK ✓', '#4a90e2', 'white'], ['bet', 'BET ↑', '#00d4aa', '#0a0a0f']].map(([a, l, bg, c]) => (
            <button key={a} onClick={() => answer(a)} className="py-5 rounded-xl font-bold text-xl" style={{ background: bg, color: c }}>{l}</button>
          ))}
        </div>
      )}

      {feedback && (
        <div className="rounded-xl p-4 mb-4" style={{ background: '#12121a', border: `2px solid ${feedback.isCorrect ? '#00d4aa' : '#e94560'}` }}>
          <div style={{ color: feedback.isCorrect ? '#00d4aa' : '#e94560', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{feedback.isCorrect ? '✓ Correto!' : '✗ Incorreto'}</div>
          <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>{feedback.reason}</div>
          <div style={{ color: '#555', fontSize: 12, marginTop: 8 }}>Correto: <strong style={{ color: '#f5a623' }}>{feedback.correct.toUpperCase()}</strong></div>
          {!feedback.isCorrect && (() => {
            if (scenario === 'sb_vs_bb') {
              return (
                <RangeViewer
                  customRange={{ raise: BLIND_WARS.SB_raise.raise, complete: BLIND_WARS.SB_complete.complete }}
                  label="Ver range SB vs BB"
                  legend={[['raise', 'Raise'], ['complete', 'Complete'], ['fold', 'Fold']]}
                  highlightHand={currentHand}
                />
              )
            }
            return (
              <RangeViewer
                customRange={{ raise: BLIND_WARS.BB_vs_complete.bet }}
                label="Ver range BB vs Complete"
                legend={[['raise', 'Bet'], ['fold', 'Check']]}
                highlightHand={currentHand}
              />
            )
          })()}
          <button onClick={newHand} className="w-full py-3 rounded-lg font-semibold mb-4" style={{ background: '#e94560', color: 'white', fontSize: 16 }}>Próxima Mão →</button>
        </div>
      )}
    </div>
  )
}

export default function Module5() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[5].lessonRead ? 'trainer' : 'lesson')
  if (!progress.modules[5].unlocked) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
      <div className="text-center"><div style={{ fontSize: 60 }}>🔒</div><h2 style={{ color: 'white', marginTop: 16 }}>Módulo Bloqueado</h2><p style={{ color: '#888', marginTop: 8 }}>Complete o Módulo 4 para desbloquear.</p></div>
    </div>
  )
  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setView('lesson')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'lesson' ? '#e94560' : '#12121a', color: view === 'lesson' ? 'white' : '#888', border: '1px solid #1e1e2e' }}>📖 Aula</button>
          <button onClick={() => progress.modules[5].lessonRead && setView('trainer')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'trainer' ? '#e94560' : '#12121a', color: view === 'trainer' ? 'white' : (progress.modules[5].lessonRead ? '#888' : '#444'), border: '1px solid #1e1e2e', cursor: progress.modules[5].lessonRead ? 'pointer' : 'not-allowed' }}>🎯 Trainer {!progress.modules[5].lessonRead && '🔒'}</button>
        </div>
        {view === 'lesson' ? <Lesson onComplete={() => { markLessonRead(5); setView('trainer') }} /> : <Trainer />}
      </div>
    </div>
  )
}
