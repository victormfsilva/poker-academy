import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProgress } from '../../context/ProgressContext'

// Module 12 (Bet Sizing) foi fundido com o Module 5 (CBet Flop IP + Bet Sizing)
// Este componente auto-completa o módulo 12 e redireciona pro próximo
export default function Module12() {
  const { progress, markLessonRead, recordSession } = useProgress()
  const navigate = useNavigate()

  useEffect(() => {
    if (progress.modules[11]?.completed || progress.modules[10]?.completed) {
      if (!progress.modules[12]?.lessonRead) markLessonRead(12)
      if (!progress.modules[12]?.completed) recordSession(12, 100)
    }
    navigate('/modulos/5', { replace: true })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f0f' }}>
      <div style={{ color: '#888' }}>Redirecionando...</div>
    </div>
  )
}
