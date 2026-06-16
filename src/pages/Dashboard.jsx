import { Link } from 'react-router-dom'
import { useProgress } from '../context/ProgressContext'

const MODULES = [
  { id: 1, name: 'RFI ChipEV', desc: 'Raise First In — o spot mais importante', icon: '🎯' },
  { id: 2, name: 'Push/Fold', desc: 'Short stack abaixo de 15bb', icon: '💥' },
  { id: 3, name: 'Pot Odds e Outs', desc: 'A matemática por trás de cada decisão', icon: '🧮' },
  { id: 4, name: 'BB vs RFI', desc: 'Defender o Big Blind', icon: '🛡️' },
  { id: 5, name: 'CBet Flop IP', desc: 'Aposta de continuação em posição', icon: '⚡' },
  { id: 6, name: 'Blind Wars', desc: 'SB vs BB — confronto direto', icon: '⚔️' },
  { id: 7, name: 'SB vs RFI', desc: 'Defendendo o Small Blind contra raises', icon: '🛡️' },
  { id: 8, name: 'BTN vs RFI', desc: 'A melhor posição da mesa contra raises', icon: '👑' },
  { id: 9, name: '3-Bet Ranges', desc: 'Quando relançar pre-flop — valor e blefe', icon: '🔥' },
  { id: 10, name: 'Defesa vs CBet', desc: 'O que fazer quando apostam em você no flop', icon: '🛡️' },
  { id: 11, name: 'Check-Raise', desc: 'A arma mais poderosa fora de posição', icon: '⚡' },
  { id: 12, name: 'Bet Sizing', desc: 'Quanto apostar em cada situação', icon: '📐' },
  { id: 13, name: 'Donk Bet', desc: 'Quando apostar antes do raiser no flop', icon: '💣' },
  { id: 14, name: 'CBet Turn', desc: 'Double barrel — continuar no turn', icon: '🔄' },
  { id: 15, name: 'River Play', desc: 'Value bet, blefe ou check no river', icon: '🏁' },
  { id: 16, name: 'GTO vs Exploit', desc: 'Quando sair do livro e ajustar', icon: '🧠' },
  { id: 17, name: 'ICM', desc: 'Modelo de chip independente em torneios', icon: '🏆' },
  { id: 18, name: 'Multiway Pots', desc: 'Potes com 3+ jogadores', icon: '👥' },
  { id: 19, name: 'Blockers', desc: 'Card removal e decisões avançadas', icon: '🧩' },
  { id: 20, name: 'HUD e Solvers', desc: 'Estatísticas e estudo com solver', icon: '📊' },
  { id: 21, name: 'Late Game MTT', desc: 'Dominando os momentos decisivos do torneio', icon: '🎰' },
]

function motivationalMessage(globalStats) {
  const total = globalStats.totalHands
  const acc = total > 0 ? Math.round((globalStats.totalCorrect / total) * 100) : 0
  if (total === 0) return 'Bem-vindo! Comece pelo Módulo 1 — RFI é o fundamento de tudo.'
  if (acc >= 90) return `Incrível! ${acc}% de acerto. Você está jogando no nível dos regulares.`
  if (acc >= 75) return `Bom trabalho! ${acc}% de acerto. Continue praticando para chegar a 90%.`
  if (acc >= 60) return `Evoluindo! ${acc}% de acerto. Cada mão treinada te aproxima do profissionalismo.`
  return `${total} mãos treinadas. Consistência é o segredo — continue!`
}

function getBadge(completedIds) {
  const has = id => completedIds.includes(id)
  const advancedDone = [13,14,15,16,17,18,19,20,21].every(has)
  const intermediateDone = [7,8,9,10,11,12].every(has)
  const basicDone = [1,2,3,4,5,6].every(has)

  if (advancedDone && intermediateDone && basicDone) return { name: 'Avançado', icon: '🏆', color: '#f5a623', desc: 'Todos os 21 módulos completos!' }
  if (intermediateDone && basicDone) return { name: 'Intermediário Avançado', icon: '💎', color: '#4a90e2', desc: 'Módulos 1-12 completos' }
  if (basicDone) return { name: 'Iniciante Sólido', icon: '⭐', color: '#00d4aa', desc: 'Módulos 1-6 completos' }
  return { name: 'Aprendiz', icon: '📖', color: '#888', desc: 'Complete os módulos 1-6' }
}

