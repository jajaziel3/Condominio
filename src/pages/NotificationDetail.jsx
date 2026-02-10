import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './notifications-detail.css';

// Helpers for local fallback
const STORAGE_KEY = 'mock_notifications';
const readStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
};
const writeStorage = (list) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (err) {}
};

const NotificationDetail = ({ token }) => {
  const { id } = useParams();
  const [notif, setNotif] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (token) {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          const res = await fetch(`${apiUrl}/api/notificaciones/${id}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
          });
          const data = await res.json();
          if (data && data.success && data.data) {
            setNotif({ id: data.data.id, title: data.data.titulo || data.data.title, body: data.data.mensaje || data.data.body, category: data.data.category || data.data.tipo, createdAt: data.data.created_at || data.data.createdAt });
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('No se pudo obtener detalle del servidor:', err.message);
      }

      // Fallback local
      const list = readStorage();
      const f = list.find(n => String(n.id) === String(id));
      if (f) setNotif(f);
      setLoading(false);
    };

    load();
  }, [id, token]);

  const markRead = async () => {
    try {
      if (token) {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        await fetch(`${apiUrl}/api/notificaciones/${id}/marcar-leida`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
      }
    } catch (err) {
      console.warn('No se pudo marcar en servidor:', err.message);
    }

    // local update
    const list = readStorage();
    const updated = list.map(n => n.id === Number(id) ? {...n, isRead: true} : n);
    writeStorage(updated);
    navigate('/notificaciones');
  };

  const doDelete = async () => {
    try {
      if (token) {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        await fetch(`${apiUrl}/api/notificaciones/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
      }
    } catch (err) {
      console.warn('No se pudo eliminar en servidor:', err.message);
    }

    // local update
    const list = readStorage();
    const updated = list.filter(n => String(n.id) !== String(id));
    writeStorage(updated);
    navigate('/notificaciones');
  };

  const handleDeleteClick = () => setConfirmOpen(true);
  const confirmRemove = async () => { await doDelete(); setConfirmOpen(false); }; 

  if (loading) return <div className="notif-detail-page"><p>Cargando...</p></div>;
  if (!notif) return <div className="notif-detail-page"><p>No se encontró la notificación</p></div>;

  return (
    <div className="notif-detail-page">
      <div className="detail-card">
        <h2>{notif.title}</h2>
        <p className="meta">Tipo: <strong>{notif.category}</strong> • {notif.createdAt ? new Date(notif.createdAt).toLocaleString() : ''}</p>
        <div className="detail-body">{notif.body}</div>
        <div className="actions">
          <button className="mark-read" onClick={markRead}>Marcar leído</button>
          <button className="delete" onClick={handleDeleteClick}>Eliminar</button>
          <button className="back" onClick={() => navigate('/notificaciones')}>Volver</button>
        </div>
      </div>

      {confirmOpen && (
        <div className="confirm-overlay">
          <div className="confirm-card">
            <h3>Eliminar Notificación</h3>
            <p>¿Estás seguro que deseas eliminar esta notificación?</p>
            <div className="confirm-actions">
              <button className="delete" onClick={confirmRemove}>Eliminar</button>
              <button className="cancel" onClick={() => setConfirmOpen(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default NotificationDetail;