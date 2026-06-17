import { useState, useCallback, useRef, useMemo } from 'react'
import Card, { parseCard, handToCards } from '../components/Card'
import { BLIND_WARS, BB_VS_RFI } from '../data/ranges'

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

// ─── Converter hole cards reais para notacao de hand ──────
// Ex: ['As','Kh'] → 'AKo', ['Ah','Kh'] → 'AKs', ['Ts','Td'] → 'TT'
function holeToNotation(hole) {
  const r1 = hole[0].slice(0, -1)
  const r2 = hole[1].slice(0, -1)
  const s1 = hole[0].slice(-1)
  const s2 = hole[1].slice(-1)
  const v1 = RANK_VAL[r1], v2 = RANK_VAL[r2]
  const high = v1 >= v2 ? r1 : r2
  const low = v1 >= v2 ? r2 : r1
  if (r1 === r2) return high + low // pocket pair
  const suited = s1 === s2 ? 's' : 'o'
  return high + low + suited
}

// ─── Bot pre-flop usando ranges GTO ──────────────────────
// botIsSB: true = bot é SB (age primeiro), false = bot é BB (defende)
function botPreflopDecision(botHole, botIsSB) {
  const hand = holeToNotation(botHole)

  if (botIsSB) {
    // Bot é SB: usar SB_raise range
    const raiseRange = BLIND_WARS.SB_raise?.raise || []
    if (raiseRange.includes(hand)) return 'raise'
    // Complete range (limp)
    const completeRange = BLIND_WARS.SB_complete?.complete || []
    if (completeRange.includes(hand)) return 'call' // limp/complete
    return 'fold'
  } else {
    // Bot é BB: facing SB raise, usar BB_VS_RFI.vsSB
    const bbRange = BB_VS_RFI.vsSB || {}
    if (bbRange.threebet?.includes(hand)) return 'raise' // 3-bet
    if (bbRange.call?.includes(hand)) return 'call'
    return 'fold'
  }
}

// ─── Feedback pre-flop para o hero ────────────────────────
function getHeroPreflopFeedback(heroHole, heroAction, heroIsSB) {
  const hand = holeToNotation(heroHole)

  if (heroIsSB) {
    // Hero é SB: deveria raise, complete ou fold?
    const raiseRange = BLIND_WARS.SB_raise?.raise || []
    const completeRange = BLIND_WARS.SB_complete?.complete || []
    let recommended, reason
    if (raiseRange.includes(hand)) {
      recommended = 'raise'
      reason = `${hand} esta no range de RAISE do SB. Abra com raise para pressionar o BB.`
    } else if (completeRange.includes(hand)) {
      recommended = 'call'
      reason = `${hand} esta no range de COMPLETE do SB. Limp para ver flop barato com boa jogabilidade.`
    } else {
      recommended = 'fold'
      reason = `${hand} nao tem equity suficiente para jogar do SB.`
    }
    const isCorrect = heroAction === recommended ||
      (recommended === 'raise' && heroAction === 'raise') ||
      (recommended === 'call' && heroAction === 'call')
    return { recommended, reason, isCorrect }
  } else {
    // Hero é BB: facing SB raise, deveria 3-bet, call ou fold?
    const bbRange = BB_VS_RFI.vsSB || {}
    let recommended, reason
    if (bbRange.threebet?.includes(hand)) {
      recommended = 'raise'
      reason = `${hand} esta no range de 3-BET do BB vs SB. Relance para construir pote ou fazer o SB foldar.`
    } else if (bbRange.call?.includes(hand)) {
      recommended = 'call'
      reason = `${hand} esta no range de CALL do BB vs SB. Boa equity para ver o flop.`
    } else {
      recommended = 'fold'
      reason = `${hand} nao tem equity suficiente para defender do BB vs raise do SB.`
    }
    const isCorrect = heroAction === recommended
    return { recommended, reason, isCorrect }
  }
}

