import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'
import SessionReview from '../../components/SessionReview'
import { SPIN_DEFENSE_RANGES, getSpinDefenseRange, isHandInSpinRange } from '../../data/spinRanges'
import Card, { handToCards } from '../../components/Card'
import RangeViewer from '../../components/RangeViewer'
import RangeBuilder from '../../components/RangeBuilder'
import ModulePokerTable from '../../components/ModulePokerTable'

const SPOTS = ['BB vs BTN', 'BB vs SB']
const SPOT_KEYS = { 'BB vs BTN': 'BB_vs_BTN', 'BB vs SB': 'BB_vs_SB' }
const STACKS = [25, 20, 15]

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

function randomHand(spotKey, stack) {
  const all = generateAllHands()
  const range = getSpinDefenseRange(spotKey, stack)
  if (!range) return all[Math.floor(Math.random() * all.length)]

  const threebetHands = [...(range.threebet || []), ...(range.threebet_shove || [])]
  const callHands = range.call || []
  const mixHands = range.mix || []
  const defendHands = [...threebetHands, ...callHands, ...mixHands]
  const foldHands = all.filter(h => !defendHands.includes(h))

  const dice = Math.random()
  if (dice < 0.25 && threebetHands.length > 0) {
    return threebetHands[Math.floor(Math.random() * threebetHands.length)]
  } else if (dice < 0.50 && callHands.length > 0) {
    return callHands[Math.floor(Math.random() * callHands.length)]
  } else if (dice < 0.60 && mixHands.length > 0) {
    return mixHands[Math.floor(Math.random() * mixHands.length)]
  }
  if (foldHands.length === 0) return all[Math.floor(Math.random() * all.length)]
  return foldHands[Math.floor(Math.random() * foldHands.length)]
}

function getCorrectAction(hand, range, stack) {
  if (!range) return 'fold'
  const threebetList = range.threebet || []
  const shoveList = range.threebet_shove || []
  const callList = range.call || []
  const mixList = range.mix || []

  if (threebetList.includes(hand)) return 'threebet'
  if (shoveList.includes(hand)) return 'threebet'
  if (callList.includes(hand)) return 'call'
  if (mixList.includes(hand)) return 'mix'
  return 'fold'
}

