import { Link } from 'react-router-dom'
import { useProgress } from '../context/ProgressContext'

const MODULES = [
  { id: 1, name: 'RFI ChipEV', desc: 'Raise First In', icon: 'R', cat: 'fundamentals' },
  { id: 2, name: 'Push/Fold', desc: 'Short stack < 15bb', icon: 'P', cat: 'fundamentals' },
  { id: 3, name: 'Pot Odds', desc: 'Matematica do poker', icon: 'O', cat: 'fundamentals' },
  { id: 4, name: 'BB vs RFI', desc: 'Defender o Big Blind', icon: 'D', cat: 'fundamentals' },
  { id: 5, name: 'CBet Flop IP', desc: 'Apostar no flop em posicao', icon: 'C', cat: 'fundamentals' },
  { id: 6, name: 'Blind Wars', desc: 'SB vs BB confronto direto', icon: 'W', cat: 'fundamentals' },
  { id: 7, name: 'SB vs RFI', desc: 'Defendendo o Small Blind', icon: 'S', cat: 'intermediate' },
  { id: 8, name: 'BTN vs RFI', desc: 'Melhor posicao vs raises', icon: 'B', cat: 'intermediate' },
  { id: 9, name: '3-Bet Ranges', desc: 'Quando relancar pre-flop', icon: '3', cat: 'intermediate' },
  { id: 10, name: 'Def vs CBet', desc: 'Fold, call ou check-raise', icon: 'X', cat: 'intermediate' },
  { id: 13, name: 'Donk Bet', desc: 'Apostar antes do raiser', icon: 'K', cat: 'advanced' },
  { id: 14, name: 'CBet Turn', desc: 'Double barrel no turn', icon: 'T', cat: 'advanced' },
  { id: 15, name: 'River Play', desc: 'Value bet, blefe ou check', icon: 'V', cat: 'advanced' },
  { id: 16, name: 'GTO vs Exploit', desc: 'Quando sair do livro', icon: 'G', cat: 'advanced' },
  { id: 17, name: 'ICM', desc: 'Chip independente em MTT', icon: 'I', cat: 'advanced' },
  { id: 18, name: 'Multiway', desc: 'Potes com 3+ jogadores', icon: 'M', cat: 'advanced' },
  { id: 19, name: 'Blockers', desc: 'Card removal avancado', icon: 'L', cat: 'advanced' },
  { id: 20, name: 'HUD & Solvers', desc: 'Estatisticas e solver', icon: 'H', cat: 'advanced' },
  { id: 21, name: 'Late Game MTT', desc: 'Momentos decisivos', icon: 'F', cat: 'advanced' },
]

const CATEGORIES = {
  fundamentals: 'Fundamentos',
  intermediate: 'Intermediario',
  advanced: 'Avancado',
}