// ─── Bot GTO (decisoes heuristicas) ───────────────────────
function botDecision(botHole, board, street, pot, lastBet, isIP) {
  if (board.length === 0) return 'call' // fallback pre-flop (should use botPreflopDecision)

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
            {heroIsBtn ? 'BB' : 'SB'}
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
        top: heroIsBtn ? '68%' : '8%',
        left: heroIsBtn ? '64%' : '64%',
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
            {heroIsBtn ? 'SB' : 'BB'}
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

// ─── Blind structure (sobe a cada 5 maos) ─────────────────
const BLIND_LEVELS = [
  { sb: 1, bb: 2 },
  { sb: 2, bb: 4 },
  { sb: 3, bb: 6 },
  { sb: 5, bb: 10 },
  { sb: 7, bb: 14 },
  { sb: 10, bb: 20 },
  { sb: 15, bb: 30 },
  { sb: 20, bb: 40 },
  { sb: 30, bb: 60 },
  { sb: 50, bb: 100 },
  { sb: 75, bb: 150 },
  { sb: 100, bb: 200 },
]
const HANDS_PER_LEVEL = 5
const STARTING_STACK = 500

// ─── localStorage helpers ─────────────────────────────────
const STORAGE_KEY = 'poker-arena-match'

function saveMatch(match) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(match)) } catch {}
}

function loadMatch() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function clearMatch() {
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
}

