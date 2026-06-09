import { useState, useCallback } from 'react'
import { useProgress } from '../context/ProgressContext'
import { RFI_RANGES, PUSH_FOLD_RANGES, BB_VS_RFI } from '../data/ranges'
import Card, { handToCards } from '../components/Card'
import RangeViewer from '../components/RangeViewer'

// ─── Utilitários ────────────────────────────────────────────────
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
const ALL_HANDS = generateAllHands()

// ─── RFI ────────────────────────────────────────────────────────
const RFI_POSITIONS = ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN']
const RFI_STACKS = [100, 50, 25, 15]

function rfiAction(hand, pos, stack) {
  const range = RFI_RANGES[pos]?.[stack]
  if (!range) return 'fold'
  if (range.raise.includes(hand)) return 'raise'
  if (range.mix.includes(hand)) return 'mix'
  return 'fold'
}

function rfiRandomScenario() {
  const pos = RFI_POSITIONS[Math.floor(Math.random() * RFI_POSITIONS.length)]
  const stack = RFI_STACKS[Math.floor(Math.random() * RFI_STACKS.length)]
  const range = RFI_RANGES[pos]?.[stack]
  const dice = Math.random()
  let hand
  if (dice < 0.45 && range?.raise.length) {
    hand = range.raise[Math.floor(Math.random() * range.raise.length)]
  } else if (dice < 0.55 && range?.mix.length) {
    hand = range.mix[Math.floor(Math.random() * range.mix.length)]
  } else {
    const fold = ALL_HANDS.filter(h => !range?.raise.includes(h) && !range?.mix.includes(h))
    hand = fold.length ? fold[Math.floor(Math.random() * fold.length)] : range.raise[0]
  }
  return { type: 'rfi', pos, stack, hand }
}

// ─── PUSH/FOLD ───────────────────────────────────────────────────
const PF_POSITIONS = ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB']
const PF_STACKS = [5, 8, 10]

function pfAction(hand, pos, stack) {
  const range = PUSH_FOLD_RANGES[pos]
  if (!range) return 'fold'
  const stacks = Object.keys(range).map(Number).sort((a,b)=>a-b)
  const closest = stacks.reduce((p,c) => Math.abs(c-stack)<Math.abs(p-stack)?c:p)
  return range[closest]?.includes(hand) ? 'push' : 'fold'
}

function pfRandomScenario() {
  const pos = PF_POSITIONS[Math.floor(Math.random() * PF_POSITIONS.length)]
  const stack = PF_STACKS[Math.floor(Math.random() * PF_STACKS.length)]
  const range = PUSH_FOLD_RANGES[pos]
  const stacks = Object.keys(range||{}).map(Number).sort((a,b)=>a-b)
  const closest = stacks.reduce((p,c)=>Math.abs(c-stack)<Math.abs(p-stack)?c:p, stacks[0])
  const pushRange = range?.[closest] || []
  let hand
  if (Math.random() < 0.5 && pushRange.length) {
    hand = pushRange[Math.floor(Math.random() * pushRange.length)]
  } else {
    const fold = ALL_HANDS.filter(h => !pushRange.includes(h))
    hand = fold[Math.floor(Math.random() * fold.length)]
  }
  return { type: 'pushfold', pos, stack, hand }
}

// ─── BB VS RFI ───────────────────────────────────────────────────
const BB_POSITIONS = ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB']
const BB_KEYS = { UTG:'vsUTG','UTG+1':'vsUTG1',LJ:'vsLJ',HJ:'vsHJ',CO:'vsCO',BTN:'vsBTN',SB:'vsSB' }

function bbAction(hand, raisedFrom) {
  const range = BB_VS_RFI[BB_KEYS[raisedFrom]]
  if (!range) return 'fold'
  if (range.threebet?.includes(hand)) return '3bet'
  if (range.call?.includes(hand)) return 'call'
  return 'fold'
}

function bbRandomScenario() {
  const pos = BB_POSITIONS[Math.floor(Math.random() * BB_POSITIONS.length)]
  const range = BB_VS_RFI[BB_KEYS[pos]]
  const dice = Math.random()
  let hand
  if (dice < 0.3 && range?.threebet?.length) {
    hand = range.threebet[Math.floor(Math.random() * range.threebet.length)]
  } else if (dice < 0.6 && range?.call?.length) {
    hand = range.call[Math.floor(Math.random() * range.call.length)]
  } else {
    const used = [...(range?.threebet||[]),...(range?.call||[])]
    const fold = ALL_HANDS.filter(h=>!used.includes(h))
    hand = fold.length ? fold[Math.floor(Math.random() * fold.length)] : ALL_HANDS[0]
  }
  return { type: 'bb', pos, hand }
}

