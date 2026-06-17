import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'

const pick = arr => arr[Math.floor(Math.random() * arr.length)]
const randBB = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

const HANDS_PREMIUM = ['AA', 'KK', 'QQ', 'AKs']
const HANDS_STRONG = ['JJ', 'TT', 'AQs', 'AQo', 'AKo']
const HANDS_MEDIUM = ['99', '88', '77', 'AJs', 'ATs', 'KQs', 'KQo']
const HANDS_MARGINAL = ['66', '55', 'A9o', 'A8o', 'KJo', 'QJo', 'KTs', 'JTs']
const HANDS_WEAK = ['A5o', 'A3o', 'K8o', 'Q9o', 'J9o', 'T9o']
const HANDS_SUITED_CONNECTORS = ['87s', '76s', '65s', '98s', 'T9s', 'J9s']

const TEMPLATES = [
  // 1. Resteal com short stack — shove vs late position raise
  () => {
    const heroBB = randBB(8, 14)
    const hand = pick([...HANDS_MEDIUM, ...HANDS_MARGINAL])
    const vilPos = pick(['CO', 'BTN'])
    const vilBB = randBB(25, 40)
    const blindLevel = pick(['300/600', '400/800', '500/1000'])
    return {
      situation: `Late game MTT. Blinds ${blindLevel} com ante. Voce tem ${heroBB}bb no BB. ${vilPos} (${vilBB}bb) faz raise 2.2x. Voce tem ${hand}.`,
      question: 'O que voce faz?',
      options: [
        { id: 'shove', label: 'Shove all-in (resteal)', correct: true },
        { id: 'call', label: 'Call', correct: false },
      ],
      explanation: `Com ${heroBB}bb, flat call desperdiça fichas preciosas. Shove é a melhor jogada — voce ganha dead money dos blinds+antes+raise, ou joga all-in com equity decente. ${hand} tem fold equity contra raise de ${vilPos}.`,
      concept: 'Com 8-14bb, resteal shove > flat call. Voce maximiza fold equity e evita decisoes dificeis pos-flop.',
    }
  },

  // 2. Ante stealing em late position — open shove vs open raise
  () => {
    const heroBB = randBB(10, 15)
    const hand = pick([...HANDS_MARGINAL, ...HANDS_WEAK.slice(0, 3)])
    const heroPos = pick(['CO', 'BTN'])
    const antes = pick([0.1, 0.125, 0.15])
    return {
      situation: `Late game. ${heroBB}bb no ${heroPos}. Antes de ${antes}bb por jogador. Fold ate voce. Voce tem ${hand}.`,
      question: `Com ${heroBB}bb, qual a melhor acao?`,
      options: [
        { id: 'shove', label: 'Open shove', correct: heroBB <= 12 },
        { id: 'raise', label: 'Raise 2.2x', correct: heroBB > 12 },
      ],
      explanation: heroBB <= 12
        ? `Com ${heroBB}bb, open shove é melhor que min-raise. Se voce raisa e leva 3-bet, vai foldar e perder 2.2bb. Shove maximiza fold equity e evita o squeeze.`
        : `Com ${heroBB}bb, voce ainda tem fold equity pos-3bet. Raise 2.2x permite foldar contra 3-bet sem comprometer todo o stack. Shove seria prematuro.`,
      concept: 'Regra geral: abaixo de 12bb, open shove. 12-20bb, min-raise. A fronteira depende do ante e posicao.',
    }
  },

  // 3. Squeeze spot no late game
  () => {
    const heroBB = randBB(18, 30)
    const hand = pick([...HANDS_STRONG, ...HANDS_MEDIUM])
    const raiserPos = pick(['LJ', 'HJ', 'CO'])
    const callerPos = pick(['BTN', 'CO', 'HJ'].filter(p => p !== raiserPos))
    return {
      situation: `Late game MTT. ${heroBB}bb no SB. ${raiserPos} raisa, ${callerPos} chama. Voce tem ${hand}.`,
      question: 'O que voce faz?',
      options: [
        { id: 'squeeze', label: 'Squeeze (3-bet grande)', correct: true },
        { id: 'call', label: 'Call', correct: false },
      ],
      explanation: `Com dead money do raise + call + blinds + antes, squeeze é muito lucrativo. ${hand} tem equity excelente. O caller tem range cappado (teria 3-betado com premium). Squeezes no late game sao extremamente poderosos.`,
      concept: 'Squeeze no late game: com 18-30bb, 3-bet grande (ou shove). O caller quase nunca tem mao forte.',
    }
  },

  // 4. Chip leader abusando do bubble
  () => {
    const heroBB = randBB(40, 60)
    const hand = pick([...HANDS_WEAK, ...HANDS_MARGINAL, ...HANDS_SUITED_CONNECTORS])
    const heroPos = pick(['CO', 'BTN', 'SB'])
    const playersLeft = pick([12, 15, 18])
    const itm = playersLeft - pick([1, 2, 3])
    return {
      situation: `Late game, perto da bolha. ${playersLeft} restam, pagam ${itm}. Voce é chip leader (${heroBB}bb) no ${heroPos}. Fold ate voce. Voce tem ${hand}.`,
      question: 'O que voce faz?',
      options: [
        { id: 'raise', label: 'Raise (abusar da bolha)', correct: true },
        { id: 'fold', label: 'Fold (esperar)', correct: false },
      ],
      explanation: `Como chip leader perto da bolha, NINGUEM quer confrontar voce. Os stacks medios nao podem arriscar bustar antes do ITM. ${hand} é raise — voce coleta blinds e antes sem resistencia.`,
      concept: 'Chip leaders devem abrir MUITO wide perto da bolha. A pressao ICM faz os outros foldarem demais.',
    }
  },

  // 5. Short stack discipline — fold e espera spot melhor
  () => {
    const heroBB = randBB(5, 8)
    const hand = pick(['J3o', 'T4o', '95o', 'Q2o', '83o', '72o', 'K2o'])
    const heroPos = pick(['UTG', 'LJ', 'HJ'])
    const blindLevel = pick(['500/1000', '600/1200', '800/1600'])
    return {
      situation: `Late game. Blinds ${blindLevel}. Voce tem ${heroBB}bb no ${heroPos} com ${hand}. Falta 1 orbita para os blinds chegarem.`,
      question: 'O que voce faz?',
      options: [
        { id: 'fold', label: 'Fold (esperar melhor spot)', correct: true },
        { id: 'shove', label: 'Shove (desesperado)', correct: false },
      ],
      explanation: `${hand} do ${heroPos} é lixo mesmo com ${heroBB}bb. Voce ainda tem ${heroBB} maos ate bustar pelos blinds. Espere uma mao melhor no CO/BTN/SB onde o range de shove é muito mais amplo. Disciplina > desespero.`,
      concept: 'Nao shove lixo em early position so porque tem poucos BBs. Espere posicao boa — voce tem tempo.',
    }
  },

  // 6. Short stack shove — posicao tardia com mao ok
  () => {
    const heroBB = randBB(5, 9)
    const hand = pick(['A7o', 'K9s', 'QTs', 'A2s', 'K8o', 'J9s', '66', '55'])
    const heroPos = pick(['CO', 'BTN', 'SB'])
    return {
      situation: `Late game. Voce tem ${heroBB}bb no ${heroPos}. Fold ate voce. Voce tem ${hand}.`,
      question: 'O que voce faz?',
      options: [
        { id: 'shove', label: 'Shove all-in', correct: true },
        { id: 'fold', label: 'Fold', correct: false },
      ],
      explanation: `${hand} do ${heroPos} com ${heroBB}bb é shove claro. Dead money dos blinds e antes vale muito em proporcao ao seu stack. Foldar aqui é desperdicar fold equity preciosa.`,
      concept: 'Com 5-9bb em posicao tardia, shove ranges sao MUITO amplos. Nao desperdice fold equity.',
    }
  },

  // 7. Ajuste de range por stack efetivo
  () => {
    const heroBB = randBB(20, 30)
    const villainBB = randBB(8, 12)
    const hand = pick(HANDS_MARGINAL)
    const heroPos = pick(['CO', 'BTN'])
    return {
      situation: `Late game. Voce tem ${heroBB}bb no ${heroPos}. BB tem apenas ${villainBB}bb. Fold ate voce. Voce tem ${hand}.`,
      question: 'Como ajustar seu open?',
      options: [
        { id: 'tighter', label: 'Apertar range — BB pode shove', correct: true },
        { id: 'normal', label: 'Range normal de open', correct: false },
      ],
      explanation: `O BB tem ${villainBB}bb — stack perfeito para resteal shove. Se voce abrir light com ${hand}, ele pode shove e voce tera que foldar. Aperte seu range quando shorts estao nos blinds.`,
      concept: 'Ajuste para short stacks nos blinds: eles vao shove mais. Abra tighter para nao dar fold equity gratis.',
    }
  },

  // 8. Limp-shove trap
  () => {
    const heroBB = randBB(12, 18)
    const hand = pick([...HANDS_PREMIUM, ...HANDS_STRONG.slice(0, 2)])
    const heroPos = 'SB'
    const bbBB = randBB(20, 35)
    return {
      situation: `Late game. Voce tem ${heroBB}bb no SB. BB tem ${bbBB}bb e é agressivo (raisa vs limp 80%+). Voce tem ${hand}.`,
      question: 'Qual a melhor linha?',
      options: [
        { id: 'limp', label: 'Limp → re-shove quando ele raisa', correct: true },
        { id: 'raise', label: 'Raise normal', correct: false },
      ],
      explanation: `Com BB agressivo que raisa 80%+ vs limp, o limp-shove é uma trap perfeita. Voce limpa com ${hand}, ele raisa, voce shova. Ele fica preso com range fraco contra sua mao forte. Ganha mais fichas que um raise direto.`,
      concept: 'Limp-shove: com 12-18bb no SB contra BB agressivo, limpe com premiums para trapear o raise dele.',
    }
  },

  // 9. Final table — adjusting to payouts
  () => {
    const players = pick([6, 7, 8])
    const heroBB = randBB(15, 25)
    const hand = pick(HANDS_MEDIUM)
    const heroPos = pick(['LJ', 'HJ', 'CO'])
    const shortBB = randBB(3, 6)
    return {
      situation: `Mesa final com ${players} jogadores. Short stack tem ${shortBB}bb. Voce tem ${heroBB}bb no ${heroPos} com ${hand}. Fold ate voce.`,
      question: 'O que voce faz?',
      options: [
        { id: 'fold', label: 'Fold (deixar short bustar)', correct: true },
        { id: 'raise', label: 'Raise', correct: false },
      ],
      explanation: `Na FT com short de ${shortBB}bb prestes a bustar, cada eliminacao sobe seu premio. ${hand} do ${heroPos} nao vale o risco — se alguem chamar e voce perder, pode virar o short. Deixe o short bustar.`,
      concept: 'Na FT, deixe shorts bustarem. Cada eliminacao = salto de premiacao garantido sem risco.',
    }
  },

  // 10. Blind vs blind — late game aggression
  () => {
    const heroBB = randBB(15, 25)
    const hand = pick([...HANDS_MARGINAL, ...HANDS_SUITED_CONNECTORS, ...HANDS_WEAK.slice(0, 3)])
    const bbBB = randBB(12, 20)
    return {
      situation: `Late game. Voce tem ${heroBB}bb no SB. Fold ate voce. BB tem ${bbBB}bb. Voce tem ${hand}.`,
      question: 'O que voce faz?',
      options: [
        { id: 'raise', label: 'Raise 2.5x', correct: true },
        { id: 'fold', label: 'Fold', correct: false },
      ],
      explanation: `SB vs BB no late game é o spot mais lucrativo. Com ${heroBB}bb, raise é melhor que limp — voce tem posicao e iniciativa. ${hand} é mais que suficiente. Blinds e antes fazem cada roubo muito valioso.`,
      concept: 'SB vs BB no late game: abra MUITO wide. Antes + blinds = muito dead money pra roubar.',
    }
  },

  // 11. Defending BB vs late position min-raise
  () => {
    const heroBB = randBB(15, 25)
    const hand = pick([...HANDS_MARGINAL, ...HANDS_SUITED_CONNECTORS])
    const vilPos = pick(['CO', 'BTN', 'SB'])
    const vilBB = randBB(20, 40)
    return {
      situation: `Late game. Voce tem ${heroBB}bb no BB. ${vilPos} (${vilBB}bb) faz min-raise. Voce tem ${hand}.`,
      question: 'O que voce faz?',
      options: [
        { id: 'call', label: 'Call (pot odds excelentes)', correct: true },
        { id: 'fold', label: 'Fold', correct: false },
      ],
      explanation: `Min-raise no late game te dá pot odds enormes (~3.5:1 com antes). ${hand} tem equity suficiente para call. Foldar mãos jogaveis vs min-raise é desperdicar dinheiro no late game.`,
      concept: 'Vs min-raise no BB: pot odds sao tao boas que voce deve defender quase tudo jogavel.',
    }
  },

  // 12. Stop and go — short stack pos-flop play
  () => {
    const heroBB = randBB(6, 10)
    const hand = pick(['ATo', 'KJs', 'QTs', 'A8s', 'KQo'])
    const vilPos = pick(['CO', 'BTN'])
    return {
      situation: `Late game. Voce tem ${heroBB}bb no BB. ${vilPos} raisa 2.2x. Voce tem ${hand}. O raise te da pot odds pra call.`,
      question: 'Qual a melhor linha?',
      options: [
        { id: 'stop', label: 'Call pre → shove qualquer flop (stop and go)', correct: true },
        { id: 'shove', label: 'Shove pre-flop', correct: false },
      ],
      explanation: `Stop and go: call pre, shove qualquer flop. Isso é melhor que shove pre porque: (1) se ele errou o flop, folda mesmo com overcards, (2) voce ganha fold equity extra pos-flop. Com ${heroBB}bb, o shove no flop é automatico.`,
      concept: 'Stop and go: call pre → shove flop. Ganha fold equity extra contra maos que erraram o board.',
    }
  },

  // 13. Table dynamics — tight table exploitation
  () => {
    const heroBB = randBB(20, 35)
    const hand = pick([...HANDS_WEAK, ...HANDS_MARGINAL])
    const heroPos = pick(['CO', 'BTN', 'HJ'])
    return {
      situation: `Late game. Mesa muito tight — todos esperando ITM. Voce tem ${heroBB}bb no ${heroPos} com ${hand}. Ninguem abriu nos ultimos 3 orbitas.`,
      question: 'O que voce faz?',
      options: [
        { id: 'raise', label: 'Raise (explorar passividade)', correct: true },
        { id: 'fold', label: 'Fold (seguir o ritmo)', correct: false },
      ],
      explanation: `Mesa tight = oportunidade. Se ninguem esta abrindo, os blinds e antes estao la para serem roubados. ${hand} é mais que suficiente quando a mesa inteira esta jogando scared. Adapte-se!`,
      concept: 'Mesas tight no late game = roubo facil. Enquanto todos esperam ITM, voce acumula fichas.',
    }
  },

  // 14. ICM suicide — avoid flipping
  () => {
    const heroBB = randBB(18, 28)
    const villainBB = randBB(18, 28)
    const hand = pick(['AKo', 'AKs', 'JJ', 'TT'])
    const playersLeft = pick([12, 15, 18])
    const itm = playersLeft - pick([2, 3])
    return {
      situation: `Late game. ${playersLeft} restam, pagam ${itm}. Voce tem ${heroBB}bb. Vilao (${villainBB}bb) shova do CO. Voce esta no BB com ${hand}.`,
      question: 'O que voce faz?',
      options: [
        { id: 'fold', label: 'Fold (evitar flip perto do ITM)', correct: true },
        { id: 'call', label: 'Call (mao boa)', correct: false },
      ],
      explanation: `${hand} tem ~55% de equity contra range de shove — basicamente um flip. Perto do ITM, flip = ICM suicide. Se perder, busto. Se ganhar, ganha fichas que valem menos que o premio garantido. Espere melhor spot.`,
      concept: 'Perto do ITM, evite flips. Ganhar fichas vale menos que garantir premiacao. Busque spots +EV em ICM.',
    }
  },

  // 15. 3-bet shove with medium stack
  () => {
    const heroBB = randBB(14, 20)
    const hand = pick(['AJs', 'ATs', 'KQs', 'TT', '99', 'AQo'])
    const vilPos = pick(['CO', 'BTN', 'HJ'])
    const vilBB = randBB(25, 45)
    return {
      situation: `Late game. Voce tem ${heroBB}bb no BB. ${vilPos} (${vilBB}bb) raisa 2.2x. Voce tem ${hand}.`,
      question: 'O que voce faz?',
      options: [
        { id: 'shove', label: '3-bet shove all-in', correct: true },
        { id: 'call', label: 'Flat call', correct: false },
      ],
      explanation: `Com ${heroBB}bb, 3-bet normal nao faz sentido — voce estaria comprometido. ${hand} é forte o suficiente para 3-bet shove. Voce ganha fold equity + equity quando pago. Flat call desperdiça posicao e iniciativa.`,
      concept: 'Com 14-20bb, nao existe 3-bet light. E shove ou fold. Maos fortes = shove. O resto = fold ou call.',
    }
  },

  // 16. Big blind special — defending wide in late game
  () => {
    const heroBB = randBB(20, 35)
    const hand = pick(['J7s', 'T6s', '85s', '97s', 'Q4s', 'K3s'])
    const vilPos = pick(['BTN', 'SB'])
    const antes = pick([0.1, 0.125])
    return {
      situation: `Late game com antes de ${antes}bb. Voce tem ${heroBB}bb no BB. ${vilPos} faz min-raise. Voce tem ${hand}.`,
      question: 'O que voce faz?',
      options: [
        { id: 'call', label: 'Call (pot odds + antes)', correct: true },
        { id: 'fold', label: 'Fold', correct: false },
      ],
      explanation: `Com antes, o pot pre-flop ja tem ~4bb. Voce precisa investir 1bb para ver o flop. Pot odds de 4:1! ${hand} suited tem potencial de flush/straight. Qualquer mao suited é call aqui.`,
      concept: 'No late game com antes, BB defende MUITO wide vs min-raise. Pot odds de 3.5-4:1 justificam quase tudo.',
    }
  },
]

