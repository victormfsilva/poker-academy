import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'

// ================================================================
// GERADOR DINÂMICO — Blockers Avançado
// ================================================================

const pick = arr => arr[Math.floor(Math.random() * arr.length)]

const POSITIONS = ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB']
const BOARDS_FLUSH = ['Kh-Qh-7s-3d-2c', 'Ah-9h-5s-3d-Jc', 'Ks-Ts-4h-7d-2c', 'Qd-8d-3s-5h-Jc', 'Jh-7h-2s-4d-9c']
const BOARDS_STRAIGHT = ['Q-J-T-4-2', 'J-T-9-3-7', 'T-9-8-2-K', '9-8-7-A-3', '8-7-6-K-2']
const BOARDS_DRY = ['A-K-8-3-2', 'K-Q-7-4-3', 'A-J-9-5-2', 'Q-T-6-3-8', 'K-J-8-4-2', 'A-8-5-3-9', 'K-9-4-2-7']

const TEMPLATES = [
  // 1. Ace blocker para blefe no river
  () => {
    const board = pick(BOARDS_DRY)
    const suit = pick(['h', 's', 'd'])
    const kicker = pick(['5', '4', '3', '2', '6', '7'])
    return {
      situation: `River: board ${board} sem flush. Vilão checou flop, turn e river. Você tem A${suit}${kicker}${pick(['h','s','d','c'])} (nada).`,
      question: 'Você deve blefar?',
      options: [
        { id: 'bluff', label: 'Sim, apostar blefe', correct: true },
        { id: 'check', label: 'Não, check back', correct: false },
      ],
      explanation: `Você tem o Ace, que bloqueia AK, AQ, AJ — as mãos de valor mais prováveis do vilão. Isso significa que ele provavelmente tem mãos marginais. Seu A como blocker torna o blefe muito mais lucrativo.`,
      concept: 'Blocker de valor: ter o Ace bloqueia top pairs e overpairs do oponente, tornando blefes mais efetivos.',
    }
  },

  // 2. Flush draw blocker — não completou
  () => {
    const FLUSH_BOARDS = [
      { board: 'Kh-Qh-7s-3d-2c', suit: 'copas', suitChar: 'h' },
      { board: 'Ah-9h-5s-3d-Jc', suit: 'copas', suitChar: 'h' },
      { board: 'Ks-Ts-4h-7d-2c', suit: 'espadas', suitChar: 's' },
      { board: 'Qd-8d-3s-5h-Jc', suit: 'ouros', suitChar: 'd' },
      { board: 'Jh-7h-2s-4d-9c', suit: 'copas', suitChar: 'h' },
    ]
    const spot = pick(FLUSH_BOARDS)
    const { board, suit, suitChar } = spot
    const r1 = pick(['9', 'T', 'J', '8', '7'])
    const r2 = pick(['6', '5', '4', '3', '2'])
    return {
      situation: `River: ${board}. Flush draw de ${suit} NÃO completou. Vilão apostou flop e turn. Você tem ${r1}${suitChar}${r2}${suitChar} (duas cartas de ${suit}, sem nada).`,
      question: 'Você deve raise blefe no river?',
      options: [
        { id: 'raise', label: 'Sim, raise blefe', correct: true },
        { id: 'fold', label: 'Não, fold', correct: false },
      ],
      explanation: `Você tem duas cartas de ${suit}, bloqueando flush draws do vilão que teriam desistido. O range de aposta dele é mais pesado em valor — um raise blefe pode forçá-lo a foldar top pair.`,
      concept: 'Flush draw blocker: quando o draw não completou e você tem cartas do naipe, o range de aposta do vilão é mais forte — raise blefe ganha fold equity.',
    }
  },

  // 3. KQs bloqueia folds — ruim para 3-bet blefe
  () => {
    const heroPos = pick(['BTN', 'CO', 'HJ'])
    const villainPos = pick(['UTG', 'UTG+1', 'LJ'])
    const hand = pick(['KQs', 'KJs', 'QJs'])
    return {
      situation: `${villainPos} fez raise. Você está no ${heroPos} com ${hand}. Quer 3-bet blefe.`,
      question: `${hand} é um bom 3-bet blefe aqui?`,
      options: [
        { id: 'no', label: `Não, ${hand} bloqueia folds`, correct: true },
        { id: 'yes', label: `Sim, ${hand} é forte`, correct: false },
      ],
      explanation: `${hand} bloqueia mãos que você QUER que ele folde (KJs, QTs, etc). Para 3-bet blefe, bloqueie mãos que CONTINUAM (AA, KK, AK) — não mãos que foldam.`,
      concept: 'Blocker paradoxo: para blefar, bloqueie mãos que continuam. Para value bet, bloqueie mãos que foldam.',
    }
  },

  // 4. A4o/A5s — bom 3-bet blefe
  () => {
    const hand = pick(['A4o', 'A5s', 'A3s', 'A2s', 'A4s'])
    const heroPos = pick(['BB', 'SB', 'BTN'])
    const villainPos = pick(['BTN', 'CO', 'HJ'])
    return {
      situation: `${villainPos} fez raise. Você está no ${heroPos} com ${hand}. Considerando 3-bet blefe.`,
      question: `${hand} é um bom 3-bet blefe?`,
      options: [
        { id: 'yes', label: 'Sim, bloqueia AA e AK', correct: true },
        { id: 'no', label: 'Não, mão muito fraca', correct: false },
      ],
      explanation: `${hand} é excelente para 3-bet blefe! O Ace bloqueia AA (de 6 combos para 3) e AK/AQ. Além disso, tem equity de backup (wheel potential, suited).`,
      concept: 'Ace blocker para 3-bet: ter um Ace remove metade dos combos de AA e reduz AK/AQ do oponente.',
    }
  },

  // 5. Straight blocker — sizing menor
  () => {
    const straightSpots = [
      { board: 'Q-J-T-4-2', hands: ['AK', 'K9', '98'] },
      { board: 'J-T-9-3-7', hands: ['KQ', 'Q8', '86'] },
      { board: 'T-9-8-2-K', hands: ['QJ', 'J7', '76'] },
      { board: '9-8-7-A-3', hands: ['JT', 'T6', '65'] },
      { board: '8-7-6-K-2', hands: ['T9', '95', '54'] },
    ]
    const spot = pick(straightSpots)
    const board = spot.board
    const hand = pick(spot.hands)
    return {
      situation: `River: board ${board}. Você tem ${hand} (straight). Vilão checou.`,
      question: 'Quão grande apostar?',
      options: [
        { id: 'big', label: 'Aposta grande (75%+)', correct: false },
        { id: 'medium', label: 'Aposta média (33-50%)', correct: true },
      ],
      explanation: `Você BLOQUEIA ${hand} do vilão — uma das mãos que pagaria grande. Com board conectado, muitas mãos têm straight. Aposte menor para extrair de pares e dois pares.`,
      concept: 'Card removal em value bet: quando bloqueia as mãos que pagariam mais, reduza o sizing.',
    }
  },

  // 6. Mão com boa equity — melhor call que 3-bet
  () => {
    const hand = pick(['JTs', 'T9s', '98s', 'QJs', 'J9s'])
    const heroPos = pick(['BTN', 'CO'])
    const villainPos = pick(['UTG', 'LJ', 'HJ', 'CO'])
    return {
      situation: `${villainPos} fez raise. Você está no ${heroPos} com ${hand}. Quer 3-bet blefe.`,
      question: `${hand} é um bom 3-bet blefe?`,
      options: [
        { id: 'no', label: 'Não, melhor call', correct: true },
        { id: 'yes', label: 'Sim, bom blocker', correct: false },
      ],
      explanation: `${hand} tem muita equity pós-flop e não bloqueia well as mãos de continue (AA, KK, AK). Melhor como call — reserve 3-bet blefe para A5s/A4s.`,
      concept: 'Mãos com boa playability são melhores como call. 3-bet blefe com mãos que têm bons blockers mas pouca equity de call.',
    }
  },

  // 7. Blocker defensivo — fold quando bloqueia blefes
  () => {
    const suit = pick(['copas', 'espadas', 'ouros'])
    const suitChar = suit === 'copas' ? 'h' : suit === 'espadas' ? 's' : 'd'
    const otherSuit = pick(['c', 'h', 's', 'd'].filter(s => s !== suitChar))
    const rank = pick(['K', 'Q', 'J'])
    const highCard = rank === 'K' ? 'Q' : 'K'
    const board = pick([
      `A${suitChar}-${highCard}${suitChar}-8${suitChar}-5${otherSuit}-2${otherSuit}`,
      `K${suitChar}-${rank === 'K' ? 'J' : 'Q'}${suitChar}-7${suitChar}-3${otherSuit}-9${otherSuit}`
    ])
    return {
      situation: `River: board ${board}. Flush de ${suit} possivel. Vilão aposta 75%. Você tem ${rank}${suitChar} em mão (segundo par).`,
      question: 'O que você faz?',
      options: [
        { id: 'call', label: 'Call — vilão pode blefar', correct: false },
        { id: 'fold', label: 'Fold — você bloqueia os blefes dele', correct: true },
      ],
      explanation: `Você tem ${rank}${suitChar} — bloqueia flush draws de ${suit} com ${rank} que são blefes naturais do vilão. Ao bloquear blefes dele, a aposta é mais provavelmente valor. Fold.`,
      concept: 'Blocker defensivo: se bloqueia blefes do oponente, a aposta dele é mais valor. Fold.',
    }
  },

  // 8. AA bloqueia range de 3-bet — 4-bet menor
  () => {
    const heroPos = pick(['UTG', 'LJ', 'HJ', 'CO', 'BTN'])
    const villainPos = pick(['BB', 'SB', 'BTN'].filter(p => p !== heroPos))
    return {
      situation: `Você abriu do ${heroPos} com AA. ${villainPos} fez 3-bet.`,
      question: 'Como os blockers afetam o sizing do 4-bet?',
      options: [
        { id: '4bet_big', label: '4-bet grande — AA é nuts', correct: false },
        { id: '4bet_small', label: '4-bet menor — bloqueia AA/AK dele', correct: true },
      ],
      explanation: `Com AA, você bloqueia AA (0 combos) e AK (de 16 para 8). O range de 3-bet dele é mais leve. 4-bet menor induz calls de QQ, JJ, AQs que sizing grande assustaria.`,
      concept: 'Blocker em sizing: quando bloqueia a parte forte do range, ajuste sizing para induzir calls.',
    }
  },

  // 9. Não bloqueia nuts — não blefe
  () => {
    const board = pick(BOARDS_STRAIGHT)
    const hand = pick(['98', '87', '76', '65'])
    return {
      situation: `River: board ${board}. Você tem ${hand} (sem nada). Vilão checou três streets.`,
      question: 'Você deve blefar?',
      options: [
        { id: 'bluff', label: 'Sim, apostar blefe', correct: false },
        { id: 'check', label: 'Não, check back', correct: true },
      ],
      explanation: `Você NÃO bloqueia a nuts (straight mais alta). Num board conectado, o vilão pode ter a nuts facilmente. Sem bloquear as mãos mais fortes, blefar é arriscado.`,
      concept: 'Para blefar, bloqueie as nuts. Se não bloqueia as mãos mais fortes, o blefe tem menos fold equity.',
    }
  },

  // 10. Suit blocker em semi-blefe
  () => {
    const suit = pick(['ouros', 'copas', 'espadas'])
    const suitChar = suit === 'ouros' ? 'd' : suit === 'copas' ? 'h' : 's'
    const r1 = pick(['7', '8', '6', '5'])
    const r2 = pick(['4', '3', '2'])
    const boardHighs = pick(['A', 'K', 'Q'])
    return {
      situation: `Flop: ${boardHighs}${suitChar}-${pick(['8','7','6'])}${suitChar}-${pick(['3','2','4'])}s. SB aposta 33%. Você está no BB com ${r1}${suitChar}${r2}${suitChar} (flush draw + 2 blockers de ${suit}).`,
      question: 'Como usar blockers na decisão?',
      options: [
        { id: 'raise', label: 'Check-raise — flush draw + blockers', correct: true },
        { id: 'call', label: 'Call — apenas flush draw', correct: false },
      ],
      explanation: `Duas cartas de ${suit} reduzem os combos de flush draw do vilão. Ele provavelmente não tem flush draw — está apostando com top pair ou air. Check-raise com fold equity + equity do draw.`,
      concept: 'Suit blocker: ter cartas do naipe do draw reduz combos de draw do oponente, tornando raises mais efetivos.',
    }
  },

  // 11. Blocker de continue vs blocker de fold
  () => {
    const hand = pick(['A5s', 'A4s', 'A3s'])
    const altHand = pick(['KQs', 'KJs', 'QJs'])
    const heroPos = pick(['BTN', 'SB', 'BB'])
    const villainPos = pick(['UTG', 'LJ', 'HJ', 'CO'])
    return {
      situation: `${villainPos} fez raise. Você está no ${heroPos}. Qual é MELHOR para 3-bet blefe: ${hand} ou ${altHand}?`,
      question: 'Qual mão escolher?',
      options: [
        { id: 'ace', label: `${hand} — bloqueia continues`, correct: true },
        { id: 'broadway', label: `${altHand} — cartas altas`, correct: false },
      ],
      explanation: `${hand} bloqueia AA e AK (mãos que 4-bet ou call). ${altHand} bloqueia KJ, QJ — mãos que FOLDAM. Para 3-bet blefe, bloqueie continues, não folds.`,
      concept: 'Para blefar: bloqueie mãos que continuam (Ace blockers). Não mãos que já foldariam.',
    }
  },

  // 12. River bet com nut blocker
  () => {
    const suit = pick(['copas', 'espadas', 'ouros'])
    const suitChar = suit === 'copas' ? 'h' : suit === 'espadas' ? 's' : 'd'
    const board = pick([`Q${suitChar}-J${suitChar}-7s-3d-4${suitChar}`, `K${suitChar}-T${suitChar}-5h-2d-8${suitChar}`, `A${suitChar}-9${suitChar}-4h-6d-3${suitChar}`])
    return {
      situation: `River: ${board}. Flush de ${suit} completou no river. Você tem A${suitChar} em mão (sem flush, mas bloqueia nut flush). Vilão checou.`,
      question: 'O que você faz?',
      options: [
        { id: 'bluff', label: 'Blefe grande — bloqueia nut flush', correct: true },
        { id: 'check', label: 'Check — sem mão', correct: false },
      ],
      explanation: `Você tem A${suitChar} — bloqueia a nut flush do vilão. Ele não pode ter o melhor flush possível. Blefe grande é muito efetivo porque ele tem medo de não ter a nuts.`,
      concept: 'Nut blocker blefe: quando o flush completa e você tem o Ace do naipe, blefe grande — vilão não pode ter a nuts.',
    }
  },
]

