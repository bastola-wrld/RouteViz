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

  useEffect(() => {
    if (map.current) return; // Initialize once
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/navigation-night-v1',
      center: [-0.1276, 51.5074], // London
      zoom: 12
    });

    map.current.on('load', () => {
      // Add Sources and Layers for Route, Pulse, and Heatmap
      map.current.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.current.addSource('pulse', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.current.addSource('heatmap', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

      map.current.addLayer({
        id: 'route-layer',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': ['get', 'color'], 'line-width': 6 }
      });

      map.current.addLayer({
        id: 'pulse-layer',
        type: 'line',
        source: 'pulse',
        paint: { 'line-color': '#EF4444', 'line-width': 10, 'line-opacity': 0.5 }
      });

      map.current.addLayer({
        id: 'heatmap-layer',
        type: 'heatmap',
        source: 'heatmap',
        paint: {
          'heatmap-weight': 1,
          'heatmap-intensity': 1,
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(0, 255, 0, 0)',
            0.5, '#FBBF24',
            1, '#EF4444'
          ],
          'heatmap-radius': 40
        }
      });
    });
  }, []);

  // Update Route and Markers
  useEffect(() => {
    if (!map.current || !store.routeData) return;

    const { geometry, legs } = store.routeData;
    
    // Clear old markers
    markers.current.forEach(m => m.remove());
    markers.current = [];

    // Add new markers
    store.stops.forEach((stop, i) => {
      const el = document.createElement('div');
      el.className = 'map-marker';
      el.innerText = i + 1;
      const marker = new mapboxgl.Marker(el)
        .setLngLat([stop.lng, stop.lat])
        .addTo(map.current);
      markers.current.push(marker);
    });

    // Update Route Layer
    if (map.current.getSource('route')) {
      map.current.getSource('route').setData({
        type: 'Feature',
        geometry: geometry,
        properties: { color: legs.some(l => l.congestion_level === 'severe') ? '#EF4444' : '#3B82F6' }
      });
    }

    // Fit Bounds
    const coordinates = geometry.coordinates;
    const bounds = coordinates.reduce((acc, coord) => acc.extend(coord), new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
    map.current.fitBounds(bounds, { padding: 50 });

  }, [store.routeData, store.stops]);

  return (
    <div className="map-view">
      <div ref={mapContainer} className="map-inner" />
      {store.loading && <div className="map-overlay">Fetching Route...</div>}
    </div>
  );
}
