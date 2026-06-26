// Mesa de poker 6-max visual — oval com 6 cadeiras
// Hero sempre na posição inferior central (seat 0)

import Card, { parseCard } from './Card'

// Posições dos seats ao redor da mesa oval (% relativo ao container)
// Seat 0 = Hero (bottom center), depois sentido horário
const SEAT_POSITIONS = [
  { top: '88%', left: '50%',  label: 'bottom' },  // 0: Hero (bottom center)
  { top: '65%', left: '5%',   label: 'left-bottom' },   // 1: left bottom
  { top: '12%', left: '5%',   label: 'left-top' },      // 2: left top
  { top: '-5%', left: '50%',  label: 'top' },      // 3: top center
  { top: '12%', left: '95%',  label: 'right-top' },     // 4: right top
  { top: '65%', left: '95%',  label: 'right-bottom' },  // 5: right bottom
]

// Posições do dealer button (offset do seat)
const DEALER_OFFSETS = {
  bottom:       { top: -22, left: 30 },
  'left-bottom':  { top: -12, left: 50 },
  'left-top':     { top: 8, left: 50 },
  top:          { top: 22, left: 30 },
  'right-top':    { top: 8, left: -30 },
  'right-bottom': { top: -12, left: -30 },
}

function CardBack({ small }) {
  const w = small ? 24 : 30
  const h = small ? 32 : 40
  return (
    <div style={{
      width: w, height: h, borderRadius: 3,
      background: 'linear-gradient(135deg, #e5484d 0%, #b5303a 100%)',
      border: '1px solid rgba(255,255,255,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <div style={{ fontSize: small ? 10 : 12, color: 'rgba(255,255,255,0.35)' }}>?</div>
    </div>
  )
}

function ActionLabel({ label }) {
  if (!label) return null
  const colors = {
    fold: '#676671', check: '#4fce82', call: '#0a84d7',
    bet: '#f5a623', raise: '#f5a623', allin: '#ff8f00',
  }
  const key = label.toLowerCase().split(' ')[0]
  const color = colors[key] || '#b3b3b8'
  return (
    <div style={{
      padding: '2px 8px', borderRadius: 10,
      background: `${color}20`, border: `1px solid ${color}50`,
      fontSize: 10, fontWeight: 700, color,
      fontFamily: 'JetBrains Mono',
      whiteSpace: 'nowrap',
      animation: 'bubblePop 0.3s ease-out',
    }}>
      {label}
    </div>
  )
}

function formatStack(stack) {
  if (stack >= 10000) return `${(stack / 1000).toFixed(1)}k`
  return stack.toLocaleString()
}

function SeatView({ player, isHero, isActive, isDealer, showCards, actionLabel, position }) {
  const eliminated = player.folded && player.stack === 0
  const folded = player.folded
  const allIn = player.allIn

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
      opacity: eliminated ? 0.3 : folded ? 0.55 : 1,
      transition: 'opacity 0.3s',
    }}>
      {/* Action label */}
      <ActionLabel label={actionLabel} />

      {/* Cards */}
      <div style={{ display: 'flex', gap: 2 }}>
        {showCards && player.holeCards ? (
          player.holeCards.map((c, i) => (
            <Card key={i} card={parseCard(c)} size="sm" />
          ))
        ) : player.holeCards ? (
          [0, 1].map(i => <CardBack key={i} small />)
        ) : null}
      </div>

      {/* Player info box */}
      <div style={{
        padding: '4px 10px', borderRadius: 8,
        background: isActive ? '#2a2a2e' : '#1a1a1d',
        border: `1.5px solid ${isActive ? '#f5a623' : isHero ? '#4fce82' : '#2a2a2e'}`,
        textAlign: 'center', minWidth: 60,
        boxShadow: isActive ? '0 0 8px rgba(245,166,35,0.3)' : 'none',
        transition: 'all 0.3s',
      }}>
        {/* Name */}
        <div style={{
          fontSize: 10, fontWeight: 700,
          color: isHero ? '#4fce82' : '#b3b3b8',
          maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {player.name}
        </div>

        {/* Stack */}
        <div style={{
          fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono',
          color: allIn ? '#ff8f00' : isHero ? '#4fce82' : '#fdfdfd',
        }}>
          {allIn ? 'ALL-IN' : formatStack(player.stack)}
        </div>

        {/* Position badge */}
        {position && (
          <div style={{
            fontSize: 8, fontWeight: 700, fontFamily: 'JetBrains Mono',
            color: position === 'BTN' ? '#f5a623' : position === 'SB' || position === 'BB' ? '#0a84d7' : '#676671',
            textTransform: 'uppercase',
          }}>
            {position}
          </div>
        )}
      </div>

    </div>
  )
}

export default function PokerTable6Max({
  game,             // gameState from pokerEngine
  heroSeatIdx = 0,  // which seat index is the hero
  actionLabels = {},// { [seatIdx]: 'Call 20' }
  showdown = false, // show all cards at showdown
}) {
  if (!game) return null

  const { players, board, pot, sidePots, dealerIdx, activePlayerIdx, street } = game

  // Map engine seat indices to visual seat positions
  // Hero always at visual position 0 (bottom center)
  const heroVisualIdx = 0
  const seatMapping = [] // seatMapping[visualIdx] = engineIdx
  for (let i = 0; i < players.length; i++) {
    const visualIdx = (i - heroSeatIdx + players.length) % players.length
    seatMapping[visualIdx] = i
  }

  return (
    <div style={{ position: 'relative', width: '100%', paddingBottom: '80%', userSelect: 'none' }}>
      {/* Animations */}
      <style>{`
        @keyframes bubblePop {
          0% { transform: scale(0.6); opacity: 0; }
          60% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes cardDeal {
          0% { transform: translateY(-8px) scale(0.8); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 4px rgba(245,166,35,0.3); }
          50% { box-shadow: 0 0 12px rgba(245,166,35,0.5); }
        }
      `}</style>

      {/* Mesa oval (centro) */}
      <div style={{
        position: 'absolute', top: '18%', left: '10%', width: '80%', paddingBottom: '44%',
        borderRadius: '50%',
        border: '2px solid #3a3a42',
        background: 'radial-gradient(ellipse at center, #1e3a1e 0%, #162816 50%, #111611 100%)',
        boxShadow: 'inset 0 0 30px rgba(0,0,0,0.5), 0 4px 20px rgba(0,0,0,0.3)',
      }}>
        {/* Board cards (center) */}
        <div style={{
          position: 'absolute', top: '38%', left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center', pointerEvents: 'none',
        }}>
          {board && board.length > 0 && (
            <div style={{
              display: 'flex', gap: 3, justifyContent: 'center', marginBottom: 6,
            }}>
              {board.map((c, i) => (
                <div key={`${street}-${i}`} style={{
                  animation: 'cardDeal 0.35s ease-out both',
                  animationDelay: `${i * 0.08}s`,
                }}>
                  <Card card={parseCard(c)} size="sm" />
                </div>
              ))}
            </div>
          )}

          {/* Pot display */}
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4,
            flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ position: 'relative', width: 12, height: 14 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    position: 'absolute', bottom: i * 2.5, left: 0,
                    width: 12, height: 5, borderRadius: 2.5,
                    background: i === 2 ? '#4fce82' : i === 1 ? '#3ab870' : '#2a9a5a',
                    border: '1px solid rgba(0,0,0,0.25)',
                  }} />
                ))}
              </div>
              <span style={{
                color: '#fdfdfd', fontSize: 13, fontWeight: 700,
                fontFamily: 'JetBrains Mono',
                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
              }}>
                {pot}
              </span>
            </div>

            {/* Side pots */}
            {sidePots && sidePots.length > 1 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                {sidePots.map((sp, i) => (
                  <span key={i} style={{
                    fontSize: 9, fontWeight: 600, fontFamily: 'JetBrains Mono',
                    color: '#f5a623', background: '#f5a62315',
                    padding: '1px 5px', borderRadius: 4,
                  }}>
                    {i === 0 ? 'Main' : `Side ${i}`}: {sp.amount}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Dealer button */}
        {dealerIdx != null && (() => {
          const visualDealerIdx = (dealerIdx - heroSeatIdx + players.length) % players.length
          const pos = SEAT_POSITIONS[visualDealerIdx]
          if (!pos) return null
          const offset = DEALER_OFFSETS[pos.label] || { top: 0, left: 0 }
          return (
            <div style={{
              position: 'absolute',
              top: pos.top, left: pos.left,
              transform: 'translate(-50%, -50%)',
              marginTop: offset.top, marginLeft: offset.left,
              width: 18, height: 18, borderRadius: '50%',
              background: '#fdfdfd', color: '#0f0f0f',
              fontSize: 9, fontWeight: 900,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 20,
              boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
            }}>D</div>
          )
        })()}
      </div>

      {/* Seats ao redor da mesa */}
      {Array.from({ length: players.length }).map((_, visualIdx) => {
        const engineIdx = seatMapping[visualIdx]
        const player = players[engineIdx]
        if (!player) return null

        const pos = SEAT_POSITIONS[visualIdx]
        if (!pos) return null

        const isHero = player.isHero
        const isActive = activePlayerIdx === engineIdx
        const showCards = isHero || (showdown && !player.folded)
        const position = player.position

        return (
          <div key={engineIdx} style={{
            position: 'absolute',
            top: pos.top, left: pos.left,
            transform: 'translate(-50%, -50%)',
            zIndex: isActive ? 15 : 10,
          }}>
            <SeatView
              player={player}
              isHero={isHero}
              isActive={isActive}
              isDealer={dealerIdx === engineIdx}
              showCards={showCards}
              actionLabel={actionLabels[engineIdx]}
              position={position}
            />
          </div>
        )
      })}
    </div>
  )
}
