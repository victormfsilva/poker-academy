import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'
import Card, { randomCard } from '../../components/Card'
import RangeViewer from '../../components/RangeViewer'

const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2']
const SUITS = ['s','h','d','c']

function randomFlop() {
  const cards = []
  while (cards.length < 3) {
    const r = RANKS[Math.floor(Math.random() * RANKS.length)]
    const s = SUITS[Math.floor(Math.random() * SUITS.length)]
    const c = r + s
    if (!cards.includes(c)) cards.push(c)
  }
  return cards
}

function randomHoleCards(exclude) {
  const cards = []
  while (cards.length < 2) {
    const r = RANKS[Math.floor(Math.random() * RANKS.length)]
    const s = SUITS[Math.floor(Math.random() * SUITS.length)]
    const c = r + s
    if (!cards.includes(c) && !exclude.includes(c)) cards.push(c)
  }
  return cards
}

function getBoardTexture(flop) {
  const ranks = flop.map(c => RANKS.indexOf(c.slice(0, -1)))
  const suits = flop.map(c => c.slice(-1))
  const suited = suits[0] === suits[1] || suits[1] === suits[2] || suits[0] === suits[2]
  const sorted = [...ranks].sort((a, b) => a - b)
  const connected = (sorted[2] - sorted[0]) <= 4
  const paired = ranks[0] === ranks[1] || ranks[1] === ranks[2] || ranks[0] === ranks[2]
  const highCard = Math.min(...ranks) // menor índice = carta mais alta

  return { suited, connected, paired, highCard, isWet: suited || connected, isDry: !suited && !connected }
}

function hasTopPair(hole, flop) {
  const flopRanks = flop.map(c => c.slice(0, -1))
  const holeRanks = hole.map(c => c.slice(0, -1))
  const topFlopRank = [...flopRanks].sort((a, b) => RANKS.indexOf(a) - RANKS.indexOf(b))[0]
  return holeRanks.includes(topFlopRank)
}

function hasAnyPair(hole, flop) {
  const flopRanks = flop.map(c => c.slice(0, -1))
  const holeRanks = hole.map(c => c.slice(0, -1))
  return holeRanks.some(r => flopRanks.includes(r))
}

function hasFlushDraw(hole, flop) {
  const allCards = [...hole, ...flop]
  const suitCounts = {}
  allCards.forEach(c => { const s = c.slice(-1); suitCounts[s] = (suitCounts[s] || 0) + 1 })
  // 4 = flush draw, 5 = made flush (não é draw)
  return Object.values(suitCounts).some(v => v === 4)
}

function hasMadeFlush(hole, flop) {
  const allCards = [...hole, ...flop]
  const suitCounts = {}
  allCards.forEach(c => { const s = c.slice(-1); suitCounts[s] = (suitCounts[s] || 0) + 1 })
  return Object.values(suitCounts).some(v => v >= 5)
}

function hasStraightDraw(hole, flop) {
  // Detecta straight draw: 4 cartas num intervalo de 5, onde pelo menos 1 hole card participa
  // Exclui made straights (5 consecutivas)
  const holeRankIdx = hole.map(c => RANKS.indexOf(c.slice(0, -1)))
  const allRanks = [...hole, ...flop].map(c => RANKS.indexOf(c.slice(0, -1)))
  const unique = [...new Set(allRanks)].sort((a, b) => a - b)

  // Checa made straight primeiro (5 consecutivas ou wheel A-2-3-4-5)
  for (let i = 0; i <= unique.length - 5; i++) {
    if (unique[i + 4] - unique[i] === 4) return false // made straight, não é draw
  }
  // Wheel made: A(0) + 2(12) + 3(11) + 4(10) + 5(9)
  if ([0, 9, 10, 11, 12].every(v => unique.includes(v))) return false

  // Checa draw: 4 cartas span <= 4, com hole card participando
  for (let i = 0; i < unique.length - 3; i++) {
    if (unique[i + 3] - unique[i] <= 4) {
      const windowRanks = unique.slice(i, i + 4)
      if (holeRankIdx.some(r => windowRanks.includes(r))) return true
    }
  }
  // Wheel draw: A + 3 de {2,3,4,5} com hole card participando
  const wheelRanks = [0, 9, 10, 11, 12]
  const wheelCount = wheelRanks.filter(v => unique.includes(v)).length
  if (wheelCount >= 4 && holeRankIdx.some(r => wheelRanks.includes(r))) return true

  return false
}