// ─── Gerador de cenário aleatório ────────────────────────────────
function newScenario(unlockedModules) {
  const pool = []
  if (unlockedModules.includes(1)) pool.push('rfi')
  if (unlockedModules.includes(2)) pool.push('pushfold')
  if (unlockedModules.includes(3)) pool.push('bb')
  if (!pool.length) return rfiRandomScenario()
  const type = pool[Math.floor(Math.random() * pool.length)]
  if (type === 'rfi') return rfiRandomScenario()
  if (type === 'pushfold') return pfRandomScenario()
  return bbRandomScenario()
}

// ─── Avalia resposta ─────────────────────────────────────────────
function evaluate(scenario, action) {
  if (scenario.type === 'rfi') {
    const correct = rfiAction(scenario.hand, scenario.pos, scenario.stack)
    const isMix = correct === 'mix'
    const isCorrect = action === correct || (isMix && (action === 'raise' || action === 'fold'))
    return { correct, isCorrect, isMix }
  }
  if (scenario.type === 'pushfold') {
    const correct = pfAction(scenario.hand, scenario.pos, scenario.stack)
    const isCorrect = action === correct
    return { correct, isCorrect, isMix: false }
  }
  // bb
  const correct = bbAction(scenario.hand, scenario.pos)
  const isCorrect = action === correct
  return { correct, isCorrect, isMix: false }
}

// ─── Labels do cenário ───────────────────────────────────────────
function ScenarioLabel({ scenario }) {
  if (scenario.type === 'rfi') {
    return (
      <div className="flex gap-2 flex-wrap justify-center">
        <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{ background: '#e9456022', color: '#e94560' }}>RFI</span>
        <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{ background: '#1e1e2e', color: '#aaa' }}>{scenario.pos}</span>
        <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{ background: '#1e1e2e', color: '#aaa' }}>{scenario.stack}bb</span>
      </div>
    )
  }
  if (scenario.type === 'pushfold') {
    return (
      <div className="flex gap-2 flex-wrap justify-center">
        <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{ background: '#f5a62322', color: '#f5a623' }}>Push/Fold</span>
        <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{ background: '#1e1e2e', color: '#aaa' }}>{scenario.pos}</span>
        <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{ background: '#1e1e2e', color: '#aaa' }}>{scenario.stack}bb</span>
      </div>
    )
  }
  return (
    <div className="flex gap-2 flex-wrap justify-center">
      <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{ background: '#4a90e222', color: '#4a90e2' }}>BB vs RFI</span>
      <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{ background: '#1e1e2e', color: '#aaa' }}>vs {scenario.pos}</span>
    </div>
  )
}

