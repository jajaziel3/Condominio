import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';
import './auth.css';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email.trim() || !formData.password.trim()) {
      setError('Por favor, completa todos los campos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authService.login(formData.email, formData.password);
      
      // Redirigir al dashboard después de login exitoso
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } catch (err) {
      if (err.data?.email_verified === false) {
        setError(err.data?.message || 'Por favor, verifica tu correo electrónico');
        // Permitir reenvío de email
        sessionStorage.setItem('pending_email', formData.email);
      } else if (err.data?.message) {
        setError(err.data.message);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Error al iniciar sesión. Por favor, intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Iniciar Sesión</h1>
        
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="tu@email.com"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña *</label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Tu contraseña"
              disabled={loading}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Iniciando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <p className="auth-link">
          ¿No tienes cuenta? <Link to="/register">Regístrate aquí</Link>
        </p>
      </div>
    </div>
  );
}
