import { useState, useCallback, useEffect, useRef } from 'react'
import Card from '../components/Card'
import { useSolver } from '../lib/useSolver'
import { RFI_RANGES, BB_VS_RFI, BTN_VS_RFI, SB_VS_RFI } from '../data/ranges'

// ─── Constants ────────────────────────────────────────
const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2']
const SUITS = ['s','h','d','c']

// Preflop spots to train
const SPOTS = [
  { name: 'BTN vs BB', oopPos: 'BB', ipPos: 'BTN', label: 'BTN abre, BB defende' },
  { name: 'CO vs BB', oopPos: 'BB', ipPos: 'CO', label: 'CO abre, BB defende' },
  { name: 'SB vs BB', oopPos: 'BB', ipPos: 'SB', label: 'SB abre, BB defende' },
]

// Convert range object format to string for WASM
function rangeToString(rangeObj) {
  if (!rangeObj) return ''
  const hands = []
  if (rangeObj.raise) hands.push(...rangeObj.raise)
  if (rangeObj.call) hands.push(...rangeObj.call)
  if (rangeObj.mix) hands.push(...rangeObj.mix.map(h => h + ':50'))
  return hands.join(',')
}

function getSpotRanges(spot) {
  // IP range: RFI for that position
  let ipRange = ''
  const pos = spot.ipPos
  if (pos === 'BTN') ipRange = rangeToString(RFI_RANGES?.BTN?.[100])
  else if (pos === 'CO') ipRange = rangeToString(RFI_RANGES?.CO?.[100])
  else if (pos === 'SB') ipRange = rangeToString(RFI_RANGES?.SB?.[100])
  else if (pos === 'UTG') ipRange = rangeToString(RFI_RANGES?.UTG?.[100])

  // OOP range: BB defense vs that position
  let oopRange = ''
  if (BB_VS_RFI?.[pos]?.call) {
    const bbr = BB_VS_RFI[pos]
    oopRange = rangeToString({ raise: bbr.threebet || [], call: bbr.call || [], mix: bbr.mix || [] })
  }

  // Fallback: wide ranges
  if (!ipRange) ipRange = '22+,A2s+,K5s+,Q8s+,J8s+,T8s+,97s+,86s+,76s,65s,54s,A8o+,KTo+,QTo+,JTo'
  if (!oopRange) oopRange = '22+,A2s+,K8s+,Q8s+,J8s+,T8s+,98s,87s,76s,65s,A8o+,KTo+,QTo+,JTo'

  return { oopRange, ipRange }
}

