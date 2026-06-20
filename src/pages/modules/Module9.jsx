import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'
import SessionReview from '../../components/SessionReview'
import { BB_VS_RFI, BTN_VS_RFI, SB_VS_RFI } from '../../data/ranges'
import Card, { handToCards } from '../../components/Card'
import RangeViewer from '../../components/RangeViewer'
import ModulePokerTable from '../../components/ModulePokerTable'

// Todas as combinações possíveis: [minha posição, posição do raiser]
const SPOTS = [
  { myPos: 'BB', raiser: 'UTG', key: 'vsUTG', data: BB_VS_RFI },
  { myPos: 'BB', raiser: 'LJ', key: 'vsLJ', data: BB_VS_RFI },
  { myPos: 'BB', raiser: 'HJ', key: 'vsHJ', data: BB_VS_RFI },
  { myPos: 'BB', raiser: 'CO', key: 'vsCO', data: BB_VS_RFI },
  { myPos: 'BB', raiser: 'BTN', key: 'vsBTN', data: BB_VS_RFI },
  { myPos: 'BB', raiser: 'SB', key: 'vsSB', data: BB_VS_RFI },
  { myPos: 'SB', raiser: 'UTG', key: 'vsUTG', data: SB_VS_RFI },
  { myPos: 'SB', raiser: 'LJ', key: 'vsLJ', data: SB_VS_RFI },
  { myPos: 'SB', raiser: 'HJ', key: 'vsHJ', data: SB_VS_RFI },
  { myPos: 'SB', raiser: 'CO', key: 'vsCO', data: SB_VS_RFI },
  { myPos: 'SB', raiser: 'BTN', key: 'vsBTN', data: SB_VS_RFI },
  { myPos: 'BTN', raiser: 'UTG', key: 'vsUTG', data: BTN_VS_RFI },
  { myPos: 'BTN', raiser: 'LJ', key: 'vsLJ', data: BTN_VS_RFI },
  { myPos: 'BTN', raiser: 'HJ', key: 'vsHJ', data: BTN_VS_RFI },
  { myPos: 'BTN', raiser: 'CO', key: 'vsCO', data: BTN_VS_RFI },
]

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

function getAction(hand, spot) {
  const range = spot.data[spot.key]
  if (!range) return 'fold'
  if (range.threebet?.includes(hand)) return '3bet'
  if (range.call?.includes(hand)) return 'call'
  return 'fold'
}

function randomSpot(filterMyPos) {
  const filtered = filterMyPos === 'Todas' ? SPOTS : SPOTS.filter(s => s.myPos === filterMyPos)
  return filtered[Math.floor(Math.random() * filtered.length)]
}

function randomHand(spot) {
  const all = generateAllHands()
  const range = spot.data[spot.key]
  if (!range) return all[Math.floor(Math.random() * all.length)]
  const dice = Math.random()
  // Peso maior pra 3-bet já que esse módulo foca nisso
  if (dice < 0.4 && range.threebet?.length) return range.threebet[Math.floor(Math.random() * range.threebet.length)]
  if (dice < 0.65 && range.call?.length) return range.call[Math.floor(Math.random() * range.call.length)]
  const played = [...(range.threebet || []), ...(range.call || [])]
  const foldHands = all.filter(h => !played.includes(h))
  if (foldHands.length) return foldHands[Math.floor(Math.random() * foldHands.length)]
  return all[Math.floor(Math.random() * all.length)]
}

function isBlocker(hand) {
  return hand.startsWith('A') && hand.endsWith('s') && ['A5s','A4s','A3s','A2s'].includes(hand)
}

