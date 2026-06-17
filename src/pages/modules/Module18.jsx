import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'

// ================================================================
// GERADOR DINÂMICO — Multiway Pots
// ================================================================

const pick = arr => arr[Math.floor(Math.random() * arr.length)]

const POSITIONS = ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB']
const HANDS_SUITED_CONN = ['JTs', 'T9s', '98s', '87s', '76s', '65s', '54s']
const HANDS_SUITED_ACE = ['A5s', 'A4s', 'A3s', 'A2s', 'A9s', 'A8s', 'A7s']
const HANDS_PAIRS = ['22', '33', '44', '55', '66', '77', '88']
const HANDS_OFFSUIT = ['KTo', 'Q9o', 'J9o', 'T8o', 'Q8o', 'K7o', 'J8o']
const HANDS_STRONG = ['AKo', 'AQo', 'AQs', 'KQs', 'JJ', 'TT', '99']
const FLOPS_DRY = ['A-7-2 rainbow', 'K-8-3 rainbow', 'Q-5-2 rainbow', 'J-7-4 rainbow', 'A-9-4 rainbow', 'K-6-2 rainbow']
const FLOPS_WET = ['Q-J-9 two-tone', 'T-9-8 two-tone', '9-8-7 monotone', 'K-Q-T two-tone', 'J-T-8 two-tone', '7-6-5 two-tone']
const FLOPS_MEDIUM = ['K-8-5 two-tone', 'Q-7-4 two-tone', 'J-6-3 two-tone', 'A-8-5 two-tone']