export default function Dashboard() {
  const { progress, getModuleProgress } = useProgress()

  const globalAcc = progress.globalStats.totalHands > 0
    ? Math.round((progress.globalStats.totalCorrect / progress.globalStats.totalHands) * 100)
    : 0

  const completedCount = MODULES.filter(m => getModuleProgress(m.id).completed).length
  const totalModules = MODULES.length
  const overallProgress = Math.round((completedCount / totalModules) * 100)

  const currentModule = MODULES.find(m => {
    const p = getModuleProgress(m.id)
    return !p.completed && p.unlocked
  }) || MODULES[MODULES.length - 1]

  const today = new Date().toISOString().slice(0, 10)
  const dayData = progress.dailyHistory?.[today] || { hands: 0, correct: 0 }
  const goal = progress.dailyGoal || 50

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-16 px-4" style={{ background: '#0f0f0f' }}>
      <div className="max-w-5xl mx-auto pt-6">

        {/* Hero section */}
        <div className="rounded-xl p-6 md:p-8 mb-8" style={{
          background: '#1a1a1d',
          border: '1px solid #2a2a2e',
        }}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div style={{ color: '#4fce82', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 8 }}>
                POKER ACADEMY
              </div>
              <h1 style={{ color: '#fdfdfd', fontSize: 28, fontWeight: 600, lineHeight: 1.2, marginBottom: 8 }}>
                {progress.globalStats.totalHands === 0
                  ? 'Comece sua jornada GTO'
                  : `${globalAcc}% de acerto geral`
                }
              </h1>
              <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.5, maxWidth: 400 }}>
                {progress.globalStats.totalHands === 0
                  ? 'Domine ranges pre-flop, pot odds, e estrategia avancada com treino pratico.'
                  : `${progress.globalStats.totalHands} maos treinadas. ${completedCount}/${totalModules} modulos completos.`
                }
              </p>
              {currentModule && (
                <Link
                  to={`/modulos/${currentModule.id}`}
                  className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-lg text-sm font-semibold"
                  style={{ background: '#4fce82', color: '#0f0f0f' }}
                >
                  Continuar treinando
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </Link>
              )}
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-3 gap-3 md:gap-4" style={{ minWidth: 280 }}>
              {[
                { label: 'Maos', value: progress.globalStats.totalHands, color: '#4fce82' },
                { label: 'Acerto', value: `${globalAcc}%`, color: globalAcc >= 90 ? '#4fce82' : globalAcc >= 60 ? '#f5a623' : '#e5484d' },
                { label: 'Streak', value: progress.globalStats.bestStreak, color: '#f5a623' },
              ].map(s => (
                <div key={s.label} className="rounded-lg p-3 text-center"
                  style={{ background: '#222225', border: '1px solid #2a2a2e' }}>
                  <div style={{ color: s.color, fontSize: 22, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{s.value}</div>
                  <div style={{ color: '#676671', fontSize: 10, fontFamily: 'JetBrains Mono', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily progress bar */}
          {dayData.hands > 0 && (
            <div className="mt-6 pt-5" style={{ borderTop: '1px solid #2a2a2e' }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ color: '#b3b3b8', fontSize: 12, fontFamily: 'JetBrains Mono' }}>Meta diaria</span>
                <span style={{ color: '#b3b3b8', fontSize: 12, fontFamily: 'JetBrains Mono' }}>{dayData.hands}/{goal}</span>
              </div>
              <div className="rounded-full h-1.5" style={{ background: '#2a2a2e' }}>
                <div className="rounded-full h-1.5" style={{
                  width: `${Math.min(Math.round((dayData.hands / goal) * 100), 100)}%`,
                  background: dayData.hands >= goal ? '#4fce82' : '#0a84d7',
                }} />
              </div>
            </div>
          )}
        </div>

        {/* Progress overview bar */}
        <div className="flex items-center gap-4 mb-8">
          <div style={{ flex: 1 }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ color: '#fdfdfd', fontSize: 14, fontWeight: 600 }}>Progresso geral</span>
              <span style={{ color: '#b3b3b8', fontSize: 12, fontFamily: 'JetBrains Mono' }}>{completedCount}/{totalModules}</span>
            </div>
            <div className="rounded-full h-1" style={{ background: '#2a2a2e' }}>
              <div className="rounded-full h-1" style={{ width: `${overallProgress}%`, background: '#4fce82' }} />
            </div>
          </div>
        </div>

        {/* Module grid by category */}
        {Object.entries(CATEGORIES).map(([catKey, catLabel]) => {
          const catModules = MODULES.filter(m => m.cat === catKey)
          return (
            <div key={catKey} className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <h2 style={{ color: '#fdfdfd', fontSize: 15, fontWeight: 600 }}>{catLabel}</h2>
                <div style={{ flex: 1, height: 1, background: '#2a2a2e' }} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {catModules.map(m => {
                  const p = getModuleProgress(m.id)
                  const locked = !p.unlocked
                  const acc = p.accuracy || 0

                  return (
                    <div key={m.id} style={{
                      opacity: locked ? 0.35 : 1,
                      pointerEvents: locked ? 'none' : 'auto',
                    }}>
                      <Link
                        to={`/modulos/${m.id}`}
                        className="block rounded-xl p-4 group"
                        style={{
                          background: p.completed ? 'rgba(79,206,130,0.05)' : '#1a1a1d',
                          border: `1px solid ${p.completed ? 'rgba(79,206,130,0.2)' : '#2a2a2e'}`,
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div style={{
                            width: 36, height: 36, borderRadius: 8,
                            background: p.completed ? 'rgba(79,206,130,0.12)' : locked ? '#222225' : 'rgba(10,132,215,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: p.completed ? '#4fce82' : locked ? '#676671' : '#0a84d7',
                            fontSize: 14, fontWeight: 700, fontFamily: 'JetBrains Mono', flexShrink: 0,
                          }}>
                            {locked ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                            ) : p.completed ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            ) : m.icon}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="flex items-center gap-2">
                              <span style={{ color: '#fdfdfd', fontWeight: 600, fontSize: 13 }}>
                                {m.name}
                              </span>
                              {!locked && acc > 0 && (
                                <span style={{
                                  color: acc >= 90 ? '#4fce82' : acc >= 60 ? '#f5a623' : '#e5484d',
                                  fontSize: 11, fontFamily: 'JetBrains Mono', fontWeight: 600,
                                }}>{acc}%</span>
                              )}
                            </div>
                            <div style={{ color: '#b3b3b8', fontSize: 12, marginTop: 2 }}>{m.desc}</div>
                            {!locked && !p.completed && acc > 0 && (
                              <div className="mt-2.5 rounded-full h-1" style={{ background: '#2a2a2e' }}>
                                <div className="rounded-full h-1" style={{
                                  width: `${Math.min(acc, 100)}%`,
                                  background: acc >= 90 ? '#4fce82' : acc >= 60 ? '#f5a623' : '#e5484d',
                                }} />
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
