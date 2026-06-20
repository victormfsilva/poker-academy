import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const STORAGE_KEY = 'poker_academy_progress'

const defaultProgress = {
  modules: {
    1: { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: true, completed: false },
    2: { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false },
    3: { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false },
    4: { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false },
    5: { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false },
    6: { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false },
    7: { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false },
    8: { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false },
    9: { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false },
    10: { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false },
    11: { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false },
    12: { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false },
    13: { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false },
    14: { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false },
    15: { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false },
    16: { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false },
    17: { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false },
    18: { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false },
    19: { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false },
    20: { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false },
    21: { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false },
    22: { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false },
    23: { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false },
    24: { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false },
    25: { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false },
    26: { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false },
  },
  globalStats: {
    totalHands: 0,
    totalCorrect: 0,
    bestStreak: 0,
    currentStreak: 0,
  },
  dailyGoal: 50,
  dailyHistory: {},
  arena: {
    rating: 1200,
    peak: 1200,
    history: [],
    totalHands: 0,
    totalWins: 0,
    totalCorrectActions: 0,
    totalActions: 0,
  },
  answerHistory: [],
  reviewSchedule: {},
}

function migrateModules(modules) {
  if (!modules) return modules

  // Migração v2: módulos 3-6 viraram 4-7 (inserção do Módulo 3 Pot Odds)
  if (modules[3]?.totalAnswered > 0 && !modules._migrated_v2) {
    const migrated = { ...modules, _migrated_v2: true }
    if (modules[6]) migrated[7] = modules[6]
    if (modules[5]) migrated[6] = modules[5]
    if (modules[4]) migrated[5] = modules[4]
    if (modules[3]) migrated[4] = modules[3]
    migrated[3] = { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false }
    if (migrated[2]?.completed) migrated[3].unlocked = true
    modules = migrated
  }

  // Migração v3: removido Módulo 7 (SB/BTN vs RFI), tudo 8-21 vira 7-20
  // Dados do antigo 7 são distribuídos metade pro novo 7 (antigo 8, SB vs RFI) e metade pro novo 8 (antigo 9, BTN vs RFI)
  if (modules[21] && !modules._migrated_v3) {
    const migrated = { ...modules, _migrated_v3: true }
    const emptyMod = { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false }
    const old7 = modules[7] || emptyMod

    // Distribuir dados do antigo 7 metade pra cada
    const halfAnswered = Math.floor(old7.totalAnswered / 2)
    const halfCorrect = Math.floor(old7.totalCorrect / 2)

    function mergeHalf(target, half) {
      return {
        ...target,
        totalAnswered: target.totalAnswered + half,
        totalCorrect: target.totalCorrect + Math.min(halfCorrect, half),
        bestStreak: Math.max(target.bestStreak, old7.bestStreak),
        lessonRead: target.lessonRead || old7.lessonRead,
        unlocked: target.unlocked || old7.unlocked,
        completed: target.completed,
        trainerSessions: target.trainerSessions || [],
      }
    }

    const old8 = modules[8] || emptyMod
    const old9 = modules[9] || emptyMod

    // Shift 8→7, 9→8, ..., 21→20 com merge dos dados do 7
    migrated[7] = mergeHalf(old8, halfAnswered)
    migrated[8] = mergeHalf(old9, old7.totalAnswered - halfAnswered)
    for (let i = 10; i <= 21; i++) {
      migrated[i - 1] = modules[i] || emptyMod
    }

    // Limpar antigo slot 21
    delete migrated[21]

    // Se módulo 6 completou, desbloquear 7
    if (migrated[6]?.completed) migrated[7].unlocked = true

    modules = migrated
  }

  return modules
}

function mergeProgress(saved) {
  if (!saved) return defaultProgress
  const migratedModules = migrateModules(saved.modules)
  return {
    ...defaultProgress,
    ...saved,
    modules: { ...defaultProgress.modules, ...migratedModules }
  }
}

const ProgressContext = createContext(null)

const ADMIN_EMAIL = 'victormenezes722@gmail.com'

