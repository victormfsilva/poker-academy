// Mesa de poker 6-max visual — estilo profissional inspirado em Tehes/poker
// Cartas SVG, ícones de dealer/blinds, chip stacks, animações
// Hero sempre na posição inferior central (seat 0)

import Card, { parseCard } from './Card'

// Posições dos seats ao redor da mesa (% relativo ao container)
// Layout: 3 em cima, mesa no meio, 3 embaixo
const SEAT_POSITIONS = [
  { top: '90%', left: '50%',  label: 'bottom' },        // 0: Hero (bottom center)
  { top: '68%', left: '4%',   label: 'left-bottom' },   // 1: left bottom
  { top: '12%', left: '4%',   label: 'left-top' },      // 2: left top
  { top: '-6%', left: '50%',  label: 'top' },            // 3: top center
  { top: '12%', left: '96%',  label: 'right-top' },     // 4: right top
  { top: '68%', left: '96%',  label: 'right-bottom' },  // 5: right bottom
]

// Offsets do dealer button relativo ao seat
const DEALER_OFFSETS = {
  bottom:         { top: -28, left: 28 },
  'left-bottom':  { top: -14, left: 48 },
  'left-top':     { top: 10, left: 48 },
  top:            { top: 28, left: 28 },
  'right-top':    { top: 10, left: -28 },
  'right-bottom': { top: -14, left: -28 },
}

// Converte formato interno (Ah, Ks) para formato SVG do Tehes (AH, KS)
function toSvgCardName(card) {
  if (!card) return '1B'
  // Nosso formato: Ah, Ks, Td, 9c etc
  const rank = card[0]
  const suit = card[1]?.toUpperCase()
  if (!rank || !suit) return '1B'
  return `${rank}${suit}`
}

function CardSvg({ card, showBack, small, folded }) {
  const w = small ? 36 : 44
  const h = small ? 50 : 62
  const name = showBack ? '1B' : toSvgCardName(card)
  return (
    <img
      src={`/cards/${name}.svg`}
      alt={showBack ? 'card back' : card}
      style={{
        width: w, height: h,
        borderRadius: small ? 3 : 4,
        boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
        filter: folded ? 'brightness(0.45)' : 'none',
        transition: 'filter 0.3s, transform 0.3s',
      }}
    />
  )
}

function ActionLabel({ label }) {
  if (!label) return null
  const key = label.toLowerCase().split(' ')[0]
  const colorMap = {
    fold: '#8b8b95', check: '#4fce82', call: '#3498db',
    bet: '#f5a623', raise: '#f5a623', allin: '#ff6b35',
  }
  const color = colorMap[key] || '#b3b3b8'
  return (
    <div style={{
      padding: '2px 10px', borderRadius: 12,
      background: `${color}25`, border: `1.5px solid ${color}60`,
      fontSize: 10, fontWeight: 700, color,
      fontFamily: "'Secular One', 'JetBrains Mono', sans-serif",
      whiteSpace: 'nowrap',
      animation: 'actionBounce 0.32s ease-out',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    }}>
      {label}
    </div>
  )
}

function formatStack(stack) {
  if (stack >= 10000) return `${(stack / 1000).toFixed(1)}k`
  return stack.toLocaleString()
}

function BlindIcon({ type }) {
  const iconMap = {
    dealer: '/poker-icons/dealer.svg',
    sb: '/poker-icons/small-blind.svg',
    bb: '/poker-icons/big-blind.svg',
  }
  const src = iconMap[type]
  if (!src) return null
  return (
    <img src={src} alt={type} style={{
      width: 22, height: 22,
      borderRadius: '50%',
      background: '#f5c842',
      boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
    }} />
  )
}

function ChipStack({ bet }) {
  if (!bet || bet <= 0) return null
  // Número de chips visuais baseado no valor da aposta
  const chipCount = Math.min(Math.max(1, Math.ceil(bet / 50)), 8)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{
        position: 'relative', width: 18, height: 18 + (chipCount - 1) * 2,
      }}>
        {Array.from({ length: chipCount }).map((_, i) => (
          <img key={i} src="/poker-icons/chip.svg" alt="" style={{
            position: 'absolute',
            bottom: i * 2,
            left: 0,
            width: 18, height: 18,
            borderRadius: '50%',
            background: '#f5c842',
          }} />
        ))}
      </div>
      <span style={{
        color: '#f5c842', fontSize: 11, fontWeight: 700,
        fontFamily: "'JetBrains Mono', monospace",
        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
      }}>
        {bet}
      </span>
    </div>
  )
}

