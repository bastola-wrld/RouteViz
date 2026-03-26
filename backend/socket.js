// WebSocket module for real-time traffic updates and ETA ticking
import { Server } from 'socket.io';
import axios from 'axios';

let io = null;
const activeRoutes = new Map(); // clientId -> { stops, remainingSeconds, lastLevel }
let pollingInterval = null;
let etaInterval = null;

const CV_SERVICE_URL = process.env.CV_SERVICE_URL || 'http://localhost:8000';
const SAMPLE_CAM_URL = process.env.SAMPLE_CAM_URL || 'https://images.tfl.gov.uk/tfl/traffic-news-static-images/2/20/2000.jpg';

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST'] }
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    socket.emit('connection:ack', { clientId: socket.id, pollInterval: 30 });

    socket.on('route:subscribe', (data) => {
      activeRoutes.set(socket.id, { 
        stops: data.stops, 
        remainingSeconds: data.totalDuration || 0,
        lastLevel: 'unknown'
      });
      startLoops();
    });

    socket.on('route:unsubscribe', () => {
      activeRoutes.delete(socket.id);
      checkStopLoops();
    });

    socket.on('disconnect', () => {
      activeRoutes.delete(socket.id);
      checkStopLoops();
    });
  });

  return io;
}

export function getIO() { return io; }

function startLoops() {
  if (!pollingInterval) {
    pollingInterval = setInterval(pollTraffic, 30000);
    pollTraffic(); // Initial poll
  }
  if (!etaInterval) {
    etaInterval = setInterval(tickETA, 1000);
  }
}

function checkStopLoops() {
  if (activeRoutes.size === 0) {
    clearInterval(pollingInterval);
    clearInterval(etaInterval);
    pollingInterval = null;
    etaInterval = null;
  }
}

async function pollTraffic() {
  if (activeRoutes.size === 0) return;

  try {
    // Check CV health
    const health = await axios.get(`${CV_SERVICE_URL}/health`).catch(() => null);
    if (!health) return;

    // Detect traffic
    const cvRes = await axios.post(`${CV_SERVICE_URL}/detect/url`, { url: SAMPLE_CAM_URL });
    const { congestion_level, congestion_score } = cvRes.data;

    activeRoutes.forEach((route, clientId) => {
      // Emit update to client
      io.to(clientId).emit('cv:result', cvRes.data);
      
      // If level changed, send alert
      if (route.lastLevel !== congestion_level) {
        const severity = (congestion_level === 'heavy' || congestion_level === 'severe') ? 'warning' : 'info';
        io.to(clientId).emit('traffic:alert', { 
          severity, 
          message: `Traffic condition changed to ${congestion_level}`,
          timestamp: Date.now()
        });
        route.lastLevel = congestion_level;
      }
    });
  } catch (err) {
    console.warn("Polling error:", err.message);
  }
}

function tickETA() {
  activeRoutes.forEach((route, clientId) => {
    if (route.remainingSeconds > 0) {
      route.remainingSeconds -= 1;
      io.to(clientId).emit('eta:tick', { 
        remainingSeconds: route.remainingSeconds,
        timestamp: Date.now()
      });
    }
  });
}

export function getSocketStats() {
  return {
    connectedClients: io?.engine.clientsCount || 0,
    activeRoutes: activeRoutes.size,
    pollingActive: !!pollingInterval
  };
}
