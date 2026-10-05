import React, { useState, useRef, useEffect } from 'react';
import { useTheme, type AccentColor } from '../context/ThemeContext.tsx';
import { Sun, Moon, Palette, Check } from 'lucide-react';

interface ColorThemePickerProps {
  compact?: boolean; // When true, renders a popover button for header
  showLabel?: boolean;
}

export const ColorThemePicker: React.FC<ColorThemePickerProps> = ({
  compact = true,
  showLabel = false
}) => {
  const { theme, isDayMode, toggleTheme, accent, setAccent, accentConfig, allAccents } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!compact) {
    // Inline full palette display (used in AppMenuDrawer or Settings)
    return (
      <div className="space-y-3 p-3 rounded-2xl border transition-colors bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Palette className="w-4 h-4 opacity-75" />
            <span className="text-xs font-bold">Color &amp; Theme</span>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
              isDayMode
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-indigo-950/80 text-indigo-300 border border-indigo-700/60'
            }`}
            title="Toggle Day/Night Mode"
          >
            {isDayMode ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
            <span>{isDayMode ? 'Day Mode' : 'Night Mode'}</span>
          </button>
        </div>

        {/* Color Palette Row */}
        <div>
          <div className="text-[11px] font-medium opacity-70 mb-2">Accent Color:</div>
          <div className="grid grid-cols-6 gap-2">
            {allAccents.map((item) => {
              const isSelected = item.id === accent;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAccent(item.id as AccentColor)}
                  style={{ backgroundColor: item.dotColor }}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-white transition-all cursor-pointer shadow-xs ${
                    isSelected ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-white scale-110' : 'opacity-80 hover:opacity-100 hover:scale-105'
                  }`}
                  title={item.name}
                >
                  {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Compact header popover button with color dot + theme mode
  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`px-2 py-1.5 rounded-xl border flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs ${
          isDayMode
            ? 'bg-white hover:bg-emerald-50 text-slate-800 border-emerald-200'
            : 'bg-slate-900 hover:bg-slate-800 text-slate-100 border-slate-700'
        }`}
        title="Theme and Color Settings"
        aria-label="Theme and Color Settings"
      >
        {/* Animated glowing active color dot */}
        <span
          className="w-3 h-3 rounded-full shrink-0 shadow-xs ring-1 ring-white/30"
          style={{ backgroundColor: accentConfig.dotColor }}
        />

        {isDayMode ? (
          <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        ) : (
          <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        )}

        {showLabel && (
          <span className="text-[11px] font-semibold tracking-tight">
            {isDayMode ? 'Day' : 'Night'}
          </span>
        )}
      </button>

      {/* Floating Theme & Color Popover */}
      {isOpen && (
        <div
          className={`absolute right-0 top-full mt-2 w-56 p-3 rounded-2xl shadow-2xl border backdrop-blur-md z-50 animate-in fade-in zoom-in-95 duration-150 ${
            isDayMode
              ? 'bg-white/95 border-emerald-200 text-slate-800 shadow-emerald-950/10'
              : 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-black/60'
          }`}
        >
          {/* Header & Quick Mode Switch */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-black/10 dark:border-white/10">
            <span className="text-xs font-bold flex items-center space-x-1.5">
              <Palette className="w-3.5 h-3.5 opacity-75" />
              <span>Theme Colors</span>
            </span>

            <button
              type="button"
              onClick={toggleTheme}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer flex items-center space-x-1 ${
                isDayMode
                  ? 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100'
                  : 'bg-slate-950 border-slate-800 text-slate-200 hover:bg-slate-800'
              }`}
              title={isDayMode ? 'Switch to Night Mode' : 'Switch to Day Mode'}
            >
              {isDayMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[10px] font-bold">Day</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[10px] font-bold">Night</span>
                </>
              )}
            </button>
          </div>

          {/* Color Palettes Grid */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold opacity-60 uppercase tracking-wider">
              Choose Color:
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {allAccents.map((item) => {
                const isSelected = item.id === accent;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setAccent(item.id as AccentColor);
                    }}
                    className={`p-1.5 rounded-xl border flex items-center space-x-1.5 text-left text-[11px] font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? isDayMode
                          ? 'bg-emerald-50 border-emerald-400 shadow-xs'
                          : 'bg-white/10 border-white/40 shadow-xs'
                        : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: item.dotColor }}
                    />
                    <span className="truncate text-[10px]">{item.name.split(' ')[0]}</span>
                    {isSelected && <Check className="w-2.5 h-2.5 ml-auto shrink-0 opacity-80" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
