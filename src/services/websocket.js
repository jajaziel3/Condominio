// src/services/websocket.js
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

class WebSocketService {
  constructor() {
    this.echo = null;
    this.callbacks = [];
    this.isConnected = false;
  }

  // Conectar al servidor Laravel Reverb
  connect() {
    // Si ya está conectado, no hacer nada
    if (this.isConnected && this.echo) {
      console.log('✅ Ya conectado a WebSocket');
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      try {
        const host = import.meta.env.VITE_REVERB_HOST || 'localhost';
        const port = import.meta.env.VITE_REVERB_PORT || 8080;
        const scheme = import.meta.env.VITE_REVERB_SCHEME || 'http';
        const key = import.meta.env.VITE_REVERB_APP_KEY || 'kzuaslwikou32v0ohjs6';

        console.log('🔌 Conectando a Reverb:', { host, port, scheme });

        this.echo = new Echo({
          broadcaster: 'reverb',
          key: key,
          wsHost: host,
          wsPort: port,
          wssPort: port,
          forceTLS: scheme === 'https',
          enabledTransports: ['ws', 'wss'],
        });

        console.log('🔌 Instancia Echo creada, esperando conexión...');

        // Esperar a que Echo esté completamente conectado
        setTimeout(() => {
          try {
            console.log('📡 Suscribiendo al canal "mensajes"...');
            
            // Suscribirse al canal de mensajes
            const channel = this.echo.channel('mensajes');
            
            // Escuchar el evento MensajeEnviado
            channel.listen('MensajeEnviado', (data) => {
              console.log('🎉 ¡Evento MensajeEnviado recibido!:', data);
              this.notifyCallbacks({
                type: 'message',
                data: data
              });

              // También publicar una notificación genérica para el UI
              this.notifyCallbacks({
                type: 'notification',
                data: {
                  id: data.id_mensaje || (data.data && data.data.id_mensaje) || Date.now(),
                  category: 'mensaje',
                  title: data.asunto || 'Nuevo mensaje',
                  body: data.contenido || '',
                  data: data
                }
              });
            });
            
            // Escuchar también con namespace completo
            channel.listen('.MensajeEnviado', (data) => {
              console.log(' ¡Evento .MensajeEnviado recibido!:', data);
              this.notifyCallbacks({
                type: 'message',
                data: data
              });

              this.notifyCallbacks({
                type: 'notification',
                data: {
                  id: data.id_mensaje || (data.data && data.data.id_mensaje) || Date.now(),
                  category: 'mensaje',
                  title: data.asunto || 'Nuevo mensaje',
                  body: data.contenido || '',
                  data: data
                }
              });
            });

            // Subscribirse al canal de notificaciones generales (multas, asambleas, pagos, etc.)
            try {
              console.log('📡 Suscribiendo al canal "notificaciones"...');
              const notifChannel = this.echo.channel('notificaciones');

              const mapNotifEvent = (eventName, category) => (payload) => {
                console.log(`🔔 Evento ${eventName} recibido:`, payload);
                this.notifyCallbacks({
                  type: 'notification',
                  data: {
                    id: payload.id || payload.notificacion_id || Date.now(),
                    category: category,
                    title: payload.titulo || payload.asunto || (category === 'multa' ? 'Nueva multa' : 'Notificación'),
                    body: payload.mensaje || payload.descripcion || '',
                    data: payload
                  }
                });
              };

              notifChannel.listen('NotificacionCreada', mapNotifEvent('NotificacionCreada', 'general'));
              notifChannel.listen('.NotificacionCreada', mapNotifEvent('.NotificacionCreada', 'general'));

              notifChannel.listen('MultaCreada', mapNotifEvent('MultaCreada', 'multa'));
              notifChannel.listen('.MultaCreada', mapNotifEvent('.MultaCreada', 'multa'));

              notifChannel.listen('AsambleaConvocada', mapNotifEvent('AsambleaConvocada', 'asamblea'));
              notifChannel.listen('.AsambleaConvocada', mapNotifEvent('.AsambleaConvocada', 'asamblea'));

              notifChannel.listen('PagoAtrasado', mapNotifEvent('PagoAtrasado', 'pago'));
              notifChannel.listen('.PagoAtrasado', mapNotifEvent('.PagoAtrasado', 'pago'));

              console.log('✅ Suscripción a canal "notificaciones" establecida');
            } catch (err) {
              console.warn('⚠️ No se pudo suscribir a canal "notificaciones":', err);
            }

            this.isConnected = true;
            console.log('✅ WebSocket conectado exitosamente al canal "mensajes"');
            
            // Notificar que la conexión está lista
            this.notifyCallbacks({
              type: 'connection',
              status: 'connected'
            });

            // Helper de desarrollo para simular notificaciones desde la consola del navegador
            try {
              window.__simulateNotification = (payload) => {
                this.notifyCallbacks({ type: 'notification', data: payload });
              };

              // Helper para simular mensajes en desarrollo
              window.__simulateMessage = (payload) => {
                // payload should be the message object similar to server structure
                this.notifyCallbacks({ type: 'message', data: payload });
              };
            } catch (e) {
              // ignore
            }
            
            resolve();
          } catch (error) {
            console.error('❌ Error al suscribirse:', error);
            resolve();
          }
        }, 800);
      } catch (error) {
        console.error('❌ Error al crear Echo:', error);
        resolve();
      }
    });
  }

  // Suscribirse a cambios
  subscribe(callback) {
    if (typeof callback !== 'function') {
      console.error('❌ El callback debe ser una función');
      return () => {};
    }

    this.callbacks.push(callback);
    console.log(`📎 Callback suscrito. Total: ${this.callbacks.length}`);
    
    // Devolver función para desuscribirse
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
      console.log(`📎 Callback desuscrito. Total: ${this.callbacks.length}`);
    };
  }

  // Notificar a todos los suscriptores
  notifyCallbacks(data) {
    console.log(`📣 Notificando a ${this.callbacks.length} callback(s) con evento:`, data.type);
    this.callbacks.forEach((callback, index) => {
      try {
        callback(data);
        console.log(`  ✅ Callback ${index + 1} ejecutado`);
      } catch (error) {
        console.error(`  ❌ Error en callback ${index + 1}:`, error);
      }
    });
  }

  // Desconectar
  disconnect() {
    if (this.echo) {
      this.echo.disconnect();
      this.isConnected = false;
      this.echo = null;
      console.log('❌ Desconectado de Reverb');
    }
  }
}

export default new WebSocketService();