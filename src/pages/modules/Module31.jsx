import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'
import SessionReview from '../../components/SessionReview'
import Card, { parseCard } from '../../components/Card'
import { POSTFLOP_SCENARIOS, ALL_POSTFLOP_CATEGORIES } from '../../data/postflopScenarios'

// ─── Generate a solver scenario ──────────────────────────────────────────────
function generateScenario() {
  const cat = ALL_POSTFLOP_CATEGORIES[Math.floor(Math.random() * ALL_POSTFLOP_CATEGORIES.length)]
  const pool = POSTFLOP_SCENARIOS[cat]
  const sc = pool[Math.floor(Math.random() * pool.length)]
  const isFacing = cat.startsWith('facing_bet')
  const street = sc.b.length === 3 ? 'Flop' : sc.b.length === 4 ? 'Turn' : 'River'

  const LABELS = {
    facing_bet_flop: 'Facing Bet Flop',
    facing_bet_turn: 'Facing Bet Turn',
    facing_bet_river: 'Facing Bet River',
    bet_or_check_flop: 'Bet/Check Flop',
    bet_or_check_turn: 'Bet/Check Turn',
    bet_or_check_river: 'Bet/Check River',
  }

  let options, correct
  if (isFacing) {
    options = ['Fold', 'Call', 'Raise']
    correct = sc.d === 'fold' ? 0 : sc.d === 'call' ? 1 : 2
  } else {
    if (sc.d === 'raise') {
      options = ['Check', 'Bet', 'Raise']
      correct = 2
    } else {
      options = ['Check', 'Bet']
      correct = sc.d === 'bet' ? 1 : 0
    }
  }

  return {
    board: sc.b,
    hole: sc.h,
    street,
    category: LABELS[cat],
    heroPos: sc.hp,
    pot: sc.pot,
    isFacing,
    options,
    correct,
    sizing: sc.sz,
  }
}

// ─── Lesson ──────────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ color: '#4fce82', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{title}</h3>
      <div style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.7 }}>{children}</div>
    </div>
  )
}

function Lesson({ onComplete }) {
  return (
    <div>
      <h2 style={{ color: 'white', fontSize: 22, fontWeight: 800, marginBottom: 20 }}>
        GTO Postflop Solver
      </h2>

      <Section title="O que sao cenarios de solver?">
        <p>Solvers GTO (como PioSOLVER, GTO+) calculam a estrategia <b>matematicamente otima</b> para cada spot do poker.</p>
        <p style={{ marginTop: 8 }}>Diferente de heuristicas simplificadas, o solver considera TODOS os combos, todas as sizing opcoes e encontra o equilibrio de Nash.</p>
        <p style={{ marginTop: 8 }}>Este modulo usa <b>cenarios reais computados por solver</b> do dataset PokerBench — 240 situacoes com a decisao GTO correta.</p>
      </Section>

      <Section title="Tipos de cenarios">
        <p><b>Facing Bet</b> — Vilao apostou. Voce decide: Fold, Call ou Raise.</p>
        <p style={{ marginTop: 4 }}><b>Bet or Check</b> — Vilao checkou. Voce decide: Check ou Bet.</p>
        <p style={{ marginTop: 8 }}>Cenarios cobrem Flop, Turn e River em posicao IP e OOP.</p>
      </Section>

      <Section title="Por que treinar com solver?">
        <p>Heuristicas ("top pair = bet 50%") sao <b>aproximacoes uteis</b>, mas o solver mostra que a realidade e mais sutil.</p>
        <p style={{ marginTop: 8 }}>Exemplos de onde heuristicas falham:</p>
        <ul style={{ paddingLeft: 20, marginTop: 4 }}>
          <li>Top pair com kicker fraco em board conectado = check (nao bet)</li>
          <li>Overpair em board com 4 to straight = fold (nao call)</li>
          <li>Air total no river = bet como blefe (nao check)</li>
        </ul>
        <p style={{ marginTop: 8 }}>Praticar com cenarios de solver calibra sua intuicao para os spots nao-obvios.</p>
      </Section>

      <Section title="Como usar este modulo">
        <p>1. Analise o board, sua mao e a posicao (IP/OOP)</p>
        <p>2. Considere o tamanho do pot e a street</p>
        <p>3. Escolha a acao que voce acha correta</p>
        <p>4. Compare com a resposta do solver</p>
        <p style={{ marginTop: 8 }}>O objetivo nao e memorizar cada spot, mas <b>desenvolver intuicao</b> para quando suas heuristicas devem ser ajustadas.</p>
      </Section>

      <button
        onClick={onComplete}
        style={{
          width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
          background: '#4fce82', color: '#0f0f0f', fontWeight: 700, fontSize: 16,
          cursor: 'pointer', marginTop: 12,
        }}
      >
        Comecar a Treinar
      </button>
    </div>
  )
}

// ─── Trainer ─────────────────────────────────────────────────────────────────
const BTN_COLORS = ['#0a84d7', '#4fce82', '#e5484d']

