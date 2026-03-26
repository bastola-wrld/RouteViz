// Sidebar component with multi-stop management and drag-and-drop reordering
import React, { useState } from 'react';
import './Sidebar.css';
import CVPanel from './CVPanel';
import AIPanel from './AIPanel';
import StatusBar from './StatusBar';
import ETATicker from './ETATicker';

export default function Sidebar({ store, socketProps, onGetRoute, onOptimize, mode, setMode }) {
  const { stops, setStops, loading, error, routeData } = store;
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [withTraffic, setWithTraffic] = useState(false);
  const [suggestions, setSuggestions] = useState({});

  const handleAddStop = () => {
    if (stops.length >= 5) return;
    const newStop = { id: Date.now(), name: '', postcode: '', lng: '', lat: '' };
    setStops([...stops, newStop]);
  };

  const handleGetRoute = () => onGetRoute(withTraffic);
  const handleOptimize = () => onOptimize(withTraffic);

  const handleRemoveStop = (index) => {
    if (stops.length <= 2) return;
    const newStops = stops.filter((_, i) => i !== index);
    setStops(newStops);
  };

  const handleInputChange = async (index, field, value) => {
    const newStops = [...stops];
    newStops[index][field] = value;
    setStops(newStops);

    if (field === 'postcode' && value.length > 2) {
      try {
        const resp = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}&autocomplete=true&limit=5`);
        const data = await resp.json();
        setSuggestions(prev => ({ ...prev, [index]: data.features }));
      } catch (e) { console.error('Geocoding error:', e); }
    } else if (field === 'postcode') {
      setSuggestions(prev => ({ ...prev, [index]: [] }));
    }
  };

  const selectSuggestion = (index, feature) => {
    const newStops = [...stops];
    newStops[index].postcode = feature.place_name;
    newStops[index].name = feature.text;
    newStops[index].lng = feature.center[0];
    newStops[index].lat = feature.center[1];
    setStops(newStops);
    setSuggestions(prev => ({ ...prev, [index]: [] }));
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

      <div className="stops-list">
        <div className="transport-modes">
          <button 
            className={`mode-btn ${mode === 'car' ? 'active' : ''}`}
            onClick={() => setMode('car')}
            title="Driving"
          >
            🚗
          </button>
          <button 
            className={`mode-btn ${mode === 'bus' ? 'active' : ''}`}
            onClick={() => setMode('bus')}
            title="Bus"
          >
            🚌
          </button>
          <button 
            className={`mode-btn ${mode === 'train' ? 'active' : ''}`}
            onClick={() => setMode('train')}
            title="Train"
          >
            🚆
          </button>
          <button 
            className={`mode-btn ${mode === 'walk' ? 'active' : ''}`}
            onClick={() => setMode('walk')}
            title="Walking"
          >
            🚶
          </button>
          <button 
            className={`mode-btn ${mode === 'bike' ? 'active' : ''}`}
            onClick={() => setMode('bike')}
            title="Cycling"
          >
            🚲
          </button>
        </div>

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
                <div className="coords-row search-container">
                  <input 
                    placeholder="Enter destination or postcode"
                    value={stop.postcode}
                    onChange={(e) => handleInputChange(index, 'postcode', e.target.value)}
                  />
                  {suggestions[index]?.length > 0 && (
                    <ul className="suggestions-list">
                      {suggestions[index].map((feat, i) => (
                        <li key={i} onClick={() => selectSuggestion(index, feat)}>
                          {feat.place_name}
                        </li>
                      ))}
                    </ul>
                  )}
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
          <div className="journey-impact-card">
            {routeData.impact?.co2_saved > 0 && (
              <div className="impact-item green">
                <span className="icon">🍃</span>
                <span className="val">{routeData.impact.co2_saved}kg</span>
                <span className="lbl">CO2 Saved</span>
              </div>
            )}
            {routeData.impact?.price > 0 && (
              <div className="impact-item">
                <span className="icon">💰</span>
                <span className="val">£{routeData.impact.price}</span>
                <span className="lbl">Est. Fare</span>
              </div>
            )}
            {routeData.impact?.calories > 0 && (
              <div className="impact-item orange">
                <span className="icon">🔥</span>
                <span className="val">{routeData.impact.calories}</span>
                <span className="lbl">Calories</span>
              </div>
            )}
            {routeData.impact?.next_departure && (
              <div className="impact-item blue pulse">
                <span className="icon">⏲️</span>
                <span className="val">{routeData.impact.next_departure}m</span>
                <span className="lbl">Next Dept</span>
              </div>
            )}
          </div>

          <div className="journey-timeline">
            {routeData.legs.map((leg, i) => (
              <div key={i} className="timeline-leg">
                <div className="timeline-marker">
                  <div className="dot"></div>
                  <div className="line"></div>
                </div>
                <div className="timeline-content">
                  <div className="leg-header">
                    <span className="leg-mode">
                      {leg.transit_info ? (
                        <>
                          <span className="mode-icon">{leg.transit_info.icon}</span>
                          <span className="line-name">{leg.transit_info.line}</span>
                        </>
                      ) : (
                        <span className="mode-icon">
                          {mode === 'car' ? '🚗' : mode === 'walk' ? '🚶' : '🚲'}
                        </span>
                      )}
                    </span>
                    <span className="leg-time">{Math.floor(leg.duration / 60)}m</span>
                  </div>
                  <div className="leg-details">
                    <div className="station-name">{leg.startName}</div>
                    <div className="leg-metrics">{(leg.distance / 1000).toFixed(1)} km</div>
                  </div>
                  {i === routeData.legs.length - 1 && (
                    <div className="station-name destination">{leg.endName}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
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
