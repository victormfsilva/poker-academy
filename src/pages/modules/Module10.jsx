import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'
import SessionReview from '../../components/SessionReview'
import Card from '../../components/Card'
import ModulePokerTable from '../../components/ModulePokerTable'
import { calcEquity } from '../../lib/equity'

const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2']
const SUITS = ['s','h','d','c']
const RANK_VAL = { A:14, K:13, Q:12, J:11, T:10, '9':9, '8':8, '7':7, '6':6, '5':5, '4':4, '3':3, '2':2 }

function randomFlop() {
  const cards = []
  while (cards.length < 3) {
    const c = RANKS[Math.floor(Math.random() * RANKS.length)] + SUITS[Math.floor(Math.random() * SUITS.length)]
    if (!cards.includes(c)) cards.push(c)
  }
  return cards
}

function randomHoleCards(exclude) {
  const cards = []
  while (cards.length < 2) {
    const c = RANKS[Math.floor(Math.random() * RANKS.length)] + SUITS[Math.floor(Math.random() * SUITS.length)]
    if (!cards.includes(c) && !exclude.includes(c)) cards.push(c)
  }
  return cards
}

function getBoardTexture(flop) {
  const vals = flop.map(c => RANK_VAL[c.slice(0, -1)])
  const suits = flop.map(c => c.slice(-1))
  const suited = suits[0] === suits[1] || suits[1] === suits[2] || suits[0] === suits[2]
  const monotone = suits[0] === suits[1] && suits[1] === suits[2]
  const sorted = [...vals].sort((a, b) => a - b)
  const span = sorted[2] - sorted[0]
  const connected = span <= 4
  const paired = vals[0] === vals[1] || vals[1] === vals[2] || vals[0] === vals[2]
  return { suited, monotone, connected, paired, isWet: suited || connected, isDry: !suited && !connected }
}

function hasTopPair(hole, flop) {
  const flopRanks = flop.map(c => c.slice(0, -1))
  const holeRanks = hole.map(c => c.slice(0, -1))
  const topFlopRank = [...flopRanks].sort((a, b) => RANKS.indexOf(a) - RANKS.indexOf(b))[0]
  return holeRanks.includes(topFlopRank)
}

function hasAnyPair(hole, flop) {
  const flopRanks = flop.map(c => c.slice(0, -1))
  return hole.map(c => c.slice(0, -1)).some(r => flopRanks.includes(r))
}

function hasFlushDraw(hole, flop) {
  const suitCounts = {}
  ;[...hole, ...flop].forEach(c => { const s = c.slice(-1); suitCounts[s] = (suitCounts[s] || 0) + 1 })
  return Object.values(suitCounts).some(v => v === 4)
}

function hasMadeStraight(hole, flop) {
  const holeVals = hole.map(c => RANK_VAL[c.slice(0, -1)])
  const allVals = [...new Set([...hole, ...flop].map(c => RANK_VAL[c.slice(0, -1)]))].sort((a, b) => a - b)
  if (allVals.includes(14)) allVals.unshift(1)
  for (let i = 0; i <= allVals.length - 5; i++) {
    if (allVals[i + 4] - allVals[i] === 4) {
      const run = [allVals[i], allVals[i+1], allVals[i+2], allVals[i+3], allVals[i+4]]
      if (holeVals.some(v => run.includes(v) || (v === 14 && run.includes(1)))) return true
    }
  }
  return false
}