// ─── Botões de ação ──────────────────────────────────────────────
function ActionButtons({ scenario, onAnswer }) {
  if (scenario.type === 'rfi') {
    return (
      <div className="flex gap-3">
        <button onClick={() => onAnswer('raise')} className="flex-1 py-4 rounded-xl font-bold text-lg"
          style={{ background: '#00d4aa', color: '#0a0a0f' }}>Raise</button>
        <button onClick={() => onAnswer('fold')} className="flex-1 py-4 rounded-xl font-bold text-lg"
          style={{ background: '#e94560', color: 'white' }}>Fold</button>
      </div>
    )
  }
  if (scenario.type === 'pushfold') {
    return (
      <div className="flex gap-3">
        <button onClick={() => onAnswer('push')} className="flex-1 py-4 rounded-xl font-bold text-lg"
          style={{ background: '#f5a623', color: '#0a0a0f' }}>Push All-In</button>
        <button onClick={() => onAnswer('fold')} className="flex-1 py-4 rounded-xl font-bold text-lg"
          style={{ background: '#e94560', color: 'white' }}>Fold</button>
      </div>
    )
  }
  return (
    <div className="flex gap-2">
      <button onClick={() => onAnswer('3bet')} className="flex-1 py-4 rounded-xl font-bold"
        style={{ background: '#e94560', color: 'white' }}>3-Bet</button>
      <button onClick={() => onAnswer('call')} className="flex-1 py-4 rounded-xl font-bold"
        style={{ background: '#00d4aa', color: '#0a0a0f' }}>Call</button>
      <button onClick={() => onAnswer('fold')} className="flex-1 py-4 rounded-xl font-bold"
        style={{ background: '#1e1e2e', color: '#888' }}>Fold</button>
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────
export default function Infinite() {
  const { recordAnswer, getModuleProgress } = useProgress()

  const unlockedModules = [1,2,3,4,5,6].filter(id => getModuleProgress(id).unlocked)

  const [scenario, setScenario] = useState(() => newScenario(unlockedModules))
  const [result, setResult] = useState(null)
  const [streak, setStreak] = useState(0)
  const [sessionStats, setSessionStats] = useState({ total: 0, correct: 0 })

  const handleAnswer = useCallback((action) => {
    if (result) return
    const { isCorrect, correct, isMix } = evaluate(scenario, action)
    const moduleId = scenario.type === 'rfi' ? 1 : scenario.type === 'pushfold' ? 2 : 3
    const newStreak = isCorrect ? streak + 1 : 0
    setStreak(newStreak)
    setSessionStats(s => ({ total: s.total + 1, correct: s.correct + (isCorrect ? 1 : 0) }))
    recordAnswer(moduleId, isCorrect, newStreak)
    setResult({ isCorrect, correct, isMix, action })
  }, [result, scenario, streak, recordAnswer])

  const handleNext = useCallback(() => {
    setResult(null)
    setScenario(newScenario(unlockedModules))
  }, [unlockedModules])

  const sessionAcc = sessionStats.total > 0
    ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0

  const accColor = sessionAcc >= 90 ? '#00d4aa' : sessionAcc >= 70 ? '#f5a623' : '#e94560'
  const cards = handToCards(scenario.hand)

  // cor de destaque do módulo atual
  const moduleColor = scenario.type === 'rfi' ? '#e94560'
    : scenario.type === 'pushfold' ? '#f5a623' : '#4a90e2'

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20" style={{ background: '#0a0a0f' }}>
      <div className="max-w-md mx-auto px-4 pt-6">

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { label: 'Mãos', value: sessionStats.total, color: '#e94560' },
            { label: 'Acerto', value: sessionStats.total ? `${sessionAcc}%` : '—', color: accColor },
            { label: 'Sequência', value: streak, color: '#f5a623' },
          ].map(s => (
            <div key={s.label} className="rounded-xl py-3 text-center" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
              <div style={{ color: s.color, fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
              <div style={{ color: '#444', fontSize: 11, marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Card principal */}
        <div className="rounded-2xl overflow-hidden mb-4"
          style={{ background: '#12121a', border: `1px solid ${result ? (result.isCorrect ? '#00d4aa55' : '#e9456055') : '#1e1e2e'}` }}>

          {/* Faixa do módulo */}
          <div className="px-5 py-3 flex items-center justify-between"
            style={{ background: `${moduleColor}18`, borderBottom: `1px solid ${moduleColor}30` }}>
            <ScenarioLabel scenario={scenario} />
          </div>

          {/* Cartas + mão */}
          <div className="px-5 pt-6 pb-4 text-center">
            <div className="flex justify-center gap-3 mb-3">
              {cards.map((c, i) => <Card key={i} rank={c.rank} suit={c.suit} />)}
            </div>
            <div style={{ color: 'white', fontSize: 26, fontWeight: 800, letterSpacing: 1 }}>
              {scenario.hand}
            </div>
            <div style={{ color: '#444', fontSize: 13, marginTop: 4 }}>
              {scenario.type === 'rfi' && `${scenario.pos} · ${scenario.stack}bb — Raise First In`}
              {scenario.type === 'pushfold' && `${scenario.pos} · ${scenario.stack}bb — Push ou Fold?`}
              {scenario.type === 'bb' && `BB · raise do ${scenario.pos} — Qual a ação?`}
            </div>
          </div>

          {/* Feedback */}
          {result && (
            <div className="mx-5 mb-4 rounded-xl px-4 py-3" style={{
              background: result.isCorrect ? '#00d4aa15' : '#e9456015',
              border: `1px solid ${result.isCorrect ? '#00d4aa40' : '#e9456040'}`
            }}>
              <div style={{ color: result.isCorrect ? '#00d4aa' : '#e94560', fontWeight: 700, fontSize: 17 }}>
                {result.isCorrect ? '✓ Correto!' : `✗ Errou — era ${result.correct.toUpperCase()}`}
              </div>
              {result.isMix && (
                <div style={{ color: '#f5a623', fontSize: 12, marginTop: 3 }}>
                  Mão de transição — raise ou fold são aceitáveis.
                </div>
              )}
            </div>
          )}

          {/* Botões de ação */}
          <div className="px-5 pb-5">
            {!result ? (
              <ActionButtons scenario={scenario} onAnswer={handleAnswer} />
            ) : (
              <button onClick={handleNext}
                className="w-full py-4 rounded-xl font-bold text-lg"
                style={{ background: '#e94560', color: 'white', letterSpacing: 0.5 }}>
                Próxima Mão →
              </button>
            )}
          </div>
        </div>

        {/* RangeViewer quando errar */}
        {result && !result.isCorrect && (
          <div className="rounded-2xl p-4" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
            <div style={{ color: '#555', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Range de referência
            </div>
            {scenario.type === 'rfi' && (
              <RangeViewer type="rfi" position={scenario.pos} stack={scenario.stack} highlightHand={scenario.hand} />
            )}
            {scenario.type === 'pushfold' && (
              <RangeViewer type="pushfold" position={scenario.pos} stack={scenario.stack} highlightHand={scenario.hand} />
            )}
            {scenario.type === 'bb' && (
              <RangeViewer type="bb" position={scenario.pos} highlightHand={scenario.hand} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
