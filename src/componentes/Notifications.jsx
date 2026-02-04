import { useState, useEffect, useRef } from 'react';
import websocketService from '../services/websocket';
import './notifications.css';

import { useNavigate } from 'react-router-dom';

const Notifications = ({ token, onOpenNotification, usuario }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    // Cargar notificaciones iniciales (si existe backend)
    const loadInitial = async () => {
      try {
        if (!token) return;
        const res = await fetch('http://localhost:8000/api/notificaciones', {
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
            title: n.titulo || n.asunto || n.title || 'Notificación',
            body: n.mensaje || n.descripcion || n.body || '',
            data: n,
            isRead: !!n.leida,
            createdAt: n.created_at || n.fecha || Date.now()
          }));
          setNotifications(mapped);
          setUnreadCount(mapped.filter(n => !n.isRead).length);
        }
      } catch (err) {
        // No hay endpoint o falló: ignoramos
        console.warn('No se pudo cargar notificaciones iniciales:', err.message);
      }
    };

    loadInitial();

    const unsubscribe = websocketService.subscribe((payload) => {
      if (payload.type === 'notification') {
        const n = payload.data;
        // Si es un 'mensaje', mostrarlo solo al destinatario
        const category = n.category || 'general';
        const payloadData = n.data || n;
        const myName = usuario ? (usuario.nombre + ' ' + usuario.apellido) : null;

        if (category === 'mensaje') {
          // Determinar destinatario si existe
          const recipient = payloadData.to || payloadData.destinatario_nombre || (payloadData.data && (payloadData.data.to || payloadData.data.destinatario_nombre));
          const senderId = payloadData.id_usuario || (payloadData.data && payloadData.data.id_usuario);

          // Si hay destinatario y no soy yo, ignorar
          if (recipient && myName && recipient !== myName) {
            return;
          }

          // Si el evento viene del remitente (yo), tampoco mostrar notificación
          if (senderId && usuario && senderId === usuario.id_usuario) {
            return;
          }
        }

        const newNotif = {
          id: n.id || Date.now(),
          category: n.category || 'general',
          title: n.title || 'Notificación',
          body: n.body || '',
          data: n.data || n,
          isRead: false,
          createdAt: n.created_at || Date.now()
        };

        setNotifications(prev => [newNotif, ...prev].slice(0, 50));
        setUnreadCount(c => c + 1);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [token]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const toggleOpen = () => {
    setOpen(!open);
    if (!open) {
      // Abrir dropdown: marcar todos temporalmente como leídos localmente
      setUnreadCount(0);
    }
  };

  const openNotification = (notif) => {
    // Marcar como leído localmente
    setNotifications(prev => prev.map(n => n.id === notif.id ? {...n, isRead: true} : n));
    setSelected(notif);
    setOpen(false);

    // Intentamos marcar como leído en el servidor (si tenemos token)
    (async () => {
      if (!token) return;
      try {
        await fetch(`http://localhost:8000/api/notificaciones/${notif.id}/marcar-leida`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
      } catch (err) {
        console.warn('No se pudo marcar notificación en servidor:', err.message);
      }
    })();

    // Navegar a la página de notificaciones con estado para abrir el detalle
    try {
      navigate('/notificaciones', { state: { notifId: notif.id } });
    } catch (err) {
      // si no hay router, fallback a handler externo
      if (typeof onOpenNotification === 'function') {
        onOpenNotification(notif);
      }
    }

    // Llamar handler externo si lo provee el padre
    if (typeof onOpenNotification === 'function') {
      onOpenNotification(notif);
    }
  }; 

  const closeDetail = () => setSelected(null);

  return (
    <div className="notifications-container" ref={containerRef}>
      <button className={`notifications-button ${unreadCount > 0 ? 'has-unread' : ''}`} onClick={toggleOpen} title="Notificaciones">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notifications-dropdown">
          <div className="dropdown-header">Notificaciones</div>
          {notifications.length === 0 ? (
            <div className="dropdown-empty">No hay notificaciones</div>
          ) : (
            notifications.map(notif => (
              <div key={notif.id} className={`notif-item ${notif.isRead ? 'read' : 'unread'}`} onClick={() => openNotification(notif)}>
                <div className="notif-left">
                  <div className="notif-title">{notif.title}</div>
                  <div className="notif-body">{notif.body}</div>
                </div>
                <div className="notif-right">
                  <div className="notif-category">{notif.category}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {selected && (
        <div className="notif-detail-overlay">
          <div className="notif-detail">
            <h3>{selected.title}</h3>
            <p className="detail-meta">Tipo: <strong>{selected.category}</strong></p>
            <div className="detail-body">{selected.body}</div>
            <div className="detail-actions">
              <button onClick={() => { if (onOpenNotification) onOpenNotification(selected); closeDetail(); }}>Ir al detalle</button>
              <button className="close" onClick={closeDetail}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;