// Retorna 'oesd' (8 outs), 'gutshot' (4 outs) ou false
function getStraightDrawType(hole, flop) {
  if (hasMadeStraight(hole, flop)) return false
  const holeVals = hole.map(c => RANK_VAL[c.slice(0, -1)])
  const allVals = [...new Set([...hole, ...flop].map(c => RANK_VAL[c.slice(0, -1)]))].sort((a, b) => a - b)
  if (allVals.includes(14)) allVals.unshift(1)
  // Check OESD: 4 consecutivas com ambas as pontas abertas
  let hasOESD = false
  for (let i = 0; i <= allVals.length - 4; i++) {
    if (allVals[i+3] - allVals[i] === 3 && allVals[i+1] === allVals[i]+1 && allVals[i+2] === allVals[i]+2) {
      if (holeVals.some(v => [allVals[i],allVals[i+1],allVals[i+2],allVals[i+3]].includes(v) || (v === 14 && allVals[i] === 1))) {
        const lowEnd = allVals[i] - 1
        const highEnd = allVals[i+3] + 1
        if (lowEnd >= 1 && highEnd <= 14) { hasOESD = true; break }
      }
    }
  }
  if (hasOESD) return 'oesd'
  // Check gutshot: 4 cards within span of 5
  for (let start = 1; start <= 10; start++) {
    const window = [start, start+1, start+2, start+3, start+4]
    const present = window.filter(v => allVals.includes(v))
    if (present.length === 4 && holeVals.some(v => present.includes(v) || (v === 14 && present.includes(1)))) {
      return 'gutshot'
    }
  }
  return false
}

function hasStraightDraw(hole, flop) {
  return !!getStraightDrawType(hole, flop)
}

function hasMadeFlush(hole, flop) {
  const suitCounts = {}
  ;[...hole, ...flop].forEach(c => { const s = c.slice(-1); suitCounts[s] = (suitCounts[s] || 0) + 1 })
  return Object.values(suitCounts).some(v => v >= 5)
}

function hasSet(hole, flop) {
  const holeRanks = hole.map(c => c.slice(0, -1))
  const flopRanks = flop.map(c => c.slice(0, -1))
  return holeRanks[0] === holeRanks[1] && flopRanks.includes(holeRanks[0])
}

function hasTwoPair(hole, flop) {
  const holeRanks = hole.map(c => c.slice(0, -1))
  const flopRanks = flop.map(c => c.slice(0, -1))
  if (holeRanks[0] === holeRanks[1]) return false
  return [...new Set(holeRanks)].filter(r => flopRanks.includes(r)).length === 2
}

function hasOverpair(hole, flop) {
  const holeRanks = hole.map(c => c.slice(0, -1))
  if (holeRanks[0] !== holeRanks[1]) return false
  const pocketVal = RANK_VAL[holeRanks[0]]
  const topFlopVal = Math.max(...flop.map(c => RANK_VAL[c.slice(0, -1)]))
  return pocketVal > topFlopVal
}

const CBET_SIZES = ['33%', '50%', '75%']

