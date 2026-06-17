import { useState } from 'react'
import { GLOSSARIO, PUSH_FOLD_RANGES } from '../data/ranges'

const POSITIONS_PUSHFOLD = ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB']
const STACKS_PUSHFOLD = [5, 8, 10]

// ============================================================
// CALCULADORA DE POT ODDS
// ============================================================
function PotOddsCalc() {
  const [pot, setPot] = useState('')
  const [bet, setBet] = useState('')
  const [outs, setOuts] = useState('')

  const potVal = parseFloat(pot) || 0
  const betVal = parseFloat(bet) || 0
  const totalPot = potVal + betVal + betVal
  const needed = totalPot > 0 ? (betVal / totalPot) * 100 : 0
  const outsNum = parseInt(outs) || 0
  const equityFlop = outsNum * 4
  const equityTurn = outsNum * 2
  const shouldCall = outsNum > 0 && equityFlop >= needed

  return (
    <div className="rounded-xl p-4" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
      <h2 style={{ color: '#fdfdfd', fontWeight: 700, marginBottom: 16, fontSize: 18 }}>Calculadora de Pot Odds</h2>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label style={{ color: '#b3b3b8', fontSize: 11, display: 'block', marginBottom: 4, fontFamily: 'JetBrains Mono', letterSpacing: 1, textTransform: 'uppercase' }}>Pote atual (bb)</label>
          <input type="number" value={pot} onChange={e => setPot(e.target.value)} placeholder="Ex: 10"
            className="w-full px-3 py-2 rounded-lg"
            style={{ background: '#0f0f0f', border: '1px solid #2a2a2e', outline: 'none', color: '#fdfdfd', fontSize: 14 }} />
        </div>
        <div>
          <label style={{ color: '#b3b3b8', fontSize: 11, display: 'block', marginBottom: 4, fontFamily: 'JetBrains Mono', letterSpacing: 1, textTransform: 'uppercase' }}>Aposta adversário (bb)</label>
          <input type="number" value={bet} onChange={e => setBet(e.target.value)} placeholder="Ex: 6"
            className="w-full px-3 py-2 rounded-lg"
            style={{ background: '#0f0f0f', border: '1px solid #2a2a2e', outline: 'none', color: '#fdfdfd', fontSize: 14 }} />
        </div>
      </div>
      {totalPot > 0 && (
        <div className="rounded-lg p-4 mb-4 text-center" style={{ background: '#0f0f0f', border: '1px solid #2a2a2e' }}>
          <div style={{ color: '#b3b3b8', fontSize: 11, fontFamily: 'JetBrains Mono', letterSpacing: 1 }}>EQUIDADE MINIMA PARA CALL</div>
          <div style={{ color: '#4fce82', fontSize: 36, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{needed.toFixed(1)}%</div>
          <div style={{ color: '#676671', fontSize: 13 }}>Você paga {betVal.toFixed(1)}bb para ganhar {(potVal + betVal).toFixed(1)}bb no pote</div>
        </div>
      )}
      <div>
        <label style={{ color: '#b3b3b8', fontSize: 11, display: 'block', marginBottom: 4, fontFamily: 'JetBrains Mono', letterSpacing: 1, textTransform: 'uppercase' }}>Seus outs (opcional)</label>
        <input type="number" value={outs} onChange={e => setOuts(e.target.value)} placeholder="Ex: 9 (flush draw)"
          className="w-full px-3 py-2 rounded-lg"
          style={{ background: '#0f0f0f', border: '1px solid #2a2a2e', outline: 'none', color: '#fdfdfd', fontSize: 14 }} />
      </div>
      {outsNum > 0 && totalPot > 0 && (
        <div className="mt-4 rounded-lg p-4" style={{ background: '#0f0f0f', border: `2px solid ${shouldCall ? '#4fce82' : '#e5484d'}` }}>
          <div className="grid grid-cols-2 gap-4 text-center mb-3">
            <div>
              <div style={{ color: '#b3b3b8', fontSize: 11, fontFamily: 'JetBrains Mono' }}>EQUITY NO FLOP (x4)</div>
              <div style={{ color: '#f5a623', fontSize: 24, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{equityFlop}%</div>
            </div>
            <div>
              <div style={{ color: '#b3b3b8', fontSize: 11, fontFamily: 'JetBrains Mono' }}>EQUITY NO TURN (x2)</div>
              <div style={{ color: '#f5a623', fontSize: 24, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{equityTurn}%</div>
            </div>
          </div>
          <div className="text-center">
            <span style={{ color: shouldCall ? '#4fce82' : '#e5484d', fontWeight: 700, fontSize: 18 }}>
              {shouldCall ? '✓ CALL é lucrativo' : '✗ FOLD — sem equity suficiente'}
            </span>
            <div style={{ color: '#676671', fontSize: 13, marginTop: 4 }}>
              Precisa de {needed.toFixed(1)}% — você tem {equityFlop}% (flop) / {equityTurn}% (turn)
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// CALCULADORA DE OUTS
// ============================================================
function OutsCalc() {
  const [selected, setSelected] = useState(null)

  const draws = [
    { name: 'Flush Draw', outs: 9, example: 'Dois naipes iguais na mão + dois no board', icon: '♥' },
    { name: 'Straight Draw Aberto (OESD)', outs: 8, example: 'Ex: você tem 87, board tem 9-6 — completa com 5 ou T', icon: '→' },
    { name: 'Gutshot (Straight Fechado)', outs: 4, example: 'Ex: você tem 87, board tem T-6 — só o 9 completa', icon: '|' },
    { name: 'Overcards (dois)', outs: 6, example: 'Você tem AK, board veio baixo — A ou K pode ser top pair', icon: 'AK' },
    { name: 'Flush Draw + Gutshot', outs: 12, example: 'Combinação de draws — muito outs!', icon: '♥+' },
    { name: 'Flush Draw + OESD', outs: 15, example: 'Monstro draw — quase 60% no flop!', icon: '♥→' },
    { name: 'Set (busca full house)', outs: 7, example: 'Você tem set, board pareado — board pair + 4 outs do rank', icon: '🃏' },
  ]

  return (
    <div className="rounded-xl p-4" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
      <h2 style={{ color: '#fdfdfd', fontWeight: 700, marginBottom: 16, fontSize: 18 }}>Calculadora de Outs</h2>
      <div className="space-y-2 mb-4">
        {draws.map(d => (
          <button key={d.name} onClick={() => setSelected(selected?.name === d.name ? null : d)}
            className="w-full text-left rounded-lg p-3 transition-all"
            style={{
              background: selected?.name === d.name ? '#222225' : '#0f0f0f',
              border: `1px solid ${selected?.name === d.name ? '#4fce82' : '#2a2a2e'}`
            }}>
            <div className="flex justify-between items-center">
              <div>
                <div style={{ color: '#fdfdfd', fontWeight: 500 }}>{d.name}</div>
                <div style={{ color: '#676671', fontSize: 12 }}>{d.example}</div>
              </div>
              <div className="text-right">
                <div style={{ color: '#4fce82', fontWeight: 700, fontSize: 18, fontFamily: 'JetBrains Mono' }}>{d.outs}</div>
                <div style={{ color: '#676671', fontSize: 11 }}>outs</div>
              </div>
            </div>
          </button>
        ))}
      </div>
      {selected && (
        <div className="rounded-lg p-4" style={{ background: '#0f0f0f', border: '1px solid #4fce8244' }}>
          <div style={{ color: '#4fce82', fontWeight: 700, marginBottom: 12 }}>{selected.name}</div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div style={{ color: '#b3b3b8', fontSize: 11, fontFamily: 'JetBrains Mono' }}>OUTS</div>
              <div style={{ color: '#fdfdfd', fontSize: 28, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{selected.outs}</div>
            </div>
            <div>
              <div style={{ color: '#b3b3b8', fontSize: 11, fontFamily: 'JetBrains Mono' }}>FLOP (x4)</div>
              <div style={{ color: '#f5a623', fontSize: 28, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{selected.outs * 4}%</div>
            </div>
            <div>
              <div style={{ color: '#b3b3b8', fontSize: 11, fontFamily: 'JetBrains Mono' }}>TURN (x2)</div>
              <div style={{ color: '#0a84d7', fontSize: 28, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{selected.outs * 2}%</div>
            </div>
          </div>
          <div style={{ color: '#676671', fontSize: 12, marginTop: 12, textAlign: 'center' }}>
            {selected.outs * 4 >= 50 ? '🔥 Draw monstruoso — você é o favorito!' : selected.outs * 4 >= 35 ? '💪 Draw forte — call com boas pot odds' : selected.outs * 4 >= 20 ? '⚖️ Draw médio — verifique pot odds' : '⚠️ Draw fraco — precise de pot odds excelentes'}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// GUIA PUSH/FOLD
// ============================================================
function PushFoldGuide() {
  const [selectedPos, setSelectedPos] = useState('BTN')

  return (
    <div className="rounded-xl p-4" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
      <h2 style={{ color: '#fdfdfd', fontWeight: 700, marginBottom: 4, fontSize: 18 }}>Guia Push/Fold</h2>
      <p style={{ color: '#676671', fontSize: 13, marginBottom: 16 }}>Ranges de open-shove por posição e stack (5-10bb)</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {POSITIONS_PUSHFOLD.map(p => (
          <button key={p} onClick={() => setSelectedPos(p)}
            className="px-3 py-1 rounded-lg text-sm"
            style={{ background: selectedPos === p ? '#4fce82' : '#0f0f0f', color: selectedPos === p ? '#0f0f0f' : '#b3b3b8', border: '1px solid #2a2a2e', fontWeight: selectedPos === p ? 700 : 400 }}>
            {p}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {STACKS_PUSHFOLD.map(stack => {
          const range = PUSH_FOLD_RANGES[selectedPos]?.[stack] || []
          return (
            <div key={stack} className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #2a2a2e' }}>
              <div className="flex justify-between items-center mb-2">
                <div style={{ color: '#4fce82', fontWeight: 700, fontSize: 16, fontFamily: 'JetBrains Mono' }}>{stack}bb</div>
                <div style={{ color: '#b3b3b8', fontSize: 12 }}>{range.length} mãos</div>
              </div>
              <div style={{ color: '#fdfdfd', fontSize: 12, lineHeight: 1.8, fontFamily: 'JetBrains Mono' }}>
                {range.slice(0, 30).join(', ')}{range.length > 30 ? ` +${range.length - 30} mais` : ''}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// GLOSSÁRIO
// ============================================================
function Glossary() {
  const [search, setSearch] = useState('')
  const filtered = GLOSSARIO.filter(g =>
    g.termo.toLowerCase().includes(search.toLowerCase()) ||
    g.definicao.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="rounded-xl p-4" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
      <h2 style={{ color: '#fdfdfd', fontWeight: 700, marginBottom: 16, fontSize: 18 }}>Glossário</h2>
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Buscar termo... (ex: RFI, CBet, ICM)"
        className="w-full px-3 py-2 rounded-lg mb-4"
        style={{ background: '#0f0f0f', border: '1px solid #2a2a2e', outline: 'none', color: '#fdfdfd', fontSize: 14 }}
      />
      <div className="space-y-2">
        {filtered.map(g => (
          <div key={g.termo} className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #2a2a2e' }}>
            <div style={{ color: '#4fce82', fontWeight: 600, fontSize: 14 }}>{g.termo}</div>
            <div style={{ color: '#fdfdfd', fontSize: 13, marginTop: 3, lineHeight: 1.5 }}>{g.definicao}</div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ color: '#676671', textAlign: 'center', padding: 20 }}>Nenhum termo encontrado</div>}
      </div>
    </div>
  )
}

// ============================================================
// CALCULADORA DE EV
// ============================================================
function EVCalc() {
  const [winPct, setWinPct] = useState('')
  const [winAmt, setWinAmt] = useState('')
  const [loseAmt, setLoseAmt] = useState('')

  const w = parseFloat(winPct) / 100 || 0
  const winVal = parseFloat(winAmt) || 0
  const loseVal = parseFloat(loseAmt) || 0
  const ev = w > 0 ? (w * winVal) - ((1 - w) * loseVal) : 0
  const hasInput = w > 0 && (winVal > 0 || loseVal > 0)

  return (
    <div className="rounded-xl p-4" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
      <h2 style={{ color: '#fdfdfd', fontWeight: 700, marginBottom: 16, fontSize: 18 }}>Calculadora de EV</h2>
      <div className="space-y-3 mb-4">
        <div>
          <label style={{ color: '#b3b3b8', fontSize: 11, display: 'block', marginBottom: 4, fontFamily: 'JetBrains Mono', letterSpacing: 1, textTransform: 'uppercase' }}>Sua equity / chance de ganhar (%)</label>
          <input type="number" value={winPct} onChange={e => setWinPct(e.target.value)} placeholder="Ex: 65"
            className="w-full px-3 py-2 rounded-lg"
            style={{ background: '#0f0f0f', border: '1px solid #2a2a2e', outline: 'none', color: '#fdfdfd', fontSize: 14 }} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={{ color: '#b3b3b8', fontSize: 11, display: 'block', marginBottom: 4, fontFamily: 'JetBrains Mono', letterSpacing: 1, textTransform: 'uppercase' }}>Quanto ganha (bb)</label>
            <input type="number" value={winAmt} onChange={e => setWinAmt(e.target.value)} placeholder="Ex: 20"
              className="w-full px-3 py-2 rounded-lg"
              style={{ background: '#0f0f0f', border: '1px solid #2a2a2e', outline: 'none', color: '#fdfdfd', fontSize: 14 }} />
          </div>
          <div>
            <label style={{ color: '#b3b3b8', fontSize: 11, display: 'block', marginBottom: 4, fontFamily: 'JetBrains Mono', letterSpacing: 1, textTransform: 'uppercase' }}>Quanto perde (bb)</label>
            <input type="number" value={loseAmt} onChange={e => setLoseAmt(e.target.value)} placeholder="Ex: 10"
              className="w-full px-3 py-2 rounded-lg"
              style={{ background: '#0f0f0f', border: '1px solid #2a2a2e', outline: 'none', color: '#fdfdfd', fontSize: 14 }} />
          </div>
        </div>
      </div>
      {hasInput && (
        <div className="rounded-lg p-4 text-center" style={{ background: '#0f0f0f', border: `2px solid ${ev >= 0 ? '#4fce82' : '#e5484d'}` }}>
          <div style={{ color: '#b3b3b8', fontSize: 11, fontFamily: 'JetBrains Mono', letterSpacing: 1 }}>EXPECTED VALUE</div>
          <div style={{ color: ev >= 0 ? '#4fce82' : '#e5484d', fontSize: 36, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{ev >= 0 ? '+' : ''}{ev.toFixed(2)} bb</div>
          <div style={{ color: '#676671', fontSize: 13, marginTop: 4 }}>
            {ev >= 0 ? '✓ Decisao +EV — lucrativa a longo prazo' : '✗ Decisao -EV — prejuizo a longo prazo'}
          </div>
          <div style={{ color: '#676671', fontSize: 12, marginTop: 8, fontFamily: 'JetBrains Mono' }}>
            ({(w * 100).toFixed(0)}% × {winVal}bb) - ({((1 - w) * 100).toFixed(0)}% × {loseVal}bb) = {ev >= 0 ? '+' : ''}{ev.toFixed(2)}bb
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// GUIA DE BOARD TEXTURE
// ============================================================
function BoardTextureGuide() {
  const textures = [
    { name: 'Board Seco (Dry)', example: 'K♠ 7♥ 2♦', traits: ['Sem draws de flush', 'Sem draws de straight', 'Cartas desconectadas'], strategy: 'CBet com range inteiro, sizing pequeno (25-33%). Vantagem de range do raiser é enorme.', color: '#4fce82' },
    { name: 'Board Molhado (Wet)', example: 'J♥ T♥ 8♠', traits: ['Flush draw possível', 'Muitos straight draws', 'Cartas conectadas'], strategy: 'CBet seletivo com mãos fortes e draws. Sizing maior (66-75%). Check com air.', color: '#e5484d' },
    { name: 'Board Pareado', example: 'Q♠ Q♦ 5♣', traits: ['Uma carta pareada', 'Poucos draws', 'Range de trips reduzido'], strategy: 'CBet pequeno com range amplo. Vilao raramente tem trips. Bom para blefe.', color: '#f5a623' },
    { name: 'Board Monotone', example: 'A♠ 8♠ 3♠', traits: ['Tres cartas do mesmo naipe', 'Flush já possível', 'Flush draw morto'], strategy: 'Check muito. So aposte com flush feito ou nut flush draw. Board perigoso.', color: '#0a84d7' },
    { name: 'Board Alto (High)', example: 'A♠ K♥ J♦', traits: ['Cartas altas', 'Favorece range do raiser', 'Broadway draws'], strategy: 'CBet com frequência alta — seu range tem mais top pairs e overpairs.', color: '#4fce82' },
    { name: 'Board Baixo (Low)', example: '6♣ 4♥ 2♠', traits: ['Cartas baixas', 'Favorece range do caller', 'Sets e two pairs do BB'], strategy: 'Check mais frequentemente. BB tem muitos sets (66, 44, 22) e two pairs.', color: '#e5484d' },
  ]

  return (
    <div className="rounded-xl p-4" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
      <h2 style={{ color: '#fdfdfd', fontWeight: 700, marginBottom: 16, fontSize: 18 }}>Guia de Board Texture</h2>
      <div className="space-y-3">
        {textures.map(t => (
          <div key={t.name} className="rounded-lg p-4" style={{ background: '#0f0f0f', border: `1px solid ${t.color}33` }}>
            <div className="flex justify-between items-start mb-2">
              <div style={{ color: t.color, fontWeight: 700, fontSize: 15 }}>{t.name}</div>
              <div style={{ color: '#b3b3b8', fontSize: 14, fontFamily: 'JetBrains Mono' }}>{t.example}</div>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {t.traits.map(trait => (
                <span key={trait} className="px-2 py-1 rounded text-xs" style={{ background: `${t.color}15`, color: t.color }}>{trait}</span>
              ))}
            </div>
            <div style={{ color: '#b3b3b8', fontSize: 13, lineHeight: 1.5 }}>
              <strong style={{ color: '#fdfdfd' }}>Estrategia:</strong> {t.strategy}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// TABELA 3-BET RANGES
// ============================================================
function ThreeBetGuide() {
  const [selectedSpot, setSelectedSpot] = useState('bb_vs_btn')

  const spots = {
    bb_vs_btn: { label: 'BB vs BTN', value: ['QQ+', 'AKs', 'AKo'], bluff: ['A5s-A2s', 'K5s-K4s', '76s', '65s', '54s'], flatRange: ['22-JJ', 'AQs-A2s', 'AQo-ATo', 'KQs-K9s', 'KQo-KJo', 'QJs-Q9s', 'JTs-J9s', 'T9s-T8s', '98s-97s', '87s-86s', '76s-75s', '65s-64s', '54s'] },
    bb_vs_co: { label: 'BB vs CO', value: ['QQ+', 'AKs', 'AKo'], bluff: ['A5s-A3s', 'K5s', '76s', '65s'], flatRange: ['22-JJ', 'AQs-A7s', 'AQo-AJo', 'KQs-KTs', 'KQo', 'QJs-QTs', 'JTs-J9s', 'T9s', '98s', '87s', '76s'] },
    sb_vs_btn: { label: 'SB vs BTN', value: ['JJ+', 'AKs', 'AQs', 'AKo'], bluff: ['A5s-A2s', 'K9s-K8s', 'Q9s', 'J9s', 'T9s', '98s', '87s', '76s'], flatRange: [] },
    btn_vs_co: { label: 'BTN vs CO', value: ['JJ+', 'AKs', 'AKo'], bluff: ['A5s-A4s', 'ATo', 'KQs', 'KJs', '76s', '65s'], flatRange: ['22-TT', 'AQs-A2s', 'AQo-AJo', 'KQs-K9s', 'KQo-KJo', 'QJs-Q9s', 'JTs-J9s', 'T9s-T8s', '98s-97s', '87s', '76s', '65s'] },
  }

  const spot = spots[selectedSpot]

  return (
    <div className="rounded-xl p-4" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
      <h2 style={{ color: '#fdfdfd', fontWeight: 700, marginBottom: 16, fontSize: 18 }}>3-Bet Ranges</h2>
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(spots).map(([key, s]) => (
          <button key={key} onClick={() => setSelectedSpot(key)}
            className="px-3 py-1 rounded-lg text-sm"
            style={{ background: selectedSpot === key ? '#4fce82' : '#0f0f0f', color: selectedSpot === key ? '#0f0f0f' : '#b3b3b8', border: '1px solid #2a2a2e', fontWeight: selectedSpot === key ? 700 : 400 }}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #4fce8233' }}>
          <div style={{ color: '#4fce82', fontWeight: 700, fontSize: 13, marginBottom: 6, fontFamily: 'JetBrains Mono' }}>3-BET VALOR</div>
          <div style={{ color: '#fdfdfd', fontSize: 14, fontFamily: 'JetBrains Mono' }}>{spot.value.join(', ')}</div>
        </div>
        <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #e5484d33' }}>
          <div style={{ color: '#e5484d', fontWeight: 700, fontSize: 13, marginBottom: 6, fontFamily: 'JetBrains Mono' }}>3-BET BLEFE</div>
          <div style={{ color: '#fdfdfd', fontSize: 14, fontFamily: 'JetBrains Mono' }}>{spot.bluff.join(', ')}</div>
        </div>
        {spot.flatRange.length > 0 && (
          <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #f5a62333' }}>
            <div style={{ color: '#f5a623', fontWeight: 700, fontSize: 13, marginBottom: 6, fontFamily: 'JetBrains Mono' }}>FLAT CALL</div>
            <div style={{ color: '#fdfdfd', fontSize: 14, fontFamily: 'JetBrains Mono' }}>{spot.flatRange.join(', ')}</div>
          </div>
        )}
        {spot.flatRange.length === 0 && (
          <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #f5a62333' }}>
            <div style={{ color: '#f5a623', fontWeight: 700, fontSize: 13, marginBottom: 6, fontFamily: 'JetBrains Mono' }}>FLAT CALL</div>
            <div style={{ color: '#b3b3b8', fontSize: 13 }}>SB não faz flat — 3-bet ou fold (sem posição pos-flop)</div>
          </div>
        )}
      </div>
      <div className="mt-3 rounded-lg p-3" style={{ background: '#0f0f0f' }}>
        <div style={{ color: '#b3b3b8', fontSize: 12, lineHeight: 1.6 }}>
          <strong style={{ color: '#fdfdfd' }}>Dica:</strong> Blefes de 3-bet ideais são mãos suited com Ace (bloqueiam AA/AK) ou suited connectors que tem boa equity quando pagos.
        </div>
      </div>
    </div>
  )
}

// ============================================================
// PÁGINA PRINCIPAL
// ============================================================
export default function Tools() {
  const [activeTab, setActiveTab] = useState('potodds')

  const tabs = [
    { id: 'potodds', label: 'Pot Odds', icon: '🧮' },
    { id: 'outs', label: 'Outs', icon: '🎯' },
    { id: 'ev', label: 'EV', icon: '💰' },
    { id: 'board', label: 'Texturas', icon: '🃏' },
    { id: 'threebet', label: '3-Bet', icon: '🔥' },
    { id: 'pushfold', label: 'Push/Fold', icon: '📊' },
    { id: 'glossario', label: 'Glossário', icon: '📖' },
  ]

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-16 px-4" style={{ background: '#0f0f0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <h1 style={{ color: '#fdfdfd', fontSize: 24, fontWeight: 600, marginBottom: 4 }}>Ferramentas</h1>
        <p style={{ color: '#676671', marginBottom: 24, fontSize: 14 }}>Calculadoras e referências para usar durante o estudo</p>

        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: activeTab === t.id ? '#4fce82' : '#1a1a1d', color: activeTab === t.id ? '#0f0f0f' : '#b3b3b8', border: '1px solid #2a2a2e' }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'potodds' && <PotOddsCalc />}
        {activeTab === 'outs' && <OutsCalc />}
        {activeTab === 'ev' && <EVCalc />}
        {activeTab === 'board' && <BoardTextureGuide />}
        {activeTab === 'threebet' && <ThreeBetGuide />}
        {activeTab === 'pushfold' && <PushFoldGuide />}
        {activeTab === 'glossario' && <Glossary />}
      </div>
    </div>
  )
}
