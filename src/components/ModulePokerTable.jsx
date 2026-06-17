import Card, { parseCard } from './Card'

const ALL_SEATS = ['UTG','UTG+1','LJ','HJ','CO','BTN','SB','BB']

const SLOT_POS = [
  { top: '8%',  left: '22%' },
  { top: '2%',  left: '50%' },
  { top: '8%',  left: '78%' },
  { top: '50%', left: '94%' },
  { top: '85%', left: '72%' },
  { top: '90%', left: '50%' },
  { top: '85%', left: '28%' },
  { top: '50%', left: '6%'  },
]

function Seat({ pos, isHero, isVillain, isFolded, actionLabel, heroCards }) {
  const label = pos === 'UTG+1' ? 'UTG1' : pos
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      {actionLabel && (
        <div style={{
          fontSize: 10, fontWeight: 600,
          color: actionLabel === 'Fold' ? '#676671'
               : actionLabel.startsWith('Raise') || actionLabel.startsWith('Bet') ? '#4fce82'
               : actionLabel === 'Call' ? '#0a84d7'
               : actionLabel === 'Check' ? '#b3b3b8'
               : '#b3b3b8',
          whiteSpace: 'nowrap',
        }}>{actionLabel}</div>
      )}
      <div style={{
        padding: '4px 10px', borderRadius: 6,
        background: isHero ? '#2a2a2e' : isFolded ? 'transparent' : '#2a2a2e',
        border: isHero ? '1px solid #4fce82' : isVillain ? '1px solid #e5484d' : 'none',
        opacity: isFolded ? 0.35 : 1,
        textAlign: 'center', minWidth: 40,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700,
          color: isHero ? '#4fce82' : isVillain ? '#e5484d' : '#b3b3b8',
          lineHeight: 1.3,
        }}>{label}</div>
      </div>
      {isHero && heroCards && heroCards.length > 0 && (
        <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
          {heroCards.map((c, i) => (
            <Card key={i} card={typeof c === 'string' ? parseCard(c) : c} size="sm" />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Mesa de poker reutilizavel para os modulos de treino.
 *
 * Props:
 *  - heroPos: string (ex: 'BTN', 'BB')
 *  - villainPos: string | null
 *  - heroCards: string[] (ex: ['Ah','Kd'])
 *  - boardCards: string[] | null (ex: ['Ts','9h','4c'] para flop)
 *  - villainAction: string | null (ex: 'Raise 2.5x', 'Check', 'Bet 75%')
 *  - potLabel: string | null (ex: '6.5bb')
 *  - contextTitle: string (ex: 'Voce esta IP -- Turn')
 *  - contextDesc: string (ex: 'Voce c-betou no flop e chamaram.')
 *  - textureTags: { label: string, color: string }[] | null
 */
export default function ModulePokerTable({
  heroPos = 'BTN',
  villainPos = null,
  heroCards = [],
  boardCards = null,
  villainAction = null,
  potLabel = null,
  contextTitle = '',
  contextDesc = '',
  textureTags = null,
}) {
  const heroIdx = ALL_SEATS.indexOf(heroPos)
  const rotated = SLOT_POS.map((_, i) => ALL_SEATS[(heroIdx + i - 5 + 8) % 8])

  const btnSlotIdx = rotated.indexOf('BTN')
  const btnPos = SLOT_POS[btnSlotIdx]

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Contexto da aula acima da mesa */}
      {(contextTitle || contextDesc) && (
        <div className="rounded-xl p-3 mb-3 text-center" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
          {contextTitle && (
            <div style={{ color: '#0a84d7', fontSize: 16, fontWeight: 700 }}>{contextTitle}</div>
          )}
          {contextDesc && (
            <div style={{ color: '#ccc', fontSize: 13, marginTop: 2 }}>{contextDesc}</div>
          )}
          {textureTags && textureTags.length > 0 && (
            <div className="mt-2 flex gap-2 justify-center flex-wrap">
              {textureTags.map((tag, i) => (
                <span key={i} className="px-2 py-1 rounded text-xs" style={{
                  background: tag.color + '22',
                  color: tag.color,
                }}>{tag.label}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mesa oval */}
      <div style={{
        position: 'relative', width: '100%', paddingBottom: '75%',
        userSelect: 'none', overflow: 'hidden',
      }}>
        {/* Feltro */}
        <div style={{
          position: 'absolute',
          top: '15%', left: '8%', right: '8%', bottom: '15%',
          borderRadius: 999,
          border: '1.5px solid #3a3a42',
          background: '#161618',
        }} />

        {/* Centro: pot + board cards */}
        <div style={{
          position: 'absolute', top: '42%', left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center', pointerEvents: 'none',
        }}>
          {boardCards && boardCards.length > 0 && (
            <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginBottom: 6 }}>
              {boardCards.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                  <Card card={typeof c === 'string' ? parseCard(c) : c} size="sm" />
                  {/* Separador apos o flop (3 cartas) */}
                  {i === 2 && boardCards.length > 3 && <div style={{ width: 4 }} />}
                </div>
              ))}
            </div>
          )}
          {/* Chip stack + pot */}
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
            {potLabel && (
              <span style={{ color: '#b3b3b8', fontSize: 11, fontWeight: 600, fontFamily: 'JetBrains Mono' }}>
                {potLabel}
              </span>
            )}
          </div>
        </div>

        {/* Dealer button */}
        {btnPos && (
          <div style={{
            position: 'absolute',
            top: btnPos.top, left: btnPos.left,
            transform: 'translate(-32px, 2px)',
            width: 16, height: 16, borderRadius: '50%',
            background: '#fdfdfd', color: '#0f0f0f',
            fontSize: 8, fontWeight: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10,
          }}>D</div>
        )}

        {/* Seats */}
        {rotated.map((pos, slotIdx) => {
          const p = SLOT_POS[slotIdx]
          const isHero = pos === heroPos
          const isVillain = pos === villainPos
          const isFolded = !isHero && !isVillain && pos !== 'SB' && pos !== 'BB' && villainPos

          let actionLabel = null
          if (isFolded) actionLabel = 'Fold'
          else if (isVillain && villainAction) actionLabel = villainAction

          return (
            <div key={pos} style={{
              position: 'absolute',
              top: p.top, left: p.left,
              transform: 'translate(-50%, -50%)',
              zIndex: 5,
            }}>
              <Seat
                pos={pos}
                isHero={isHero}
                isVillain={isVillain}
                isFolded={isFolded}
                actionLabel={actionLabel}
                heroCards={isHero ? heroCards : null}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
