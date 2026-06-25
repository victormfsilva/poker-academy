import { useState } from 'react'

const STEPS = [
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--emerald)" strokeWidth="1.5">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
        <path d="M12 6l1.5 3.5L17 11l-3.5 1.5L12 16l-1.5-3.5L7 11l3.5-1.5L12 6z" fill="var(--emerald)" stroke="none"/>
      </svg>
    ),
    title: 'Bem-vindo ao Poker Academy',
    desc: 'Treine GTO de verdade com exercicios praticos baseados em ranges reais. Evolua seu jogo mao a mao.',
  },
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--sapphire)" strokeWidth="1.5">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    title: 'Modulos + Modo Infinito',
    desc: 'Comece pelos modulos de RFI e avance ate cenarios pos-flop. Ou treine no modo infinito com maos aleatorias de todos os modulos.',
  },
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    title: 'Acompanhe sua Evolucao',
    desc: 'Veja suas estatisticas, defina metas diarias e mantenha uma sequencia de dias treinando. Consistencia e a chave.',
  },
]

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--bg)' }}>
      <div style={{ maxWidth: 400, width: '100%', textAlign: 'center' }} className="animate-in">
        {/* Icon */}
        <div style={{
          width: 80, height: 80, borderRadius: 'var(--radius-xl)', margin: '0 auto 28px',
          background: 'var(--surface-1)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {current.icon}
        </div>

        <h1 style={{
          color: 'var(--text-primary)', fontSize: 24, fontWeight: 700,
          letterSpacing: '-0.025em', marginBottom: 12,
        }}>
          {current.title}
        </h1>

        <p style={{
          color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6,
          marginBottom: 32,
        }}>
          {current.desc}
        </p>

        {/* Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 24 : 8, height: 6, borderRadius: 3,
              background: i === step ? 'var(--emerald)' : 'var(--surface-3)',
              transition: 'all 0.3s ease',
              boxShadow: i === step ? 'var(--shadow-glow-emerald)' : 'none',
            }} />
          ))}
        </div>

        <button onClick={() => isLast ? onComplete() : setStep(step + 1)} className="btn-primary w-full"
          style={{ padding: '14px 0', fontSize: 16 }}>
          {isLast ? 'Comecar a Treinar' : 'Proximo'}
        </button>

        {!isLast && (
          <button onClick={onComplete}
            style={{
              marginTop: 14, background: 'none', border: 'none',
              color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer',
            }}>
            Pular
          </button>
        )}
      </div>
    </div>
  )
}
