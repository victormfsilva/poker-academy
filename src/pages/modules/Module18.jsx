import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'

// ICM scenarios — situational decisions
const SCENARIOS = [
  {
    situation: 'Torneio de 9 jogadores. Pagam 3. Restam 4 jogadores. Voce tem 20bb (2o maior stack). Short stack tem 5bb. Voce esta no CO com AJo.',
    question: 'O que voce faz?',
    options: [
      { id: 'raise', label: 'Raise (ChipEV)', correct: false },
      { id: 'fold', label: 'Fold (ICM)', correct: true },
    ],
    explanation: 'Em ChipEV, AJo e raise facil do CO. Mas com ICM na bolha (4 jogadores, pagam 3), o short stack de 5bb vai bustar em breve. Sobreviver garante premiacao — nao arrisque fichas desnecessariamente.',
    concept: 'Na bolha, sobrevivencia vale mais que fichas. Deixe o short stack bustar.'
  },
  {
    situation: 'Mesa final. 3 jogadores restantes. 1o lugar: $1000, 2o: $600, 3o: $400. Voce tem 15bb (menor stack). BB (chip leader, 40bb) shova. Voce tem QQ no SB.',
    question: 'O que voce faz?',
    options: [
      { id: 'call', label: 'Call', correct: true },
      { id: 'fold', label: 'Fold (ICM)', correct: false },
    ],
    explanation: 'QQ e forte demais pra foldar mesmo com ICM. Contra range de shove do chip leader (muito amplo), QQ tem equity enorme. ICM nao significa foldar tudo — significa ajustar as margens.',
    concept: 'ICM muda margens, nao elimina maos premium. QQ+ e AKs quase nunca sao fold, mesmo em ICM pesado.'
  },
  {
    situation: 'Bolha de satelite. 10 jogadores restam, 9 ganham vaga (premio igual pra todos). Voce tem 25bb (acima da media). UTG shova 12bb. Voce tem AKs no BB.',
    question: 'O que voce faz?',
    options: [
      { id: 'call', label: 'Call', correct: false },
      { id: 'fold', label: 'Fold', correct: true },
    ],
    explanation: 'Em satelite com premio igual, ICM e EXTREMO. Dobrar suas fichas nao muda seu premio (ja tem vaga garantida se sobreviver). Mas bustar significa perder tudo. Mesmo AKs e fold aqui.',
    concept: 'Em satelites, sobrevivencia e TUDO. Nao arrisque fichas quando ja tem stack pra garantir a vaga.'
  },
  {
    situation: 'Torneio regular. Pagam 15%. Restam 30% do field. Voce tem 30bb (media). BTN (20bb) fez raise. Voce esta no BB com 77.',
    question: 'O que voce faz?',
    options: [
      { id: 'call', label: 'Call (ChipEV normal)', correct: true },
      { id: 'fold', label: 'Fold (ICM)', correct: false },
    ],
    explanation: 'Longe da bolha (30% restam, pagam 15%), ICM tem pouco impacto. 77 e call padrao no BB vs BTN raise. Jogar ChipEV normal e correto quando a bolha esta distante.',
    concept: 'ICM so tem impacto significativo perto da bolha e na mesa final. Longe dela, jogue ChipEV.'
  },
  {
    situation: 'Mesa final de 6. Voce e chip leader (50bb). Todos os outros tem 10-15bb. 6o lugar: $200, 1o lugar: $5000. Voce esta no BTN com T8s.',
    question: 'O que voce faz?',
    options: [
      { id: 'raise', label: 'Raise (pressionar)', correct: true },
      { id: 'fold', label: 'Fold (jogar safe)', correct: false },
    ],
    explanation: 'Como chip leader na mesa final, VOCE e quem pressiona. Os stacks medios nao podem arriscar bustar porque perdem saltos de premiacao. T8s e raise — abuse da pressao ICM sobre eles.',
    concept: 'Chip leader na mesa final deve AUMENTAR a agressividade — os outros nao podem revidar.'
  },
  {
    situation: 'Bolha. 5 jogadores, pagam 4. Short stack tem 3bb no BTN. Voce tem 18bb no SB com K2o. Short stack foldou.',
    question: 'O que voce faz?',
    options: [
      { id: 'raise', label: 'Raise/shove vs BB', correct: false },
      { id: 'fold', label: 'Fold', correct: true },
    ],
    explanation: 'Na bolha com short stack prestes a bustar, K2o nao vale o risco. Se o BB chamar e voce perder, pode virar o short stack. Deixe o jogador de 3bb bustar naturalmente.',
    concept: 'Na bolha, evite confrontos marginais. O short stack vai bustar — nao assuma o risco por ele.'
  },
  {
    situation: 'Inicio do torneio. 1000 jogadores, pagam 150. Voce tem 100bb. UTG fez raise, voce tem AKo no BTN.',
    question: 'O que voce faz?',
    options: [
      { id: 'threebet', label: '3-bet (ChipEV)', correct: true },
      { id: 'call', label: 'Flat call (conservador)', correct: false },
    ],
    explanation: 'No inicio do torneio, ICM e praticamente zero. Jogue ChipEV puro. AKo e 3-bet padrao do BTN vs UTG. Nao jogue conservador sem motivo.',
    concept: 'No inicio do torneio, ICM nao existe. Jogue para maximizar fichas (ChipEV).'
  },
  {
    situation: 'Final table. 4 jogadores. Voce tem 12bb no BB. SB (chip leader, 45bb) completa. Voce tem A3o.',
    question: 'O que voce faz?',
    options: [
      { id: 'shove', label: 'Shove all-in', correct: true },
      { id: 'check', label: 'Check', correct: false },
    ],
    explanation: 'Quando o chip leader limpa do SB, ele tem range fraco. A3o e bom o suficiente pra shove — voce precisa acumular fichas pra competir. ICM nao significa nunca arriscar; significa escolher os spots certos.',
    concept: 'Contra limps do chip leader, shove com range amplo. Limpar = range fraco = boa oportunidade.'
  },
  {
    situation: 'Satelite. 20 jogadores, 10 vagas. Voce tem 8bb (abaixo da media). Folda ate voce no BTN. Voce tem QJs.',
    question: 'O que voce faz?',
    options: [
      { id: 'shove', label: 'Shove', correct: false },
      { id: 'fold', label: 'Fold', correct: true },
    ],
    explanation: 'Em satelite com 20 restantes e 10 vagas, voce ainda precisa que 10 bustem. Com 8bb voce sobrevive muitas rodadas de blinds. QJs nao vale o risco de bustar quando paciencia garante a vaga.',
    concept: 'Em satelites, 8bb e um stack enorme quando metade do field ainda precisa bustar.'
  },
  {
    situation: 'Bolha. 10 jogadores, pagam 9. Voce tem 35bb (maior stack da mesa). Jogador de 8bb shova do CO. Voce esta no BB com A9o.',
    question: 'O que voce faz?',
    options: [
      { id: 'call', label: 'Call', correct: true },
      { id: 'fold', label: 'Fold', correct: false },
    ],
    explanation: 'Como maior stack na bolha, voce pode chamar shoves mais leve — se perder, ainda tem 27bb. A9o tem boa equity contra range de shove de 8bb. Alem disso, eliminar alguem garante que a bolha estoura.',
    concept: 'Stacks grandes na bolha podem chamar mais — o custo de perder e menor em ICM.'
  },
]