// ─── Componente principal ─────────────────────────────────
export default function Arena() {
  // Match = partida longa (muitas maos ate alguem zerar)
  const [match, setMatch] = useState(() => loadMatch())
  const [gameState, setGameState] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [betSize, setBetSize] = useState(0)

  // Persist match on every change
  const updateMatch = useCallback((updater) => {
    setMatch(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (next) saveMatch(next)
      return next
    })
  }, [])

  const getBlinds = useCallback((handNum) => {
    const levelIdx = Math.min(Math.floor(handNum / HANDS_PER_LEVEL), BLIND_LEVELS.length - 1)
    return BLIND_LEVELS[levelIdx]
  }, [])

  const startMatch = useCallback(() => {
    const m = {
      heroStack: STARTING_STACK,
      villainStack: STARTING_STACK,
      handNum: 0,
      stats: { hands: 0, won: 0, correctActions: 0, totalActions: 0 },
      handHistory: [],
      matchOver: false,
      winner: null,
    }
    updateMatch(m)
    setGameState(null)
    setFeedback(null)
  }, [updateMatch])

  const startNewHand = useCallback(() => {
    if (!match || match.matchOver) return

    const deck = newDeck()
    const heroIsBtn = match.handNum % 2 === 0 // alternate positions
    const blinds = getBlinds(match.handNum)

    const heroCards = [deck[0], deck[1]]
    const villainCards = [deck[2], deck[3]]
    const fullBoard = [deck[4], deck[5], deck[6], deck[7], deck[8]]

    // Post blinds
    const heroPosts = heroIsBtn ? blinds.sb : blinds.bb
    const villainPosts = heroIsBtn ? blinds.bb : blinds.sb

    const gs = {
      heroCards,
      villainCards,
      fullBoard,
      board: [],
      street: 'preflop',
      pot: heroPosts + villainPosts,
      heroIsBtn,
      heroChipsInPot: heroPosts,
      villainChipsInPot: villainPosts,
      lastBet: blinds.bb,
      heroActed: false,
      villainActed: false,
      actions: [],
      result: null,
      showVillain: false,
      blinds,
    }

    if (!heroIsBtn) {
      // Hero is BB, villain is SB — bot acts first
      const botAction = botPreflopDecision(villainCards, true)
      if (botAction === 'raise') {
        const raiseSize = blinds.bb * 2.5
        gs.pot = heroPosts + raiseSize
        gs.villainChipsInPot = raiseSize
        gs.lastBet = raiseSize
        gs.actions = [{ who: 'villain', action: 'raise', label: `Raise ${raiseSize}` }]
      } else if (botAction === 'call') {
        gs.pot = blinds.bb * 2
        gs.villainChipsInPot = blinds.bb
        gs.lastBet = 0
        gs.actions = [{ who: 'villain', action: 'call', label: 'Complete' }]
      } else {
        // SB folds
        const winAmount = villainPosts
        updateMatch(prev => ({
          ...prev,
          heroStack: prev.heroStack + winAmount,
          villainStack: prev.villainStack - winAmount,
          handNum: prev.handNum + 1,
          stats: { ...prev.stats, hands: prev.stats.hands + 1, won: prev.stats.won + 1 },
          handHistory: [{ heroCards, villainCards, board: [], winner: 'hero', pot: gs.pot, heroHand: 'BB', villainHand: 'SB Fold' }, ...prev.handHistory].slice(0, 20),
        }))
        gs.result = { winner: 'hero', heroEval: { label: 'SB foldou' }, villainEval: { label: 'Fold' }, pot: gs.pot }
        gs.showVillain = true
      }
      gs.villainActed = true
    }

    setGameState(gs)
    setFeedback(null)
  }, [match, getBlinds, updateMatch])

  // Resolve hand result — update stacks
  const resolveHand = useCallback((winner, pot, heroCards, villainCards, board, heroLabel, villainLabel) => {
    updateMatch(prev => {
      if (!prev) return prev
      const heroBet = prev.heroStack >= 0 ? 0 : 0 // chips already subtracted from pot tracking
      // Winner gets the full pot. Loser already posted their chips.
      // We track net: hero posted heroChipsInPot, villain posted villainChipsInPot
      // pot = heroChipsInPot + villainChipsInPot
      // if hero wins: hero net = +villainChipsInPot, villain net = -villainChipsInPot
      // For simplicity: heroStack and villainStack are adjusted by the pot result
      let heroNet = 0, villainNet = 0
      if (winner === 'hero') { heroNet = pot / 2; villainNet = -pot / 2 }
      else if (winner === 'villain') { heroNet = -pot / 2; villainNet = pot / 2 }
      // tie: no change

      const newHeroStack = prev.heroStack + heroNet
      const newVillainStack = prev.villainStack + villainNet
      const matchOver = newHeroStack <= 0 || newVillainStack <= 0

      return {
        ...prev,
        heroStack: Math.max(0, newHeroStack),
        villainStack: Math.max(0, newVillainStack),
        handNum: prev.handNum + 1,
        stats: {
          ...prev.stats,
          hands: prev.stats.hands + 1,
          won: prev.stats.won + (winner === 'hero' ? 1 : winner === 'tie' ? 0.5 : 0),
        },
        handHistory: [{ heroCards, villainCards, board: board || [], winner, pot, heroHand: heroLabel, villainHand: villainLabel }, ...prev.handHistory].slice(0, 20),
        matchOver,
        winner: matchOver ? (newHeroStack <= 0 ? 'villain' : 'hero') : null,
      }
    })
  }, [updateMatch])

  const advanceStreet = useCallback((gs) => {
    const nextStreets = { preflop: 'flop', flop: 'turn', turn: 'river', river: 'showdown' }
    const next = nextStreets[gs.street]

    if (next === 'showdown') {
      const board = gs.fullBoard
      const cmp = compareHands(gs.heroCards, gs.villainCards, board)
      const heroEval = evalHand(gs.heroCards, board)
      const villainEval = evalHand(gs.villainCards, board)
      const winner = cmp > 0 ? 'hero' : cmp < 0 ? 'villain' : 'tie'

      resolveHand(winner, gs.pot, gs.heroCards, gs.villainCards, board, heroEval.label, villainEval.label)

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
  }, [resolveHand])

  const handleHeroAction = useCallback((action, customSize) => {
    if (!gameState || gameState.result || gameState.heroActed) return

    const gs = { ...gameState }
    const heroStack = match?.heroStack || STARTING_STACK

    // Record feedback
    let fb = null
    if (gs.street === 'preflop') {
      fb = getHeroPreflopFeedback(gs.heroCards, action, gs.heroIsBtn)
    } else {
      fb = getHeroFeedback(gs.heroCards, gs.board, action, gs.pot, gs.lastBet)
    }
    if (fb) {
      setFeedback(fb)
      updateMatch(prev => prev && ({
        ...prev,
        stats: {
          ...prev.stats,
          correctActions: prev.stats.correctActions + (fb.isCorrect ? 1 : 0),
          totalActions: prev.stats.totalActions + 1,
        },
      }))
    }

    // Handle fold
    if (action === 'fold') {
      resolveHand('villain', gs.pot, gs.heroCards, gs.villainCards, gs.board, 'Fold', '—')
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
    const isAllIn = customSize >= heroStack - gs.heroChipsInPot

    if (action === 'bet' || action === 'raise') {
      const size = customSize || (action === 'raise' ? Math.max(gs.lastBet * 2.5, gs.blinds.bb * 2) : gs.pot * 0.66)
      const actualSize = Math.min(size, heroStack - gs.heroChipsInPot) // cap at remaining stack
      newPot += actualSize + (gs.lastBet > 0 ? gs.lastBet : 0)
      newLastBet = actualSize
      heroLabel = isAllIn ? `All-In ${actualSize.toFixed(0)}` : action === 'raise' ? `Raise ${actualSize.toFixed(0)}` : `Bet ${actualSize.toFixed(0)}`
    } else if (action === 'call') {
      newPot += gs.lastBet
      heroLabel = 'Call'
    } else {
      heroLabel = 'Check'
    }

    gs.pot = newPot
    gs.heroActed = true
    gs.heroChipsInPot = (gs.heroChipsInPot || 0) + (newLastBet || (action === 'call' ? gs.lastBet : 0))
    gs.actions = [...gs.actions, { who: 'hero', action, label: heroLabel }]

    // Bot response
    if (action === 'bet' || action === 'raise') {
      const botAction = gs.street === 'preflop'
        ? botPreflopDecision(gs.villainCards, !gs.heroIsBtn)
        : botDecision(gs.villainCards, gs.board, gs.street, gs.pot, newLastBet, !gs.heroIsBtn)
      if (botAction === 'fold') {
        resolveHand('hero', gs.pot, gs.heroCards, gs.villainCards, gs.board, heroLabel, 'Fold')
        setGameState({
          ...gs,
          result: { winner: 'hero', heroEval: { label: 'Villain Fold' }, villainEval: { label: 'Fold' }, pot: gs.pot },
          showVillain: true,
        })
        return
      }
      if (botAction === 'call') {
        gs.pot += newLastBet
        gs.actions = [...gs.actions, { who: 'villain', action: 'call', label: `Call ${newLastBet.toFixed(0)}` }]
      } else if (botAction === 'raise') {
        const reRaise = newLastBet * 2.5
        gs.pot += newLastBet + reRaise
        gs.actions = [...gs.actions, { who: 'villain', action: 'raise', label: `Raise ${reRaise.toFixed(0)}` }]
        gs.pot += reRaise
        gs.actions = [...gs.actions, { who: 'hero', action: 'call', label: 'Call' }]
      }
      gs.villainActed = true
      const nextGs = advanceStreet(gs)
      setGameState(nextGs)
      return
    }

    if (action === 'check') {
      if (!gs.villainActed) {
        const botAction = botDecision(gs.villainCards, gs.board, gs.street, gs.pot, 0, !gs.heroIsBtn)
        if (botAction === 'bet') {
          const bSize = Math.round(gs.pot * 0.66)
          gs.pot += bSize
          gs.lastBet = bSize
          gs.villainActed = true
          gs.heroActed = false
          gs.actions = [...gs.actions, { who: 'villain', action: 'bet', label: `Bet ${bSize}` }]
          setGameState({ ...gs })
          setFeedback(null)
          return
        }
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

    const nextGs = advanceStreet(gs)
    setGameState(nextGs)
  }, [gameState, match, advanceStreet, resolveHand, updateMatch])

  // Sizing limits for the slider
  const sizingInfo = useMemo(() => {
    if (!gameState || gameState.result || !match) return null
    const heroRemaining = match.heroStack - (gameState.heroChipsInPot || 0)
    const bb = gameState.blinds?.bb || 2
    const facingBet = gameState.lastBet > 0

    if (facingBet) {
      // Raise: min = 2x last bet, max = all-in
      const minRaise = Math.min(gameState.lastBet * 2, heroRemaining)
      return { minBet: minRaise, maxBet: heroRemaining, defaultBet: Math.min(gameState.lastBet * 2.5, heroRemaining), canBet: heroRemaining > gameState.lastBet, action: 'raise' }
    }
    // Bet: min = 1bb, max = all-in
    const minBet = Math.min(bb, heroRemaining)
    return { minBet, maxBet: heroRemaining, defaultBet: Math.min(Math.round(gameState.pot * 0.66), heroRemaining), canBet: true, action: 'bet' }
  }, [gameState, match])

  // Reset betSize when sizing context changes
  const prevSizingRef = useRef(null)
  if (sizingInfo && sizingInfo !== prevSizingRef.current) {
    if (prevSizingRef.current?.defaultBet !== sizingInfo.defaultBet) {
      setBetSize(sizingInfo.defaultBet)
    }
    prevSizingRef.current = sizingInfo
  }

  // Check match over
  const matchOver = match?.matchOver
  const blinds = match ? getBlinds(match.handNum) : BLIND_LEVELS[0]
  const handsUntilBlindUp = match ? (HANDS_PER_LEVEL - (match.handNum % HANDS_PER_LEVEL)) : HANDS_PER_LEVEL
  const acc = match?.stats.totalActions > 0 ? Math.round((match.stats.correctActions / match.stats.totalActions) * 100) : 0
  const winRate = match?.stats.hands > 0 ? Math.round((match.stats.won / match.stats.hands) * 100) : 0

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-16" style={{ background: '#0f0f0f' }}>
      <div className="max-w-lg mx-auto px-4 pt-6">

        {/* Header */}
        <div className="text-center mb-4">
          <h1 style={{ color: 'white', fontSize: 22, fontWeight: 700, fontFamily: 'Poppins' }}>
            Arena HU
          </h1>
          <p style={{ color: '#676671', fontSize: 13 }}>Heads-Up vs Bot GTO</p>
        </div>

        {/* No match started */}
        {!match ? (
          <div className="text-center" style={{ paddingTop: 40 }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>♠♥</div>
            <p style={{ color: '#b3b3b8', fontSize: 15, marginBottom: 24, lineHeight: 1.6 }}>
              Jogue Heads-Up contra um bot GTO.<br />
              500 vs 500 fichas. Blinds sobem a cada 5 maos.<br />
              A partida so acaba quando alguem zerar.
            </p>
            <button onClick={startMatch}
              className="px-10 py-4 rounded-xl font-bold text-lg"
              style={{ background: '#4fce82', color: '#0f0f0f', border: 'none', cursor: 'pointer' }}>
              Iniciar Partida
            </button>
          </div>
        ) : matchOver ? (
          /* Match over */
          <div className="text-center" style={{ paddingTop: 30 }}>
            <div style={{ fontSize: 60, marginBottom: 12 }}>{match.winner === 'hero' ? '🏆' : '💀'}</div>
            <h2 style={{ color: match.winner === 'hero' ? '#4fce82' : '#e5484d', fontSize: 28, fontWeight: 700 }}>
              {match.winner === 'hero' ? 'Voce venceu!' : 'Bot venceu'}
            </h2>
            <div style={{ color: '#b3b3b8', fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
              {match.stats.hands} maos jogadas · Win rate {winRate}% · Acerto GTO {acc}%
            </div>
            <div className="flex gap-3 justify-center mt-6">
              <button onClick={() => { clearMatch(); setMatch(null); setGameState(null) }}
                className="px-6 py-3 rounded-xl font-bold"
                style={{ background: '#2a2a2e', color: '#b3b3b8', border: 'none', cursor: 'pointer' }}>
                Menu
              </button>
              <button onClick={startMatch}
                className="px-6 py-3 rounded-xl font-bold"
                style={{ background: '#4fce82', color: '#0f0f0f', border: 'none', cursor: 'pointer' }}>
                Revanche
              </button>
            </div>
          </div>
        ) : (
          /* Active match */
          <div>
            {/* Stacks + Blinds HUD */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="rounded-xl py-2 text-center" style={{ background: '#1a1a1d', border: '1px solid #4fce8244' }}>
                <div style={{ color: '#4fce82', fontSize: 18, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{match.heroStack}</div>
                <div style={{ color: '#676671', fontSize: 10 }}>Voce</div>
              </div>
              <div className="rounded-xl py-2 text-center" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
                <div style={{ color: '#f5a623', fontSize: 14, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{blinds.sb}/{blinds.bb}</div>
                <div style={{ color: '#676671', fontSize: 10 }}>Blinds · sobe em {handsUntilBlindUp}</div>
              </div>
              <div className="rounded-xl py-2 text-center" style={{ background: '#1a1a1d', border: '1px solid #e5484d44' }}>
                <div style={{ color: '#e5484d', fontSize: 18, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{match.villainStack}</div>
                <div style={{ color: '#676671', fontSize: 10 }}>Bot</div>
              </div>
            </div>

            {/* Stats bar */}
            <div className="flex gap-3 mb-3 justify-center">
              <span style={{ color: '#676671', fontSize: 11 }}>Mao #{match.handNum + 1}</span>
              <span style={{ color: '#676671', fontSize: 11 }}>·</span>
              <span style={{ color: '#676671', fontSize: 11 }}>Win {winRate}%</span>
              <span style={{ color: '#676671', fontSize: 11 }}>·</span>
              <span style={{ color: '#676671', fontSize: 11 }}>GTO {acc}%</span>
            </div>

            {/* No hand in progress — deal */}
            {!gameState || (gameState.result && !matchOver) ? (
              <div>
                {/* Show last hand result if exists */}
                {gameState?.result && (
                  <div className="rounded-xl p-4 mb-3" style={{
                    background: gameState.result.winner === 'hero' ? 'rgba(79,206,130,0.1)' : gameState.result.winner === 'tie' ? 'rgba(245,166,35,0.1)' : 'rgba(229,72,77,0.1)',
                    border: `1px solid ${gameState.result.winner === 'hero' ? '#4fce82' : gameState.result.winner === 'tie' ? '#f5a623' : '#e5484d'}`,
                  }}>
                    <div style={{
                      color: gameState.result.winner === 'hero' ? '#4fce82' : gameState.result.winner === 'tie' ? '#f5a623' : '#e5484d',
                      fontWeight: 700, fontSize: 16, marginBottom: 4,
                    }}>
                      {gameState.result.winner === 'hero' ? 'Voce ganhou!' : gameState.result.winner === 'tie' ? 'Empate' : 'Bot ganhou'}
                      <span style={{ fontSize: 13, fontWeight: 500, marginLeft: 8 }}>
                        Pot: {gameState.result.pot.toFixed(0)}
                      </span>
                    </div>
                    {gameState.showVillain && (
                      <div style={{ color: '#b3b3b8', fontSize: 12 }}>
                        Voce: <strong style={{ color: '#4fce82' }}>{gameState.result.heroEval.label}</strong>
                        {' · '}
                        Bot: <strong style={{ color: '#e5484d' }}>{gameState.result.villainEval.label}</strong>
                      </div>
                    )}
                  </div>
                )}

                <button onClick={startNewHand}
                  style={{
                    width: '100%', padding: '14px', borderRadius: 8,
                    background: '#4fce82', border: 'none',
                    color: '#0f0f0f', fontWeight: 600, fontSize: 15,
                    cursor: 'pointer',
                  }}>
                  {gameState ? 'Proxima Mao >' : 'Comecar Mao #1'}
                </button>

                {/* Hand history */}
                {match.handHistory.length > 0 && (
                  <div className="rounded-xl p-3 mt-3" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
                    <div style={{ color: '#676671', fontSize: 11, fontWeight: 600, marginBottom: 8 }}>HISTORICO</div>
                    <div className="space-y-2">
                      {match.handHistory.slice(0, 5).map((h, i) => (
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
                            {h.pot.toFixed(0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Abandon match */}
                <button onClick={() => { clearMatch(); setMatch(null); setGameState(null) }}
                  className="w-full mt-3 py-2 rounded-lg text-sm"
                  style={{ background: 'transparent', color: '#676671', border: '1px solid #2a2a2e', cursor: 'pointer' }}>
                  Abandonar partida
                </button>
              </div>
            ) : (
              /* Hand in progress */
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

                {/* Action buttons */}
                <div className="mb-4">
                  {!gameState.heroActed ? (
                    <div>
                      {/* Slider de sizing */}
                      {sizingInfo && sizingInfo.canBet && (
                        <div className="rounded-xl px-4 py-3 mb-3" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
                          <div className="flex items-center justify-between mb-2">
                            <span style={{ color: '#676671', fontSize: 11, fontWeight: 600 }}>
                              {gameState.lastBet > 0 ? 'RAISE' : 'BET'}
                            </span>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={betSize}
                                onChange={e => {
                                  const v = Math.max(sizingInfo.minBet, Math.min(sizingInfo.maxBet, Number(e.target.value) || 0))
                                  setBetSize(v)
                                }}
                                style={{
                                  width: 60, background: '#2a2a2e', border: '1px solid #3a3a42', borderRadius: 6,
                                  color: '#fdfdfd', fontSize: 14, fontWeight: 700, fontFamily: 'JetBrains Mono',
                                  textAlign: 'center', padding: '4px 6px', outline: 'none',
                                }}
                              />
                            </div>
                          </div>
                          <input
                            type="range"
                            min={sizingInfo.minBet}
                            max={sizingInfo.maxBet}
                            step={1}
                            value={betSize}
                            onChange={e => setBetSize(Number(e.target.value))}
                            style={{ width: '100%', accentColor: '#4fce82', cursor: 'pointer' }}
                          />
                          <div className="flex justify-between mt-1" style={{ fontSize: 10, color: '#676671' }}>
                            <span>Min {sizingInfo.minBet}</span>
                            <div className="flex gap-2">
                              {[0.33, 0.5, 0.66, 1].map(pct => {
                                const val = Math.min(Math.round(gameState.pot * pct), sizingInfo.maxBet)
                                return (
                                  <button key={pct} onClick={() => setBetSize(val)}
                                    style={{
                                      padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                                      background: '#2a2a2e', color: '#b3b3b8', border: 'none', cursor: 'pointer',
                                    }}>
                                    {pct === 1 ? 'Pot' : `${Math.round(pct * 100)}%`}
                                  </button>
                                )
                              })}
                              <button onClick={() => setBetSize(sizingInfo.maxBet)}
                                style={{
                                  padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                                  background: '#ff8f00', color: '#0f0f0f', border: 'none', cursor: 'pointer',
                                }}>
                                All-In
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Botoes de acao */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleHeroAction('fold')}
                          style={{
                            flex: 1, padding: '14px 4px', borderRadius: 8,
                            fontWeight: 600, fontSize: 13, border: 'none',
                            cursor: 'pointer', color: '#0f0f0f', background: '#e5484d',
                          }}>
                          Fold
                        </button>
                        {gameState.lastBet > 0 ? (
                          <>
                            <button onClick={() => handleHeroAction('call')}
                              style={{
                                flex: 1, padding: '14px 4px', borderRadius: 8,
                                fontWeight: 600, fontSize: 13, border: 'none',
                                cursor: 'pointer', color: '#0f0f0f', background: '#0a84d7',
                              }}>
                              Call {gameState.lastBet.toFixed(0)}
                            </button>
                            {sizingInfo?.canBet && (
                              <button onClick={() => handleHeroAction('raise', betSize)}
                                style={{
                                  flex: 1, padding: '14px 4px', borderRadius: 8,
                                  fontWeight: 600, fontSize: 13, border: 'none',
                                  cursor: 'pointer', color: '#0f0f0f',
                                  background: betSize >= sizingInfo.maxBet ? '#ff8f00' : '#4fce82',
                                }}>
                                {betSize >= sizingInfo.maxBet ? `All-In` : `Raise ${betSize}`}
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleHeroAction('check')}
                              style={{
                                flex: 1, padding: '14px 4px', borderRadius: 8,
                                fontWeight: 600, fontSize: 13, border: 'none',
                                cursor: 'pointer', color: '#0f0f0f', background: '#0a84d7',
                              }}>
                              Check
                            </button>
                            <button onClick={() => handleHeroAction('bet', betSize)}
                              style={{
                                flex: 1, padding: '14px 4px', borderRadius: 8,
                                fontWeight: 600, fontSize: 13, border: 'none',
                                cursor: 'pointer', color: '#0f0f0f',
                                background: betSize >= sizingInfo?.maxBet ? '#ff8f00' : '#4fce82',
                              }}>
                              {betSize >= sizingInfo?.maxBet ? `All-In` : `Bet ${betSize}`}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
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
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
