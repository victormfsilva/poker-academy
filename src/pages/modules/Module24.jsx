import { useState, useCallback } from 'react'
import { useProgress } from '../../context/ProgressContext'
import DecisionTree from '../../components/DecisionTree'

// ================================================================
// MODULO 24 — Polarizacao vs Merge
// ================================================================

const SCENARIOS = [
  () => ({
    q: 'River em board A-K-8-4-2 rainbow. Voce e IP e quer apostar. Qual tipo de range usar?',
    a: 'Polarizado (apostar com nuts e bluffs, check o meio)',
    b: 'Merged (apostar com tudo que e razoavel)',
    aCorrect: true,
    explanation: 'No river IP, voce tem informacao posicional. Range polarizado e ideal: aposta com maos monstro (dois pares+, sets) e bluffs puros (draws que nao fecharam). Checa maos medianas que nao precisam de protecao.',
  }),
  () => ({
    q: 'Flop 9-5-2 rainbow. Voce e OOP e o raiser. Qual tipo de range usar para c-bet?',
    a: 'Merged (apostar com overpairs, top pairs, middle pairs)',
    b: 'Polarizado (so AA/KK e bluffs)',
    aCorrect: true,
    explanation: 'OOP voce quer proteger seu range de check. Em boards secos OOP, merge e melhor: aposta com maos boas (overpairs ate middle pair) e checa o lixo. Nao da pra defender range de check polarizado OOP.',
  }),
  () => ({
    q: 'Qual a diferenca principal entre range polarizado e merged?',
    a: 'Polarizado: nuts + lixo. Merged: tudo que e bom.',
    b: 'Polarizado: maos fortes. Merged: maos fracas.',
    aCorrect: true,
    explanation: 'Polarizado = "bimodal" — voce tem ou o melhor ou o pior, nada no meio. Merged = "linear" — voce aposta com tudo que tem valor, do melhor ate maos medianas. A ausencia do meio e a chave do polarizado.',
  }),
  () => ({
    q: 'Board seco (K-7-2 rainbow). Raiser IP vs BB. Qual estrategia de c-bet?',
    a: 'Merge: c-bet frequente com maos boas (K+, overpairs, middle pairs)',
    b: 'Polarizado: so KK+ e air',
    aCorrect: true,
    explanation: 'Board seco = poucas draws = pouca necessidade de protecao extrema. Merge funciona bem: aposta com muitas maos de valor (Kx, overpairs, ate 88-TT) porque o vilao nao vai melhorar muito nos turns.',
  }),
  () => ({
    q: 'Board umido (J-T-8 com flush draw). Raiser IP vs BB. Qual estrategia?',
    a: 'Polarizado: maos muito fortes e semi-bluffs, check maos medianas',
    b: 'Merge: apostar com tudo',
    aCorrect: true,
    explanation: 'Board umido = muitos draws = equities mudam muito no turn. Range polarizado e melhor: aposta grande com sets, overpairs fortes, e semi-bluffs (flush draws, straight draws). Checa maos medianas que nao querem enfrentar raise.',
  }),
  () => ({
    q: 'IP no river apos check-check no turn. Board A-9-4-7-3. Voce tem Ah5h (ace high, draw perdido). Apostar?',
    a: 'Sim — bom bluff polarizado (nao tem showdown value)',
    b: 'Nao — check back',
    aCorrect: true,
    explanation: 'Ace high sem showdown value e um bluff perfeito no range polarizado do river. Voce nao ganha no showdown, entao transformar em bluff e melhor. O check-check no turn faz o range do vilao parecer fraco.',
  }),
  () => ({
    q: 'OOP no flop 6-5-4 com flush draw. Voce e o 3-bettor com range premium. Qual abordagem?',
    a: 'Merge: c-bet com overpairs e sets, check os misses',
    b: 'Polarizado: apostar so com nuts e bluffs',
    aCorrect: true,
    explanation: 'OOP em board conectado como 3-bettor, merge e correto. Seus overpairs (AA-JJ) sao maos de valor claras e precisam de protecao. Aposte com maos boas, check com Ax, Kx que nao conectaram.',
  }),
  () => ({
    q: 'Voce esta IP no turn. Board Q-8-3-K. Vilao checkou flop e turn. Qual range para bet?',
    a: 'Polarizado (forte: KQ, sets + bluffs: draws perdidos)',
    b: 'Merged (QJ, Q9, K9, etc)',
    aCorrect: true,
    explanation: 'Quando vilao checa duas streets, seu range esta fraco/cappado. IP voce polariza: aposta grande com maos fortes (KQ, sets, dois pares) e bluffs puros. Maos medianas como Q9 ja ganham no showdown — check.',
  }),
  () => ({
    q: 'Regra geral: quando voce tende a polarizar mais?',
    a: 'IP, streets tardias (turn/river), boards umidos',
    b: 'OOP, flop, boards secos',
    aCorrect: true,
    explanation: 'Polarizacao e mais eficiente IP (ve a reacao do vilao), em streets tardias (ranges mais definidos), e em boards umidos (equities volateis). OOP tende a mergear mais por falta de informacao.',
  }),
  () => ({
    q: 'Sizing ideal para range merged vs polarizado:',
    a: 'Merged = sizing pequeno-medio (33-50%). Polarizado = sizing grande (66-100%+)',
    b: 'Merged = sizing grande. Polarizado = sizing pequeno.',
    aCorrect: true,
    explanation: 'Merged aposta com muitas maos de valor, entao sizing pequeno funciona (nao precisa fold equity). Polarizado quer maximizar: maos fortes querem valor maximo, bluffs precisam de fold equity — sizing grande.',
  }),
  () => ({
    q: 'River em single raise pot. Voce IP com TT em board A-J-5-3-8. Apostar?',
    a: 'Check back (mao mediana, nao polariza bem)',
    b: 'Bet (proteger contra Kx)',
    aCorrect: true,
    explanation: 'TT em board com A e J e uma mao mediana classica. No river IP, range polarizado e ideal. TT nao e nuts (nao aposta por valor) nem bluff (tem showdown value). Check back e correto.',
  }),
  () => ({
    q: 'Board T-6-2 rainbow. CO vs BB. CO faz c-bet 33% com 80% do range. Isso e estrategia:',
    a: 'Merged (alta frequencia, sizing pequeno, muitas maos de valor)',
    b: 'Polarizada',
    aCorrect: true,
    explanation: 'C-bet frequente com sizing pequeno = estrategia merged classica. CO tem range advantage em board seco, aposta com muitas maos (overpairs, broadways com backdoors, underpairs) usando sizing minimo.',
  }),
  () => ({
    q: 'Qual a fraqueza de um range polarizado OOP?',
    a: 'Range de check fica vulneravel (muitas maos medianas sem protecao)',
    b: 'Nao tem maos fortes suficientes',
    aCorrect: true,
    explanation: 'Se voce polariza OOP, seu range de check fica cheio de maos medianas que sao vulneraveis. O vilao IP pode explorar apostando com frequencia contra esse range capped. Por isso OOP prefere merge.',
  }),
  () => ({
    q: 'Flop A-A-5. BTN vs BB. BTN faz c-bet 100% com sizing 25%. Qual o conceito?',
    a: 'Merge extremo: range advantage enorme, aposta com tudo barato',
    b: 'Polarizado: proteger com maos fortes',
    aCorrect: true,
    explanation: 'Board pareado com A e o extremo do merge. BTN tem range advantage absurdo (todos os Ax, e BB quase nunca tem trip As). C-bet 100% sizing minimo funciona porque qualquer mao pode representar o A.',
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
      title: 'Polarizado vs Merged',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            Existem dois tipos fundamentais de range de aposta no poker:
          </p>
          <div className="rounded-lg p-4 mb-3" style={{ background: 'rgba(229,72,77,0.08)', border: '1px solid rgba(229,72,77,0.2)' }}>
            <div style={{ color: '#e5484d', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Range Polarizado</div>
            <div style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 1.7 }}>
              Aposta com o <strong style={{ color: '#fdfdfd' }}>melhor</strong> (nuts) e o <strong style={{ color: '#fdfdfd' }}>pior</strong> (bluffs).<br/>
              Checa tudo no <strong style={{ color: '#fdfdfd' }}>meio</strong> (maos medianas com showdown value).
            </div>
          </div>
          <div className="rounded-lg p-4" style={{ background: 'rgba(79,206,130,0.08)', border: '1px solid rgba(79,206,130,0.2)' }}>
            <div style={{ color: '#4fce82', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Range Merged (Linear)</div>
            <div style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 1.7 }}>
              Aposta com <strong style={{ color: '#fdfdfd' }}>tudo que e bom</strong>, do melhor ate maos medianas.<br/>
              Checa apenas o <strong style={{ color: '#fdfdfd' }}>lixo</strong> que nao tem valor.
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Quando Polarizar',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            Polarizacao funciona melhor quando:
          </p>
          <div className="space-y-2 mb-4">
            {[
              { cond: 'IP (em posicao)', why: 'Voce ve a reacao do vilao antes de agir' },
              { cond: 'Streets tardias (turn/river)', why: 'Ranges mais definidos, decisoes de showdown' },
              { cond: 'Boards umidos', why: 'Equities volateis, draws criam bluffs naturais' },
              { cond: 'Vilao com range capped', why: 'Ele checou 2x = range fraco, voce polariza contra' },
            ].map((item, i) => (
              <div key={i} className="rounded-lg px-3 py-2.5" style={{ background: '#222225' }}>
                <div style={{ color: '#e5484d', fontSize: 13, fontWeight: 600 }}>{item.cond}</div>
                <div style={{ color: '#676671', fontSize: 12 }}>{item.why}</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg p-4" style={{ background: 'rgba(229,72,77,0.08)', border: '1px solid rgba(229,72,77,0.2)' }}>
            <div style={{ color: '#e5484d', fontSize: 13, fontWeight: 600 }}>
              Polarizado = sizing GRANDE (66-100%+) — valor maximo ou fold equity maxima
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Quando Mergear',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            Merge funciona melhor quando:
          </p>
          <div className="space-y-2 mb-4">
            {[
              { cond: 'OOP (fora de posicao)', why: 'Sem info, precisa proteger range de check' },
              { cond: 'Flop (street inicial)', why: 'Ranges ainda amplos, nao da pra polarizar bem' },
              { cond: 'Boards secos', why: 'Poucas draws, equities estaveis' },
              { cond: 'Range advantage claro', why: 'Apostar com muitas maos e lucrativo com sizing pequeno' },
            ].map((item, i) => (
              <div key={i} className="rounded-lg px-3 py-2.5" style={{ background: '#222225' }}>
                <div style={{ color: '#4fce82', fontSize: 13, fontWeight: 600 }}>{item.cond}</div>
                <div style={{ color: '#676671', fontSize: 12 }}>{item.why}</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg p-4" style={{ background: 'rgba(79,206,130,0.08)', border: '1px solid rgba(79,206,130,0.2)' }}>
            <div style={{ color: '#4fce82', fontSize: 13, fontWeight: 600 }}>
              Merged = sizing PEQUENO (25-50%) — muitas maos de valor, nao precisa de fold equity
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Resumo e Regras',
      content: (
        <div>
          <div className="rounded-lg overflow-hidden mb-4" style={{ border: '1px solid #2a2a2e' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#222225' }}>
                  <th style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}></th>
                  <th style={{ color: '#e5484d', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>Polarizado</th>
                  <th style={{ color: '#4fce82', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>Merged</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Aposta com', 'Nuts + bluffs', 'Tudo que e bom'],
                  ['Checa', 'Maos medianas', 'Lixo'],
                  ['Sizing', '66-100%+', '25-50%'],
                  ['Posicao', 'IP preferido', 'OOP preferido'],
                  ['Board', 'Umido/conectado', 'Seco/estatico'],
                  ['Street', 'Turn/River', 'Flop'],
                ].map(([label, pol, mer], i) => (
                  <tr key={i} style={{ borderTop: '1px solid #2a2a2e' }}>
                    <td style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', fontWeight: 600 }}>{label}</td>
                    <td style={{ color: '#fdfdfd', fontSize: 12, padding: '8px 12px' }}>{pol}</td>
                    <td style={{ color: '#fdfdfd', fontSize: 12, padding: '8px 12px' }}>{mer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            Modulo 24 - Polarizacao vs Merge
          </h1>
          <p style={{ color: '#676671', fontSize: 13, marginBottom: 20 }}>
            Quando usar cada tipo de range de aposta
          </p>

          <div className="flex gap-1 mb-6 overflow-x-auto">
            {sections.map((s, i) => (
              <button key={i} onClick={() => setSection(i)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
                style={{
                  background: section === i ? 'rgba(229,72,77,0.12)' : 'transparent',
                  color: section === i ? '#e5484d' : '#676671',
                  border: `1px solid ${section === i ? '#e5484d' : 'transparent'}`,
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
  const progress = getModuleProgress(24)

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
    recordAnswer(24, isCorrect, newStreak, { tp: 'pol' })
    setResult({ isCorrect, explanation: scenario.explanation, chosenId: optionId })
  }, [result, scenario, streak, recordAnswer])

  const handleNext = useCallback(() => {
    const nextHand = handNum + 1
    if (nextHand >= 10) {
      const accuracy = Math.round((sessionCorrect / 10) * 100)
      recordSession(24, accuracy)
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
                {!result.isCorrect && <DecisionTree scenario={{ ...scenario, moduleId: 24 }} result={result} />}
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

export default function Module24() {
  const { markLessonRead, getModuleProgress } = useProgress()
  const progress = getModuleProgress(24)
  const [mode, setMode] = useState(progress.lessonRead ? 'trainer' : 'lesson')

  if (mode === 'lesson') {
    return <Lesson onComplete={() => { markLessonRead(24); setMode('trainer') }} />
  }
  return <Trainer />
}
