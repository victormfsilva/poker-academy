// Arena Spin & Go — Simulador 3-max hyper-turbo
// Usa pokerEngine.js (engine multiway) + spinRanges.js (ranges GTO)
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PokerTable6Max from '../components/PokerTable6Max'
import {
  createGame, dealHand, processAction, getAvailableActions,
  isHeroTurn, getCallAmount, getRaiseRange, prepareNextHand,
  holeToNotation, evalHand,
} from '../lib/pokerEngine.js'
import { botDecide, BOT_PROFILES } from '../lib/botAI.js'
import {
  STARTING_RATING, getRatingTier, loadRating, saveRating, icmEquity,
} from '../lib/rating.js'
import {
  SPIN_BLIND_STRUCTURE, SPIN_MULTIPLIER_ADJUSTMENTS,
  shouldPushFold,
} from '../data/spinRanges.js'
import {
  getSpinPreflopFeedback, getSpinPostflopFeedback, getSpinICMFeedback,
} from '../lib/feedbackSpin.js'
import { useProgress } from '../context/ProgressContext'

// ─── Constantes ──────────────────────────────────────────
const STARTING_STACK = 500
const HANDS_PER_LEVEL = 6

// Bots do Spin — 2 adversários com perfis variados
const SPIN_BOT_SETS = [
  [
    { id: 'bot1', name: 'Shark_99', profile: 'gto' },
    { id: 'bot2', name: 'AgressivoLAG', profile: 'lag' },
  ],
  [
    { id: 'bot1', name: 'SolidTAG', profile: 'tag' },
    { id: 'bot2', name: 'CallingStation', profile: 'fish' },
  ],
  [
    { id: 'bot1', name: 'RockNit', profile: 'nit' },
    { id: 'bot2', name: 'Shark_99', profile: 'gto' },
  ],
  [
    { id: 'bot1', name: 'AgressivoLAG', profile: 'lag' },
    { id: 'bot2', name: 'SolidTAG', profile: 'tag' },
  ],
]

// Multiplicador aleatório com distribuição real
function rollMultiplier() {
  const dist = SPIN_MULTIPLIER_ADJUSTMENTS.distribution
  const roll = Math.random()
  let cumulative = 0
  for (const [mult, data] of Object.entries(dist)) {
    cumulative += data.frequency
    if (roll <= cumulative) return Number(mult)
  }
  return 2
}

// Payouts por multiplicador (winner takes 1st, 2nd/3rd = 0)
function getPayouts(multiplier) {
  // Spin: winner takes all (simplificado)
  // ICM: 1st = 100% do prize, 2nd/3rd = 0
  return [1.0, 0, 0]
}

// ─── Helpers ────────────────────────────────────────────
function formatStack(v) {
  if (v >= 10000) return `${(v / 1000).toFixed(1)}k`
  return v.toLocaleString()
}

function actionColor(label) {
  if (!label) return '#676671'
  const l = label.toLowerCase()
  if (l.includes('fold')) return '#676671'
  if (l.includes('check')) return '#4fce82'
  if (l.includes('call')) return '#0a84d7'
  if (l.includes('all')) return '#ff8f00'
  if (l.includes('raise') || l.includes('bet')) return '#f5a623'
  return '#b3b3b8'
}

function streetName(s) {
  return { preflop: 'Pre-Flop', flop: 'Flop', turn: 'Turn', river: 'River', showdown: 'Showdown' }[s] || s
}

function multColor(m) {
  if (m <= 2) return '#b3b3b8'
  if (m <= 5) return '#4fce82'
  if (m <= 10) return '#0a84d7'
  if (m <= 25) return '#f5a623'
  return '#e5484d'
}

