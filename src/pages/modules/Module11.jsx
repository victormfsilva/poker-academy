import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProgress } from '../../context/ProgressContext'

// Module 11 foi fundido com o Module 10 (Defesa vs CBet + Check-Raise)
// Este componente auto-completa o modulo 11 e redireciona pro proximo
export default function Module11() {
  const { progress, markLessonRead, recordSession } = useProgress()
  const navigate = useNavigate()

  useEffect(() => {
    // Auto-completar M11 se M10 estiver completo
    if (progress.modules[10]?.completed) {
      if (!progress.modules[11]?.lessonRead) markLessonRead(11)
      if (!progress.modules[11]?.completed) recordSession(11, 100)
    }
    navigate('/modulos/10', { replace: true })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f0f' }}>
      <div style={{ color: '#888' }}>Redirecionando...</div>
    </div>
  )
}
