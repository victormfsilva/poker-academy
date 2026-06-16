import { useState, useCallback } from 'react'
import { useProgress } from '../context/ProgressContext'
import { RFI_RANGES, PUSH_FOLD_RANGES, BB_VS_RFI, BTN_VS_RFI, SB_VS_RFI, BLIND_WARS } from '../data/ranges'
import Card, { handToCards, parseCard } from '../components/Card'
import RangeViewer from '../components/RangeViewer'

// ─── Constantes ────────────────────────────────────────────
const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2']
const SUITS = ['s','h','d','c']
const RANK_VAL = { A:14,K:13,Q:12,J:11,T:10,9:9,8:8,7:7,6:6,5:5,4:4,3:3,2:2 }

// ─── Utilidades de cartas ──────────────────────────────────
function randomCards(n, exclude = []) {
  const excSet = new Set(exclude)
  const cards = []
  while (cards.length < n) {
    const c = RANKS[Math.floor(Math.random() * 13)] + SUITS[Math.floor(Math.random() * 4)]
    if (!excSet.has(c) && !cards.includes(c)) cards.push(c)
  }
  return cards
}

function getBoardTexture(board) {
  const ranks = board.map(c => RANKS.indexOf(c.slice(0, -1)))
  const suits = board.map(c => c.slice(-1))
  const suitCounts = {}
  suits.forEach(s => { suitCounts[s] = (suitCounts[s] || 0) + 1 })
  const suited = Object.values(suitCounts).some(v => v >= 2)
  const monotone = Object.values(suitCounts).some(v => v >= 3)
  const sorted = [...ranks].sort((a, b) => a - b)
  const connected = sorted.length >= 2 && (sorted[sorted.length - 1] - sorted[0]) <= 4
  const paired = new Set(ranks).size < ranks.length
  const lowBoard = Math.min(...ranks) >= 5
  return { suited, connected, paired, monotone, lowBoard, isWet: suited || connected, isDry: !suited && !connected }
}

function hasTopPair(hole, board) {
  const br = board.map(c => c.slice(0, -1))
  const hr = hole.map(c => c.slice(0, -1))
  const topRank = [...br].sort((a, b) => RANKS.indexOf(a) - RANKS.indexOf(b))[0]
  return hr.includes(topRank)
}

function hasAnyPair(hole, board) {
  const br = board.map(c => c.slice(0, -1))
  return hole.map(c => c.slice(0, -1)).some(r => br.includes(r))
}

function hasFlushDraw(hole, board) {
  const sc = {}
  ;[...hole, ...board].forEach(c => { const s = c.slice(-1); sc[s] = (sc[s] || 0) + 1 })
  return Object.values(sc).some(v => v === 4)
}

function hasMadeFlush(hole, board) {
  const sc = {}
  ;[...hole, ...board].forEach(c => { const s = c.slice(-1); sc[s] = (sc[s] || 0) + 1 })
  return Object.values(sc).some(v => v >= 5)
}

function hasStraightDraw(hole, board) {
  const holeIdx = hole.map(c => RANKS.indexOf(c.slice(0, -1)))
  const all = [...new Set([...hole, ...board].map(c => RANKS.indexOf(c.slice(0, -1))))].sort((a, b) => a - b)
  for (let i = 0; i <= all.length - 5; i++) { if (all[i + 4] - all[i] === 4) return false }
  if ([0, 9, 10, 11, 12].every(v => all.includes(v))) return false
  for (let i = 0; i < all.length - 3; i++) {
    if (all[i + 3] - all[i] <= 4) {
      if (holeIdx.some(r => all.slice(i, i + 4).includes(r))) return true
    }
  }
  const wc = [0, 9, 10, 11, 12]
  if (wc.filter(v => all.includes(v)).length >= 4 && holeIdx.some(r => wc.includes(r))) return true
  return false
}

function hasSet(hole, board) {
  const hr = hole.map(c => c.slice(0, -1))
  if (hr[0] !== hr[1]) return false
  return board.map(c => c.slice(0, -1)).includes(hr[0])
}

function hasTwoPair(hole, board) {
  const hr = hole.map(c => c.slice(0, -1))
  if (hr[0] === hr[1]) return false
  const br = board.map(c => c.slice(0, -1))
  return [...new Set(hr)].filter(r => br.includes(r)).length === 2
}

function hasOverpair(hole, board) {
  const hr = hole.map(c => c.slice(0, -1))
  if (hr[0] !== hr[1]) return false
  const pi = RANKS.indexOf(hr[0])
  return board.every(c => RANKS.indexOf(c.slice(0, -1)) > pi)
}

function hasMadeStraight(hole, board) {
  const vals = [...new Set([...hole, ...board].map(c => RANK_VAL[c.slice(0, -1)]))].sort((a, b) => a - b)
  if (vals.includes(14)) vals.unshift(1)
  for (let i = 0; i <= vals.length - 5; i++) {
    if (vals[i+4] - vals[i] === 4 && vals[i+1] === vals[i]+1 && vals[i+2] === vals[i]+2 && vals[i+3] === vals[i]+3) return true
  }
  return false
}

// ─── Gerador de maos texto ────────────────────────────────
function generateAllHands() {
  const h = []
  for (let i = 0; i < RANKS.length; i++) {
    h.push(RANKS[i] + RANKS[i])
    for (let j = i + 1; j < RANKS.length; j++) {
      h.push(RANKS[i] + RANKS[j] + 's')
      h.push(RANKS[i] + RANKS[j] + 'o')
    }
  }
  return h
}
const ALL_HANDS = generateAllHands()

// ================================================================
// MESA ESTILO GTO WIZARD
// ================================================================
function ChipDot({ color }) {
  return (
    <div style={{
      width: 10, height: 10, borderRadius: '50%',
      background: color, border: '1px solid #0008',
      boxShadow: `0 0 4px ${color}88`,
      flexShrink: 0,
    }} />
  )
}

function Seat({ pos, isHero, isRaiser, isSB, isBB, stack, betAmt, actionLabel }) {
  const posLabel = pos === 'UTG+1' ? 'UTG1' : pos
  const border = isHero ? '2px solid #00ac8d'
               : isRaiser ? '2px solid #ff8f00'
               : '2px solid #3a3a3a'
  const bg = isHero ? '#1a2e2a' : '#2a2a2a'
  const txtCol = isHero ? '#00ac8d'
               : isRaiser ? '#ff8f00'
               : '#ccc'
  const hasBet = isRaiser || isSB || isBB || betAmt
  const chipColor = isRaiser ? '#ff8f00' : isSB ? '#5ab966' : '#4a9eff'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      {/* Action label (CHECK, BET etc) above bet chips */}
      {actionLabel && !betAmt && (
        <div style={{
          fontSize: 9, fontWeight: 800, color: '#888',
          background: '#1a1a24', borderRadius: 4, padding: '1px 5px',
          letterSpacing: 0.5,
        }}>{actionLabel}</div>
      )}
      {hasBet && betAmt && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <ChipDot color={chipColor} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#ddd' }}>{betAmt}</span>
        </div>
      )}
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        background: bg, border,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: posLabel.length > 3 ? 7.5 : 10, color: txtCol, fontWeight: 700, lineHeight: 1.1 }}>
          {posLabel}
        </span>
        <span style={{ fontSize: 9, color: '#666', lineHeight: 1.2 }}>{stack}</span>
      </div>
    </div>
  )
}

const ALL_SEATS_ORDER = ['UTG','UTG+1','LJ','HJ','CO','BTN','SB','BB']

const SLOT_POS = [
  { top: '10%', left: '22%' },
  { top: '3%',  left: '50%' },
  { top: '10%', left: '78%' },
  { top: '50%', left: '93%' },
  { top: '82%', left: '75%' },
  { top: '88%', left: '50%' },
  { top: '82%', left: '25%' },
  { top: '50%', left: '7%'  },
]