function getFeedback(hand, action, spot) {
  const correct = getAction(hand, spot)
  const isCorrect = action === correct
  const isIP = spot.myPos === 'BTN'
  const isOOP = spot.myPos === 'SB' || spot.myPos === 'BB'
  let reason = ''

  if (correct === '3bet') {
    const isPremium = ['AA','KK','QQ','JJ','TT','AKs','AKo','AQs'].includes(hand)
    if (isPremium) {
      reason = `${hand} é 3-bet de VALOR do ${spot.myPos} vs ${spot.raiser}. Mao premium — construa o pote pre-flop. ${isIP ? 'Você joga IP, ainda melhor.' : 'Mesmo OOP, a mão é forte demais para só chamar.'}`
    } else if (isBlocker(hand)) {
      reason = `${hand} é 3-bet de BLEFE do ${spot.myPos} vs ${spot.raiser}. O As bloqueia AA e AK do adversário, e suited te dá equity extra. ${isOOP ? 'OOP você prefere 3-bet a call com essa mão — retoma iniciativa.' : 'IP você pode 3-bet light pra isolar.'}`
    } else {
      reason = `${hand} é 3-bet do ${spot.myPos} vs ${spot.raiser}. ${isIP ? 'Em posição, você pode 3-betar mais leve para isolar.' : 'Essa mão é forte o suficiente para relance nesse spot.'}`
    }
  } else if (correct === 'call') {
    reason = `${hand} merece call do ${spot.myPos} vs ${spot.raiser}. Boa equity mas não forte o suficiente para 3-bet nesse spot. ${isIP ? 'IP você realiza equity bem pos-flop.' : 'OOP é mais difícil, mas o preço justifica.'}`
  } else {
    reason = `${hand} deve ser foldada do ${spot.myPos} vs ${spot.raiser}. ${spot.raiser === 'UTG' || spot.raiser === 'LJ' ? 'Ele abriu de posição cedo com range forte — sua mão não tem equity suficiente.' : 'Sem equity nem jogabilidade suficiente nesse spot.'}`
  }

  return { correct, isCorrect, reason }
}

