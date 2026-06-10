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
  if (correct === '3bet') reason = `${hand} — relance do ${myPos} vs ${raiserPos}. ${isIP ? 'Você age por último no flop e tem mão forte — aproveite para construir o pote.' : 'Mesmo agindo primeiro no flop, a mão é boa demais para só chamar — relance para pressionar.'}`
  else if (correct === 'call') reason = `${hand} — chame do ${myPos} vs ${raiserPos}. ${isIP ? 'Você age por último no flop — pode entrar e decidir depois com informação.' : 'Mesmo agindo primeiro no flop, a mão tem potencial suficiente para entrar.'}`
  else reason = `${hand} — folde do ${myPos} vs ${raiserPos}. ${isIP ? 'Mesmo com a vantagem de agir por último, essa mão específica não tem potencial suficiente.' : 'Agindo primeiro no flop sem boa mão — economize fichas.'}`
  return { correct, isCorrect, reason }
}

function Lesson({ onComplete }) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>🃏 Módulo 6 — BTN e SB Respondendo ao Raise</h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Alguém já atacou — e agora você está no BTN ou no SB. O que fazer?</p>
      <div className="space-y-4">
        <Section title="BTN — A Melhor Posição da Mesa">
          O Button (BTN) é a posição mais privilegiada do poker. Por quê? Porque depois do flop, o BTN age por último em todas as rodadas — vê o que todo mundo faz antes de decidir. <br /><br />
          Isso significa que quando alguém atacou antes de você e você está no BTN, pode entrar com muitas mãos diferentes — porque a vantagem de agir por último no flop compensa muito.
        </Section>
        <Section title="SB — O Dilema">
          O SB paga meia ficha obrigatória, o que parece uma vantagem (desconto). Mas tem um problema: depois que o flop sai, o SB age antes de todo mundo — não tem informação. <br /><br />
          Por isso o SB entra em confrontos com mãos mais fortes que o BTN. Às vezes até vale mais relançar (atacar de volta) do que só chamar, porque relançar pode fazer o adversário desistir — o que compensa a desvantagem de agir primeiro.
        </Section>
        <Section title="A Diferença de Agir Primeiro ou Por Último">
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #00d4aa' }}>
              <div style={{ color: '#00d4aa', fontWeight: 600 }}>BTN — age por último</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Você vê o que o adversário faz antes de decidir. É como jogar cartas com a mão aberta — você sabe mais que ele.</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #e94560' }}>
              <div style={{ color: '#e94560', fontWeight: 600 }}>SB — age primeiro</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Você decide no escuro — não sabe se o adversário vai apostar ou passar. Desvantagem em cada rodada.</div>
            </div>
          </div>
        </Section>
        <Section title="Quando Relançar e Quando Só Chamar">
          <ul className="space-y-2 mt-2" style={{ color: '#ccc', fontSize: 14 }}>
            <li><strong style={{ color: '#f5a623' }}>Relança com mão muito boa:</strong> AA, KK, QQ, JJ, AK — você quer o pote maior porque provavelmente tem a melhor mão</li>
            <li><strong style={{ color: '#4a90e2' }}>Relança com Ás médio (blefe inteligente):</strong> A5, A4, A3 do mesmo naipe — o Ás na sua mão reduz a chance do adversário ter mão forte</li>
            <li><strong style={{ color: '#00d4aa' }}>Só chama:</strong> Mãos médias com bom potencial (mãos conectadas do mesmo naipe, pares médios, Ás com naipe)</li>
            <li><strong style={{ color: '#e94560' }}>Folda:</strong> Mesmo no BTN, mãos muito fracas não valem a entrada</li>
          </ul>
        </Section>
        <Section title="Por Onde Começar?">
          Pratique primeiro os confrontos mais comuns: <strong style={{ color: '#00d4aa' }}>BTN vs CO</strong> e <strong style={{ color: '#00d4aa' }}>BTN vs HJ</strong>. São os que você vai encontrar toda hora nos torneios.
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
    if (sessionTotal >= 10) { setSessionDone(true); return }
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
    setStreak(newStreak)
    const newTotal = sessionTotal + 1, newCorrect = sessionCorrect + (fb.isCorrect ? 1 : 0)
    setSessionTotal(newTotal); setSessionCorrect(newCorrect)
    recordAnswer(6, fb.isCorrect, newStreak)
    const isLast = newTotal >= 10
    if (isLast) recordSession(6, Math.round((newCorrect / newTotal) * 100))
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
