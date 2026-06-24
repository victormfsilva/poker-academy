import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'
import SessionReview from '../../components/SessionReview'
import { BTN_VS_RFI } from '../../data/ranges'
import Card, { handToCards } from '../../components/Card'
import RangeViewer from '../../components/RangeViewer'
import RangeBuilder from '../../components/RangeBuilder'
import ModulePokerTable from '../../components/ModulePokerTable'

const RAISER_POSITIONS = ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO']
const RAISER_KEYS = { UTG: 'vsUTG', 'UTG+1': 'vsUTG+1', LJ: 'vsLJ', HJ: 'vsHJ', CO: 'vsCO' }

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
  const range = BTN_VS_RFI[key]
  if (!range) return 'fold'
  if (range.threebet?.includes(hand)) return '3bet'
  if (range.call?.includes(hand)) return 'call'
  return 'fold'
}

function randomHand(raisedFrom) {
  const all = generateAllHands()
  const dice = Math.random()
  const key = RAISER_KEYS[raisedFrom]
  const range = BTN_VS_RFI[key]
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

  const isEarly = raisedFrom === 'UTG' || raisedFrom === 'UTG+1'
  const isLate = raisedFrom === 'CO'

  if (correct === '3bet') {
    reason = `${hand} é forte o suficiente para 3-bet no BTN contra ${raisedFrom}. ${isEarly ? 'Mesmo contra range forte, você tem posição — 3-bet é lucrativo com mãos premium é blockers.' : 'Ele abriu de posição tardia — 3-bet para isolar é jogar IP com iniciativa.'}`
  } else if (correct === 'call') {
    reason = `${hand} merece call no BTN contra ${raisedFrom}. Você tem a melhor posição da mesa — jogar IP pos-flop compensa. ${isLate ? 'CO abriu mais largo, mas call ainda é melhor que 3-bet com essa mão especifica.' : 'Range dele é mais forte, mas posição compensa — chame é jogue bem pos-flop.'}`
  } else {
    reason = `${hand} deve ser foldada no BTN contra ${raisedFrom}. ${isEarly ? 'Ele abriu de posição cedo com range forte — mesmo no BTN com posição, essa mão não tem equity suficiente.' : 'Mesmo com a vantagem de posição, essa mão especifica não tem jogabilidade suficiente.'}`
  }

  return { correct, isCorrect, reason }
}