function getCorrectAction(hole, flop, cbetSize) {
  const texture = getBoardTexture(flop)
  const potOdds = cbetSize === '33%' ? 20 : cbetSize === '50%' ? 25 : 30

  // Mao monstruosa: check-raise de valor
  if (hasMadeFlush(hole, flop)) {
    return { action: 'raise', actionType: 'raise-value', reason: 'Flush completo! Check-raise de VALOR — mão nuts ou perto. Construa o pote ao máximo. O adversario ja apostou, relance pra extrair valor.' }
  }
  if (hasMadeStraight(hole, flop)) {
    return { action: 'raise', actionType: 'raise-value', reason: 'Straight no flop! Check-raise de VALOR — mão muito forte. O adversario não espera você ter straight do BB.' }
  }
  if (hasSet(hole, flop)) {
    return { action: 'raise', actionType: 'raise-value', reason: 'Set (trinca)! Check-raise de VALOR — mão muito forte e disfarcada. O adversario difícilmente coloca você nessa mão.' }
  }
  if (hasTwoPair(hole, flop)) {
    if (texture.isWet) {
      return { action: 'raise', actionType: 'raise-value', reason: 'Dois pares em board umido — check-raise de VALOR para proteger e construir pote. Muitos draws podem te ultrapassar se você so chamar.' }
    }
    return { action: 'raise', actionType: 'raise-value', reason: 'Dois pares — check-raise de VALOR. Mao forte o suficiente pra construir pote.' }
  }

  // Check-raise de blefe: draw forte em board umido
  if (hasStraightDraw(hole, flop) && hasFlushDraw(hole, flop)) {
    return { action: 'raise', actionType: 'raise-bluff', reason: 'Combo draw (flush + straight draw)! Check-raise de BLEFE com equity monstruosa (~45%+). Uma das melhores mãos pra semi-blefe.' }
  }
  if (hasFlushDraw(hole, flop) && texture.isWet) {
    if (cbetSize === '75%') {
      return { action: 'raise', actionType: 'raise-bluff', reason: `Flush draw contra aposta grande (75%) em board umido — check-raise de BLEFE! Você tem ~35% equity (9 outs) e pressiona o adversario. Se ele foldar, você ganha na hora.` }
    }
    return { action: 'call', actionType: 'call', reason: `Flush draw com pot odds favoraveis (${potOdds}% necessario, você tem ~35% de equity com 9 outs). Call e continue no pote. Board umido mas sizing pequeno — não precisa inflar o pote agora.` }
  }
  if (hasFlushDraw(hole, flop) && !texture.isWet) {
    return { action: 'call', actionType: 'call', reason: `Flush draw em board relativamente seco — call. Boas odds implicitas (${potOdds}% necessario, ~35% equity) e você não precisa inflar o pote ainda.` }
  }
  const sdType = getStraightDrawType(hole, flop)
  const sdOuts = sdType === 'oesd' ? 8 : sdType === 'gutshot' ? 4 : 0
  const sdEquity = sdOuts * 2 // Rule of 2 para uma street
  const sdLabel = sdType === 'oesd' ? 'OESD (straight aberto)' : 'gutshot (furo no meio)'

  if (sdType && texture.isWet && !texture.paired) {
    if (sdType === 'oesd' && cbetSize === '75%') {
      return { action: 'raise', actionType: 'raise-bluff', reason: `${sdLabel} em board umido nao-pareado contra aposta grande — check-raise de BLEFE. ${sdOuts} outs (~${sdEquity}% equity) + fold equity combinados.` }
    }
    if (sdType === 'oesd') {
      return { action: 'call', actionType: 'call', reason: `${sdLabel} com pot odds razoaveis (${potOdds}% necessario, ~${sdEquity}% com ${sdOuts} outs). Call.` }
    }
    // Gutshot em board wet
    if (cbetSize === '33%') {
      return { action: 'call', actionType: 'call', reason: `${sdLabel} com aposta pequena — ${sdOuts} outs (~${sdEquity}%). Pot odds aceitaveis pra call.` }
    }
    return { action: 'fold', actionType: 'fold', reason: `${sdLabel} (so ${sdOuts} outs, ~${sdEquity}%) contra aposta ${cbetSize}. Pot odds desfavoraveis. Fold.` }
  }

  if (sdType) {
    if (sdType === 'oesd' && cbetSize === '33%') {
      return { action: 'call', actionType: 'call', reason: `${sdLabel} com aposta pequena — pot odds excelentes (so precisa de ${potOdds}%). Com ${sdOuts} outs (~${sdEquity}% equity), call facil.` }
    }
    if (sdType === 'oesd' && cbetSize === '50%') {
      return { action: 'call', actionType: 'call', reason: `${sdLabel} com pot odds razoaveis (${potOdds}% necessario, ~${sdEquity}% com ${sdOuts} outs). Call correto.` }
    }
    if (sdType === 'gutshot' && cbetSize === '33%') {
      return { action: 'call', actionType: 'call', reason: `${sdLabel} com aposta pequena — ${sdOuts} outs (~${sdEquity}%), pot odds ok pra ${potOdds}%. Call.` }
    }
    return { action: 'fold', actionType: 'fold', reason: `${sdLabel} (${sdOuts} outs, ~${sdEquity}%) contra aposta ${cbetSize} — precisa de ${potOdds}% equity. Pot odds desfavoraveis. Fold.` }
  }

  // Overpair ou top pair forte: call
  if (hasOverpair(hole, flop) || hasTopPair(hole, flop)) {
    return { action: 'call', actionType: 'call', reason: 'Top pair ou overpair — call. Mao boa demais pra foldar, mas check-raise transforma em blefe desnecessariamente. Mantenha o pote controlado.' }
  }

  // Par médio/baixo
  if (hasAnyPair(hole, flop)) {
    if (cbetSize === '75%') {
      return { action: 'fold', actionType: 'fold', reason: 'Par médio/baixo contra aposta grande — você provavelmente esta atras. O adversario esta representando mão forte com sizing de 75%. Fold.' }
    }
    if (texture.isDry) {
      return { action: 'call', actionType: 'call', reason: `Par médio em board seco contra aposta ${cbetSize === '33%' ? 'pequena' : 'media'} — pot odds razoaveis e poucas cartas assustam no turn. Call.` }
    }
    return { action: 'call', actionType: 'call', reason: `Par médio/baixo contra aposta ${cbetSize === '33%' ? 'pequena' : 'media'} — pot odds razoaveis e você pode melhorar. Call.` }
  }

  // Nada: fold sempre — sem mão, sem draw, sem equity pra defender
  return { action: 'fold', actionType: 'fold', reason: `Sem mão, sem draw, sem equity. Contra c-bet de ${cbetSize}, fold e a unica opção correta. Não desperdice fichas defendendo sem motivo.` }
}

