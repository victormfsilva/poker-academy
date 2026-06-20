import { Link } from 'react-router-dom'
import { useProgress } from '../context/ProgressContext'

const PHASES = [
  {
    name: 'Fase 1 — Fundamentos',
    tag: 'ESSENCIAL',
    color: '#4fce82',
    modules: [
      { id: 1, name: 'RFI ChipEV', why: 'Base de tudo — se nao sabe abrir corretamente, nada funciona' },
      { id: 3, name: 'Pot Odds e Outs', why: 'Matematica fundamental pra tomar decisoes lucrativas' },
      { id: 9, name: '3-Bet Ranges', why: 'Unifica defesa do BB, SB e BTN num modulo so' },
      { id: 4, name: 'BB vs RFI', why: 'Spot mais frequente — voce vai ser BB o tempo todo' },
      { id: 7, name: 'SB vs RFI', why: 'Pior posicao — saber quando foldar salva fichas' },
      { id: 8, name: 'BTN vs RFI', why: 'Melhor posicao — maximize valor' },
      { id: 2, name: 'Push/Fold', why: 'Sobrevivencia em MTT — voce VAI ter 10bb' },
      { id: 6, name: 'Blind Wars', why: 'Spot unico SB vs BB isolados — muito frequente' },
    ],
  },
  {
    name: 'Fase 2 — Pos-Flop',
    tag: 'ESSENCIAL',
    color: '#0a84d7',
    modules: [
      { id: 5, name: 'CBet Flop IP', why: 'Primeira decisao pos-flop quando voce foi o raiser' },
      { id: 10, name: 'Defesa vs CBet', why: 'O outro lado — quando apostam em voce no flop' },
      { id: 14, name: 'CBet Turn', why: 'Continuar a historia ou frear? Turn decide a mao' },
      { id: 15, name: 'River Play', why: 'Decisao final — value, blefe ou give up' },
      { id: 22, name: 'SPR', why: 'Muda TODA a estrategia — top pair pode ser all-in ou fold' },
    ],
  },
  {
    name: 'Fase 3 — Teoria',
    tag: 'IMPORTANTE',
    color: '#f5a623',
    modules: [
      { id: 23, name: 'Range vs Nut Advantage', why: 'Como solvers decidem frequencia e sizing' },
      { id: 24, name: 'Polarizacao vs Merge', why: 'Dois tipos de range de aposta — saber qual usar' },
      { id: 25, name: 'Multistreet Planning', why: 'Pensar 3 streets a frente, nao so o flop' },
      { id: 26, name: 'Sizing Theory', why: 'Cada tamanho de aposta conta uma historia' },
    ],
  },
  {
    name: 'Fase 4 — Torneio (MTT)',
    tag: 'ESSENCIAL pra MTT',
    color: '#e5484d',
    modules: [
      { id: 17, name: 'ICM', why: 'Fichas de torneio nao valem linearmente — muda tudo na bolha' },
      { id: 21, name: 'Late Game MTT', why: 'Stacks curtos, resteal, squeeze — momentos decisivos' },
    ],
  },
  {
    name: 'Fase 5 — Avancado',
    tag: 'PROFUNDO',
    color: '#a78bfa',
    modules: [
      { id: 16, name: 'GTO vs Exploit', why: 'Quando seguir o solver vs exploitar erros do vilao' },
      { id: 18, name: 'Multiway Pots', why: 'Ajustes criticos com 3+ jogadores — fold equity despenca' },
      { id: 27, name: 'Blocker Effects', why: 'Card removal — nivel que separa amador de reg' },
      { id: 13, name: 'Donk Bet', why: 'Spot raro mas poderoso quando usado certo' },
      { id: 20, name: 'HUD e Solvers', why: 'So util se jogar online com tracker — pode deixar por ultimo' },
    ],
  },
]

const NOTES = [
  { icon: '9', text: 'Modulo 9 (3-Bet Ranges) unifica os conceitos dos modulos 4, 7 e 8. Se ja fez o 9, os outros sao revisao.' },
  { icon: '27', text: 'Modulo 27 (Blockers) absorveu o antigo Modulo 19. Todo o conteudo esta unificado.' },
  { icon: '20', text: 'Modulo 20 (HUD/Solvers) so vale se voce jogar online com tracker. Se joga live ou so na Academy, pode pular.' },
]

export default function StudyGuide() {
  const { getModuleProgress } = useProgress()

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-16 px-4" style={{ background: '#0f0f0f' }}>
      <div className="max-w-3xl mx-auto pt-6">
        <div className="mb-8">
          <h1 style={{ color: '#fdfdfd', fontSize: 24, fontWeight: 700 }}>Guia de Estudo</h1>
          <p style={{ color: '#b3b3b8', fontSize: 14, marginTop: 4 }}>
            Ordem otimizada para aprender o maximo no menor tempo. Siga as fases em ordem.
          </p>
        </div>

        {/* Fases */}
        {PHASES.map((phase, pi) => {
          const done = phase.modules.filter(m => getModuleProgress(m.id).completed).length
          const total = phase.modules.length
          return (
            <div key={pi} className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <h2 style={{ color: '#fdfdfd', fontSize: 16, fontWeight: 600 }}>{phase.name}</h2>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  color: phase.color,
                  background: `${phase.color}15`,
                  padding: '2px 8px', borderRadius: 4,
                }}>{phase.tag}</span>
                <span style={{ color: '#676671', fontSize: 12, fontFamily: 'JetBrains Mono' }}>
                  {done}/{total}
                </span>
              </div>

              <div className="space-y-2">
                {phase.modules.map((m, mi) => {
                  const p = getModuleProgress(m.id)
                  const acc = p.accuracy || 0
                  return (
                    <Link key={m.id} to={`/modulos/${m.id}`}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 group"
                      style={{
                        background: '#1a1a1d',
                        border: `1px solid ${p.completed ? 'rgba(79,206,130,0.2)' : '#2a2a2e'}`,
                      }}
                    >
                      {/* Número da ordem */}
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: p.completed ? 'rgba(79,206,130,0.15)' : '#222225',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: p.completed ? '#4fce82' : '#676671',
                        fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono',
                        flexShrink: 0,
                      }}>
                        {p.completed ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (pi > 0 ? PHASES.slice(0, pi).reduce((sum, ph) => sum + ph.modules.length, 0) + mi + 1 : mi + 1)}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div className="flex items-center gap-2">
                          <span style={{ color: '#fdfdfd', fontSize: 14, fontWeight: 600 }}>{m.name}</span>
                          {acc > 0 && (
                            <span style={{
                              color: acc >= 90 ? '#4fce82' : acc >= 60 ? '#f5a623' : '#e5484d',
                              fontSize: 11, fontFamily: 'JetBrains Mono', fontWeight: 600,
                            }}>{acc}%</span>
                          )}
                        </div>
                        <div style={{ color: '#676671', fontSize: 12, marginTop: 2 }}>{m.why}</div>
                      </div>

                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#676671" strokeWidth="2" style={{ flexShrink: 0 }}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Notas */}
        <div className="rounded-xl p-4 mb-8" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
          <h3 style={{ color: '#fdfdfd', fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Notas</h3>
          <div className="space-y-3">
            {NOTES.map((n, i) => (
              <div key={i} className="flex items-start gap-3">
                <span style={{
                  fontSize: 10, fontWeight: 700, fontFamily: 'JetBrains Mono',
                  color: '#f5a623', background: 'rgba(245,166,35,0.15)',
                  padding: '2px 6px', borderRadius: 4, flexShrink: 0, marginTop: 1,
                }}>M{n.icon}</span>
                <span style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 1.5 }}>{n.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
