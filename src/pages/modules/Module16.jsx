import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'

// ================================================================
// GERADOR DINÂMICO — GTO vs Exploitative
// Templates parametrizados geram milhares de combinações únicas
// ================================================================

const POSITIONS = ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB']
const pick = arr => arr[Math.floor(Math.random() * arr.length)]

const HANDS_PREMIUM = ['AA', 'KK', 'QQ', 'AKs', 'AKo']
const HANDS_STRONG = ['JJ', 'TT', 'AQs', 'AQo', 'AJs', 'KQs']
const HANDS_MEDIUM = ['99', '88', '77', 'ATs', 'AJo', 'KJs', 'QJs', 'JTs']
const HANDS_LIGHT = ['66', '55', 'A5s', 'A4s', 'A3s', 'K9s', 'K8s', 'Q9s', 'T9s', '98s', '87s', '76s']
const HANDS_TRASH = ['K9o', 'K7o', 'Q8o', 'J7o', 'T8o', 'J4o', '93o', '72o', 'Q3o', 'T6o', '84o']
const HANDS_MARGINAL_OPEN = ['K9o', 'Q9o', 'J9o', 'T9o', 'K8o', 'Q8o', 'J8o']

const VILLAIN_TYPES = [
  { type: 'tight', desc: 'jogador tight que só abre 12%', vpip: 12, pfr: 10, foldTo3bet: 65, cbet: 55, riverBluff: 'raramente' },
  { type: 'nit', desc: 'nit extremo que só abre 8%', vpip: 8, pfr: 7, foldTo3bet: 75, cbet: 45, riverBluff: 'nunca' },
  { type: 'loose-passive', desc: 'calling station que chama tudo', vpip: 55, pfr: 8, foldTo3bet: 30, cbet: 40, riverBluff: 'raramente' },
  { type: 'loose-aggressive', desc: 'LAG que abre 35% e 3-beta muito', vpip: 35, pfr: 28, foldTo3bet: 45, cbet: 75, riverBluff: 'frequentemente' },
  { type: 'maniac', desc: 'maníaco que aposta e raisa tudo', vpip: 50, pfr: 40, foldTo3bet: 35, cbet: 90, riverBluff: 'sempre' },
  { type: 'regular', desc: 'regular forte que joga GTO', vpip: 22, pfr: 18, foldTo3bet: 55, cbet: 65, riverBluff: 'de forma equilibrada' },
  { type: 'passive', desc: 'jogador passivo que raramente aposta ou raisa', vpip: 30, pfr: 6, foldTo3bet: 70, cbet: 35, riverBluff: 'quase nunca' },
  { type: 'over-folder', desc: 'jogador que folda 80% a 3-bets', vpip: 25, pfr: 20, foldTo3bet: 80, cbet: 60, riverBluff: 'raramente' },
  { type: 'over-cbetter', desc: 'jogador que c-beta 90% dos flops', vpip: 28, pfr: 22, foldTo3bet: 50, cbet: 90, riverBluff: 'as vezes' },
  { type: 'limper', desc: 'jogador recreativo que limpa pre-flop', vpip: 40, pfr: 5, foldTo3bet: 60, cbet: 30, riverBluff: 'nunca' },
]

