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
    if (correct === 'raise') reason = `${hand} — atacar do SB vs BB. Você tem mão boa o suficiente para pressionar — construa o pote antes do flop.`
    else if (correct === 'complete') reason = `${hand} — entrar completando do SB. Mão com potencial mas não forte para atacar. Entre barato e veja as cartas do flop.`
    else reason = `${hand} — foldar do SB. Mão fraca demais mesmo pagando menos. Economize para uma mão melhor.`
    return { correct, isCorrect, reason }
  } else {
    const correct = getBBAction(hand)
    const isCorrect = action === correct
    let reason = ''
    if (correct === 'bet') reason = `${hand} — você está no BB e o SB só completou. Mão boa — aposte para construir o pote.`
    else reason = `${hand} — passe a vez no BB vs complete do SB. Veja o flop de graça e decida depois.`
    return { correct, isCorrect, reason }
  }
}

function Lesson({ onComplete }) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>⚔️ Módulo 5 — Duelo dos Blinds</h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Todos foldaram — só você e o outro blind restaram</p>
      <div className="space-y-4">
        <Section title="Quando Isso Acontece?">
          Às vezes todo mundo folda e sobram só o Small Blind e o Big Blind. É um confronto direto de dois jogadores. Parece simples, mas tem um detalhe importante: <strong style={{ color: '#e94560' }}>quem age primeiro antes do flop perde a vantagem depois dele</strong>. O SB fala primeiro antes das cartas comunitárias serem reveladas, mas depois do flop o BB sempre age por último — e agir por último é uma vantagem enorme.
        </Section>
        <Section title="Se Você é o Small Blind, Tem 3 Opções">
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="rounded-lg p-3 text-center" style={{ background: '#0a0a0f', border: '1px solid #e94560' }}>
              <div style={{ color: '#e94560', fontWeight: 700 }}>FOLD</div>
              <div style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>Mão muito fraca — desiste e pronto</div>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: '#0a0a0f', border: '1px solid #f5a623' }}>
              <div style={{ color: '#f5a623', fontWeight: 700 }}>COMPLETE</div>
              <div style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>Completa o valor do BB sem raise — entra barato para ver o flop</div>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: '#0a0a0f', border: '1px solid #00d4aa' }}>
              <div style={{ color: '#00d4aa', fontWeight: 700 }}>RAISE</div>
              <div style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>Mão boa — ataca para construir o pote</div>
            </div>
          </div>
        </Section>
        <Section title="Por Que o SB Precisa de Mãos Melhores?">
          O SB paga metade de uma ficha e age antes de todo mundo no flop. Isso parece ok, mas na prática você fica em desvantagem permanente depois que as cartas saem — age primeiro, revela informação, e o Big Blind pode reagir. Por isso o SB é mais seletivo e não entra fácil.
        </Section>
        <Section title="Se Você é o Big Blind e o SB Completou">
          Quando o SB entra sem atacar (só completa), o BB tem uma opção extra: apostar para pressionar. Com mãos boas, aposte. Com mãos medianas, passe a vez e veja o flop de graça — afinal, o SB que completou provavelmente não tem mão forte.
        </Section>
        <Section title="Se Você é o Big Blind e o SB Atacou">
          O SB ataca com um range bem variado nesse spot — ele está tentando roubar o pote com facilidade. Por isso o BB pode se defender com muitas mãos, inclusive relançando com as melhores. Não folde fácil.
        </Section>
        <Section title="Dicas Práticas">
          <ul className="space-y-1" style={{ color: '#ccc', fontSize: 14 }}>
            <li>⚡ SB com mão mediana — entre completando, não jogue fora de graça</li>
            <li>⚡ BB vs complete — passe a vez com a maioria, aposte só com mão boa</li>
            <li>⚡ BB vs ataque do SB — defenda bastante, ele está atacando com muitas mãos</li>
            <li>⚡ Depois do flop, o BB age por último — aproveite essa vantagem</li>
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

  function newHand() {
    if (feedback?.isLast) { setSessionDone(true); return }
    setCurrentHand(randomHandForScenario(scenario)); setFeedback(null)
  }

  function answer(action) {
    if (!currentHand || feedback) return
    const fb = getFeedback(currentHand, action, scenario)
    const newStreak = fb.isCorrect ? streak + 1 : 0
    setStreak(newStreak)
    const newTotal = sessionTotal + 1, newCorrect = sessionCorrect + (fb.isCorrect ? 1 : 0)
    setSessionTotal(newTotal); setSessionCorrect(newCorrect)
    recordAnswer(5, fb.isCorrect, newStreak)
    const isLast = newTotal >= 10
    if (isLast) recordSession(5, Math.round((newCorrect / newTotal) * 100))
    setFeedback({ ...fb, isLast })
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
