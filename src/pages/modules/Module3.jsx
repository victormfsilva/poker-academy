import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'
import Card from '../../components/Card'

// ==================== DADOS E LOGICA ====================

const SUITS = ['h', 'd', 'c', 's']
const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2']
const RANK_VALUES = { A:14, K:13, Q:12, J:11, T:10, 9:9, 8:8, 7:7, 6:6, 5:5, 4:4, 3:3, 2:2 }

function randomCard(exclude = []) {
  const excSet = new Set(exclude.map(c => c.rank + c.suit))
  let card
  do {
    card = { rank: RANKS[Math.floor(Math.random() * 13)], suit: SUITS[Math.floor(Math.random() * 4)] }
  } while (excSet.has(card.rank + card.suit))
  return card
}

function suitName(s) {
  return { h: 'copas', d: 'ouros', c: 'paus', s: 'espadas' }[s] || s
}

// Analisa draws e retorna { type, outs, explanation }
function analyzeDraws(hole, board) {
  const all = [...hole, ...board]

  // Flush draw
  const suitCounts = {}
  all.forEach(c => { suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1 })
  const flushEntry = Object.entries(suitCounts).find(([, count]) => count === 4)
  const hasFlushDraw = !!flushEntry

  // Straight draws
  const values = [...new Set(all.map(c => RANK_VALUES[c.rank]))].sort((a, b) => a - b)
  if (values.includes(14)) values.unshift(1)

  // Verifica se ja tem straight completa (5 consecutivas)
  let hasStraightMade = false
  for (let i = 0; i <= values.length - 5; i++) {
    if (values[i+1] === values[i]+1 && values[i+2] === values[i]+2 && values[i+3] === values[i]+3 && values[i+4] === values[i]+4) {
      hasStraightMade = true; break
    }
  }

  let hasOESD = false
  if (!hasStraightMade) {
    for (let i = 0; i <= values.length - 4; i++) {
      if (values[i+1] === values[i]+1 && values[i+2] === values[i]+2 && values[i+3] === values[i]+3) {
        hasOESD = true; break
      }
    }
  }

  let hasGutshot = false
  if (!hasOESD) {
    for (let start = 1; start <= 10; start++) {
      const window = [start, start+1, start+2, start+3, start+4]
      const count = window.filter(v => values.includes(v)).length
      if (count === 4) { hasGutshot = true; break }
    }
  }

  // Overcards
  const boardValues = board.map(c => RANK_VALUES[c.rank])
  const maxBoard = Math.max(...boardValues)
  const overcards = hole.filter(c => RANK_VALUES[c.rank] > maxBoard)

  // Combinacoes
  if (hasFlushDraw && hasOESD) {
    return { type: 'Flush Draw + Straight Aberto', outs: 15, explanation: `Flush draw (9 outs) + straight aberto (8 outs) - 2 cartas que servem para ambos = 15 outs. Draw monstro!` }
  }
  if (hasFlushDraw && hasGutshot) {
    return { type: 'Flush Draw + Gutshot', outs: 12, explanation: `Flush draw (9 outs) + gutshot (4 outs) - 1 carta repetida = 12 outs. Draw muito forte!` }
  }
  if (overcards.length === 2 && hasGutshot) {
    return { type: 'Duas Overcards + Gutshot', outs: 10, explanation: `Duas overcards (${overcards.map(c => c.rank).join(' e ')}, 6 outs) + gutshot (4 outs) = 10 outs.` }
  }
  if (hasFlushDraw) {
    return { type: 'Flush Draw', outs: 9, explanation: `Você tem 4 cartas de ${suitName(flushEntry[0])}. Faltam 9 cartas desse naipe no baralho (13 - 4 = 9).` }
  }
  if (hasOESD) {
    return { type: 'Straight Aberto (OESD)', outs: 8, explanation: 'Você tem 4 cartas em sequência. Qualquer carta em cada ponta completa = 8 outs.' }
  }
  if (overcards.length > 0) {
    const outs = overcards.length * 3
    return {
      type: overcards.length === 2 ? 'Duas Overcards' : 'Uma Overcard',
      outs,
      explanation: `${overcards.map(c => c.rank).join(' e ')} ${overcards.length > 1 ? 'são maiores' : 'é maior'} que todas as cartas do board. Cada uma tem 3 outs = ${outs} outs.`
    }
  }
  if (hasGutshot) {
    return { type: 'Gutshot (Furo no Meio)', outs: 4, explanation: 'Você tem 4 cartas quase em sequência, mas falta uma no meio. Só 1 valor completa = 4 outs.' }
  }

  return { type: 'Sem Draw Significativo', outs: 0, explanation: 'Você não tem draw de flush, straight ou overcards relevantes.' }
}

