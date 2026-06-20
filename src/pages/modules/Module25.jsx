import { useState, useCallback } from 'react'
import SessionReview from '../../components/SessionReview'
import { useProgress } from '../../context/ProgressContext'
import DecisionTree from '../../components/DecisionTree'
import ModulePokerTable from '../../components/ModulePokerTable'

const SUITS_POOL = ['s','h','d','c']
function randSuit() { return SUITS_POOL[Math.floor(Math.random() * 4)] }
function randSuitExcluding(s) { const o = SUITS_POOL.filter(x => x !== s); return o[Math.floor(Math.random() * o.length)] }
function makeRainbowBoard(ranks) {
  const used = new Set()
  return ranks.map(r => { let s; do { s = randSuit() } while (used.has(s) && used.size < 4); used.add(s); return r + s })
}
function makeHeroCards(r1, r2, suited) { const s1 = randSuit(); return [r1 + s1, r2 + (suited ? s1 : randSuitExcluding(s1))] }

// ================================================================
// MODULO 25 — Multistreet Planning
// ================================================================

const SCENARIOS = [
  () => ({
    q: 'Flop K-9-4 rainbow. Voce IP com AKo (TPTK). Fez c-bet 50%. Vilao call. Turn: 2h. O que fazer?',
    a: 'Bet turn (double barrel — mao forte, quer valor de Kx piores e 9x)',
    b: 'Check (pot control)',
    aCorrect: true,
    explanation: 'AK em K-9-4-2 e muito forte. O 2 e um blank que nao muda nada. Plano de 3 streets: bet flop, bet turn por valor, e avaliar river. Kx piores e 9x vao pagar turn.',
    boardCards: [...makeRainbowBoard(['K','9','4']), '2h'], heroCards: makeHeroCards('A','K',false), heroPos: 'BTN', villainPos: 'BB', villainAction: 'Call', potLabel: '13bb',
  }),
  () => {
    const fs = randSuit()
    return {
      q: 'Voce bettou flop com 87s (flush draw + gutshot) em board T-6-2 com 2 copas. Turn: Kh (sem copa). O que fazer?',
      a: 'Bet turn (barrel com equity + carta de scare)',
      b: 'Give up (check/fold)',
      aCorrect: true,
      explanation: 'O K no turn e uma scare card otima. Vilao vai foldar muitas maos medianas (7x, 8x, underpairs). Voce ainda tem flush draw + gutshot como backup. Double barrel e o plano correto.',
      boardCards: ['Tc', '6c', '2'+randSuitExcluding('c'), 'Kh'], heroCards: ['8c', '7c'], heroPos: 'BTN', villainPos: 'BB', villainAction: 'Call', potLabel: '15bb',
    }
  },
  () => ({
    q: 'Voce fez c-bet no flop A-7-3 com QQ. Vilao call. Turn: A. O que fazer?',
    a: 'Check (A no turn faz vilao ter mais trips, seu QQ piorou muito)',
    b: 'Bet (representar o A)',
    aCorrect: true,
    explanation: 'O A no turn e terrivel pra QQ. Agora qualquer Ax do vilao (que pagou flop) te tem dominado. Pot control e o plano: check turn, possivelmente call river se sizing for pequeno.',
    boardCards: [...makeRainbowBoard(['A','7','3']), 'A'+randSuit()], heroCards: makeHeroCards('Q','Q',false), heroPos: 'CO', villainPos: 'BB', villainAction: 'Call', potLabel: '14bb',
  }),
  () => ({
    q: 'Plano de 3 streets com AA em board J-7-2 rainbow (SPR ~10). Qual o plano correto?',
    a: 'Bet flop medio, bet turn medio, bet river por valor',
    b: 'Bet flop grande, check turn (trap), bet river',
    aCorrect: true,
    explanation: 'AA em board seco com SPR ~10 quer 3 streets de valor. O plano: bet 50-60% flop, 60-70% turn, 60-75% river. Nao precisa de check turn — voce quer construir o pote gradualmente.',
    boardCards: makeRainbowBoard(['J','7','2']), heroCards: makeHeroCards('A','A',false), heroPos: 'BTN', villainPos: 'BB', villainAction: 'Call', potLabel: '6.5bb',
  }),
  () => ({
    q: 'Voce bettou flop e turn com Ah5h (nut flush draw) em board K-8-3-6 com 2 copas. River: 2d (nao fecha). O que fazer?',
    a: 'Bluff river (triple barrel — contou uma historia consistente)',
    b: 'Give up (draw nao fechou)',
    aCorrect: true,
    explanation: 'Voce representou mao forte em 2 streets. O river nao muda nada. Vilao vai foldar maos medianas (8x, 99-QQ) que sobreviveram ate aqui. O triple barrel e o final logico do plano.',
    boardCards: ['Kh', '8h', '3s', '6d', '2d'], heroCards: ['Ah', '5h'], heroPos: 'BTN', villainPos: 'BB', villainAction: 'Call', potLabel: '35bb',
  }),
  () => ({
    q: 'Voce checkou flop como caller em board Q-J-5. Vilao bettou, voce call com T9s (OESD). Turn: 3. Vilao betta de novo. Plano?',
    a: 'Call turn (odds de draw), avaliar river',
    b: 'Raise turn (semi-bluff)',
    aCorrect: true,
    explanation: 'Com OESD (8 outs) no turn, voce tem ~16% pra fechar. Se esta recebendo odds (bet sizing < 75%), call e correto. Raise e muito agressivo — voce estaria committed sem a melhor mao. Call e avaliar river.',
    boardCards: [...makeRainbowBoard(['Q','J','5']), '3'+randSuit()], heroCards: makeHeroCards('T','9',true), heroPos: 'BB', villainPos: 'BTN', villainAction: 'Bet 66%', potLabel: '18bb',
  }),
  () => {
    const fs = randSuit()
    return {
      q: 'Voce tem set de 7 no flop 7-6-5 com flush draw. Qual o plano multistreet?',
      a: 'Raise/bet grande flop, bet grande turn pra proteger de draws',
      b: 'Slowplay: check flop, check-raise turn',
      aCorrect: true,
      explanation: 'Board ultra-umido (flush draw + straight draw). Set DEVE apostar grande ou raise no flop. Draws tem ~35-45% equity aqui. Protecao e urgente. Plano: bet/raise flop grande, bet turn grande, shove river se necessario.',
      boardCards: ['7'+fs, '6'+fs, '5'+randSuitExcluding(fs)], heroCards: ['7'+randSuitExcluding(fs), '7'+randSuitExcluding(fs)], heroPos: 'BTN', villainPos: 'BB', villainAction: 'Bet 50%', potLabel: '7bb',
    }
  },
  () => ({
    q: 'Board A-K-8-4. Voce IP bettou flop com JTs (gutshot + backdoor). Turn completou nada. Qual a decisao key?',
    a: 'Check turn (conservar fichas, mao nao melhorou)',
    b: 'Barrel turn (manter pressao)',
    aCorrect: true,
    explanation: 'JTs perdeu as backdoor draws. No turn A-K-8-4 voce so tem gutshot (4 outs). Nao vale a pena investir mais. O plano correto e: bet flop (semi-bluff com equity), check turn (desistir), talvez bluff river se fizer sentido.',
    boardCards: makeRainbowBoard(['A','K','8','4']), heroCards: makeHeroCards('J','T',true), heroPos: 'BTN', villainPos: 'BB', villainAction: 'Call', potLabel: '14bb',
  }),
  () => ({
    q: 'Conceito: por que planejar as 3 streets ANTES de apostar no flop?',
    a: 'Pra saber se sua mao aguenta 3 streets de valor ou se deve desacelerar',
    b: 'Pra intimidar o vilao desde o inicio',
    aCorrect: true,
    explanation: 'Multistreet planning evita situacoes onde voce aposta no flop sem saber o que fazer no turn. Se sua mao so aguenta 2 streets de valor (ex: top pair kicker medio), voce ja sabe que vai check um street.',
    boardCards: makeRainbowBoard(['Q','8','3']), heroCards: makeHeroCards('A','Q',false), heroPos: 'BTN', villainPos: 'BB', villainAction: 'Call', potLabel: '7bb',
  }),
  () => ({
    q: 'Voce tem KK em board 8-5-2. Bettou flop, bettou turn (4). River: A. O que fazer?',
    a: 'Check (A no river e terrivel — vilao que pagou 2 streets pode ter Ax)',
    b: 'Bet (river de valor, KK ainda e forte)',
    aCorrect: true,
    explanation: 'KK planejou 3 streets de valor em board 8-5-2, mas o A no river muda tudo. Vilao que pagou flop e turn com Ax agora te tem dominado. Check e correto — nao transforma mao de valor em bluff.',
    boardCards: [...makeRainbowBoard(['8','5','2']), '4'+randSuit(), 'A'+randSuit()], heroCards: makeHeroCards('K','K',false), heroPos: 'BTN', villainPos: 'BB', villainAction: 'Check', potLabel: '40bb',
  }),
  () => ({
    q: 'Turn: voce bettou flop e turn com par de As em board A-T-6-3. River: T (pareia o board). Qual a decisao?',
    a: 'Bet river por valor (vilao raramente tem TT, voce tem full house)',
    b: 'Check (medo de trips de T)',
    aCorrect: true,
    explanation: 'O T no river pareia, mas voce tem AA com full house (AA sobre TT). Vilao quase nunca tem TT (teria raisado pre ou no flop geralmente). Continue o plano de 3 streets de valor — maos como KT, QT vao pagar.',
    boardCards: [...makeRainbowBoard(['A','T','6']), '3'+randSuit(), 'T'+randSuit()], heroCards: makeHeroCards('A','K',false), heroPos: 'BTN', villainPos: 'BB', villainAction: 'Call', potLabel: '45bb',
  }),
  () => ({
    q: 'Conceito de "check-raise turn" como plano. Quando e correto?',
    a: 'Com maos muito fortes OOP que querem construir pote grande rapidamente',
    b: 'Sempre que temos set ou melhor',
    aCorrect: true,
    explanation: 'Check-raise turn e um plano especifico: check flop (trap), call ou check, e entao check-raise turn pra construir pote enorme. Funciona com sets/straights OOP contra vilao agressivo que vai bet 2 streets.',
    boardCards: [...makeRainbowBoard(['9','7','3']), '2'+randSuit()], heroCards: ['9'+randSuit(), '9'+randSuit()], heroPos: 'BB', villainPos: 'BTN', villainAction: 'Bet 66%', potLabel: '14bb',
  }),
  () => ({
    q: 'Voce tem JJ em board Q-7-3 rainbow. Bettou flop. Turn: K. Plano?',
    a: 'Check turn (2 overcards no board, JJ perdeu muito valor)',
    b: 'Bet turn (JJ ainda e overpair ao 7 e 3)',
    aCorrect: true,
    explanation: 'JJ em Q-7-3-K tem DUAS overcards no board. Qualquer Qx ou Kx te domina. O plano muda: bet flop por valor/protecao, check turn (pot control), fold ou call river dependendo do sizing.',
    boardCards: [...makeRainbowBoard(['Q','7','3']), 'K'+randSuit()], heroCards: makeHeroCards('J','J',false), heroPos: 'CO', villainPos: 'BB', villainAction: 'Call', potLabel: '14bb',
  }),
  () => ({
    q: 'Regra de ouro para decidir quantas streets apostar por valor:',
    a: 'Pergunte: "quais maos piores me pagam?" — se a resposta e poucas, reduza streets',
    b: 'Sempre aposte 3 streets com top pair ou melhor',
    aCorrect: true,
    explanation: 'A pergunta-chave e "quais maos piores me chamam?". TPTK (como AK em A-high board) pode apostar 3 streets porque Ax piores, Kx, e draws pagam. Mas top pair kicker fraco so aguenta 1-2 streets.',
    boardCards: makeRainbowBoard(['A','9','4']), heroCards: makeHeroCards('A','K',false), heroPos: 'BTN', villainPos: 'BB', villainAction: 'Call', potLabel: '7bb',
  }),
]

