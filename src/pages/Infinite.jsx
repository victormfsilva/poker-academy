import { useState, useCallback } from 'react'
import { useProgress } from '../context/ProgressContext'
import { RFI_RANGES, PUSH_FOLD_RANGES, BB_VS_RFI } from '../data/ranges'
import Card, { handToCards, parseCard } from '../components/Card'
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
// Botões sempre: fold | call | raise | allin
// Mapeamento por tipo de cenário:
//   rfi:      raise=raise, fold=fold (call/allin = errado)
//   pushfold: allin=push, fold=fold (call/raise = errado)
//   bb:       raise=3bet, call=call, fold=fold (allin = errado)
function evaluate(scenario, action) {
  if (scenario.type === 'rfi') {
    const correct = rfiAction(scenario.hand, scenario.pos, scenario.stack)
    const isMix   = correct === 'mix'
    // raise→raise, allin→raise (all-in conta como raise no RFI)
    const mapped  = action === 'allin' ? 'raise' : action
    const isCorrect = mapped === correct || (isMix && (mapped === 'raise' || mapped === 'fold'))
    const correctLabel = correct === 'mix' ? 'raise ou fold' : correct
    return { correct: correctLabel, isCorrect, isMix }
  }
  if (scenario.type === 'pushfold') {
    const correct = pfAction(scenario.hand, scenario.pos, scenario.stack)
    // allin→push, demais→fold
    const mapped  = action === 'allin' ? 'push' : 'fold'
    const isCorrect = mapped === correct
    const correctLabel = correct === 'push' ? 'all-in' : 'fold'
    return { correct: correctLabel, isCorrect, isMix: false }
  }
  // bb vs rfi
  const correct = bbAction(scenario.hand, scenario.pos)
  // raise→3bet, call→call, fold→fold, allin→3bet
  const mapped  = action === 'raise' || action === 'allin' ? '3bet' : action
  const isCorrect = mapped === correct
  const correctLabel = correct === '3bet' ? 'raise (3-bet)' : correct
  return { correct: correctLabel, isCorrect, isMix: false }
}

// ─── Mesa estilo GTO Wizard ───────────────────────────────────────
// Carta do herói — usa o componente Card real do projeto
function HeroCard({ card }) {
  return <Card card={parseCard(card)} size="md" />
}

// Ficha bolinha estilo GTO Wizard — pequeno círculo colorido
function ChipDot({ color }) {
  return (
    <div style={{
      width: 10, height: 10, borderRadius: '50%',
      background: color, border: '1px solid #0008',
      boxShadow: `0 0 4px ${color}88`,
      flexShrink: 0,
    }} />
  )
}

// Assento igual ao GTO Wizard: círculo cinza com pos + stack, sem fill colorido nos inativos
function Seat({ pos, isHero, isRaiser, isSB, isBB, stack, cards, betAmt }) {
  const posLabel = pos === 'UTG+1' ? 'UTG1' : pos
  // Herói: borda verde-água. Raiser: borda laranja. Demais: cinza escuro
  const border = isHero  ? '2px solid #00ac8d'
               : isRaiser ? '2px solid #ff8f00'
               : '2px solid #3a3a3a'
  const bg     = isHero  ? '#1a2e2a'
               : '#2a2a2a'
  const txtCol = isHero  ? '#00ac8d'
               : isRaiser ? '#ff8f00'
               : '#ccc'

  // Bolinha de aposta + valor (igual GTO Wizard: bolinha azul + número branco)
  const hasBet   = isRaiser || isSB || isBB
  const chipColor = isRaiser ? '#ff8f00' : isSB ? '#5ab966' : '#4a9eff'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      {/* Bet: bolinha + valor acima do assento */}
      {hasBet && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <ChipDot color={chipColor} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#ddd' }}>{betAmt}</span>
        </div>
      )}

      {/* Círculo do assento */}
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        background: bg, border,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: posLabel.length > 3 ? 7.5 : 10, color: txtCol, fontWeight: 700, lineHeight: 1.1 }}>
          {posLabel}
        </span>
        <span style={{ fontSize: 9, color: '#666', lineHeight: 1.2 }}>{stack}</span>
      </div>

      {/* Cartas renderizadas fora — ver PokerTable */}
    </div>
  )
}

// Ordem da mesa sentido horário
const ALL_SEATS_ORDER = ['UTG','UTG+1','LJ','HJ','CO','BTN','SB','BB']

