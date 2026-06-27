// ================================================================
// Spin & Go Stats Dashboard — Fase 5
// Tracker, Leaks, Heatmap, Bankroll, Stats HU vs 3-Max, Export
// ================================================================
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getSpinStats, getPhaseStats, getLeakReport, getHeatmapData,
  calcBankroll, getVarianceInfo, exportAllRanges, resetSpinTracker,
} from '../lib/spinTracker.js'
import {
  SPIN_OPEN_RANGES, SPIN_PUSH_RANGES, SPIN_CALL_PUSH_RANGES,
} from '../data/spinRanges.js'

// ─── Helpers ────────────────────────────────────────────
function ProfitChart({ data, color }) {
  if (!data || data.length < 2) return null
  const min = Math.min(...data, 0) - 1
  const max = Math.max(...data, 0) + 1
  const range = max - min || 1
  const w = 280, h = 60
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ')
  const zeroY = h - ((0 - min) / range) * h
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <line x1="0" y1={zeroY} x2={w} y2={zeroY} stroke="#2a2a2e" strokeWidth="1" strokeDasharray="3" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function severityColor(s) {
  return s === 'high' ? '#e5484d' : s === 'medium' ? '#f5a623' : '#4fce82'
}

function accuracyColor(acc) {
  if (acc >= 80) return '#4fce82'
  if (acc >= 60) return '#f5a623'
  return '#e5484d'
}

const TABS = ['overview', 'leaks', 'heatmap', 'bankroll', 'export']
const TAB_LABELS = { overview: 'Overview', leaks: 'Leaks', heatmap: 'Heatmap', bankroll: 'Bankroll', export: 'Export' }

// ═══════════════════════════════════════════════════════════
export default function SpinStats() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [buyIn, setBuyIn] = useState(1)
  const [exportFormat, setExportFormat] = useState('hrc')
  const [showReset, setShowReset] = useState(false)

  const stats = getSpinStats()
  const phase = getPhaseStats()
  const leakReport = getLeakReport()
  const heatmap = getHeatmapData()
  const bankroll = calcBankroll(buyIn)
  const variance = getVarianceInfo()

  // ═══════════════════════════════════════════════════════
  // TAB: OVERVIEW
  // ═══════════════════════════════════════════════════════
  function renderOverview() {
    return (
      <>
        {/* Main stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Spins', value: stats.played, color: '#fdfdfd' },
            { label: 'Vitorias', value: stats.wins, color: '#4fce82' },
            { label: 'ITM', value: `${stats.itm}%`, color: Number(stats.itm) >= 33 ? '#4fce82' : '#e5484d' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
              <div style={{ color: '#676671', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</div>
              <div style={{ color: s.color, fontSize: 22, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'ROI', value: `${stats.roi}%`, color: Number(stats.roi) >= 0 ? '#4fce82' : '#e5484d' },
            { label: 'Profit', value: `${stats.profit >= 0 ? '+' : ''}${stats.profit}`, color: stats.profit >= 0 ? '#4fce82' : '#e5484d' },
            { label: 'Avg Mult', value: `${stats.avgMult}x`, color: '#f5a623' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
              <div style={{ color: '#676671', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</div>
              <div style={{ color: s.color, fontSize: 18, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Profit chart */}
        {stats.profitHistory.length >= 2 && (
          <div className="rounded-xl p-4 mb-4" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
            <div style={{ color: '#676671', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
              Profit (buy-ins)
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <ProfitChart data={stats.profitHistory} color={stats.profit >= 0 ? '#4fce82' : '#e5484d'} />
            </div>
          </div>
        )}

        {/* Placement distribution */}
        <div className="rounded-xl p-4 mb-4" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
          <div style={{ color: '#676671', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>
            Distribuicao
          </div>
          {[
            { label: '1o Lugar', value: stats.wins, color: '#f5a623', pct: stats.played > 0 ? (stats.wins / stats.played * 100).toFixed(0) : 0 },
            { label: '2o Lugar', value: stats.second, color: '#b3b3b8', pct: stats.played > 0 ? (stats.second / stats.played * 100).toFixed(0) : 0 },
            { label: '3o Lugar', value: stats.third, color: '#676671', pct: stats.played > 0 ? (stats.third / stats.played * 100).toFixed(0) : 0 },
          ].map(p => (
            <div key={p.label} className="flex items-center gap-2 mb-2">
              <span style={{ color: p.color, fontSize: 12, fontWeight: 600, width: 60 }}>{p.label}</span>
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#2a2a2e', overflow: 'hidden' }}>
                <div style={{ width: `${p.pct}%`, height: '100%', background: p.color, borderRadius: 4 }} />
              </div>
              <span style={{ color: p.color, fontSize: 11, fontFamily: 'JetBrains Mono', width: 40, textAlign: 'right' }}>{p.pct}%</span>
            </div>
          ))}
        </div>

        {/* HU vs 3-Max stats */}
        <div className="rounded-xl p-4 mb-4" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
          <div style={{ color: '#676671', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>
            Acerto por Fase
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg p-3 text-center" style={{ background: '#22222580', border: '1px solid #2a2a2e' }}>
              <div style={{ color: '#f97316', fontSize: 10, fontWeight: 700 }}>3-MAX</div>
              <div style={{ color: accuracyColor(Number(phase.acc3Max)), fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                {phase.acc3Max}%
              </div>
              <div style={{ color: '#676671', fontSize: 10 }}>{phase.hands3Max} decisoes</div>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: '#22222580', border: '1px solid #2a2a2e' }}>
              <div style={{ color: '#0a84d7', fontSize: 10, fontWeight: 700 }}>HEADS-UP</div>
              <div style={{ color: accuracyColor(Number(phase.accHU)), fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                {phase.accHU}%
              </div>
              <div style={{ color: '#676671', fontSize: 10 }}>{phase.handsHU} decisoes</div>
            </div>
          </div>
        </div>

        {/* Last 20 ROI */}
        <div className="rounded-xl p-3 text-center" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
          <div style={{ color: '#676671', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>ROI Ultimos 20</div>
          <div style={{
            color: Number(stats.last20Roi) >= 0 ? '#4fce82' : '#e5484d',
            fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono',
          }}>{stats.last20Roi}%</div>
        </div>
      </>
    )
  }

  // ═══════════════════════════════════════════════════════
  // TAB: LEAKS
  // ═══════════════════════════════════════════════════════
  function renderLeaks() {
    if (leakReport.totalDecisions < 10) {
      return (
        <div className="rounded-xl p-6 text-center" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
          <div style={{ color: '#676671', fontSize: 14 }}>
            Jogue pelo menos 10 maos no Arena Spin para gerar analise de leaks.
          </div>
          <div style={{ color: '#676671', fontSize: 12, marginTop: 8 }}>
            {leakReport.totalDecisions}/10 decisoes registradas
          </div>
        </div>
      )
    }

    if (leakReport.leaks.length === 0) {
      return (
        <div className="rounded-xl p-6 text-center" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
          <div style={{ color: '#4fce82', fontSize: 16, fontWeight: 700 }}>Nenhum Leak Detectado</div>
          <div style={{ color: '#676671', fontSize: 12, marginTop: 4 }}>
            Suas decisoes estao alinhadas com GTO. Continue assim!
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {leakReport.leaks.map(leak => (
          <div key={leak.id} className="rounded-xl p-4" style={{
            background: '#1a1a1d',
            border: `1px solid ${severityColor(leak.severity)}30`,
          }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ color: severityColor(leak.severity), fontSize: 13, fontWeight: 700 }}>
                {leak.label}
              </span>
              <span className="px-2 py-0.5 rounded-full" style={{
                background: `${severityColor(leak.severity)}15`,
                color: severityColor(leak.severity),
                fontSize: 10, fontWeight: 700,
              }}>
                {leak.severity === 'high' ? 'CRITICO' : 'MODERADO'}
              </span>
            </div>
            <div style={{ color: '#b3b3b8', fontSize: 12, lineHeight: 1.5, marginBottom: 6 }}>
              {leak.tip}
            </div>
            <div style={{ color: '#676671', fontSize: 10 }}>
              {leak.count}x ({leak.pct}% das decisoes)
            </div>
          </div>
        ))}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════
  // TAB: HEATMAP
  // ═══════════════════════════════════════════════════════
  function renderHeatmap() {
    if (heatmap.length === 0) {
      return (
        <div className="rounded-xl p-6 text-center" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
          <div style={{ color: '#676671', fontSize: 14 }}>
            Jogue mais maos para gerar o heatmap de spots dificeis.
          </div>
        </div>
      )
    }

    const contextLabel = { open: 'Open', push: 'Push', callPush: 'Call Push', defense: 'Defense' }

    return (
      <div>
        <div style={{ color: '#676671', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
          Piores Spots (menor acerto primeiro)
        </div>
        <div className="space-y-2">
          {heatmap.slice(0, 15).map(entry => (
            <div key={entry.key} className="flex items-center gap-2 rounded-lg px-3 py-2" style={{
              background: '#1a1a1d', border: `1px solid ${accuracyColor(entry.accuracy)}20`,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: `${accuracyColor(entry.accuracy)}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: accuracyColor(entry.accuracy), fontSize: 14, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                  {entry.accuracy}%
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fdfdfd', fontSize: 12, fontWeight: 600 }}>
                  {entry.position} · {entry.stack} · {contextLabel[entry.context] || entry.context}
                </div>
                <div style={{ color: '#676671', fontSize: 10 }}>
                  {entry.phase} · {entry.correct}/{entry.total} corretas
                </div>
              </div>
              <div style={{
                width: 40, height: 6, borderRadius: 3, background: '#2a2a2e', overflow: 'hidden',
              }}>
                <div style={{
                  width: `${entry.accuracy}%`, height: '100%',
                  background: accuracyColor(entry.accuracy), borderRadius: 3,
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════
  // TAB: BANKROLL
  // ═══════════════════════════════════════════════════════
  function renderBankroll() {
    return (
      <>
        {/* Buy-in selector */}
        <div className="rounded-xl p-4 mb-4" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
          <div style={{ color: '#676671', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
            Valor do Buy-in (USD)
          </div>
          <div className="flex gap-2 flex-wrap">
            {[0.25, 0.50, 1, 2, 5, 10, 25, 50].map(v => (
              <button key={v} onClick={() => setBuyIn(v)}
                className="px-3 py-1.5 rounded-lg font-bold"
                style={{
                  background: buyIn === v ? '#f9731620' : '#2a2a2e',
                  color: buyIn === v ? '#f97316' : '#b3b3b8',
                  border: `1px solid ${buyIn === v ? '#f97316' : '#2a2a2e'}`,
                  fontSize: 13, cursor: 'pointer', fontFamily: 'JetBrains Mono',
                }}>
                ${v}
              </button>
            ))}
          </div>
        </div>

        {/* Profiles */}
        <div className="space-y-3 mb-4">
          {bankroll.map(p => (
            <div key={p.label} className="rounded-xl p-4" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ color: '#fdfdfd', fontSize: 14, fontWeight: 700 }}>{p.label}</span>
                <span style={{ color: '#676671', fontSize: 11 }}>{p.desc}</span>
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span style={{ color: '#4fce82', fontSize: 24, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                  ${p.bankroll.toFixed(2)}
                </span>
                <span style={{ color: '#676671', fontSize: 11 }}>({p.buyIns} buy-ins)</span>
              </div>
              <div style={{ color: '#676671', fontSize: 11 }}>{p.note}</div>
            </div>
          ))}
        </div>

        {/* Variance info */}
        <div className="rounded-xl p-4" style={{ background: '#1a1a1d', border: '1px solid #e5484d20' }}>
          <div style={{ color: '#e5484d', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
            Aviso de Variancia
          </div>
          <div style={{ color: '#b3b3b8', fontSize: 12, lineHeight: 1.6 }}>
            {variance.note}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="rounded-lg p-2" style={{ background: '#22222580' }}>
              <div style={{ color: '#676671', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>Mult Medio</div>
              <div style={{ color: '#f5a623', fontSize: 16, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{variance.avgMultiplier}x</div>
            </div>
            <div className="rounded-lg p-2" style={{ background: '#22222580' }}>
              <div style={{ color: '#676671', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>Breakeven Win%</div>
              <div style={{ color: '#0a84d7', fontSize: 16, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{variance.breakeven.weighted}</div>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ═══════════════════════════════════════════════════════
  // TAB: EXPORT
  // ═══════════════════════════════════════════════════════
  function renderExport() {
    const rangesData = { SPIN_OPEN_RANGES, SPIN_PUSH_RANGES, SPIN_CALL_PUSH_RANGES }
    const exported = exportAllRanges(rangesData, exportFormat)

    return (
      <>
        <div className="flex gap-2 mb-4">
          {['hrc', 'icmizer'].map(f => (
            <button key={f} onClick={() => setExportFormat(f)}
              className="px-4 py-2 rounded-lg font-bold"
              style={{
                background: exportFormat === f ? '#f9731620' : '#2a2a2e',
                color: exportFormat === f ? '#f97316' : '#b3b3b8',
                border: `1px solid ${exportFormat === f ? '#f97316' : '#2a2a2e'}`,
                fontSize: 13, cursor: 'pointer', textTransform: 'uppercase',
              }}>
              {f}
            </button>
          ))}
        </div>

        <div className="rounded-xl p-4 mb-4" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ color: '#676671', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
              Ranges ({exportFormat.toUpperCase()})
            </span>
            <button onClick={() => {
              navigator.clipboard.writeText(exported).catch(() => {})
            }}
              className="px-3 py-1 rounded-lg"
              style={{ background: '#4fce8215', color: '#4fce82', border: '1px solid #4fce8230', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              Copiar
            </button>
          </div>
          <pre style={{
            color: '#b3b3b8', fontSize: 11, fontFamily: 'JetBrains Mono',
            maxHeight: 300, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            background: '#0f0f0f', padding: 12, borderRadius: 8,
          }}>
            {exported || 'Nenhum range disponivel'}
          </pre>
        </div>

        <div style={{ color: '#676671', fontSize: 11, lineHeight: 1.5 }}>
          Cole o conteudo no HRC (Hand2Note Range Converter) ou ICMIZER para importar os ranges de Spin & Go.
        </div>
      </>
    )
  }

  // ═══════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <div className="min-h-screen px-4 py-6 pb-28 md:pb-8" style={{ background: '#0f0f0f' }}>
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 style={{ color: '#fdfdfd', fontSize: 22, fontWeight: 700 }}>Spin Stats</h1>
            <p style={{ color: '#f97316', fontSize: 12, fontWeight: 600 }}>Analise completa de performance</p>
          </div>
          <button onClick={() => navigate('/arena-spin')}
            className="px-4 py-2 rounded-xl font-bold"
            style={{ background: '#2a2a2e', color: '#b3b3b8', border: 'none', cursor: 'pointer', fontSize: 12 }}>
            Voltar
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap"
              style={{
                background: tab === t ? '#f9731620' : 'transparent',
                color: tab === t ? '#f97316' : '#676671',
                border: `1px solid ${tab === t ? '#f97316' : 'transparent'}`,
                fontSize: 12, cursor: 'pointer',
              }}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'overview' && renderOverview()}
        {tab === 'leaks' && renderLeaks()}
        {tab === 'heatmap' && renderHeatmap()}
        {tab === 'bankroll' && renderBankroll()}
        {tab === 'export' && renderExport()}

        {/* Reset */}
        <div className="mt-8 text-center">
          {!showReset ? (
            <button onClick={() => setShowReset(true)}
              style={{ color: '#676671', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              Resetar dados
            </button>
          ) : (
            <div className="rounded-xl p-4" style={{ background: '#1a1a1d', border: '1px solid #e5484d30' }}>
              <div style={{ color: '#e5484d', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                Tem certeza? Todos os dados de Spin serao apagados.
              </div>
              <div className="flex gap-2 justify-center">
                <button onClick={() => setShowReset(false)}
                  className="px-4 py-2 rounded-lg"
                  style={{ background: '#2a2a2e', color: '#b3b3b8', border: 'none', cursor: 'pointer', fontSize: 12 }}>
                  Cancelar
                </button>
                <button onClick={() => { resetSpinTracker(); setShowReset(false); window.location.reload() }}
                  className="px-4 py-2 rounded-lg"
                  style={{ background: '#e5484d', color: '#fdfdfd', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                  Apagar Tudo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
