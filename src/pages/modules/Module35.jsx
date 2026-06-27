import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'
import SessionReview from '../../components/SessionReview'
import Card, { handToCards } from '../../components/Card'
import RangeViewer from '../../components/RangeViewer'
import ModulePokerTable from '../../components/ModulePokerTable'
import {
  SPIN_OPEN_RANGES,
  SPIN_HU_RANGES,
  getSpinOpenRange,
  getSpinHURange,
  isHandInSpinRange
} from '../../data/spinRanges'

const MODES = ['3-Max', 'Heads-Up']
const STACKS = [25, 15]

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

function getScenario(mode, stack) {
  if (mode === '3-Max') {
    const positions = ['BTN', 'SB']
    const pos = positions[Math.floor(Math.random() * positions.length)]
    const range = getSpinOpenRange(pos, stack)
    return { pos, range, rangeType: 'open', label: `${pos} Open 3-Max` }
  } else {
    const spots = ['SB_open', 'BB_defense']
    const spot = spots[Math.floor(Math.random() * spots.length)]
    const range = getSpinHURange(spot, stack)
    const posLabel = spot === 'SB_open' ? 'SB' : 'BB'
    return { pos: posLabel, range, rangeType: spot, label: `${posLabel} ${spot === 'SB_open' ? 'Open' : 'Defense'} HU` }
  }
}

function getRangeActions(rangeType, stack) {
  if (rangeType === 'BB_defense') {
    if (stack <= 15) return ['SHOVE', 'CALL', 'FOLD']
    return ['3-BET', 'CALL', 'FOLD']
  }
  if (stack <= 15 && rangeType === 'SB_open') {
    return ['SHOVE', 'RAISE', 'FOLD']
  }
  return ['RAISE', 'FOLD']
}

function randomHand(range) {
  const all = generateAllHands()
  const inRange = []
  for (const key of ['raise', 'push', 'threebet', 'threebet_shove', 'call', 'mix']) {
    if (range && range[key]) inRange.push(...range[key])
  }

  const dice = Math.random()
  if (dice < 0.5 && inRange.length > 0) {
    return inRange[Math.floor(Math.random() * inRange.length)]
  }
  const outRange = all.filter(h => !inRange.includes(h))
  return outRange[Math.floor(Math.random() * outRange.length)]
}

function getRangePct(range) {
  if (!range) return 0
  let count = 0
  for (const key of ['raise', 'push', 'threebet', 'threebet_shove', 'call', 'mix']) {
    if (range[key]) count += range[key].length
  }
  const total = generateAllHands().length
  return Math.round((count / total) * 100)
}

function getCorrectAction(hand, range, rangeType, stack) {
  if (!range) return 'fold'
  const result = isHandInSpinRange(hand, range)

  if (result.action === 'fold') return 'fold'
  if (result.action === 'mix') return 'raise'

  if (rangeType === 'BB_defense') {
    if (result.action === 'threebet' || result.action === 'threebet_shove') {
      return stack <= 15 ? 'shove' : '3bet'
    }
    if (result.action === 'call') return 'call'
    return 'fold'
  }

  if (result.action === 'raise' || result.action === 'push') {
    if (stack <= 15 && rangeType === 'SB_open') return 'shove'
    return 'raise'
  }

  return 'fold'
}

function mapUserAction(action) {
  const map = {
    'RAISE': 'raise',
    'SHOVE': 'shove',
    '3-BET': '3bet',
    'CALL': 'call',
    'FOLD': 'fold'
  }
  return map[action] || action.toLowerCase()
}

