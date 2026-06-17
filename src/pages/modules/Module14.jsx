import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'
import Card from '../../components/Card'

const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2']
const SUITS = ['s','h','d','c']

function randomCards(n, exclude = []) {
  const cards = []
  while (cards.length < n) {
    const c = RANKS[Math.floor(Math.random() * RANKS.length)] + SUITS[Math.floor(Math.random() * SUITS.length)]
    if (!cards.includes(c) && !exclude.includes(c)) cards.push(c)
  }
  return cards
}

function getBoardTexture(cards) {
  const ranks = cards.map(c => RANKS.indexOf(c.slice(0, -1)))
  const suits = cards.map(c => c.slice(-1))
  const suitCounts = {}
  suits.forEach(s => { suitCounts[s] = (suitCounts[s] || 0) + 1 })
  const flushPossible = Object.values(suitCounts).some(v => v >= 3)
  const flushComplete = Object.values(suitCounts).some(v => v >= 4)
  const sorted = [...new Set(ranks)].sort((a, b) => a - b)
  let straightPossible = false
  for (let i = 0; i < sorted.length - 2; i++) {
    if (sorted[i + 2] - sorted[i] <= 4) { straightPossible = true; break }
  }
  return { flushPossible, flushComplete, straightPossible }
}

function hasTopPair(hole, board) {
  const boardRanks = board.map(c => c.slice(0, -1))
  const holeRanks = hole.map(c => c.slice(0, -1))
  const topRank = [...boardRanks].sort((a, b) => RANKS.indexOf(a) - RANKS.indexOf(b))[0]
  return holeRanks.includes(topRank)
}

function hasAnyPair(hole, board) {
  const boardRanks = board.map(c => c.slice(0, -1))
  return hole.map(c => c.slice(0, -1)).some(r => boardRanks.includes(r))
}

function hasFlushDraw(hole, board) {
  const suitCounts = {}
  ;[...hole, ...board].forEach(c => { const s = c.slice(-1); suitCounts[s] = (suitCounts[s] || 0) + 1 })
  return Object.values(suitCounts).some(v => v === 4)
}

function hasMadeFlush(hole, board) {
  const suitCounts = {}
  ;[...hole, ...board].forEach(c => { const s = c.slice(-1); suitCounts[s] = (suitCounts[s] || 0) + 1 })
  return Object.values(suitCounts).some(v => v >= 5)
}

function hasSetFn(hole, board) {
  const holeRanks = hole.map(c => c.slice(0, -1))
  const boardRanks = board.map(c => c.slice(0, -1))
  return holeRanks[0] === holeRanks[1] && boardRanks.includes(holeRanks[0])
}

function hasTwoPairFn(hole, board) {
  const holeRanks = hole.map(c => c.slice(0, -1))
  const boardRanks = board.map(c => c.slice(0, -1))
  if (holeRanks[0] === holeRanks[1]) return false
  return [...new Set(holeRanks)].filter(r => boardRanks.includes(r)).length === 2
}

function hasOverpair(hole, board) {
  const holeRanks = hole.map(c => c.slice(0, -1))
  if (holeRanks[0] !== holeRanks[1]) return false
  const pocketIdx = RANKS.indexOf(holeRanks[0])
  const topBoardIdx = Math.min(...board.map(c => RANKS.indexOf(c.slice(0, -1))))
  return pocketIdx < topBoardIdx
}