function Lesson({ onComplete }) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        Defesa vs CBet e Check-Raise
      </h1>
      <p style={{ color: '#888', marginBottom: 24 }}>O adversario apostou no flop. Fold, call ou check-raise? Quando e como usar cada acao.</p>
      <div className="space-y-4">
        <Section title="O Cenario">
          Você esta no Big Blind. Alguem fez raise pre-flop, você chamou. O flop saiu e o adversario faz uma aposta de continuacao (c-bet).<br /><br />
          Agora você tem 3 opções: <strong style={{ color: '#e5484d' }}>fold</strong>, <strong style={{ color: '#4a90e2' }}>call</strong> ou <strong style={{ color: '#f5a623' }}>check-raise</strong>.
        </Section>

        <Section title="Quando Foldar">
          <div className="space-y-2">
            {[
              'Sem par, sem draw, sem equity nenhuma',
              'Aposta grande (75%) e você so tem par baixo',
              'Board favorece muito o range do adversario (ex: A-K-Q e você tem 7-6)',
            ].map((t, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span style={{ color: '#e5484d' }}>✗</span>
                <span style={{ color: '#ccc', fontSize: 14 }}>{t}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Quando Chamar (Call)">
          <div className="space-y-2">
            {[
              'Top pair ou overpair — mão boa mas não excepcional',
              'Draw de flush (9 outs, ~35% equity) com pot odds favoraveis',
              'Draw de straight (8 outs, ~32% equity) contra sizing pequeno/medio',
              'Par médio contra aposta pequena (33%) — pot odds bons',
              'Board seco e aposta pequena — pode flotar com backdoor equity',
            ].map((t, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span style={{ color: '#4a90e2' }}>✓</span>
                <span style={{ color: '#ccc', fontSize: 14 }}>{t}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Pot Odds na Defesa">
          O tamanho da aposta muda quanto você precisa ganhar pra justificar o call:
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[['33%', '20%', '#4fce82'], ['50%', '25%', '#f5a623'], ['75%', '30%', '#e5484d']].map(([bet, need, c]) => (
              <div key={bet} className="rounded-lg p-3 text-center" style={{ background: '#0f0f0f', border: `1px solid ${c}` }}>
                <div style={{ color: c, fontWeight: 700 }}>CBet {bet}</div>
                <div style={{ color: 'white', fontSize: 20, fontWeight: 700, marginTop: 4 }}>{need}</div>
                <div style={{ color: '#888', fontSize: 11 }}>equity necessaria</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Board Texture Importa">
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #4fce82' }}>
              <div style={{ color: '#4fce82', fontWeight: 600 }}>Board Seco</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Ex: K♠ 7♦ 2♣<br />Adversario c-beta com muito lixo. Pode chamar mais leve ou flotar.</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #e5484d' }}>
              <div style={{ color: '#e5484d', fontWeight: 600 }}>Board Umido</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Ex: 9♠ 8♥ 7♠<br />Adversario c-beta mais seletivamente. Exija mais equity pra continuar.</div>
            </div>
          </div>
        </Section>

        <div className="rounded-xl p-4" style={{ background: '#1a1a1d', border: '2px solid #f5a623' }}>
          <h3 style={{ color: '#f5a623', fontWeight: 700, fontSize: 18, marginBottom: 12 }}>Check-Raise — A Arma Mais Poderosa do OOP</h3>
          <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>
            Você checa, o adversario aposta, e você <strong style={{ color: '#f5a623' }}>relanca</strong>.<br /><br />
            E a jogada mais forte que você pode fazer fora de posição. Sinaliza muita forca — ou simula forca com um blefe bem construido.
          </div>
        </div>

        <Section title="2 Tipos de Check-Raise">
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="rounded-lg p-4" style={{ background: '#0f0f0f', border: '1px solid #4fce82' }}>
              <div style={{ color: '#4fce82', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Check-Raise de Valor</div>
              <div style={{ color: '#ccc', fontSize: 13, lineHeight: 1.6 }}>
                Mãos muito fortes que querem construir pote:<br />
                <strong>Sets, dois pares, flush completo</strong><br /><br />
                Você checa pra induzir a aposta, depois relanca pra maximizar valor.
              </div>
            </div>
            <div className="rounded-lg p-4" style={{ background: '#0f0f0f', border: '1px solid #f5a623' }}>
              <div style={{ color: '#f5a623', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Check-Raise de Blefe</div>
              <div style={{ color: '#ccc', fontSize: 13, lineHeight: 1.6 }}>
                Draws fortes que querem fold equity:<br />
                <strong>Flush draw, straight draw, combo draw</strong><br /><br />
                Se o adversario foldar, você ganha na hora. Se chamar, você tem outs.
              </div>
            </div>
          </div>
        </Section>

        <Section title="Boards Bons pra Check-Raise">
          <div className="space-y-2">
            {[
              { board: 'Board umido (ex: 9♠ 8♥ 6♠)', reason: 'Muitos draws possiveis — check-raise tanto de valor quanto de blefe faz sentido.' },
              { board: 'Board com par (ex: 7♠ 7♦ 3♣)', reason: 'Se você tem o 7, check-raise de valor e devastador — adversario não te coloca nessa mão.' },
              { board: 'Board médio-baixo (ex: 8♦ 5♣ 3♠)', reason: 'Favorece seu range de BB — você tem mais 85s, 53s, 33 que o raiser.' },
            ].map(r => (
              <div key={r.board} className="rounded-lg p-3" style={{ background: '#0f0f0f' }}>
                <div style={{ color: '#f5a623', fontWeight: 600, fontSize: 13 }}>{r.board}</div>
                <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>{r.reason}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Boards Ruins pra Check-Raise">
          <div className="space-y-2">
            {[
              { board: 'Board alto e seco (ex: A♠ K♦ 7♣)', reason: 'Favorece o range do raiser (ele tem mais AK, AQ, KK). Check-raise e arriscado.' },
              { board: 'Board monotone (ex: Q♥ 9♥ 4♥)', reason: 'Muito perigoso — se você não tem a flush, o adversario pode ter. Cautela.' },
            ].map(r => (
              <div key={r.board} className="rounded-lg p-3" style={{ background: '#0f0f0f' }}>
                <div style={{ color: '#e5484d', fontWeight: 600, fontSize: 13 }}>{r.board}</div>
                <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>{r.reason}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Sizing do Check-Raise">
          <div className="rounded-lg p-3 mt-2" style={{ background: '#0f0f0f', border: '1px solid #4a90e2' }}>
            <div style={{ color: '#4a90e2', fontWeight: 700, marginBottom: 4 }}>Regra geral: 3x a aposta do adversario</div>
            <div style={{ color: '#ccc', fontSize: 13 }}>
              Adversario aposta 5bb → você raise pra 15bb.<br />
              Isso da fold equity suficiente e constroi pote com mãos de valor.
            </div>
          </div>
        </Section>

        <Section title="Quando NAO Check-Raise">
          <div className="space-y-2">
            {[
              'Top pair sem kicker forte — so chame, não transforme em blefe',
              'Sem draw e sem mão — fold, não invente',
              'Board alto que favorece o raiser — sua fold equity e baixa',
              'Adversario que nunca folda — check-raise de blefe não funciona',
            ].map((t, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span style={{ color: '#e5484d' }}>✗</span>
                <span style={{ color: '#ccc', fontSize: 14 }}>{t}</span>
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
  const { progress, recordAnswer, recordSession } = useProgress()
  const [flop, setFlop] = useState(null)
  const [hole, setHole] = useState(null)
  const [cbetSize, setCbetSize] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [sessionDone, setSessionDone] = useState(false)

  function newHand() {
    if (sessionTotal >= 10) { setSessionDone(true); return }
    const f = randomFlop()
    const h = randomHoleCards(f)
    const size = CBET_SIZES[Math.floor(Math.random() * CBET_SIZES.length)]
    setFlop(f); setHole(h); setCbetSize(size); setFeedback(null)
  }

  function answer(action) {
    if (!flop || feedback) return
    const correct = getCorrectAction(hole, flop, cbetSize)
    const eq = calcEquity(hole, flop)
    const eqStr = eq !== null ? ` (${eq}% equity vs range aleatorio)` : ''
    correct.reason = correct.reason + eqStr
    const isCorrect = action === correct.action
    const newStreak = isCorrect ? streak + 1 : 0
    setStreak(newStreak)
    const newTotal = sessionTotal + 1, newCorrect = sessionCorrect + (isCorrect ? 1 : 0)
    setSessionTotal(newTotal); setSessionCorrect(newCorrect)
    recordAnswer(10, isCorrect, newStreak)
    const isLast = newTotal >= 10
    if (isLast) recordSession(10, Math.round((newCorrect / newTotal) * 100))
    setFeedback({ ...correct, userAction: action, isCorrect, isLast })
  }

  function restart() { setSessionCorrect(0); setSessionTotal(0); setStreak(0); setSessionDone(false); setFeedback(null); setFlop(null) }

  if (!flop && !sessionDone) newHand()

  if (sessionDone) {
    return <SessionReview moduleId={10} sessionCorrect={sessionCorrect} sessionTotal={sessionTotal} onContinue={restart} />
  }

  const texture = flop ? getBoardTexture(flop) : null

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <div className="rounded-xl p-3 mb-4 flex justify-between" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
        <div style={{ color: '#888', fontSize: 13 }}>Sessao: {sessionCorrect}/{sessionTotal} · Seq: {streak}</div>
        <div style={{ color: '#888', fontSize: 13 }}>Meta: 10 maos</div>
      </div>
      <div className="rounded-full h-2 mb-6" style={{ background: '#2a2a2e' }}>
        <div className="rounded-full h-2 transition-all" style={{ width: `${(sessionTotal / 10) * 100}%`, background: '#e5484d' }} />
      </div>

      <ModulePokerTable
        heroPos="BB"
        villainPos="CO"
        heroCards={hole || []}
        boardCards={flop || []}
        villainAction={`Bet ${cbetSize}`}
        potLabel="6.5bb"
        contextTitle="Você esta no BB (OOP)"
        contextDesc={`Adversario fez c-bet de ${cbetSize} do pote`}
        textureTags={texture ? [
          { label: texture.isDry ? 'Board Seco' : 'Board Umido', color: texture.isDry ? '#4fce82' : '#e5484d' },
          ...(texture.monotone ? [{ label: 'Monotone', color: '#e5484d' }] : []),
          ...(texture.suited && !texture.monotone ? [{ label: 'Flush Possivel', color: '#0a84d7' }] : []),
          ...(texture.connected ? [{ label: 'Conectado', color: '#f5a623' }] : []),
        ] : null}
      />

      {!feedback && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[['fold', 'FOLD', '#e5484d', 'white'], ['call', 'CALL', '#4a90e2', 'white'], ['raise', 'CHECK-RAISE', '#f5a623', '#0f0f0f']].map(([action, label, bg, color]) => (
            <button key={action} onClick={() => answer(action)} className="py-4 rounded-xl font-bold text-sm" style={{ background: bg, color }}>{label}</button>
          ))}
        </div>
      )}

      {feedback && (
        <div className="rounded-xl p-4 mb-4" style={{ background: '#1a1a1d', border: `2px solid ${feedback.isCorrect ? '#4fce82' : '#e5484d'}` }}>
          <div style={{ color: feedback.isCorrect ? '#4fce82' : '#e5484d', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
            {feedback.isCorrect ? 'Correto!' : 'Incorreto'}
          </div>
          <button onClick={newHand} className="w-full py-3 rounded-lg font-semibold mb-4" style={{ background: '#e5484d', color: 'white', fontSize: 16 }}>Proxima Mao</button>
          <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>{feedback.reason}</div>
          <div style={{ color: '#555', fontSize: 12, marginTop: 8 }}>
            Correto: <strong style={{ color: '#f5a623' }}>
              {feedback.action === 'fold' ? 'FOLD' : feedback.action === 'call' ? 'CALL' : feedback.actionType === 'raise-value' ? 'CHECK-RAISE (valor)' : feedback.actionType === 'raise-bluff' ? 'CHECK-RAISE (blefe)' : 'CHECK-RAISE'}
            </strong>
          </div>
          {!feedback.isCorrect && (
            <div className="mt-3 rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #4a90e230' }}>
              <div style={{ color: '#4a90e2', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Regra geral</div>
              <div style={{ color: '#ccc', fontSize: 12, lineHeight: 1.7 }}>
                <div>• <strong style={{ color: '#4fce82' }}>Set / Dois pares / Flush</strong> → CHECK-RAISE de valor</div>
                <div>• <strong style={{ color: '#f5a623' }}>Flush draw + board umido + bet grande</strong> → CHECK-RAISE de blefe</div>
                <div>• <strong style={{ color: '#f5a623' }}>Combo draw (flush + straight)</strong> → CHECK-RAISE de blefe</div>
                <div>• <strong style={{ color: '#4a90e2' }}>Top pair / Overpair</strong> → CALL</div>
                <div>• <strong style={{ color: '#4a90e2' }}>Draw com pot odds bons</strong> → CALL</div>
                <div>• <strong style={{ color: '#4a90e2' }}>Par médio em board seco</strong> → CALL</div>
                <div>• <strong style={{ color: '#e5484d' }}>Sem mão, sem draw</strong> → FOLD</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Module10() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[10]?.lessonRead ? 'trainer' : 'lesson')
  if (!progress.modules[10]?.unlocked) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f0f' }}>
      <div className="text-center"><div style={{ fontSize: 60 }}>🔒</div><h2 style={{ color: 'white', marginTop: 16 }}>Modulo Bloqueado</h2><p style={{ color: '#888', marginTop: 8 }}>Complete o Modulo 9 para desbloquear.</p></div>
    </div>
  )
  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0f0f0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setView('lesson')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'lesson' ? '#e5484d' : '#1a1a1d', color: view === 'lesson' ? 'white' : '#888', border: '1px solid #2a2a2e' }}>Aula</button>
          <button onClick={() => progress.modules[10]?.lessonRead && setView('trainer')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'trainer' ? '#e5484d' : '#1a1a1d', color: view === 'trainer' ? 'white' : (progress.modules[10]?.lessonRead ? '#888' : '#444'), border: '1px solid #2a2a2e', cursor: progress.modules[10]?.lessonRead ? 'pointer' : 'not-allowed' }}>Trainer {!progress.modules[10]?.lessonRead && '🔒'}</button>
        </div>
        {view === 'lesson' ? <Lesson onComplete={() => { markLessonRead(10); setView('trainer') }} /> : <Trainer />}
      </div>
    </div>
  )
}
