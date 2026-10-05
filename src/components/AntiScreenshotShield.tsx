import React, { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';

interface AntiScreenshotShieldProps {
  hasOneTimeContent: boolean;
}

export const AntiScreenshotShield: React.FC<AntiScreenshotShieldProps> = ({ hasOneTimeContent }) => {
  const [shieldActive, setShieldActive] = useState(false);
  const [shieldReason, setShieldReason] = useState<string>('');

  useEffect(() => {
    if (!hasOneTimeContent) return;

    // Trigger instant black screen shield and wipe clipboard
    const triggerShield = (reason: string) => {
      setShieldReason(reason);
      setShieldActive(true);
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('');
        }
      } catch {
        // ignore
      }
      setTimeout(() => {
        setShieldActive(false);
      }, 1500);
    };

    // 1. Intercept Screenshot & Screen Capture Keys
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        e.stopPropagation();
        triggerShield('PrintScreen / Screenshot Blocked');
        return false;
      }

      // Windows + Shift + S or Mac Cmd + Shift + 3/4/5 or Ctrl + Shift + S
      if (
        (e.shiftKey && (e.metaKey || e.ctrlKey) && ['s', 'S', '3', '4', '5'].includes(e.key)) ||
        (e.altKey && e.code === 'PrintScreen')
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerShield('Screenshot Tool Blocked');
        return false;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
        triggerShield('PrintScreen Prohibited');
      }
    };

    // 2. Window Blur / Screen Recording & Snipping Tool focus loss
    const handleWindowBlur = () => {
      // When a snipping tool or screen capture overlay takes focus, briefly obscure content
      triggerShield('Screenshot Protection Active');
    };

    // 3. Context menu (Right-click save image/copy) prevention
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [hasOneTimeContent]);

  if (!shieldActive) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-75">
      <div className="w-16 h-16 rounded-3xl bg-rose-500/20 text-rose-500 flex items-center justify-center mb-4 border border-rose-500/30 shadow-2xl animate-bounce">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h3 className="text-white text-lg font-black tracking-tight mb-2">
        Screenshot Prohibited
      </h3>
      <p className="text-slate-300 text-xs max-w-xs leading-relaxed opacity-90">
        Due to privacy and security policy, taking screenshots or screen recordings of one-time view content is not allowed.
      </p>
      {shieldReason && (
        <span className="mt-3 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-mono text-rose-400">
          {shieldReason}
        </span>
      )}
    </div>
  );
};
