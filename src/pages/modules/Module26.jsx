import { useState, useCallback } from 'react'
import { useProgress } from '../../context/ProgressContext'
import DecisionTree from '../../components/DecisionTree'

// ================================================================
// MODULO 26 — Sizing Theory (Cada Sizing Conta uma Historia)
// ================================================================

const SCENARIOS = [
  () => ({
    q: 'Flop A-K-5 rainbow. BTN (raiser) vs BB. BTN tem range advantage massivo. Qual sizing de c-bet?',
    a: '25-33% pot (sizing pequeno — range advantage = bet frequente e barato)',
    b: '75% pot (sizing grande — board alto)',
    aCorrect: true,
    explanation: 'Range advantage = muitas maos no range conectam com o board. Aposta com muitas maos e sizing pequeno porque nao precisa de fold equity — o lucro vem da frequencia, nao do tamanho.',
  }),
  () => ({
    q: 'Flop J-T-8 com flush draw. IP com set de JJ. Qual sizing?',
    a: '66-75% pot (proteger contra draws, cobrar caro)',
    b: '25-33% pot (sizing padrao)',
    aCorrect: true,
    explanation: 'Board ultra-umido com flush draw + straight draws. Draws tem 30-40% equity. Sizing grande forca draws a pagar preco errado. Protecao e mais importante que frequencia aqui.',
  }),
  () => ({
    q: 'River em board seco A-7-2-4-9. Voce tem AA (nuts). Vilao checkou 3 streets. Qual sizing?',
    a: '33-50% pot (vilao tem range fraco, sizing grande assusta)',
    b: '100%+ pot (overbet — maximizar valor)',
    aCorrect: true,
    explanation: 'Vilao checkou 3x, range e fraco (pares medianos, Ax fracos). Sizing grande faz ele foldar tudo. Sizing menor (33-50%) extrai valor fino de maos que pagam por curiosidade ou pot odds.',
  }),
  () => ({
    q: 'Voce quer overbet (100%+ pot) no river. Quando isso faz sentido?',
    a: 'Range polarizado: voce tem nuts ou nada, vilao tem range capped',
    b: 'Quando voce tem qualquer mao forte',
    aCorrect: true,
    explanation: 'Overbet e a arma do range polarizado. Funciona quando: 1) vilao tem range capped (nao pode ter nuts), 2) voce pode ter nuts e bluffs. Maximiza valor das nuts E fold equity dos bluffs.',
  }),
  () => ({
    q: 'Flop 9-5-2 rainbow. Voce e o raiser IP com range advantage. C-bet com AA. Sizing?',
    a: '25-33% (mesmo com AA — sizing consistente com range)',
    b: '75% (AA e forte, bet grande)',
    aCorrect: true,
    explanation: 'AA e forte, mas o sizing deve ser consistente com sua estrategia de range. Se voce aposta 25-33% com range advantage, AA tambem usa esse sizing. Variar sizing por mao da informacao ao vilao.',
  }),
  () => ({
    q: 'Turn em board Q-8-3-K. Voce IP bettou flop 33%. Agora tem AK (dois pares). Sizing do turn?',
    a: '60-75% pot (mao forte, quer construir pote grande pro river)',
    b: '33% pot (manter sizing pequeno)',
    aCorrect: true,
    explanation: 'Turn sizing geralmente escala. Flop foi 33% com range, agora no turn voce tem mao forte e quer construir pote. 60-75% constroi pote pro river e cobra draws. Sizing de flop != sizing de turn.',
  }),
  () => ({
    q: 'Conceito: por que usar sizing de 33% no flop e mais eficiente que 75% em boards secos?',
    a: 'Precisa funcionar menos vezes pra ser lucrativo, e aposta com mais maos',
    b: 'Porque maos fortes preferem sizing pequeno',
    aCorrect: true,
    explanation: 'Bet 33% pot precisa funcionar ~25% das vezes. Bet 75% precisa funcionar ~43%. Em boards secos com range advantage, voce lucra mais apostando 33% com MUITAS maos do que 75% com poucas.',
  }),
  () => ({
    q: 'River com straight feito em board com flush possible. Vilao checkou. Voce IP. Sizing?',
    a: '75-100% (polarizado — mao forte quer valor maximo, flush possible limita calls)',
    b: '33% (sizing fino)',
    aCorrect: true,
    explanation: 'Straight feito e mao forte mas nao invulneravel (flush possivel). Sizing grande (75-100%) maximiza valor contra maos que vao pagar (dois pares, sets) e bleffa bem com air. Range polarizado = sizing grande.',
  }),
  () => ({
    q: '50% pot sizing e usado quando:',
    a: 'Protecao moderada — mao boa mas nao monster (top pair bom kicker)',
    b: 'Sempre que voce tem par',
    aCorrect: true,
    explanation: '50% e o sizing "padrao" de protecao. Funciona com maos que querem valor mas nao sao nuts: top pair bom kicker, overpairs em boards medianos. Cobra draws sem over-investir.',
  }),
  () => ({
    q: 'Flop 6-5-4 monotone (3 copas). Voce tem Ah7h (nut flush draw + overpair gutshot). Sizing de semi-bluff?',
    a: '66-75% (board perigoso, semi-bluff forte precisa de sizing grande)',
    b: '25% (manter barato)',
    aCorrect: true,
    explanation: 'Semi-bluff forte em board ultra-umido = sizing grande. Voce quer: 1) forca draws piores a pagar errado, 2) fold equity contra maos feitas fracas, 3) construir pote pra quando fechar o flush.',
  }),
  () => ({
    q: 'Qual sizing conta a historia mais consistente de "eu tenho nuts"?',
    a: 'Overbet (100%+) — so faz sentido com range extremamente polarizado',
    b: '75% pot',
    aCorrect: true,
    explanation: 'Overbet grita "eu tenho nuts ou nada". E o sizing mais polarizado possivel. Se voce fizer overbet e nao tiver nuts, precisa de bluffs criveis no range. Qualquer sizing menor pode ter maos medianas.',
  }),
  () => ({
    q: 'Voce esta OOP em board K-7-2. Donk bet (apostar antes do raiser). Qual sizing ideal?',
    a: '50-66% pot (donk bet com sizing medio, nao muito pequeno nem enorme)',
    b: '25% pot',
    aCorrect: true,
    explanation: 'Donk bet geralmente usa 50-66%. Sizing muito pequeno (25%) nao gera fold equity e nao protege. Sizing muito grande overcommit sem necessidade. 50-66% equilibra valor e protecao no donk.',
  }),
  () => ({
    q: 'Regra de thumb para sizing por street:',
    a: 'Flop: 25-50% | Turn: 50-75% | River: 66-100%+',
    b: 'Mesmo sizing em todas as streets',
    aCorrect: true,
    explanation: 'Sizings escalam pelas streets. Flop e mais frequente com sizing menor (muitas maos). Turn filtra — sizing maior. River e polarizado — sizing grande ou overbet. Isso constroi pote naturalmente.',
  }),
  () => ({
    q: 'Vilao min-betta (2x) no river em pote de 100. Voce tem 2nd pair. O que o sizing dele te diz?',
    a: 'Provavelmente valor fino com mao mediana (thin value bet)',
    b: 'Bluff claro (sizing muito pequeno)',
    aCorrect: true,
    explanation: 'Min-bet no river geralmente e valor fino — vilao quer ser pago por maos piores mas nao quer investir muito. Com 2nd pair voce tem uma decisao dificil: vilao raramente blefa com sizing minimo.',
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
      title: 'Sizing e Linguagem',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            Cada sizing de aposta <strong style={{ color: '#f5a623' }}>conta uma historia</strong>. O tamanho
            que voce escolhe comunica informacao sobre seu range — conscientemente ou nao.
          </p>
          <div className="rounded-lg p-4 mb-4" style={{ background: '#222225' }}>
            <div style={{ color: '#fdfdfd', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>O principio:</div>
            <div style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 1.8 }}>
              <strong style={{ color: '#4fce82' }}>Range advantage</strong> → sizing pequeno, frequencia alta<br/>
              <strong style={{ color: '#e5484d' }}>Nut advantage</strong> → sizing grande, frequencia baixa<br/>
              <strong style={{ color: '#f5a623' }}>Protecao</strong> → sizing medio, maos vulneraveis
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Cada Sizing Explicado',
      content: (
        <div>
          <div className="rounded-lg overflow-hidden mb-4" style={{ border: '1px solid #2a2a2e' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#222225' }}>
                  <th style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>Sizing</th>
                  <th style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>Quando usar</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['25%', 'Range advantage em board seco, c-bet frequente', '#4fce82'],
                  ['33%', 'C-bet padrao com range, info barata', '#4fce82'],
                  ['50%', 'Protecao moderada, top pair bom kicker', '#f5a623'],
                  ['66-75%', 'Valor forte, protecao em board umido, semi-bluff', '#e5484d'],
                  ['100%+', 'Polarizado puro: nuts ou bluff, vilao capped', '#e5484d'],
                ].map(([size, quando, color], i) => (
                  <tr key={i} style={{ borderTop: '1px solid #2a2a2e' }}>
                    <td style={{ color, fontSize: 14, padding: '8px 12px', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{size}</td>
                    <td style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px' }}>{quando}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
    {
      title: 'Sizing por Street',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            Sizings escalam naturalmente pelas streets:
          </p>
          <div className="space-y-2 mb-4">
            {[
              { street: 'Flop', range: '25-50%', why: 'Ranges amplos, muitas maos pra apostar, sizing menor', color: '#4fce82' },
              { street: 'Turn', range: '50-75%', why: 'Ranges mais definidos, valor mais claro, sizing cresce', color: '#f5a623' },
              { street: 'River', range: '66-100%+', why: 'Ranges polarizados, decisao final, sizing maximo', color: '#e5484d' },
            ].map((item, i) => (
              <div key={i} className="rounded-lg px-4 py-3" style={{ background: '#222225' }}>
                <div className="flex items-center gap-3 mb-1">
                  <div style={{ color: item.color, fontSize: 14, fontWeight: 700 }}>{item.street}</div>
                  <div style={{ color: '#fdfdfd', fontSize: 13, fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{item.range}</div>
                </div>
                <div style={{ color: '#676671', fontSize: 12 }}>{item.why}</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg p-4" style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)' }}>
            <div style={{ color: '#f5a623', fontSize: 13, fontWeight: 600 }}>
              Sizing escalando = construcao de pote natural. Nao aposte 75% no flop e 33% no turn.
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Overbet e Min-bet',
      content: (
        <div>
          <div className="rounded-lg p-4 mb-3" style={{ background: 'rgba(229,72,77,0.08)', border: '1px solid rgba(229,72,77,0.2)' }}>
            <div style={{ color: '#e5484d', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Overbet (100%+ pot)</div>
            <div style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 1.7 }}>
              Range ultra-polarizado. Funciona quando:<br/>
              - Vilao tem range capped (nao pode ter nuts)<br/>
              - Voce pode representar as nuts de forma credivel<br/>
              - Maximiza valor com nuts, maximiza fold equity com bluffs
            </div>
          </div>
          <div className="rounded-lg p-4 mb-4" style={{ background: 'rgba(10,132,215,0.08)', border: '1px solid rgba(10,132,215,0.2)' }}>
            <div style={{ color: '#0a84d7', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Min-bet (25-30%)</div>
            <div style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 1.7 }}>
              Valor ultra-fino ou blocking bet:<br/>
              - Quer ser pago por maos piores sem arriscar muito<br/>
              - "Bloqueia" apostas maiores do vilao (blocking bet OOP)<br/>
              - Nao recomendado como bluff (sizing nao gera fold equity)
            </div>
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
            Modulo 26 - Sizing Theory
          </h1>
          <p style={{ color: '#676671', fontSize: 13, marginBottom: 20 }}>
            Cada sizing conta uma historia — saiba quando usar cada um
          </p>

          <div className="flex gap-1 mb-6 overflow-x-auto">
            {sections.map((s, i) => (
              <button key={i} onClick={() => setSection(i)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
                style={{
                  background: section === i ? 'rgba(245,166,35,0.12)' : 'transparent',
                  color: section === i ? '#f5a623' : '#676671',
                  border: `1px solid ${section === i ? '#f5a623' : 'transparent'}`,
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
  const progress = getModuleProgress(26)

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
    recordAnswer(26, isCorrect, newStreak, { tp: 'siz' })
    setResult({ isCorrect, explanation: scenario.explanation, chosenId: optionId })
  }, [result, scenario, streak, recordAnswer])

  const handleNext = useCallback(() => {
    const nextHand = handNum + 1
    if (nextHand >= 10) {
      const accuracy = Math.round((sessionCorrect / 10) * 100)
      recordSession(26, accuracy)
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
            { label: 'Precisao', value: `${acc}%`, color: '#4fce82' },
            { label: 'Streak', value: streak, color: '#f5a623' },
          ].map((s, i) => (
            <div key={i} className="rounded-lg p-2.5 text-center" style={{ background: '#1a1a1d' }}>
              <div style={{ color: '#676671', fontSize: 10, marginBottom: 2 }}>{s.label}</div>
              <div style={{ color: s.color, fontSize: 18, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl p-5" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
          <div style={{ color: '#fdfdfd', fontSize: 15, lineHeight: 1.7, marginBottom: 20 }}>
            {scenario.question}
          </div>

          <div className="space-y-2">
            {scenario.options.map(opt => {
              let bg = '#2a2a2e'
              let border = '#2a2a2e'
              if (result) {
                if (opt.correct) { bg = 'rgba(79,206,130,0.12)'; border = '#4fce82' }
                else if (opt.id === result.chosenId) { bg = 'rgba(229,72,77,0.12)'; border = '#e5484d' }
              }
              return (
                <button key={opt.id} onClick={() => handleAnswer(opt.id)}
                  disabled={!!result}
                  className="w-full text-left rounded-xl px-4 py-3"
                  style={{ background: bg, border: `1px solid ${border}`, color: '#fdfdfd', fontSize: 13, lineHeight: 1.5, cursor: result ? 'default' : 'pointer' }}>
                  {opt.label}
                </button>
              )
            })}
          </div>

          {result && (
            <div className="mt-4">
              <div className="rounded-lg p-3 mb-3" style={{
                background: result.isCorrect ? 'rgba(79,206,130,0.08)' : 'rgba(229,72,77,0.08)',
                border: `1px solid ${result.isCorrect ? 'rgba(79,206,130,0.2)' : 'rgba(229,72,77,0.2)'}`,
              }}>
                <div style={{ color: result.isCorrect ? '#4fce82' : '#e5484d', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                  {result.isCorrect ? 'Correto!' : 'Errado'}
                </div>
                <div style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 1.6 }}>{result.explanation}</div>
                {!result.isCorrect && <DecisionTree scenario={{ ...scenario, moduleId: 26 }} result={result} />}
              </div>
              <button onClick={handleNext}
                style={{
                  width: '100%', padding: '12px', borderRadius: 8,
                  background: '#4fce82', border: 'none', color: '#0f0f0f',
                  fontWeight: 600, fontSize: 14, cursor: 'pointer',
                }}>
                {handNum >= 9 ? 'Finalizar Sessao' : 'Proxima'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Module26() {
  const { markLessonRead, getModuleProgress } = useProgress()
  const progress = getModuleProgress(26)
  const [mode, setMode] = useState(progress.lessonRead ? 'trainer' : 'lesson')

  if (mode === 'lesson') {
    return <Lesson onComplete={() => { markLessonRead(26); setMode('trainer') }} />
  }
  return <Trainer />
}
