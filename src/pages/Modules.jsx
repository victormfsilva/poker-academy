import { Link } from 'react-router-dom'
import { useProgress } from '../context/ProgressContext'

const MODULES = [
  { id: 1, name: 'RFI ChipEV', desc: 'Raise First In — o spot mais importante do poker de torneios', icon: '🎯' },
  { id: 2, name: 'Push/Fold', desc: 'Short stack — abaixo de 15bb existem apenas 2 opções', icon: '💥' },
  { id: 3, name: 'Pot Odds e Outs', desc: 'A matemática por trás de cada decisão no poker', icon: '🧮' },
  { id: 4, name: 'BB vs RFI', desc: 'Como defender o Big Blind contra qualquer raise', icon: '🛡️' },
  { id: 5, name: 'CBet Flop IP + Bet Sizing', desc: 'Apostar no flop em posição e escolher o tamanho certo', icon: '⚡' },
  { id: 6, name: 'Blind Wars', desc: 'SB vs BB — o confronto mais complexo do poker', icon: '⚔️' },
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

export default function Modules() {
  const { getModuleProgress } = useProgress()

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#050508' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <h1 style={{ color: '#e8e8ed', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Módulos de Estudo</h1>
        <p style={{ color: '#55556a', marginBottom: 24, fontSize: 14 }}>Complete cada módulo antes de avançar. Meta: 90%+ em 2 sessões seguidas.</p>

        <div className="flex flex-col gap-3">
          {MODULES.map(m => {
            const p = getModuleProgress(m.id)
            const locked = !p.unlocked
            const goodSessions = (p.trainerSessions || []).slice(-2).filter(s => s.accuracy >= 90).length

            return (
              <div key={m.id} className="rounded-xl overflow-hidden" style={{ background: '#0c0c12', border: `1px solid ${p.completed ? '#00e68a44' : '#1e1e30'}`, opacity: locked ? 0.5 : 1 }}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl flex items-center justify-center" style={{ width: 48, height: 48, background: locked ? '#12121c' : '#12121c', fontSize: 22, flexShrink: 0 }}>
                        {locked ? '🔒' : p.completed ? '✅' : m.icon}
                      </div>
                      <div>
                        <div style={{ color: '#e8e8ed', fontWeight: 600 }}>Módulo {m.id} — {m.name}</div>
                        <div style={{ color: '#55556a', fontSize: 13, marginTop: 2 }}>{m.desc}</div>
                        {!locked && (
                          <div className="flex gap-3 mt-2">
                            <span style={{ color: '#8888a0', fontSize: 12, fontFamily: 'JetBrains Mono' }}>{p.accuracy}% acerto</span>
                            <span style={{ color: '#8888a0', fontSize: 12 }}>·</span>
                            <span style={{ color: goodSessions >= 2 ? '#00e68a' : '#8888a0', fontSize: 12, fontFamily: 'JetBrains Mono' }}>
                              {goodSessions}/2 sessões 90%+
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {!locked && (
                      <Link to={`/modulos/${m.id}`} className="px-4 py-2 rounded-lg text-sm font-semibold flex-shrink-0"
                        style={{ background: p.completed ? '#00e68a22' : '#12121c', color: p.completed ? '#00e68a' : '#8888a0', border: '1px solid #1e1e30' }}>
                        {p.completed ? 'Revisar' : p.lessonRead ? 'Treinar' : 'Iniciar'}
                      </Link>
                    )}
                  </div>

                  {!locked && (
                    <div className="mt-3">
                      <div className="rounded-full h-1.5" style={{ background: '#12121c' }}>
                        <div className="rounded-full h-1.5 transition-all" style={{
                          width: `${p.completed ? 100 : Math.min(p.accuracy, 100)}%`,
                          background: p.completed ? '#00e68a' : p.accuracy >= 90 ? '#00e68a' : p.accuracy >= 60 ? '#ffaa33' : '#ff4466'
                        }} />
                      </div>
                    </div>
                  )}

                  {!locked && !p.lessonRead && (
                    <div className="mt-2 text-xs" style={{ color: '#55556a' }}>⚡ Leia a aula antes de treinar</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
