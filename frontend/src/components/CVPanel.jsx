// Production-ready CVPanel for Phase 7
import React, { useState, useRef, useEffect } from 'react';
import './CVPanel.css';
import { 
  validateImageFile, 
  resizeImageIfNeeded, 
  formatFileSize, 
  saveToHistory, 
  loadHistory 
} from '../utils/imageUtils';

export default function CVPanel() {
  const [activeTab, setActiveTab] = useState('demo');
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [serviceStatus, setServiceStatus] = useState('offline');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('Copy Summary');
  
  // Camera refs
  const videoRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturePreview, setCapturePreview] = useState(null);

  useEffect(() => {
    setHistory(loadHistory());
    fetch('http://localhost:3001/cv/health')
      .then(res => res.json())
      .then(data => setServiceStatus(data.status))
      .catch(() => setServiceStatus('offline'));
  }, []);

  // DEMO MODE
  const runDemo = async (sampleId) => {
    setIsAnalyzing(true);
    try {
      const res = await fetch(`http://localhost:3001/analyze/demo/${sampleId}`, { method: 'POST' });
      const data = await res.json();
      handleAnalysisComplete(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // UPLOAD MODE
  const onFileSelect = (e) => {
    const files = Array.from(e.target.files);
    addFiles(files);
  };

  const addFiles = (files) => {
    const validFiles = files.filter(f => {
      const { valid } = validateImageFile(f);
      return valid;
    }).slice(0, 3 - pendingFiles.length);
    
    setPendingFiles(prev => [...prev, ...validFiles]);
  };

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      for (const file of pendingFiles) {
        const resized = await resizeImageIfNeeded(file);
        formData.append('images', resized);
      }

      const res = await fetch('http://localhost:3001/analyze', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      handleAnalysisComplete(data);
      setPendingFiles([]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // CAMERA MODE
  const startCamera = async () => {
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Camera access denied or not supported");
      setCameraActive(false);
    }
  };

  const captureFrame = () => {
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg');
    setCapturePreview(dataUrl);
    
    // Stop stream
    videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    setCameraActive(false);
  };

  const analyzeCapture = async () => {
    setIsAnalyzing(true);
    try {
      const blob = await (await fetch(capturePreview)).blob();
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('images', file);

      const res = await fetch('http://localhost:3001/analyze', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      handleAnalysisComplete(data);
      setCapturePreview(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // HELPERS
  const handleAnalysisComplete = (data) => {
    const finalResult = data.merged || data;
    setResult(finalResult);
    const newHistory = saveToHistory(finalResult);
    setHistory(newHistory);
  };

  const copyToClipboard = () => {
    if (!result) return;
    const txt = `RouteViz Analysis: ${result.congestion_level} congestion, ${result.vehicle_count} vehicles. Signs: ${result.detected_signs.join(', ')}.`;
    navigator.clipboard.writeText(txt);
    setCopyFeedback('Copied!');
    setTimeout(() => setCopyFeedback('Copy Summary'), 2000);
  };

  const loadFromHistory = (item) => {
    setResult(item);
    setActiveTab('demo'); // Switch away from active input
  };

  return (
    <div className="cv-panel">
      <div className="cv-header">
        <h3>AI Vision Panel</h3>
        <div className="service-status">
          <div className={`service-dot ${serviceStatus === 'online' ? 'online' : 'offline'}`} />
          {serviceStatus}
        </div>
      </div>

      <div className="cv-tabs">
        {['demo', 'upload', 'camera'].map(t => (
          <button 
            key={t}
            className={`cv-tab-btn ${activeTab === t ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(t);
              setResult(null);
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="cv-tab-content">
        {activeTab === 'demo' && (
          <div className="demo-grid">
            {['highway', 'intersection', 'clear'].map(s => (
              <div key={s} className="demo-card" onClick={() => runDemo(s)}>
                <div className={`demo-thumb ${s}`} />
                <span>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'upload' && (
          <div>
            <div 
              className={`upload-zone ${isDragging ? 'dragging' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                addFiles(Array.from(e.dataTransfer.files));
              }}
              onClick={() => document.getElementById('cv-file-input').click()}
            >
              <div className="upload-icon">📁</div>
              <div className="upload-text">Drag images here or click to browse</div>
              <input 
                id="cv-file-input" 
                type="file" 
                multiple 
                hidden 
                onChange={onFileSelect}
                accept="image/jpeg,image/png"
              />
            </div>

            {pendingFiles.length > 0 && (
              <>
                <div className="preview-strip">
                  {pendingFiles.map((f, i) => (
                    <div key={i} className="preview-item">
                      <img className="preview-img" src={URL.createObjectURL(f)} alt="preview" />
                      <button className="remove-btn" onClick={(e) => {
                        e.stopPropagation();
                        setPendingFiles(prev => prev.filter((_, idx) => idx !== i));
                      }}>✕</button>
                    </div>
                  ))}
                </div>
                <button 
                  className="analyze-btn" 
                  disabled={isAnalyzing}
                  onClick={runAnalysis}
                >
                  {isAnalyzing ? 'Analyzing...' : `Analyze ${pendingFiles.length} Image(s)`}
                </button>
              </>
            )}
          </div>
        )}

        {activeTab === 'camera' && (
          <div>
            {!cameraActive && !capturePreview && (
              <button className="analyze-btn" onClick={startCamera}>Open Device Camera</button>
            )}
            {cameraActive && (
              <div className="camera-container">
                <video ref={videoRef} autoPlay className="camera-feed" />
                <div className="camera-controls">
                  <button className="capture-btn" onClick={captureFrame}>Capture Snap</button>
                </div>
              </div>
            )}
            {capturePreview && (
              <div>
                <img src={capturePreview} className="camera-feed" style={{ height: '200px', borderRadius: '8px' }} />
                <div className="action-buttons" style={{ marginTop: '12px' }}>
                  <button className="analyze-btn" onClick={analyzeCapture} disabled={isAnalyzing}>
                    {isAnalyzing ? 'Analyzing...' : 'Analyze Photo'}
                  </button>
                  <button className="btn-secondary" onClick={() => setCapturePreview(null)}>Retake</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {result && (
        <div className="results-card">
          <div className="results-top">
            <span className={`congestion-pill ${result.congestion_level}`}>
              {result.congestion_level} congestion
            </span>
            <span style={{ fontSize: '10px', color: '#64748B' }}>
              {result.inference_time_ms ? `${result.inference_time_ms}ms` : 'Demo Mode'}
            </span>
          </div>
          
          <div className="results-grid">
            <div className="result-stat">
              <span className="stat-label">Vehicles</span>
              <span className="stat-val">🚗 {result.vehicle_count}</span>
            </div>
            <div className="result-stat">
              <span className="stat-label">Signs</span>
              <span className="stat-val" style={{ fontSize: '14px' }}>
                {result.detected_signs?.length || 0} Detected
              </span>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div className="stat-label">Confidence Score</div>
            <div className="confidence-bg">
              <div className="confidence-bar" style={{ width: `${(result.congestion_score || 0.8) * 100}%` }} />
            </div>
          </div>

          <div className="action-buttons">
            <button className="analyze-btn" style={{ marginTop: 0 }}>Apply to Route</button>
            <button className="btn-secondary" onClick={copyToClipboard}>{copyFeedback}</button>
          </div>
        </div>
      )}

      <div className="history-section">
        <div className="history-header" onClick={() => setIsHistoryOpen(!isHistoryOpen)}>
          <span>Detection History ({history.length})</span>
          <span>{isHistoryOpen ? '▲' : '▼'}</span>
        </div>
        {isHistoryOpen && (
          <div className="history-list">
            {history.map((h, i) => (
              <div key={i} className="history-row">
                <span className="history-time">{new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span className={`congestion-pill ${h.congestion_level}`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                  {h.congestion_level}
                </span>
                <span>🚗 {h.vehicle_count}</span>
                <button className="history-load-btn" onClick={() => loadFromHistory(h)}>Load</button>
              </div>
            ))}
            {history.length > 0 && (
              <button 
                className="btn-secondary" 
                style={{ width: '100%', border: 'none', borderTop: '1px solid #E5E7EB', borderRadius: 0 }}
                onClick={() => {
                  sessionStorage.removeItem('rv_history');
                  setHistory([]);
                }}
              >
                Clear History
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
