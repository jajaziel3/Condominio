// src/componentes/register.jsx
import { useState } from 'react';
import './auth.css';

const Register = ({ onRegistrationSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    password_confirmation: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validaciones básicas
    if (!formData.nombre.trim()) {
      setError('El nombre es requerido')
      return
    }

    if (!formData.apellido.trim()) {
      setError('El apellido es requerido')
      return;
    }

    if (!formData.email.includes('@')) {
      setError('Email inválido');
      return;
    }

    if (formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (formData.password !== formData.password_confirmation) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          nombre: formData.nombre,
          apellido: formData.apellido,
          email: formData.email,
          password: formData.password,
          password_confirmation: formData.password_confirmation,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('¡Registro exitoso! Bienvenido ' + formData.nombre);
        
        // Guardar token en localStorage (compartido entre pestañas)
        localStorage.setItem('auth_token', data.data.token);
        // Guardar usuario en sessionStorage (específico de esta pestaña)
        sessionStorage.setItem('usuario', JSON.stringify(data.data.usuario));

        // Limpiar formulario
        setFormData({
          nombre: '',
          apellido: '',
          email: '',
          password: '',
          password_confirmation: '',
        });

        // Llamar callback después de 1.5 segundos
        setTimeout(() => {
          onRegistrationSuccess(data.data.usuario, data.data.token);
        }, 1500);
      } else {
        setError(data.message || 'Error en el registro');
      }
    } catch (err) {
      setError('Error al conectar con el servidor: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>Crear Cuenta</h2>
        
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="nombre">Nombre:</label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Tu nombre"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="apellido">Apellido:</label>
            <input
              type="text"
              id="apellido"
              name="apellido"
              value={formData.apellido}
              onChange={handleChange}
              placeholder="Tu apellido"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="tu@email.com"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña:</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Mínimo 8 caracteres"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password_confirmation">Confirmar Contraseña:</label>
            <input
              type="password"
              id="password_confirmation"
              name="password_confirmation"
              value={formData.password_confirmation}
              onChange={handleChange}
              placeholder="Repite tu contraseña"
              disabled={loading}
            />
          </div>

          <button type="submit" disabled={loading} className="btn-submit">
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