export default function Dashboard() {
  const { progress, getModuleProgress } = useProgress()

  const globalAcc = progress.globalStats.totalHands > 0
    ? Math.round((progress.globalStats.totalCorrect / progress.globalStats.totalHands) * 100)
    : 0

  const completedIds = MODULES.filter(m => getModuleProgress(m.id).completed).map(m => m.id)
  const badge = getBadge(completedIds)

  const currentModule = MODULES.find(m => {
    const p = getModuleProgress(m.id)
    return !p.completed && p.unlocked
  }) || MODULES[MODULES.length - 1]

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h1 style={{ color: 'white', fontSize: 26, fontWeight: 700 }}>
              ♠ Poker Academy <span style={{ color: '#e94560' }}>BR</span>
            </h1>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: `${badge.color}15`, border: `1px solid ${badge.color}44` }}>
              <span style={{ fontSize: 16 }}>{badge.icon}</span>
              <span style={{ color: badge.color, fontSize: 13, fontWeight: 700 }}>{badge.name}</span>
            </div>
          </div>
          <p style={{ color: '#666', marginTop: 4 }}>{motivationalMessage(progress.globalStats)}</p>
        </div>

        {/* Stats globais */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Mãos Treinadas', value: progress.globalStats.totalHands },
            { label: 'Taxa de Acerto', value: `${globalAcc}%` },
            { label: 'Melhor Sequência', value: progress.globalStats.bestStreak },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4 text-center"
              style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
              <div style={{ color: '#e94560', fontSize: 24, fontWeight: 700 }}>{s.value}</div>
              <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Módulo atual */}
        {currentModule && (
          <div className="rounded-xl p-4 mb-6" style={{ background: '#12121a', border: '1px solid #e94560' }}>
            <div style={{ color: '#e94560', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>MÓDULO ATUAL</div>
            <div style={{ color: 'white', fontSize: 18, fontWeight: 700 }}>
              {currentModule.icon} {currentModule.name}
            </div>
            <div style={{ color: '#888', fontSize: 14, marginTop: 2 }}>{currentModule.desc}</div>
            <Link
              to={`/modulos/${currentModule.id}`}
              className="inline-block mt-3 px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: '#e94560', color: 'white' }}
            >
              Continuar →
            </Link>
          </div>
        )}

        {/* Lista de módulos */}
        <h2 style={{ color: 'white', fontWeight: 600, marginBottom: 12 }}>Todos os Módulos</h2>
        <div className="flex flex-col gap-3">
          {MODULES.map(m => {
            const p = getModuleProgress(m.id)
            const locked = !p.unlocked
            const acc = p.accuracy
            const goodSessions = (p.trainerSessions || []).slice(-2).filter(s => s.accuracy >= 90).length

            return (
              <div key={m.id}
                className="rounded-xl p-4"
                style={{
                  background: '#12121a',
                  border: `1px solid ${p.completed ? '#00d4aa' : locked ? '#1e1e2e' : '#1e1e2e'}`,
                  opacity: locked ? 0.5 : 1,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 24 }}>{locked ? '🔒' : p.completed ? '✅' : m.icon}</span>
                    <div>
                      <div style={{ color: 'white', fontWeight: 600 }}>Módulo {m.id} — {m.name}</div>
                      <div style={{ color: '#666', fontSize: 13 }}>{m.desc}</div>
                    </div>
                  </div>
                  {!locked && (
                    <Link
                      to={`/modulos/${m.id}`}
                      className="px-3 py-1 rounded-lg text-sm font-semibold"
                      style={{ background: '#1e1e2e', color: '#e94560' }}
                    >
                      {p.completed ? 'Revisar' : 'Abrir'}
                    </Link>
                  )}
                </div>

                {/* Barra de progresso */}
                {!locked && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1" style={{ color: '#666' }}>
                      <span>{acc}% de acerto · {p.totalAnswered || 0} mãos</span>
                      <span style={{ color: goodSessions >= 2 ? '#00d4aa' : '#666' }}>{goodSessions}/2 sessões 90%+</span>
                    </div>
                    <div className="rounded-full h-2" style={{ background: '#1e1e2e' }}>
                      <div
                        className="rounded-full h-2 transition-all"
                        style={{
                          width: `${Math.min(acc, 100)}%`,
                          background: acc >= 90 ? '#00d4aa' : acc >= 60 ? '#f5a623' : '#e94560'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
