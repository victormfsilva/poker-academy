import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'
import SessionReview from '../../components/SessionReview'
import Card from '../../components/Card'
import ModulePokerTable from '../../components/ModulePokerTable'

const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2']
const SUITS = ['s','h','d','c']
const RANK_VAL = { A:14, K:13, Q:12, J:11, T:10, '9':9, '8':8, '7':7, '6':6, '5':5, '4':4, '3':3, '2':2 }

// ─── Helper: draw a random unique card not in exclude list ───────────────────
function randomCards(n, exclude = []) {
  const cards = []
  while (cards.length < n) {
    const r = RANKS[Math.floor(Math.random() * RANKS.length)]
    const s = SUITS[Math.floor(Math.random() * SUITS.length)]
    const c = r + s
    if (!cards.includes(c) && !exclude.includes(c)) cards.push(c)
  }
  return cards
}

// ─── Board texture based on flop only ────────────────────────────────────────
function getBoardTexture(flop) {
  const vals = flop.map(c => RANK_VAL[c.slice(0, -1)])
  const suits = flop.map(c => c.slice(-1))
  const suited = suits[0] === suits[1] || suits[1] === suits[2] || suits[0] === suits[2]
  const sorted = [...vals].sort((a, b) => a - b)
  const span = sorted[2] - sorted[0]
  const connected = span <= 4
  const paired = vals[0] === vals[1] || vals[1] === vals[2] || vals[0] === vals[2]
  return { suited, connected, paired, isWet: suited || connected, isDry: !suited && !connected }
}

// ─── Hand strength helpers (hole + full board: flop + turn) ──────────────────
function hasTopPair(hole, board) {
  const boardRanks = board.map(c => c.slice(0, -1))
  const holeRanks  = hole.map(c => c.slice(0, -1))
  const topRank    = [...boardRanks].sort((a, b) => RANKS.indexOf(a) - RANKS.indexOf(b))[0]
  return holeRanks.includes(topRank)
}

function hasAnyPair(hole, board) {
  const boardRanks = board.map(c => c.slice(0, -1))
  const holeRanks  = hole.map(c => c.slice(0, -1))
  return holeRanks.some(r => boardRanks.includes(r))
}

function hasFlushDraw(hole, board) {
  const all = [...hole, ...board]
  const counts = {}
  all.forEach(c => { const s = c.slice(-1); counts[s] = (counts[s] || 0) + 1 })
  return Object.values(counts).some(v => v === 4)
}

function hasMadeFlush(hole, board) {
  const all = [...hole, ...board]
  const counts = {}
  all.forEach(c => { const s = c.slice(-1); counts[s] = (counts[s] || 0) + 1 })
  return Object.values(counts).some(v => v >= 5)
}

function hasMadeStraight(hole, board) {
  const holeVals = hole.map(c => RANK_VAL[c.slice(0, -1)])
  const allVals  = [...new Set([...hole, ...board].map(c => RANK_VAL[c.slice(0, -1)]))].sort((a, b) => a - b)
  if (allVals.includes(14)) allVals.unshift(1)
  for (let i = 0; i <= allVals.length - 5; i++) {
    if (allVals[i + 4] - allVals[i] === 4) {
      const run = [allVals[i], allVals[i+1], allVals[i+2], allVals[i+3], allVals[i+4]]
      if (holeVals.some(v => run.includes(v) || (v === 14 && run.includes(1)))) return true
    }
  }
  return false
}

function hasStraightDraw(hole, board) {
  if (hasMadeStraight(hole, board)) return false
  const holeVals = hole.map(c => RANK_VAL[c.slice(0, -1)])
  const allVals  = [...new Set([...hole, ...board].map(c => RANK_VAL[c.slice(0, -1)]))].sort((a, b) => a - b)
  if (allVals.includes(14)) allVals.unshift(1)
  for (let i = 0; i < allVals.length - 3; i++) {
    if (allVals[i + 3] - allVals[i] <= 4) {
      const window = allVals.slice(i, i + 4)
      if (holeVals.some(v => window.includes(v) || (v === 14 && window.includes(1)))) return true
    }
  }
  return false
}

function hasSetFn(hole, board) {
  const holeRanks  = hole.map(c => c.slice(0, -1))
  const boardRanks = board.map(c => c.slice(0, -1))
  const isPocketPair = holeRanks[0] === holeRanks[1]
  return isPocketPair && boardRanks.includes(holeRanks[0])
}

