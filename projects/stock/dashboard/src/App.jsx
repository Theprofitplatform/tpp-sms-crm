import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ApiProvider } from './context/ApiContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import PositionsPage from './pages/PositionsPage'
import OrdersPage from './pages/OrdersPage'
import SignalsPage from './pages/SignalsPage'
import SettingsPage from './pages/SettingsPage'

function App() {
  return (
    <ApiProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="positions" element={<PositionsPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="signals" element={<SignalsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ApiProvider>
  )
}

export default App
