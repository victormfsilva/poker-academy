import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ProgressProvider } from './context/ProgressContext'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import Modules from './pages/Modules'
import Module1 from './pages/modules/Module1'
import Module2 from './pages/modules/Module2'
import Module3 from './pages/modules/Module3'
import Module4 from './pages/modules/Module4'
import Module5 from './pages/modules/Module5'
import Module6 from './pages/modules/Module6'
import Tools from './pages/Tools'

function App() {
  return (
    <ProgressProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/modulos" element={<Modules />} />
          <Route path="/modulos/1" element={<Module1 />} />
          <Route path="/modulos/2" element={<Module2 />} />
          <Route path="/modulos/3" element={<Module3 />} />
          <Route path="/modulos/4" element={<Module4 />} />
          <Route path="/modulos/5" element={<Module5 />} />
          <Route path="/modulos/6" element={<Module6 />} />
          <Route path="/ferramentas" element={<Tools />} />
        </Routes>
      </BrowserRouter>
    </ProgressProvider>
  )
}

export default App