// Posições: herói sempre no slot 5 (bottom-center)
// Mesa horizontal achatada igual ao GTO Wizard
const SLOT_POS = [
  { top: '10%', left: '22%' }, // 0 top-left      (UTG relativo)
  { top: '3%',  left: '50%' }, // 1 top-center
  { top: '10%', left: '78%' }, // 2 top-right
  { top: '50%', left: '93%' }, // 3 right
  { top: '82%', left: '75%' }, // 4 bottom-right
  { top: '88%', left: '50%' }, // 5 bottom-center ← HERÓI
  { top: '82%', left: '25%' }, // 6 bottom-left
  { top: '50%', left: '7%'  }, // 7 left
]

function PokerTable({ scenario, cards }) {
  const heroPos   = scenario.type === 'bb' ? 'BB' : scenario.pos
  const raiserPos = scenario.type === 'bb' ? scenario.pos : null

  // Rotacionar para herói ficar no slot 5
  const heroIdx = ALL_SEATS_ORDER.indexOf(heroPos)
  const rotated = SLOT_POS.map((_, i) =>
    ALL_SEATS_ORDER[(heroIdx + i - 5 + 8) % 8]
  )

  // BTN para dealer button
  const btnSlotIdx = rotated.indexOf('BTN')
  const btnPos     = SLOT_POS[btnSlotIdx]

  // Stack padrão 100bb quando não definido (BB vs RFI)
  const stack = scenario.stack || 100

  // Pot central
  const potAmt   = raiserPos ? (stack * 2.5).toFixed(1) : (stack * 1.5).toFixed(1)
  const startPot = (stack * 0.5).toFixed(1)

  return (
    <div style={{
      position: 'relative', width: '100%', paddingBottom: '72%',
      userSelect: 'none', overflow: 'visible',
    }}>
      {/* Mesa — retângulo arredondado horizontal igual GTO Wizard */}
      <div style={{
        position: 'absolute',
        top: '12%', left: '5%', right: '5%', bottom: '14%',
        borderRadius: 999,
        border: '2px solid #3a3a3a',
        background: 'transparent',
      }} />

      {/* Pot central */}
      <div style={{
        position: 'absolute', top: '40%', left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center', pointerEvents: 'none',
      }}>
        <div style={{ color: '#555', fontSize: 10, fontWeight: 600 }}>{stack}bb</div>
        <div style={{ color: '#ccc', fontSize: 15, fontWeight: 800 }}>{potAmt} bb</div>
        <div style={{ color: '#555', fontSize: 10 }}>{startPot} bb</div>
      </div>

      {/* Dealer button — ao lado esquerdo do BTN */}
      {btnPos && (
        <div style={{
          position: 'absolute',
          top: btnPos.top, left: btnPos.left,
          transform: 'translate(-36px, 0px)',
          width: 18, height: 18, borderRadius: '50%',
          background: '#d0d0d0', color: '#111',
          fontSize: 9, fontWeight: 900,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid #888', zIndex: 10,
        }}>D</div>
      )}

      {/* Assentos */}
      {rotated.map((pos, slotIdx) => {
        const p        = SLOT_POS[slotIdx]
        const isRaiser = pos === raiserPos
        const isSB     = pos === 'SB'
        const isBB     = pos === 'BB'
        const betAmt   = isRaiser ? `${(stack * 2).toFixed(0)}`
                       : isSB     ? `${(stack * 0.5).toFixed(1)}`
                       : isBB     ? `${stack}`
                       : null
        return (
          <div key={pos} style={{
            position: 'absolute',
            top: p.top, left: p.left,
            transform: 'translate(-50%, -50%)',
            zIndex: 5,
          }}>
            <Seat
              pos={pos}
              isHero={pos === heroPos}
              isRaiser={isRaiser}
              isSB={isSB}
              isBB={isBB}
              stack={stack}
              cards={pos === heroPos ? cards : null}
              betAmt={betAmt}
            />
          </div>
        )
      })}
    </div>
  )
}

// ─── Labels do cenário ───────────────────────────────────────────
const LABEL_COLORS = { rfi: '#F03C3C', pushfold: '#ff8f00', bb: '#00ac8d' }
const LABEL_TEXT   = { rfi: 'RFI', pushfold: 'Push/Fold', bb: 'BB vs RFI' }

function ScenarioLabel({ scenario }) {
  const col = LABEL_COLORS[scenario.type]
  const lbl = LABEL_TEXT[scenario.type]
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <span style={{
        fontSize: 11, fontWeight: 800, color: col,
        background: col + '22', borderRadius: 4, padding: '2px 7px', letterSpacing: 0.5,
      }}>{lbl}</span>
      {scenario.pos && (
        <span style={{ fontSize: 12, color: '#666' }}>{scenario.pos}</span>
      )}
      {scenario.stack && (
        <span style={{ fontSize: 12, color: '#666' }}>{scenario.stack}bb</span>
      )}
    </div>
  )
}

