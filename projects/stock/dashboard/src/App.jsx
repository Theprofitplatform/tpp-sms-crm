import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ApiProvider } from './context/ApiContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import PositionsPage from './pages/PositionsPage'
import OrdersPage from './pages/OrdersPage'
import SignalsPage from './pages/SignalsPage'
import SettingsPage from './pages/SettingsPage'
import useKeyboardShortcuts, { KeyboardShortcutsHelp } from './hooks/useKeyboardShortcuts'

// Wrapper component that uses keyboard shortcuts (must be inside BrowserRouter)
function AppContent() {
  const { showHelp, setShowHelp } = useKeyboardShortcuts({
    onRefresh: () => {
      // Could dispatch a global refresh event here
      window.dispatchEvent(new CustomEvent('app-refresh'))
    },
  })

  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="positions" element={<PositionsPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="signals" element={<SignalsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
      <KeyboardShortcutsHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}

function App() {
  return (
    <ApiProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ApiProvider>
  )
}

export default App
