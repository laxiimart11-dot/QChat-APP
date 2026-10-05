import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, X, Radio, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.tsx';
import type { LocationData } from '../types.ts';

interface LocationShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendLocation: (data: LocationData) => void;
}

export const LocationShareModal: React.FC<LocationShareModalProps> = ({
  isOpen,
  onClose,
  onSendLocation
}) => {
  const { isDayMode } = useTheme();
  const [mode, setMode] = useState<'live' | 'current'>('live');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  // Live location duration: 15 minutes, 1 hour, 8 hours, or -1 for All Time
  const [liveDurationMinutes, setLiveDurationMinutes] = useState<number>(60);
  const [liveComment, setLiveComment] = useState('');

  // Static current location fields
  const [currentLabel, setCurrentLabel] = useState('My Current Location');
  const [currentAddress, setCurrentAddress] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setError(null);

    // Initial sensible fallback coordinates (Dhaka / default) so send is never blocked
    setLatitude(23.8103);
    setLongitude(90.4125);
    setAccuracy(15);

    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setAccuracy(Math.round(pos.coords.accuracy));
        setLoading(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setError('GPS permission denied or unavailable. Using estimated position.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 }
    );
  }, [isOpen]);

  if (!isOpen) return null;

  // Send Live Location
  const handleSendLive = () => {
    const finalLat = latitude ?? 23.8103;
    const finalLng = longitude ?? 90.4125;
    const isAllTime = liveDurationMinutes === -1;
    const liveUntil = isAllTime ? undefined : Date.now() + liveDurationMinutes * 60 * 1000;
    const durationLabel = isAllTime
      ? 'All Time'
      : liveDurationMinutes >= 60
      ? `${liveDurationMinutes / 60} hour`
      : `${liveDurationMinutes} mins`;

    const locPayload: LocationData = {
      latitude: finalLat,
      longitude: finalLng,
      label: liveComment.trim() || (isAllTime ? 'Sharing Live Location (All Time)' : 'Sharing Live Location'),
      address: isAllTime ? 'Live until stopped' : `Live for ${durationLabel}`,
      isLive: true,
      isSharingActive: true,
      lastUpdated: Date.now()
    };

    if (!isAllTime && liveUntil) {
      locPayload.liveUntil = liveUntil;
    }
    if (isAllTime) {
      locPayload.isAllTime = true;
    }
    if (typeof accuracy === 'number' && !isNaN(accuracy)) {
      locPayload.accuracy = accuracy;
    }

    onSendLocation(locPayload);
    onClose();
  };

  // Send Static Current Location (never changes)
  const handleSendCurrent = () => {
    const finalLat = latitude ?? 23.8103;
    const finalLng = longitude ?? 90.4125;

    const locPayload: LocationData = {
      latitude: finalLat,
      longitude: finalLng,
      label: currentLabel.trim() || 'My Current Location',
      address: currentAddress.trim() || (accuracy ? `Accurate to ${accuracy} meters` : 'Fixed current position'),
      isLive: false,
      isSharingActive: false,
      lastUpdated: Date.now()
    };

    if (typeof accuracy === 'number' && !isNaN(accuracy)) {
      locPayload.accuracy = accuracy;
    }

    onSendLocation(locPayload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in"
      />
      <div
        className={`relative z-10 w-full max-w-sm rounded-3xl p-4 sm:p-5 border shadow-2xl transition-all animate-in zoom-in-95 flex flex-col max-h-[90vh] overflow-y-auto ${
          isDayMode
            ? 'bg-white border-emerald-100 text-slate-800'
            : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-black/5 dark:border-white/10 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm leading-tight">Share Location</h4>
              <p className="text-[10px] opacity-60">GPS Real-Time Location</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Map Preview Graphic with Radar Beacon */}
        <div className="relative h-28 rounded-2xl overflow-hidden my-3 border border-emerald-500/20 bg-emerald-950/20 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:12px_12px]" />

          {loading ? (
            <div className="flex flex-col items-center space-y-1.5 text-emerald-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-[11px] font-semibold">Detecting GPS fix...</span>
            </div>
          ) : (
            <div className="relative flex flex-col items-center">
              {/* Pulsing radar circles if Live mode */}
              {mode === 'live' && (
                <>
                  <span className="absolute -inset-3 rounded-full bg-emerald-500/25 animate-ping duration-1000" />
                  <span className="absolute -inset-6 rounded-full bg-emerald-500/10 animate-pulse duration-1500" />
                </>
              )}
              <div
                className={`w-9 h-9 rounded-full text-white flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900 relative z-10 ${
                  mode === 'live' ? 'bg-emerald-600' : 'bg-rose-600'
                }`}
              >
                {mode === 'live' ? <Radio className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
              </div>
              <div className="w-3 h-1 bg-black/40 rounded-full blur-[1px] mt-0.5" />
            </div>
          )}

          {latitude !== null && longitude !== null && (
            <div className="absolute bottom-1.5 left-2 right-2 px-2 py-0.5 rounded-lg bg-black/65 backdrop-blur-md text-white text-[9.5px] font-mono flex items-center justify-between">
              <span>{latitude.toFixed(5)}, {longitude.toFixed(5)}</span>
              {accuracy && <span>±{accuracy}m</span>}
            </div>
          )}
        </div>

        {error && (
          <div className="p-2 mb-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10.5px] flex items-center space-x-1.5 shrink-0">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 2-Mode Switcher */}
        <div className="grid grid-cols-2 p-1 bg-black/5 dark:bg-white/5 rounded-2xl mb-3 shrink-0 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('live')}
            className={`py-1.5 rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              mode === 'live'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'opacity-70 hover:opacity-100'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Live Location</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('current')}
            className={`py-1.5 rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              mode === 'current'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'opacity-70 hover:opacity-100'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Current Location</span>
          </button>
        </div>

        {/* MODE 1: LIVE LOCATION */}
        {mode === 'live' && (
          <div className="space-y-3 text-xs">
            <div
              className={`p-2.5 rounded-2xl border text-[11px] leading-relaxed ${
                isDayMode ? 'bg-[#F1FAF5] border-emerald-100 text-slate-700' : 'bg-slate-950/60 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-bold text-emerald-600 dark:text-emerald-400 mb-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                <span>Real-Time Live Tracking</span>
              </div>
              <p className="opacity-80">
                Live location will change and update automatically as you move. Participants see your real-time position until you stop or time expires.
              </p>
            </div>

            {/* Duration Selector */}
            <div>
              <label className="font-bold opacity-80 block mb-1.5 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                <span>Share For Duration</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: '15m', minutes: 15 },
                  { label: '1 hour', minutes: 60 },
                  { label: '8 hours', minutes: 480 },
                  { label: 'All Time', minutes: -1 }
                ].map((item) => (
                  <button
                    key={item.minutes}
                    type="button"
                    onClick={() => setLiveDurationMinutes(item.minutes)}
                    className={`py-2 px-0.5 rounded-xl text-center font-semibold text-[11px] sm:text-xs border transition-all cursor-pointer ${
                      liveDurationMinutes === item.minutes
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold'
                        : isDayMode
                        ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Comment Note */}
            <div>
              <label className="font-bold opacity-80 block mb-1">Add a comment / note (optional)</label>
              <input
                type="text"
                value={liveComment}
                onChange={(e) => setLiveComment(e.target.value)}
                placeholder="e.g. Heading to office, On the bus..."
                className={`w-full px-3 py-2 rounded-xl border outline-none text-xs transition-colors ${
                  isDayMode
                    ? 'bg-slate-50 border-slate-200 focus:border-emerald-500'
                    : 'bg-slate-950 border-slate-800 focus:border-emerald-500 text-white'
                }`}
              />
            </div>

            {/* Send Live Button */}
            <button
              type="button"
              onClick={handleSendLive}
              className="w-full mt-2 py-2.5 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white cursor-pointer transition-all shadow-md shadow-emerald-600/30 flex items-center justify-center space-x-2 active:scale-98"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>
                Share Live Location ({liveDurationMinutes === -1 ? 'All Time' : liveDurationMinutes >= 60 ? `${liveDurationMinutes / 60}h` : `${liveDurationMinutes}m`})
              </span>
            </button>
          </div>
        )}

        {/* MODE 2: CURRENT LOCATION (Static - never changes) */}
        {mode === 'current' && (
          <div className="space-y-3 text-xs">
            <div
              className={`p-2.5 rounded-2xl border text-[11px] leading-relaxed ${
                isDayMode ? 'bg-[#F1FAF5] border-emerald-100 text-slate-700' : 'bg-slate-950/60 border-slate-800 text-slate-300'
              }`}
            >
              <div className="font-bold text-slate-800 dark:text-slate-200 mb-0.5">
                📌 Static Current Location
              </div>
              <p className="opacity-80">
                Sends a one-time fixed snapshot of your current place. It will <strong>NOT change</strong> even if you move.
              </p>
            </div>

            <div>
              <label className="font-bold opacity-80 block mb-1">Place Title</label>
              <input
                type="text"
                value={currentLabel}
                onChange={(e) => setCurrentLabel(e.target.value)}
                placeholder="e.g. My Current Location, Office, Home"
                className={`w-full px-3 py-2 rounded-xl border outline-none text-xs transition-colors ${
                  isDayMode
                    ? 'bg-slate-50 border-slate-200 focus:border-emerald-500'
                    : 'bg-slate-950 border-slate-800 focus:border-emerald-500 text-white'
                }`}
              />
            </div>

            <div>
              <label className="font-bold opacity-80 block mb-1">Landmark / Address (optional)</label>
              <input
                type="text"
                value={currentAddress}
                onChange={(e) => setCurrentAddress(e.target.value)}
                placeholder="e.g. Near City Center, Dhanmondi 27"
                className={`w-full px-3 py-2 rounded-xl border outline-none text-xs transition-colors ${
                  isDayMode
                    ? 'bg-slate-50 border-slate-200 focus:border-emerald-500'
                    : 'bg-slate-950 border-slate-800 focus:border-emerald-500 text-white'
                }`}
              />
            </div>

            {/* Send Current Button */}
            <button
              type="button"
              onClick={handleSendCurrent}
              className="w-full mt-2 py-2.5 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white cursor-pointer transition-all shadow-md shadow-emerald-600/30 flex items-center justify-center space-x-2 active:scale-98"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Send Current Location (Static)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
