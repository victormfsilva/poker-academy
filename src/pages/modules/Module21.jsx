import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'

const SCENARIOS = [
  {
    situation: 'Voce esta usando um HUD e ve que o vilao tem VPIP 45 / PFR 8 em 200 maos. Ele fez raise do UTG.',
    question: 'O que o HUD te diz sobre o range dele?',
    options: [
      { id: 'wide', label: 'Range amplo — ele abre com muita coisa', correct: false },
      { id: 'narrow', label: 'Range muito forte — ele so faz raise com premium', correct: true },
    ],
    explanation: 'VPIP 45 (joga 45% das maos) mas PFR 8 (so faz raise 8%). Isso significa que ele LIMPA muito e so faz raise com maos premium. Um raise do UTG dele e extremamente forte. Gap enorme entre VPIP e PFR = jogador passivo.',
    concept: 'VPIP vs PFR gap: quanto maior a diferenca, mais passivo o jogador. Alto VPIP + baixo PFR = limpa muito, so raise com premium.'
  },
  {
    situation: 'Vilao tem stats: VPIP 22 / PFR 19 / 3-Bet 9% em 500+ maos. Voce abriu do CO e ele fez 3-bet do BTN.',
    question: 'Como voce deve reagir?',
    options: [
      { id: 'fold', label: 'Fold — 3-bet dele e forte', correct: false },
      { id: 'defend', label: 'Defender normal — 9% 3-bet inclui blefes', correct: true },
    ],
    explanation: '9% de 3-bet e uma frequencia saudavel que inclui bastante blefe. Um jogador TAG (22/19) com 3-bet de 9% esta jogando equilibrado. Nao precisa overfoldar — defenda normalmente com seu range de call e 4-bet.',
    concept: '3-Bet %: abaixo de 5% = so valor. 5-8% = levemente tight. 8-12% = equilibrado. Acima de 12% = muitos blefes.'
  },
  {
    situation: 'Voce esta no BB. Vilao do BTN tem Fold to 3-Bet de 75% em 300 maos. Voce tem K8s.',
    question: 'O que voce faz?',
    options: [
      { id: '3bet', label: '3-bet blefe — ele folda 75%', correct: true },
      { id: 'call', label: 'Call — K8s nao e forte o suficiente', correct: false },
    ],
    explanation: 'Fold to 3-Bet de 75% e MUITO alto. Voce precisa apenas 67% de fold equity para um 3-bet blefe ser lucrativo (com sizing de 3x). K8s e perfeito — tem alguma equity quando pago e imensa fold equity imediata.',
    concept: 'Fold to 3-Bet: acima de 65-70%, 3-bet blefe e automaticamente lucrativo. Explore jogadores que foldam demais ao 3-bet.'
  },
  {
    situation: 'Vilao tem CBet Flop de 85% em 200+ maos. Voce esta no BB e checkaram no flop A-7-2. Voce tem 65s.',
    question: 'O que o check dele significa?',
    options: [
      { id: 'strong', label: 'Range de check pode ter maos fortes', correct: false },
      { id: 'weak', label: 'Muito fraco — ele apostaria com qualquer par+', correct: true },
    ],
    explanation: 'Com CBet de 85%, ele aposta quase sempre que tem algo. Quando ele CHECKA, o range e extremamente fraco — provavelmente whiffs completos. Voce pode apostar qualquer coisa no turn como blefe.',
    concept: 'CBet alta = check fraco. Quando um jogador com CBet 80%+ checka, o range de check e quase todo air. Explore apostando.'
  },
  {
    situation: 'Voce esta analisando uma mao no solver. O solver diz para check 60% e apostar 40% com top pair no flop.',
    question: 'Como voce implementa isso na pratica?',
    options: [
      { id: 'mixed', label: 'Aleatorizar — as vezes check, as vezes bet', correct: false },
      { id: 'simplify', label: 'Simplificar — escolha uma acao baseada na textura', correct: true },
    ],
    explanation: 'Humanos nao conseguem aleatorizar perfeitamente. Em vez de tentar mixar 60/40, simplifique: aposta em boards secos e check em boards molhados. O EV perdido por simplificar e minimo comparado ao erro de tentar mixar e falhar.',
    concept: 'Simplificacao de solver: nao tente replicar frequencias mistas. Simplifique usando regras de textura. O EV perdido e negligivel.'
  },
  {
    situation: 'Voce roda um estudo no solver e ve que A5s e um 3-bet com 100% de frequencia do BB vs BTN, mas A8o e um call.',
    question: 'Por que A5s e 3-bet mas A8o nao?',
    options: [
      { id: 'blockers', label: 'A5s tem melhor blocker + suited + nao domina calls', correct: true },
      { id: 'equity', label: 'A5s tem mais equity que A8o', correct: false },
    ],
    explanation: 'A8o tem MAIS equity pre-flop que A5s. Mas A5s e preferido para 3-bet porque: (1) suited = melhor equity pos-flop, (2) nao perde muito valor com call (A8o joga melhor flat), (3) nut flush potential, (4) A5 faz wheel straight. A8o joga melhor como call.',
    concept: 'Solver logic: maos de 3-bet blefe ideais tem bons backdoors, sao suited, e nao perdem muito equity por nao chamar.'
  },
  {
    situation: 'Voce ta revisando stats pos-sessao. Seu WTSD (Went to Showdown) e 35% e W$SD (Won $ at Showdown) e 45%.',
    question: 'O que esses numeros indicam?',
    options: [
      { id: 'calling', label: 'Voce esta chamando demais — muitos showdowns perdidos', correct: true },
      { id: 'fine', label: 'Numeros normais — esta jogando bem', correct: false },
    ],
    explanation: 'WTSD 35% e alto (ideal 25-30%) e W$SD 45% e baixo (ideal 50%+). Combinados, mostram que voce esta indo muito ao showdown com maos fracas. Precisa foldar mais em spots marginais e ser mais seletivo com calls.',
    concept: 'WTSD alto + W$SD baixo = calling station. WTSD baixo + W$SD alto = tight demais. Ideal: WTSD 25-30%, W$SD 50-55%.'
  },
  {
    situation: 'Vilao tem Aggression Factor (AF) de 0.8 em 400 maos. Ele fez raise no river num board A-K-8-5-2.',
    question: 'O que o AF baixo te diz?',
    options: [
      { id: 'strong', label: 'River raise dele e MUITO forte — ele nunca blefa', correct: true },
      { id: 'bluff', label: 'Pode ser blefe — ele ta tentando mudar o jogo', correct: false },
    ],
    explanation: 'AF de 0.8 significa que ele chama MAIS do que aposta/faz raise. Jogador extremamente passivo. Quando um jogador passivo faz raise no river, e quase SEMPRE the nuts. Respeite e faca fold com tudo exceto maos muito fortes.',
    concept: 'Aggression Factor (AF): abaixo de 1 = passivo, 1-2 = normal, 2-3 = agressivo, 3+ = hiper-agressivo. Passivos que raisam = nuts.'
  },
  {
    situation: 'Voce esta estudando com um solver e ve que num board K-7-2 rainbow, o range de IP c-bets 75% por 33% do pot.',
    question: 'Por que o solver usa sizing pequeno com frequencia alta?',
    options: [
      { id: 'range', label: 'Range advantage — IP tem vantagem e aposta range inteiro barato', correct: true },
      { id: 'protect', label: 'Proteger maos fracas com aposta pequena', correct: false },
    ],
    explanation: 'Em boards secos como K-7-2, o raiser IP tem enorme vantagem de range (mais KK, AK, etc). O solver explora isso apostando com quase tudo por um preco barato — nao precisa de sizing grande porque o equity advantage ja faz o trabalho.',
    concept: 'Range advantage → sizing pequeno + frequencia alta. Nut advantage → sizing grande + frequencia seletiva. Solvers otimizam isso perfeitamente.'
  },
  {
    situation: 'Voce tem 1000 maos de um regular. Stats: VPIP 24 / PFR 20 / 3B 7 / AFq 55 / WTSD 27 / W$SD 54.',
    question: 'Como voce classifica esse jogador?',
    options: [
      { id: 'tag', label: 'TAG solido — joga bem, dificil de explorar', correct: true },
      { id: 'lag', label: 'LAG — muito agressivo, explora com calls', correct: false },
    ],
    explanation: 'VPIP 24/PFR 20 = tight-aggressive. 3-Bet 7% = equilibrado. AF 55% = agressivo saudavel. WTSD 27% = seletivo. W$SD 54% = ganha mais do que perde no showdown. Esse e um perfil TAG solido. Contra ele, jogue GTO e evite blefar demais.',
    concept: 'Perfis: TAG (20-25/18-22) = solido. LAG (28-35/24-30) = agressivo. Nit (12-16/10-14) = muito tight. Fish (40+/10-) = recreacional.'
  },
]

