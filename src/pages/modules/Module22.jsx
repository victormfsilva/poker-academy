import { useState, useCallback } from 'react'
import { useProgress } from '../../context/ProgressContext'

// ================================================================
// MODULO 22 — SPR (Stack-to-Pot Ratio)
// ================================================================

const SPR_SCENARIOS = [
  // SPR Baixo (1-4): commit com top pair+
  () => {
    const spr = [1.5, 2, 2.5, 3, 3.5, 4][Math.floor(Math.random() * 6)]
    return {
      q: `Flop A-7-2 rainbow. Voce tem ATo (top pair). SPR = ${spr}. Vilao betta 50%.`,
      a: 'All-in (SPR baixo = commit com top pair+)',
      b: 'Call e avaliar turn',
      aCorrect: true,
      explanation: `Com SPR ${spr}, voce ja esta comprometido com o pote. Top pair+ em SPR baixo = vai com tudo. Nao tem estofo para jogar 3 streets.`,
    }
  },
  () => {
    const spr = [1.5, 2, 3][Math.floor(Math.random() * 3)]
    return {
      q: `3-bet pot. Flop K-8-3 dry. Voce tem QQ. SPR = ${spr}. Vilao checka.`,
      a: 'Bet e commit (SPR baixo, overpair forte)',
      b: 'Check pra pot control',
      aCorrect: true,
      explanation: `SPR ${spr} = so cabe 1 bet e all-in. QQ em K-high board e forte o suficiente nesse SPR. Betta e vai.`,
    }
  },
  () => {
    const spr = [2, 2.5, 3][Math.floor(Math.random() * 3)]
    return {
      q: `SPR = ${spr}. Flop J-T-9 conectado. Voce tem JJ (top set). Vilao betta.`,
      a: 'Raise all-in (proteger o set em board perigoso)',
      b: 'Call (slowplay)',
      aCorrect: true,
      explanation: `Board muito perigoso com muitos draws. SPR baixo = nao dar carta gratis. Raise all-in protege seu set e extrai valor dos draws.`,
    }
  },

  // SPR Medio (4-8): jogo de protecao, sizing importa
  () => {
    const spr = [5, 6, 7][Math.floor(Math.random() * 3)]
    return {
      q: `SPR = ${spr}. Flop Q-9-4 com flush draw. Voce tem QJs (top pair + flush draw). Vilao checka.`,
      a: 'Bet 66-75% (proteger + valor, SPR medio)',
      b: 'Bet 33% (sizing pequeno)',
      aCorrect: true,
      explanation: `SPR medio com top pair + draw em board umido = sizing medio-grande. Voce quer proteger contra draws e construir pote. 33% nao protege o bastante.`,
    }
  },
  () => {
    const spr = [4.5, 5, 6][Math.floor(Math.random() * 3)]
    return {
      q: `SPR = ${spr}. Flop A-K-2 rainbow. Voce tem TT (par medio). Vilao betta 50%.`,
      a: 'Fold (SPR medio, underpair em AK board)',
      b: 'Call (par e par)',
      aCorrect: true,
      explanation: `SPR medio com par de T em board AK = muito ruim. Vilao representa range forte (AK, AQ, AJ, KQ). Seu par de T quase nunca e bom aqui.`,
    }
  },
  () => {
    const spr = [5, 6, 7][Math.floor(Math.random() * 3)]
    return {
      q: `SPR = ${spr}. Flop 7-6-3 rainbow. Voce tem 77 (top set). Vilao checka.`,
      a: 'Bet 50% (valor e protecao, board seco)',
      b: 'Check (slowplay set)',
      aCorrect: true,
      explanation: `SPR medio com set em board seco: betta por valor. Slowplay e arriscado porque SPR medio = voce precisa construir pote em 3 streets pra stackar.`,
    }
  },

  // SPR Alto (8+): implied odds, sets e draws valem mais
  () => {
    const spr = [10, 12, 15][Math.floor(Math.random() * 3)]
    return {
      q: `SPR = ${spr}. Flop K-8-3 rainbow. Voce tem AKo (top pair top kicker). Vilao betta 66%.`,
      a: 'Call (pot control, SPR alto com top pair)',
      b: 'Raise',
      aCorrect: true,
      explanation: `SPR alto com TPTK = mao forte mas nao monstro. Raise infla o pote demais — voce perde pra sets, 2-pair. Call e jogue as streets com cautela.`,
    }
  },
  () => {
    const spr = [10, 12, 14][Math.floor(Math.random() * 3)]
    return {
      q: `SPR = ${spr}. Pre-flop single raise pot. Voce tem 55 no BTN. UTG raisa.`,
      a: 'Call (set mine — implied odds altas com SPR alto)',
      b: 'Fold (par baixo)',
      aCorrect: true,
      explanation: `SPR alto = implied odds excelentes pra set mine. Se acertar o set (~12% do tempo), ganha pilhas grandes. Regra: precisa de SPR 10+ pra set mine lucrar.`,
    }
  },
  () => {
    const spr = [9, 11, 13][Math.floor(Math.random() * 3)]
    return {
      q: `SPR = ${spr}. Flop 9-8-6 com 2 copas. Voce tem Ah5h (nut flush draw). Vilao betta 75%.`,
      a: 'Call (draw com implied odds, SPR alto)',
      b: 'Fold (nao tem par)',
      aCorrect: true,
      explanation: `SPR alto com nut flush draw = call otimo. Se acertar o flush, vilao vai pagar muito. Implied odds justificam o call mesmo sem par feito.`,
    }
  },
  () => {
    const spr = [10, 12, 15][Math.floor(Math.random() * 3)]
    return {
      q: `SPR = ${spr}. Flop A-7-2. Voce tem ATo (top pair). Vilao checka-raisa sua cbet.`,
      a: 'Call (pot control, cuidado com SPR alto)',
      b: 'Re-raise (top pair forte)',
      aCorrect: true,
      explanation: `SPR alto e check-raise = vilao tem mao forte (set, 2-pair, ou bluff com draw). TPTK nao quer inflar mais o pote. Call e reavalie no turn.`,
    }
  },

  // Identificar SPR
  () => {
    const pot = [20, 30, 40][Math.floor(Math.random() * 3)]
    const stack = pot * [2, 4, 8, 12][Math.floor(Math.random() * 4)]
    const spr = Math.round(stack / pot * 10) / 10
    const category = spr <= 4 ? 'Baixo' : spr <= 8 ? 'Medio' : 'Alto'
    return {
      q: `Stack efetivo: ${stack}bb. Pote no flop: ${pot}bb. SPR = ${spr}. Qual a categoria?`,
      a: `${category} (SPR ${spr})`,
      b: category === 'Baixo' ? 'Alto' : category === 'Alto' ? 'Baixo' : (Math.random() > 0.5 ? 'Baixo' : 'Alto'),
      aCorrect: true,
      explanation: `SPR = Stack / Pot = ${stack}/${pot} = ${spr}. Categorias: Baixo (1-4), Medio (4-8), Alto (8+). SPR ${spr} = ${category}.`,
    }
  },
  () => {
    return {
      q: `Voce tem 88 no flop T-6-2 dry. SPR = 3. Vilao betta pot. O que fazer?`,
      a: 'Call/Fold (par medio em SPR baixo = marginal)',
      b: 'Raise (proteger o par)',
      aCorrect: true,
      explanation: `SPR baixo com par medio (88 em T-high) = situacao ruim. Voce nao tem mao forte o bastante pra commit (precisa de top pair+ em SPR baixo). Call se odds permitem, senao fold.`,
    }
  },
  () => {
    const spr = [2, 3, 3.5][Math.floor(Math.random() * 3)]
    return {
      q: `4-bet pot. SPR = ${spr}. Flop 9-5-2 rainbow. Voce tem AA. Vilao checka.`,
      a: 'Bet pequeno ou shove (SPR baixo, AA = commit)',
      b: 'Check (trap)',
      aCorrect: true,
      explanation: `SPR ${spr} com AA em board seco = commit total. Betta qualquer sizing — ate shove funciona porque SPR baixo. Check desperica valor contra range de 4-bet do vilao.`,
    }
  },
  () => {
    const spr = [12, 15, 18][Math.floor(Math.random() * 3)]
    return {
      q: `SPR = ${spr}. Voce tem 67s. Flop 5-8-T com 2 do seu naipe. Flush draw + gutshot.`,
      a: 'Semi-bluff (12+ outs, implied odds enormes)',
      b: 'Check/fold',
      aCorrect: true,
      explanation: `SPR alto com combo draw (flush + straight = 12+ outs) = spot perfeito pra semi-bluff. Se vilao folda, otimo. Se chama, voce tem ~45% de equity com 2 cartas por vir.`,
    }
  },
]