function getFeedback(hand, userAction, scenario, mode, stack) {
  const { range, rangeType, pos } = scenario
  const correct = getCorrectAction(hand, range, rangeType, stack)
  const mapped = mapUserAction(userAction)

  const isCorrect = mapped === correct
    || (mapped === 'raise' && correct === 'shove')
    || (mapped === 'shove' && correct === 'raise')
    || (mapped === '3bet' && correct === 'shove')
    || (mapped === 'shove' && correct === '3bet')

  const rangePct = getRangePct(range)
  let reason = ''

  const modeLabel = mode === '3-Max' ? '3-max' : 'heads-up'
  const posLabel = pos

  if (correct === 'fold') {
    reason = `${hand} esta fora do range de ${posLabel} em ${modeLabel} com ${stack}bb (~${rangePct}%). Folde e espere uma oportunidade melhor.`
  } else if (correct === 'raise' || correct === 'shove') {
    reason = `${hand} entra no range de open/push do ${posLabel} em ${modeLabel} com ${stack}bb (~${rangePct}%).`
    if (correct === 'shove') reason += ' Com esse stack, shove e a jogada correta - mais pressao que min-raise.'
  } else if (correct === 'call') {
    reason = `${hand} e um call do ${posLabel} em ${modeLabel} com ${stack}bb. Mao boa o suficiente para defender, mas nao para 3-bet.`
  } else if (correct === '3bet') {
    reason = `${hand} e 3-bet/shove do ${posLabel} em ${modeLabel} com ${stack}bb. Mao premium que merece reraise.`
  }

  // Comparison between modes
  if (mode === '3-Max') {
    const huRange = getSpinHURange(rangeType === 'open' ? 'SB_open' : 'BB_defense', stack)
    const huPct = getRangePct(huRange)
    const huResult = isHandInSpinRange(hand, huRange)
    if (huResult.inRange && correct === 'fold') {
      reason += ` Curiosidade: essa mesma mao ENTRARIA no range em HU (~${huPct}%), onde os ranges sao bem mais wide.`
    } else if (!huResult.inRange && correct !== 'fold') {
      reason += ` Nota: em 3-max, essa mao entra. Mas em HU os ranges sao ainda mais wide (~${huPct}%).`
    } else {
      reason += ` Em HU, o range do mesmo spot seria ~${huPct}% - ${huPct > rangePct ? 'bem mais wide' : 'similar'}.`
    }
  } else {
    const pos3max = scenario.rangeType === 'SB_open' ? 'SB' : 'BTN'
    const triRange = getSpinOpenRange(pos3max, stack)
    const triPct = getRangePct(triRange)
    const triResult = isHandInSpinRange(hand, triRange)
    if (!triResult.inRange && correct !== 'fold') {
      reason += ` Em 3-max, essa mao seria FOLD no ${pos3max} (~${triPct}%). HU permite muito mais agressividade.`
    } else {
      reason += ` Em 3-max, o range do ${pos3max} seria ~${triPct}% - ${triPct < rangePct ? 'mais tight' : 'similar'}.`
    }
  }

  return { correct, isCorrect, reason }
}

