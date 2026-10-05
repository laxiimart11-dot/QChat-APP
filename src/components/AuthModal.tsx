import React, { useState } from 'react';
import {
  signInWithPopup,
  signOut,
  auth,
  googleProvider,
  type FirebaseUser
} from '../firebase.ts';
import { LogOut, Sparkles, AlertCircle, ShieldCheck, CheckCircle2, X } from 'lucide-react';
import type { UserProfile } from '../types.ts';
import { useTheme } from '../context/ThemeContext.tsx';

interface AuthModalProps {
  currentUser: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectProfile: (profile: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onSelectProfile
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { isDayMode } = useTheme();

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const profile: UserProfile = {
        uid: user.uid,
        displayName: user.displayName || 'Google User',
        email: user.email || '',
        photoURL: user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        statusText: 'Active on QChat',
        isOnline: true,
        createdAt: new Date().toISOString()
      };
      onSelectProfile(profile);
      onClose();
    } catch (err: unknown) {
      console.error('Google Sign-in error:', err);
      const msg = err instanceof Error ? err.message : 'Google Sign-In failed';
      if (msg.includes('popup-blocked') || msg.includes('cancelled-popup-request')) {
        setErrorMsg('Sign-in popup was blocked by your browser. Please allow popups for this site and try again.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      if (currentUser?.uid) {
        localStorage.removeItem(`qchat_verified_${currentUser.uid}`);
      }
      localStorage.removeItem('qchat_verified_session');
      await signOut(auth);
      onClose();
    } catch (err) {
      console.error('Sign-out error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`border rounded-3xl w-full max-w-md overflow-hidden shadow-2xl transition-colors ${
          isDayMode
            ? 'bg-white border-emerald-200 text-slate-800'
            : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}
      >
        {/* Modal Top Banner */}
        <div
          className={`p-6 border-b text-center relative ${
            isDayMode ? 'bg-[#F1FAF5] border-emerald-100' : 'bg-slate-950/60 border-slate-800'
          }`}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 opacity-60 hover:opacity-100 rounded-lg hover:bg-black/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-600/30 text-white">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight flex items-center justify-center notranslate" translate="no">
            <span>QChat</span>
          </h2>
          <p className="text-xs opacity-70 mt-1">
            Sign in to sync your messages in real-time across Web, Android &amp; iOS
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start space-x-2 text-xs text-amber-600">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {currentUser ? (
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between ${
                isDayMode ? 'bg-[#F1FAF5] border-emerald-200' : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center space-x-3">
                <img
                  src={currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                  alt={currentUser.displayName}
                  className="w-11 h-11 rounded-full object-cover border border-indigo-500/40"
                />
                <div>
                  <div className="font-semibold text-sm flex items-center gap-1.5">
                    {currentUser.displayName}
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <div className="text-xs opacity-70 truncate max-w-[180px]">{currentUser.email}</div>
                  <div className="text-[11px] text-indigo-500 mt-0.5">{currentUser.statusText}</div>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                disabled={loading}
                className="p-2 opacity-70 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                title="Log out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            /* Google Sign In Button */
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className={`w-full py-3 px-4 font-semibold rounded-2xl flex items-center justify-center space-x-3 shadow-md transition-all active:scale-[0.98] cursor-pointer border ${
                isDayMode
                  ? 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200'
                  : 'bg-white hover:bg-slate-100 text-slate-900 border-transparent'
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.4 9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5.1 3.7-8.9z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.6 14.7c-.2-.7-.4-1.5-.4-2.7s.1-2 .4-2.7L1.9 6.4C.7 8.8 0 10.8 0 12s.7 3.2 1.9 5.6l3.7-2.9z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.3L1.9 16C3.7 19.8 7.5 23 12 23z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </>
              )}
            </button>
          )}

          {/* Multi-Device / Multi-User Test Instruction */}
          <div className="pt-2">
            <div className="flex items-center space-x-2 mb-3">
              <div className="h-px bg-slate-300 dark:bg-slate-800 flex-1"></div>
              <span className="text-[11px] font-medium opacity-50 uppercase tracking-wider">
                Multi-User Live Test
              </span>
              <div className="h-px bg-slate-300 dark:bg-slate-800 flex-1"></div>
            </div>

            <div
              className={`rounded-2xl p-3.5 space-y-2 text-left border ${
                isDayMode ? 'bg-[#F1FAF5] border-emerald-200' : 'bg-slate-950/80 border-slate-800'
              }`}
            >
              <div className="flex items-center space-x-2 text-indigo-500">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span className="text-xs font-bold">How to test two users in real-time:</span>
              </div>
              <ol className="text-xs opacity-75 space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>
                  <strong>Incognito Window:</strong> Open a new Incognito/Private window in your browser.
                </li>
                <li>
                  <strong>Second Account:</strong> Sign in with a second Google account in that window.
                </li>
                <li>
                  <strong>Instant Sync:</strong> Place windows side by side and chat; messages and media sync live without refreshing!
                </li>
              </ol>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-1 text-[11px] opacity-60 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Secured with Firebase Firestore &amp; Authentication</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className={`p-4 border-t flex justify-end ${
            isDayMode ? 'bg-[#F1FAF5]/60 border-emerald-100' : 'bg-slate-950/50 border-slate-800/80'
          }`}
        >
          <button
            onClick={onClose}
            className={`px-4 py-2 text-xs font-medium rounded-xl transition-all cursor-pointer ${
              isDayMode ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
