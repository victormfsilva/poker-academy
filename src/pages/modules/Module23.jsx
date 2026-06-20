import { useState, useCallback } from 'react'
import { useProgress } from '../../context/ProgressContext'

// ================================================================
// MODULO 23 — Range Advantage vs Nut Advantage
// ================================================================

const SCENARIOS = [
  // Range Advantage: quem tem mais maos boas no geral
  () => ({
    q: 'Flop A-K-5 rainbow. BTN (raiser) vs BB (caller). Quem tem range advantage?',
    a: 'BTN (range de open tem mais Ax, Kx, AK, AA, KK)',
    b: 'BB',
    aCorrect: true,
    explanation: 'BTN abriu o pote, entao seu range esta cheio de Ax, Kx, broadways. BB defende com range mais amplo e mais fraco. BTN tem clara range advantage neste board alto.',
  }),
  () => ({
    q: 'Flop 7-6-3 rainbow. BTN (raiser) vs BB (caller). Quem tem range advantage?',
    a: 'BB (defende com mais 76, 63, 77, 66, 33, suited connectors baixos)',
    b: 'BTN',
    aCorrect: true,
    explanation: 'Board baixo favorece o BB. BB defende com muitas maos conectadas baixas (76s, 65s, 54s, 33, 66, 77) que BTN nao teria aberto. BB tem range advantage em boards baixos.',
  }),
  () => ({
    q: 'BTN tem range advantage no flop. Qual a estrategia correta de c-bet?',
    a: 'C-bet frequente (70%+) com sizing PEQUENO (25-33%)',
    b: 'C-bet seletiva com sizing grande (66-75%)',
    aCorrect: true,
    explanation: 'Range advantage = bet com alta frequencia e sizing pequeno. Voce esta apostando com muitas maos, entao usa um sizing que nao precisa funcionar muito pra ser lucrativo.',
  }),
  () => ({
    q: 'Flop Q-J-T conectado. CO (raiser) vs BB. Quem tem nut advantage?',
    a: 'CO (tem mais AK, KK, QQ, JJ, TT, AQs no range)',
    b: 'BB',
    aCorrect: true,
    explanation: 'CO abriu com range mais forte e tem mais combos de AK (straight), QQ+, sets de J e T. CO tem nut advantage — suas maos monstro sao mais frequentes.',
  }),
  () => ({
    q: 'Voce tem nut advantage mas NAO range advantage. Qual a estrategia?',
    a: 'Bet MENOS frequente mas com sizing GRANDE (66-100%)',
    b: 'Bet muito frequente com sizing pequeno',
    aCorrect: true,
    explanation: 'Nut advantage sem range advantage = polarize. Voce nao tem muitas maos boas no geral, mas quando tem, sao monstros. Bet grande com maos fortes e bluffs, check o meio.',
  }),
  () => ({
    q: 'Flop K-8-3 rainbow. UTG (raiser) vs BTN (caller). Quem tem range + nut advantage?',
    a: 'UTG (range mais forte: KK, AA, AK, KQ todas no range)',
    b: 'BTN',
    aCorrect: true,
    explanation: 'UTG abriu de early position com range muito forte. Tem todos os premium: AA, KK, AK, KQs. BTN tem range mais wide mas mais fraco. UTG domina tanto em range quanto em nut advantage.',
  }),
  () => ({
    q: 'Flop 5-4-3 rainbow. CO (raiser) vs BB (caller). BB tem range advantage. O que BB deve fazer?',
    a: 'Check-raise ou donk bet mais frequente (explorar a vantagem)',
    b: 'Sempre checar pro raiser',
    aCorrect: true,
    explanation: 'Quando BB tem range advantage em board baixo, pode donk bet ou check-raise com mais frequencia. CO vai c-betar pouco nesse board, e BB pode tomar a iniciativa.',
  }),

  // Nut Advantage
  () => ({
    q: 'Flop A-A-7. BTN (raiser) vs BB. Quem tem nut advantage?',
    a: 'BTN (tem mais Ax no range — AK, AQ, AJ, ATs)',
    b: 'BB (defende com mais maos)',
    aCorrect: true,
    explanation: 'Board pareado com A: BTN tem muito mais combinacoes de Ax (AK, AQ, AJ, ATs) que BB, que teria 3-bet muitas dessas maos. BTN domina o nut advantage.',
  }),
  () => ({
    q: 'Flop 8-7-6 com flush draw. SB (3-bettor) vs BTN (caller). Quem tem nut advantage?',
    a: 'Equilibrado (ambos tem sets, straights, flush draws)',
    b: 'SB tem nut advantage claro',
    aCorrect: true,
    explanation: 'Em boards muito conectados com flush draw, ambos os ranges se conectam bem. SB tem overpairs fortes, BTN tem mais suited connectors. Nut advantage e equilibrado — sizing medio e correto.',
  }),
  () => ({
    q: 'Voce tem range advantage E nut advantage. Qual a estrategia?',
    a: 'C-bet com frequencia ALTA e sizing variado (mix de pequeno e grande)',
    b: 'Sempre check pra trap',
    aCorrect: true,
    explanation: 'Quando voce domina em ambos, c-bet com alta frequencia. Use sizing pequeno com range advantage (maos medianas) e sizing grande com nut advantage (monstros e bluffs polarizados).',
  }),
  () => ({
    q: 'Board K-Q-J com 2 copas. IP raiser vs OOP caller. O que dita o sizing?',
    a: 'Nut advantage dita o sizing (quem tem mais ATs/KK/QQ/JJ betta grande)',
    b: 'Range advantage dita o sizing',
    aCorrect: true,
    explanation: 'Em boards dinamicos (draws possiveis), o nut advantage importa mais pro sizing. Quem tem mais nuts (ATs straight, sets) pode bet grande pra proteger e pra valor.',
  }),
  () => ({
    q: 'Flop 2-2-7. CO raiser vs BB. Qual e a textura e quem favorece?',
    a: 'Board super seco e pareado — CO tem range advantage, c-bet pequeno frequente',
    b: 'BB tem vantagem por ter mais 2x e 7x',
    aCorrect: true,
    explanation: 'Board muito seco e pareado. CO tem range advantage com overpairs (88-AA), broadways. BB tem poucos 2x. CO deve c-bet frequente com sizing minimo (25-33%).',
  }),
  () => ({
    q: 'Flop T-9-8 monotone (3 copas). BTN vs BB. Qual a abordagem correta?',
    a: 'Check mais frequente (board perigoso, nut advantage diluido)',
    b: 'C-bet grande sempre',
    aCorrect: true,
    explanation: 'Board monotone conectado = muito perigoso. Ninguem tem nut advantage claro — flushes, straights e draws estao distribuidos entre os ranges. Check-back mais pra proteger range.',
  }),
  () => ({
    q: 'Se o flop e A-K-2 rainbow e voce e o raiser IP, por que o sizing pequeno e melhor?',
    a: 'Range advantage enorme — nao precisa de sizing grande pra lucrar',
    b: 'Porque voce quer dar odds pro vilao chamar',
    aCorrect: true,
    explanation: 'Voce tem range advantage massivo (todos os Ax, Kx, AK). Sizing pequeno (25-33%) funciona porque: 1) lucra contra range fraco, 2) nao precisa de fold equity, 3) permite bet com mais maos.',
  }),
]

