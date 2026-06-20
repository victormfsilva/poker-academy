// ================================================================
// Decision Tree — Mini-arvore visual de decisao no feedback de erro
// Mostra: voce estava AQUI → caminho correto → por que
// ================================================================

export default function DecisionTree({ scenario, result }) {
  if (!scenario || !result || result.isCorrect) return null

  // Gerar arvore baseada no tipo de cenario
  const tree = buildTree(scenario, result)
  if (!tree || !tree.nodes.length) return null

  return (
    <div className="mt-3 rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #2a2a2e' }}>
      <div style={{ color: '#b3b3b8', fontSize: 11, fontWeight: 600, marginBottom: 8, letterSpacing: 0.5 }}>
        ARVORE DE DECISAO
      </div>
      <div style={{ position: 'relative' }}>
        {tree.nodes.map((node, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: i < tree.nodes.length - 1 ? 8 : 0 }}>
            {/* Connector line */}
            <div style={{ width: 20 + node.depth * 16, flexShrink: 0, position: 'relative' }}>
              {i > 0 && (
                <div style={{
                  position: 'absolute', left: (node.depth - 1) * 16 + 8, top: -8,
                  width: 1, height: 16, background: '#2a2a2e',
                }} />
              )}
              {i > 0 && (
                <div style={{
                  position: 'absolute', left: (node.depth - 1) * 16 + 8, top: 8,
                  width: 12 + (node.depth > 1 ? 0 : 0), height: 1, background: '#2a2a2e',
                }} />
              )}
              {/* Dot */}
              <div style={{
                position: 'absolute',
                left: node.depth * 16 + 4,
                top: 5,
                width: 8, height: 8, borderRadius: 4,
                background: node.type === 'correct' ? '#4fce82'
                  : node.type === 'wrong' ? '#e5484d'
                  : node.type === 'acceptable' ? '#f5a623'
                  : '#676671',
                border: node.type === 'root' ? '2px solid #b3b3b8' : 'none',
                boxSizing: 'border-box',
              }} />
            </div>
            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12, fontWeight: 600, lineHeight: 1.3,
                color: node.type === 'correct' ? '#4fce82'
                  : node.type === 'wrong' ? '#e5484d'
                  : node.type === 'acceptable' ? '#f5a623'
                  : '#fdfdfd',
              }}>
                {node.type === 'root' && '📍 '}
                {node.type === 'wrong' && '✗ '}
                {node.type === 'correct' && '✓ '}
                {node.label}
              </div>
              {node.reason && (
                <div style={{ fontSize: 11, color: '#676671', marginTop: 2, lineHeight: 1.4 }}>
                  {node.reason}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function buildTree(scenario, result) {
  const nodes = []

  // Root: a situacao
  const situation = scenario.question || scenario.label || `Modulo ${scenario.moduleId}`
  nodes.push({
    depth: 0,
    type: 'root',
    label: truncate(situation, 60),
  })

  // O que o usuario fez (errado)
  const userChoice = getUserChoice(scenario, result)
  if (userChoice) {
    nodes.push({
      depth: 1,
      type: 'wrong',
      label: `Voce: ${truncate(userChoice, 50)}`,
      reason: getWrongReason(scenario, result),
    })
  }

  // O que era correto
  const correctChoice = getCorrectChoice(scenario, result)
  if (correctChoice) {
    nodes.push({
      depth: 1,
      type: 'correct',
      label: `Correto: ${truncate(correctChoice, 50)}`,
      reason: getCorrectReason(scenario, result),
    })
  }

  // Alternativa aceitavel (se mix)
  if (result.isMix) {
    nodes.push({
      depth: 1,
      type: 'acceptable',
      label: 'Ambas as acoes sao aceitaveis (spot de transicao)',
    })
  }

  return { nodes }
}

function getUserChoice(scenario, result) {
  if (result.isTimeout) return 'Tempo esgotado (nao respondeu)'

  // Cenarios com buttons (Infinite e módulos tipo scenario)
  if (scenario.buttons && result.action) {
    const btn = scenario.buttons.find(b => b.id === result.action)
    return btn?.label || result.action
  }

  // Cenarios com options (módulos 22-27)
  if (scenario.options && result.chosenId) {
    const opt = scenario.options.find(o => o.id === result.chosenId)
    return opt?.label
  }

  // Fallback: inferir do que NAO é correto
  if (scenario.buttons) {
    const wrong = scenario.buttons.find(b => {
      const ev = scenario.evaluate?.(b.id)
      return ev && !ev.isCorrect
    })
    return wrong?.label
  }

  return null
}

function getCorrectChoice(scenario, result) {
  if (result.correctLabel) return result.correctLabel

  // Cenarios com options
  if (scenario.options) {
    const correct = scenario.options.find(o => o.correct)
    return correct?.label
  }

  // Cenarios com buttons + evaluate
  if (scenario.buttons && scenario.evaluate) {
    for (const btn of scenario.buttons) {
      const ev = scenario.evaluate(btn.id)
      if (ev?.isCorrect) return btn.label
    }
  }

  return null
}

function getWrongReason(scenario, result) {
  // Mapear conceitos comuns por tipo de modulo
  const moduleReasons = {
    1: 'Revise o range RFI para esta posicao e stack',
    2: 'Verifique a tabela push/fold para esse stack',
    3: 'Calcule os pot odds e compare com a equity',
    4: 'Revise o range de defesa do BB vs esta posicao',
    5: 'Considere a textura do board pro sizing',
    6: 'SB vs BB tem dinamica propria — revise',
    7: 'Revise o range do SB vs cada posicao de raiser',
    8: 'BTN tem range mais amplo — aproveite a posicao',
    9: 'Avalie se o spot favorece 3-bet por valor ou blefe',
    10: 'Considere frequencia de c-bet do vilao e textura',
    22: 'SPR muda completamente a estrategia pos-flop',
    23: 'Pense em quem tem MAIS maos boas neste board',
    24: 'IP/river = polarize. OOP/flop = merge.',
    25: 'Planeje as 3 streets antes de agir no flop',
    26: 'O sizing deve ser consistente com seu range',
  }
  return moduleReasons[scenario.moduleId] || null
}

function getCorrectReason(scenario, result) {
  // Se tem explanation (modulos 22-27), usar resumido
  if (scenario.explanation) {
    return truncate(scenario.explanation, 80)
  }
  return null
}

function truncate(str, max) {
  if (!str) return ''
  if (str.length <= max) return str
  return str.slice(0, max - 3) + '...'
}