// Gera cenario
function generateScenario() {
  const exclude = []
  const hole = []
  for (let i = 0; i < 2; i++) { const c = randomCard(exclude); hole.push(c); exclude.push(c) }

  const boardSize = Math.random() > 0.4 ? 3 : 4
  const board = []
  for (let i = 0; i < boardSize; i++) { const c = randomCard(exclude); board.push(c); exclude.push(c) }

  const draw = analyzeDraws(hole, board)
  const street = board.length === 3 ? 'flop' : 'turn'
  const multiplier = street === 'flop' ? 4 : 2
  const equity = Math.min(draw.outs * multiplier, 100)

  const potSizes = [80, 100, 120, 150, 200]
  const pot = potSizes[Math.floor(Math.random() * potSizes.length)]
  const betPercents = [33, 50, 66, 75, 100]
  const betPct = betPercents[Math.floor(Math.random() * betPercents.length)]
  const bet = Math.round(pot * betPct / 100)
  const totalPot = pot + bet
  const potOdds = Math.round((bet / (totalPot + bet)) * 100)

  return { hole, board, draw, street, multiplier, equity, pot, bet, betPct, totalPot, potOdds }
}

// Gera opcoes numericas
function generateNumericOptions(correct, min = 0, max = 60, spread = 8) {
  const opts = new Set([correct])
  while (opts.size < 4) {
    const delta = Math.floor(Math.random() * spread * 2) - spread
    const val = Math.max(min, Math.min(max, correct + delta))
    if (val !== correct) opts.add(val)
  }
  return [...opts].sort((a, b) => a - b)
}

// Exercicios
function generateOutsExercise() {
  let s, attempts = 0
  do { s = generateScenario(); attempts++ } while (s.draw.outs === 0 && attempts < 30)
  if (s.draw.outs === 0) return generateEVExercise()
  return { ...s, type: 'outs', options: generateNumericOptions(s.draw.outs, 0, 20, 5), correctAnswer: s.draw.outs }
}

function generatePotOddsExercise() {
  const s = generateScenario()
  return { ...s, type: 'potodds', options: generateNumericOptions(s.potOdds, 5, 50, 8), correctAnswer: s.potOdds }
}

function generateDecisionExercise() {
  let s, attempts = 0
  do { s = generateScenario(); attempts++ } while (s.draw.outs === 0 && attempts < 30)
  if (s.draw.outs === 0) return generateEVExercise()
  return { ...s, type: 'decision', correctAnswer: s.equity >= s.potOdds ? 'call' : 'fold' }
}

function generateEVExercise() {
  const winPcts = [25, 30, 35, 40, 45, 50, 55, 60]
  const winPct = winPcts[Math.floor(Math.random() * winPcts.length)]
  const losePct = 100 - winPct
  const winAmounts = [100, 150, 200, 250, 300]
  const loseAmounts = [50, 80, 100, 120, 150]
  const winAmount = winAmounts[Math.floor(Math.random() * winAmounts.length)]
  const loseAmount = loseAmounts[Math.floor(Math.random() * loseAmounts.length)]
  const ev = (winPct / 100 * winAmount) - (losePct / 100 * loseAmount)
  return { type: 'ev', winPct, losePct, winAmount, loseAmount, ev: Math.round(ev), correctAnswer: ev > 0 ? 'positivo' : 'negativo' }
}

function generateExercise() {
  const types = ['outs', 'outs', 'potodds', 'potodds', 'decision', 'decision', 'decision', 'ev']
  const t = types[Math.floor(Math.random() * types.length)]
  switch (t) {
    case 'outs': return generateOutsExercise()
    case 'potodds': return generatePotOddsExercise()
    case 'decision': return generateDecisionExercise()
    default: return generateEVExercise()
  }
}

// ==================== COMPONENTES ====================

function Section({ title, children }) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
      <h3 style={{ color: 'white', fontWeight: 600, marginBottom: 8 }}>{title}</h3>
      <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>{children}</div>
    </div>
  )
}

// ==================== AULA ====================

