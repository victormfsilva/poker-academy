import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'
import SessionReview from '../../components/SessionReview'
import { RFI_RANGES, POSITION_INFO } from '../../data/ranges'
import Card, { handToCards } from '../../components/Card'
import RangeViewer from '../../components/RangeViewer'
import RangeBuilder from '../../components/RangeBuilder'
import ModulePokerTable from '../../components/ModulePokerTable'

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
              background: tab === t.id ? '#e5484d' : '#1a1a1d',
              color: tab === t.id ? 'white' : '#888',
              border: '1px solid #2a2a2e',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'conceitos' && (
        <div className="space-y-4">
          <Section title="O que é RFI?">
            RFI significa "Raise First In" — em português, <strong style={{ color: '#e5484d' }}>você é o primeiro a apostar na rodada</strong>. Ninguém abriu antes de você. É a situação mais comum no poker de torneios e a mais importante de dominar.
          </Section>

          <Section title="Fichas na Mesa — Quanto Importa">
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #4fce82' }}>
                <div style={{ color: '#4fce82', fontWeight: 600, marginBottom: 4 }}>Muitas fichas (50-100bb)</div>
                <div style={{ color: '#ccc', fontSize: 14 }}>Você pode se dar ao luxo de entrar com mãos conectadas do mesmo naipe (tipo 8♠7♠) — tem fichas para jogar depois do flop.</div>
              </div>
              <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #f5a623' }}>
                <div style={{ color: '#f5a623', fontWeight: 600, marginBottom: 4 }}>Poucas fichas (15-25bb)</div>
                <div style={{ color: '#ccc', fontSize: 14 }}>Priorize mãos grandes e fortes (AK, AQ, KQ) — com poucas fichas, você quer ganhar na hora, não depender do flop.</div>
              </div>
            </div>
          </Section>

          <Section title="Sua Posição na Mesa Muda Tudo">
            <div className="space-y-2 mt-2">
              {POSITIONS.map(pos => (
                <div key={pos} className="flex items-center gap-3">
                  <div style={{ width: 60, color: POSITION_INFO[pos].color, fontWeight: 600, fontSize: 14 }}>{pos}</div>
                  <div className="flex-1 rounded-full h-3" style={{ background: '#2a2a2e' }}>
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
              Quanto mais tarde você age, mais mãos você pode abrir — porque tem menos gente para te desafiar depois.
            </p>
          </Section>

          <Section title="O Truque do Ás com Poucas Fichas">
            Quando você tem poucas fichas e vai all-in, ter um Ás na mão é valioso não só pelo Ás em si — ele <strong style={{ color: '#f5a623' }}>reduz a chance do adversário também ter um Ás</strong>, o que significa menos chance de ele te chamar com mão forte. <br /><br />
            Exemplo: <strong style={{ color: '#e5484d' }}>A5 do mesmo naipe com 12 fichas</strong> — mesmo sendo uma mão mediana, vai all-in mais que K5 por causa desse efeito.
          </Section>

          <Section title="Quantos Jogadores Podem Te Atrapalhar?">
            Quanto mais cedo você age na mesa, mais jogadores têm a chance de entrar no pote depois de você — e isso é ruim. Por isso quando você está nas primeiras posições (UTG), só abre com as melhores mãos.
            <div className="grid grid-cols-3 gap-2 mt-3">
              {POSITIONS.map(pos => (
                <div key={pos} className="text-center rounded-lg p-2" style={{ background: '#0f0f0f', border: '1px solid #2a2a2e' }}>
                  <div style={{ color: POSITION_INFO[pos].color, fontWeight: 700 }}>{pos}</div>
                  <div style={{ color: '#888', fontSize: 12 }}>{POSITION_INFO[pos].playersAfter} jogadores depois</div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {tab === 'ranges' && (
        <div>
          <p style={{ color: '#888', marginBottom: 16, fontSize: 14 }}>
            Aqui você vê quantas mãos cada posição pode abrir dependendo de quantas fichas você tem. <span style={{ color: '#4fce82' }}>Verde</span> = abre, <span style={{ color: '#f5a623' }}>Amarelo</span> = depende do contexto, cinza = folda.
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
                  <tr key={pos} style={{ borderTop: '1px solid #2a2a2e' }}>
                    <td style={{ color: POSITION_INFO[pos].color, padding: '10px 8px', fontWeight: 600, fontSize: 14 }}>{pos}</td>
                    {STACKS.map(s => {
                      const pct = getRangePercent(pos, s)
                      const range = RFI_RANGES[pos]?.[s]
                      const total = (range?.raise?.length || 0) + (range?.mix?.length || 0)
                      return (
                        <td key={s} style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <span style={{
                            color: pct >= 40 ? '#4fce82' : pct >= 25 ? '#f5a623' : '#e5484d',
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
            <h3 style={{ color: 'white', fontWeight: 600, marginBottom: 12 }}>Exemplo: Mãos do BTN com 100 fichas</h3>
            <div className="rounded-lg p-4" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
              <div style={{ color: '#4fce82', fontSize: 13, marginBottom: 8 }}>✓ ABRE (você está no BTN — pode abrir bastante)</div>
              <div style={{ color: '#ccc', fontSize: 13, lineHeight: 1.8 }}>
                Todos os pares • AKs-A2s • KQs-K2s • QJs-Q5s • JTs-J6s • T9s-T6s • 98s-95s • 87s-84s • 76s-74s • 65s-63s • 54s-52s • AKo-A5o • KQo-K9o • QJo-Q9o • JTo-J9o • T9o-T8o • 98o-97o • 87o-86o • 76o
              </div>
              <div style={{ color: '#f5a623', fontSize: 13, marginBottom: 8, marginTop: 12 }}>~ DEPENDE DO CONTEXTO (às vezes abre, às vezes folda)</div>
              <div style={{ color: '#ccc', fontSize: 13 }}>
                K2s • Q4s • J5s • T5s • 94s • 83s • A4o-A3o • K8o • Q8o
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'sizing' && (
        <div className="space-y-4">
          <Section title="Quanto Apostar ao Abrir?">
            Quando você decide abrir o pote, aposta entre 2x e 2.5x a ficha grande. Não mais que isso.
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #2a2a2e' }}>
                <div style={{ color: '#f5a623', fontWeight: 600 }}>2x (aposta menor)</div>
                <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Mais comum em torneios. Custa menos mas cria a mesma pressão.</div>
              </div>
              <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #2a2a2e' }}>
                <div style={{ color: '#f5a623', fontWeight: 600 }}>2.5x (aposta maior)</div>
                <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Quando você tem muitas fichas ou o adversário entra fácil demais.</div>
              </div>
            </div>
          </Section>

          <Section title="As Fichas do Adversário São o Que Importa">
            Aqui tem um ponto importante: quando você abre o pote, as fichas que definem o "tamanho do jogo" são as do Big Blind — não as suas. <br /><br />
            Se você tem 200 fichas mas o BB tem 30, o confronto máximo é de 30 fichas. Não adianta ter mais — você só pode ganhar o que ele tem. Então pense e jogue como se você tivesse 30.
          </Section>

          <Section title="Início vs Final do Torneio">
            O jogo muda conforme o torneio avança:
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #4fce82' }}>
                <div style={{ color: '#4fce82', fontWeight: 600 }}>No começo</div>
                <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Foco em acumular fichas. Jogue para ganhar o maior pote possível.</div>
              </div>
              <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #e5484d' }}>
                <div style={{ color: '#e5484d', fontWeight: 600 }}>Perto do prêmio</div>
                <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Sobreviver vale dinheiro. Feche o range — só jogue com mãos boas.</div>
              </div>
            </div>
          </Section>

          <Section title="Dicas de Ouro">
            <ul className="space-y-2 mt-2" style={{ color: '#ccc', fontSize: 14 }}>
              <li>⚡ Aprenda o range de uma posição por vez — comece pelo BTN</li>
              <li>⚡ Meta: 300 mãos treinadas antes de jogar dinheiro real</li>
              <li>⚡ 90%+ de acerto em 2 sessões seguidas para passar de módulo</li>
              <li>⚡ Apostas baixas: aposte quando tem mão, raramente blefe</li>
              <li>⚡ Sentiu raiva? Para de jogar. 3 derrotas no dia = encerra a sessão</li>
            </ul>
          </Section>
        </div>
      )}

      <button
        onClick={onComplete}
        className="w-full mt-8 py-4 rounded-xl font-bold text-white text-lg"
        style={{ background: '#e5484d' }}
      >
        Entendi — Quero Treinar ♠
      </button>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
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
    if (sessionTotal >= 10) { setSessionDone(true); return }
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

    const newTotal = sessionTotal + 1
    const newCorrect = sessionCorrect + (correct ? 1 : 0)
    setSessionTotal(newTotal)
    setSessionCorrect(newCorrect)

    recordAnswer(1, correct, newStreak)

    // Marca como última mão mas só mostra resultado após "Próxima Mão"
    const isLast = newTotal >= 10
    if (isLast) {
      const accuracy = Math.round((newCorrect / newTotal) * 100)
      recordSession(1, accuracy)
    }
    setFeedback({ ...fb, userAction: action, isCorrect: correct, isLast })
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
    return <SessionReview moduleId={1} sessionCorrect={sessionCorrect} sessionTotal={sessionTotal} onContinue={restart} />
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
                  background: filterPos === p ? '#e5484d' : '#1a1a1d',
                  color: filterPos === p ? 'white' : '#888',
                  border: '1px solid #2a2a2e'
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
                  background: filterStack === s ? '#e5484d' : '#1a1a1d',
                  color: filterStack === s ? 'white' : '#888',
                  border: '1px solid #2a2a2e'
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
        style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
        <div style={{ color: '#888', fontSize: 13 }}>Sessão: {sessionCorrect}/{sessionTotal} · Sequência: {streak}</div>
        <div style={{ color: '#888', fontSize: 13 }}>Meta: 10 mãos (90%+)</div>
      </div>
      <div className="rounded-full h-2 mb-6" style={{ background: '#2a2a2e' }}>
        <div className="rounded-full h-2 transition-all" style={{ width: `${(sessionTotal / 10) * 100}%`, background: '#e5484d' }} />
      </div>

      {/* Mesa + Situação */}
      {currentPos && (
        <ModulePokerTable
          heroPos={currentPos}
          heroCards={cards}
          potLabel={`${currentStack}bb`}
          contextTitle={`${currentPos} · ${currentStack}bb`}
          contextDesc={`${POSITION_INFO[currentPos]?.playersAfter} jogadores ainda falam · range ~${getRangePercent(currentPos, currentStack)}%`}
        />
      )}
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
            style={{ background: '#4fce82', color: '#0f0f0f' }}
          >
            RAISE ↑
          </button>
          <button
            onClick={() => answer('fold')}
            className="py-5 rounded-xl font-bold text-xl"
            style={{ background: '#e5484d', color: 'white' }}
          >
            FOLD ✕
          </button>
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div className="rounded-xl p-4 mb-4"
          style={{
            background: '#1a1a1d',
            border: `2px solid ${feedback.isCorrect ? '#4fce82' : '#e5484d'}`
          }}>
          <div style={{ color: feedback.isCorrect ? '#4fce82' : '#e5484d', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
            {feedback.isMix ? '🟡 Mix — Ambos Aceitáveis' : feedback.isCorrect ? '✓ Correto!' : '✗ Incorreto'}
          </div>
          <button
            onClick={newHand}
            className="w-full py-3 rounded-lg font-semibold mb-4"
            style={{ background: '#e5484d', color: 'white', fontSize: 16 }}
          >
            Próxima Mão →
          </button>
          <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>{feedback.reason}</div>
          <div style={{ color: '#555', fontSize: 12, marginTop: 8 }}>
            Ação correta: <strong style={{ color: '#f5a623' }}>{feedback.correct === 'mix' ? 'RAISE ou FOLD (mix)' : feedback.correct.toUpperCase()}</strong>
          </div>
          {!feedback.isCorrect && (
            <RangeViewer pos={currentPos} stack={currentStack} highlightHand={currentHand} />
          )}
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
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0f0f0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        {/* Toggle aula/trainer */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setView('lesson')}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: view === 'lesson' ? '#e5484d' : '#1a1a1d', color: view === 'lesson' ? 'white' : '#888', border: '1px solid #2a2a2e' }}
          >
            📖 Aula
          </button>
          <button
            onClick={() => progress.modules[1].lessonRead && setView('trainer')}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{
              background: view === 'trainer' ? '#e5484d' : '#1a1a1d',
              color: view === 'trainer' ? 'white' : (progress.modules[1].lessonRead ? '#888' : '#444'),
              border: '1px solid #2a2a2e',
              cursor: progress.modules[1].lessonRead ? 'pointer' : 'not-allowed'
            }}
          >
            🎯 Trainer {!progress.modules[1].lessonRead && '🔒'}
          </button>
          <button
            onClick={() => progress.modules[1].lessonRead && setView('builder')}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{
              background: view === 'builder' ? '#0a84d7' : '#1a1a1d',
              color: view === 'builder' ? 'white' : (progress.modules[1].lessonRead ? '#888' : '#444'),
              border: '1px solid #2a2a2e',
              cursor: progress.modules[1].lessonRead ? 'pointer' : 'not-allowed'
            }}
          >
            🧩 Range Builder {!progress.modules[1].lessonRead && '🔒'}
          </button>
        </div>

        {view === 'lesson' && <Lesson onComplete={onLessonComplete} />}
        {view === 'trainer' && <Trainer />}
        {view === 'builder' && <RangeBuilderMode />}
      </div>
    </div>
  )
}

function RangeBuilderMode() {
  const [pos, setPos] = useState('UTG')
  const [stack, setStack] = useState(100)

  const range = RFI_RANGES[pos]?.[stack]
  const correctRange = range ? {
    raise: range.raise || [],
    fold: generateAllHands().filter(h => !range.raise?.includes(h) && !range.mix?.includes(h)),
  } : { raise: [], fold: generateAllHands() }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h2 className="text-lg font-bold mb-4" style={{ color: '#fdfdfd' }}>
        Construa o Range de RFI
      </h2>
      <p className="text-sm mb-4" style={{ color: '#676671' }}>
        Selecione todas as maos que voce abriria (raise) nessa posicao e stack. Clique e arraste no grid.
      </p>

      {/* Position / Stack selectors */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div>
          <label className="text-xs block mb-1" style={{ color: '#676671' }}>Posicao</label>
          <div className="flex gap-1">
            {POSITIONS.map(p => (
              <button
                key={p}
                onClick={() => setPos(p)}
                className="px-2 py-1 rounded text-xs font-bold"
                style={{
                  background: pos === p ? '#e5484d' : '#222225',
                  color: pos === p ? '#fdfdfd' : '#676671',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs block mb-1" style={{ color: '#676671' }}>Stack</label>
          <div className="flex gap-1">
            {STACKS.map(s => (
              <button
                key={s}
                onClick={() => setStack(s)}
                className="px-2 py-1 rounded text-xs font-bold"
                style={{
                  background: stack === s ? '#0a84d7' : '#222225',
                  color: stack === s ? '#fdfdfd' : '#676671',
                }}
              >
                {s}bb
              </button>
            ))}
          </div>
        </div>
      </div>

      <RangeBuilder
        correctRange={correctRange}
        actions={['raise', 'fold']}
        title={`Range RFI — ${pos} ${stack}bb (~${getRangePercent(pos, stack)}%)`}
      />
    </div>
  )
}