function hasStraightDraw(hole, board) {
  const holeRankVals = hole.map(c => { const r = c.slice(0, -1); return r === 'A' ? [0, 13] : [RANKS.indexOf(r)] }).flat()
  const allVals = [...hole, ...board].map(c => { const r = c.slice(0, -1); return r === 'A' ? [0, 13] : [RANKS.indexOf(r)] }).flat()
  const unique = [...new Set(allVals)].sort((a, b) => a - b)

  // Ja tem straight? Nao e draw
  for (let i = 0; i <= unique.length - 5; i++) {
    if (unique[i + 4] - unique[i] === 4) {
      const straight5 = [unique[i], unique[i]+1, unique[i]+2, unique[i]+3, unique[i]+4]
      if (straight5.every(v => unique.includes(v))) return false
    }
  }

  // OESD: 4 consecutivas com hole contribuindo
  for (let start = 0; start <= 12; start++) {
    const run = [start, start+1, start+2, start+3]
    const have = run.filter(v => unique.includes(v))
    if (have.length >= 4) {
      if (holeRankVals.some(r => run.includes(r))) return true
    }
  }

  // Gutshot: 4 de 5 consecutivas, hole preenche um dos 4
  for (let start = 0; start <= 8; start++) {
    const run5 = [start, start+1, start+2, start+3, start+4]
    const have = run5.filter(v => unique.includes(v))
    if (have.length === 4) {
      if (holeRankVals.some(r => run5.includes(r) && unique.includes(r))) return true
    }
  }

  return false
}

// Verifica se a mao teria c-betado no flop (filtra maos irreais no cenario de double barrel)
function wouldCbetFlop(hole, flop) {
  const holeRanks = hole.map(c => c.slice(0, -1))
  const isPocketPair = holeRanks[0] === holeRanks[1]

  // Qualquer mao feita ou draw forte: sim
  if (hasMadeFlush(hole, flop) || hasSetFn(hole, flop) || hasTwoPairFn(hole, flop)) return true
  if (hasOverpair(hole, flop) || hasTopPair(hole, flop)) return true
  if (hasFlushDraw(hole, flop) || hasStraightDraw(hole, flop)) return true
  if (hasAnyPair(hole, flop) || isPocketPair) return true

  // Broadways (duas cartas altas) - cbet como blefe em qualquer board
  const holeIdxs = holeRanks.map(r => RANKS.indexOf(r))
  if (holeIdxs.every(i => i <= 4)) return true // ambas T+

  // Uma carta alta (A ou K) - cbet em boards secos
  if (holeIdxs.some(i => i <= 1)) return true

  // Board seco: cbet com qualquer mao
  const suits = flop.map(c => c.slice(-1))
  const suited = suits[0] === suits[1] || suits[1] === suits[2] || suits[0] === suits[2]
  const ranks = flop.map(c => RANKS.indexOf(c.slice(0, -1))).sort((a, b) => a - b)
  const connected = (ranks[2] - ranks[0]) <= 4
  if (!suited && !connected) return true

  return false
}

// Turn card types
function isTurnScary(flop, turn) {
  const turnRank = RANKS.indexOf(turn.slice(0, -1))
  const turnSuit = turn.slice(-1)
  const flopSuits = flop.map(c => c.slice(-1))
  const flopRanks = flop.map(c => RANKS.indexOf(c.slice(0, -1)))

  // Flush completing card (3 do mesmo naipe no flop+turn)
  const allSuits = [...flopSuits, turnSuit]
  const suitCounts = {}
  allSuits.forEach(s => { suitCounts[s] = (suitCounts[s] || 0) + 1 })
  const flushSuitCount = suitCounts[turnSuit] || 0
  // Se o turn faz 3+ do mesmo naipe com o flop, flush draw ficou perigoso
  const flopSuitCount = flopSuits.filter(s => s === turnSuit).length
  if (flopSuitCount >= 2) return { scary: true, type: 'flush', desc: 'Carta do mesmo naipe - possivel flush completado' }

  // Brings flush draw (2 do mesmo naipe no flop, turn faz 3)
  const bringsFlushDraw = flopSuitCount === 1

  // Straight completing: checa se 4 cartas consecutivas existem no board
  const allRanks = [...new Set([...flopRanks, turnRank])].sort((a, b) => a - b)
  let straightComplete = false
  for (let i = 0; i <= allRanks.length - 4; i++) {
    if (allRanks[i + 3] - allRanks[i] === 3) { straightComplete = true; break }
  }
  // A-2-3-4 wheel
  if (allRanks.includes(0) && [9,10,11,12].filter(r => allRanks.includes(r)).length >= 3) straightComplete = true
  if (straightComplete) return { scary: true, type: 'straight', desc: 'Board muito conectado - possivel straight completado' }

  // Overcard (A ou K acima do flop)
  if (turnRank <= 1 && turnRank < Math.min(...flopRanks)) return { scary: true, type: 'overcard', desc: 'Overcard alta (A/K) - muda a dinamica' }

  // Low overcard ou mid card: semi-scary
  if (turnRank < Math.min(...flopRanks) && turnRank <= 4) return { scary: false, type: 'overcard_low', desc: 'Overcard media - ligeiramente perigosa' }

  return { scary: false, type: 'brick', desc: 'Brick - carta inofensiva que nao muda nada' }
}