function getCorrectAction(hole, flop) {
  const texture = getBoardTexture(flop)
  const hasTop = hasTopPair(hole, flop)
  const hasFlush = hasFlushDraw(hole, flop)
  const hasStraight = hasStraightDraw(hole, flop)

  // Made flush: mão muito forte
  if (hasMadeFlush(hole, flop)) {
    return { action: 'bet', sizing: '75%', reason: 'Você já completou uma cor (flush)! Mão muito forte — aposte grande (75%) para extrair o máximo de valor.' }
  }

  // Regras CBet IP — seguindo a aula:
  // 33% → board seco (blefe barato, range advantage)
  // 50% → top pair ou melhor, ou semi-draw (flush/straight draw)
  // 75% → mão muito forte (dois pares, set) em board úmido
  // check → board úmido sem equidade nenhuma

  // Mão muito forte (dois pares ou set): bet 75% em board úmido, 50% em seco
  const flopRanks = flop.map(c => c.slice(0, -1))
  const holeRanks = hole.map(c => c.slice(0, -1))
  const isPocketPair = holeRanks[0] === holeRanks[1]
  const hasSet = isPocketPair && flopRanks.includes(holeRanks[0])
  const matchingFlopRanks = [...new Set(holeRanks)].filter(r => flopRanks.includes(r))
  const hasTwoPair = !isPocketPair && matchingFlopRanks.length === 2
  const hasPair = hasAnyPair(hole, flop)

  // Set (trinca): sempre aposta grande
  if (hasSet) {
    if (texture.isWet) {
      return { action: 'bet', sizing: '75%', reason: 'Você fez trinca (set)! Num flop perigoso, aposte grande (75%) — proteja sua mão e extraia valor antes que o adversário complete um draw.' }
    }
    return { action: 'bet', sizing: '75%', reason: 'Você fez trinca (set)! Mão muito forte — aposte grande (75%) para construir o pote e extrair o máximo.' }
  }

  // Dois pares: bet grande em úmido, 50% em seco
  if (hasTwoPair) {
    if (texture.isWet) {
      return { action: 'bet', sizing: '75%', reason: 'Você tem dois pares num flop perigoso — aposte grande (75%) para proteger e extrair valor antes que o adversário complete um draw.' }
    }
    return { action: 'bet', sizing: '50%', reason: 'Você tem dois pares — aposte 50% para extrair valor.' }
  }

  // Top pair: bet 50%
  if (hasTop) {
    return { action: 'bet', sizing: '50%', reason: 'Você acertou o par mais alto do flop — aposte 50% para extrair valor e proteger sua mão.' }
  }

  // Par de bolso acima do flop (overpair): bet 50% para valor/proteção
  if (isPocketPair && !hasSet) {
    const pocketRankIdx = RANKS.indexOf(holeRanks[0])
    const topFlopRankIdx = Math.min(...flopRanks.map(r => RANKS.indexOf(r)))
    if (pocketRankIdx < topFlopRankIdx) {
      // Overpair (par de bolso acima de todas as cartas do flop)
      if (texture.isWet) {
        return { action: 'bet', sizing: '75%', reason: 'Você tem um par de bolso acima de todas as cartas do flop (overpair) num board perigoso — aposte grande (75%) para proteger.' }
      }
      return { action: 'bet', sizing: '50%', reason: 'Você tem um par de bolso acima de todas as cartas do flop (overpair) — aposte 50% para extrair valor. Sua mão provavelmente é a melhor.' }
    }
    // Par de bolso abaixo do flop: trata como par médio
  }

  // Semi-draw (flush ou straight draw): bet 50%
  if (hasFlush || hasStraight) {
    return { action: 'bet', sizing: '50%', reason: 'Você está próximo de completar uma cor ou sequência — aposte 50% mesmo sem ter mão agora. Você tem dois caminhos para ganhar: o adversário pode foldar agora, ou você completa o draw.' }
  }

  // Par médio/baixo (incluindo par de bolso abaixo do flop): bet 50%
  if (hasPair || isPocketPair) {
    if (texture.isWet) {
      return { action: 'bet', sizing: '50%', reason: 'Você tem um par num flop perigoso — aposte 50% para proteger. Deixar o adversário ver cartas de graça pode custar caro se ele tiver draw.' }
    }
    return { action: 'bet', sizing: '50%', reason: 'Você tem um par no flop seco — aposte 50% para extrair valor. Com poucas ameaças de draw, sua mão provavelmente está na frente.' }
  }

  // Board seco sem equidade: bet 33% (blefe barato, range advantage)
  if (texture.isDry) {
    return { action: 'bet', sizing: '33%', reason: 'Flop seco e o adversário checou para você. Aposte barato (33%) — com poucas possibilidades de draw, ele provavelmente vai foldar.' }
  }

  // Board úmido sem equidade nenhuma: check
  return { action: 'check', sizing: null, reason: 'Flop conectado e você não tem nada — nem par, nem draw. Não gaste fichas sem motivo. Passe a vez e veja o que acontece.' }
}

