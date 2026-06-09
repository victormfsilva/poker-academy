import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'
import { BB_VS_RFI } from '../../data/ranges'
import Card, { handToCards } from '../../components/Card'
import RangeViewer from '../../components/RangeViewer'

const RAISER_POSITIONS = ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB']
const RAISER_KEYS = { UTG: 'vsUTG', 'UTG+1': 'vsUTG1', LJ: 'vsLJ', HJ: 'vsHJ', CO: 'vsCO', BTN: 'vsBTN', SB: 'vsSB' }

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

function getAction(hand, raisedFrom) {
  const key = RAISER_KEYS[raisedFrom]
  const range = BB_VS_RFI[key]
  if (!range) return 'fold'
  if (range.threebet?.includes(hand)) return '3bet'
  if (range.call?.includes(hand)) return 'call'
  return 'fold'
}

function randomHand(raisedFrom) {
  const all = generateAllHands()
  const dice = Math.random()
  const key = RAISER_KEYS[raisedFrom]
  const range = BB_VS_RFI[key]
  if (!range) return all[Math.floor(Math.random() * all.length)]
  if (dice < 0.3 && range.threebet?.length) return range.threebet[Math.floor(Math.random() * range.threebet.length)]
  if (dice < 0.6 && range.call?.length) return range.call[Math.floor(Math.random() * range.call.length)]
  const callAndThreebet = [...(range.call || []), ...(range.threebet || [])]
  const foldHands = all.filter(h => !callAndThreebet.includes(h))
  if (foldHands.length) return foldHands[Math.floor(Math.random() * foldHands.length)]
  return all[Math.floor(Math.random() * all.length)]
}

function getFeedback(hand, action, raisedFrom) {
  const correct = getAction(hand, raisedFrom)
  const isCorrect = action === correct
  let reason = ''

  if (correct === '3bet') {
    reason = `${hand} é forte o suficiente para 3-bet vs ${raisedFrom}. O raise adversário vem de uma posição ${raisedFrom === 'UTG' ? 'muito fechada' : 'razoável'}, então seu 3-bet tem muito valor.`
  } else if (correct === 'call') {
    reason = `${hand} está no range de defesa do BB vs ${raisedFrom}. Você já investiu 1bb — defend este call com pot odds favoráveis.`
  } else {
    reason = `${hand} está fora do range de defesa do BB contra raise de ${raisedFrom}. A posição do adversário é ${raisedFrom === 'BTN' || raisedFrom === 'CO' ? 'ampla, mas esta mão específica não tem equidade suficiente' : 'fechada, então o range adversário é forte'}.`
  }

  return { correct, isCorrect, reason }
}

