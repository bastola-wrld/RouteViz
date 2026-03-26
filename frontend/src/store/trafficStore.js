// Centralized state management for RouteViz traffic and route data
import { useState, useCallback } from 'react';

// Simple store pattern using a custom hook-like structure
export const useTrafficStore = () => {
  const [state, setState] = useState({
    stops: [
      { id: 1, name: 'London Bridge', postcode: 'SE1 9RA', lng: -0.0877, lat: 51.5079 },
      { id: 2, name: 'Tower of London', postcode: 'EC3N 4AB', lng: -0.0759, lat: 51.5081 },
      { id: 3, name: 'Greenwich', postcode: 'SE10 9NN', lng: -0.0022, lat: 51.4769 }
    ],
    routeData: null,
    loading: false,
    error: null,
    // Phase 5 AI state
    aiSummary: null,
    aiRecommendation: null,
    aiReroute: null,
    aiProvider: null,
    aiLoading: false,
    // Phase 7 Analysis state
    analysisHistory: [],
    currentAnalysis: null,
    analysisSource: null
  });

  const setStops = (stops) => setState(prev => ({ ...prev, stops }));
  const setRouteData = (routeData) => setState(prev => ({ ...prev, routeData }));
  const setLoading = (loading) => setState(prev => ({ ...prev, loading }));
  const setError = (error) => setState(prev => ({ ...prev, error }));
  
  // AI Actions
  const setAIResult = (mode, data) => setState(prev => ({
    ...prev,
    [`ai${mode.charAt(0).toUpperCase() + mode.slice(1)}`]: data
  }));
  const setAIProvider = (provider) => setState(prev => ({ ...prev, aiProvider: provider }));
  const setAILoading = (loading) => setState(prev => ({ ...prev, aiLoading: loading }));

  // Phase 7 Actions
  const setAnalysisHistory = (history) => setState(prev => ({ ...prev, analysisHistory: history }));
  const setCurrentAnalysis = (analysis, source = null) => setState(prev => ({ 
    ...prev, 
    currentAnalysis: analysis,
    analysisSource: source
  }));

  return {
    ...state,
    setStops,
    setRouteData,
    setLoading,
    setError,
    setAIResult,
    setAIProvider,
    setAILoading,
    setAnalysisHistory,
    setCurrentAnalysis
  };
};