function Lesson({ onComplete }) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        ICM — Independent Chip Model
      </h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Por que fichas de torneio valem menos conforme voce acumula mais</p>
      <div className="space-y-4">
        <Section title="O Que e ICM?">
          Em cash game, cada ficha vale exatamente seu valor em dinheiro. 1000 fichas = $1000.<br /><br />
          Em torneio, <strong style={{ color: '#e94560' }}>fichas NAO valem linearmente</strong>. Dobrar seu stack NAO dobra seu premio esperado. Isso porque a estrutura de premiacao nao e linear (1o nao ganha o dobro do 2o).<br /><br />
          ICM e o modelo que converte fichas em valor real ($) baseado na estrutura de premiacao.
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
            Isso cria assimetria: o risco de bustar e desproporcional ao ganho de dobrar.
          </div>
        </Section>
        <Section title="Onde ICM Tem Mais Impacto">
          <div className="space-y-2">
            {[
              { spot: 'Bolha do torneio', impact: 'MAXIMO', color: '#e94560', desc: 'Diferenca entre ganhar premio e sair sem nada' },
              { spot: 'Mesa final', impact: 'ALTO', color: '#f5a623', desc: 'Cada eliminacao = salto grande de premiacao' },
              { spot: 'Satelites', impact: 'EXTREMO', color: '#e94560', desc: 'Premio igual = sobrevivencia e tudo' },
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
              'Deixe short stacks bustarem antes de voce arriscar',
              'Como chip leader, AUMENTE agressividade — os outros nao podem revidar',
              'Maos premium (QQ+, AKs) quase nunca sao fold, mesmo em ICM pesado',
              'Em satelites, sobrevivencia e TUDO — fold ate garantir a vaga',
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
    recordAnswer(18, isCorrect, newStreak)
    const isLast = newTotal >= 10
    if (isLast) recordSession(18, Math.round((newCorrect / newTotal) * 100))
    setFeedback({ isCorrect, explanation: scenario.explanation, concept: scenario.concept, correctLabel: scenario.options.find(o => o.correct).label, isLast })
  }

  function restart() { setSessionCorrect(0); setSessionTotal(0); setStreak(0); setSessionDone(false); setFeedback(null); setScenarioIdx(null); setUsedIdxs([]) }

  if (scenarioIdx === null && !sessionDone) newScenario()

  if (sessionDone) {
    const acc = Math.round((sessionCorrect / sessionTotal) * 100)
    return (
      <div className="text-center" style={{ maxWidth: 400, margin: '0 auto', paddingTop: 40 }}>
        <div style={{ fontSize: 60 }}>{acc >= 90 ? '🎉' : '💪'}</div>
        <h2 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginTop: 16 }}>Sessao Completa!</h2>
        <div style={{ color: acc >= 90 ? '#00d4aa' : '#f5a623', fontSize: 36, fontWeight: 700 }}>{acc}%</div>
        <button onClick={restart} className="mt-6 px-8 py-3 rounded-xl font-bold" style={{ background: '#e94560', color: 'white' }}>Nova Sessao</button>
      </div>
    )
  }

  const scenario = scenarioIdx !== null ? SCENARIOS[scenarioIdx] : null

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <div className="rounded-xl p-3 mb-4 flex justify-between" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
        <div style={{ color: '#888', fontSize: 13 }}>Sessao: {sessionCorrect}/{sessionTotal} · Seq: {streak}</div>
        <div style={{ color: '#888', fontSize: 13 }}>Meta: 10 cenarios</div>
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

