import { useState, useCallback, useRef } from 'react'
import Card, { parseCard, handToCards } from '../components/Card'

// ─── Constantes ────────────────────────────────────────────
const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2']
const SUITS = ['s','h','d','c']
const RANK_VAL = { A:14,K:13,Q:12,J:11,T:10,9:9,8:8,7:7,6:6,5:5,4:4,3:3,2:2 }

// ─── Utilitarios de cartas ─────────────────────────────────
function newDeck() {
  const deck = []
  for (const r of RANKS) for (const s of SUITS) deck.push(r + s)
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

function cardRank(c) { return RANK_VAL[c[0]] || RANK_VAL[c.slice(0, -1)] }

// ─── Avaliacao de mao (simplificada) ──────────────────────
function evalHand(hole, board) {
  const all = [...hole, ...board]
  const ranks = all.map(c => RANK_VAL[c.slice(0, -1)])
  const suits = all.map(c => c.slice(-1))

  // Flush
  const sc = {}
  suits.forEach(s => { sc[s] = (sc[s] || 0) + 1 })
  const flushSuit = Object.entries(sc).find(([, v]) => v >= 5)?.[0]
  const hasFlush = !!flushSuit

  // Straight
  const unique = [...new Set(ranks)].sort((a, b) => a - b)
  if (unique.includes(14)) unique.unshift(1) // Ace low
  let hasStraight = false
  let straightHigh = 0
  for (let i = 0; i <= unique.length - 5; i++) {
    if (unique[i+4] - unique[i] === 4 &&
        unique[i+1] === unique[i]+1 && unique[i+2] === unique[i]+2 && unique[i+3] === unique[i]+3) {
      hasStraight = true
      straightHigh = unique[i+4]
    }
  }

  // Rank counts
  const rc = {}
  ranks.forEach(r => { rc[r] = (rc[r] || 0) + 1 })
  const counts = Object.entries(rc).sort((a, b) => b[1] - a[1] || b[0] - a[0])

  // Hand strength score (higher = better)
  // 9=straight flush, 8=quads, 7=full house, 6=flush, 5=straight, 4=trips, 3=two pair, 2=pair, 1=high card
  if (hasFlush && hasStraight) {
    const flushCards = all.filter(c => c.slice(-1) === flushSuit).map(c => RANK_VAL[c.slice(0, -1)])
    const fu = [...new Set(flushCards)].sort((a, b) => a - b)
    if (fu.includes(14)) fu.unshift(1)
    let sf = false
    for (let i = 0; i <= fu.length - 5; i++) {
      if (fu[i+4] - fu[i] === 4 && fu[i+1]===fu[i]+1 && fu[i+2]===fu[i]+2 && fu[i+3]===fu[i]+3) sf = true
    }
    if (sf) return { score: 9, label: 'Straight Flush' }
  }

  if (counts[0][1] === 4) return { score: 8, label: 'Quadra' }
  if (counts[0][1] === 3 && counts[1]?.[1] >= 2) return { score: 7, label: 'Full House' }
  if (hasFlush) return { score: 6, label: 'Flush' }
  if (hasStraight) return { score: 5, label: 'Straight' }
  if (counts[0][1] === 3) return { score: 4, label: 'Trinca' }
  if (counts[0][1] === 2 && counts[1]?.[1] === 2) return { score: 3, label: 'Dois Pares' }
  if (counts[0][1] === 2) return { score: 2, label: 'Par' }
  return { score: 1, label: 'High Card' }
}

function compareHands(h1, h2, board) {
  const e1 = evalHand(h1, board)
  const e2 = evalHand(h2, board)
  if (e1.score !== e2.score) return e1.score > e2.score ? 1 : -1
  // Tiebreak by high card
  const r1 = h1.map(c => RANK_VAL[c.slice(0, -1)]).sort((a,b) => b-a)
  const r2 = h2.map(c => RANK_VAL[c.slice(0, -1)]).sort((a,b) => b-a)
  for (let i = 0; i < Math.min(r1.length, r2.length); i++) {
    if (r1[i] !== r2[i]) return r1[i] > r2[i] ? 1 : -1
  }
  return 0
}

// ─── Hand strength relativa (pra bot decidir) ─────────────
function handStrength(hole, board) {
  const all = [...hole, ...board]
  const ranks = all.map(c => RANK_VAL[c.slice(0, -1)])
  const suits = all.map(c => c.slice(-1))
  const boardRanks = board.map(c => RANK_VAL[c.slice(0, -1)])
  const holeRanks = hole.map(c => RANK_VAL[c.slice(0, -1)])
  const holeSuits = hole.map(c => c.slice(-1))

  const e = evalHand(hole, board)

  // Categorize
  if (e.score >= 7) return 'monster'   // full house+
  if (e.score >= 5) return 'strong'    // straight/flush

  // Check specific made hands
  const boardR = board.map(c => c.slice(0, -1))
  const holeR = hole.map(c => c.slice(0, -1))

  // Set
  if (holeR[0] === holeR[1] && boardR.includes(holeR[0])) return 'strong'

  // Two pair
  const pairsWithBoard = [...new Set(holeR)].filter(r => boardR.includes(r))
  if (pairsWithBoard.length === 2) return 'strong'

  // Overpair
  if (holeR[0] === holeR[1]) {
    const pairVal = RANK_VAL[holeR[0]]
    if (boardRanks.every(v => v < pairVal)) return 'good'
  }

  // Top pair
  const topBoardVal = Math.max(...boardRanks)
  if (holeRanks.some(v => v === topBoardVal)) return 'good'

  // Draws
  const sc = {}
  suits.forEach(s => { sc[s] = (sc[s] || 0) + 1 })
  const hasFlushDraw = holeSuits.some(hs => (sc[hs] || 0) === 4)

  const unique = [...new Set(ranks)].sort((a, b) => a - b)
  if (unique.includes(14)) unique.unshift(1)
  let hasStraightDraw = false
  for (let i = 0; i < unique.length - 3; i++) {
    if (unique[i+3] - unique[i] <= 4) {
      if (holeRanks.some(r => unique.slice(i, i+4).includes(r))) hasStraightDraw = true
    }
  }

  if (hasFlushDraw && hasStraightDraw) return 'good'
  if (hasFlushDraw || hasStraightDraw) return 'draw'

  // Any pair
  if (holeR.some(r => boardR.includes(r))) return 'marginal'

  // High cards
  if (holeRanks.some(v => v >= 12)) return 'weak' // A or K high

  return 'air'
}

// ─── Bot GTO (decisoes heuristicas) ───────────────────────
function botDecision(botHole, board, street, pot, lastBet, isIP) {
  if (board.length === 0) return 'call' // pre-flop: bot always calls for now (will improve later)

  const strength = handStrength(botHole, board)

  // Com bet pra pagar
  if (lastBet > 0) {
    const potOdds = lastBet / (pot + lastBet)
    switch (strength) {
      case 'monster': return Math.random() < 0.6 ? 'raise' : 'call'
      case 'strong':  return Math.random() < 0.3 ? 'raise' : 'call'
      case 'good':    return 'call'
      case 'draw':    return potOdds < 0.33 ? 'call' : (Math.random() < 0.3 ? 'call' : 'fold')
      case 'marginal': return potOdds < 0.25 ? 'call' : 'fold'
      case 'weak':    return Math.random() < 0.15 ? 'call' : 'fold'
      default:        return 'fold'
    }
  }

  // Primeiro a agir ou check disponivel
  switch (strength) {
    case 'monster': return Math.random() < 0.7 ? 'bet' : 'check' // slowplay sometimes
    case 'strong':  return Math.random() < 0.8 ? 'bet' : 'check'
    case 'good':    return Math.random() < 0.6 ? 'bet' : 'check'
    case 'draw':    return Math.random() < 0.4 ? 'bet' : 'check' // semi-bluff
    case 'marginal': return 'check'
    case 'weak':    return Math.random() < 0.2 ? 'bet' : 'check' // occasional bluff
    default:        return Math.random() < 0.15 ? 'bet' : 'check' // rare bluff
  }
}

// ─── Feedback GTO sobre a acao do hero ────────────────────
function getHeroFeedback(heroHole, board, heroAction, pot, lastBet) {
  if (board.length === 0) return null // pre-flop feedback will come from ranges later

  const strength = handStrength(heroHole, board)
  const e = evalHand(heroHole, board)
  let recommended = ''
  let reason = ''

  if (lastBet > 0) {
    // Facing bet
    switch (strength) {
      case 'monster':
        recommended = 'raise'
        reason = `${e.label} — mao monstruosa. Raise para extrair valor maximo.`
        break
      case 'strong':
        recommended = 'call'
        reason = `${e.label} — mao forte. Call para manter o range do vilao amplo. Raise tambem e aceitavel.`
        break
      case 'good':
        recommended = 'call'
        reason = `${e.label} — boa mao. Call com pot odds favoraveis.`
        break
      case 'draw':
        recommended = pot > 0 && lastBet / (pot + lastBet) < 0.33 ? 'call' : 'fold'
        reason = `Draw — ${lastBet / (pot + lastBet) < 0.33 ? 'pot odds justificam call' : 'pot odds desfavoraveis, fold e mais seguro'}.`
        break
      case 'marginal':
        recommended = 'fold'
        reason = `Mao marginal. Sem equity suficiente para continuar.`
        break
      default:
        recommended = 'fold'
        reason = `Sem mao feita nem draw. Fold e a jogada correta.`
    }
  } else {
    // Can bet or check
    switch (strength) {
      case 'monster':
        recommended = 'bet'
        reason = `${e.label} — mao monstruosa. Bet para construir o pote.`
        break
      case 'strong':
        recommended = 'bet'
        reason = `${e.label} — mao forte. Bet por valor.`
        break
      case 'good':
        recommended = 'bet'
        reason = `${e.label} — boa mao. Bet por valor/protecao.`
        break
      case 'draw':
        recommended = Math.random() < 0.5 ? 'bet' : 'check'
        reason = `Draw — semi-bluff e valido, check tambem e aceitavel.`
        break
      case 'marginal':
        recommended = 'check'
        reason = `Mao marginal. Check para controlar o pote.`
        break
      default:
        recommended = 'check'
        reason = `Sem mao feita. Check e a melhor opcao.`
    }
  }

  const isCorrect = heroAction === recommended ||
    (recommended === 'call' && heroAction === 'raise') && (strength === 'strong' || strength === 'monster') ||
    (recommended === 'bet' && heroAction === 'check') && (strength === 'draw' || strength === 'marginal')

  return { recommended, reason, isCorrect }
}

// ─── Componentes visuais ──────────────────────────────────

function CardBack() {
  return (
    <div style={{
      width: 32, height: 44, borderRadius: 4,
      background: 'linear-gradient(135deg, #e5484d 0%, #b5303a 100%)',
      border: '1px solid rgba(255,255,255,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>?</div>
    </div>
  )
}

function HUTable({ heroCards, villainCards, board, pot, heroIsBtn, heroLabel, villainLabel, showVillain }) {
  return (
    <div style={{
      position: 'relative', width: '100%', paddingBottom: '55%',
      userSelect: 'none', overflow: 'hidden',
    }}>
      {/* Mesa oval */}
      <div style={{
        position: 'absolute',
        top: '10%', left: '10%', right: '10%', bottom: '10%',
        borderRadius: 999,
        border: '1.5px solid #3a3a42',
        background: '#161618',
      }} />

      {/* Villain (topo) */}
      <div style={{
        position: 'absolute', top: '2%', left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, zIndex: 5,
      }}>
        {villainLabel && (
          <div style={{ fontSize: 10, fontWeight: 600, color: '#676671' }}>{villainLabel}</div>
        )}
        <div style={{
          padding: '4px 12px', borderRadius: 6,
          background: '#2a2a2e', border: '1px solid #e5484d',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#e5484d' }}>
            {heroIsBtn ? 'BB' : 'BTN'}
          </div>
          <div style={{ fontSize: 9, color: '#676671', fontFamily: 'JetBrains Mono' }}>Bot GTO</div>
        </div>
        <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
          {showVillain && villainCards
            ? villainCards.map((c, i) => <Card key={i} card={parseCard(c)} size="sm" />)
            : [0, 1].map(i => <CardBack key={i} />)
          }
        </div>
      </div>

      {/* Centro: board + pot */}
      <div style={{
        position: 'absolute', top: '44%', left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center', pointerEvents: 'none',
      }}>
        {board.length > 0 && (
          <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginBottom: 6 }}>
            {board.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                <Card card={parseCard(c)} size="sm" />
                {i === 2 && board.length > 3 && <div style={{ width: 4 }} />}
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
          <div style={{ position: 'relative', width: 14, height: 16 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                position: 'absolute', bottom: i * 3, left: 0,
                width: 14, height: 6, borderRadius: 3,
                background: i === 2 ? '#4fce82' : i === 1 ? '#3ab870' : '#2a9a5a',
                border: '1px solid rgba(0,0,0,0.25)',
              }} />
            ))}
          </div>
          <span style={{ color: '#b3b3b8', fontSize: 12, fontWeight: 600, fontFamily: 'JetBrains Mono' }}>
            {pot.toFixed(1)}bb
          </span>
        </div>
      </div>

      {/* Dealer button */}
      <div style={{
        position: 'absolute',
        top: heroIsBtn ? '72%' : '12%',
        left: heroIsBtn ? '62%' : '62%',
        width: 16, height: 16, borderRadius: '50%',
        background: '#fdfdfd', color: '#0f0f0f',
        fontSize: 8, fontWeight: 900,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10,
      }}>D</div>

      {/* Hero (fundo) */}
      <div style={{
        position: 'absolute', bottom: '0%', left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, zIndex: 5,
      }}>
        <div style={{ display: 'flex', gap: 3, marginBottom: 2 }}>
          {heroCards.map((c, i) => <Card key={i} card={parseCard(c)} size="md" />)}
        </div>
        <div style={{
          padding: '4px 12px', borderRadius: 6,
          background: '#2a2a2e', border: '1px solid #4fce82',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#4fce82' }}>
            {heroIsBtn ? 'BTN' : 'BB'}
          </div>
          <div style={{ fontSize: 9, color: '#676671', fontFamily: 'JetBrains Mono' }}>Voce</div>
        </div>
        {heroLabel && (
          <div style={{ fontSize: 10, fontWeight: 600, color: '#4fce82' }}>{heroLabel}</div>
        )}
      </div>
    </div>
  )
}

// ─── Streets ──────────────────────────────────────────────
const STREETS = ['preflop', 'flop', 'turn', 'river', 'showdown']

function streetName(s) {
  return { preflop: 'Pre-Flop', flop: 'Flop', turn: 'Turn', river: 'River', showdown: 'Showdown' }[s] || s
}

// ─── Componente principal ─────────────────────────────────
export default function Arena() {
  const [gameState, setGameState] = useState(null)
  const [heroAction, setHeroAction] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [handHistory, setHandHistory] = useState([])
  const [stats, setStats] = useState({ hands: 0, won: 0, correctActions: 0, totalActions: 0 })
  const deckRef = useRef(null)

  const startNewHand = useCallback(() => {
    const deck = newDeck()
    deckRef.current = deck
    const heroIsBtn = Math.random() < 0.5

    const heroCards = [deck[0], deck[1]]
    const villainCards = [deck[2], deck[3]]
    // Pre-deal flop, turn, river
    const fullBoard = [deck[4], deck[5], deck[6], deck[7], deck[8]]

    // Pre-flop: BTN/SB posts 0.5, BB posts 1. BTN acts first.
    // If hero is BTN: hero acts first, facing 1bb (the BB).
    // If hero is BB: villain (BTN) acts first — bot decides.
    const gs = {
      heroCards,
      villainCards,
      fullBoard,
      board: [],
      street: 'preflop',
      pot: 1.5, // SB (0.5) + BB (1)
      heroIsBtn,
      heroStack: 99,
      villainStack: 99,
      lastBet: 1, // BB is the "bet" to call pre-flop
      heroActed: false,
      villainActed: false,
      actions: [],
      result: null,
      showVillain: false,
    }

    if (!heroIsBtn) {
      // Hero is BB, villain is BTN/SB. Bot opens (always raises pre-flop from BTN).
      gs.pot = 1.5 + 2.5 // SB + BB + raise to 2.5
      gs.lastBet = 2.5
      gs.actions = [{ who: 'villain', action: 'raise', label: 'Raise 2.5bb' }]
      gs.villainActed = true
    }

    setGameState(gs)
    setHeroAction(null)
    setFeedback(null)
  }, [])

  const advanceStreet = useCallback((gs) => {
    const nextStreets = { preflop: 'flop', flop: 'turn', turn: 'river', river: 'showdown' }
    const next = nextStreets[gs.street]

    if (next === 'showdown') {
      // Showdown
      const board = gs.fullBoard
      const cmp = compareHands(gs.heroCards, gs.villainCards, board)
      const heroEval = evalHand(gs.heroCards, board)
      const villainEval = evalHand(gs.villainCards, board)
      const winner = cmp > 0 ? 'hero' : cmp < 0 ? 'villain' : 'tie'

      setStats(prev => ({
        ...prev,
        hands: prev.hands + 1,
        won: prev.won + (winner === 'hero' ? 1 : winner === 'tie' ? 0.5 : 0),
      }))

      setHandHistory(prev => [{
        heroCards: gs.heroCards,
        villainCards: gs.villainCards,
        board,
        winner,
        pot: gs.pot,
        heroHand: heroEval.label,
        villainHand: villainEval.label,
      }, ...prev].slice(0, 20))

      return {
        ...gs,
        street: 'showdown',
        board,
        result: { winner, heroEval, villainEval, pot: gs.pot },
        showVillain: true,
      }
    }

    const boardLen = { flop: 3, turn: 4, river: 5 }[next] || 0
    const board = gs.fullBoard.slice(0, boardLen)

    return {
      ...gs,
      street: next,
      board,
      lastBet: 0,
      heroActed: false,
      villainActed: false,
    }
  }, [])

  const handleHeroAction = useCallback((action) => {
    if (!gameState || gameState.result || gameState.heroActed) return

    const gs = { ...gameState }

    // Record feedback
    const fb = getHeroFeedback(gs.heroCards, gs.board, action, gs.pot, gs.lastBet)
    if (fb) {
      setFeedback(fb)
      setStats(prev => ({
        ...prev,
        correctActions: prev.correctActions + (fb.isCorrect ? 1 : 0),
        totalActions: prev.totalActions + 1,
      }))
    }

    // Handle fold
    if (action === 'fold') {
      setStats(prev => ({ ...prev, hands: prev.hands + 1 }))
      setHandHistory(prev => [{
        heroCards: gs.heroCards, villainCards: gs.villainCards,
        board: gs.board, winner: 'villain', pot: gs.pot,
        heroHand: 'Fold', villainHand: '—',
      }, ...prev].slice(0, 20))
      setGameState({
        ...gs,
        result: { winner: 'villain', heroEval: { label: 'Fold' }, villainEval: { label: '—' }, pot: gs.pot },
        showVillain: true,
      })
      return
    }

    // Hero bets or raises
    let newPot = gs.pot
    let newLastBet = 0
    let heroLabel = ''

    if (action === 'bet' || action === 'raise') {
      const betSize = action === 'raise' ? gs.lastBet * 2.5 : gs.pot * 0.66
      newPot += betSize + (gs.lastBet > 0 ? gs.lastBet : 0) // call + raise
      newLastBet = betSize
      heroLabel = action === 'raise' ? `Raise ${betSize.toFixed(1)}bb` : `Bet ${betSize.toFixed(1)}bb`
    } else if (action === 'call') {
      newPot += gs.lastBet
      heroLabel = 'Call'
    } else {
      heroLabel = 'Check'
    }

    gs.pot = newPot
    gs.heroActed = true
    gs.actions = [...gs.actions, { who: 'hero', action, label: heroLabel }]

    // Bot response
    if (action === 'bet' || action === 'raise') {
      // Bot faces a bet
      const botAction = botDecision(gs.villainCards, gs.board, gs.street, gs.pot, newLastBet, !gs.heroIsBtn)
      if (botAction === 'fold') {
        setStats(prev => ({ ...prev, hands: prev.hands + 1, won: prev.won + 1 }))
        setHandHistory(prev => [{
          heroCards: gs.heroCards, villainCards: gs.villainCards,
          board: gs.board, winner: 'hero', pot: gs.pot,
          heroHand: heroLabel, villainHand: 'Fold',
        }, ...prev].slice(0, 20))
        setGameState({
          ...gs,
          result: { winner: 'hero', heroEval: { label: 'Villain Fold' }, villainEval: { label: 'Fold' }, pot: gs.pot },
          showVillain: true,
        })
        return
      }
      if (botAction === 'call') {
        gs.pot += newLastBet
        gs.actions = [...gs.actions, { who: 'villain', action: 'call', label: `Call ${newLastBet.toFixed(1)}bb` }]
      } else if (botAction === 'raise') {
        const reRaise = newLastBet * 2.5
        gs.pot += newLastBet + reRaise
        gs.actions = [...gs.actions, { who: 'villain', action: 'raise', label: `Raise ${reRaise.toFixed(1)}bb` }]
        // Simplify: hero auto-calls the re-raise
        gs.pot += reRaise
        gs.actions = [...gs.actions, { who: 'hero', action: 'call', label: 'Call' }]
      }
      gs.villainActed = true
      const nextGs = advanceStreet(gs)
      setGameState(nextGs)
      return
    }

    // Hero checked or called
    if (action === 'check') {
      if (!gs.villainActed) {
        // Bot acts after hero check
        const botAction = botDecision(gs.villainCards, gs.board, gs.street, gs.pot, 0, !gs.heroIsBtn)
        if (botAction === 'bet') {
          const betSize = gs.pot * 0.66
          gs.pot += betSize
          gs.lastBet = betSize
          gs.villainActed = true
          gs.heroActed = false // hero needs to respond
          gs.actions = [...gs.actions, { who: 'villain', action: 'bet', label: `Bet ${betSize.toFixed(1)}bb` }]
          setGameState({ ...gs })
          setFeedback(null) // clear feedback for new action
          return
        }
        // Bot also checks
        gs.villainActed = true
        gs.actions = [...gs.actions, { who: 'villain', action: 'check', label: 'Check' }]
        const nextGs = advanceStreet(gs)
        setGameState(nextGs)
        return
      }
    }

    if (action === 'call') {
      gs.villainActed = true
      const nextGs = advanceStreet(gs)
      setGameState(nextGs)
      return
    }

    // Default: advance
    const nextGs = advanceStreet(gs)
    setGameState(nextGs)
  }, [gameState, advanceStreet])

  // Determine available actions
  const getActions = () => {
    if (!gameState || gameState.result) return []
    if (gameState.street === 'preflop') {
      // Simplificado: call ou fold (raise mais tarde)
      if (gameState.heroIsBtn) {
        // Hero is BTN/SB, first to act pre-flop
        return [
          { id: 'fold', label: 'Fold', bg: '#e5484d' },
          { id: 'call', label: 'Call', bg: '#0a84d7' },
          { id: 'raise', label: 'Raise 3x', bg: '#4fce82' },
        ]
      }
      // Hero is BB, villain already raised from BTN
      return [
        { id: 'fold', label: 'Fold', bg: '#e5484d' },
        { id: 'call', label: 'Call', bg: '#0a84d7' },
        { id: 'raise', label: '3-Bet', bg: '#4fce82' },
      ]
    }

    if (gameState.lastBet > 0) {
      // Facing bet
      return [
        { id: 'fold', label: 'Fold', bg: '#e5484d' },
        { id: 'call', label: `Call ${gameState.lastBet.toFixed(1)}bb`, bg: '#0a84d7' },
        { id: 'raise', label: 'Raise', bg: '#4fce82' },
      ]
    }

    // Can check or bet
    return [
      { id: 'check', label: 'Check', bg: '#0a84d7' },
      { id: 'bet', label: 'Bet 66%', bg: '#4fce82' },
    ]
  }

  const acc = stats.totalActions > 0 ? Math.round((stats.correctActions / stats.totalActions) * 100) : 0
  const winRate = stats.hands > 0 ? Math.round((stats.won / stats.hands) * 100) : 0

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-16" style={{ background: '#0f0f0f' }}>
      <div className="max-w-lg mx-auto px-4 pt-6">

        {/* Header */}
        <div className="text-center mb-5">
          <h1 style={{ color: 'white', fontSize: 22, fontWeight: 700, fontFamily: 'Poppins' }}>
            Arena HU
          </h1>
          <p style={{ color: '#676671', fontSize: 13 }}>Heads-Up vs Bot GTO</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { label: 'Maos', value: stats.hands, color: '#e5484d' },
            { label: 'Win Rate', value: stats.hands ? `${winRate}%` : '--', color: winRate >= 50 ? '#4fce82' : '#f5a623' },
            { label: 'Acerto GTO', value: stats.totalActions ? `${acc}%` : '--', color: acc >= 70 ? '#4fce82' : acc >= 50 ? '#f5a623' : '#e5484d' },
          ].map(s => (
            <div key={s.label} className="rounded-xl py-3 text-center" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
              <div style={{ color: s.color, fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono', lineHeight: 1 }}>{s.value}</div>
              <div style={{ color: '#676671', fontSize: 11, marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tela principal */}
        {!gameState ? (
          <div className="text-center" style={{ paddingTop: 40 }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>♠♥</div>
            <p style={{ color: '#b3b3b8', fontSize: 15, marginBottom: 24, lineHeight: 1.6 }}>
              Jogue Heads-Up contra um bot que segue conceitos GTO.<br />
              Receba feedback em tempo real sobre suas decisoes.
            </p>
            <button onClick={startNewHand}
              className="px-10 py-4 rounded-xl font-bold text-lg"
              style={{ background: '#4fce82', color: '#0f0f0f', border: 'none', cursor: 'pointer' }}>
              Iniciar Partida
            </button>
          </div>
        ) : (
          <div>
            {/* Street indicator */}
            <div className="flex gap-1 mb-3 justify-center">
              {STREETS.slice(0, -1).map(s => (
                <div key={s} className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    background: s === gameState.street ? '#4fce8222' : '#1a1a1d',
                    color: s === gameState.street ? '#4fce82' : '#676671',
                    border: `1px solid ${s === gameState.street ? '#4fce82' : '#2a2a2e'}`,
                  }}>
                  {streetName(s)}
                </div>
              ))}
            </div>

            {/* Mesa */}
            <div className="rounded-2xl mb-3" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e', padding: '8px 4px' }}>
              <HUTable
                heroCards={gameState.heroCards}
                villainCards={gameState.villainCards}
                board={gameState.board}
                pot={gameState.pot}
                heroIsBtn={gameState.heroIsBtn}
                showVillain={gameState.showVillain}
                heroLabel={gameState.actions.filter(a => a.who === 'hero').slice(-1)[0]?.label}
                villainLabel={gameState.actions.filter(a => a.who === 'villain').slice(-1)[0]?.label}
              />
            </div>

            {/* Action log */}
            {gameState.actions.length > 0 && (
              <div className="rounded-xl px-3 py-2 mb-3" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
                <div className="flex flex-wrap gap-2">
                  {gameState.actions.map((a, i) => (
                    <span key={i} style={{
                      fontSize: 11, fontWeight: 600,
                      color: a.who === 'hero' ? '#4fce82' : '#e5484d',
                    }}>
                      {a.who === 'hero' ? 'Voce' : 'Bot'}: {a.label}
                      {i < gameState.actions.length - 1 ? ' →' : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback */}
            {feedback && !gameState.result && (
              <div className="rounded-xl px-4 py-3 mb-3" style={{
                background: feedback.isCorrect ? 'rgba(79,206,130,0.08)' : 'rgba(229,72,77,0.08)',
                border: `1px solid ${feedback.isCorrect ? 'rgba(79,206,130,0.25)' : 'rgba(229,72,77,0.25)'}`,
              }}>
                <div style={{ color: feedback.isCorrect ? '#4fce82' : '#e5484d', fontWeight: 700, fontSize: 14 }}>
                  {feedback.isCorrect ? 'Boa jogada!' : `GTO recomenda: ${feedback.recommended}`}
                </div>
                <div style={{ color: '#b3b3b8', fontSize: 12, marginTop: 3 }}>{feedback.reason}</div>
              </div>
            )}

            {/* Result */}
            {gameState.result && (
              <div className="rounded-xl p-4 mb-3" style={{
                background: gameState.result.winner === 'hero' ? 'rgba(79,206,130,0.1)' : gameState.result.winner === 'tie' ? 'rgba(245,166,35,0.1)' : 'rgba(229,72,77,0.1)',
                border: `1px solid ${gameState.result.winner === 'hero' ? '#4fce82' : gameState.result.winner === 'tie' ? '#f5a623' : '#e5484d'}`,
              }}>
                <div style={{
                  color: gameState.result.winner === 'hero' ? '#4fce82' : gameState.result.winner === 'tie' ? '#f5a623' : '#e5484d',
                  fontWeight: 700, fontSize: 18, marginBottom: 4,
                }}>
                  {gameState.result.winner === 'hero' ? 'Voce ganhou!' : gameState.result.winner === 'tie' ? 'Empate' : 'Villain ganhou'}
                  <span style={{ fontSize: 14, fontWeight: 500, marginLeft: 8 }}>
                    Pot: {gameState.result.pot.toFixed(1)}bb
                  </span>
                </div>
                <div style={{ color: '#b3b3b8', fontSize: 13 }}>
                  Voce: <strong style={{ color: '#4fce82' }}>{gameState.result.heroEval.label}</strong>
                  {' · '}
                  Bot: <strong style={{ color: '#e5484d' }}>{gameState.result.villainEval.label}</strong>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="mb-4">
              {!gameState.result && !gameState.heroActed ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  {getActions().map(b => (
                    <button key={b.id} onClick={() => handleHeroAction(b.id)}
                      style={{
                        flex: 1, padding: '14px 4px', borderRadius: 8,
                        fontWeight: 600, fontSize: 13, border: 'none',
                        cursor: 'pointer', color: '#0f0f0f', background: b.bg,
                      }}>
                      {b.label}
                    </button>
                  ))}
                </div>
              ) : gameState.result ? (
                <button onClick={startNewHand}
                  style={{
                    width: '100%', padding: '14px', borderRadius: 8,
                    background: '#4fce82', border: 'none',
                    color: '#0f0f0f', fontWeight: 600, fontSize: 15,
                    cursor: 'pointer',
                  }}>
                  Proxima Mao &gt;
                </button>
              ) : (
                <button onClick={() => {
                  const nextGs = advanceStreet(gameState)
                  setGameState(nextGs)
                  setFeedback(null)
                }}
                style={{
                  width: '100%', padding: '14px', borderRadius: 8,
                  background: '#f5a623', border: 'none',
                  color: '#0f0f0f', fontWeight: 600, fontSize: 15,
                  cursor: 'pointer',
                }}>
                Proximo Street &gt;
              </button>
              )}
            </div>

            {/* Hand history */}
            {handHistory.length > 0 && (
              <div className="rounded-xl p-3" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
                <div style={{ color: '#676671', fontSize: 11, fontWeight: 600, marginBottom: 8 }}>HISTORICO</div>
                <div className="space-y-2">
                  {handHistory.slice(0, 5).map((h, i) => (
                    <div key={i} className="flex items-center gap-2" style={{ fontSize: 12 }}>
                      <span style={{
                        color: h.winner === 'hero' ? '#4fce82' : h.winner === 'tie' ? '#f5a623' : '#e5484d',
                        fontWeight: 700, width: 14,
                      }}>
                        {h.winner === 'hero' ? 'W' : h.winner === 'tie' ? 'T' : 'L'}
                      </span>
                      <div className="flex gap-1">
                        {h.heroCards.map((c, j) => <Card key={j} card={parseCard(c)} size="xs" />)}
                      </div>
                      <span style={{ color: '#676671' }}>vs</span>
                      <div className="flex gap-1">
                        {h.villainCards.map((c, j) => <Card key={j} card={parseCard(c)} size="xs" />)}
                      </div>
                      <span style={{ color: '#676671', flex: 1, textAlign: 'right' }}>
                        {h.pot.toFixed(1)}bb
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
