import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'
import { RFI_RANGES, POSITION_INFO } from '../../data/ranges'
import Card, { handToCards } from '../../components/Card'
import RangeViewer from '../../components/RangeViewer'

// Tabela de ranges por posição e stack (visual)
const POSITIONS = ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN']
const STACKS = [100, 50, 25, 15]

function getRangePercent(pos, stack) {
  return POSITION_INFO[pos]?.rangePercent?.[stack] || 0
}

// Verifica se uma mão está no range
function isInRange(hand, pos, stack) {
  const range = RFI_RANGES[pos]?.[stack]
  if (!range) return 'fold'
  if (range.raise.includes(hand)) return 'raise'
  if (range.mix.includes(hand)) return 'mix'
  return 'fold'
}

// Gera uma mão aleatória que inclui raise + fold (não só raise)
function randomHand(pos, stack) {
  const allHands = generateAllHands()
  // 50% chance de ser do range de raise, 50% de fora
  const range = RFI_RANGES[pos]?.[stack]
  if (!range) return allHands[Math.floor(Math.random() * allHands.length)]
  const dice = Math.random()
  if (dice < 0.45) {
    return range.raise[Math.floor(Math.random() * range.raise.length)]
  } else if (dice < 0.55 && range.mix.length > 0) {
    return range.mix[Math.floor(Math.random() * range.mix.length)]
  } else {
    // mão de fora do range
    const foldHands = allHands.filter(h => !range.raise.includes(h) && !range.mix.includes(h))
    if (foldHands.length === 0) return range.raise[0]
    return foldHands[Math.floor(Math.random() * foldHands.length)]
  }
}

function generateAllHands() {
  const ranks = ['A','K','Q','J','T','9','8','7','6','5','4','3','2']
  const hands = []
  for (let i = 0; i < ranks.length; i++) {
    hands.push(ranks[i] + ranks[i]) // par
    for (let j = i + 1; j < ranks.length; j++) {
      hands.push(ranks[i] + ranks[j] + 's')
      hands.push(ranks[i] + ranks[j] + 'o')
    }
  }
  return hands
}

function getFeedback(hand, action, pos, stack) {
  const correct = isInRange(hand, pos, stack)
  const isMix = correct === 'mix'
  const posInfo = POSITION_INFO[pos]
  const rangePercent = getRangePercent(pos, stack)
  const range = RFI_RANGES[pos]?.[stack]

  const rank1 = hand[0]
  const rank2 = hand[1]
  const type = hand.length > 2 ? hand[2] : ''

  let reason = ''
  if (correct === 'raise') {
    if (hand.length === 2) {
      reason = `Par de ${rank1}s — força suficiente para abrir em ${pos} com ${stack}bb.`
    } else if (type === 's') {
      reason = `${hand} suited — conectividade + flush potential. Abre em ${pos} com ${stack}bb (range ~${rangePercent}%).`
    } else {
      reason = `${hand} offsuit — mão forte o suficiente para RFI em ${pos} com ${stack}bb.`
    }
    if (stack <= 25 && type === 's' && rank1 !== rank2) {
      reason += ' Com stack curto, priorize top pairs sobre suited connectors.'
    }
  } else if (correct === 'mix') {
    reason = `${hand} é uma mão de transição (mix) — pode abrir ou foldar dependendo do contexto, leitura de mesa e GTO puro.`
  } else {
    reason = `${hand} está fora do range de ${pos} com ${stack}bb (range ~${rangePercent}%). Folda — aguarde uma mão melhor.`
    if (stack <= 25) {
      reason += ' Com stack curto, o range fecha ainda mais para evitar entrar em potes difíceis sem equidade.'
    }
  }

  return { correct, isMix, reason, rangePercent }
}

