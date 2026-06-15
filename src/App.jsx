import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { ProgressProvider } from './context/ProgressContext'
import Navbar from './components/Navbar'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Modules from './pages/Modules'
import Module1 from './pages/modules/Module1'
import Module2 from './pages/modules/Module2'
import Module3 from './pages/modules/Module3'
import Module4 from './pages/modules/Module4'
import Module5 from './pages/modules/Module5'
import Module6 from './pages/modules/Module6'
import Module7 from './pages/modules/Module7'
import Module8 from './pages/modules/Module8'
import Module9 from './pages/modules/Module9'
import Module10 from './pages/modules/Module10'
import Module11 from './pages/modules/Module11'
import Module12 from './pages/modules/Module12'
import Module13 from './pages/modules/Module13'
import Tools from './pages/Tools'
import Infinite from './pages/Infinite'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div style={{ color: '#666' }}>Carregando...</div>
      </div>
    )
  }

  if (!user) return <Auth />

  return (
    <ProgressProvider userId={user.id}>
      <BrowserRouter>
        <Navbar user={user} />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/modulos" element={<Modules />} />
          <Route path="/modulos/1" element={<Module1 />} />
          <Route path="/modulos/2" element={<Module2 />} />
          <Route path="/modulos/3" element={<Module3 />} />
          <Route path="/modulos/4" element={<Module4 />} />
          <Route path="/modulos/5" element={<Module5 />} />
          <Route path="/modulos/6" element={<Module6 />} />
          <Route path="/modulos/7" element={<Module7 />} />
          <Route path="/modulos/8" element={<Module8 />} />
          <Route path="/modulos/9" element={<Module9 />} />
          <Route path="/modulos/10" element={<Module10 />} />
          <Route path="/modulos/11" element={<Module11 />} />
          <Route path="/modulos/12" element={<Module12 />} />
          <Route path="/modulos/13" element={<Module13 />} />
          <Route path="/ferramentas" element={<Tools />} />
          <Route path="/infinito" element={<Infinite />} />
        </Routes>
      </BrowserRouter>
    </ProgressProvider>
  )
}

export default App