function Lesson({ onComplete }) {
  const [tab, setTab] = useState('outs')

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="mb-6">
        <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700 }}>
          🧮 Módulo 3 — Pot Odds, Outs e Matemática
        </h1>
        <p style={{ color: '#888', marginTop: 4 }}>A matemática por trás de cada decisão no poker</p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { id: 'outs', label: 'Outs' },
          { id: 'potodds', label: 'Pot Odds' },
          { id: 'implied', label: 'Implied Odds' },
          { id: 'ev', label: 'EV' },
          { id: 'pratica', label: 'Na Prática' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: tab === t.id ? '#e94560' : '#12121a', color: tab === t.id ? 'white' : '#888', border: '1px solid #1e1e2e' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'outs' && (
        <div className="space-y-4">
          <Section title="O que são Outs?">
            Outs são as <strong style={{ color: '#e94560' }}>cartas que faltam no baralho e que melhoram sua mão</strong>. Se você tem 4 cartas do mesmo naipe e precisa de mais uma para fazer flush, as cartas que faltam desse naipe são seus outs.
            <br /><br />
            Pense assim: você está esperando um ônibus. Os outs são quantos ônibus diferentes podem te levar ao destino. Quanto mais outs, mais chance de pegar um.
          </Section>

          <Section title="Quantos Outs em Cada Situação?">
            <div className="space-y-3 mt-2">
              {[
                { name: 'Flush Draw', outs: 9, desc: '4 cartas do mesmo naipe — faltam 9 (13 do naipe - 4 visíveis)', color: '#4a90e2' },
                { name: 'Straight Aberto (OESD)', outs: 8, desc: '4 cartas em sequência — falta 1 carta em cada ponta', color: '#00d4aa' },
                { name: 'Duas Overcards', outs: 6, desc: 'Suas 2 cartas maiores que o board — 3 de cada no baralho', color: '#f5a623' },
                { name: 'Gutshot (Furo no Meio)', outs: 4, desc: 'Quase uma sequência, mas falta 1 carta no meio', color: '#e94560' },
                { name: 'Flush + Straight Aberto', outs: 15, desc: 'Combinação monstro! 9 + 8 - 2 repetidas = 15', color: '#00d4aa' },
                { name: 'Flush + Gutshot', outs: 12, desc: 'Flush draw + furo no meio: 9 + 4 - 1 = 12', color: '#4a90e2' },
              ].map(d => (
                <div key={d.name} className="flex items-start gap-3 rounded-lg p-3" style={{ background: '#0a0a0f', border: `1px solid ${d.color}33` }}>
                  <div className="rounded-lg flex items-center justify-center flex-shrink-0" style={{ width: 44, height: 44, background: `${d.color}22`, color: d.color, fontWeight: 700, fontSize: 18 }}>
                    {d.outs}
                  </div>
                  <div>
                    <div style={{ color: d.color, fontWeight: 600, fontSize: 14 }}>{d.name}</div>
                    <div style={{ color: '#999', fontSize: 13 }}>{d.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Regra do x2 e x4 — Cálculo Rápido">
            Essa é a regra mais útil do poker:
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #00d4aa' }}>
                <div style={{ color: '#00d4aa', fontWeight: 600 }}>No Flop (x4)</div>
                <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Ainda vem 2 cartas (turn + river). Multiplique seus outs por 4.</div>
                <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>9 outs x 4 = ~36%</div>
              </div>
              <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #f5a623' }}>
                <div style={{ color: '#f5a623', fontWeight: 600 }}>No Turn (x2)</div>
                <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Só vem 1 carta (river). Multiplique seus outs por 2.</div>
                <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>9 outs x 2 = ~18%</div>
              </div>
            </div>
          </Section>
        </div>
      )}

      {tab === 'potodds' && (
        <div className="space-y-4">
          <Section title="O que são Pot Odds?">
            Pot odds é a <strong style={{ color: '#e94560' }}>relação entre o que você precisa pagar e o que pode ganhar</strong>. É como calcular se vale a pena pagar para ver a próxima carta.
            <br /><br />
            Imagine que alguém te oferece: pague R$10 para concorrer a R$100. Você só precisa acertar 1 em 11 vezes para sair no lucro. Isso é pot odds.
          </Section>

          <Section title="Como Calcular">
            <div className="rounded-lg p-4 mt-2" style={{ background: '#0a0a0f', border: '1px solid #4a90e2' }}>
              <div style={{ color: '#4a90e2', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
                Fórmula: quanto você paga / pote total após seu call
              </div>
              <div style={{ color: '#ccc', fontSize: 14 }}>
                <strong>Exemplo passo a passo:</strong>
                <ol className="mt-2 space-y-2" style={{ paddingLeft: 20 }}>
                  <li>1. Pote atual: R$100</li>
                  <li>2. Adversário aposta: R$50</li>
                  <li>3. Pote total após seu call: R$100 + R$50 + R$50 = R$200</li>
                  <li>4. Você paga R$50 de R$200 = <strong style={{ color: '#e94560' }}>25%</strong></li>
                  <li>5. Você precisa ganhar 25% das vezes para empatar</li>
                </ol>
              </div>
            </div>
          </Section>

          <Section title="A Decisão: Outs vs Pot Odds">
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #00d4aa' }}>
                <div style={{ color: '#00d4aa', fontWeight: 600 }}>CALL</div>
                <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Sua % de outs é <strong>MAIOR</strong> que a % de pot odds.</div>
                <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>36% de chance vs 25% necessário = CALL</div>
              </div>
              <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #e94560' }}>
                <div style={{ color: '#e94560', fontWeight: 600 }}>FOLD</div>
                <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Sua % de outs é <strong>MENOR</strong> que a % de pot odds.</div>
                <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>16% de chance vs 25% necessário = FOLD</div>
              </div>
            </div>
          </Section>

          <Section title="Tabela Rápida por Tamanho de Aposta">
            <div className="overflow-x-auto mt-2">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ color: '#888', padding: 8, textAlign: 'left', fontSize: 13 }}>Aposta</th>
                    <th style={{ color: '#888', padding: 8, textAlign: 'center', fontSize: 13 }}>% necessária</th>
                    <th style={{ color: '#888', padding: 8, textAlign: 'center', fontSize: 13 }}>Outs min (flop)</th>
                    <th style={{ color: '#888', padding: 8, textAlign: 'center', fontSize: 13 }}>Outs min (turn)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { bet: '33% do pote', pct: 20, outsF: 5, outsT: 10 },
                    { bet: '50% do pote', pct: 25, outsF: 7, outsT: 13 },
                    { bet: '66% do pote', pct: 28, outsF: 7, outsT: 14 },
                    { bet: '75% do pote', pct: 30, outsF: 8, outsT: 15 },
                    { bet: '100% do pote', pct: 33, outsF: 9, outsT: 17 },
                  ].map(r => (
                    <tr key={r.bet} style={{ borderTop: '1px solid #1e1e2e' }}>
                      <td style={{ color: '#ccc', padding: 8, fontSize: 13 }}>{r.bet}</td>
                      <td style={{ color: '#f5a623', padding: 8, textAlign: 'center', fontWeight: 600 }}>{r.pct}%</td>
                      <td style={{ color: '#00d4aa', padding: 8, textAlign: 'center' }}>{r.outsF}+</td>
                      <td style={{ color: '#4a90e2', padding: 8, textAlign: 'center' }}>{r.outsT}+</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      )}

      {tab === 'implied' && (
        <div className="space-y-4">
          <Section title="O que são Implied Odds?">
            Implied odds são o <strong style={{ color: '#e94560' }}>dinheiro extra que você pode ganhar no futuro</strong> se completar seu draw. É um bônus além do pote atual.
            <br /><br />
            Pense assim: você compra um bilhete barato. O prêmio atual não é grande, mas se você ganhar, o adversário provavelmente vai pagar mais apostas no turn e river — aí o prêmio final fica enorme.
          </Section>

          <Section title="Quando Contar com Implied Odds">
            <div className="space-y-3 mt-2">
              <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #00d4aa' }}>
                <div style={{ color: '#00d4aa', fontWeight: 600 }}>Boas Implied Odds</div>
                <ul className="mt-2 space-y-1" style={{ color: '#ccc', fontSize: 13 }}>
                  <li>- Adversário tem muitas fichas (pode pagar mais depois)</li>
                  <li>- Seu draw é discreto (adversário não percebe)</li>
                  <li>- Gutshot que completa straight — difícil de detectar</li>
                </ul>
              </div>
              <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #e94560' }}>
                <div style={{ color: '#e94560', fontWeight: 600 }}>Más Implied Odds</div>
                <ul className="mt-2 space-y-1" style={{ color: '#ccc', fontSize: 13 }}>
                  <li>- Adversário tem poucas fichas (não pode pagar mais)</li>
                  <li>- Seu draw é óbvio (3 cartas do mesmo naipe no board)</li>
                  <li>- Adversário é bom e vai foldar quando você completar</li>
                </ul>
              </div>
            </div>
          </Section>
        </div>
      )}

      {tab === 'ev' && (
        <div className="space-y-4">
          <Section title="O que é EV (Valor Esperado)?">
            EV é o <strong style={{ color: '#e94560' }}>quanto uma jogada vale no longo prazo</strong>. Se você repetisse a mesma situação 1000 vezes, o EV mostra se você sairia no lucro ou no prejuízo.
            <br /><br />
            <strong style={{ color: '#f5a623' }}>EV positivo (+EV)</strong> = jogada lucrativa
            <br />
            <strong style={{ color: '#e94560' }}>EV negativo (-EV)</strong> = jogada que perde dinheiro
          </Section>

          <Section title="Como Calcular">
            <div className="rounded-lg p-4 mt-2" style={{ background: '#0a0a0f', border: '1px solid #4a90e2' }}>
              <div style={{ color: '#4a90e2', fontWeight: 700, marginBottom: 8 }}>
                EV = (% de ganhar x quanto ganha) - (% de perder x quanto perde)
              </div>
              <div style={{ color: '#ccc', fontSize: 14 }}>
                <strong>Exemplo:</strong>
                <ul className="mt-2 space-y-1">
                  <li>40% de chance de ganhar R$200</li>
                  <li>60% de chance de perder R$100</li>
                  <li>EV = (0.40 x 200) - (0.60 x 100) = 80 - 60 = <strong style={{ color: '#00d4aa' }}>+R$20</strong></li>
                  <li>No longo prazo, essa jogada ganha R$20 por vez!</li>
                </ul>
              </div>
            </div>
          </Section>

          <Section title="Decisão Certa com Resultado Ruim">
            Ponto importante: <strong style={{ color: '#e94560' }}>uma decisão certa pode dar resultado ruim numa mão específica</strong>, e tudo bem.
            <br /><br />
            Se você tem 70% de chance e perde, você não errou — você só caiu nos 30%. No longo prazo, tomar essa decisão sempre te deixa no lucro.
            <br /><br />
            Poker não é sobre ganhar toda mão. É sobre tomar a melhor decisão toda vez.
          </Section>
        </div>
      )}

      {tab === 'pratica' && (
        <div className="space-y-4">
          <Section title="Cálculo Mental Rápido na Mesa">
            Na mesa você não tem tempo para cálculos exatos. Use estas aproximações:
            <div className="mt-3 space-y-2">
              {[
                { sit: 'Flush draw no flop', outs: 9, flop: '~36%', turn: '~18%' },
                { sit: 'Straight aberto no flop', outs: 8, flop: '~32%', turn: '~16%' },
                { sit: 'Duas overcards no flop', outs: 6, flop: '~24%', turn: '~12%' },
                { sit: 'Gutshot no flop', outs: 4, flop: '~16%', turn: '~8%' },
                { sit: 'Flush + straight aberto', outs: 15, flop: '~60%', turn: '~30%' },
              ].map(s => (
                <div key={s.sit} className="flex items-center justify-between rounded-lg p-2" style={{ background: '#0a0a0f' }}>
                  <span style={{ color: '#ccc', fontSize: 13 }}>{s.sit}</span>
                  <div className="flex gap-3">
                    <span style={{ color: '#00d4aa', fontSize: 13 }}>Flop: {s.flop}</span>
                    <span style={{ color: '#f5a623', fontSize: 13 }}>Turn: {s.turn}</span>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Regra de Ouro">
            <div className="rounded-lg p-4 mt-2" style={{ background: '#0a0a0f', border: '1px solid #e94560' }}>
              <div style={{ color: '#e94560', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
                Se seus outs x multiplicador {'>'} pot odds → CALL
              </div>
              <div style={{ color: '#ccc', fontSize: 14 }}>
                1. Conte seus outs<br />
                2. Multiplique por 4 (flop) ou 2 (turn)<br />
                3. Compare com a % que você precisa pagar<br />
                4. Sua chance é maior → call. Menor → fold.
              </div>
            </div>
          </Section>

          <Section title="Dicas Finais">
            <ul className="space-y-2 mt-2" style={{ color: '#ccc', fontSize: 14 }}>
              <li>- Pratique contar outs — vai ficar automático</li>
              <li>- Não conte outs "sujos" (cartas que melhoram você mas podem dar mão melhor ao adversário)</li>
              <li>- Com implied odds fortes, pode chamar com menos outs que o necessário</li>
              <li>- Flush draws são os melhores draws — 9 outs no flop = ~36%</li>
              <li>- Gutshots parecem fracos (4 outs) mas são discretos — ótimas implied odds</li>
            </ul>
          </Section>
        </div>
      )}

      <button onClick={onComplete} className="w-full mt-8 py-4 rounded-xl font-bold text-white text-lg" style={{ background: '#e94560' }}>
        Entendi — Quero Treinar
      </button>
    </div>
  )
}

// ==================== TRAINER ====================

function Trainer() {
  const { progress, recordAnswer, recordSession } = useProgress()
  const [exercise, setExercise] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [sessionDone, setSessionDone] = useState(false)

  function newExercise() {
    if (sessionTotal >= 10) { setSessionDone(true); return }
    setExercise(generateExercise())
    setFeedback(null)
  }

  function answer(userAnswer) {
    if (!exercise || feedback) return
    let correct = false
    if (exercise.type === 'outs') correct = parseInt(userAnswer) === exercise.correctAnswer
    else if (exercise.type === 'potodds') correct = parseInt(userAnswer) === exercise.correctAnswer
    else if (exercise.type === 'decision') correct = userAnswer === exercise.correctAnswer
    else if (exercise.type === 'ev') correct = userAnswer === exercise.correctAnswer

    const newStreak = correct ? streak + 1 : 0
    setStreak(newStreak)
    const newTotal = sessionTotal + 1
    const newCorrect = sessionCorrect + (correct ? 1 : 0)
    setSessionTotal(newTotal)
    setSessionCorrect(newCorrect)
    recordAnswer(3, correct, newStreak)

    const isLast = newTotal >= 10
    if (isLast) {
      const accuracy = Math.round((newCorrect / newTotal) * 100)
      recordSession(3, accuracy)
    }
    setFeedback({ correct, userAnswer, isLast })
  }

  function restart() {
    setSessionCorrect(0); setSessionTotal(0); setStreak(0); setSessionDone(false); setFeedback(null); setExercise(null)
  }

  if (!exercise && !sessionDone) newExercise()

  if (sessionDone) {
    const accuracy = Math.round((sessionCorrect / sessionTotal) * 100)
    return (
      <div className="text-center" style={{ maxWidth: 400, margin: '0 auto', paddingTop: 40 }}>
        <div style={{ fontSize: 60 }}>{accuracy >= 90 ? '🎉' : accuracy >= 70 ? '👍' : '💪'}</div>
        <h2 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginTop: 16 }}>Sessão Completa!</h2>
        <div style={{ color: '#888', marginTop: 8 }}>{sessionCorrect}/{sessionTotal} acertos</div>
        <div style={{ color: accuracy >= 90 ? '#00d4aa' : '#f5a623', fontSize: 36, fontWeight: 700, marginTop: 8 }}>{accuracy}%</div>
        {accuracy >= 90
          ? <p style={{ color: '#00d4aa', marginTop: 8 }}>Excelente! Sessão conta para desbloquear o próximo módulo.</p>
          : <p style={{ color: '#888', marginTop: 8 }}>Treine mais para chegar a 90%.</p>}
        <button onClick={restart} className="mt-6 px-8 py-3 rounded-xl font-bold" style={{ background: '#e94560', color: 'white' }}>Nova Sessão</button>
      </div>
    )
  }

  if (!exercise) return null

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      {/* Progresso */}
      <div className="rounded-xl p-3 mb-4 flex justify-between items-center" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
        <div style={{ color: '#888', fontSize: 13 }}>Sessão: {sessionCorrect}/{sessionTotal} · Sequência: {streak}</div>
        <div style={{ color: '#888', fontSize: 13 }}>Meta: 10 (90%+)</div>
      </div>
      <div className="rounded-full h-2 mb-6" style={{ background: '#1e1e2e' }}>
        <div className="rounded-full h-2 transition-all" style={{ width: `${(sessionTotal / 10) * 100}%`, background: '#e94560' }} />
      </div>

      {/* Badge tipo */}
      <div className="mb-4 text-center">
        <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{
          background: exercise.type === 'outs' ? '#4a90e222' : exercise.type === 'potodds' ? '#f5a62322' : exercise.type === 'ev' ? '#00d4aa22' : '#e9456022',
          color: exercise.type === 'outs' ? '#4a90e2' : exercise.type === 'potodds' ? '#f5a623' : exercise.type === 'ev' ? '#00d4aa' : '#e94560',
        }}>
          {exercise.type === 'outs' ? 'Contar Outs' : exercise.type === 'potodds' ? 'Pot Odds' : exercise.type === 'ev' ? 'Valor Esperado (EV)' : 'Decisão Completa'}
        </span>
      </div>

      {/* OUTS */}
      {exercise.type === 'outs' && (
        <div>
          <div className="rounded-xl p-4 mb-4 text-center" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
            <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>SUAS CARTAS</div>
            <div className="flex justify-center gap-3 mb-4">
              {exercise.hole.map((c, i) => <Card key={i} card={c} size="lg" />)}
            </div>
            <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>{exercise.street === 'flop' ? 'FLOP' : 'FLOP + TURN'}</div>
            <div className="flex justify-center gap-2">
              {exercise.board.map((c, i) => <Card key={i} card={c} size="md" />)}
            </div>
          </div>
          <div className="text-center mb-4">
            <div style={{ color: 'white', fontWeight: 600 }}>Quantos outs você tem?</div>
          </div>
          {!feedback && (
            <div className="grid grid-cols-4 gap-3 mb-4">
              {exercise.options.map(opt => (
                <button key={opt} onClick={() => answer(opt)} className="py-4 rounded-xl font-bold text-lg" style={{ background: '#1e1e2e', color: 'white', border: '1px solid #333' }}>{opt}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* POT ODDS */}
      {exercise.type === 'potodds' && (
        <div>
          <div className="rounded-xl p-4 mb-4" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div style={{ color: '#888', fontSize: 12 }}>POTE</div>
                <div style={{ color: '#f5a623', fontSize: 24, fontWeight: 700 }}>{exercise.pot}</div>
              </div>
              <div>
                <div style={{ color: '#888', fontSize: 12 }}>APOSTA</div>
                <div style={{ color: '#e94560', fontSize: 24, fontWeight: 700 }}>{exercise.bet}</div>
              </div>
            </div>
            <div className="text-center mt-3">
              <span style={{ color: '#888', fontSize: 12 }}>Aposta = {exercise.betPct}% do pote</span>
            </div>
          </div>
          <div className="text-center mb-4">
            <div style={{ color: 'white', fontWeight: 600 }}>Qual a % necessária para justificar o call?</div>
            <div style={{ color: '#888', fontSize: 13 }}>seu call / (pote + aposta + seu call)</div>
          </div>
          {!feedback && (
            <div className="grid grid-cols-4 gap-3 mb-4">
              {exercise.options.map(opt => (
                <button key={opt} onClick={() => answer(opt)} className="py-4 rounded-xl font-bold text-lg" style={{ background: '#1e1e2e', color: 'white', border: '1px solid #333' }}>{opt}%</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DECISAO */}
      {exercise.type === 'decision' && (
        <div>
          <div className="rounded-xl p-4 mb-4 text-center" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
            <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>SUAS CARTAS</div>
            <div className="flex justify-center gap-3 mb-4">
              {exercise.hole.map((c, i) => <Card key={i} card={c} size="lg" />)}
            </div>
            <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>{exercise.street === 'flop' ? 'FLOP' : 'FLOP + TURN'}</div>
            <div className="flex justify-center gap-2 mb-4">
              {exercise.board.map((c, i) => <Card key={i} card={c} size="md" />)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><div style={{ color: '#888', fontSize: 12 }}>POTE</div><div style={{ color: '#f5a623', fontSize: 20, fontWeight: 700 }}>{exercise.pot}</div></div>
              <div><div style={{ color: '#888', fontSize: 12 }}>APOSTA</div><div style={{ color: '#e94560', fontSize: 20, fontWeight: 700 }}>{exercise.bet}</div></div>
            </div>
          </div>
          <div className="text-center mb-4">
            <div style={{ color: 'white', fontWeight: 600 }}>Call ou Fold?</div>
            <div style={{ color: '#888', fontSize: 13 }}>Conte outs, calcule chance, compare com pot odds</div>
          </div>
          {!feedback && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <button onClick={() => answer('call')} className="py-5 rounded-xl font-bold text-xl" style={{ background: '#00d4aa', color: '#0a0a0f' }}>CALL</button>
              <button onClick={() => answer('fold')} className="py-5 rounded-xl font-bold text-xl" style={{ background: '#e94560', color: 'white' }}>FOLD</button>
            </div>
          )}
        </div>
      )}

      {/* EV */}
      {exercise.type === 'ev' && (
        <div>
          <div className="rounded-xl p-4 mb-4" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
            <div className="text-center mb-4"><div style={{ color: '#888', fontSize: 12 }}>SITUAÇÃO DE ALL-IN</div></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg p-3 text-center" style={{ background: '#0a0a0f', border: '1px solid #00d4aa33' }}>
                <div style={{ color: '#00d4aa', fontSize: 14, fontWeight: 600 }}>Se ganhar</div>
                <div style={{ color: '#00d4aa', fontSize: 24, fontWeight: 700 }}>+R${exercise.winAmount}</div>
                <div style={{ color: '#888', fontSize: 13 }}>{exercise.winPct}% de chance</div>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ background: '#0a0a0f', border: '1px solid #e9456033' }}>
                <div style={{ color: '#e94560', fontSize: 14, fontWeight: 600 }}>Se perder</div>
                <div style={{ color: '#e94560', fontSize: 24, fontWeight: 700 }}>-R${exercise.loseAmount}</div>
                <div style={{ color: '#888', fontSize: 13 }}>{exercise.losePct}% de chance</div>
              </div>
            </div>
          </div>
          <div className="text-center mb-4">
            <div style={{ color: 'white', fontWeight: 600 }}>Esse call tem EV positivo ou negativo?</div>
            <div style={{ color: '#888', fontSize: 13 }}>(% ganhar x valor) - (% perder x valor)</div>
          </div>
          {!feedback && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <button onClick={() => answer('positivo')} className="py-5 rounded-xl font-bold text-xl" style={{ background: '#00d4aa', color: '#0a0a0f' }}>+EV</button>
              <button onClick={() => answer('negativo')} className="py-5 rounded-xl font-bold text-xl" style={{ background: '#e94560', color: 'white' }}>-EV</button>
            </div>
          )}
        </div>
      )}

      {/* FEEDBACK */}
      {feedback && (
        <div className="rounded-xl p-4 mb-4" style={{ background: '#12121a', border: `2px solid ${feedback.correct ? '#00d4aa' : '#e94560'}` }}>
          <div style={{ color: feedback.correct ? '#00d4aa' : '#e94560', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
            {feedback.correct ? '✓ Correto!' : '✗ Incorreto'}
          </div>
          <button onClick={newExercise} className="w-full py-3 rounded-lg font-semibold mb-4" style={{ background: '#e94560', color: 'white', fontSize: 16 }}>
            Próximo Exercício →
          </button>

          {exercise.type === 'outs' && (
            <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>
              <div style={{ color: '#f5a623', fontWeight: 600, marginBottom: 4 }}>Resposta: {exercise.correctAnswer} outs — {exercise.draw.type}</div>
              {exercise.draw.explanation}
              <div style={{ color: '#888', fontSize: 13, marginTop: 8 }}>No {exercise.street}: {exercise.correctAnswer} x {exercise.multiplier} = ~{exercise.equity}%</div>
            </div>
          )}

          {exercise.type === 'potodds' && (
            <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>
              <div style={{ color: '#f5a623', fontWeight: 600, marginBottom: 4 }}>Resposta: {exercise.correctAnswer}%</div>
              Pote: {exercise.pot} + Aposta: {exercise.bet} = Total: {exercise.totalPot}<br />
              Seu call: {exercise.bet}<br />
              Pot odds: {exercise.bet} / ({exercise.totalPot} + {exercise.bet}) = <strong>{exercise.correctAnswer}%</strong>
            </div>
          )}

          {exercise.type === 'decision' && (
            <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>
              <div style={{ color: '#f5a623', fontWeight: 600, marginBottom: 4 }}>Resposta: {exercise.correctAnswer === 'call' ? 'CALL' : 'FOLD'}</div>
              <strong>Outs:</strong> {exercise.draw.outs} ({exercise.draw.type})<br />
              <strong>Chance:</strong> {exercise.draw.outs} x {exercise.multiplier} = ~{exercise.equity}%<br />
              <strong>Pot odds:</strong> {exercise.potOdds}%<br />
              <div className="rounded-lg p-2 mt-2" style={{ background: exercise.correctAnswer === 'call' ? '#00d4aa11' : '#e9456011', border: `1px solid ${exercise.correctAnswer === 'call' ? '#00d4aa33' : '#e9456033'}` }}>
                {exercise.equity}% {exercise.equity >= exercise.potOdds ? '>' : '<'} {exercise.potOdds}% →{' '}
                <strong style={{ color: exercise.correctAnswer === 'call' ? '#00d4aa' : '#e94560' }}>
                  {exercise.correctAnswer === 'call' ? 'CALL' : 'FOLD'}
                </strong>
              </div>
            </div>
          )}

          {exercise.type === 'ev' && (
            <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>
              <div style={{ color: '#f5a623', fontWeight: 600, marginBottom: 4 }}>Resposta: {exercise.correctAnswer === 'positivo' ? '+EV' : '-EV'}</div>
              ({exercise.winPct}% x R${exercise.winAmount}) - ({exercise.losePct}% x R${exercise.loseAmount})<br />
              = R${Math.round(exercise.winPct / 100 * exercise.winAmount)} - R${Math.round(exercise.losePct / 100 * exercise.loseAmount)}<br />
              = <strong style={{ color: exercise.ev >= 0 ? '#00d4aa' : '#e94560' }}>{exercise.ev >= 0 ? '+' : ''}R${exercise.ev}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ==================== EXPORT ====================

export default function Module3() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[3]?.lessonRead ? 'trainer' : 'lesson')

  function onLessonComplete() {
    markLessonRead(3)
    setView('trainer')
  }

  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setView('lesson')} className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: view === 'lesson' ? '#e94560' : '#12121a', color: view === 'lesson' ? 'white' : '#888', border: '1px solid #1e1e2e' }}>
            📖 Aula
          </button>
          <button onClick={() => progress.modules[3]?.lessonRead && setView('trainer')}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: view === 'trainer' ? '#e94560' : '#12121a', color: view === 'trainer' ? 'white' : (progress.modules[3]?.lessonRead ? '#888' : '#444'), border: '1px solid #1e1e2e', cursor: progress.modules[3]?.lessonRead ? 'pointer' : 'not-allowed' }}>
            🎯 Trainer {!progress.modules[3]?.lessonRead && '🔒'}
          </button>
        </div>
        {view === 'lesson' ? <Lesson onComplete={onLessonComplete} /> : <Trainer />}
      </div>
    </div>
  )
}
