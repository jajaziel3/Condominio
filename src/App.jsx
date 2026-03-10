import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import authService from './services/authService'

// Componentes
import Register from './componentes/register'
import Login from './componentes/login'
import VerifyEmail from './componentes/verify-email'
import Chat from './componentes/chat'

// Componente de ruta protegida
function ProtectedRoute({ element, isAuthenticated, isLoading }) {
  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>Cargando...</div>
  }
  
  return isAuthenticated ? element : <Navigate to="/login" replace />
}

// Componente de Dashboard
function Dashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const currentUser = authService.getUser()
    setUser(currentUser)
    setLoading(false)
  }, [])

  const handleLogout = async () => {
    try {
      await authService.logout()
      window.location.href = '/login'
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>Cargando...</div>
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Condominio</h1>
        <div className="user-info">
          <span>Bienvenido, {user?.nombre || 'Usuario'}</span>
          <button onClick={handleLogout} className="btn-logout">Cerrar Sesión</button>
        </div>
      </header>
      <main className="dashboard-content">
        <Chat />
      </main>
    </div>
  )
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Verificar si hay sesión activa
    const token = authService.getToken()
    const user = authService.getUser()
    setIsAuthenticated(!!(token && user))
    setIsLoading(false)
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute 
              element={<Dashboard />} 
              isAuthenticated={isAuthenticated}
              isLoading={isLoading}
            />
          } 
        />
        <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App