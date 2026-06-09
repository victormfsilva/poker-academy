import { createContext, useContext, useState, useEffect } from 'react'

const STORAGE_KEY = 'poker_academy_progress'

const defaultProgress = {
  modules: {
    1: { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: true, completed: false },
    2: { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false },
    3: { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false },
    4: { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false },
    5: { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false },
    6: { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false },
  },
  globalStats: {
    totalHands: 0,
    totalCorrect: 0,
    bestStreak: 0,
    currentStreak: 0,
  }
}

const ProgressContext = createContext(null)

export function ProgressProvider({ children }) {
  const [progress, setProgress] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // merge com default para garantir campos novos
        return {
          ...defaultProgress,
          ...parsed,
          modules: { ...defaultProgress.modules, ...parsed.modules }
        }
      }
    } catch {}
    return defaultProgress
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  }, [progress])

  function markLessonRead(moduleId) {
    setProgress(prev => ({
      ...prev,
      modules: {
        ...prev.modules,
        [moduleId]: { ...prev.modules[moduleId], lessonRead: true }
      }
    }))
  }

  function recordAnswer(moduleId, correct, streak) {
    setProgress(prev => {
      const mod = prev.modules[moduleId]
      const newTotal = mod.totalAnswered + 1
      const newCorrect = mod.totalCorrect + (correct ? 1 : 0)
      const newBestStreak = Math.max(mod.bestStreak, streak)

      const globalStats = {
        ...prev.globalStats,
        totalHands: prev.globalStats.totalHands + 1,
        totalCorrect: prev.globalStats.totalCorrect + (correct ? 1 : 0),
        bestStreak: Math.max(prev.globalStats.bestStreak, streak),
        currentStreak: correct ? prev.globalStats.currentStreak + 1 : 0,
      }

      return {
        ...prev,
        globalStats,
        modules: {
          ...prev.modules,
          [moduleId]: {
            ...mod,
            totalAnswered: newTotal,
            totalCorrect: newCorrect,
            bestStreak: newBestStreak,
          }
        }
      }
    })
  }

  // Chamado quando o usuário completa uma sessão (10/10 seguidos)
  function recordSession(moduleId, accuracy) {
    setProgress(prev => {
      const mod = prev.modules[moduleId]
      const sessions = [...(mod.trainerSessions || []), { accuracy, date: Date.now() }]
      // últimas 2 sessões com 90%+ desbloqueia o próximo módulo
      const lastTwo = sessions.slice(-2)
      const moduleCompleted = lastTwo.length === 2 && lastTwo.every(s => s.accuracy >= 90)

      const nextModules = { ...prev.modules }
      if (moduleCompleted && moduleId < 6) {
        nextModules[moduleId + 1] = { ...nextModules[moduleId + 1], unlocked: true }
      }

      return {
        ...prev,
        modules: {
          ...nextModules,
          [moduleId]: {
            ...mod,
            trainerSessions: sessions,
            completed: moduleCompleted,
          }
        }
      }
    })
  }

  function getModuleProgress(moduleId) {
    const mod = progress.modules[moduleId]
    const accuracy = mod.totalAnswered > 0
      ? Math.round((mod.totalCorrect / mod.totalAnswered) * 100)
      : 0
    const sessions = mod.trainerSessions || []
    const lastTwo = sessions.slice(-2)
    const sessionsToComplete = lastTwo.filter(s => s.accuracy >= 90).length
    return { ...mod, accuracy, sessionsToComplete }
  }

  return (
    <ProgressContext.Provider value={{ progress, markLessonRead, recordAnswer, recordSession, getModuleProgress }}>
      {children}
    </ProgressContext.Provider>
  )
}

export function useProgress() {
  return useContext(ProgressContext)
}
