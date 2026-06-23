import { useState, useCallback, useEffect, useRef } from 'react'
import Card from '../components/Card'
import { useSolver } from '../lib/useSolver'

// ─── Constants ────────────────────────────────────────
const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2']
const SUITS = ['s','h','d','c']

// Preflop spots — ranges compactas pro WASM solver rodar rapido (<5s)
// ~20-30 combos por lado = solve em ~3s com 15 iters
const SPOTS = [
  {
    name: 'EP vs BB',
    label: 'EP abre, BB defende',
    heroIsOOP: true,
    oopRange: 'AA,KK,QQ,JJ,TT,99,AKs,AQs,AJs,ATs,KQs,KJs,AKo,AQo',
    ipRange: 'AA,KK,QQ,JJ,TT,99,88,AKs,AQs,AJs,ATs,KQs,KJs,KTs,AKo,AQo,AJo',
  },
  {
    name: 'CO vs BB',
    label: 'CO abre, BB defende',
    heroIsOOP: true,
    oopRange: 'AA,KK,QQ,JJ,TT,99,88,AKs,AQs,AJs,ATs,A5s,KQs,KJs,QJs,JTs,AKo,AQo',
    ipRange: 'AA,KK,QQ,JJ,TT,99,88,77,66,AKs,AQs,AJs,ATs,A9s,A5s,KQs,KJs,KTs,QJs,QTs,JTs,T9s,98s,AKo,AQo,AJo,KQo',
  },
  {
    name: 'BTN vs BB',
    label: 'BTN abre, BB defende',
    heroIsOOP: true,
    oopRange: 'AA,KK,QQ,JJ,TT,99,88,77,AKs,AQs,AJs,ATs,A5s,KQs,KJs,QJs,JTs,T9s,AKo,AQo,AJo',
    ipRange: 'AA,KK,QQ,JJ,TT,99,88,77,66,55,AKs,AQs,AJs,ATs,A9s,A5s,KQs,KJs,KTs,QJs,QTs,JTs,T9s,98s,87s,76s,AKo,AQo,AJo,KQo',
  },
]

// ─── Card utilities ───────────────────────────────────
function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function newDeck() {
  const deck = []
  for (const r of RANKS) for (const s of SUITS) deck.push(r + s)
  return shuffleArray(deck)
}

function dealCards(deck, exclude, n) {
  const result = []
  for (const c of deck) {
    if (!exclude.includes(c) && result.length < n) result.push(c)
  }
  return result
}

// Parse range string into array of hand combos (e.g. 'AKs' -> ['AKss','AKhh',...])
function rangeToHands(rangeStr) {
  const hands = []
  for (const part of rangeStr.split(',')) {
    const h = part.trim().split(':')[0] // strip weight
    if (h.length < 2) continue
    const r1 = h[0], r2 = h[1], type = h[2] || ''
    if (r1 === r2) {
      // Pair: all 6 combos
      for (let i = 0; i < SUITS.length; i++)
        for (let j = i + 1; j < SUITS.length; j++)
          hands.push([r1 + SUITS[i], r2 + SUITS[j]])
    } else if (type === 's') {
      // Suited: 4 combos
      for (const s of SUITS) hands.push([r1 + s, r2 + s])
    } else {
      // Offsuit: 12 combos
      for (const s1 of SUITS)
        for (const s2 of SUITS)
          if (s1 !== s2) hands.push([r1 + s1, r2 + s2])
    }
  }
  return hands
}

// Pick a random hand from the hero's range that doesn't conflict with the board
function pickHeroHand(rangeStr, board) {
  const allHands = rangeToHands(rangeStr)
  const valid = allHands.filter(([c1, c2]) => !board.includes(c1) && !board.includes(c2))
  return valid[Math.floor(Math.random() * valid.length)]
}

// Action name mapping
const ACTION_LABELS = {
  'F': 'Fold', 'X': 'Check', 'C': 'Call',
  'B': 'Bet', 'R': 'Raise', 'A': 'All-In',
}

function parseAction(actionStr) {
  if (!actionStr) return { type: '?', label: '?', size: 0 }
  // Solver returns format like "Check:0", "Bet:2", "Fold:0", "Allin:100"
  const colonIdx = actionStr.indexOf(':')
  if (colonIdx > 0) {
    const word = actionStr.slice(0, colonIdx)
    const val = parseInt(actionStr.slice(colonIdx + 1)) || 0
    const typeMap = { Check: 'X', Bet: 'B', Fold: 'F', Call: 'C', Raise: 'R', Allin: 'A' }
    const type = typeMap[word] || word[0]
    if (word === 'Check') return { type, label: 'Check', size: 0 }
    if (word === 'Fold') return { type, label: 'Fold', size: 0 }
    if (word === 'Call') return { type, label: 'Call', size: val }
    if (word === 'Allin') return { type, label: 'All-In', size: val }
    if (word === 'Bet') return { type, label: val ? `Bet ${val}bb` : 'Bet', size: val }
    if (word === 'Raise') return { type, label: val ? `Raise ${val}bb` : 'Raise', size: val }
    return { type, label: actionStr, size: val }
  }
  // Fallback for old format
  const type = actionStr[0]
  const label = ACTION_LABELS[type] || actionStr
  return { type, label, size: 0 }
}

