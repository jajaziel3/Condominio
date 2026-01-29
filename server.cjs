// server.js - Servidor WebSocket de ejemplo
// Ejecutar con: node server.js

const WebSocket = require('ws');

const PORT = 8080;
const wss = new WebSocket.Server({ port: PORT });

console.log(`🚀 Servidor WebSocket iniciado en ws://localhost:${PORT}`);

// Almacenar todos los clientes conectados
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('✅ Nuevo cliente conectado');
  clients.add(ws);

  // Enviar mensaje de bienvenida
  ws.send(JSON.stringify({
    type: 'connection',
    status: 'connected',
    message: 'Bienvenido al chat en vivo'
  }));

  // Manejar mensajes entrantes
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📩 Mensaje recibido:', data);

      // Reenviar el mensaje a todos los clientes excepto al remitente
      clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    } catch (error) {
      console.error('❌ Error al procesar mensaje:', error);
    }
  });

  // Manejar desconexión
  ws.on('close', () => {
    console.log('🔌 Cliente desconectado');
    clients.delete(ws);
  });

  // Manejar errores
  ws.on('error', (error) => {
    console.error('❌ Error en WebSocket:', error);
  });
});

// Manejar errores del servidor
wss.on('error', (error) => {
  console.error('❌ Error del servidor:', error);
});

console.log('💡 Esperando conexiones de clientes...');