import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';
import './auth.css';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [email, setEmail] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [tokenInput, setTokenInput] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    // Obtener email del sessionStorage si está disponible
    const pendingEmail = sessionStorage.getItem('pending_email');
    if (pendingEmail) {
      setEmail(pendingEmail);
    }

    // Si hay token en la URL, intentar verificar automáticamente
    if (token) {
      verifyEmailCode(token);
    }
  }, [token]);

  const verifyEmailCode = async (codeToVerify) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authService.verifyEmail(codeToVerify);
      setSuccess(response.message || 'Correo verificado exitosamente');
      
      // Redirigir al login después de 2 segundos
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.data?.message || 'Error al verificar el correo electrónico');
      setShowManualInput(true);
    } finally {
      setLoading(false);
    }
  };

  const handleManualVerify = async (e) => {
    e.preventDefault();
    
    if (!tokenInput.trim()) {
      setError('Por favor, ingresa el código de verificación');
      return;
    }

    await verifyEmailCode(tokenInput);
  };

  const handleResendEmail = async () => {
    if (!email.trim()) {
      setError('Por favor, ingresa tu correo electrónico');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authService.resendVerificationEmail(email);
      setSuccess(response.message || 'Se ha reenviado el correo de verificación');
      setShowManualInput(false);
    } catch (err) {
      setError(err.data?.message || 'Error al reenviar el correo de verificación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Verificar Correo Electrónico</h1>
        
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="verify-content">
          {!token && !showManualInput && (
            <>
              <p className="verify-text">
                Te hemos enviado un correo de verificación. Haz clic en el enlace en tu email para verificar tu cuenta.
              </p>
              
              <div className="form-group">
                <label htmlFor="resend-email">O ingresa tu correo para reenviar el email:</label>
                <input
                  id="resend-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  disabled={loading}
                />
              </div>

              <button 
                onClick={handleResendEmail}
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Reenviando...' : 'Reenviar Email de Verificación'}
              </button>

              <button 
                onClick={() => setShowManualInput(true)}
                className="btn btn-secondary"
                disabled={loading}
              >
                Tengo un código de verificación
              </button>
            </>
          )}

          {showManualInput && (
            <>
              <p className="verify-text">
                Ingresa el código de verificación que recibiste por email:
              </p>
              
              <form onSubmit={handleManualVerify}>
                <div className="form-group">
                  <label htmlFor="verification-token">Código de Verificación</label>
                  <input
                    id="verification-token"
                    type="text"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Copia el código del email"
                    disabled={loading}
                  />
                </div>

                <button 
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Verificando...' : 'Verificar'}
                </button>
              </form>

              <button 
                onClick={() => setShowManualInput(false)}
                className="btn btn-secondary-text"
                disabled={loading}
              >
                Volver
              </button>
            </>
          )}

          {success && (
            <p className="verify-success">
              Redirigiendo al login...
            </p>
          )}
        </div>

        <p className="auth-link">
          <Link to="/login">Volver al inicio de sesión</Link>
        </p>
      </div>
    </div>
  );
}