function generateScenario() {
  const pick = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)]
  const t = typeof pick === 'function' ? pick() : pick
  const swap = Math.random() > 0.5
  const opts = swap
    ? [{ id: 'a', label: t.b, correct: !t.aCorrect }, { id: 'b', label: t.a, correct: t.aCorrect }]
    : [{ id: 'a', label: t.a, correct: t.aCorrect }, { id: 'b', label: t.b, correct: !t.aCorrect }]
  return { question: t.q, options: opts, explanation: t.explanation, heroCards: t.heroCards, boardCards: t.boardCards, heroPos: t.heroPos, villainPos: t.villainPos, villainAction: t.villainAction, potLabel: t.potLabel }
}

// AULA
function Lesson({ onComplete }) {
  const [section, setSection] = useState(0)

  const sections = [
    {
      title: 'O que e Multistreet',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            <strong style={{ color: '#4fce82' }}>Multistreet Planning</strong> e pensar as 3 streets (flop, turn, river)
            ANTES de fazer sua primeira aposta. Em vez de decidir "o que faco agora?", voce planeja:
          </p>
          <div className="space-y-2 mb-4">
            {[
              { street: 'Flop', question: 'Minha mao merece apostar? Quantas streets de valor?' },
              { street: 'Turn', question: 'Quais cartas sao boas pra continuar? Quais me fazem parar?' },
              { street: 'River', question: 'Vou por valor, bluff, ou check? Como termino a mao?' },
            ].map((item, i) => (
              <div key={i} className="rounded-lg px-3 py-2.5" style={{ background: '#222225' }}>
                <div style={{ color: '#4fce82', fontSize: 13, fontWeight: 600 }}>{item.street}</div>
                <div style={{ color: '#b3b3b8', fontSize: 12 }}>{item.question}</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg p-4" style={{ background: 'rgba(79,206,130,0.08)', border: '1px solid rgba(79,206,130,0.2)' }}>
            <div style={{ color: '#4fce82', fontSize: 13, fontWeight: 600 }}>
              A pergunta-chave: "quais maos piores me pagam em cada street?"
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Streets de Valor',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            Nem toda mao forte merece 3 streets de valor. A regra:
          </p>
          <div className="rounded-lg overflow-hidden mb-4" style={{ border: '1px solid #2a2a2e' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#222225' }}>
                  <th style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>Mao</th>
                  <th style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>Streets</th>
                  <th style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>Por que</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Sets, straights, flushes', '3', 'Maos muito fortes, muitas piores pagam'],
                  ['TPTK (ex: AK em A-high)', '2-3', 'Forte mas depende do runout'],
                  ['Top pair kicker medio', '1-2', 'Poucas maos piores pagam 3 streets'],
                  ['Middle pair, bottom pair', '0-1', 'Check ou 1 bet fino de protecao'],
                ].map(([mao, streets, pq], i) => (
                  <tr key={i} style={{ borderTop: '1px solid #2a2a2e' }}>
                    <td style={{ color: '#fdfdfd', fontSize: 12, padding: '8px 12px' }}>{mao}</td>
                    <td style={{ color: '#4fce82', fontSize: 12, padding: '8px 12px', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{streets}</td>
                    <td style={{ color: '#676671', fontSize: 11, padding: '8px 12px' }}>{pq}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
    {
      title: 'Cartas que Mudam Planos',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            O plano muda conforme as cartas caem. Tipos de turn/river cards:
          </p>
          <div className="space-y-2 mb-4">
            {[
              { card: 'Blank (ex: 2, 3 off)', effect: 'Nao muda nada — continue o plano original', color: '#4fce82' },
              { card: 'Scare card (A, K)', effect: 'Overcards que podem dar top pair ao vilao — reavalie', color: '#f5a623' },
              { card: 'Draw completa (flush/straight)', effect: 'Perigo! Pot control se nao tiver nuts', color: '#e5484d' },
              { card: 'Board pareia', effect: 'Muda dinamica — quem tem full house?', color: '#e5484d' },
            ].map((item, i) => (
              <div key={i} className="rounded-lg px-3 py-2.5" style={{ background: '#222225' }}>
                <div style={{ color: item.color, fontSize: 13, fontWeight: 600 }}>{item.card}</div>
                <div style={{ color: '#b3b3b8', fontSize: 12 }}>{item.effect}</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg p-4" style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)' }}>
            <div style={{ color: '#f5a623', fontSize: 13, fontWeight: 600 }}>
              Bons jogadores ajustam o plano conforme as cartas caem — ruins seguem no piloto automatico
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Triple Barrel e Give Up',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            Duas situacoes extremas do multistreet planning:
          </p>
          <div className="rounded-lg p-4 mb-3" style={{ background: 'rgba(229,72,77,0.08)', border: '1px solid rgba(229,72,77,0.2)' }}>
            <div style={{ color: '#e5484d', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Triple Barrel (bet 3 streets)</div>
            <div style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 1.7 }}>
              Apostar flop, turn E river. Funciona com:<br/>
              - Maos muito fortes (valor em 3 streets)<br/>
              - Bluffs que contam historia consistente (representando nuts)
            </div>
          </div>
          <div className="rounded-lg p-4 mb-4" style={{ background: 'rgba(79,206,130,0.08)', border: '1px solid rgba(79,206,130,0.2)' }}>
            <div style={{ color: '#4fce82', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Give Up (desistir)</div>
            <div style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 1.7 }}>
              Parar de apostar quando:<br/>
              - Draw nao melhorou e nao tem fold equity<br/>
              - Carta ruim caiu e a historia nao faz sentido<br/>
              - Vilao mostra forca (raise, call rapido)
            </div>
          </div>
          <button onClick={onComplete}
            style={{
              width: '100%', padding: '14px', borderRadius: 8, marginTop: 8,
              background: '#4fce82', border: 'none', color: '#0f0f0f',
              fontWeight: 600, fontSize: 15, cursor: 'pointer',
            }}>
            Comecar a treinar
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-16" style={{ background: '#0f0f0f' }}>
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="rounded-2xl p-6" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
          <h1 style={{ color: '#fdfdfd', fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
            Modulo 25 - Multistreet Planning
          </h1>
          <p style={{ color: '#676671', fontSize: 13, marginBottom: 20 }}>
            Planeje flop + turn + river antes de agir
          </p>

          <div className="flex gap-1 mb-6 overflow-x-auto">
            {sections.map((s, i) => (
              <button key={i} onClick={() => setSection(i)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
                style={{
                  background: section === i ? 'rgba(10,132,215,0.12)' : 'transparent',
                  color: section === i ? '#0a84d7' : '#676671',
                  border: `1px solid ${section === i ? '#0a84d7' : 'transparent'}`,
                }}>
                {s.title}
              </button>
            ))}
          </div>

          <h2 style={{ color: '#fdfdfd', fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
            {sections[section].title}
          </h2>
          {sections[section].content}

          {section < sections.length - 1 && (
            <button onClick={() => setSection(section + 1)}
              style={{
                width: '100%', padding: '12px', borderRadius: 8, marginTop: 16,
                background: '#2a2a2e', border: 'none', color: '#fdfdfd',
                fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}>
              Proximo &rsaquo;
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// TRAINER
function Trainer() {
  const { recordAnswer, recordSession, getModuleProgress } = useProgress()
  const progress = getModuleProgress(25)

  const [scenario, setScenario] = useState(() => generateScenario())
  const [result, setResult] = useState(null)
  const [handNum, setHandNum] = useState(0)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [streak, setStreak] = useState(0)
  const [showReview, setShowReview] = useState(false)

  const handleAnswer = useCallback((optionId) => {
    if (result) return
    const chosen = scenario.options.find(o => o.id === optionId)
    const isCorrect = chosen?.correct || false
    const newStreak = isCorrect ? streak + 1 : 0
    setStreak(newStreak)
    if (isCorrect) setSessionCorrect(s => s + 1)
    recordAnswer(25, isCorrect, newStreak, { tp: 'msp' })
    setResult({ isCorrect, explanation: scenario.explanation, chosenId: optionId })
  }, [result, scenario, streak, recordAnswer])

  const handleNext = useCallback(() => {
    const nextHand = handNum + 1
    if (nextHand >= 10) {
      const accuracy = Math.round((sessionCorrect / 10) * 100)
      recordSession(25, accuracy)
      setShowReview(true)
    } else {
      setHandNum(nextHand)
    }
    setResult(null)
    setScenario(generateScenario())
  }, [handNum, sessionCorrect, recordSession])

  const acc = progress.totalAnswered > 0 ? progress.accuracy : 0

  if (showReview) {
    return <SessionReview moduleId={25} sessionCorrect={sessionCorrect} sessionTotal={10} onContinue={() => { setHandNum(0); setSessionCorrect(0); setShowReview(false); setStreak(0) }} />
  }

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-16" style={{ background: '#0f0f0f' }}>
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { label: 'Sessao', value: `${handNum}/10`, color: '#e5484d' },
            { label: 'Precisao', value: `${acc}%`, color: '#4fce82' },
            { label: 'Streak', value: streak, color: '#f5a623' },
          ].map((s, i) => (
            <div key={i} className="rounded-lg p-2.5 text-center" style={{ background: '#1a1a1d' }}>
              <div style={{ color: '#676671', fontSize: 10, marginBottom: 2 }}>{s.label}</div>
              <div style={{ color: s.color, fontSize: 18, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl p-5" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
          {scenario.heroCards && scenario.heroCards.length > 0 && (
            <ModulePokerTable
              heroPos={scenario.heroPos || 'BTN'}
              villainPos={scenario.villainPos || 'BB'}
              heroCards={scenario.heroCards}
              boardCards={scenario.boardCards || []}
              villainAction={scenario.villainAction || ''}
              potLabel={scenario.potLabel || ''}
              contextTitle="Multistreet Planning"
              contextDesc=""
            />
          )}

          <div style={{ color: '#fdfdfd', fontSize: 15, lineHeight: 1.7, marginBottom: 20 }}>
            {scenario.question}
          </div>

          <div className="space-y-2">
            {scenario.options.map(opt => {
              let bg = '#2a2a2e'
              let border = '#2a2a2e'
              if (result) {
                if (opt.correct) { bg = 'rgba(79,206,130,0.12)'; border = '#4fce82' }
                else if (opt.id === result.chosenId) { bg = 'rgba(229,72,77,0.12)'; border = '#e5484d' }
              }
              return (
                <button key={opt.id} onClick={() => handleAnswer(opt.id)}
                  disabled={!!result}
                  className="w-full text-left rounded-xl px-4 py-3"
                  style={{ background: bg, border: `1px solid ${border}`, color: '#fdfdfd', fontSize: 13, lineHeight: 1.5, cursor: result ? 'default' : 'pointer' }}>
                  {opt.label}
                </button>
              )
            })}
          </div>

          {result && (
            <div className="mt-4">
              <div className="rounded-lg p-3 mb-3" style={{
                background: result.isCorrect ? 'rgba(79,206,130,0.08)' : 'rgba(229,72,77,0.08)',
                border: `1px solid ${result.isCorrect ? 'rgba(79,206,130,0.2)' : 'rgba(229,72,77,0.2)'}`,
              }}>
                <div style={{ color: result.isCorrect ? '#4fce82' : '#e5484d', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
                  {result.isCorrect ? 'Correto!' : 'Errado'}
                </div>
                <div style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 1.6 }}>{result.explanation}</div>
                {!result.isCorrect && <DecisionTree scenario={{ ...scenario, moduleId: 25 }} result={result} />}
              </div>
              <button onClick={handleNext}
                style={{
                  width: '100%', padding: '12px', borderRadius: 8,
                  background: '#4fce82', border: 'none', color: '#0f0f0f',
                  fontWeight: 600, fontSize: 14, cursor: 'pointer',
                }}>
                {handNum >= 9 ? 'Finalizar Sessao' : 'Proxima'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Module25() {
  const { progress, markLessonRead, getModuleProgress } = useProgress()
  const mod = progress.modules[25]
  const modProgress = getModuleProgress(25)
  const [view, setView] = useState(modProgress.lessonRead ? 'trainer' : 'lesson')

  if (!mod?.unlocked) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f0f' }}>
      <div className="text-center"><div style={{ fontSize: 60 }}>🔒</div><h2 style={{ color: 'white', marginTop: 16 }}>Modulo Bloqueado</h2><p style={{ color: '#888', marginTop: 8 }}>Complete o modulo anterior para desbloquear.</p></div>
    </div>
  )
  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0f0f0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setView('lesson')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'lesson' ? '#e5484d' : '#1a1a1d', color: view === 'lesson' ? 'white' : '#888', border: '1px solid #2a2a2e' }}>Aula</button>
          <button onClick={() => modProgress.lessonRead && setView('trainer')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'trainer' ? '#e5484d' : '#1a1a1d', color: view === 'trainer' ? 'white' : (modProgress.lessonRead ? '#888' : '#444'), border: '1px solid #2a2a2e', cursor: modProgress.lessonRead ? 'pointer' : 'not-allowed' }}>Trainer {!modProgress.lessonRead && '🔒'}</button>
        </div>
        {view === 'lesson' ? <Lesson onComplete={() => { markLessonRead(25); setView('trainer') }} /> : <Trainer />}
      </div>
    </div>
  )
}
