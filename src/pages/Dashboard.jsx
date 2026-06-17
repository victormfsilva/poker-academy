import { Link } from 'react-router-dom'
import { useProgress } from '../context/ProgressContext'

const MODULES = [
  { id: 1, name: 'RFI ChipEV', desc: 'Raise First In — o spot mais importante', icon: '🎯' },
  { id: 2, name: 'Push/Fold', desc: 'Short stack abaixo de 15bb', icon: '💥' },
  { id: 3, name: 'Pot Odds e Outs', desc: 'A matemática por trás de cada decisão', icon: '🧮' },
  { id: 4, name: 'BB vs RFI', desc: 'Defender o Big Blind', icon: '🛡️' },
  { id: 5, name: 'CBet Flop IP + Bet Sizing', desc: 'Apostar no flop em posição e escolher o tamanho certo', icon: '⚡' },
  { id: 6, name: 'Blind Wars', desc: 'SB vs BB — confronto direto', icon: '⚔️' },
  { id: 7, name: 'SB vs RFI', desc: 'Defendendo o Small Blind contra raises', icon: '🛡️' },
  { id: 8, name: 'BTN vs RFI', desc: 'A melhor posição da mesa contra raises', icon: '👑' },
  { id: 9, name: '3-Bet Ranges', desc: 'Quando relançar pre-flop — valor e blefe', icon: '🔥' },
  { id: 10, name: 'Defesa vs CBet + Check-Raise', desc: 'Fold, call ou check-raise quando apostam em você', icon: '🛡️' },
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

  if (advancedDone && intermediateDone && basicDone) return { name: 'Avançado', icon: '🏆', color: '#ffaa33' }
  if (intermediateDone && basicDone) return { name: 'Intermediário', icon: '💎', color: '#4488ff' }
  if (basicDone) return { name: 'Sólido', icon: '⭐', color: '#00e68a' }
  return { name: 'Aprendiz', icon: '📖', color: '#8888a0' }
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
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#050508' }}>
      <div className="max-w-2xl mx-auto pt-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h1 style={{ color: '#e8e8ed', fontSize: 24, fontWeight: 700 }}>
              <span style={{ color: '#00e68a', fontFamily: 'JetBrains Mono' }}>♠</span> Poker Academy <span style={{ color: '#00e68a' }}>BR</span>
            </h1>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: `${badge.color}15`, border: `1px solid ${badge.color}44` }}>
              <span style={{ fontSize: 14 }}>{badge.icon}</span>
              <span style={{ color: badge.color, fontSize: 12, fontWeight: 600, fontFamily: 'JetBrains Mono' }}>{badge.name}</span>
            </div>
          </div>
          <p style={{ color: '#55556a', marginTop: 4, fontSize: 14 }}>{motivationalMessage(progress.globalStats)}</p>
        </div>

        {/* Stats globais */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Mãos Treinadas', value: progress.globalStats.totalHands, color: '#00e68a' },
            { label: 'Taxa de Acerto', value: `${globalAcc}%`, color: globalAcc >= 90 ? '#00e68a' : globalAcc >= 60 ? '#ffaa33' : '#ff4466' },
            { label: 'Melhor Streak', value: progress.globalStats.bestStreak, color: '#ffaa33' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4 text-center"
              style={{ background: '#0c0c12', border: '1px solid #1e1e30' }}>
              <div style={{ color: s.color, fontSize: 24, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{s.value}</div>
              <div style={{ color: '#55556a', fontSize: 11, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Módulo atual */}
        {currentModule && (
          <div className="rounded-xl p-4 mb-6" style={{ background: '#0c0c12', border: '1px solid #00e68a44' }}>
            <div style={{ color: '#00e68a', fontSize: 11, fontWeight: 600, marginBottom: 4, fontFamily: 'JetBrains Mono', letterSpacing: 1.5 }}>MODULO ATUAL</div>
            <div style={{ color: '#e8e8ed', fontSize: 17, fontWeight: 700 }}>
              {currentModule.icon} {currentModule.name}
            </div>
            <div style={{ color: '#8888a0', fontSize: 13, marginTop: 2 }}>{currentModule.desc}</div>
            <Link
              to={`/modulos/${currentModule.id}`}
              className="inline-block mt-3 px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: '#00e68a', color: '#050508' }}
            >
              Continuar
            </Link>
          </div>
        )}

        {/* Lista de módulos */}
        <h2 style={{ color: '#e8e8ed', fontWeight: 600, marginBottom: 12, fontSize: 16 }}>Todos os Módulos</h2>
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
                  background: '#0c0c12',
                  border: `1px solid ${p.completed ? '#00e68a44' : '#1e1e30'}`,
                  opacity: locked ? 0.5 : 1,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 22 }}>{locked ? '🔒' : p.completed ? '✅' : m.icon}</span>
                    <div>
                      <div style={{ color: '#e8e8ed', fontWeight: 600, fontSize: 14 }}>Módulo {m.id} — {m.name}</div>
                      <div style={{ color: '#55556a', fontSize: 12 }}>{m.desc}</div>
                    </div>
                  </div>
                  {!locked && (
                    <Link
                      to={`/modulos/${m.id}`}
                      className="px-3 py-1.5 rounded-lg text-sm font-semibold"
                      style={{ background: p.completed ? '#00e68a22' : '#12121c', color: p.completed ? '#00e68a' : '#8888a0', border: '1px solid #1e1e30' }}
                    >
                      {p.completed ? 'Revisar' : 'Abrir'}
                    </Link>
                  )}
                </div>

                {!locked && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1" style={{ color: '#55556a' }}>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>{acc}% · {p.totalAnswered || 0} mãos</span>
                      <span style={{ color: goodSessions >= 2 ? '#00e68a' : '#55556a', fontFamily: 'JetBrains Mono', fontSize: 11 }}>{goodSessions}/2 sessões 90%+</span>
                    </div>
                    <div className="rounded-full h-1.5" style={{ background: '#12121c' }}>
                      <div
                        className="rounded-full h-1.5 transition-all"
                        style={{
                          width: `${Math.min(acc, 100)}%`,
                          background: acc >= 90 ? '#00e68a' : acc >= 60 ? '#ffaa33' : '#ff4466'
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
