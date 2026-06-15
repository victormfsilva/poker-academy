import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'

const SCENARIOS = [
  {
    situation: 'Você está no BTN com JTs. UTG fez raise, HJ chamou. Você tem posição sobre ambos.',
    question: 'O que você faz?',
    options: [
      { id: 'call', label: 'Call', correct: true },
      { id: 'raise', label: '3-bet', correct: false },
    ],
    explanation: 'Em potes multiway, 3-bet com JTs não faz sentido — você não vai fazer os 2 foldarem. Call é perfeito: mão com boa jogabilidade, posição, e implied odds altas em pote multi.',
    concept: 'Em multiway, prefira call com mãos jogaveis (suited connectors, pares) ao inves de 3-bet light.'
  },
  {
    situation: '3 jogadores no flop: K♠ 8♦ 3♣. Você está no BB com A3s. UTG checou, CO checou.',
    question: 'O que você faz?',
    options: [
      { id: 'bet', label: 'Bet (c-bet)', correct: false },
      { id: 'check', label: 'Check', correct: true },
    ],
    explanation: 'Em pote multiway, c-bet com par baixo é perigoso. Com 2 adversarios, a chance de alguem ter K ou melhor é alta. Check e controle o pote.',
    concept: 'Em multiway, reduza drasticamente sua frequência de c-bet. So aposte com mãos fortes.'
  },
  {
    situation: 'Flop: Q♥ J♠ 9♦. Pote multiway (3 jogadores). Você está IP com KTs (straight draw + gutshot royal).',
    question: 'O que você faz?',
    options: [
      { id: 'bet', label: 'Bet', correct: false },
      { id: 'check', label: 'Check (ver carta gratis)', correct: true },
    ],
    explanation: 'Board muito conectado com 3 jogadores. Alguem provavelmente acertou forte (QJ, Q9, sets, straights feitos). Seu draw é bom mas apostar aqui é arriscado — check e veja o turn grátis.',
    concept: 'Em boards conectados multiway, check com draws. Alguem provavelmente tem mão forte.'
  },
  {
    situation: '3 jogadores no flop: A♠ 7♦ 2♣ (board seco). Você foi o raiser pre-flop do CO. Você tem AKo.',
    question: 'O que você faz?',
    options: [
      { id: 'bet', label: 'Bet 33-50%', correct: true },
      { id: 'check', label: 'Check', correct: false },
    ],
    explanation: 'Excecao a regra: com top pair top kicker em board MUITO seco e você tem range advantage como raiser, pode apostar mesmo multiway. AK num A-7-2 rainbow é forte o suficiente.',
    concept: 'Em multiway, aposte em boards secos quando tem mão forte + range advantage clara.'
  },
  {
    situation: 'Você está no CO com 55. UTG fez raise, HJ chamou, você quer entrar no pote.',
    question: 'Qual o principal motivo de chamar?',
    options: [
      { id: 'implied', label: 'Implied odds (set mining)', correct: true },
      { id: 'equity', label: 'Par é sempre forte', correct: false },
    ],
    explanation: '55 em multiway é puro set mining. Você acerta set ~12% das vezes (1 em 8 flops). Em pote multiway, quando acerta, extrai muito valor de multiplos jogadores. As implied odds justificam o call.',
    concept: 'Pares baixos em multiway = set mining. Você entra pelos implied odds, não pela força do par.'
  },
  {
    situation: 'Flop: 7♠ 6♠ 5♠. Pote multiway (4 jogadores). Você tem A♠ 2♠ (flush feito). Primeiro a agir.',
    question: 'O que você faz?',
    options: [
      { id: 'bet', label: 'Bet grande (75%)', correct: true },
      { id: 'check', label: 'Check (slow play)', correct: false },
    ],
    explanation: 'Com 4 jogadores num board monotone, alguem quase certamente tem flush draw ou mão forte. Não slow play — aposte grande. Em multiway, sempre proteja mãos fortes. Alguem vai pagar.',
    concept: 'Em multiway com board perigoso, NUNCA slow play. Aposte grande pra proteger e extrair.'
  },
  {
    situation: 'Você está no BB com Q7o. UTG fez raise, 3 jogadores chamaram. Você tem pot odds de 5:1.',
    question: 'O que você faz?',
    options: [
      { id: 'call', label: 'Call (pot odds)', correct: false },
      { id: 'fold', label: 'Fold', correct: true },
    ],
    explanation: 'Pot odds bons não compensam jogabilidade ruim. Q7o não tem conexao, não é suited, é vai ser dominada frequentemente. Em multiway, você precisa de mãos que podem fazer nuts — Q7o não faz.',
    concept: 'Em multiway, jogabilidade importa mais que pot odds. Mãos desconectadas sem potencial de nuts são fold.'
  },
  {
    situation: 'Flop: T♥ 9♥ 8♣. Pote multiway (3 jogadores). Você está OOP com TT (set).',
    question: 'O que você faz?',
    options: [
      { id: 'bet', label: 'Bet/check-raise', correct: true },
      { id: 'check', label: 'Check é call', correct: false },
    ],
    explanation: 'Set em board MUITO úmido com 3 jogadores — você DEVE apostar ou check-raise. J7, QJ, 76 já tem straight. Qualquer carta de copas completa flush. Não de carta gratis!',
    concept: 'Sets em boards umidos multiway devem ser jogados agressivamente. Protecao é prioridade.'
  },
  {
    situation: 'Pre-flop. Você está no SB com AQo. UTG fez raise, HJ chamou, CO chamou.',
    question: 'O que você faz?',
    options: [
      { id: 'squeeze', label: '3-bet (squeeze)', correct: false },
      { id: 'fold', label: 'Fold', correct: true },
    ],
    explanation: 'AQo do SB contra raiser + 2 callers é uma situação complicada. Squeeze raramente funciona com 3 oponentes, é se chamar você joga OOP contra 3 ranges. Fold é o mais correto.',
    concept: 'Em potes multiway, aperte seu range de 3-bet do SB. Mais jogadores = menos fold equity.'
  },
  {
    situation: 'Você está no BTN com A♥ 5♥. 3 jogadores já chamaram o raise. Você decide chamar. Flop: K♥ 8♥ 2♦.',
    question: 'Alguem aposta 33%. O que você faz?',
    options: [
      { id: 'call', label: 'Call', correct: true },
      { id: 'raise', label: 'Raise', correct: false },
    ],
    explanation: 'Flush draw do nuts (A-high flush draw) em multiway — call. Não raise: em multiway, raise com draw é arriscado porque pode ter alguem com mão forte que re-raisa. Call é veja o turn.',
    concept: 'Em multiway, não semi-blefe com raises. Multiplos oponentes reduzem sua fold equity a quase zero.'
  },
]

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
            <div className="rounded-lg p-3 text-center" style={{ background: '#0a0a0f', border: '1px solid #4a90e2' }}>
              <div style={{ color: '#4a90e2', fontWeight: 700 }}>Heads-up</div>
              <div style={{ color: 'white', fontSize: 20, fontWeight: 700, marginTop: 4 }}>~50%</div>
              <div style={{ color: '#888', fontSize: 12 }}>fold equity do blefe</div>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: '#0a0a0f', border: '1px solid #e94560' }}>
              <div style={{ color: '#e94560', fontWeight: 700 }}>3 jogadores</div>
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
              <div key={r.rule} className="rounded-lg p-3" style={{ background: '#0a0a0f' }}>
                <div style={{ color: '#f5a623', fontWeight: 600, fontSize: 13 }}>{r.rule}</div>
                <div style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>{r.why}</div>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Mãos Boas pra Multiway">
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #00d4aa' }}>
              <div style={{ color: '#00d4aa', fontWeight: 600 }}>Boas</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Pares (set mining)<br />Suited connectors<br />Suited aces<br />Mãos que fazem nuts</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #e94560' }}>
              <div style={{ color: '#e94560', fontWeight: 600 }}>Ruins</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Offsuit desconectados<br />Mãos dominadas (KTo, Q9o)<br />Mãos que fazem 2o melhor<br />Anything sem potencial de nuts</div>
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
    setScenarioIdx(idx); setUsedIdxs(prev => [...prev, idx]); setFeedback(null)
  }

  function answer(optionId) {
    if (scenarioIdx === null || feedback) return
    const scenario = SCENARIOS[scenarioIdx]
    const isCorrect = scenario.options.find(o => o.id === optionId).correct
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
        <div style={{ color: '#888', fontSize: 13 }}>Meta: 10 cenarios</div>
      </div>
      <div className="rounded-full h-2 mb-6" style={{ background: '#1e1e2e' }}>
        <div className="rounded-full h-2 transition-all" style={{ width: `${(sessionTotal / 10) * 100}%`, background: '#e94560' }} />
      </div>
      {scenario && (
        <>
          <div className="rounded-xl p-4 mb-4" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
            <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>CENARIO MULTIWAY</div>
            <div style={{ color: '#ccc', fontSize: 15, lineHeight: 1.7 }}>{scenario.situation}</div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 16, marginTop: 12 }}>{scenario.question}</div>
          </div>
          {!feedback && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {scenario.options.map(opt => (
                <button key={opt.id} onClick={() => answer(opt.id)} className="py-4 rounded-xl font-bold text-sm"
                  style={{ background: '#1e1e2e', color: 'white', border: '1px solid #333' }}>
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

export default function Module19() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[19]?.lessonRead ? 'trainer' : 'lesson')
  if (!progress.modules[19]?.unlocked) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
      <div className="text-center"><div style={{ fontSize: 60 }}>🔒</div><h2 style={{ color: 'white', marginTop: 16 }}>Módulo Bloqueado</h2><p style={{ color: '#888', marginTop: 8 }}>Complete o Módulo 17 para desbloquear.</p></div>
    </div>
  )
  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setView('lesson')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'lesson' ? '#e94560' : '#12121a', color: view === 'lesson' ? 'white' : '#888', border: '1px solid #1e1e2e' }}>Aula</button>
          <button onClick={() => progress.modules[19]?.lessonRead && setView('trainer')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'trainer' ? '#e94560' : '#12121a', color: view === 'trainer' ? 'white' : (progress.modules[19]?.lessonRead ? '#888' : '#444'), border: '1px solid #1e1e2e', cursor: progress.modules[19]?.lessonRead ? 'pointer' : 'not-allowed' }}>Trainer {!progress.modules[19]?.lessonRead && '🔒'}</button>
        </div>
        {view === 'lesson' ? <Lesson onComplete={() => { markLessonRead(19); setView('trainer') }} /> : <Trainer />}
      </div>
    </div>
  )
}