function generateScenario() {
  return pick(TEMPLATES)()
}

function Lesson({ onComplete }) {
  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0f0f0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Módulo 19 — Blockers Avançado</h1>

        <div className="space-y-6" style={{ color: '#ccc', fontSize: 15, lineHeight: 1.8 }}>
          <section>
            <h2 style={{ color: '#e5484d', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>O que são Blockers?</h2>
            <p>Blockers (ou card removal) são as cartas na sua mão que <strong style={{ color: 'white' }}>removem combinações possíveis</strong> do range do oponente. Se você tem o As, existem apenas 3 combos de AA possíveis (em vez de 6).</p>
            <p style={{ marginTop: 8 }}>Entender blockers é o que separa jogadores intermediários de avançados.</p>
          </section>

          <section>
            <h2 style={{ color: '#f5a623', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Tipos de Blockers</h2>
            <div className="rounded-lg p-4" style={{ background: '#1a1a1d' }}>
              <p><strong style={{ color: '#e5484d' }}>1. Nut Blockers:</strong> Bloqueiam a melhor mão possível (ex: Ace em board com flush draw)</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: '#f5a623' }}>2. Blocker de Blefe:</strong> Bloqueiam blefes naturais do oponente</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: '#4a90e2' }}>3. Blocker de Continue:</strong> Removem mãos que o oponente usaria para call/raise</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: '#4fce82' }}>4. Blocker de Fold:</strong> Removem mãos que o oponente foldaria (ruim para blefar)</p>
            </div>
          </section>

          <section>
            <h2 style={{ color: '#4a90e2', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Regra de Ouro</h2>
            <div className="rounded-lg p-4" style={{ background: '#1a1a1d', border: '1px solid #4a90e2' }}>
              <p style={{ color: 'white', fontWeight: 600, fontSize: 16 }}>Para BLEFAR: bloqueie mãos que CONTINUAM</p>
              <p style={{ marginTop: 4 }}>Ter Ace bloqueia AA, AK → oponente menos provável de 4-bet/call</p>
              <p style={{ marginTop: 12, color: 'white', fontWeight: 600, fontSize: 16 }}>Para VALUE BET: bloqueie mãos que FOLDAM</p>
              <p style={{ marginTop: 4 }}>Ter cartas que removem folds = mais calls para seu valor</p>
              <p style={{ marginTop: 12, color: 'white', fontWeight: 600, fontSize: 16 }}>Para CALL/FOLD: bloqueie os BLEFES do oponente</p>
              <p style={{ marginTop: 4 }}>Se bloqueia blefes → fold. Se não bloqueia → call</p>
            </div>
          </section>

          <section>
            <h2 style={{ color: '#e5484d', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Matemática dos Blockers</h2>
            <div className="rounded-lg p-4" style={{ background: '#1a1a1d' }}>
              <p><strong style={{ color: 'white' }}>Pocket pairs:</strong> 6 combos normais. 1 blocker → 3 combos. 2 blockers → 1.</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'white' }}>Offsuit:</strong> 12 combos. Cada blocker remove 3.</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'white' }}>Suited:</strong> 4 combos. Blocker do mesmo naipe remove 1.</p>
            </div>
          </section>
        </div>

        <button onClick={onComplete} className="w-full mt-8 py-4 rounded-xl font-bold text-lg"
          style={{ background: '#e5484d', color: 'white' }}>
          Entendi — Vamos Treinar!
        </button>
      </div>
    </div>
  )
}