function Lesson({ onComplete }) {
  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 16 }}>📊 Modulo 21 — HUD, Stats e Solvers</h1>

        <div className="space-y-6" style={{ color: '#ccc', fontSize: 15, lineHeight: 1.8 }}>
          <section>
            <h2 style={{ color: '#e94560', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>O que e um HUD?</h2>
            <p>HUD (Heads-Up Display) e um software que exibe estatisticas dos oponentes em tempo real na mesa. Ele coleta dados de todas as maos jogadas e calcula metricas como VPIP, PFR, 3-Bet%, CBet%, entre outras.</p>
            <p style={{ marginTop: 8 }}>No poker online, o HUD e sua principal ferramenta de coleta de informacao. No presencial, voce precisa fazer essas anotacoes mentalmente.</p>
          </section>

          <section>
            <h2 style={{ color: '#f5a623', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Stats Essenciais</h2>
            <div className="rounded-lg p-4" style={{ background: '#1a1a2e' }}>
              <div className="space-y-4">
                <div>
                  <p><strong style={{ color: '#e94560' }}>VPIP (Voluntarily Put $ in Pot):</strong> % de maos que o jogador entra voluntariamente</p>
                  <p style={{ color: '#888', fontSize: 13 }}>Nit: 12-16% | TAG: 20-25% | LAG: 28-35% | Fish: 40%+</p>
                </div>
                <div>
                  <p><strong style={{ color: '#f5a623' }}>PFR (Pre-Flop Raise):</strong> % de maos que o jogador faz raise pre-flop</p>
                  <p style={{ color: '#888', fontSize: 13 }}>Gap VPIP-PFR grande = passivo (limpa muito). Gap pequeno = agressivo</p>
                </div>
                <div>
                  <p><strong style={{ color: '#4a90e2' }}>3-Bet %:</strong> Frequencia de 3-bet</p>
                  <p style={{ color: '#888', fontSize: 13 }}>{'<'}5% = so valor | 5-8% = tight | 8-12% = equilibrado | {'>'}12% = light</p>
                </div>
                <div>
                  <p><strong style={{ color: '#00d4aa' }}>CBet Flop %:</strong> Frequencia de continuation bet no flop</p>
                  <p style={{ color: '#888', fontSize: 13 }}>{'<'}50% = seletivo | 50-65% = equilibrado | {'>'}70% = aposta demais</p>
                </div>
                <div>
                  <p><strong style={{ color: 'white' }}>Fold to 3-Bet %:</strong> Quanto folda quando levam 3-bet</p>
                  <p style={{ color: '#888', fontSize: 13 }}>{'<'}55% = defende muito | 55-65% = normal | {'>'}70% = folda demais → 3-bet blefe</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 style={{ color: '#4a90e2', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Stats Pos-Flop</h2>
            <div className="rounded-lg p-4" style={{ background: '#1a1a2e' }}>
              <div className="space-y-4">
                <div>
                  <p><strong style={{ color: '#e94560' }}>WTSD (Went to Showdown):</strong> % das vezes que vai ao showdown quando ve o flop</p>
                  <p style={{ color: '#888', fontSize: 13 }}>{'<'}22% = folda muito pos-flop | 25-30% = equilibrado | {'>'}33% = calling station</p>
                </div>
                <div>
                  <p><strong style={{ color: '#f5a623' }}>W$SD (Won $ at Showdown):</strong> % das vezes que ganha no showdown</p>
                  <p style={{ color: '#888', fontSize: 13 }}>{'<'}48% = chamando demais | 50-55% = bom | {'>'}58% = tight demais</p>
                </div>
                <div>
                  <p><strong style={{ color: '#4a90e2' }}>AF (Aggression Factor):</strong> (Bet+Raise) / Call</p>
                  <p style={{ color: '#888', fontSize: 13 }}>{'<'}1 = passivo | 1-2 = normal | 2-3 = agressivo | 3+ = hiper-agressivo</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 style={{ color: '#00d4aa', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Usando Solvers</h2>
            <div className="rounded-lg p-4" style={{ background: '#1a1a2e', border: '1px solid #00d4aa' }}>
              <p><strong style={{ color: 'white' }}>O que e um solver?</strong> Software que calcula a estrategia GTO (Nash Equilibrium) para cada spot do poker.</p>
              <p style={{ marginTop: 12 }}><strong style={{ color: '#f5a623' }}>Como usar:</strong></p>
              <p style={{ marginTop: 4 }}>1. <strong style={{ color: 'white' }}>Estude spots especificos</strong> — nao tente memorizar tudo</p>
              <p style={{ marginTop: 4 }}>2. <strong style={{ color: 'white' }}>Foque em padroes</strong> — boards secos vs molhados, IP vs OOP</p>
              <p style={{ marginTop: 4 }}>3. <strong style={{ color: 'white' }}>Simplifique</strong> — se o solver diz 55/45 bet/check, escolha uma regra simples</p>
              <p style={{ marginTop: 4 }}>4. <strong style={{ color: 'white' }}>Entenda o PORQUE</strong> — nao apenas o que fazer, mas por que</p>
              <p style={{ marginTop: 12, color: '#888', fontSize: 13 }}>Solvers populares: GTO Wizard, PioSolver, Simple Postflop, MonkerSolver</p>
            </div>
          </section>

          <section>
            <h2 style={{ color: '#e94560', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Sample Size Minimo</h2>
            <div className="rounded-lg p-4" style={{ background: '#1a1a2e' }}>
              <p style={{ color: 'white', fontWeight: 600 }}>Quantas maos precisa para confiar nos stats?</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: '#00d4aa' }}>VPIP/PFR:</strong> 100+ maos (confiavel com 300+)</p>
              <p style={{ marginTop: 4 }}><strong style={{ color: '#f5a623' }}>3-Bet %:</strong> 300+ maos (confiavel com 500+)</p>
              <p style={{ marginTop: 4 }}><strong style={{ color: '#e94560' }}>CBet/Fold to CBet:</strong> 200+ maos</p>
              <p style={{ marginTop: 4 }}><strong style={{ color: '#4a90e2' }}>WTSD/W$SD:</strong> 500+ maos (confiavel com 1000+)</p>
              <p style={{ marginTop: 8, color: '#888', fontSize: 13 }}>Regra geral: quanto mais raro o evento (3-bet, check-raise), mais maos voce precisa.</p>
            </div>
          </section>
        </div>

        <button onClick={onComplete} className="w-full mt-8 py-4 rounded-xl font-bold text-lg"
          style={{ background: '#e94560', color: 'white' }}>
          Entendi — Vamos Treinar! →
        </button>
      </div>
    </div>
  )
}

function Trainer() {
  const { recordAnswer, recordSession } = useProgress()
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [finished, setFinished] = useState(false)

  const scenario = SCENARIOS[current]

  function handleSelect(option) {
    if (showResult) return
    setSelected(option)
    setShowResult(true)
    const correct = option.correct
    const newStreak = correct ? streak + 1 : 0
    setStreak(newStreak)
    if (correct) setScore(s => s + 1)
    recordAnswer(21, correct, newStreak)
  }

  function handleNext() {
    if (current + 1 >= SCENARIOS.length) {
      const accuracy = Math.round(score / SCENARIOS.length * 100)
      recordSession(21, accuracy)
      setFinished(true)
    } else {
      setCurrent(c => c + 1)
      setSelected(null)
      setShowResult(false)
    }
  }

  if (finished) {
    const accuracy = Math.round(score / SCENARIOS.length * 100)
    return (
      <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4 flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="text-center">
          <div style={{ fontSize: 48, marginBottom: 16 }}>{accuracy >= 90 ? '🏆' : accuracy >= 70 ? '💪' : '📚'}</div>
          <div style={{ color: 'white', fontSize: 28, fontWeight: 700 }}>{accuracy}% de acerto</div>
          <div style={{ color: '#888', marginTop: 8 }}>{score}/{SCENARIOS.length} decisoes corretas</div>
          <div style={{ color: '#666', marginTop: 4, fontSize: 14 }}>Meta: 90%+ em 2 sessoes seguidas</div>
          <button onClick={() => { setCurrent(0); setSelected(null); setShowResult(false); setScore(0); setStreak(0); setFinished(false) }}
            className="mt-6 px-6 py-3 rounded-xl font-bold" style={{ background: '#e94560', color: 'white' }}>
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex justify-between items-center mb-6">
          <div style={{ color: '#888', fontSize: 14 }}>Questao {current + 1}/{SCENARIOS.length}</div>
          <div className="flex gap-3">
            <span style={{ color: '#00d4aa', fontSize: 14 }}>✓ {score}</span>
            <span style={{ color: '#e94560', fontSize: 14 }}>✗ {current - score}</span>
          </div>
        </div>

        <div className="rounded-xl p-5" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
          <div style={{ color: '#f5a623', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>SITUACAO</div>
          <p style={{ color: '#ccc', fontSize: 15, lineHeight: 1.6 }}>{scenario.situation}</p>
          <p style={{ color: 'white', fontSize: 16, fontWeight: 600, marginTop: 12 }}>{scenario.question}</p>
        </div>

        <div className="flex flex-col gap-3 mt-4">
          {scenario.options.map(opt => (
            <button key={opt.id} onClick={() => handleSelect(opt)}
              className="p-4 rounded-xl text-left font-semibold transition-all"
              style={{
                background: !showResult ? '#1a1a2e' : opt.correct ? '#00d4aa22' : selected?.id === opt.id ? '#e9456033' : '#1a1a2e',
                border: `2px solid ${!showResult ? '#2a2a3e' : opt.correct ? '#00d4aa' : selected?.id === opt.id ? '#e94560' : '#2a2a3e'}`,
                color: !showResult ? 'white' : opt.correct ? '#00d4aa' : selected?.id === opt.id ? '#e94560' : '#666',
                opacity: showResult && !opt.correct && selected?.id !== opt.id ? 0.5 : 1,
              }}>
              {opt.label}
            </button>
          ))}
        </div>

        {showResult && (
          <div className="mt-4 rounded-xl p-4" style={{ background: '#1a1a2e', border: '1px solid #333' }}>
            <div style={{ color: selected?.correct ? '#00d4aa' : '#e94560', fontWeight: 700, marginBottom: 8 }}>
              {selected?.correct ? '✓ Correto!' : '✗ Incorreto'}
            </div>
            <p style={{ color: '#ccc', fontSize: 14, lineHeight: 1.6 }}>{scenario.explanation}</p>
            <div className="mt-3 rounded-lg p-3" style={{ background: '#0a0a0f' }}>
              <div style={{ color: '#f5a623', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>CONCEITO-CHAVE</div>
              <p style={{ color: '#aaa', fontSize: 13 }}>{scenario.concept}</p>
            </div>
            <button onClick={handleNext} className="w-full mt-4 py-3 rounded-xl font-bold"
              style={{ background: '#e94560', color: 'white' }}>
              {current + 1 >= SCENARIOS.length ? 'Ver Resultado' : 'Proxima →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Module21() {
  const { progress, markLessonRead } = useProgress()
  const mod = progress.modules[21]

  if (!mod?.lessonRead) {
    return <Lesson onComplete={() => markLessonRead(21)} />
  }
  return <Trainer />
}
