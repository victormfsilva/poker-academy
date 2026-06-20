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

    // Quantas vezes errou esse modulo nos ultimos 50 respostas gerais
    const recent50 = history.slice(-50)
    const errorsInRecent = recent50.filter(e => e.m === moduleId && !e.ok).length

    // Pattern: erros repetidos no mesmo modulo
    const isRepeatLeak = errorsInRecent >= 3

    // Leaks gerais
    const leaks = analyzeLeaks(history)
    const topLeaks = leaks.slice(0, 3)

    // Verificar se o modulo atual e um leak
    const isCurrentModuleLeak = topLeaks.some(l => l.moduleId === moduleId)

    return { recentErrors, totalInModule, isRepeatLeak, topLeaks, isCurrentModuleLeak, errorsInRecent }
  }, [progress.answerHistory, moduleId])

  const emoji = accuracy >= 90 ? '🎯' : accuracy >= 70 ? '💪' : accuracy >= 50 ? '📚' : '🔄'
  const message = accuracy >= 90
    ? 'Excelente! Voce domina esse conteudo.'
    : accuracy >= 70
    ? 'Bom trabalho! Alguns spots ainda precisam de atencao.'
    : accuracy >= 50
    ? 'Progresso! Revise a aula e foque nos erros.'
    : 'Esse modulo precisa de mais estudo. Releia a aula antes de tentar novamente.'

  const sessionErrors = sessionTotal - sessionCorrect

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-16" style={{ background: '#0f0f0f' }}>
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="rounded-2xl p-6" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>

          {/* Header */}
          <div className="text-center mb-6">
            <div style={{ fontSize: 48, marginBottom: 8 }}>{emoji}</div>
            <h2 style={{ color: '#fdfdfd', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
              Sessao Completa!
            </h2>
            <p style={{ color: '#676671', fontSize: 13 }}>
              {MOD_NAMES[moduleId] || `Modulo ${moduleId}`}
            </p>
          </div>

          {/* Score principal */}
          <div className="rounded-xl p-5 mb-5 text-center" style={{
            background: accuracy >= 90 ? 'rgba(79,206,130,0.08)' : accuracy >= 70 ? 'rgba(245,166,35,0.08)' : 'rgba(229,72,77,0.08)',
            border: `1px solid ${accuracy >= 90 ? 'rgba(79,206,130,0.2)' : accuracy >= 70 ? 'rgba(245,166,35,0.2)' : 'rgba(229,72,77,0.2)'}`,
          }}>
            <div style={{
              color: accuracy >= 90 ? '#4fce82' : accuracy >= 70 ? '#f5a623' : '#e5484d',
              fontSize: 48, fontWeight: 700, fontFamily: 'JetBrains Mono', lineHeight: 1,
            }}>
              {accuracy}%
            </div>
            <div style={{ color: '#b3b3b8', fontSize: 13, marginTop: 6 }}>
              {sessionCorrect}/{sessionTotal} corretas
            </div>
          </div>

          {/* Stats da sessao */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { label: 'Acertos', value: sessionCorrect, color: '#4fce82' },
              { label: 'Erros', value: sessionErrors, color: sessionErrors > 0 ? '#e5484d' : '#4fce82' },
              { label: 'Total no modulo', value: analysis.totalInModule, color: '#0a84d7' },
            ].map(s => (
              <div key={s.label} className="rounded-lg py-2.5 text-center" style={{ background: '#222225' }}>
                <div style={{ color: s.color, fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{s.value}</div>
                <div style={{ color: '#676671', fontSize: 10 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Mensagem */}
          <div className="rounded-lg px-4 py-3 mb-4" style={{ background: '#222225' }}>
            <p style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 1.6 }}>{message}</p>
          </div>

          {/* Alerta de leak repetido */}
          {analysis.isRepeatLeak && sessionErrors > 0 && (
            <div className="rounded-lg px-4 py-3 mb-4" style={{
              background: 'rgba(229,72,77,0.08)',
              border: '1px solid rgba(229,72,77,0.2)',
            }}>
              <div style={{ color: '#e5484d', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                Spot recorrente detectado
              </div>
              <p style={{ color: '#b3b3b8', fontSize: 12, lineHeight: 1.5 }}>
                Voce errou {analysis.errorsInRecent}x nesse modulo nas ultimas 50 respostas.
                Esse e um dos seus leaks — revise a aula com calma antes de treinar mais.
              </p>
            </div>
          )}

          {/* Leak atual */}
          {analysis.isCurrentModuleLeak && sessionErrors > 0 && !analysis.isRepeatLeak && (
            <div className="rounded-lg px-4 py-3 mb-4" style={{
              background: 'rgba(245,166,35,0.08)',
              border: '1px solid rgba(245,166,35,0.2)',
            }}>
              <div style={{ color: '#f5a623', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                Este modulo e um dos seus 3 maiores leaks
              </div>
              <p style={{ color: '#b3b3b8', fontSize: 12, lineHeight: 1.5 }}>
                Continue praticando — o Modo Infinito com Foco ON vai priorizar esses spots.
              </p>
            </div>
          )}

          {/* Top 3 leaks gerais */}
          {analysis.topLeaks.length > 0 && (
            <div className="mb-5">
              <div style={{ color: '#676671', fontSize: 11, fontWeight: 600, marginBottom: 8 }}>
                SEUS MAIORES LEAKS ATUAIS
              </div>
              <div className="space-y-1.5">
                {analysis.topLeaks.map((leak, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: '#222225' }}>
                    <div className="flex items-center gap-2">
                      <div style={{
                        width: 20, height: 20, borderRadius: 4,
                        background: i === 0 ? 'rgba(229,72,77,0.15)' : 'rgba(245,166,35,0.15)',
                        color: i === 0 ? '#e5484d' : '#f5a623',
                        fontSize: 10, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {i + 1}
                      </div>
                      <span style={{ color: '#fdfdfd', fontSize: 12 }}>{leak.label}</span>
                    </div>
                    <span style={{
                      color: leak.errorRate >= 40 ? '#e5484d' : '#f5a623',
                      fontSize: 12, fontWeight: 600, fontFamily: 'JetBrains Mono',
                    }}>
                      {leak.errorRate}% erro
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botao continuar */}
          <button onClick={onContinue}
            style={{
              width: '100%', padding: '14px', borderRadius: 8,
              background: '#4fce82', border: 'none', color: '#0f0f0f',
              fontWeight: 600, fontSize: 15, cursor: 'pointer',
            }}>
            Nova Sessao
          </button>
        </div>
      </div>
    </div>
  )
}
