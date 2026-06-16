import { Link } from 'react-router-dom'
import { useProgress } from '../context/ProgressContext'

const MODULES = [
  { id: 1, name: 'RFI ChipEV', desc: 'Raise First In — o spot mais importante do poker de torneios', icon: '🎯', color: '#e94560' },
  { id: 2, name: 'Push/Fold', desc: 'Short stack — abaixo de 15bb existem apenas 2 opções', icon: '💥', color: '#f5a623' },
  { id: 3, name: 'Pot Odds e Outs', desc: 'A matemática por trás de cada decisão no poker', icon: '🧮', color: '#4a90e2' },
  { id: 4, name: 'BB vs RFI', desc: 'Como defender o Big Blind contra qualquer raise', icon: '🛡️', color: '#00d4aa' },
  { id: 5, name: 'CBet Flop IP', desc: 'Aposta de continuação quando você está em posição', icon: '⚡', color: '#f5a623' },
  { id: 6, name: 'Blind Wars', desc: 'SB vs BB — o confronto mais complexo do poker', icon: '⚔️', color: '#e94560' },
  { id: 7, name: 'SB vs RFI', desc: 'Defendendo o Small Blind contra raises', icon: '🛡️', color: '#00d4aa' },
  { id: 8, name: 'BTN vs RFI', desc: 'A melhor posição da mesa contra raises', icon: '👑', color: '#e94560' },
  { id: 9, name: '3-Bet Ranges', desc: 'Quando relançar pre-flop — valor e blefe', icon: '🔥', color: '#f5a623' },
  { id: 10, name: 'Defesa vs CBet + Check-Raise', desc: 'Fold, call ou check-raise quando apostam em você', icon: '🛡️', color: '#4a90e2' },
  { id: 12, name: 'Bet Sizing', desc: 'Quanto apostar em cada situação', icon: '📐', color: '#00d4aa' },
  { id: 13, name: 'Donk Bet', desc: 'Quando apostar antes do raiser no flop', icon: '💣', color: '#e94560' },
  { id: 14, name: 'CBet Turn', desc: 'Double barrel — continuar no turn', icon: '🔄', color: '#f5a623' },
  { id: 15, name: 'River Play', desc: 'Value bet, blefe ou check no river', icon: '🏁', color: '#4a90e2' },
  { id: 16, name: 'GTO vs Exploit', desc: 'Quando sair do livro e ajustar', icon: '🧠', color: '#00d4aa' },
  { id: 17, name: 'ICM', desc: 'Modelo de chip independente em torneios', icon: '🏆', color: '#f5a623' },
  { id: 18, name: 'Multiway Pots', desc: 'Potes com 3+ jogadores', icon: '👥', color: '#4a90e2' },
  { id: 19, name: 'Blockers', desc: 'Card removal e decisões avançadas', icon: '🧩', color: '#e94560' },
  { id: 20, name: 'HUD e Solvers', desc: 'Estatísticas e estudo com solver', icon: '📊', color: '#00d4aa' },
  { id: 21, name: 'Late Game MTT', desc: 'Dominando os momentos decisivos do torneio', icon: '🎰', color: '#e94560' },
]

export default function Modules() {
  const { getModuleProgress } = useProgress()

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>📚 Módulos de Estudo</h1>
        <p style={{ color: '#666', marginBottom: 24 }}>Complete cada módulo antes de avançar. Meta: 90%+ em 2 sessões seguidas.</p>

        <div className="flex flex-col gap-4">
          {MODULES.map(m => {
            const p = getModuleProgress(m.id)
            const locked = !p.unlocked
            const sessions = p.trainerSessions?.length || 0
            const goodSessions = (p.trainerSessions || []).slice(-2).filter(s => s.accuracy >= 90).length

            return (
              <div key={m.id} className="rounded-xl overflow-hidden" style={{ background: '#12121a', border: `1px solid ${p.completed ? '#00d4aa' : locked ? '#1e1e2e' : '#1e1e2e'}`, opacity: locked ? 0.6 : 1 }}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl flex items-center justify-center" style={{ width: 48, height: 48, background: locked ? '#1e1e2e' : `${m.color}22`, fontSize: 22, flexShrink: 0 }}>
                        {locked ? '🔒' : p.completed ? '✅' : m.icon}
                      </div>
                      <div>
                        <div style={{ color: 'white', fontWeight: 600 }}>Módulo {m.id} — {m.name}</div>
                        <div style={{ color: '#666', fontSize: 13, marginTop: 2 }}>{m.desc}</div>
                        {!locked && (
                          <div className="flex gap-3 mt-2">
                            <span style={{ color: '#888', fontSize: 12 }}>{p.accuracy}% acerto</span>
                            <span style={{ color: '#888', fontSize: 12 }}>·</span>
                            <span style={{ color: goodSessions >= 2 ? '#00d4aa' : '#888', fontSize: 12 }}>
                              {goodSessions}/2 sessões 90%+
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {!locked && (
                      <Link to={`/modulos/${m.id}`} className="px-4 py-2 rounded-lg text-sm font-semibold flex-shrink-0"
                        style={{ background: p.completed ? '#00d4aa22' : '#e9456022', color: p.completed ? '#00d4aa' : '#e94560' }}>
                        {p.completed ? 'Revisar' : p.lessonRead ? 'Treinar' : 'Iniciar'}
                      </Link>
                    )}
                  </div>

                  {!locked && (
                    <div className="mt-3">
                      <div className="rounded-full h-1.5" style={{ background: '#1e1e2e' }}>
                        <div className="rounded-full h-1.5 transition-all" style={{
                          width: `${p.completed ? 100 : Math.min(p.accuracy, 100)}%`,
                          background: p.completed ? '#00d4aa' : p.accuracy >= 90 ? '#00d4aa' : p.accuracy >= 60 ? '#f5a623' : '#e94560'
                        }} />
                      </div>
                    </div>
                  )}

                  {!locked && !p.lessonRead && (
                    <div className="mt-2 text-xs" style={{ color: '#555' }}>⚡ Leia a aula antes de treinar</div>
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
