import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';
import './auth.css';

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    password_confirmation: '',
    telefono: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.nombre.trim()) {
      setError('El nombre es requerido');
      return false;
    }
    if (!formData.apellido.trim()) {
      setError('El apellido es requerido');
      return false;
    }
    if (!formData.email.trim()) {
      setError('El email es requerido');
      return false;
    }
    if (!formData.email.includes('@')) {
      setError('El email no es válido');
      return false;
    }
    if (formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return false;
    }
    if (formData.password !== formData.password_confirmation) {
      setError('Las contraseñas no coinciden');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authService.register({
        nombre: formData.nombre,
        apellido: formData.apellido,
        email: formData.email,
        password: formData.password,
        password_confirmation: formData.password_confirmation,
        telefono: formData.telefono || null,
      });

      setSuccess(response.message || 'Registro exitoso. Por favor, verifica tu correo electrónico.');
      
      // Guardar email para la pantalla de verificación
      sessionStorage.setItem('pending_email', formData.email);
      
      // Redirigir a verificación después de 2 segundos
      setTimeout(() => {
        navigate('/verify-email');
      }, 2000);
    } catch (err) {
      if (err.message) {
        setError(err.message);
      } else if (err.data?.message) {
        setError(err.data.message);
      } else if (err.data?.errors) {
        const firstError = Object.values(err.data.errors)[0];
        setError(Array.isArray(firstError) ? firstError[0] : firstError);
      } else {
        setError('Error al registrar. Por favor, intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Crear Cuenta</h1>
        
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="nombre">Nombre *</label>
            <input
              id="nombre"
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Tu nombre"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="apellido">Apellido *</label>
            <input
              id="apellido"
              type="text"
              name="apellido"
              value={formData.apellido}
              onChange={handleChange}
              placeholder="Tu apellido"
              disabled={loading}
              required
            />
          </div>

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
            <label htmlFor="telefono">Teléfono (Opcional)</label>
            <input
              id="telefono"
              type="tel"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              placeholder="Tu número de teléfono"
              disabled={loading}
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
              placeholder="Mínimo 8 caracteres"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password_confirmation">Confirmar Contraseña *</label>
            <input
              id="password_confirmation"
              type="password"
              name="password_confirmation"
              value={formData.password_confirmation}
              onChange={handleChange}
              placeholder="Repite tu contraseña"
              disabled={loading}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>

        <p className="auth-link">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión aquí</Link>
        </p>
      </div>
    </div>
  );
}
