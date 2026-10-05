import React, { useState, useEffect } from 'react';
import {
  auth,
  signOut,
  type FirebaseUser
} from '../firebase.ts';
import { useTheme } from '../context/ThemeContext.tsx';
import {
  CheckCircle2,
  AlertCircle,
  LogOut,
  RotateCw,
  Send
} from 'lucide-react';
import { otpService } from '../services/otpService.ts';
import { chatService } from '../services/chatService.ts';

interface EmailVerificationViewProps {
  user: FirebaseUser;
  onVerified: () => void;
}

export const EmailVerificationView: React.FC<EmailVerificationViewProps> = ({
  user,
  onVerified
}) => {
  const { isDayMode } = useTheme();

  const [loading, setLoading] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // If user is already marked verified in local session, auto-enter immediately without sending code
  useEffect(() => {
    try {
      if (localStorage.getItem(`qchat_verified_${user.uid}`) === 'true') {
        onVerified();
        return;
      }
    } catch {
      // ignore
    }

    let isMounted = true;
    const sendInitial = async () => {
      if (user.email && localStorage.getItem(`qchat_verified_${user.uid}`) !== 'true') {
        try {
          const res = await otpService.sendOtp(user.email, 'verify', user.displayName || undefined);
          if (isMounted && res.success) {
            setResendCooldown(60);
          }
        } catch {
          // ignore initial auto send failure
        }
      }
    };
    sendInitial();
    return () => {
      isMounted = false;
    };
  }, [user.uid, user.email, user.displayName, onVerified]);

  // Handle Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Submit 6-digit OTP verification code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = otpCode.trim();
    if (clean.length !== 6 || !/^\d{6}$/.test(clean)) {
      setErrorMsg('Please enter a valid 6-digit verification code.');
      return;
    }

    if (!user.email) {
      setErrorMsg('User email was not found.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await otpService.verifyOtp(user.email, clean);
      if (!res.success) {
        throw new Error(res.error || 'Invalid code or code has expired.');
      }

      try {
        localStorage.setItem(`qchat_verified_${user.uid}`, 'true');
      } catch {
        // ignore
      }

      await chatService.saveUserProfile({
        uid: user.uid,
        displayName: user.displayName || 'User',
        email: user.email,
        emailVerified: true,
        isOnline: true
      });

      setSuccessMsg('Email verified successfully! Entering QChat...');
      setTimeout(() => {
        onVerified();
      }, 800);
    } catch (err: unknown) {
      console.error('Apply code error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to verify code.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Resend 6-digit OTP email
  const handleResend = async () => {
    if (resendCooldown > 0 || !user.email) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await otpService.sendOtp(user.email, 'verify', user.displayName || undefined);
      if (!res.success) {
        throw new Error(res.error || 'Failed to send code.');
      }
      setSuccessMsg(`A new 6-digit verification code was sent to ${user.email}.`);
      setResendCooldown(60);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to send code.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      try {
        localStorage.removeItem(`qchat_verified_${user.uid}`);
      } catch {
        // ignore
      }
      await signOut(auth);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className={`flex-1 w-full h-full flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto transition-colors ${
        isDayMode ? 'bg-[#F1FAF5] text-slate-800' : 'bg-slate-950 text-slate-100'
      }`}
    >
      <div className="w-full max-w-sm flex flex-col items-center my-auto py-4">
        {/* Header Title */}
        <div className="flex flex-col items-center mb-6 select-none text-center">
          <h1 className={`text-2xl font-black tracking-tight ${isDayMode ? 'text-slate-900' : 'text-white'}`}>
            QChat
          </h1>
          <p className="text-xs font-semibold opacity-75 mt-1">
            Code sent to <span className="text-indigo-500 font-bold">{user.email}</span>
          </p>
        </div>

        {/* Feedback messages */}
        {errorMsg && (
          <div className="w-full mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start space-x-2 text-xs text-red-400 animate-in fade-in text-left">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="w-full mb-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-start space-x-2 text-xs text-emerald-400 animate-in fade-in text-left">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-snug">{successMsg}</span>
          </div>
        )}

        {/* Clean 6-Digit OTP Form */}
        <form onSubmit={handleVerifyOtp} className="w-full space-y-4">
          <div>
            <label className="block text-center text-xs font-semibold opacity-80 mb-2">
              Enter 6-Digit Code
            </label>
            <input
              type="text"
              maxLength={6}
              autoFocus
              placeholder="• • • • • •"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className={`w-full py-3.5 px-4 text-center font-mono font-extrabold text-2xl tracking-[0.4em] rounded-2xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                isDayMode
                  ? 'bg-white border-emerald-200 text-slate-800'
                  : 'bg-slate-900 border-slate-800 text-slate-100'
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={loading || otpCode.length !== 6}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Verify Code</span>
              </>
            )}
          </button>

          {/* Footer secondary actions */}
          <div className="w-full flex items-center justify-between pt-2 text-xs">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || loading}
              className="text-indigo-400 font-semibold hover:underline flex items-center space-x-1 cursor-pointer disabled:opacity-50"
            >
              <RotateCw className="w-3 h-3" />
              <span>
                {resendCooldown > 0 ? `Resend in (${resendCooldown}s)` : 'Resend Code'}
              </span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="text-red-400 font-semibold hover:underline flex items-center space-x-1 cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              <span>Log Out</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
