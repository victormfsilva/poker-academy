import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'

const pick = arr => arr[Math.floor(Math.random() * arr.length)]
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

const POSITIONS = ['UTG', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB']
const BOARDS_DRY = ['K♠ 7♦ 2♣', 'A♥ 8♦ 3♠', 'Q♣ 6♠ 2♥', 'J♦ 4♣ 2♠', 'K♥ 9♠ 3♦']
const BOARDS_WET = ['J♠ T♥ 9♣', 'Q♥ J♦ T♠', '8♠ 7♠ 6♣', '9♦ 8♥ 7♠', 'T♣ 9♣ 7♥']
const BOARDS_MONO = ['A♠ 9♠ 4♠', 'K♥ T♥ 6♥', 'Q♣ 8♣ 3♣', 'J♦ 7♦ 2♦']

const TEMPLATES = [
  () => {
    const vpip = randInt(42, 52)
    const pfr = randInt(6, 10)
    const hands = pick([200, 250, 300, 350])
    const pos = pick(['UTG', 'LJ', 'HJ'])
    return {
      situation: `Vilão tem VPIP ${vpip} / PFR ${pfr} em ${hands} mãos. Ele fez raise do ${pos}.`,
      question: 'O que o HUD te diz sobre o range dele?',
      options: [
        { id: 'wide', label: 'Range amplo — ele abre com muita coisa', correct: false },
        { id: 'narrow', label: 'Range muito forte — ele só faz raise com premium', correct: true },
      ],
      explanation: `VPIP ${vpip} (joga ${vpip}% das mãos) mas PFR ${pfr} (só faz raise ${pfr}%). Gap enorme = jogador passivo que limpa muito e só raise com premium. Um raise do ${pos} dele é extremamente forte.`,
      concept: 'VPIP vs PFR gap: quanto maior a diferença, mais passivo o jogador. Alto VPIP + baixo PFR = limpa muito, só raise com premium.'
    }
  },
  () => {
    const vpip = randInt(20, 25)
    const pfr = vpip - randInt(2, 4)
    const tbet = randInt(8, 11)
    const hands = pick([500, 600, 700, 800])
    const heroPos = pick(['CO', 'LJ', 'HJ'])
    return {
      situation: `Vilão tem stats: VPIP ${vpip} / PFR ${pfr} / 3-Bet ${tbet}% em ${hands} mãos. Você abriu do ${heroPos} e ele fez 3-bet do BTN.`,
      question: 'Como você deve reagir?',
      options: [
        { id: 'fold', label: 'Fold — 3-bet dele é forte', correct: false },
        { id: 'defend', label: 'Defender normal — inclui blefes na frequência', correct: true },
      ],
      explanation: `${tbet}% de 3-bet é uma frequência equilibrada que inclui blefes. Um jogador TAG (${vpip}/${pfr}) com 3-bet de ${tbet}% está jogando GTO. Defenda normalmente com seu range de call e 4-bet.`,
      concept: '3-Bet %: abaixo de 5% = só valor. 5-8% = levemente tight. 8-12% = equilibrado. Acima de 12% = muitos blefes.'
    }
  },
  () => {
    const f3b = randInt(72, 82)
    const hands = pick([250, 300, 400, 500])
    const hand = pick(['K8s', 'Q9s', 'J9s', 'K6s', 'Q7s'])
    const vilPos = pick(['BTN', 'CO', 'SB'])
    return {
      situation: `Você está no BB. Vilão do ${vilPos} tem Fold to 3-Bet de ${f3b}% em ${hands} mãos. Você tem ${hand}.`,
      question: 'O que você faz?',
      options: [
        { id: '3bet', label: `3-bet blefe — ele folda ${f3b}%`, correct: true },
        { id: 'call', label: `Call — ${hand} não é forte o suficiente`, correct: false },
      ],
      explanation: `Fold to 3-Bet de ${f3b}% é MUITO alto. Você precisa ~67% de fold equity para um 3-bet blefe ser lucrativo. ${hand} é perfeito — suited com alguma equity quando pago e imensa fold equity imediata.`,
      concept: 'Fold to 3-Bet: acima de 65-70%, 3-bet blefe é automaticamente lucrativo. Explore jogadores que foldam demais.'
    }
  },
  () => {
    const cbet = randInt(80, 92)
    const hands = pick([200, 300, 400])
    const board = pick(BOARDS_DRY)
    const hand = pick(['65s', '74s', '53s', 'T8s'])
    return {
      situation: `Vilão tem CBet Flop de ${cbet}% em ${hands}+ mãos. Você está no BB e ele checkou no flop ${board}. Você tem ${hand}.`,
      question: 'O que o check dele significa?',
      options: [
        { id: 'strong', label: 'Range de check pode ter mãos fortes', correct: false },
        { id: 'weak', label: 'Muito fraco — ele apostaria com qualquer par+', correct: true },
      ],
      explanation: `Com CBet de ${cbet}%, ele aposta quase sempre que tem algo. Quando CHECKA, o range é extremamente fraco — provavelmente whiffs completos. Aposte o turn como blefe.`,
      concept: 'CBet alta = check fraco. Quando um jogador com CBet 80%+ checka, o range de check é quase todo air.'
    }
  },
  () => {
    const checkPct = randInt(55, 65)
    const betPct = 100 - checkPct
    const board = pick([...BOARDS_DRY, ...BOARDS_WET])
    const hand = pick(['top pair', 'overpair', 'two pair'])
    return {
      situation: `Você está analisando uma mão no solver. O solver diz para check ${checkPct}% e apostar ${betPct}% com ${hand} no flop ${board}.`,
      question: 'Como você implementa isso na prática?',
      options: [
        { id: 'mixed', label: 'Aleatorizar — às vezes check, às vezes bet', correct: false },
        { id: 'simplify', label: 'Simplificar — escolha uma ação baseada na textura', correct: true },
      ],
      explanation: `Humanos não conseguem aleatorizar perfeitamente. Em vez de tentar mixar ${checkPct}/${betPct}, simplifique: aposta em boards secos e check em boards molhados. O EV perdido por simplificar é mínimo.`,
      concept: 'Simplificação de solver: não tente replicar frequências mistas. Simplifique usando regras de textura.'
    }
  },
  () => {
    const hand3b = pick(['A5s', 'A4s', 'A3s'])
    const handCall = pick(['A8o', 'A9o', 'ATo'])
    return {
      situation: `Você roda um estudo no solver e vê que ${hand3b} é 3-bet 100% do BB vs BTN, mas ${handCall} é call.`,
      question: `Por que ${hand3b} é 3-bet mas ${handCall} não?`,
      options: [
        { id: 'blockers', label: `${hand3b} tem suited + backdoors + não perde valor por não chamar`, correct: true },
        { id: 'equity', label: `${hand3b} tem mais equity que ${handCall}`, correct: false },
      ],
      explanation: `${handCall} tem MAIS equity pre-flop. Mas ${hand3b} é preferido para 3-bet porque: suited = melhor equity pós-flop, nut flush potential, faz wheel straight, e não perde tanto valor com fold. ${handCall} joga melhor como call.`,
      concept: 'Solver logic: mãos de 3-bet blefe ideais são suited, com bons backdoors, e não perdem muito valor por não chamar.'
    }
  },
  () => {
    const wtsd = randInt(33, 38)
    const wsd = randInt(42, 47)
    return {
      situation: `Você está revisando stats pós-sessão. Seu WTSD é ${wtsd}% e W$SD é ${wsd}%.`,
      question: 'O que esses números indicam?',
      options: [
        { id: 'calling', label: 'Você está chamando demais — muitos showdowns perdidos', correct: true },
        { id: 'fine', label: 'Números normais — está jogando bem', correct: false },
      ],
      explanation: `WTSD ${wtsd}% é alto (ideal 25-30%) e W$SD ${wsd}% é baixo (ideal 50%+). Combinados: você vai demais ao showdown com mãos fracas. Folde mais em spots marginais.`,
      concept: 'WTSD alto + W$SD baixo = calling station. WTSD baixo + W$SD alto = tight demais. Ideal: WTSD 25-30%, W$SD 50-55%.'
    }
  },
  () => {
    const af = pick([0.6, 0.7, 0.8, 0.9])
    const hands = pick([300, 400, 500, 600])
    const board = pick(['A-K-8-5-2', 'K-Q-7-3-9', 'A-J-4-8-6', 'Q-T-3-7-K'])
    const street = pick(['river', 'turn'])
    return {
      situation: `Vilão tem Aggression Factor de ${af} em ${hands} mãos. Ele fez raise no ${street} num board ${board}.`,
      question: 'O que o AF baixo te diz?',
      options: [
        { id: 'strong', label: `${street === 'river' ? 'River' : 'Turn'} raise dele é MUITO forte — ele nunca blefa`, correct: true },
        { id: 'bluff', label: 'Pode ser blefe — ele tá tentando mudar o jogo', correct: false },
      ],
      explanation: `AF de ${af} significa que ele chama MAIS do que aposta/raise. Jogador extremamente passivo. Quando faz raise no ${street}, é quase SEMPRE nuts. Folde com tudo exceto mãos muito fortes.`,
      concept: 'AF: abaixo de 1 = passivo, 1-2 = normal, 2-3 = agressivo, 3+ = hiper. Passivos que raisam = nuts.'
    }
  },
  () => {
    const board = pick(BOARDS_DRY)
    const sizing = pick([25, 30, 33])
    const freq = pick([70, 75, 80])
    return {
      situation: `Você estuda no solver e vê que num board ${board}, o range IP c-bets ${freq}% por ${sizing}% do pot.`,
      question: 'Por que o solver usa sizing pequeno com frequência alta?',
      options: [
        { id: 'range', label: 'Range advantage — IP aposta range inteiro barato', correct: true },
        { id: 'protect', label: 'Proteger mãos fracas com aposta pequena', correct: false },
      ],
      explanation: `Em boards secos como ${board}, o raiser IP tem enorme vantagem de range. O solver explora apostando com quase tudo por ${sizing}% — não precisa sizing grande porque o equity advantage já faz o trabalho.`,
      concept: 'Range advantage → sizing pequeno + frequência alta. Nut advantage → sizing grande + frequência seletiva.'
    }
  },
  () => {
    const vpip = randInt(22, 26)
    const pfr = vpip - randInt(2, 5)
    const tbet = randInt(6, 9)
    const afq = randInt(52, 58)
    const wtsd = randInt(25, 29)
    const wsd = randInt(51, 56)
    const hands = pick([800, 1000, 1200, 1500])
    return {
      situation: `Você tem ${hands} mãos de um regular. Stats: VPIP ${vpip} / PFR ${pfr} / 3B ${tbet} / AFq ${afq} / WTSD ${wtsd} / W$SD ${wsd}.`,
      question: 'Como você classifica esse jogador?',
      options: [
        { id: 'tag', label: 'TAG sólido — joga bem, difícil de explorar', correct: true },
        { id: 'lag', label: 'LAG — muito agressivo, explora com calls', correct: false },
      ],
      explanation: `VPIP ${vpip}/PFR ${pfr} = tight-aggressive. 3-Bet ${tbet}% = equilibrado. AFq ${afq}% = agressivo saudável. WTSD ${wtsd}% = seletivo. W$SD ${wsd}% = ganha no showdown. Perfil TAG sólido. Jogue GTO contra ele.`,
      concept: 'Perfis: TAG (20-25/18-22) = sólido. LAG (28-35/24-30) = agressivo. Nit (12-16/10-14) = tight. Fish (40+/10-) = recreacional.'
    }
  },
  () => {
    const vpip = randInt(14, 18)
    const pfr = randInt(12, 16)
    const tbet = randInt(3, 5)
    const hands = pick([400, 500, 600])
    const heroPos = pick(['BTN', 'CO', 'HJ'])
    return {
      situation: `Vilão tem VPIP ${vpip} / PFR ${pfr} / 3-Bet ${tbet}% em ${hands} mãos. Você abriu do ${heroPos} e ele fez 3-bet do BB.`,
      question: 'Como interpretar o 3-bet dele?',
      options: [
        { id: 'strong', label: 'Extremamente forte — folde tudo que não seja premium', correct: true },
        { id: 'normal', label: 'Normal — defenda com seu range padrão', correct: false },
      ],
      explanation: `3-Bet de ${tbet}% é muito baixo — ele só faz 3-bet com AA, KK, QQ, AK. Com VPIP ${vpip} (nit), o range de 3-bet é ainda mais estreito. Folde tudo exceto QQ+ e AKs.`,
      concept: '3-Bet abaixo de 5% = quase só valor. Contra nits, respeite o 3-bet e overfolde.'
    }
  },
  () => {
    const cbet = randInt(35, 45)
    const hands = pick([300, 400, 500])
    const board = pick(BOARDS_WET)
    return {
      situation: `Vilão tem CBet Flop de ${cbet}% em ${hands} mãos. Ele apostou no flop ${board}.`,
      question: 'O que a CBet baixa em board molhado significa?',
      options: [
        { id: 'strong', label: 'Range de bet polarizado — ele tem mão forte ou draw forte', correct: true },
        { id: 'random', label: 'Aposta aleatória — não significa muito', correct: false },
      ],
      explanation: `CBet de ${cbet}% é seletiva. Em board molhado como ${board}, ele escolhe cuidadosamente quando apostar. Isso significa range polarizado: mãos fortes ou bons draws. Respeite mais a aposta.`,
      concept: 'CBet baixa = range de bet seletivo e forte. CBet alta = range fraco quando checka. Use a frequência para calibrar.'
    }
  },
  () => {
    const board = pick(BOARDS_WET)
    const sizing = pick([65, 70, 75])
    const freq = pick([35, 40, 45])
    return {
      situation: `No solver, board ${board}. O range IP c-bets apenas ${freq}% por ${sizing}% do pot.`,
      question: 'Por que o solver aposta menos mas com sizing maior aqui?',
      options: [
        { id: 'nut', label: 'Nut advantage — precisa proteger equity com sizing grande', correct: true },
        { id: 'bluff', label: 'Mais blefe — sizing grande para fold equity', correct: false },
      ],
      explanation: `Em boards molhados como ${board}, equities correm muito. O solver precisa de sizing grande para negar equity dos draws. Mas como muitas mãos preferem check (draws ruins, pares fracos), a frequência cai.`,
      concept: 'Boards molhados → sizing grande + frequência baixa. Boards secos → sizing pequeno + frequência alta.'
    }
  },
  () => {
    const vpip = randInt(38, 50)
    const pfr = randInt(8, 14)
    const wtsd = randInt(35, 42)
    const hands = pick([200, 300, 400])
    return {
      situation: `Vilão tem VPIP ${vpip} / PFR ${pfr} / WTSD ${wtsd}% em ${hands} mãos. Você tem top pair no river.`,
      question: 'Qual a melhor linha de valor?',
      options: [
        { id: 'value', label: 'Bet grande por valor — ele chama com muito lixo', correct: true },
        { id: 'check', label: 'Check — ele pode ter acertado algo forte', correct: false },
      ],
      explanation: `VPIP ${vpip}% = fish que joga muita mão. WTSD ${wtsd}% = calling station. Ele vai ao showdown com quase tudo. Aposte grande por valor — ele vai pagar com par fraco, Ace high, e até draws perdidos.`,
      concept: 'Contra calling stations (alto WTSD + alto VPIP): value bet grosso, nunca blefe. Eles pagam mas não foldam.'
    }
  },
  () => {
    const stat = pick(['VPIP/PFR', '3-Bet %', 'CBet', 'WTSD/W$SD'])
    const minHands = stat === 'VPIP/PFR' ? 100 : stat === '3-Bet %' ? 300 : stat === 'CBet' ? 200 : 500
    const confHands = stat === 'VPIP/PFR' ? 300 : stat === '3-Bet %' ? 500 : stat === 'CBet' ? 400 : 1000
    const actualHands = randInt(40, Math.floor(minHands * 0.7))
    return {
      situation: `Você tem apenas ${actualHands} mãos de um vilão e está olhando o stat ${stat} dele para tomar uma decisão.`,
      question: 'Você deve confiar nesse stat?',
      options: [
        { id: 'no', label: `Não — amostra muito pequena para ${stat}`, correct: true },
        { id: 'yes', label: 'Sim — qualquer dado é melhor que nenhum', correct: false },
      ],
      explanation: `${stat} precisa de no mínimo ${minHands} mãos para ser minimamente confiável (${confHands}+ para confiança total). Com apenas ${actualHands} mãos, o stat pode variar muito. Use reads gerais em vez de stats específicos.`,
      concept: `Sample sizes: VPIP/PFR = 100+ mãos. 3-Bet = 300+. CBet = 200+. WTSD/W$SD = 500+. Stats com poucas mãos podem enganar.`
    }
  },
]

function generateScenario() {
  return pick(TEMPLATES)()
}

function Lesson({ onComplete }) {
  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 16 }}>📊 Módulo 20 — HUD, Stats e Solvers</h1>

        <div className="space-y-6" style={{ color: '#ccc', fontSize: 15, lineHeight: 1.8 }}>
          <section>
            <h2 style={{ color: '#e94560', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>O que é um HUD?</h2>
            <p>HUD (Heads-Up Display) é um software que exibe estatísticas dos oponentes em tempo real na mesa. Ele coleta dados de todas as mãos jogadas e calcula métricas como VPIP, PFR, 3-Bet%, CBet%, entre outras.</p>
            <p style={{ marginTop: 8 }}>No poker online, o HUD é sua principal ferramenta de coleta de informação. No presencial, você precisa fazer essas anotações mentalmente.</p>
          </section>

          <section>
            <h2 style={{ color: '#f5a623', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Stats Essenciais</h2>
            <div className="rounded-lg p-4" style={{ background: '#1a1a2e' }}>
              <div className="space-y-4">
                <div>
                  <p><strong style={{ color: '#e94560' }}>VPIP (Voluntarily Put $ in Pot):</strong> % de mãos que o jogador entra voluntariamente</p>
                  <p style={{ color: '#888', fontSize: 13 }}>Nit: 12-16% | TAG: 20-25% | LAG: 28-35% | Fish: 40%+</p>
                </div>
                <div>
                  <p><strong style={{ color: '#f5a623' }}>PFR (Pre-Flop Raise):</strong> % de mãos que o jogador faz raise pre-flop</p>
                  <p style={{ color: '#888', fontSize: 13 }}>Gap VPIP-PFR grande = passivo (limpa muito). Gap pequeno = agressivo</p>
                </div>
                <div>
                  <p><strong style={{ color: '#4a90e2' }}>3-Bet %:</strong> Frequência de 3-bet</p>
                  <p style={{ color: '#888', fontSize: 13 }}>{'<'}5% = só valor | 5-8% = tight | 8-12% = equilibrado | {'>'}12% = light</p>
                </div>
                <div>
                  <p><strong style={{ color: '#00d4aa' }}>CBet Flop %:</strong> Frequência de continuation bet no flop</p>
                  <p style={{ color: '#888', fontSize: 13 }}>{'<'}50% = seletivo | 50-65% = equilibrado | {'>'}70% = aposta demais</p>
                </div>
                <div>
                  <p><strong style={{ color: 'white' }}>Fold to 3-Bet %:</strong> Quanto folda quando levam 3-bet</p>
                  <p style={{ color: '#888', fontSize: 13 }}>{'<'}55% = defende muito | 55-65% = normal | {'>'}70% = folda demais</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 style={{ color: '#4a90e2', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Stats Pós-Flop</h2>
            <div className="rounded-lg p-4" style={{ background: '#1a1a2e' }}>
              <div className="space-y-4">
                <div>
                  <p><strong style={{ color: '#e94560' }}>WTSD (Went to Showdown):</strong> % das vezes que vai ao showdown quando vê o flop</p>
                  <p style={{ color: '#888', fontSize: 13 }}>{'<'}22% = folda muito | 25-30% = equilibrado | {'>'}33% = calling station</p>
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
              <p><strong style={{ color: 'white' }}>O que é um solver?</strong> Software que calcula a estratégia GTO (Nash Equilibrium) para cada spot do poker.</p>
              <p style={{ marginTop: 12 }}><strong style={{ color: '#f5a623' }}>Como usar:</strong></p>
              <p style={{ marginTop: 4 }}>1. <strong style={{ color: 'white' }}>Estude spots específicos</strong> — não tente memorizar tudo</p>
              <p style={{ marginTop: 4 }}>2. <strong style={{ color: 'white' }}>Foque em padrões</strong> — boards secos vs molhados, IP vs OOP</p>
              <p style={{ marginTop: 4 }}>3. <strong style={{ color: 'white' }}>Simplifique</strong> — se o solver diz 55/45 bet/check, escolha uma regra simples</p>
              <p style={{ marginTop: 4 }}>4. <strong style={{ color: 'white' }}>Entenda o PORQUÊ</strong> — não apenas o que fazer, mas por que</p>
              <p style={{ marginTop: 12, color: '#888', fontSize: 13 }}>Solvers populares: GTO Wizard, PioSolver, Simple Postflop, MonkerSolver</p>
            </div>
          </section>

          <section>
            <h2 style={{ color: '#e94560', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Sample Size Mínimo</h2>
            <div className="rounded-lg p-4" style={{ background: '#1a1a2e' }}>
              <p style={{ color: 'white', fontWeight: 600 }}>Quantas mãos precisa para confiar nos stats?</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: '#00d4aa' }}>VPIP/PFR:</strong> 100+ mãos (confiável com 300+)</p>
              <p style={{ marginTop: 4 }}><strong style={{ color: '#f5a623' }}>3-Bet %:</strong> 300+ mãos (confiável com 500+)</p>
              <p style={{ marginTop: 4 }}><strong style={{ color: '#e94560' }}>CBet/Fold to CBet:</strong> 200+ mãos</p>
              <p style={{ marginTop: 4 }}><strong style={{ color: '#4a90e2' }}>WTSD/W$SD:</strong> 500+ mãos (confiável com 1000+)</p>
              <p style={{ marginTop: 8, color: '#888', fontSize: 13 }}>Regra geral: quanto mais raro o evento (3-bet, check-raise), mais mãos você precisa.</p>
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
  const [scenarios] = useState(() => Array.from({ length: 10 }, generateScenario))
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [finished, setFinished] = useState(false)

  const scenario = scenarios[current]

  const scoreRef = { current: score }
  scoreRef.current = score

  function handleSelect(option) {
    if (showResult) return
    setSelected(option)
    setShowResult(true)
    const correct = option.correct
    const newStreak = correct ? streak + 1 : 0
    setStreak(newStreak)
    if (correct) setScore(s => s + 1)
    recordAnswer(20, correct, newStreak)
  }

  function handleNext() {
    const finalScore = score + (selected?.correct ? 1 : 0)
    if (current + 1 >= 10) {
      const accuracy = Math.round(finalScore / 10 * 100)
      recordSession(20, accuracy)
      setFinished(true)
    } else {
      setCurrent(c => c + 1)
      setSelected(null)
      setShowResult(false)
    }
  }

  if (finished) {
    const accuracy = Math.round(score / 10 * 100)
    return (
      <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4 flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="text-center">
          <div style={{ fontSize: 48, marginBottom: 16 }}>{accuracy >= 90 ? '🏆' : accuracy >= 70 ? '💪' : '📚'}</div>
          <div style={{ color: 'white', fontSize: 28, fontWeight: 700 }}>{accuracy}% de acerto</div>
          <div style={{ color: '#888', marginTop: 8 }}>{score}/10 decisões corretas</div>
          <div style={{ color: '#666', marginTop: 4, fontSize: 14 }}>Meta: 90%+ em 2 sessões seguidas</div>
          <button onClick={() => window.location.reload()}
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
          <div style={{ color: '#888', fontSize: 14 }}>Questão {current + 1}/10</div>
          <div className="flex gap-3">
            <span style={{ color: '#00d4aa', fontSize: 14 }}>✓ {score}</span>
            <span style={{ color: '#e94560', fontSize: 14 }}>✗ {current - score + (showResult && !selected?.correct ? 1 : 0)}</span>
          </div>
        </div>

        <div className="rounded-xl p-5" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
          <div style={{ color: '#f5a623', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>SITUAÇÃO</div>
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
              {current + 1 >= 10 ? 'Ver Resultado' : 'Próxima →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Module20() {
  const { progress, markLessonRead } = useProgress()
  const mod = progress.modules[20]

  if (!mod?.unlocked) return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4 flex items-center justify-center" style={{ background: '#0a0a0f' }}>
      <div className="text-center"><div style={{ fontSize: 60 }}>🔒</div><h2 style={{ color: 'white', marginTop: 16 }}>Módulo Bloqueado</h2><p style={{ color: '#888', marginTop: 8 }}>Complete o Módulo 19 para desbloquear.</p></div>
    </div>
  )

  if (!mod?.lessonRead) {
    return <Lesson onComplete={() => markLessonRead(20)} />
  }
  return <Trainer />
}