function hasTwoPairFn(hole, board) {
  const holeRanks  = hole.map(c => c.slice(0, -1))
  const boardRanks = board.map(c => c.slice(0, -1))
  const isPocketPair = holeRanks[0] === holeRanks[1]
  if (isPocketPair) return false
  const matching = [...new Set(holeRanks)].filter(r => boardRanks.includes(r))
  return matching.length >= 2
}

function hasOverpair(hole, board) {
  const holeRanks  = hole.map(c => c.slice(0, -1))
  const boardRanks = board.map(c => c.slice(0, -1))
  const isPocketPair = holeRanks[0] === holeRanks[1]
  if (!isPocketPair) return false
  const pocketVal  = RANK_VAL[holeRanks[0]]
  const topBoardVal = Math.max(...boardRanks.map(r => RANK_VAL[r]))
  return pocketVal > topBoardVal
}

// ─── Turn card classification helpers ────────────────────────────────────────
function isOvercard(turn, flop) {
  const turnVal    = RANK_VAL[turn.slice(0, -1)]
  const flopVals   = flop.map(c => RANK_VAL[c.slice(0, -1)])
  const topFlopVal = Math.max(...flopVals)
  return turnVal > topFlopVal
}

function turnCompletesFlush(flop, turn) {
  const suits = [...flop.map(c => c.slice(-1)), turn.slice(-1)]
  const counts = {}
  suits.forEach(s => { counts[s] = (counts[s] || 0) + 1 })
  return Object.values(counts).some(v => v >= 3)
}

function turnCompletesStraight(flop, turn) {
  const allVals = [...new Set([...flop, turn].map(c => RANK_VAL[c.slice(0, -1)]))].sort((a, b) => a - b)
  if (allVals.includes(14)) allVals.unshift(1)
  for (let i = 0; i <= allVals.length - 4; i++) {
    if (allVals[i + 3] - allVals[i] === 3) return true
  }
  return false
}