function Lesson({ onComplete }) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        BTN vs RFI — A Melhor Posicao da Mesa
      </h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Você sempre joga em posição no pos-flop — aproveite ao máximo</p>
      <div className="space-y-4">
        <Section title="Por Que o BTN é a Melhor Posicao?">
          O Button tem uma vantagem unica no poker:<br /><br />
          <strong style={{ color: '#4fce82' }}>Você SEMPRE age por ultimo no pos-flop.</strong><br /><br />
          Isso significa que você vê o que todos fazem antes de tomar sua decisão. Você pode:<br />
          - Controlar o tamanho do pote<br />
          - Fazer blefes mais eficientes<br />
          - Extrair mais valor com mãos fortes<br />
          - Realizar equity gratis em posição
        </Section>
        <Section title="Suas 3 Opcoes">
          <div className="grid grid-cols-3 gap-3 mt-2">
            <div className="rounded-lg p-3 text-center" style={{ background: '#0f0f0f', border: '1px solid #e5484d' }}>
              <div style={{ color: '#e5484d', fontWeight: 700 }}>FOLD</div>
              <div style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>Mao sem jogabilidade — mesmo IP não compensa</div>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: '#0f0f0f', border: '1px solid #4fce82' }}>
              <div style={{ color: '#4fce82', fontWeight: 700 }}>CALL</div>
              <div style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>Mao com equity — jogue IP é explore pos-flop</div>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: '#0f0f0f', border: '1px solid #f5a623' }}>
              <div style={{ color: '#f5a623', fontWeight: 700 }}>3-BET</div>
              <div style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>Mao premium ou blefe com blocker</div>
            </div>
          </div>
        </Section>
        <Section title="BTN Defende MUITO Mais">
          <p style={{ color: '#ccc', fontSize: 14, marginBottom: 12 }}>
            Comparando as posições defensivas, o BTN é de longe o que mais joga:
          </p>
          <div className="space-y-2">
            {[
              { label: 'SB', pct: '35-40%', reason: 'Pagou metade + sempre OOP' },
              { label: 'BB', pct: '55-60%', reason: 'Ja pagou preço total + fecha ação pre' },
              { label: 'BTN', pct: '45-55%', reason: 'Posicao absoluta — sempre IP pos-flop' },
            ].map(r => (
              <div key={r.label} className="flex gap-3 items-start rounded-lg p-3" style={{ background: '#0f0f0f' }}>
                <div style={{ color: '#e5484d', fontWeight: 700, width: 40, flexShrink: 0 }}>{r.label}</div>
                <div style={{ color: '#ccc', fontSize: 14 }}><strong>{r.pct}</strong> — {r.reason}</div>
              </div>
            ))}
          </div>
        </Section>
        <Section title="De Onde Vem o Raise Muda Tudo">
          <div className="space-y-2">
            {[
              { pos: 'UTG', desc: 'Range mais forte. BTN defende ~35% — só mãos com boa equity.' },
              { pos: 'LJ / HJ', desc: 'Range médio. BTN defende ~42-45% — muitos suited connectors entram.' },
              { pos: 'CO', desc: 'Range mais aberto. BTN defende ~50%+ — defend amplo, você tem posição.' },
            ].map(r => (
              <div key={r.pos} className="flex gap-3 items-start rounded-lg p-3" style={{ background: '#0f0f0f' }}>
                <div style={{ color: '#e5484d', fontWeight: 700, width: 65, flexShrink: 0 }}>{r.pos}</div>
                <div style={{ color: '#ccc', fontSize: 14 }}>{r.desc}</div>
              </div>
            ))}
          </div>
        </Section>
        <Section title="3-Bet no BTN: Isolar é Dominar">
          No BTN, 3-bet é poderoso porque:<br /><br />
          <strong style={{ color: '#4fce82' }}>Você isola o raiser é garante posição pos-flop.</strong><br />
          <strong style={{ color: '#f5a623' }}>Os blinds geralmente foldham, e você joga HU em posição.</strong><br /><br />
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #4fce82' }}>
              <div style={{ color: '#4fce82', fontWeight: 600, marginBottom: 4 }}>3-Bet de Valor</div>
              <div style={{ color: '#ccc', fontSize: 13 }}>AA, KK, QQ, JJ, TT, AKs, AQs — relanca porque sua mão e forte e você quer pote grande IP.</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #f5a623' }}>
              <div style={{ color: '#f5a623', fontWeight: 600, marginBottom: 4 }}>3-Bet Blefe</div>
              <div style={{ color: '#ccc', fontSize: 13 }}>A5s, A4s, A3s — blockers de AA/AK. Suited te da equity extra se chamarem. IP você navega melhor.</div>
            </div>
          </div>
        </Section>
      </div>
      <button onClick={onComplete} className="w-full mt-8 py-4 rounded-xl font-bold text-white text-lg" style={{ background: '#e5484d' }}>
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

const OPEN_SIZES = [2, 2.5, 3]
const STACK_SIZES = [100, 75, 50]

