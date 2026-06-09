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

  const totalPot = (parseFloat(pot) || 0) + (parseFloat(bet) || 0)
  const needed = totalPot > 0 ? ((parseFloat(bet) || 0) / totalPot) * 100 : 0
  const outsNum = parseInt(outs) || 0
  const equityFlop = outsNum * 4
  const equityTurn = outsNum * 2
  const shouldCall = outsNum > 0 && equityFlop >= needed

  return (
    <div className="rounded-xl p-4" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
      <h2 style={{ color: 'white', fontWeight: 700, marginBottom: 16, fontSize: 18 }}>🧮 Calculadora de Pot Odds</h2>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>POTE ATUAL (bb)</label>
          <input type="number" value={pot} onChange={e => setPot(e.target.value)} placeholder="Ex: 10"
            className="w-full px-3 py-2 rounded-lg text-white"
            style={{ background: '#0a0a0f', border: '1px solid #1e1e2e', outline: 'none' }} />
        </div>
        <div>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>APOSTA DO ADVERSÁRIO (bb)</label>
          <input type="number" value={bet} onChange={e => setBet(e.target.value)} placeholder="Ex: 6"
            className="w-full px-3 py-2 rounded-lg text-white"
            style={{ background: '#0a0a0f', border: '1px solid #1e1e2e', outline: 'none' }} />
        </div>
      </div>
      {totalPot > 0 && (
        <div className="rounded-lg p-4 mb-4 text-center" style={{ background: '#0a0a0f', border: '1px solid #1e1e2e' }}>
          <div style={{ color: '#888', fontSize: 12 }}>EQUIDADE MÍNIMA PARA CALL</div>
          <div style={{ color: '#e94560', fontSize: 36, fontWeight: 700 }}>{needed.toFixed(1)}%</div>
          <div style={{ color: '#666', fontSize: 13 }}>Você paga {parseFloat(bet).toFixed(1)}bb para ganhar {totalPot.toFixed(1)}bb no total</div>
        </div>
      )}
      <div>
        <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>SEUS OUTS (opcional)</label>
        <input type="number" value={outs} onChange={e => setOuts(e.target.value)} placeholder="Ex: 9 (flush draw)"
          className="w-full px-3 py-2 rounded-lg text-white"
          style={{ background: '#0a0a0f', border: '1px solid #1e1e2e', outline: 'none' }} />
      </div>
      {outsNum > 0 && totalPot > 0 && (
        <div className="mt-4 rounded-lg p-4" style={{ background: '#0a0a0f', border: `2px solid ${shouldCall ? '#00d4aa' : '#e94560'}` }}>
          <div className="grid grid-cols-2 gap-4 text-center mb-3">
            <div>
              <div style={{ color: '#888', fontSize: 12 }}>EQUITY NO FLOP (x4)</div>
              <div style={{ color: '#f5a623', fontSize: 24, fontWeight: 700 }}>{equityFlop}%</div>
            </div>
            <div>
              <div style={{ color: '#888', fontSize: 12 }}>EQUITY NO TURN (x2)</div>
              <div style={{ color: '#f5a623', fontSize: 24, fontWeight: 700 }}>{equityTurn}%</div>
            </div>
          </div>
          <div className="text-center">
            <span style={{ color: shouldCall ? '#00d4aa' : '#e94560', fontWeight: 700, fontSize: 18 }}>
              {shouldCall ? '✓ CALL é lucrativo' : '✗ FOLD — sem equity suficiente'}
            </span>
            <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>
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
    <div className="rounded-xl p-4" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
      <h2 style={{ color: 'white', fontWeight: 700, marginBottom: 16, fontSize: 18 }}>🎯 Calculadora de Outs</h2>
      <div className="space-y-2 mb-4">
        {draws.map(d => (
          <button key={d.name} onClick={() => setSelected(selected?.name === d.name ? null : d)}
            className="w-full text-left rounded-lg p-3 transition-all"
            style={{
              background: selected?.name === d.name ? '#1e1e2e' : '#0a0a0f',
              border: `1px solid ${selected?.name === d.name ? '#e94560' : '#1e1e2e'}`
            }}>
            <div className="flex justify-between items-center">
              <div>
                <div style={{ color: 'white', fontWeight: 500 }}>{d.name}</div>
                <div style={{ color: '#666', fontSize: 12 }}>{d.example}</div>
              </div>
              <div className="text-right">
                <div style={{ color: '#e94560', fontWeight: 700, fontSize: 18 }}>{d.outs}</div>
                <div style={{ color: '#666', fontSize: 11 }}>outs</div>
              </div>
            </div>
          </button>
        ))}
      </div>
      {selected && (
        <div className="rounded-lg p-4" style={{ background: '#0a0a0f', border: '1px solid #e94560' }}>
          <div style={{ color: '#e94560', fontWeight: 700, marginBottom: 12 }}>{selected.name}</div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div style={{ color: '#888', fontSize: 12 }}>OUTS</div>
              <div style={{ color: 'white', fontSize: 28, fontWeight: 700 }}>{selected.outs}</div>
            </div>
            <div>
              <div style={{ color: '#888', fontSize: 12 }}>FLOP (x4)</div>
              <div style={{ color: '#f5a623', fontSize: 28, fontWeight: 700 }}>{selected.outs * 4}%</div>
            </div>
            <div>
              <div style={{ color: '#888', fontSize: 12 }}>TURN (x2)</div>
              <div style={{ color: '#4a90e2', fontSize: 28, fontWeight: 700 }}>{selected.outs * 2}%</div>
            </div>
          </div>
          <div style={{ color: '#666', fontSize: 12, marginTop: 12, textAlign: 'center' }}>
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
    <div className="rounded-xl p-4" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
      <h2 style={{ color: 'white', fontWeight: 700, marginBottom: 4, fontSize: 18 }}>📊 Guia Push/Fold</h2>
      <p style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>Ranges de open-shove por posição e stack (5-10bb)</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {POSITIONS_PUSHFOLD.map(p => (
          <button key={p} onClick={() => setSelectedPos(p)}
            className="px-3 py-1 rounded-lg text-sm"
            style={{ background: selectedPos === p ? '#e94560' : '#0a0a0f', color: selectedPos === p ? 'white' : '#888', border: '1px solid #1e1e2e' }}>
            {p}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {STACKS_PUSHFOLD.map(stack => {
          const range = PUSH_FOLD_RANGES[selectedPos]?.[stack] || []
          return (
            <div key={stack} className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #1e1e2e' }}>
              <div className="flex justify-between items-center mb-2">
                <div style={{ color: '#e94560', fontWeight: 700, fontSize: 16 }}>{stack}bb</div>
                <div style={{ color: '#888', fontSize: 12 }}>{range.length} mãos</div>
              </div>
              <div style={{ color: '#ccc', fontSize: 12, lineHeight: 1.8, fontFamily: 'Space Mono' }}>
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
    <div className="rounded-xl p-4" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
      <h2 style={{ color: 'white', fontWeight: 700, marginBottom: 16, fontSize: 18 }}>📖 Glossário</h2>
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Buscar termo... (ex: RFI, CBet, ICM)"
        className="w-full px-3 py-2 rounded-lg text-white mb-4"
        style={{ background: '#0a0a0f', border: '1px solid #1e1e2e', outline: 'none' }}
      />
      <div className="space-y-2">
        {filtered.map(g => (
          <div key={g.termo} className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #1e1e2e' }}>
            <div style={{ color: '#e94560', fontWeight: 600, fontSize: 14 }}>{g.termo}</div>
            <div style={{ color: '#ccc', fontSize: 13, marginTop: 3, lineHeight: 1.5 }}>{g.definicao}</div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ color: '#666', textAlign: 'center', padding: 20 }}>Nenhum termo encontrado</div>}
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
    { id: 'pushfold', label: 'Push/Fold', icon: '📊' },
    { id: 'glossario', label: 'Glossário', icon: '📖' },
  ]

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>🧮 Ferramentas</h1>
        <p style={{ color: '#666', marginBottom: 24 }}>Calculadoras e referências para usar durante o estudo</p>

        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: activeTab === t.id ? '#e94560' : '#12121a', color: activeTab === t.id ? 'white' : '#888', border: '1px solid #1e1e2e' }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'potodds' && <PotOddsCalc />}
        {activeTab === 'outs' && <OutsCalc />}
        {activeTab === 'pushfold' && <PushFoldGuide />}
        {activeTab === 'glossario' && <Glossary />}
      </div>
    </div>
  )
}