// Kicker quality: 0 = A, 1 = K, ..., quem tiver menor idx = melhor kicker
function getKickerRank(hole, board) {
  const holeRanks = hole.map(c => RANKS.indexOf(c.slice(0, -1)))
  const boardRanks = board.map(c => RANKS.indexOf(c.slice(0, -1)))
  const paired = holeRanks.filter(r => boardRanks.includes(RANKS[r]))
  const kicker = holeRanks.filter(r => !boardRanks.includes(RANKS[r]))
  return kicker.length > 0 ? Math.min(...kicker) : Math.min(...holeRanks)
}

// CBet turn IP: voce apostou no flop, adversario chamou. Turn saiu. Double barrel ou check?
function getCorrectAction(hole, flop, turn) {
  const board = [...flop, turn]
  const turnInfo = isTurnScary(flop, turn)

  // Mao muito forte: sempre barrel
  if (hasMadeFlush(hole, board) || hasSetFn(hole, board) || hasTwoPairFn(hole, board)) {
    return { action: 'bet', sizing: '66%', reason: 'Mao muito forte no turn - aposte! Continue construindo pote. Voce quer ser pago.' }
  }

  // Overpair
  if (hasOverpair(hole, board)) {
    if (turnInfo.scary && turnInfo.type === 'flush') {
      return { action: 'check', reason: 'Overpair mas turn completou possivel flush. Check pra controlar o pote - se o adversario apostar grande, pode estar com flush.' }
    }
    return { action: 'bet', sizing: '66%', reason: 'Overpair - continue apostando no turn. Sua mao provavelmente ainda e a melhor. Aposte 66% pra valor e protecao.' }
  }

  // Top pair
  if (hasTopPair(hole, board)) {
    // Top pair com bom kicker (A-J) aposta na maioria dos turns
    const kicker = getKickerRank(hole, board)
    const goodKicker = kicker <= 3 // A, K, Q, J
    if (turnInfo.scary && turnInfo.type === 'flush') {
      return { action: 'check', reason: 'Top pair mas turn completou possivel flush. Check pra controlar o pote.' }
    }
    if (goodKicker) {
      return { action: 'bet', sizing: '50%', reason: 'Top pair com bom kicker - continue apostando (50%). O adversario provavelmente tem pior e pode pagar com draws ou pares inferiores.' }
    }
    if (turnInfo.scary && turnInfo.type === 'straight') {
      return { action: 'check', reason: 'Top pair com kicker fraco em board conectado. Check pra controlar o pote.' }
    }
    return { action: 'bet', sizing: '50%', reason: 'Top pair em turn favoravel - aposte 50%. Extraia valor enquanto sua mao ainda e boa.' }
  }

  // Flush draw: barrel como semi-blefe
  if (hasFlushDraw(hole, board)) {
    return { action: 'bet', sizing: '50%', reason: 'Flush draw no turn - double barrel como semi-blefe! Voce tem 9 outs (~20% no river). Se ele foldar, voce ganha na hora. Se chamar, voce ainda pode completar.' }
  }

  // Straight draw: quase sempre barrel como semi-blefe
  if (hasStraightDraw(hole, board)) {
    if (turnInfo.scary && turnInfo.type === 'flush') {
      return { action: 'check', reason: 'Straight draw mas turn trouxe flush possivel. Check - adversario pode ter flush e seus outs podem nao ser limpos.' }
    }
    return { action: 'bet', sizing: '33%', reason: 'Straight draw no turn - barrel pequeno (33%) como semi-blefe. Voce tem 8 outs e mantem a pressao.' }
  }

  // Par medio com draw
  if (hasAnyPair(hole, board) && (hasFlushDraw(hole, board) || hasStraightDraw(hole, board))) {
    return { action: 'bet', sizing: '33%', reason: 'Par + draw - barrel pequeno como semi-blefe. Voce tem equity extra com o draw.' }
  }

  // Par medio/baixo puro
  if (hasAnyPair(hole, board)) {
    return { action: 'check', reason: 'Par medio/baixo no turn - check. Sua mao nao e forte o bastante pra apostar duas ruas. Controle o pote.' }
  }

  // Overcard de A ou K no turn: bom para blefar (representa que acertou)
  if (turnInfo.type === 'overcard') {
    return { action: 'bet', sizing: '50%', reason: 'Turn trouxe overcard alta - bom pra blefar! Voce pode representar que acertou a carta. Aposte 50% como blefe.' }
  }

  // Duas overcards na mao (AK, AQ, KQ sem par): bom blefe no turn
  const holeRanks = hole.map(c => RANKS.indexOf(c.slice(0, -1)))
  const boardRanksSorted = board.map(c => RANKS.indexOf(c.slice(0, -1))).sort((a, b) => a - b)
  const bothOvercards = holeRanks.every(r => r < boardRanksSorted[0])
  if (bothOvercards && Math.max(...holeRanks) <= 3) {
    if (!turnInfo.scary) {
      return { action: 'bet', sizing: '50%', reason: 'Duas overcards (broadways) sem par - bom double barrel como blefe. Voce tem 6 outs de overcard e fold equity.' }
    }
  }

  // Backdoor equity: carta alta com alguma chance
  if (holeRanks.some(r => r <= 2) && !turnInfo.scary) {
    return { action: 'bet', sizing: '33%', reason: 'Carta alta sem par - barrel pequeno (33%). Voce ainda pode melhorar no river e tem fold equity.' }
  }

  // Nada: check
  return { action: 'check', reason: 'Sem mao, sem draw, turn nao ajuda pra blefe. Check - nao desperdice mais fichas.' }
}