// AULA
function Lesson({ onComplete }) {
  const [tab, setTab] = useState('conceitos')

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="mb-6">
        <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700 }}>
          🎯 Módulo 1 — RFI (Raise First In)
        </h1>
        <p style={{ color: '#888', marginTop: 4 }}>Leia toda a aula antes de treinar</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { id: 'conceitos', label: 'Conceitos' },
          { id: 'ranges', label: 'Tabela de Ranges' },
          { id: 'sizing', label: 'Sizing e Dicas' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{
              background: tab === t.id ? '#e94560' : '#12121a',
              color: tab === t.id ? 'white' : '#888',
              border: '1px solid #1e1e2e',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'conceitos' && (
        <div className="space-y-4">
          <Section title="O que é RFI?">
            RFI (Raise First In) é quando <strong style={{ color: '#e94560' }}>ninguém abriu o pote ainda</strong> e você faz o primeiro raise. É o spot mais frequente e importante no pôquer de torneios — você vai viver disso.
          </Section>

          <Section title="A Grande Regra — Stack e Tipo de Mão">
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #00d4aa' }}>
                <div style={{ color: '#00d4aa', fontWeight: 600, marginBottom: 4 }}>Stack Grande (50-100bb)</div>
                <div style={{ color: '#ccc', fontSize: 14 }}>Priorize <strong>suited connectors</strong> (87s, T9s) — você vai ver o flop e tem pilha para jogar pós-flop.</div>
              </div>
              <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #f5a623' }}>
                <div style={{ color: '#f5a623', fontWeight: 600, marginBottom: 4 }}>Stack Curto (15-25bb)</div>
                <div style={{ color: '#ccc', fontSize: 14 }}>Priorize <strong>top pairs</strong> (AK, AQ, KQ) — com stack curto, você quer showdown value, não draws.</div>
              </div>
            </div>
          </Section>

          <Section title="Como o Range Varia por Posição">
            <div className="space-y-2 mt-2">
              {POSITIONS.map(pos => (
                <div key={pos} className="flex items-center gap-3">
                  <div style={{ width: 60, color: POSITION_INFO[pos].color, fontWeight: 600, fontSize: 14 }}>{pos}</div>
                  <div className="flex-1 rounded-full h-3" style={{ background: '#1e1e2e' }}>
                    <div
                      className="rounded-full h-3"
                      style={{
                        width: `${(getRangePercent(pos, 100) / 60) * 100}%`,
                        background: POSITION_INFO[pos].color
                      }}
                    />
                  </div>
                  <div style={{ color: '#888', fontSize: 13, width: 40 }}>~{getRangePercent(pos, 100)}%</div>
                </div>
              ))}
            </div>
            <p style={{ color: '#888', fontSize: 13, marginTop: 8 }}>
              ↑ O range aumenta ~3% por posição. HJ tem salto de +5% em relação ao LJ. CO tem salto de +10% em relação ao HJ.
            </p>
          </Section>

          <Section title="Blocker — Conceito com Stack Curto">
            Com stack curto, certas mãos têm valor de <strong style={{ color: '#f5a623' }}>blocker</strong>: elas bloqueiam o adversário de ter mãos fortes para chamar seu all-in. <br /><br />
            Exemplo: <strong style={{ color: '#e94560' }}>A5s com 12bb</strong> — o Ás bloqueia o adversário de ter AA, AK, AQ. Você push mais frequentemente do que faria com K5s.
          </Section>

          <Section title="Jogadores Que Ainda Falam">
            Quanto mais cedo você age, mais jogadores podem entrar depois. Isso significa mais chance de ser re-raisado ou de entrar em multiway. Por isso UTG é a posição mais fechada.
            <div className="grid grid-cols-3 gap-2 mt-3">
              {POSITIONS.map(pos => (
                <div key={pos} className="text-center rounded-lg p-2" style={{ background: '#0a0a0f', border: '1px solid #1e1e2e' }}>
                  <div style={{ color: POSITION_INFO[pos].color, fontWeight: 700 }}>{pos}</div>
                  <div style={{ color: '#888', fontSize: 12 }}>{POSITION_INFO[pos].playersAfter} após</div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {tab === 'ranges' && (
        <div>
          <p style={{ color: '#888', marginBottom: 16, fontSize: 14 }}>
            Tabela de ranges de RFI por posição e stack. <span style={{ color: '#00d4aa' }}>Verde</span> = abre, <span style={{ color: '#f5a623' }}>Amarelo</span> = mix, cinza = folda.
          </p>
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ color: '#888', padding: '8px', textAlign: 'left', fontSize: 13 }}>Posição</th>
                  {STACKS.map(s => (
                    <th key={s} style={{ color: '#888', padding: '8px', textAlign: 'center', fontSize: 13 }}>{s}bb</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {POSITIONS.map(pos => (
                  <tr key={pos} style={{ borderTop: '1px solid #1e1e2e' }}>
                    <td style={{ color: POSITION_INFO[pos].color, padding: '10px 8px', fontWeight: 600, fontSize: 14 }}>{pos}</td>
                    {STACKS.map(s => {
                      const pct = getRangePercent(pos, s)
                      const range = RFI_RANGES[pos]?.[s]
                      const total = (range?.raise?.length || 0) + (range?.mix?.length || 0)
                      return (
                        <td key={s} style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <span style={{
                            color: pct >= 40 ? '#00d4aa' : pct >= 25 ? '#f5a623' : '#e94560',
                            fontWeight: 700, fontSize: 15
                          }}>
                            ~{pct}%
                          </span>
                          <div style={{ color: '#555', fontSize: 11 }}>{total} mãos</div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6">
            <h3 style={{ color: 'white', fontWeight: 600, marginBottom: 12 }}>Exemplos de Range — BTN 100bb</h3>
            <div className="rounded-lg p-4" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
              <div style={{ color: '#00d4aa', fontSize: 13, marginBottom: 8 }}>✓ ABRE (exemplos)</div>
              <div style={{ color: '#ccc', fontSize: 13, lineHeight: 1.8 }}>
                Todos os pares • AKs-A2s • KQs-K2s • QJs-Q5s • JTs-J6s • T9s-T6s • 98s-95s • 87s-84s • 76s-74s • 65s-63s • 54s-52s • AKo-A5o • KQo-K9o • QJo-Q9o • JTo-J9o • T9o-T8o • 98o-97o • 87o-86o • 76o
              </div>
              <div style={{ color: '#f5a623', fontSize: 13, marginBottom: 8, marginTop: 12 }}>~ MIX (exemplos)</div>
              <div style={{ color: '#ccc', fontSize: 13 }}>
                K2s • Q4s • J5s • T5s • 94s • 83s • A4o-A3o • K8o • Q8o
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'sizing' && (
        <div className="space-y-4">
          <Section title="Sizing de RFI — 2x a 2.5x o BB">
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #1e1e2e' }}>
                <div style={{ color: '#f5a623', fontWeight: 600 }}>2x BB</div>
                <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Mais frequente em torneios. Menor custo, mesma pressão.</div>
              </div>
              <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #1e1e2e' }}>
                <div style={{ color: '#f5a623', fontWeight: 600 }}>2.5x BB</div>
                <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Usado com stacks mais profundos ou contra players que defendem muito.</div>
              </div>
            </div>
          </Section>

          <Section title="O Efetivo — Stack que Importa">
            O tamanho do stack que importa para o sizing pós-flop é o <strong style={{ color: '#e94560' }}>stack dos blinds</strong>, não o seu. Se você tem 200bb mas o BB tem 30bb, o efetivo é 30bb — jogue como se você tivesse 30bb.
          </Section>

          <Section title="ChipEV vs ICM">
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #00d4aa' }}>
                <div style={{ color: '#00d4aa', fontWeight: 600 }}>Início do Torneio</div>
                <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Use ChipEV — maximize chips. ICM ainda não importa muito.</div>
              </div>
              <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #e94560' }}>
                <div style={{ color: '#e94560', fontWeight: 600 }}>Na Bolha / ITM</div>
                <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Use ICM — sobreviver vale mais que acumular. Feche o range.</div>
              </div>
            </div>
          </Section>

          <Section title="Dicas de Ouro">
            <ul className="space-y-2 mt-2" style={{ color: '#ccc', fontSize: 14 }}>
              <li>⚡ Memorize o range de uma posição por vez — comece pelo BTN</li>
              <li>⚡ Meta: 300 mãos treinadas antes de jogar dinheiro real</li>
              <li>⚡ Foco em 90%+ de acerto em 2 sessões seguidas para passar de módulo</li>
              <li>⚡ Em micro stakes: value bet, raramente blefe</li>
              <li>⚡ Tilt = stop. 3 perdas no dia = para de jogar</li>
            </ul>
          </Section>
        </div>
      )}

      <button
        onClick={onComplete}
        className="w-full mt-8 py-4 rounded-xl font-bold text-white text-lg"
        style={{ background: '#e94560' }}
      >
        Entendi — Quero Treinar ♠
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

// TRAINER
function Trainer() {
  const { progress, recordAnswer, recordSession } = useProgress()
  const [filterPos, setFilterPos] = useState('Todas')
  const [filterStack, setFilterStack] = useState('Todos')
  const [currentHand, setCurrentHand] = useState(null)
  const [currentPos, setCurrentPos] = useState(null)
  const [currentStack, setCurrentStack] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [sessionDone, setSessionDone] = useState(false)

  const mod = progress.modules[1]

  function newHand() {
    const positions = filterPos === 'Todas' ? POSITIONS : [filterPos]
    const stacks = filterStack === 'Todos' ? STACKS : [parseInt(filterStack)]
    const pos = positions[Math.floor(Math.random() * positions.length)]
    const stack = stacks[Math.floor(Math.random() * stacks.length)]
    const hand = randomHand(pos, stack)
    setCurrentHand(hand)
    setCurrentPos(pos)
    setCurrentStack(stack)
    setFeedback(null)
  }

  function answer(action) {
    if (!currentHand || feedback) return
    const fb = getFeedback(currentHand, action, currentPos, currentStack)
    const correct = fb.correct === 'mix'
      ? true // mix = sempre correto
      : (action === 'raise' && fb.correct === 'raise') || (action === 'fold' && fb.correct === 'fold')

    const newStreak = correct ? streak + 1 : 0
    setStreak(newStreak)
    setFeedback({ ...fb, userAction: action, isCorrect: correct })

    const newTotal = sessionTotal + 1
    const newCorrect = sessionCorrect + (correct ? 1 : 0)
    setSessionTotal(newTotal)
    setSessionCorrect(newCorrect)

    recordAnswer(1, correct, newStreak)

    // 10 mãos = sessão completa
    if (newTotal >= 10) {
      const accuracy = Math.round((newCorrect / newTotal) * 100)
      recordSession(1, accuracy)
      setSessionDone(true)
    }
  }

  function restart() {
    setSessionCorrect(0)
    setSessionTotal(0)
    setStreak(0)
    setSessionDone(false)
    setFeedback(null)
    setCurrentHand(null)
  }

  // Inicializar primeira mão
  if (!currentHand && !sessionDone) {
    newHand()
  }

  if (sessionDone) {
    const accuracy = Math.round((sessionCorrect / sessionTotal) * 100)
    return (
      <div className="text-center" style={{ maxWidth: 400, margin: '0 auto', paddingTop: 40 }}>
        <div style={{ fontSize: 60 }}>{accuracy >= 90 ? '🎉' : accuracy >= 70 ? '👍' : '💪'}</div>
        <h2 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginTop: 16 }}>Sessão Completa!</h2>
        <div style={{ color: '#888', marginTop: 8 }}>{sessionCorrect}/{sessionTotal} acertos</div>
        <div style={{ color: accuracy >= 90 ? '#00d4aa' : '#f5a623', fontSize: 36, fontWeight: 700, marginTop: 8 }}>
          {accuracy}%
        </div>
        {accuracy >= 90
          ? <p style={{ color: '#00d4aa', marginTop: 8 }}>Excelente! Sessão conta para desbloquear o próximo módulo.</p>
          : <p style={{ color: '#888', marginTop: 8 }}>Treine mais para chegar a 90% e desbloquear o próximo módulo.</p>
        }
        <button
          onClick={restart}
          className="mt-6 px-8 py-3 rounded-xl font-bold"
          style={{ background: '#e94560', color: 'white' }}
        >
          Nova Sessão
        </button>
      </div>
    )
  }

  const cards = currentHand ? handToCards(currentHand) : []

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      {/* Filtros */}
      <div className="mb-4 space-y-3">
        <div>
          <div style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>POSIÇÃO</div>
          <div className="flex flex-wrap gap-2">
            {['Todas', ...POSITIONS].map(p => (
              <button
                key={p}
                onClick={() => { setFilterPos(p); setFeedback(null); setCurrentHand(null) }}
                className="px-3 py-1 rounded-lg text-sm"
                style={{
                  background: filterPos === p ? '#e94560' : '#12121a',
                  color: filterPos === p ? 'white' : '#888',
                  border: '1px solid #1e1e2e'
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>STACK</div>
          <div className="flex gap-2">
            {['Todos', '100', '50', '25', '15'].map(s => (
              <button
                key={s}
                onClick={() => { setFilterStack(s); setFeedback(null); setCurrentHand(null) }}
                className="px-3 py-1 rounded-lg text-sm"
                style={{
                  background: filterStack === s ? '#e94560' : '#12121a',
                  color: filterStack === s ? 'white' : '#888',
                  border: '1px solid #1e1e2e'
                }}
              >
                {s === 'Todos' ? s : `${s}bb`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Progresso da sessão */}
      <div className="rounded-xl p-3 mb-4 flex justify-between items-center"
        style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
        <div style={{ color: '#888', fontSize: 13 }}>Sessão: {sessionCorrect}/{sessionTotal} · Sequência: {streak}</div>
        <div style={{ color: '#888', fontSize: 13 }}>Meta: 10 mãos (90%+)</div>
      </div>
      <div className="rounded-full h-2 mb-6" style={{ background: '#1e1e2e' }}>
        <div className="rounded-full h-2 transition-all" style={{ width: `${(sessionTotal / 10) * 100}%`, background: '#e94560' }} />
      </div>

      {/* Situação */}
      {currentPos && (
        <div className="rounded-xl p-4 mb-4 text-center" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
          <div style={{ color: '#888', fontSize: 12 }}>POSIÇÃO · STACK</div>
          <div style={{ color: POSITION_INFO[currentPos]?.color || 'white', fontSize: 22, fontWeight: 700 }}>
            {currentPos} · {currentStack}bb
          </div>
          <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>
            {POSITION_INFO[currentPos]?.playersAfter} jogadores ainda falam · range ~{getRangePercent(currentPos, currentStack)}%
          </div>
        </div>
      )}

      {/* Cartas */}
      <div className="flex justify-center gap-4 mb-6">
        {cards.map((c, i) => <Card key={i} card={c} size="lg" />)}
      </div>
      {currentHand && (
        <div className="text-center mb-4">
          <span style={{ color: '#888', fontSize: 14, fontFamily: 'Space Mono' }}>{currentHand}</span>
        </div>
      )}

      {/* Botões de ação */}
      {!feedback && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <button
            onClick={() => answer('raise')}
            className="py-5 rounded-xl font-bold text-xl"
            style={{ background: '#00d4aa', color: '#0a0a0f' }}
          >
            RAISE ↑
          </button>
          <button
            onClick={() => answer('fold')}
            className="py-5 rounded-xl font-bold text-xl"
            style={{ background: '#e94560', color: 'white' }}
          >
            FOLD ✕
          </button>
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div className="rounded-xl p-4 mb-4"
          style={{
            background: '#12121a',
            border: `2px solid ${feedback.isCorrect ? '#00d4aa' : '#e94560'}`
          }}>
          <div style={{ color: feedback.isCorrect ? '#00d4aa' : '#e94560', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
            {feedback.isMix ? '🟡 Mix — Ambos Aceitáveis' : feedback.isCorrect ? '✓ Correto!' : '✗ Incorreto'}
          </div>
          <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>{feedback.reason}</div>
          <div style={{ color: '#555', fontSize: 12, marginTop: 8 }}>
            Ação correta: <strong style={{ color: '#f5a623' }}>{feedback.correct === 'mix' ? 'RAISE ou FOLD (mix)' : feedback.correct.toUpperCase()}</strong>
          </div>
          {!feedback.isCorrect && (
            <RangeViewer pos={currentPos} stack={currentStack} highlightHand={currentHand} />
          )}
          <button
            onClick={newHand}
            className="mt-4 w-full py-3 rounded-lg font-semibold"
            style={{ background: '#1e1e2e', color: 'white' }}
          >
            Próxima Mão →
          </button>
        </div>
      )}
    </div>
  )
}

export default function Module1() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[1].lessonRead ? 'trainer' : 'lesson')

  function onLessonComplete() {
    markLessonRead(1)
    setView('trainer')
  }

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        {/* Toggle aula/trainer */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setView('lesson')}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: view === 'lesson' ? '#e94560' : '#12121a', color: view === 'lesson' ? 'white' : '#888', border: '1px solid #1e1e2e' }}
          >
            📖 Aula
          </button>
          <button
            onClick={() => progress.modules[1].lessonRead && setView('trainer')}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{
              background: view === 'trainer' ? '#e94560' : '#12121a',
              color: view === 'trainer' ? 'white' : (progress.modules[1].lessonRead ? '#888' : '#444'),
              border: '1px solid #1e1e2e',
              cursor: progress.modules[1].lessonRead ? 'pointer' : 'not-allowed'
            }}
          >
            🎯 Trainer {!progress.modules[1].lessonRead && '🔒'}
          </button>
        </div>

        {view === 'lesson' ? <Lesson onComplete={onLessonComplete} /> : <Trainer />}
      </div>
    </div>
  )
}