const TEMPLATES = [
  // 1. Pre-flop multiway — call com mão jogável
  () => {
    const hand = pick(HANDS_SUITED_CONN)
    const heroPos = pick(['BTN', 'CO', 'HJ'])
    const raiserPos = pick(['UTG', 'UTG+1', 'LJ'])
    const callerPos = pick(POSITIONS.filter(p => p !== heroPos && p !== raiserPos && POSITIONS.indexOf(p) > POSITIONS.indexOf(raiserPos) && POSITIONS.indexOf(p) < POSITIONS.indexOf(heroPos)))
    return {
      situation: `${raiserPos} fez raise, ${callerPos || 'HJ'} chamou. Você está no ${heroPos} com ${hand}.`,
      question: 'O que você faz?',
      options: [
        { id: 'call', label: 'Call', correct: true },
        { id: 'raise', label: '3-bet', correct: false },
      ],
      explanation: `Em multiway, 3-bet com ${hand} não faz sentido — você não vai fazer todos foldarem. Call é perfeito: mão com jogabilidade, posição, e implied odds altas.`,
      concept: 'Em multiway, prefira call com suited connectors ao invés de 3-bet light.',
    }
  },

  // 2. Multiway flop — check com mão fraca
  () => {
    const players = pick([3, 4])
    const hand = pick(['A3s', 'A4s', '65s', '76s', '87s', 'K5s'])
    const flop = pick(FLOPS_DRY)
    const heroPos = 'BB'
    return {
      situation: `${players} jogadores no flop: ${flop}. Você está no ${heroPos} com ${hand} (par baixo ou nada). Checaram até você.`,
      question: 'O que você faz?',
      options: [
        { id: 'bet', label: 'Bet', correct: false },
        { id: 'check', label: 'Check', correct: true },
      ],
      explanation: `Em pote multiway, c-bet com mão fraca é perigoso. Com ${players} adversários, a chance de alguém ter acertado é alta. Check e controle o pote.`,
      concept: 'Em multiway, reduza drasticamente a frequência de c-bet. Só aposte com mãos fortes.',
    }
  },

  // 3. Board conectado multiway — check com draw
  () => {
    const flop = pick(FLOPS_WET)
    const hand = pick(['KTs', 'QTs', 'JTs', 'T9s', '98s', '87s'])
    const players = pick([3, 4])
    return {
      situation: `Flop: ${flop}. Pote multiway (${players} jogadores). Você está IP com ${hand} (straight draw).`,
      question: 'O que você faz?',
      options: [
        { id: 'bet', label: 'Bet', correct: false },
        { id: 'check', label: 'Check (ver carta grátis)', correct: true },
      ],
      explanation: `Board muito conectado com ${players} jogadores. Alguém provavelmente acertou forte. Seu draw é bom mas apostar é arriscado — check e veja o turn grátis.`,
      concept: 'Em boards conectados multiway, check com draws. Alguém provavelmente tem mão forte.',
    }
  },

  // 4. Top pair top kicker em board seco — pode apostar
  () => {
    const hand = pick(['AKo', 'AKs', 'AQo', 'AQs'])
    const flop = pick(FLOPS_DRY.filter(f => f.startsWith('A')))
    const players = pick([3, 4])
    const heroPos = pick(['CO', 'BTN'])
    return {
      situation: `${players} jogadores no flop: ${flop || 'A-7-2 rainbow'}. Você foi o raiser do ${heroPos}. Tem ${hand} (TPTK).`,
      question: 'O que você faz?',
      options: [
        { id: 'bet', label: 'Bet 33-50%', correct: true },
        { id: 'check', label: 'Check', correct: false },
      ],
      explanation: `Exceção: com top pair top kicker em board MUITO seco e range advantage como raiser, pode apostar mesmo multiway. ${hand} é forte o suficiente.`,
      concept: 'Em multiway, aposte em boards secos com mão forte + range advantage clara.',
    }
  },

  // 5. Set mining — implied odds
  () => {
    const hand = pick(HANDS_PAIRS)
    const heroPos = pick(['CO', 'BTN', 'HJ'])
    const raiserPos = pick(['UTG', 'UTG+1', 'LJ'])
    const callers = pick([1, 2])
    return {
      situation: `${raiserPos} fez raise, ${callers} jogador${callers > 1 ? 'es' : ''} chamou. Você está no ${heroPos} com ${hand}.`,
      question: 'Qual o principal motivo de chamar?',
      options: [
        { id: 'implied', label: 'Implied odds (set mining)', correct: true },
        { id: 'equity', label: 'Par é sempre forte', correct: false },
      ],
      explanation: `${hand} em multiway é puro set mining. Acerta set ~12% (1 em 8 flops). Em multiway, extrai muito valor de múltiplos jogadores. Implied odds justificam o call.`,
      concept: 'Pares baixos em multiway = set mining. Você entra pelos implied odds.',
    }
  },

  // 6. Flush feito multiway — apostar grande
  () => {
    const flop = pick(['7s-6s-5s', '9h-8h-4h', 'Td-7d-3d', 'Qs-8s-2s', 'Jh-6h-3h'])
    const hand = pick(['As-2s', 'Ah-5h', 'Kd-9d', 'Ks-4s', 'Ad-6d'])
    const players = pick([3, 4])
    return {
      situation: `Flop: ${flop || '7s-6s-5s'}. Pote multiway (${players} jogadores). Você tem flush feito. Primeiro a agir.`,
      question: 'O que você faz?',
      options: [
        { id: 'bet', label: 'Bet grande (75%)', correct: true },
        { id: 'check', label: 'Check (slow play)', correct: false },
      ],
      explanation: `Com ${players} jogadores num board monotone, alguém quase certamente tem draw ou mão forte. Não slow play — aposte grande. Em multiway, sempre proteja.`,
      concept: 'Em multiway com board perigoso, NUNCA slow play. Aposte grande.',
    }
  },

  // 7. Mão lixo com pot odds — fold
  () => {
    const hand = pick(HANDS_OFFSUIT)
    const callers = pick([3, 4])
    const odds = pick(['4:1', '5:1', '6:1'])
    return {
      situation: `Você está no BB com ${hand}. UTG fez raise, ${callers} jogadores chamaram. Pot odds de ${odds}.`,
      question: 'O que você faz?',
      options: [
        { id: 'call', label: `Call (pot odds ${odds})`, correct: false },
        { id: 'fold', label: 'Fold', correct: true },
      ],
      explanation: `Pot odds bons não compensam jogabilidade ruim. ${hand} não tem conexão, não é suited, e será dominada. Em multiway, precisa de mãos que façam nuts.`,
      concept: 'Em multiway, jogabilidade importa mais que pot odds. Mãos sem potencial de nuts são fold.',
    }
  },

  // 8. Set em board úmido — apostar agressivo
  () => {
    const flop = pick(FLOPS_WET)
    const flopRanks = flop.split('-').map(c => c.replace(/[^A-Z0-9]/gi, '').charAt(0)).filter(r => 'AKQJT98765432'.includes(r))
    const setCard = pick(flopRanks) || 'T'
    const hand = `${setCard}${setCard}`
    const players = pick([3, 4])
    return {
      situation: `Flop: ${flop}. Pote multiway (${players} jogadores). Você está OOP com ${hand} (set).`,
      question: 'O que você faz?',
      options: [
        { id: 'bet', label: 'Bet/check-raise', correct: true },
        { id: 'check', label: 'Check e call', correct: false },
      ],
      explanation: `Set em board úmido com ${players} jogadores — DEVE apostar agressivamente. Muitos draws possíveis podem completar. Não dê carta grátis!`,
      concept: 'Sets em boards úmidos multiway devem ser jogados agressivamente. Proteção é prioridade.',
    }
  },

  // 9. Squeeze com muitos callers — fold
  () => {
    const hand = pick(['AQo', 'AJo', 'KQo', 'KJs'])
    const callers = pick([2, 3])
    const heroPos = 'SB'
    return {
      situation: `UTG fez raise, ${callers} jogadores chamaram. Você está no ${heroPos} com ${hand}.`,
      question: 'O que você faz?',
      options: [
        { id: 'squeeze', label: '3-bet (squeeze)', correct: false },
        { id: 'fold', label: 'Fold', correct: true },
      ],
      explanation: `${hand} do SB contra raiser + ${callers} callers é complicado. Squeeze raramente funciona com ${callers + 1} oponentes, e chamar é OOP contra todos. Fold é correto.`,
      concept: 'Em multiway, aperte o range de 3-bet do SB. Mais jogadores = menos fold equity.',
    }
  },

  // 10. Nut flush draw multiway — call não raise
  () => {
    const hand = pick(['Ah-5h', 'As-4s', 'Ad-7d', 'Ah-3h', 'As-6s'])
    const flop = pick(['Kh-8h-2d', 'Qs-7s-3c', 'Jd-6d-2h', 'Td-5d-3s'])
    const players = pick([3, 4])
    return {
      situation: `Flop: ${flop || 'Kh-8h-2d'}. ${players} jogadores. Alguém aposta 33%. Você tem ${hand || 'Ah-5h'} (nut flush draw).`,
      question: 'O que você faz?',
      options: [
        { id: 'call', label: 'Call', correct: true },
        { id: 'raise', label: 'Raise', correct: false },
      ],
      explanation: `Nut flush draw em multiway — call. Raise com draw é arriscado: pode ter alguém com mão forte que re-raisa. Múltiplos oponentes reduzem fold equity.`,
      concept: 'Em multiway, não semi-blefe com raises. Fold equity é quase zero contra múltiplos.',
    }
  },

  // 11. Multiway — prefer suited hands
  () => {
    const suitedHand = pick(HANDS_SUITED_CONN)
    const offsuitHand = pick(HANDS_OFFSUIT)
    const callers = pick([2, 3])
    return {
      situation: `${callers} jogadores já chamaram. Você está no BTN. Qual tipo de mão é melhor pra entrar no pote multiway?`,
      question: `${suitedHand} (suited) ou ${offsuitHand} (offsuit)?`,
      options: [
        { id: 'suited', label: `${suitedHand} — suited connector`, correct: true },
        { id: 'offsuit', label: `${offsuitHand} — carta alta offsuit`, correct: false },
      ],
      explanation: `${suitedHand} faz nuts (flush, straight). ${offsuitHand} faz segunda melhor mão e é dominada frequentemente. Em multiway, potencial de nuts é essencial.`,
      concept: 'Em multiway, prefira suited connectors e pares. Mãos offsuit desconectadas são lixo.',
    }
  },

  // 12. Overbet multiway é errado
  () => {
    const hand = pick(HANDS_STRONG.slice(0, 3))
    const flop = pick(FLOPS_MEDIUM)
    const players = pick([3, 4])
    return {
      situation: `Flop: ${flop}. ${players} jogadores. Você está IP com ${hand} (top pair forte).`,
      question: 'Qual sizing?',
      options: [
        { id: 'small', label: 'Bet 33-50%', correct: true },
        { id: 'big', label: 'Bet 75%+', correct: false },
      ],
      explanation: `Em multiway com top pair, aposte menor. Sizing grande contra múltiplos oponentes afasta mãos piores e só é pago por melhor. 33-50% extrai valor e mantém ranges piores no pote.`,
      concept: 'Em multiway, use sizings menores. Apostar grande só funciona heads-up.',
    }
  },
]

