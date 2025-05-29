'use client';

import React, { useEffect, useRef } from 'react';

interface WaveAnimationProps {
  count?: number;
}

const WaveAnimation: React.FC<WaveAnimationProps> = ({ count = 40 }) => {
  const waveAnimationConfig = useRef<Array<{height: string, delay: string, duration: string}>>([]);
  
  useEffect(() => {
    waveAnimationConfig.current = Array(count).fill(0).map((_, i) => ({
      height: `${Math.floor(Math.random() * 60) + 10}%`,
      delay: `${i * 0.05}s`,
      duration: `${Math.random() * 0.7 + 0.5}s`
    }));
  }, [count]);

  return (
    <div className="absolute bottom-0 left-0 w-full h-16 flex items-end justify-center pointer-events-none">
      {[...Array(count)].map((_, i) => (
        <div 
          key={i} 
          className="w-1 mx-px bg-spotify-green opacity-20 rounded-t-full animate-wave"
          style={{
            height: waveAnimationConfig.current[i]?.height || '30%',
            animationDelay: waveAnimationConfig.current[i]?.delay || `${i * 0.05}s`,
            animationDuration: waveAnimationConfig.current[i]?.duration || '0.7s'
          }}
        ></div>
      ))}
    </div>
  );
};

export default WaveAnimation; 