function Lesson({ onComplete }) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        3-Bet Ranges — Quando Relançar Pre-Flop
      </h1>
      <p style={{ color: '#888', marginBottom: 24 }}>O 3-bet é uma das armas mais poderosas do poker moderno</p>
      <div className="space-y-4">
        <Section title="O Que é 3-Bet?">
          No poker, as apostas pre-flop são numeradas:<br /><br />
          <strong style={{ color: '#888' }}>1-bet</strong> = blind (aposta obrigatoria)<br />
          <strong style={{ color: '#f5a623' }}>2-bet</strong> = raise (primeira abertura voluntaria)<br />
          <strong style={{ color: '#e5484d' }}>3-bet</strong> = re-raise (relance sobre o raise)<br /><br />
          Quando alguem faz raise e você relança, isso é um 3-bet. É uma jogada agressiva que mostra força — ou simula força.
        </Section>
        <Section title="2 Tipos de 3-Bet">
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="rounded-lg p-4" style={{ background: '#0f0f0f', border: '1px solid #4fce82' }}>
              <div style={{ color: '#4fce82', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>3-Bet de Valor</div>
              <div style={{ color: '#ccc', fontSize: 13, lineHeight: 1.6 }}>
                Mãos premium que QUEREM ser chamadas:<br />
                <strong>AA, KK, QQ, JJ, TT, AKs, AQs, AKo</strong><br /><br />
                Você relanca para construir pote com mão forte.
              </div>
            </div>
            <div className="rounded-lg p-4" style={{ background: '#0f0f0f', border: '1px solid #f5a623' }}>
              <div style={{ color: '#f5a623', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>3-Bet de Blefe</div>
              <div style={{ color: '#ccc', fontSize: 13, lineHeight: 1.6 }}>
                Mãos com blockers que PREFEREM fold:<br />
                <strong>A5s, A4s, A3s, A2s</strong><br /><br />
                O As bloqueia AA e AK do oponente. Suited dá equity de backup.
              </div>
            </div>
          </div>
        </Section>
        <Section title="Por Que Não 3-Betar So de Valor?">
          Se você só 3-beta com AA-QQ e AK, oponentes bons percebem rapidamente e:<br /><br />
          <div className="space-y-2">
            {[
              'Foldam sempre que você 3-beta (você não ganha valor)',
              '4-betam com blefe sabendo que você só tem premium',
              'Exploram sua previsibilidade pos-flop',
            ].map((t, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span style={{ color: '#e5484d' }}>✗</span>
                <span style={{ color: '#ccc', fontSize: 14 }}>{t}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #4fce82' }}>
            <div style={{ color: '#4fce82', fontSize: 13 }}>
              <strong>Range balanceado</strong> = valor + blefe juntos. O oponente nunca sabe se você tem AA ou A5s.
            </div>
          </div>
        </Section>
        <Section title="Sizing do 3-Bet">
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="rounded-lg p-3 text-center" style={{ background: '#0f0f0f', border: '1px solid #4a90e2' }}>
              <div style={{ color: '#4a90e2', fontWeight: 700 }}>IP (em posição)</div>
              <div style={{ color: 'white', fontSize: 28, fontWeight: 700, marginTop: 4 }}>3x</div>
              <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>Raise de 3bb → 3-bet 9bb</div>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: '#0f0f0f', border: '1px solid #e5484d' }}>
              <div style={{ color: '#e5484d', fontWeight: 700 }}>OOP (fora de posição)</div>
              <div style={{ color: 'white', fontSize: 28, fontWeight: 700, marginTop: 4 }}>4x</div>
              <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>Raise de 3bb → 3-bet 12bb</div>
            </div>
          </div>
          <div style={{ color: '#888', fontSize: 13, marginTop: 8 }}>
            OOP você faz maior para compensar a desvantagem posicional e desencorajar calls.
          </div>
        </Section>
        <Section title="Posicao Muda Tudo">
          <div className="space-y-2">
            {[
              { pos: 'BTN', desc: '3-bet range mais largo. Você isola o raiser e joga IP. Pode 3-betar blefe com mais mãos.' },
              { pos: 'SB', desc: '3-bet range médio. OOP mas retoma iniciativa. Prefira 3-bet a call com mãos marginais.' },
              { pos: 'BB', desc: '3-bet range mais seletivo. Ja pagou o blind, pode chamar com mais mãos. 3-bet só com premium e blockers.' },
            ].map(r => (
              <div key={r.pos} className="flex gap-3 items-start rounded-lg p-3" style={{ background: '#0f0f0f' }}>
                <div style={{ color: '#e5484d', fontWeight: 700, width: 40, flexShrink: 0 }}>{r.pos}</div>
                <div style={{ color: '#ccc', fontSize: 14 }}>{r.desc}</div>
              </div>
            ))}
          </div>
        </Section>
        <Section title="E Se Levarem 4-Bet?">
          Apos seu 3-bet, o oponente pode fazer 4-bet. O que fazer?<br /><br />
          <div className="space-y-2">
            {[
              { hand: 'AA, KK', action: '5-bet all-in', color: '#4fce82' },
              { hand: 'QQ, AKs', action: 'Call a 4-bet (depende do tamanho)', color: '#4a90e2' },
              { hand: 'JJ, TT, AQs', action: 'Call ou fold (depende do oponente)', color: '#f5a623' },
              { hand: 'A5s, A4s (blefes)', action: 'Fold — já cumpriram seu papel', color: '#e5484d' },
            ].map(r => (
              <div key={r.hand} className="flex gap-3 items-start rounded-lg p-3" style={{ background: '#0f0f0f' }}>
                <div style={{ color: r.color, fontWeight: 600, width: 130, flexShrink: 0, fontSize: 13 }}>{r.hand}</div>
                <div style={{ color: '#ccc', fontSize: 14 }}>{r.action}</div>
              </div>
            ))}
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

function Trainer() {
  const { progress, recordAnswer, recordSession } = useProgress()
  const [filterPos, setFilterPos] = useState('Todas')
  const [currentHand, setCurrentHand] = useState(null)
  const [currentSpot, setCurrentSpot] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [sessionDone, setSessionDone] = useState(false)

  const [openSize, setOpenSize] = useState(2.5)
  const [stackSize, setStackSize] = useState(100)

  function newHand() {
    if (sessionTotal >= 10) { setSessionDone(true); return }
    const spot = randomSpot(filterPos)
    setCurrentSpot(spot)
    setCurrentHand(randomHand(spot))
    setOpenSize([2, 2.5, 3][Math.floor(Math.random() * 3)])
    setStackSize([100, 75, 50][Math.floor(Math.random() * 3)])
    setFeedback(null)
  }

  function answer(action) {
    if (!currentHand || feedback) return
    const fb = getFeedback(currentHand, action, currentSpot)
    const newStreak = fb.isCorrect ? streak + 1 : 0
    setStreak(newStreak)
    const newTotal = sessionTotal + 1, newCorrect = sessionCorrect + (fb.isCorrect ? 1 : 0)
    setSessionTotal(newTotal); setSessionCorrect(newCorrect)
    recordAnswer(9, fb.isCorrect, newStreak)
    const isLast = newTotal >= 10
    if (isLast) recordSession(9, Math.round((newCorrect / newTotal) * 100))
    setFeedback({ ...fb, isLast })
  }

  function restart() { setSessionCorrect(0); setSessionTotal(0); setStreak(0); setSessionDone(false); setFeedback(null); setCurrentHand(null) }

  if (!currentHand && !sessionDone) newHand()

  if (sessionDone) {
    return <SessionReview moduleId={9} sessionCorrect={sessionCorrect} sessionTotal={sessionTotal} onContinue={restart} />
  }

  const cards = currentHand ? handToCards(currentHand) : []

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <div className="mb-4">
        <div style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>SUA POSICAO</div>
        <div className="flex flex-wrap gap-2">
          {['Todas', 'BB', 'SB', 'BTN'].map(p => (
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
      {currentSpot && (
        <ModulePokerTable
          heroPos={currentSpot.myPos}
          villainPos={currentSpot.raiser}
          heroCards={cards}
          villainAction={`Raise ${openSize}x`}
          contextTitle={`${currentSpot.myPos} vs ${currentSpot.raiser} · ${stackSize}bb efetivo`}
          contextDesc={`${currentSpot.raiser} abriu ${openSize}x. O que fazer?`}
          textureTags={[currentSpot.myPos === 'BTN' ? 'IP' : 'OOP']}
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
          {!feedback.isCorrect && currentSpot && (() => {
            const range = currentSpot.data[currentSpot.key] || {}
            return (
              <RangeViewer
                customRange={{ threebet: range.threebet || [], call: range.call || [] }}
                label={`Ver range ${currentSpot.myPos} vs ${currentSpot.raiser}`}
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

export default function Module9() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[9]?.lessonRead ? 'trainer' : 'lesson')
  if (!progress.modules[9]?.unlocked) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f0f' }}>
      <div className="text-center"><div style={{ fontSize: 60 }}>🔒</div><h2 style={{ color: 'white', marginTop: 16 }}>Módulo Bloqueado</h2><p style={{ color: '#888', marginTop: 8 }}>Complete o Módulo 8 para desbloquear.</p></div>
    </div>
  )
  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0f0f0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setView('lesson')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'lesson' ? '#e5484d' : '#1a1a1d', color: view === 'lesson' ? 'white' : '#888', border: '1px solid #2a2a2e' }}>Aula</button>
          <button onClick={() => progress.modules[9]?.lessonRead && setView('trainer')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'trainer' ? '#e5484d' : '#1a1a1d', color: view === 'trainer' ? 'white' : (progress.modules[9]?.lessonRead ? '#888' : '#444'), border: '1px solid #2a2a2e', cursor: progress.modules[9]?.lessonRead ? 'pointer' : 'not-allowed' }}>Trainer {!progress.modules[9]?.lessonRead && '🔒'}</button>
        </div>
        {view === 'lesson' ? <Lesson onComplete={() => { markLessonRead(9); setView('trainer') }} /> : <Trainer />}
      </div>
    </div>
  )
}