// ─── Card utilities ───────────────────────────────────
function newDeck() {
  const deck = []
  for (const r of RANKS) for (const s of SUITS) deck.push(r + s)
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

function dealCards(deck, exclude, n) {
  const result = []
  for (const c of deck) {
    if (!exclude.includes(c) && result.length < n) result.push(c)
  }
  return result
}

// Action name mapping
const ACTION_LABELS = {
  'F': 'Fold', 'X': 'Check', 'C': 'Call',
  'B': 'Bet', 'R': 'Raise', 'A': 'All-In',
}

function parseAction(actionStr) {
  if (!actionStr) return { type: '?', label: '?', size: 0 }
  const type = actionStr[0]
  const label = ACTION_LABELS[type] || actionStr
  const sizeMatch = actionStr.match(/(\d+)/)
  const size = sizeMatch ? parseInt(sizeMatch[1]) : 0
  if (type === 'B' && size) return { type, label: `Bet ${size}%`, size }
  if (type === 'R' && size) return { type, label: `Raise ${size}%`, size }
  return { type, label, size }
}

// ─── Phases ───────────────────────────────────────────
const PHASE = { SETUP: 0, SOLVING: 1, PLAY_FLOP: 2, PLAY_TURN: 3, PLAY_RIVER: 4, REVIEW: 5 }

export default function MultiStreet() {
  const { ready, loading, error: solverError, solve, getStrategy, getHandStrategy } = useSolver()

  const [phase, setPhase] = useState(PHASE.SETUP)
  const [spot, setSpot] = useState(null)
  const [heroHand, setHeroHand] = useState([])
  const [board, setBoard] = useState([])
  const [heroPos, setHeroPos] = useState('oop') // hero is OOP (BB) by default
  const [pot, setPot] = useState(6)
  const [stack, setStack] = useState(100)
  const [history, setHistory] = useState([])
  const [streetActions, setStreetActions] = useState([]) // actions taken this hand
  const [currentStrategy, setCurrentStrategy] = useState(null)
  const [handStrategy, setHandStrategy] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [reviewData, setReviewData] = useState([])
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [solveInfo, setSolveInfo] = useState(null)
  const deckRef = useRef([])

  // ─── Start new hand ───────────────────────────────
  const startHand = useCallback(async () => {
    const spotIdx = Math.floor(Math.random() * SPOTS.length)
    const chosenSpot = SPOTS[spotIdx]
    const deck = newDeck()
    deckRef.current = deck

    // Deal hero hand and flop
    const hero = [deck[0], deck[1]]
    const flop = [deck[2], deck[3], deck[4]]

    setSpot(chosenSpot)
    setHeroHand(hero)
    setBoard(flop)
    setHistory([])
    setStreetActions([])
    setFeedback(null)
    setCurrentStrategy(null)
    setHandStrategy(null)
    setReviewData([])
    setPhase(PHASE.SOLVING)

    // Get ranges and solve
    const { oopRange, ipRange } = getSpotRanges(chosenSpot)

    try {
      const result = await solve({
        oopRange, ipRange,
        board: flop,
        startingPot: 6,
        effectiveStack: 100,
        iterations: 150,
      })
      setSolveInfo(result)

      // Get root strategy
      const strat = await getStrategy([])
      setCurrentStrategy(strat)

      // Get hero's hand-specific strategy
      const hs = await getHandStrategy([], hero)
      setHandStrategy(hs)

      setPhase(PHASE.PLAY_FLOP)
    } catch (err) {
      console.error('Solver error:', err)
      setPhase(PHASE.SETUP)
    }
  }, [solve, getStrategy, getHandStrategy])

  // ─── Hero makes a decision ────────────────────────
  const makeDecision = useCallback(async (actionIdx) => {
    if (!currentStrategy || !handStrategy) return

    const action = currentStrategy.actions[actionIdx]
    const parsed = parseAction(action)

    // What did the solver say for this hand?
    const heroFreq = handStrategy.freqs?.[actionIdx] || 0
    const bestActionIdx = handStrategy.freqs?.indexOf(Math.max(...(handStrategy.freqs || [0])))
    const bestAction = currentStrategy.actions[bestActionIdx]
    const isGTOApproved = heroFreq >= 0.15 // 15%+ frequency = acceptable

    // Avg freq across all combos
    const avgFreq = currentStrategy.avgFreqs?.[actionIdx] || 0

    const decision = {
      street: phase === PHASE.PLAY_FLOP ? 'Flop' : phase === PHASE.PLAY_TURN ? 'Turn' : 'River',
      action: parsed.label,
      heroFreq: (heroFreq * 100).toFixed(1),
      avgFreq: (avgFreq * 100).toFixed(1),
      bestAction: parseAction(bestAction).label,
      bestFreq: ((handStrategy.freqs?.[bestActionIdx] || 0) * 100).toFixed(1),
      isCorrect: isGTOApproved,
      allActions: currentStrategy.actions.map((a, i) => ({
        label: parseAction(a).label,
        heroFreq: ((handStrategy.freqs?.[i] || 0) * 100).toFixed(1),
        avgFreq: ((currentStrategy.avgFreqs?.[i] || 0) * 100).toFixed(1),
      })),
    }

    setFeedback(decision)
    setReviewData(prev => [...prev, decision])
    setScore(prev => ({
      correct: prev.correct + (isGTOApproved ? 1 : 0),
      total: prev.total + 1
    }))

    // Navigate to next node
    const newHistory = [...history, actionIdx]
    setHistory(newHistory)
    setStreetActions(prev => [...prev, { player: currentStrategy.player, action: parsed.label }])

    // After showing feedback briefly, advance
    setTimeout(async () => {
      try {
        // Check what happens next
        const nextStrat = await getStrategy(newHistory)

        if (nextStrat?.player === 'terminal') {
          // Hand is over (fold/all-in)
          setPhase(PHASE.REVIEW)
          return
        }

        if (nextStrat?.player === 'chance') {
          // Chance node = deal next card
          if (phase === PHASE.PLAY_FLOP) {
            // Deal turn
            const turnCard = dealCards(deckRef.current.slice(5), [...heroHand, ...board], 1)[0]
            const newBoard = [...board, turnCard]
            setBoard(newBoard)

            // Re-solve is not needed — solver already computed all streets!
            // Navigate past chance node
            const turnCardIdx = turnCard ? RANKS.indexOf(turnCard[0]) * 4 + SUITS.indexOf(turnCard[1]) : 0
            // Chance node: action index = card index in available cards
            // For simplicity, just skip to next player node
            const chanceHistory = [...newHistory]
            // Try to find the right chance action
            const actionsAfterChance = await getStrategy(chanceHistory)
            if (actionsAfterChance?.player === 'chance') {
              // Need to select the card from chance actions
              // The chance node has 52 possible actions (cards), we need to pick the right one
              // For now, use a heuristic: the action index corresponds to card order
              chanceHistory.push(turnCardIdx)
            }

            const turnStrat = await getStrategy(chanceHistory)
            setHistory(chanceHistory)
            setCurrentStrategy(turnStrat)
            const hs = await getHandStrategy(chanceHistory, heroHand)
            setHandStrategy(hs)
            setFeedback(null)
            setPhase(PHASE.PLAY_TURN)
          } else if (phase === PHASE.PLAY_TURN) {
            // Deal river
            const riverCard = dealCards(deckRef.current.slice(5), [...heroHand, ...board], 2)[1] ||
                              dealCards(deckRef.current.slice(6), [...heroHand, ...board], 1)[0]
            const newBoard = [...board, riverCard]
            setBoard(newBoard)

            const chanceHistory = [...newHistory]
            const riverCardIdx = riverCard ? RANKS.indexOf(riverCard[0]) * 4 + SUITS.indexOf(riverCard[1]) : 0
            const nextCheck = await getStrategy(chanceHistory)
            if (nextCheck?.player === 'chance') chanceHistory.push(riverCardIdx)

            const riverStrat = await getStrategy(chanceHistory)
            setHistory(chanceHistory)
            setCurrentStrategy(riverStrat)
            const hs = await getHandStrategy(chanceHistory, heroHand)
            setHandStrategy(hs)
            setFeedback(null)
            setPhase(PHASE.PLAY_RIVER)
          } else {
            setPhase(PHASE.REVIEW)
          }
          return
        }

        // Villain's turn — auto-play GTO
        if ((nextStrat.player === 'oop' && heroPos !== 'oop') ||
            (nextStrat.player === 'ip' && heroPos !== 'ip')) {
          // Villain acts: pick action with highest avg frequency
          const villainBestIdx = nextStrat.avgFreqs.indexOf(Math.max(...nextStrat.avgFreqs))
          const villainAction = parseAction(nextStrat.actions[villainBestIdx])
          setStreetActions(prev => [...prev, { player: nextStrat.player + ' (vilao)', action: villainAction.label }])

          const afterVillain = [...newHistory, villainBestIdx]
          const afterStrat = await getStrategy(afterVillain)
          setHistory(afterVillain)

          if (afterStrat?.player === 'terminal') {
            setPhase(PHASE.REVIEW)
            return
          }
          if (afterStrat?.player === 'chance') {
            // Advance to next street after villain acts
            // This will be handled in the next iteration
            setCurrentStrategy(afterStrat)
            setHandStrategy(null)
            setFeedback(null)
            // Trigger chance handling by recursive call-like pattern
            // For now, go to review
            setPhase(PHASE.REVIEW)
            return
          }

          setCurrentStrategy(afterStrat)
          const hs2 = await getHandStrategy(afterVillain, heroHand)
          setHandStrategy(hs2)
          setFeedback(null)
        } else {
          // Hero's turn again
          setCurrentStrategy(nextStrat)
          const hs2 = await getHandStrategy(newHistory, heroHand)
          setHandStrategy(hs2)
          setFeedback(null)
        }
      } catch (err) {
        console.error('Navigation error:', err)
        setPhase(PHASE.REVIEW)
      }
    }, 2500)
  }, [currentStrategy, handStrategy, history, phase, heroPos, board, heroHand, getStrategy, getHandStrategy])

  // ─── Render ─────────────────────────────────────────
  const streetName = phase === PHASE.PLAY_FLOP ? 'Flop' : phase === PHASE.PLAY_TURN ? 'Turn' : phase === PHASE.PLAY_RIVER ? 'River' : ''

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-16 px-4" style={{ background: '#0f0f0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        {/* Header */}
        <div className="mb-6">
          <h1 style={{ color: '#fdfdfd', fontSize: 22, fontWeight: 600 }}>Multi-Street GTO Trainer</h1>
          <p style={{ color: '#676671', fontSize: 13 }}>
            Solver real WASM rodando no browser — decida em cada street e compare com GTO
          </p>
          {score.total > 0 && (
            <div style={{ color: '#b3b3b8', fontSize: 12, marginTop: 4 }}>
              Score: {score.correct}/{score.total} ({Math.round(score.correct / score.total * 100)}%)
            </div>
          )}
        </div>

        {/* Solver status */}
        {!ready && (
          <div className="rounded-xl p-6 mb-4 text-center" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
            <div style={{ color: '#f5a623', fontSize: 14 }}>
              Carregando solver WASM (~400KB)...
            </div>
            {solverError && <div style={{ color: '#e5484d', fontSize: 12, marginTop: 8 }}>{solverError}</div>}
          </div>
        )}

        {/* Setup / Start */}
        {phase === PHASE.SETUP && ready && (
          <div className="rounded-xl p-6 text-center" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
            <p style={{ color: '#b3b3b8', fontSize: 14, marginBottom: 16 }}>
              O solver GTO vai rodar no seu browser em tempo real. Voce recebe uma mao e decide em cada street.
            </p>
            <button
              onClick={startHand}
              className="px-6 py-3 rounded-lg font-semibold"
              style={{ background: '#0a84d7', color: '#fff', cursor: 'pointer', border: 'none', fontSize: 15 }}
            >
              Iniciar Mao
            </button>
          </div>
        )}

        {/* Solving */}
        {phase === PHASE.SOLVING && (
          <div className="rounded-xl p-6 text-center" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
            <div className="flex items-center justify-center gap-3">
              <div style={{
                width: 20, height: 20, border: '2px solid #0a84d7', borderTopColor: 'transparent',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite'
              }} />
              <span style={{ color: '#0a84d7', fontSize: 14 }}>Solver resolvendo (~2s)...</span>
            </div>
          </div>
        )}

        {/* Playing */}
        {(phase === PHASE.PLAY_FLOP || phase === PHASE.PLAY_TURN || phase === PHASE.PLAY_RIVER) && (
          <div className="space-y-4">
            {/* Spot info */}
            <div className="rounded-xl p-3" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
              <div className="flex items-center justify-between">
                <span style={{ color: '#b3b3b8', fontSize: 12 }}>{spot?.label}</span>
                <span style={{
                  color: '#0a84d7', fontSize: 12, fontWeight: 600,
                  background: 'rgba(10,132,215,0.1)', padding: '2px 8px', borderRadius: 4,
                }}>
                  {streetName}
                </span>
              </div>
              {solveInfo && (
                <div style={{ color: '#676671', fontSize: 11, marginTop: 4 }}>
                  Exploitability: {(solveInfo.exploit * 100).toFixed(2)}% do pot
                </div>
              )}
            </div>

            {/* Board */}
            <div className="rounded-xl p-4 text-center" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
              <div style={{ color: '#676671', fontSize: 11, marginBottom: 8 }}>BOARD</div>
              <div className="flex justify-center gap-2">
                {board.map((c, i) => (
                  <Card key={i} card={c} size="lg" />
                ))}
              </div>
            </div>

            {/* Hero hand */}
            <div className="rounded-xl p-4 text-center" style={{ background: '#1a1a1d', border: '1px solid rgba(10,132,215,0.3)' }}>
              <div style={{ color: '#0a84d7', fontSize: 11, marginBottom: 8 }}>SUA MAO ({heroPos.toUpperCase()})</div>
              <div className="flex justify-center gap-2">
                {heroHand.map((c, i) => (
                  <Card key={i} card={c} size="lg" />
                ))}
              </div>
              {handStrategy?.equity != null && (
                <div style={{ color: '#676671', fontSize: 11, marginTop: 8 }}>
                  Equity: {(handStrategy.equity * 100).toFixed(1)}%
                  {handStrategy.ev != null && ` | EV: ${handStrategy.ev.toFixed(2)}bb`}
                </div>
              )}
            </div>

            {/* Action log */}
            {streetActions.length > 0 && (
              <div className="rounded-xl p-3" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
                <div style={{ color: '#676671', fontSize: 11, marginBottom: 4 }}>Acoes desta mao:</div>
                {streetActions.map((sa, i) => (
                  <div key={i} style={{ color: '#b3b3b8', fontSize: 12 }}>
                    {sa.player}: {sa.action}
                  </div>
                ))}
              </div>
            )}

            {/* Feedback */}
            {feedback && (
              <div className="rounded-xl p-4" style={{
                background: feedback.isCorrect ? 'rgba(79,206,130,0.08)' : 'rgba(229,72,77,0.08)',
                border: `1px solid ${feedback.isCorrect ? 'rgba(79,206,130,0.3)' : 'rgba(229,72,77,0.3)'}`,
              }}>
                <div style={{
                  color: feedback.isCorrect ? '#4fce82' : '#e5484d',
                  fontSize: 14, fontWeight: 600, marginBottom: 8
                }}>
                  {feedback.isCorrect ? 'GTO Aprovado!' : 'Desvio do GTO'}
                </div>
                <div style={{ color: '#b3b3b8', fontSize: 12, lineHeight: 1.6 }}>
                  Voce: <strong>{feedback.action}</strong> ({feedback.heroFreq}% freq para sua mao)
                  <br />
                  Melhor: <strong>{feedback.bestAction}</strong> ({feedback.bestFreq}%)
                </div>
                <div className="mt-2 space-y-1">
                  {feedback.allActions?.map((a, i) => (
                    <div key={i} className="flex items-center gap-2" style={{ fontSize: 11 }}>
                      <div className="flex-1 rounded-full overflow-hidden" style={{ height: 6, background: '#2a2a2e' }}>
                        <div style={{
                          width: `${Math.min(parseFloat(a.heroFreq), 100)}%`,
                          height: '100%',
                          background: parseFloat(a.heroFreq) > 50 ? '#4fce82' : parseFloat(a.heroFreq) > 15 ? '#f5a623' : '#e5484d',
                          borderRadius: 3,
                        }} />
                      </div>
                      <span style={{ color: '#b3b3b8', minWidth: 80 }}>{a.label}</span>
                      <span style={{ color: '#676671', fontFamily: 'JetBrains Mono', minWidth: 40 }}>{a.heroFreq}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            {!feedback && currentStrategy?.actions && (
              <div className="space-y-2">
                <div style={{ color: '#676671', fontSize: 11 }}>
                  {currentStrategy.player === heroPos ? 'Sua vez:' : 'Vilao decide...'}
                </div>
                {currentStrategy.player === heroPos && (
                  <div className="grid grid-cols-2 gap-2">
                    {currentStrategy.actions.map((action, idx) => {
                      const parsed = parseAction(action)
                      const bgColor = parsed.type === 'F' ? '#e5484d' :
                                      parsed.type === 'X' || parsed.type === 'C' ? '#4fce82' :
                                      parsed.type === 'B' || parsed.type === 'R' ? '#0a84d7' : '#f5a623'
                      return (
                        <button
                          key={idx}
                          onClick={() => makeDecision(idx)}
                          className="rounded-lg py-3 font-semibold"
                          style={{
                            background: `${bgColor}15`,
                            color: bgColor,
                            border: `1px solid ${bgColor}40`,
                            cursor: 'pointer',
                            fontSize: 14,
                          }}
                        >
                          {parsed.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Review */}
        {phase === PHASE.REVIEW && (
          <div className="space-y-4">
            <div className="rounded-xl p-4 text-center" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
              <div style={{ color: '#fdfdfd', fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Revisao da Mao</div>
              <div className="flex justify-center gap-2 mb-3">
                {heroHand.map((c, i) => <Card key={i} card={c} size="md" />)}
                <span style={{ color: '#676671', margin: '0 8px', alignSelf: 'center' }}>|</span>
                {board.map((c, i) => <Card key={i} card={c} size="md" />)}
              </div>
            </div>

            {reviewData.map((d, i) => (
              <div key={i} className="rounded-xl p-3" style={{
                background: d.isCorrect ? 'rgba(79,206,130,0.05)' : 'rgba(229,72,77,0.05)',
                border: `1px solid ${d.isCorrect ? 'rgba(79,206,130,0.2)' : 'rgba(229,72,77,0.2)'}`,
              }}>
                <div className="flex items-center justify-between mb-1">
                  <span style={{ color: '#b3b3b8', fontSize: 12, fontWeight: 600 }}>{d.street}</span>
                  <span style={{
                    color: d.isCorrect ? '#4fce82' : '#e5484d',
                    fontSize: 11, fontWeight: 600,
                  }}>
                    {d.isCorrect ? 'OK' : 'DESVIO'}
                  </span>
                </div>
                <div style={{ color: '#676671', fontSize: 11 }}>
                  Voce: {d.action} ({d.heroFreq}%) | GTO: {d.bestAction} ({d.bestFreq}%)
                </div>
              </div>
            ))}

            <button
              onClick={() => { setPhase(PHASE.SETUP); startHand() }}
              className="w-full py-3 rounded-lg font-semibold"
              style={{ background: '#0a84d7', color: '#fff', cursor: 'pointer', border: 'none', fontSize: 15 }}
            >
              Proxima Mao
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
