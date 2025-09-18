import React, { useState, useEffect } from 'react';

export const LoadingDots = () => {
  const [tick, setTick] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 350);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="flex items-end h-3 gap-1">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className={`w-1 bg-white rounded-full transition-all duration-200 ${
            tick % 3 === i ? 'h-3' : 'h-1.5'
          }`}
          style={{
            opacity: 0.9,
          }}
        />
      ))}
    </div>
  );
};