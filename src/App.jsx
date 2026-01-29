import { useState, useEffect } from 'react'
import './App.css'
import Chat from './componentes/chat' 
import Login from './componentes/login'
import Register from './componentes/register'

function App() {
  const [authState, setAuthState] = useState('checking') // checking, login, register, authenticated
  const [usuario, setUsuario] = useState(null)
  const [token, setToken] = useState(null)

  // Verificar si hay una sesión activa
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token')
    const savedUser = sessionStorage.getItem('usuario')

    if (savedToken && savedUser) {
      try {
        setToken(savedToken)
        setUsuario(JSON.parse(savedUser))
        setAuthState('authenticated')
      } catch (error) {
        console.error('Error al restaurar sesión:', error)
        localStorage.removeItem('auth_token')
        sessionStorage.removeItem('usuario')
        setAuthState('login')
      }
    } else {
      setAuthState('login')
    }
  }, [])

  const handleLoginSuccess = (userData, authToken) => {
    setUsuario(userData)
    setToken(authToken)
    setAuthState('authenticated')
  }

  const handleRegistrationSuccess = (userData, authToken) => {
    setUsuario(userData)
    setToken(authToken)
    setAuthState('authenticated')
  }

  const handleLogout = async () => {
    try {
      // Llamar al endpoint de logout si es necesario
      await fetch('http://localhost:8000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      })
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    } finally {
      // Limpiar localStorage y sessionStorage
      localStorage.removeItem('auth_token')
      sessionStorage.removeItem('usuario')
      
      // Cambiar estado
      setUsuario(null)
      setToken(null)
      setAuthState('login')
    }
  }

  const handleSwitchToRegister = () => {
    setAuthState('register')
  }

  const handleSwitchToLogin = () => {
    setAuthState('login')
  }

  if (authState === 'checking') {
    return (
      <div className="App loading">
        <p>Verificando sesión...</p>
      </div>
    )
  }

  if (authState === 'login') {
    return (
      <div className="App">
        <Login 
          onLoginSuccess={handleLoginSuccess}
          onSwitchToRegister={handleSwitchToRegister}
        />
      </div>
    )
  }

  if (authState === 'register') {
    return (
      <div className="App">
        <Register 
          onRegistrationSuccess={handleRegistrationSuccess}
        />
        <p className="switch-text">
          ¿Ya tienes cuenta? 
          <button 
            className="switch-button"
            onClick={handleSwitchToLogin}
          >
            Inicia sesión
          </button>
        </p>
      </div>
    )
  }

  return (
    <div className="App">
      <Chat 
        usuario={usuario}
        token={token}
        onLogout={handleLogout}
      />
    </div>
  )
}

export default App