function generateScenario() {
  return pick(TEMPLATES)()
}

function Lesson({ onComplete }) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        Late Game MTT
      </h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Dominando os momentos decisivos do torneio — quando blinds sao altos e stacks sao curtos</p>

      <div className="space-y-4">
        <Section title="O Que e Late Game?">
          Late game comeca quando os <strong style={{ color: '#e5484d' }}>blinds ficam grandes</strong> em relacao aos stacks. Tipicamente quando o stack medio cai para 15-25bb.
          <br /><br />
          Nessa fase, decisoes pre-flop dominam. A maioria das maos nao chega ao flop. <strong style={{ color: '#f5a623' }}>Fold equity, posicao e timing</strong> valem mais que a forca da sua mao.
        </Section>

        <Section title="Stack Zones">
          <div className="space-y-2">
            {[
              { range: '25-40bb', label: 'Open-raise normal', desc: 'Raise 2-2.5x. Pode 3-bet normal. Pos-flop existe.', color: '#4fce82' },
              { range: '15-25bb', label: 'Raise or shove', desc: 'Open raise, mas 3-bet = shove. Sem flat call de 3-bet.', color: '#f5a623' },
              { range: '10-15bb', label: 'Shove or fold', desc: 'Open shove da maioria das posicoes. Min-raise so em posicao com reads.', color: '#e5484d' },
              { range: '5-10bb', label: 'Desperate shove', desc: 'Shove qualquer mao decente. Fold equity diminuindo a cada mao.', color: '#e5484d' },
            ].map(z => (
              <div key={z.range} className="flex gap-3 items-start rounded-lg p-3" style={{ background: '#0f0f0f' }}>
                <div style={{ minWidth: 70 }}>
                  <span style={{ color: z.color, fontWeight: 700, fontSize: 14 }}>{z.range}</span>
                </div>
                <div>
                  <div style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>{z.label}</div>
                  <div style={{ color: '#888', fontSize: 12 }}>{z.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Conceitos-Chave do Late Game">
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #e5484d' }}>
              <div style={{ color: '#e5484d', fontWeight: 700, fontSize: 13 }}>Fold Equity</div>
              <div style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>Com stacks curtos, fazer o oponente foldar vale mais que a mao em si. Timing e posicao sao tudo.</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #f5a623' }}>
              <div style={{ color: '#f5a623', fontWeight: 700, fontSize: 13 }}>Dead Money</div>
              <div style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>Antes + blinds = pot gordo. Roubar 1x por orbita mantem seu stack vivo sem showdown.</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #4a90e2' }}>
              <div style={{ color: '#4a90e2', fontWeight: 700, fontSize: 13 }}>Resteal</div>
              <div style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>3-bet shove contra opens late. O raiser abriu light e vai foldar a maioria do range.</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #4fce82' }}>
              <div style={{ color: '#4fce82', fontWeight: 700, fontSize: 13 }}>Stop and Go</div>
              <div style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>Call pre, shove qualquer flop. Ganha fold equity extra quando oponente erra o board.</div>
            </div>
          </div>
        </Section>

        <Section title="Erros Comuns no Late Game">
          <div className="space-y-2">
            {[
              { err: 'Min-raise com 8bb', fix: 'Shove. Min-raise + fold ao 3-bet = fichas jogadas fora.' },
              { err: 'Foldar A7o do BTN com 7bb', fix: 'Shove. Qualquer Ax, Kx suited, par é shove em late position.' },
              { err: 'Flat call de 3-bet com 18bb', fix: 'Shove ou fold. Flat call te deixa sem fold equity no flop.' },
              { err: 'Abrir muito tight esperando maos boas', fix: 'Blinds comem seu stack. Roube antes com range amplo.' },
              { err: 'Chamar flip perto do ITM', fix: 'Evite flips. ICM torna ganhar fichas menos valioso que sobreviver.' },
            ].map((e, i) => (
              <div key={i} className="rounded-lg p-3" style={{ background: '#0f0f0f' }}>
                <div style={{ color: '#e5484d', fontSize: 13, fontWeight: 600 }}>{e.err}</div>
                <div style={{ color: '#4fce82', fontSize: 12, marginTop: 2 }}>{e.fix}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Regras Praticas">
          <div className="space-y-2">
            {[
              'Abaixo de 12bb: shove ou fold (nunca min-raise)',
              '12-20bb: raise 2.2x, mas 3-bet = shove',
              'Roube blinds/antes pelo menos 1x por orbita',
              'Contra min-raise no BB: defenda MUITO wide (pot odds excelentes)',
              'Posicao > forca da mao no late game',
              'Ajuste para short stacks nos blinds (eles vao shove)',
              'Limp-shove no SB com premiums contra BB agressivo',
              'Stop and go com 6-10bb quando pot odds justificam call pre',
            ].map((r, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span style={{ color: '#f5a623' }}>•</span>
                <span style={{ color: '#ccc', fontSize: 14 }}>{r}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <button onClick={onComplete} className="w-full mt-8 py-4 rounded-xl font-bold text-white text-lg" style={{ background: '#e5484d' }}>
        Entendi — Quero Treinar
      </button>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
      <h3 style={{ color: 'white', fontWeight: 600, marginBottom: 8 }}>{title}</h3>
      <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>{children}</div>
    </div>
  )
}

function Trainer() {
  const { recordAnswer, recordSession } = useProgress()
  const [scenario, setScenario] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [sessionDone, setSessionDone] = useState(false)

  function newScenario() {
    if (sessionTotal >= 10) { setSessionDone(true); return }
    setScenario(generateScenario())
    setFeedback(null)
  }

  function answer(optionId) {
    if (!scenario || feedback) return
    const chosen = scenario.options.find(o => o.id === optionId)
    const isCorrect = chosen.correct
    const newStreak = isCorrect ? streak + 1 : 0
    setStreak(newStreak)
    const newTotal = sessionTotal + 1, newCorrect = sessionCorrect + (isCorrect ? 1 : 0)
    setSessionTotal(newTotal); setSessionCorrect(newCorrect)
    recordAnswer(21, isCorrect, newStreak)
    const isLast = newTotal >= 10
    if (isLast) recordSession(21, Math.round((newCorrect / newTotal) * 100))
    setFeedback({ isCorrect, explanation: scenario.explanation, concept: scenario.concept, correctLabel: scenario.options.find(o => o.correct).label, isLast })
  }

  function restart() { setSessionCorrect(0); setSessionTotal(0); setStreak(0); setSessionDone(false); setFeedback(null); setScenario(null) }

  if (!scenario && !sessionDone) newScenario()

  if (sessionDone) {
    const acc = Math.round((sessionCorrect / sessionTotal) * 100)
    return (
      <div className="text-center" style={{ maxWidth: 400, margin: '0 auto', paddingTop: 40 }}>
        <div style={{ fontSize: 60 }}>{acc >= 90 ? '🎉' : '💪'}</div>
        <h2 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginTop: 16 }}>Sessao Completa!</h2>
        <div style={{ color: acc >= 90 ? '#4fce82' : '#f5a623', fontSize: 36, fontWeight: 700 }}>{acc}%</div>
        <button onClick={restart} className="mt-6 px-8 py-3 rounded-xl font-bold" style={{ background: '#e5484d', color: 'white' }}>Nova Sessao</button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <div className="rounded-xl p-3 mb-4 flex justify-between" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
        <div style={{ color: '#888', fontSize: 13 }}>Sessao: {sessionCorrect}/{sessionTotal} · Seq: {streak}</div>
        <div style={{ color: '#888', fontSize: 13 }}>Meta: 10 cenarios</div>
      </div>
      <div className="rounded-full h-2 mb-6" style={{ background: '#2a2a2e' }}>
        <div className="rounded-full h-2 transition-all" style={{ width: `${(sessionTotal / 10) * 100}%`, background: '#e5484d' }} />
      </div>

      {scenario && (
        <>
          <div className="rounded-xl p-4 mb-4" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
            <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>LATE GAME MTT</div>
            <div style={{ color: '#ccc', fontSize: 15, lineHeight: 1.7 }}>{scenario.situation}</div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 16, marginTop: 12 }}>{scenario.question}</div>
          </div>

          {!feedback && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {scenario.options.map(opt => (
                <button key={opt.id} onClick={() => answer(opt.id)} className="py-4 rounded-xl font-bold text-sm"
                  style={{ background: opt.id === 'fold' || opt.id === 'call' || opt.id === 'stop' ? '#4a90e2' : '#f5a623', color: opt.id === 'fold' || opt.id === 'call' || opt.id === 'stop' ? 'white' : '#0f0f0f' }}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {feedback && (
            <div className="rounded-xl p-4 mb-4" style={{ background: '#1a1a1d', border: `2px solid ${feedback.isCorrect ? '#4fce82' : '#e5484d'}` }}>
              <div style={{ color: feedback.isCorrect ? '#4fce82' : '#e5484d', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
                {feedback.isCorrect ? 'Correto!' : 'Incorreto'}
              </div>
              <button onClick={newScenario} className="w-full py-3 rounded-lg font-semibold mb-4" style={{ background: '#e5484d', color: 'white', fontSize: 16 }}>Proximo Cenario</button>
              <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>{feedback.explanation}</div>
              <div className="mt-3 rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #f5a62330' }}>
                <div style={{ color: '#f5a623', fontWeight: 600, fontSize: 13 }}>Conceito-chave</div>
                <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>{feedback.concept}</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function Module21() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[21]?.lessonRead ? 'trainer' : 'lesson')
  if (!progress.modules[21]?.unlocked) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f0f' }}>
      <div className="text-center"><div style={{ fontSize: 60 }}>🔒</div><h2 style={{ color: 'white', marginTop: 16 }}>Modulo Bloqueado</h2><p style={{ color: '#888', marginTop: 8 }}>Complete o Modulo 20 para desbloquear.</p></div>
    </div>
  )
  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0f0f0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setView('lesson')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'lesson' ? '#e5484d' : '#1a1a1d', color: view === 'lesson' ? 'white' : '#888', border: '1px solid #2a2a2e' }}>Aula</button>
          <button onClick={() => progress.modules[21]?.lessonRead && setView('trainer')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'trainer' ? '#e5484d' : '#1a1a1d', color: view === 'trainer' ? 'white' : (progress.modules[21]?.lessonRead ? '#888' : '#444'), border: '1px solid #2a2a2e', cursor: progress.modules[21]?.lessonRead ? 'pointer' : 'not-allowed' }}>Trainer {!progress.modules[21]?.lessonRead && '🔒'}</button>
        </div>
        {view === 'lesson' ? <Lesson onComplete={() => { markLessonRead(21); setView('trainer') }} /> : <Trainer />}
      </div>
    </div>
  )
}