function getFeedback(hand, action, spotKey, stack) {
  const range = getSpinDefenseRange(spotKey, stack)
  const correctAction = getCorrectAction(hand, range, stack)
  const is15bb = stack === 15
  const spotLabel = spotKey === 'BB_vs_BTN' ? 'BB vs BTN' : 'BB vs SB'

  let isCorrect = false
  if (correctAction === 'threebet' && action === 'threebet') isCorrect = true
  else if (correctAction === 'call' && action === 'call') isCorrect = true
  else if (correctAction === 'fold' && action === 'fold') isCorrect = true
  else if (correctAction === 'mix') isCorrect = true

  let correctLabel = correctAction
  if (correctAction === 'threebet') correctLabel = is15bb ? 'SHOVE' : '3-BET'
  else if (correctAction === 'call') correctLabel = 'CALL'
  else if (correctAction === 'fold') correctLabel = 'FOLD'
  else if (correctAction === 'mix') correctLabel = 'MIX (qualquer acao aceitavel)'

  let reason = ''
  const rank1 = hand[0]

  if (correctAction === 'mix') {
    reason = `${hand} e uma mao de transicao (mix) em ${spotLabel} com ${stack}bb. Tanto 3-bet/call quanto fold sao aceitaveis — o solver divide entre as acoes.`
  } else if (correctAction === 'threebet') {
    if (hand.length === 2 && 'AKQJT'.includes(rank1)) {
      reason = `Par de ${rank1}s em ${spotLabel} com ${stack}bb — ${is15bb ? 'shove' : '3-bet'} obrigatorio. Par alto e premium para defesa agressiva.`
    } else if (rank1 === 'A' && hand.includes('s') && ['5','4','3','2'].some(r => hand.includes(r))) {
      reason = `${hand} em ${spotLabel} — ${is15bb ? 'shove' : '3-bet'} como bluff. Ases suited baixos sao 3-bet bluffs classicos: bloqueiam Ax do oponente e tem equity de nut flush.`
    } else {
      reason = `${hand} entra no range de ${is15bb ? 'shove' : '3-bet'} em ${spotLabel} com ${stack}bb. Mao forte o suficiente para reraizar por valor.`
    }
    if (is15bb) reason += ' Com 15bb, nao existe 3-bet pequeno — e shove ou call.'
  } else if (correctAction === 'call') {
    if (hand.length === 2) {
      reason = `Par de ${rank1}s em ${spotLabel} com ${stack}bb — call. Pares medios/baixos preferem ver flop barato ao inves de 3-bettar e enfrentar 4-bet.`
    } else if (hand.includes('s') && '89TJQ'.includes(hand[0]) && '56789T'.includes(hand[1])) {
      reason = `${hand} em ${spotLabel} — call. Suited connectors tem otima playabilidade pos-flop, mas nao sao fortes o suficiente para 3-bet por valor.`
    } else {
      reason = `${hand} em ${spotLabel} com ${stack}bb — call. A mao tem equity suficiente para defender, mas 3-bettar seria arriscado demais.`
    }
  } else {
    reason = `${hand} esta fora do range de defesa em ${spotLabel} com ${stack}bb. Folde — defender com essa mao queima chips a longo prazo.`
    if (spotKey === 'BB_vs_BTN') {
      reason += ' Apesar do BB defender ~59% vs BTN, essa mao nao tem equity suficiente.'
    } else {
      reason += ' Mesmo defendendo ~65% vs SB, essa mao e fraca demais OOP.'
    }
  }

  return { correct: correctLabel, isCorrect, reason }
}