function Lesson({ onComplete }) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>⚡ Módulo 5 — Apostar no Flop (em Posição)</h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Você abriu o pote — agora o flop saiu. O que fazer?</p>
      <div className="space-y-4">
        <Section title="O que é essa Aposta?">
          Quando você é o primeiro a apostar antes do flop e o flop sai, os adversários tendem a esperar que você aposte de novo — porque foi você que atacou primeiro. Essa aposta de continuação existe justamente pra aproveitar essa expectativa e pressionar o adversário.
        </Section>
        <Section title="O Flop Favorece Você ou o Adversário?">
          A primeira coisa que você analisa é: as cartas do flop combinam mais com as mãos que você teria ou com as mãos que o adversário teria?
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #00d4aa' }}>
              <div style={{ color: '#00d4aa', fontWeight: 600 }}>Flop Seco</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Ex: A♠ 7♦ 2♣ (naipes diferentes)<br />Poucas chances de draw. Aposte frequente e barato (33% do pote).</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: "1px solid #e94560" }}>
              <div style={{ color: '#e94560', fontWeight: 600 }}>Flop Conectado</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Ex: 9♠ 8♥ 7♠<br />Muitos draws possíveis. Só aposte se tiver boa mão — caso contrário, passe a vez.</div>
            </div>
          </div>
        </Section>
        <Section title="Quanto Apostar?">
          <div className="grid grid-cols-3 gap-2 mt-2">
            {[['33%', '#00d4aa', 'Flop seco, aposta barata com muitas mãos'], ['50%', '#f5a623', 'Aposta padrão quando tem mão razoável'], ['75%', '#e94560', 'Mão muito forte ou flop perigoso que você conectou bem']].map(([s, c, d]) => (
              <div key={s} className="rounded-lg p-3 text-center" style={{ background: '#0a0a0f', border: `1px solid ${c}` }}>
                <div style={{ color: c, fontWeight: 700, fontSize: 18 }}>{s}</div>
                <div style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>{d}</div>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Quem Conecta Mais com o Flop?">
          Pensa assim: se você abriu de uma posição fechada (como UTG) e o flop vem com Ás-Rei-Valete, você provavelmente tem mais mãos grandes do que o adversário — aposte com confiança. Mas se o flop vem 9-8-7, o adversário do Big Blind pode ter muitas mãos conectadas que você não tem. Aposte menos.
        </Section>
        <Section title="Flop Seco Sem Mão — Aposta Mesmo Assim!">
          Esse é o conceito mais contraintuitivo do módulo: <strong style={{ color: '#e94560' }}>no flop seco, você aposta mesmo sem ter nada.</strong><br /><br />
          Por quê? Porque num flop como A-7-2 com naipes diferentes, o adversário também dificilmente acertou algo — e uma aposta pequena de 33% vai fazer ele foldar a maioria das mãos fracas. Você não precisa ter mão para apostar, precisa ter <strong style={{ color: '#00d4aa' }}>uma boa razão para apostar</strong> — e "ele provavelmente não tem nada" é uma boa razão.
        </Section>
        <Section title="Quando Passar a Vez (não apostar)">
          <ul className="space-y-1 mt-2" style={{ color: '#ccc', fontSize: 14 }}>
            <li>• Flop conectado (ex: 9-8-7) e você não tem nada — aí sim, não aposte</li>
            <li>• Mais de 2 jogadores no pote — alguém quase certamente acertou algo</li>
            <li>• Adversário que já relançou antes — cuidado, ele pode estar esperando</li>
          </ul>
        </Section>
        <Section title="Apostando com Mão vs Apostando sem Mão">
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #00d4aa' }}>
              <div style={{ color: '#00d4aa', fontWeight: 600 }}>Com mão boa</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Você quer que o adversário chame. Tem par forte, dois pares, trinca. Aposta média a grande.</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #e94560' }}>
              <div style={{ color: '#e94560', fontWeight: 600 }}>Sem mão (mas com chance)</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Você quer que foldem ou está tentando completar um draw. Aposta pequena (33%) é mais eficiente.</div>
            </div>
          </div>
        </Section>
      </div>
      <button onClick={onComplete} className="w-full mt-8 py-4 rounded-xl font-bold text-white text-lg" style={{ background: '#e94560' }}>
        Entendi — Quero Treinar ⚡
      </button>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
      <h3 style={{ color: 'white', fontWeight: 600, marginBottom: 8 }}>{title}</h3>
      <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>{children}</div>
    </div>
  )
}

function Trainer() {
  const { progress, recordAnswer, recordSession } = useProgress()
  const [flop, setFlop] = useState(null)
  const [hole, setHole] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [sessionDone, setSessionDone] = useState(false)

  function newHand() {
    if (sessionTotal >= 10) { setSessionDone(true); return }
    const f = randomFlop()
    const h = randomHoleCards(f)
    setFlop(f); setHole(h); setFeedback(null)
  }

  function answer(action, sizing) {
    if (!flop || feedback) return
    const correct = getCorrectAction(hole, flop)
    const isCorrect = action === correct.action && (action === 'check' || sizing === correct.sizing)
    const newStreak = isCorrect ? streak + 1 : 0
    setStreak(newStreak)
    const newTotal = sessionTotal + 1, newCorrect = sessionCorrect + (isCorrect ? 1 : 0)
    setSessionTotal(newTotal); setSessionCorrect(newCorrect)
    recordAnswer(5, isCorrect, newStreak)
    const isLast = newTotal >= 10
    if (isLast) recordSession(5, Math.round((newCorrect / newTotal) * 100))
    setFeedback({ ...correct, userAction: action, isCorrect, isLast })
  }

  function restart() { setSessionCorrect(0); setSessionTotal(0); setStreak(0); setSessionDone(false); setFeedback(null); setFlop(null); setHole(null) }

  if (!flop && !sessionDone) newHand()

  if (sessionDone) {
    const acc = Math.round((sessionCorrect / sessionTotal) * 100)
    return (
      <div className="text-center" style={{ maxWidth: 400, margin: '0 auto', paddingTop: 40 }}>
        <div style={{ fontSize: 60 }}>{acc >= 90 ? '🎉' : '💪'}</div>
        <h2 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginTop: 16 }}>Sessão Completa!</h2>
        <div style={{ color: acc >= 90 ? '#00d4aa' : '#f5a623', fontSize: 36, fontWeight: 700 }}>{acc}%</div>
        <button onClick={restart} className="mt-6 px-8 py-3 rounded-xl font-bold" style={{ background: '#e94560', color: 'white' }}>Nova Sessão</button>
      </div>
    )
  }

  const texture = flop ? getBoardTexture(flop) : null

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <div className="rounded-xl p-3 mb-4 flex justify-between" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
        <div style={{ color: '#888', fontSize: 13 }}>Sessão: {sessionCorrect}/{sessionTotal} · Seq: {streak}</div>
        <div style={{ color: '#888', fontSize: 13 }}>Meta: 10 mãos</div>
      </div>
      <div className="rounded-full h-2 mb-6" style={{ background: '#1e1e2e' }}>
        <div className="rounded-full h-2 transition-all" style={{ width: `${(sessionTotal / 10) * 100}%`, background: '#e94560' }} />
      </div>

      <div className="rounded-xl p-4 mb-4 text-center" style={{ background: '#12121a', border: '1px solid #1e1e2e' }}>
        <div style={{ color: '#888', fontSize: 12 }}>SITUAÇÃO</div>
        <div style={{ color: '#4a90e2', fontSize: 18, fontWeight: 700 }}>Você está IP (em posição)</div>
        <div style={{ color: '#ccc', fontSize: 13, marginTop: 2 }}>Você fez o raise pré-flop. Adversário checou para você no flop.</div>
        {texture && (
          <div className="mt-2 flex gap-2 justify-center flex-wrap">
            <span className="px-2 py-1 rounded text-xs" style={{ background: texture.isDry ? '#00d4aa22' : '#e9456022', color: texture.isDry ? '#00d4aa' : '#e94560' }}>
              {texture.isDry ? 'Board Seco' : 'Board Úmido'}
            </span>
            {texture.suited && <span className="px-2 py-1 rounded text-xs" style={{ background: '#4a90e222', color: '#4a90e2' }}>Flush Draw</span>}
            {texture.connected && <span className="px-2 py-1 rounded text-xs" style={{ background: '#f5a62322', color: '#f5a623' }}>Conectado</span>}
            {texture.paired && <span className="px-2 py-1 rounded text-xs" style={{ background: '#88888822', color: '#888' }}>Pareado</span>}
          </div>
        )}
      </div>

      <div className="mb-4">
        <div style={{ color: '#888', fontSize: 12, marginBottom: 8, textAlign: 'center' }}>SUAS CARTAS</div>
        <div className="flex justify-center gap-3 mb-4">
          {hole?.map((c, i) => <Card key={i} card={c} size="md" />)}
        </div>
        <div style={{ color: '#888', fontSize: 12, marginBottom: 8, textAlign: 'center' }}>FLOP</div>
        <div className="flex justify-center gap-3">
          {flop?.map((c, i) => <Card key={i} card={c} size="md" />)}
        </div>
      </div>

      {!feedback && (
        <div className="space-y-3 mb-4">
          <button onClick={() => answer('check')} className="w-full py-4 rounded-xl font-bold text-xl" style={{ background: '#4a90e2', color: 'white' }}>
            CHECK ✓
          </button>
          <div className="grid grid-cols-3 gap-2">
            {[['33%', '#00d4aa'], ['50%', '#f5a623'], ['75%', '#e94560']].map(([s, c]) => (
              <button key={s} onClick={() => answer('bet', s)} className="py-3 rounded-xl font-bold" style={{ background: c, color: '#0a0a0f' }}>
                BET {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {feedback && (
        <div className="rounded-xl p-4 mb-4" style={{ background: '#12121a', border: `2px solid ${feedback.isCorrect ? '#00d4aa' : '#e94560'}` }}>
          <div style={{ color: feedback.isCorrect ? '#00d4aa' : '#e94560', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
            {feedback.isCorrect ? '✓ Correto!' : '✗ Incorreto'}
          </div>
          <button onClick={newHand} className="w-full py-3 rounded-lg font-semibold mb-4" style={{ background: '#e94560', color: 'white', fontSize: 16 }}>Próxima Mão →</button>
          <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>{feedback.reason}</div>
          <div style={{ color: '#555', fontSize: 12, marginTop: 8 }}>
            Correto: <strong style={{ color: '#f5a623' }}>{feedback.action === 'check' ? 'CHECK' : `BET ${feedback.sizing}`}</strong>
          </div>
          {!feedback.isCorrect && (
            <div className="mt-3 rounded-lg p-3" style={{ background: '#0a0a0f', border: '1px solid #4a90e230' }}>
              <div style={{ color: '#4a90e2', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>📋 Regra geral CBet IP</div>
              <div style={{ color: '#ccc', fontSize: 12, lineHeight: 1.7 }}>
                <div>• <strong style={{ color: '#e94560' }}>Set (trinca)</strong> → BET 75%</div>
                <div>• <strong style={{ color: '#e94560' }}>Dois pares em flop úmido</strong> → BET 75%</div>
                <div>• <strong style={{ color: '#e94560' }}>Overpair em flop úmido</strong> → BET 75%</div>
                <div>• <strong style={{ color: '#f5a623' }}>Top pair / overpair seco / dois pares seco</strong> → BET 50%</div>
                <div>• <strong style={{ color: '#f5a623' }}>Draw de cor ou sequência</strong> → BET 50%</div>
                <div>• <strong style={{ color: '#f5a623' }}>Qualquer par</strong> → BET 50%</div>
                <div>• <strong style={{ color: '#00d4aa' }}>Flop seco sem nada</strong> → BET 33% (blefe barato)</div>
                <div>• <strong style={{ color: '#888' }}>Flop úmido sem nada</strong> → CHECK</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Module5() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[5].lessonRead ? 'trainer' : 'lesson')
  if (!progress.modules[5].unlocked) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
      <div className="text-center"><div style={{ fontSize: 60 }}>🔒</div><h2 style={{ color: 'white', marginTop: 16 }}>Módulo Bloqueado</h2><p style={{ color: '#888', marginTop: 8 }}>Complete o Módulo 4 para desbloquear.</p></div>
    </div>
  )
  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0a0a0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setView('lesson')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'lesson' ? '#e94560' : '#12121a', color: view === 'lesson' ? 'white' : '#888', border: '1px solid #1e1e2e' }}>📖 Aula</button>
          <button onClick={() => progress.modules[5].lessonRead && setView('trainer')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'trainer' ? '#e94560' : '#12121a', color: view === 'trainer' ? 'white' : (progress.modules[5].lessonRead ? '#888' : '#444'), border: '1px solid #1e1e2e', cursor: progress.modules[5].lessonRead ? 'pointer' : 'not-allowed' }}>🎯 Trainer {!progress.modules[5].lessonRead && '🔒'}</button>
        </div>
        {view === 'lesson' ? <Lesson onComplete={() => { markLessonRead(5); setView('trainer') }} /> : <Trainer />}
      </div>
    </div>
  )
}