function Lesson({ onComplete }) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>🛡️ Módulo 3 — BB vs RFI</h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Como defender o Big Blind contra raises</p>
      <div className="space-y-4">
        <Section title="Por Que BB é Posição Especial?">
          O BB já investiu 1 big blind obrigatório. Isso muda os pot odds — você precisa de <strong style={{ color: '#e94560' }}>menos equidade</strong> para defender do que em outras posições. Por isso o BB defende MUITO mais mãos que qualquer outra posição.
        </Section>
        <Section title="Suas 3 Opções no BB">
          <div className="grid grid-cols-3 gap-3 mt-2">
            <div className="rounded-lg p-3 text-center" style={{ background: '#0a0a0f', border: '1px solid #e94560' }}>
              <div style={{ color: '#e94560', fontWeight: 700 }}>FOLD</div>
              <div style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>Mãos fracas sem equidade</div>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: '#0a0a0f', border: "1px solid #00d4aa" }}>
              <div style={{ color: '#00d4aa', fontWeight: 700 }}>CALL</div>
              <div style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>Mãos com potencial de pós-flop</div>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: '#0a0a0f', border: '1px solid #f5a623' }}>
              <div style={{ color: '#f5a623', fontWeight: 700 }}>3-BET</div>
              <div style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>Mãos premium + blefes polarizados</div>
            </div>
          </div>
        </Section>
        <Section title="Quanto Defender Depende de Onde Vem o Raise">
          <div className="space-y-2 mt-2">
            {[
              { pos: 'UTG', desc: 'Range muito fechado — defenda menos, ele tem mãos fortes' },
              { pos: 'HJ/CO', desc: 'Range médio — defenda razoavelmente' },
              { pos: 'BTN/SB', desc: 'Range amplo — defenda muito mais, ele está forzando com mãos fracas' },
            ].map(r => (
              <div key={r.pos} className="flex gap-3 items-start">
                <div style={{ color: '#e94560', fontWeight: 600, width: 60, flexShrink: 0 }}>{r.pos}</div>
                <div style={{ color: '#ccc', fontSize: 14 }}>{r.desc}</div>
              </div>
            ))}
          </div>
        </Section>
        <Section title="BB vs RFI Multiway">
          Quando há múltiplos jogadores no pote (multiway), você precisa de mais equidade para continuar. Feche o range de call — priorize mãos que jogam bem em multiway: pares, suited connectors fortes.
        </Section>
        <Section title="3-bet no BB — Quando?">
          Use 3-bet com mãos premium (AA, KK, QQ, AKs/AKo) <strong style={{ color: '#00d4aa' }}>para valor</strong>, e com mãos de blocker como A5s, A4s, A2s <strong style={{ color: '#f5a623' }}>como semi-blefe</strong> (blockers contra AK, AA do adversário).
        </Section>
      </div>
      <button onClick={onComplete} className="w-full mt-8 py-4 rounded-xl font-bold text-white text-lg" style={{ background: '#e94560' }}>
        Entendi — Quero Treinar 🛡️
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
  const [currentHand, setCurrentHand] = useState(null)
  const [currentRaiser, setCurrentRaiser] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [sessionDone, setSessionDone] = useState(false)

  function newHand() {
    const positions = filterPos === 'Todas' ? RAISER_POSITIONS : [filterPos]
    const raiser = positions[Math.floor(Math.random() * positions.length)]
    setCurrentRaiser(raiser)
    setCurrentHand(randomHand(raiser))
    setFeedback(null)
  }

  function answer(action) {
    if (!currentHand || feedback) return
    const fb = getFeedback(currentHand, action, currentRaiser)
    const newStreak = fb.isCorrect ? streak + 1 : 0
    setStreak(newStreak)
    setFeedback(fb)
    const newTotal = sessionTotal + 1, newCorrect = sessionCorrect + (fb.isCorrect ? 1 : 0)
    setSessionTotal(newTotal); setSessionCorrect(newCorrect)
    recordAnswer(3, fb.isCorrect, newStreak)
    if (newTotal >= 10) { recordSession(3, Math.round((newCorrect / newTotal) * 100)); setSessionDone(true) }
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
      <div className="mb-4">
        <div style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>POSIÇÃO DO RAISE</div>
        <div className="flex flex-wrap gap-2">
          {['Todas', ...RAISER_POSITIONS].map(p => (
            <button key={p} onClick={() => { setFilterPos(p); setFeedback(null); setCurrentHand(null) }}
              className="px-3 py-1 rounded-lg text-sm"
              style={{ background: filterPos === p ? '#e94560' : '#12121a', color: filterPos === p ? 'white' : '#888', border: '1px solid #1e1e2e' }}>
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-xl p-3 mb-4 flex justify-between" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
        <div style={{ color: '#888', fontSize: 13 }}>Sessão: {sessionCorrect}/{sessionTotal} · Seq: {streak}</div>
        <div style={{ color: '#888', fontSize: 13 }}>Meta: 10 mãos</div>
      </div>
      <div className="rounded-full h-2 mb-6" style={{ background: '#1e1e2e' }}>
        <div className="rounded-full h-2 transition-all" style={{ width: `${(sessionTotal / 10) * 100}%`, background: '#e94560' }} />
      </div>
      {currentRaiser && (
        <div className="rounded-xl p-4 mb-4 text-center" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
          <div style={{ color: '#888', fontSize: 12 }}>SITUAÇÃO</div>
          <div style={{ color: '#e94560', fontSize: 22, fontWeight: 700 }}>Você está no BB</div>
          <div style={{ color: '#ccc', fontSize: 14, marginTop: 4 }}>{currentRaiser} fez raise. Todos foldaram. O que fazer?</div>
        </div>
      )}
      <div className="flex justify-center gap-4 mb-6">
        {cards.map((c, i) => <Card key={i} card={c} size="lg" />)}
      </div>
      {currentHand && <div className="text-center mb-4"><span style={{ color: '#888', fontSize: 14, fontFamily: 'Space Mono' }}>{currentHand}</span></div>}
      {!feedback && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[['fold', 'FOLD ✕', '#e94560', 'white'], ['call', 'CALL →', '#4a90e2', 'white'], ['3bet', '3-BET ↑↑', '#f5a623', '#0a0a0f']].map(([action, label, bg, color]) => (
            <button key={action} onClick={() => answer(action)} className="py-4 rounded-xl font-bold" style={{ background: bg, color }}>{label}</button>
          ))}
        </div>
      )}
      {feedback && (
        <div className="rounded-xl p-4 mb-4" style={{ background: '#12121a', border: `2px solid ${feedback.isCorrect ? '#00d4aa' : '#e94560'}` }}>
          <div style={{ color: feedback.isCorrect ? '#00d4aa' : '#e94560', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
            {feedback.isCorrect ? '✓ Correto!' : '✗ Incorreto'}
          </div>
          <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>{feedback.reason}</div>
          <div style={{ color: '#555', fontSize: 12, marginTop: 8 }}>Correto: <strong style={{ color: '#f5a623' }}>{feedback.correct.toUpperCase()}</strong></div>
          {!feedback.isCorrect && (() => {
            const key = RAISER_KEYS[currentRaiser]
            const range = BB_VS_RFI[key] || {}
            return (
              <RangeViewer
                customRange={{ threebet: range.threebet || [], call: range.call || [] }}
                label={`Ver range BB vs ${currentRaiser}`}
                legend={[['threebet', '3-Bet'], ['call', 'Call'], ['fold', 'Fold']]}
                highlightHand={currentHand}
              />
            )
          })()}
          <button onClick={newHand} className="mt-4 w-full py-3 rounded-lg font-semibold" style={{ background: '#1e1e2e', color: 'white' }}>Próxima Mão →</button>
        </div>
      )}
    </div>
  )
}

export default function Module3() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[3].lessonRead ? 'trainer' : 'lesson')
  if (!progress.modules[3].unlocked) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
      <div className="text-center"><div style={{ fontSize: 60 }}>🔒</div><h2 style={{ color: 'white', marginTop: 16 }}>Módulo Bloqueado</h2><p style={{ color: '#888', marginTop: 8 }}>Complete o Módulo 2 para desbloquear.</p></div>
    </div>
  )
  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setView('lesson')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'lesson' ? '#e94560' : '#12121a', color: view === 'lesson' ? 'white' : '#888', border: '1px solid #1e1e2e' }}>📖 Aula</button>
          <button onClick={() => progress.modules[3].lessonRead && setView('trainer')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'trainer' ? '#e94560' : '#12121a', color: view === 'trainer' ? 'white' : (progress.modules[3].lessonRead ? '#888' : '#444'), border: '1px solid #1e1e2e', cursor: progress.modules[3].lessonRead ? 'pointer' : 'not-allowed' }}>🎯 Trainer {!progress.modules[3].lessonRead && '🔒'}</button>
        </div>
        {view === 'lesson' ? <Lesson onComplete={() => { markLessonRead(3); setView('trainer') }} /> : <Trainer />}
      </div>
    </div>
  )
}
