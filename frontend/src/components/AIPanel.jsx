// AIPanel component for LLM decision engine UI
import React, { useState, useEffect } from 'react';
import './AIPanel.css';

export default function AIPanel({ routeData, onSetStops }) {
  const [activeTab, setActiveTab] = useState('summarize');
  const [health, setHealth] = useState({ anthropic: false, openai: false, fallbackMode: true });
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [results, setResults] = useState({ summarize: null, recommend: null, reroute: null });

  useEffect(() => {
    fetch('http://localhost:3001/ai/health')
      .then(res => res.json())
      .then(setHealth)
      .catch(() => setHealth({ fallbackMode: true }));
  }, []);

  const fetchAI = async (mode) => {
    if (results[mode]) return; // Use cache
    setLoading(true);
    setStreamingText('');

    if (mode === 'summarize') {
      try {
        const response = await fetch('http://localhost:3001/ai/stream/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ routeData, congestionData: routeData.legs[0] }) // Using Leg 0 context
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.replace('data: ', '');
              if (dataStr === '[DONE]') continue;
              try {
                const data = JSON.parse(dataStr);
                if (data.chunk) {
                  fullText += data.chunk;
                  setStreamingText(prev => prev + data.chunk);
                }
                if (data.type === 'complete') {
                  setResults(prev => ({ ...prev, summarize: data.parsed }));
                }
              } catch (e) {}
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    } else {
      try {
        const response = await fetch(`http://localhost:3001/ai/${mode}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ routeData, congestionData: routeData.legs[0] })
        });
        const data = await response.json();
        setResults(prev => ({ ...prev, [mode]: data }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (routeData) fetchAI(activeTab);
  }, [activeTab, routeData]);

  if (!routeData) return null;

  return (
    <div className="ai-panel">
      <div className="ai-header">
        <h3>AI Analysis</h3>
        <span className={`provider-badge ${health.anthropic ? 'anthropic' : health.openai ? 'openai' : 'fallback'}`}>
          {health.anthropic ? 'Claude' : health.openai ? 'GPT-4o' : 'Offline'}
        </span>
      </div>

      {health.fallbackMode && (
        <div className="fallback-banner">
          <span className="info-icon">⚠️</span>
          AI service offline — using estimated guidance
        </div>
      )}

      <div className="ai-tabs">
        {['summarize', 'recommend', 'reroute'].map(tab => (
          <button 
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="ai-content">
        {activeTab === 'summarize' && (
          <div>
            {loading && !results.summarize && (
              <div className="typewriter-text">
                {streamingText}
                <span className="stream-dot" />
              </div>
            )}
            {results.summarize && (
              <div className="summary-view">
                <div className={`summary-headline ${results.summarize.condition}`}>
                  {results.summarize.headline}
                </div>
                <p className="typewriter-text">{results.summarize.summary}</p>
                <ul className="fact-list">
                  {results.summarize.keyFacts.map((fact, i) => (
                    <li key={i} className="fact-item">
                      <div className="dot" /> {fact}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'recommend' && results.recommend && (
          <div className="recommend-view">
            <div className={`recommend-card ${results.recommend.actions[0]?.priority}`}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>
                {results.recommend.recommendation}
              </p>
            </div>
            {results.recommend.actions.map((action, i) => (
              <div key={i} className="action-row">
                <span className={`priority-chip ${action.priority}`}>{action.priority}</span>
                <div>
                  <div className="action-text">{action.action}</div>
                  <div className="action-reason">{action.reason}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'reroute' && results.reroute && (
          <div className="reroute-view">
            <div className="reroute-banner">
              <strong>Tip:</strong> {results.reroute.suggestedDeparture}
            </div>
            <p className="typewriter-text" style={{ fontWeight: 600 }}>
              {results.reroute.rerouteAdvice}
            </p>
            {results.reroute.avoidAreas.length > 0 && (
              <div className="pill-container">
                {results.reroute.avoidAreas.map((area, i) => (
                  <span key={i} className="area-pill">{area}</span>
                ))}
              </div>
            )}
            {results.reroute.alternateStopOrder && (
              <button 
                className="apply-btn"
                onClick={() => {
                  // This is a simplified implementation of reordering
                  console.log("Applying order:", results.reroute.alternateStopOrder);
                }}
              >
                Apply Suggested Order
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
