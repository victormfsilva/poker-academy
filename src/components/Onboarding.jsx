import { useState } from 'react'

const STEPS = [
  {
    icon: '♠',
    title: 'Bem-vindo ao Poker Academy',
    desc: 'Treine GTO de verdade com exercicios praticos baseados em ranges reais. Evolua seu jogo mao a mao.',
  },
  {
    icon: '📊',
    title: 'Modulos + Modo Infinito',
    desc: 'Comece pelos modulos de RFI e avance ate cenarios pos-flop. Ou treine no modo infinito com maos aleatorias de todos os modulos.',
  },
  {
    icon: '🎯',
    title: 'Acompanhe sua Evolucao',
    desc: 'Veja suas estatisticas, defina metas diarias e mantenha uma sequencia de dias treinando. Consistencia e a chave.',
  },
]

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#0f0f0f' }}>
      <div style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
        {/* Icon */}
        <div style={{
          fontSize: 56, lineHeight: 1, marginBottom: 24,
          filter: step === 0 ? 'none' : 'none',
        }}>
          {current.icon}
        </div>

        {/* Title */}
        <h1 style={{
          color: '#fdfdfd', fontSize: 24, fontWeight: 700,
          fontFamily: 'Poppins, sans-serif', marginBottom: 12,
        }}>
          {current.title}
        </h1>

        {/* Description */}
        <p style={{
          color: '#b3b3b8', fontSize: 15, lineHeight: 1.6,
          fontFamily: 'Poppins, sans-serif', marginBottom: 32,
        }}>
          {current.desc}
        </p>

        {/* Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 24 : 8, height: 8, borderRadius: 4,
              background: i === step ? '#4fce82' : '#2a2a2e',
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>

        {/* Button */}
        <button
          onClick={() => isLast ? onComplete() : setStep(step + 1)}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 10,
            background: '#4fce82', border: 'none',
            color: '#0f0f0f', fontSize: 16, fontWeight: 700,
            fontFamily: 'Poppins, sans-serif', cursor: 'pointer',
          }}
        >
          {isLast ? 'Comecar a Treinar' : 'Proximo'}
        </button>

        {/* Skip */}
        {!isLast && (
          <button
            onClick={onComplete}
            style={{
              marginTop: 12, background: 'none', border: 'none',
              color: '#676671', fontSize: 13, cursor: 'pointer',
              fontFamily: 'Poppins, sans-serif',
            }}
          >
            Pular
          </button>
        )}
      </div>
    </div>
  )
}
