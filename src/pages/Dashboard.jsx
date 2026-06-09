import { Link } from 'react-router-dom'
import { useProgress } from '../context/ProgressContext'

const MODULES = [
  { id: 1, name: 'RFI ChipEV', desc: 'Raise First In — o spot mais importante', icon: '🎯' },
  { id: 2, name: 'Push/Fold', desc: 'Short stack abaixo de 15bb', icon: '💥' },
  { id: 3, name: 'BB vs RFI', desc: 'Defender o Big Blind', icon: '🛡️' },
  { id: 4, name: 'CBet Flop IP', desc: 'Continuation bet em posição', icon: '⚡' },
  { id: 5, name: 'Blind Wars', desc: 'SB vs BB — confronto direto', icon: '⚔️' },
  { id: 6, name: 'SB/BTN vs RFI', desc: 'Jogar nas posições mais tardias', icon: '🃏' },
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

export default function Dashboard() {
  const { progress, getModuleProgress } = useProgress()

  const globalAcc = progress.globalStats.totalHands > 0
    ? Math.round((progress.globalStats.totalCorrect / progress.globalStats.totalHands) * 100)
    : 0

  const currentModule = MODULES.find(m => {
    const p = getModuleProgress(m.id)
    return !p.completed && p.unlocked
  }) || MODULES[MODULES.length - 1]

  return (
    <div className="min-h-screen pb-24 md:pb-8 md:pt-20 px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        {/* Header */}
        <div className="mb-6">
          <h1 style={{ color: 'white', fontSize: 26, fontWeight: 700 }}>
            ♠ Poker Academy <span style={{ color: '#e94560' }}>BR</span>
          </h1>
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
                      <span>{acc}% de acerto</span>
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
