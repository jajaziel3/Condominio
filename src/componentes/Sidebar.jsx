import { useNavigate, useLocation } from 'react-router-dom';
import './layout.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { label: 'INICIO', path: '/', icon: '🏠' },
    { label: 'RESIDENTES', path: null, action: () => alert('Sección de residentes en desarrollo'), icon: '👥' },
    { label: 'VISITANTES', path: null, action: () => alert('Sección de visitantes en desarrollo'), icon: '🚶' },
    { label: 'CHAT', path: '/chat', icon: '💬' },
    { label: 'NOTIFICACIONES', path: '/notificaciones', icon: '🔔' },
  ];

  const handleMenuClick = (item) => {
    if (item.path) {
      navigate(item.path);
    } else if (item.action) {
      item.action();
    }
  };

  const isActive = (path) => path && location.pathname === path;

  return (
    <aside className="app-sidebar">
      <div className="sidebar-inner">
        <ul className="side-menu">
          {menuItems.map((item, idx) => (
            <li
              key={idx}
              className={`menu-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => handleMenuClick(item)}
              data-label={item.label}
              style={{ cursor: item.path || item.action ? 'pointer' : 'default' }}
            >
              <span className="menu-icon">{item.icon}</span>
              <span className="menu-label">{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;
