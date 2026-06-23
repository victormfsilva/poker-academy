/**
 * useSolver — Hook React para comunicar com o WASM Solver Worker
 */
import { useState, useEffect, useRef, useCallback } from 'react'

let workerInstance = null
let workerReady = false
let initPromise = null
let msgId = 0
const pending = new Map()

function getWorker() {
  if (!workerInstance) {
    workerInstance = new Worker(
      new URL('./solverWorker.js', import.meta.url),
      { type: 'module' }
    )
    workerInstance.onmessage = (e) => {
      const { id, result, error } = e.data
      const p = pending.get(id)
      if (p) {
        pending.delete(id)
        if (error) p.reject(new Error(error))
        else p.resolve(result)
      }
    }
  }
  return workerInstance
}

function sendToWorker(type, data) {
  return new Promise((resolve, reject) => {
    const id = ++msgId
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ type, id, data })
  })
}

async function ensureInit() {
  if (workerReady) return
  if (!initPromise) {
    initPromise = sendToWorker('init').then(() => {
      workerReady = true
    }).catch(err => {
      initPromise = null
      throw err
    })
  }
  await initPromise
}

export function useSolver() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [ready, setReady] = useState(workerReady)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    if (!workerReady) {
      ensureInit().then(() => {
        if (mountedRef.current) setReady(true)
      }).catch(err => {
        if (mountedRef.current) setError(err.message)
      })
    }
    return () => { mountedRef.current = false }
  }, [])

  const solve = useCallback(async (config) => {
    setLoading(true)
    setError(null)
    try {
      await ensureInit()
      const result = await sendToWorker('solve', config)
      if (mountedRef.current) setLoading(false)
      return result
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message)
        setLoading(false)
      }
      throw err
    }
  }, [])

  const getStrategy = useCallback(async (history = []) => {
    try {
      await ensureInit()
      return await sendToWorker('getStrategy', { history })
    } catch (err) {
      if (mountedRef.current) setError(err.message)
      throw err
    }
  }, [])

  const getHandStrategy = useCallback(async (history = [], hand) => {
    try {
      await ensureInit()
      return await sendToWorker('getHandStrategy', { history, hand })
    } catch (err) {
      if (mountedRef.current) setError(err.message)
      throw err
    }
  }, [])

  return { ready, loading, error, solve, getStrategy, getHandStrategy }
}
