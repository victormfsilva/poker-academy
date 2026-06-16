import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'

const SCENARIOS = [
  {
    situation: 'Você está no BTN com A5s. UTG (jogador tight que só abre 12%) fez raise. GTO diz 3-bet.',
    question: 'O que você faz?',
    options: [
      { id: 'gto', label: '3-bet (GTO)', correct: false },
      { id: 'exploit', label: 'Fold (Exploitative)', correct: true },
    ],
    explanation: 'GTO diz 3-bet com A5s do BTN vs UTG. Mas se o jogador é MUITO tight (12%), seu 3-bet de blefe perde valor — ele só continua com range forte. Fold explora a tendencia dele de abrir pouco.',
    concept: 'Contra jogadores muito tight, reduza seus blefes. Eles não abrem o suficiente pra justificar 3-bet light.'
  },
  {
    situation: 'Mesa de torneio. Jogador no BB defende 70%+ dos raises (chama com tudo). Você está no CO com K9o.',
    question: 'O que você faz?',
    options: [
      { id: 'gto', label: 'Fold (GTO)', correct: false },
      { id: 'exploit', label: 'Raise (Exploitative)', correct: true },
    ],
    explanation: 'GTO foldaria K9o do CO. Mas se o BB defende 70%+ (muito frouxo), você pode abrir mais leve porque vai jogar pos-flop IP contra range fraco. Exploitative = aproveitar o erro dele.',
    concept: 'Contra jogadores que chamam demais, amplie seu range de abertura. Você tem edge pos-flop.'
  },
  {
    situation: 'Você está no BB com 87s. BTN (regular forte) fez raise. GTO diz call.',
    question: 'O que você faz?',
    options: [
      { id: 'gto', label: 'Call (GTO)', correct: true },
      { id: 'exploit', label: 'Fold ou 3-bet', correct: false },
    ],
    explanation: 'Contra regulares fortes que jogam perto do GTO, a melhor estratégia é jogar GTO você também. 87s tem equity é jogabilidade suficiente pra call no BB. Desviar do GTO contra bons jogadores te torna exploravel.',
    concept: 'Contra jogadores bons, fique no GTO. Desviar contra quem joga equilibrado cria leaks no seu jogo.'
  },
  {
    situation: 'Cash game. Jogador no BTN c-beta 90% dos flops (aposta quase sempre). Você está no BB num flop A-7-2 com 65s.',
    question: 'O que você faz?',
    options: [
      { id: 'gto', label: 'Fold (GTO)', correct: false },
      { id: 'exploit', label: 'Call ou Check-raise (Exploitative)', correct: true },
    ],
    explanation: 'GTO foldaria 65s num flop A-7-2. Mas se ele c-beta 90%, a maioria das vezes ele não tem nada. Você pode chamar leve ou check-raise de blefe porque o range dele é muito fraco.',
    concept: 'Contra jogadores que apostam demais, defenda mais é check-raise blefe. A alta frequência de c-bet deles significa range fraco.'
  },
  {
    situation: 'Torneio online. Jogador limpa (limp) no SB. Você está no BB com J4o.',
    question: 'O que você faz?',
    options: [
      { id: 'gto', label: 'Check (GTO)', correct: false },
      { id: 'exploit', label: 'Raise grande (Exploitative)', correct: true },
    ],
    explanation: 'GTO checkaria J4o. Mas limpar do SB é um erro enorme — jogadores que limpam geralmente tem range fraco é foldham frequentemente a raises. Raise grande explora essa tendencia.',
    concept: 'Contra limpers, raise mais que o normal. Limpar é um leak que você deve punir.'
  },
  {
    situation: 'Mesa final de torneio. ICM pesado. Jogador short stack shova all-in. Você está no BB com AQo é tem stack médio.',
    question: 'O que você faz?',
    options: [
      { id: 'gto', label: 'Call (ChipEV)', correct: false },
      { id: 'exploit', label: 'Fold (ICM)', correct: true },
    ],
    explanation: 'Em ChipEV puro, AQo é call fácil contra shove. Mas em mesa final com ICM, o custo de bustar é muito maior que o ganho de dobrar. ICM diz fold com muitas mãos que seriam call em ChipEV.',
    concept: 'ICM muda drasticamente as decisões. Na bolha é mesa final, sobrevivencia vale mais que fichas.'
  },
  {
    situation: 'Você está no BTN com QJs. Mesa de 6 jogadores, todos regulares competentes jogando GTO.',
    question: 'O que você faz?',
    options: [
      { id: 'gto', label: 'Raise (GTO padrão)', correct: true },
      { id: 'exploit', label: 'Limp ou fold', correct: false },
    ],
    explanation: 'Contra mesa de regulares fortes, não tem leak pra explorar. QJs é raise padrão do BTN no GTO. Desviar aqui (limpar ou foldar) criaria um leak no SEU jogo que eles poderiam explorar.',
    concept: 'Quando não sabe nada sobre o adversário, jogue GTO. E a estratégia mais segura — ninguem consegue explorar.'
  },
  {
    situation: 'Você está no SB. BB é jogador recreativo que folda 80% a 3-bets (fold demais). Você tem K8s.',
    question: 'O que você faz?',
    options: [
      { id: 'gto', label: 'Complete ou fold (GTO)', correct: false },
      { id: 'exploit', label: '3-bet (Exploitative)', correct: true },
    ],
    explanation: 'GTO não 3-betaria K8s no SB vs BB. Mas se o BB folda 80% a 3-bets, você lucra 3-betando com qualquer mão — ele desiste demais. K8s ainda tem equity de backup se chamar.',
    concept: 'Contra jogadores que foldam demais a 3-bet, 3-bete mais. Você ganha na hora a maioria das vezes.'
  },
  {
    situation: 'Você está IP no river com par médio (99 num board A-K-8-3-2). Adversario é um jogador passivo que raramente blefa.',
    question: 'O que você faz?',
    options: [
      { id: 'gto', label: 'Call se ele apostar (GTO)', correct: false },
      { id: 'exploit', label: 'Fold se ele apostar (Exploitative)', correct: true },
    ],
    explanation: 'GTO teria que chamar com certa frequência pra não ser exploravel. Mas contra jogador passivo que raramente blefa, quando ele aposta no river geralmente TEM mão forte. Fold explora essa tendencia.',
    concept: 'Contra jogadores passivos, respeite as apostas deles — geralmente significam força real.'
  },
  {
    situation: 'Você abriu UTG com AKo. Jogador no BB (regular forte) fez 3-bet. GTO diz call.',
    question: 'O que você faz?',
    options: [
      { id: 'gto', label: 'Call (GTO)', correct: true },
      { id: 'exploit', label: '4-bet ou fold', correct: false },
    ],
    explanation: 'Contra regular forte que 3-beta de forma equilibrada, AKo é call padrão vs 3-bet do BB. 4-bet transforma em blefe (ele pode ter AA/KK), é fold desperdiça equity enorme. GTO é o caminho.',
    concept: 'Contra jogadores equilibrados, siga o GTO. Não tente "adivinhar" — jogue de forma solida.'
  },
]

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
  const [scenarioIdx, setScenarioIdx] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [sessionDone, setSessionDone] = useState(false)
  const [usedIdxs, setUsedIdxs] = useState([])

  function newScenario() {
    if (sessionTotal >= 10) { setSessionDone(true); return }
    const available = SCENARIOS.map((_, i) => i).filter(i => !usedIdxs.includes(i))
    const pool = available.length > 0 ? available : SCENARIOS.map((_, i) => i)
    const idx = pool[Math.floor(Math.random() * pool.length)]
    setScenarioIdx(idx)
    setUsedIdxs(prev => [...prev, idx])
    setFeedback(null)
  }

  function answer(optionId) {
    if (scenarioIdx === null || feedback) return
    const scenario = SCENARIOS[scenarioIdx]
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

  function restart() { setSessionCorrect(0); setSessionTotal(0); setStreak(0); setSessionDone(false); setFeedback(null); setScenarioIdx(null); setUsedIdxs([]) }

  if (scenarioIdx === null && !sessionDone) newScenario()

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

  const scenario = scenarioIdx !== null ? SCENARIOS[scenarioIdx] : null

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <div className="rounded-xl p-3 mb-4 flex justify-between" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
        <div style={{ color: '#888', fontSize: 13 }}>Sessão: {sessionCorrect}/{sessionTotal} · Seq: {streak}</div>
        <div style={{ color: '#888', fontSize: 13 }}>Meta: 10 mãos</div>
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