function PokerTable({ scenario }) {
  const ctx = scenario.tableContext || {}

  // Determinar posicao do heroi e do raiser baseado no tipo
  let heroPos = ctx.heroPos || 'BTN'
  let raiserPos = ctx.villainPos || null
  let villainAction = ctx.villainAction || null // 'check', 'bet', 'raise'
  let villainBetBB = ctx.villainBetBB || null
  let potBB = ctx.potBB || null

  // Fallback: determinar do tipo se nao tem tableContext
  if (!scenario.tableContext) {
    if (scenario.type === 'rfi') {
      heroPos = scenario.pos
      raiserPos = null
    } else if (scenario.type === 'pushfold') {
      heroPos = scenario.pos
      raiserPos = null
    } else if (scenario.type === 'bb') {
      heroPos = 'BB'
      raiserPos = scenario.pos
    } else if (scenario.type === 'blindwars') {
      heroPos = scenario.label?.includes('SB') ? 'SB' : 'BB'
      raiserPos = heroPos === 'BB' ? 'SB' : null
    } else if (scenario.type === 'range') {
      const label = scenario.label || ''
      if (label.includes('SB vs')) { heroPos = 'SB'; raiserPos = scenario.pos }
      else if (label.includes('BTN vs')) { heroPos = 'BTN'; raiserPos = scenario.pos }
      else { heroPos = label.match(/(\w+) vs/)?.[1] || 'BB'; raiserPos = scenario.pos }
    }
  }

  const heroIdx = ALL_SEATS_ORDER.indexOf(heroPos)
  const rotated = SLOT_POS.map((_, i) =>
    ALL_SEATS_ORDER[(heroIdx + i - 5 + 8) % 8]
  )

  const btnSlotIdx = rotated.indexOf('BTN')
  const btnPos = SLOT_POS[btnSlotIdx]

  const stack = scenario.stack || 100

  // Pot display
  const displayPot = potBB
    ? `${potBB} bb`
    : raiserPos
      ? `${(stack * 2.5).toFixed(1)} bb`
      : `${(stack * 1.5).toFixed(1)} bb`

  // Board cards no centro da mesa
  const boardCards = scenario.board || null

  return (
    <div style={{
      position: 'relative', width: '100%', paddingBottom: '72%',
      userSelect: 'none', overflow: 'visible',
    }}>
      {/* Mesa oval */}
      <div style={{
        position: 'absolute',
        top: '12%', left: '5%', right: '5%', bottom: '14%',
        borderRadius: 999,
        border: '2px solid #3a3a3a',
        background: 'transparent',
      }} />

      {/* Centro: pot + board cards */}
      <div style={{
        position: 'absolute', top: boardCards ? '42%' : '40%', left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center', pointerEvents: 'none',
      }}>
        {boardCards ? (
          <>
            <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 5 }}>
              {boardCards.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                  <Card card={parseCard(c)} size="sm" />
                  {scenario.flop && i === 2 && boardCards.length > 3 && <div style={{ width: 6 }} />}
                </div>
              ))}
            </div>
            <div style={{ color: '#ccc', fontSize: 13, fontWeight: 800 }}>{displayPot}</div>
          </>
        ) : (
          <>
            <div style={{ color: '#555', fontSize: 10, fontWeight: 600 }}>{stack}bb</div>
            <div style={{ color: '#ccc', fontSize: 15, fontWeight: 800 }}>{displayPot}</div>
          </>
        )}
      </div>

      {/* Dealer button */}
      {btnPos && (
        <div style={{
          position: 'absolute',
          top: btnPos.top, left: btnPos.left,
          transform: 'translate(-36px, 0px)',
          width: 18, height: 18, borderRadius: '50%',
          background: '#d0d0d0', color: '#111',
          fontSize: 9, fontWeight: 900,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid #888', zIndex: 10,
        }}>D</div>
      )}

      {/* Assentos */}
      {rotated.map((pos, slotIdx) => {
        const p = SLOT_POS[slotIdx]
        const isVillain = pos === raiserPos
        const isSB = pos === 'SB'
        const isBB = pos === 'BB'

        // Bet amount: villain bet, preflop raise, or blind
        let betAmt = null
        let actionLabel = null

        if (isVillain && villainAction === 'bet' && villainBetBB) {
          betAmt = `${villainBetBB}`
        } else if (isVillain && villainAction === 'check') {
          actionLabel = 'CHECK'
        } else if (isVillain && !villainAction) {
          // Preflop raiser (no tableContext)
          betAmt = `${(stack * 2).toFixed(0)}`
        } else if (isSB && !boardCards) {
          betAmt = `${(stack * 0.5).toFixed(1)}`
        } else if (isBB && !boardCards) {
          betAmt = `${stack}`
        }

        return (
          <div key={pos} style={{
            position: 'absolute',
            top: p.top, left: p.left,
            transform: 'translate(-50%, -50%)',
            zIndex: 5,
          }}>
            <Seat
              pos={pos}
              isHero={pos === heroPos}
              isRaiser={isVillain && villainAction === 'bet'}
              isSB={isSB && !boardCards}
              isBB={isBB && !boardCards}
              stack={stack}
              betAmt={betAmt}
              actionLabel={actionLabel}
            />
          </div>
        )
      })}
    </div>
  )
}

// ================================================================
// MODULO 1 — RFI
// ================================================================
const RFI_POS = ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN']
const RFI_STACKS = [100, 50, 25, 15]

function rfiScenario() {
  const pos = RFI_POS[Math.floor(Math.random() * RFI_POS.length)]
  const stack = RFI_STACKS[Math.floor(Math.random() * RFI_STACKS.length)]
  const range = RFI_RANGES[pos]?.[stack]
  const dice = Math.random()
  let hand
  if (dice < 0.45 && range?.raise.length) hand = range.raise[Math.floor(Math.random() * range.raise.length)]
  else if (dice < 0.55 && range?.mix.length) hand = range.mix[Math.floor(Math.random() * range.mix.length)]
  else {
    const fold = ALL_HANDS.filter(h => !range?.raise.includes(h) && !range?.mix.includes(h))
    hand = fold.length ? fold[Math.floor(Math.random() * fold.length)] : range.raise[0]
  }
  const correct = range?.raise.includes(hand) ? 'raise' : range?.mix.includes(hand) ? 'mix' : 'fold'
  return {
    moduleId: 1, type: 'rfi', hand, pos, stack,
    label: `RFI · ${pos} · ${stack}bb`,
    buttons: [
      { id: 'fold', label: 'Fold', bg: '#3D7CB8' },
      { id: 'call', label: 'Call', bg: '#5ab966' },
      { id: 'raise', label: 'Raise', bg: '#F03C3C' },
      { id: 'allin', label: 'All-in', bg: '#ff8f00' },
    ],
    evaluate: (action) => {
      const mapped = action === 'allin' ? 'raise' : action
      const isMix = correct === 'mix'
      return { isCorrect: mapped === correct || (isMix && (mapped === 'raise' || mapped === 'fold')), correctLabel: correct === 'mix' ? 'Raise ou Fold' : correct, isMix }
    }
  }
}

// ================================================================
// MODULO 2 — Push/Fold
// ================================================================
const PF_POS = ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB']
const PF_STACKS = [5, 8, 10]

function pushfoldScenario() {
  const pos = PF_POS[Math.floor(Math.random() * PF_POS.length)]
  const stack = PF_STACKS[Math.floor(Math.random() * PF_STACKS.length)]
  const range = PUSH_FOLD_RANGES[pos]
  const stacks = Object.keys(range || {}).map(Number).sort((a, b) => a - b)
  const closest = stacks.reduce((p, c) => Math.abs(c - stack) < Math.abs(p - stack) ? c : p, stacks[0])
  const pushRange = range?.[closest] || []
  const hand = Math.random() < 0.5 && pushRange.length
    ? pushRange[Math.floor(Math.random() * pushRange.length)]
    : ALL_HANDS.filter(h => !pushRange.includes(h))[Math.floor(Math.random() * ALL_HANDS.filter(h => !pushRange.includes(h)).length)]
  const correct = pushRange.includes(hand) ? 'push' : 'fold'
  return {
    moduleId: 2, type: 'pushfold', hand, pos, stack,
    label: `Push/Fold · ${pos} · ${stack}bb`,
    buttons: [
      { id: 'fold', label: 'Fold', bg: '#3D7CB8' },
      { id: 'call', label: 'Call', bg: '#5ab966' },
      { id: 'raise', label: 'Raise', bg: '#F03C3C' },
      { id: 'allin', label: 'All-in', bg: '#ff8f00' },
    ],
    evaluate: (action) => ({
      isCorrect: (action === 'allin' ? 'push' : 'fold') === correct,
      correctLabel: correct === 'push' ? 'All-in' : 'Fold', isMix: false
    })
  }
}

// ================================================================
// MODULO 3 — Pot Odds
// ================================================================
function potoddsScenario() {
  const flop = randomCards(3)
  const hole = randomCards(2, flop)
  const hasFD = hasFlushDraw(hole, flop)
  const hasSD = hasStraightDraw(hole, flop)
  const outs = hasFD && hasSD ? 15 : hasFD ? 9 : hasSD ? 8 : 0
  const equity = outs * 4
  const betPcts = [33, 50, 75]
  const betPct = betPcts[Math.floor(Math.random() * betPcts.length)]
  const potOdds = Math.round((betPct / (100 + betPct)) * 100)
  const correct = equity >= potOdds ? 'call' : 'fold'
  // Pot after preflop: ~6.5bb (2.5bb raise + call + blinds)
  const potPreflop = 6.5
  const villainBet = +(potPreflop * betPct / 100).toFixed(1)
  const totalPot = +(potPreflop + villainBet).toFixed(1)
  return {
    moduleId: 3, type: 'potodds', hand: null, board: flop, hole,
    label: `Pot Odds · Aposta ${betPct}%`,
    extraInfo: `${outs} outs · ${equity}% equity · Pot odds: ${potOdds}%`,
    tableContext: {
      heroPos: 'BB', villainPos: 'CO', villainAction: 'bet',
      villainBetBB: villainBet, potBB: totalPot,
    },
    buttons: [
      { id: 'fold', label: 'Fold', bg: '#3D7CB8' },
      { id: 'call', label: 'Call', bg: '#5ab966' },
      { id: 'raise', label: 'Raise', bg: '#F03C3C' },
      { id: 'allin', label: 'All-in', bg: '#ff8f00' },
    ],
    evaluate: (action) => ({
      isCorrect: (action === 'call' || action === 'raise' || action === 'allin' ? 'call' : 'fold') === correct,
      correctLabel: correct === 'call' ? `Call (${equity}% >= ${potOdds}%)` : `Fold (${equity}% < ${potOdds}%)`, isMix: false
    })
  }
}

