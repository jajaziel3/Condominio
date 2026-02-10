import { useNavigate } from 'react-router-dom';
import './home.css';

const Home = ({ usuario, onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await onLogout();
  };

  return (
    <div className="home-wrapper">
      <div className="home-header">
        <div className="header-top">
          <h1>Bienvenido, {usuario?.nombre}</h1>
          <button onClick={handleLogout} className="logout-btn">Cerrar Sesión</button>
        </div>
      </div>

      <section className="home-content">
        <div className="welcome-card">
          <h2>Bienvenido al Sistema de Condominio</h2>
          <p>Selecciona una opción del menú para comenzar</p>
          <div className="quick-links">
            <div className="quick-link-card" onClick={() => navigate('/chat')}>
              <h3>💬 Chat</h3>
              <p>Comunícate con la administración y vecinos</p>
            </div>
            <div className="quick-link-card" onClick={() => navigate('/notificaciones')}>
              <h3>🔔 Notificaciones</h3>
              <p>Ver tus notificaciones pendientes</p>
            </div>
            <div className="quick-link-card" onClick={() => alert('Proximamente')}>
              <h3>👥 Residentes</h3>
              <p>Directorio de residentes</p>
            </div>
            <div className="quick-link-card" onClick={() => alert('Proximamente')}>
              <h3>🚶 Visitantes</h3>
              <p>Gestionar visitantes</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