function generateScenario() {
  const pick = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)]
  const t = pick()
  const swap = Math.random() > 0.5
  const opts = swap
    ? [{ id: 'a', label: t.b, correct: !t.aCorrect }, { id: 'b', label: t.a, correct: t.aCorrect }]
    : [{ id: 'a', label: t.a, correct: t.aCorrect }, { id: 'b', label: t.b, correct: !t.aCorrect }]
  return { question: t.q, options: opts, explanation: t.explanation }
}

// AULA
function Lesson({ onComplete }) {
  const [section, setSection] = useState(0)

  const sections = [
    {
      title: 'O que e Range Advantage?',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            <strong style={{ color: '#4fce82' }}>Range Advantage</strong> significa que seu range tem
            MAIS maos boas no geral naquele board. Nao e sobre ter a melhor mao — e sobre ter mais maos
            que conectam com o flop.
          </p>
          <div className="rounded-lg p-4 mb-4" style={{ background: '#222225' }}>
            <div style={{ color: '#fdfdfd', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Exemplo:</div>
            <div style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 1.8 }}>
              Flop <strong style={{ color: '#fdfdfd' }}>A-K-5</strong> rainbow.<br/>
              BTN (raiser): range cheio de Ax, Kx, AK, AA, KK = <strong style={{ color: '#4fce82' }}>range advantage</strong><br/>
              BB (caller): range mais amplo mas menos conectado com board alto
            </div>
          </div>
          <div className="rounded-lg p-4" style={{ background: 'rgba(79,206,130,0.08)', border: '1px solid rgba(79,206,130,0.2)' }}>
            <div style={{ color: '#4fce82', fontSize: 13, fontWeight: 600 }}>
              Range advantage = C-bet FREQUENTE com sizing PEQUENO (25-33%)
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'O que e Nut Advantage?',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            <strong style={{ color: '#e5484d' }}>Nut Advantage</strong> e diferente: quem tem mais
            maos MONSTRO (sets, straights, flushes, full houses). Nao importa quantas maos boas
            voce tem no geral — importa quem tem mais nuts.
          </p>
          <div className="rounded-lg p-4 mb-4" style={{ background: '#222225' }}>
            <div style={{ color: '#fdfdfd', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Exemplo:</div>
            <div style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 1.8 }}>
              Flop <strong style={{ color: '#fdfdfd' }}>Q-J-T</strong> conectado.<br/>
              CO (raiser): tem AK (nuts), KK, QQ, JJ, TT = <strong style={{ color: '#e5484d' }}>nut advantage</strong><br/>
              BB: tem menos combos premium nessa textura
            </div>
          </div>
          <div className="rounded-lg p-4" style={{ background: 'rgba(229,72,77,0.08)', border: '1px solid rgba(229,72,77,0.2)' }}>
            <div style={{ color: '#e5484d', fontSize: 13, fontWeight: 600 }}>
              Nut advantage = Bet MENOS frequente com sizing GRANDE (66-100%)
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Como Solvers Decidem',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            Isso e LITERALMENTE como solvers GTO decidem frequencia e sizing de bet. A logica:
          </p>
          <div className="rounded-lg overflow-hidden mb-4" style={{ border: '1px solid #2a2a2e' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#222225' }}>
                  <th style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>Situacao</th>
                  <th style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>Frequencia</th>
                  <th style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>Sizing</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderTop: '1px solid #2a2a2e' }}>
                  <td style={{ color: '#4fce82', fontSize: 13, padding: '8px 12px' }}>Range Adv</td>
                  <td style={{ color: '#fdfdfd', fontSize: 12, padding: '8px 12px' }}>Alta (70%+)</td>
                  <td style={{ color: '#fdfdfd', fontSize: 12, padding: '8px 12px' }}>Pequeno (25-33%)</td>
                </tr>
                <tr style={{ borderTop: '1px solid #2a2a2e' }}>
                  <td style={{ color: '#e5484d', fontSize: 13, padding: '8px 12px' }}>Nut Adv</td>
                  <td style={{ color: '#fdfdfd', fontSize: 12, padding: '8px 12px' }}>Baixa (30-50%)</td>
                  <td style={{ color: '#fdfdfd', fontSize: 12, padding: '8px 12px' }}>Grande (66-100%)</td>
                </tr>
                <tr style={{ borderTop: '1px solid #2a2a2e' }}>
                  <td style={{ color: '#f5a623', fontSize: 13, padding: '8px 12px' }}>Ambos</td>
                  <td style={{ color: '#fdfdfd', fontSize: 12, padding: '8px 12px' }}>Alta</td>
                  <td style={{ color: '#fdfdfd', fontSize: 12, padding: '8px 12px' }}>Mix (peq + grande)</td>
                </tr>
                <tr style={{ borderTop: '1px solid #2a2a2e' }}>
                  <td style={{ color: '#676671', fontSize: 13, padding: '8px 12px' }}>Nenhum</td>
                  <td style={{ color: '#fdfdfd', fontSize: 12, padding: '8px 12px' }}>Baixa</td>
                  <td style={{ color: '#fdfdfd', fontSize: 12, padding: '8px 12px' }}>Check mais</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8 }}>
            Se voce entender so isso, ja joga melhor que 90% dos jogadores de poker.
            A maioria aposta baseado na propria mao — voce aposta baseado no RANGE.
          </p>
        </div>
      ),
    },
    {
      title: 'Boards que Favorecem Quem',
      content: (
        <div>
          <div className="space-y-3 mb-4">
            {[
              { board: 'A-K-x', who: 'Raiser IP', why: 'Mais Ax, Kx, AK', color: '#4fce82' },
              { board: '7-6-3', who: 'BB / Caller', why: 'Mais suited connectors baixos, sets', color: '#0a84d7' },
              { board: 'Q-J-T', who: 'Raiser (nuts)', why: 'Mais AK, KK, QQ, JJ, TT', color: '#e5484d' },
              { board: '2-2-7', who: 'Raiser (range)', why: 'Overpairs dominam, board seco', color: '#4fce82' },
              { board: 'T-9-8 mono', who: 'Equilibrado', why: 'Ambos ranges se conectam', color: '#f5a623' },
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ background: '#222225' }}>
                <div style={{ color: '#fdfdfd', fontSize: 13, fontWeight: 700, fontFamily: 'JetBrains Mono', minWidth: 70 }}>{b.board}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: b.color, fontSize: 12, fontWeight: 600 }}>{b.who}</div>
                  <div style={{ color: '#676671', fontSize: 11 }}>{b.why}</div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={onComplete}
            style={{
              width: '100%', padding: '14px', borderRadius: 8, marginTop: 8,
              background: '#4fce82', border: 'none', color: '#0f0f0f',
              fontWeight: 600, fontSize: 15, cursor: 'pointer',
            }}>
            Comecar a treinar
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-16" style={{ background: '#0f0f0f' }}>
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="rounded-2xl p-6" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
          <h1 style={{ color: '#fdfdfd', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
            Modulo 23 - Range vs Nut Advantage
          </h1>
          <p style={{ color: '#676671', fontSize: 13, marginBottom: 20 }}>
            Como solvers decidem frequencia e sizing de aposta
          </p>

          <div className="flex gap-1 mb-6 overflow-x-auto">
            {sections.map((s, i) => (
              <button key={i} onClick={() => setSection(i)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
                style={{
                  background: section === i ? 'rgba(79,206,130,0.12)' : 'transparent',
                  color: section === i ? '#4fce82' : '#676671',
                  border: `1px solid ${section === i ? '#4fce82' : 'transparent'}`,
                }}>
                {s.title}
              </button>
            ))}
          </div>

          <h2 style={{ color: '#fdfdfd', fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
            {sections[section].title}
          </h2>
          {sections[section].content}

          {section < sections.length - 1 && (
            <button onClick={() => setSection(section + 1)}
              style={{
                width: '100%', padding: '12px', borderRadius: 8, marginTop: 16,
                background: '#2a2a2e', border: 'none', color: '#fdfdfd',
                fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}>
              Proximo &rsaquo;
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// TRAINER
function Trainer() {
  const { recordAnswer, recordSession, getModuleProgress } = useProgress()
  const progress = getModuleProgress(23)

  const [scenario, setScenario] = useState(() => generateScenario())
  const [result, setResult] = useState(null)
  const [handNum, setHandNum] = useState(0)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [streak, setStreak] = useState(0)

  const handleAnswer = useCallback((optionId) => {
    if (result) return
    const chosen = scenario.options.find(o => o.id === optionId)
    const isCorrect = chosen?.correct || false
    const newStreak = isCorrect ? streak + 1 : 0
    setStreak(newStreak)
    if (isCorrect) setSessionCorrect(s => s + 1)
    recordAnswer(23, isCorrect, newStreak, { tp: 'rna' })
    setResult({ isCorrect, explanation: scenario.explanation })
  }, [result, scenario, streak, recordAnswer])

  const handleNext = useCallback(() => {
    const nextHand = handNum + 1
    if (nextHand >= 10) {
      const accuracy = Math.round((sessionCorrect / 10) * 100)
      recordSession(23, accuracy)
      setHandNum(0)
      setSessionCorrect(0)
    } else {
      setHandNum(nextHand)
    }
    setResult(null)
    setScenario(generateScenario())
  }, [handNum, sessionCorrect, recordSession])

  const acc = progress.totalAnswered > 0 ? progress.accuracy : 0

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-16" style={{ background: '#0f0f0f' }}>
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { label: 'Sessao', value: `${handNum}/10`, color: '#e5484d' },
            { label: 'Acerto', value: acc > 0 ? `${acc}%` : '--', color: acc >= 90 ? '#4fce82' : acc >= 60 ? '#f5a623' : '#e5484d' },
            { label: 'Sequencia', value: streak, color: '#f5a623' },
          ].map(s => (
            <div key={s.label} className="rounded-xl py-3 text-center" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
              <div style={{ color: s.color, fontSize: 22, fontWeight: 700, fontFamily: 'JetBrains Mono', lineHeight: 1 }}>{s.value}</div>
              <div style={{ color: '#676671', fontSize: 11, marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl p-5 mb-4" style={{
          background: '#1a1a1d',
          border: `1px solid ${result ? (result.isCorrect ? '#4fce8255' : '#e5484d55') : '#2a2a2e'}`,
        }}>
          <div style={{ color: '#676671', fontSize: 11, fontWeight: 600, marginBottom: 12 }}>
            RANGE vs NUT ADVANTAGE - {handNum + 1}/10
          </div>

          <p style={{ color: '#fdfdfd', fontSize: 15, lineHeight: 1.7, marginBottom: 20 }}>
            {scenario.question}
          </p>

          {result && (
            <div className="rounded-lg px-4 py-3 mb-4" style={{
              background: result.isCorrect ? 'rgba(79,206,130,0.1)' : 'rgba(229,72,77,0.1)',
              border: `1px solid ${result.isCorrect ? 'rgba(79,206,130,0.25)' : 'rgba(229,72,77,0.25)'}`,
            }}>
              <div style={{ color: result.isCorrect ? '#4fce82' : '#e5484d', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
                {result.isCorrect ? 'Correto!' : 'Errou'}
              </div>
              <div style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 1.6 }}>
                {result.explanation}
              </div>
            </div>
          )}

          {!result ? (
            <div className="flex flex-col gap-3">
              {scenario.options.map(o => (
                <button key={o.id} onClick={() => handleAnswer(o.id)}
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: 8,
                    background: '#222225', border: '1px solid #2a2a2e',
                    color: '#fdfdfd', fontSize: 14, fontWeight: 500,
                    cursor: 'pointer', textAlign: 'left', lineHeight: 1.4,
                  }}>
                  {o.label}
                </button>
              ))}
            </div>
          ) : (
            <button onClick={handleNext}
              style={{
                width: '100%', padding: '14px', borderRadius: 8,
                background: '#4fce82', border: 'none',
                color: '#0f0f0f', fontWeight: 600, fontSize: 15, cursor: 'pointer',
              }}>
              {handNum >= 9 ? 'Finalizar Sessao' : 'Proximo >'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Module23() {
  const { progress, markLessonRead } = useProgress()
  const mod = progress.modules[23]
  const [showTrainer, setShowTrainer] = useState(mod?.lessonRead || false)

  if (!showTrainer) {
    return <Lesson onComplete={() => {
      markLessonRead(23)
      setShowTrainer(true)
    }} />
  }

  return <Trainer />
}