function generateSPRScenario() {
  const pick = SPR_SCENARIOS[Math.floor(Math.random() * SPR_SCENARIOS.length)]
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
      title: 'O que e SPR?',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            <strong style={{ color: '#4fce82' }}>SPR (Stack-to-Pot Ratio)</strong> e a razao entre o stack efetivo e o pote no flop.
            E o conceito MAIS importante para decisoes pos-flop.
          </p>
          <div className="rounded-lg p-4 mb-4" style={{ background: '#222225' }}>
            <div style={{ color: '#fdfdfd', fontSize: 16, fontWeight: 700, fontFamily: 'JetBrains Mono', textAlign: 'center', marginBottom: 8 }}>
              SPR = Stack Efetivo / Pote no Flop
            </div>
            <div style={{ color: '#676671', fontSize: 13, textAlign: 'center' }}>
              Ex: Stack 100bb, Pote 10bb = SPR 10
            </div>
          </div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8 }}>
            O SPR muda COMPLETAMENTE como voce joga a mesma mao. Um par de As com SPR 2 e jogado
            de forma totalmente diferente do que com SPR 15.
          </p>
        </div>
      ),
    },
    {
      title: 'SPR Baixo (1-4)',
      content: (
        <div>
          <div className="rounded-lg p-4 mb-4" style={{ background: 'rgba(229,72,77,0.1)', border: '1px solid rgba(229,72,77,0.25)' }}>
            <div style={{ color: '#e5484d', fontSize: 14, fontWeight: 700, marginBottom: 6 }}>SPR 1-4: Commit Zone</div>
            <ul style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 2, paddingLeft: 16 }}>
              <li>Comum em <strong style={{ color: '#fdfdfd' }}>3-bet e 4-bet pots</strong></li>
              <li>Top pair+ = <strong style={{ color: '#4fce82' }}>vai com tudo</strong> (all-in)</li>
              <li>Matematica pura: pot odds ja te comprometem</li>
              <li>Draws perdem valor (poucas implied odds)</li>
              <li>Nao existe pot control — o pote ja e grande demais</li>
            </ul>
          </div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8 }}>
            <strong style={{ color: '#fdfdfd' }}>Regra de ouro:</strong> Se SPR &le; 4, qualquer mao
            top pair+ esta disposta a colocar todas as fichas. Nao tente ser esperto — va direto.
          </p>
        </div>
      ),
    },
    {
      title: 'SPR Medio (4-8)',
      content: (
        <div>
          <div className="rounded-lg p-4 mb-4" style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.25)' }}>
            <div style={{ color: '#f5a623', fontSize: 14, fontWeight: 700, marginBottom: 6 }}>SPR 4-8: Protecao e Valor</div>
            <ul style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 2, paddingLeft: 16 }}>
              <li>Zona mais complexa — <strong style={{ color: '#fdfdfd' }}>sizing importa muito</strong></li>
              <li>Top pair precisa de protecao (bet medio-grande)</li>
              <li>Sets e 2-pair = construir pote em 3 streets</li>
              <li>Draws tem alguma implied odds mas nao ilimitadas</li>
              <li>Pot control com maos marginais (call, nao raise)</li>
            </ul>
          </div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8 }}>
            <strong style={{ color: '#fdfdfd' }}>Sizing e arma:</strong> Com SPR medio, escolha cuidadosamente
            entre 33%, 50% e 75%. Cada sizing conta uma historia diferente.
          </p>
        </div>
      ),
    },
    {
      title: 'SPR Alto (8+)',
      content: (
        <div>
          <div className="rounded-lg p-4 mb-4" style={{ background: 'rgba(79,206,130,0.1)', border: '1px solid rgba(79,206,130,0.25)' }}>
            <div style={{ color: '#4fce82', fontSize: 14, fontWeight: 700, marginBottom: 6 }}>SPR 8+: Implied Odds</div>
            <ul style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 2, paddingLeft: 16 }}>
              <li>Potes single raise — stacks profundos</li>
              <li>Top pair = <strong style={{ color: '#fdfdfd' }}>pot control</strong> (nao inflar o pote)</li>
              <li>Sets, straights, flushes = <strong style={{ color: '#4fce82' }}>construir pote grande</strong></li>
              <li>Draws valem MUITO (implied odds altas)</li>
              <li>Set mine com pares baixos = lucrativo (precisa SPR 10+)</li>
              <li>Combo draws = semi-bluff agressivo</li>
            </ul>
          </div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8 }}>
            <strong style={{ color: '#fdfdfd' }}>A grande diferenca:</strong> Com SPR alto, top pair nao quer
            colocar todas as fichas. Mas set mining e flush draws sao muito mais valiosos porque quando acertam,
            ganham pilhas enormes.
          </p>
        </div>
      ),
    },
    {
      title: 'Resumo Pratico',
      content: (
        <div>
          <div className="rounded-lg overflow-hidden mb-4" style={{ border: '1px solid #2a2a2e' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#222225' }}>
                  <th style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>SPR</th>
                  <th style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>Top Pair</th>
                  <th style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>Draws</th>
                  <th style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>Sets</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderTop: '1px solid #2a2a2e' }}>
                  <td style={{ color: '#e5484d', fontSize: 13, padding: '8px 12px', fontWeight: 700 }}>1-4</td>
                  <td style={{ color: '#4fce82', fontSize: 12, padding: '8px 12px' }}>All-in</td>
                  <td style={{ color: '#e5484d', fontSize: 12, padding: '8px 12px' }}>Fraco</td>
                  <td style={{ color: '#4fce82', fontSize: 12, padding: '8px 12px' }}>All-in</td>
                </tr>
                <tr style={{ borderTop: '1px solid #2a2a2e' }}>
                  <td style={{ color: '#f5a623', fontSize: 13, padding: '8px 12px', fontWeight: 700 }}>4-8</td>
                  <td style={{ color: '#f5a623', fontSize: 12, padding: '8px 12px' }}>Proteger</td>
                  <td style={{ color: '#f5a623', fontSize: 12, padding: '8px 12px' }}>Semi-bluff</td>
                  <td style={{ color: '#4fce82', fontSize: 12, padding: '8px 12px' }}>Construir</td>
                </tr>
                <tr style={{ borderTop: '1px solid #2a2a2e' }}>
                  <td style={{ color: '#4fce82', fontSize: 13, padding: '8px 12px', fontWeight: 700 }}>8+</td>
                  <td style={{ color: '#0a84d7', fontSize: 12, padding: '8px 12px' }}>Pot control</td>
                  <td style={{ color: '#4fce82', fontSize: 12, padding: '8px 12px' }}>Implied odds</td>
                  <td style={{ color: '#4fce82', fontSize: 12, padding: '8px 12px' }}>Stack off</td>
                </tr>
              </tbody>
            </table>
          </div>
          <button onClick={onComplete}
            style={{
              width: '100%', padding: '14px', borderRadius: 8, marginTop: 16,
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
            Modulo 22 - SPR (Stack-to-Pot Ratio)
          </h1>
          <p style={{ color: '#676671', fontSize: 13, marginBottom: 20 }}>
            Como o tamanho do stack relativo ao pote muda toda a estrategia pos-flop
          </p>

          {/* Section nav */}
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
  const progress = getModuleProgress(22)

  const [scenario, setScenario] = useState(() => generateSPRScenario())
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
    recordAnswer(22, isCorrect, newStreak, { tp: 'spr' })
    setResult({ isCorrect, explanation: scenario.explanation })
  }, [result, scenario, streak, recordAnswer])

  const handleNext = useCallback(() => {
    const nextHand = handNum + 1
    if (nextHand >= 10) {
      const accuracy = Math.round((sessionCorrect / 10) * 100)
      recordSession(22, accuracy)
      setHandNum(0)
      setSessionCorrect(0)
    } else {
      setHandNum(nextHand)
    }
    setResult(null)
    setScenario(generateSPRScenario())
  }, [handNum, sessionCorrect, recordSession])

  const acc = progress.totalAnswered > 0 ? progress.accuracy : 0
  const sessionAcc = handNum > 0 ? Math.round((sessionCorrect / handNum) * 100) : 0

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-16" style={{ background: '#0f0f0f' }}>
      <div className="max-w-2xl mx-auto px-4 pt-6">

        {/* Stats */}
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

        {/* Card */}
        <div className="rounded-2xl p-5 mb-4" style={{
          background: '#1a1a1d',
          border: `1px solid ${result ? (result.isCorrect ? '#4fce8255' : '#e5484d55') : '#2a2a2e'}`,
        }}>
          <div style={{ color: '#676671', fontSize: 11, fontWeight: 600, marginBottom: 12 }}>
            SPR - CENARIO {handNum + 1}/10
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

export default function Module22() {
  const { progress, markLessonRead } = useProgress()
  const mod = progress.modules[22]
  const [showTrainer, setShowTrainer] = useState(mod?.lessonRead || false)

  if (!showTrainer) {
    return <Lesson onComplete={() => {
      markLessonRead(22)
      setShowTrainer(true)
    }} />
  }

  return <Trainer />
}
