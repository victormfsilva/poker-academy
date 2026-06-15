import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'

const SCENARIOS = [
  {
    situation: 'Você está no river com As5h num board K-Q-7-3-2 sem flush. Vilao checkou o flop é o turn, é checkou de novo no river.',
    question: 'Você deve blefar?',
    options: [
      { id: 'bluff', label: 'Sim, apostar blefe', correct: true },
      { id: 'check', label: 'Nao, check back', correct: false },
    ],
    explanation: 'Você tem o As, que bloqueia AK é AQ — as mãos de valor mais prováveis do vilao. Isso significa que ele provavelmente tem mãos marginais ou fracas. Seu A como blocker torna o blefe muito mais lucrativo.',
    concept: 'Blocker de valor: ter o Ace bloqueia top pairs é overpairs do oponente, tornando blefes mais efetivos.'
  },
  {
    situation: 'Você está no river com 9h8h num board Kh-Qh-7s-3d-2c. O flush draw não completou. Vilao apostou no flop e turn.',
    question: 'Você deve raise blefe no river?',
    options: [
      { id: 'raise', label: 'Sim, raise blefe', correct: true },
      { id: 'fold', label: 'Nao, fold', correct: false },
    ],
    explanation: 'Você tem duas cartas de copas, o que bloqueia os flush draws do vilao que poderiam ter desistido. Mais importante: você bloqueia combos de flush draw que ele usaria pra blefar. Isso significa que o range de aposta dele é mais pesado em valor — é um raise blefe pode força-lo a foldar mãos como top pair.',
    concept: 'Flush draw blocker: quando você tem cartas do naipe do draw que não completou, você bloqueia os blefes do oponente, indicando que o range dele é mais forte.'
  },
  {
    situation: 'Você está no BTN com KsQs. UTG abriu raise. Você quer 3-bet blefe.',
    question: 'KQs é um bom 3-bet blefe aqui?',
    options: [
      { id: 'no', label: 'Nao, KQs bloqueia folds', correct: true },
      { id: 'yes', label: 'Sim, KQs é forte', correct: false },
    ],
    explanation: 'KQs bloqueia KK é QQ (mãos que você QUER que o vilao tenha pra ele foldar). Mas também bloqueia KJs, QJs é outras mãos que ele foldaria ao 3-bet. Para 3-bet blefe, você quer bloquear mãos que CONTINUAM (AA, KK) é não bloquear mãos que FOLDAM.',
    concept: 'Blocker paradoxo: para blefar, bloqueie mãos que continuam (calls/4-bets). Para value bet, bloqueie mãos que foldam.'
  },
  {
    situation: 'Você está no BB com Ah4d. BTN abriu raise. Você está considerando 3-bet blefe.',
    question: 'A4o é um bom 3-bet blefe?',
    options: [
      { id: 'yes', label: 'Sim, bloqueia AA é AK', correct: true },
      { id: 'no', label: 'Nao, mão muito fraca', correct: false },
    ],
    explanation: 'A4o é um excelente 3-bet blefe! O Ace bloqueia AA (reduz combos de 6 pra 3) é AK/AQs (mãos que 4-betariam). Alem disso, A4o não tem equity suficiente pra call lucrativo, então 3-bet ou fold são as únicas opções.',
    concept: 'Ace blocker para 3-bet: ter um Ace remove metade dos combos de AA é reduz significativamente AK/AQ do oponente.'
  },
  {
    situation: 'River num board 5-6-7-8-J. Você tem T9 (straight com o 9). Vilao checkou.',
    question: 'Quão grande você deve apostar?',
    options: [
      { id: 'big', label: 'Aposta grande (75%+ pot)', correct: false },
      { id: 'medium', label: 'Aposta média (33-50% pot)', correct: true },
    ],
    explanation: 'Você tem T9, que faz straight — mas você também BLOQUEIA T9 do vilao, uma das mãos que pagaria uma aposta grande. Com 4 cartas conectadas no board, muitas mãos tem straight. Aposte menor para extrair valor de mãos como top pair é two pair.',
    concept: 'Card removal em value bet: quando você bloqueia as mãos que pagariam mais, reduza o sizing para extrair valor de mãos mais fracas.'
  },
  {
    situation: 'Você está no SB com JsTs. CO abriu raise. Você quer 3-bet blefe.',
    question: 'JTs é um bom 3-bet blefe contra CO?',
    options: [
      { id: 'no', label: 'Nao, melhor call', correct: true },
      { id: 'yes', label: 'Sim, bom blocker', correct: false },
    ],
    explanation: 'JTs tem muita equity pós-flop (straight draws, flush draws) e não bloqueia bem as mãos de continue do vilao (AA, KK, AK). E melhor usar como call — você quer 3-bet blefe com mãos como A5s/A4s que bloqueiam premium e tem menos equity de call.',
    concept: 'Mãos com boa equity pos-flop são melhores como call. Reserve 3-bet blefe para mãos com bons blockers mas pouca playability.'
  },
  {
    situation: 'Você está no river com Kh em mão. Board: A-K-8-5-2 com 3 copas. Vilao aposta 75% do pot.',
    question: 'Você deve chamar com segundo par (KK no board)?',
    options: [
      { id: 'call', label: 'Call — vilao pode blefar', correct: false },
      { id: 'fold', label: 'Fold — você bloqueia os blefes dele', correct: true },
    ],
    explanation: 'Você tem Kh — isso bloqueia flush draws de copas com K (KhQh, KhJh) que são blefes naturais do vilao. Ao bloquear os blefes dele, o range de aposta fica mais pesado em valor. Fold é melhor.',
    concept: 'Blocker defensivo: se você bloqueia os blefes do oponente, a aposta dele é mais provavelmente valor. Considere foldar.'
  },
  {
    situation: 'Você está no BTN. UTG abriu raise. Você tem AcAd. Vilao do BB fez 3-bet.',
    question: 'Como os blockers afetam sua decisão de 4-bet?',
    options: [
      { id: '4bet', label: '4-bet — AA não precisa de blockers', correct: false },
      { id: '4bet_sizing', label: '4-bet menor — você bloqueia AA/AK dele', correct: true },
    ],
    explanation: 'Com AA, você bloqueia fortemente AA (0 combos restantes) é AK (reduz de 16 pra 8 combos). Isso significa que o range de 3-bet do BB é mais leve (mais blefes). Um 4-bet menor pode induzir calls de mãos como QQ, JJ, AQs que um 4-bet grande assustaria.',
    concept: 'Blocker em sizing: quando você bloqueia a parte forte do range do oponente, ajuste o sizing para induzir calls de mãos mais fracas.'
  },
  {
    situation: 'Você está no river. Board: Q-J-T-4-2 rainbow. Você tem 9s8s (sem nada). Vilao checkou três streets.',
    question: 'Você deve blefar?',
    options: [
      { id: 'bluff', label: 'Sim, apostar blefe', correct: false },
      { id: 'check', label: 'Nao, check back', correct: true },
    ],
    explanation: 'Você tem 9-8, que bloqueia 98 é A9/K9 (straight com o 9). Mas o mais importante: você NAO bloqueia AK (straight nuts). Num board Q-J-T, o vilao pode ter AK facilmente. Sem bloquear a nuts, blefar é arriscado demais.',
    concept: 'Para blefar efetivamente, bloqueie as nuts do oponente. Se você não bloqueia as mãos mais fortes, o blefe tem menos fold equity.'
  },
  {
    situation: 'Torneio. Você está no BB com 7d6d. SB completa. Flop: Ad-Kd-3s. SB aposta 33% pot.',
    question: 'Como usar blockers na decisão?',
    options: [
      { id: 'raise', label: 'Check-raise — flush draw + 2 blockers de diamond', correct: true },
      { id: 'call', label: 'Call — apenas flush draw', correct: false },
    ],
    explanation: 'Você tem 2 cartas de ouros, o que reduz os combos de flush draw do SB. Isso significa que ele provavelmente não tem flush draw é está apostando com top pair ou air. Check-raise com seu flush draw tem fold equity contra air é equity contra value.',
    concept: 'Suit blocker em semi-blefe: ter cartas do naipe do draw reduz os combos de draw do oponente, tornando check-raise mais efetivo.'
  },
]

