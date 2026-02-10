import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CSSTransition } from 'react-transition-group';
import websocketService from '../services/websocket';
import './notifications-page.css';

// Mock local persistence (simula endpoints si no tienes backend)
const STORAGE_KEY = 'mock_notifications';

const now = () => new Date().toISOString();

const defaultSeed = () => ([
  { id: 1, category: 'pago', title: 'Pago Pendiente', body: 'Tienes una cuota pendiente que vence mañana', isRead: false, createdAt: now() },
  { id: 2, category: 'mantenimiento', title: 'Mantenimiento Programado', body: 'Corte de agua el miércoles de 9:00 a 12:00', isRead: false, createdAt: now() }
]);

const readStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = defaultSeed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Error leyendo storage de notificaciones:', err.message);
    return [];
  }
};

const writeStorage = (list) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Error escribiendo storage de notificaciones:', err.message);
  }
};

const NotificationsPage = ({ token, usuario }) => {
  const [notifs, setNotifs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null); // { id, title }
  const [inProp, setInProp] = useState(true); // Para controlar la transición
  const location = useLocation();
  const navigate = useNavigate();

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      if (token) {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/api/notificaciones`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
        const data = await res.json();
        if (data && data.success && Array.isArray(data.data)) {
          const mapped = data.data.map(n => ({
            id: n.id,
            category: n.category || n.tipo || 'general',
            title: n.titulo || n.title || 'Notificación',
            body: n.mensaje || n.descripcion || n.body || '',
            isRead: !!n.leida,
            createdAt: n.created_at || n.createdAt || n.fecha || new Date().toISOString(),
            raw: n
          }));

          const sorted = mapped.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
          setNotifs(sorted);
          setUnreadCount(sorted.filter(x => !x.isRead).length);
          writeStorage(sorted);
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('No se pudo cargar notificaciones del servidor:', err.message);
    }

    // Fallback local
    const list = readStorage();
    setNotifs(list.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
    setUnreadCount(list.filter(n => !n.isRead).length);
    setLoading(false);
  };

  const markAsRead = async (id) => {
    // Intentar marcar en servidor
    try {
      if (token) {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        await fetch(`${apiUrl}/api/notificaciones/${id}/marcar-leida`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        });
      }
    } catch (err) {
      console.warn('No se pudo marcar la notificación en servidor:', err.message);
    }

    setNotifs(prev => {
      const updated = prev.map(n => n.id === id ? {...n, isRead: true} : n);
      writeStorage(updated);
      setUnreadCount(updated.filter(x => !x.isRead).length);
      return updated;
    });
  };

  const removeNotif = async (id) => {
    // Intentar eliminar en servidor
    try {
      if (token) {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        await fetch(`${apiUrl}/api/notificaciones/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        });
      }
    } catch (err) {
      console.warn('No se pudo eliminar la notificación en servidor:', err.message);
    }

    setNotifs(prev => {
      const updated = prev.filter(n => n.id !== id);
      writeStorage(updated);
      setUnreadCount(updated.filter(x => !x.isRead).length);
      return updated;
    });
  };

  useEffect(() => {
    fetchNotifs();

    const unsubscribe = websocketService.subscribe((payload) => {
      if (payload.type === 'notification') {
        const n = payload.data || {};
        const newNotif = {
          id: n.id || Date.now(),
          category: n.category || 'general',
          title: n.title || n.titulo || 'Notificación',
          body: n.body || n.mensaje || '',
          isRead: false,
          createdAt: n.createdAt || new Date().toISOString(),
          raw: n
        };

        setNotifs(prev => {
          const updated = [newNotif, ...prev].slice(0, 100);
          writeStorage(updated);
          setUnreadCount(updated.filter(x => !x.isRead).length);
          return updated;
        });
      }
    });

    // Si venimos con una notificación seleccionada (desde el botón), navegamos al detalle y la marcamos
    if (location && location.state && location.state.notifId) {
      (async () => {
        const id = location.state.notifId;
        await markAsRead(id);
        navigate(`/notificaciones/${id}`);
      })();
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [token, location && location.state]);


  return (
    <CSSTransition in={inProp} timeout={400} classNames="notifications-page" unmountOnExit={false}>
      <div className="notifications-page-wrapper">
        <div className="notifications-page">
          <div className="page-header">
            <h1>NOTIFICACIONES</h1>
            <p className="subtitle">Tienes {unreadCount} notificación(es) sin leer</p>
          </div>

          <div className="notifs-list">
            {loading ? (
              <div className="empty">Cargando...</div>
            ) : notifs.length === 0 ? (
              <div className="empty">No hay notificaciones</div>
            ) : (
              notifs.map(n => (
                <div key={n.id} className={`notif-card ${n.isRead ? 'read' : 'unread'}`} onClick={() => navigate(`/notificaciones/${n.id}`)}>
                  <div className="notif-main">
                    <div className="notif-title">{n.title}</div>
                    <div className="notif-body">{n.body}</div>
                  </div>
                  <div className="notif-actions">
                    <div className="notif-meta">{new Date(n.createdAt).toLocaleString()}</div>
                    <div className="buttons">
                      {!n.isRead && <button className="mark-read" onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}>Marcar leído</button>}
                      <button className="delete" onClick={(e) => { e.stopPropagation(); setConfirm({ id: n.id, title: n.title }); }}>Eliminar</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {confirm && (
            <div className="confirm-overlay">
              <div className="confirm-card">
                <h3>Eliminar Notificación</h3>
                <p>¿Estás seguro que deseas eliminar "<strong>{confirm.title}</strong>"?</p>
                <div className="confirm-actions">
                  <button className="delete" onClick={() => { removeNotif(confirm.id); setConfirm(null); }}>Eliminar</button>
                  <button className="cancel" onClick={() => setConfirm(null)}>Cancelar</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </CSSTransition>
  );
};

export default NotificationsPage;