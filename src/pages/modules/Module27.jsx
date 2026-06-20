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
// MODULO 27 — Blocker Effects Avancados
// ================================================================

const SCENARIOS = [
  // Blockers pra blefe
  () => {
    const fs = randSuit()
    return {
      q: `River em board K-Q-7-4-2 com 3 ${fs === 'h' ? 'copas' : fs === 'd' ? 'ouros' : fs === 'c' ? 'paus' : 'espadas'}. Voce tem A${fs} (blocker do nut flush) sem par. Blefar?`,
      a: 'Sim — voce bloqueia o nut flush, vilao raramente tem nuts',
      b: 'Nao — voce nao tem nada',
      aCorrect: true,
      explanation: `Ter o A${fs} bloqueia o nut flush do vilao. Ele nao pode ter a melhor mao possivel. Isso faz seu blefe mais credivel e reduz a chance dele chamar. Blocker de nuts = otimo bluff candidate.`,
      boardCards: ['K'+fs, 'Q'+fs, '7'+fs, '4'+randSuitExcluding(fs), '2'+randSuitExcluding(fs)], heroCards: ['A'+fs, '3'+randSuitExcluding(fs)], heroPos: 'BTN', villainPos: 'BB', villainAction: 'Check', potLabel: '25bb',
    }
  },
  () => ({
    q: 'River em board A-K-8-5-3 rainbow. Voce tem KK. Vilao betta grande. O que seus blockers dizem?',
    a: 'Voce bloqueia KK mas NAO bloqueia AA, AK, sets — call e ruim',
    b: 'KK e forte, sempre call',
    aCorrect: true,
    explanation: 'Seus KK bloqueiam Kx (vilao tem menos KK, KQ, KJ), mas voce NAO bloqueia AA nem sets (88, 55, 33). Bet grande no river geralmente e valor com maos que te vencem. Seus blockers nao ajudam no call.',
    boardCards: makeRainbowBoard(['A','K','8','5','3']), heroCards: makeHeroCards('K','K',false), heroPos: 'BTN', villainPos: 'BB', villainAction: 'Bet 100%', potLabel: '30bb',
  }),
  () => ({
    q: 'River em board Q-J-T-4-2 rainbow. Voce tem AK (straight). Vilao checka. Qual o blocker effect da sua mao?',
    a: 'Voce bloqueia AK (nuts) — vilao nao pode ter a mesma straight. Bet grande por valor!',
    b: 'Blocker nao importa quando voce tem nuts',
    aCorrect: true,
    explanation: 'Voce TEM a nuts (AK = straight broadway). E mais: voce bloqueia todos os outros combos de AK. Vilao so pode ter K9 (straight menor). Bet grande por valor porque ele NAO pode ter a mesma mao que voce.',
    boardCards: makeRainbowBoard(['Q','J','T','4','2']), heroCards: makeHeroCards('A','K',false), heroPos: 'BTN', villainPos: 'BB', villainAction: 'Check', potLabel: '20bb',
  }),
  // Blockers pra call
  () => ({
    q: 'River em board 9-8-5-4-2. Vilao betta overbet. Voce tem 77 (bloqueia straight 6-7). Call ou fold?',
    a: 'Melhor call — voce bloqueia 76 (straight), reduz combos de valor do vilao',
    b: 'Fold — 77 e muito fraco',
    aCorrect: true,
    explanation: 'Seus 77 bloqueiam 76s (a straight mais provavel nesse board). Isso reduz significativamente os combos de valor do vilao. Alem disso, voce nao bloqueia bluffs tipicos (Tx, Jx). Blocker favoravel = call.',
    boardCards: makeRainbowBoard(['9','8','5','4','2']), heroCards: makeHeroCards('7','7',false), heroPos: 'BB', villainPos: 'BTN', villainAction: 'Overbet', potLabel: '18bb',
  }),
  () => ({
    q: 'River. Vilao betta grande. Voce tem AJ em board A-T-7-3-K. Chamar?',
    a: 'AJ bloqueia bluffs (AQ, AJ tipo maos que dariam up) — nao e bom call',
    b: 'Top pair e sempre call',
    aCorrect: false,
    explanation: 'Ter AJ e ruim pra call porque: 1) voce bloqueia maos que o vilao DESISTIRIA (bluffs com A), 2) voce NAO bloqueia maos fortes (KK, TT, AK). Blockers desfavoraveis = nao ideal pra call.',
    boardCards: makeRainbowBoard(['A','T','7','3','K']), heroCards: makeHeroCards('A','J',false), heroPos: 'BB', villainPos: 'BTN', villainAction: 'Bet 75%', potLabel: '22bb',
  }),
  () => ({
    q: 'Conceito: qual mao e melhor pra BLEFAR no river — uma que bloqueia as nuts ou que bloqueia bluffs?',
    a: 'Bloqueia as nuts (remove maos fortes do vilao = ele folda mais)',
    b: 'Bloqueia bluffs (remove lixo do vilao)',
    aCorrect: true,
    explanation: 'Pra BLEFAR voce quer bloquear as NUTS do vilao. Se voce tem o As em board com flush possivel, vilao nao pode ter nut flush e tera mais bluffs/maos medianas no range — que foldam ao seu blefe.',
    boardCards: makeRainbowBoard(['J','8','4','2','6']), heroCards: makeHeroCards('A','Q',false), heroPos: 'BTN', villainPos: 'BB', villainAction: 'Check', potLabel: '15bb',
  }),
  () => ({
    q: 'Conceito: qual mao e melhor pra CALL no river — uma que bloqueia valor ou que bloqueia bluffs?',
    a: 'Bloqueia VALOR do vilao (remove nuts, fica mais bluffs proporcionalmente)',
    b: 'Bloqueia bluffs (vilao blefa menos)',
    aCorrect: true,
    explanation: 'Pra CALL voce quer bloquear as maos de VALOR do vilao. Se voce bloqueia combos que te vencem, a proporcao de bluffs no range dele aumenta. Nunca bloqueie bluffs quando quer call — isso REDUZ a chance dele blefar.',
    boardCards: makeRainbowBoard(['K','9','5','3','T']), heroCards: makeHeroCards('T','T',false), heroPos: 'BB', villainPos: 'BTN', villainAction: 'Bet 66%', potLabel: '20bb',
  }),
  // Board texture + blockers
  () => {
    const s1 = randSuit()
    return {
      q: `Board K-Q-J-5-3 (${s1 === 'h' ? '3 copas' : '3 espadas'}). Voce tem T${s1} sem par. Blefar no river?`,
      a: 'Sim — T bloqueia straight (AT, T9), naipe bloqueia flush. Blocker duplo!',
      b: 'Nao — voce nao tem nada',
      aCorrect: true,
      explanation: 'T bloqueia a straight (AT = broadway, T9 = straight menor). O naipe bloqueia flush combos. Blocker duplo (straight + flush) faz essa uma das melhores maos pra blefar nesse board.',
      boardCards: ['K'+s1, 'Q'+s1, 'J'+s1, '5'+randSuitExcluding(s1), '3'+randSuitExcluding(s1)], heroCards: ['T'+s1, '2'+randSuitExcluding(s1)], heroPos: 'BTN', villainPos: 'BB', villainAction: 'Check', potLabel: '22bb',
    }
  },
  () => ({
    q: 'Board pareado: 8-8-K-4-2. Voce tem 8x (trips). Vilao faz overbet. Qual o blocker effect?',
    a: 'Voce bloqueia quads (88 impossivel) e trips — vilao quase nunca te vence',
    b: 'Overbet = sempre forte, fold',
    aCorrect: true,
    explanation: 'Voce tem um 8 — isso torna 88 (quads) impossivel pro vilao e reduz combos de trips. Ele so te vence com KK (que teria raisado pre geralmente). Seu blocker torna o call muito lucrativo.',
    boardCards: ['8'+randSuit(), '8'+randSuit(), ...makeRainbowBoard(['K','4','2'])], heroCards: ['8'+randSuit(), '9'+randSuit()], heroPos: 'BB', villainPos: 'BTN', villainAction: 'Overbet', potLabel: '25bb',
  }),
  () => ({
    q: 'Voce tem AA no river em board T-9-7-6-2. Vilao shova. Seus AA bloqueiam algo relevante?',
    a: 'Nao — AA nao bloqueia straights (J8, 85, 53) nem sets. Call e baseado em pot odds.',
    b: 'AA bloqueia AA do vilao, entao call',
    aCorrect: true,
    explanation: 'AA nao bloqueia NADA relevante nesse board. Straights (J8, 85), sets (TT, 99, 77) e duas-pairs nao sao afetados. Quando seus blockers nao ajudam, a decisao volta pra pot odds e leitura pura.',
    boardCards: makeRainbowBoard(['T','9','7','6','2']), heroCards: makeHeroCards('A','A',false), heroPos: 'BTN', villainPos: 'BB', villainAction: 'All-in', potLabel: '40bb',
  }),
  // Unblockers
  () => ({
    q: 'Conceito de "unblocker": voce NAO tem cartas que o vilao usaria pra blefar. Isso e bom pra call?',
    a: 'Sim — unblocking bluffs = vilao pode ter mais bluffs = melhor pra call',
    b: 'Nao — nao importa o que voce nao tem',
    aCorrect: true,
    explanation: 'Unblocker e tao importante quanto blocker. Se voce NAO tem cartas de bluff do vilao (flush draws perdidos, straight draws perdidos), ele PODE ter essas maos. Mais bluffs no range dele = seu call e melhor.',
    boardCards: makeRainbowBoard(['Q','8','5','3','K']), heroCards: makeHeroCards('9','9',false), heroPos: 'BB', villainPos: 'BTN', villainAction: 'Bet 75%', potLabel: '18bb',
  }),
  () => {
    const fs = randSuit()
    return {
      q: `Board com flush possivel (3 ${fs === 'h' ? 'copas' : 'espadas'}). Vilao betta river. Voce NAO tem nenhuma carta de ${fs === 'h' ? 'copas' : 'espadas'}. Isso e bom ou ruim pra call?`,
      a: 'BOM — voce nao bloqueia o flush dele, mas tambem nao bloqueia draws perdidos (bluffs)',
      b: 'RUIM — voce nao bloqueia nada',
      aCorrect: true,
      explanation: 'Nao ter cartas do naipe do flush e na verdade NEUTRO a POSITIVO. Voce nao bloqueia bluffs (draws perdidos com 1 carta daquele naipe) E nao bloqueia valor. A decisao volta pra frequencia e sizing.',
      boardCards: ['Q'+fs, '8'+fs, '4'+randSuitExcluding(fs), '3'+randSuitExcluding(fs), '7'+fs], heroCards: makeHeroCards('T','T',false), heroPos: 'BB', villainPos: 'BTN', villainAction: 'Bet 66%', potLabel: '20bb',
    }
  },
  // Avancado: blocker-based decisions
  () => ({
    q: 'River board A-K-Q-J-4. Voce tem T9 (nao tem straight — precisa de T pra broadway mas T faz J-high straight). Blefar?',
    a: 'Sim — T bloqueia a nuts (AT = broadway). Vilao nao tem a melhor straight.',
    b: 'Nao — voce tem T-high, nao vale blefar',
    aCorrect: true,
    explanation: 'O T na sua mao bloqueia AT (a nut straight broadway). Vilao tem menos combos de straight. Seu 9 nao bloqueia nada relevante. T como blocker e suficiente pra tornar esse um bom bluff spot.',
    boardCards: makeRainbowBoard(['A','K','Q','J','4']), heroCards: makeHeroCards('T','9',false), heroPos: 'BTN', villainPos: 'BB', villainAction: 'Check', potLabel: '28bb',
  }),
  () => ({
    q: 'Regra geral de blockers pra decisoes no river:',
    a: 'Blefar = bloqueie valor. Call = bloqueie valor + unblock bluffs.',
    b: 'Sempre considere blockers igualmente pra blefe e call',
    aCorrect: true,
    explanation: 'Resumo: BLEFAR = bloqueie nuts/valor (vilao folda mais). CALL = bloqueie valor do vilao E nao bloqueie bluffs (proporcao de bluffs aumenta). Os dois lados sao complementares mas funcionam diferente.',
    boardCards: makeRainbowBoard(['K','J','7','4','2']), heroCards: makeHeroCards('A','9',false), heroPos: 'BTN', villainPos: 'BB', villainAction: 'Bet 75%', potLabel: '22bb',
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
      title: 'O que sao Blockers?',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            <strong style={{ color: '#4fce82' }}>Blockers</strong> sao cartas na sua mao que
            REMOVEM combinacoes possiveis do range do vilao. Se voce tem o A de espadas,
            o vilao NAO pode ter o nut flush de espadas.
          </p>
          <div className="rounded-lg p-4 mb-4" style={{ background: '#222225' }}>
            <div style={{ color: '#fdfdfd', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Exemplo:</div>
            <div style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 1.8 }}>
              Board com 3 copas. Voce tem <strong style={{ color: '#e5484d' }}>Ah</strong> (As de copas).<br/>
              Vilao <strong style={{ color: '#4fce82' }}>nao pode ter nut flush</strong> = voce bloqueia a melhor mao.<br/>
              Isso muda TUDO: seus blefes funcionam mais, seus calls sao melhores.
            </div>
          </div>
          <div className="rounded-lg p-4" style={{ background: 'rgba(79,206,130,0.08)', border: '1px solid rgba(79,206,130,0.2)' }}>
            <div style={{ color: '#4fce82', fontSize: 13, fontWeight: 600 }}>
              Blockers = a razao pela qual a mesma mao pode ser blefe OU fold dependendo das cartas exatas
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Blockers pra Blefar',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            Pra BLEFAR, voce quer <strong style={{ color: '#fdfdfd' }}>bloquear as maos de VALOR</strong> do vilao.
          </p>
          <div className="space-y-2 mb-4">
            {[
              { card: 'As em board com flush', why: 'Bloqueia nut flush — vilao folda mais', color: '#4fce82' },
              { card: 'K em board K-high', why: 'Bloqueia top pair — vilao tem menos calls', color: '#4fce82' },
              { card: 'T em board Q-J-T', why: 'Bloqueia straight (AT) e sets (TT)', color: '#4fce82' },
              { card: 'Nao bloqueia draws perdidos', why: 'Vilao tem mais bluffs = nao precisa blefar', color: '#e5484d' },
            ].map((item, i) => (
              <div key={i} className="rounded-lg px-3 py-2.5" style={{ background: '#222225' }}>
                <div style={{ color: item.color, fontSize: 13, fontWeight: 600 }}>{item.card}</div>
                <div style={{ color: '#676671', fontSize: 12 }}>{item.why}</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg p-4" style={{ background: 'rgba(229,72,77,0.08)', border: '1px solid rgba(229,72,77,0.2)' }}>
            <div style={{ color: '#e5484d', fontSize: 13, fontWeight: 600 }}>
              BLEFAR = bloqueie nuts/valor do vilao. Quanto menos combos fortes ele tem, mais ele folda.
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Blockers pra Call',
      content: (
        <div>
          <p style={{ color: '#b3b3b8', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            Pra CALL, voce quer <strong style={{ color: '#fdfdfd' }}>bloquear valor E nao bloquear bluffs</strong>.
          </p>
          <div className="space-y-2 mb-4">
            {[
              { card: 'Bloqueia sets/straights', why: 'Vilao tem menos value = mais bluffs proporcionalmente', color: '#4fce82' },
              { card: 'NAO bloqueia draws perdidos', why: 'Vilao ainda pode ter bluffs = seu call e melhor', color: '#4fce82' },
              { card: 'Bloqueia bluffs (flush draws)', why: 'RUIM — reduz bluffs do vilao, ele aposta com mais valor', color: '#e5484d' },
              { card: 'Bloqueia Ax em A-high board', why: 'RUIM — remove bluffs com Ax, vilao aposta mais valor', color: '#e5484d' },
            ].map((item, i) => (
              <div key={i} className="rounded-lg px-3 py-2.5" style={{ background: '#222225' }}>
                <div style={{ color: item.color, fontSize: 13, fontWeight: 600 }}>{item.card}</div>
                <div style={{ color: '#676671', fontSize: 12 }}>{item.why}</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg p-4" style={{ background: 'rgba(79,206,130,0.08)', border: '1px solid rgba(79,206,130,0.2)' }}>
            <div style={{ color: '#4fce82', fontSize: 13, fontWeight: 600 }}>
              CALL = bloqueie valor + unblock bluffs. Se seus blockers fazem o range do vilao ter mais bluffs, call e melhor.
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Resumo e Regras',
      content: (
        <div>
          <div className="rounded-lg overflow-hidden mb-4" style={{ border: '1px solid #2a2a2e' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#222225' }}>
                  <th style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>Decisao</th>
                  <th style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>Blocker ideal</th>
                  <th style={{ color: '#b3b3b8', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}>Evitar</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Blefar', 'Bloqueie nuts/valor', 'Nao bloqueie bluffs'],
                  ['Call', 'Bloqueie valor + unblock bluffs', 'Nao bloqueie draws perdidos'],
                  ['Fold', 'Nao bloqueia valor do vilao', 'Bloqueia bluffs do vilao'],
                ].map(([dec, ideal, evitar], i) => (
                  <tr key={i} style={{ borderTop: '1px solid #2a2a2e' }}>
                    <td style={{ color: '#fdfdfd', fontSize: 12, padding: '8px 12px', fontWeight: 600 }}>{dec}</td>
                    <td style={{ color: '#4fce82', fontSize: 12, padding: '8px 12px' }}>{ideal}</td>
                    <td style={{ color: '#e5484d', fontSize: 12, padding: '8px 12px' }}>{evitar}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            Modulo 27 - Blocker Effects Avancados
          </h1>
          <p style={{ color: '#676671', fontSize: 13, marginBottom: 20 }}>
            Como suas cartas afetam o range do vilao e mudam a decisao
          </p>

          <div className="flex gap-1 mb-6 overflow-x-auto">
            {sections.map((s, i) => (
              <button key={i} onClick={() => setSection(i)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap"
                style={{
                  background: section === i ? 'rgba(79,206,130,0.12)' : 'transparent',
                  color: section === i ? '#4fce82' : '#676671',
                  border: `1px solid ${section === i ? '#4fce82' : 'transparent'}`,
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
  const progress = getModuleProgress(27)

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
    recordAnswer(27, isCorrect, newStreak, { tp: 'blk' })
    setResult({ isCorrect, explanation: scenario.explanation, chosenId: optionId })
  }, [result, scenario, streak, recordAnswer])

  const handleNext = useCallback(() => {
    const nextHand = handNum + 1
    if (nextHand >= 10) {
      const accuracy = Math.round((sessionCorrect / 10) * 100)
      recordSession(27, accuracy)
      setShowReview(true)
    } else {
      setHandNum(nextHand)
    }
    setResult(null)
    setScenario(generateScenario())
  }, [handNum, sessionCorrect, recordSession])

  const acc = progress.totalAnswered > 0 ? progress.accuracy : 0

  if (showReview) {
    return <SessionReview moduleId={27} sessionCorrect={sessionCorrect} sessionTotal={10} onContinue={() => { setHandNum(0); setSessionCorrect(0); setShowReview(false); setStreak(0) }} />
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
              contextTitle="Blocker Effects"
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
                {!result.isCorrect && <DecisionTree scenario={{ ...scenario, moduleId: 27 }} result={result} />}
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

export default function Module27() {
  const { markLessonRead, getModuleProgress } = useProgress()
  const progress = getModuleProgress(27)
  const [mode, setMode] = useState(progress.lessonRead ? 'trainer' : 'lesson')

  if (mode === 'lesson') {
    return <Lesson onComplete={() => { markLessonRead(27); setMode('trainer') }} />
  }
  return <Trainer />
}
