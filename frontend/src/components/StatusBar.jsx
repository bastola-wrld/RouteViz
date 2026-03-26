// StatusBar component for live connection monitoring
import React, { useState, useEffect } from 'react';
import './StatusBar.css';

export default function StatusBar({ connected, lastUpdate, reconnectAttempts }) {
  const [timeAgo, setTimeAgo] = useState(0);

  useEffect(() => {
    if (!lastUpdate) return;
    const interval = setInterval(() => {
      setTimeAgo(Math.floor((Date.now() - lastUpdate) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdate]);

  return (
    <div className="status-bar">
      <div className="status-item">
        <div className={`status-dot ${connected ? 'connected' : 'offline'}`} />
        {connected ? 'Live Connection' : 'Offline'}
      </div>

      {reconnectAttempts > 0 && !connected && (
        <div className="status-item reconnect-text">
          Reconnecting... (attempt {reconnectAttempts})
        </div>
      )}

      {lastUpdate && (
        <div className="status-item">
          Updated {timeAgo}s ago
        </div>
      )}

      <div className="status-item" style={{ marginLeft: 'auto', marginRight: 0 }}>
        v1.0.6 (Phase 6)
      </div>
    </div>
  );
}
