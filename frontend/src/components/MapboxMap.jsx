// MapboxMap Component — Phase 8
import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './MapboxMap.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function MapboxMap({ store }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  const [currentStyle, setCurrentStyle] = React.useState('mapbox://styles/mapbox/navigation-night-v1');

  useEffect(() => {
    if (map.current) return;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: currentStyle,
      center: [-0.1276, 51.5074],
      zoom: 12
    });

    map.current.on('style.load', () => {
      // Re-add sources and layers on style change
      if (!map.current.getSource('route')) {
        map.current.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.current.addLayer({
          id: 'route-layer',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': ['get', 'color'], 'line-width': 6 }
        });
      }
      // Force update if data exists
      if (store.routeData) updateMap(store.routeData);
    });
  }, []);

  const updateMap = (routeData) => {
    const { geometry, legs } = routeData;
    markers.current.forEach(m => m.remove());
    markers.current = [];

    store.stops.forEach((stop, i) => {
      const el = document.createElement('div');
      el.className = 'map-marker';
      el.innerText = i + 1;
      const marker = new mapboxgl.Marker(el).setLngLat([stop.lng, stop.lat]).addTo(map.current);
      markers.current.push(marker);
    });

    if (map.current.getSource('route')) {
      map.current.getSource('route').setData({
        type: 'Feature',
        geometry: geometry,
        properties: { color: legs.some(l => l.congestion_level === 'severe') ? '#EF4444' : '#3B82F6' }
      });
    }

    const coordinates = geometry.coordinates;
    const bounds = coordinates.reduce((acc, coord) => acc.extend(coord), new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
    map.current.fitBounds(bounds, { padding: 50 });
  };

  useEffect(() => {
    if (map.current && store.routeData) updateMap(store.routeData);
  }, [store.routeData, store.stops]);

  const switchStyle = (styleUrl) => {
    setCurrentStyle(styleUrl);
    map.current.setStyle(styleUrl);
  };

  const handleLocateMe = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      const { longitude, latitude } = pos.coords;
      map.current.flyTo({ center: [longitude, latitude], zoom: 14 });
      // Update first stop logic could go here if prop provided
    });
  };

  return (
    <div className="map-view">
      <div ref={mapContainer} className="map-inner" />
      <div className="map-controls">
        <button onClick={() => switchStyle('mapbox://styles/mapbox/navigation-night-v1')} className={currentStyle.includes('navigation') ? 'active' : ''}>Dark</button>
        <button onClick={() => switchStyle('mapbox://styles/mapbox/streets-v12')} className={currentStyle.includes('streets') && !currentStyle.includes('satellite') ? 'active' : ''}>Street</button>
        <button onClick={() => switchStyle('mapbox://styles/mapbox/satellite-streets-v12')} className={currentStyle.includes('satellite') ? 'active' : ''}>Sat</button>
        <button onClick={handleLocateMe} className="locate-btn">📍</button>
      </div>
      {store.loading && <div className="map-overlay">Fetching Route...</div>}
    </div>
  );
}