export default function Module18() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[18]?.lessonRead ? 'trainer' : 'lesson')
  if (!progress.modules[18]?.unlocked) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
      <div className="text-center"><div style={{ fontSize: 60 }}>🔒</div><h2 style={{ color: 'white', marginTop: 16 }}>Modulo Bloqueado</h2><p style={{ color: '#888', marginTop: 8 }}>Complete o Modulo 17 para desbloquear.</p></div>
    </div>
  )
  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setView('lesson')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'lesson' ? '#e94560' : '#12121a', color: view === 'lesson' ? 'white' : '#888', border: '1px solid #1e1e2e' }}>Aula</button>
          <button onClick={() => progress.modules[18]?.lessonRead && setView('trainer')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'trainer' ? '#e94560' : '#12121a', color: view === 'trainer' ? 'white' : (progress.modules[18]?.lessonRead ? '#888' : '#444'), border: '1px solid #1e1e2e', cursor: progress.modules[18]?.lessonRead ? 'pointer' : 'not-allowed' }}>Trainer {!progress.modules[18]?.lessonRead && '🔒'}</button>
        </div>
        {view === 'lesson' ? <Lesson onComplete={() => { markLessonRead(18); setView('trainer') }} /> : <Trainer />}
      </div>
    </div>
  )
}
