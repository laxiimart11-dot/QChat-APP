import React, { useState, useEffect } from 'react';
import { Smartphone, Battery, Wifi, Signal } from 'lucide-react';
import type { DeviceMode, UserProfile } from '../types.ts';
import { TopBar } from './TopBar.tsx';
import { useTheme } from '../context/ThemeContext.tsx';

interface PhoneFrameProps {
  children: React.ReactNode;
  activeChannelName?: string;
  onOpenMenu?: () => void;
  currentUser?: UserProfile | null;
  hideTopBar?: boolean;
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({
  children,
  onOpenMenu,
  currentUser,
  hideTopBar = false
}) => {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('android');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(false);
  const { isDayMode } = useTheme();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkWidth = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  // When opened on an actual mobile device, fill 100% of screen seamlessly like a native mobile app
  if (isMobileScreen) {
    return (
      <div
        className={`flex flex-col h-[100dvh] w-full overflow-hidden select-none transition-colors ${
          isDayMode ? 'bg-[#F1FAF5] text-slate-800' : 'bg-slate-950 text-slate-100'
        }`}
      >
        {/* Top Header Bar (hidden when full chat header is active) */}
        {!hideTopBar && (
          <TopBar onOpenMenu={onOpenMenu} currentUser={currentUser} />
        )}
        <div className="flex-1 h-full w-full overflow-hidden flex flex-col">{children}</div>
      </div>
    );
  }

  // On desktop / larger displays, present the mobile app in an authentic smartphone frame
  return (
    <div
      className={`min-h-screen w-full py-6 px-4 flex flex-col items-center justify-center relative overflow-y-auto transition-colors ${
        isDayMode ? 'bg-slate-100/80' : 'bg-slate-950'
      }`}
    >
      {/* Background ambient lighting */}
      <div
        className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none ${
          isDayMode ? 'bg-emerald-300/20' : 'bg-indigo-600/15'
        }`}
      ></div>

      {/* Simulator Top Control Bar: Switch between Android & iOS */}
      <div
        className={`w-full max-w-[395px] mb-3 flex items-center justify-between px-3.5 py-1.5 backdrop-blur border rounded-2xl shadow-md z-10 text-xs transition-colors ${
          isDayMode
            ? 'bg-white/95 border-emerald-200 text-slate-800'
            : 'bg-slate-900/90 border-slate-800 text-slate-200'
        }`}
      >
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="font-bold tracking-tight">
            {deviceMode === 'android' ? 'Android Mobile App' : 'iOS Mobile App'}
          </span>
        </div>

        {/* Switcher Buttons: Android | iOS */}
        <div
          className={`flex items-center space-x-1 p-0.5 rounded-xl border ${
            isDayMode ? 'bg-[#F1FAF5] border-emerald-200' : 'bg-slate-950 border-slate-800'
          }`}
        >
          <button
            onClick={() => setDeviceMode('android')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer ${
              deviceMode === 'android'
                ? isDayMode ? 'bg-emerald-600 text-white shadow-xs' : 'bg-indigo-600 text-white shadow-sm'
                : 'opacity-60 hover:opacity-100'
            }`}
            title="Android App Preview"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android</span>
          </button>
          <button
            onClick={() => setDeviceMode('ios')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer ${
              deviceMode === 'ios'
                ? isDayMode ? 'bg-emerald-600 text-white shadow-xs' : 'bg-indigo-600 text-white shadow-sm'
                : 'opacity-60 hover:opacity-100'
            }`}
            title="iOS App Preview"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>iOS</span>
          </button>
        </div>
      </div>

      {/* Smartphone Hardware Frame */}
      <div
        className={`relative w-full max-w-[395px] h-[820px] rounded-[50px] p-3 shadow-2xl border-4 transition-all duration-300 z-10 flex flex-col ${
          deviceMode === 'ios'
            ? isDayMode ? 'bg-slate-300 border-slate-400 shadow-2xl' : 'bg-slate-900 border-slate-800 shadow-2xl'
            : isDayMode ? 'bg-zinc-300 border-zinc-400 shadow-2xl' : 'bg-zinc-900 border-zinc-800 shadow-2xl'
        } ring-1 ring-slate-700/20`}
      >
        {/* Physical buttons simulation on side */}
        <div className="absolute -left-[7px] top-28 w-[3px] h-10 bg-slate-500 rounded-l-sm"></div>
        <div className="absolute -left-[7px] top-42 w-[3px] h-12 bg-slate-500 rounded-l-sm"></div>
        <div className="absolute -right-[7px] top-32 w-[3px] h-16 bg-slate-500 rounded-r-sm"></div>

        {/* Screen inner canvas */}
        <div
          className={`w-full h-full rounded-[40px] overflow-hidden flex flex-col relative border transition-colors ${
            isDayMode ? 'bg-[#F1FAF5] border-emerald-200' : 'bg-slate-950 border-slate-800/80'
          }`}
        >
          {/* Mobile Status Bar */}
          <div
            className={`h-9 px-6 backdrop-blur flex items-center justify-between text-[12px] font-semibold select-none z-30 shrink-0 transition-colors ${
              isDayMode ? 'bg-white/80 text-slate-800' : 'bg-slate-950/90 text-slate-300'
            }`}
          >
            <span>{currentTime || '09:41'}</span>

            {/* Notch / Dynamic Island */}
            {deviceMode === 'ios' ? (
              <div className="w-24 h-5 bg-black rounded-full flex items-center justify-center space-x-2 px-2 shadow-inner">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800"></div>
                <div className="w-2 h-2 rounded-full bg-indigo-900/60"></div>
              </div>
            ) : (
              <div className="w-3.5 h-3.5 rounded-full bg-black border border-zinc-800 shadow-inner"></div>
            )}

            {/* Status icons */}
            <div className="flex items-center space-x-1.5 opacity-80">
              <Signal className="w-3.5 h-3.5" />
              <Wifi className="w-3.5 h-3.5" />
              <Battery className="w-4 h-4 text-emerald-500" />
            </div>
          </div>

          {/* Top Header Bar inside mobile frame (hidden when chat header is active) */}
          {!hideTopBar && (
            <TopBar onOpenMenu={onOpenMenu} currentUser={currentUser} />
          )}

          {/* Phone App Content */}
          <div className="flex-1 w-full overflow-hidden flex flex-col">{children}</div>

          {/* Bottom Home Indicator Bar for iOS */}
          {deviceMode === 'ios' && (
            <div className="h-5 w-full flex items-center justify-center shrink-0">
              <div className={`w-32 h-1 rounded-full ${isDayMode ? 'bg-slate-400' : 'bg-slate-600'}`}></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
