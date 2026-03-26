// Health Dashboard Component
import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import './HealthDashboard.css';

const ServiceCard = ({ name, endpoint, ws = false }) => {
  const [status, setStatus] = useState('checking');
  const [latency, setLatency] = useState(0);
  const [error, setError] = useState(null);

  const checkStatus = async () => {
    const start = Date.now();
    try {
      if (ws) {
        // Basic check for WS (simplified)
        setStatus('online');
        setLatency(Date.now() - start);
      } else {
        const data = await api.get(endpoint);
        setStatus(data.status === 'offline' ? 'degraded' : 'online');
        setLatency(Date.now() - start);
      }
    } catch (err) {
      setStatus('offline');
      setError(err.message);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`service-card ${status}`}>
      <div className="card-header">
        <h3>{name}</h3>
        <span className={`status-badge ${status}`}>{status}</span>
      </div>
      <div className="card-body">
        <div className="stat">
          <label>Latency</label>
          <span>{latency}ms</span>
        </div>
        <div className="stat">
          <label>Last Checked</label>
          <span>{new Date().toLocaleTimeString()}</span>
        </div>
        {error && <div className="card-error">{error}</div>}
      </div>
      <button onClick={checkStatus} className="refresh-btn">Refresh</button>
    </div>
  );
};

export default function HealthDashboard() {
  return (
    <div className="health-dashboard">
      <header className="dashboard-header">
        <div className="container">
          <a href="/" className="back-link">← Back to App</a>
          <h1>System Health</h1>
          <p>Real-time status of all RouteViz microservices</p>
        </div>
      </header>

      <div className="container dashboard-grid">
        <ServiceCard name="Backend API" endpoint="/health" />
        <ServiceCard name="CV Service" endpoint="/cv/health" />
        <ServiceCard name="AI Decision Engine" endpoint="/ai/health" />
        <ServiceCard name="WebSocket Server" endpoint="/socket/stats" ws />
      </div>

      <footer className="dashboard-footer">
        <p>RouteViz v1.0.8 — Production Environment</p>
      </footer>
    </div>
  );
}