// ─── Core GTO decision logic for PROBE BET (OOP vs capped raiser range) ─────
function getCorrectAction(hole, flop, turn) {
  const board    = [...flop, turn]
  const texture  = getBoardTexture(flop)
  const turnRank = turn.slice(0, -1)

  // Evaluate hand strength on full board (flop + turn)
  const madFlush    = hasMadeFlush(hole, board)
  const madStraight = hasMadeStraight(hole, board)
  const isSet       = hasSetFn(hole, board)
  const isTwoPair   = hasTwoPairFn(hole, board)
  const isOP        = hasOverpair(hole, board)
  const isTopPair   = !isSet && !isTwoPair && !isOP && hasTopPair(hole, board)
  const isFD        = !madFlush && hasFlushDraw(hole, board)
  const isSD        = !madStraight && hasStraightDraw(hole, board)
  const hasPair     = hasAnyPair(hole, board)

  // Does turn complete obvious draws? (villain may have check-trapped)
  const turnFlushComplete    = turnCompletesFlush(flop, turn)
  const turnStraightComplete = turnCompletesStraight(flop, turn)
  const drawCompleted        = turnFlushComplete || turnStraightComplete

  // ── VALUE hands: villain's range is capped so bet for thin to fat value ──
  if (madFlush)    return { action: 'bet', sizing: '66%', reason: 'Flush completo! Aposta de valor de 66% — range do vilao esta capped (ele nao apostar ia o flop com hand muito forte), extraia o maximo.' }
  if (madStraight) return { action: 'bet', sizing: '66%', reason: 'Straight completa! Aposte 66% por valor. Range capped do vilao significa que ele vai defender com par ou draw — lucre sobre isso.' }
  if (isSet)       return { action: 'bet', sizing: '66%', reason: 'Set! Aposte 66% por valor — vilao checou o flop, entao o range dele e fraco. Construa o pote enquanto voce e forte.' }
  if (isTwoPair)   return { action: 'bet', sizing: '66%', reason: 'Dois pares no turn! Probe bet de 66% — vilao nao pode ter mao muito forte (teria apostado no flop). Extraia valor do par dele.' }
  if (isOP)        return { action: 'bet', sizing: '66%', reason: 'Overpair! Com o range do vilao capped pelo check do flop, overpair e muito forte aqui. Probe bet de 66% por valor.' }

  // ── GOOD VALUE: top pair after raiser checked is a premium spot ──────────
  if (isTopPair)   return { action: 'bet', sizing: '50%', reason: 'Top pair no turn — probe bet de 50%. Vilao provavelmente tem par medio, draw ou ar. Range capped = seu top pair e quase sempre na frente.' }

  // ── SEMI-BLUFFS: draws bet less since villain may trap ───────────────────
  if (isFD && isSD) {
    if (drawCompleted) return { action: 'bet', sizing: '33%', reason: 'Combo draw (flush + straight), mas turn completou possivel draw — cuidado com check-trap. Probe bet minima de 33% semi-blefe.' }
    return { action: 'bet', sizing: '50%', reason: 'Combo draw (flush + straight)! Semi-blefe de 50% — muita equity (~45%) contra range capped do vilao. Chance alta de ganhar agora ou no river.' }
  }
  if (isFD) {
    if (drawCompleted) return { action: 'check', sizing: null, reason: 'Flush draw em turn que completa draws — risco de check-trap do vilao. Melhor checar e ver o river de graca.' }
    return { action: 'bet', sizing: '33%', reason: 'Flush draw — semi-blefe de 33%. Range do vilao e capped pelo check do flop. Voce tem fold equity + 9 outs caso chamem.' }
  }
  if (isSD) {
    if (drawCompleted) return { action: 'check', sizing: null, reason: 'Straight draw em turn que completa possiveis draws — vilao pode ter se check-trapado. Cheque e preserve a equity.' }
    return { action: 'bet', sizing: '33%', reason: 'Straight draw — semi-blefe de 33%. Check do vilao no flop limita o range dele. Voce tem 8 outs + fold equity contra maos medianas.' }
  }

  // ── SHOWDOWN VALUE: middle/bottom pair — do NOT build pot OOP ────────────
  if (hasPair) return { action: 'check', sizing: null, reason: 'Par medio/baixo — cheque. Tem showdown value, mas nao e forte o suficiente pra construir pote OOP. Deixe o vilao blefar ou veja o river de graca.' }

  // ── BLUFFS without a pair: depends heavily on turn card and board ─────────
  // If turn is an overcard (A or K) — great bluff card (represent hitting it)
  if (!hasPair && (turnRank === 'A' || turnRank === 'K')) {
    return { action: 'bet', sizing: '50%', reason: `Turn ${turnRank} e um excelente carte de blefe! Voce representa ter acertado o overcard. Range capped do vilao significa que ele nao pode ter o ${turnRank} muito frequentemente (teria apostado antes). Probe bet de 50%.` }
  }

  // Brick turn on dry board — attack villain's weakness freely
  if (!hasPair && texture.isDry && !drawCompleted) {
    return { action: 'bet', sizing: '33%', reason: 'Turn brick em board seco — probe bet de 33% como blefe. Check do vilao no flop mostra fraqueza real em board seco. Ataque essa fraqueza com aposta barata.' }
  }

  // Brick turn on wet board — villain may be check-trapping draws
  if (!hasPair && texture.isWet && !drawCompleted) {
    return { action: 'check', sizing: null, reason: 'Board umido sem mao — cheque. Em boards conectados/suited, check do vilao pode ser check-trap com draw ou mao forte. Nao construa pote OOP sem equity.' }
  }

  // Turn completes a draw and we have nothing — too risky to bluff
  if (!hasPair && drawCompleted) {
    return { action: 'check', sizing: null, reason: 'Turn completou possivel draw e voce nao tem nada — cheque. Vilao pode ter check-trapeado com exatamente essa mao. Nao blefe em cartas que completam draws.' }
  }

  // Default: no hand, no good story → check
  return { action: 'check', sizing: null, reason: 'Sem mao e sem historia convincente — cheque. Para probe bet funcionar voce precisa de equity (draw), mao de valor, ou um turn card que faz sentido representar.' }
}