// Card index matching WASM encoding: rank*4+suit, rank 2=0..A=12, suit c=0,d=1,h=2,s=3
const WASM_RANKS = '23456789TJQKA'
const WASM_SUITS = 'cdhs'
function cardToWasmIdx(cardStr) {
  return WASM_RANKS.indexOf(cardStr[0]) * 4 + WASM_SUITS.indexOf(cardStr[1])
}
function wasmIdxToCard(idx) {
  return WASM_RANKS[Math.floor(idx / 4)] + WASM_SUITS[idx % 4]
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
  const [solveError, setSolveError] = useState(null)
  const deckRef = useRef([])

  // ─── Start new hand ───────────────────────────────
  const startHand = useCallback(async () => {
    const spotIdx = Math.floor(Math.random() * SPOTS.length)
    const chosenSpot = SPOTS[spotIdx]
    const deck = newDeck()
    deckRef.current = deck

    // Deal flop first, then pick hero hand from range
    const flop = [deck[0], deck[1], deck[2]]
    const heroRange = chosenSpot.heroIsOOP ? chosenSpot.oopRange : chosenSpot.ipRange
    const hero = pickHeroHand(heroRange, flop)
    if (!hero) { console.error('No valid hand in range'); return }

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

    try {
      const t0 = performance.now()
      const solvePromise = solve({
        oopRange: chosenSpot.oopRange,
        ipRange: chosenSpot.ipRange,
        board: flop,
        startingPot: 6,
        effectiveStack: 100,
        iterations: 15,
      })
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Solver demorou demais. Tente novamente.')), 30000)
      )
      const result = await Promise.race([solvePromise, timeoutPromise])
      console.log('[Solver] solved in', Math.round(performance.now() - t0), 'ms', result)
      setSolveInfo(result)

      // Get root strategy
      const strat = await getStrategy([])
      setCurrentStrategy(strat)

      // Get hero's hand-specific strategy
      const hs = await getHandStrategy([], hero)
      setHandStrategy(hs)

      setPhase(PHASE.PLAY_FLOP)
    } catch (err) {
      console.error('[Solver] error:', err)
      setSolveError(err.message || 'Erro desconhecido no solver')
      setPhase(PHASE.SETUP)
    }
  }, [solve, getStrategy, getHandStrategy])

  // ─── Advance through chance/villain nodes until hero acts ───
  const advanceFromHistory = useCallback(async (hist) => {
    let curHist = hist
    let curBoard = [...board]
    let safety = 0
    // eslint-disable-next-line no-constant-condition
    while (safety++ < 20) {
      let strat
      try {
        strat = await getStrategy(curHist)
      } catch (err) {
        console.error('[advance] getStrategy error:', err, 'history:', curHist)
        setPhase(PHASE.REVIEW)
        return
      }

      if (!strat || strat.player === 'terminal') {
        setPhase(PHASE.REVIEW)
        return
      }

      if (strat.player === 'chance') {
        // Pick a random card from the WASM's possible cards list
        const possible = strat.possibleCards || []
        if (possible.length === 0) { setPhase(PHASE.REVIEW); return }

        // Filter out cards that are in hero's hand (shouldn't be dealt)
        const heroCardIdxs = heroHand.map(c => cardToWasmIdx(c))
        const validCards = possible.filter(ci => !heroCardIdxs.includes(ci))
        if (validCards.length === 0) { setPhase(PHASE.REVIEW); return }

        // Pick random card, action index = position in possibleCards array
        const pick = validCards[Math.floor(Math.random() * validCards.length)]
        const actionIdx = possible.indexOf(pick)
        const newCard = wasmIdxToCard(pick)

        curBoard = [...curBoard, newCard]
        setBoard(curBoard)
        curHist = [...curHist, actionIdx]

        if (curBoard.length === 4) setPhase(PHASE.PLAY_TURN)
        else if (curBoard.length === 5) setPhase(PHASE.PLAY_RIVER)
        setStreetActions([])
        continue
      }

      // It's a player node
      const isVillain = (strat.player === 'oop' && heroPos !== 'oop') ||
                        (strat.player === 'ip' && heroPos !== 'ip')

      if (isVillain) {
        const bestIdx = strat.avgFreqs.indexOf(Math.max(...strat.avgFreqs))
        const villainAction = parseAction(strat.actions[bestIdx])
        setStreetActions(prev => [...prev, { player: strat.player + ' (vilao)', action: villainAction.label }])
        curHist = [...curHist, bestIdx]
        continue
      }

      // Hero's turn — set state and stop
      setHistory(curHist)
      setCurrentStrategy(strat)
      const hs = await getHandStrategy(curHist, heroHand)
      setHandStrategy(hs)
      setFeedback(null)
      return
    }
    console.error('[advance] safety limit reached')
    setPhase(PHASE.REVIEW)
  }, [board, heroHand, heroPos, getStrategy, getHandStrategy])

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
        await advanceFromHistory(newHistory)
      } catch (err) {
        console.error('Navigation error:', err)
        setPhase(PHASE.REVIEW)
      }
    }, 2500)
  }, [currentStrategy, handStrategy, history, phase, heroPos, board, heroHand, advanceFromHistory])

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
            {solveError && (
              <div style={{ color: '#e5484d', fontSize: 12, marginBottom: 12, padding: '8px 12px', background: 'rgba(229,72,77,0.08)', borderRadius: 8 }}>
                Erro: {solveError}
              </div>
            )}
            <button
              onClick={() => { setSolveError(null); startHand() }}
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
              <span style={{ color: '#0a84d7', fontSize: 14 }}>Solver resolvendo (~5s)...</span>
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
                  Exploitability: {solveInfo.exploit.toFixed(2)}bb
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
              {handStrategy?.notInRange && (
                <div style={{ color: '#f5a623', fontSize: 11, marginTop: 8 }}>
                  Mao fora do range do solver
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