// ================================================================
// MODULO 4 — BB vs RFI
// ================================================================
const BB_POS = ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB']
const BB_KEYS = { UTG: 'vsUTG', 'UTG+1': 'vsUTG1', LJ: 'vsLJ', HJ: 'vsHJ', CO: 'vsCO', BTN: 'vsBTN', SB: 'vsSB' }

function bbScenario() {
  const pos = BB_POS[Math.floor(Math.random() * BB_POS.length)]
  const range = BB_VS_RFI[BB_KEYS[pos]]
  const dice = Math.random()
  let hand
  if (dice < 0.3 && range?.threebet?.length) hand = range.threebet[Math.floor(Math.random() * range.threebet.length)]
  else if (dice < 0.6 && range?.call?.length) hand = range.call[Math.floor(Math.random() * range.call.length)]
  else {
    const used = [...(range?.threebet || []), ...(range?.call || [])]
    const fold = ALL_HANDS.filter(h => !used.includes(h))
    hand = fold.length ? fold[Math.floor(Math.random() * fold.length)] : ALL_HANDS[0]
  }
  const correct = range?.threebet?.includes(hand) ? '3bet' : range?.call?.includes(hand) ? 'call' : 'fold'
  return {
    moduleId: 4, type: 'bb', hand, pos,
    label: `BB vs ${pos}`,
    buttons: [
      { id: 'fold', label: 'Fold', bg: '#3D7CB8' },
      { id: 'call', label: 'Call', bg: '#5ab966' },
      { id: 'raise', label: '3-Bet', bg: '#F03C3C' },
      { id: 'allin', label: 'All-in', bg: '#ff8f00' },
    ],
    evaluate: (action) => {
      const mapped = action === 'raise' || action === 'allin' ? '3bet' : action
      return { isCorrect: mapped === correct, correctLabel: correct === '3bet' ? '3-Bet' : correct, isMix: false }
    }
  }
}

// ================================================================
// MODULO 5 — CBet Flop IP
// ================================================================
function cbetFlopScenario() {
  const flop = randomCards(3)
  const hole = randomCards(2, flop)
  const tex = getBoardTexture(flop)
  let correctAction, correctLabel
  if (hasMadeFlush(hole, flop)) { correctAction = 'bet75'; correctLabel = 'Bet 75%' }
  else if (hasSet(hole, flop)) { correctAction = 'bet75'; correctLabel = 'Bet 75%' }
  else if (hasTwoPair(hole, flop)) { correctAction = tex.isWet ? 'bet75' : 'bet50'; correctLabel = tex.isWet ? 'Bet 75%' : 'Bet 50%' }
  else if (hasOverpair(hole, flop)) { correctAction = tex.isWet ? 'bet75' : 'bet50'; correctLabel = tex.isWet ? 'Bet 75%' : 'Bet 50%' }
  else if (hasTopPair(hole, flop)) { correctAction = 'bet50'; correctLabel = 'Bet 50%' }
  else if (hasFlushDraw(hole, flop) || hasStraightDraw(hole, flop)) { correctAction = 'bet50'; correctLabel = 'Bet 50%' }
  else if (hasAnyPair(hole, flop)) { correctAction = 'bet50'; correctLabel = 'Bet 50%' }
  else if (tex.isDry) { correctAction = 'bet33'; correctLabel = 'Bet 33%' }
  else { correctAction = 'check'; correctLabel = 'Check' }
  return {
    moduleId: 5, type: 'board', hand: null, board: flop, hole,
    label: `CBet Flop IP · ${tex.isWet ? 'Wet' : 'Dry'}`,
    tableContext: {
      heroPos: 'BTN', villainPos: 'BB', villainAction: 'check',
      potBB: 6.5,
    },
    buttons: [{ id: 'check', label: 'Check', bg: '#3D7CB8' }, { id: 'bet33', label: '33%', bg: '#5ab966' }, { id: 'bet50', label: '50%', bg: '#F03C3C' }, { id: 'bet75', label: '75%', bg: '#ff8f00' }],
    evaluate: (action) => ({ isCorrect: action === correctAction, correctLabel, isMix: false })
  }
}

// ================================================================
// MODULO 6 — Blind Wars
// ================================================================
function blindWarsScenario() {
  const isSB = Math.random() < 0.5
  if (isSB) {
    const raiseHands = BLIND_WARS?.SB_raise?.raise || []
    const completeHands = BLIND_WARS?.SB_complete?.complete || []
    const dice = Math.random()
    let hand
    if (dice < 0.3 && raiseHands.length) hand = raiseHands[Math.floor(Math.random() * raiseHands.length)]
    else if (dice < 0.6 && completeHands.length) hand = completeHands[Math.floor(Math.random() * completeHands.length)]
    else {
      const used = [...raiseHands, ...completeHands]
      const fold = ALL_HANDS.filter(h => !used.includes(h))
      hand = fold.length ? fold[Math.floor(Math.random() * fold.length)] : ALL_HANDS[0]
    }
    const correct = raiseHands.includes(hand) ? 'raise' : completeHands.includes(hand) ? 'complete' : 'fold'
    return {
      moduleId: 6, type: 'blindwars', hand,
      label: 'Blind Wars · SB',
      buttons: [{ id: 'fold', label: 'Fold', bg: '#3D7CB8' }, { id: 'complete', label: 'Complete', bg: '#5ab966' }, { id: 'raise', label: 'Raise', bg: '#F03C3C' }],
      evaluate: (action) => ({ isCorrect: action === correct, correctLabel: correct, isMix: false })
    }
  } else {
    const betHands = BLIND_WARS?.BB_vs_complete?.bet || []
    const hand = Math.random() < 0.5 && betHands.length
      ? betHands[Math.floor(Math.random() * betHands.length)]
      : ALL_HANDS.filter(h => !betHands.includes(h))[Math.floor(Math.random() * ALL_HANDS.filter(h => !betHands.includes(h)).length)] || ALL_HANDS[0]
    const correct = betHands.includes(hand) ? 'bet' : 'check'
    return {
      moduleId: 6, type: 'blindwars', hand,
      label: 'Blind Wars · BB vs Complete',
      buttons: [{ id: 'check', label: 'Check', bg: '#3D7CB8' }, { id: 'bet', label: 'Bet', bg: '#F03C3C' }],
      evaluate: (action) => ({ isCorrect: action === correct, correctLabel: correct, isMix: false })
    }
  }
}