function Lesson({ onComplete }) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        Modulo 33 — Spin & Go: Defesa do BB 3-Max
      </h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Como defender o Big Blind contra opens agressivos no Spin & Go</p>

      <div className="space-y-4">
        <Section title="Defendendo o BB no Spin">
          O BB e a <strong style={{ color: '#e5484d' }}>posicao mais atacada</strong> no Spin & Go. O BTN abre ~51% e o SB abre ~65% — voce vai enfrentar opens o tempo todo. Se voce folda demais, esta literalmente <strong style={{ color: '#f5a623' }}>jogando dinheiro fora</strong>. <br /><br />
          A boa noticia: voce ja tem 1bb investido e recebe odds de 2.5:1 pra chamar um min-raise. Isso significa que voce pode defender com maos que nao parecem incriveis.
        </Section>

        <Section title="BB vs BTN Open">
          O BTN abre ~51% das maos. Em resposta, o BB deve defender <strong style={{ color: '#4fce82' }}>~59%</strong> do tempo, combinando 3-bets e calls:
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #2a2a2e' }}>
              <div style={{ color: '#e5484d', fontWeight: 700, fontSize: 14 }}>3-Bet (~10%)</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>AA-TT, AKs-AJs, A5s-A3s, KQs, AKo-AQo</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #2a2a2e' }}>
              <div style={{ color: '#f5a623', fontWeight: 700, fontSize: 14 }}>Call (~49%)</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>99-22, suited broadway, connectors, Axo</div>
            </div>
          </div>
        </Section>

        <Section title="BB vs SB Open">
          O SB abre <strong style={{ color: '#f5a623' }}>~65%</strong> das maos no blind war. O BB responde defendendo <strong style={{ color: '#4fce82' }}>~65%</strong> com 3-bet + call mais wide:
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #2a2a2e' }}>
              <div style={{ color: '#e5484d', fontWeight: 700, fontSize: 14 }}>3-Bet (~14%)</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>AA-99, AKs-ATs, A5s-A2s, KQs-KJs, AKo-AJo</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #2a2a2e' }}>
              <div style={{ color: '#f5a623', fontWeight: 700, fontSize: 14 }}>Call (~51%)</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>88-22, suited Kx/Qx/Jx, connectors, muitos offsuit</div>
            </div>
          </div>
          <p style={{ color: '#888', fontSize: 13, marginTop: 8 }}>
            Contra o SB, seu range de 3-bet e call sao bem mais wide do que contra o BTN.
          </p>
        </Section>

        <Section title="3-Bet vs Call">
          Saber QUANDO 3-bettar vs chamar e crucial:
          <div className="mt-3 space-y-2">
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #2a2a2e' }}>
              <div style={{ color: '#e5484d', fontWeight: 600, fontSize: 13 }}>3-Bet por VALOR</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 2 }}>AA-TT, AKs-AJs, KQs, AKo-AQo — maos fortes que querem construir pote</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #2a2a2e' }}>
              <div style={{ color: '#e5484d', fontWeight: 600, fontSize: 13 }}>3-Bet como BLUFF</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 2 }}>A5s-A2s — bloqueiam Ax do oponente, tem equity de nut flush, e nao perdem muito se forem chamadas</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #2a2a2e' }}>
              <div style={{ color: '#f5a623', fontWeight: 600, fontSize: 13 }}>CALL</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 2 }}>Suited connectors (98s, 87s), pares medios (77-22), broadway medio (KJo, QTo) — maos com playabilidade mas sem forca pra 3-bet</div>
            </div>
          </div>
        </Section>

        <Section title="15bb: 3-Bet Vira Shove">
          Com <strong style={{ color: '#e5484d' }}>15bb</strong>, a dinamica muda completamente. Um 3-bet normal (3x o raise) consumiria ~40% do seu stack — voce fica pot-committed. <br /><br />
          A solucao GTO: <strong style={{ color: '#4fce82' }}>shove ou call</strong>. Nao existe 3-bet pequeno com 15bb. Se a mao e forte o suficiente pra 3-bettar, va all-in direto. Caso contrario, chame ou folde.
          <div className="mt-3 rounded-lg p-3" style={{ background: '#0f0f0f' }}>
            <div style={{ color: '#ccc', fontSize: 13 }}>
              Regra: com 15bb ou menos, substitua "3-bet" por "shove" mentalmente. AA-99, AK-AJs, KQs sao shoves automaticos.
            </div>
          </div>
        </Section>

        <Section title="Erros Comuns">
          <ul className="space-y-2" style={{ color: '#ccc', fontSize: 14 }}>
            <li>
              <strong style={{ color: '#e5484d' }}>Foldar demais no BB ({'>'} 50%)</strong> — se voce folda mais da metade, esta dando lucro gratis ao oponente. O BB ja tem 1bb investido, use isso.
            </li>
            <li>
              <strong style={{ color: '#e5484d' }}>Chamar com lixo OOP</strong> — defender nao significa chamar com qualquer coisa. 72o, 83o, J2o sao folds claros mesmo contra opens wide.
            </li>
            <li>
              <strong style={{ color: '#e5484d' }}>Nunca 3-bettar</strong> — se voce so chama e nunca 3-betta, o oponente sabe que seu range de call e capped (sem premium) e te explora pos-flop.
            </li>
            <li>
              <strong style={{ color: '#e5484d' }}>3-bet pequeno com 15bb</strong> — com stack curto, 3-bet pequeno te deixa pot-committed sem fold equity. Shove ou call.
            </li>
          </ul>
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
    const spotKey = SPOT_KEYS[spot]

    // BB vs SB nao tem stack 20 nos ranges, pular para 25 ou 15
    const range = getSpinDefenseRange(spotKey, stack)
    let finalStack = stack
    if (!range) {
      finalStack = stack >= 20 ? 25 : 15
    }

    setCurrentSpot(spot)
    setCurrentStack(finalStack)
    setCurrentHand(randomHand(SPOT_KEYS[spot], finalStack))
    setFeedback(null)
  }

  function answer(action) {
    if (!currentHand || feedback) return
    const spotKey = SPOT_KEYS[currentSpot]
    const fb = getFeedback(currentHand, action, spotKey, currentStack)
    const newStreak = fb.isCorrect ? streak + 1 : 0
    setStreak(newStreak)
    const newTotal = sessionTotal + 1
    const newCorrect = sessionCorrect + (fb.isCorrect ? 1 : 0)
    setSessionTotal(newTotal)
    setSessionCorrect(newCorrect)
    recordAnswer(33, fb.isCorrect, newStreak)
    const isLast = newTotal >= 10
    if (isLast) recordSession(33, Math.round((newCorrect / newTotal) * 100))
    setFeedback({ ...fb, isLast })
  }

  function restart() {
    setSessionCorrect(0); setSessionTotal(0); setStreak(0)
    setSessionDone(false); setFeedback(null); setCurrentHand(null)
  }

  if (!currentHand && !sessionDone) newHand()

  if (sessionDone) {
    return <SessionReview moduleId={33} sessionCorrect={sessionCorrect} sessionTotal={sessionTotal} onContinue={restart} />
  }

  const cards = currentHand ? handToCards(currentHand) : []
  const is15bb = currentStack === 15
  const openerLabel = currentSpot === 'BB vs BTN' ? 'BTN' : 'SB'
  const contextDesc = `${openerLabel} abriu min-raise. Voce e o BB. ${is15bb ? 'Shove, call ou fold?' : '3-bet, call ou fold?'}`

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
                {s}
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
        <ModulePokerTable
          heroPos="BB"
          heroCards={cards}
          potLabel={`${currentStack}bb`}
          contextTitle={`${currentSpot} · ${currentStack}bb · 3-Max`}
          contextDesc={contextDesc}
        />
      )}
      {currentHand && (
        <div className="text-center mb-4">
          <span style={{ color: '#888', fontSize: 14, fontFamily: 'Space Mono' }}>{currentHand}</span>
        </div>
      )}

      {!feedback && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <button onClick={() => answer('threebet')} className="py-5 rounded-xl font-bold text-lg" style={{ background: '#4fce82', color: '#0f0f0f' }}>
            {is15bb ? 'SHOVE' : '3-BET'}
          </button>
          <button onClick={() => answer('call')} className="py-5 rounded-xl font-bold text-lg" style={{ background: '#f5a623', color: '#0f0f0f' }}>
            CALL
          </button>
          <button onClick={() => answer('fold')} className="py-5 rounded-xl font-bold text-lg" style={{ background: '#e5484d', color: 'white' }}>
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
            Correto: <strong style={{ color: '#f5a623' }}>{feedback.correct}</strong>
          </div>
          {!feedback.isCorrect && (() => {
            const spotKey = SPOT_KEYS[currentSpot]
            const range = getSpinDefenseRange(spotKey, currentStack)
            const threebetList = [...(range?.threebet || []), ...(range?.threebet_shove || [])]
            const callList = range?.call || []
            const mixList = range?.mix || []
            return (
              <RangeViewer
                customRange={{ threebet: threebetList, call: callList, mix: mixList }}
                label={`Ver range defesa — ${currentSpot} ${currentStack}bb`}
                legend={[
                  ['threebet', is15bb ? 'Shove' : '3-Bet'],
                  ['call', 'Call'],
                  ['mix', 'Mix'],
                  ['fold', 'Fold']
                ]}
                highlightHand={currentHand}
              />
            )
          })()}
        </div>
      )}
    </div>
  )
}

