// Arena Multiway — MTT 6-max com mesa real
// Usa pokerEngine.js (engine multiway) + botAI.js (decisões dos bots)
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PokerTable6Max from '../components/PokerTable6Max'
import {
  createGame, dealHand, processAction, getAvailableActions,
  isHeroTurn, getCallAmount, getRaiseRange, prepareNextHand,
} from '../lib/pokerEngine.js'
import { botDecide, BOT_PROFILES, MTT_BOTS } from '../lib/botAI.js'

// ─── Constantes do torneio ──────────────────────────────
const STARTING_STACK = 1500
const BLIND_LEVELS = [
  { sb: 10, bb: 20 },
  { sb: 15, bb: 30 },
  { sb: 20, bb: 40 },
  { sb: 30, bb: 60 },
  { sb: 50, bb: 100 },
  { sb: 75, bb: 150 },
  { sb: 100, bb: 200 },
  { sb: 150, bb: 300 },
  { sb: 200, bb: 400 },
  { sb: 300, bb: 600 },
]
const HANDS_PER_LEVEL = 8
const PAYOUTS = [0.50, 0.30, 0.20] // top 3

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

export default function ArenaMultiway() {
  const navigate = useNavigate()

  // ─── State ──────────────────────────────────────────
  const [game, setGame] = useState(null)          // engine gameState
  const [phase, setPhase] = useState('lobby')      // lobby | playing | handOver | tourneyOver
  const [handNum, setHandNum] = useState(0)
  const [blindLevel, setBlindLevel] = useState(0)
  const [actionLabels, setActionLabels] = useState({})
  const [betSize, setBetSize] = useState(0)
  const [eliminated, setEliminated] = useState([]) // [{ name, place, handNum }]
  const [heroPlace, setHeroPlace] = useState(null)
  const [showdown, setShowdown] = useState(false)
  const [handHistory, setHandHistory] = useState([]) // ações da mão atual

  const botTimerRef = useRef(null)
  const gameRef = useRef(null)
  const labelsRef = useRef({})
  const historyRef = useRef([])
  const eliminatedRef = useRef([])
  const handNumRef = useRef(0)

  // Keep refs in sync with state
  useEffect(() => { gameRef.current = game }, [game])
  useEffect(() => { labelsRef.current = actionLabels }, [actionLabels])
  useEffect(() => { historyRef.current = handHistory }, [handHistory])
  useEffect(() => { eliminatedRef.current = eliminated }, [eliminated])
  useEffect(() => { handNumRef.current = handNum }, [handNum])

  // ─── Cleanup ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current)
    }
  }, [])

  // ─── Build action label from decision ────────────────
  function buildLabel(decision, g, idx) {
    if (decision.action === 'call') return `Call ${decision.amount || getCallAmount(g, idx)}`
    if (decision.action === 'raise') return `Raise ${decision.amount}`
    if (decision.action === 'bet') return `Bet ${decision.amount}`
    if (decision.action === 'allin') return 'All-In'
    if (decision.action === 'check') return 'Check'
    return 'Fold'
  }

  // ─── Hand complete — check eliminations ─────────────
  function handleHandComplete(g) {
    setShowdown(!g.winners?.every(w => w.potType === 'fold'))

    const prevElim = eliminatedRef.current
    const alive = g.players.filter(p => p.stack > 0)
    const newElim = [...prevElim]

    g.players.forEach(p => {
      if (p.stack <= 0 && !newElim.find(e => e.name === p.name)) {
        newElim.push({ name: p.name, place: 0, handNum: handNumRef.current })
      }
    })

    // Assign places: last eliminated = highest place number
    const totalPlayers = g.players.length
    newElim.forEach((e, i) => { e.place = totalPlayers - i })

    setEliminated(newElim)

    const heroPlayer = g.players.find(p => p.isHero)
    if (heroPlayer && heroPlayer.stack <= 0) {
      const place = newElim.find(e => e.name === heroPlayer.name)?.place || totalPlayers
      setHeroPlace(place)
      setPhase('tourneyOver')
      return
    }

    if (alive.length <= 1) {
      setHeroPlace(1)
      setPhase('tourneyOver')
      return
    }

    setPhase('handOver')
  }

  // ─── Schedule bot action (with delay for UX) ────────
  function scheduleBotAction(g) {
    if (botTimerRef.current) clearTimeout(botTimerRef.current)
    if (g.handComplete || isHeroTurn(g)) return

    botTimerRef.current = setTimeout(() => {
      processBotTurn(g)
    }, 400 + Math.random() * 400)
  }

  // ─── Process bot turn ───────────────────────────────
  function processBotTurn(currentGame) {
    let g = currentGame
    let labels = { ...labelsRef.current }
    let history = [...historyRef.current]

    let safety = 0
    while (!g.handComplete && !isHeroTurn(g) && safety < 30) {
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

  // ─── Start tournament ────────────────────────────────
  function startTourney() {
    const hero = { id: 'hero', name: 'Hero', stack: STARTING_STACK, isHero: true }
    const bots = MTT_BOTS.map(b => ({ ...b, stack: STARTING_STACK }))
    let g = createGame([hero, ...bots], BLIND_LEVELS[0], 0)
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

    if (!isHeroTurn(g)) scheduleBotAction(g)
  }

  // ─── Handle hero action ─────────────────────────────
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

    setGame(newG)
    setActionLabels(newLabels)
    setHandHistory(newHistory)

    if (newG.handComplete) {
      handleHandComplete(newG)
    } else if (!isHeroTurn(newG)) {
      scheduleBotAction(newG)
    }
  }

  // ─── Next hand ──────────────────────────────────────
  function nextHand() {
    const g = gameRef.current
    if (!g) return

    const newHandNum = handNumRef.current + 1
    const newLevel = Math.min(Math.floor((newHandNum - 1) / HANDS_PER_LEVEL), BLIND_LEVELS.length - 1)
    const blinds = BLIND_LEVELS[newLevel]

    const prepped = prepareNextHand(g)
    let newG = createGame(
      prepped.players.map(p => ({
        id: p.id, name: p.name, stack: p.stack,
        isHero: p.isHero, profile: p.profile,
      })),
      blinds,
      prepped.dealerIdx
    )
    newG = dealHand(newG)

    setGame(newG)
    setPhase('playing')
    setHandNum(newHandNum)
    setBlindLevel(newLevel)
    setActionLabels({})
    setShowdown(false)
    setHandHistory([])
    setBetSize(0)

    if (!isHeroTurn(newG)) scheduleBotAction(newG)
  }

  // ─── Derived state ──────────────────────────────────
  const heroIdx = game?.players.findIndex(p => p.isHero) ?? 0
  const heroPlayer = game?.players[heroIdx]
  const isMyTurn = game && isHeroTurn(game)
  const availableActions = isMyTurn ? getAvailableActions(game, heroIdx) : []
  const callAmount = isMyTurn ? getCallAmount(game, heroIdx) : 0
  const raiseRange = isMyTurn ? getRaiseRange(game, heroIdx) : { min: 0, max: 0 }
  const canRaise = availableActions.includes('raise') || availableActions.includes('bet')
  const blinds = BLIND_LEVELS[blindLevel]
  const handsUntilBlindUp = HANDS_PER_LEVEL - ((handNum - 1) % HANDS_PER_LEVEL)
  const alivePlayers = game?.players.filter(p => p.stack > 0) || []

  // ─── Render: Lobby ──────────────────────────────────
  if (phase === 'lobby') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4"
        style={{ background: '#0f0f0f' }}>
        <div className="w-full max-w-md text-center">
          <h1 style={{ color: '#fdfdfd', fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
            MTT 6-Max
          </h1>
          <p style={{ color: '#676671', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
            Mesa real de 6 jogadores.<br />
            Elimine todos os bots e venca o torneio.<br />
            Top 3 pagam: 50% / 30% / 20%
          </p>

          {/* Bot roster */}
          <div className="rounded-xl p-4 mb-6" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
            <div style={{ color: '#676671', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>
              Jogadores
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between px-2 py-1 rounded"
                style={{ background: 'rgba(79,206,130,0.08)', border: '1px solid rgba(79,206,130,0.2)' }}>
                <span style={{ color: '#4fce82', fontSize: 13, fontWeight: 700 }}>Hero (Voce)</span>
                <span style={{ color: '#4fce82', fontSize: 12, fontFamily: 'JetBrains Mono' }}>{STARTING_STACK}</span>
              </div>
              {MTT_BOTS.map(bot => {
                const profile = BOT_PROFILES[bot.profile]
                return (
                  <div key={bot.id} className="flex items-center justify-between px-2 py-1 rounded"
                    style={{ background: '#222225' }}>
                    <div className="flex items-center gap-2">
                      <span style={{ color: '#b3b3b8', fontSize: 13, fontWeight: 600 }}>{bot.name}</span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                        color: profile.color, background: `${profile.color}15`,
                      }}>
                        {profile.label}
                      </span>
                    </div>
                    <span style={{ color: '#676671', fontSize: 12, fontFamily: 'JetBrains Mono' }}>{STARTING_STACK}</span>
                  </div>
                )
              })}
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
              <div style={{ color: '#f5a623', fontSize: 16, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>10/20</div>
            </div>
            <div className="rounded-lg p-2" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
              <div style={{ color: '#676671', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>Level Up</div>
              <div style={{ color: '#fdfdfd', fontSize: 16, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{HANDS_PER_LEVEL}h</div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/arena')}
              className="px-6 py-3 rounded-xl font-bold"
              style={{ background: '#2a2a2e', color: '#b3b3b8', border: 'none', cursor: 'pointer', fontSize: 14 }}>
              Voltar
            </button>
            <button onClick={startTourney}
              className="px-10 py-3 rounded-xl font-bold"
              style={{ background: '#f5a623', color: '#0f0f0f', border: 'none', cursor: 'pointer', fontSize: 16 }}>
              Iniciar Torneio
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Render: Tournament Over ────────────────────────
  if (phase === 'tourneyOver') {
    const itm = heroPlace <= PAYOUTS.length
    const payout = itm ? PAYOUTS[heroPlace - 1] : 0

    // Build final standings
    const standings = game.players
      .map((p, i) => {
        const elimInfo = eliminated.find(e => e.name === p.name)
        return {
          name: p.name, stack: p.stack, isHero: p.isHero,
          place: p.stack > 0 ? 1 : (elimInfo?.place || 6),
        }
      })
      .sort((a, b) => a.place - b.place)

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4"
        style={{ background: '#0f0f0f' }}>
        <div className="w-full max-w-md text-center">
          <div style={{ fontSize: 60, marginBottom: 12 }}>
            {heroPlace === 1 ? '🏆' : heroPlace <= 3 ? '🥈' : '💀'}
          </div>
          <h2 style={{
            color: itm ? '#f5a623' : '#e5484d',
            fontSize: 28, fontWeight: 700,
          }}>
            {heroPlace === 1 ? 'Campeao!' : itm ? `${heroPlace}o Lugar` : `Eliminado em ${heroPlace}o`}
          </h2>

          {itm && (
            <div style={{ color: '#4fce82', fontSize: 18, fontWeight: 700, marginTop: 8, fontFamily: 'JetBrains Mono' }}>
              Premio: {Math.round(payout * 100)}%
            </div>
          )}

          {/* Final standings */}
          <div className="rounded-xl p-3 mt-4 max-w-xs mx-auto" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
            <div style={{ color: '#676671', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Resultado Final</div>
            {standings.map((p, i) => (
              <div key={i} className="flex items-center justify-between py-1"
                style={{ borderBottom: i < standings.length - 1 ? '1px solid #2a2a2e' : 'none' }}>
                <div className="flex items-center gap-2">
                  <span style={{
                    color: p.place <= 3 ? '#f5a623' : '#676671',
                    fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono', width: 20,
                  }}>#{p.place}</span>
                  <span style={{
                    color: p.isHero ? '#4fce82' : '#b3b3b8',
                    fontSize: 13, fontWeight: p.isHero ? 700 : 400,
                  }}>{p.name}</span>
                </div>
                <span style={{ color: '#676671', fontSize: 11, fontFamily: 'JetBrains Mono' }}>
                  {p.place <= PAYOUTS.length ? `${Math.round(PAYOUTS[p.place - 1] * 100)}%` : '-'}
                </span>
              </div>
            ))}
          </div>

          <div style={{ color: '#676671', fontSize: 12, marginTop: 12 }}>
            {handNum} maos jogadas
          </div>

          <div className="flex gap-3 justify-center mt-6">
            <button onClick={() => { setPhase('lobby'); setGame(null) }}
              className="px-6 py-3 rounded-xl font-bold"
              style={{ background: '#2a2a2e', color: '#b3b3b8', border: 'none', cursor: 'pointer' }}>
              Menu
            </button>
            <button onClick={startTourney}
              className="px-6 py-3 rounded-xl font-bold"
              style={{ background: '#f5a623', color: '#0f0f0f', border: 'none', cursor: 'pointer' }}>
              Novo Torneio
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Render: Playing / Hand Over ────────────────────
  return (
    <div className="min-h-screen px-2 py-3" style={{ background: '#0f0f0f' }}>
      <div className="max-w-lg mx-auto">

        {/* Top HUD: blinds, hand #, alive count */}
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            <span style={{
              color: '#f5a623', fontSize: 12, fontWeight: 700,
              fontFamily: 'JetBrains Mono',
            }}>
              {blinds.sb}/{blinds.bb}
            </span>
            <span style={{ color: '#676671', fontSize: 10 }}>
              Lv{blindLevel + 1} · sobe em {handsUntilBlindUp}h
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: '#676671', fontSize: 10 }}>
              Mao #{handNum}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
              color: '#4fce82', background: '#4fce8215',
            }}>
              {alivePlayers.length}/6 vivos
            </span>
          </div>
        </div>

        {/* Standings bar */}
        <div className="flex gap-1 mb-3 overflow-x-auto px-1" style={{ scrollbarWidth: 'none' }}>
          {game.players
            .map((p, i) => ({ ...p, idx: i }))
            .sort((a, b) => b.stack - a.stack)
            .map(p => (
              <div key={p.idx} className="flex items-center gap-1 px-2 py-1 rounded flex-shrink-0"
                style={{
                  background: p.isHero ? 'rgba(79,206,130,0.1)' : p.stack <= 0 ? '#22222580' : '#222225',
                  border: `1px solid ${p.isHero ? '#4fce8240' : p.stack <= 0 ? '#2a2a2e40' : '#2a2a2e'}`,
                  opacity: p.stack <= 0 ? 0.4 : 1,
                }}>
                <span style={{
                  color: p.isHero ? '#4fce82' : p.stack <= 0 ? '#676671' : '#b3b3b8',
                  fontSize: 10, fontWeight: 600,
                }}>{p.name}</span>
                <span style={{
                  color: p.isHero ? '#4fce82' : '#676671',
                  fontSize: 10, fontFamily: 'JetBrains Mono', fontWeight: 700,
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

        {/* Mesa visual 6-max */}
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

        {/* Winners display */}
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

        {/* Actions panel */}
        <div className="mb-3">
          {phase === 'handOver' ? (
            /* Next hand button */
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
            /* Hero action buttons */
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
                    style={{ width: '100%', accentColor: '#4fce82', cursor: 'pointer' }}
                  />
                  <div className="flex justify-between mt-1" style={{ fontSize: 10, color: '#676671' }}>
                    <span>Min {raiseRange.min}</span>
                    <div className="flex gap-2">
                      {[0.33, 0.5, 0.66, 1].map(pct => {
                        const potVal = game.pot
                        const val = Math.min(Math.max(Math.round(potVal * pct), raiseRange.min), raiseRange.max)
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
            /* Waiting for bots */
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
