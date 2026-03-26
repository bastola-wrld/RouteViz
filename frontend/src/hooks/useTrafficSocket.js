// Custom hook for WebSocket traffic updates
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export function useTrafficSocket(stops, totalDuration) {
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [alerts, setAlerts] = useState([]);
  const [serverETA, setServerETA] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io('http://localhost:3001', {
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setReconnectAttempts(0);
      if (stops) {
        socket.emit('route:subscribe', { stops, totalDuration });
      }
    });

    socket.on('disconnect', () => setConnected(false));
    
    socket.on('reconnect_attempt', (attempt) => setReconnectAttempts(attempt));

    socket.on('cv:result', (data) => {
      setLastUpdate(Date.now());
      // Here we could update global state if using a store
    });

    socket.on('traffic:alert', (alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 5));
    });

    socket.on('eta:tick', (data) => {
      setServerETA(data.remainingSeconds);
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (connected && socketRef.current && stops) {
      socketRef.current.emit('route:subscribe', { stops, totalDuration });
    }
  }, [stops, connected, totalDuration]);

  return { connected, lastUpdate, reconnectAttempts, alerts, serverETA };
}