export function ProgressProvider({ children, userId, userEmail }) {
  const isAdmin = userEmail?.toLowerCase().trim() === ADMIN_EMAIL
  const syncTimer = useRef(null)

  const [progress, setProgress] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return mergeProgress(JSON.parse(saved))
    } catch {}
    return defaultProgress
  })

  // Carrega progresso da nuvem quando userId estiver disponível
  useEffect(() => {
    if (!userId) return
    async function loadFromCloud() {
      try {
        const { data } = await supabase
          .from('progress')
          .select('data')
          .eq('user_id', userId)
          .single()

        if (data?.data) {
          const cloud = mergeProgress(data.data)
          setProgress(cloud)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cloud))
        }
      } catch {}
    }
    loadFromCloud()
  }, [userId])

  // Salva no localStorage e sincroniza com Supabase
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
    if (!userId) return

    if (syncTimer.current) clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(() => {
      supabase.from('progress').upsert({
        user_id: userId,
        data: progress,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' }).then(() => {})
    }, 1500)
  }, [progress, userId])

  function markLessonRead(moduleId) {
    setProgress(prev => ({
      ...prev,
      modules: {
        ...prev.modules,
        [moduleId]: { ...prev.modules[moduleId], lessonRead: true }
      }
    }))
  }

  function recordAnswer(moduleId, correct, streak, details) {
    setProgress(prev => {
      const mod = prev.modules[moduleId]
      const globalStats = {
        ...prev.globalStats,
        totalHands: prev.globalStats.totalHands + 1,
        totalCorrect: prev.globalStats.totalCorrect + (correct ? 1 : 0),
        bestStreak: Math.max(prev.globalStats.bestStreak, streak),
        currentStreak: correct ? prev.globalStats.currentStreak + 1 : 0,
      }
      const today = new Date().toISOString().slice(0, 10)
      const dailyHistory = { ...prev.dailyHistory }
      const dayData = dailyHistory[today] || { hands: 0, correct: 0 }
      dailyHistory[today] = { hands: dayData.hands + 1, correct: dayData.correct + (correct ? 1 : 0) }

      // Historico detalhado para deteccao de leaks (ultimas 200)
      const entry = { m: moduleId, ok: correct, t: Date.now(), ...details }
      const history = [...(prev.answerHistory || []), entry].slice(-200)

      return {
        ...prev,
        globalStats,
        dailyHistory,
        answerHistory: history,
        modules: {
          ...prev.modules,
          [moduleId]: {
            ...mod,
            totalAnswered: mod.totalAnswered + 1,
            totalCorrect: mod.totalCorrect + (correct ? 1 : 0),
            bestStreak: Math.max(mod.bestStreak, streak),
          }
        }
      }
    })
  }

  function recordSession(moduleId, accuracy) {
    setProgress(prev => {
      const mod = prev.modules[moduleId]
      const sessions = [...(mod.trainerSessions || []), { accuracy, date: Date.now() }]
      const lastTwo = sessions.slice(-2)
      const justCompleted = lastTwo.length === 2 && lastTwo.every(s => s.accuracy >= 90)
      const moduleCompleted = mod.completed || justCompleted

      const nextModules = { ...prev.modules }
      if (justCompleted && moduleId < 26) {
        nextModules[moduleId + 1] = { ...nextModules[moduleId + 1], unlocked: true }
      }

      // Spaced Repetition: agendar revisao quando completa ou apos cada sessao de revisao
      const reviewSchedule = { ...prev.reviewSchedule }
      const now = Date.now()
      const DAY = 86400000
      if (justCompleted && !reviewSchedule[moduleId]) {
        // Primeira vez completando: agendar dia 1, 3, 7, 14, 30
        reviewSchedule[moduleId] = { next: now + 1 * DAY, interval: 1 }
      } else if (reviewSchedule[moduleId] && accuracy >= 70) {
        // Revisao feita com sucesso: agendar proxima com intervalo maior
        const curr = reviewSchedule[moduleId]
        const intervals = [1, 3, 7, 14, 30, 60]
        const nextIdx = Math.min(intervals.indexOf(curr.interval) + 1, intervals.length - 1)
        reviewSchedule[moduleId] = { next: now + intervals[nextIdx] * DAY, interval: intervals[nextIdx] }
      } else if (reviewSchedule[moduleId] && accuracy < 70) {
        // Revisao ruim: resetar intervalo
        reviewSchedule[moduleId] = { next: now + 1 * DAY, interval: 1 }
      }

      return {
        ...prev,
        reviewSchedule,
        modules: {
          ...nextModules,
          [moduleId]: { ...mod, trainerSessions: sessions, completed: moduleCompleted }
        }
      }
    })
  }

  function getModuleProgress(moduleId) {
    const mod = progress.modules[moduleId] || { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false }
    const accuracy = mod.totalAnswered > 0
      ? Math.round((mod.totalCorrect / mod.totalAnswered) * 100)
      : 0
    const sessions = mod.trainerSessions || []
    const lastTwo = sessions.slice(-2)
    const sessionsToComplete = lastTwo.filter(s => s.accuracy >= 90).length
    return { ...mod, accuracy, sessionsToComplete, unlocked: isAdmin ? true : mod.unlocked }
  }

  function getPendingReviews() {
    const now = Date.now()
    const schedule = progress.reviewSchedule || {}
    return Object.entries(schedule)
      .filter(([, v]) => v.next <= now)
      .map(([id, v]) => ({ moduleId: Number(id), interval: v.interval }))
  }

  function setDailyGoal(goal) {
    setProgress(prev => ({ ...prev, dailyGoal: goal }))
  }

  function updateArenaData(arenaUpdate) {
    setProgress(prev => ({
      ...prev,
      arena: { ...defaultProgress.arena, ...prev.arena, ...arenaUpdate },
    }))
  }

  function recordArenaHand(won, correctActions, totalActions) {
    setProgress(prev => {
      const arena = { ...defaultProgress.arena, ...prev.arena }
      const globalStats = {
        ...prev.globalStats,
        totalHands: prev.globalStats.totalHands + 1,
        totalCorrect: prev.globalStats.totalCorrect + (correctActions > 0 ? 1 : 0),
      }
      const today = new Date().toISOString().slice(0, 10)
      const dailyHistory = { ...prev.dailyHistory }
      const dayData = dailyHistory[today] || { hands: 0, correct: 0 }
      dailyHistory[today] = { hands: dayData.hands + 1, correct: dayData.correct + correctActions }
      return {
        ...prev,
        globalStats,
        dailyHistory,
        arena: {
          ...arena,
          totalHands: arena.totalHands + 1,
          totalWins: arena.totalWins + (won ? 1 : 0),
          totalCorrectActions: arena.totalCorrectActions + correctActions,
          totalActions: arena.totalActions + totalActions,
        },
      }
    })
  }

  return (
    <ProgressContext.Provider value={{ progress, markLessonRead, recordAnswer, recordSession, getModuleProgress, getPendingReviews, setDailyGoal, updateArenaData, recordArenaHand }}>
      {children}
    </ProgressContext.Provider>
  )
}

export function useProgress() {
  return useContext(ProgressContext)
}