function SeatView({ player, isHero, isActive, showCards, actionLabel, position, bet }) {
  const eliminated = player.stack <= 0 && player.folded
  const folded = player.folded
  const allIn = player.allIn

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
      opacity: eliminated ? 0.25 : 1,
      transition: 'opacity 0.4s',
    }}>
      {/* Action label */}
      <ActionLabel label={actionLabel} />

      {/* Cards */}
      <div style={{
        display: 'flex', gap: -2,
        position: 'relative',
      }}>
        {player.holeCards ? (
          showCards ? (
            player.holeCards.map((c, i) => (
              <div key={i} style={{
                transform: i === 0 ? 'rotate(-3deg)' : 'rotate(4deg)',
                marginLeft: i === 1 ? -8 : 0,
                animation: 'cardDeal 0.35s ease-out both',
                animationDelay: `${i * 0.1}s`,
                zIndex: i,
              }}>
                <CardSvg card={c} folded={folded} small={!isHero} />
              </div>
            ))
          ) : (
            [0, 1].map(i => (
              <div key={i} style={{
                transform: i === 0 ? 'rotate(-3deg)' : 'rotate(4deg)',
                marginLeft: i === 1 ? -8 : 0,
                zIndex: i,
              }}>
                <CardSvg showBack folded={folded} small={!isHero} />
              </div>
            ))
          )
        ) : null}

        {/* Blind/Dealer icon overlay */}
        {position && (position === 'BTN' || position === 'SB' || position === 'BB') && (
          <div style={{
            position: 'absolute', right: -8, bottom: -6, zIndex: 10,
          }}>
            <BlindIcon type={position === 'BTN' ? 'dealer' : position === 'SB' ? 'sb' : 'bb'} />
          </div>
        )}
      </div>

      {/* Bet chips (acima ou abaixo do player info) */}
      <ChipStack bet={bet} />

      {/* Player info box - estilo Tehes */}
      <div style={{
        padding: '4px 12px', borderRadius: 20,
        background: isActive ? '#f5c842' : folded ? 'hsl(220,40%,15%)' : 'hsl(220,20%,50%)',
        color: isActive ? 'hsl(220,40%,15%)' : folded ? 'hsl(220,20%,50%)' : 'hsl(220,40%,15%)',
        textAlign: 'center', minWidth: 64,
        boxShadow: isActive
          ? '0 0 12px rgba(245,200,66,0.5), 0 2px 8px rgba(0,0,0,0.3)'
          : '0 2px 6px rgba(0,0,0,0.3)',
        transition: 'all 0.3s',
        animation: isActive ? 'pulseGlow 2s ease-in-out infinite' : 'none',
        border: isHero && !isActive ? '2px solid #4fce82' : allIn ? '2px solid #ff6b35' : 'none',
      }}>
        {/* Name */}
        <div style={{
          fontSize: 11, fontWeight: 700,
          maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          lineHeight: 1.2,
        }}>
          {player.name}
        </div>

        {/* Stack */}
        <div style={{
          fontSize: 12, fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace",
          lineHeight: 1.2,
          color: allIn
            ? (isActive ? '#b5303a' : '#ff6b35')
            : isActive ? 'hsl(220,40%,15%)' : folded ? 'hsl(220,20%,50%)' : 'hsl(220,40%,15%)',
        }}>
          {allIn ? 'ALL-IN' : player.stack <= 0 ? 'OUT' : formatStack(player.stack)}
        </div>
      </div>

      {/* Position badge */}
      {position && (
        <div style={{
          fontSize: 8, fontWeight: 800,
          fontFamily: "'JetBrains Mono', monospace",
          color: position === 'BTN' ? '#f5c842' : position === 'SB' || position === 'BB' ? '#3498db' : '#8b8b95',
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        }}>
          {position}
        </div>
      )}
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
  const seatMapping = [] // seatMapping[visualIdx] = engineIdx
  for (let i = 0; i < players.length; i++) {
    const visualIdx = (i - heroSeatIdx + players.length) % players.length
    seatMapping[visualIdx] = i
  }

  return (
    <div style={{ position: 'relative', width: '100%', paddingBottom: '82%', userSelect: 'none' }}>
      {/* Animations */}
      <style>{`
        @keyframes actionBounce {
          0% { transform: translateY(0); }
          40% { transform: translateY(-4px); }
          70% { transform: translateY(0); }
          100% { transform: translateY(0); }
        }
        @keyframes cardDeal {
          0% { transform: translateY(-10px) scale(0.85) rotate(0deg); opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 8px rgba(245,200,66,0.3), 0 2px 8px rgba(0,0,0,0.3); }
          50% { box-shadow: 0 0 16px rgba(245,200,66,0.6), 0 2px 8px rgba(0,0,0,0.3); }
        }
        @keyframes boardCardDeal {
          0% { transform: translateY(-12px) scale(0.8); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>

      {/* Mesa oval (centro) — estilo Tehes azul escuro com textura */}
      <div style={{
        position: 'absolute', top: '17%', left: '8%', width: '84%', paddingBottom: '48%',
        borderRadius: '50%',
        border: '3px solid hsl(220,30%,25%)',
        background: `
          radial-gradient(ellipse at center, hsl(220,40%,30%) 0%, hsl(220,40%,20%) 60%, hsl(220,40%,15%) 100%)
        `,
        boxShadow: `
          inset 0 0 40px rgba(0,0,0,0.4),
          0 4px 24px rgba(0,0,0,0.5),
          0 0 0 4px hsl(220,40%,12%)
        `,
      }}>
        {/* Felt texture overlay */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          backgroundImage: 'url("data:image/png;base64,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")',
          backgroundRepeat: 'repeat',
          backgroundSize: 'auto',
          opacity: 0.03,
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
        }} />

        {/* Board cards (center of the table) */}
        <div style={{
          position: 'absolute', top: '32%', left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center', pointerEvents: 'none',
        }}>
          {/* Community cards */}
          <div style={{
            display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 8,
            minHeight: 52,
          }}>
            {board && board.length > 0 ? (
              board.map((c, i) => (
                <div key={`${street}-${i}`} style={{
                  animation: 'boardCardDeal 0.4s ease-out both',
                  animationDelay: `${i * 0.1}s`,
                }}>
                  <CardSvg card={c} small />
                </div>
              ))
            ) : (
              // Empty card slots (dashed borders like Tehes)
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{
                  width: 36, height: 50,
                  borderRadius: 3,
                  border: '1px dashed hsl(220,20%,45%)',
                  background: 'hsla(0,0%,0%,0.05)',
                }} />
              ))
            )}
          </div>

          {/* Pot display */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '3px 14px',
            background: 'hsl(220,40%,20%)',
            boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.4)',
            borderRadius: 20,
          }}>
            <img src="/poker-icons/chip.svg" alt="" style={{
              width: 16, height: 16, borderRadius: '50%', background: '#f5c842',
            }} />
            <span style={{
              color: '#f5c842', fontSize: 14, fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {pot}
            </span>
          </div>

          {/* Side pots */}
          {sidePots && sidePots.length > 1 && (
            <div style={{
              display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center',
              marginTop: 4,
            }}>
              {sidePots.map((sp, i) => (
                <span key={i} style={{
                  fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                  color: '#f5c842', background: 'hsl(220,40%,20%)',
                  padding: '1px 6px', borderRadius: 10,
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
                }}>
                  {i === 0 ? 'Main' : `Side ${i}`}: {sp.amount}
                </span>
              ))}
            </div>
          )}
        </div>
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

        // Calcular bet investido na rodada
        const bet = player.roundInvested || 0

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
              showCards={showCards}
              actionLabel={actionLabels[engineIdx]}
              position={position}
              bet={bet}
            />
          </div>
        )
      })}
    </div>
  )
}
