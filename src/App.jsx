import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { ProgressProvider } from './context/ProgressContext'
import Navbar from './components/Navbar'
import Auth from './pages/Auth'
import Onboarding from './components/Onboarding'
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
import Module14 from './pages/modules/Module14'
import Module15 from './pages/modules/Module15'
import Module16 from './pages/modules/Module16'
import Module17 from './pages/modules/Module17'
import Module18 from './pages/modules/Module18'
import Module19 from './pages/modules/Module19'
import Module20 from './pages/modules/Module20'
import Module21 from './pages/modules/Module21'
import Module22 from './pages/modules/Module22'
import Module23 from './pages/modules/Module23'
import Module24 from './pages/modules/Module24'
import Module25 from './pages/modules/Module25'
import Module26 from './pages/modules/Module26'
import Module27 from './pages/modules/Module27'
import Module28 from './pages/modules/Module28'
import Module29 from './pages/modules/Module29'
import Module30 from './pages/modules/Module30'
import Module31 from './pages/modules/Module31'
import Module32 from './pages/modules/Module32'
import Module33 from './pages/modules/Module33'
import Module34 from './pages/modules/Module34'
import Module35 from './pages/modules/Module35'
import Module36 from './pages/modules/Module36'
import Module37 from './pages/modules/Module37'
import Tools from './pages/Tools'
import MentalGame from './pages/MentalGame'
import Infinite from './pages/Infinite'
import Arena from './pages/Arena'
import Stats from './pages/Stats'
import StudyGuide from './pages/StudyGuide'
import HandAnalysis from './pages/HandAnalysis'
import MultiStreet from './pages/MultiStreet'
import ArenaMultiway from './pages/ArenaMultiway'
import ArenaSpin from './pages/ArenaSpin'
import SpinStats from './pages/SpinStats'

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>Carregando...</div>
      </div>
    )
  }

  if (!user) return <Auth />

  const onboardingDone = localStorage.getItem('poker-academy-onboarding-done')
  if (!onboardingDone) {
    return <Onboarding onComplete={() => {
      localStorage.setItem('poker-academy-onboarding-done', '1')
      window.location.reload()
    }} />
  }

  return (
    <ProgressProvider userId={user.id} userEmail={user.email}>
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
          <Route path="/modulos/14" element={<Module14 />} />
          <Route path="/modulos/15" element={<Module15 />} />
          <Route path="/modulos/16" element={<Module16 />} />
          <Route path="/modulos/17" element={<Module17 />} />
          <Route path="/modulos/18" element={<Module18 />} />
          <Route path="/modulos/19" element={<Module19 />} />
          <Route path="/modulos/20" element={<Module20 />} />
          <Route path="/modulos/21" element={<Module21 />} />
          <Route path="/modulos/22" element={<Module22 />} />
          <Route path="/modulos/23" element={<Module23 />} />
          <Route path="/modulos/24" element={<Module24 />} />
          <Route path="/modulos/25" element={<Module25 />} />
          <Route path="/modulos/26" element={<Module26 />} />
          <Route path="/modulos/27" element={<Module27 />} />
          <Route path="/modulos/28" element={<Module28 />} />
          <Route path="/modulos/29" element={<Module29 />} />
          <Route path="/modulos/30" element={<Module30 />} />
          <Route path="/modulos/31" element={<Module31 />} />
          <Route path="/modulos/32" element={<Module32 />} />
          <Route path="/modulos/33" element={<Module33 />} />
          <Route path="/modulos/34" element={<Module34 />} />
          <Route path="/modulos/35" element={<Module35 />} />
          <Route path="/modulos/36" element={<Module36 />} />
          <Route path="/modulos/37" element={<Module37 />} />
          <Route path="/guia" element={<StudyGuide />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/ferramentas" element={<Tools />} />
          <Route path="/mental" element={<MentalGame />} />
          <Route path="/infinito" element={<Infinite />} />
          <Route path="/arena" element={<Arena />} />
          <Route path="/analise" element={<HandAnalysis />} />
          <Route path="/solver" element={<MultiStreet />} />
          <Route path="/arena-mtt" element={<ArenaMultiway />} />
          <Route path="/arena-spin" element={<ArenaSpin />} />
          <Route path="/spin-stats" element={<SpinStats />} />
        </Routes>
      </BrowserRouter>
    </ProgressProvider>
  )
}

export default App
