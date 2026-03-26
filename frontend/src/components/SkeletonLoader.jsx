// Skeleton Loader Component
import React from 'react';
import './SkeletonLoader.css';

export default function SkeletonLoader({ type = 'card', lines = 3, className = '' }) {
  const renderSidebar = () => (
    <div className="skeleton-sidebar">
      {[1, 2, 3].map(i => <div key={i} className="skeleton-line shimmer full" style={{ height: '40px', marginBottom: '12px', borderRadius: '8px' }} />)}
      <div className="skeleton-line shimmer half" style={{ height: '40px', marginTop: '20px', borderRadius: '8px' }} />
    </div>
  );

  const renderPanel = () => (
    <div className="skeleton-panel">
      <div className="skeleton-line shimmer header" />
      {[...Array(lines)].map((_, i) => (
        <div key={i} className={`skeleton-line shimmer ${i % 2 === 0 ? 'full' : 'three-quarter'}`} />
      ))}
    </div>
  );

  const renderMap = () => (
    <div className="skeleton-map shimmer" />
  );

  return (
    <div className={`skeleton-container ${className}`}>
      {type === 'sidebar' && renderSidebar()}
      {type === 'panel' && renderPanel()}
      {type === 'map' && renderMap()}
      {type === 'card' && renderPanel()}
    </div>
  );
}
