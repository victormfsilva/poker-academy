import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'

// ================================================================
// GERADOR DINÂMICO — ICM (Independent Chip Model)
// Templates parametrizados com stacks, posições, mãos, premiação
// ================================================================

const pick = arr => arr[Math.floor(Math.random() * arr.length)]
const randBB = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

const POSITIONS = ['UTG', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB']
const HANDS_PREMIUM = ['AA', 'KK', 'QQ', 'AKs']
const HANDS_STRONG = ['JJ', 'TT', 'AQs', 'AQo', 'AKo']
const HANDS_MEDIUM = ['99', '88', '77', 'AJs', 'ATs', 'KQs', 'KQo']
const HANDS_MARGINAL = ['66', '55', 'A9o', 'A8o', 'KJo', 'QJo', 'KTs', 'JTs']
const HANDS_WEAK = ['A5o', 'A3o', 'K8o', 'Q9o', 'J9o', 'T9o', 'K2o', 'Q7o']

const TEMPLATES = [
  // 1. Bolha — fold mão marginal, deixar short bustar
  () => {
    const players = pick([4, 5, 6])
    const itm = players - 1
    const shortBB = randBB(3, 6)
    const heroBB = randBB(15, 25)
    const heroPos = pick(POSITIONS)
    const hand = pick(HANDS_MARGINAL)
    return {
      situation: `Torneio. Pagam ${itm}. Restam ${players} jogadores. Você tem ${heroBB}bb no ${heroPos}. Short stack tem ${shortBB}bb. Você tem ${hand}.`,
      question: 'O que você faz?',
      options: [
        { id: 'raise', label: 'Raise (ChipEV)', correct: false },
        { id: 'fold', label: 'Fold (ICM)', correct: true },
      ],
      explanation: `Em ChipEV, ${hand} seria raise do ${heroPos}. Mas na bolha com short stack de ${shortBB}bb prestes a bustar, não arrisque fichas. Sobreviver garante premiação.`,
      concept: 'Na bolha, sobrevivência vale mais que fichas. Deixe o short stack bustar.',
    }
  },

  // 2. Mesa final — premium é sempre call
  () => {
    const heroBB = randBB(12, 20)
    const villainBB = randBB(30, 50)
    const hand = pick(HANDS_PREMIUM)
    const prize1 = pick([1000, 2000, 5000])
    const prize2 = Math.round(prize1 * 0.6)
    const prize3 = Math.round(prize1 * 0.4)
    return {
      situation: `Mesa final. 3 jogadores. 1o: $${prize1}, 2o: $${prize2}, 3o: $${prize3}. Você tem ${heroBB}bb (menor stack). Chip leader (${villainBB}bb) shova. Você tem ${hand}.`,
      question: 'O que você faz?',
      options: [
        { id: 'call', label: 'Call', correct: true },
        { id: 'fold', label: 'Fold (ICM)', correct: false },
      ],
      explanation: `${hand} é forte demais pra foldar mesmo com ICM pesado. Contra range amplo de shove do chip leader, ${hand} tem equity enorme. ICM ajusta margens, não elimina premiums.`,
      concept: 'ICM muda margens, não elimina mãos premium. QQ+ e AKs quase nunca são fold.',
    }
  },

  // 3. Satélite — sobrevivência extrema
  () => {
    const totalPlayers = pick([10, 15, 20])
    const vagas = Math.floor(totalPlayers / 2)
    const heroBB = randBB(15, 30)
    const hand = pick([...HANDS_STRONG, ...HANDS_MEDIUM])
    const villainBB = randBB(8, 15)
    const villainPos = pick(['UTG', 'CO', 'BTN'])
    return {
      situation: `Satélite. ${totalPlayers} jogadores, ${vagas} vagas (prêmio igual). Você tem ${heroBB}bb. ${villainPos} (${villainBB}bb) shova. Você tem ${hand} no BB.`,
      question: 'O que você faz?',
      options: [
        { id: 'call', label: 'Call', correct: false },
        { id: 'fold', label: 'Fold', correct: true },
      ],
      explanation: `Em satélite com prêmio igual, ICM é EXTREMO. Dobrar fichas não muda seu prêmio. Bustar perde tudo. Com ${heroBB}bb você sobrevive. Mesmo ${hand} é fold.`,
      concept: 'Em satélites, sobrevivência é TUDO. Não arrisque quando já tem stack pra garantir a vaga.',
    }
  },

  // 4. Longe da bolha — jogar ChipEV
  () => {
    const remaining = pick([30, 40, 50])
    const itm = Math.floor(remaining * 0.5)
    const heroBB = randBB(25, 40)
    const hand = pick(HANDS_MEDIUM)
    const villainPos = pick(['BTN', 'CO'])
    const heroPos = 'BB'
    return {
      situation: `Torneio. Pagam ${itm}. Restam ${remaining} jogadores. Você tem ${heroBB}bb no ${heroPos}. ${villainPos} fez raise. Você tem ${hand}.`,
      question: 'O que você faz?',
      options: [
        { id: 'call', label: 'Call (ChipEV normal)', correct: true },
        { id: 'fold', label: 'Fold (ICM)', correct: false },
      ],
      explanation: `Longe da bolha (${remaining} restam, pagam ${itm}), ICM tem pouco impacto. ${hand} é call padrão no BB vs ${villainPos}. Jogue ChipEV.`,
      concept: 'ICM só impacta perto da bolha e na mesa final. Longe dela, jogue ChipEV.',
    }
  },

  // 5. Chip leader na FT — pressionar
  () => {
    const players = pick([4, 5, 6])
    const heroBB = randBB(40, 60)
    const hand = pick([...HANDS_MARGINAL, ...HANDS_WEAK.slice(0, 3)])
    const heroPos = pick(['BTN', 'CO', 'SB'])
    return {
      situation: `Mesa final de ${players}. Você é chip leader (${heroBB}bb). Todos os outros têm 10-15bb. Você está no ${heroPos} com ${hand}.`,
      question: 'O que você faz?',
      options: [
        { id: 'raise', label: 'Raise (pressionar)', correct: true },
        { id: 'fold', label: 'Fold (jogar safe)', correct: false },
      ],
      explanation: `Como chip leader, VOCÊ pressiona. Os stacks médios não podem arriscar bustar por causa dos saltos de premiação. ${hand} é raise — abuse da pressão ICM.`,
      concept: 'Chip leader na mesa final deve AUMENTAR agressividade — os outros não podem revidar.',
    }
  },

  // 6. Bolha — short stack vai bustar, não arrisque
  () => {
    const shortBB = pick([2, 3, 4])
    const heroBB = randBB(15, 22)
    const hand = pick(HANDS_WEAK)
    const heroPos = pick(['SB', 'CO', 'BTN'])
    return {
      situation: `Bolha. Short stack tem ${shortBB}bb no BTN (vai bustar em ${shortBB} mãos). Você tem ${heroBB}bb no ${heroPos} com ${hand}. Short foldou.`,
      question: 'O que você faz?',
      options: [
        { id: 'raise', label: 'Raise', correct: false },
        { id: 'fold', label: 'Fold', correct: true },
      ],
      explanation: `Na bolha com short de ${shortBB}bb prestes a bustar, ${hand} não vale o risco. Se perder uma mão grande, pode virar o short stack. Paciência.`,
      concept: 'Na bolha, evite confrontos marginais. O short vai bustar — não assuma o risco.',
    }
  },

  // 7. Início do torneio — ChipEV puro
  () => {
    const players = pick([500, 1000, 2000])
    const itm = Math.floor(players * 0.15)
    const heroBB = pick([80, 100, 120])
    const hand = pick(HANDS_STRONG)
    const villainPos = pick(['UTG', 'LJ', 'HJ'])
    const heroPos = pick(['BTN', 'CO'])
    return {
      situation: `Início do torneio. ${players} jogadores, pagam ${itm}. Você tem ${heroBB}bb. ${villainPos} fez raise. Você está no ${heroPos} com ${hand}.`,
      question: 'O que você faz?',
      options: [
        { id: 'threebet', label: '3-bet (ChipEV)', correct: true },
        { id: 'call', label: 'Flat call (conservador)', correct: false },
      ],
      explanation: `No início, ICM é zero. Jogue ChipEV puro. ${hand} é 3-bet padrão do ${heroPos} vs ${villainPos}. Não jogue conservador sem motivo.`,
      concept: 'No início do torneio, ICM não existe. Jogue para maximizar fichas.',
    }
  },

  // 8. FT — chip leader limpa, hero shova
  () => {
    const players = pick([3, 4, 5])
    const heroBB = randBB(10, 15)
    const chipLeaderBB = randBB(40, 55)
    const hand = pick(['A3o', 'A5o', 'A2o', 'K7o', 'K9o', 'Q9o', 'JTo'])
    return {
      situation: `Mesa final de ${players}. Chip leader (${chipLeaderBB}bb) completa do SB. Você tem ${heroBB}bb no BB com ${hand}.`,
      question: 'O que você faz?',
      options: [
        { id: 'shove', label: 'Shove all-in', correct: true },
        { id: 'check', label: 'Check', correct: false },
      ],
      explanation: `Chip leader limpando = range fraco. ${hand} é bom pra shove — você precisa acumular fichas. ICM não significa nunca arriscar; significa escolher os spots certos.`,
      concept: 'Contra limps do chip leader, shove com range amplo. Limpar = fraqueza = oportunidade.',
    }
  },

  // 9. Satélite com muitos a bustar — paciência
  () => {
    const total = pick([15, 20, 25])
    const vagas = pick([8, 9, 10])
    const heroBB = randBB(6, 10)
    const hand = pick([...HANDS_MEDIUM, ...HANDS_STRONG.slice(2)])
    const heroPos = pick(['BTN', 'CO'])
    return {
      situation: `Satélite. ${total} restam, ${vagas} vagas. Você tem ${heroBB}bb no ${heroPos} com ${hand}. Fold até você.`,
      question: 'O que você faz?',
      options: [
        { id: 'shove', label: 'Shove', correct: false },
        { id: 'fold', label: 'Fold', correct: true },
      ],
      explanation: `Em satélite com ${total} restantes e ${vagas} vagas, ainda faltam ${total - vagas} bustarem. Com ${heroBB}bb você sobrevive muitas rodadas. Paciência garante a vaga.`,
      concept: 'Em satélites, stacks pequenos são enormes quando metade do field precisa bustar.',
    }
  },

  // 10. Bolha — big stack pode chamar shoves
  () => {
    const heroBB = randBB(30, 45)
    const villainBB = randBB(6, 10)
    const hand = pick(['A9o', 'A8o', 'ATo', 'KQo', 'KJs', 'QJs', '99', 'TT'])
    const villainPos = pick(['CO', 'BTN', 'SB'])
    return {
      situation: `Bolha. Você é o maior stack (${heroBB}bb). ${villainPos} (${villainBB}bb) shova. Você está no BB com ${hand}.`,
      question: 'O que você faz?',
      options: [
        { id: 'call', label: 'Call', correct: true },
        { id: 'fold', label: 'Fold', correct: false },
      ],
      explanation: `Como maior stack na bolha, chamar shoves é mais barato em ICM — se perder, ainda tem ${heroBB - villainBB}bb. ${hand} tem boa equity contra range de ${villainBB}bb. Eliminar alguém estoura a bolha.`,
      concept: 'Stacks grandes na bolha podem chamar mais — o custo de perder é menor em ICM.',
    }
  },

  // 11. Mesa final — stack médio com premium vs shove
  () => {
    const heroBB = randBB(18, 28)
    const villainBB = randBB(8, 14)
    const hand = pick(HANDS_PREMIUM)
    const players = pick([4, 5])
    return {
      situation: `Mesa final de ${players}. Você tem ${heroBB}bb. Short (${villainBB}bb) shova do BTN. Você está no BB com ${hand}.`,
      question: 'O que você faz?',
      options: [
        { id: 'call', label: 'Call', correct: true },
        { id: 'fold', label: 'Fold (ICM conservador)', correct: false },
      ],
      explanation: `${hand} é call obrigatório mesmo em ICM pesado. Contra range de shove de ${villainBB}bb, sua equity é enorme. Não folde premiums por medo de ICM.`,
      concept: 'Premiums nunca são fold em ICM. AA/KK/QQ/AKs sempre call contra shoves.',
    }
  },

  // 12. ICM — confronto entre stacks médios é ruim
  () => {
    const heroBB = randBB(18, 25)
    const villainBB = randBB(18, 25)
    const hand = pick(HANDS_MARGINAL)
    const shortBB = randBB(3, 6)
    const heroPos = pick(['CO', 'BTN'])
    const villainPos = pick(['BB', 'SB'])
    return {
      situation: `Mesa final. Short stack tem ${shortBB}bb. Você (${heroBB}bb) e ${villainPos} (${villainBB}bb) são stacks médios. Você está no ${heroPos} com ${hand}.`,
      question: 'O que você faz?',
      options: [
        { id: 'raise', label: 'Raise', correct: false },
        { id: 'fold', label: 'Fold', correct: true },
      ],
      explanation: `Confronto entre stacks médios na FT é o pior cenário em ICM — ambos podem bustar e o short fica vivo. ${hand} não vale o risco. Deixe o short bustar.`,
      concept: 'Em ICM, evite confrontos entre stacks médios. O risco mútuo beneficia o short stack.',
    }
  },

  // 13. Bolha — SB shove com mão ok contra BB passivo
  () => {
    const heroBB = randBB(10, 15)
    const hand = pick(['A7o', 'A5o', 'K9o', 'KTo', 'QJo', '88', '77'])
    const bbBB = randBB(12, 18)
    return {
      situation: `Bolha. Fold até você no SB com ${heroBB}bb. BB tem ${bbBB}bb e joga muito tight na bolha. Você tem ${hand}.`,
      question: 'O que você faz?',
      options: [
        { id: 'shove', label: 'Shove', correct: true },
        { id: 'fold', label: 'Fold', correct: false },
      ],
      explanation: `O BB joga tight na bolha e não vai chamar leve. ${hand} é shove lucrativo — você ganha as blinds sem confronto na maioria das vezes. ICM favorece agressão seletiva.`,
      concept: 'Na bolha, abuse de jogadores que apertam demais. Eles foldham mais que deveriam.',
    }
  },

  // 14. Pay jump grande — fold mão boa
  () => {
    const hand = pick(HANDS_MEDIUM)
    const heroBB = randBB(15, 22)
    const players = pick([3, 4])
    return {
      situation: `Mesa final de ${players}. Pay jump de $${pick([500, 1000, 2000])} entre posições. Outro jogador tem ${pick([4, 5, 6])}bb. Você tem ${heroBB}bb com ${hand}. CO raisa.`,
      question: 'O que você faz?',
      options: [
        { id: 'call', label: 'Call/3-bet', correct: false },
        { id: 'fold', label: 'Fold', correct: true },
      ],
      explanation: `Com pay jump enorme e short prestes a bustar, ${hand} é fold. Cada posição a mais vale muito dinheiro. Sobrevivência > fichas marginais.`,
      concept: 'Quanto maior o pay jump, mais tight você deve jogar — exceto se for o chip leader.',
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
        ICM — Independent Chip Model
      </h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Por que fichas de torneio valem menos conforme você acumula mais</p>
      <div className="space-y-4">
        <Section title="O Que é ICM?">
          Em cash game, cada ficha vale exatamente seu valor em dinheiro. 1000 fichas = $1000.<br /><br />
          Em torneio, <strong style={{ color: '#e94560' }}>fichas NAO valem linearmente</strong>. Dobrar seu stack NAO dobra seu premio esperado. Isso porque a estrutura de premiacao não é linear (1o não ganha o dobro do 2o).<br /><br />
          ICM é o modelo que converte fichas em valor real ($) baseado na estrutura de premiacao.
        </Section>
        <Section title="Por Que ICM Importa?">
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #00d4aa' }}>
              <div style={{ color: '#00d4aa', fontWeight: 700 }}>Ganhar fichas</div>
              <div style={{ color: 'white', fontSize: 20, fontWeight: 700, marginTop: 4 }}>+$X</div>
              <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>Valor marginal decrescente</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #e94560' }}>
              <div style={{ color: '#e94560', fontWeight: 700 }}>Perder fichas</div>
              <div style={{ color: 'white', fontSize: 20, fontWeight: 700, marginTop: 4 }}>-$2X</div>
              <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>Perder custa MAIS que ganhar</div>
            </div>
          </div>
          <div style={{ color: '#ccc', fontSize: 13, marginTop: 8 }}>
            Isso cria assimetria: o risco de bustar é desproporcional ao ganho de dobrar.
          </div>
        </Section>
        <Section title="Onde ICM Tem Mais Impacto">
          <div className="space-y-2">
            {[
              { spot: 'Bolha do torneio', impact: 'MAXIMO', color: '#e94560', desc: 'Diferenca entre ganhar premio é sair sem nada' },
              { spot: 'Mesa final', impact: 'ALTO', color: '#f5a623', desc: 'Cada eliminacao = salto grande de premiacao' },
              { spot: 'Satelites', impact: 'EXTREMO', color: '#e94560', desc: 'Premio igual = sobrevivencia é tudo' },
              { spot: 'Inicio do torneio', impact: 'ZERO', color: '#00d4aa', desc: 'Jogue ChipEV puro' },
            ].map(r => (
              <div key={r.spot} className="flex justify-between items-center rounded-lg p-3" style={{ background: '#0a0a0f' }}>
                <div>
                  <div style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>{r.spot}</div>
                  <div style={{ color: '#888', fontSize: 12 }}>{r.desc}</div>
                </div>
                <span style={{ color: r.color, fontWeight: 700, fontSize: 13 }}>{r.impact}</span>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Regras Praticas de ICM">
          <div className="space-y-2">
            {[
              'Na bolha, aperte seu range significativamente (fold mais)',
              'Deixe short stacks bustarem antes de você arriscar',
              'Como chip leader, AUMENTE agressividade — os outros não podem revidar',
              'Mãos premium (QQ+, AKs) quase nunca são fold, mesmo em ICM pesado',
              'Em satelites, sobrevivencia é TUDO — fold até garantir a vaga',
              'Longe da bolha, jogue ChipEV normal',
            ].map((t, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span style={{ color: '#f5a623' }}>•</span>
                <span style={{ color: '#ccc', fontSize: 14 }}>{t}</span>
              </div>
            ))}
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
    recordAnswer(17, isCorrect, newStreak)
    const isLast = newTotal >= 10
    if (isLast) recordSession(17, Math.round((newCorrect / newTotal) * 100))
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
            <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>CENARIO ICM</div>
            <div style={{ color: '#ccc', fontSize: 15, lineHeight: 1.7 }}>{scenario.situation}</div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 16, marginTop: 12 }}>{scenario.question}</div>
          </div>

          {!feedback && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {scenario.options.map(opt => (
                <button key={opt.id} onClick={() => answer(opt.id)} className="py-4 rounded-xl font-bold text-sm"
                  style={{ background: opt.id === 'fold' || opt.id === 'check' ? '#4a90e2' : '#f5a623', color: opt.id === 'fold' || opt.id === 'check' ? 'white' : '#0a0a0f' }}>
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
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function Module17() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[17]?.lessonRead ? 'trainer' : 'lesson')
  if (!progress.modules[17]?.unlocked) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
      <div className="text-center"><div style={{ fontSize: 60 }}>🔒</div><h2 style={{ color: 'white', marginTop: 16 }}>Módulo Bloqueado</h2><p style={{ color: '#888', marginTop: 8 }}>Complete o Módulo 16 para desbloquear.</p></div>
    </div>
  )
  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setView('lesson')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'lesson' ? '#e94560' : '#12121a', color: view === 'lesson' ? 'white' : '#888', border: '1px solid #1e1e2e' }}>Aula</button>
          <button onClick={() => progress.modules[17]?.lessonRead && setView('trainer')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'trainer' ? '#e94560' : '#12121a', color: view === 'trainer' ? 'white' : (progress.modules[17]?.lessonRead ? '#888' : '#444'), border: '1px solid #1e1e2e', cursor: progress.modules[17]?.lessonRead ? 'pointer' : 'not-allowed' }}>Trainer {!progress.modules[17]?.lessonRead && '🔒'}</button>
        </div>
        {view === 'lesson' ? <Lesson onComplete={() => { markLessonRead(17); setView('trainer') }} /> : <Trainer />}
      </div>
    </div>
  )
}
