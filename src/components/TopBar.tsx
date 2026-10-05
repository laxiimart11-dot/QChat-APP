import React from 'react';
import { useTheme } from '../context/ThemeContext.tsx';
import { Menu } from 'lucide-react';
import type { UserProfile } from '../types.ts';

interface TopBarProps {
  onOpenMenu?: () => void;
  currentUser?: UserProfile | null;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenMenu }) => {
  const { isDayMode, accentConfig } = useTheme();

  return (
    <div className="w-full shrink-0 z-40 select-none">
      {/* Slim Clean Top Header */}
      <header
        className={`w-full px-3 py-2 flex items-center justify-between text-xs border-b transition-colors ${
          isDayMode
            ? 'bg-white border-emerald-200/90 text-slate-800'
            : 'bg-slate-900/95 border-slate-800/90 text-slate-100'
        }`}
      >
        {/* App Branding: Strictly QChat */}
        <div className="flex items-center space-x-2">
          {onOpenMenu && (
            <button
              onClick={onOpenMenu}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                isDayMode
                  ? 'bg-[#F1FAF5] hover:bg-emerald-50 text-slate-700 border-emerald-200 shadow-xs'
                  : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-slate-700/80'
              }`}
              title="Open Menu"
            >
              <Menu className={`w-4 h-4 ${accentConfig.primaryText}`} />
            </button>
          )}

          <div
            className={`w-7 h-7 rounded-xl ${accentConfig.bubbleGradient} flex items-center justify-center text-white text-xs font-black shadow-sm transition-all`}
          >
            Q
          </div>
          <span className={`font-black text-sm tracking-tight ${isDayMode ? 'text-slate-900' : 'text-white'}`}>
            QChat
          </span>
        </div>

        {/* Right side kept clean */}
        <div className="flex items-center space-x-1.5"></div>
      </header>
    </div>
  );
};
