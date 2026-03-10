// src/services/websocket.js
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

class WebSocketService {
  constructor() {
    this.echo = null;
    this.listeners = [];
    this.username = '';
  }

  // Conectar al servidor Laravel Reverb
  connect(username) {
    this.username = username;

    this.echo = new Echo({
      broadcaster: 'reverb',
      key: import.meta.env.VITE_REVERB_APP_KEY || 'kzuaslwikou32v0ohjs6',
      wsHost: import.meta.env.VITE_REVERB_HOST || 'localhost',
      wsPort: import.meta.env.VITE_REVERB_PORT || 8080,
      wssPort: import.meta.env.VITE_REVERB_PORT || 8080,
      forceTLS: (import.meta.env.VITE_REVERB_SCHEME || 'http') === 'https',
      enabledTransports: ['ws', 'wss'],
    });

    // Escuchar el canal de chat
    this.echo.channel('chat')
      .listen('.message.sent', (data) => {
        console.log('📩 Mensaje recibido:', data);
        // Solo notificar si el mensaje no es del usuario actual
        if (data.user !== this.username) {
          this.notifyListeners(data);
        }
      });

    console.log('✅ Conectado a Laravel Reverb');
    this.notifyListeners({ type: 'connection', status: 'connected' });
  }

  // Enviar mensaje al backend de Laravel
  async sendMessage(message) {
    try {
      const response = await fetch('http://localhost:8000/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ 
          user: this.username, 
          message: message 
        }),
      });

      if (!response.ok) {
        throw new Error('Error al enviar mensaje');
      }

      const data = await response.json();
      console.log('📤 Mensaje enviado:', data);
      return true;
    } catch (error) {
      console.error('❌ Error al enviar mensaje:', error);
      return false;
    }
  }

  // Suscribirse a eventos
  sscribe(callback) {
    this.listeners.push(callback);
    
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Notificar a todos los listeners
  notifyListeners(data) {
    this.listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error en listener:', error);
      }
    });
  }

  // Desconectar
  disconnect() {
    if (this.echo) {
      this.echo.disconnect();
      this.echo = null;
    }
  }

  // Obtener estado de la conexión
  getConnectionStatus() {
    return this.echo ? 'connected' : 'disconnected';
  }
}

export default new WebSocketService();