// src/componentes/chat.jsx
import { useState, useEffect, useRef, useMemo } from 'react';
import websocketService from '../services/websocket';
import Notifications from './Notifications';
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
  const [highlightId, setHighlightId] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Resaltar un mensaje por 4 segundos
  const highlightMessage = (id) => {
    setHighlightId(id);
    setTimeout(() => setHighlightId(null), 4000);
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensajes]);

  // Cargar historial de mensajes
  const loadMessageHistory = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/mensajes/listar`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
      const data = await response.json();
      
      if (data.success) {
        const excludedNames = ['Sistema', 'Prueba user'];
        const loadedMessages = data.data
          .map(msg => ({
            id_mensaje: msg.id_mensaje,
            id_usuario: msg.id_usuario,
            nombre_usuario: msg.usuario.nombre + ' ' + msg.usuario.apellido,
            asunto: msg.asunto,
            contenido: msg.contenido,
            tipo: msg.tipo,
            prioridad: msg.prioridad,
            estado: msg.estado,
            fecha_envio: msg.fecha_envio,
            isOwn: msg.id_usuario === usuario.id_usuario,
            // Marcar como leído si es nuestro propio mensaje, si no asumimos no leído hasta que se abra la conversación
            isRead: msg.id_usuario === usuario.id_usuario
          }))
          .filter(m => !excludedNames.includes(m.nombre_usuario));
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

            const senderName = (data.data && data.data.usuario) ? (data.data.usuario.nombre + ' ' + data.data.usuario.apellido) : 'Sistema';
            const excludedNames = ['Sistema', 'Prueba user'];
            if (excludedNames.includes(senderName)) {
              console.log('🔕 Ignorando mensaje de sistema o prueba:', senderName);
            } else {
              // Determine recipient if server provided it
              const recipientName = data.data.destinatario_nombre || data.data.to || (data.data.data && (data.data.data.to || data.data.data.destinatario_nombre));
              const myName = usuario ? (usuario.nombre + ' ' + usuario.apellido) : null;

              // If recipient is provided and neither recipient nor sender is this tab's user, ignore
              if (recipientName && myName && recipientName !== myName && data.data.id_usuario !== usuario.id_usuario) {
                console.log('🔕 Mensaje no destinado a este usuario, ignorando:', recipientName);
              } else {
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
                    nombre_usuario: senderName,
                    asunto: data.data.asunto,
                    contenido: data.data.contenido,
                    tipo: data.data.tipo,
                    prioridad: data.data.prioridad,
                    estado: data.data.estado,
                    fecha_envio: data.data.fecha_envio,
                    isOwn: data.data.id_usuario === usuario.id_usuario,
                    // Para mensajes entrantes se marca como no leído por defecto (será marcado cuando la conversación se abra)
                    isRead: data.data.id_usuario === usuario.id_usuario,
                    to: recipientName || null
                  };

                  console.log('✅ Agregando nuevo mensaje:', newMessage.id_mensaje);

                  // Si el mensaje tiene destinatario y es para este usuario, crear notificación
                  try {
                    if ((newMessage.to && myName && newMessage.to === myName) || (!newMessage.to && !newMessage.isOwn && myName !== null)) {
                      websocketService.notifyCallbacks({
                        type: 'notification',
                        data: {
                          id: newMessage.id_mensaje,
                          category: 'mensaje',
                          title: newMessage.asunto || 'Nuevo mensaje',
                          body: newMessage.contenido,
                          data: newMessage
                        }
                      });
                    }
                  } catch (err) {
                    console.warn('No se pudo notificar nuevo mensaje al sistema de notificaciones:', err.message);
                  }

                  return [...prev, newMessage];
                });
              }
            }
          }

          if (data.type === 'notification') {
            console.log('🔔 Notificación recibida:', data.data);
            // Simple handling: si viene una notificación de tipo "mensaje" que incluya un mensaje completo,
            // agregamos el mensaje a la lista para que el usuario pueda ir a verlo.
            if (data.data && data.data.category === 'mensaje') {
              const payload = data.data.data || data.data;
              // Intentar construir el mensaje si trae la info
              const maybeId = payload.id_mensaje || payload.id || (payload.data && payload.data.id_mensaje);

              if (payload && (payload.contenido || payload.asunto || maybeId)) {
                setMensajes(prev => {
                  const exists = prev.some(m => m.id_mensaje === (payload.id_mensaje || payload.id));
                  if (exists) return prev;

                  const newMsg = {
                    id_mensaje: payload.id_mensaje || payload.id || Date.now(),
                    id_usuario: payload.id_usuario || (payload.usuario && payload.usuario.id_usuario) || 0,
                    nombre_usuario: (payload.usuario && payload.usuario.nombre ? payload.usuario.nombre + ' ' + payload.usuario.apellido : 'Sistema'),
                    asunto: payload.asunto || data.data.title || '',
                    contenido: payload.contenido || payload.mensaje || data.data.body || '',
                    tipo: payload.tipo || 'consulta',
                    prioridad: payload.prioridad || 'media',
                    estado: payload.estado || 'pendiente',
                    fecha_envio: payload.fecha_envio || Date.now(),
                    isOwn: false,
                    isRead: false
                  };

                  console.log('✅ Agregando mensaje desde notificación:', newMsg.id_mensaje);
                  return [...prev, newMsg];
                });
              }
            }
          }
        });

        // FALLBACK: Polling cada 3 segundos para nuevos mensajes (en caso de que WebSocket falle)
        console.log('⏱️ Iniciando polling de respaldo...');
        let lastMessageId = Math.max(0, ...mensajes.map(m => m.id_mensaje));
        
        pollingInterval = setInterval(async () => {
          try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiUrl}/api/mensajes/listar`, {
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
    if (e && e.preventDefault) e.preventDefault();
    
    if (!inputMensaje.trim()) {
      setError('El mensaje no puede estar vacío');
      return;
    }

    setError('');
    setSuccess('');
    const messageToSend = inputMensaje;
    setInputMensaje('');

    // Construir mensaje local para visualización inmediata y para enviar entre pestañas
    const now = new Date().toISOString();
    const senderName = usuario.nombre + ' ' + usuario.apellido;
    const newLocalMessage = {
      id_mensaje: Date.now(),
      id_usuario: usuario.id_usuario,
      nombre_usuario: senderName,
      asunto: asunto || '',
      contenido: messageToSend,
      tipo: tipo,
      prioridad: prioridad,
      estado: 'enviado',
      fecha_envio: now,
      isOwn: true,
      from: senderName,
      to: selectedConversation || null
    };

    // Añadir inmediatamente en UI
    setMensajes(prev => [...prev, newLocalMessage]);

    // Emitir a otras pestañas usando localStorage (envelope con senderId)
    try {
      const envelope = { senderId: window.__LOCAL_TAB_ID, payload: newLocalMessage };
      localStorage.setItem('local_chat_message', JSON.stringify(envelope));
    } catch (err) {
      console.warn('No se pudo usar localStorage para sincronizar mensaje:', err.message);
    }

    // Enviar al servidor (si falla, ya se añadió localmente para UX)
    try {
      console.log('📤 Enviando mensaje al servidor...');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/mensajes/enviar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          asunto: newLocalMessage.asunto,
          contenido: newLocalMessage.contenido,
          tipo: newLocalMessage.tipo,
          prioridad: newLocalMessage.prioridad,
          destinatario_nombre: newLocalMessage.to // campo extra para identificar destinatario en server logs (opcional)
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Mensaje guardado en servidor');
        setSuccess('Mensaje enviado correctamente');
        setAsunto('');
        setTimeout(() => setSuccess(''), 3000);
        // Opcional: actualizar id_mensaje con el id real del servidor si viene en data
        if (data.data && data.data.id_mensaje) {
          setMensajes(prev => prev.map(m => m.id_mensaje === newLocalMessage.id_mensaje ? ({ ...m, id_mensaje: data.data.id_mensaje }) : m));
        }
      } else {
        setError(data.message || 'Error al enviar mensaje');
      }
    } catch (err) {
      console.warn('Error al enviar al servidor, ya está en UI:', err.message);
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

  // Envío con Enter: handler en el textarea
  const handleTextareaKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!selectedConversation) return;
      handleSendMessage();
    }
  };

  // Marcar una conversación como leída localmente y sincronizar con otras pestañas (y opcionalmente el servidor)
  const markConversationRead = async (conversationName) => {
    // Actualizar estado local
    setMensajes(prev => prev.map(m => (m.nombre_usuario === conversationName ? { ...m, isRead: true } : m)));

    // Publicar en localStorage para notificar otras pestañas
    try {
      const envelope = { senderId: window.__LOCAL_TAB_ID, conversation: conversationName, timestamp: Date.now() };
      localStorage.setItem('local_chat_read', JSON.stringify(envelope));
    } catch (err) {
      console.warn('No se pudo sincronizar lectura a otras pestañas:', err.message);
    }

    // Intentar notificar al servidor para marcar como leídos (endpoint opcional en backend)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      await fetch(`${apiUrl}/api/mensajes/marcar-leidos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ conversation: conversationName }),
      });
    } catch (err) {
      // No crítico si falla (backend puede no soportar la ruta)
      console.warn('No se pudo notificar al servidor sobre lecturas:', err.message);
    }

    // También notificar al módulo de notificaciones (otras pestañas ya escucharían 'local_chat_read')
    try {
      websocketService.notifyCallbacks({
        type: 'notification',
        data: {
          id: `read-${conversationName}-${Date.now()}`,
          category: 'info',
          title: `Mensajes leídos en ${conversationName}`,
          body: `Has marcado como leídos los mensajes de ${conversationName}`,
          data: { conversation: conversationName }
        }
      });
    } catch (err) {
      // no crítico
    }
  };

  // Generar lista de conversaciones a partir de mensajes (agrupado por nombre de usuario)
  const conversations = useMemo(() => {
    const map = new Map();
    const myName = usuario ? (usuario.nombre + ' ' + usuario.apellido) : null;

    mensajes.forEach(m => {
      // Determinar con quién es la conversación: si el mensaje es nuestro, el partner es 'to' (destinatario)
      const partner = m.isOwn ? (m.to || m.destinatario_nombre || 'Sistema') : (m.nombre_usuario || 'Sistema');

      // No incluir conversaciones con nosotros mismos
      if (myName && partner === myName) return;

      const existing = map.get(partner);
      const isUnread = !m.isOwn && !m.isRead;
      const item = {
        nombre: partner,
        lastMessage: m.contenido || m.asunto || '',
        time: m.fecha_envio,
        unread: (map.get(partner)?.unread || 0) + (isUnread ? 1 : 0),
        avatar: (partner ? (partner.split(' ').map(n => n[0]).slice(0,2).join('') ) : 'S')
      };
      map.set(partner, { ...existing, ...item });
    });

    return Array.from(map.values()).sort((a,b) => new Date(b.time) - new Date(a.time));
  }, [mensajes, usuario]);

  // Identificador único por pestaña para evitar procesar nuestros propios eventos storage
  useEffect(() => {
    if (!window.__LOCAL_TAB_ID) {
      window.__LOCAL_TAB_ID = `${Date.now()}-${Math.floor(Math.random()*100000)}`;
    }
  }, []);

  const visibleMessages = useMemo(() => {
    if (!selectedConversation) return mensajes;
    return mensajes.filter(m => {
      const sender = m.nombre_usuario;
      const to = m.to || m.destinatario_nombre || null;
      const from = m.from || m.nombre_usuario;
      return sender === selectedConversation || to === selectedConversation || from === selectedConversation || (m.isOwn && to === selectedConversation);
    });
  }, [mensajes, selectedConversation]);

  useEffect(() => {
    const onStorage = (e) => {
      if (!e.key) return;

      if (e.key === 'local_chat_message' && e.newValue) {
        try {
          const msgEnvelope = JSON.parse(e.newValue);
          if (!msgEnvelope || msgEnvelope.senderId === window.__LOCAL_TAB_ID) return;

          const payload = msgEnvelope.payload;
          const excludedNames = ['Sistema', 'Prueba user'];
          if (excludedNames.includes(payload.nombre_usuario)) {
            console.log('🔕 Ignorando mensaje local de sistema/prueba:', payload.nombre_usuario);
            return;
          }

          const myName = usuario ? (usuario.nombre + ' ' + usuario.apellido) : null;
          // Solo procesar el mensaje si somos el remitente o el destinatario
          const isRelevant = (payload.to && myName && payload.to === myName) || (payload.from && myName && payload.from === myName) || payload.isOwn;
          if (!isRelevant) {
            console.log('🔕 Mensaje local no relevante para este usuario, ignorando');
            return;
          }

          // Avoid duplicates by id
          setMensajes(prev => {
            if (prev.some(m => m.id_mensaje === payload.id_mensaje)) return prev;
            const enriched = { ...payload, isOwn: (payload.nombre_usuario === (usuario.nombre + ' ' + usuario.apellido)), isRead: payload.isOwn || false };

            // Si el mensaje está dirigido a mí, notificar
            try {
              if (enriched.to && myName && enriched.to === myName) {
                websocketService.notifyCallbacks({
                  type: 'notification',
                  data: {
                    id: enriched.id_mensaje,
                    category: 'mensaje',
                    title: enriched.asunto || 'Nuevo mensaje',
                    body: enriched.contenido,
                    data: enriched
                  }
                });
              }
            } catch (err) {
              console.warn('No se pudo notificar nuevo mensaje desde storage:', err.message);
            }

            return [...prev, enriched];
          });
        } catch (err) {
          console.error('Error procesando storage message:', err);
        }
      }

      if (e.key === 'local_chat_read' && e.newValue) {
        try {
          const envelope = JSON.parse(e.newValue);
          if (!envelope || envelope.senderId === window.__LOCAL_TAB_ID) return;
          const conv = envelope.conversation;
          // Marcar localmente mensajes pertenecientes a la conversación como leídos
          setMensajes(prev => prev.map(m => (m.nombre_usuario === conv ? { ...m, isRead: true } : m)));
        } catch (err) {
          console.error('Error procesando storage read event:', err);
        }
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [usuario]);

  // Helper para obtener iniciales
  const getInitials = (name) => {
    if (!name) return 'A';
    return name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
  };

  return (
    <div className="chat-container three-column-layout">
      <section className="conversations-panel">
        <div className="conversations-card">
          <div className="conversations-header">
            <h2>Chat</h2>
            <p className="conversations-sub">Comunícate con la administración y vecinos</p>
          </div>

          <div className="conversations-search">
            <input type="text" placeholder="Buscar conversaciones..." className="conversations-search-input" />
          </div>

          <div className="conversations-list">
            {conversations.length === 0 ? (
              <div className="empty-state"><p>No hay conversaciones</p></div>
            ) : (
              conversations.map((c, idx) => (
                <div key={idx} className={`conversation-card ${selectedConversation === c.nombre ? 'conversation-active' : ''}`} onClick={() => { setSelectedConversation(c.nombre); markConversationRead(c.nombre); }}>
                  <div className="avatar-circle">{c.avatar}</div>
                  <div className="conversation-info">
                    <div className="conversation-top">
                      <div className="conversation-title">{c.nombre}</div>
                      <div className="conversation-time">{new Date(c.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                    </div>
                    <div className="conversation-snippet">{c.lastMessage}</div>
                  </div>
                  {c.unread > 0 && <div className="unread-badge">{c.unread}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <main className="chat-main">
        <div className="chat-header chat-header-main">
          <div className="header-left">
            <div className="profile-small">
              <div className="profile-avatar">{selectedConversation ? getInitials(selectedConversation) : 'A'}</div>
              <div className="profile-info">
                <div className="profile-name">{selectedConversation || 'ADMINISTRACIÓN'}</div>
                <div className="profile-status">EN LÍNEA</div>
              </div>
            </div>
          </div>

          <div className="header-actions">
            <div className="current-user">Hola, {usuario ? `${usuario.nombre}` : 'Usuario'}</div>

            <Notifications usuario={usuario} token={token} onOpenNotification={(notif) => {
              if (notif.category === 'mensaje') {
                const payload = notif.data || notif.data.data || notif;
                const mid = payload.id_mensaje || payload.id || (payload.data && payload.data.id_mensaje);
                if (mid) {
                  highlightMessage(mid);
                  scrollToBottom();
                }
              } else {
                try {
                  const info = JSON.stringify(notif.data, null, 2);
                  alert(`Detalle de notificación:\nTipo: ${notif.category}\n\n${info}`);
                } catch (err) {
                  console.log(notif);
                }
              }
            }} />

            <button 
              className="logout-button"
              onClick={onLogout}
              title="Cerrar sesión"
            >
              Salir
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError('')} className="close-error">×</button>
          </div>
        )}

        <div className="messages-container chat-messages">
          {isLoading ? (
            <div className="empty-state">
              <p>Cargando mensajes...</p>
            </div>
          ) : !selectedConversation ? (
            <div className="empty-state">
              <p>Selecciona una conversación del panel central para ver y enviar mensajes.</p>
            </div>
          ) : visibleMessages.length === 0 ? (
            <div className="empty-state">
              <p>No hay mensajes en esta conversación aún.</p>
            </div>
          ) : (
            visibleMessages.map((message) => (
              <div 
                key={message.id_mensaje} 
                className={`message ${message.isOwn ? 'message-own' : 'message-other'} ${highlightId === message.id_mensaje ? 'highlight' : ''}`}
                style={{ backgroundColor: message.isOwn ? '#dff6ee' : '#e8e8e8' }}
              >
                <div className="message-header">
                  <div className="message-left">
                    <span className="message-user">{message.nombre_usuario || (message.from || '')}</span>
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
            placeholder={selectedConversation ? "Escribe tu mensaje..." : "Selecciona una conversación para escribir"}
            value={inputMensaje}
            onChange={(e) => setInputMensaje(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            className="message-input"
            rows="4"
            disabled={!selectedConversation}
          />
        </div>

        <div className="enter-hint">Presiona <strong>Enter</strong> para enviar (Shift+Enter para nueva línea)</div>
      </form>
    </main>
  </div>
  );
};

export default Chat;