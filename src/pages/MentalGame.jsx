import { useState, useEffect } from 'react'

const STORAGE_KEY = 'poker_mental_game'

function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { sessions: [], checkins: [] }
  } catch { return { sessions: [], checkins: [] } }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

// ============================================================
// CHECK-IN PRÉ-SESSÃO
// ============================================================
function PreSessionCheckin({ onComplete }) {
  const [humor, setHumor] = useState(null)
  const [sono, setSono] = useState(null)
  const [estresse, setEstresse] = useState(null)

  const options = [
    { value: 1, label: '😫', desc: 'Pessimo' },
    { value: 2, label: '😕', desc: 'Ruim' },
    { value: 3, label: '😐', desc: 'Ok' },
    { value: 4, label: '🙂', desc: 'Bom' },
    { value: 5, label: '😊', desc: 'Otimo' },
  ]

  const score = (humor || 0) + (sono || 0) + (estresse || 0)
  const allSelected = humor && sono && estresse

  function getRecommendation() {
    if (score >= 13) return { text: 'Voce esta em otimo estado! Jogue com confianca.', color: '#00d4aa', icon: '🟢' }
    if (score >= 10) return { text: 'Estado bom. Jogue normalmente, mas fique atento aos sinais de tilt.', color: '#f5a623', icon: '🟡' }
    if (score >= 7) return { text: 'Estado medio. Considere jogar menos mesas ou sessao mais curta.', color: '#f5a623', icon: '🟠' }
    return { text: 'Estado ruim. Recomendamos NAO jogar agora. Descanse, exercite-se ou medite.', color: '#e94560', icon: '🔴' }
  }

  function handleSave() {
    const data = loadData()
    data.checkins.push({ humor, sono, estresse, score, date: Date.now() })
    saveData(data)
    onComplete()
  }

  const rec = allSelected ? getRecommendation() : null

  function RatingRow({ label, value, onChange }) {
    return (
      <div className="mb-4">
        <div style={{ color: '#aaa', fontSize: 14, marginBottom: 8 }}>{label}</div>
        <div className="flex gap-2">
          {options.map(o => (
            <button key={o.value} onClick={() => onChange(o.value)}
              className="flex-1 py-3 rounded-lg text-center transition-all"
              style={{
                background: value === o.value ? '#1e1e2e' : '#0a0a0f',
                border: `2px solid ${value === o.value ? '#e94560' : '#1e1e2e'}`,
              }}>
              <div style={{ fontSize: 22 }}>{o.label}</div>
              <div style={{ color: '#666', fontSize: 11 }}>{o.desc}</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ color: 'white', fontWeight: 700, fontSize: 18, marginBottom: 16 }}>🧘 Check-in Pre-Sessao</h2>
      <RatingRow label="Como esta seu humor?" value={humor} onChange={setHumor} />
      <RatingRow label="Como dormiu?" value={sono} onChange={setSono} />
      <RatingRow label="Nivel de estresse? (5 = sem estresse)" value={estresse} onChange={setEstresse} />

      {rec && (
        <div className="rounded-xl p-4 mb-4" style={{ background: '#12121a', border: `2px solid ${rec.color}` }}>
          <div className="flex items-center gap-2 mb-2">
            <span style={{ fontSize: 20 }}>{rec.icon}</span>
            <span style={{ color: rec.color, fontWeight: 700, fontSize: 16 }}>Score: {score}/15</span>
          </div>
          <p style={{ color: '#ccc', fontSize: 14, lineHeight: 1.6 }}>{rec.text}</p>
        </div>
      )}

      {allSelected && (
        <button onClick={handleSave} className="w-full py-3 rounded-xl font-bold"
          style={{ background: '#e94560', color: 'white' }}>
          Salvar Check-in
        </button>
      )}
    </div>
  )
}

// ============================================================
// DIÁRIO DE SESSÃO
// ============================================================
function SessionDiary({ onComplete }) {
  const [buyins, setBuyins] = useState('')
  const [result, setResult] = useState('')
  const [emotion, setEmotion] = useState(null)
  const [tiltMoment, setTiltMoment] = useState('')
  const [lesson, setLesson] = useState('')

  const emotions = [
    { value: 'calm', label: '😌', desc: 'Calmo' },
    { value: 'focused', label: '🎯', desc: 'Focado' },
    { value: 'frustrated', label: '😤', desc: 'Frustrado' },
    { value: 'tilted', label: '🤬', desc: 'Tiltado' },
    { value: 'confident', label: '💪', desc: 'Confiante' },
  ]

  function handleSave() {
    const data = loadData()
    data.sessions.push({
      buyins: parseFloat(buyins) || 0,
      result: parseFloat(result) || 0,
      emotion,
      tiltMoment,
      lesson,
      date: Date.now(),
    })
    saveData(data)
    onComplete()
  }

  return (
    <div>
      <h2 style={{ color: 'white', fontWeight: 700, fontSize: 18, marginBottom: 16 }}>📓 Diario de Sessao</h2>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>BUY-INS JOGADOS</label>
          <input type="number" value={buyins} onChange={e => setBuyins(e.target.value)} placeholder="Ex: 3"
            className="w-full px-3 py-2 rounded-lg text-white"
            style={{ background: '#0a0a0f', border: '1px solid #1e1e2e', outline: 'none' }} />
        </div>
        <div>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>RESULTADO (bb)</label>
          <input type="number" value={result} onChange={e => setResult(e.target.value)} placeholder="Ex: -150"
            className="w-full px-3 py-2 rounded-lg text-white"
            style={{ background: '#0a0a0f', border: '1px solid #1e1e2e', outline: 'none' }} />
        </div>
      </div>

      <div className="mb-4">
        <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>COMO VOCE SE SENTIU?</div>
        <div className="flex gap-2">
          {emotions.map(e => (
            <button key={e.value} onClick={() => setEmotion(e.value)}
              className="flex-1 py-3 rounded-lg text-center"
              style={{
                background: emotion === e.value ? '#1e1e2e' : '#0a0a0f',
                border: `2px solid ${emotion === e.value ? '#e94560' : '#1e1e2e'}`,
              }}>
              <div style={{ fontSize: 20 }}>{e.label}</div>
              <div style={{ color: '#666', fontSize: 10 }}>{e.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>MOMENTO DE TILT (opcional)</label>
        <textarea value={tiltMoment} onChange={e => setTiltMoment(e.target.value)}
          placeholder="Descreva um momento em que voce sentiu tilt..."
          className="w-full px-3 py-2 rounded-lg text-white resize-none"
          rows={2}
          style={{ background: '#0a0a0f', border: '1px solid #1e1e2e', outline: 'none' }} />
      </div>

      <div className="mb-4">
        <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>LICAO DA SESSAO (opcional)</label>
        <textarea value={lesson} onChange={e => setLesson(e.target.value)}
          placeholder="O que voce aprendeu hoje?"
          className="w-full px-3 py-2 rounded-lg text-white resize-none"
          rows={2}
          style={{ background: '#0a0a0f', border: '1px solid #1e1e2e', outline: 'none' }} />
      </div>

      <button onClick={handleSave} className="w-full py-3 rounded-xl font-bold"
        style={{ background: '#e94560', color: 'white' }}>
        Salvar Sessao
      </button>
    </div>
  )
}

// ============================================================
// EXERCÍCIOS DE RESPIRAÇÃO
// ============================================================
function BreathingExercise() {
  const [active, setActive] = useState(false)
  const [phase, setPhase] = useState('inhale')
  const [count, setCount] = useState(4)
  const [cycles, setCycles] = useState(0)

  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => {
      setCount(c => {
        if (c <= 1) {
          setPhase(p => {
            if (p === 'inhale') return 'hold'
            if (p === 'hold') return 'exhale'
            setCycles(cy => cy + 1)
            return 'inhale'
          })
          return phase === 'inhale' ? 7 : phase === 'hold' ? 8 : 4
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [active, phase])

  const phaseLabels = { inhale: 'INSPIRE', hold: 'SEGURE', exhale: 'EXPIRE' }
  const phaseColors = { inhale: '#4a90e2', hold: '#f5a623', exhale: '#00d4aa' }

  return (
    <div className="text-center">
      <h2 style={{ color: 'white', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>🫁 Respiracao 4-7-8</h2>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>Tecnica anti-tilt: inspire 4s, segure 7s, expire 8s</p>

      {!active ? (
        <button onClick={() => { setActive(true); setPhase('inhale'); setCount(4); setCycles(0) }}
          className="px-8 py-4 rounded-xl font-bold text-lg"
          style={{ background: '#e94560', color: 'white' }}>
          Iniciar Exercicio
        </button>
      ) : (
        <>
          <div className="rounded-full mx-auto flex items-center justify-center mb-4"
            style={{
              width: 160, height: 160,
              background: `${phaseColors[phase]}15`,
              border: `3px solid ${phaseColors[phase]}`,
              transition: 'all 0.5s ease',
              transform: phase === 'inhale' ? 'scale(1.1)' : phase === 'exhale' ? 'scale(0.9)' : 'scale(1)',
            }}>
            <div>
              <div style={{ color: phaseColors[phase], fontSize: 14, fontWeight: 700 }}>{phaseLabels[phase]}</div>
              <div style={{ color: 'white', fontSize: 48, fontWeight: 700 }}>{count}</div>
            </div>
          </div>
          <div style={{ color: '#666', fontSize: 13 }}>Ciclos completos: {cycles}</div>
          <button onClick={() => setActive(false)}
            className="mt-4 px-6 py-2 rounded-lg text-sm"
            style={{ background: '#1e1e2e', color: '#888' }}>
            Parar
          </button>
        </>
      )}
    </div>
  )
}

// ============================================================
// FRASES DE ANCORAGEM
// ============================================================
function MindsetCards() {
  const phrases = [
    { text: 'Foque no processo, nao no resultado.', category: 'Mindset' },
    { text: 'Uma mao ruim nao define sua sessao.', category: 'Tilt' },
    { text: 'Variance e temporaria. Skill e permanente.', category: 'Variance' },
    { text: 'Se voce esta jogando bem, o resultado vem.', category: 'Processo' },
    { text: 'Tilt e dar dinheiro pros seus oponentes.', category: 'Tilt' },
    { text: 'Cada decisao e independente da anterior.', category: 'Mindset' },
    { text: 'Nao tente recuperar perdas. Jogue seu A-game.', category: 'Tilt' },
    { text: 'O objetivo nao e ganhar toda mao. E tomar boas decisoes.', category: 'Processo' },
    { text: 'Bad beats provam que voce esta colocando o dinheiro como favorito.', category: 'Variance' },
    { text: 'Se voce nao esta no seu melhor, pare. A mesa vai estar la amanha.', category: 'Stop-loss' },
    { text: 'Disciplina e fazer a coisa certa mesmo quando e dificil.', category: 'Mindset' },
    { text: 'Jogadores profissionais focam em bb/100, nao em sessoes individuais.', category: 'Processo' },
  ]

  const [current, setCurrent] = useState(0)

  function next() {
    setCurrent((current + 1) % phrases.length)
  }

  const p = phrases[current]
  const catColor = { Mindset: '#4a90e2', Tilt: '#e94560', Variance: '#f5a623', Processo: '#00d4aa', 'Stop-loss': '#e94560' }

  return (
    <div className="text-center">
      <h2 style={{ color: 'white', fontWeight: 700, fontSize: 18, marginBottom: 20 }}>💎 Frases de Ancoragem</h2>
      <div className="rounded-xl p-6 mb-4" style={{ background: '#12121a', border: '1px solid #1e1e2e', minHeight: 120 }}>
        <span className="px-2 py-1 rounded text-xs font-bold mb-3 inline-block"
          style={{ background: `${catColor[p.category]}22`, color: catColor[p.category] }}>
          {p.category}
        </span>
        <p style={{ color: 'white', fontSize: 20, fontWeight: 600, lineHeight: 1.5, marginTop: 8 }}>"{p.text}"</p>
      </div>
      <button onClick={next} className="px-6 py-3 rounded-xl font-bold"
        style={{ background: '#e94560', color: 'white' }}>
        Proxima Frase →
      </button>
      <div style={{ color: '#555', fontSize: 12, marginTop: 8 }}>{current + 1}/{phrases.length}</div>
    </div>
  )
}

// ============================================================
// HISTÓRICO
// ============================================================
function History() {
  const [data, setData] = useState(loadData)

  const sessions = [...(data.sessions || [])].reverse().slice(0, 20)
  const checkins = [...(data.checkins || [])].reverse().slice(0, 10)

  if (sessions.length === 0 && checkins.length === 0) {
    return (
      <div className="text-center py-12">
        <div style={{ fontSize: 48, marginBottom: 8 }}>📊</div>
        <p style={{ color: '#666' }}>Nenhum registro ainda. Faca um check-in ou registre uma sessao!</p>
      </div>
    )
  }

  const emotionMap = { calm: '😌', focused: '🎯', frustrated: '😤', tilted: '🤬', confident: '💪' }

  return (
    <div>
      <h2 style={{ color: 'white', fontWeight: 700, fontSize: 18, marginBottom: 16 }}>📊 Historico</h2>
      {sessions.length > 0 && (
        <>
          <div style={{ color: '#888', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>SESSOES RECENTES</div>
          <div className="space-y-2 mb-6">
            {sessions.map((s, i) => (
              <div key={i} className="rounded-lg p-3 flex items-center justify-between"
                style={{ background: '#0a0a0f', border: '1px solid #1e1e2e' }}>
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: 20 }}>{emotionMap[s.emotion] || '❓'}</span>
                  <div>
                    <div style={{ color: '#ccc', fontSize: 13 }}>{new Date(s.date).toLocaleDateString('pt-BR')}</div>
                    <div style={{ color: '#666', fontSize: 11 }}>{s.buyins} buy-ins</div>
                  </div>
                </div>
                <div style={{ color: s.result >= 0 ? '#00d4aa' : '#e94560', fontWeight: 700, fontSize: 16 }}>
                  {s.result >= 0 ? '+' : ''}{s.result}bb
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {checkins.length > 0 && (
        <>
          <div style={{ color: '#888', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>CHECK-INS RECENTES</div>
          <div className="space-y-2">
            {checkins.map((c, i) => (
              <div key={i} className="rounded-lg p-3 flex items-center justify-between"
                style={{ background: '#0a0a0f', border: '1px solid #1e1e2e' }}>
                <div style={{ color: '#ccc', fontSize: 13 }}>{new Date(c.date).toLocaleDateString('pt-BR')}</div>
                <div style={{ color: c.score >= 13 ? '#00d4aa' : c.score >= 10 ? '#f5a623' : c.score >= 7 ? '#f5a623' : '#e94560', fontWeight: 700 }}>
                  {c.score}/15
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================
// STOP-LOSS TRACKER
// ============================================================
function StopLoss() {
  const [limit, setLimit] = useState('')
  const [current, setCurrent] = useState('')

  const limitNum = parseFloat(limit) || 0
  const currentNum = parseFloat(current) || 0
  const pct = limitNum > 0 ? Math.min((Math.abs(currentNum) / limitNum) * 100, 100) : 0
  const shouldStop = limitNum > 0 && currentNum < 0 && Math.abs(currentNum) >= limitNum

  return (
    <div>
      <h2 style={{ color: 'white', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>🛑 Stop-Loss Tracker</h2>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>Defina seu limite de perda ANTES da sessao</p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>LIMITE DE PERDA (bb)</label>
          <input type="number" value={limit} onChange={e => setLimit(e.target.value)} placeholder="Ex: 300"
            className="w-full px-3 py-2 rounded-lg text-white"
            style={{ background: '#0a0a0f', border: '1px solid #1e1e2e', outline: 'none' }} />
        </div>
        <div>
          <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>RESULTADO ATUAL (bb)</label>
          <input type="number" value={current} onChange={e => setCurrent(e.target.value)} placeholder="Ex: -150"
            className="w-full px-3 py-2 rounded-lg text-white"
            style={{ background: '#0a0a0f', border: '1px solid #1e1e2e', outline: 'none' }} />
        </div>
      </div>

      {limitNum > 0 && (
        <div className="rounded-xl p-4" style={{ background: '#12121a', border: `2px solid ${shouldStop ? '#e94560' : pct > 60 ? '#f5a623' : '#1e1e2e'}` }}>
          <div className="flex justify-between mb-2">
            <span style={{ color: '#888', fontSize: 12 }}>Perda atual</span>
            <span style={{ color: shouldStop ? '#e94560' : '#888', fontSize: 12, fontWeight: 700 }}>{pct.toFixed(0)}% do limite</span>
          </div>
          <div className="rounded-full h-3" style={{ background: '#1e1e2e' }}>
            <div className="rounded-full h-3 transition-all" style={{
              width: `${pct}%`,
              background: shouldStop ? '#e94560' : pct > 60 ? '#f5a623' : '#00d4aa',
            }} />
          </div>
          {shouldStop && (
            <div className="mt-3 text-center">
              <div style={{ color: '#e94560', fontSize: 20, fontWeight: 700 }}>🛑 PARE DE JOGAR!</div>
              <p style={{ color: '#888', fontSize: 13, marginTop: 4 }}>Voce atingiu seu limite de stop-loss. Encerre a sessao agora.</p>
            </div>
          )}
          {pct > 60 && !shouldStop && (
            <div className="mt-3 text-center">
              <div style={{ color: '#f5a623', fontSize: 14, fontWeight: 600 }}>⚠️ Atencao — proximo do limite</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================
// PÁGINA PRINCIPAL
// ============================================================
export default function MentalGame() {
  const [activeTab, setActiveTab] = useState('checkin')
  const [saved, setSaved] = useState(false)

  const tabs = [
    { id: 'checkin', label: 'Check-in', icon: '🧘' },
    { id: 'diary', label: 'Diario', icon: '📓' },
    { id: 'breathing', label: 'Respiracao', icon: '🫁' },
    { id: 'mindset', label: 'Frases', icon: '💎' },
    { id: 'stoploss', label: 'Stop-Loss', icon: '🛑' },
    { id: 'history', label: 'Historico', icon: '📊' },
  ]

  function handleSaved() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>🧠 Mental Game</h1>
        <p style={{ color: '#666', marginBottom: 24 }}>Controle emocional e anti-tilt</p>

        {saved && (
          <div className="rounded-lg p-3 mb-4 text-center" style={{ background: '#00d4aa22', border: '1px solid #00d4aa' }}>
            <span style={{ color: '#00d4aa', fontWeight: 600 }}>✓ Salvo com sucesso!</span>
          </div>
        )}

        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: activeTab === t.id ? '#e94560' : '#12121a', color: activeTab === t.id ? 'white' : '#888', border: '1px solid #1e1e2e' }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'checkin' && <PreSessionCheckin onComplete={handleSaved} />}
        {activeTab === 'diary' && <SessionDiary onComplete={handleSaved} />}
        {activeTab === 'breathing' && <BreathingExercise />}
        {activeTab === 'mindset' && <MindsetCards />}
        {activeTab === 'stoploss' && <StopLoss />}
        {activeTab === 'history' && <History />}
      </div>
    </div>
  )
}