function M33RangeBuilder() {
  const [spot, setSpot] = useState('BB vs BTN')
  const [stack, setStack] = useState(25)
  const spotKey = SPOT_KEYS[spot]
  const range = getSpinDefenseRange(spotKey, stack)
  const threebetList = [...(range?.threebet || []), ...(range?.threebet_shove || [])]
  const callList = range?.call || []
  const mixList = range?.mix || []
  const defendHands = [...threebetList, ...callList, ...mixList]
  const allHands = generateAllHands()
  const is15bb = stack === 15

  const correctRange = {
    threebet: threebetList,
    call: callList,
    fold: allHands.filter(h => !defendHands.includes(h)),
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h2 className="text-lg font-bold mb-4" style={{ color: '#fdfdfd' }}>Construa o Range de Defesa do BB</h2>
      <p className="text-sm mb-4" style={{ color: '#676671' }}>
        Selecione as maos que voce defenderia ({is15bb ? 'shove' : '3-bet'} ou call) nesse spot e stack no Spin & Go 3-max.
      </p>
      <div className="flex gap-3 mb-4 flex-wrap">
        <div>
          <label className="text-xs block mb-1" style={{ color: '#676671' }}>Spot</label>
          <div className="flex gap-1">
            {SPOTS.map(s => (
              <button key={s} onClick={() => setSpot(s)} className="px-2 py-1 rounded text-xs font-bold"
                style={{ background: spot === s ? '#e5484d' : '#222225', color: spot === s ? '#fdfdfd' : '#676671' }}>{s}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs block mb-1" style={{ color: '#676671' }}>Stack</label>
          <div className="flex gap-1">
            {STACKS.map(s => {
              const hasRange = !!getSpinDefenseRange(SPOT_KEYS[spot], s)
              return (
                <button key={s} onClick={() => hasRange && setStack(s)} className="px-2 py-1 rounded text-xs font-bold"
                  style={{
                    background: stack === s ? '#0a84d7' : '#222225',
                    color: stack === s ? '#fdfdfd' : (hasRange ? '#676671' : '#333'),
                    cursor: hasRange ? 'pointer' : 'not-allowed'
                  }}>{s}bb</button>
              )
            })}
          </div>
        </div>
      </div>
      <RangeBuilder
        correctRange={correctRange}
        actions={['threebet', 'call', 'fold']}
        title={`Range Defesa — ${spot} ${stack}bb`}
      />
    </div>
  )
}

export default function Module33() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[33]?.lessonRead ? 'trainer' : 'lesson')

  if (!progress.modules[33]?.unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f0f' }}>
        <div className="text-center">
          <div style={{ fontSize: 60 }}>🔒</div>
          <h2 style={{ color: 'white', fontSize: 22, fontWeight: 700, marginTop: 16 }}>Modulo Bloqueado</h2>
          <p style={{ color: '#888', marginTop: 8 }}>Complete o Modulo 32 com 90%+ em 2 sessoes para desbloquear.</p>
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
          <button onClick={() => progress.modules[33]?.lessonRead && setView('trainer')} className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: view === 'trainer' ? '#e5484d' : '#1a1a1d', color: view === 'trainer' ? 'white' : (progress.modules[33]?.lessonRead ? '#888' : '#444'), border: '1px solid #2a2a2e', cursor: progress.modules[33]?.lessonRead ? 'pointer' : 'not-allowed' }}>
            Trainer {!progress.modules[33]?.lessonRead && '🔒'}
          </button>
          <button onClick={() => progress.modules[33]?.lessonRead && setView('builder')} className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: view === 'builder' ? '#0a84d7' : '#1a1a1d', color: view === 'builder' ? 'white' : (progress.modules[33]?.lessonRead ? '#888' : '#444'), border: '1px solid #2a2a2e', cursor: progress.modules[33]?.lessonRead ? 'pointer' : 'not-allowed' }}>
            Range Builder {!progress.modules[33]?.lessonRead && '🔒'}
          </button>
        </div>
        {view === 'lesson' && <Lesson onComplete={() => { markLessonRead(33); setView('trainer') }} />}
        {view === 'trainer' && <Trainer />}
        {view === 'builder' && <M33RangeBuilder />}
      </div>
    </div>
  )
}
