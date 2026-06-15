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
  },
  globalStats: {
    totalHands: 0,
    totalCorrect: 0,
    bestStreak: 0,
    currentStreak: 0,
  }
}

function migrateModules(modules) {
  // Migração v2: módulos 3-6 viraram 4-7 (inserção do Módulo 3 Pot Odds)
  // Migrar se: tem dados no módulo 3 antigo (com totalAnswered) E não foi migrado ainda
  if (modules && modules[3]?.totalAnswered > 0 && !modules._migrated_v2) {
    const migrated = { ...modules, _migrated_v2: true }
    // Shift 6→7, 5→6, 4→5, 3→4 (ordem reversa para não sobrescrever)
    if (modules[6]) migrated[7] = modules[6]
    if (modules[5]) migrated[6] = modules[5]
    if (modules[4]) migrated[5] = modules[4]
    if (modules[3]) migrated[4] = modules[3]
    // Módulo 3 novo começa vazio
    migrated[3] = { lessonRead: false, trainerSessions: [], bestStreak: 0, totalCorrect: 0, totalAnswered: 0, unlocked: false, completed: false }
    // Desbloquear módulo 3 se módulo 2 está completo
    if (migrated[2]?.completed) migrated[3].unlocked = true
    return migrated
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

export function ProgressProvider({ children, userId }) {
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

  function recordAnswer(moduleId, correct, streak) {
    setProgress(prev => {
      const mod = prev.modules[moduleId]
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
      const moduleCompleted = lastTwo.length === 2 && lastTwo.every(s => s.accuracy >= 90)

      const nextModules = { ...prev.modules }
      if (moduleCompleted && moduleId < 13) {
        nextModules[moduleId + 1] = { ...nextModules[moduleId + 1], unlocked: true }
      }

      return {
        ...prev,
        modules: {
          ...nextModules,
          [moduleId]: { ...mod, trainerSessions: sessions, completed: moduleCompleted }
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