function Trainer() {
  const { recordAnswer, progress } = useProgress()
  const [scenario, setScenario] = useState(() => generateScenario())
  const [feedback, setFeedback] = useState(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [showReview, setShowReview] = useState(false)

  const handleAnswer = (idx) => {
    if (feedback) return
    const isCorrect = idx === scenario.correct
    setFeedback({ chosen: idx, isCorrect })
    setSessionTotal(t => t + 1)
    if (isCorrect) setSessionCorrect(c => c + 1)
    recordAnswer(31, isCorrect)
  }

  const next = () => {
    if (sessionTotal >= 20) { setShowReview(true); return }
    setScenario(generateScenario())
    setFeedback(null)
  }

  const restart = () => {
    setSessionCorrect(0)
    setSessionTotal(0)
    setShowReview(false)
    setScenario(generateScenario())
    setFeedback(null)
  }

  if (showReview) {
    return <SessionReview moduleId={31} sessionCorrect={sessionCorrect} sessionTotal={sessionTotal} onContinue={restart} />
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ color: '#00d4ff', fontSize: 13, fontWeight: 700 }}>{scenario.category}</div>
        <div style={{ color: '#666', fontSize: 12, fontFamily: 'JetBrains Mono' }}>
          {sessionCorrect}/{sessionTotal}
        </div>
      </div>

      {/* Info bar */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap',
      }}>
        <span style={{ background: '#1a1a2e', padding: '4px 10px', borderRadius: 6, color: '#b3b3b8', fontSize: 12 }}>
          {scenario.street}
        </span>
        <span style={{ background: '#1a1a2e', padding: '4px 10px', borderRadius: 6, color: '#b3b3b8', fontSize: 12 }}>
          {scenario.heroPos}
        </span>
        <span style={{ background: '#1a1a2e', padding: '4px 10px', borderRadius: 6, color: '#b3b3b8', fontSize: 12 }}>
          Pot: {scenario.pot}bb
        </span>
        {scenario.isFacing && (
          <span style={{ background: '#2a1a1a', padding: '4px 10px', borderRadius: 6, color: '#e5484d', fontSize: 12 }}>
            Vilao apostou
          </span>
        )}
      </div>

      {/* Board */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ color: '#666', fontSize: 11, marginBottom: 6 }}>BOARD</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
          {scenario.board.map((c, i) => <Card key={i} card={parseCard(c)} size="md" />)}
        </div>
      </div>

      {/* Hole */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ color: '#666', fontSize: 11, marginBottom: 6 }}>SUA MAO</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
          {scenario.hole.map((c, i) => <Card key={i} card={parseCard(c)} size="md" />)}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {scenario.options.map((opt, i) => {
          let bg = BTN_COLORS[i] || '#0a84d7'
          let border = 'none'
          if (feedback) {
            if (i === scenario.correct) { bg = '#4fce82'; border = '2px solid #4fce82' }
            else if (i === feedback.chosen && !feedback.isCorrect) { bg = '#e5484d'; border = '2px solid #e5484d' }
            else { bg = '#1a1a1d' }
          }
          return (
            <button
              key={opt}
              onClick={() => handleAnswer(i)}
              style={{
                flex: 1, padding: '14px 0', borderRadius: 10,
                border, background: bg, color: 'white',
                fontWeight: 700, fontSize: 15, cursor: feedback ? 'default' : 'pointer',
                opacity: feedback && i !== scenario.correct && i !== feedback.chosen ? 0.4 : 1,
              }}
            >
              {opt}
            </button>
          )
        })}
      </div>

      {/* Feedback */}
      {feedback && (
        <div style={{
          background: feedback.isCorrect ? '#0a2a1a' : '#2a0a0a',
          border: `1px solid ${feedback.isCorrect ? '#4fce82' : '#e5484d'}`,
          borderRadius: 10, padding: 16, marginBottom: 16,
        }}>
          <div style={{ color: feedback.isCorrect ? '#4fce82' : '#e5484d', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
            {feedback.isCorrect ? 'Correto!' : 'Incorreto'}
          </div>
          <div style={{ color: '#b3b3b8', fontSize: 13 }}>
            Resposta do solver: <b style={{ color: '#4fce82' }}>{scenario.options[scenario.correct]}</b>
            {scenario.sizing && <span> (sizing: {scenario.sizing})</span>}
          </div>
        </div>
      )}

      {/* Next */}
      {feedback && (
        <button
          onClick={next}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
            background: '#00d4ff', color: '#0f0f0f', fontWeight: 700, fontSize: 16,
            cursor: 'pointer',
          }}
        >
          {sessionTotal >= 20 ? 'Ver Resultado' : 'Proximo'}
        </button>
      )}
    </div>
  )
}

// ─── Module default export ───────────────────────────────────────────────────
export default function Module31() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[31]?.lessonRead ? 'trainer' : 'lesson')

  if (!progress.modules[31]?.unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f0f' }}>
        <div className="text-center">
          <div style={{ fontSize: 60 }}>🔒</div>
          <h2 style={{ color: 'white', marginTop: 16 }}>Modulo Bloqueado</h2>
          <p style={{ color: '#888', marginTop: 8 }}>Complete o Modulo 30 para desbloquear.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0f0f0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setView('lesson')}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{
              background: view === 'lesson' ? '#00d4ff' : '#1a1a1d',
              color: view === 'lesson' ? '#0f0f0f' : '#888',
              border: '1px solid #2a2a2e',
            }}
          >
            Aula
          </button>
          <button
            onClick={() => progress.modules[31]?.lessonRead && setView('trainer')}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{
              background: view === 'trainer' ? '#00d4ff' : '#1a1a1d',
              color: view === 'trainer' ? '#0f0f0f' : (progress.modules[31]?.lessonRead ? '#888' : '#444'),
              border: '1px solid #2a2a2e',
              cursor: progress.modules[31]?.lessonRead ? 'pointer' : 'not-allowed',
            }}
          >
            Trainer {!progress.modules[31]?.lessonRead && '🔒'}
          </button>
        </div>
        {view === 'lesson'
          ? <Lesson onComplete={() => { markLessonRead(31); setView('trainer') }} />
          : <Trainer />
        }
      </div>
    </div>
  )
}