// ─── Botões de ação — sempre os mesmos 4 ─────────────────────────
const FIXED_BTNS = [
  { label: 'Fold',   action: 'fold',  bg: '#3D7CB8' },
  { label: 'Call',   action: 'call',  bg: '#5ab966' },
  { label: 'Raise',  action: 'raise', bg: '#F03C3C' },
  { label: 'All-in', action: 'allin', bg: '#ff8f00' },
]

function ActionButtons({ onAnswer }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {FIXED_BTNS.map(b => (
        <button key={b.action} onClick={() => onAnswer(b.action)}
          style={{
            flex: 1, padding: '14px 4px', borderRadius: 8, fontWeight: 700,
            fontSize: 13, border: 'none', cursor: 'pointer', letterSpacing: 0.3,
            color: '#f5f5f5', textShadow: '0 1px 2px #0008', background: b.bg,
          }}>
          {b.label}
        </button>
      ))}
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
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20" style={{ background: '#121212' }}>
      <div className="max-w-2xl mx-auto px-4 pt-6">

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
        <div className="rounded-2xl mb-4"
          style={{ background: '#121212', border: `1px solid ${result ? (result.isCorrect ? '#00ac8d55' : '#F03C3C55') : '#262626'}` }}>

          <div style={{ height: 12 }} />

          {/* Mesa */}
          <div className="px-2 pt-1 pb-1">
            <PokerTable scenario={scenario} cards={null} />
          </div>

          {/* Cartas do herói — fora do container da mesa para não sobrepor */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: -8, marginBottom: 12 }}>
            {cards.map((c, i) => <HeroCard key={i} card={c} />)}
          </div>

          {/* Mão highlight — nome grande + contexto */}
          <div className="px-5 pb-3 text-center">
            <div style={{ color: '#ffb800', fontSize: 26, fontWeight: 800, letterSpacing: 2, textShadow: '0 0 12px #ffb80060' }}>
              {scenario.hand}
            </div>
            <div style={{ color: '#444', fontSize: 12, marginTop: 2 }}>
              {scenario.stack ? `${scenario.stack}bb` : '100bb'}
            </div>
          </div>

          {/* Feedback */}
          {result && (
            <div className="mx-4 mb-3 rounded-lg px-4 py-3" style={{
              background: result.isCorrect ? '#00ac8d15' : '#F03C3C15',
              border: `1px solid ${result.isCorrect ? '#00ac8d40' : '#F03C3C40'}`
            }}>
              <div style={{ color: result.isCorrect ? '#00ac8d' : '#F03C3C', fontWeight: 700, fontSize: 16 }}>
                {result.isCorrect ? '✓ Correto!' : `✗ Errou — era ${result.correct.toUpperCase()}`}
              </div>
              {result.isMix && (
                <div style={{ color: '#ff8f00', fontSize: 12, marginTop: 3 }}>
                  Mão de transição — raise ou fold são aceitáveis.
                </div>
              )}
            </div>
          )}

          {/* Botões de ação */}
          <div className="px-4 pb-4">
            {!result ? (
              <ActionButtons onAnswer={handleAnswer} />
            ) : (
              <button onClick={handleNext}
                style={{
                  width: '100%', padding: '14px', borderRadius: 8,
                  background: '#1e1e1e', border: '1px solid #333',
                  color: '#f5f5f5', fontWeight: 700, fontSize: 15,
                  cursor: 'pointer', letterSpacing: 0.5,
                }}>
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
              <RangeViewer
                pos={scenario.pos} stack={scenario.stack}
                highlightHand={scenario.hand}
                label={`Ver range RFI — ${scenario.pos} ${scenario.stack}bb`}
              />
            )}
            {scenario.type === 'pushfold' && (() => {
              const stacks = Object.keys(PUSH_FOLD_RANGES[scenario.pos] || {}).map(Number).sort((a,b)=>a-b)
              const closest = stacks.reduce((p,c) => Math.abs(c-scenario.stack)<Math.abs(p-scenario.stack)?c:p, stacks[0])
              const pushList = PUSH_FOLD_RANGES[scenario.pos]?.[closest] || []
              return (
                <RangeViewer
                  customRange={{ push: pushList }}
                  label={`Ver range push — ${scenario.pos} ${scenario.stack}bb`}
                  legend={[['push', 'Push (All-in)'], ['fold', 'Fold']]}
                  highlightHand={scenario.hand}
                />
              )
            })()}
            {scenario.type === 'bb' && (() => {
              const range = BB_VS_RFI[BB_KEYS[scenario.pos]] || {}
              return (
                <RangeViewer
                  customRange={{ threebet: range.threebet || [], call: range.call || [] }}
                  label={`Ver range BB vs ${scenario.pos}`}
                  legend={[['threebet', '3-Bet'], ['call', 'Call'], ['fold', 'Fold']]}
                  highlightHand={scenario.hand}
                />
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