// ─── Scenario generator ───────────────────────────────────────────────────────
function generateScenario() {
  const heroPositions    = ['BB', 'SB']
  const villainPositions = ['CO', 'BTN', 'HJ']
  const heroPos    = heroPositions[Math.floor(Math.random() * heroPositions.length)]
  const villainPos = villainPositions[Math.floor(Math.random() * villainPositions.length)]

  const flop = randomCards(3, [])
  const turn = randomCards(1, flop)[0]
  const hole = randomCards(2, [...flop, turn])

  const board   = [...flop, turn]
  const texture = getBoardTexture(flop)
  const result  = getCorrectAction(hole, flop, turn)

  const turnDisplay = turn.slice(0, -1) + (turn.slice(-1) === 's' ? '♠' : turn.slice(-1) === 'h' ? '♥' : turn.slice(-1) === 'd' ? '♦' : '♣')

  const question = `Vilao (${villainPos}) abriu pre-flop e voce chamou do ${heroPos}. Ele checou o flop. Turn: ${turnDisplay}. O que voce faz?`

  const options = [
    { id: 'bet33', label: 'Apostar 33% (blefe/draw)', action: 'bet', sizing: '33%' },
    { id: 'bet50', label: 'Apostar 50% (valor/blefe)', action: 'bet', sizing: '50%' },
    { id: 'bet66', label: 'Apostar 66% (valor forte)', action: 'bet', sizing: '66%' },
    { id: 'check', label: 'Checar', action: 'check', sizing: null },
  ]

  const textureTags = [
    { label: texture.isDry ? 'Flop Seco' : 'Flop Umido', color: texture.isDry ? '#4fce82' : '#e5484d' },
    ...(texture.suited    ? [{ label: 'Suited', color: '#0a84d7' }] : []),
    ...(texture.connected ? [{ label: 'Conectado', color: '#f5a623' }] : []),
    ...(texture.paired    ? [{ label: 'Pareado', color: '#888' }] : []),
    { label: `Turn: ${turn.slice(0, -1)}`, color: '#9b59b6' },
  ]

  const potOptions = ['7bb', '8bb', '9bb', '10bb', '11bb', '12bb']
  const potLabel   = potOptions[Math.floor(Math.random() * potOptions.length)]

  return {
    question,
    options,
    explanation: result.reason,
    correctAction: result.action,
    correctSizing: result.sizing,
    heroCards: hole,
    boardCards: board,
    heroPos,
    villainPos,
    villainAction: 'Check (flop)',
    potLabel,
    textureTags,
  }
}

// ─── Section component ────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
      <h3 style={{ color: 'white', fontWeight: 600, marginBottom: 8 }}>{title}</h3>
      <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>{children}</div>
    </div>
  )
}

