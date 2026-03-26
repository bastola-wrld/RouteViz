// Main Application Entry — Phase 8 Production
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MapboxMap from './components/MapboxMap';
import Auth from './pages/Auth';
import HealthDashboard from './pages/HealthDashboard';
import SkeletonLoader from './components/SkeletonLoader';
import { useTrafficStore } from './store/trafficStore';
import { useTrafficSocket } from './hooks/useTrafficSocket';
import { api } from './utils/api';
import './App.css';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('rv_token'));
  const [isGuest, setIsGuest] = useState(localStorage.getItem('rv_guest') === 'true');
  const [isReady, setIsReady] = useState(false);
  const [path, setPath] = useState(window.location.pathname);
  const [mode, setMode] = useState('car');
  
  const store = useTrafficStore();
  const socketProps = useTrafficSocket(store.stops, store.routeData?.totalDuration);

  const geocode = async (postcode) => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(postcode)}.json?access_token=${token}&limit=1`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      return { lng, lat };
    }
    throw new Error(`Could not find coordinates for: ${postcode}`);
  };

  const onGetRoute = async (withTraffic) => {
    store.setLoading(true);
    store.setError(null);
    try {
      // Geocode all stops that have a postcode but no coordinates yet
      // or just geocode all to be sure they match the postcode
      const geocodedStops = await Promise.all(store.stops.map(async (stop) => {
        if (stop.postcode) {
          const coords = await geocode(stop.postcode);
          return { ...stop, ...coords };
        }
        return stop;
      }));
      
      store.setStops(geocodedStops);
      const data = await api.post('/route', { stops: geocodedStops, withTraffic, mode });
      store.setRouteData(data);
    } catch (err) {
      store.setError(err.message);
    } finally {
      store.setLoading(false);
    }
  };

  const onOptimize = async (withTraffic) => {
    store.setLoading(true);
    store.setError(null);
    try {
      // Geocode first
      const geocodedStops = await Promise.all(store.stops.map(async (stop) => {
        if (stop.postcode) {
          const coords = await geocode(stop.postcode);
          return { ...stop, ...coords };
        }
        return stop;
      }));

      const { optimizedStops } = await api.post('/route/optimize', { stops: geocodedStops });
      store.setStops(optimizedStops);
      // Automatically refresh route after optimization
      const data = await api.post('/route', { stops: optimizedStops, withTraffic, mode });
      store.setRouteData(data);
    } catch (err) {
      store.setError(err.message);
    } finally {
      store.setLoading(false);
    }
  };

  useEffect(() => {
    // Initial hardware/loading simulation
    const timer = setTimeout(() => setIsReady(true), 1500);
    
    // Simple routing cleanup
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setIsGuest(false);
    localStorage.removeItem('rv_guest');
  };

  const handleGuestMode = () => {
    setIsGuest(true);
    localStorage.setItem('rv_guest', 'true');
  };

  const handleLogout = () => {
    localStorage.removeItem('rv_token');
    localStorage.removeItem('rv_user');
    localStorage.removeItem('rv_guest');
    setIsAuthenticated(false);
    setIsGuest(false);
  };

  // ROUTING
  if (path === '/health') return <HealthDashboard />;

  // AUTH GATE
  if (!isAuthenticated && !isGuest) {
    return <Auth onAuthSuccess={handleAuthSuccess} onGuestMode={handleGuestMode} />;
  }

  // INITIAL LOADING SCREEN
  if (!isReady) {
    return (
      <div className="app-shell loading">
        <SkeletonLoader type="sidebar" className="sidebar-skeleton" />
        <SkeletonLoader type="map" />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="sidebar-container">
        <div className="app-header-tiny">
          <div className="user-profile">
            <span>{isGuest ? 'Guest User' : 'Pro Account'}</span>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
          <div className={`connection-pill ${socketProps.connected ? 'online' : 'offline'}`}>
            {socketProps.connected ? 'LIVE' : 'SYNCING'}
          </div>
        </div>
        <Sidebar 
          store={store} 
          socketProps={socketProps} 
          onGetRoute={onGetRoute} 
          onOptimize={onOptimize}
          mode={mode}
          setMode={setMode}
        />
      </div>
      <div className="map-container">
        <MapboxMap store={store} />
      </div>

      {isGuest && (
        <div className="guest-banner">
          Enjoying RouteViz? <button onClick={() => setIsGuest(false)}>Sign in</button> to unlock AI rerouting and cloud storage.
        </div>
      )}
    </div>
  );
}