function Lesson({ onComplete }) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        CBet Turn IP — Double Barrel
      </h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Você apostou no flop é chamaram. O turn saiu. Continuar ou frear?</p>
      <div className="space-y-4">
        <Section title="O Que é Double Barrel?">
          Double barrel é apostar no flop E no turn. E uma continuacao da sua agressividade pré-flop.<br /><br />
          <strong style={{ color: '#f5a623' }}>Não é obrigatorio.</strong> Muitos jogadores erram apostando mecanicamente em todas as ruas. A chave é entender QUANDO continuar.
        </Section>
        <Section title="A Carta do Turn Muda Tudo">
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #00d4aa' }}>
              <div style={{ color: '#00d4aa', fontWeight: 600 }}>Boas pra barrel</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>
                • Brick (carta baixa sem conexao)<br />
                • Overcard que você pode representar<br />
                • Carta que completa SEU draw
              </div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #e94560' }}>
              <div style={{ color: '#e94560', fontWeight: 600 }}>Ruins pra barrel</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>
                • Completa flush draw obvio<br />
                • Completa straight draw obvio<br />
                • Carta que ajuda o range do adversário
              </div>
            </div>
          </div>
        </Section>
        <Section title="Quando Double Barrel">
          <div className="space-y-2">
            {[
              'Mao forte (set, dois pares, overpair) — sempre continue apostando',
              'Top pair em turn brick — continue extraindo valor',
              'Flush draw — semi-blefe, você tem outs',
              'Turn e overcard e você pode representar — bom blefe',
            ].map((t, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span style={{ color: '#00d4aa' }}>✓</span>
                <span style={{ color: '#ccc', fontSize: 14 }}>{t}</span>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Quando Frear (Check no Turn)">
          <div className="space-y-2">
            {[
              'Par médio/baixo — controle o pote, você não aguenta raise',
              'Turn completou draw obvio — adversário pode ter melhorado',
              'Sem mão e turn não ajuda pra blefe — economize fichas',
              'Top pair em turn assustador — cautela, check e reavalie',
            ].map((t, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span style={{ color: '#e94560' }}>✗</span>
                <span style={{ color: '#ccc', fontSize: 14 }}>{t}</span>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Sizing no Turn">
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="rounded-lg p-3 text-center" style={{ background: '#0a0a0f', border: '1px solid #f5a623' }}>
              <div style={{ color: '#f5a623', fontWeight: 700, fontSize: 20 }}>50-66%</div>
              <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>Padrao — valor e semi-blefe</div>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: '#0a0a0f', border: '1px solid #00d4aa' }}>
              <div style={{ color: '#00d4aa', fontWeight: 700, fontSize: 20 }}>33%</div>
              <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>Blefe barato ou thin value</div>
            </div>
          </div>
        </Section>
      </div>
      <button onClick={onComplete} className="w-full mt-8 py-4 rounded-xl font-bold text-white text-lg" style={{ background: '#e94560' }}>
        Entendi — Quero Treinar
      </button>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
      <h3 style={{ color: 'white', fontWeight: 600, marginBottom: 8 }}>{title}</h3>
      <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>{children}</div>
    </div>
  )
}

function Trainer() {
  const { progress, recordAnswer, recordSession } = useProgress()
  const [flop, setFlop] = useState(null)
  const [turn, setTurn] = useState(null)
  const [hole, setHole] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [sessionDone, setSessionDone] = useState(false)

  function newHand() {
    if (sessionTotal >= 10) { setSessionDone(true); return }
    let f, t, h
    for (let i = 0; i < 100; i++) {
      f = randomCards(3)
      ;[t] = randomCards(1, f)
      h = randomCards(2, [...f, t])
      if (wouldCbetFlop(h, f)) break
    }
    setFlop(f); setTurn(t); setHole(h); setFeedback(null)
  }

  function answer(action) {
    if (!flop || feedback) return
    const correct = getCorrectAction(hole, flop, turn)
    const isCorrect = action === correct.action
    const newStreak = isCorrect ? streak + 1 : 0
    setStreak(newStreak)
    const newTotal = sessionTotal + 1, newCorrect = sessionCorrect + (isCorrect ? 1 : 0)
    setSessionTotal(newTotal); setSessionCorrect(newCorrect)
    recordAnswer(14, isCorrect, newStreak)
    const isLast = newTotal >= 10
    if (isLast) recordSession(14, Math.round((newCorrect / newTotal) * 100))
    setFeedback({ ...correct, isCorrect, isLast })
  }

  function restart() { setSessionCorrect(0); setSessionTotal(0); setStreak(0); setSessionDone(false); setFeedback(null); setFlop(null) }

  if (!flop && !sessionDone) newHand()

  const turnInfo = flop && turn ? isTurnScary(flop, turn) : null

  if (sessionDone) {
    const acc = Math.round((sessionCorrect / sessionTotal) * 100)
    return (
      <div className="text-center" style={{ maxWidth: 400, margin: '0 auto', paddingTop: 40 }}>
        <div style={{ fontSize: 60 }}>{acc >= 90 ? '🎉' : '💪'}</div>
        <h2 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginTop: 16 }}>Sessão Completa!</h2>
        <div style={{ color: acc >= 90 ? '#00d4aa' : '#f5a623', fontSize: 36, fontWeight: 700 }}>{acc}%</div>
        <button onClick={restart} className="mt-6 px-8 py-3 rounded-xl font-bold" style={{ background: '#e94560', color: 'white' }}>Nova Sessão</button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <div className="rounded-xl p-3 mb-4 flex justify-between" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
        <div style={{ color: '#888', fontSize: 13 }}>Sessão: {sessionCorrect}/{sessionTotal} · Seq: {streak}</div>
        <div style={{ color: '#888', fontSize: 13 }}>Meta: 10 mãos</div>
      </div>
      <div className="rounded-full h-2 mb-6" style={{ background: '#1e1e2e' }}>
        <div className="rounded-full h-2 transition-all" style={{ width: `${(sessionTotal / 10) * 100}%`, background: '#e94560' }} />
      </div>

      <div className="rounded-xl p-4 mb-4 text-center" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
        <div style={{ color: '#888', fontSize: 12 }}>SITUAÇÃO</div>
        <div style={{ color: '#00d4aa', fontSize: 18, fontWeight: 700 }}>Você está IP — Turn</div>
        <div style={{ color: '#ccc', fontSize: 13, marginTop: 2 }}>Você c-betou no flop e chamaram. Turn saiu. Double barrel?</div>
        {turnInfo && (
          <div className="mt-2">
            <span className="px-2 py-1 rounded text-xs" style={{
              background: turnInfo.scary ? '#e9456022' : '#00d4aa22',
              color: turnInfo.scary ? '#e94560' : '#00d4aa'
            }}>
              {turnInfo.desc}
            </span>
          </div>
        )}
      </div>

      <div className="mb-4">
        <div style={{ color: '#888', fontSize: 12, marginBottom: 8, textAlign: 'center' }}>SUAS CARTAS</div>
        <div className="flex justify-center gap-3 mb-4">
          {hole?.map((c, i) => <Card key={i} card={c} size="md" />)}
        </div>
        <div style={{ color: '#888', fontSize: 12, marginBottom: 8, textAlign: 'center' }}>FLOP + TURN</div>
        <div className="flex justify-center gap-3">
          {flop?.map((c, i) => <Card key={i} card={c} size="md" />)}
          {turn && <div style={{ borderLeft: '2px solid #333', margin: '0 4px' }} />}
          {turn && <Card card={turn} size="md" />}
        </div>
      </div>

      {!feedback && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[['check', 'CHECK', '#4a90e2', 'white'], ['bet', 'BET (BARREL)', '#f5a623', '#0a0a0f']].map(([action, label, bg, color]) => (
            <button key={action} onClick={() => answer(action)} className="py-4 rounded-xl font-bold text-lg" style={{ background: bg, color }}>{label}</button>
          ))}
        </div>
      )}

      {feedback && (
        <div className="rounded-xl p-4 mb-4" style={{ background: '#12121a', border: `2px solid ${feedback.isCorrect ? '#00d4aa' : '#e94560'}` }}>
          <div style={{ color: feedback.isCorrect ? '#00d4aa' : '#e94560', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
            {feedback.isCorrect ? 'Correto!' : 'Incorreto'}
          </div>
          <button onClick={newHand} className="w-full py-3 rounded-lg font-semibold mb-4" style={{ background: '#e94560', color: 'white', fontSize: 16 }}>Próxima Mao</button>
          <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>{feedback.reason}</div>
          <div style={{ color: '#555', fontSize: 12, marginTop: 8 }}>
            Correto: <strong style={{ color: '#f5a623' }}>{feedback.action === 'check' ? 'CHECK' : `BET ${feedback.sizing}`}</strong>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Module14() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[14]?.lessonRead ? 'trainer' : 'lesson')
  if (!progress.modules[14]?.unlocked) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
      <div className="text-center"><div style={{ fontSize: 60 }}>🔒</div><h2 style={{ color: 'white', marginTop: 16 }}>Módulo Bloqueado</h2><p style={{ color: '#888', marginTop: 8 }}>Complete o Módulo 13 para desbloquear.</p></div>
    </div>
  )
  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setView('lesson')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'lesson' ? '#e94560' : '#12121a', color: view === 'lesson' ? 'white' : '#888', border: '1px solid #1e1e2e' }}>Aula</button>
          <button onClick={() => progress.modules[14]?.lessonRead && setView('trainer')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'trainer' ? '#e94560' : '#12121a', color: view === 'trainer' ? 'white' : (progress.modules[14]?.lessonRead ? '#888' : '#444'), border: '1px solid #1e1e2e', cursor: progress.modules[14]?.lessonRead ? 'pointer' : 'not-allowed' }}>Trainer {!progress.modules[14]?.lessonRead && '🔒'}</button>
        </div>
        {view === 'lesson' ? <Lesson onComplete={() => { markLessonRead(14); setView('trainer') }} /> : <Trainer />}
      </div>
    </div>
  )
}
