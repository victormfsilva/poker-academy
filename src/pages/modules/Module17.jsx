import { useState } from 'react'
import { useProgress } from '../../context/ProgressContext'
import SessionReview from '../../components/SessionReview'

// ================================================================
// GERADOR DINÂMICO — ICM (Independent Chip Model)
// Templates parametrizados com stacks, posições, mãos, premiação
// ================================================================

const pick = arr => arr[Math.floor(Math.random() * arr.length)]
const randBB = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

const POSITIONS = ['UTG', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB']
const HANDS_PREMIUM = ['AA', 'KK', 'QQ', 'AKs']
const HANDS_STRONG = ['JJ', 'TT', 'AQs', 'AQo', 'AKo']
const HANDS_MEDIUM = ['99', '88', '77', 'AJs', 'ATs', 'KQs', 'KQo']
const HANDS_MARGINAL = ['66', '55', 'A9o', 'A8o', 'KJo', 'QJo', 'KTs', 'JTs']
const HANDS_WEAK = ['A5o', 'A3o', 'K8o', 'Q9o', 'J9o', 'T9o', 'K2o', 'Q7o']

const TEMPLATES = [
  // 1. Bolha — fold mão marginal, deixar short bustar
  () => {
    const players = pick([4, 5, 6])
    const itm = players - 1
    const shortBB = randBB(3, 6)
    const heroBB = randBB(15, 25)
    const heroPos = pick(POSITIONS)
    const hand = pick(HANDS_MARGINAL)
    return {
      situation: `Torneio. Pagam ${itm}. Restam ${players} jogadores. Você tem ${heroBB}bb no ${heroPos}. Short stack tem ${shortBB}bb. Você tem ${hand}.`,
      question: 'O que você faz?',
      options: [
        { id: 'raise', label: 'Raise (ChipEV)', correct: false },
        { id: 'fold', label: 'Fold (ICM)', correct: true },
      ],
      explanation: `Em ChipEV, ${hand} seria raise do ${heroPos}. Mas na bolha com short stack de ${shortBB}bb prestes a bustar, não arrisque fichas. Sobreviver garante premiação.`,
      concept: 'Na bolha, sobrevivência vale mais que fichas. Deixe o short stack bustar.',
    }
  },

  // 2. Mesa final — premium é sempre call
  () => {
    const heroBB = randBB(12, 20)
    const villainBB = randBB(30, 50)
    const hand = pick(HANDS_PREMIUM)
    const prize1 = pick([1000, 2000, 5000])
    const prize2 = Math.round(prize1 * 0.6)
    const prize3 = Math.round(prize1 * 0.4)
    return {
      situation: `Mesa final. 3 jogadores. 1o: $${prize1}, 2o: $${prize2}, 3o: $${prize3}. Você tem ${heroBB}bb (menor stack). Chip leader (${villainBB}bb) shova. Você tem ${hand}.`,
      question: 'O que você faz?',
      options: [
        { id: 'call', label: 'Call', correct: true },
        { id: 'fold', label: 'Fold (ICM)', correct: false },
      ],
      explanation: `${hand} é forte demais pra foldar mesmo com ICM pesado. Contra range amplo de shove do chip leader, ${hand} tem equity enorme. ICM ajusta margens, não elimina premiums.`,
      concept: 'ICM muda margens, não elimina mãos premium. QQ+ e AKs quase nunca são fold.',
    }
  },

  // 3. Satélite — sobrevivência extrema (mas premiums ainda são call)
  () => {
    const totalPlayers = pick([10, 15, 20])
    const vagas = Math.floor(totalPlayers / 2)
    const heroBB = randBB(15, 30)
    const isPremium = Math.random() > 0.5
    const hand = isPremium ? pick(['AA', 'KK', 'QQ']) : pick([...HANDS_MEDIUM.filter(h => h !== '99'), 'AJo', 'KQo'])
    const villainBB = randBB(8, 15)
    const villainPos = pick(['UTG', 'CO', 'BTN'])
    // Em satélite: AA/KK/QQ = call, o resto = fold (ICM extremo)
    const shouldCall = isPremium
    return {
      situation: `Satélite. ${totalPlayers} jogadores, ${vagas} vagas (prêmio igual). Você tem ${heroBB}bb. ${villainPos} (${villainBB}bb) shova. Você tem ${hand} no BB.`,
      question: 'O que você faz?',
      options: [
        { id: 'call', label: 'Call', correct: shouldCall },
        { id: 'fold', label: 'Fold', correct: !shouldCall },
      ],
      explanation: shouldCall
        ? `Mesmo em satélite, ${hand} é forte demais para foldar. Você tem equity massiva contra qualquer range de shove. Fold aqui seria um erro.`
        : `Em satélite com prêmio igual, ICM é EXTREMO. Dobrar fichas não muda seu prêmio. Bustar perde tudo. Com ${heroBB}bb você sobrevive. ${hand} é fold — reserve calls para AA/KK.`,
      concept: 'Em satélites, sobrevivência é prioridade. Mas AA/KK ainda são call — a equity é grande demais para foldar.',
    }
  },

  // 4. Longe da bolha — jogar ChipEV
  () => {
    const remaining = pick([30, 40, 50])
    const itm = Math.floor(remaining * 0.5)
    const heroBB = randBB(25, 40)
    const hand = pick(HANDS_MEDIUM)
    const villainPos = pick(['BTN', 'CO'])
    const heroPos = 'BB'
    return {
      situation: `Torneio. Pagam ${itm}. Restam ${remaining} jogadores. Você tem ${heroBB}bb no ${heroPos}. ${villainPos} fez raise. Você tem ${hand}.`,
      question: 'O que você faz?',
      options: [
        { id: 'call', label: 'Call (ChipEV normal)', correct: true },
        { id: 'fold', label: 'Fold (ICM)', correct: false },
      ],
      explanation: `Longe da bolha (${remaining} restam, pagam ${itm}), ICM tem pouco impacto. ${hand} é call padrão no BB vs ${villainPos}. Jogue ChipEV.`,
      concept: 'ICM só impacta perto da bolha e na mesa final. Longe dela, jogue ChipEV.',
    }
  },

  // 5. Chip leader na FT — pressionar
  () => {
    const players = pick([4, 5, 6])
    const heroBB = randBB(40, 60)
    const hand = pick([...HANDS_MARGINAL, ...HANDS_WEAK.slice(0, 3)])
    const heroPos = pick(['BTN', 'CO', 'SB'])
    return {
      situation: `Mesa final de ${players}. Você é chip leader (${heroBB}bb). Todos os outros têm 10-15bb. Você está no ${heroPos} com ${hand}.`,
      question: 'O que você faz?',
      options: [
        { id: 'raise', label: 'Raise (pressionar)', correct: true },
        { id: 'fold', label: 'Fold (jogar safe)', correct: false },
      ],
      explanation: `Como chip leader, VOCÊ pressiona. Os stacks médios não podem arriscar bustar por causa dos saltos de premiação. ${hand} é raise — abuse da pressão ICM.`,
      concept: 'Chip leader na mesa final deve AUMENTAR agressividade — os outros não podem revidar.',
    }
  },

  // 6. Bolha — short stack vai bustar, não arrisque
  () => {
    const shortBB = pick([2, 3, 4])
    const heroBB = randBB(15, 22)
    const hand = pick(HANDS_WEAK)
    const heroPos = pick(['SB', 'CO', 'BTN'])
    return {
      situation: `Bolha. Short stack tem ${shortBB}bb no BTN (vai bustar em ${shortBB} mãos). Você tem ${heroBB}bb no ${heroPos} com ${hand}. Short foldou.`,
      question: 'O que você faz?',
      options: [
        { id: 'raise', label: 'Raise', correct: false },
        { id: 'fold', label: 'Fold', correct: true },
      ],
      explanation: `Na bolha com short de ${shortBB}bb prestes a bustar, ${hand} não vale o risco. Se perder uma mão grande, pode virar o short stack. Paciência.`,
      concept: 'Na bolha, evite confrontos marginais. O short vai bustar — não assuma o risco.',
    }
  },

  // 7. Início do torneio — ChipEV puro
  () => {
    const players = pick([500, 1000, 2000])
    const itm = Math.floor(players * 0.15)
    const heroBB = pick([80, 100, 120])
    const hand = pick(HANDS_STRONG)
    const villainPos = pick(['UTG', 'LJ', 'HJ'])
    const heroPos = pick(['BTN', 'CO'])
    return {
      situation: `Início do torneio. ${players} jogadores, pagam ${itm}. Você tem ${heroBB}bb. ${villainPos} fez raise. Você está no ${heroPos} com ${hand}.`,
      question: 'O que você faz?',
      options: [
        { id: 'threebet', label: '3-bet (ChipEV)', correct: true },
        { id: 'call', label: 'Flat call (conservador)', correct: false },
      ],
      explanation: `No início, ICM é zero. Jogue ChipEV puro. ${hand} é 3-bet padrão do ${heroPos} vs ${villainPos}. Não jogue conservador sem motivo.`,
      concept: 'No início do torneio, ICM não existe. Jogue para maximizar fichas.',
    }
  },

  // 8. FT — chip leader limpa, hero shova
  () => {
    const players = pick([3, 4, 5])
    const heroBB = randBB(10, 15)
    const chipLeaderBB = randBB(40, 55)
    const hand = pick(['A3o', 'A5o', 'A2o', 'K7o', 'K9o', 'Q9o', 'JTo'])
    return {
      situation: `Mesa final de ${players}. Chip leader (${chipLeaderBB}bb) completa do SB. Você tem ${heroBB}bb no BB com ${hand}.`,
      question: 'O que você faz?',
      options: [
        { id: 'shove', label: 'Shove all-in', correct: true },
        { id: 'check', label: 'Check', correct: false },
      ],
      explanation: `Chip leader limpando = range fraco. ${hand} é bom pra shove — você precisa acumular fichas. ICM não significa nunca arriscar; significa escolher os spots certos.`,
      concept: 'Contra limps do chip leader, shove com range amplo. Limpar = fraqueza = oportunidade.',
    }
  },

  // 9. Satélite com muitos a bustar — paciência
  () => {
    const total = pick([15, 20, 25])
    const vagas = pick([8, 9, 10])
    const heroBB = randBB(6, 10)
    const hand = pick([...HANDS_MEDIUM, ...HANDS_STRONG.slice(2)])
    const heroPos = pick(['BTN', 'CO'])
    return {
      situation: `Satélite. ${total} restam, ${vagas} vagas. Você tem ${heroBB}bb no ${heroPos} com ${hand}. Fold até você.`,
      question: 'O que você faz?',
      options: [
        { id: 'shove', label: 'Shove', correct: false },
        { id: 'fold', label: 'Fold', correct: true },
      ],
      explanation: `Em satélite com ${total} restantes e ${vagas} vagas, ainda faltam ${total - vagas} bustarem. Com ${heroBB}bb você sobrevive muitas rodadas. Paciência garante a vaga.`,
      concept: 'Em satélites, stacks pequenos são enormes quando metade do field precisa bustar.',
    }
  },

  // 10. Bolha — big stack pode chamar shoves
  () => {
    const heroBB = randBB(30, 45)
    const villainBB = randBB(6, 10)
    const hand = pick(['A9o', 'A8o', 'ATo', 'KQo', 'KJs', 'QJs', '99', 'TT'])
    const villainPos = pick(['CO', 'BTN', 'SB'])
    return {
      situation: `Bolha. Você é o maior stack (${heroBB}bb). ${villainPos} (${villainBB}bb) shova. Você está no BB com ${hand}.`,
      question: 'O que você faz?',
      options: [
        { id: 'call', label: 'Call', correct: true },
        { id: 'fold', label: 'Fold', correct: false },
      ],
      explanation: `Como maior stack na bolha, chamar shoves é mais barato em ICM — se perder, ainda tem ${heroBB - villainBB}bb. ${hand} tem boa equity contra range de ${villainBB}bb. Eliminar alguém estoura a bolha.`,
      concept: 'Stacks grandes na bolha podem chamar mais — o custo de perder é menor em ICM.',
    }
  },

  // 11. Mesa final — stack médio com premium vs shove
  () => {
    const heroBB = randBB(18, 28)
    const villainBB = randBB(8, 14)
    const hand = pick(HANDS_PREMIUM)
    const players = pick([4, 5])
    return {
      situation: `Mesa final de ${players}. Você tem ${heroBB}bb. Short (${villainBB}bb) shova do BTN. Você está no BB com ${hand}.`,
      question: 'O que você faz?',
      options: [
        { id: 'call', label: 'Call', correct: true },
        { id: 'fold', label: 'Fold (ICM conservador)', correct: false },
      ],
      explanation: `${hand} é call obrigatório mesmo em ICM pesado. Contra range de shove de ${villainBB}bb, sua equity é enorme. Não folde premiums por medo de ICM.`,
      concept: 'Premiums nunca são fold em ICM. AA/KK/QQ/AKs sempre call contra shoves.',
    }
  },

  // 12. ICM — confronto entre stacks médios é ruim
  () => {
    const heroBB = randBB(18, 25)
    const villainBB = randBB(18, 25)
    const hand = pick(HANDS_MARGINAL)
    const shortBB = randBB(3, 6)
    const heroPos = pick(['CO', 'BTN'])
    const villainPos = pick(['BB', 'SB'])
    return {
      situation: `Mesa final. Short stack tem ${shortBB}bb. Você (${heroBB}bb) e ${villainPos} (${villainBB}bb) são stacks médios. Você está no ${heroPos} com ${hand}.`,
      question: 'O que você faz?',
      options: [
        { id: 'raise', label: 'Raise', correct: false },
        { id: 'fold', label: 'Fold', correct: true },
      ],
      explanation: `Confronto entre stacks médios na FT é o pior cenário em ICM — ambos podem bustar e o short fica vivo. ${hand} não vale o risco. Deixe o short bustar.`,
      concept: 'Em ICM, evite confrontos entre stacks médios. O risco mútuo beneficia o short stack.',
    }
  },

  // 13. Bolha — SB shove com mão ok contra BB passivo
  () => {
    const heroBB = randBB(10, 15)
    const hand = pick(['A7o', 'A5o', 'K9o', 'KTo', 'QJo', '88', '77'])
    const bbBB = randBB(12, 18)
    return {
      situation: `Bolha. Fold até você no SB com ${heroBB}bb. BB tem ${bbBB}bb e joga muito tight na bolha. Você tem ${hand}.`,
      question: 'O que você faz?',
      options: [
        { id: 'shove', label: 'Shove', correct: true },
        { id: 'fold', label: 'Fold', correct: false },
      ],
      explanation: `O BB joga tight na bolha e não vai chamar leve. ${hand} é shove lucrativo — você ganha as blinds sem confronto na maioria das vezes. ICM favorece agressão seletiva.`,
      concept: 'Na bolha, abuse de jogadores que apertam demais. Eles foldham mais que deveriam.',
    }
  },

  // 14. Multi-way all-in na bolha — evitar
  () => {
    const players = pick([5, 6, 7])
    const itm = players - 1
    const heroBB = randBB(20, 30)
    const villain1BB = randBB(15, 25)
    const villain2BB = randBB(10, 18)
    const hand = pick(HANDS_STRONG)
    return {
      situation: `Bolha (${players} restam, pagam ${itm}). ${villain1BB}bb shova do CO. ${villain2BB}bb re-shova do BTN. Voce tem ${heroBB}bb no BB com ${hand}.`,
      question: 'O que voce faz?',
      options: [
        { id: 'call', label: 'Call', correct: false },
        { id: 'fold', label: 'Fold', correct: true },
      ],
      explanation: `Com 2 all-ins na sua frente na bolha, ${hand} é fold. Se um deles bustar, voce garante premiacao sem arriscar nada. O cenario multi-way all-in na bolha é o spot de ICM mais extremo — deixe eles se eliminarem.`,
      concept: 'Quando 2+ jogadores vao all-in na bolha, voce pode foldar quase tudo. Se um bustar, voce lucra sem risco.',
    }
  },

  // 15. Ante stealing na bolha com stack grande
  () => {
    const heroBB = randBB(35, 50)
    const hand = pick([...HANDS_WEAK, ...HANDS_MARGINAL])
    const heroPos = pick(['CO', 'BTN'])
    const antes = pick([0.1, 0.125])
    return {
      situation: `Bolha. Voce é o maior stack (${heroBB}bb) no ${heroPos}. Antes de ${antes}bb por jogador. Fold até voce. Voce tem ${hand}.`,
      question: 'O que voce faz?',
      options: [
        { id: 'raise', label: 'Raise (roubar antes)', correct: true },
        { id: 'fold', label: 'Fold (jogar safe)', correct: false },
      ],
      explanation: `Como maior stack na bolha, ninguém quer confrontar voce. Com antes de ${antes}bb por jogador, tem muito dead money. ${hand} é raise — os stacks médios vao foldar quase tudo por medo de ICM.`,
      concept: 'O chip leader na bolha deve roubar antes agressivamente — ninguém quer arriscar bustar contra voce.',
    }
  },

  // 16. Risk premium — mão boa mas risco alto
  () => {
    const heroBB = randBB(12, 18)
    const villainBB = randBB(25, 40)
    const hand = pick(['AJo', 'ATo', 'KQs', 'KQo', '99', 'TT'])
    const players = pick([4, 5])
    const shortBB = randBB(3, 5)
    return {
      situation: `Mesa final de ${players}. Short tem ${shortBB}bb. Voce tem ${heroBB}bb. Big stack (${villainBB}bb) raisa 3x do CO. Voce está no BB com ${hand}.`,
      question: 'O que voce faz?',
      options: [
        { id: 'call', label: 'Call/3-bet', correct: false },
        { id: 'fold', label: 'Fold', correct: true },
      ],
      explanation: `${hand} é call em ChipEV, mas em ICM o "risk premium" muda tudo. Se perder, voce vira o short stack. Se o short de ${shortBB}bb bustar, voce sobe de premiacao sem fazer nada. O risk premium torna ${hand} fold.`,
      concept: 'Risk premium: em ICM, voce precisa de MAIS equity pra chamar porque bustar custa mais que o pot vale.',
    }
  },

  // 17. Bubble factor explicito
  () => {
    const heroBB = randBB(15, 22)
    const villainBB = randBB(12, 18)
    const hand = pick(['AJo', 'KQo', 'TT', '99', 'ATs'])
    const bf = pick([1.5, 1.8, 2.0, 2.2])
    const players = pick([5, 6])
    const itm = players - 1
    return {
      situation: `Bolha (${players} restam, pagam ${itm}). Bubble factor estimado: ${bf}x. Voce tem ${heroBB}bb. Vilao (${villainBB}bb) shova do BTN. Voce está no BB com ${hand}.`,
      question: `Com bubble factor de ${bf}x, o que voce faz?`,
      options: [
        { id: 'call', label: 'Call', correct: bf <= 1.5 },
        { id: 'fold', label: 'Fold', correct: bf > 1.5 },
      ],
      explanation: bf > 1.5
        ? `Bubble factor ${bf}x: equity necessaria = ${bf}/(1+${bf}) = ${Math.round(bf / (1 + bf) * 100)}%. ${hand} raramente tem isso contra um range de shove equilibrado. Fold.`
        : `Bubble factor ${bf}x é moderado — equity necessaria = ${Math.round(bf / (1 + bf) * 100)}%. ${hand} tem equity suficiente contra range amplo de shove do BTN. Call.`,
      concept: `Bubble factor: equity necessaria = BF/(1+BF). BF 1.0 = 50%. BF 1.5 = 60%. BF 2.0 = 67%.`,
    }
  },

  // 18. ICM spot — 2o vs 3o lugar importa
  () => {
    const prize1 = pick([5000, 10000, 20000])
    const prize2 = Math.round(prize1 * 0.6)
    const prize3 = Math.round(prize1 * 0.35)
    const heroBB = randBB(18, 28)
    const villainBB = randBB(20, 35)
    const shortBB = randBB(5, 8)
    const hand = pick(HANDS_MARGINAL)
    return {
      situation: `Mesa final 3-way. 1o: $${prize1}, 2o: $${prize2}, 3o: $${prize3}. Short tem ${shortBB}bb. Voce (${heroBB}bb) no SB. CO (${villainBB}bb) raisa. Voce tem ${hand}.`,
      question: 'O que voce faz?',
      options: [
        { id: 'call', label: 'Call/3-bet', correct: false },
        { id: 'fold', label: 'Fold', correct: true },
      ],
      explanation: `A diferença entre 2o ($${prize2}) e 3o ($${prize3}) é $${prize2 - prize3}. Se o short bustar, voce garante pelo menos 2o sem risco. ${hand} não vale arriscar $${prize2 - prize3} de EV.`,
      concept: 'Calcule o pay jump real ($). Se esperar o short bustar garante um salto grande, fold mãos marginais.',
    }
  },

  // 19. Early FT — ICM começa a importar
  () => {
    const players = pick([7, 8, 9])
    const heroBB = randBB(20, 35)
    const hand = pick(HANDS_MEDIUM)
    const heroPos = pick(['LJ', 'HJ', 'CO'])
    return {
      situation: `Mesa final começou com ${players} jogadores (você é um deles). Blinds subindo. Voce tem ${heroBB}bb no ${heroPos} com ${hand}. Fold até voce.`,
      question: 'O que voce faz?',
      options: [
        { id: 'raise', label: 'Raise (open)', correct: true },
        { id: 'fold', label: 'Fold (esperar pay jumps)', correct: false },
      ],
      explanation: `No início da FT com ${players} jogadores, ICM ainda é moderado. Apertar demais agora faz voce sangrar fichas nos blinds. ${hand} é open do ${heroPos}. Reserve o ultra-tight para quando tiver 3-4 left.`,
      concept: 'ICM aumenta gradualmente na FT. Com 7-9 left, jogue perto de ChipEV. Ultra-tight só com 3-4 left.',
    }
  },

  // 20. Pay jump grande — fold mão boa
  () => {
    const hand = pick(HANDS_MEDIUM)
    const heroBB = randBB(15, 22)
    const players = pick([3, 4])
    return {
      situation: `Mesa final de ${players}. Pay jump de $${pick([500, 1000, 2000])} entre posições. Outro jogador tem ${pick([4, 5, 6])}bb. Você tem ${heroBB}bb com ${hand}. CO raisa.`,
      question: 'O que você faz?',
      options: [
        { id: 'call', label: 'Call/3-bet', correct: false },
        { id: 'fold', label: 'Fold', correct: true },
      ],
      explanation: `Com pay jump enorme e short prestes a bustar, ${hand} é fold. Cada posição a mais vale muito dinheiro. Sobrevivência > fichas marginais.`,
      concept: 'Quanto maior o pay jump, mais tight você deve jogar — exceto se for o chip leader.',
    }
  },

  // ================================================================
  // LATE GAME MTT — push/fold, reshove, BvB curto, payouts variados
  // ================================================================

  // 21. Push/fold — short stack no BTN
  () => {
    const heroBB = randBB(6, 10)
    const hand = pick(['A2o', 'A5o', 'A8o', 'K9o', 'KTo', 'QJo', 'JTo', '77', '66', '55', 'K5s', 'Q8s', 'J9s'])
    const heroPos = pick(['BTN', 'CO'])
    const players = pick([5, 6, 7])
    const itm = players - pick([1, 2])
    const isNearBubble = players - itm <= 2
    const shouldPush = !isNearBubble || heroBB <= 7
    return {
      situation: `Torneio. ${players} restam, pagam ${itm}. Voce tem ${heroBB}bb no ${heroPos} com ${hand}. Fold ate voce.`,
      question: 'O que voce faz?',
      options: [
        { id: 'shove', label: 'Shove all-in', correct: shouldPush },
        { id: 'fold', label: 'Fold', correct: !shouldPush },
      ],
      explanation: shouldPush
        ? `Com ${heroBB}bb, voce está em zona de push/fold. ${hand} do ${heroPos} é shove — blinds e antes representam parte significativa do seu stack. Esperar mais so te enfraquece.`
        : `Perto da bolha com ${heroBB}bb, ICM pesa. ${hand} não tem equity suficiente contra ranges de call apertados. Espere um spot melhor ou deixe alguem bustar.`,
      concept: `Com 10bb ou menos, sua unica jogada é shove ou fold. Raise/fold nao funciona — voce nao tem fichas pra desistir pos-flop.`,
    }
  },

  // 22. Reshove — 3-bet shove contra open late
  () => {
    const heroBB = randBB(12, 18)
    const hand = pick(['ATo', 'AJo', 'ATs', 'KQs', 'KQo', 'TT', '99', '88', 'AJs'])
    const villainPos = pick(['CO', 'BTN', 'HJ'])
    const villainBB = randBB(25, 40)
    const heroPos = pick(['BB', 'SB'])
    const players = pick([6, 7, 8])
    return {
      situation: `Torneio, ${players} restam. ${villainPos} (${villainBB}bb, jogador ativo) abre 2.5x. Voce tem ${heroBB}bb no ${heroPos} com ${hand}.`,
      question: 'O que voce faz?',
      options: [
        { id: 'reshove', label: 'Reshove all-in', correct: true },
        { id: 'call', label: 'Call', correct: false },
      ],
      explanation: `Com ${heroBB}bb, call e jogar pos-flop OOP é ruim. Reshove com ${hand} explora o range amplo de abertura do ${villainPos}. Voce ganha as blinds + raise sem showdown na maioria das vezes, e quando pago tem equity decente.`,
      concept: 'Reshove (3-bet shove): com 12-18bb, shove sobre aberturas de posicoes tardias. Flat call desperdicava fold equity.',
    }
  },

  // 23. BvB com stacks curtos — SB shove
  () => {
    const heroBB = randBB(8, 14)
    const hand = pick(['K5o', 'K8o', 'Q9o', 'J9o', 'T9o', 'A2o', 'A4o', '55', '66', '44', 'K3s', 'Q7s', 'J8s', 'T7s'])
    const bbBB = randBB(12, 20)
    const players = pick([5, 6])
    return {
      situation: `Mesa final de ${players}. Fold ate voce no SB com ${heroBB}bb. BB tem ${bbBB}bb. Voce tem ${hand}.`,
      question: 'O que voce faz?',
      options: [
        { id: 'shove', label: 'Shove all-in', correct: true },
        { id: 'fold', label: 'Fold', correct: false },
      ],
      explanation: `SB vs BB com ${heroBB}bb e fold ate voce, o range de shove é MUITO amplo. ${hand} é shove lucrativo — BB precisa de mao forte pra chamar por causa de ICM (mesmo stacks medios nao querem arriscar).`,
      concept: 'BvB em FT: SB deve shovar range muito amplo. BB nao pode chamar leve por causa de ICM e do risco de bustar.',
    }
  },

  // 24. BvB com stacks curtos — BB defende vs SB shove
  () => {
    const heroBB = randBB(12, 18)
    const villainBB = randBB(8, 14)
    const isPremium = Math.random() > 0.55
    const hand = isPremium ? pick(['AA', 'KK', 'QQ', 'AKs', 'AKo', 'JJ']) : pick(['A9o', 'KTo', 'QJo', 'JTo', '88', '77', 'A7o'])
    const players = pick([4, 5])
    const shortBB = randBB(3, 6)
    const shouldCall = isPremium
    return {
      situation: `Mesa final de ${players}. Short stack tem ${shortBB}bb. SB (${villainBB}bb) shova. Voce tem ${heroBB}bb no BB com ${hand}.`,
      question: 'O que voce faz?',
      options: [
        { id: 'call', label: 'Call', correct: shouldCall },
        { id: 'fold', label: 'Fold', correct: !shouldCall },
      ],
      explanation: shouldCall
        ? `${hand} e forte o suficiente pra chamar. Contra range amplo de SB shove, voce tem equity massiva. Mesmo com ICM, premiums sao call.`
        : `Com short de ${shortBB}bb prestes a bustar, ${hand} nao justifica o risco. Se foldar e o short bustar, voce sobe de premiacao gratis. ICM torna ${hand} fold aqui.`,
      concept: 'BB vs SB shove em FT: aperte MUITO o range de call. So chame com premiums quando tem short stack pra bustar.',
    }
  },

  // 25. Push/fold — UTG com stack muito curto
  () => {
    const heroBB = randBB(3, 5)
    const hand = pick(['K2o', 'Q5o', 'J7o', 'T6o', '93o', '84o', 'A2o', 'K9o', 'Q8o', 'J9o', '22', '33'])
    const isPlayable = ['A2o', 'K9o', 'Q8o', 'J9o', '22', '33'].includes(hand)
    const heroPos = pick(['UTG', 'UTG+1', 'LJ'])
    const players = pick([6, 7, 8])
    return {
      situation: `Torneio, ${players} restam. Voce tem ${heroBB}bb no ${heroPos} com ${hand}. Antes estao altos.`,
      question: 'O que voce faz?',
      options: [
        { id: 'shove', label: 'Shove all-in', correct: isPlayable },
        { id: 'fold', label: 'Fold', correct: !isPlayable },
      ],
      explanation: isPlayable
        ? `Com ${heroBB}bb, voce PRECISA shovar antes de ser cego. ${hand} do ${heroPos} tem equity razoavel e voce recupera fold equity. Esperar so piora.`
        : `Mesmo com ${heroBB}bb, ${hand} do ${heroPos} e lixo. Varios jogadores pra agir atras de voce. Espere uma mao minimamente jogavel — voce tem ${heroBB} rodadas ainda.`,
      concept: `Com 3-5bb, shove ou fold. Mas mesmo desesperado, lixo puro do EP e fold — voce precisa de equity minima.`,
    }
  },

  // 26. Payout top-heavy — vale arriscar mais
  () => {
    const prize1 = pick([10000, 20000, 50000])
    const prize2 = Math.round(prize1 * 0.45)
    const prize3 = Math.round(prize1 * 0.25)
    const heroBB = randBB(20, 30)
    const villainBB = randBB(25, 35)
    const hand = pick(HANDS_STRONG)
    return {
      situation: `Mesa final 3-way. Premiacao top-heavy: 1o: $${prize1}, 2o: $${prize2}, 3o: $${prize3}. Voce tem ${heroBB}bb. Vilao (${villainBB}bb) raisa. Voce tem ${hand}.`,
      question: 'O que voce faz?',
      options: [
        { id: 'threebet', label: '3-bet/shove', correct: true },
        { id: 'fold', label: 'Fold (ICM)', correct: false },
      ],
      explanation: `Premiacao top-heavy: diferenca entre 1o ($${prize1}) e 2o ($${prize2}) e $${prize1 - prize2}. Isso JUSTIFICA mais risco. ${hand} e forte — 3-bet/shove para ir pro 1o lugar. ICM favorece agressao quando o 1o lugar paga muito mais.`,
      concept: 'Payout top-heavy = jogue mais agressivo. A diferenca entre 1o e 2o justifica mais risco que payouts flat.',
    }
  },

  // 27. Payout flat — jogue mais conservador
  () => {
    const prize1 = pick([5000, 10000])
    const prize2 = Math.round(prize1 * 0.75)
    const prize3 = Math.round(prize1 * 0.55)
    const heroBB = randBB(15, 25)
    const hand = pick(HANDS_MARGINAL)
    const players = pick([3, 4])
    return {
      situation: `Mesa final ${players}-way. Premiacao flat: 1o: $${prize1}, 2o: $${prize2}, 3o: $${prize3}. Voce tem ${heroBB}bb. CO raisa. Voce está no BB com ${hand}.`,
      question: 'O que voce faz?',
      options: [
        { id: 'call', label: 'Call/3-bet', correct: false },
        { id: 'fold', label: 'Fold', correct: true },
      ],
      explanation: `Premiacao flat: subir de 3o ($${prize3}) pra 2o ($${prize2}) vale $${prize2 - prize3}, quase o mesmo que ir de 2o pra 1o ($${prize1 - prize2}). Cada posicao importa IGUALMENTE, entao ICM e pesado. ${hand} e fold.`,
      concept: 'Payout flat = ICM mais pesado. Cada posicao vale quase o mesmo incremento. Jogue conservador.',
    }
  },

  // 28. Heads-up na FT — ChipEV puro
  () => {
    const heroBB = randBB(15, 30)
    const villainBB = pick([60, 50, 40]) - heroBB > 0 ? 60 - heroBB : randBB(20, 35)
    const hand = pick([...HANDS_MARGINAL, ...HANDS_MEDIUM, ...HANDS_WEAK.slice(0, 4)])
    const heroPos = pick(['SB', 'BB'])
    return {
      situation: `Heads-up na mesa final. Voce tem ${heroBB}bb no ${heroPos} com ${hand}. ${heroPos === 'SB' ? 'Voce age primeiro.' : 'SB completa.'}`,
      question: 'O que voce faz?',
      options: [
        { id: 'raise', label: heroPos === 'SB' ? 'Raise' : 'Raise (isolate)', correct: true },
        { id: 'fold', label: heroPos === 'SB' ? 'Fold' : 'Check', correct: false },
      ],
      explanation: `Heads-up, ICM desaparece — so tem 2 premios e voce ja garantiu o 2o lugar. Jogue ChipEV puro. ${hand} e raise. Ranges de HU sao MUITO mais amplos que full ring.`,
      concept: 'Heads-up na FT = ChipEV puro. ICM nao existe mais — so importa acumular fichas pra vencer.',
    }
  },

  // 29. Min-cash garantido — hora de acumular
  () => {
    const heroBB = randBB(20, 35)
    const hand = pick(HANDS_MEDIUM)
    const heroPos = pick(['CO', 'BTN'])
    const remaining = pick([40, 50, 60])
    const itm = Math.floor(remaining * 0.5)
    return {
      situation: `Voce acabou de estourar a bolha. ${remaining} restam, todos ITM. Voce tem ${heroBB}bb no ${heroPos} com ${hand}. Fold ate voce.`,
      question: 'O que voce faz?',
      options: [
        { id: 'raise', label: 'Raise (acumular fichas)', correct: true },
        { id: 'fold', label: 'Fold (preservar min-cash)', correct: false },
      ],
      explanation: `Apos estourar a bolha, ICM DIMINUI drasticamente. Pay jumps sao minimos entre as primeiras posicoes ITM. Volte a jogar ChipEV e acumule fichas para a mesa final, onde os saltos reais estao.`,
      concept: 'Pos-bolha, jogue agressivo. Os pay jumps iniciais sao pequenos. Acumule fichas agora pra lucrar na FT.',
    }
  },

  // 30. Reshove do BB contra steal do CO/BTN
  () => {
    const heroBB = randBB(14, 20)
    const villainPos = pick(['CO', 'BTN'])
    const villainBB = randBB(25, 40)
    const hand = pick(['A9s', 'ATo', 'KJs', 'KQo', 'QJs', 'TT', '99', '88'])
    const players = pick([7, 8, 9])
    return {
      situation: `Torneio, ${players} restam. ${villainPos} (${villainBB}bb, abre frequente) raisa 2.2x. SB folda. Voce tem ${heroBB}bb no BB com ${hand}.`,
      question: 'O que voce faz?',
      options: [
        { id: 'reshove', label: 'Reshove all-in', correct: true },
        { id: 'call', label: 'Call', correct: false },
      ],
      explanation: `${villainPos} abrindo frequente = range amplo. Com ${heroBB}bb, reshove e melhor que call: voce ganha fold equity imediata + nao joga OOP pos-flop com stack ruim. ${hand} tem equity boa quando pago.`,
      concept: 'Com 14-20bb no BB, reshove sobre steals do CO/BTN. Call e jogar OOP com stack medio e a pior opcao.',
    }
  },

  // 31. Stop-and-go — alternativa ao call com stack curto
  () => {
    const heroBB = randBB(6, 9)
    const hand = pick(['A5o', 'A7o', 'KTo', 'KJo', 'QJs', '77', '88'])
    const villainPos = pick(['BTN', 'CO'])
    const villainBB = randBB(20, 35)
    return {
      situation: `Voce tem ${heroBB}bb no BB. ${villainPos} (${villainBB}bb) abre 2.5x. Voce tem ${hand}. Shovar pre e marginal, mas foldar parece fraco demais.`,
      question: 'Qual a melhor estrategia?',
      options: [
        { id: 'stopngo', label: 'Call e shove qualquer flop (stop-and-go)', correct: true },
        { id: 'fold', label: 'Fold', correct: false },
      ],
      explanation: `Stop-and-go: call pre e shove qualquer flop. Vantagem: vilao folda flops que errou (voce ganha fold equity POS-flop em vez de pre-flop). Com ${heroBB}bb e ${hand}, isso e melhor que fold e melhor que shove pre contra range forte.`,
      concept: 'Stop-and-go: com 6-9bb, call pre + shove qualquer flop. Ganha fold equity pos-flop quando vilao whiffa.',
    }
  },

  // 32. ICM em MTT grande — bolha paga pouco
  () => {
    const buyIn = pick([5, 11, 22])
    const entries = pick([1000, 2000, 5000])
    const itm = Math.floor(entries * 0.15)
    const minCash = Math.round(buyIn * 1.5)
    const prize1 = Math.round(buyIn * entries * 0.15)
    const heroBB = randBB(20, 30)
    const hand = pick(HANDS_MEDIUM)
    const heroPos = pick(['CO', 'BTN', 'HJ'])
    const remaining = itm + pick([5, 10, 15])
    return {
      situation: `MTT $${buyIn}, ${entries} entradas. Pagam ${itm} (min cash $${minCash}, 1o: ~$${prize1}). ${remaining} restam. Voce tem ${heroBB}bb no ${heroPos} com ${hand}.`,
      question: 'O que voce faz?',
      options: [
        { id: 'raise', label: 'Raise (acumular pra FT)', correct: true },
        { id: 'fold', label: 'Fold (garantir min-cash)', correct: false },
      ],
      explanation: `Min-cash de $${minCash} e apenas ${((minCash / buyIn - 1) * 100).toFixed(0)}% de lucro. O 1o lugar paga ~$${prize1}. Jogar tight pra garantir $${minCash} desperdicando chance de $${prize1} e um erro. Acumule fichas.`,
      concept: 'Em MTTs grandes, min-cash e quase irrelevante. O dinheiro real esta no top 3. Jogue pra vencer, nao pra sobreviver.',
    }
  },

  // 33. ICM — nao bustar antes de short mais curto
  () => {
    const heroBB = randBB(8, 12)
    const shortBB = randBB(2, 4)
    const hand = pick(HANDS_MARGINAL)
    const villainPos = pick(['CO', 'BTN'])
    const villainBB = randBB(25, 40)
    const players = pick([4, 5])
    return {
      situation: `Mesa final de ${players}. Voce tem ${heroBB}bb, short tem ${shortBB}bb. ${villainPos} (${villainBB}bb) raisa. Voce tem ${hand} no BB.`,
      question: 'O que voce faz?',
      options: [
        { id: 'call', label: 'Call/shove', correct: false },
        { id: 'fold', label: 'Fold', correct: true },
      ],
      explanation: `Voce tem ${heroBB}bb mas o short tem so ${shortBB}bb. Se ele bustar antes de voce, voce sobe de premiacao GRATIS. Nao arrisque ${hand} contra o big stack — seja paciente ${shortBB} maos.`,
      concept: 'Nunca buste antes de um stack mais curto. Paciencia quando alguem esta mais perto de bustar.',
    }
  },

  // 34. Final table — open shove do SB com stack medio
  () => {
    const heroBB = randBB(12, 18)
    const bbBB = randBB(10, 15)
    const hand = pick(['A3o', 'A6o', 'K7o', 'K9o', 'QTo', 'J9o', '55', '44', '33', 'T8s', '97s', '86s'])
    const players = pick([4, 5, 6])
    return {
      situation: `Mesa final de ${players}. Fold ate voce no SB com ${heroBB}bb. BB tem ${bbBB}bb. Voce tem ${hand}.`,
      question: 'O que voce faz?',
      options: [
        { id: 'shove', label: 'Shove all-in', correct: true },
        { id: 'fold', label: 'Fold', correct: false },
      ],
      explanation: `Na FT, SB shove vs BB com stacks medios e muito lucrativo. ${hand} e shove — BB precisa de mao forte pra chamar por ICM. Voce ganha blinds e antes sem showdown na maioria das vezes.`,
      concept: 'SB vs BB na FT: shove range muito amplo com stacks medios. ICM protege voce — BB nao pode chamar leve.',
    }
  },

  // 35. Chipleader pressiona mesa final — raise light
  () => {
    const heroBB = randBB(45, 70)
    const players = pick([5, 6])
    const hand = pick([...HANDS_WEAK, ...HANDS_MARGINAL, 'T5o', '94o', 'J3o', '82o'])
    const isTrash = ['T5o', '94o', 'J3o', '82o', '72o', '93o', '84o'].includes(hand)
    const heroPos = pick(['BTN', 'CO', 'SB'])
    return {
      situation: `Mesa final de ${players}. Voce e chip leader (${heroBB}bb). Stacks restantes: 8-15bb cada. Voce está no ${heroPos} com ${hand}. Fold ate voce.`,
      question: 'O que voce faz?',
      options: [
        { id: 'raise', label: 'Raise (pressionar)', correct: !isTrash },
        { id: 'fold', label: 'Fold', correct: isTrash },
      ],
      explanation: isTrash
        ? `Mesmo como chip leader, ${hand} e lixo demais. Voce nao precisa abrir TUDO — so mais que o normal. Guarde a pressao para maos minimamente jogaveis.`
        : `Como chip leader com ${heroBB}bb, ninguem quer confrontar voce. ${hand} e raise do ${heroPos} — ICM impede os outros de chamar leve. Abuse da pressao.`,
      concept: 'Chip leader na FT abre MUITO mais amplo. Os outros nao podem revidar sem premium por causa de ICM.',
    }
  },
]

function generateScenario() {
  return pick(TEMPLATES)()
}

function Lesson({ onComplete }) {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        ICM — Independent Chip Model
      </h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Por que fichas de torneio valem menos conforme você acumula mais</p>
      <div className="space-y-4">
        <Section title="O Que é ICM?">
          Em cash game, cada ficha vale exatamente seu valor em dinheiro. 1000 fichas = $1000.<br /><br />
          Em torneio, <strong style={{ color: '#e5484d' }}>fichas NAO valem linearmente</strong>. Dobrar seu stack NAO dobra seu premio esperado. Isso porque a estrutura de premiacao não é linear (1o não ganha o dobro do 2o).<br /><br />
          ICM é o modelo que converte fichas em valor real ($) baseado na estrutura de premiacao.
        </Section>
        <Section title="Por Que ICM Importa?">
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #4fce82' }}>
              <div style={{ color: '#4fce82', fontWeight: 700 }}>Ganhar fichas</div>
              <div style={{ color: 'white', fontSize: 20, fontWeight: 700, marginTop: 4 }}>+$X</div>
              <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>Valor marginal decrescente</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #e5484d' }}>
              <div style={{ color: '#e5484d', fontWeight: 700 }}>Perder fichas</div>
              <div style={{ color: 'white', fontSize: 20, fontWeight: 700, marginTop: 4 }}>-$2X</div>
              <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>Perder custa MAIS que ganhar</div>
            </div>
          </div>
          <div style={{ color: '#ccc', fontSize: 13, marginTop: 8 }}>
            Isso cria assimetria: o risco de bustar é desproporcional ao ganho de dobrar.
          </div>
        </Section>
        <Section title="Onde ICM Tem Mais Impacto">
          <div className="space-y-2">
            {[
              { spot: 'Bolha do torneio', impact: 'MAXIMO', color: '#e5484d', desc: 'Diferenca entre ganhar premio é sair sem nada' },
              { spot: 'Mesa final', impact: 'ALTO', color: '#f5a623', desc: 'Cada eliminacao = salto grande de premiacao' },
              { spot: 'Satelites', impact: 'EXTREMO', color: '#e5484d', desc: 'Premio igual = sobrevivencia é tudo' },
              { spot: 'Inicio do torneio', impact: 'ZERO', color: '#4fce82', desc: 'Jogue ChipEV puro' },
            ].map(r => (
              <div key={r.spot} className="flex justify-between items-center rounded-lg p-3" style={{ background: '#0f0f0f' }}>
                <div>
                  <div style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>{r.spot}</div>
                  <div style={{ color: '#888', fontSize: 12 }}>{r.desc}</div>
                </div>
                <span style={{ color: r.color, fontWeight: 700, fontSize: 13 }}>{r.impact}</span>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Bubble Factor">
          <p style={{ marginBottom: 8 }}>O <strong style={{ color: '#e5484d' }}>Bubble Factor (BF)</strong> mede quanto ICM custa em cada spot. Ele multiplica a equity que voce precisa pra break even:</p>
          <div className="rounded-lg p-3 mt-2" style={{ background: '#0f0f0f' }}>
            <div className="space-y-2">
              {[
                { bf: '1.0', meaning: 'ChipEV puro (inicio torneio)', example: 'Precisa 50% equity', color: '#4fce82' },
                { bf: '1.3', meaning: 'ICM leve (longe da bolha)', example: 'Precisa 57% equity', color: '#4a90e2' },
                { bf: '1.5-2.0', meaning: 'ICM pesado (bolha)', example: 'Precisa 60-67% equity', color: '#f5a623' },
                { bf: '2.0+', meaning: 'ICM extremo (satelite/FT curta)', example: 'Precisa 67%+ equity', color: '#e5484d' },
              ].map(r => (
                <div key={r.bf} className="flex justify-between items-center">
                  <div>
                    <span style={{ color: r.color, fontWeight: 700, fontSize: 14 }}>BF {r.bf}</span>
                    <span style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>{r.meaning}</span>
                  </div>
                  <span style={{ color: '#666', fontSize: 12 }}>{r.example}</span>
                </div>
              ))}
            </div>
          </div>
          <p style={{ color: '#888', fontSize: 13, marginTop: 8 }}>Formula: Equity necessaria = BF / (1 + BF). Se BF = 1.5, precisa de 60%. Se BF = 2.0, precisa de 67%.</p>
        </Section>

        <Section title="Risk Premium">
          <p>Em ICM, chamar um all-in custa MAIS do que parece. Isso é o <strong style={{ color: '#f5a623' }}>risk premium</strong>:</p>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #4fce82' }}>
              <div style={{ color: '#4fce82', fontWeight: 700, fontSize: 13 }}>Se ganhar</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Dobra fichas, mas valor em $ sobe pouco (retornos decrescentes)</div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #e5484d' }}>
              <div style={{ color: '#e5484d', fontWeight: 700, fontSize: 13 }}>Se perder</div>
              <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>Bustar ou virar short = perda enorme de $EV</div>
            </div>
          </div>
          <p style={{ color: '#888', fontSize: 13, marginTop: 8 }}>Por isso, voce precisa de MAIS equity que em cash game pra chamar all-ins em torneio.</p>
        </Section>

        <Section title="Pay Jump Analysis">
          <p>Sempre calcule o <strong style={{ color: '#4a90e2' }}>pay jump real</strong> antes de tomar decisoes em FT:</p>
          <div className="rounded-lg p-3 mt-2" style={{ background: '#0f0f0f' }}>
            <div style={{ color: '#ccc', fontSize: 13, lineHeight: 1.8 }}>
              <strong style={{ color: 'white' }}>Exemplo:</strong> FT 3-way. 1o: $10.000, 2o: $6.000, 3o: $3.500<br />
              <span style={{ color: '#f5a623' }}>Jump 3o→2o:</span> $2.500 (garantido se short bustar)<br />
              <span style={{ color: '#e5484d' }}>Jump 2o→1o:</span> $4.000 (precisa ganhar heads-up)<br /><br />
              Se o short tem 3bb, esperar ele bustar vale <strong style={{ color: '#4fce82' }}>$2.500 gratis</strong>. Não arrisque com maos marginais.
            </div>
          </div>
        </Section>

        <Section title="Regras Praticas de ICM">
          <div className="space-y-2">
            {[
              'Na bolha, aperte seu range significativamente (fold mais)',
              'Deixe short stacks bustarem antes de voce arriscar',
              'Como chip leader, AUMENTE agressividade — os outros nao podem revidar',
              'Maos premium (QQ+, AKs) quase nunca sao fold, mesmo em ICM pesado',
              'Em satelites, sobrevivencia e TUDO — fold ate garantir a vaga',
              'Longe da bolha, jogue ChipEV normal',
              'Calcule o pay jump antes de decisoes na mesa final',
              'Bubble factor 2.0+ = fold quase tudo exceto nuts',
              'Multi-way all-in na bolha? Fold — deixe eles se eliminarem',
            ].map((t, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span style={{ color: '#f5a623' }}>•</span>
                <span style={{ color: '#ccc', fontSize: 14 }}>{t}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Ferramentas de ICM">
          <div className="space-y-2">
            {[
              { name: 'ICMizer', desc: 'Calculadora ICM dedicada — push/fold e spots complexos', color: '#e5484d' },
              { name: 'HRC (Holdem Resources)', desc: 'Analise push/fold com ICM integrado', color: '#f5a623' },
              { name: 'GTO Wizard', desc: 'Solver com modo ICM pra FT e bolha', color: '#4a90e2' },
              { name: 'ICMIZER Free', desc: 'Versao gratuita pra praticar spots basicos', color: '#4fce82' },
            ].map(t => (
              <div key={t.name} className="flex gap-3 items-start rounded-lg p-2" style={{ background: '#0f0f0f' }}>
                <div style={{ width: 4, minHeight: 32, borderRadius: 2, background: t.color, marginTop: 2 }} />
                <div>
                  <div style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>{t.name}</div>
                  <div style={{ color: '#888', fontSize: 12 }}>{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
      <button onClick={onComplete} className="w-full mt-8 py-4 rounded-xl font-bold text-white text-lg" style={{ background: '#e5484d' }}>
        Entendi — Quero Treinar
      </button>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
      <h3 style={{ color: 'white', fontWeight: 600, marginBottom: 8 }}>{title}</h3>
      <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>{children}</div>
    </div>
  )
}

function Trainer() {
  const { progress, recordAnswer, recordSession } = useProgress()
  const [scenario, setScenario] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [sessionDone, setSessionDone] = useState(false)

  function newScenario() {
    if (sessionTotal >= 10) { setSessionDone(true); return }
    setScenario(generateScenario())
    setFeedback(null)
  }

  function answer(optionId) {
    if (!scenario || feedback) return
    const chosen = scenario.options.find(o => o.id === optionId)
    const isCorrect = chosen.correct
    const newStreak = isCorrect ? streak + 1 : 0
    setStreak(newStreak)
    const newTotal = sessionTotal + 1, newCorrect = sessionCorrect + (isCorrect ? 1 : 0)
    setSessionTotal(newTotal); setSessionCorrect(newCorrect)
    recordAnswer(17, isCorrect, newStreak)
    const isLast = newTotal >= 10
    if (isLast) recordSession(17, Math.round((newCorrect / newTotal) * 100))
    setFeedback({ isCorrect, explanation: scenario.explanation, concept: scenario.concept, correctLabel: scenario.options.find(o => o.correct).label, isLast })
  }

  function restart() { setSessionCorrect(0); setSessionTotal(0); setStreak(0); setSessionDone(false); setFeedback(null); setScenario(null) }

  if (!scenario && !sessionDone) newScenario()

  if (sessionDone) {
    return <SessionReview moduleId={17} sessionCorrect={sessionCorrect} sessionTotal={sessionTotal} onContinue={restart} />
  }

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <div className="rounded-xl p-3 mb-4 flex justify-between" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
        <div style={{ color: '#888', fontSize: 13 }}>Sessão: {sessionCorrect}/{sessionTotal} · Seq: {streak}</div>
        <div style={{ color: '#888', fontSize: 13 }}>Meta: 10 cenários</div>
      </div>
      <div className="rounded-full h-2 mb-6" style={{ background: '#2a2a2e' }}>
        <div className="rounded-full h-2 transition-all" style={{ width: `${(sessionTotal / 10) * 100}%`, background: '#e5484d' }} />
      </div>

      {scenario && (
        <>
          <div className="rounded-xl p-4 mb-4" style={{ background: '#1a1a1d', border: '1px solid #2a2a2e' }}>
            <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>CENARIO ICM</div>
            <div style={{ color: '#ccc', fontSize: 15, lineHeight: 1.7 }}>{scenario.situation}</div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 16, marginTop: 12 }}>{scenario.question}</div>
          </div>

          {!feedback && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {scenario.options.map(opt => (
                <button key={opt.id} onClick={() => answer(opt.id)} className="py-4 rounded-xl font-bold text-sm"
                  style={{ background: opt.id === 'fold' || opt.id === 'check' ? '#4a90e2' : '#f5a623', color: opt.id === 'fold' || opt.id === 'check' ? 'white' : '#0f0f0f' }}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {feedback && (
            <div className="rounded-xl p-4 mb-4" style={{ background: '#1a1a1d', border: `2px solid ${feedback.isCorrect ? '#4fce82' : '#e5484d'}` }}>
              <div style={{ color: feedback.isCorrect ? '#4fce82' : '#e5484d', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
                {feedback.isCorrect ? 'Correto!' : 'Incorreto'}
              </div>
              <button onClick={newScenario} className="w-full py-3 rounded-lg font-semibold mb-4" style={{ background: '#e5484d', color: 'white', fontSize: 16 }}>Proximo Cenario</button>
              <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.7 }}>{feedback.explanation}</div>
              <div className="mt-3 rounded-lg p-3" style={{ background: '#0f0f0f', border: '1px solid #f5a62330' }}>
                <div style={{ color: '#f5a623', fontWeight: 600, fontSize: 13 }}>Conceito-chave</div>
                <div style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>{feedback.concept}</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function Module17() {
  const { progress, markLessonRead } = useProgress()
  const [view, setView] = useState(progress.modules[17]?.lessonRead ? 'trainer' : 'lesson')
  if (!progress.modules[17]?.unlocked) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f0f' }}>
      <div className="text-center"><div style={{ fontSize: 60 }}>🔒</div><h2 style={{ color: 'white', marginTop: 16 }}>Módulo Bloqueado</h2><p style={{ color: '#888', marginTop: 8 }}>Complete o Módulo 16 para desbloquear.</p></div>
    </div>
  )
  return (
    <div className="min-h-screen pb-28 md:pb-8 md:pt-20 px-4" style={{ background: '#0f0f0f' }}>
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setView('lesson')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'lesson' ? '#e5484d' : '#1a1a1d', color: view === 'lesson' ? 'white' : '#888', border: '1px solid #2a2a2e' }}>Aula</button>
          <button onClick={() => progress.modules[17]?.lessonRead && setView('trainer')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: view === 'trainer' ? '#e5484d' : '#1a1a1d', color: view === 'trainer' ? 'white' : (progress.modules[17]?.lessonRead ? '#888' : '#444'), border: '1px solid #2a2a2e', cursor: progress.modules[17]?.lessonRead ? 'pointer' : 'not-allowed' }}>Trainer {!progress.modules[17]?.lessonRead && '🔒'}</button>
        </div>
        {view === 'lesson' ? <Lesson onComplete={() => { markLessonRead(17); setView('trainer') }} /> : <Trainer />}
      </div>
    </div>
  )
}
