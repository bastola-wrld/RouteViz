// ETATicker component for live countdown timer
import React, { useState, useEffect } from 'react';
import './ETATicker.css';

export default function ETATicker({ remainingSeconds, isLive }) {
  const [localSeconds, setLocalSeconds] = useState(remainingSeconds);

  useEffect(() => {
    setLocalSeconds(remainingSeconds);
  }, [remainingSeconds]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLocalSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (totalSec) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h > 0 ? h + 'h ' : ''}${m}m ${s}s`;
  };

  const getUrgencyClass = () => {
    if (localSeconds > 1800) return 'green';
    if (localSeconds > 600) return 'amber';
    return 'red';
  };

  return (
    <div className="eta-ticker">
      <div className="eta-label">
        Remaining Travel Time
        {isLive && <span className="live-badge">LIVE</span>}
      </div>
      <div className={`eta-countdown ${getUrgencyClass()}`}>
        {formatTime(localSeconds)}
      </div>
      <div className="eta-progress-bg">
        <div 
          className="eta-progress-bar" 
          style={{ width: `${Math.min(100, (localSeconds / (remainingSeconds || 1)) * 100)}%` }}
        />
      </div>
    </div>
  );
}