// Cada template é uma função que retorna um cenário completo
const TEMPLATES = [
  // 1. Villain tight, hero tem blefe GTO
  () => {
    const v = pick(VILLAIN_TYPES.filter(v => v.type === 'tight' || v.type === 'nit'))
    const heroPos = pick(['BTN', 'CO', 'SB'])
    const villainPos = pick(POSITIONS.filter(p => p !== heroPos && POSITIONS.indexOf(p) < POSITIONS.indexOf(heroPos)))
    const hand = pick(HANDS_LIGHT)
    return {
      situation: `Você está no ${heroPos} com ${hand}. ${villainPos} (${v.desc}) fez raise. GTO diz 3-bet.`,
      question: 'O que você faz?',
      options: [
        { id: 'gto', label: '3-bet (GTO)', correct: false },
        { id: 'exploit', label: 'Fold (Exploitative)', correct: true },
      ],
      explanation: `GTO diz 3-bet com ${hand} do ${heroPos} vs ${villainPos}. Mas contra jogador que abre apenas ${v.vpip}%, seu 3-bet de blefe perde valor — ele só continua com range muito forte. Fold explora a tendência dele.`,
      concept: 'Contra jogadores muito tight, reduza seus blefes. Eles não abrem o suficiente pra justificar 3-bet light.',
    }
  },

  // 2. Villain loose-passive, hero pode abrir mais
  () => {
    const heroPos = pick(['CO', 'BTN', 'HJ'])
    const hand = pick(HANDS_MARGINAL_OPEN)
    const defPct = pick([65, 70, 75])
    return {
      situation: `Jogador no BB defende ${defPct}%+ dos raises (chama com tudo). Você está no ${heroPos} com ${hand}.`,
      question: 'O que você faz?',
      options: [
        { id: 'gto', label: 'Fold (GTO)', correct: false },
        { id: 'exploit', label: 'Raise (Exploitative)', correct: true },
      ],
      explanation: `GTO foldaria ${hand} do ${heroPos}. Mas se o BB defende ${defPct}%+ (muito frouxo), abra mais leve — você joga pós-flop IP contra range fraco. Exploitative = aproveitar o erro dele.`,
      concept: 'Contra jogadores que chamam demais, amplie seu range de abertura. Você tem edge pós-flop.',
    }
  },

  // 3. Villain regular forte, jogar GTO
  () => {
    const heroPos = pick(['BB', 'SB', 'BTN', 'CO'])
    const villainPos = pick(POSITIONS.filter(p => p !== heroPos && p !== 'BB' && p !== 'SB'))
    const hand = pick([...HANDS_MEDIUM, ...HANDS_LIGHT])
    const gtoAction = pick(['call', 'raise'])
    return {
      situation: `Você está no ${heroPos} com ${hand}. ${villainPos} (regular forte, joga GTO) fez raise.${gtoAction === 'call' ? ' GTO diz call.' : ' GTO diz 3-bet.'}`,
      question: 'O que você faz?',
      options: [
        { id: 'gto', label: gtoAction === 'call' ? 'Call (GTO)' : '3-bet (GTO)', correct: true },
        { id: 'exploit', label: gtoAction === 'call' ? 'Fold ou 3-bet' : 'Fold ou call', correct: false },
      ],
      explanation: `Contra regulares fortes que jogam GTO, siga o GTO. ${hand} é ${gtoAction} padrão no ${heroPos}. Desviar contra bons jogadores te torna explorável.`,
      concept: 'Contra jogadores bons, fique no GTO. Desviar contra quem joga equilibrado cria leaks no seu jogo.',
    }
  },

  // 4. Villain c-beta demais, hero defende mais
  () => {
    const cbetPct = pick([85, 90, 95])
    const flops = ['A-7-2', 'K-8-3', 'Q-5-2', 'J-7-4', 'T-6-3', '9-4-2', '8-5-3']
    const flop = pick(flops)
    const hand = pick(['65s', '76s', '87s', '43s', '54s', 'T8s', '97s'])
    return {
      situation: `Adversário no BTN c-beta ${cbetPct}% dos flops. Você está no BB num flop ${flop} com ${hand}.`,
      question: 'O que você faz?',
      options: [
        { id: 'gto', label: 'Fold (GTO)', correct: false },
        { id: 'exploit', label: 'Call ou Check-raise (Exploitative)', correct: true },
      ],
      explanation: `GTO foldaria ${hand} nesse flop. Mas se ele c-beta ${cbetPct}%, na maioria das vezes não tem nada. Defenda mais ou check-raise blefe — o range dele é muito fraco.`,
      concept: 'Contra jogadores que apostam demais, defenda mais e check-raise blefe. Alta frequência de c-bet = range fraco.',
    }
  },

  // 5. Villain limpa, hero pune
  () => {
    const hand = pick([...HANDS_TRASH.slice(0, 5), ...HANDS_LIGHT.slice(5)])
    return {
      situation: `Jogador limpa (limp) no SB. Você está no BB com ${hand}.`,
      question: 'O que você faz?',
      options: [
        { id: 'gto', label: 'Check (GTO)', correct: false },
        { id: 'exploit', label: 'Raise grande (Exploitative)', correct: true },
      ],
      explanation: `GTO checkaria ${hand}. Mas limpar do SB é um erro enorme — jogadores que limpam geralmente foldham a raises. Raise grande explora essa tendência.`,
      concept: 'Contra limpers, raise mais que o normal. Limpar é um leak que você deve punir.',
    }
  },

  // 6. ICM pesado, fold mão boa
  () => {
    const hand = pick(['AQo', 'AJs', 'ATs', 'KQs', 'JJ', 'TT'])
    const stack = pick(['médio', 'acima da média'])
    return {
      situation: `Mesa final de torneio. ICM pesado. Short stack shova all-in. Você está no BB com ${hand} e tem stack ${stack}.`,
      question: 'O que você faz?',
      options: [
        { id: 'gto', label: 'Call (ChipEV)', correct: false },
        { id: 'exploit', label: 'Fold (ICM)', correct: true },
      ],
      explanation: `Em ChipEV, ${hand} é call. Mas em mesa final com ICM, o custo de bustar é desproporcional. Com stack ${stack}, sobreviver vale mais que arriscar por fichas marginais.`,
      concept: 'ICM muda decisões drasticamente. Na mesa final, sobrevivência vale mais que fichas.',
    }
  },

  // 7. Mesa de regulares, jogar GTO padrão
  () => {
    const heroPos = pick(['BTN', 'CO', 'HJ'])
    const hand = pick([...HANDS_STRONG, ...HANDS_MEDIUM])
    return {
      situation: `Você está no ${heroPos} com ${hand}. Mesa de 6 jogadores, todos regulares competentes jogando GTO.`,
      question: 'O que você faz?',
      options: [
        { id: 'gto', label: 'Raise (GTO padrão)', correct: true },
        { id: 'exploit', label: 'Limp ou fold', correct: false },
      ],
      explanation: `Contra mesa de regulares fortes, não tem leak pra explorar. ${hand} é raise padrão do ${heroPos}. Desviar cria um leak no SEU jogo.`,
      concept: 'Quando não sabe nada sobre o adversário, jogue GTO. É a estratégia mais segura.',
    }
  },

  // 8. Villain folda demais a 3-bet
  () => {
    const foldPct = pick([75, 80, 85])
    const heroPos = pick(['SB', 'BB', 'BTN'])
    const villainPos = pick(POSITIONS.filter(p => p !== heroPos && p !== 'BB'))
    const hand = pick(HANDS_LIGHT)
    return {
      situation: `${villainPos} (folda ${foldPct}% a 3-bets) fez raise. Você está no ${heroPos} com ${hand}.`,
      question: 'O que você faz?',
      options: [
        { id: 'gto', label: 'Fold ou call (GTO)', correct: false },
        { id: 'exploit', label: '3-bet (Exploitative)', correct: true },
      ],
      explanation: `GTO não 3-betaria ${hand} aqui. Mas se ele folda ${foldPct}% a 3-bets, você lucra 3-betando leve — ganha na hora a maioria das vezes. ${hand} tem equity de backup.`,
      concept: 'Contra jogadores que foldam demais a 3-bet, 3-bete mais. Você ganha na hora na maioria.',
    }
  },

  // 9. Villain passivo aposta river
  () => {
    const hand = pick(['99', '88', '77', 'TT', 'JJ'])
    const boards = ['A-K-8-3-2', 'K-Q-7-4-3', 'A-J-9-5-2', 'Q-T-6-3-8', 'K-J-8-4-2']
    const board = pick(boards)
    return {
      situation: `River: board ${board}. Você está IP com ${hand}. Adversário é passivo que ${pick(['raramente blefa', 'quase nunca aposta sem mão forte', 'só aposta river com nuts'])}. Ele aposta grande.`,
      question: 'O que você faz?',
      options: [
        { id: 'gto', label: 'Call (GTO)', correct: false },
        { id: 'exploit', label: 'Fold (Exploitative)', correct: true },
      ],
      explanation: `GTO chamaria com certa frequência pra não ser explorável. Mas contra jogador passivo, aposta grande no river = mão forte. Fold explora essa tendência.`,
      concept: 'Contra jogadores passivos, respeite as apostas deles — geralmente significam força real.',
    }
  },

  // 10. Regular forte 3-beta, hero tem mão forte
  () => {
    const hand = pick(['AKo', 'AKs', 'QQ'])
    const heroPos = pick(['UTG', 'UTG+1', 'LJ', 'HJ'])
    return {
      situation: `Você abriu ${heroPos} com ${hand}. BB (regular forte) fez 3-bet equilibrado. GTO diz call.`,
      question: 'O que você faz?',
      options: [
        { id: 'gto', label: 'Call (GTO)', correct: true },
        { id: 'exploit', label: '4-bet ou fold', correct: false },
      ],
      explanation: `Contra regular equilibrado, ${hand} é call padrão vs 3-bet. 4-bet pode ser prematura contra range balanceado, e fold desperdiça equity enorme. GTO é o caminho.`,
      concept: 'Contra jogadores equilibrados, siga o GTO. Não tente adivinhar.',
    }
  },

  // 11. Villain maníaco, hero tighta e trapa
  () => {
    const hand = pick(HANDS_STRONG)
    const heroPos = pick(['BB', 'SB', 'BTN'])
    return {
      situation: `Maníaco (VPIP 50%, PFR 40%) fez raise do CO. Você está no ${heroPos} com ${hand}. GTO diz 3-bet.`,
      question: 'O que você faz?',
      options: [
        { id: 'gto', label: '3-bet (GTO)', correct: false },
        { id: 'exploit', label: 'Call (trap)', correct: true },
      ],
      explanation: `GTO diz 3-bet, mas contra maníaco que 4-beta qualquer coisa, call é melhor — trapa ele pós-flop onde comete mais erros. 3-bet infla o pote e ele não folda.`,
      concept: 'Contra maníacos, trape com mãos fortes. Eles se enforcam sozinhos pós-flop.',
    }
  },

  // 12. Calling station, menos blefe mais valor
  () => {
    const hand = pick(['87s', 'A5s', '65s', 'T8s', '43s'])
    const flops = ['K-8-3', 'Q-7-2', 'J-6-4', 'A-9-5', 'T-7-3']
    const flop = pick(flops)
    return {
      situation: `Flop ${flop}. Adversário é calling station (chama com qualquer par/draw). Você tem ${hand} sem nada no flop. GTO diz c-bet blefe.`,
      question: 'O que você faz?',
      options: [
        { id: 'gto', label: 'C-bet blefe (GTO)', correct: false },
        { id: 'exploit', label: 'Check (Exploitative)', correct: true },
      ],
      explanation: `GTO c-betaria como blefe. Mas contra calling station, blefe não funciona — ele chama com tudo. Economize fichas e check. Guarde seus blefes pra adversários que foldham.`,
      concept: 'Contra calling stations, nunca blefe. Aposte apenas por valor — eles pagam.',
    }
  },

  // 13. Villain desconhecido, default GTO
  () => {
    const heroPos = pick(['BTN', 'CO', 'HJ', 'BB'])
    const villainPos = pick(POSITIONS.filter(p => p !== heroPos))
    const hand = pick([...HANDS_MEDIUM, ...HANDS_STRONG])
    return {
      situation: `Primeira mão na mesa. Você não sabe nada sobre os adversários. ${villainPos} fez raise. Você está no ${heroPos} com ${hand}.`,
      question: 'Como decidir?',
      options: [
        { id: 'gto', label: 'Jogar GTO (default seguro)', correct: true },
        { id: 'exploit', label: 'Tentar ler o adversário', correct: false },
      ],
      explanation: `Sem informação sobre o adversário, GTO é o default. Não tente adivinhar tendências na primeira mão. ${hand} segue a linha GTO padrão.`,
      concept: 'Sem informação, jogue GTO. Observe e ajuste depois de ter dados suficientes.',
    }
  },

  // 14. Villain LAG, widen 3-bet value
  () => {
    const hand = pick(['ATs', 'AJo', 'KQo', '99', 'TT'])
    const heroPos = pick(['BB', 'SB', 'BTN'])
    const villainPos = pick(['CO', 'BTN', 'HJ'])
    return {
      situation: `${villainPos} (LAG, abre 35%) fez raise. Você está no ${heroPos} com ${hand}. GTO diz call.`,
      question: 'O que você faz?',
      options: [
        { id: 'gto', label: 'Call (GTO)', correct: false },
        { id: 'exploit', label: '3-bet valor (Exploitative)', correct: true },
      ],
      explanation: `GTO diz call com ${hand}. Mas contra LAG que abre 35%, o range dele é fraco — ${hand} vira 3-bet de valor. Ele vai chamar com muitas mãos piores.`,
      concept: 'Contra LAGs, amplie seu range de 3-bet de valor. O range de abertura deles é fraco.',
    }
  },

  // 15. Calling station river, thin value bet
  () => {
    const hand = pick(['A9o', 'KTo', 'QJo', 'AT', 'KJ'])
    const boards = ['T-7-3-2-5', 'J-8-4-2-6', 'Q-6-3-9-2', 'K-8-5-3-7']
    const board = pick(boards)
    return {
      situation: `River: board ${board}. Você tem ${hand} (top pair fraco). Adversário é calling station que nunca folda pares.`,
      question: 'O que você faz?',
      options: [
        { id: 'gto', label: 'Check (GTO)', correct: false },
        { id: 'exploit', label: 'Value bet fino (Exploitative)', correct: true },
      ],
      explanation: `GTO checkaria com top pair fraco no river. Mas contra calling station, value bet fino é imprimível — ele paga com pares menores, draws que não completaram, e lixo. Extraia valor.`,
      concept: 'Contra calling stations, faça thin value bets que normalmente não faria. Eles pagam.',
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
        GTO vs Exploitative — Quando Sair do Livro
      </h1>
      <p style={{ color: '#888', marginBottom: 24 }}>GTO é o baseline. Exploitative é o ajuste. Saber quando usar cada um é o que separa bons jogadores de otimos.</p>
      <div className="space-y-4">
        <Section title="O Que é GTO?">
          <strong style={{ color: '#4a90e2' }}>Game Theory Optimal</strong> — a estratégia matematicamente perfeita que não pode ser explorada. Se você joga GTO perfeito, ninguem consegue lucrar contra você a longo prazo.<br /><br />
          <strong style={{ color: '#888' }}>Problema:</strong> GTO não maximiza seus lucros contra jogadores fracos. E a estratégia mais SEGURA, não a mais LUCRATIVA.
        </Section>
        <Section title="O Que é Exploitative?">
          <strong style={{ color: '#f5a623' }}>Exploitative</strong> — ajustar sua estratégia pra tirar vantagem dos erros específicos do adversário.<br /><br />
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #4a90e2' }}>
              <div style={{ color: '#4a90e2', fontWeight: 700 }}>GTO</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Inexploravel. Seguro. Baseline.</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #f5a623' }}>
              <div style={{ color: '#f5a623', fontWeight: 700 }}>Exploitative</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Lucro máximo. Arriscado. Ajuste.</div>
            </div>
          </div>
        </Section>
        <Section title="Quando Jogar GTO">
          <div className="space-y-2">
            {[
              'Contra jogadores desconhecidos — não sabe os leaks deles',
              'Contra regulares fortes — eles exploram seus desvios',
              'Quando você não tem info suficiente — default seguro',
              'Em mesas com muitos jogadores bons',
            ].map((t, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span style={{ color: '#4a90e2' }}>•</span>
                <span style={{ color: '#ccc', fontSize: 14 }}>{t}</span>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Quando Jogar Exploitative">
          <div className="space-y-2">
            {[
              { leak: 'Jogador folda demais a 3-bet', adjust: '3-bete mais, especialmente como blefe' },
              { leak: 'Jogador chama demais (calling station)', adjust: 'Menos blefe, mais value bet thin' },
              { leak: 'Jogador c-beta 90%+ dos flops', adjust: 'Chame/raise mais, ele tem range fraco' },
              { leak: 'Jogador passivo nunca blefa river', adjust: 'Fold quando ele aposta grande no river' },
              { leak: 'Jogador limpa pre-flop', adjust: 'Raise grande — limpar é leak' },
            ].map(r => (
              <div key={r.leak} className="rounded-lg p-3" style={{ background: '#0a0a0f' }}>
                <div style={{ color: '#e94560', fontWeight: 600, fontSize: 13 }}>Leak: {r.leak}</div>
                <div style={{ color: '#00d4aa', fontSize: 13, marginTop: 4 }}>Ajuste: {r.adjust}</div>
              </div>
            ))}
          </div>
        </Section>
        <Section title="A Regra de Ouro">
          <div className="rounded-lg p-4 text-center" style={{ background: '#0a0a0f', border: '1px solid #f5a623' }}>
            <div style={{ color: '#f5a623', fontWeight: 700, fontSize: 16 }}>
              "Jogue GTO até ter motivo pra desviar."
            </div>
            <div style={{ color: '#ccc', fontSize: 13, marginTop: 8 }}>
              Comece com GTO como baseline. Observe os adversarios. Quando identificar um leak claro, ajuste. Se não sabe, volte ao GTO.
            </div>
          </div>
        </Section>
      </div>
      <button onClick={onComplete} className="w-full mt-8 py-4 rounded-xl font-bold text-white text-lg" style={{ background: '#e94560' }}>
        Entendi — Quero Treinar
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
    recordAnswer(16, isCorrect, newStreak)
    const isLast = newTotal >= 10
    if (isLast) recordSession(16, Math.round((newCorrect / newTotal) * 100))
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
        <div style={{ color: acc >= 90 ? '#00d4aa' : '#f5a623', fontSize: 36, fontWeight: 700 }}>{acc}%</div>
        <button onClick={restart} className="mt-6 px-8 py-3 rounded-xl font-bold" style={{ background: '#e94560', color: 'white' }}>Nova Sessão</button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <div className="rounded-xl p-3 mb-4 flex justify-between" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
        <div style={{ color: '#888', fontSize: 13 }}>Sessão: {sessionCorrect}/{sessionTotal} · Seq: {streak}</div>
        <div style={{ color: '#888', fontSize: 13 }}>Meta: 10 cenários</div>
      </div>
      <div className="rounded-full h-2 mb-6" style={{ background: '#1e1e2e' }}>
        <div className="rounded-full h-2 transition-all" style={{ width: `${(sessionTotal / 10) * 100}%`, background: '#e94560' }} />
      </div>

      {scenario && (
        <>
          <div className="rounded-xl p-4 mb-4" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
            <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>CENARIO</div>
            <div style={{ color: '#ccc', fontSize: 15, lineHeight: 1.7 }}>{scenario.situation}</div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 16, marginTop: 12 }}>{scenario.question}</div>
          </div>

          {!feedback && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {scenario.options.map(opt => (
                <button key={opt.id} onClick={() => answer(opt.id)} className="py-4 rounded-xl font-bold text-sm"
                  style={{ background: opt.id === 'gto' ? '#4a90e2' : '#f5a623', color: opt.id === 'gto' ? 'white' : '#0a0a0f' }}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {feedback && (
            <div className="rounded-xl p-4 mb-4" style={{ background: '#12121a', border: `2px solid ${feedback.isCorrect ? '#00d4aa' : '#e94560'}` }}>
              <div style={{ color: feedback.isCorrect ? '#00d4aa' : '#e94560', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
                {feedback.isCorrect ? 'Correto!' : 'Incorreto'}
              </div>
              <button onClick={newScenario} className="w-full py-3 rounded-lg font-semibold mb-4" style={{ background: '#e94560', color: 'white', fontSize: 16 }}>Proximo Cenario</button>
              <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>{feedback.explanation}</div>
              <div className="mt-3 rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #f5a62330' }}>
                <div style={{ color: '#f5a623', fontWeight: 600, fontSize: 13 }}>Conceito-chave</div>
                <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>{feedback.concept}</div>
              </div>
              <div style={{ color: '#555', fontSize: 12, marginTop: 8 }}>
                Correto: <strong style={{ color: '#f5a623' }}>{feedback.correctLabel}</strong>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function Module16() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[16]?.lessonRead ? 'trainer' : 'lesson')
  if (!progress.modules[16]?.unlocked) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
      <div className="text-center"><div style={{ fontSize: 60 }}>🔒</div><h2 style={{ color: 'white', marginTop: 16 }}>Módulo Bloqueado</h2><p style={{ color: '#888', marginTop: 8 }}>Complete o Módulo 15 para desbloquear.</p></div>
    </div>
  )
  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setView('lesson')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'lesson' ? '#e94560' : '#12121a', color: view === 'lesson' ? 'white' : '#888', border: '1px solid #1e1e2e' }}>Aula</button>
          <button onClick={() => progress.modules[16]?.lessonRead && setView('trainer')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'trainer' ? '#e94560' : '#12121a', color: view === 'trainer' ? 'white' : (progress.modules[16]?.lessonRead ? '#888' : '#444'), border: '1px solid #1e1e2e', cursor: progress.modules[16]?.lessonRead ? 'pointer' : 'not-allowed' }}>Trainer {!progress.modules[16]?.lessonRead && '🔒'}</button>
        </div>
        {view === 'lesson' ? <Lesson onComplete={() => { markLessonRead(16); setView('trainer') }} /> : <Trainer />}
      </div>
    </div>
  )
}