function generateScenario() {
  return pick(TEMPLATES)()
}

function Lesson({ onComplete }) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        Multiway Pots — Quando Tem Mais de 2 Jogadores
      </h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Tudo muda quando o pote tem 3+ jogadores</p>
      <div className="space-y-4">
        <Section title="Por Que Multiway é Diferente?">
          Em potes heads-up (1v1), blefes funcionam ~50% das vezes. Em multiway com 3 jogadores, a chance de TODOS foldarem cai drasticamente.<br /><br />
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="rounded-lg p-3 text-center" style={{ background: '#0f0f0f', border: '1px solid #4a90e2' }}>
              <div style={{ color: '#4a90e2', fontWeight: 700 }}>Heads-up</div>
              <div style={{ color: 'white', fontSize: 20, fontWeight: 700, marginTop: 4 }}>~50%</div>
              <div style={{ color: '#888', fontSize: 12 }}>fold equity do blefe</div>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: '#0f0f0f', border: '1px solid #e5484d' }}>
              <div style={{ color: '#e5484d', fontWeight: 700 }}>3 jogadores</div>
              <div style={{ color: 'white', fontSize: 20, fontWeight: 700, marginTop: 4 }}>~25%</div>
              <div style={{ color: '#888', fontSize: 12 }}>fold equity do blefe</div>
            </div>
          </div>
        </Section>
        <Section title="Regras de Multiway">
          <div className="space-y-2">
            {[
              { rule: 'Reduza c-bets drasticamente', why: 'Com mais jogadores, alguem provavelmente acertou algo' },
              { rule: 'Aposte apenas com mãos fortes', why: 'Blefes não funcionam contra multiplos oponentes' },
              { rule: 'Proteja mãos fortes agressivamente', why: 'Mais jogadores = mais draws possíveis. Não de carta gratis' },
              { rule: 'Nunca slow play', why: 'Com 3+ oponentes, alguem pode te ultrapassar' },
              { rule: 'Prefira mãos com potencial de nuts', why: 'Suited connectors > offsuit desconectados' },
              { rule: 'Set mining é lucrativo', why: 'Implied odds são maiores com mais jogadores pagando' },
            ].map(r => (
              <div key={r.rule} className="rounded-lg p-3" style={{ background: '#0f0f0f' }}>
                <div style={{ color: '#f5a623', fontWeight: 600, fontSize: 13 }}>{r.rule}</div>
                <div style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>{r.why}</div>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Mãos Boas pra Multiway">
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #4fce82' }}>
              <div style={{ color: '#4fce82', fontWeight: 600 }}>Boas</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Pares (set mining)<br />Suited connectors<br />Suited aces<br />Mãos que fazem nuts</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #e5484d' }}>
              <div style={{ color: '#e5484d', fontWeight: 600 }}>Ruins</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Offsuit desconectados<br />Mãos dominadas (KTo, Q9o)<br />Mãos que fazem 2o melhor</div>
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
    recordAnswer(18, isCorrect, newStreak)
    const isLast = newTotal >= 10
    if (isLast) recordSession(18, Math.round((newCorrect / newTotal) * 100))
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
            <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>CENARIO MULTIWAY</div>
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
              <button onClick={newScenario} className="w-full py-3 rounded-lg font-semibold mb-4" style={{ background: '#e5484d', color: 'white', fontSize: 16 }}>Proximo Cenario</button>
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

export default function Module18() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[18]?.lessonRead ? 'trainer' : 'lesson')
  if (!progress.modules[18]?.unlocked) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f0f' }}>
      <div className="text-center"><div style={{ fontSize: 60 }}>🔒</div><h2 style={{ color: 'white', marginTop: 16 }}>Módulo Bloqueado</h2><p style={{ color: '#888', marginTop: 8 }}>Complete o Módulo 17 para desbloquear.</p></div>
    </div>
  )
  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0f0f0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setView('lesson')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'lesson' ? '#e5484d' : '#1a1a1d', color: view === 'lesson' ? 'white' : '#888', border: '1px solid #2a2a2e' }}>Aula</button>
          <button onClick={() => progress.modules[18]?.lessonRead && setView('trainer')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'trainer' ? '#e5484d' : '#1a1a1d', color: view === 'trainer' ? 'white' : (progress.modules[18]?.lessonRead ? '#888' : '#444'), border: '1px solid #2a2a2e', cursor: progress.modules[18]?.lessonRead ? 'pointer' : 'not-allowed' }}>Trainer {!progress.modules[18]?.lessonRead && '🔒'}</button>
        </div>
        {view === 'lesson' ? <Lesson onComplete={() => { markLessonRead(18); setView('trainer') }} /> : <Trainer />}
      </div>
    </div>
  )
}
