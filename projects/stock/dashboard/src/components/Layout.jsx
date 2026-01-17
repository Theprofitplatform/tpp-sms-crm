import { Outlet } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import Sidebar from './Sidebar'
import { KeyboardShortcutsHelp } from '../hooks/useKeyboardShortcuts.jsx'
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts.jsx'
import 'react-toastify/dist/ReactToastify.css'

export default function Layout() {
  const { showHelp, setShowHelp } = useKeyboardShortcuts({
    // Global shortcuts handled here
  })

  return (
    <div className="app-layout">
      {/* Skip to main content link for keyboard users */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <Sidebar />

      <main id="main-content" className="main-content" role="main" tabIndex={-1}>
        <Outlet />
      </main>

      {/* Keyboard shortcuts help modal */}
      <KeyboardShortcutsHelp
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        role="alert"
        aria-live="polite"
      />
    </div>
  )
}