function Lesson({ onComplete }) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        Modulo 35 - Spin & Go: Transicao 3-Max para HU
      </h1>
      <p style={{ color: '#888', marginBottom: 24 }}>
        Quando um jogador cai, o jogo muda completamente. Adapte ou perca EV.
      </p>

      <div className="space-y-4">
        <Section title="Quando Vira HU">
          No Spin & Go 3-max, quando 1 jogador e eliminado, o jogo vira{' '}
          <strong style={{ color: '#e5484d' }}>heads-up instantaneamente</strong>.
          Esse e o momento mais critico do Spin: quem nao ajusta os ranges perde
          uma quantidade enorme de EV. O jogo muda de "3 jogadores disputando" para
          "guerra direta entre 2".
          <div className="mt-3 rounded-lg p-3" style={{ background: '#0f0f0f' }}>
            <div style={{ color: '#ccc', fontSize: 13 }}>
              A maioria dos jogadores nao ajusta. Se voce ajustar, ja tem edge sobre o field.
            </div>
          </div>
        </Section>

        <Section title="Ranges Explodem">
          A mudanca mais dramatica e nos ranges de abertura:
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #2a2a2e' }}>
              <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>3-MAX (25bb)</div>
              <div style={{ color: '#e5484d', fontWeight: 700 }}>SB Open: ~65%</div>
              <div style={{ color: '#888', fontSize: 12 }}>BTN Open: ~51%</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #4fce82' }}>
              <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>HEADS-UP (25bb)</div>
              <div style={{ color: '#4fce82', fontWeight: 700 }}>SB Open: ~80%+</div>
              <div style={{ color: '#888', fontSize: 12 }}>Quase tudo entra</div>
            </div>
          </div>
          <p style={{ color: '#888', fontSize: 13, marginTop: 8 }}>
            Em HU, o SB (que e o BTN) abre mais de 80% das maos. Maos como K4o, Q5o,
            J6s que seriam fold em 3-max viram raises automaticos.
          </p>
        </Section>

        <Section title="BB Defende Mais">
          Se o SB abre mais, o BB precisa defender mais tambem. Caso contrario,
          o SB lucra demais so roubando blinds.
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #2a2a2e' }}>
              <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>BB Defense 3-Max</div>
              <div style={{ color: '#f5a623', fontWeight: 700 }}>~59%</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #4fce82' }}>
              <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>BB Defense HU</div>
              <div style={{ color: '#4fce82', fontWeight: 700 }}>~70%</div>
            </div>
          </div>
          <p style={{ color: '#888', fontSize: 13, marginTop: 8 }}>
            Em HU, o BB defende com maos como T7o, 86s, K5o que seriam fold em 3-max.
          </p>
        </Section>

        <Section title="A Importancia de Se Adaptar">
          <div style={{ color: '#e5484d', fontWeight: 600, marginBottom: 8 }}>
            Quem nao ajusta ranges pra HU perde MUITO EV
          </div>
          <ul className="space-y-2" style={{ color: '#ccc', fontSize: 14 }}>
            <li>
              <strong style={{ color: '#f5a623' }}>SB nao abre wide o suficiente:</strong>{' '}
              esta deixando dinheiro na mesa. O BB folda muito - explore isso.
            </li>
            <li>
              <strong style={{ color: '#f5a623' }}>BB nao defende o suficiente:</strong>{' '}
              esta dando lucro gratis pro SB. Voce precisa defender ~70% ou mais.
            </li>
            <li>
              <strong style={{ color: '#f5a623' }}>Mentalidade de 3-max em HU:</strong>{' '}
              se voce joga HU com ranges de 3-max, esta jogando MUITO tight. E como
              foldar dinheiro toda mao.
            </li>
          </ul>
        </Section>

        <Section title="Stack Short em HU">
          Com <strong style={{ color: '#e5484d' }}>15bb em HU</strong>, a dinamica muda
          novamente:
          <ul className="space-y-2 mt-2" style={{ color: '#ccc', fontSize: 14 }}>
            <li>3-bet vira shove - nao tem stack pra 3-betar pequeno e foldar.</li>
            <li>Push ranges do SB sao enormes - quase tudo que voce abriria, voce pushea.</li>
            <li>BB precisa defender mais tight contra shoves, mas ainda mais wide que 3-max.</li>
            <li>O jogo vira uma guerra de all-in constante. Aceite isso e jogue os ranges.</li>
          </ul>
          <div className="mt-3 rounded-lg p-3" style={{ background: '#0f0f0f' }}>
            <div style={{ color: '#ccc', fontSize: 13 }}>
              Com 15bb HU, o SB abre ~70%+ (mix de raise e shove). O BB defende com shove
              ou call contra raises, e chama shoves com ~25-30% das maos.
            </div>
          </div>
        </Section>

        <Section title="Dica de Ouro">
          <div className="rounded-lg p-3 mb-3" style={{ background: '#0f0f0f', border: '1px solid #f5a623' }}>
            <div style={{ color: '#f5a623', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
              Se voce era tight demais em 3-max, PRECISA alargar em HU
            </div>
            <div style={{ color: '#ccc', fontSize: 13 }}>
              A transicao e o momento onde a maioria dos jogadores erra.
              Mentalmente, prepare-se: quando virar HU, ative o "modo agressivo".
            </div>
          </div>
          <ul className="space-y-1" style={{ color: '#ccc', fontSize: 14 }}>
            <li>Abra mais. Defenda mais. 3-bet mais.</li>
            <li>Maos que pareciam fracas em 3-max sao lucrativas em HU.</li>
            <li>Posicao e tudo: SB (BTN) tem vantagem absurda em HU.</li>
            <li>Adapte em CADA mao, nao "aos poucos". A mudanca e instantanea.</li>
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
  const [filterMode, setFilterMode] = useState('Todos')
  const [filterStack, setFilterStack] = useState('Todos')
  const [currentHand, setCurrentHand] = useState(null)
  const [currentMode, setCurrentMode] = useState(null)
  const [currentStack, setCurrentStack] = useState(null)
  const [currentScenario, setCurrentScenario] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [sessionDone, setSessionDone] = useState(false)

  function newHand() {
    if (sessionTotal >= 10) { setSessionDone(true); return }
    const modes = filterMode === 'Todos' ? MODES : [filterMode]
    const stacks = filterStack === 'Todos' ? STACKS : [parseInt(filterStack)]
    const mode = modes[Math.floor(Math.random() * modes.length)]
    const stack = stacks[Math.floor(Math.random() * stacks.length)]
    const scenario = getScenario(mode, stack)
    setCurrentMode(mode)
    setCurrentStack(stack)
    setCurrentScenario(scenario)
    setCurrentHand(randomHand(scenario.range))
    setFeedback(null)
  }

  function answer(action) {
    if (!currentHand || feedback) return
    const fb = getFeedback(currentHand, action, currentScenario, currentMode, currentStack)
    const newStreak = fb.isCorrect ? streak + 1 : 0
    setStreak(newStreak)
    const newTotal = sessionTotal + 1
    const newCorrect = sessionCorrect + (fb.isCorrect ? 1 : 0)
    setSessionTotal(newTotal)
    setSessionCorrect(newCorrect)
    recordAnswer(35, fb.isCorrect, newStreak)
    const isLast = newTotal >= 10
    if (isLast) recordSession(35, Math.round((newCorrect / newTotal) * 100))
    setFeedback({ ...fb, isLast })
  }

  function restart() {
    setSessionCorrect(0); setSessionTotal(0); setStreak(0)
    setSessionDone(false); setFeedback(null); setCurrentHand(null)
    setCurrentScenario(null)
  }

  if (!currentHand && !sessionDone) newHand()

  if (sessionDone) {
    return <SessionReview moduleId={35} sessionCorrect={sessionCorrect} sessionTotal={sessionTotal} onContinue={restart} />
  }

  const cards = currentHand ? handToCards(currentHand) : []
  const actions = currentScenario ? getRangeActions(currentScenario.rangeType, currentStack) : []
  const rangePct = currentScenario ? getRangePct(currentScenario.range) : 0

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <div className="mb-4 space-y-3">
        <div>
          <div style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>MODO</div>
          <div className="flex flex-wrap gap-2">
            {['Todos', ...MODES].map(m => (
              <button key={m} onClick={() => { setFilterMode(m); setFeedback(null); setCurrentHand(null); setCurrentScenario(null) }}
                className="px-3 py-1 rounded-lg text-sm"
                style={{ background: filterMode === m ? '#e5484d' : '#1a1a1d', color: filterMode === m ? 'white' : '#888', border: '1px solid #2a2a2e' }}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>STACK</div>
          <div className="flex gap-2 flex-wrap">
            {['Todos', ...STACKS.map(String)].map(s => (
              <button key={s} onClick={() => { setFilterStack(s); setFeedback(null); setCurrentHand(null); setCurrentScenario(null) }}
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

      {currentMode && currentScenario && (
        <div className="text-center mb-3">
          <div className="inline-block rounded-lg px-4 py-2" style={{
            background: currentMode === 'Heads-Up' ? '#1a2a1a' : '#1a1a2a',
            border: `2px solid ${currentMode === 'Heads-Up' ? '#4fce82' : '#e5484d'}`
          }}>
            <span style={{ color: currentMode === 'Heads-Up' ? '#4fce82' : '#e5484d', fontWeight: 700, fontSize: 18 }}>
              MODO: {currentMode}
            </span>
            <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>
              {currentScenario.label} . {currentStack}bb . Range ~{rangePct}%
            </div>
          </div>
        </div>
      )}

      {currentScenario && (
        <ModulePokerTable
          heroPos={currentScenario.pos}
          heroCards={cards}
          potLabel={`${currentStack}bb`}
          contextTitle={`${currentScenario.label} . ${currentStack}bb`}
          contextDesc={
            currentMode === '3-Max'
              ? (currentScenario.pos === 'BTN'
                ? 'Voce esta no BTN. Ninguem abriu. O que fazer?'
                : 'BTN foldou. Voce esta no SB vs BB. O que fazer?')
              : (currentScenario.rangeType === 'SB_open'
                ? 'Heads-Up: voce e SB (BTN). O que fazer?'
                : 'Heads-Up: adversario abriu min-raise. Voce e BB. O que fazer?')
          }
        />
      )}
      {currentHand && (
        <div className="text-center mb-4">
          <span style={{ color: '#888', fontSize: 14, fontFamily: 'Space Mono' }}>{currentHand}</span>
        </div>
      )}

      {!feedback && (
        <div className={`grid gap-3 mb-4 ${actions.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {actions.map(action => {
            let bg = '#1a1a1d'
            let color = 'white'
            if (action === 'RAISE' || action === 'SHOVE') { bg = '#4fce82'; color = '#0f0f0f' }
            else if (action === '3-BET') { bg = '#f5a623'; color = '#0f0f0f' }
            else if (action === 'CALL') { bg = '#0a84d7'; color = 'white' }
            else if (action === 'FOLD') { bg = '#e5484d'; color = 'white' }
            return (
              <button key={action} onClick={() => answer(action)}
                className="py-4 rounded-xl font-bold text-lg"
                style={{ background: bg, color }}>
                {action}
              </button>
            )
          })}
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
            Correto: <strong style={{ color: '#f5a623' }}>{feedback.correct.toUpperCase()}</strong>
          </div>
          {!feedback.isCorrect && currentScenario && (() => {
            const range = currentScenario.range
            const raiseList = range?.raise || range?.push || []
            const callList = range?.call || []
            const threebetList = range?.threebet || range?.threebet_shove || []
            const combined = {}
            if (raiseList.length > 0) combined.raise = raiseList
            if (callList.length > 0) combined.call = callList
            if (threebetList.length > 0) combined['3bet'] = threebetList
            const legend = []
            if (combined.raise) legend.push(['raise', currentScenario.rangeType === 'SB_open' ? 'Open/Push' : 'Raise'])
            if (combined['3bet']) legend.push(['3bet', '3-Bet/Shove'])
            if (combined.call) legend.push(['call', 'Call'])
            legend.push(['fold', 'Fold'])
            return (
              <RangeViewer
                customRange={combined}
                label={`Ver range - ${currentScenario.label} ${currentStack}bb`}
                legend={legend}
                highlightHand={currentHand}
              />
            )
          })()}
        </div>
      )}
    </div>
  )
}

export default function Module35() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[35]?.lessonRead ? 'trainer' : 'lesson')

  if (!progress.modules[35]?.unlocked) {
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
          <button onClick={() => progress.modules[35]?.lessonRead && setView('trainer')} className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: view === 'trainer' ? '#e5484d' : '#1a1a1d', color: view === 'trainer' ? 'white' : (progress.modules[35]?.lessonRead ? '#888' : '#444'), border: '1px solid #2a2a2e', cursor: progress.modules[35]?.lessonRead ? 'pointer' : 'not-allowed' }}>
            Trainer {!progress.modules[35]?.lessonRead && '🔒'}
          </button>
        </div>
        {view === 'lesson' && <Lesson onComplete={() => { markLessonRead(35); setView('trainer') }} />}
        {view === 'trainer' && <Trainer />}
      </div>
    </div>
  )
}
