import React, { useState, useEffect } from 'react';

export const ViewportDiagnostic: React.FC = () => {
  const [dimensions, setDimensions] = useState({
    w: typeof window !== 'undefined' ? window.innerWidth : 0,
    h: typeof window !== 'undefined' ? window.innerHeight : 0,
    vvW: typeof window !== 'undefined' && window.visualViewport ? Math.round(window.visualViewport.width) : 0,
    vvH: typeof window !== 'undefined' && window.visualViewport ? Math.round(window.visualViewport.height) : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        w: window.innerWidth,
        h: window.innerHeight,
        vvW: window.visualViewport ? Math.round(window.visualViewport.width) : window.innerWidth,
        vvH: window.visualViewport ? Math.round(window.visualViewport.height) : window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  return (
    <div className="bg-slate-900 text-slate-100 text-[10px] font-mono px-3 py-1 flex items-center justify-between z-50 border-b border-slate-700">
      <span>CSS Viewport: <strong>{dimensions.w}px × {dimensions.h}px</strong></span>
      <span>Visual Viewport: <strong>{dimensions.vvW}px × {dimensions.vvH}px</strong></span>
    </div>
  );
};