// ─── Lesson component ─────────────────────────────────────────────────────────
function Lesson({ onComplete }) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        Probe Bet / Delayed CBet
      </h1>
      <p style={{ color: '#888', marginBottom: 24 }}>
        Voce chamou fora de posicao. O raiser checou o flop — sinal de fraqueza. No turn, voce assume o controle.
      </p>

      <div className="space-y-4">

        <Section title="O que e a Probe Bet?">
          A <strong style={{ color: '#4fce82' }}>probe bet</strong> (tambem chamada de <em>delayed c-bet</em>) e quando
          voce aposta no turn <strong style={{ color: 'white' }}>depois que o raiser original checou o flop.</strong>
          <br /><br />
          Normalmente o raiser aposta o flop (c-bet). Quando ele <strong style={{ color: '#e5484d' }}>nao aposta</strong>,
          isso e incomum e revela fraqueza — ele provavelmente nao conectou bem com o board.
          Voce, que estava passivo no flop, agora toma a iniciativa no turn.
        </Section>

        <Section title="Por que funciona? O range do vilao esta capped">
          <strong style={{ color: '#f5a623' }}>Capped range</strong> significa que o vilao nao pode ter maos muito
          fortes nessa situacao. Por que?
          <br /><br />
          Se ele tivesse set, dois pares, overpair forte ou top pair com bom kicker, ele teria apostado o flop
          pra proteger e extrair valor. O fato de ter checado elimina essas maos fortes do range dele.
          <br /><br />
          <div className="rounded-lg p-3 mt-2" style={{ background: '#0f0f0f', border: '1px solid #f5a62344' }}>
            <div style={{ color: '#f5a623', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Resultado pratico:</div>
            <div style={{ color: '#ccc', fontSize: 13 }}>
              Range capped = mais pares medianos, draws e maos fracas. Essas maos nao aguentam
              pressao de probe bet — elas foldiam ou chamam com desvantagem.
            </div>
          </div>
        </Section>

        <Section title="Quando fazer Probe Bet">
          <div className="space-y-2 mt-2">
            {[
              { label: 'Mao forte (set, flush, straight, dois pares)', color: '#e5484d', desc: 'Valor direto — range capped del = ele paga mais do que deveria' },
              { label: 'Overpair', color: '#e5484d', desc: 'Muito forte contra range capped. Aposte e extraia valor' },
              { label: 'Top pair', color: '#f5a623', desc: 'Bom valor OOP. Vilao provavelmente tem par medio ou pior' },
              { label: 'Flush draw / Straight draw', color: '#4a90e2', desc: 'Semi-blefe com equity. Fold equity + outs = lucrativo' },
              { label: 'Turn overcard (A, K)', color: '#4fce82', desc: 'Excelente blefe. Voce representa ter acertado o A ou K' },
              { label: 'Turn brick em board seco', color: '#4fce82', desc: 'Blefe barato. Check no flop seco = fraqueza real' },
            ].map((item, i) => (
              <div key={i} className="rounded-lg px-3 py-2" style={{ background: '#0f0f0f' }}>
                <div style={{ color: item.color, fontWeight: 600, fontSize: 13 }}>{item.label}</div>
                <div style={{ color: '#888', fontSize: 12 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Quando NAO fazer Probe Bet">
          <div className="space-y-2 mt-2">
            {[
              { label: 'Par medio ou baixo', color: '#e5484d', desc: 'Tem showdown value. Nao construa pote OOP com mao vulneravel' },
              { label: 'Board umido sem mao nem draw', color: '#e5484d', desc: 'Vilao pode estar se check-trapando com draw ou mao forte' },
              { label: 'Turn completa draw obvio (flush/straight)', color: '#e5484d', desc: 'Vilao pode ter checado o flop esperando exatamente essa carta' },
              { label: 'Sem historia convincente', color: '#e5484d', desc: 'Probe bet precisa de uma narrativa. Sem equity e sem representacao, nao aposte' },
            ].map((item, i) => (
              <div key={i} className="rounded-lg px-3 py-2" style={{ background: '#0f0f0f' }}>
                <div style={{ color: item.color, fontWeight: 600, fontSize: 13 }}>{item.label}</div>
                <div style={{ color: '#888', fontSize: 12 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Sizings da Probe Bet">
          <div className="grid grid-cols-3 gap-2 mt-2">
            {[
              { size: '33%', color: '#4fce82', name: 'Pequena', when: 'Blefes puros e semi-blefes (draws)', note: 'Risco minimo, fold equity suficiente contra range capped' },
              { size: '50%', color: '#f5a623', name: 'Media', when: 'Top pair, turn overcard (A/K), combo draws', note: 'Equilibrio entre extrair valor e nao assustar' },
              { size: '66%', color: '#e5484d', name: 'Grande', when: 'Maos muito fortes: set, flush, straight, dois pares, overpair', note: 'Range do vilao e capped = ele paga com mao inferior' },
            ].map(s => (
              <div key={s.size} className="rounded-lg p-3" style={{ background: '#0f0f0f', border: `1px solid ${s.color}` }}>
                <div style={{ color: s.color, fontWeight: 700, fontSize: 18 }}>{s.size}</div>
                <div style={{ color: 'white', fontWeight: 600, fontSize: 12, marginTop: 2 }}>{s.name}</div>
                <div style={{ color: '#ccc', fontSize: 11, marginTop: 4 }}>{s.when}</div>
                <div style={{ color: '#666', fontSize: 10, marginTop: 4 }}>{s.note}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="A Carta do Turn Importa Muito">
          O turn card muda completamente a dinamica da probe bet:
          <div className="space-y-2 mt-3">
            {[
              { card: 'A ou K (overcard)', color: '#4fce82', desc: 'Excelente — voce representa ter acertado. Probe bet de 50%.' },
              { card: 'Brick em board seco', color: '#4fce82', desc: 'Bom blefe. Check do flop em board seco = fraqueza real. Probe 33%.' },
              { card: 'Brick em board umido', color: '#f5a623', desc: 'Cuidado. Vilao pode estar check-trapeado com draw. Prefira checar.' },
              { card: 'Completa flush/straight', color: '#e5484d', desc: 'Risco alto. Vilao pode ter esperado exatamente por essa carta. Nao blefe aqui.' },
              { card: 'Overcard pequeno (9, T)', color: '#888', desc: 'Depende do contexto. Normalize com o range e board geral.' },
            ].map((item, i) => (
              <div key={i} className="rounded-lg px-3 py-2" style={{ background: '#0f0f0f' }}>
                <div style={{ color: item.color, fontWeight: 600, fontSize: 13 }}>Turn: {item.card}</div>
                <div style={{ color: '#888', fontSize: 12 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Flop Seco vs Board Umido na Probe Bet">
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #4fce82' }}>
              <div style={{ color: '#4fce82', fontWeight: 600 }}>Board Seco</div>
              <div style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>
                Ex: A♠ 7♦ 2♣<br /><br />
                Check nesse board = fraqueza maxima. Probe mais frequente com sizings variadas. Blefes baratos (33%) funcionam bem.
              </div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #e5484d' }}>
              <div style={{ color: '#e5484d', fontWeight: 600 }}>Board Umido</div>
              <div style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>
                Ex: 9♠ 8♥ 7♠<br /><br />
                Check pode ser check-trap com draw. Probe apenas com maos de valor ou draws proprios. Evite blefes puros.
              </div>
            </div>
          </div>
        </Section>

        <Section title="Resumo: A Regra de Ouro da Probe Bet">
          <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #4a90e2' }}>
            <div style={{ color: '#4a90e2', fontWeight: 700, marginBottom: 6 }}>Pense assim:</div>
            <ul className="space-y-1" style={{ color: '#ccc', fontSize: 13 }}>
              <li>1. Vilao checou = range capped (sem maos muito fortes)</li>
              <li>2. Tenho equity (draw) ou mao de valor? → Aposta proporcional</li>
              <li>3. O turn card favorece meu range ou me da historia? → Probe bet</li>
              <li>4. Sem equity, sem historia, board umido? → Check e preserva o pote</li>
            </ul>
          </div>
        </Section>

      </div>

      <button
        onClick={onComplete}
        className="w-full mt-8 py-4 rounded-xl font-bold text-white text-lg"
        style={{ background: '#e5484d' }}
      >
        Entendi — Quero Treinar
      </button>
    </div>
  )
}

// ─── Trainer component ────────────────────────────────────────────────────────
function Trainer() {
  const { progress, recordAnswer, recordSession } = useProgress()

  const [scenario, setScenario]           = useState(() => generateScenario())
  const [feedback, setFeedback]           = useState(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal]   = useState(0)
  const [streak, setStreak]               = useState(0)
  const [sessionDone, setSessionDone]     = useState(false)

  function newHand() {
    if (sessionTotal >= 10) { setSessionDone(true); return }
    setScenario(generateScenario())
    setFeedback(null)
  }

  function answer(action, sizing) {
    if (feedback) return
    const isCorrect =
      action === scenario.correctAction &&
      (action === 'check' || sizing === scenario.correctSizing)

    const newStreak   = isCorrect ? streak + 1 : 0
    setStreak(newStreak)
    const newTotal    = sessionTotal + 1
    const newCorrect  = sessionCorrect + (isCorrect ? 1 : 0)
    setSessionTotal(newTotal)
    setSessionCorrect(newCorrect)
    recordAnswer(30, isCorrect, newStreak)
    const isLast = newTotal >= 10
    if (isLast) recordSession(30, Math.round((newCorrect / newTotal) * 100))
    setFeedback({ isCorrect, isLast, explanation: scenario.explanation, correctAction: scenario.correctAction, correctSizing: scenario.correctSizing })
  }

  function restart() {
    setSessionCorrect(0)
    setSessionTotal(0)
    setStreak(0)
    setSessionDone(false)
    setFeedback(null)
    setScenario(generateScenario())
  }

  if (sessionDone) {
    return (
      <SessionReview
        moduleId={30}
        sessionCorrect={sessionCorrect}
        sessionTotal={sessionTotal}
        onContinue={restart}
      />
    )
  }

  const optionColors = { bet33: '#4fce82', bet50: '#f5a623', bet66: '#e5484d', check: '#4a90e2' }

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      {/* Progress header */}
      <div className="rounded-xl p-3 mb-4 flex justify-between" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
        <div style={{ color: '#888', fontSize: 13 }}>Sessao: {sessionCorrect}/{sessionTotal} · Seq: {streak}</div>
        <div style={{ color: '#888', fontSize: 13 }}>Meta: 10 maos</div>
      </div>
      <div className="rounded-full h-2 mb-6" style={{ background: '#2a2a2e' }}>
        <div
          className="rounded-full h-2 transition-all"
          style={{ width: `${(sessionTotal / 10) * 100}%`, background: '#e5484d' }}
        />
      </div>

      {/* Poker table */}
      <ModulePokerTable
        heroPos={scenario.heroPos}
        villainPos={scenario.villainPos}
        heroCards={scenario.heroCards}
        boardCards={scenario.boardCards}
        villainAction={scenario.villainAction}
        potLabel={scenario.potLabel}
        contextTitle={`Voce esta OOP (${scenario.heroPos}) — Turn`}
        contextDesc={scenario.question}
        textureTags={scenario.textureTags}
      />

      {/* Action buttons */}
      {!feedback && (
        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'bet33', label: 'BET 33%', action: 'bet', sizing: '33%' },
              { id: 'bet50', label: 'BET 50%', action: 'bet', sizing: '50%' },
              { id: 'bet66', label: 'BET 66%', action: 'bet', sizing: '66%' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => answer(opt.action, opt.sizing)}
                className="py-3 rounded-xl font-bold"
                style={{ background: optionColors[opt.id], color: opt.id === 'check' ? 'white' : '#0f0f0f' }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => answer('check', null)}
            className="w-full py-4 rounded-xl font-bold text-xl"
            style={{ background: optionColors.check, color: 'white' }}
          >
            CHECK
          </button>
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div
          className="rounded-xl p-4 mb-4"
          style={{ background: '#1a1a1d', border: `2px solid ${feedback.isCorrect ? '#4fce82' : '#e5484d'}` }}
        >
          <div style={{ color: feedback.isCorrect ? '#4fce82' : '#e5484d', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
            {feedback.isCorrect ? 'Correto!' : 'Incorreto'}
          </div>
          <button
            onClick={newHand}
            className="w-full py-3 rounded-lg font-semibold mb-4"
            style={{ background: '#e5484d', color: 'white', fontSize: 16 }}
          >
            Proxima Mao
          </button>
          <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>{feedback.explanation}</div>
          <div style={{ color: '#555', fontSize: 12, marginTop: 8 }}>
            Correto:{' '}
            <strong style={{ color: '#f5a623' }}>
              {feedback.correctAction === 'check' ? 'CHECK' : `BET ${feedback.correctSizing}`}
            </strong>
          </div>
          {!feedback.isCorrect && (
            <div className="mt-3 rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #4a90e230' }}>
              <div style={{ color: '#4a90e2', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Guia de Probe Bet</div>
              <div style={{ color: '#ccc', fontSize: 12, lineHeight: 1.7 }}>
                <div>• <strong style={{ color: '#e5484d' }}>Set / Flush / Straight / Dois pares / Overpair</strong> → BET 66%</div>
                <div>• <strong style={{ color: '#f5a623' }}>Top pair / Turn overcard (A, K) / Combo draw</strong> → BET 50%</div>
                <div>• <strong style={{ color: '#4fce82' }}>Flush draw / Straight draw / Brick seco blefe</strong> → BET 33%</div>
                <div>• <strong style={{ color: '#888' }}>Par medio, board umido sem mao, turn completa draw</strong> → CHECK</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Module default export ────────────────────────────────────────────────────
export default function Module30() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[30]?.lessonRead ? 'trainer' : 'lesson')

  if (!progress.modules[30]?.unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f0f' }}>
        <div className="text-center">
          <div style={{ fontSize: 60 }}>🔒</div>
          <h2 style={{ color: 'white', marginTop: 16 }}>Modulo Bloqueado</h2>
          <p style={{ color: '#888', marginTop: 8 }}>Complete o Modulo 29 para desbloquear.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0f0f0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setView('lesson')}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{
              background: view === 'lesson' ? '#e5484d' : '#1a1a1d',
              color: view === 'lesson' ? 'white' : '#888',
              border: '1px solid #2a2a2e',
            }}
          >
            Aula
          </button>
          <button
            onClick={() => progress.modules[30]?.lessonRead && setView('trainer')}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{
              background: view === 'trainer' ? '#e5484d' : '#1a1a1d',
              color: view === 'trainer' ? 'white' : (progress.modules[30]?.lessonRead ? '#888' : '#444'),
              border: '1px solid #2a2a2e',
              cursor: progress.modules[30]?.lessonRead ? 'pointer' : 'not-allowed',
            }}
          >
            Trainer {!progress.modules[30]?.lessonRead && '🔒'}
          </button>
        </div>
        {view === 'lesson'
          ? <Lesson onComplete={() => { markLessonRead(30); setView('trainer') }} />
          : <Trainer />
        }
      </div>
    </div>
  )
}
