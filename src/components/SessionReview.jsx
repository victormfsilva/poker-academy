import { useMemo } from 'react'
import { useProgress } from '../context/ProgressContext'
import { analyzeLeaks } from '../utils/leaks'

const MOD_NAMES = {
  1: 'RFI', 2: 'Push/Fold', 3: 'Pot Odds', 4: 'BB vs RFI', 5: 'CBet Flop',
  6: 'Blind Wars', 7: 'SB vs RFI', 8: 'BTN vs RFI', 9: '3-Bet', 10: 'Def vs CBet',
  13: 'Donk Bet', 14: 'CBet Turn', 15: 'River Play', 16: 'GTO vs Exploit',
  17: 'ICM', 18: 'Multiway', 19: 'Blockers', 20: 'HUD & Solvers', 21: 'Late Game',
  22: 'SPR', 23: 'Range/Nut', 24: 'Polar/Merge', 25: 'Multistreet', 26: 'Sizing',
  27: 'Blockers Adv',
}

export default function SessionReview({ moduleId, sessionCorrect, sessionTotal, onContinue }) {
  const { progress } = useProgress()
  const accuracy = Math.round((sessionCorrect / sessionTotal) * 100)

  const analysis = useMemo(() => {
    const history = progress.answerHistory || []
    const moduleHistory = history.filter(e => e.m === moduleId)
    const recentErrors = moduleHistory.filter(e => !e.ok).length
    const totalInModule = moduleHistory.length

    const recent50 = history.slice(-50)
    const errorsInRecent = recent50.filter(e => e.m === moduleId && !e.ok).length
    const isRepeatLeak = errorsInRecent >= 3

    const leaks = analyzeLeaks(history)
    const topLeaks = leaks.slice(0, 3)
    const isCurrentModuleLeak = topLeaks.some(l => l.moduleId === moduleId)

    return { recentErrors, totalInModule, isRepeatLeak, topLeaks, isCurrentModuleLeak, errorsInRecent }
  }, [progress.answerHistory, moduleId])

  const message = accuracy >= 90
    ? 'Excelente! Voce domina esse conteudo.'
    : accuracy >= 70
    ? 'Bom trabalho! Alguns spots ainda precisam de atencao.'
    : accuracy >= 50
    ? 'Progresso! Revise a aula e foque nos erros.'
    : 'Esse modulo precisa de mais estudo. Releia a aula antes de tentar novamente.'

  const sessionErrors = sessionTotal - sessionCorrect
  const accColor = accuracy >= 90 ? 'var(--emerald)' : accuracy >= 70 ? 'var(--gold)' : 'var(--crimson)'
  const accBg = accuracy >= 90 ? 'var(--emerald-soft)' : accuracy >= 70 ? 'var(--gold-soft)' : 'var(--crimson-soft)'

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-16" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto px-4 pt-6 animate-in">
        <div className="card" style={{ borderRadius: 'var(--radius-xl)' }}>

          {/* Header */}
          <div className="text-center mb-6">
            <div style={{
              width: 56, height: 56, borderRadius: 'var(--radius-lg)', margin: '0 auto 12px',
              background: accBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={accColor} strokeWidth="2">
                {accuracy >= 70 ? <polyline points="20 6 9 17 4 12" /> : <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>}
              </svg>
            </div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: 22, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.025em' }}>
              Sessao Completa
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>
              {MOD_NAMES[moduleId] || `Modulo ${moduleId}`}
            </p>
          </div>

          {/* Score */}
          <div className="rounded-xl p-5 mb-5 text-center" style={{
            background: accBg,
            border: `1px solid ${accColor}20`,
          }}>
            <div style={{
              color: accColor,
              fontSize: 48, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1,
            }}>
              {accuracy}%
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 8 }}>
              {sessionCorrect}/{sessionTotal} corretas
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { label: 'Acertos', value: sessionCorrect, color: 'var(--emerald)' },
              { label: 'Erros', value: sessionErrors, color: sessionErrors > 0 ? 'var(--crimson)' : 'var(--emerald)' },
              { label: 'Total', value: analysis.totalInModule, color: 'var(--sapphire)' },
            ].map(s => (
              <div key={s.label} className="rounded-lg py-3 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div style={{ color: s.color, fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Message */}
          <div className="rounded-lg px-4 py-3 mb-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>{message}</p>
          </div>

          {/* Repeat leak alert */}
          {analysis.isRepeatLeak && sessionErrors > 0 && (
            <div className="rounded-lg px-4 py-3 mb-4" style={{
              background: 'var(--crimson-soft)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}>
              <div style={{ color: 'var(--crimson)', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                Spot recorrente detectado
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.5 }}>
                Voce errou {analysis.errorsInRecent}x nesse modulo nas ultimas 50 respostas.
                Esse e um dos seus leaks — revise a aula com calma antes de treinar mais.
              </p>
            </div>
          )}

          {/* Current module leak */}
          {analysis.isCurrentModuleLeak && sessionErrors > 0 && !analysis.isRepeatLeak && (
            <div className="rounded-lg px-4 py-3 mb-4" style={{
              background: 'var(--gold-soft)',
              border: '1px solid rgba(245,158,11,0.2)',
            }}>
              <div style={{ color: 'var(--gold)', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                Este modulo e um dos seus 3 maiores leaks
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.5 }}>
                Continue praticando — o Modo Infinito com Foco ON vai priorizar esses spots.
              </p>
            </div>
          )}

          {/* Top leaks */}
          {analysis.topLeaks.length > 0 && (
            <div className="mb-5">
              <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, marginBottom: 8, letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace' }}>
                SEUS MAIORES LEAKS
              </div>
              <div className="space-y-1.5">
                {analysis.topLeaks.map((leak, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2.5">
                      <div style={{
                        width: 22, height: 22, borderRadius: 'var(--radius-sm)',
                        background: i === 0 ? 'var(--crimson-soft)' : 'var(--gold-soft)',
                        color: i === 0 ? 'var(--crimson)' : 'var(--gold)',
                        fontSize: 10, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {i + 1}
                      </div>
                      <span style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 500 }}>{leak.label}</span>
                    </div>
                    <span className={`badge ${leak.errorRate >= 40 ? 'badge-crimson' : 'badge-gold'}`} style={{ fontSize: 10 }}>
                      {leak.errorRate}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Continue button */}
          <button onClick={onContinue} className="btn-primary w-full" style={{ padding: '14px', fontSize: 15, borderRadius: 'var(--radius-md)' }}>
            Nova Sessao
          </button>
        </div>
      </div>
    </div>
  )
}
