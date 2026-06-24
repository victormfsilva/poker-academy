// Monte Carlo equity calculator usando phe
import { evaluateCardCodes, cardCodes } from 'phe'

const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A']
const SUITS = ['s','h','d','c']
const FULL_DECK = []
for (const r of RANKS) for (const s of SUITS) FULL_DECK.push(r + s)

// Calcula equity do hero contra range aleatorio do vilao via Monte Carlo
// hole: ['Ad','4h'], board: ['5c','5d','Ah'], iterations: numero de simulacoes
// Retorna equity em % (0-100)
export function calcEquity(hole, board, iterations = 3000) {
  try {
    const holeCodes = cardCodes(hole)
    const boardCodes = cardCodes(board)
    const usedSet = new Set([...hole, ...board])
    const available = FULL_DECK.filter(c => !usedSet.has(c))
    const availLen = available.length

    let wins = 0, ties = 0

    for (let i = 0; i < iterations; i++) {
      // Fisher-Yates parcial: so precisa de (2 + cartas faltando no board) posicoes
      const arr = [...available]
      const need = 2 + (5 - board.length)
      for (let j = 0; j < need; j++) {
        const k = j + Math.floor(Math.random() * (availLen - j))
        const tmp = arr[j]; arr[j] = arr[k]; arr[k] = tmp
      }

      const villainStr = [arr[0], arr[1]]

      // Completar board se necessario
      let fullBoard = board
      if (board.length < 5) {
        fullBoard = [...board]
        let idx = 2
        while (fullBoard.length < 5) fullBoard.push(arr[idx++])
      }

      const fullBoardCodes = cardCodes(fullBoard)
      const heroScore = evaluateCardCodes([...holeCodes, ...fullBoardCodes])
      const villainScore = evaluateCardCodes([...cardCodes(villainStr), ...fullBoardCodes])

      if (heroScore < villainScore) wins++
      else if (heroScore === villainScore) ties++
    }

    return Math.round(((wins + ties * 0.5) / iterations) * 100)
  } catch {
    return null
  }
}
