// Sidebar component with multi-stop management and drag-and-drop reordering
import React, { useState } from 'react';
import './Sidebar.css';
import CVPanel from './CVPanel';
import AIPanel from './AIPanel';
import StatusBar from './StatusBar';
import ETATicker from './ETATicker';

export default function Sidebar({ store, socketProps, onGetRoute, onOptimize }) {
  const { stops, setStops, loading, error, routeData } = store;
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [withTraffic, setWithTraffic] = useState(false);

  const handleAddStop = () => {
    if (stops.length >= 5) return;
    const newStop = { id: Date.now(), name: '', lng: '', lat: '' };
    setStops([...stops, newStop]);
  };

  const handleGetRoute = () => onGetRoute(withTraffic);
  const handleOptimize = () => onOptimize(withTraffic);

  const handleRemoveStop = (index) => {
    if (stops.length <= 2) return;
    const newStops = stops.filter((_, i) => i !== index);
    setStops(newStops);
  };

  const handleInputChange = (index, field, value) => {
    const newStops = [...stops];
    newStops[index][field] = value;
    setStops(newStops);
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h} hr ${m} min`;
    return `${m} min`;
  };

  const formatDistance = (m) => `${(m / 1000).toFixed(1)} km`;

  // Native Drag and Drop
  const onDragStart = (e, index) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e) => {
    e.preventDefault();
  };

  const onDrop = (e, index) => {
    e.preventDefault();
    if (draggedIdx === null) return;
    
    const newStops = [...stops];
    const draggedItem = newStops[draggedIdx];
    newStops.splice(draggedIdx, 1);
    newStops.splice(index, 0, draggedItem);
    
    setStops(newStops);
    setDraggedIdx(null);
  };

  return (
    <div className="sidebar">
      {routeData && (
        <ETATicker 
          remainingSeconds={socketProps?.serverETA || routeData.totalDuration} 
          isLive={socketProps?.connected}
        />
      )}
      
      <div className="sidebar-header">
        <h1>RouteViz</h1>
        <p>AI Route Planner</p>
      </div>

      <div className="stop-list">
        {stops.map((stop, index) => {
          let label = 'Via';
          if (index === 0) label = 'From';
          else if (index === stops.length - 1) label = 'To';

          return (
            <div 
              key={stop.id} 
              className="stop-row"
              draggable
              onDragStart={(e) => onDragStart(e, index)}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, index)}
            >
              <div className="stop-row-header">
                <span className="drag-handle">=</span>
                <span className="stop-label">{label}</span>
                {stops.length > 2 && (
                  <button className="remove-btn" onClick={() => handleRemoveStop(index)}>×</button>
                )}
              </div>
              <div className="stop-inputs">
                <input 
                  placeholder="Location name"
                  value={stop.name}
                  onChange={(e) => handleInputChange(index, 'name', e.target.value)}
                />
                <div className="coords-row">
                  <input 
                    placeholder="Longitude"
                    value={stop.lng}
                    onChange={(e) => handleInputChange(index, 'lng', e.target.value)}
                  />
                  <input 
                    placeholder="Latitude"
                    value={stop.lat}
                    onChange={(e) => handleInputChange(index, 'lat', e.target.value)}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {stops.length < 5 && (
        <button className="add-stop-btn" onClick={handleAddStop}>+ Add stop</button>
      )}

      <div className="actions">
        <label className="traffic-toggle">
          <input 
            type="checkbox" 
            checked={withTraffic} 
            onChange={(e) => setWithTraffic(e.target.checked)} 
          />
          Use Real-time AI Traffic
        </label>
        <button 
          className="btn-primary" 
          onClick={handleGetRoute}
          disabled={loading}
        >
          {loading ? 'Calculating...' : 'Get Route'}
        </button>
        <button 
          className="btn-secondary" 
          onClick={handleOptimize}
          disabled={loading || stops.length < 3}
        >
          Optimize Order
        </button>
        {error && <div className="error-message">{error}</div>}
      </div>

      {routeData && (
        <div className="results-panel">
          <h3>
            Results
            {routeData.is_ai_adjusted && <span className="ai-badge">AI Adjusted</span>}
          </h3>
          <div className="metrics-summary">
            <span><strong>Total Time:</strong> {formatTime(routeData.totalDuration)}</span>
            <span><strong>Total Dist:</strong> {formatDistance(routeData.totalDistance)}</span>
          </div>
          <table className="legs-table">
            <thead>
              <tr>
                <th>Segment</th>
                <th>Time</th>
                <th>Dist</th>
              </tr>
            </thead>
            <tbody>
              {routeData.legs.map((leg, i) => (
                <tr key={i}>
                  <td>{leg.startName || 'Start'} → {leg.endName || 'End'}</td>
                  <td className={leg.is_adjusted ? 'leg-adjusted' : ''}>
                    {formatTime(leg.duration)}
                  </td>
                  <td>{formatDistance(leg.distance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {routeData && (
        <AIPanel routeData={routeData} onSetStops={setStops} />
      )}
      
      <CVPanel />

      <StatusBar 
        connected={socketProps?.connected} 
        lastUpdate={socketProps?.lastUpdate} 
        reconnectAttempts={socketProps?.reconnectAttempts}
      />
    </div>
  );
}