function Lesson({ onComplete }) {
  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 16 }}>🧩 Módulo 20 — Blockers Avançado</h1>

        <div className="space-y-6" style={{ color: '#ccc', fontSize: 15, lineHeight: 1.8 }}>
          <section>
            <h2 style={{ color: '#e94560', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>O que são Blockers?</h2>
            <p>Blockers (ou card removal) são as cartas na sua mão que <strong style={{ color: 'white' }}>removem combinações possíveis</strong> do range do oponente. Se você tem o As, existem apenas 3 combos de AA possíveis (em vez de 6).</p>
            <p style={{ marginTop: 8 }}>Entender blockers é o que separa jogadores intermediários de avançados. E a habilidade de pensar não apenas no que VOCE tem, mas no que seu oponente NAO PODE ter.</p>
          </section>

          <section>
            <h2 style={{ color: '#f5a623', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Tipos de Blockers</h2>
            <div className="rounded-lg p-4" style={{ background: '#1a1a2e' }}>
              <p><strong style={{ color: '#e94560' }}>1. Nut Blockers:</strong> Você tem cartas que bloqueiam a melhor mão possível (ex: Ace em board com flush draw)</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: '#f5a623' }}>2. Blocker de Blefe:</strong> Você tem cartas que bloqueiam os blefes naturais do oponente (ex: ter o flush draw card quando o draw não completou)</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: '#4a90e2' }}>3. Blocker de Continue:</strong> Suas cartas removem mãos que o oponente usaria para call/raise (importante para blefar)</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: '#00d4aa' }}>4. Blocker de Fold:</strong> Suas cartas removem mãos que o oponente foldaria (ruim para blefar)</p>
            </div>
          </section>

          <section>
            <h2 style={{ color: '#4a90e2', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Regra de Ouro</h2>
            <div className="rounded-lg p-4" style={{ background: '#1a1a2e', border: '1px solid #4a90e2' }}>
              <p style={{ color: 'white', fontWeight: 600, fontSize: 16 }}>Para BLEFAR: bloqueie mãos que CONTINUAM</p>
              <p style={{ marginTop: 4 }}>Ter Ace bloqueia AA, AK → oponente menos provável de 4-bet/call</p>
              <p style={{ marginTop: 12, color: 'white', fontWeight: 600, fontSize: 16 }}>Para VALUE BET: bloqueie mãos que FOLDAM</p>
              <p style={{ marginTop: 4 }}>Ter cartas que removem folds do oponente = mais calls para seu valor</p>
              <p style={{ marginTop: 12, color: 'white', fontWeight: 600, fontSize: 16 }}>Para CALL/FOLD: bloqueie os BLEFES do oponente</p>
              <p style={{ marginTop: 4 }}>Se você bloqueia os blefes → fold. Se não bloqueia → call (ele pode estar blefando)</p>
            </div>
          </section>

          <section>
            <h2 style={{ color: '#00d4aa', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Exemplos Práticos</h2>
            <div className="rounded-lg p-4" style={{ background: '#1a1a2e' }}>
              <p><strong style={{ color: 'white' }}>3-bet blefe com A5s:</strong> O Ace bloqueia AA (3 combos em vez de 6) é AK/AQ. Excelente para 3-bet blefe porque reduz a probabilidade de 4-bet.</p>
              <p style={{ marginTop: 12 }}><strong style={{ color: 'white' }}>River blefe com Ah em board de copas:</strong> Se o flush completou e você tem Ah, você bloqueia a nut flush do oponente. Blefe mais efetivo.</p>
              <p style={{ marginTop: 12 }}><strong style={{ color: 'white' }}>Fold com Kh em board de copas:</strong> Se você tem Kh, você bloqueia KhXh flush draws — que são blefes naturais do oponente. O range de aposta dele fica mais forte → fold.</p>
            </div>
          </section>

          <section>
            <h2 style={{ color: '#e94560', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Matemática dos Blockers</h2>
            <div className="rounded-lg p-4" style={{ background: '#1a1a2e' }}>
              <p><strong style={{ color: 'white' }}>Pocket pairs:</strong> 6 combos normais. Se você tem 1 carta do par, cai pra 3 combos. Se tem 2, cai pra 1.</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'white' }}>Offsuit mãos:</strong> 12 combos normais. Cada blocker remove 3 combos.</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'white' }}>Suited mãos:</strong> 4 combos normais. Blocker do mesmo naipe remove 1 combo.</p>
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
    recordAnswer(20, correct, newStreak)
  }

  function handleNext() {
    if (current + 1 >= SCENARIOS.length) {
      const accuracy = Math.round((score + (selected?.correct ? 0 : 0)) / SCENARIOS.length * 100)
      recordSession(20, accuracy)
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
          <div style={{ color: '#888', marginTop: 8 }}>{score}/{SCENARIOS.length} decisões corretas</div>
          <div style={{ color: '#666', marginTop: 4, fontSize: 14 }}>Meta: 90%+ em 2 sessões seguidas</div>
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
          <div style={{ color: '#888', fontSize: 14 }}>Questão {current + 1}/{SCENARIOS.length}</div>
          <div className="flex gap-3">
            <span style={{ color: '#00d4aa', fontSize: 14 }}>✓ {score}</span>
            <span style={{ color: '#e94560', fontSize: 14 }}>✗ {current - score}</span>
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
              {current + 1 >= SCENARIOS.length ? 'Ver Resultado' : 'Próxima →'}
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

  if (!mod?.lessonRead) {
    return <Lesson onComplete={() => markLessonRead(20)} />
  }
  return <Trainer />
}
