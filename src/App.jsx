import { useState, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { ProgressProvider } from './context/ProgressContext'
import Navbar from './components/Navbar'
import Auth from './pages/Auth'
import Onboarding from './components/Onboarding'
import Dashboard from './pages/Dashboard'
import Modules from './pages/Modules'

// Lazy loading: cada modulo/pagina pesada vira um chunk separado,
// carregado apenas quando a rota abre (bundle inicial ~10x menor)
const MODULE_PAGES = import.meta.glob('./pages/modules/Module*.jsx')
const moduleComponents = {}
for (let i = 1; i <= 37; i++) {
  moduleComponents[i] = lazy(MODULE_PAGES[`./pages/modules/Module${i}.jsx`])
}

const StudyGuide = lazy(() => import('./pages/StudyGuide'))
const Stats = lazy(() => import('./pages/Stats'))
const Tools = lazy(() => import('./pages/Tools'))
const MentalGame = lazy(() => import('./pages/MentalGame'))
const Infinite = lazy(() => import('./pages/Infinite'))
const Arena = lazy(() => import('./pages/Arena'))
const HandAnalysis = lazy(() => import('./pages/HandAnalysis'))
const MultiStreet = lazy(() => import('./pages/MultiStreet'))
const ArenaMultiway = lazy(() => import('./pages/ArenaMultiway'))
const ArenaSpin = lazy(() => import('./pages/ArenaSpin'))
const SpinStats = lazy(() => import('./pages/SpinStats'))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>Carregando...</div>
    </div>
  )
}

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
    return <PageLoader />
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
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/modulos" element={<Modules />} />
            {Array.from({ length: 37 }, (_, i) => i + 1).map(id => {
              const ModulePage = moduleComponents[id]
              return <Route key={id} path={`/modulos/${id}`} element={<ModulePage />} />
            })}
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
        </Suspense>
      </BrowserRouter>
    </ProgressProvider>
  )
}

export default App
