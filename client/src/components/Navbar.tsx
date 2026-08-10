import React, { useState, useEffect } from 'react';
import { Activity, BookOpen, Search, RefreshCw, BarChart2, Moon, Sun, LayoutGrid, Calculator } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export type ActiveTab = 'dashboard' | 'watchlist' | 'research' | 'chart' | 'journal' | 'calculator';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedSymbol: string;
  onRefresh?: () => void;
  onTriggerTransition?: (targetTab?: ActiveTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedSymbol,
  onRefresh,
  onTriggerTransition
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' IST');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleNavClick = (tab: ActiveTab) => {
    if (onTriggerTransition) {
      onTriggerTransition(tab);
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <header className={`sticky top-0 z-50 px-4 py-2.5 transition-colors border-b ${theme === 'light'
        ? 'bg-white border-slate-200 text-slate-900 shadow-sm'
        : 'bg-[#000000] border-slate-800/80 text-slate-100'
      }`}>
      <div className="w-full flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left Branding */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => handleNavClick('dashboard')}
          >
            <img
              src="/logo.png"
              alt="ForFuture Trade Logo"
              className="h-9 w-auto object-contain rounded bg-white p-0.5 shadow-xs border border-slate-200/60 group-hover:scale-105 transition-transform"
            />
            <div>
              <div className="font-mono font-bold tracking-tight flex items-center gap-1.5 text-sm">
                <span>ForFuture</span>
                <span className={theme === 'light' ? 'text-blue-600' : 'text-blue-400'}>Trade</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-normal ${theme === 'light'
                    ? 'bg-slate-100 border-slate-300 text-slate-600'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}>TERMINAL</span>
              </div>
              <p className={`text-[11px] font-mono ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                Personal Trading Research & Journal
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className={`flex items-center gap-1 p-1 rounded-md border text-xs font-mono ${theme === 'light'
              ? 'bg-slate-100 border-slate-200'
              : 'bg-[#090c12] border-slate-800'
            }`}>
            <button
              onClick={() => handleNavClick('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all active:scale-[0.98] ${activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white font-semibold shadow'
                  : theme === 'light'
                    ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Combined Dashboard
            </button>

            <button
              onClick={() => handleNavClick('watchlist')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all active:scale-[0.98] ${activeTab === 'watchlist'
                  ? 'bg-blue-600 text-white font-semibold shadow'
                  : theme === 'light'
                    ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Watchlist
            </button>

            <button
              onClick={() => handleNavClick('research')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all active:scale-[0.98] ${activeTab === 'research'
                  ? 'bg-blue-600 text-white font-semibold shadow'
                  : theme === 'light'
                    ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
            >
              <Search className="w-3.5 h-3.5" />
              Research {selectedSymbol ? `(${selectedSymbol})` : ''}
            </button>

            <button
              onClick={() => handleNavClick('chart')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all active:scale-[0.98] ${activeTab === 'chart'
                  ? 'bg-blue-600 text-white font-semibold shadow'
                  : theme === 'light'
                    ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              Pro Chart
            </button>

            <button
              onClick={() => handleNavClick('journal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all active:scale-[0.98] ${activeTab === 'journal'
                  ? 'bg-blue-600 text-white font-semibold shadow'
                  : theme === 'light'
                    ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Trade Journal
            </button>

            <button
              onClick={() => handleNavClick('calculator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all active:scale-[0.98] ${activeTab === 'calculator'
                  ? 'bg-amber-600 text-white font-semibold shadow'
                  : theme === 'light'
                    ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              Calculator
            </button>
          </nav>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3 text-xs font-mono w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0">
          <div className={`flex items-center p-1 rounded-lg border gap-1 ${theme === 'light' ? 'bg-slate-100 border-slate-300' : 'bg-[#090c12] border-slate-800'
            }`}>
            <button
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-all ${theme === 'dark'
                  ? 'bg-slate-800 text-white font-bold border border-slate-600 shadow-xs'
                  : theme === 'light' ? 'text-slate-700 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <Moon className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Dark</span>
            </button>

            <button
              onClick={() => setTheme('light')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-all ${theme === 'light' ? 'bg-blue-600 text-white font-bold shadow' : 'text-slate-400 hover:text-white'
                }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Light</span>
            </button>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className={`p-1.5 rounded transition-all border ${theme === 'light'
                  ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              title="Refresh Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          <div className={`font-bold tracking-wider px-2.5 py-1 rounded border ${theme === 'light'
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : 'bg-slate-900 border-slate-800 text-blue-400'
            }`}>
            {timeStr}
          </div>
        </div>
      </div>
    </header>
  );
};