function Trainer() {
  const { progress, recordAnswer, recordSession } = useProgress()
  const [filterPos, setFilterPos] = useState('Todas')
  const [currentHand, setCurrentHand] = useState(null)
  const [currentRaiser, setCurrentRaiser] = useState(null)
  const [openSize, setOpenSize] = useState(2.5)
  const [stackSize, setStackSize] = useState(100)
  const [feedback, setFeedback] = useState(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [sessionDone, setSessionDone] = useState(false)

  function newHand() {
    if (sessionTotal >= 10) { setSessionDone(true); return }
    const positions = filterPos === 'Todas' ? RAISER_POSITIONS : [filterPos]
    const raiser = positions[Math.floor(Math.random() * positions.length)]
    setCurrentRaiser(raiser)
    setCurrentHand(randomHand(raiser))
    setOpenSize(OPEN_SIZES[Math.floor(Math.random() * OPEN_SIZES.length)])
    setStackSize(STACK_SIZES[Math.floor(Math.random() * STACK_SIZES.length)])
    setFeedback(null)
  }

  function answer(action) {
    if (!currentHand || feedback) return
    const fb = getFeedback(currentHand, action, currentRaiser)
    const newStreak = fb.isCorrect ? streak + 1 : 0
    setStreak(newStreak)
    const newTotal = sessionTotal + 1, newCorrect = sessionCorrect + (fb.isCorrect ? 1 : 0)
    setSessionTotal(newTotal); setSessionCorrect(newCorrect)
    recordAnswer(8, fb.isCorrect, newStreak)
    const isLast = newTotal >= 10
    if (isLast) recordSession(8, Math.round((newCorrect / newTotal) * 100))
    setFeedback({ ...fb, isLast })
  }

  function restart() { setSessionCorrect(0); setSessionTotal(0); setStreak(0); setSessionDone(false); setFeedback(null); setCurrentHand(null) }

  if (!currentHand && !sessionDone) newHand()

  if (sessionDone) {
    return <SessionReview moduleId={8} sessionCorrect={sessionCorrect} sessionTotal={sessionTotal} onContinue={restart} />
  }

  const cards = currentHand ? handToCards(currentHand) : []

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <div className="mb-4">
        <div style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>POSICAO DO RAISE</div>
        <div className="flex flex-wrap gap-2">
          {['Todas', ...RAISER_POSITIONS].map(p => (
            <button key={p} onClick={() => { setFilterPos(p); setFeedback(null); setCurrentHand(null) }}
              className="px-3 py-1 rounded-lg text-sm"
              style={{ background: filterPos === p ? '#e5484d' : '#1a1a1d', color: filterPos === p ? 'white' : '#888', border: '1px solid #2a2a2e' }}>
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-xl p-3 mb-4 flex justify-between" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
        <div style={{ color: '#888', fontSize: 13 }}>Sessão: {sessionCorrect}/{sessionTotal} · Seq: {streak}</div>
        <div style={{ color: '#888', fontSize: 13 }}>Meta: 10 mãos</div>
      </div>
      <div className="rounded-full h-2 mb-6" style={{ background: '#2a2a2e' }}>
        <div className="rounded-full h-2 transition-all" style={{ width: `${(sessionTotal / 10) * 100}%`, background: '#e5484d' }} />
      </div>
      {currentRaiser && (
        <ModulePokerTable
          heroPos="BTN"
          villainPos={currentRaiser}
          heroCards={cards}
          villainAction={`Raise ${openSize}x`}
          contextTitle={`BTN vs ${currentRaiser} · ${stackSize}bb efetivo`}
          contextDesc={`${currentRaiser} abriu ${openSize}x. O que fazer?`}
        />
      )}
      {currentHand && <div className="text-center mb-4"><span style={{ color: '#888', fontSize: 14, fontFamily: 'Space Mono' }}>{currentHand}</span></div>}
      {!feedback && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[['fold', 'FOLD', '#e5484d', 'white'], ['call', 'CALL', '#4a90e2', 'white'], ['3bet', '3-BET', '#f5a623', '#0f0f0f']].map(([action, label, bg, color]) => (
            <button key={action} onClick={() => answer(action)} className="py-4 rounded-xl font-bold" style={{ background: bg, color }}>{label}</button>
          ))}
        </div>
      )}
      {feedback && (
        <div className="rounded-xl p-4 mb-4" style={{ background: '#1a1a1d', border: `2px solid ${feedback.isCorrect ? '#4fce82' : '#e5484d'}` }}>
          <div style={{ color: feedback.isCorrect ? '#4fce82' : '#e5484d', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
            {feedback.isCorrect ? 'Correto!' : 'Incorreto'}
          </div>
          <button onClick={newHand} className="w-full py-3 rounded-lg font-semibold mb-4" style={{ background: '#e5484d', color: 'white', fontSize: 16 }}>Próxima Mao</button>
          <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>{feedback.reason}</div>
          <div style={{ color: '#555', fontSize: 12, marginTop: 8 }}>Correto: <strong style={{ color: '#f5a623' }}>{feedback.correct.toUpperCase()}</strong></div>
          {!feedback.isCorrect && (() => {
            const key = RAISER_KEYS[currentRaiser]
            const range = BTN_VS_RFI[key] || {}
            return (
              <RangeViewer
                customRange={{ threebet: range.threebet || [], call: range.call || [] }}
                label={`Ver range BTN vs ${currentRaiser}`}
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

function M8RangeBuilder() {
  const [raiser, setRaiser] = useState('UTG')
  const key = RAISER_KEYS[raiser]
  const range = BTN_VS_RFI[key] || {}
  const allHands = generateAllHands()
  const correctRange = {
    '3bet': range.threebet || [],
    call: range.call || [],
    fold: allHands.filter(h => !(range.threebet || []).includes(h) && !(range.call || []).includes(h)),
  }
  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="mb-4">
        <div style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>RAISER</div>
        <div className="flex flex-wrap gap-2">
          {RAISER_POSITIONS.map(p => (
            <button key={p} onClick={() => setRaiser(p)}
              className="px-3 py-1 rounded-lg text-sm"
              style={{ background: raiser === p ? '#e5484d' : '#1a1a1d', color: raiser === p ? 'white' : '#888', border: '1px solid #2a2a2e' }}>
              {p}
            </button>
          ))}
        </div>
      </div>
      <RangeBuilder correctRange={correctRange} actions={['3bet', 'call', 'fold']} title={`BTN vs ${raiser}`} />
    </div>
  )
}

export default function Module8() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[8]?.lessonRead ? 'trainer' : 'lesson')
  if (!progress.modules[8]?.unlocked) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f0f' }}>
      <div className="text-center"><div style={{ fontSize: 60 }}>🔒</div><h2 style={{ color: 'white', marginTop: 16 }}>Módulo Bloqueado</h2><p style={{ color: '#888', marginTop: 8 }}>Complete o Módulo 7 para desbloquear.</p></div>
    </div>
  )
  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0f0f0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setView('lesson')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'lesson' ? '#e5484d' : '#1a1a1d', color: view === 'lesson' ? 'white' : '#888', border: '1px solid #2a2a2e' }}>📖 Aula</button>
          <button onClick={() => progress.modules[8]?.lessonRead && setView('trainer')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'trainer' ? '#e5484d' : '#1a1a1d', color: view === 'trainer' ? 'white' : (progress.modules[8]?.lessonRead ? '#888' : '#444'), border: '1px solid #2a2a2e', cursor: progress.modules[8]?.lessonRead ? 'pointer' : 'not-allowed' }}>🎯 Trainer {!progress.modules[8]?.lessonRead && '🔒'}</button>
          <button onClick={() => progress.modules[8]?.lessonRead && setView('builder')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'builder' ? '#e5484d' : '#1a1a1d', color: view === 'builder' ? 'white' : (progress.modules[8]?.lessonRead ? '#888' : '#444'), border: '1px solid #2a2a2e', cursor: progress.modules[8]?.lessonRead ? 'pointer' : 'not-allowed' }}>🧩 Range Builder {!progress.modules[8]?.lessonRead && '🔒'}</button>
        </div>
        {view === 'lesson' && <Lesson onComplete={() => { markLessonRead(8); setView('trainer') }} />}
        {view === 'trainer' && <Trainer />}
        {view === 'builder' && <M8RangeBuilder />}
      </div>
    </div>
  )
}