// ================================================================
// MODULOS 7-9 — Range-based (SB/BTN vs RFI, 3-Bet)
// ================================================================
function rangeScenario(moduleId) {
  let myPos, raiserPositions, dataSource
  if (moduleId === 7) {
    myPos = 'SB'
    dataSource = SB_VS_RFI
    raiserPositions = ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN']
  } else if (moduleId === 8) {
    myPos = 'BTN'
    dataSource = BTN_VS_RFI
    raiserPositions = ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO']
  } else {
    const spots = [
      { myPos: 'BB', data: BB_VS_RFI, raisers: ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB'] },
      { myPos: 'SB', data: SB_VS_RFI, raisers: ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN'] },
      { myPos: 'BTN', data: BTN_VS_RFI, raisers: ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO'] },
    ]
    const spot = spots[Math.floor(Math.random() * spots.length)]
    myPos = spot.myPos
    dataSource = spot.data
    raiserPositions = spot.raisers
  }
  const raiser = raiserPositions[Math.floor(Math.random() * raiserPositions.length)]
  const bbKeyMap = { UTG: 'vsUTG', 'UTG+1': 'vsUTG1', LJ: 'vsLJ', HJ: 'vsHJ', CO: 'vsCO', BTN: 'vsBTN', SB: 'vsSB' }
  const otherKeyMap = { UTG: 'vsUTG', 'UTG+1': 'vsUTG+1', LJ: 'vsLJ', HJ: 'vsHJ', CO: 'vsCO', BTN: 'vsBTN', SB: 'vsSB' }
  const keyMap = dataSource === BB_VS_RFI ? bbKeyMap : otherKeyMap
  const range = dataSource?.[keyMap[raiser]] || {}
  const threebet = range.threebet || []
  const call = range.call || []
  const dice = Math.random()
  let hand
  if (dice < 0.35 && threebet.length) hand = threebet[Math.floor(Math.random() * threebet.length)]
  else if (dice < 0.65 && call.length) hand = call[Math.floor(Math.random() * call.length)]
  else {
    const used = [...threebet, ...call]
    const fold = ALL_HANDS.filter(h => !used.includes(h))
    hand = fold.length ? fold[Math.floor(Math.random() * fold.length)] : ALL_HANDS[0]
  }
  const correct = threebet.includes(hand) ? '3bet' : call.includes(hand) ? 'call' : 'fold'
  const names = { 7: 'SB vs RFI', 8: 'BTN vs RFI', 9: '3-Bet' }
  return {
    moduleId, type: 'range', hand, pos: raiser,
    label: `${names[moduleId]} · ${myPos} vs ${raiser}`,
    buttons: [
      { id: 'fold', label: 'Fold', bg: '#3D7CB8' },
      { id: 'call', label: 'Call', bg: '#5ab966' },
      { id: 'raise', label: '3-Bet', bg: '#F03C3C' },
      { id: 'allin', label: 'All-in', bg: '#ff8f00' },
    ],
    evaluate: (action) => {
      const mapped = action === 'raise' || action === 'allin' ? '3bet' : action
      return { isCorrect: mapped === correct, correctLabel: correct === '3bet' ? '3-Bet' : correct, isMix: false }
    }
  }
}

// ================================================================
// MODULO 10 — Defesa vs CBet (renumbered from 11)
// ================================================================
function defenseCbetScenario() {
  const flop = randomCards(3)
  const hole = randomCards(2, flop)
  const sizes = ['33%', '50%', '75%']
  const cbetSize = sizes[Math.floor(Math.random() * sizes.length)]
  const cbetPct = parseInt(cbetSize)
  const potPreflop = 6.5
  const villainBet = +(potPreflop * cbetPct / 100).toFixed(1)
  const totalPot = +(potPreflop + villainBet).toFixed(1)
  let correctAction
  if (hasSet(hole, flop) || hasTwoPair(hole, flop) || hasMadeFlush(hole, flop)) correctAction = 'raise'
  else if (hasTopPair(hole, flop) || hasOverpair(hole, flop)) correctAction = 'call'
  else if (hasFlushDraw(hole, flop)) correctAction = cbetSize === '75%' ? 'raise' : 'call'
  else if (hasStraightDraw(hole, flop)) correctAction = cbetSize === '75%' ? 'fold' : 'call'
  else if (hasAnyPair(hole, flop)) correctAction = cbetSize === '75%' ? 'fold' : 'call'
  else correctAction = 'fold'
  return {
    moduleId: 10, type: 'board', hand: null, board: flop, hole,
    label: `Defesa vs CBet ${cbetSize}`,
    tableContext: {
      heroPos: 'BB', villainPos: 'CO', villainAction: 'bet',
      villainBetBB: villainBet, potBB: totalPot,
    },
    buttons: [{ id: 'fold', label: 'Fold', bg: '#3D7CB8' }, { id: 'call', label: 'Call', bg: '#5ab966' }, { id: 'raise', label: 'Check-Raise', bg: '#F03C3C' }],
    evaluate: (action) => ({ isCorrect: action === correctAction, correctLabel: correctAction === 'raise' ? 'Check-Raise' : correctAction, isMix: false })
  }
}

// ================================================================
// MODULO 11 — Check-Raise
// ================================================================
function checkRaiseScenario() {
  const flop = randomCards(3)
  const hole = randomCards(2, flop)
  const tex = getBoardTexture(flop)
  let correctAction
  if (hasMadeFlush(hole, flop) || hasSet(hole, flop)) correctAction = 'raise'
  else if (hasTwoPair(hole, flop) && tex.isWet) correctAction = 'raise'
  else if (hasFlushDraw(hole, flop) && tex.isWet) correctAction = 'raise'
  else if (hasStraightDraw(hole, flop) && tex.isWet && !tex.paired) correctAction = 'raise'
  else if (hasTopPair(hole, flop) || hasOverpair(hole, flop)) correctAction = 'call'
  else if (hasAnyPair(hole, flop) && tex.isDry) correctAction = 'call'
  else if (hasFlushDraw(hole, flop)) correctAction = 'call'
  else correctAction = 'fold'
  const cbetBB = +(6.5 * 0.5).toFixed(1) // villain bets 50%
  return {
    moduleId: 11, type: 'board', hand: null, board: flop, hole,
    label: `Check-Raise · ${tex.isWet ? 'Wet' : 'Dry'}`,
    tableContext: {
      heroPos: 'BB', villainPos: 'BTN', villainAction: 'bet',
      villainBetBB: cbetBB, potBB: +(6.5 + cbetBB).toFixed(1),
    },
    buttons: [{ id: 'fold', label: 'Fold', bg: '#3D7CB8' }, { id: 'call', label: 'Call', bg: '#5ab966' }, { id: 'raise', label: 'Check-Raise', bg: '#F03C3C' }],
    evaluate: (action) => ({ isCorrect: action === correctAction, correctLabel: correctAction === 'raise' ? 'Check-Raise' : correctAction, isMix: false })
  }
}

// ================================================================
// MODULO 12 — Bet Sizing
// ================================================================
function betSizingScenario() {
  const flop = randomCards(3)
  const hole = randomCards(2, flop)
  const tex = getBoardTexture(flop)
  let correctAction
  if (hasMadeFlush(hole, flop) || hasSet(hole, flop)) correctAction = 'bet75'
  else if (hasTwoPair(hole, flop)) correctAction = tex.isWet ? 'bet75' : 'bet50'
  else if (hasOverpair(hole, flop)) correctAction = tex.isWet ? 'bet75' : 'bet50'
  else if (hasTopPair(hole, flop)) correctAction = 'bet50'
  else if (hasFlushDraw(hole, flop)) correctAction = 'bet50'
  else if (hasStraightDraw(hole, flop)) correctAction = 'bet33'
  else if (hasAnyPair(hole, flop)) correctAction = 'bet33'
  else if (tex.isDry) correctAction = 'bet33'
  else correctAction = 'check'
  return {
    moduleId: 12, type: 'board', hand: null, board: flop, hole,
    label: `Bet Sizing · ${tex.isWet ? 'Wet' : 'Dry'}`,
    tableContext: {
      heroPos: 'BTN', villainPos: 'BB', villainAction: 'check',
      potBB: 6.5,
    },
    buttons: [{ id: 'check', label: 'Check', bg: '#3D7CB8' }, { id: 'bet33', label: '33%', bg: '#5ab966' }, { id: 'bet50', label: '50%', bg: '#F03C3C' }, { id: 'bet75', label: '75%', bg: '#ff8f00' }],
    evaluate: (action) => ({ isCorrect: action === correctAction, correctLabel: correctAction === 'check' ? 'Check' : correctAction.replace('bet', 'Bet '), isMix: false })
  }
}

// ================================================================
// MODULO 13 — Donk Bet
// ================================================================
function donkBetScenario() {
  const flop = randomCards(3)
  const hole = randomCards(2, flop)
  const tex = getBoardTexture(flop)
  let correctAction
  if (hasMadeFlush(hole, flop)) correctAction = 'donk'
  else if (hasSet(hole, flop) && tex.lowBoard) correctAction = 'donk'
  else if (hasTwoPair(hole, flop) && tex.lowBoard && tex.isWet) correctAction = 'donk'
  else if (tex.lowBoard && tex.isWet && (hasFlushDraw(hole, flop) || hasStraightDraw(hole, flop))) correctAction = 'donk'
  else if (hasTopPair(hole, flop) && tex.lowBoard) correctAction = 'donk'
  else correctAction = 'check'
  return {
    moduleId: 13, type: 'board', hand: null, board: flop, hole,
    label: `Donk Bet · ${tex.lowBoard ? 'Low' : 'High'} board`,
    tableContext: {
      heroPos: 'BB', villainPos: 'CO',
      potBB: 6.5,
    },
    buttons: [{ id: 'check', label: 'Check', bg: '#3D7CB8' }, { id: 'donk', label: 'Donk Bet', bg: '#F03C3C' }],
    evaluate: (action) => ({ isCorrect: action === correctAction, correctLabel: correctAction === 'donk' ? 'Donk Bet' : 'Check', isMix: false })
  }
}

// ================================================================
// MODULO 14 — CBet Turn
// ================================================================
function cbetTurnScenario() {
  const flop = randomCards(3)
  const turn = randomCards(1, flop)[0]
  const hole = randomCards(2, [...flop, turn])
  const board = [...flop, turn]
  const turnRankIdx = RANKS.indexOf(turn.slice(0, -1))
  const flopRanks = flop.map(c => RANKS.indexOf(c.slice(0, -1)))
  const flopSuits = flop.map(c => c.slice(-1))
  const turnSuit = turn.slice(-1)
  const isFlushScary = flopSuits.filter(s => s === turnSuit).length >= 2
  const isOvercard = turnRankIdx < Math.min(...flopRanks)
  const scary = isFlushScary || isOvercard
  let correctAction
  if (hasMadeFlush(hole, board) || hasSet(hole, board) || hasTwoPair(hole, board)) correctAction = 'bet'
  else if (hasOverpair(hole, board)) correctAction = scary && isFlushScary ? 'check' : 'bet'
  else if (hasTopPair(hole, board)) correctAction = scary ? 'check' : 'bet'
  else if (hasFlushDraw(hole, board)) correctAction = 'bet'
  else if (hasStraightDraw(hole, board)) correctAction = scary ? 'check' : 'bet'
  else if (hasAnyPair(hole, board)) correctAction = 'check'
  else if (scary && isOvercard) correctAction = 'bet'
  else correctAction = 'check'
  return {
    moduleId: 14, type: 'board', hand: null, board, hole, flop, turnCard: turn,
    label: `CBet Turn · ${scary ? 'Scary' : 'Brick'}`,
    tableContext: {
      heroPos: 'BTN', villainPos: 'BB', villainAction: 'check',
      potBB: 13, // after flop cbet + call
    },
    buttons: [{ id: 'check', label: 'Check', bg: '#3D7CB8' }, { id: 'bet', label: 'Double Barrel', bg: '#F03C3C' }],
    evaluate: (action) => ({ isCorrect: action === correctAction, correctLabel: correctAction === 'bet' ? 'Double Barrel' : 'Check', isMix: false })
  }
}

// ================================================================
// MODULO 15 — River Play
// ================================================================
function riverPlayScenario() {
  const flop = randomCards(3)
  const turn = randomCards(1, flop)[0]
  const river = randomCards(1, [...flop, turn])[0]
  const board = [...flop, turn, river]
  const hole = randomCards(2, board)
  const sc = {}
  board.forEach(c => { const s = c.slice(-1); sc[s] = (sc[s] || 0) + 1 })
  const flushOnBoard = Object.values(sc).some(v => v >= 3)
  let correctAction
  if (hasMadeFlush(hole, board)) correctAction = 'value-big'
  else if (hasMadeStraight(hole, board)) correctAction = flushOnBoard ? 'value-med' : 'value-big'
  else if (hasSet(hole, board)) correctAction = 'value-big'
  else if (hasTwoPair(hole, board)) correctAction = flushOnBoard ? 'check' : 'value-med'
  else if (hasOverpair(hole, board)) correctAction = flushOnBoard ? 'check' : 'value-med'
  else if (hasTopPair(hole, board)) correctAction = flushOnBoard ? 'check' : 'value-med'
  else if (hasAnyPair(hole, board)) correctAction = 'check'
  else {
    const holeSuits = hole.map(c => c.slice(-1))
    const missedFlush = holeSuits.some(s => [...hole, ...board].filter(c => c.slice(-1) === s).length === 4)
    correctAction = missedFlush ? 'bluff' : 'check'
  }
  return {
    moduleId: 15, type: 'board', hand: null, board, hole, flop,
    label: 'River Play',
    tableContext: {
      heroPos: 'BTN', villainPos: 'BB', villainAction: 'check',
      potBB: 26, // after flop + turn action
    },
    buttons: [{ id: 'check', label: 'Check', bg: '#3D7CB8' }, { id: 'value-med', label: 'Value Med', bg: '#5ab966' }, { id: 'value-big', label: 'Value Big', bg: '#F03C3C' }, { id: 'bluff', label: 'Blefe', bg: '#ff8f00' }],
    evaluate: (action) => ({
      isCorrect: action === correctAction,
      correctLabel: { check: 'Check', 'value-med': 'Value Medio', 'value-big': 'Value Big', bluff: 'Blefe' }[correctAction],
      isMix: false
    })
  }
}

// ================================================================
// MODULOS 16-20 — Dynamic scenario generators
// ================================================================
function dynamicScenarioQuestion(moduleId) {
  const pick = arr => arr[Math.floor(Math.random() * arr.length)]
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

  const TEMPLATES = {
    16: [
      () => { const vpip = randInt(12, 16); const hand = pick(['A5s','A4s','K9s']); return { q: `BTN com ${hand}. UTG tight (VPIP ${vpip}%) fez raise. GTO diz 3-bet.`, a: 'Fold (Exploit)', b: '3-bet (GTO)', aCorrect: true } },
      () => { const pct = randInt(65, 80); return { q: `BB defende ${pct}%+ dos raises. Voce CO com ${pick(['K9o','Q9o','J9o'])}.`, a: 'Raise (Exploit)', b: 'Fold (GTO)', aCorrect: true } },
      () => { const hand = pick(['87s','76s','98s']); return { q: `BB com ${hand} vs BTN regular forte. GTO diz call.`, a: 'Call (GTO)', b: 'Fold ou 3-bet', aCorrect: true } },
      () => { const cbet = randInt(85, 95); return { q: `BTN c-beta ${cbet}% dos flops. BB com ${pick(['65s','74s','53s'])} em ${pick(['A-7-2','K-8-3','Q-6-2'])}.`, a: 'Call/CR (Exploit)', b: 'Fold (GTO)', aCorrect: true } },
      () => { const f3b = randInt(75, 85); return { q: `BB folda ${f3b}% ao 3-bet. SB com ${pick(['K8s','Q9s','J8s'])}.`, a: '3-bet (Exploit)', b: 'Fold (GTO)', aCorrect: true } },
      () => { const af = pick([0.4, 0.5, 0.6, 0.7]); return { q: `River com par medio. Vilao passivo (AF ${af}) fez raise.`, a: 'Fold (Exploit)', b: 'Call (pot odds)', aCorrect: true } },
      () => { return { q: `SB limpa. BB com ${pick(['J4o','T5o','93o','Q3o'])}.`, a: 'Raise grande (Exploit)', b: 'Check (GTO)', aCorrect: true } },
      () => { const vpip = randInt(35, 48); const pfr = randInt(30, vpip - 2); return { q: `Vilao LAG (VPIP ${vpip}/PFR ${pfr}) 3-beta ${randInt(14, 20)}%. Voce tem ${pick(['AQs','JJ','TT'])}. 4-bet?`, a: '4-bet (Exploit — range de 3bet cheio de lixo)', b: 'Call (jogar pos-flop)', aCorrect: true } },
    ],
    17: [
      () => { const left = randInt(4, 6); const pay = left - 1; const bb = randInt(18, 25); return { q: `${left} restam, pagam ${pay}. Voce ${bb}bb. Short ${randInt(3, 6)}bb. CO com ${pick(['AJo','KQo','ATo'])}.`, a: 'Fold (ICM)', b: 'Raise', aCorrect: true } },
      () => { const bb = randInt(12, 18); return { q: `Mesa final 3-way. Voce ${bb}bb. Chip leader shova. ${pick(['QQ','KK','AA'])}.`, a: 'Call', b: 'Fold', aCorrect: true } },
      () => { const left = randInt(8, 12); const pay = left - 1; return { q: `Satelite ${left} left, pagam ${pay}. Voce ${randInt(20, 30)}bb. Short ${randInt(8, 14)}bb shova. ${pick(['AKs','AQs','KQs'])}.`, a: 'Fold (ICM extremo)', b: 'Call', aCorrect: true } },
      () => { const bb = randInt(25, 40); return { q: `Longe da bolha (${randInt(25, 40)}% restam). ${bb}bb. BTN raise, voce ${pick(['77','88','99','TT'])}.`, a: 'Call (ChipEV)', b: 'Fold', aCorrect: true } },
      () => { const bb = randInt(40, 60); return { q: `Mesa final ${randInt(5, 7)}. Chip leader ${bb}bb, demais ${randInt(8, 15)}bb. BTN com ${pick(['T8s','J9s','97s'])}.`, a: 'Raise (pressionar)', b: 'Fold (esperar)', aCorrect: true } },
      () => { const bb = randInt(15, 22); return { q: `Bolha ${randInt(4, 6)} left. ${bb}bb. Short ${randInt(2, 4)}bb shova. ${pick(['K2o','Q5o','J3o'])}.`, a: 'Fold', b: 'Call', aCorrect: true } },
      () => { return { q: `Inicio torneio. ${randInt(80, 120)}bb. UTG raise. ${pick(['AKo','AKs','QQ'])}.`, a: '3-bet (ChipEV)', b: 'Fold (conservar)', aCorrect: true } },
      () => { const bb = randInt(6, 10); return { q: `Satelite ${randInt(15, 25)} left, ${randInt(8, 12)} pagam. ${bb}bb. BTN com ${pick(['QJs','KTs','JTs'])}.`, a: 'Fold (sobreviver)', b: 'Push', aCorrect: true } },
    ],
    18: [
      () => { const hand = pick(['JTs','T9s','98s']); return { q: `BTN ${hand}. UTG raise, HJ call. 3-way.`, a: 'Call', b: '3-bet', aCorrect: true } },
      () => { const board = pick(['K-8-3','A-9-4','Q-7-2']); return { q: `3-way flop ${board}. BB com ${pick(['A3s','A4s','K5s'])}. Todos checkam a voce.`, a: 'Check', b: 'Bet', aCorrect: true } },
      () => { const board = pick(['Q-J-9','J-T-8','T-9-7']); return { q: `Flop ${board}, 3-way, IP com ${pick(['KTs','QTs','J9s'])} (draw).`, a: 'Check (multiway)', b: 'Bet', aCorrect: true } },
      () => { const board = pick(['A-7-2','K-8-3','A-5-2']); return { q: `3-way ${board} dry. CO raiser com ${pick(['AKo','AQo','KQs'])}.`, a: 'Bet', b: 'Check', aCorrect: true } },
      () => { const pair = pick(['55','44','33','66']); return { q: `CO com ${pair}. UTG raise, HJ call. Set mine?`, a: 'Call (set mine)', b: 'Fold', aCorrect: true } },
      () => { return { q: `${randInt(3, 4)}-way monotone ${pick(['7-6-5','8-5-3','9-6-2'])}. ${pick(['A2','K3','Q4'])} do naipe (flush).`, a: 'Bet (proteger)', b: 'Check (slowplay)', aCorrect: true } },
      () => { const board = pick(['T-9-8','J-T-9','Q-J-T']); return { q: `3-way ${board}. OOP com set de ${board[0] === 'T' ? 'TT' : board[0] === 'J' ? 'JJ' : 'QQ'}.`, a: 'Bet/Raise (proteger)', b: 'Check/Call (trap)', aCorrect: true } },
      () => { const callers = randInt(2, 4); return { q: `SB com ${pick(['AQo','AJs','KQs'])}. ${callers} callers ja. Squeeze?`, a: 'Squeeze (3-bet)', b: 'Call', aCorrect: true } },
    ],
    19: [
      () => { const board = pick(['K-Q-7-3-2','A-J-8-4-3','Q-T-6-5-2']); return { q: `River ${pick(['As5h','Ah7d','Ad3c'])}. Board ${board} sem flush. Vilao checkou 3 streets.`, a: 'Blefe (As bloqueia top pair)', b: 'Check back', aCorrect: true } },
      () => { return { q: `BTN ${pick(['KsQs','KhQh','KdQd'])} vs UTG raise. 3-bet blefe?`, a: 'Nao (bloqueia folds)', b: 'Sim', aCorrect: true } },
      () => { const hand = pick(['Ah4d','Ah5c','Ad3s']); return { q: `BB ${hand} vs BTN raise. 3-bet blefe?`, a: 'Sim (bloqueia AA/AK)', b: 'Nao', aCorrect: true } },
      () => { return { q: `SB ${pick(['JsTs','JhTh','JdTd'])} vs CO raise. 3-bet blefe?`, a: 'Nao (melhor call — playability)', b: 'Sim', aCorrect: true } },
      () => { const board = pick(['A-K-8-5-2','K-Q-7-4-3','A-Q-9-6-2']); return { q: `River com 3 do naipe. Board ${board}. Voce tem ${pick(['Kh','Qh','Jh'])} (bloqueia flush). Vilao bet 75%.`, a: 'Fold (bloqueia blefes dele)', b: 'Call', aCorrect: true } },
      () => { const board = pick(['Q-J-T-4-2','K-Q-J-5-3','A-K-Q-7-4']); return { q: `River ${pick(['9s8s','8h7h','7d6d'])}. Board ${board}. Vilao checkou. Blefar?`, a: 'Nao (nao bloqueia nuts)', b: 'Sim', aCorrect: true } },
    ],
    20: [
      () => { const vpip = randInt(42, 52); const pfr = randInt(6, 10); return { q: `Vilao VPIP ${vpip} / PFR ${pfr}. Ele fez raise ${pick(['UTG','LJ','HJ'])}.`, a: 'Range muito forte (so raise premium)', b: 'Range amplo', aCorrect: true } },
      () => { const vpip = randInt(20, 25); const pfr = vpip - randInt(2, 4); return { q: `Vilao ${vpip}/${pfr}, 3-Bet ${randInt(8, 11)}%. Fez 3-bet do BTN.`, a: 'Defender normal (equilibrado)', b: 'Fold (muito forte)', aCorrect: true } },
      () => { const f3b = randInt(72, 82); return { q: `BTN Fold to 3-Bet ${f3b}%. Voce BB com ${pick(['K8s','Q9s','J8s'])}.`, a: `3-bet blefe (${f3b}% fold)`, b: 'Call', aCorrect: true } },
      () => { const cbet = randInt(82, 92); return { q: `Vilao CBet ${cbet}%. Ele checkou flop ${pick(['A-7-2','K-8-3','Q-6-2'])}. Voce tem ${pick(['65s','74s','T8s'])}.`, a: 'Range de check muito fraco', b: 'Pode ter maos fortes', aCorrect: true } },
      () => { return { q: `Solver: check ${randInt(55, 65)}% bet ${randInt(35, 45)}% com top pair no flop.`, a: 'Simplificar por textura', b: 'Aleatorizar', aCorrect: true } },
      () => { const af = pick([0.5, 0.6, 0.7, 0.8]); return { q: `Vilao AF ${af}. Fez raise no river ${pick(['A-K-8-5-2','K-Q-7-3-9','Q-T-4-8-J'])}.`, a: 'MUITO forte (passivo nunca blefa)', b: 'Pode ser blefe', aCorrect: true } },
      () => { const wtsd = randInt(33, 40); const wsd = randInt(42, 47); return { q: `Seus stats: WTSD ${wtsd}%, W$SD ${wsd}%.`, a: 'Chamando demais', b: 'Numeros normais', aCorrect: true } },
      () => { const hands = randInt(30, 70); return { q: `Voce tem ${hands} maos de um vilao e quer usar 3-Bet% dele para decidir.`, a: 'Nao confiar (amostra pequena)', b: 'Usar o stat normalmente', aCorrect: true } },
    ],
    21: [
      () => { const bb = randInt(8, 14); const hand = pick(['A9o','KJs','QTs','88','77','ATs']); return { q: `Late game. ${bb}bb no BB. CO raisa 2.2x. Voce tem ${hand}.`, a: 'Shove all-in (resteal)', b: 'Call', aCorrect: true } },
      () => { const bb = randInt(5, 9); const hand = pick(['A7o','K9s','QTs','A2s','66','55']); return { q: `Late game. ${bb}bb no ${pick(['CO','BTN'])}. Fold ate voce. ${hand}.`, a: 'Shove', b: 'Fold', aCorrect: true } },
      () => { const bb = randInt(15, 25); const hand = pick(['J7s','T6s','85s','97s','Q4s']); return { q: `Late game com antes. ${bb}bb no BB. ${pick(['BTN','SB'])} min-raise. ${hand}.`, a: 'Call (pot odds excelentes)', b: 'Fold', aCorrect: true } },
      () => { const bb = randInt(18, 30); const hand = pick(['AJs','KQs','TT','99','AQo']); return { q: `Late game. ${bb}bb no SB. ${pick(['LJ','HJ','CO'])} raisa, ${pick(['BTN','CO'])} chama. ${hand}.`, a: 'Squeeze (3-bet)', b: 'Call', aCorrect: true } },
      () => { const bb = randInt(5, 8); const hand = pick(['J3o','T4o','95o','Q2o','83o']); return { q: `Late game. ${bb}bb no ${pick(['UTG','LJ','HJ'])}. ${hand}. Falta 1 orbita pro blind.`, a: 'Fold (esperar spot melhor)', b: 'Shove', aCorrect: true } },
      () => { const bb = randInt(12, 18); const hand = pick(['AA','KK','QQ','AKs','JJ']); return { q: `Late game. ${bb}bb no SB. BB agressivo (raisa vs limp 80%+). ${hand}.`, a: 'Limp-shove (trap)', b: 'Raise normal', aCorrect: true } },
      () => { const bb = randInt(6, 10); const hand = pick(['ATo','KJs','QTs','A8s']); return { q: `Late game. ${bb}bb no BB. CO raisa 2.2x. Pot odds pra call. ${hand}.`, a: 'Stop and go (call pre, shove flop)', b: 'Shove pre', aCorrect: true } },
      () => { const bb = randInt(20, 35); const hand = pick(['K8o','Q9o','J9o','T9o','A5o']); return { q: `Mesa tight esperando ITM. ${bb}bb no ${pick(['CO','BTN'])}. Ninguem abriu em 3 orbitas. ${hand}.`, a: 'Raise (explorar passividade)', b: 'Fold', aCorrect: true } },
    ],
  }

  const templates = TEMPLATES[moduleId]
  const t = pick(templates)()
  const opts = Math.random() > 0.5
    ? [{ id: 'a', label: t.a, correct: t.aCorrect }, { id: 'b', label: t.b, correct: !t.aCorrect }]
    : [{ id: 'a', label: t.b, correct: !t.aCorrect }, { id: 'b', label: t.a, correct: t.aCorrect }]

  return {
    moduleId, type: 'scenario', hand: null, question: t.q,
    label: '',
    buttons: opts.map(o => ({ id: o.id, label: o.label, bg: '#3D7CB8' })),
    evaluate: (action) => {
      const chosen = opts.find(o => o.id === action)
      const correctOpt = opts.find(o => o.correct)
      return { isCorrect: chosen?.correct || false, correctLabel: correctOpt?.label || '', isMix: false }
    }
  }
}

// ================================================================
// Gerador de cenario por modulo
// ================================================================
const GENERATORS = {
  1: rfiScenario,
  2: pushfoldScenario,
  3: potoddsScenario,
  4: bbScenario,
  5: cbetFlopScenario,
  6: blindWarsScenario,
  7: () => rangeScenario(7),
  8: () => rangeScenario(8),
  9: () => rangeScenario(9),
  10: defenseCbetScenario,
  11: checkRaiseScenario,
  12: betSizingScenario,
  13: donkBetScenario,
  14: cbetTurnScenario,
  15: riverPlayScenario,
  16: () => dynamicScenarioQuestion(16),
  17: () => dynamicScenarioQuestion(17),
  18: () => dynamicScenarioQuestion(18),
  19: () => dynamicScenarioQuestion(19),
  20: () => dynamicScenarioQuestion(20),
  21: () => dynamicScenarioQuestion(21),
}

function newScenario(unlockedIds) {
  const available = unlockedIds.filter(id => GENERATORS[id])
  if (!available.length) return rfiScenario()
  const id = available[Math.floor(Math.random() * available.length)]
  return GENERATORS[id]()
}

// ================================================================
// MODULE COLORS & NAMES
// ================================================================
const MOD_COLORS = {
  1: '#e94560', 2: '#f5a623', 3: '#4a90e2', 4: '#00d4aa', 5: '#f5a623',
  6: '#e94560', 7: '#00d4aa', 8: '#e94560', 9: '#f5a623', 10: '#4a90e2',
  11: '#f5a623', 12: '#00d4aa', 13: '#e94560', 14: '#f5a623', 15: '#4a90e2',
  16: '#00d4aa', 17: '#f5a623', 18: '#4a90e2', 19: '#e94560', 20: '#00d4aa', 21: '#e94560',
}

const MOD_NAMES_SHORT = {
  1: 'RFI', 2: 'Push/Fold', 3: 'Pot Odds', 4: 'BB vs RFI', 5: 'CBet Flop',
  6: 'Blind Wars', 7: 'SB vs RFI', 8: 'BTN vs RFI', 9: '3-Bet', 10: 'Def vs CBet',
  11: 'Check-Raise', 12: 'Bet Sizing', 13: 'Donk Bet', 14: 'CBet Turn', 15: 'River Play',
  16: 'GTO vs Exploit', 17: 'ICM', 18: 'Multiway', 19: 'Blockers', 20: 'HUD/Solvers', 21: 'Late Game',
}

// ================================================================
// COMPONENTE PRINCIPAL
// ================================================================
export default function Infinite() {
  const { recordAnswer, getModuleProgress } = useProgress()

  const unlockedIds = Array.from({ length: 21 }, (_, i) => i + 1).filter(id => getModuleProgress(id).unlocked)

  const [selectedModules, setSelectedModules] = useState(() => new Set(unlockedIds))
  const [showFilter, setShowFilter] = useState(false)
  const [showModuleStats, setShowModuleStats] = useState(false)

  const activeIds = unlockedIds.filter(id => selectedModules.has(id))
  const idsForPlay = activeIds.length > 0 ? activeIds : unlockedIds

  const [scenario, setScenario] = useState(() => newScenario(idsForPlay))
  const [result, setResult] = useState(null)
  const [streak, setStreak] = useState(0)
  const [stats, setStats] = useState({ total: 0, correct: 0 })
  const [moduleStats, setModuleStats] = useState({})

  const handleAnswer = useCallback((action) => {
    if (result) return
    const { isCorrect, correctLabel, isMix } = scenario.evaluate(action)
    const newStreak = isCorrect ? streak + 1 : 0
    setStreak(newStreak)
    setStats(s => ({ total: s.total + 1, correct: s.correct + (isCorrect ? 1 : 0) }))
    setModuleStats(prev => {
      const m = prev[scenario.moduleId] || { total: 0, correct: 0 }
      return { ...prev, [scenario.moduleId]: { total: m.total + 1, correct: m.correct + (isCorrect ? 1 : 0) } }
    })
    recordAnswer(scenario.moduleId, isCorrect, newStreak)
    setResult({ isCorrect, correctLabel, isMix, action })
  }, [result, scenario, streak, recordAnswer])

  const handleNext = useCallback(() => {
    setResult(null)
    setScenario(newScenario(idsForPlay))
  }, [idsForPlay])

  const toggleModule = (id) => {
    setSelectedModules(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelectedModules(new Set(unlockedIds))
  const selectNone = () => setSelectedModules(new Set())

  const acc = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
  const accColor = acc >= 90 ? '#00d4aa' : acc >= 70 ? '#f5a623' : '#e94560'

  // Build range data for RangeViewer on feedback
  const rangeViewerProps = (() => {
    if (!result) return null
    const s = scenario
    if (s.type === 'rfi') {
      return { pos: s.pos, stack: s.stack, highlightHand: s.hand, label: `Range RFI — ${s.pos} ${s.stack}bb` }
    }
    if (s.type === 'pushfold') {
      const range = PUSH_FOLD_RANGES[s.pos]
      const stacks = Object.keys(range || {}).map(Number).sort((a, b) => a - b)
      const closest = stacks.reduce((p, c) => Math.abs(c - s.stack) < Math.abs(p - s.stack) ? c : p, stacks[0])
      const pushRange = range?.[closest] || []
      return {
        customRange: { push: pushRange },
        legend: [['push', 'Push'], ['fold', 'Fold']],
        highlightHand: s.hand,
        label: `Range Push/Fold — ${s.pos} ${s.stack}bb`
      }
    }
    if (s.type === 'range') {
      const bbKeyMap = { UTG: 'vsUTG', 'UTG+1': 'vsUTG1', LJ: 'vsLJ', HJ: 'vsHJ', CO: 'vsCO', BTN: 'vsBTN', SB: 'vsSB' }
      const otherKeyMap = { UTG: 'vsUTG', 'UTG+1': 'vsUTG+1', LJ: 'vsLJ', HJ: 'vsHJ', CO: 'vsCO', BTN: 'vsBTN', SB: 'vsSB' }
      let dataSource, myPos
      if (s.moduleId === 7) { dataSource = SB_VS_RFI; myPos = 'SB' }
      else if (s.moduleId === 8) { dataSource = BTN_VS_RFI; myPos = 'BTN' }
      else {
        // Module 9: detect from label
        if (s.label.includes('SB vs')) { dataSource = SB_VS_RFI; myPos = 'SB' }
        else if (s.label.includes('BTN vs')) { dataSource = BTN_VS_RFI; myPos = 'BTN' }
        else { dataSource = BB_VS_RFI; myPos = 'BB' }
      }
      const keyMap = dataSource === BB_VS_RFI ? bbKeyMap : otherKeyMap
      const range = dataSource?.[keyMap[s.pos]] || {}
      return {
        customRange: { threebet: range.threebet || [], call: range.call || [] },
        legend: [['threebet', '3-Bet'], ['call', 'Call'], ['fold', 'Fold']],
        highlightHand: s.hand,
        label: `Range ${myPos} vs ${s.pos}`
      }
    }
    if (s.type === 'bb') {
      // BB defense — rebuild range from scenario data
      const bbKeyMap = { UTG: 'vsUTG', 'UTG+1': 'vsUTG1', LJ: 'vsLJ', HJ: 'vsHJ', CO: 'vsCO', BTN: 'vsBTN', SB: 'vsSB' }
      const range = BB_VS_RFI?.[bbKeyMap[s.pos]] || {}
      return {
        customRange: { threebet: range.threebet || [], call: range.call || [] },
        legend: [['threebet', '3-Bet'], ['call', 'Call'], ['fold', 'Fold']],
        highlightHand: s.hand,
        label: `Range BB vs ${s.pos}`
      }
    }
    if (s.type === 'blindwars' && s.hand) {
      if (s.label.includes('SB')) {
        return {
          customRange: { raise: BLIND_WARS?.SB_raise?.raise || [], call: BLIND_WARS?.SB_complete?.complete || [] },
          legend: [['raise', 'Raise'], ['call', 'Complete'], ['fold', 'Fold']],
          highlightHand: s.hand,
          label: 'Range SB vs BB'
        }
      }
      return {
        customRange: { raise: BLIND_WARS?.BB_vs_complete?.bet || [] },
        legend: [['raise', 'Bet'], ['fold', 'Check']],
        highlightHand: s.hand,
        label: 'Range BB vs SB Complete'
      }
    }
    return null
  })()

  // Cards for hand-based scenarios
  const cards = scenario.hand ? handToCards(scenario.hand) : null

  // Determine if we show the poker table (range/preflop scenarios) or just cards
  const showTable = scenario.type === 'rfi' || scenario.type === 'pushfold' || scenario.type === 'bb'
    || scenario.type === 'blindwars' || scenario.type === 'range'
    || scenario.type === 'board' || scenario.type === 'potodds'

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20" style={{ background: '#0a0a0f' }}>
      <div className="max-w-2xl mx-auto px-4 pt-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { label: 'Maos', value: stats.total, color: '#e94560' },
            { label: 'Acerto', value: stats.total ? `${acc}%` : '--', color: accColor },
            { label: 'Sequencia', value: streak, color: '#f5a623' },
          ].map(s => (
            <div key={s.label} className="rounded-xl py-3 text-center" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
              <div style={{ color: s.color, fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
              <div style={{ color: '#444', fontSize: 11, marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Card principal */}
        <div className="rounded-2xl mb-4"
          style={{ background: '#12121a', border: `1px solid ${result ? (result.isCorrect ? '#00ac8d55' : '#F03C3C55') : '#1e1e2e'}` }}>

          <div style={{ height: 12 }} />

          {/* Poker Table for all non-scenario types */}
          {showTable && (
            <div className="px-2 pt-1 pb-1">
              <PokerTable scenario={scenario} />
            </div>
          )}

          {/* Hero cards below table for hand-based */}
          {cards && showTable && (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: -8, marginBottom: 12 }}>
                {cards.map((c, i) => <Card key={i} card={parseCard(c)} size="md" />)}
              </div>
              <div className="px-5 pb-3 text-center">
                <div style={{ color: '#ffb800', fontSize: 26, fontWeight: 800, letterSpacing: 2, textShadow: '0 0 12px #ffb80060' }}>
                  {scenario.hand}
                </div>
                <div style={{ color: '#444', fontSize: 12, marginTop: 2 }}>
                  {scenario.stack ? `${scenario.stack}bb` : '100bb'}
                </div>
              </div>
            </>
          )}

          {/* Hole cards for board-based (shown below table) */}
          {scenario.hole && showTable && (
            <div className="px-5 pb-3">
              <div style={{ color: '#666', fontSize: 11, fontWeight: 600, marginBottom: 8, textAlign: 'center' }}>SUA MAO</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                {scenario.hole.map((c, i) => <Card key={i} card={parseCard(c)} size="md" />)}
              </div>
            </div>
          )}

          {/* Scenario question for text-based (no table) */}
          {scenario.type === 'scenario' && (
            <div className="px-5 pb-3">
              <p style={{ color: '#ccc', fontSize: 15, lineHeight: 1.6 }}>{scenario.question}</p>
            </div>
          )}

          {/* Extra info (pot odds etc) */}
          {scenario.extraInfo && (
            <div className="mx-4 mb-3 rounded-lg p-3" style={{ background: '#0a0a0f' }}>
              <div style={{ color: '#888', fontSize: 13 }}>{scenario.extraInfo}</div>
            </div>
          )}

          {/* Feedback */}
          {result && (
            <div className="mx-4 mb-3 rounded-lg px-4 py-3" style={{
              background: result.isCorrect ? '#00ac8d15' : '#F03C3C15',
              border: `1px solid ${result.isCorrect ? '#00ac8d40' : '#F03C3C40'}`
            }}>
              <div style={{ color: result.isCorrect ? '#00ac8d' : '#F03C3C', fontWeight: 700, fontSize: 16 }}>
                {result.isCorrect ? '✓ Correto!' : `✗ Errou — era ${result.correctLabel}`}
              </div>
              {result.isMix && (
                <div style={{ color: '#ff8f00', fontSize: 12, marginTop: 3 }}>Mao de transicao — ambas as acoes sao aceitaveis.</div>
              )}
              {rangeViewerProps && (
                <RangeViewer {...rangeViewerProps} />
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="px-4 pb-4">
            {!result ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {scenario.buttons.map(b => (
                  <button key={b.id} onClick={() => handleAnswer(b.id)}
                    style={{
                      flex: 1, minWidth: 0, padding: '14px 4px', borderRadius: 8, fontWeight: 700,
                      fontSize: 13, border: 'none', cursor: 'pointer', letterSpacing: 0.3,
                      color: '#f5f5f5', textShadow: '0 1px 2px #0008', background: b.bg,
                    }}>
                    {b.label}
                  </button>
                ))}
              </div>
            ) : (
              <button onClick={handleNext}
                style={{
                  width: '100%', padding: '14px', borderRadius: 8,
                  background: '#1e1e2e', border: '1px solid #333',
                  color: '#f5f5f5', fontWeight: 700, fontSize: 15,
                  cursor: 'pointer', letterSpacing: 0.5,
                }}>
                Proxima Mao →
              </button>
            )}
          </div>
        </div>

        {/* Filter & Stats toggles */}
        <div className="flex gap-2 mb-3">
          <button onClick={() => { setShowFilter(!showFilter); setShowModuleStats(false) }}
            className="flex-1 py-2 rounded-lg text-sm font-semibold"
            style={{ background: showFilter ? '#e9456022' : '#12121a', color: showFilter ? '#e94560' : '#666', border: `1px solid ${showFilter ? '#e94560' : '#1e1e2e'}` }}>
            Filtrar Modulos
          </button>
          <button onClick={() => { setShowModuleStats(!showModuleStats); setShowFilter(false) }}
            className="flex-1 py-2 rounded-lg text-sm font-semibold"
            style={{ background: showModuleStats ? '#4a90e222' : '#12121a', color: showModuleStats ? '#4a90e2' : '#666', border: `1px solid ${showModuleStats ? '#4a90e2' : '#1e1e2e'}` }}>
            Stats por Modulo
          </button>
        </div>

        {/* Module filter */}
        {showFilter && (
          <div className="rounded-xl p-4 mb-3" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
            <div className="flex justify-between items-center mb-3">
              <div style={{ color: '#888', fontSize: 12, fontWeight: 600 }}>SELECIONE OS MODULOS</div>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-xs px-2 py-1 rounded" style={{ color: '#00d4aa', background: '#00d4aa15' }}>Todos</button>
                <button onClick={selectNone} className="text-xs px-2 py-1 rounded" style={{ color: '#e94560', background: '#e9456015' }}>Nenhum</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {unlockedIds.map(id => {
                const active = selectedModules.has(id)
                return (
                  <button key={id} onClick={() => toggleModule(id)}
                    className="rounded-lg px-3 py-2 text-xs font-bold transition-all"
                    style={{
                      background: active ? `${MOD_COLORS[id]}22` : '#0a0a0f',
                      color: active ? MOD_COLORS[id] : '#444',
                      border: `1px solid ${active ? MOD_COLORS[id] : '#1e1e2e'}`,
                    }}>
                    {id}. {MOD_NAMES_SHORT[id]}
                  </button>
                )
              })}
            </div>
            <div style={{ color: '#555', fontSize: 11, marginTop: 8 }}>
              {activeIds.length === 0 ? 'Nenhum selecionado — usando todos' : `${activeIds.length} modulo${activeIds.length > 1 ? 's' : ''} ativo${activeIds.length > 1 ? 's' : ''}`}
            </div>
          </div>
        )}

        {/* Per-module stats */}
        {showModuleStats && (
          <div className="rounded-xl p-4 mb-3" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
            <div style={{ color: '#888', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>ACERTO POR MODULO</div>
            {Object.keys(moduleStats).length === 0 ? (
              <div style={{ color: '#444', fontSize: 13 }}>Jogue algumas maos para ver as estatisticas.</div>
            ) : (
              <div className="space-y-2">
                {Object.entries(moduleStats)
                  .sort((a, b) => {
                    const accA = a[1].total > 0 ? a[1].correct / a[1].total : 0
                    const accB = b[1].total > 0 ? b[1].correct / b[1].total : 0
                    return accA - accB
                  })
                  .map(([id, ms]) => {
                    const modAcc = ms.total > 0 ? Math.round((ms.correct / ms.total) * 100) : 0
                    const color = modAcc >= 90 ? '#00d4aa' : modAcc >= 70 ? '#f5a623' : '#e94560'
                    return (
                      <div key={id} className="flex items-center gap-3">
                        <div style={{ width: 90, color: MOD_COLORS[id], fontSize: 12, fontWeight: 600 }}>{MOD_NAMES_SHORT[id]}</div>
                        <div className="flex-1 rounded-full h-2" style={{ background: '#1e1e2e' }}>
                          <div className="rounded-full h-2 transition-all" style={{ width: `${modAcc}%`, background: color }} />
                        </div>
                        <div style={{ color, fontSize: 13, fontWeight: 700, width: 45, textAlign: 'right' }}>{modAcc}%</div>
                        <div style={{ color: '#555', fontSize: 11, width: 30 }}>{ms.total}x</div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
