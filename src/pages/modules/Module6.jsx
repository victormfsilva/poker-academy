import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'
import { BTN_VS_RFI, SB_VS_RFI } from '../../data/ranges'
import Card, { handToCards } from '../../components/Card'
import RangeViewer from '../../components/RangeViewer'

const BTN_RAISERS = ['UTG', 'HJ', 'CO']
const SB_RAISERS = ['UTG', 'HJ', 'CO', 'BTN']
const BTN_KEYS = { UTG: 'vsUTG', HJ: 'vsHJ', CO: 'vsCO' }
const SB_KEYS = { UTG: 'vsUTG', HJ: 'vsHJ', CO: 'vsCO', BTN: 'vsBTN' }

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

function getAction(hand, myPos, raiserPos) {
  const range = myPos === 'BTN' ? BTN_VS_RFI[BTN_KEYS[raiserPos]] : SB_VS_RFI[SB_KEYS[raiserPos]]
  if (!range) return 'fold'
  if (range.threebet?.includes(hand)) return '3bet'
  if (range.call?.includes(hand)) return 'call'
  return 'fold'
}

function randomHand(myPos, raiserPos) {
  const all = generateAllHands()
  const range = myPos === 'BTN' ? BTN_VS_RFI[BTN_KEYS[raiserPos]] : SB_VS_RFI[SB_KEYS[raiserPos]]
  if (!range) return all[Math.floor(Math.random() * all.length)]
  const dice = Math.random()
  if (dice < 0.25 && range.threebet?.length) return range.threebet[Math.floor(Math.random() * range.threebet.length)]
  if (dice < 0.6 && range.call?.length) return range.call[Math.floor(Math.random() * range.call.length)]
  const all3bet = [...(range.threebet || []), ...(range.call || [])]
  const fold = all.filter(h => !all3bet.includes(h))
  return fold.length ? fold[Math.floor(Math.random() * fold.length)] : all[0]
}

function getFeedback(hand, action, myPos, raiserPos) {
  const correct = getAction(hand, myPos, raiserPos)
  const isCorrect = action === correct
  const isIP = myPos === 'BTN'
  let reason = ''
  if (correct === '3bet') reason = `${hand} — 3-bet do ${myPos} vs ${raiserPos}. Você ${isIP ? 'está IP (vantagem pós-flop) e' : 'será OOP mas'} tem mão forte o suficiente para reraiser.`
  else if (correct === 'call') reason = `${hand} — call do ${myPos} vs ${raiserPos}. ${isIP ? 'IP, você pode ver o flop e jogar com informação.' : 'Mesmo OOP, a mão tem equidade suficiente para defender.'}`
  else reason = `${hand} — fold do ${myPos} vs ${raiserPos}. ${isIP ? 'Mesmo IP, esta mão específica não tem equidade suficiente.' : 'OOP sem muito potencial — economize.'}`
  return { correct, isCorrect, reason }
}

