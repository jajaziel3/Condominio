// src/componentes/chat.jsx
import { useState, useEffect, useRef } from 'react';
import authService from '../services/authService';
import websocketService from '../services/websocket';
import './chat.css';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cargar datos del usuario
  useEffect(() => {
    const currentUser = authService.getUser();
    setUser(currentUser);
  }, []);

  // Cargar historial de mensajes
  const loadMessageHistory = async () => {
    try {
      const response = await authService.fetchWithAuth(
        `${import.meta.env.VITE_API_URL}/chat/messages`,
        { method: 'GET' }
      );
      const data = await response.json();
      
      if (data.success && user) {
        const loadedMessages = data.data.map(msg => ({
          id: msg.id,
          user: msg.user,
          content: msg.content,
          timestamp: msg.timestamp,
          isOwn: msg.user === user.nombre + ' ' + user.apellido
        }));
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error('Error al cargar historial:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    // Cargar historial primero
    loadMessageHistory();

    // Conectar al WebSocket con el nombre de usuario
    websocketService.connect(user.nombre + ' ' + user.apellido);

    // Suscribirse a eventos
    const unsubscribe = websocketService.subscribe((data) => {
      if (data.type === 'connection') {
        setConnectionStatus(data.status);
      } else if (data.type === 'message') {
        setMessages(prev => [...prev, {
          id: Date.now() + Math.random(),
          user: data.user,
          content: data.content,
          timestamp: data.timestamp,
          isOwn: false
        }]);
      }
    });

    return () => {
      unsubscribe();
      websocketService.disconnect();
    };
  }, [user]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (inputMessage.trim() && user) {
      const newMessage = {
        id: Date.now() + Math.random(),
        user: user.nombre + ' ' + user.apellido,
        content: inputMessage,
        timestamp: new Date().toISOString(),
        isOwn: true
      };

      // Agregar mensaje localmente primero
      setMessages(prev => [...prev, newMessage]);

      // Enviar al servidor con autenticación
      try {
        const response = await authService.fetchWithAuth(
          `${import.meta.env.VITE_API_URL}/chat/send`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: inputMessage }),
          }
        );
        
        if (!response.ok) {
          console.error('Error al enviar mensaje');
        }
      } catch (error) {
        console.error('Error al enviar mensaje:', error);
      }

      setInputMessage('');
    }
  };
      if (!success) {
        console.error('Error al enviar mensaje');
      }

      setInputMessage('');
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return '#10b981';
      case 'connecting':
        return '#f59e0b';
      case 'disconnected':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Conectado';
      case 'connecting':
        return 'Conectando...';
      case 'disconnected':
        return 'Desconectado';
      default:
        return 'Desconocido';
    }
  };

  if (!user) {
    return (
      <div className="chat-container">
        <div className="empty-state">
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="header-content">
          <h2>Chat en Vivo</h2>
          <span className="username-badge">{user.nombre} {user.apellido}</span>
        </div>
        <div className="connection-status">
          <span 
            className="status-indicator" 
            style={{ backgroundColor: getConnectionStatusColor() }}
          />
          <span className="status-text">{getConnectionStatusText()}</span>
        </div>
      </div>

      <div className="messages-container">
        {isLoading ? (
          <div className="empty-state">
            <p>Cargando mensajes...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <p>No hay mensajes aún. ¡Sé el primero en escribir!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div 
              key={message.id} 
              className={`message ${message.isOwn ? 'message-own' : 'message-other'}`}
            >
              <div className="message-header">
                <span className="message-user">{message.user}</span>
                <span className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString('es-MX', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="message-content">{message.content}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="message-input-container" onSubmit={handleSendMessage}>
        <input
          type="text"
          placeholder="Escribe un mensaje..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          className="message-input"
        />
        <button 
          type="submit" 
          className="send-button"
          disabled={!inputMessage.trim()}
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
        </button>
      </form>
    </div>
  );
};

export default Chat;