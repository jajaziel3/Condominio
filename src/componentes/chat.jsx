// src/componentes/chat.jsx
import { useState, useEffect, useRef } from 'react';
import websocketService from '../services/websocket';
import './chat.css';

const Chat = ({ usuario, token, onLogout }) => {
  const [mensajes, setMensajes] = useState([]);
  const [inputMensaje, setInputMensaje] = useState('');
  const [asunto, setAsunto] = useState('');
  const [tipo, setTipo] = useState('consulta');
  const [prioridad, setPrioridad] = useState('media');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensajes]);

  // Cargar historial de mensajes
  const loadMessageHistory = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/mensajes/listar', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
      const data = await response.json();
      
      if (data.success) {
        const loadedMessages = data.data.map(msg => ({
          id_mensaje: msg.id_mensaje,
          id_usuario: msg.id_usuario,
          nombre_usuario: msg.usuario.nombre + ' ' + msg.usuario.apellido,
          asunto: msg.asunto,
          contenido: msg.contenido,
          tipo: msg.tipo,
          prioridad: msg.prioridad,
          estado: msg.estado,
          fecha_envio: msg.fecha_envio,
          isOwn: msg.id_usuario === usuario.id_usuario
        }));
        setMensajes(loadedMessages);
      }
    } catch (error) {
      console.error('Error al cargar historial:', error);
      setError('Error al cargar mensajes anteriores');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let unsubscribe = null;
    let pollingInterval = null;

    const initWebSocket = async () => {
      try {
        // Cargar historial cuando se monta el componente
        console.log('📚 Cargando historial de mensajes...');
        await loadMessageHistory();
        console.log('✅ Historial cargado');

        // Conectar a WebSocket
        console.log('🚀 Iniciando conexión WebSocket...');
        await websocketService.connect();
        console.log('✅ WebSocket conectado');

        // Suscribirse a eventos WebSocket
        unsubscribe = websocketService.subscribe((data) => {
          console.log('📡 Evento WebSocket recibido:', data.type);
          
          if (data.type === 'message') {
            console.log('📨 Procesando nuevo mensaje:', data.data.id_mensaje);
            
            // Verificar que no sea un duplicado
            setMensajes(prev => {
              const exists = prev.some(msg => msg.id_mensaje === data.data.id_mensaje);
              
              if (exists) {
                console.log('⚠️ Mensaje duplicado, ignorando ID:', data.data.id_mensaje);
                return prev;
              }
              
              const newMessage = {
                id_mensaje: data.data.id_mensaje,
                id_usuario: data.data.id_usuario,
                nombre_usuario: data.data.usuario.nombre + ' ' + data.data.usuario.apellido,
                asunto: data.data.asunto,
                contenido: data.data.contenido,
                tipo: data.data.tipo,
                prioridad: data.data.prioridad,
                estado: data.data.estado,
                fecha_envio: data.data.fecha_envio,
                isOwn: data.data.id_usuario === usuario.id_usuario
              };
              
              console.log('✅ Agregando nuevo mensaje:', newMessage.id_mensaje);
              return [...prev, newMessage];
            });
          }
        });

        // FALLBACK: Polling cada 3 segundos para nuevos mensajes (en caso de que WebSocket falle)
        console.log('⏱️ Iniciando polling de respaldo...');
        let lastMessageId = Math.max(0, ...mensajes.map(m => m.id_mensaje));
        
        pollingInterval = setInterval(async () => {
          try {
            const response = await fetch('http://localhost:8000/api/mensajes/listar', {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
              },
            });
            const data = await response.json();
            
            if (data.success) {
              const newMessages = data.data.filter(msg => msg.id_mensaje > lastMessageId);
              
              if (newMessages.length > 0) {
                console.log(`⏱️ Polling encontró ${newMessages.length} nuevo(s) mensaje(s)`);
                newMessages.forEach(msg => {
                  lastMessageId = Math.max(lastMessageId, msg.id_mensaje);
                  
                  setMensajes(prev => {
                    const exists = prev.some(m => m.id_mensaje === msg.id_mensaje);
                    if (exists) return prev;
                    
                    return [...prev, {
                      id_mensaje: msg.id_mensaje,
                      id_usuario: msg.id_usuario,
                      nombre_usuario: msg.usuario.nombre + ' ' + msg.usuario.apellido,
                      asunto: msg.asunto,
                      contenido: msg.contenido,
                      tipo: msg.tipo,
                      prioridad: msg.prioridad,
                      estado: msg.estado,
                      fecha_envio: msg.fecha_envio,
                      isOwn: msg.id_usuario === usuario.id_usuario
                    }];
                  });
                });
              }
            }
          } catch (err) {
            console.warn('⏱️ Error en polling:', err.message);
          }
        }, 3000);
      } catch (error) {
        console.error('❌ Error en initWebSocket:', error);
      }
    };

    initWebSocket();

    return () => {
      console.log('🧹 Limpiando WebSocket y polling...');
      if (unsubscribe) unsubscribe();
      if (pollingInterval) clearInterval(pollingInterval);
      websocketService.disconnect();
    };
  }, [token, usuario]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMensaje.trim()) {
      setError('El mensaje no puede estar vacío');
      return;
    }

    setError('');
    setSuccess('');
    const messageToSend = inputMensaje;
    setInputMensaje('');

    try {
      console.log('📤 Enviando mensaje...');
      const response = await fetch('http://localhost:8000/api/mensajes/enviar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          asunto: asunto || 'Mensaje de ' + usuario.nombre,
          contenido: messageToSend,
          tipo: tipo,
          prioridad: prioridad,
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Mensaje enviado al servidor');
        setSuccess('Mensaje enviado correctamente');
        setAsunto('');
        // El mensaje llegará a través del WebSocket
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Error al enviar mensaje');
      }
    } catch (err) {
      setError('Error al conectar con el servidor: ' + err.message);
      console.error('Error:', err);
    }
  };

  const getPrioridadColor = (prioridad) => {
    switch (prioridad) {
      case 'baja':
        return '#10b981';
      case 'media':
        return '#f59e0b';
      case 'alta':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getEstadoBg = (estado) => {
    switch (estado) {
      case 'pendiente':
        return '#fef3c7';
      case 'en_proceso':
        return '#dbeafe';
      case 'resuelto':
        return '#dcfce7';
      case 'cerrado':
        return '#f3f4f6';
      default:
        return '#ffffff';
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="header-content">
          <h2>Sistema de Mensajes</h2>
          <span className="username-badge">
            {usuario.nombre} {usuario.apellido}
            {usuario.rol && <span className="rol-badge">{usuario.rol}</span>}
          </span>
        </div>
        <button 
          className="logout-button"
          onClick={onLogout}
          title="Cerrar sesión"
        >
          Salir
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError('')} className="close-error">×</button>
        </div>
      )}

      {success && (
        <div className="success-message">
          {success}
          <button onClick={() => setSuccess('')} className="close-success">×</button>
        </div>
      )}

      <div className="messages-container">
        {isLoading ? (
          <div className="empty-state">
            <p>Cargando mensajes...</p>
          </div>
        ) : mensajes.length === 0 ? (
          <div className="empty-state">
            <p>No hay mensajes aún. ¡Envía uno!</p>
          </div>
        ) : (
          mensajes.map((message) => (
            <div 
              key={message.id_mensaje} 
              className={`message ${message.isOwn ? 'message-own' : 'message-other'}`}
              style={{ backgroundColor: getEstadoBg(message.estado) }}
            >
              <div className="message-header">
                <div className="message-left">
                  <span className="message-user">{message.nombre_usuario}</span>
                  <span className="message-type">{message.tipo}</span>
                </div>
                <div className="message-right">
                  <span 
                    className="message-prioridad" 
                    style={{ color: getPrioridadColor(message.prioridad) }}
                  >
                    {message.prioridad}
                  </span>
                  <span className="message-estado">{message.estado}</span>
                </div>
              </div>
              {message.asunto && (
                <div className="message-asunto"><strong>{message.asunto}</strong></div>
              )}
              <div className="message-content">{message.contenido}</div>
              <div className="message-footer">
                <span className="message-time">
                  {new Date(message.fecha_envio).toLocaleString('es-MX', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="message-input-container" onSubmit={handleSendMessage}>
        <div className="form-group-row">
          <input
            type="text"
            placeholder="Asunto (opcional)"
            value={asunto}
            onChange={(e) => setAsunto(e.target.value)}
            className="input-field input-asunto"
            maxLength="200"
          />
        </div>

        <div className="form-group-row">
          <select 
            value={tipo} 
            onChange={(e) => setTipo(e.target.value)}
            className="input-field input-select"
          >
            <option value="consulta">Consulta</option>
            <option value="queja">Queja</option>
            <option value="sugerencia">Sugerencia</option>
            <option value="aviso">Aviso</option>
            <option value="emergencia">Emergencia</option>
          </select>

          <select 
            value={prioridad} 
            onChange={(e) => setPrioridad(e.target.value)}
            className="input-field input-select"
          >
            <option value="baja">Prioridad Baja</option>
            <option value="media">Prioridad Media</option>
            <option value="alta">Prioridad Alta</option>
          </select>
        </div>

        <div className="form-group-row">
          <textarea
            placeholder="Escribe tu mensaje..."
            value={inputMensaje}
            onChange={(e) => setInputMensaje(e.target.value)}
            className="message-input"
            rows="4"
          />
        </div>

        <button 
          type="submit" 
          className="send-button"
          disabled={!inputMensaje.trim()}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
          Enviar Mensaje
        </button>
      </form>
    </div>
  );
};

export default Chat;