function Trainer() {
  const { progress, recordAnswer, recordSession } = useProgress()
  const [scenario, setScenario] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [sessionDone, setSessionDone] = useState(false)

  function newScenario() {
    if (sessionTotal >= 10) { setSessionDone(true); return }
    setScenario(generateScenario())
    setFeedback(null)
  }

  function answer(optionId) {
    if (!scenario || feedback) return
    const chosen = scenario.options.find(o => o.id === optionId)
    const isCorrect = chosen.correct
    const newStreak = isCorrect ? streak + 1 : 0
    setStreak(newStreak)
    const newTotal = sessionTotal + 1, newCorrect = sessionCorrect + (isCorrect ? 1 : 0)
    setSessionTotal(newTotal); setSessionCorrect(newCorrect)
    recordAnswer(19, isCorrect, newStreak)
    const isLast = newTotal >= 10
    if (isLast) recordSession(19, Math.round((newCorrect / newTotal) * 100))
    setFeedback({ isCorrect, explanation: scenario.explanation, concept: scenario.concept, correctLabel: scenario.options.find(o => o.correct).label, isLast })
  }

  function restart() { setSessionCorrect(0); setSessionTotal(0); setStreak(0); setSessionDone(false); setFeedback(null); setScenario(null) }

  if (!scenario && !sessionDone) newScenario()

  if (sessionDone) {
    const acc = Math.round((sessionCorrect / sessionTotal) * 100)
    return (
      <div className="text-center" style={{ maxWidth: 400, margin: '0 auto', paddingTop: 40 }}>
        <div style={{ fontSize: 60 }}>{acc >= 90 ? '🎉' : '💪'}</div>
        <h2 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginTop: 16 }}>Sessão Completa!</h2>
        <div style={{ color: acc >= 90 ? '#4fce82' : '#f5a623', fontSize: 36, fontWeight: 700 }}>{acc}%</div>
        <button onClick={restart} className="mt-6 px-8 py-3 rounded-xl font-bold" style={{ background: '#e5484d', color: 'white' }}>Nova Sessão</button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <div className="rounded-xl p-3 mb-4 flex justify-between" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
        <div style={{ color: '#888', fontSize: 13 }}>Sessão: {sessionCorrect}/{sessionTotal} · Seq: {streak}</div>
        <div style={{ color: '#888', fontSize: 13 }}>Meta: 10 cenários</div>
      </div>
      <div className="rounded-full h-2 mb-6" style={{ background: '#2a2a2e' }}>
        <div className="rounded-full h-2 transition-all" style={{ width: `${(sessionTotal / 10) * 100}%`, background: '#e5484d' }} />
      </div>

      {scenario && (
        <>
          <div className="rounded-xl p-4 mb-4" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
            <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>CENARIO BLOCKERS</div>
            <div style={{ color: '#ccc', fontSize: 15, lineHeight: 1.7 }}>{scenario.situation}</div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 16, marginTop: 12 }}>{scenario.question}</div>
          </div>

          {!feedback && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {scenario.options.map(opt => (
                <button key={opt.id} onClick={() => answer(opt.id)} className="py-4 rounded-xl font-bold text-sm"
                  style={{ background: '#2a2a2e', color: 'white', border: '1px solid #333' }}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {feedback && (
            <div className="rounded-xl p-4 mb-4" style={{ background: '#1a1a1d', border: `2px solid ${feedback.isCorrect ? '#4fce82' : '#e5484d'}` }}>
              <div style={{ color: feedback.isCorrect ? '#4fce82' : '#e5484d', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
                {feedback.isCorrect ? 'Correto!' : 'Incorreto'}
              </div>
              <button onClick={newScenario} className="w-full py-3 rounded-lg font-semibold mb-4" style={{ background: '#e5484d', color: 'white', fontSize: 16 }}>Próximo Cenário</button>
              <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>{feedback.explanation}</div>
              <div className="mt-3 rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #f5a62330' }}>
                <div style={{ color: '#f5a623', fontWeight: 600, fontSize: 13 }}>Conceito-chave</div>
                <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>{feedback.concept}</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function Module19() {
  const { progress, markLessonRead } = useProgress()
  const mod = progress.modules[19]
  const [view, setView] = useState(mod?.lessonRead ? 'trainer' : 'lesson')

  if (!mod?.unlocked) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f0f' }}>
      <div className="text-center"><div style={{ fontSize: 60 }}>🔒</div><h2 style={{ color: 'white', marginTop: 16 }}>Módulo Bloqueado</h2><p style={{ color: '#888', marginTop: 8 }}>Complete o Módulo 18 para desbloquear.</p></div>
    </div>
  )

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0f0f0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setView('lesson')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'lesson' ? '#e5484d' : '#1a1a1d', color: view === 'lesson' ? 'white' : '#888', border: '1px solid #2a2a2e' }}>Aula</button>
          <button onClick={() => mod?.lessonRead && setView('trainer')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'trainer' ? '#e5484d' : '#1a1a1d', color: view === 'trainer' ? 'white' : (mod?.lessonRead ? '#888' : '#444'), border: '1px solid #2a2a2e', cursor: mod?.lessonRead ? 'pointer' : 'not-allowed' }}>Trainer {!mod?.lessonRead && '🔒'}</button>
        </div>
        {view === 'lesson' ? <Lesson onComplete={() => { markLessonRead(19); setView('trainer') }} /> : <Trainer />}
      </div>
    </div>
  )
}
