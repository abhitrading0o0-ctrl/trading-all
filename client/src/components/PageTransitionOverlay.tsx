import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

import type { ActiveTab } from './Navbar';

interface PageTransitionOverlayProps {
  isActive: boolean;
  targetPage?: ActiveTab;
  onTransitionPeak: () => void;
  onComplete: () => void;
}

export const PageTransitionOverlay: React.FC<PageTransitionOverlayProps> = ({
  isActive,
  onTransitionPeak,
  onComplete
}) => {
  const { theme } = useTheme();
  const [phase, setPhase] = useState<'idle' | 'enter' | 'peak' | 'exit'>('idle');

  useEffect(() => {
    if (isActive) {
      setPhase('enter');

      // Mid-point transition peak (swap page state)
      const peakTimer = setTimeout(() => {
        setPhase('peak');
        onTransitionPeak();
      }, 250);

      // Transition exit
      const exitTimer = setTimeout(() => {
        setPhase('exit');
      }, 450);

      // Transition complete
      const endTimer = setTimeout(() => {
        setPhase('idle');
        onComplete();
      }, 650);

      return () => {
        clearTimeout(peakTimer);
        clearTimeout(exitTimer);
        clearTimeout(endTimer);
      };
    }
  }, [isActive, onTransitionPeak, onComplete]);

  if (phase === 'idle') return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden [perspective:1200px]">
      {/* Main 3D Sliding Panel */}
      <div
        className={`w-full h-full transition-all duration-300 ease-in-out transform-gpu relative flex items-center ${
          phase === 'enter'
            ? 'translate-x-full [transform:rotateY(-20deg)_scale3d(0.95,0.95,0.95)] opacity-40'
            : phase === 'peak'
            ? 'translate-x-0 [transform:rotateY(0deg)_scale3d(1,1,1)] opacity-100'
            : '-translate-x-full [transform:rotateY(20deg)_scale3d(0.95,0.95,0.95)] opacity-0'
        } ${
          theme === 'light'
            ? 'bg-slate-900/85 backdrop-blur-xl border-x-2 border-blue-400/80 shadow-[0_0_70px_rgba(37,99,235,0.3)]'
            : 'bg-[#05070a]/92 backdrop-blur-xl border-x-2 border-blue-500/70 shadow-[0_0_80px_rgba(59,130,246,0.35)]'
        }`}
      >
        {/* Leading Edge 3D Glow Strip */}
        <div
          className={`absolute inset-y-0 left-0 w-1.5 shadow-lg ${
            theme === 'light'
              ? 'bg-gradient-to-b from-blue-400 via-sky-300 to-indigo-500 shadow-[0_0_20px_#3b82f6]'
              : 'bg-gradient-to-b from-blue-500 via-indigo-400 to-cyan-400 shadow-[0_0_20px_#3b82f6]'
          }`}
        />
        <div
          className={`absolute inset-y-0 right-0 w-1.5 shadow-lg ${
            theme === 'light'
              ? 'bg-gradient-to-b from-blue-400 via-sky-300 to-indigo-500 shadow-[0_0_20px_#3b82f6]'
              : 'bg-gradient-to-b from-blue-500 via-indigo-400 to-cyan-400 shadow-[0_0_20px_#3b82f6]'
          }`}
        />

        {/* Ambient Theme Radial Glow */}
        <div
          className={`absolute inset-0 opacity-20 pointer-events-none ${
            theme === 'light'
              ? 'bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.25)_0%,transparent_70%)]'
              : 'bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.3)_0%,transparent_70%)]'
          }`}
        />

        {/* Centered Animated Logo Emblem during 3D Transition */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="relative group">
            <div className="absolute -inset-3 rounded-2xl bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-500 opacity-60 blur-xl animate-pulse" />
            <div className="relative bg-white/95 p-4 rounded-2xl border-2 border-blue-400/80 shadow-[0_0_50px_rgba(59,130,246,0.5)] flex flex-col items-center gap-2 transform scale-105">
              <img src="/logo.png" alt="ForFuture Trade Logo" className="h-16 w-auto object-contain drop-shadow" />
              <div className="text-center font-mono">
                <div className="text-xs font-extrabold tracking-widest text-slate-900 uppercase">ForFuture Trade</div>
                <div className="text-[10px] text-blue-600 font-bold tracking-wider">TERMINAL ACTIVE</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageTransitionOverlay;