function Lesson({ onComplete }) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>🃏 Módulo 6 — SB e BTN vs RFI</h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Como jogar quando alguém já abriu o pote</p>
      <div className="space-y-4">
        <Section title="BTN vs RFI — A Posição Mais Vantajosa">
          O Button está <strong style={{ color: '#00d4aa' }}>IP (em posição)</strong> em relação a todo mundo. Quando alguém abre e você chama ou re-raise no BTN, você vai agir depois no flop, turn e river. Isso vale muito — o BTN pode defender muito mais mãos que qualquer outra posição.
        </Section>
        <Section title="SB vs RFI — O Dilema">
          O SB paga metade do BB, mas está <strong style={{ color: '#e94560' }}>OOP (fora de posição)</strong> pós-flop. Isso é ruim. Por isso o SB precisa de mãos mais fortes para chamar do que o BTN precisaria. Se o SB vai chamar, muitas vezes vale mais fazer 3-bet para compensar a desvantagem posicional.
        </Section>
        <Section title="IP vs OOP — A Diferença Real">
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #00d4aa' }}>
              <div style={{ color: '#00d4aa', fontWeight: 600 }}>IP (BTN)</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Você age depois — vê o check/bet do adversário antes de decidir. Informação = poder.</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #e94560' }}>
              <div style={{ color: '#e94560', fontWeight: 600 }}>OOP (SB)</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Você age antes — revela informação sem saber o que o adversário fará. Desvantagem permanente.</div>
            </div>
          </div>
        </Section>
        <Section title="Quando 3-bet vs Quando Call">
          <ul className="space-y-2 mt-2" style={{ color: '#ccc', fontSize: 14 }}>
            <li><strong style={{ color: '#f5a623' }}>3-bet para valor:</strong> AA, KK, QQ, JJ, AKs, AKo — mãos que dominam o range do adversário</li>
            <li><strong style={{ color: '#4a90e2' }}>3-bet como semi-blefe:</strong> A5s, A4s, A3s — blockers que reduzem a chance do adversário ter AA/AK</li>
            <li><strong style={{ color: '#00d4aa' }}>Call:</strong> Mãos médias com bom potencial de pós-flop (suited connectors, pares médios, Ax suited)</li>
            <li><strong style={{ color: '#e94560' }}>Fold:</strong> Mãos sem equidade suficiente — mesmo IP, não defenda tudo</li>
          </ul>
        </Section>
        <Section title="Spots Mais Frequentes">
          Comece praticando os spots mais comuns: <strong style={{ color: '#00d4aa' }}>BTN vs CO</strong> e <strong style={{ color: '#00d4aa' }}>BTN vs HJ</strong>. São os que você vai enfrentar com mais frequência em torneios.
        </Section>
      </div>
      <button onClick={onComplete} className="w-full mt-8 py-4 rounded-xl font-bold text-white text-lg" style={{ background: '#e94560' }}>
        Entendi — Quero Treinar 🃏
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
  const [myPos, setMyPos] = useState('BTN')
  const [filterRaiser, setFilterRaiser] = useState('Todas')
  const [currentHand, setCurrentHand] = useState(null)
  const [currentRaiser, setCurrentRaiser] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [sessionDone, setSessionDone] = useState(false)

  const availableRaisers = myPos === 'BTN' ? BTN_RAISERS : SB_RAISERS

  function newHand() {
    const raisers = filterRaiser === 'Todas' ? availableRaisers : [filterRaiser]
    const raiser = raisers[Math.floor(Math.random() * raisers.length)]
    setCurrentRaiser(raiser)
    setCurrentHand(randomHand(myPos, raiser))
    setFeedback(null)
  }

  function answer(action) {
    if (!currentHand || feedback) return
    const fb = getFeedback(currentHand, action, myPos, currentRaiser)
    const newStreak = fb.isCorrect ? streak + 1 : 0
    setStreak(newStreak); setFeedback(fb)
    const newTotal = sessionTotal + 1, newCorrect = sessionCorrect + (fb.isCorrect ? 1 : 0)
    setSessionTotal(newTotal); setSessionCorrect(newCorrect)
    recordAnswer(6, fb.isCorrect, newStreak)
    if (newTotal >= 10) { recordSession(6, Math.round((newCorrect / newTotal) * 100)); setSessionDone(true) }
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
        {acc >= 90 && <p style={{ color: '#00d4aa', marginTop: 8 }}>Todos os módulos desbloqueados! Você está pronto! 🏆</p>}
        <button onClick={restart} className="mt-6 px-8 py-3 rounded-xl font-bold" style={{ background: '#e94560', color: 'white' }}>Nova Sessão</button>
      </div>
    )
  }

  const cards = currentHand ? handToCards(currentHand) : []

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <div className="flex gap-2 mb-4">
        {[['BTN', 'Jogar no BTN'], ['SB', 'Jogar no SB']].map(([p, l]) => (
          <button key={p} onClick={() => { setMyPos(p); setFilterRaiser('Todas'); setFeedback(null); setCurrentHand(null) }}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: myPos === p ? '#e94560' : '#12121a', color: myPos === p ? 'white' : '#888', border: '1px solid #1e1e2e' }}>
            {l}
          </button>
        ))}
      </div>
      <div className="mb-4">
        <div style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>POSIÇÃO DO RAISE</div>
        <div className="flex flex-wrap gap-2">
          {['Todas', ...availableRaisers].map(r => (
            <button key={r} onClick={() => { setFilterRaiser(r); setFeedback(null); setCurrentHand(null) }}
              className="px-3 py-1 rounded-lg text-sm"
              style={{ background: filterRaiser === r ? '#e94560' : '#12121a', color: filterRaiser === r ? 'white' : '#888', border: '1px solid #1e1e2e' }}>
              {r}
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
          <div style={{ color: myPos === 'BTN' ? '#00d4aa' : '#f5a623', fontSize: 20, fontWeight: 700 }}>
            Você está no {myPos} {myPos === 'BTN' ? '(IP ✓)' : '(OOP ⚠️)'}
          </div>
          <div style={{ color: '#ccc', fontSize: 14, marginTop: 4 }}>{currentRaiser} fez raise. O que fazer?</div>
        </div>
      )}

      <div className="flex justify-center gap-4 mb-6">
        {cards.map((c, i) => <Card key={i} card={c} size="lg" />)}
      </div>
      {currentHand && <div className="text-center mb-4"><span style={{ color: '#888', fontSize: 14, fontFamily: 'Space Mono' }}>{currentHand}</span></div>}

      {!feedback && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[['fold', 'FOLD ✕', '#e94560', 'white'], ['call', 'CALL →', '#4a90e2', 'white'], ['3bet', '3-BET ↑↑', '#f5a623', '#0a0a0f']].map(([a, l, bg, c]) => (
            <button key={a} onClick={() => answer(a)} className="py-4 rounded-xl font-bold text-sm" style={{ background: bg, color: c }}>{l}</button>
          ))}
        </div>
      )}

      {feedback && (
        <div className="rounded-xl p-4 mb-4" style={{ background: '#12121a', border: `2px solid ${feedback.isCorrect ? '#00d4aa' : '#e94560'}` }}>
          <div style={{ color: feedback.isCorrect ? '#00d4aa' : '#e94560', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{feedback.isCorrect ? '✓ Correto!' : '✗ Incorreto'}</div>
          <button onClick={newHand} className="w-full py-3 rounded-lg font-semibold mb-4" style={{ background: '#e94560', color: 'white', fontSize: 16 }}>Próxima Mão →</button>
          <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>{feedback.reason}</div>
          <div style={{ color: '#555', fontSize: 12, marginTop: 8 }}>Correto: <strong style={{ color: '#f5a623' }}>{feedback.correct.toUpperCase()}</strong></div>
          {!feedback.isCorrect && (() => {
            const rangeMap = myPos === 'BTN' ? BTN_VS_RFI : SB_VS_RFI
            const key = myPos === 'BTN' ? BTN_KEYS[currentRaiser] : SB_KEYS[currentRaiser]
            const range = rangeMap[key] || {}
            return (
              <RangeViewer
                customRange={{ threebet: range.threebet || [], call: range.call || [] }}
                label={`Ver range ${myPos} vs ${currentRaiser}`}
                legend={[['threebet', '3-Bet'], ['call', 'Call'], ['fold', 'Fold']]}
                highlightHand={currentHand}
              />
            )
          })()}
        </div>
      )}
    </div>
  )
}

export default function Module6() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[6].lessonRead ? 'trainer' : 'lesson')
  if (!progress.modules[6].unlocked) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
      <div className="text-center"><div style={{ fontSize: 60 }}>🔒</div><h2 style={{ color: 'white', marginTop: 16 }}>Módulo Bloqueado</h2><p style={{ color: '#888', marginTop: 8 }}>Complete o Módulo 5 para desbloquear.</p></div>
    </div>
  )
  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setView('lesson')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'lesson' ? '#e94560' : '#12121a', color: view === 'lesson' ? 'white' : '#888', border: '1px solid #1e1e2e' }}>📖 Aula</button>
          <button onClick={() => progress.modules[6].lessonRead && setView('trainer')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'trainer' ? '#e94560' : '#12121a', color: view === 'trainer' ? 'white' : (progress.modules[6].lessonRead ? '#888' : '#444'), border: '1px solid #1e1e2e', cursor: progress.modules[6].lessonRead ? 'pointer' : 'not-allowed' }}>🎯 Trainer {!progress.modules[6].lessonRead && '🔒'}</button>
        </div>
        {view === 'lesson' ? <Lesson onComplete={() => { markLessonRead(6); setView('trainer') }} /> : <Trainer />}
      </div>
    </div>
  )
}