function RatingSparkline({ history, color }) {
  if (!history || history.length < 2) return null
  const h = history.slice(-30)
  const min = Math.min(...h) - 10
  const max = Math.max(...h) + 10
  const range = max - min || 1
  const w = 100, ht = 24
  const points = h.map((v, i) => `${(i / (h.length - 1)) * w},${ht - ((v - min) / range) * ht}`).join(' ')
  return (
    <svg width={w} height={ht} style={{ display: 'block' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Rating key separado para Spin ──────────────────────
const SPIN_RATING_KEY = 'poker-spin-rating'

function loadSpinRating() {
  try {
    const raw = localStorage.getItem(SPIN_RATING_KEY)
    if (!raw) return { rating: STARTING_RATING, peak: STARTING_RATING, history: [] }
    return JSON.parse(raw)
  } catch { return { rating: STARTING_RATING, peak: STARTING_RATING, history: [] } }
}

function saveSpinRating(data) {
  try { localStorage.setItem(SPIN_RATING_KEY, JSON.stringify(data)) } catch {}
}

// ═══════════════════════════════════════════════════════════
export default function ArenaSpin() {
  const navigate = useNavigate()
  const { updateArenaData, recordArenaHand } = useProgress()

  // ─── State ──────────────────────────────────────────
  const [game, setGame] = useState(null)
  const [phase, setPhase] = useState('lobby') // lobby | playing | handOver | tourneyOver
  const [handNum, setHandNum] = useState(0)
  const [blindLevel, setBlindLevel] = useState(0)
  const [multiplier, setMultiplier] = useState(2)
  const [bots, setBots] = useState(SPIN_BOT_SETS[0])
  const [actionLabels, setActionLabels] = useState({})
  const [betSize, setBetSize] = useState(0)
  const [eliminated, setEliminated] = useState([])
  const [heroPlace, setHeroPlace] = useState(null)
  const [showdown, setShowdown] = useState(false)
  const [handHistory, setHandHistory] = useState([])
  const [ratingData, setRatingData] = useState(() => loadSpinRating())
  const [sessionStats, setSessionStats] = useState({ played: 0, wins: 0, folds: 0 })
  const [pastHands, setPastHands] = useState([])
  const [feedback, setFeedback] = useState(null)
  const [isHU, setIsHU] = useState(false) // transição 3-max → HU

  const botTimerRef = useRef(null)
  const gameRef = useRef(null)
  const labelsRef = useRef({})
  const historyRef = useRef([])
  const eliminatedRef = useRef([])
  const handNumRef = useRef(0)
  const isHURef = useRef(false)

  useEffect(() => { gameRef.current = game }, [game])
  useEffect(() => { labelsRef.current = actionLabels }, [actionLabels])
  useEffect(() => { historyRef.current = handHistory }, [handHistory])
  useEffect(() => { eliminatedRef.current = eliminated }, [eliminated])
  useEffect(() => { handNumRef.current = handNum }, [handNum])
  useEffect(() => { isHURef.current = isHU }, [isHU])

  useEffect(() => {
    return () => { if (botTimerRef.current) clearTimeout(botTimerRef.current) }
  }, [])

  // ─── Build action label ────────────────────────────
  function buildLabel(decision, g, idx) {
    if (decision.action === 'call') return `Call ${decision.amount || getCallAmount(g, idx)}`
    if (decision.action === 'raise') return `Raise ${decision.amount}`
    if (decision.action === 'bet') return `Bet ${decision.amount}`
    if (decision.action === 'allin') return 'All-In'
    if (decision.action === 'check') return 'Check'
    return 'Fold'
  }

  // ─── Hand complete ─────────────────────────────────
  function handleHandComplete(g) {
    const isShowdownResult = !g.winners?.every(w => w.potType === 'fold')
    setShowdown(isShowdownResult)

    const heroWon = g.winners?.some(w => g.players[w.playerIdx]?.isHero)
    setSessionStats(prev => ({
      played: prev.played + 1,
      wins: prev.wins + (heroWon ? 1 : 0),
      folds: prev.folds + (g.players.find(p => p.isHero)?.folded ? 1 : 0),
    }))

    recordArenaHand(heroWon, heroWon ? 1 : 0, 1)

    setPastHands(prev => [{
      handNum: handNumRef.current,
      board: [...(g.board || [])],
      winners: g.winners,
      players: g.players.map(p => ({
        name: p.name, isHero: p.isHero, stack: p.stack,
        holeCards: p.holeCards, folded: p.folded, position: p.position,
      })),
      actions: [...historyRef.current],
      pot: g.pot,
    }, ...prev].slice(0, 20))

    // Eliminations
    const prevElim = eliminatedRef.current
    const alive = g.players.filter(p => p.stack > 0)
    const newElim = [...prevElim]

    g.players.forEach(p => {
      if (p.stack <= 0 && !newElim.find(e => e.name === p.name)) {
        newElim.push({ name: p.name, place: 0, handNum: handNumRef.current })
      }
    })

    const totalPlayers = 3
    newElim.forEach((e, i) => { e.place = totalPlayers - i })
    setEliminated(newElim)

    // Hero eliminado?
    const heroPlayer = g.players.find(p => p.isHero)
    if (heroPlayer && heroPlayer.stack <= 0) {
      const place = newElim.find(e => e.name === heroPlayer.name)?.place || totalPlayers
      setHeroPlace(place)
      finishSpin(place)
      return
    }

    // Último jogador vivo
    if (alive.length <= 1) {
      setHeroPlace(1)
      finishSpin(1)
      return
    }

    // Transição 3-max → HU
    if (alive.length === 2 && !isHURef.current) {
      setIsHU(true)
    }

    setPhase('handOver')
  }

  // ─── Finish spin — rating update ───────────────────
  function finishSpin(place) {
    // Spin rating: 1st = +25 a +100 (depende mult), 2nd = -8, 3rd = -15
    const baseDeltas = { 1: 25, 2: -8, 3: -15 }
    let delta = baseDeltas[place] || -10

    // Bonus por multiplicador alto
    if (place === 1 && multiplier >= 5) delta += Math.min(multiplier * 2, 75)

    const kFactor = ratingData.rating < 1400 ? 1.2 : ratingData.rating < 1800 ? 1.0 : 0.8
    const adjustedDelta = Math.round(delta * kFactor)

    const newRating = Math.max(0, ratingData.rating + adjustedDelta)
    const newPeak = Math.max(ratingData.peak, newRating)
    const newHistory = [...(ratingData.history || []), newRating].slice(-50)
    const newRatingData = { rating: newRating, peak: newPeak, history: newHistory }

    setRatingData(newRatingData)
    saveSpinRating(newRatingData)

    setPhase('tourneyOver')
  }

  // ─── Schedule bot action ───────────────────────────
  function scheduleBotAction(g) {
    if (botTimerRef.current) clearTimeout(botTimerRef.current)
    if (g.handComplete || isHeroTurn(g)) return

    botTimerRef.current = setTimeout(() => {
      processBotTurn(g)
    }, 350 + Math.random() * 350)
  }

  // ─── Process bot turn ─────────────────────────────
  function processBotTurn(currentGame) {
    let g = currentGame
    let labels = { ...labelsRef.current }
    let history = [...historyRef.current]

    let safety = 0
    while (!g.handComplete && !isHeroTurn(g) && safety < 20) {
      const idx = g.activePlayerIdx
      if (idx === null) break

      const decision = botDecide(g, idx)
      const prevStreet = g.street
      const label = buildLabel(decision, g, idx)

      g = processAction(g, idx, decision.action, decision.amount || 0)

      labels[idx] = label
      history.push({
        playerIdx: idx, name: g.players[idx].name,
        action: label, street: prevStreet,
      })
      safety++

      if (g.street !== prevStreet && !g.handComplete) {
        labels = {}
        break
      }
    }

    setGame(g)
    setActionLabels(labels)
    setHandHistory(history)

    if (g.handComplete) {
      handleHandComplete(g)
    } else if (!isHeroTurn(g)) {
      scheduleBotAction(g)
    } else {
      const heroIdx = g.players.findIndex(p => p.isHero)
      if (heroIdx >= 0) setBetSize(getRaiseRange(g, heroIdx).min)
    }
  }

  // ─── Start spin ────────────────────────────────────
  function startSpin() {
    const mult = rollMultiplier()
    const botSet = SPIN_BOT_SETS[Math.floor(Math.random() * SPIN_BOT_SETS.length)]

    setMultiplier(mult)
    setBots(botSet)
    setIsHU(false)

    const hero = { id: 'hero', name: 'Hero', stack: STARTING_STACK, isHero: true }
    const botPlayers = botSet.map(b => ({ ...b, stack: STARTING_STACK }))
    const blinds = SPIN_BLIND_STRUCTURE[0]

    let g = createGame([hero, ...botPlayers], { sb: blinds.sb, bb: blinds.bb, ante: blinds.ante || 0 }, 0)
    g = dealHand(g)

    setGame(g)
    setPhase('playing')
    setHandNum(1)
    setBlindLevel(0)
    setActionLabels({})
    setEliminated([])
    setHeroPlace(null)
    setShowdown(false)
    setHandHistory([])
    setBetSize(0)
    setFeedback(null)
    setSessionStats({ played: 0, wins: 0, folds: 0 })
    setPastHands([])
    setRatingData(loadSpinRating())

    if (!isHeroTurn(g)) scheduleBotAction(g)
  }

  // ─── Handle hero action ───────────────────────────
  function handleHeroAction(action, amount) {
    const g = gameRef.current
    if (!g || g.handComplete) return
    const heroIdx = g.players.findIndex(p => p.isHero)
    if (heroIdx < 0 || g.activePlayerIdx !== heroIdx) return

    const prevStreet = g.street
    let newG = processAction(g, heroIdx, action, amount || 0)

    let label = action
    if (action === 'call') label = `Call ${getCallAmount(g, heroIdx)}`
    else if (action === 'raise' || action === 'bet') label = `${action === 'raise' ? 'Raise' : 'Bet'} ${amount}`
    else if (action === 'allin') label = 'All-In'
    else label = action.charAt(0).toUpperCase() + action.slice(1)

    const newLabels = newG.street !== prevStreet ? {} : { ...labelsRef.current }
    newLabels[heroIdx] = label

    const newHistory = [...historyRef.current, {
      playerIdx: heroIdx, name: 'Hero', action: label, street: prevStreet,
    }]

    // GTO Feedback
    let fb = null
    if (prevStreet === 'preflop') {
      fb = getSpinPreflopFeedback(g, heroIdx, action, multiplier, isHURef.current)
    } else {
      fb = getSpinPostflopFeedback(g, heroIdx, action, amount)
    }
    const icmFb = getSpinICMFeedback(g, heroIdx, action, multiplier)
    if (icmFb && fb) fb.icmNote = icmFb
    else if (icmFb) fb = { icmNote: icmFb }
    setFeedback(fb)

    setGame(newG)
    setActionLabels(newLabels)
    setHandHistory(newHistory)

    if (newG.handComplete) {
      handleHandComplete(newG)
    } else if (!isHeroTurn(newG)) {
      scheduleBotAction(newG)
    }
  }

  // ─── Next hand ────────────────────────────────────
  function nextHand() {
    const g = gameRef.current
    if (!g) return

    const newHandNum = handNumRef.current + 1
    const newLevel = Math.min(Math.floor((newHandNum - 1) / HANDS_PER_LEVEL), SPIN_BLIND_STRUCTURE.length - 1)
    const blinds = SPIN_BLIND_STRUCTURE[newLevel]

    const prepped = prepareNextHand(g)
    // Filtrar jogadores eliminados para criar novo jogo
    const aliveDefs = prepped.players
      .filter(p => p.stack > 0)
      .map(p => ({
        id: p.id, name: p.name, stack: p.stack,
        isHero: p.isHero, profile: p.profile,
      }))

    if (aliveDefs.length < 2) return

    let newG = createGame(aliveDefs, { sb: blinds.sb, bb: blinds.bb, ante: blinds.ante || 0 }, 0)
    newG = dealHand(newG)

    // Detect HU transition
    const nowHU = aliveDefs.length === 2
    if (nowHU && !isHURef.current) setIsHU(true)

    setGame(newG)
    setPhase('playing')
    setHandNum(newHandNum)
    setBlindLevel(newLevel)
    setActionLabels({})
    setShowdown(false)
    setHandHistory([])
    setBetSize(0)
    setFeedback(null)

    if (!isHeroTurn(newG)) scheduleBotAction(newG)
  }

  // ─── Derived state ────────────────────────────────
  const heroIdx = game?.players.findIndex(p => p.isHero) ?? 0
  const heroPlayer = game?.players[heroIdx]
  const isMyTurn = game && isHeroTurn(game)
  const availableActions = isMyTurn ? getAvailableActions(game, heroIdx) : []
  const callAmount = isMyTurn ? getCallAmount(game, heroIdx) : 0
  const raiseRange = isMyTurn ? getRaiseRange(game, heroIdx) : { min: 0, max: 0 }
  const canRaise = availableActions.includes('raise') || availableActions.includes('bet')
  const blinds = SPIN_BLIND_STRUCTURE[blindLevel] || SPIN_BLIND_STRUCTURE[0]
  const handsUntilBlindUp = HANDS_PER_LEVEL - ((handNum - 1) % HANDS_PER_LEVEL)
  const alivePlayers = game?.players.filter(p => p.stack > 0) || []
  const tier = getRatingTier(ratingData.rating)
  const winRate = sessionStats.played > 0 ? Math.round((sessionStats.wins / sessionStats.played) * 100) : 0
  const heroStackBB = heroPlayer ? Math.round(heroPlayer.stack / blinds.bb) : 0
  const pushZone = shouldPushFold(heroStackBB, alivePlayers.length)

  // ICM equity
  const heroIcm = game ? (() => {
    const stacks = game.players.map(p => p.stack)
    const eq = icmEquity(stacks, getPayouts(multiplier))
    return eq[heroIdx]
  })() : 0

  // ═══════════════════════════════════════════════════════
  // RENDER: LOBBY
  // ═══════════════════════════════════════════════════════
  if (phase === 'lobby') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 pb-28 md:pb-8"
        style={{ background: '#0f0f0f' }}>
        <div className="w-full max-w-md text-center">
          {/* Rating badge */}
          <div className="inline-flex flex-col items-center mb-4 px-5 py-2 rounded-xl"
            style={{ background: '#1a1a1d', border: `1px solid ${tier.color}40` }}>
            <span style={{ color: tier.color, fontSize: 24, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
              {ratingData.rating}
            </span>
            <span style={{ color: tier.color, fontSize: 12, fontWeight: 600 }}>{tier.label}</span>
            {ratingData.history?.length >= 2 && (
              <div style={{ marginTop: 4 }}>
                <RatingSparkline history={ratingData.history} color={tier.color} />
              </div>
            )}
          </div>

          <h1 style={{ color: '#fdfdfd', fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
            Spin & Go
          </h1>
          <p style={{ color: '#f97316', fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
            3-Max Hyper-Turbo
          </p>
          <p style={{ color: '#676671', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
            3 jogadores, blinds subindo rapido.<br />
            Multiplicador aleatorio define o premio.<br />
            Winner takes all!
          </p>

          {/* Multiplicadores */}
          <div className="rounded-xl p-4 mb-4" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
            <div style={{ color: '#676671', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>
              Multiplicadores
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {Object.entries(SPIN_MULTIPLIER_ADJUSTMENTS.distribution).map(([m, data]) => (
                <div key={m} className="px-3 py-1 rounded-lg text-center"
                  style={{ background: `${multColor(Number(m))}10`, border: `1px solid ${multColor(Number(m))}30` }}>
                  <div style={{ color: multColor(Number(m)), fontSize: 16, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                    {m}x
                  </div>
                  <div style={{ color: '#676671', fontSize: 9 }}>
                    {(data.frequency * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Structure info */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="rounded-lg p-2" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
              <div style={{ color: '#676671', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>Stack</div>
              <div style={{ color: '#fdfdfd', fontSize: 16, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{STARTING_STACK}</div>
            </div>
            <div className="rounded-lg p-2" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
              <div style={{ color: '#676671', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>Blinds</div>
              <div style={{ color: '#f5a623', fontSize: 16, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                {SPIN_BLIND_STRUCTURE[0].sb}/{SPIN_BLIND_STRUCTURE[0].bb}
              </div>
            </div>
            <div className="rounded-lg p-2" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
              <div style={{ color: '#676671', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>Jogadores</div>
              <div style={{ color: '#f97316', fontSize: 16, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>3</div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/')}
              className="px-6 py-3 rounded-xl font-bold"
              style={{ background: '#2a2a2e', color: '#b3b3b8', border: 'none', cursor: 'pointer', fontSize: 14 }}>
              Voltar
            </button>
            <button onClick={startSpin}
              className="px-10 py-3 rounded-xl font-bold"
              style={{ background: '#f97316', color: '#0f0f0f', border: 'none', cursor: 'pointer', fontSize: 16 }}>
              Jogar Spin
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════
  // RENDER: TOURNAMENT OVER
  // ═══════════════════════════════════════════════════════
  if (phase === 'tourneyOver') {
    const won = heroPlace === 1

    const standings = game.players
      .map(p => {
        const elimInfo = eliminated.find(e => e.name === p.name)
        return {
          name: p.name, stack: p.stack, isHero: p.isHero,
          place: p.stack > 0 ? 1 : (elimInfo?.place || 3),
        }
      })
      .sort((a, b) => a.place - b.place)

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 pb-28 md:pb-8"
        style={{ background: '#0f0f0f' }}>
        <div className="w-full max-w-md text-center">
          {/* Multiplier badge */}
          <div className="inline-flex items-center gap-2 mb-3 px-4 py-2 rounded-full"
            style={{ background: `${multColor(multiplier)}15`, border: `1px solid ${multColor(multiplier)}40` }}>
            <span style={{ color: multColor(multiplier), fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
              {multiplier}x
            </span>
            <span style={{ color: '#676671', fontSize: 12 }}>Spin</span>
          </div>

          <h2 style={{
            color: won ? '#f5a623' : '#e5484d',
            fontSize: 28, fontWeight: 700,
          }}>
            {won ? 'Voce Venceu!' : `${heroPlace}o Lugar`}
          </h2>

          {won && (
            <div style={{ color: '#4fce82', fontSize: 16, fontWeight: 700, marginTop: 8, fontFamily: 'JetBrains Mono' }}>
              Premio: {multiplier}x Buy-in
            </div>
          )}

          {/* Standings */}
          <div className="rounded-xl p-3 mt-4 max-w-xs mx-auto" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
            <div style={{ color: '#676671', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Resultado</div>
            {standings.map((p, i) => (
              <div key={i} className="flex items-center justify-between py-1"
                style={{ borderBottom: i < standings.length - 1 ? '1px solid #2a2a2e' : 'none' }}>
                <div className="flex items-center gap-2">
                  <span style={{
                    color: p.place === 1 ? '#f5a623' : '#676671',
                    fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono', width: 20,
                  }}>#{p.place}</span>
                  <span style={{
                    color: p.isHero ? '#4fce82' : '#b3b3b8',
                    fontSize: 13, fontWeight: p.isHero ? 700 : 400,
                  }}>{p.name}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Rating */}
          <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full"
            style={{ background: `${tier.color}15`, border: `1px solid ${tier.color}40` }}>
            <span style={{ color: tier.color, fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
              {ratingData.rating}
            </span>
            <span style={{ color: tier.color, fontSize: 12, fontWeight: 600 }}>{tier.label}</span>
          </div>
          {ratingData.history?.length >= 2 && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
              <RatingSparkline history={ratingData.history} color={tier.color} />
            </div>
          )}

          {/* Session stats */}
          <div className="grid grid-cols-3 gap-2 mt-4 max-w-xs mx-auto">
            <div className="rounded-lg p-2" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
              <div style={{ color: '#676671', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>Maos</div>
              <div style={{ color: '#fdfdfd', fontSize: 18, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{handNum}</div>
            </div>
            <div className="rounded-lg p-2" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
              <div style={{ color: '#676671', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>Win</div>
              <div style={{ color: winRate >= 50 ? '#4fce82' : '#e5484d', fontSize: 18, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{winRate}%</div>
            </div>
            <div className="rounded-lg p-2" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
              <div style={{ color: '#676671', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>Modo</div>
              <div style={{ color: '#f97316', fontSize: 14, fontWeight: 700 }}>{isHU ? 'HU' : '3-Max'}</div>
            </div>
          </div>

          <div className="flex gap-3 justify-center mt-6">
            <button onClick={() => { setPhase('lobby'); setGame(null); setIsHU(false) }}
              className="px-6 py-3 rounded-xl font-bold"
              style={{ background: '#2a2a2e', color: '#b3b3b8', border: 'none', cursor: 'pointer' }}>
              Menu
            </button>
            <button onClick={startSpin}
              className="px-6 py-3 rounded-xl font-bold"
              style={{ background: '#f97316', color: '#0f0f0f', border: 'none', cursor: 'pointer' }}>
              Novo Spin
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════
  // RENDER: PLAYING / HAND OVER
  // ═══════════════════════════════════════════════════════
  return (
    <div className="min-h-screen px-2 py-3 pb-28 md:pb-8" style={{ background: '#0f0f0f' }}>
      <div className="max-w-lg mx-auto">

        {/* Top HUD */}
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            {/* Multiplier badge */}
            <span className="px-2 py-0.5 rounded-full" style={{
              background: `${multColor(multiplier)}20`,
              border: `1px solid ${multColor(multiplier)}50`,
              color: multColor(multiplier), fontSize: 12, fontWeight: 800, fontFamily: 'JetBrains Mono',
            }}>
              {multiplier}x
            </span>
            <span style={{
              color: '#f5a623', fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono',
            }}>
              {blinds.sb}/{blinds.bb}
            </span>
            <span style={{ color: '#676671', fontSize: 10 }}>
              Lv{blindLevel + 1} · {handsUntilBlindUp}h
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: '#676671', fontSize: 10 }}>#{handNum}</span>
            {isHU && (
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4,
                color: '#f97316', background: '#f9731615',
              }}>HU</span>
            )}
            {pushZone && (
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4,
                color: '#e5484d', background: '#e5484d15',
              }}>PUSH/FOLD</span>
            )}
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex gap-3 mb-2 justify-center flex-wrap px-1">
          <div className="flex items-center gap-1">
            <span style={{ color: tier.color, fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
              {ratingData.rating}
            </span>
            <span style={{ color: tier.color, fontSize: 9, fontWeight: 600 }}>{tier.label}</span>
          </div>
          <span style={{ color: '#676671', fontSize: 10 }}>·</span>
          <span style={{ color: '#f97316', fontSize: 11, fontWeight: 600, fontFamily: 'JetBrains Mono' }}>
            {heroStackBB}bb
          </span>
          {sessionStats.played > 0 && (
            <>
              <span style={{ color: '#676671', fontSize: 10 }}>·</span>
              <span style={{ color: '#676671', fontSize: 10 }}>Win {winRate}%</span>
            </>
          )}
        </div>

        {/* Players bar */}
        <div className="flex gap-1 mb-3 justify-center px-1">
          {game.players
            .map((p, i) => ({ ...p, idx: i }))
            .sort((a, b) => b.stack - a.stack)
            .map(p => (
              <div key={p.idx} className="flex items-center gap-1 px-3 py-1 rounded-lg flex-shrink-0"
                style={{
                  background: p.isHero ? 'rgba(79,206,130,0.1)' : p.stack <= 0 ? '#22222580' : '#222225',
                  border: `1px solid ${p.isHero ? '#4fce8240' : '#2a2a2e'}`,
                  opacity: p.stack <= 0 ? 0.4 : 1,
                }}>
                <span style={{
                  color: p.isHero ? '#4fce82' : '#b3b3b8',
                  fontSize: 11, fontWeight: 600,
                }}>{p.name}</span>
                <span style={{
                  color: p.isHero ? '#4fce82' : '#676671',
                  fontSize: 11, fontFamily: 'JetBrains Mono', fontWeight: 700,
                }}>{p.stack <= 0 ? 'X' : formatStack(p.stack)}</span>
              </div>
            ))}
        </div>

        {/* Street indicator */}
        {game && !game.handComplete && (
          <div className="flex gap-1 mb-2 justify-center">
            {['preflop', 'flop', 'turn', 'river'].map(s => (
              <div key={s} className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: s === game.street ? '#4fce8222' : '#1a1a1d',
                  color: s === game.street ? '#4fce82' : '#676671',
                  border: `1px solid ${s === game.street ? '#4fce82' : '#2a2a2e'}`,
                  fontSize: 10,
                }}>
                {streetName(s)}
              </div>
            ))}
          </div>
        )}

        {/* Mesa visual */}
        <div className="rounded-2xl mb-3 py-4 px-2" style={{
          background: '#1a1a1d', border: '1px solid #2a2a2e',
        }}>
          <PokerTable6Max
            game={game}
            heroSeatIdx={heroIdx}
            actionLabels={actionLabels}
            showdown={showdown}
          />
        </div>

        {/* Winners */}
        {game.handComplete && game.winners && (
          <div className="rounded-xl p-3 mb-3" style={{
            background: 'rgba(245,166,35,0.08)',
            border: '1px solid rgba(245,166,35,0.25)',
          }}>
            <div style={{ color: '#676671', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>
              Resultado
            </div>
            {game.winners.map((w, i) => {
              const p = game.players[w.playerIdx]
              return (
                <div key={i} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <span style={{
                      color: p.isHero ? '#4fce82' : '#b3b3b8',
                      fontSize: 13, fontWeight: 700,
                    }}>{p.name}</span>
                    {w.hand && (
                      <span style={{ color: '#676671', fontSize: 11 }}>{w.hand}</span>
                    )}
                  </div>
                  <span style={{
                    color: '#f5a623', fontSize: 13, fontWeight: 700,
                    fontFamily: 'JetBrains Mono',
                  }}>
                    +{w.amount}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* GTO Feedback */}
        {feedback && (
          <div className="rounded-xl p-3 mb-3" style={{
            background: feedback.isCorrect ? 'rgba(79,206,130,0.08)' : 'rgba(229,72,77,0.08)',
            border: `1px solid ${feedback.isCorrect ? 'rgba(79,206,130,0.3)' : 'rgba(229,72,77,0.3)'}`,
          }}>
            <div className="flex items-center gap-2 mb-1">
              <span style={{
                fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                color: feedback.isCorrect ? '#4fce82' : '#e5484d',
              }}>
                {feedback.isCorrect ? 'Boa jogada' : 'Jogada questionavel'}
              </span>
              {feedback.position && (
                <span style={{
                  fontSize: 9, fontWeight: 700, fontFamily: 'JetBrains Mono',
                  color: '#676671', background: '#2a2a2e', padding: '1px 5px', borderRadius: 3,
                }}>{feedback.position}</span>
              )}
              {feedback.recommended && !feedback.isCorrect && (
                <span style={{
                  fontSize: 9, fontWeight: 700, fontFamily: 'JetBrains Mono',
                  color: '#f5a623', background: '#f5a62315', padding: '1px 5px', borderRadius: 3,
                }}>Ideal: {feedback.recommended}</span>
              )}
            </div>
            {feedback.reason && (
              <div style={{ fontSize: 11, color: '#b3b3b8', lineHeight: 1.4 }}>
                {feedback.reason}
              </div>
            )}
            {feedback.icmNote && (
              <div style={{
                fontSize: 10, marginTop: 4, fontWeight: 600,
                color: '#a855f7', fontStyle: 'italic',
              }}>
                ICM: {feedback.icmNote}
              </div>
            )}
          </div>
        )}

        {/* Hand History */}
        {handHistory.length > 0 && (
          <div className="rounded-xl p-3 mb-3" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
            <div style={{ color: '#676671', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>
              Hand History
            </div>
            <div className="flex flex-wrap gap-1">
              {handHistory.map((h, i) => (
                <span key={i} style={{
                  fontSize: 10, fontWeight: 600, fontFamily: 'JetBrains Mono',
                  color: actionColor(h.action),
                  background: `${actionColor(h.action)}15`,
                  padding: '1px 5px', borderRadius: 3,
                }}>
                  {h.name}: {h.action}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Past hands */}
        {pastHands.length > 0 && phase === 'handOver' && (
          <details className="rounded-xl mb-3" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
            <summary style={{
              color: '#676671', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              padding: '8px 12px', cursor: 'pointer', userSelect: 'none',
            }}>
              Maos Anteriores ({pastHands.length})
            </summary>
            <div className="px-3 pb-3 space-y-2" style={{ maxHeight: 200, overflowY: 'auto' }}>
              {pastHands.map((h, i) => (
                <div key={i} className="rounded-lg p-2" style={{ background: '#222225' }}>
                  <div className="flex items-center justify-between">
                    <span style={{ color: '#676671', fontSize: 9, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                      #{h.handNum}
                    </span>
                    <span style={{
                      fontSize: 9, fontWeight: 700,
                      color: h.winners?.some(w => h.players[w.playerIdx]?.isHero) ? '#4fce82' : '#e5484d',
                    }}>
                      {h.winners?.some(w => h.players[w.playerIdx]?.isHero) ? 'WIN' : 'LOSS'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {h.actions.slice(0, 6).map((a, j) => (
                      <span key={j} style={{
                        fontSize: 8, fontFamily: 'JetBrains Mono', color: actionColor(a.action),
                        background: `${actionColor(a.action)}10`, padding: '0 3px', borderRadius: 2,
                      }}>
                        {a.name.slice(0, 4)}: {a.action}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Actions panel */}
        <div className="mb-3">
          {phase === 'handOver' ? (
            <button onClick={nextHand}
              style={{
                width: '100%', padding: '14px', borderRadius: 8,
                background: '#4fce82', border: 'none',
                color: '#0f0f0f', fontWeight: 600, fontSize: 15,
                cursor: 'pointer',
              }}>
              Proxima Mao
            </button>
          ) : isMyTurn ? (
            <div>
              {/* Bet/Raise slider */}
              {canRaise && (
                <div className="rounded-xl px-4 py-3 mb-3" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ color: '#676671', fontSize: 11, fontWeight: 600 }}>
                      {availableActions.includes('raise') ? 'RAISE' : 'BET'}
                    </span>
                    <input
                      type="number"
                      value={betSize}
                      onChange={e => {
                        const v = Math.max(raiseRange.min, Math.min(raiseRange.max, Number(e.target.value) || 0))
                        setBetSize(v)
                      }}
                      style={{
                        width: 60, background: '#2a2a2e', border: '1px solid #3a3a42', borderRadius: 6,
                        color: '#fdfdfd', fontSize: 14, fontWeight: 700, fontFamily: 'JetBrains Mono',
                        textAlign: 'center', padding: '4px 6px', outline: 'none',
                      }}
                    />
                  </div>
                  <input
                    type="range"
                    min={raiseRange.min}
                    max={raiseRange.max}
                    step={1}
                    value={betSize}
                    onChange={e => setBetSize(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#f97316', cursor: 'pointer' }}
                  />
                  <div className="flex justify-between mt-1" style={{ fontSize: 10, color: '#676671' }}>
                    <span>Min {raiseRange.min}</span>
                    <div className="flex gap-2">
                      {[0.33, 0.5, 0.66, 1].map(pct => {
                        const val = Math.min(Math.max(Math.round(game.pot * pct), raiseRange.min), raiseRange.max)
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
                      <button onClick={() => setBetSize(raiseRange.max)}
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

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                {availableActions.includes('fold') && (
                  <button onClick={() => handleHeroAction('fold')}
                    style={{
                      flex: 1, padding: '14px 4px', borderRadius: 8,
                      fontWeight: 600, fontSize: 13, border: 'none',
                      cursor: 'pointer', color: '#0f0f0f', background: '#e5484d',
                    }}>
                    Fold
                  </button>
                )}
                {availableActions.includes('check') && (
                  <button onClick={() => handleHeroAction('check')}
                    style={{
                      flex: 1, padding: '14px 4px', borderRadius: 8,
                      fontWeight: 600, fontSize: 13, border: 'none',
                      cursor: 'pointer', color: '#0f0f0f', background: '#4fce82',
                    }}>
                    Check
                  </button>
                )}
                {availableActions.includes('call') && (
                  <button onClick={() => handleHeroAction('call')}
                    style={{
                      flex: 1, padding: '14px 4px', borderRadius: 8,
                      fontWeight: 600, fontSize: 13, border: 'none',
                      cursor: 'pointer', color: '#0f0f0f', background: '#0a84d7',
                    }}>
                    Call {callAmount}
                  </button>
                )}
                {canRaise && (
                  <button onClick={() => handleHeroAction(
                    availableActions.includes('raise') ? 'raise' : 'bet',
                    betSize
                  )}
                    style={{
                      flex: 1, padding: '14px 4px', borderRadius: 8,
                      fontWeight: 600, fontSize: 13, border: 'none',
                      cursor: 'pointer', color: '#0f0f0f',
                      background: betSize >= raiseRange.max ? '#ff8f00' : '#f5a623',
                    }}>
                    {betSize >= raiseRange.max ? 'All-In' : availableActions.includes('raise') ? `Raise ${betSize}` : `Bet ${betSize}`}
                  </button>
                )}
              </div>
            </div>
          ) : !game.handComplete ? (
            <div style={{
              width: '100%', padding: '14px', borderRadius: 8,
              background: '#1a1a1d', border: '1px solid #2a2a2e',
              color: '#676671', fontWeight: 600, fontSize: 14, textAlign: 'center',
            }}>
              Aguardando...
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
